"use client";

import { useAppState } from "@/lib/store";
import { ChartContainer } from "@/components/chart-container";
import { EmptyState } from "@/components/empty-state";
import { KPICard } from "@/components/kpi-card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { GitBranch, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function ScenariosPage() {
  const { state } = useAppState();

  if (!state.analysis) {
    return <EmptyState title="No Scenario Data" description="Upload your financial data or load demo data to run scenario analysis." />;
  }

  const { scenarios, assumptions } = state.analysis;
  const scenarioData = [
    { key: "best", label: "Best Case", color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400", borderColor: "border-emerald-500/30", bgColor: "bg-emerald-500/5", data: scenarios.best, multipliers: { rev: 1.3, growth: 1.6, cogs: 0.85, opex: 0.88 } },
    { key: "base", label: "Base Case", color: "bg-primary", textColor: "text-primary", borderColor: "border-primary/30", bgColor: "bg-primary/5", data: scenarios.base, multipliers: { rev: 1, growth: 1, cogs: 1, opex: 1 } },
    { key: "worst", label: "Worst Case", color: "bg-red-500", textColor: "text-red-600 dark:text-red-400", borderColor: "border-red-500/30", bgColor: "bg-red-500/5", data: scenarios.worst, multipliers: { rev: 0.7, growth: 0.4, cogs: 1.2, opex: 1.2 } },
  ];

  const maxCash = Math.max(scenarios.best.endingCashM12, 1);
  const worstCashIsNeg = scenarios.worst.minCash < 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Scenario Analysis</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Base / Best / Worst case projections with different growth &amp; cost assumptions
        </p>
      </div>

      {/* Risk Indicator */}
      {worstCashIsNeg && (
        <div className="flex items-center gap-3 p-3 border border-red-500/30 bg-red-500/5 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-400">
            <span className="font-semibold">Cash Risk:</span> Worst-case scenario shows negative cash balance of {formatCurrency(scenarios.worst.minCash)}. 
            Consider maintaining LOC facility or building reserves.
          </p>
        </div>
      )}

      {/* Scenario Outcome Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarioData.map((s) => (
          <div key={s.key} className={`border rounded-lg p-5 ${s.borderColor} ${s.bgColor}`}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2 h-2 rounded-full ${s.color}`} />
              <h3 className="text-sm font-semibold">{s.label}</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">M12 Ending Cash</p>
                <p className={`text-xl font-bold font-mono ${s.data.endingCashM12 < 0 ? "text-red-500" : ""}`}>
                  {formatCurrency(s.data.endingCashM12)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Avg NCF/mo</p>
                  <p className={`font-mono font-medium ${s.data.avgMonthlyNCF < 0 ? "text-red-500" : ""}`}>
                    {formatCurrency(s.data.avgMonthlyNCF)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Min Cash</p>
                  <p className={`font-mono font-medium ${s.data.minCash < 0 ? "text-red-500" : ""}`}>
                    {formatCurrency(s.data.minCash)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">12M Revenue</p>
                  <p className="font-mono font-medium">{formatCurrency(s.data.totalRevenue)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">12M EBITDA</p>
                  <p className="font-mono font-medium">{formatCurrency(s.data.totalEbitda)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scenario Parameters Table */}
      <ChartContainer title="Scenario Drivers" subtitle="Assumptions multiplied for each case">
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 px-4 text-muted-foreground font-medium">Driver</th>
                <th className="text-right py-2.5 px-4 text-emerald-600 dark:text-emerald-400 font-medium">Best</th>
                <th className="text-right py-2.5 px-4 font-medium">Base</th>
                <th className="text-right py-2.5 px-4 text-red-600 dark:text-red-400 font-medium">Worst</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Month 1 Revenue", base: assumptions.m1Revenue, best: assumptions.m1Revenue * 1.3, worst: assumptions.m1Revenue * 0.7, fmt: "currency" as const },
                { label: "Monthly Growth %", base: assumptions.growthRate, best: assumptions.growthRate * 1.6, worst: assumptions.growthRate * 0.4, fmt: "percent" as const },
                { label: "COGS %", base: assumptions.cogsPct, best: assumptions.cogsPct * 0.85, worst: assumptions.cogsPct * 1.2, fmt: "percent" as const },
                { label: "Monthly OpEx", base: assumptions.monthlyOpex, best: assumptions.monthlyOpex * 0.88, worst: assumptions.monthlyOpex * 1.2, fmt: "currency" as const },
              ].map((row) => (
                <tr key={row.label} className="border-b border-border/50">
                  <td className="py-2.5 px-4 font-medium">{row.label}</td>
                  <td className="text-right py-2.5 px-4 font-mono text-emerald-600 dark:text-emerald-400">
                    {row.fmt === "currency" ? formatCurrency(row.best) : formatPercent(row.best)}
                  </td>
                  <td className="text-right py-2.5 px-4 font-mono">
                    {row.fmt === "currency" ? formatCurrency(row.base) : formatPercent(row.base)}
                  </td>
                  <td className="text-right py-2.5 px-4 font-mono text-red-600 dark:text-red-400">
                    {row.fmt === "currency" ? formatCurrency(row.worst) : formatPercent(row.worst)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartContainer>

      {/* Cash Trajectory Comparison */}
      <ChartContainer title="Cash Trajectory by Scenario" subtitle="Monthly ending cash across all cases">
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium sticky left-0 bg-card z-10">Month</th>
                <th className="text-right py-2 px-3 text-emerald-600 dark:text-emerald-400 font-medium">Best</th>
                <th className="text-right py-2 px-3 font-medium">Base</th>
                <th className="text-right py-2 px-3 text-red-600 dark:text-red-400 font-medium">Worst</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Spread</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.base.forecast.map((m, i) => {
                const bestCash = scenarios.best.forecast[i].endingCash;
                const baseCash = m.endingCash;
                const worstCash = scenarios.worst.forecast[i].endingCash;
                const spread = bestCash - worstCash;
                return (
                  <tr key={m.month} className="border-b border-border/40">
                    <td className="py-2 px-3 font-mono sticky left-0 bg-card z-10">M{m.month}</td>
                    <td className="text-right py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(bestCash)}</td>
                    <td className="text-right py-2 px-3 font-mono">{formatCurrency(baseCash)}</td>
                    <td className={`text-right py-2 px-3 font-mono ${worstCash < 0 ? "text-red-500 font-semibold" : "text-red-600 dark:text-red-400"}`}>
                      {formatCurrency(worstCash)}
                    </td>
                    <td className="text-right py-2 px-3 font-mono text-muted-foreground">{formatCurrency(spread)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartContainer>

      {/* Visual Spread */}
      <ChartContainer title="M12 Outcome Comparison" subtitle="Ending cash range across scenarios">
        <div className="space-y-4 py-2">
          {scenarioData.map((s) => {
            const pct = maxCash > 0 ? (Math.max(s.data.endingCashM12, 0) / maxCash) * 100 : 0;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className={`w-20 text-xs font-medium ${s.textColor}`}>{s.label}</span>
                <div className="flex-1 bg-muted/20 rounded-md h-8 overflow-hidden relative">
                  <div className={`h-full rounded-md ${s.color}/60`} style={{ width: `${Math.max(pct, 3)}%` }} />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-medium">
                    {formatCurrency(s.data.endingCashM12)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ChartContainer>
    </div>
  );
}
