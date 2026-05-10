/**
 * FlexFinToolkit — Financial Computation Engine
 * All calculations done in TypeScript. No external APIs needed.
 */

// ============ TYPES ============

export interface ARRecord {
  invoiceDate: Date;
  invoiceAmount: number;
  paidDate: Date | null;
  invoiceId?: string;
  customer?: string;
}

export interface APRecord {
  billDate: Date;
  billAmount: number;
  paymentDate: Date | null;
  billId?: string;
  vendor?: string;
}

export interface GLRecord {
  account: string;
  amount: number;
  description: string;
  date?: Date;
}

export interface ARAnalysis {
  dso: number;
  totalAR: number;
  outstandingAR: number;
  collectionRate: number;
  avgInvoice: number;
  monthlyRevenueEst: number;
  aging: { '0-30': number; '31-60': number; '61-90': number; '90+': number };
  invoiceCount: number;
}

export interface APAnalysis {
  dpo: number;
  totalAP: number;
  outstandingAP: number;
  paymentRate: number;
  avgBill: number;
  monthlyCOGSEst: number;
  billCount: number;
}

export interface GLAnalysis {
  revenue: number;
  cogs: number;
  opex: number;
  grossProfit: number;
  ebitda: number;
  opexBreakdown: Record<string, number>;
}

export interface Assumptions {
  openingCash: number;
  m1Revenue: number;
  growthRate: number;
  cogsPct: number;
  monthlyOpex: number;
  monthlyCapex: number;
  taxRate: number;
  arDays: number;
  apDays: number;
  locSize: number;
  locRate: number;
  loanAmount: number;
  loanTerm: number;
  loanRate: number;
  factoringFee: number;
}

export interface ForecastMonth {
  month: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  ebitda: number;
  capex: number;
  wcChange: number;
  taxes: number;
  netCashFlow: number;
  startingCash: number;
  endingCash: number;
}

export interface ScenarioResult {
  endingCashM12: number;
  avgMonthlyNCF: number;
  minCash: number;
  totalRevenue: number;
  totalEbitda: number;
  forecast: ForecastMonth[];
}

export interface FundingMetrics {
  locSize: number;
  locRate: number;
  locMonthlyInterest: number;
  loanAmount: number;
  loanTerm: number;
  loanRate: number;
  pmt: number;
  factoringFee: number;
  arValue: number;
  factoringCost: number;
  dscr: number;
  totalDebtService: number;
}

export interface BudgetVariance {
  metric: string;
  budget: number;
  actual: number;
  variance: number;
  variancePct: number;
  status: 'On Track' | 'Over' | 'Under';
}

export interface DataSources {
  hasAR: boolean;
  hasAP: boolean;
  hasGL: boolean;
}

export interface FullAnalysis {
  ar: ARAnalysis;
  ap: APAnalysis;
  gl: GLAnalysis;
  assumptions: Assumptions;
  forecast: ForecastMonth[];
  scenarios: { base: ScenarioResult; best: ScenarioResult; worst: ScenarioResult };
  funding: FundingMetrics;
  budgetVariance: BudgetVariance[];
  ccc: number;
  executiveSummary: string;
  dataSources: DataSources;
}

// ============ CSV PARSING ============

const AR_DATE_COLS = ['invoice_date', 'invoicedate', 'date', 'inv_date', 'issue_date', 'created'];
const AR_AMOUNT_COLS = ['invoice_amount', 'invoiceamount', 'amount', 'total', 'inv_amount', 'ar_amount'];
const AR_PAID_COLS = ['paid_date', 'paiddate', 'payment_date', 'paymentdate', 'received_date', 'settlement_date'];
const AR_ID_COLS = ['invoice_id', 'invoiceid', 'id', 'inv_id', 'invoice_number'];
const AR_CUSTOMER_COLS = ['customer', 'client', 'customer_name', 'clientname'];

