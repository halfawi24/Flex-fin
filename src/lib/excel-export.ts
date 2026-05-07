"use client";

import type { FullAnalysis } from "./financial-engine";

export async function exportToExcel(analysis: FullAnalysis): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const { saveAs } = await import("file-saver");

  const wb = new ExcelJS.Workbook();
  wb.creator = "FlexFinToolkit";
  wb.created = new Date();

  const currencyFmt = '$#,##0';
  const pctFmt = '0.0%';
  const daysFmt = '0.0';

  // ─── Assumptions Sheet ───
  const wsA = wb.addWorksheet("Assumptions");
  wsA.columns = [{ width: 28 }, { width: 18 }];
  wsA.getCell("A1").value = "FINANCIAL ASSUMPTIONS";
  wsA.getCell("A1").font = { bold: true, size: 13 };
  wsA.mergeCells("A1:B1");

  const assumptions = [
    ["Opening Cash Balance", analysis.assumptions.openingCash],
    ["", ""],
    ["REVENUE DRIVERS", ""],
    ["Month 1 Revenue", analysis.assumptions.m1Revenue],
    ["Monthly Revenue Growth %", analysis.assumptions.growthRate],
    ["", ""],
    ["OPERATING ASSUMPTIONS", ""],
    ["COGS as % of Revenue", analysis.assumptions.cogsPct],
    ["Operating Expenses (Monthly)", analysis.assumptions.monthlyOpex],
    ["CapEx (Monthly)", analysis.assumptions.monthlyCapex],
    ["Tax Rate %", analysis.assumptions.taxRate],
    ["", ""],
    ["WORKING CAPITAL", ""],
    ["AR Days Outstanding", analysis.ar.dso],
    ["AP Days Outstanding", analysis.ap.dpo],
    ["Cash Conversion Cycle", analysis.ccc],
    ["", ""],
    ["FUNDING", ""],
    ["LOC Available Amount", analysis.assumptions.locSize],
  ];
  assumptions.forEach((row, i) => {
    wsA.getCell(`A${i + 3}`).value = row[0];
    wsA.getCell(`B${i + 3}`).value = row[1];
    if (typeof row[1] === "number" && row[1] > 100) {
      wsA.getCell(`B${i + 3}`).numFmt = currencyFmt;
    }
  });

  // ─── Cash Flow Forecast ───
  const wsCF = wb.addWorksheet("CashFlowForecast");
  wsCF.getCell("A1").value = "MONTHLY CASH FLOW FORECAST";
  wsCF.getCell("A1").font = { bold: true, size: 13 };

  const cfHeaders = ["Line Item", ...analysis.forecast.map(m => `M${m.month}`)];
  const cfRow = wsCF.addRow(cfHeaders);
  cfRow.font = { bold: true };
  cfRow.eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD6E4F0" } }; });

  const cfLines: { label: string; key: keyof typeof analysis.forecast[0] }[] = [
    { label: "Revenue", key: "revenue" },
    { label: "COGS", key: "cogs" },
    { label: "Gross Profit", key: "grossProfit" },
    { label: "OpEx", key: "opex" },
    { label: "EBITDA", key: "ebitda" },
    { label: "CapEx", key: "capex" },
    { label: "WC Change", key: "wcChange" },
    { label: "Taxes", key: "taxes" },
    { label: "Net Cash Flow", key: "netCashFlow" },
    { label: "Starting Cash", key: "startingCash" },
    { label: "Ending Cash", key: "endingCash" },
  ];

  cfLines.forEach(line => {
    const row = wsCF.addRow([line.label, ...analysis.forecast.map(m => Math.round(m[line.key] as number))]);
    row.eachCell((c, colNumber) => {
      if (colNumber > 1) c.numFmt = currencyFmt;
    });
    if (["Gross Profit", "EBITDA", "Net Cash Flow", "Ending Cash"].includes(line.label)) {
      row.font = { bold: true };
    }
  });

  wsCF.columns = [{ width: 16 }, ...Array(12).fill({ width: 14 })];

  // ─── Budget vs Actual ───
  const wsBVA = wb.addWorksheet("BudgetVsActual");
  wsBVA.getCell("A1").value = "BUDGET VS ACTUAL — VARIANCE ANALYSIS";
  wsBVA.getCell("A1").font = { bold: true, size: 13 };

  const bvaHeaders = ["Metric", "Budget", "Actual", "Variance", "Var %", "Status"];
  const bvaHRow = wsBVA.addRow(bvaHeaders);
  bvaHRow.font = { bold: true };

  analysis.budgetVariance.forEach(row => {
    const r = wsBVA.addRow([row.metric, row.budget, row.actual, row.variance, row.variancePct, row.status]);
    r.getCell(2).numFmt = currencyFmt;
    r.getCell(3).numFmt = currencyFmt;
    r.getCell(4).numFmt = currencyFmt;
    r.getCell(5).numFmt = pctFmt;
  });
  wsBVA.columns = [{ width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 10 }, { width: 12 }];

  // ─── Scenario Analysis ───
  const wsSA = wb.addWorksheet("ScenarioAnalysis");
  wsSA.getCell("A1").value = "SCENARIO ANALYSIS — BASE / BEST / WORST";
  wsSA.getCell("A1").font = { bold: true, size: 13 };

  const saHeaders = ["Metric", "Base Case", "Best Case", "Worst Case"];
  const saHRow = wsSA.addRow(saHeaders);
  saHRow.font = { bold: true };

  const saRows = [
    ["M12 Ending Cash", analysis.scenarios.base.endingCashM12, analysis.scenarios.best.endingCashM12, analysis.scenarios.worst.endingCashM12],
    ["Avg Monthly NCF", analysis.scenarios.base.avgMonthlyNCF, analysis.scenarios.best.avgMonthlyNCF, analysis.scenarios.worst.avgMonthlyNCF],
    ["Min Cash Balance", analysis.scenarios.base.minCash, analysis.scenarios.best.minCash, analysis.scenarios.worst.minCash],
    ["Total 12M Revenue", analysis.scenarios.base.totalRevenue, analysis.scenarios.best.totalRevenue, analysis.scenarios.worst.totalRevenue],
    ["Total 12M EBITDA", analysis.scenarios.base.totalEbitda, analysis.scenarios.best.totalEbitda, analysis.scenarios.worst.totalEbitda],
  ];
  saRows.forEach(row => {
    const r = wsSA.addRow(row.map(v => typeof v === "number" ? Math.round(v) : v));
    r.eachCell((c, col) => { if (col > 1) c.numFmt = currencyFmt; });
  });
  wsSA.columns = [{ width: 20 }, { width: 16 }, { width: 16 }, { width: 16 }];

  // ─── Working Capital ───
  const wsWC = wb.addWorksheet("WC_Analysis");
  wsWC.getCell("A1").value = "WORKING CAPITAL ANALYSIS";
  wsWC.getCell("A1").font = { bold: true, size: 13 };

  const wcData = [
    ["Total AR", analysis.ar.totalAR],
    ["Outstanding AR", analysis.ar.outstandingAR],
    ["AR Days (DSO)", analysis.ar.dso],
    ["Collection Rate", analysis.ar.collectionRate],
    ["", ""],
    ["Total AP", analysis.ap.totalAP],
    ["Outstanding AP", analysis.ap.outstandingAP],
    ["AP Days (DPO)", analysis.ap.dpo],
    ["Payment Rate", analysis.ap.paymentRate],
    ["", ""],
    ["Cash Conversion Cycle", analysis.ccc],
    ["Net Working Capital", analysis.ar.outstandingAR - analysis.ap.outstandingAP],
    ["", ""],
    ["AR AGING", ""],
    ["0-30 days", analysis.ar.aging["0-30"]],
    ["31-60 days", analysis.ar.aging["31-60"]],
    ["61-90 days", analysis.ar.aging["61-90"]],
    ["90+ days", analysis.ar.aging["90+"]],
  ];
  const wcHRow = wsWC.addRow(["Metric", "Value"]);
  wcHRow.font = { bold: true };
  wcData.forEach(([label, val]) => {
    wsWC.addRow([label, typeof val === "number" ? Math.round(val * 100) / 100 : val]);
  });
  wsWC.columns = [{ width: 24 }, { width: 18 }];

  // ─── Dashboard KPIs ───
  const wsD = wb.addWorksheet("Dashboard");
  wsD.getCell("A1").value = "EXECUTIVE DASHBOARD";
  wsD.getCell("A1").font = { bold: true, size: 13 };

  const totalRev = analysis.forecast.reduce((s, m) => s + m.revenue, 0);
  const totalEbitda = analysis.forecast.reduce((s, m) => s + m.ebitda, 0);
  const avgNCF = analysis.forecast.reduce((s, m) => s + m.netCashFlow, 0) / 12;

  const kpis = [
    ["Starting Cash", analysis.forecast[0].startingCash],
    ["Ending Cash (M12)", analysis.forecast[11].endingCash],
    ["Cash Change", analysis.forecast[11].endingCash - analysis.forecast[0].startingCash],
    ["12M Revenue", totalRev],
    ["12M EBITDA", totalEbitda],
    ["EBITDA Margin", totalEbitda / totalRev],
    ["Avg Monthly NCF", avgNCF],
    ["Min Cash Balance", Math.min(...analysis.forecast.map(m => m.endingCash))],
    ["DSO", analysis.ar.dso],
    ["DPO", analysis.ap.dpo],
    ["CCC", analysis.ccc],
    ["DSCR", analysis.funding.dscr],
    ["LOC Available", analysis.funding.locSize],
  ];
  const dHRow = wsD.addRow(["KPI", "Value"]);
  dHRow.font = { bold: true };
  kpis.forEach(([label, val]) => {
    const r = wsD.addRow([label, typeof val === "number" ? Math.round(val * 100) / 100 : val]);
    if (typeof val === "number" && Math.abs(val) > 100) r.getCell(2).numFmt = currencyFmt;
  });
  wsD.columns = [{ width: 22 }, { width: 18 }];

  // ─── Funding Sources ───
  const wsF = wb.addWorksheet("FundingSources");
  wsF.getCell("A1").value = "FUNDING SOURCES & DEBT SERVICE";
  wsF.getCell("A1").font = { bold: true, size: 13 };

  const fundData = [
    ["LOC Size", analysis.funding.locSize],
    ["LOC Rate", analysis.funding.locRate],
    ["LOC Monthly Interest", analysis.funding.locMonthlyInterest],
    ["", ""],
    ["Term Loan Amount", analysis.funding.loanAmount],
    ["Loan Term (months)", analysis.funding.loanTerm],
    ["Loan Annual Rate", analysis.funding.loanRate],
    ["Monthly Payment (PMT)", analysis.funding.pmt],
    ["", ""],
    ["Factoring Fee %", analysis.funding.factoringFee],
    ["AR Value (est.)", analysis.funding.arValue],
    ["Factoring Cost/Month", analysis.funding.factoringCost],
    ["", ""],
    ["DSCR", analysis.funding.dscr],
    ["Total Debt Service/Month", analysis.funding.totalDebtService],
  ];
  const fHRow = wsF.addRow(["Item", "Value"]);
  fHRow.font = { bold: true };
  fundData.forEach(([label, val]) => {
    wsF.addRow([label, typeof val === "number" ? Math.round(val * 100) / 100 : val]);
  });
  wsF.columns = [{ width: 24 }, { width: 18 }];

  // ─── Save ───
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `FlexFinToolkit_Analysis_${new Date().toISOString().split("T")[0]}.xlsx`);
}
