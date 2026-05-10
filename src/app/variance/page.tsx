"use client";

import { useAppState } from "@/lib/store";
import { ChartContainer } from "@/components/chart-container";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, formatPercent } from "@/lib/format";
import { CheckCircle2, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

export default function VariancePage() {
  const { state } = useAppState();

  if (!state.analysis) {
    return <EmptyState title="لا توجد بيانات انحرافات" description="ارفع بياناتك المالية أو حمّل بيانات تجريبية لعرض تحليل الموازنة مقابل الفعلي." />;
  }

  const { budgetVariance, gl, dataSources } = state.analysis;

  if (!dataSources.hasGL || budgetVariance.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-xl font-bold">الموازنة مقابل الفعلي</h1>
        <div className="flex items-center gap-3 p-4 border border-border rounded-lg bg-muted/30">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-muted-foreground">
            تحليل الانحرافات يتطلب رفع ملف دفتر الأستاذ العام (GL). ارفع ملف الأستاذ العام من صفحة الرفع للحصول على مقارنة الموازنة مقابل الفعلي.
          </p>
        </div>
      </div>
    );
  }

  const onTrackCount = budgetVariance.filter(r => r.status === "On Track").length;
  const revenueVar = budgetVariance.find(r => r.metric === "Revenue");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">الموازنة مقابل الفعلي</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          تحليل الانحرافات بين الافتراضات وبيانات الأستاذ العام الفعلية
        </p>
      </div>

      {/* Performance Badge */}
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
          <span className="font-semibold">{onTrackCount} من {budgetVariance.length}</span> مؤشرات ضمن المستهدف.
          {revenueVar && revenueVar.variance > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400"> الإيرادات تتجاوز الموازنة بنسبة {formatPercent(revenueVar.variancePct)}.</span>
          )}
          {revenueVar && revenueVar.variance < 0 && (
            <span className="text-red-600 dark:text-red-400"> الإيرادات أقل من الموازنة بنسبة {formatPercent(Math.abs(revenueVar.variancePct))}.</span>
          )}
        </p>
      </div>

      {/* Variance Table */}
      <ChartContainer title="ملخص الانحرافات" subtitle="الموازنة (من الافتراضات) مقابل الفعلي (من الأستاذ العام)">
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-right py-3 px-4 text-muted-foreground font-medium">البند</th>
                <th className="text-center py-3 px-4 text-muted-foreground font-medium">الموازنة</th>
                <th className="text-center py-3 px-4 text-muted-foreground font-medium">الفعلي</th>
                <th className="text-center py-3 px-4 text-muted-foreground font-medium">الانحراف</th>
                <th className="text-center py-3 px-4 text-muted-foreground font-medium">النسبة</th>
                <th className="text-center py-3 px-4 text-muted-foreground font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {budgetVariance.map((row) => {
                const labelMap: Record<string, string> = {
                  "Revenue": "الإيرادات",
                  "COGS": "تكلفة المبيعات",
                  "Gross Profit": "الربح الإجمالي",
                  "OpEx": "المصاريف التشغيلية",
                  "EBITDA": "الأرباح التشغيلية",
                };
                const statusMap: Record<string, string> = {
                  "On Track": "ضمن المستهدف",
                  "Over": "أعلى",
                  "Under": "أقل",
                };
                return (
                  <tr key={row.metric} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-medium">{labelMap[row.metric] || row.metric}</td>
                    <td className="text-center py-3 px-4 font-mono text-muted-foreground" dir="ltr">{formatCurrency(row.budget)}</td>
                    <td className="text-center py-3 px-4 font-mono font-semibold" dir="ltr">{formatCurrency(row.actual)}</td>
                    <td className="text-center py-3 px-4 font-mono" dir="ltr">
                      <span className={`inline-flex items-center gap-1 ${row.variance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {row.variance >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {row.variance >= 0 ? "+" : ""}{formatCurrency(row.variance)}
                      </span>
                    </td>
                    <td className={`text-center py-3 px-4 font-mono ${row.variancePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} dir="ltr">
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
                        {statusMap[row.status] || row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartContainer>

      {/* Visual Bars */}
      <ChartContainer title="مقارنة بصرية" subtitle="الموازنة مقابل الفعلي">
        <div className="space-y-5">
          {budgetVariance.map((row) => {
            const labelMap: Record<string, string> = {
              "Revenue": "الإيرادات", "COGS": "تكلفة المبيعات",
              "Gross Profit": "الربح الإجمالي", "OpEx": "المصاريف",
              "EBITDA": "الأرباح التشغيلية",
            };
            const maxVal = Math.max(row.budget, row.actual, 1);
            const budgetPct = (row.budget / maxVal) * 100;
            const actualPct = (row.actual / maxVal) * 100;
            return (
              <div key={row.metric} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{labelMap[row.metric] || row.metric}</span>
                  <span className={`text-xs font-mono font-medium ${
                    row.variance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                  }`} dir="ltr">
                    {row.variance >= 0 ? "+" : ""}{formatPercent(row.variancePct)}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-14 shrink-0">الموازنة</span>
                    <div className="flex-1 bg-muted/20 rounded h-5 overflow-hidden">
                      <div className="h-full rounded bg-muted-foreground/20" style={{ width: `${budgetPct}%` }} />
                    </div>
                    <span className="text-[10px] font-mono w-20 text-left shrink-0" dir="ltr">{formatCurrency(row.budget)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-14 shrink-0">الفعلي</span>
                    <div className="flex-1 bg-muted/20 rounded h-5 overflow-hidden">
                      <div className={`h-full rounded ${
                        row.status === "On Track" ? "bg-primary/60" :
                        row.status === "Over" ? "bg-emerald-500/60" : "bg-red-500/60"
                      }`} style={{ width: `${actualPct}%` }} />
                    </div>
                    <span className="text-[10px] font-mono w-20 text-left shrink-0" dir="ltr">{formatCurrency(row.actual)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ChartContainer>

      {/* OpEx Breakdown */}
      {Object.keys(gl.opexBreakdown).length > 0 && (
        <ChartContainer title="تفصيل المصاريف التشغيلية" subtitle="الفئات من دفتر الأستاذ العام">
          <div className="space-y-2.5">
            {Object.entries(gl.opexBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => {
                const pct = gl.opex > 0 ? (amount / gl.opex) * 100 : 0;
                return (
                  <div key={category} className="flex items-center gap-3 text-xs">
                    <span className="w-32 truncate text-muted-foreground shrink-0">{category}</span>
                    <div className="flex-1 bg-muted/20 rounded h-5 overflow-hidden">
                      <div className="h-full rounded bg-primary/40" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-20 text-left font-mono shrink-0" dir="ltr">{formatCurrency(amount)}</span>
                    <span className="w-10 text-left font-mono text-muted-foreground shrink-0" dir="ltr">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            <div className="pt-3 border-t border-border flex justify-between text-xs">
              <span className="font-semibold">إجمالي المصاريف التشغيلية</span>
              <span className="font-mono font-bold" dir="ltr">{formatCurrency(gl.opex)}</span>
            </div>
          </div>
        </ChartContainer>
      )}
    </div>
  );
}
