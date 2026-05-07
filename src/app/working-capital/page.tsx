"use client";

import { useAppState } from "@/lib/store";
import { ChartContainer } from "@/components/chart-container";
import { EmptyState } from "@/components/empty-state";
import { KPICard } from "@/components/kpi-card";
import { formatCurrency, formatDays, formatPercent } from "@/lib/format";
import { Clock, ArrowRightLeft, Wallet, BarChart3, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function WorkingCapitalPage() {
  const { state } = useAppState();

  if (!state.analysis) {
    return <EmptyState title="No Working Capital Data" description="Upload your AR, AP, and GL data or load demo data to see working capital analysis." />;
  }

  const { ar, ap, ccc, assumptions, forecast } = state.analysis;
  const wcRequired = (assumptions.m1Revenue / 30) * Math.max(ccc, 0);
  const netWC = ar.outstandingAR - ap.outstandingAP;
  const avgMonthlyRev = forecast.reduce((s, m) => s + m.revenue, 0) / 12;

  const agingEntries = Object.entries(ar.aging);
  const maxAging = Math.max(...agingEntries.map(([, v]) => v), 1);
  const totalAging = agingEntries.reduce((s, [, v]) => s + v, 0);

  // Efficiency scores
  const collectionEfficiency = ar.dso < 30 ? "Excellent" : ar.dso < 45 ? "Good" : ar.dso < 60 ? "Fair" : "Poor";
  const paymentEfficiency = ap.dpo > 30 ? "Excellent" : ap.dpo > 20 ? "Good" : ap.dpo > 10 ? "Fair" : "Needs Work";
  const cccRating = ccc < 15 ? "Excellent" : ccc < 30 ? "Good" : ccc < 60 ? "Fair" : "Concerning";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Working Capital Analysis</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          DSO, DPO, Cash Conversion Cycle, AR aging, and liquidity metrics
        </p>
      </div>

      {/* Alert if CCC is high */}
      {ccc > 45 && (
        <div className="flex items-center gap-3 p-3 border border-amber-500/30 bg-amber-500/5 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <span className="font-semibold">Working Capital Pressure:</span> CCC of {ccc.toFixed(0)} days means cash is tied up for over 6 weeks.
            Consider accelerating collections or extending payment terms.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard
          label="DSO"
          value={formatDays(ar.dso)}
          subValue={collectionEfficiency}
          trend={ar.dso < 30 ? "up" : ar.dso > 45 ? "down" : "neutral"}
          icon={Clock}
        />
        <KPICard
          label="DPO"
          value={formatDays(ap.dpo)}
          subValue={paymentEfficiency}
          trend={ap.dpo > 30 ? "up" : "neutral"}
          icon={Clock}
        />
        <KPICard
          label="CCC"
          value={formatDays(ccc)}
          subValue={cccRating}
          trend={ccc < 15 ? "up" : ccc > 45 ? "down" : "neutral"}
          icon={ArrowRightLeft}
          highlight
        />
        <KPICard
          label="Net Working Capital"
          value={formatCurrency(netWC)}
          subValue="AR - AP outstanding"
          icon={Wallet}
        />
        <KPICard
          label="WC Required"
          value={formatCurrency(wcRequired)}
          subValue="Monthly rev × CCC days"
          icon={BarChart3}
        />
      </div>

      {/* CCC Visualization — Large */}
      <ChartContainer title="Cash Conversion Cycle Breakdown" subtitle="Days cash is tied up in the operating cycle">
        <div className="py-6">
          <div className="flex items-center gap-4">
            {/* DSO Block */}
            <div className="flex-1">
              <div className="relative">
                <div className="h-16 bg-primary/15 border-2 border-primary/40 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-lg font-bold font-mono">{ar.dso.toFixed(1)}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">days</p>
                  </div>
                </div>
                <p className="text-[10px] text-center mt-2 text-muted-foreground font-medium">
                  DSO — Invoice → Cash
                </p>
                <p className="text-[9px] text-center text-muted-foreground/60">
                  How long customers take to pay
                </p>
              </div>
            </div>

            <span className="text-2xl text-muted-foreground/50 font-light shrink-0">−</span>

            {/* DPO Block */}
            <div className="flex-1">
              <div className="relative">
                <div className="h-16 bg-emerald-500/15 border-2 border-emerald-500/40 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-lg font-bold font-mono">{ap.dpo.toFixed(1)}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">days</p>
                  </div>
                </div>
                <p className="text-[10px] text-center mt-2 text-muted-foreground font-medium">
                  DPO — Bill → Payment
                </p>
                <p className="text-[9px] text-center text-muted-foreground/60">
                  How long you take to pay suppliers
                </p>
              </div>
            </div>

            <span className="text-2xl text-muted-foreground/50 font-light shrink-0">=</span>

            {/* CCC Result */}
            <div className="flex-1">
              <div className="relative">
                <div className={`h-16 border-2 rounded-lg flex items-center justify-center ${
                  ccc > 30 ? "bg-amber-500/15 border-amber-500/40" : "bg-emerald-500/15 border-emerald-500/40"
                }`}>
                  <div className="text-center">
                    <p className="text-lg font-bold font-mono">{ccc.toFixed(1)}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">days</p>
                  </div>
                </div>
                <p className="text-[10px] text-center mt-2 text-muted-foreground font-medium">
                  CCC — Cash Tied Up
                </p>
                <p className="text-[9px] text-center text-muted-foreground/60">
                  Lower is better for liquidity
                </p>
              </div>
            </div>
          </div>

          {/* Impact calculation */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="text-muted-foreground mb-1">Cash Trapped in WC</p>
                <p className="font-mono font-bold text-sm">{formatCurrency(wcRequired)}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">({formatCurrency(avgMonthlyRev)}/30) × {ccc.toFixed(0)} days</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="text-muted-foreground mb-1">If CCC Reduced by 10 Days</p>
                <p className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  Saves {formatCurrency((avgMonthlyRev / 30) * 10)}
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5">Released back to operations</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="text-muted-foreground mb-1">Collection Rate</p>
                <p className="font-mono font-bold text-sm">{formatPercent(ar.collectionRate)}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{ar.invoiceCount - Math.round(ar.invoiceCount * (1 - ar.collectionRate))} of {ar.invoiceCount} invoices collected</p>
              </div>
            </div>
          </div>
        </div>
      </ChartContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AR/AP Detail Cards */}
        <ChartContainer title="Accounts Receivable" subtitle={`${ar.invoiceCount} invoices analyzed`}>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border border-border rounded-md">
                <p className="text-muted-foreground">Total AR</p>
                <p className="font-mono font-bold text-base mt-1">{formatCurrency(ar.totalAR)}</p>
              </div>
              <div className="p-3 border border-amber-500/20 bg-amber-500/5 rounded-md">
                <p className="text-muted-foreground">Outstanding</p>
                <p className="font-mono font-bold text-base mt-1 text-amber-600 dark:text-amber-400">{formatCurrency(ar.outstandingAR)}</p>
              </div>
              <div className="p-3 border border-border rounded-md">
                <p className="text-muted-foreground">Avg Invoice</p>
                <p className="font-mono font-semibold mt-1">{formatCurrency(ar.avgInvoice)}</p>
              </div>
              <div className="p-3 border border-border rounded-md">
                <p className="text-muted-foreground">Collection Rate</p>
                <p className="font-mono font-semibold mt-1">{formatPercent(ar.collectionRate)}</p>
              </div>
            </div>
            <div className="p-3 border border-border rounded-md">
              <p className="text-muted-foreground mb-1">Monthly Revenue Estimate</p>
              <p className="font-mono font-semibold">{formatCurrency(ar.monthlyRevenueEst)}</p>
            </div>
          </div>
        </ChartContainer>

        <ChartContainer title="Accounts Payable" subtitle={`${ap.billCount} bills analyzed`}>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border border-border rounded-md">
                <p className="text-muted-foreground">Total AP</p>
                <p className="font-mono font-bold text-base mt-1">{formatCurrency(ap.totalAP)}</p>
              </div>
              <div className="p-3 border border-emerald-500/20 bg-emerald-500/5 rounded-md">
                <p className="text-muted-foreground">Outstanding</p>
                <p className="font-mono font-bold text-base mt-1 text-emerald-600 dark:text-emerald-400">{formatCurrency(ap.outstandingAP)}</p>
              </div>
              <div className="p-3 border border-border rounded-md">
                <p className="text-muted-foreground">Avg Bill</p>
                <p className="font-mono font-semibold mt-1">{formatCurrency(ap.avgBill)}</p>
              </div>
              <div className="p-3 border border-border rounded-md">
                <p className="text-muted-foreground">Payment Rate</p>
                <p className="font-mono font-semibold mt-1">{formatPercent(ap.paymentRate)}</p>
              </div>
            </div>
            <div className="p-3 border border-border rounded-md">
              <p className="text-muted-foreground mb-1">Monthly COGS Estimate</p>
              <p className="font-mono font-semibold">{formatCurrency(ap.monthlyCOGSEst)}</p>
            </div>
          </div>
        </ChartContainer>
      </div>

      {/* AR Aging */}
      <ChartContainer title="AR Aging Breakdown" subtitle="Outstanding receivables by days overdue">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="space-y-4">
            {agingEntries.map(([period, amount]) => {
              const pct = totalAging > 0 ? (amount / totalAging) * 100 : 0;
              const barPct = maxAging > 0 ? (amount / maxAging) * 100 : 0;
              const isOld = period === "61-90" || period === "90+";
              return (
                <div key={period} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className={`font-medium ${isOld ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                      {period} days
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                      <span className={`font-mono font-semibold ${isOld ? "text-red-500" : ""}`}>
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-muted/20 rounded h-6 overflow-hidden">
                    <div
                      className={`h-full rounded transition-all ${
                        isOld ? "bg-red-500/70" : period === "31-60" ? "bg-amber-500/60" : "bg-primary/60"
                      }`}
                      style={{ width: `${Math.max(barPct, 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-3 border-t border-border flex justify-between text-xs">
              <span className="font-semibold">Total Outstanding</span>
              <span className="font-mono font-bold">{formatCurrency(ar.outstandingAR)}</span>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="space-y-3">
            <div className="p-4 border border-border rounded-lg">
              <h4 className="text-xs font-semibold mb-3">Risk Assessment</h4>
              <div className="space-y-2">
                {agingEntries.map(([period, amount]) => {
                  const risk = period === "0-30" ? "Low" : period === "31-60" ? "Medium" : period === "61-90" ? "High" : "Critical";
                  const color = period === "0-30" ? "bg-emerald-500" : period === "31-60" ? "bg-amber-500" : period === "61-90" ? "bg-orange-500" : "bg-red-500";
                  return (
                    <div key={period} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${color}`} />
                        <span className="text-muted-foreground">{period} days</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          risk === "Low" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                          risk === "Medium" ? "bg-amber-500/10 text-amber-600" :
                          risk === "High" ? "bg-orange-500/10 text-orange-600" :
                          "bg-red-500/10 text-red-600"
                        }`}>
                          {risk}
                        </span>
                        <span className="font-mono">{formatCurrency(amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border border-border rounded-lg">
              <h4 className="text-xs font-semibold mb-2">Recommendations</h4>
              <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                {ar.aging["90+"] > 0 && (
                  <li className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                    Write-off review needed for 90+ day invoices
                  </li>
                )}
                {ar.aging["61-90"] > 0 && (
                  <li className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                    Escalate collection for 61-90 day balances
                  </li>
                )}
                {ar.collectionRate < 0.9 && (
                  <li className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                    Implement automated payment reminders
                  </li>
                )}
                {ar.dso < 30 && ar.collectionRate > 0.85 && (
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                    Collection process is performing well
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </ChartContainer>
    </div>
  );
}
