"use client";

import { useAppState } from "@/lib/store";
import { ChartContainer } from "@/components/chart-container";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, formatPercent } from "@/lib/format";
import { CheckCircle2, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

export default function VariancePage() {
  const { state } = useAppState();

  if (!state.analysis) {
    return <EmptyState title="No Variance Data" description="Upload your financial data or load demo data to see budget vs actual analysis." />;
  }

  const { budgetVariance, gl } = state.analysis;

  // Calculate overall performance
  const revenueVar = budgetVariance.find(r => r.metric === "Revenue");
  const ebitdaVar = budgetVariance.find(r => r.metric === "EBITDA");
  const onTrackCount = budgetVariance.filter(r => r.status === "On Track").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Budget vs Actual</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Variance analysis comparing model assumptions to GL actuals
        </p>
      </div>

      {/* Overall Performance Badge */}
      <div className={`flex items-center gap-3 p-3 border rounded-lg ${
        onTrackCount >= 4 ? "border-emerald-500/30 bg-emerald-500/5" :
        onTrackCount >= 2 ? "border-amber-500/30 bg-amber-500/5" :
        "border-red-500/30 bg-red-500/5"
      }`}>
        {onTrackCount >= 4 ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
        )}
        <p className="text-xs">
          <span className="font-semibold">{onTrackCount} of {budgetVariance.length}</span> metrics on track.
          {revenueVar && revenueVar.variance > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400"> Revenue exceeding budget by {formatPercent(revenueVar.variancePct)}.</span>
          )}
          {revenueVar && revenueVar.variance < 0 && (
            <span className="text-red-600 dark:text-red-400"> Revenue under budget by {formatPercent(Math.abs(revenueVar.variancePct))}.</span>
          )}
        </p>
      </div>

      {/* Variance Table */}
      <ChartContainer title="Variance Summary" subtitle="Budget (from assumptions) vs Actual (from GL import)">
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Metric</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Budget</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Actual</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Variance $</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Variance %</th>
                <th className="text-center py-3 px-4 text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {budgetVariance.map((row) => (
                <tr key={row.metric} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4 font-medium">{row.metric}</td>
                  <td className="text-right py-3 px-4 font-mono text-muted-foreground">{formatCurrency(row.budget)}</td>
                  <td className="text-right py-3 px-4 font-mono font-semibold">{formatCurrency(row.actual)}</td>
                  <td className="text-right py-3 px-4 font-mono">
                    <span className={`inline-flex items-center gap-1 ${row.variance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {row.variance >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {row.variance >= 0 ? "+" : ""}{formatCurrency(row.variance)}
                    </span>
                  </td>
                  <td className={`text-right py-3 px-4 font-mono ${row.variancePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {row.variancePct >= 0 ? "+" : ""}{formatPercent(row.variancePct)}
                  </td>
                  <td className="text-center py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                      row.status === "On Track"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : row.status === "Over"
                        ? "bg-primary/10 text-primary"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartContainer>

      {/* Visual Variance Bars */}
      <ChartContainer title="Visual Comparison" subtitle="Budget vs Actual — bar overlay">
        <div className="space-y-5">
          {budgetVariance.map((row) => {
            const maxVal = Math.max(row.budget, row.actual, 1);
            const budgetPct = (row.budget / maxVal) * 100;
            const actualPct = (row.actual / maxVal) * 100;
            return (
              <div key={row.metric} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{row.metric}</span>
                  <span className={`text-xs font-mono font-medium ${
                    row.variance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                  }`}>
                    {row.variance >= 0 ? "+" : ""}{formatPercent(row.variancePct)}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-12 shrink-0">Budget</span>
                    <div className="flex-1 bg-muted/20 rounded h-5 overflow-hidden">
                      <div className="h-full rounded bg-muted-foreground/20" style={{ width: `${budgetPct}%` }} />
                    </div>
                    <span className="text-[10px] font-mono w-20 text-right shrink-0">{formatCurrency(row.budget)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-12 shrink-0">Actual</span>
                    <div className="flex-1 bg-muted/20 rounded h-5 overflow-hidden">
                      <div className={`h-full rounded ${
                        row.status === "On Track" ? "bg-primary/60" :
                        row.status === "Over" ? "bg-emerald-500/60" : "bg-red-500/60"
                      }`} style={{ width: `${actualPct}%` }} />
                    </div>
                    <span className="text-[10px] font-mono w-20 text-right shrink-0">{formatCurrency(row.actual)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ChartContainer>

      {/* OpEx Breakdown */}
      {Object.keys(gl.opexBreakdown).length > 0 && (
        <ChartContainer title="Operating Expense Breakdown" subtitle="Categories from General Ledger">
          <div className="space-y-2.5">
            {Object.entries(gl.opexBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => {
                const pct = gl.opex > 0 ? (amount / gl.opex) * 100 : 0;
                return (
                  <div key={category} className="flex items-center gap-3 text-xs">
                    <span className="w-28 truncate text-muted-foreground shrink-0">{category}</span>
                    <div className="flex-1 bg-muted/20 rounded h-5 overflow-hidden">
                      <div className="h-full rounded bg-primary/40" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-20 text-right font-mono shrink-0">{formatCurrency(amount)}</span>
                    <span className="w-10 text-right font-mono text-muted-foreground shrink-0">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            <div className="pt-3 border-t border-border flex justify-between text-xs">
              <span className="font-semibold">Total OpEx</span>
              <span className="font-mono font-bold">{formatCurrency(gl.opex)}</span>
            </div>
          </div>
        </ChartContainer>
      )}
    </div>
  );
}
