import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

/**
 * Server-side file parser API route.
 * Parses CSV, TSV, and Excel files and returns standardized JSON.
 * This runs in Node.js where xlsx works perfectly — no client bundling issues.
 */

interface ParsedResult {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
  rowCount: number;
  detectedType: "ar" | "ap" | "gl" | "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const slotType = formData.get("type") as string || "unknown"; // ar, ap, gl

    if (!file) {
      return NextResponse.json({ error: "لم يتم إرسال ملف" }, { status: 400 });
    }

    const ext = file.name.toLowerCase().split(".").pop() || "";
    let parsed: ParsedResult;

    if (ext === "xlsx" || ext === "xls" || ext === "xlsm") {
      parsed = await parseExcel(file, slotType);
    } else {
      parsed = await parseCSV(file, slotType);
    }

    // Normalize based on detected/requested type
    if (slotType === "gl" || parsed.detectedType === "gl") {
      parsed = normalizeGL(parsed);
    } else if (slotType === "ap" || parsed.detectedType === "ap") {
      parsed = normalizeAPAging(parsed);
    }

    // Convert to CSV text for the client engine
    const csvText = toCSV(parsed);

    return NextResponse.json({
      success: true,
      csvText,
      headers: parsed.headers,
      rowCount: parsed.rowCount,
      fileName: parsed.fileName,
      detectedType: parsed.detectedType,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطأ غير متوقع";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// ============ EXCEL PARSER ============

async function parseExcel(file: File, slotType: string): Promise<ParsedResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true, codepage: 65001 });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("ملف Excel فارغ — لا توجد أوراق عمل.");
  }

  // Find main data sheet (skip metadata/filter sheets)
  let sheetName = workbook.SheetNames[0];
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    if (!ws || !ws["!ref"]) continue;
    const range = XLSX.utils.decode_range(ws["!ref"]);
    if (range.e.r - range.s.r > 3) {
      sheetName = name;
      break;
    }
  }

  const ws = workbook.Sheets[sheetName];
  if (!ws || !ws["!ref"]) {
    throw new Error(`ورقة العمل "${sheetName}" فارغة.`);
  }

  const jsonData = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: false,
    dateNF: "yyyy-mm-dd",
    defval: "",
  }) as (string | number | undefined)[][];

  if (!jsonData || jsonData.length < 2) {
    throw new Error("الملف لا يحتوي على بيانات كافية.");
  }

  // Find header row (first row with 3+ non-empty cells)
  let headerRow = -1;
  for (let r = 0; r < Math.min(jsonData.length, 10); r++) {
    const row = jsonData[r];
    if (!Array.isArray(row)) continue;
    const nonEmpty = row.filter(v => v !== undefined && v !== null && String(v).trim() !== "").length;
    if (nonEmpty >= 3) {
      headerRow = r;
      break;
    }
  }

  if (headerRow === -1) {
    throw new Error("لم يتم العثور على صف العناوين.");
  }

  // Extract headers with their column indices
  // IMPORTANT: Include ALL columns, even those with empty headers (assign placeholder names)
  // This handles Arabic AP aging reports where vendor names are in column A but header is empty
  const rawHeaders = jsonData[headerRow] || [];
  const headers: string[] = [];
  const headerIndices: number[] = [];

  // Find the max column index used in data rows
  let maxCol = rawHeaders.length;
  for (let i = headerRow + 1; i < Math.min(jsonData.length, headerRow + 5); i++) {
    if (Array.isArray(jsonData[i]) && jsonData[i].length > maxCol) {
      maxCol = jsonData[i].length;
    }
  }

  for (let i = 0; i < maxCol; i++) {
    const h = i < rawHeaders.length ? String(rawHeaders[i] || "").trim() : "";
    headers.push(h || `_col${i}`);
    headerIndices.push(i);
  }

  if (headers.filter(h => !h.startsWith("_col")).length === 0) {
    throw new Error("لم يتم العثور على أعمدة في صف العناوين.");
  }

  // Parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = headerRow + 1; i < jsonData.length; i++) {
    const rowData = jsonData[i];
    if (!Array.isArray(rowData)) continue;

    const hasData = rowData.some((v, idx) =>
      v !== undefined && v !== null && String(v).trim() !== ""
    );
    if (!hasData) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, hIdx) => {
      const colIdx = headerIndices[hIdx];
      const val = colIdx < rowData.length ? rowData[colIdx] : undefined;
      row[h] = val !== undefined && val !== null ? String(val).trim() : "";
    });
    rows.push(row);
  }

  const detectedType = detectType(headers);

  return { headers, rows, fileName: file.name, rowCount: rows.length, detectedType };
}

// ============ CSV PARSER ============

async function parseCSV(file: File, slotType: string): Promise<ParsedResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length < 2) throw new Error("الملف يجب أن يحتوي على صف عناوين وصف بيانات.");

  let sep = ",";
  if (lines[0].includes("\t") && !lines[0].includes(",")) sep = "\t";
  else if (lines[0].includes(";") && !lines[0].includes(",")) sep = ";";

  const headers = lines[0].split(sep).map(h => h.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(sep).map(v => v.trim().replace(/^["']|["']$/g, ""));
    if (vals.every(v => !v)) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || ""; });
    rows.push(row);
  }

  const detectedType = detectType(headers);
  return { headers, rows, fileName: file.name, rowCount: rows.length, detectedType };
}

// ============ TYPE DETECTION ============

