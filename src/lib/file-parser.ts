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
 * Parse Excel file using SheetJS
 */
async function parseExcelFile(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  // Use first sheet (skip filter/metadata sheets)
  let sheetName = workbook.SheetNames[0];
  // Try to find the main data sheet (skip sheets with very few rows)
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    const rowCount = range.e.r - range.s.r;
    if (rowCount > 3) {
      sheetName = name;
      break;
    }
  }

  const ws = workbook.Sheets[sheetName];

  // Find the header row (first row with multiple values)
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  let headerRow = 0;

  for (let r = range.s.r; r <= Math.min(range.e.r, 5); r++) {
    let cellCount = 0;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.v !== undefined && cell.v !== null && cell.v !== "") {
        cellCount++;
      }
    }
    if (cellCount >= 3) {
      headerRow = r;
      break;
    }
  }

  // Extract using the detected header row
  const jsonData = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: false,
    dateNF: "yyyy-mm-dd",
  }) as (string | number | undefined)[][];

  if (!jsonData || jsonData.length < 2) {
    throw new Error("Excel file has no data rows");
  }

  // Get headers from detected header row
  const rawHeaders = (jsonData[headerRow] || []) as string[];
  const headers = rawHeaders.map((h) => String(h || "").trim()).filter(Boolean);

  if (headers.length === 0) {
    throw new Error("Could not detect column headers in Excel file");
  }

  // Parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = headerRow + 1; i < jsonData.length; i++) {
    const rowData = jsonData[i] as (string | number | undefined)[];
    if (!rowData || rowData.every((v) => !v && v !== 0)) continue; // skip empty rows

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      const val = rowData[idx];
      row[h] = val !== undefined && val !== null ? String(val) : "";
    });
    rows.push(row);
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
  if (lines.length < 2) throw new Error("File must have at least a header and one data row");

  // Detect separator
  const firstLine = lines[0];
  let sep = ",";
  if (firstLine.includes("\t") && !firstLine.includes(",")) sep = "\t";
  else if (firstLine.includes(";") && !firstLine.includes(",")) sep = ";";

  const headers = lines[0]
    .split(sep)
    .map((h) => h.trim().replace(/^["']|["']$/g, ""));
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

  return { headers, rows, fileName, rowCount: rows.length };
}

// ============ ARABIC & MULTILINGUAL COLUMN DETECTION ============

// Arabic column name mappings
const ARABIC_MAPPINGS: Record<string, string[]> = {
  // AR columns
  invoice_date: ["تاريخ الفاتورة", "التاريخ", "تاريخ", "Date", "Invoice_Date"],
  invoice_amount: ["المبلغ", "مبلغ الفاتورة", "القيمة", "إجمالي", "Amount", "Invoice_Amount", "Total"],
  paid_date: ["تاريخ الدفع", "تاريخ السداد", "Paid_Date", "Payment_Date"],
  invoice_id: ["رقم الفاتورة", "رمز الفاتورة", "Invoice_ID", "ID"],
  customer: ["العميل", "اسم العميل", "الشريك", "Customer", "Client"],

  // AP columns
  bill_date: ["تاريخ الفاتورة", "التاريخ", "تاريخ", "Date", "Bill_Date"],
  bill_amount: ["المبلغ", "مبلغ الفاتورة", "القيمة", "إجمالي", "Amount", "Bill_Amount", "Total"],
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
  // Also include standard English detection from financial-engine
  const allPatterns = [...patterns];

  // Exact match
  for (const pattern of allPatterns) {
    const match = headers.find((h) => h.trim() === pattern.trim());
    if (match) return match;
  }

  // Partial/fuzzy match
  for (const pattern of allPatterns) {
    const match = headers.find((h) =>
      h.toLowerCase().includes(pattern.toLowerCase()) ||
      pattern.toLowerCase().includes(h.toLowerCase())
    );
    if (match) return match;
  }

  return null;
}

/**
 * Determine file type (AR, AP, or GL) from headers
 */
export function detectFileType(headers: string[]): "ar" | "ap" | "gl" | "unknown" {
  const headerStr = headers.join(" ").toLowerCase();
  const hasArabic = /[\u0600-\u06FF]/.test(headerStr);

  // GL indicators
  const glIndicators = ["المدين", "الدائن", "الرصيد", "debit", "credit", "balance", "رمز", "account", "gl_account"];
  if (glIndicators.some((ind) => headerStr.includes(ind.toLowerCase()))) return "gl";

  // AP aging indicators
  const apAgingIndicators = ["1-30", "31-60", "61-90", "91-120", "أقدم", "حسابات دائنة", "payable"];
  if (apAgingIndicators.some((ind) => headerStr.includes(ind.toLowerCase()))) return "ap";

  // AR indicators
  const arIndicators = ["invoice", "فاتورة", "receivable", "حسابات مدينة"];
  if (arIndicators.some((ind) => headerStr.includes(ind.toLowerCase()))) return "ar";

  // AP indicators
  const apIndicators = ["bill", "vendor", "supplier", "مورد", "payable"];
  if (apIndicators.some((ind) => headerStr.includes(ind.toLowerCase()))) return "ap";

  return "unknown";
}

/**
 * Convert GL with Debit/Credit columns to standard Amount format
 */
export function normalizeGLData(parsed: ParsedFile): ParsedFile {
  const debitCol = detectColumnMultilingual(parsed.headers, "debit");
  const creditCol = detectColumnMultilingual(parsed.headers, "credit");
  const balanceCol = detectColumnMultilingual(parsed.headers, "balance");
  const accountCol = detectColumnMultilingual(parsed.headers, "account_code");
  const nameCol = detectColumnMultilingual(parsed.headers, "account_name");

  // If we have debit/credit but no Amount, compute net amount
  if ((debitCol || creditCol) && !parsed.headers.includes("Amount")) {
    const newHeaders = [...parsed.headers, "Amount", "Description"];
    const newRows = parsed.rows.map((row) => {
      const debit = parseFloat(String(row[debitCol || ""] || "0").replace(/,/g, "")) || 0;
      const credit = parseFloat(String(row[creditCol || ""] || "0").replace(/,/g, "")) || 0;
      const net = debit - credit; // Positive = debit (asset/expense), Negative = credit (revenue/liability)

      // Use account name as description if available
      const desc = nameCol ? row[nameCol] || "" : "";
      const acct = accountCol ? row[accountCol] || "" : "";

      return {
        ...row,
        Amount: String(net),
        Description: desc,
        Account: acct || row["Account"] || "",
      };
    });
    return { ...parsed, headers: newHeaders, rows: newRows };
  }

  return parsed;
}

/**
 * Convert AP aging report to standard AP format.
 * Handles comma-formatted amounts (e.g., "5,750.00") and skips total/summary rows.
 */
export function normalizeAPAgingData(parsed: ParsedFile): ParsedFile {
  // AP aging has vendor names as rows with aging bucket amounts
  const col1_30 = detectColumnMultilingual(parsed.headers, "aging_1_30");
  const col31_60 = detectColumnMultilingual(parsed.headers, "aging_31_60");
  const col61_90 = detectColumnMultilingual(parsed.headers, "aging_61_90");
  const col91_120 = detectColumnMultilingual(parsed.headers, "aging_91_120");
  const colOlder = detectColumnMultilingual(parsed.headers, "aging_older");

  // Known total/summary row labels to skip
  const totalLabels = [
    "حسابات دائنة مستحقة متأخرة",
    "حسابات مدينة مستحقة متأخرة",
    "الإجمالي",
    "total",
    "المجموع",
  ];

  // If this looks like an aging report, convert to standard AP format
  if (col1_30 || col31_60 || col61_90) {
    const newRows: Record<string, string>[] = [];
    const today = new Date();

    parsed.rows.forEach((row) => {
      // Get vendor name (first text column)
      let vendor = "";
      for (const h of parsed.headers) {
        const val = row[h];
        if (val && val.trim().length > 2) {
          // Check if it's a number (skip numeric columns)
          const cleanVal = val.replace(/,/g, "").trim();
          if (!isNaN(parseFloat(cleanVal)) && cleanVal.match(/^\d/)) continue;
          vendor = val.trim();
          break;
        }
      }
      if (!vendor) return;

      // Skip total/summary rows
      const isTotal = totalLabels.some((label) =>
        vendor.includes(label) || vendor.toLowerCase().includes("total")
      );
      if (isTotal) return;

      // Create individual AP records from aging buckets
      const buckets = [
        { col: col1_30, daysBack: 15 },
        { col: col31_60, daysBack: 45 },
        { col: col61_90, daysBack: 75 },
        { col: col91_120, daysBack: 105 },
        { col: colOlder, daysBack: 150 },
      ];

      buckets.forEach(({ col, daysBack }) => {
        if (!col) return;
        // Handle comma-formatted amounts like "5,750.00"
        const rawVal = String(row[col] || "").replace(/,/g, "").trim();
        const amt = parseFloat(rawVal) || 0;
        if (amt > 0) {
          const billDate = new Date(today.getTime() - daysBack * 24 * 60 * 60 * 1000);
          newRows.push({
            Bill_Date: billDate.toISOString().split("T")[0],
            Bill_Amount: String(amt),
            Payment_Date: "", // Unpaid — that's why it's in aging
            Vendor: vendor,
          });
        }
      });
    });

    return {
      headers: ["Bill_Date", "Bill_Amount", "Payment_Date", "Vendor"],
      rows: newRows,
      fileName: parsed.fileName,
      rowCount: newRows.length,
    };
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
      // Quote if contains comma
      return v.includes(",") ? `"${v}"` : v;
    });
    lines.push(vals.join(","));
  });
  return lines.join("\n");
}
