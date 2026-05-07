"use client";

import { useAppState } from "@/lib/store";
import { ChartContainer } from "@/components/chart-container";
import { EmptyState } from "@/components/empty-state";
import { KPICard } from "@/components/kpi-card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { TrendingUp, DollarSign, BarChart3, ArrowRight } from "lucide-react";

export default function ForecastPage() {
  const { state } = useAppState();

  if (!state.analysis) {
    return <EmptyState title="No Forecast Data" description="Upload your financial data or load demo data to generate the 12-month cash flow forecast." />;
  }

  const { forecast, assumptions } = state.analysis;
  const totalRev = forecast.reduce((s, m) => s + m.revenue, 0);
  const totalEbitda = forecast.reduce((s, m) => s + m.ebitda, 0);
  const totalNCF = forecast.reduce((s, m) => s + m.netCashFlow, 0);
  const maxRevenue = forecast[11].revenue;
  const revenueGrowth12M = (forecast[11].revenue - forecast[0].revenue) / forecast[0].revenue;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">12-Month Cash Flow Forecast</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Based on {formatPercent(assumptions.growthRate)} monthly growth from{" "}
          {formatCurrency(assumptions.m1Revenue)} starting revenue
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Total 12M Revenue"
          value={formatCurrency(totalRev)}
          subValue={`+${formatPercent(revenueGrowth12M)} growth`}
          icon={TrendingUp}
        />
        <KPICard
          label="Total 12M EBITDA"
          value={formatCurrency(totalEbitda)}
          subValue={`Margin: ${formatPercent(totalEbitda / totalRev)}`}
          icon={BarChart3}
        />
        <KPICard
          label="Total Net Cash Flow"
          value={formatCurrency(totalNCF)}
          trend={totalNCF > 0 ? "up" : "down"}
          icon={DollarSign}
        />
        <KPICard
          label="M1 → M12 Revenue"
          value={formatCurrency(forecast[11].revenue)}
          subValue={`From ${formatCurrency(forecast[0].revenue)}`}
          icon={ArrowRight}
          highlight
        />
      </div>

      {/* Net Cash Flow Waterfall */}
      <ChartContainer title="Monthly Net Cash Flow" subtitle="Revenue minus all costs, taxes, and working capital changes">
        <div className="flex items-end gap-1.5 h-44 pt-6 relative">
          {/* Baseline */}
          <div className="absolute bottom-6 left-0 right-0 border-b border-dashed border-muted-foreground/20" />
          {forecast.map((m) => {
            const maxNCF = Math.max(...forecast.map((f) => Math.abs(f.netCashFlow)));
            const height = maxNCF > 0 ? (Math.abs(m.netCashFlow) / maxNCF) * 100 : 0;
            const isPositive = m.netCashFlow >= 0;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                <span className="text-[8px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute -top-1">
                  {formatCurrency(m.netCashFlow)}
                </span>
                <div className="w-full flex items-end justify-center" style={{ height: "120px" }}>
                  <div
                    className={`w-full max-w-[28px] rounded-t transition-all group-hover:opacity-100 opacity-80 ${
                      isPositive ? "bg-emerald-500" : "bg-red-500"
                    }`}
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-muted-foreground">M{m.month}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground border-t border-border pt-3">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Positive NCF</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Negative NCF</span>
          <span className="ml-auto font-mono">Avg: {formatCurrency(totalNCF / 12)}/mo</span>
        </div>
      </ChartContainer>

      {/* Cumulative Cash Chart */}
      <ChartContainer title="Cumulative Cash Position" subtitle="Ending cash balance over time">
        <div className="space-y-1.5">
          {forecast.map((m, i) => {
            const maxCash = forecast[11].endingCash;
            const minDisplay = forecast[0].startingCash * 0.8;
            const range = maxCash - minDisplay;
            const pct = range > 0 ? ((m.endingCash - minDisplay) / range) * 100 : 50;
            const monthGain = m.endingCash - m.startingCash;
            return (
              <div key={m.month} className="flex items-center gap-2 text-xs group">
                <span className="w-7 text-muted-foreground font-mono shrink-0">M{m.month}</span>
                <div className="flex-1 bg-muted/20 rounded h-6 overflow-hidden relative">
                  <div
                    className="h-full rounded bg-gradient-to-r from-primary/40 to-primary/70 transition-all"
                    style={{ width: `${Math.max(pct, 5)}%` }}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100">
                    +{formatCurrency(monthGain)}
                  </span>
                </div>
                <span className="w-24 text-right font-mono font-medium shrink-0">
                  {formatCurrency(m.endingCash)}
                </span>
              </div>
            );
          })}
        </div>
      </ChartContainer>

      {/* Detailed Data Table */}
      <ChartContainer title="Detailed Forecast Table" subtitle="All P&L and cash flow line items">
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium sticky left-0 bg-card z-10 min-w-[120px]">
                  Line Item
                </th>
                {forecast.map((m) => (
                  <th key={m.month} className="text-right py-2.5 px-2 text-muted-foreground font-medium whitespace-nowrap min-w-[80px]">
                    M{m.month}
                  </th>
                ))}
                <th className="text-right py-2.5 px-3 text-muted-foreground font-semibold whitespace-nowrap bg-muted/30 min-w-[90px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Revenue", key: "revenue", bold: false, accent: false },
                { label: "COGS", key: "cogs", bold: false, accent: false },
                { label: "Gross Profit", key: "grossProfit", bold: true, accent: false },
                { label: "OpEx", key: "opex", bold: false, accent: false },
                { label: "EBITDA", key: "ebitda", bold: true, accent: true },
                { label: "CapEx", key: "capex", bold: false, accent: false },
                { label: "WC Change", key: "wcChange", bold: false, accent: false },
                { label: "Taxes", key: "taxes", bold: false, accent: false },
                { label: "Net Cash Flow", key: "netCashFlow", bold: true, accent: true },
                { label: "Starting Cash", key: "startingCash", bold: false, accent: false },
                { label: "Ending Cash", key: "endingCash", bold: true, accent: true },
              ].map((row) => {
                const total = forecast.reduce((s, m) => s + (m[row.key as keyof typeof m] as number), 0);
                return (
                  <tr
                    key={row.key}
                    className={`border-b border-border/40 ${row.accent ? "bg-primary/[0.03]" : ""}`}
                  >
                    <td className={`py-2 px-3 sticky left-0 bg-card z-10 ${row.bold ? "font-semibold" : "text-muted-foreground"}`}>
                      {row.label}
                    </td>
                    {forecast.map((m) => {
                      const val = m[row.key as keyof typeof m] as number;
                      return (
                        <td
                          key={m.month}
                          className={`text-right py-2 px-2 font-mono whitespace-nowrap ${row.bold ? "font-semibold" : ""} ${val < 0 ? "text-red-500" : ""}`}
                        >
                          {formatCurrency(val)}
                        </td>
                      );
                    })}
                    <td className={`text-right py-2 px-3 font-mono whitespace-nowrap bg-muted/30 ${row.bold ? "font-bold" : "font-medium"}`}>
                      {row.key === "startingCash" || row.key === "endingCash"
                        ? formatCurrency(forecast[row.key === "startingCash" ? 0 : 11][row.key as keyof typeof forecast[0]] as number)
                        : formatCurrency(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartContainer>
    </div>
  );
}
