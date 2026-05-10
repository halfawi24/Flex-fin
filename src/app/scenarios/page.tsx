"use client";

import { useAppState } from "@/lib/store";
import { ChartContainer } from "@/components/chart-container";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, formatPercent } from "@/lib/format";
import { AlertTriangle } from "lucide-react";

export default function ScenariosPage() {
  const { state } = useAppState();

  if (!state.analysis) {
    return <EmptyState title="لا توجد بيانات سيناريوهات" description="ارفع بياناتك المالية أو حمّل بيانات تجريبية لتشغيل تحليل السيناريوهات." />;
  }

  const { scenarios, assumptions } = state.analysis;
  const scenarioData = [
    { key: "best", label: "أفضل حالة", color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400", borderColor: "border-emerald-500/30", bgColor: "bg-emerald-500/5", data: scenarios.best },
    { key: "base", label: "الحالة الأساسية", color: "bg-primary", textColor: "text-primary", borderColor: "border-primary/30", bgColor: "bg-primary/5", data: scenarios.base },
    { key: "worst", label: "أسوأ حالة", color: "bg-red-500", textColor: "text-red-600 dark:text-red-400", borderColor: "border-red-500/30", bgColor: "bg-red-500/5", data: scenarios.worst },
  ];

  const maxCash = Math.max(scenarios.best.endingCashM12, 1);
  const worstCashIsNeg = scenarios.worst.minCash < 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">تحليل السيناريوهات</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          توقعات أفضل / أساسي / أسوأ حالة مع افتراضات نمو وتكلفة مختلفة
        </p>
      </div>

      {worstCashIsNeg && (
        <div className="flex items-center gap-3 p-3 border border-red-500/30 bg-red-500/5 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-400">
            <span className="font-semibold">تحذير نقدي:</span> السيناريو الأسوأ يُظهر رصيد نقدي سلبي بقيمة {formatCurrency(scenarios.worst.minCash)}.
            يُنصح بالحفاظ على تسهيل ائتماني أو بناء احتياطيات.
          </p>
        </div>
      )}

      {/* Outcome Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarioData.map((s) => (
          <div key={s.key} className={`border rounded-lg p-5 ${s.borderColor} ${s.bgColor}`}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2 h-2 rounded-full ${s.color}`} />
              <h3 className="text-sm font-semibold">{s.label}</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">الرصيد النهائي (شهر 12)</p>
                <p className={`text-xl font-bold font-mono ${s.data.endingCashM12 < 0 ? "text-red-500" : ""}`} dir="ltr">
                  {formatCurrency(s.data.endingCashM12)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">متوسط التدفق/شهر</p>
                  <p className={`font-mono font-medium ${s.data.avgMonthlyNCF < 0 ? "text-red-500" : ""}`} dir="ltr">
                    {formatCurrency(s.data.avgMonthlyNCF)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">أدنى رصيد</p>
                  <p className={`font-mono font-medium ${s.data.minCash < 0 ? "text-red-500" : ""}`} dir="ltr">
                    {formatCurrency(s.data.minCash)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">إيرادات 12 شهر</p>
                  <p className="font-mono font-medium" dir="ltr">{formatCurrency(s.data.totalRevenue)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">أرباح تشغيلية 12 شهر</p>
                  <p className="font-mono font-medium" dir="ltr">{formatCurrency(s.data.totalEbitda)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scenario Parameters */}
      <ChartContainer title="محركات السيناريوهات" subtitle="الافتراضات المضروبة لكل حالة">
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-right py-2.5 px-4 text-muted-foreground font-medium">المحرك</th>
                <th className="text-center py-2.5 px-4 text-emerald-600 dark:text-emerald-400 font-medium">أفضل</th>
                <th className="text-center py-2.5 px-4 font-medium">أساسي</th>
                <th className="text-center py-2.5 px-4 text-red-600 dark:text-red-400 font-medium">أسوأ</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "إيرادات الشهر الأول", base: assumptions.m1Revenue, best: assumptions.m1Revenue * 1.3, worst: assumptions.m1Revenue * 0.7, fmt: "currency" as const },
                { label: "النمو الشهري %", base: assumptions.growthRate, best: assumptions.growthRate * 1.6, worst: assumptions.growthRate * 0.4, fmt: "percent" as const },
                { label: "تكلفة المبيعات %", base: assumptions.cogsPct, best: assumptions.cogsPct * 0.85, worst: assumptions.cogsPct * 1.2, fmt: "percent" as const },
                { label: "المصاريف التشغيلية", base: assumptions.monthlyOpex, best: assumptions.monthlyOpex * 0.88, worst: assumptions.monthlyOpex * 1.2, fmt: "currency" as const },
              ].map((row) => (
                <tr key={row.label} className="border-b border-border/50">
                  <td className="py-2.5 px-4 font-medium">{row.label}</td>
                  <td className="text-center py-2.5 px-4 font-mono text-emerald-600 dark:text-emerald-400" dir="ltr">
                    {row.fmt === "currency" ? formatCurrency(row.best) : formatPercent(row.best)}
                  </td>
                  <td className="text-center py-2.5 px-4 font-mono" dir="ltr">
                    {row.fmt === "currency" ? formatCurrency(row.base) : formatPercent(row.base)}
                  </td>
                  <td className="text-center py-2.5 px-4 font-mono text-red-600 dark:text-red-400" dir="ltr">
                    {row.fmt === "currency" ? formatCurrency(row.worst) : formatPercent(row.worst)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartContainer>

      {/* Cash Trajectory */}
      <ChartContainer title="مسار الرصيد النقدي حسب السيناريو" subtitle="الرصيد النهائي الشهري عبر جميع الحالات">
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-[11px]" dir="ltr">
            <thead>
              <tr className="border-b border-border">
                <th className="text-right py-2 px-3 text-muted-foreground font-medium sticky right-0 bg-card z-10">الشهر</th>
                <th className="text-right py-2 px-3 text-emerald-600 dark:text-emerald-400 font-medium">أفضل</th>
                <th className="text-right py-2 px-3 font-medium">أساسي</th>
                <th className="text-right py-2 px-3 text-red-600 dark:text-red-400 font-medium">أسوأ</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">الفارق</th>
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
                    <td className="py-2 px-3 font-mono sticky right-0 bg-card z-10">M{m.month}</td>
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
    </div>
  );
}
