"use client";

/**
 * Universal file parser — handles CSV, TSV, and Excel (.xlsx/.xls) files.
 * Also handles Arabic column headers common in Saudi/GCC financial systems.
 */
import * as XLSX from "xlsx";

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
  rowCount: number;
}

/**
 * Parse any uploaded file (CSV, TSV, XLSX, XLS) into a standard format.
 */
export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.toLowerCase().split(".").pop() || "";

  if (ext === "xlsx" || ext === "xls" || ext === "xlsm") {
    return parseExcelFile(file);
  } else {
    // CSV, TSV, TXT
    const text = await file.text();
    return parseCSVText(text, file.name);
  }
}

/**
 * Parse Excel file using SheetJS (dynamically imported to avoid bundling issues)
 */
async function parseExcelFile(file: File): Promise<ParsedFile> {
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (e) {
    throw new Error("تعذر قراءة الملف. تأكد من أن الملف صالح.");
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true, codepage: 65001 });
  } catch (e) {
    throw new Error(`تعذر فتح ملف Excel: ${(e as Error).message || "تنسيق غير مدعوم"}`);
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("ملف Excel فارغ — لا توجد أوراق عمل.");
  }

  // Find the main data sheet (skip filter/metadata sheets with very few rows)
  let sheetName = workbook.SheetNames[0];
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    if (!ws || !ws["!ref"]) continue;
    const range = XLSX.utils.decode_range(ws["!ref"]);
    const rowCount = range.e.r - range.s.r;
    if (rowCount > 3) {
      sheetName = name;
      break;
    }
  }

  const ws = workbook.Sheets[sheetName];
  if (!ws || !ws["!ref"]) {
    throw new Error(`ورقة العمل "${sheetName}" فارغة.`);
  }

  // Convert entire sheet to array of arrays
  let jsonData: (string | number | undefined)[][];
  try {
    jsonData = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: false,
      dateNF: "yyyy-mm-dd",
      defval: "",
    }) as (string | number | undefined)[][];
  } catch (e) {
    throw new Error("تعذر قراءة بيانات ورقة العمل.");
  }

  if (!jsonData || jsonData.length < 2) {
    throw new Error("الملف لا يحتوي على بيانات كافية (يجب أن يكون هناك صف عناوين وصف بيانات واحد على الأقل).");
  }

  // Find header row — first row with 3+ non-empty cells
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
    throw new Error("لم يتم العثور على صف العناوين. تأكد من أن الملف يحتوي على صف عناوين واضح.");
  }

  // Extract headers
  const rawHeaders = jsonData[headerRow] || [];
  const headers: string[] = [];
  const headerIndices: number[] = [];

  for (let i = 0; i < rawHeaders.length; i++) {
    const h = String(rawHeaders[i] || "").trim();
    if (h) {
      headers.push(h);
      headerIndices.push(i);
    }
  }

  if (headers.length === 0) {
    throw new Error("لم يتم العثور على أعمدة في صف العناوين.");
  }

  // Parse data rows using the header indices for correct column mapping
  const rows: Record<string, string>[] = [];
  for (let i = headerRow + 1; i < jsonData.length; i++) {
    const rowData = jsonData[i];
    if (!Array.isArray(rowData)) continue;

    // Check if row has any data
    const hasData = rowData.some((v, idx) =>
      headerIndices.includes(idx) && v !== undefined && v !== null && String(v).trim() !== ""
    );
    if (!hasData) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, hIdx) => {
      const colIdx = headerIndices[hIdx];
      const val = rowData[colIdx];
      row[h] = val !== undefined && val !== null ? String(val).trim() : "";
    });
    rows.push(row);
  }

  if (rows.length === 0) {
    throw new Error("الملف لا يحتوي على صفوف بيانات بعد العناوين.");
  }

  return {
    headers,
    rows,
    fileName: file.name,
    rowCount: rows.length,
  };
}

/**
 * Parse CSV/TSV text into standard format
 */
