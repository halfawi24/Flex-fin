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
    return <EmptyState title="لا توجد بيانات توقعات" description="ارفع بياناتك المالية أو حمّل بيانات تجريبية لإنشاء توقعات التدفق النقدي لـ 12 شهر." />;
  }

  const { forecast, assumptions } = state.analysis;
  const totalRev = forecast.reduce((s, m) => s + m.revenue, 0);
  const totalEbitda = forecast.reduce((s, m) => s + m.ebitda, 0);
  const totalNCF = forecast.reduce((s, m) => s + m.netCashFlow, 0);
  const revenueGrowth12M = (forecast[11].revenue - forecast[0].revenue) / forecast[0].revenue;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">توقعات التدفق النقدي لـ 12 شهر</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          بناءً على نمو شهري {formatPercent(assumptions.growthRate)} من إيرادات بداية {formatCurrency(assumptions.m1Revenue)}
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="إجمالي الإيرادات 12 شهر" value={formatCurrency(totalRev)} subValue={`+${formatPercent(revenueGrowth12M)} نمو`} icon={TrendingUp} />
        <KPICard label="إجمالي الأرباح التشغيلية" value={formatCurrency(totalEbitda)} subValue={`هامش: ${formatPercent(totalEbitda / totalRev)}`} icon={BarChart3} />
        <KPICard label="صافي التدفق النقدي" value={formatCurrency(totalNCF)} trend={totalNCF > 0 ? "up" : "down"} icon={DollarSign} />
        <KPICard label="إيرادات شهر 1 → 12" value={formatCurrency(forecast[11].revenue)} subValue={`من ${formatCurrency(forecast[0].revenue)}`} icon={ArrowRight} highlight />
      </div>

      {/* Net Cash Flow Waterfall */}
      <ChartContainer title="صافي التدفق النقدي الشهري" subtitle="الإيرادات ناقص جميع التكاليف والضرائب وتغيرات رأس المال العامل">
        <div className="flex items-end gap-1.5 h-44 pt-6 relative">
          <div className="absolute bottom-6 left-0 right-0 border-b border-dashed border-muted-foreground/20" />
          {forecast.map((m) => {
            const maxNCF = Math.max(...forecast.map((f) => Math.abs(f.netCashFlow)));
            const height = maxNCF > 0 ? (Math.abs(m.netCashFlow) / maxNCF) * 100 : 0;
            const isPositive = m.netCashFlow >= 0;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                <span className="text-[8px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute -top-1" dir="ltr">
                  {formatCurrency(m.netCashFlow)}
                </span>
                <div className="w-full flex items-end justify-center" style={{ height: "120px" }}>
                  <div
                    className={`w-full max-w-[28px] rounded-t transition-all group-hover:opacity-100 opacity-80 ${isPositive ? "bg-emerald-500" : "bg-red-500"}`}
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-muted-foreground" dir="ltr">M{m.month}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground border-t border-border pt-3">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> تدفق إيجابي</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> تدفق سلبي</span>
          <span className="mr-auto font-mono" dir="ltr">المتوسط: {formatCurrency(totalNCF / 12)}/شهر</span>
        </div>
      </ChartContainer>

      {/* Data Table */}
      <ChartContainer title="جدول التوقعات التفصيلي" subtitle="جميع بنود الأرباح والخسائر والتدفق النقدي">
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-[11px]" dir="ltr">
            <thead>
              <tr className="border-b border-border">
                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium sticky right-0 bg-card z-10 min-w-[100px]">البند</th>
                {forecast.map((m) => (
                  <th key={m.month} className="text-right py-2.5 px-2 text-muted-foreground font-medium whitespace-nowrap min-w-[75px]">M{m.month}</th>
                ))}
                <th className="text-right py-2.5 px-3 text-muted-foreground font-semibold whitespace-nowrap bg-muted/30 min-w-[85px]">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "الإيرادات", key: "revenue", bold: false, accent: false },
                { label: "تكلفة المبيعات", key: "cogs", bold: false, accent: false },
                { label: "الربح الإجمالي", key: "grossProfit", bold: true, accent: false },
                { label: "المصاريف التشغيلية", key: "opex", bold: false, accent: false },
                { label: "الأرباح التشغيلية", key: "ebitda", bold: true, accent: true },
                { label: "النفقات الرأسمالية", key: "capex", bold: false, accent: false },
                { label: "تغير رأس المال العامل", key: "wcChange", bold: false, accent: false },
                { label: "الضرائب", key: "taxes", bold: false, accent: false },
                { label: "صافي التدفق النقدي", key: "netCashFlow", bold: true, accent: true },
                { label: "الرصيد الافتتاحي", key: "startingCash", bold: false, accent: false },
                { label: "الرصيد الختامي", key: "endingCash", bold: true, accent: true },
              ].map((row) => {
                const total = forecast.reduce((s, m) => s + (m[row.key as keyof typeof m] as number), 0);
                return (
                  <tr key={row.key} className={`border-b border-border/40 ${row.accent ? "bg-primary/[0.03]" : ""}`}>
                    <td className={`py-2 px-3 sticky right-0 bg-card z-10 text-right ${row.bold ? "font-semibold" : "text-muted-foreground"}`}>{row.label}</td>
                    {forecast.map((m) => {
                      const val = m[row.key as keyof typeof m] as number;
                      return (
                        <td key={m.month} className={`text-right py-2 px-2 font-mono whitespace-nowrap ${row.bold ? "font-semibold" : ""} ${val < 0 ? "text-red-500" : ""}`}>
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
