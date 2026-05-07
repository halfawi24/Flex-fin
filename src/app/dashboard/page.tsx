"use client";

import { useAppState } from "@/lib/store";
import { useCallback } from "react";
import { KPICard } from "@/components/kpi-card";
import { ChartContainer } from "@/components/chart-container";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, formatPercent, formatDays } from "@/lib/format";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Clock,
  Shield,
  Wallet,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export default function DashboardPage() {
  const { state } = useAppState();

  const handleExport = useCallback(async () => {
    if (!state.analysis) return;
    const { exportToExcel } = await import("@/lib/excel-export");
    await exportToExcel(state.analysis);
  }, [state.analysis]);

  if (!state.analysis) {
    return <EmptyState title="No Data Loaded" description="Upload your AR, AP, and GL files or load demo data to see the executive dashboard." />;
  }

  const { forecast, ar, ap, funding, ccc, assumptions, gl, scenarios } = state.analysis;
  const totalRev = forecast.reduce((s, m) => s + m.revenue, 0);
  const totalEbitda = forecast.reduce((s, m) => s + m.ebitda, 0);
  const avgNCF = forecast.reduce((s, m) => s + m.netCashFlow, 0) / 12;
  const endingCash = forecast[11].endingCash;
  const startingCash = forecast[0].startingCash;
  const cashChange = endingCash - startingCash;
  const minCash = Math.min(...forecast.map((m) => m.endingCash));
  const monthlyBurn = avgNCF < 0 ? Math.abs(avgNCF) : 0;
  const cashRunway = monthlyBurn > 0 ? endingCash / monthlyBurn : 999;
  const grossMargin = totalRev > 0 ? (totalRev - forecast.reduce((s, m) => s + m.cogs, 0)) / totalRev : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Executive Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            12-month financial overview &middot; {ar.invoiceCount} invoices &middot; {ap.billCount} bills analyzed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>
          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
            {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* KPI Grid — 8 cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
        <KPICard
          label="Starting Cash"
          value={formatCurrency(startingCash)}
          icon={DollarSign}
        />
        <KPICard
          label="Ending Cash (M12)"
          value={formatCurrency(endingCash)}
          trend={cashChange > 0 ? "up" : "down"}
          subValue={`${cashChange > 0 ? "+" : ""}${formatCurrency(cashChange)}`}
          icon={DollarSign}
          highlight
        />
        <KPICard
          label="12M Revenue"
          value={formatCurrency(totalRev)}
          subValue={`Growth: ${formatPercent(assumptions.growthRate)}/mo`}
          icon={TrendingUp}
        />
        <KPICard
          label="12M EBITDA"
          value={formatCurrency(totalEbitda)}
          subValue={`Margin: ${formatPercent(totalEbitda / totalRev)}`}
          icon={BarChart3}
        />
        <KPICard
          label="Cash Conversion"
          value={formatDays(ccc)}
          subValue={`DSO ${ar.dso.toFixed(0)}d | DPO ${ap.dpo.toFixed(0)}d`}
          trend={ccc < 30 ? "up" : ccc > 60 ? "down" : "neutral"}
          icon={Clock}
        />
        <KPICard
          label="DSCR"
          value={`${funding.dscr.toFixed(2)}x`}
          subValue={funding.dscr >= 1.5 ? "Healthy capacity" : "Constrained"}
          trend={funding.dscr >= 1.5 ? "up" : "down"}
          icon={Shield}
        />
        <KPICard
          label="Gross Margin"
          value={formatPercent(grossMargin)}
          subValue={`COGS: ${formatPercent(assumptions.cogsPct)}`}
          icon={Wallet}
        />
        <KPICard
          label="Cash Runway"
          value={cashRunway >= 999 ? "∞" : `${cashRunway.toFixed(0)} mo`}
          subValue={monthlyBurn > 0 ? `Burn: ${formatCurrency(monthlyBurn)}/mo` : "Positive cash flow"}
          trend={cashRunway >= 12 || cashRunway >= 999 ? "up" : "down"}
          icon={Clock}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Growth Trajectory */}
        <ChartContainer title="Revenue Trajectory" subtitle="Monthly revenue with growth rate">
          <div className="space-y-1.5">
            {forecast.map((m, i) => {
              const pct = (m.revenue / forecast[11].revenue) * 100;
              const growth = i > 0 ? ((m.revenue - forecast[i-1].revenue) / forecast[i-1].revenue) : 0;
              return (
                <div key={m.month} className="flex items-center gap-2 text-xs">
                  <span className="w-7 text-muted-foreground font-mono shrink-0">M{m.month}</span>
                  <div className="flex-1 bg-muted/20 rounded h-5 overflow-hidden relative">
                    <div
                      className="h-full rounded bg-primary/70 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-20 text-right font-mono text-foreground shrink-0">
                    {formatCurrency(m.revenue)}
                  </span>
                  {i > 0 && (
                    <span className="w-12 text-right font-mono text-emerald-500 text-[10px] shrink-0">
                      +{formatPercent(growth)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </ChartContainer>

        {/* Cash Position Waterfall */}
        <ChartContainer title="Cash Position" subtitle="Monthly ending cash with net flow">
          <div className="space-y-1.5">
            {forecast.map((m) => {
              const maxCash = forecast[11].endingCash;
              const pct = maxCash > 0 ? (m.endingCash / maxCash) * 100 : 0;
              return (
                <div key={m.month} className="flex items-center gap-2 text-xs">
                  <span className="w-7 text-muted-foreground font-mono shrink-0">M{m.month}</span>
                  <div className="flex-1 bg-muted/20 rounded h-5 overflow-hidden">
                    <div
                      className="h-full rounded bg-emerald-500/60 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-22 text-right font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                    {formatCurrency(m.endingCash)}
                  </span>
                  <span className={`w-16 text-right font-mono text-[10px] shrink-0 ${m.netCashFlow >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {m.netCashFlow >= 0 ? "+" : ""}{formatCurrency(m.netCashFlow)}
                  </span>
                </div>
              );
            })}
          </div>
        </ChartContainer>
      </div>

      {/* Bottom Row — Scenario Quick View + Funding */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Scenario Snapshot */}
        <ChartContainer title="Scenario Snapshot" subtitle="12-month ending cash">
          <div className="space-y-4">
            {[
              { label: "Best Case", value: scenarios.best.endingCashM12, color: "bg-emerald-500/70" },
              { label: "Base Case", value: scenarios.base.endingCashM12, color: "bg-primary/70" },
              { label: "Worst Case", value: scenarios.worst.endingCashM12, color: "bg-red-500/70" },
            ].map((s) => {
              const maxVal = Math.max(scenarios.best.endingCashM12, 1);
              const pct = (Math.max(s.value, 0) / maxVal) * 100;
              return (
                <div key={s.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-mono font-semibold">{formatCurrency(s.value)}</span>
                  </div>
                  <div className="w-full bg-muted/20 rounded h-3 overflow-hidden">
                    <div className={`h-full rounded ${s.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartContainer>

        {/* Working Capital Quick */}
        <ChartContainer title="Working Capital" subtitle="Current AR/AP position">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-border rounded-md">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Outstanding AR</p>
                <p className="text-sm font-bold font-mono">{formatCurrency(ar.outstandingAR)}</p>
              </div>
              <ArrowDownRight className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-center justify-between p-3 border border-border rounded-md">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Outstanding AP</p>
                <p className="text-sm font-bold font-mono">{formatCurrency(ap.outstandingAP)}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between p-3 border border-primary/20 bg-primary/5 rounded-md">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Net Working Capital</p>
                <p className="text-sm font-bold font-mono">{formatCurrency(ar.outstandingAR - ap.outstandingAP)}</p>
              </div>
              <Wallet className="w-4 h-4 text-primary" />
            </div>
          </div>
        </ChartContainer>

        {/* Funding Metrics */}
        <ChartContainer title="Debt & Funding" subtitle="Capacity overview">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">LOC Available</span>
              <span className="font-mono font-semibold">{formatCurrency(funding.locSize)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">LOC Interest/mo</span>
              <span className="font-mono">{formatCurrency(funding.locMonthlyInterest)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Loan PMT/mo</span>
              <span className="font-mono">{formatCurrency(funding.pmt)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Factoring Cost/mo</span>
              <span className="font-mono">{formatCurrency(funding.factoringCost)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground font-medium">Total Debt Service</span>
              <span className="font-mono font-semibold">{formatCurrency(funding.totalDebtService)}</span>
            </div>
            <div className={`mt-2 p-2 rounded text-center text-[10px] font-medium ${
              funding.dscr >= 1.5 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600"
            }`}>
              DSCR {funding.dscr.toFixed(2)}x — {funding.dscr >= 1.5 ? "Strong debt coverage" : "Monitor closely"}
            </div>
          </div>
        </ChartContainer>
      </div>
    </div>
  );
}
