"use client";

/**
 * Client-side file utilities.
 * Excel parsing is handled server-side via /api/parse-file.
 * This file only handles CSV parsing and type detection for the client.
 */

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
  rowCount: number;
}

// Kept for backward compatibility but not used for Excel
export function detectFileType(headers: string[]): "ar" | "ap" | "gl" | "unknown" {
  const glIndicators = ["المدين", "الدائن", "الرصيد", "Debit", "Credit", "Balance"];
  if (glIndicators.some(ind => headers.some(h => h.includes(ind)))) return "gl";

  const apAgingIndicators = ["1-30", "31-60", "61-90", "91-120"];
  if (apAgingIndicators.some(ind => headers.some(h => h === ind))) return "ap";

  return "unknown";
}

export function detectColumnMultilingual(headers: string[], fieldName: string): string | null {
  return null; // Not used client-side anymore
}

export function normalizeGLData(parsed: ParsedFile): ParsedFile {
  return parsed; // Done server-side now
}

export function normalizeAPAgingData(parsed: ParsedFile): ParsedFile {
  return parsed; // Done server-side now
}

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