function parseCSVText(text: string, fileName: string): ParsedFile {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) throw new Error("الملف يجب أن يحتوي على صف عناوين وصف بيانات واحد على الأقل.");

  // Detect separator
  const firstLine = lines[0];
  let sep = ",";
  if (firstLine.includes("\t") && !firstLine.includes(",")) sep = "\t";
  else if (firstLine.includes(";") && !firstLine.includes(",")) sep = ";";

  const headers = lines[0]
    .split(sep)
    .map((h) => h.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);

  if (headers.length === 0) {
    throw new Error("لم يتم العثور على أعمدة في صف العناوين.");
  }

  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(sep).map((v) => v.trim().replace(/^["']|["']$/g, ""));
    if (vals.every((v) => !v)) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = vals[idx] || "";
    });
    rows.push(row);
  }

  if (rows.length === 0) {
    throw new Error("الملف لا يحتوي على صفوف بيانات.");
  }

  return { headers, rows, fileName, rowCount: rows.length };
}

// ============ ARABIC & MULTILINGUAL COLUMN DETECTION ============

const ARABIC_MAPPINGS: Record<string, string[]> = {
  // AR columns
  invoice_date: ["تاريخ الفاتورة", "التاريخ", "تاريخ", "Date", "Invoice_Date"],
  invoice_amount: ["المبلغ", "مبلغ الفاتورة", "القيمة", "إجمالي", "الإجمالي", "Amount", "Invoice_Amount", "Total"],
  paid_date: ["تاريخ الدفع", "تاريخ السداد", "Paid_Date", "Payment_Date"],
  invoice_id: ["رقم الفاتورة", "رمز الفاتورة", "Invoice_ID", "ID"],
  customer: ["العميل", "اسم العميل", "الشريك", "Customer", "Client"],

  // AP columns
  bill_date: ["تاريخ الفاتورة", "التاريخ", "تاريخ", "Date", "Bill_Date"],
  bill_amount: ["المبلغ", "مبلغ الفاتورة", "القيمة", "إجمالي", "الإجمالي", "Amount", "Bill_Amount", "Total"],
  payment_date: ["تاريخ الدفع", "تاريخ السداد", "Payment_Date", "Paid_Date"],
  vendor: ["المورد", "اسم المورد", "الشريك", "الحساب", "Vendor", "Supplier"],

  // GL columns
  account_code: ["رمز", "رمز الحساب", "كود الحساب", "Account", "Account_Code", "Code"],
  account_name: ["اسم الحساب", "الحساب", "Account_Name", "Name"],
  debit: ["المدين", "مدين", "Debit"],
  credit: ["الدائن", "دائن", "Credit"],
  balance: ["الرصيد", "صافي", "Balance", "Net"],
  amount: ["المبلغ", "القيمة", "Amount"],
  description: ["الوصف", "البيان", "التواصل", "Description", "Memo"],
  gl_date: ["التاريخ", "تاريخ", "Date", "Trans_Date"],

  // AP Aging specific
  aging_1_30: ["1-30"],
  aging_31_60: ["31-60"],
  aging_61_90: ["61-90"],
  aging_91_120: ["91-120"],
  aging_older: ["أقدم", "Older", "120+"],
  expected_date: ["التاريخ المتوقع", "Expected_Date", "Due_Date"],
};

/**
 * Detect a column by checking both English and Arabic patterns
 */
export function detectColumnMultilingual(headers: string[], fieldName: string): string | null {
  const patterns = ARABIC_MAPPINGS[fieldName] || [];

  // Exact match first
  for (const pattern of patterns) {
    const match = headers.find((h) => h.trim() === pattern.trim());
    if (match) return match;
  }

  // Partial/contains match
  for (const pattern of patterns) {
    const match = headers.find((h) =>
      h.includes(pattern) || pattern.includes(h)
    );
    if (match) return match;
  }

  return null;
}

/**
 * Determine file type (AR, AP, or GL) from headers
 */
export function detectFileType(headers: string[]): "ar" | "ap" | "gl" | "unknown" {
  const headerStr = headers.join(" ");

  // GL indicators (Debit/Credit columns are definitive)
  const glIndicators = ["المدين", "الدائن", "الرصيد", "Debit", "Credit", "Balance"];
  if (glIndicators.some((ind) => headers.some(h => h.includes(ind)))) return "gl";

  // AP aging indicators
  const apAgingIndicators = ["1-30", "31-60", "61-90", "91-120"];
  if (apAgingIndicators.some((ind) => headers.some(h => h === ind))) return "ap";

  // AR indicators
  if (headers.some(h => h.toLowerCase().includes("invoice") || h.includes("فاتورة"))) return "ar";

  // AP indicators
  if (headers.some(h => h.toLowerCase().includes("bill") || h.includes("مورد") || h.includes("payable"))) return "ap";

  return "unknown";
}