const AP_DATE_COLS = ['bill_date', 'billdate', 'date', 'invoice_date', 'issue_date', 'created'];
const AP_AMOUNT_COLS = ['bill_amount', 'billamount', 'amount', 'total', 'payableamount', 'ap_amount'];
const AP_PAID_COLS = ['payment_date', 'paymentdate', 'paid_date', 'paiddate', 'pay_date', 'settlement_date'];
const AP_ID_COLS = ['bill_id', 'billid', 'id', 'bill_number'];
const AP_VENDOR_COLS = ['vendor', 'supplier', 'vendor_name', 'suppliername'];

const GL_ACCOUNT_COLS = ['account', 'account_code', 'gl_account', 'acctcode', 'code', 'accountnumber', 'acct'];
const GL_AMOUNT_COLS = ['amount', 'debit', 'credit', 'balance', 'gl_amount', 'value'];
const GL_DESC_COLS = ['description', 'desc', 'memo', 'notes', 'name', 'account_name'];
const GL_DATE_COLS = ['date', 'trans_date', 'transaction_date', 'posted_date', 'period'];

function detectColumn(headers: string[], patterns: string[]): string | null {
  const normalized = headers.map(h => h.toLowerCase().replace(/[_\s-]/g, ''));
  for (const pattern of patterns) {
    const normalizedPattern = pattern.toLowerCase().replace(/[_\s-]/g, '');
    const idx = normalized.indexOf(normalizedPattern);
    if (idx !== -1) return headers[idx];
  }
  // Fuzzy: check if any header contains the pattern
  for (const pattern of patterns) {
    const normalizedPattern = pattern.toLowerCase().replace(/[_\s-]/g, '');
    const idx = normalized.findIndex(h => h.includes(normalizedPattern) || normalizedPattern.includes(h));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

function parseDate(val: string | null | undefined): Date | null {
  if (!val || val.trim() === '') return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function parseNumber(val: string | null | undefined): number {
  if (!val || val.trim() === '') return 0;
  const cleaned = val.replace(/[,$\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };
  
  // Detect separator
  const firstLine = lines[0];
  let sep = ',';
  if (firstLine.includes('\t') && !firstLine.includes(',')) sep = '\t';
  else if (firstLine.includes(';') && !firstLine.includes(',')) sep = ';';
  
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(sep).map(v => v.trim().replace(/^["']|["']$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = vals[idx] || '';
    });
    rows.push(row);
  }
  
  return { headers, rows };
}

export function parseARData(text: string): ARRecord[] {
  const { headers, rows } = parseCSV(text);
  const dateCol = detectColumn(headers, AR_DATE_COLS);
  const amountCol = detectColumn(headers, AR_AMOUNT_COLS);
  const paidCol = detectColumn(headers, AR_PAID_COLS);
  const idCol = detectColumn(headers, AR_ID_COLS);
  const customerCol = detectColumn(headers, AR_CUSTOMER_COLS);

  if (!dateCol || !amountCol) {
    throw new Error(`Could not detect AR columns. Found: ${headers.join(', ')}. Need: date column + amount column.`);
  }

  return rows.map(row => ({
    invoiceDate: parseDate(row[dateCol]) || new Date(),
    invoiceAmount: parseNumber(row[amountCol]),
    paidDate: paidCol ? parseDate(row[paidCol]) : null,
    invoiceId: idCol ? row[idCol] : undefined,
    customer: customerCol ? row[customerCol] : undefined,
  })).filter(r => r.invoiceAmount > 0);
}

export function parseAPData(text: string): APRecord[] {
  const { headers, rows } = parseCSV(text);
  const dateCol = detectColumn(headers, AP_DATE_COLS);
  const amountCol = detectColumn(headers, AP_AMOUNT_COLS);
  const paidCol = detectColumn(headers, AP_PAID_COLS);
  const idCol = detectColumn(headers, AP_ID_COLS);
  const vendorCol = detectColumn(headers, AP_VENDOR_COLS);

  if (!dateCol || !amountCol) {
    throw new Error(`Could not detect AP columns. Found: ${headers.join(', ')}. Need: date column + amount column.`);
  }

  return rows.map(row => ({
    billDate: parseDate(row[dateCol]) || new Date(),
    billAmount: parseNumber(row[amountCol]),
    paymentDate: paidCol ? parseDate(row[paidCol]) : null,
    billId: idCol ? row[idCol] : undefined,
    vendor: vendorCol ? row[vendorCol] : undefined,
  })).filter(r => r.billAmount > 0);
}

export function parseGLData(text: string): GLRecord[] {
  const { headers, rows } = parseCSV(text);
  const accountCol = detectColumn(headers, GL_ACCOUNT_COLS);
  const amountCol = detectColumn(headers, GL_AMOUNT_COLS);
  const descCol = detectColumn(headers, GL_DESC_COLS);
  const dateCol = detectColumn(headers, GL_DATE_COLS);

  if (!accountCol || !amountCol) {
    throw new Error(`Could not detect GL columns. Found: ${headers.join(', ')}. Need: account column + amount column.`);
  }

  return rows.map(row => ({
    account: row[accountCol] || '',
    amount: parseNumber(row[amountCol]),
    description: descCol ? row[descCol] || '' : '',
    date: dateCol ? parseDate(row[dateCol]) || undefined : undefined,
  })).filter(r => r.amount !== 0 || r.account !== '');
}

// ============ ANALYSIS FUNCTIONS ============

export function analyzeAR(records: ARRecord[]): ARAnalysis {
  const today = new Date();
  const totalAR = records.reduce((s, r) => s + r.invoiceAmount, 0);
  const count = records.length;
  const avgInvoice = count > 0 ? totalAR / count : 0;

  const outstanding = records.filter(r => !r.paidDate);
  const paid = records.filter(r => r.paidDate);

  const outstandingAR = outstanding.reduce((s, r) => s + r.invoiceAmount, 0);
  const collectionRate = totalAR > 0 ? paid.reduce((s, r) => s + r.invoiceAmount, 0) / totalAR : 0;

  // DSO from paid invoices
  let dso: number;
  if (paid.length > 0) {
    const daysArr = paid.map(r => {
      const diff = (r.paidDate!.getTime() - r.invoiceDate.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 ? diff : null;
    }).filter((d): d is number => d !== null);
    dso = daysArr.length > 0 ? daysArr.reduce((a, b) => a + b, 0) / daysArr.length : 30;
  } else if (outstanding.length > 0) {
    const daysArr = outstanding.map(r => 
      (today.getTime() - r.invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    dso = daysArr.reduce((a, b) => a + b, 0) / daysArr.length;
  } else {
    dso = 30;
  }

  // AR Aging
  const aging = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  outstanding.forEach(r => {
    const days = (today.getTime() - r.invoiceDate.getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 30) aging['0-30'] += r.invoiceAmount;
    else if (days <= 60) aging['31-60'] += r.invoiceAmount;
    else if (days <= 90) aging['61-90'] += r.invoiceAmount;
    else aging['90+'] += r.invoiceAmount;
  });

  // Monthly revenue estimate
  const dates = records.map(r => r.invoiceDate.getTime());
  const dateRange = (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24);
  const months = Math.max(dateRange / 30, 1);
  const monthlyRevenueEst = totalAR / months;

  return {
    dso: Math.max(dso, 0),
    totalAR,
    outstandingAR,
    collectionRate,
    avgInvoice,
    monthlyRevenueEst,
    aging,
    invoiceCount: count,
  };
}

export function analyzeAP(records: APRecord[]): APAnalysis {
  const today = new Date();
  const totalAP = records.reduce((s, r) => s + r.billAmount, 0);
  const count = records.length;
  const avgBill = count > 0 ? totalAP / count : 0;

  const outstanding = records.filter(r => !r.paymentDate);
  const paid = records.filter(r => r.paymentDate);

  const outstandingAP = outstanding.reduce((s, r) => s + r.billAmount, 0);
  const paymentRate = totalAP > 0 ? paid.reduce((s, r) => s + r.billAmount, 0) / totalAP : 0;

  let dpo: number;
  if (paid.length > 0) {
    const daysArr = paid.map(r => {
      const diff = (r.paymentDate!.getTime() - r.billDate.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 ? diff : null;
    }).filter((d): d is number => d !== null);
    dpo = daysArr.length > 0 ? daysArr.reduce((a, b) => a + b, 0) / daysArr.length : 45;
  } else if (outstanding.length > 0) {
    const daysArr = outstanding.map(r =>
      (today.getTime() - r.billDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    dpo = daysArr.reduce((a, b) => a + b, 0) / daysArr.length;
  } else {
    dpo = 45;
  }

  const dates = records.map(r => r.billDate.getTime());
  const dateRange = (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24);
  const months = Math.max(dateRange / 30, 1);
  const monthlyCOGSEst = totalAP / months;

  return {
    dpo: Math.max(dpo, 0),
    totalAP,
    outstandingAP,
    paymentRate,
    avgBill,
    monthlyCOGSEst,
    billCount: count,
  };
}

export function analyzeGL(records: GLRecord[]): GLAnalysis {
  let revenue = 0;
  let cogs = 0;
  let opex = 0;
  const opexBreakdown: Record<string, number> = {};

  const revenueKeywords = ['revenue', 'sales', 'income', 'service', 'consulting', 'product'];
  const cogsKeywords = ['cogs', 'cost of goods', 'materials', 'direct labor', 'manufacturing'];

  records.forEach(r => {
    const acct = r.account.toString().trim();
    const desc = r.description.toLowerCase();

    if (acct.startsWith('4') || (r.amount > 0 && revenueKeywords.some(kw => desc.includes(kw)))) {
      revenue += Math.abs(r.amount);
    } else if (acct.startsWith('5') || cogsKeywords.some(kw => desc.includes(kw))) {
      cogs += Math.abs(r.amount);
    } else if (acct.startsWith('6') || acct.startsWith('7') || acct.startsWith('8') || r.amount < 0) {
      opex += Math.abs(r.amount);
      const category = r.description || `Account ${acct}`;
      opexBreakdown[category] = (opexBreakdown[category] || 0) + Math.abs(r.amount);
    }
  });

  return {
    revenue,
    cogs,
    opex,
    grossProfit: revenue - cogs,
    ebitda: revenue - cogs - opex,
    opexBreakdown,
  };
}

// ============ FORECAST ENGINE ============

export function computeForecast(assumptions: Assumptions): ForecastMonth[] {
  const forecast: ForecastMonth[] = [];
  let startingCash = assumptions.openingCash;

  for (let month = 1; month <= 12; month++) {
    const revenue = assumptions.m1Revenue * Math.pow(1 + assumptions.growthRate, month - 1);
    const cogsVal = revenue * assumptions.cogsPct;
    const grossProfit = revenue - cogsVal;
    const ebitda = grossProfit - assumptions.monthlyOpex;
    const capex = assumptions.monthlyCapex;

    // Working capital change
    let wcChange = 0;
    if (month > 1) {
      const prevRevenue = forecast[month - 2].revenue;
      const prevCogs = forecast[month - 2].cogs;
      const arChange = ((revenue - prevRevenue) / 30) * assumptions.arDays;
      const apChange = ((cogsVal - prevCogs) / 30) * assumptions.apDays;
      wcChange = arChange - apChange;
    }

    const taxable = Math.max(ebitda - capex, 0);
    const taxes = taxable * assumptions.taxRate;
    const netCashFlow = ebitda - capex - wcChange - taxes;
    const endingCash = startingCash + netCashFlow;

    forecast.push({
      month,
      revenue,
      cogs: cogsVal,
      grossProfit,
      opex: assumptions.monthlyOpex,
      ebitda,
      capex,
      wcChange,
      taxes,
      netCashFlow,
      startingCash,
      endingCash,
    });

    startingCash = endingCash;
  }

  return forecast;
}

export function computeScenarios(assumptions: Assumptions): { base: ScenarioResult; best: ScenarioResult; worst: ScenarioResult } {
  const scenarioParams = {
    base: assumptions,
    best: {
      ...assumptions,
      m1Revenue: assumptions.m1Revenue * 1.3,
      growthRate: assumptions.growthRate * 1.6,
      cogsPct: assumptions.cogsPct * 0.85,
      monthlyOpex: assumptions.monthlyOpex * 0.88,
    },
    worst: {
      ...assumptions,
      m1Revenue: assumptions.m1Revenue * 0.7,
      growthRate: assumptions.growthRate * 0.4,
      cogsPct: assumptions.cogsPct * 1.2,
      monthlyOpex: assumptions.monthlyOpex * 1.2,
    },
  };

  const results: Record<string, ScenarioResult> = {};
  for (const [name, params] of Object.entries(scenarioParams)) {
    const forecast = computeForecast(params);
    const ncfArr = forecast.map(m => m.netCashFlow);
    results[name] = {
      endingCashM12: forecast[11].endingCash,
      avgMonthlyNCF: ncfArr.reduce((a, b) => a + b, 0) / 12,
      minCash: Math.min(...forecast.map(m => m.endingCash)),
      totalRevenue: forecast.reduce((s, m) => s + m.revenue, 0),
      totalEbitda: forecast.reduce((s, m) => s + m.ebitda, 0),
      forecast,
    };
  }

  return results as { base: ScenarioResult; best: ScenarioResult; worst: ScenarioResult };
}

export function computeFunding(assumptions: Assumptions, forecast: ForecastMonth[]): FundingMetrics {
  const locMonthlyInterest = assumptions.locSize * (assumptions.locRate / 12);

  const monthlyRate = assumptions.loanRate / 12;
  let pmt: number;
  if (monthlyRate > 0) {
    pmt = assumptions.loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, assumptions.loanTerm)) /
          (Math.pow(1 + monthlyRate, assumptions.loanTerm) - 1);
  } else {
    pmt = assumptions.loanAmount / assumptions.loanTerm;
  }

  const avgRevenue = forecast.reduce((s, m) => s + m.revenue, 0) / 12;
  const arValue = avgRevenue;
  const factoringCost = arValue * assumptions.factoringFee;

  const avgEbitda = forecast.reduce((s, m) => s + m.ebitda, 0) / 12;
  const totalDebtService = pmt + locMonthlyInterest;
  const dscr = totalDebtService > 0 ? avgEbitda / totalDebtService : 999;

  return {
    locSize: assumptions.locSize,
    locRate: assumptions.locRate,
    locMonthlyInterest,
    loanAmount: assumptions.loanAmount,
    loanTerm: assumptions.loanTerm,
    loanRate: assumptions.loanRate,
    pmt,
    factoringFee: assumptions.factoringFee,
    arValue,
    factoringCost,
    dscr,
    totalDebtService,
  };
}

export function computeBudgetVariance(assumptions: Assumptions, gl: GLAnalysis): BudgetVariance[] {
  const budgetRev = assumptions.m1Revenue;
  const budgetCogs = budgetRev * assumptions.cogsPct;
  const budgetGP = budgetRev - budgetCogs;
  const budgetOpex = assumptions.monthlyOpex;
  const budgetEbitda = budgetGP - budgetOpex;

  const actualRev = gl.revenue;
  const actualCogs = gl.cogs;
  const actualGP = actualRev - actualCogs;
  const actualOpex = gl.opex;
  const actualEbitda = actualGP - actualOpex;

  function getStatus(actual: number, budget: number, inverse = false): 'On Track' | 'Over' | 'Under' {
    if (budget === 0) return 'On Track';
    const pct = Math.abs(actual - budget) / Math.abs(budget);
    if (pct < 0.1) return 'On Track';
    if (inverse) return actual > budget ? 'Under' : 'Over';
    return actual > budget ? 'Over' : 'Under';
  }

  return [
    { metric: 'Revenue', budget: budgetRev, actual: actualRev, variance: actualRev - budgetRev, variancePct: budgetRev ? (actualRev - budgetRev) / budgetRev : 0, status: getStatus(actualRev, budgetRev) },
    { metric: 'COGS', budget: budgetCogs, actual: actualCogs, variance: actualCogs - budgetCogs, variancePct: budgetCogs ? (actualCogs - budgetCogs) / budgetCogs : 0, status: getStatus(actualCogs, budgetCogs, true) },
    { metric: 'Gross Profit', budget: budgetGP, actual: actualGP, variance: actualGP - budgetGP, variancePct: budgetGP ? (actualGP - budgetGP) / budgetGP : 0, status: getStatus(actualGP, budgetGP) },
    { metric: 'OpEx', budget: budgetOpex, actual: actualOpex, variance: actualOpex - budgetOpex, variancePct: budgetOpex ? (actualOpex - budgetOpex) / budgetOpex : 0, status: getStatus(actualOpex, budgetOpex, true) },
    { metric: 'EBITDA', budget: budgetEbitda, actual: actualEbitda, variance: actualEbitda - budgetEbitda, variancePct: budgetEbitda ? (actualEbitda - budgetEbitda) / Math.abs(budgetEbitda) : 0, status: getStatus(actualEbitda, budgetEbitda) },
  ];
}

// ============ DEFAULT EMPTY RESULTS ============

function emptyAR(): ARAnalysis {
  return { dso: 30, totalAR: 0, outstandingAR: 0, collectionRate: 0, avgInvoice: 0, monthlyRevenueEst: 0, aging: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }, invoiceCount: 0 };
}

function emptyAP(): APAnalysis {
  return { dpo: 45, totalAP: 0, outstandingAP: 0, paymentRate: 0, avgBill: 0, monthlyCOGSEst: 0, billCount: 0 };
}

function emptyGL(): GLAnalysis {
  return { revenue: 0, cogs: 0, opex: 0, grossProfit: 0, ebitda: 0, opexBreakdown: {} };
}

// ============ FULL ANALYSIS ============

export function runFullAnalysis(
  arRecords: ARRecord[] | null,
  apRecords: APRecord[] | null,
  glRecords: GLRecord[] | null,
  customAssumptions?: Partial<Assumptions>
): FullAnalysis {
  const hasAR = arRecords !== null && arRecords.length > 0;
  const hasAP = apRecords !== null && apRecords.length > 0;
  const hasGL = glRecords !== null && glRecords.length > 0;

  const ar = hasAR ? analyzeAR(arRecords) : emptyAR();
  const ap = hasAP ? analyzeAP(apRecords) : emptyAP();
  const gl = hasGL ? analyzeGL(glRecords) : emptyGL();

  const defaults: Assumptions = {
    openingCash: 150000,
    m1Revenue: gl.revenue > 0 ? gl.revenue : (hasAR ? ar.monthlyRevenueEst : 50000),
    growthRate: 0.05,
    cogsPct: gl.revenue > 0 ? gl.cogs / gl.revenue : 0.35,
    monthlyOpex: gl.opex > 0 ? gl.opex : 25000,
    monthlyCapex: 5000,
    taxRate: 0.21,
    arDays: hasAR ? ar.dso : 30,
    apDays: hasAP ? ap.dpo : 45,
    locSize: 100000,
    locRate: 0.08,
    loanAmount: 75000,
    loanTerm: 36,
    loanRate: 0.065,
    factoringFee: 0.03,
  };

  const assumptions: Assumptions = { ...defaults, ...customAssumptions };

  const forecast = computeForecast(assumptions);
  const scenarios = computeScenarios(assumptions);
  const funding = computeFunding(assumptions, forecast);
  const budgetVariance = hasGL ? computeBudgetVariance(assumptions, gl) : [];
  const ccc = (hasAR ? ar.dso : assumptions.arDays) - (hasAP ? ap.dpo : assumptions.apDays);

  const executiveSummary = generateExecutiveSummary(assumptions, ar, ap, gl, forecast, scenarios, funding, ccc, { hasAR, hasAP, hasGL });

  return { ar, ap, gl, assumptions, forecast, scenarios, funding, budgetVariance, ccc, executiveSummary, dataSources: { hasAR, hasAP, hasGL } };
}

// ============ EXECUTIVE SUMMARY ============

function generateExecutiveSummary(
  assumptions: Assumptions,
  ar: ARAnalysis,
  ap: APAnalysis,
  gl: GLAnalysis,
  forecast: ForecastMonth[],
  scenarios: { base: ScenarioResult; best: ScenarioResult; worst: ScenarioResult },
  funding: FundingMetrics,
  ccc: number,
  dataSources?: DataSources
): string {
  const totalRev = forecast.reduce((s, m) => s + m.revenue, 0);
  const totalEbitda = forecast.reduce((s, m) => s + m.ebitda, 0);
  const endingCash = forecast[11].endingCash;
  const startingCash = forecast[0].startingCash;

  const fmt = (n: number) => n.toLocaleString('en-US', {maximumFractionDigits: 0});

  let summary = `التحليل المالي التنفيذي\n`;
  summary += `تاريخ الإنشاء: ${new Date().toISOString().split('T')[0]}\n\n`;
  summary += `البيانات المستوردة\n`;
  summary += `• الحسابات المدينة: ${ar.invoiceCount} فاتورة، إجمالي $${fmt(ar.totalAR)}\n`;
  summary += `• الحسابات الدائنة: ${ap.billCount} فاتورة، إجمالي $${fmt(ap.totalAP)}\n`;
  summary += `• دفتر الأستاذ العام: إيرادات $${fmt(gl.revenue)} | تكلفة مبيعات $${fmt(gl.cogs)} | مصاريف تشغيلية $${fmt(gl.opex)}\n\n`;
  summary += `الملخص المالي\n`;
  summary += `• إيرادات الشهر الأول: $${fmt(assumptions.m1Revenue)}\n`;
  summary += `• معدل نمو الإيرادات: ${(assumptions.growthRate * 100).toFixed(1)}%\n`;
  summary += `• إيرادات 12 شهر المتوقعة: $${fmt(totalRev)}\n`;
  summary += `• الأرباح التشغيلية 12 شهر: $${fmt(totalEbitda)}\n`;
  summary += `• هامش الأرباح التشغيلية: ${((totalEbitda / totalRev) * 100).toFixed(1)}%\n`;
  summary += `• الرصيد الافتتاحي: $${fmt(startingCash)}\n`;
  summary += `• الرصيد الختامي (شهر 12): $${fmt(endingCash)}\n`;
  summary += `• التغير في الوضع النقدي: $${fmt(endingCash - startingCash)}\n\n`;
  summary += `رأس المال العامل\n`;
  summary += `• أيام التحصيل (DSO): ${ar.dso.toFixed(1)} يوم\n`;
  summary += `• أيام السداد (DPO): ${ap.dpo.toFixed(1)} يوم\n`;
  summary += `• دورة التحويل النقدي (CCC): ${ccc.toFixed(1)} يوم\n`;
  summary += `• معدل التحصيل: ${(ar.collectionRate * 100).toFixed(1)}%\n\n`;
  summary += `السيناريوهات\n`;
  summary += `• الحالة الأساسية — رصيد شهر 12: $${fmt(scenarios.base.endingCashM12)}\n`;
  summary += `• أفضل حالة — رصيد شهر 12: $${fmt(scenarios.best.endingCashM12)}\n`;
  summary += `• أسوأ حالة — رصيد شهر 12: $${fmt(scenarios.worst.endingCashM12)}\n\n`;
  summary += `الديون والتمويل\n`;
  summary += `• نسبة تغطية خدمة الدين (DSCR): ${funding.dscr.toFixed(2)}x\n`;
  summary += `• قسط القرض الشهري: $${fmt(funding.pmt)}\n`;
  summary += `• التسهيل الائتماني المتاح: $${fmt(funding.locSize)}\n\n`;

  summary += `التوصيات الرئيسية\n`;
  if (ccc > 30) {
    summary += `• [مرتفع] دورة التحويل النقدي ${ccc.toFixed(0)} يوم — يُنصح بتطبيق خصومات الدفع المبكر وتشديد شروط الائتمان\n`;
  }
  if (ar.dso > 45) {
    summary += `• [مرتفع] أيام التحصيل ${ar.dso.toFixed(0)} يوم — يُنصح بتفعيل تذكيرات الدفع الآلية\n`;
  }
  if (funding.dscr < 1.5) {
    summary += `• [متوسط] نسبة التغطية ${funding.dscr.toFixed(2)}x — قدرة محدودة على الاقتراض، التركيز على نمو الإيرادات\n`;
  }
  if (scenarios.worst.minCash < 0) {
    summary += `• [حرج] السيناريو الأسوأ يُظهر رصيد سلبي — الحفاظ على التسهيل الائتماني وبناء احتياطيات\n`;
  }
  if (endingCash > startingCash * 1.5) {
    summary += `• [فرصة] تراكم نقدي قوي — النظر في إعادة الاستثمار أو السداد المبكر للديون\n`;
  }

  return summary;
}

// ============ SAMPLE DATA ============

export function getSampleData(): { ar: ARRecord[]; ap: APRecord[]; gl: GLRecord[] } {
  const today = new Date();
  const ar: ARRecord[] = [];
  const ap: APRecord[] = [];
  const gl: GLRecord[] = [];

  // Generate 30 AR records
  for (let i = 0; i < 30; i++) {
    const invDate = new Date(today.getTime() - (30 - i) * 24 * 60 * 60 * 1000);
    const amount = 1000 + Math.random() * 4000;
    const isPaid = Math.random() > 0.2;
    const paidDate = isPaid ? new Date(invDate.getTime() + (5 + Math.random() * 25) * 24 * 60 * 60 * 1000) : null;
    ar.push({ invoiceDate: invDate, invoiceAmount: amount, paidDate: paidDate, invoiceId: `INV-${1001 + i}`, customer: `Customer_${i % 10}` });
  }

  // Generate 25 AP records
  for (let i = 0; i < 25; i++) {
    const billDate = new Date(today.getTime() - (25 - i) * 24 * 60 * 60 * 1000);
    const amount = 500 + Math.random() * 2500;
    const isPaid = Math.random() > 0.2;
    const payDate = isPaid ? new Date(billDate.getTime() + (3 + Math.random() * 30) * 24 * 60 * 60 * 1000) : null;
    ap.push({ billDate: billDate, billAmount: amount, paymentDate: payDate, billId: `BILL-${2001 + i}`, vendor: `Vendor_${i % 8}` });
  }

  // Generate GL records for one month
  const glEntries = [
    { account: '4010', amount: 15000, description: 'Service Revenue' },
    { account: '4010', amount: 12000, description: 'Product Revenue' },
    { account: '4020', amount: 8500, description: 'Consulting Revenue' },
    { account: '4010', amount: 15000, description: 'Service Revenue' },
    { account: '4010', amount: 12000, description: 'Product Revenue' },
    { account: '4020', amount: 8500, description: 'Consulting Revenue' },
    { account: '4010', amount: 15000, description: 'Service Revenue' },
    { account: '4010', amount: 12000, description: 'Product Revenue' },
    { account: '4020', amount: 8500, description: 'Consulting Revenue' },
    { account: '5010', amount: -9100, description: 'COGS - Materials' },
    { account: '5020', amount: -3200, description: 'COGS - Labor' },
    { account: '5010', amount: -9100, description: 'COGS - Materials' },
    { account: '5020', amount: -3200, description: 'COGS - Labor' },
    { account: '5010', amount: -9100, description: 'COGS - Materials' },
    { account: '5020', amount: -3200, description: 'COGS - Labor' },
    { account: '6010', amount: -4500, description: 'Salaries' },
    { account: '6020', amount: -3000, description: 'Rent' },
    { account: '6030', amount: -2000, description: 'Utilities' },
    { account: '6040', amount: -1500, description: 'Marketing' },
    { account: '6050', amount: -1200, description: 'Insurance' },
    { account: '6010', amount: -4500, description: 'Salaries' },
    { account: '6020', amount: -3000, description: 'Rent' },
    { account: '6030', amount: -2000, description: 'Utilities' },
    { account: '6040', amount: -1500, description: 'Marketing' },
    { account: '6050', amount: -1200, description: 'Insurance' },
    { account: '6010', amount: -4500, description: 'Salaries' },
    { account: '6020', amount: -3000, description: 'Rent' },
    { account: '6030', amount: -2000, description: 'Utilities' },
    { account: '6040', amount: -1500, description: 'Marketing' },
    { account: '6050', amount: -1200, description: 'Insurance' },
  ];

  glEntries.forEach((entry, i) => {
    gl.push({
      ...entry,
      date: new Date(today.getTime() - (30 - i) * 24 * 60 * 60 * 1000),
    });
  });

  return { ar, ap, gl };
}