function detectType(headers: string[]): "ar" | "ap" | "gl" | "unknown" {
  const glIndicators = ["المدين", "الدائن", "الرصيد", "Debit", "Credit", "Balance"];
  if (glIndicators.some(ind => headers.some(h => h.includes(ind)))) return "gl";

  const apAgingIndicators = ["1-30", "31-60", "61-90", "91-120"];
  if (apAgingIndicators.some(ind => headers.some(h => h === ind))) return "ap";

  if (headers.some(h => h.toLowerCase().includes("invoice") || h.includes("فاتورة"))) return "ar";
  if (headers.some(h => h.toLowerCase().includes("bill") || h.includes("مورد"))) return "ap";

  return "unknown";
}

// ============ GL NORMALIZATION ============

function findCol(headers: string[], patterns: string[]): string | null {
  for (const p of patterns) {
    const match = headers.find(h => h.trim() === p.trim() || h.includes(p) || p.includes(h));
    if (match) return match;
  }
  return null;
}

function normalizeGL(parsed: ParsedResult): ParsedResult {
  const debitCol = findCol(parsed.headers, ["المدين", "مدين", "Debit"]);
  const creditCol = findCol(parsed.headers, ["الدائن", "دائن", "Credit"]);
  const accountCol = findCol(parsed.headers, ["رمز", "رمز الحساب", "Account", "Code"]);
  const nameCol = findCol(parsed.headers, ["اسم الحساب", "الحساب", "Account_Name", "Name"]);

  if (!debitCol && !creditCol) return parsed;

  const rows = parsed.rows
    .filter(row => {
      const acct = accountCol ? (row[accountCol] || "").trim() : "";
      return acct.length > 0;
    })
    .map(row => {
      const debit = parseFloat(String(row[debitCol || ""] || "0").replace(/,/g, "")) || 0;
      const credit = parseFloat(String(row[creditCol || ""] || "0").replace(/,/g, "")) || 0;
      const net = debit - credit;
      const acct = accountCol ? (row[accountCol] || "").trim() : "";
      const desc = nameCol ? (row[nameCol] || "").trim() : "";
      return { Account: acct, Amount: String(net), Description: desc };
    });

  return {
    headers: ["Account", "Amount", "Description"],
    rows,
    fileName: parsed.fileName,
    rowCount: rows.length,
    detectedType: "gl",
  };
}

// ============ AP AGING NORMALIZATION ============

function normalizeAPAging(parsed: ParsedResult): ParsedResult {
  const col1_30 = findCol(parsed.headers, ["1-30"]);
  const col31_60 = findCol(parsed.headers, ["31-60"]);
  const col61_90 = findCol(parsed.headers, ["61-90"]);
  const col91_120 = findCol(parsed.headers, ["91-120"]);
  const colOlder = findCol(parsed.headers, ["أقدم", "Older", "120+"]);

  if (!col1_30 && !col31_60 && !col61_90 && !col91_120) return parsed;

  const totalLabels = ["حسابات دائنة مستحقة", "حسابات مدينة مستحقة", "الإجمالي", "total", "المجموع"];
  const today = new Date();
  const newRows: Record<string, string>[] = [];

  parsed.rows.forEach(row => {
    // Find vendor name — check ALL columns including placeholder-named ones
    // In Arabic AP aging reports, vendor is often in column A (which may have _col0 header)
    let vendor = "";
    // First check _col0 (unnamed first column — common in Arabic AP aging)
    const col0 = row["_col0"] || "";
    if (col0.trim().length > 2) {
      const cleaned = col0.replace(/,/g, "").trim();
      if (!/^\d+\.?\d*$/.test(cleaned) && !/^\d{4}-\d{2}/.test(col0)) {
        vendor = col0.trim();
      }
    }
    // If not found in _col0, search other columns
    if (!vendor) {
      for (const h of parsed.headers) {
        if (h.startsWith("_col")) continue; // already checked
        const val = (row[h] || "").trim();
        if (!val || val.length < 2) continue;
        const cleaned = val.replace(/,/g, "");
        if (/^\d+\.?\d*$/.test(cleaned)) continue;
        if (/^\d{4}-\d{2}/.test(val)) continue;
        vendor = val;
        break;
      }
    }
    if (!vendor) return;
    if (totalLabels.some(l => vendor.includes(l))) return;

    const buckets = [
      { col: col1_30, daysBack: 15 },
      { col: col31_60, daysBack: 45 },
      { col: col61_90, daysBack: 75 },
      { col: col91_120, daysBack: 105 },
      { col: colOlder, daysBack: 150 },
    ];

    buckets.forEach(({ col, daysBack }) => {
      if (!col) return;
      const amt = parseFloat(String(row[col] || "").replace(/,/g, "")) || 0;
      if (amt > 0) {
        const billDate = new Date(today.getTime() - daysBack * 24 * 60 * 60 * 1000);
        newRows.push({
          Bill_Date: billDate.toISOString().split("T")[0],
          Bill_Amount: String(amt),
          Payment_Date: "",
          Vendor: vendor,
        });
      }
    });
  });

  if (newRows.length > 0) {
    return {
      headers: ["Bill_Date", "Bill_Amount", "Payment_Date", "Vendor"],
      rows: newRows,
      fileName: parsed.fileName,
      rowCount: newRows.length,
      detectedType: "ap",
    };
  }

  return parsed;
}

// ============ CSV OUTPUT ============

function toCSV(parsed: ParsedResult): string {
  const lines = [parsed.headers.join(",")];
  parsed.rows.forEach(row => {
    const vals = parsed.headers.map(h => {
      const v = row[h] || "";
      return v.includes(",") ? `"${v}"` : v;
    });
    lines.push(vals.join(","));
  });
  return lines.join("\n");
}