/**
 * Convert GL with Debit/Credit columns to standard Amount format
 */
export function normalizeGLData(parsed: ParsedFile): ParsedFile {
  const debitCol = detectColumnMultilingual(parsed.headers, "debit");
  const creditCol = detectColumnMultilingual(parsed.headers, "credit");
  const accountCol = detectColumnMultilingual(parsed.headers, "account_code");
  const nameCol = detectColumnMultilingual(parsed.headers, "account_name");

  // If we have debit/credit columns, compute net amount for each row
  if (debitCol || creditCol) {
    const outputHeaders = ["Account", "Amount", "Description"];
    const outputRows = parsed.rows
      .filter(row => {
        // Must have an account code
        const acct = accountCol ? row[accountCol] : "";
        return acct && acct.trim().length > 0;
      })
      .map((row) => {
        const debitStr = String(row[debitCol || ""] || "0").replace(/,/g, "").trim();
        const creditStr = String(row[creditCol || ""] || "0").replace(/,/g, "").trim();
        const debit = parseFloat(debitStr) || 0;
        const credit = parseFloat(creditStr) || 0;
        const net = debit - credit;

        const desc = nameCol ? (row[nameCol] || "").trim() : "";
        const acct = accountCol ? (row[accountCol] || "").trim() : "";

        return {
          Account: acct,
          Amount: String(net),
          Description: desc,
        };
      });

    return {
      headers: outputHeaders,
      rows: outputRows,
      fileName: parsed.fileName,
      rowCount: outputRows.length,
    };
  }

  return parsed;
}

/**
 * Convert AP aging report to standard AP format.
 * Handles comma-formatted amounts and skips total/summary rows.
 */
export function normalizeAPAgingData(parsed: ParsedFile): ParsedFile {
  const col1_30 = detectColumnMultilingual(parsed.headers, "aging_1_30");
  const col31_60 = detectColumnMultilingual(parsed.headers, "aging_31_60");
  const col61_90 = detectColumnMultilingual(parsed.headers, "aging_61_90");
  const col91_120 = detectColumnMultilingual(parsed.headers, "aging_91_120");
  const colOlder = detectColumnMultilingual(parsed.headers, "aging_older");

  // Total/summary row labels to skip
  const totalLabels = [
    "حسابات دائنة مستحقة",
    "حسابات مدينة مستحقة",
    "الإجمالي",
    "total",
    "المجموع",
    "الكل",
  ];

  if (col1_30 || col31_60 || col61_90 || col91_120) {
    const newRows: Record<string, string>[] = [];
    const today = new Date();

    parsed.rows.forEach((row) => {
      // Find vendor name — first column with text that isn't a number
      let vendor = "";
      for (const h of parsed.headers) {
        const val = (row[h] || "").trim();
        if (!val || val.length < 2) continue;
        // Skip if it looks like a number (even with commas)
        const cleaned = val.replace(/,/g, "");
        if (/^\d+\.?\d*$/.test(cleaned)) continue;
        // Skip date-looking values
        if (/^\d{4}-\d{2}/.test(val) || /^\d{2}\/\d{2}/.test(val)) continue;
        vendor = val;
        break;
      }
      if (!vendor) return;

      // Skip total/summary rows
      const isTotal = totalLabels.some((label) => vendor.includes(label));
      if (isTotal) return;

      // Extract amounts from aging buckets
      const buckets = [
        { col: col1_30, daysBack: 15 },
        { col: col31_60, daysBack: 45 },
        { col: col61_90, daysBack: 75 },
        { col: col91_120, daysBack: 105 },
        { col: colOlder, daysBack: 150 },
      ];

      buckets.forEach(({ col, daysBack }) => {
        if (!col) return;
        const rawVal = String(row[col] || "").replace(/,/g, "").trim();
        const amt = parseFloat(rawVal) || 0;
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
      };
    }
  }

  return parsed;
}

/**
 * Convert parsed file to CSV text that the financial engine can consume
 */
export function parsedFileToCSV(parsed: ParsedFile): string {
  const lines = [parsed.headers.join(",")];
  parsed.rows.forEach((row) => {
    const vals = parsed.headers.map((h) => {
      const v = row[h] || "";
      return v.includes(",") ? `"${v}"` : v;
    });
    lines.push(vals.join(","));
  });
  return lines.join("\n");
}
