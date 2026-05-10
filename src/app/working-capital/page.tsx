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
    return <EmptyState title="لا توجد بيانات رأس المال العامل" description="ارفع بيانات الحسابات المدينة والدائنة أو حمّل بيانات تجريبية لعرض تحليل رأس المال العامل." />;
  }

  const { ar, ap, ccc, assumptions, forecast, dataSources } = state.analysis;
  const wcRequired = (assumptions.m1Revenue / 30) * Math.max(ccc, 0);
  const netWC = ar.outstandingAR - ap.outstandingAP;
  const avgMonthlyRev = forecast.reduce((s, m) => s + m.revenue, 0) / 12;

  const agingEntries = Object.entries(ar.aging);
  const maxAging = Math.max(...agingEntries.map(([, v]) => v), 1);
  const totalAging = agingEntries.reduce((s, [, v]) => s + v, 0);

  const collectionEfficiency = ar.dso < 30 ? "ممتاز" : ar.dso < 45 ? "جيد" : ar.dso < 60 ? "مقبول" : "ضعيف";
  const paymentEfficiency = ap.dpo > 30 ? "ممتاز" : ap.dpo > 20 ? "جيد" : ap.dpo > 10 ? "مقبول" : "يحتاج تحسين";
  const cccRating = ccc < 15 ? "ممتاز" : ccc < 30 ? "جيد" : ccc < 60 ? "مقبول" : "مقلق";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">تحليل رأس المال العامل</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          أيام التحصيل، أيام السداد، دورة التحويل النقدي، وأعمار الديون
        </p>
      </div>

      {ccc > 45 && (
        <div className="flex items-center gap-3 p-3 border border-amber-500/30 bg-amber-500/5 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <span className="font-semibold">ضغط على رأس المال العامل:</span> دورة التحويل النقدي {ccc.toFixed(0)} يوم تعني أن النقد محتجز لأكثر من 6 أسابيع.
            يُنصح بتسريع التحصيل أو تمديد شروط السداد.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard label="أيام التحصيل" value={formatDays(ar.dso)} subValue={collectionEfficiency} trend={ar.dso < 30 ? "up" : ar.dso > 45 ? "down" : "neutral"} icon={Clock} />
        <KPICard label="أيام السداد" value={formatDays(ap.dpo)} subValue={paymentEfficiency} trend={ap.dpo > 30 ? "up" : "neutral"} icon={Clock} />
        <KPICard label="دورة التحويل" value={formatDays(ccc)} subValue={cccRating} trend={ccc < 15 ? "up" : ccc > 45 ? "down" : "neutral"} icon={ArrowRightLeft} highlight />
        <KPICard label="صافي رأس المال العامل" value={formatCurrency(netWC)} subValue="المدينة - الدائنة" icon={Wallet} />
        <KPICard label="رأس المال المطلوب" value={formatCurrency(wcRequired)} subValue="الإيرادات × أيام الدورة" icon={BarChart3} />
      </div>

      {/* CCC Visualization */}
      <ChartContainer title="تفصيل دورة التحويل النقدي" subtitle="المدة التي يبقى فيها النقد محتجزاً في العمليات">
        <div className="py-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-16 bg-primary/15 border-2 border-primary/40 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-bold font-mono" dir="ltr">{ar.dso.toFixed(1)}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">يوم</p>
                </div>
              </div>
              <p className="text-[10px] text-center mt-2 text-muted-foreground font-medium">أيام التحصيل</p>
              <p className="text-[9px] text-center text-muted-foreground/60">من الفاتورة حتى الاستلام</p>
            </div>

            <span className="text-2xl text-muted-foreground/50 font-light shrink-0">−</span>

            <div className="flex-1">
              <div className="h-16 bg-emerald-500/15 border-2 border-emerald-500/40 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-bold font-mono" dir="ltr">{ap.dpo.toFixed(1)}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">يوم</p>
                </div>
              </div>
              <p className="text-[10px] text-center mt-2 text-muted-foreground font-medium">أيام السداد</p>
              <p className="text-[9px] text-center text-muted-foreground/60">من الاستلام حتى الدفع</p>
            </div>

            <span className="text-2xl text-muted-foreground/50 font-light shrink-0">=</span>

            <div className="flex-1">
              <div className={`h-16 border-2 rounded-lg flex items-center justify-center ${
                ccc > 30 ? "bg-amber-500/15 border-amber-500/40" : "bg-emerald-500/15 border-emerald-500/40"
              }`}>
                <div className="text-center">
                  <p className="text-lg font-bold font-mono" dir="ltr">{ccc.toFixed(1)}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">يوم</p>
                </div>
              </div>
              <p className="text-[10px] text-center mt-2 text-muted-foreground font-medium">دورة التحويل</p>
              <p className="text-[9px] text-center text-muted-foreground/60">كلما قل كان أفضل</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="text-muted-foreground mb-1">النقد المحتجز في رأس المال العامل</p>
                <p className="font-mono font-bold text-sm" dir="ltr">{formatCurrency(wcRequired)}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="text-muted-foreground mb-1">لو تم تقليل الدورة 10 أيام</p>
                <p className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400" dir="ltr">
                  يوفر {formatCurrency((avgMonthlyRev / 30) * 10)}
                </p>
              </div>
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="text-muted-foreground mb-1">معدل التحصيل</p>
                <p className="font-mono font-bold text-sm" dir="ltr">{formatPercent(ar.collectionRate)}</p>
              </div>
            </div>
          </div>
        </div>
      </ChartContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AR Detail */}
        <ChartContainer title="الحسابات المدينة" subtitle={`${ar.invoiceCount} فاتورة تم تحليلها`}>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border border-border rounded-md">
                <p className="text-muted-foreground">إجمالي المدينة</p>
                <p className="font-mono font-bold text-base mt-1" dir="ltr">{formatCurrency(ar.totalAR)}</p>
              </div>
              <div className="p-3 border border-amber-500/20 bg-amber-500/5 rounded-md">
                <p className="text-muted-foreground">مستحقة غير محصلة</p>
                <p className="font-mono font-bold text-base mt-1 text-amber-600 dark:text-amber-400" dir="ltr">{formatCurrency(ar.outstandingAR)}</p>
              </div>
              <div className="p-3 border border-border rounded-md">
                <p className="text-muted-foreground">متوسط الفاتورة</p>
                <p className="font-mono font-semibold mt-1" dir="ltr">{formatCurrency(ar.avgInvoice)}</p>
              </div>
              <div className="p-3 border border-border rounded-md">
                <p className="text-muted-foreground">معدل التحصيل</p>
                <p className="font-mono font-semibold mt-1" dir="ltr">{formatPercent(ar.collectionRate)}</p>
              </div>
            </div>
          </div>
        </ChartContainer>

        {/* AP Detail */}
        <ChartContainer title="الحسابات الدائنة" subtitle={`${ap.billCount} فاتورة تم تحليلها`}>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border border-border rounded-md">
                <p className="text-muted-foreground">إجمالي الدائنة</p>
                <p className="font-mono font-bold text-base mt-1" dir="ltr">{formatCurrency(ap.totalAP)}</p>
              </div>
              <div className="p-3 border border-emerald-500/20 bg-emerald-500/5 rounded-md">
                <p className="text-muted-foreground">مستحقة غير مسددة</p>
                <p className="font-mono font-bold text-base mt-1 text-emerald-600 dark:text-emerald-400" dir="ltr">{formatCurrency(ap.outstandingAP)}</p>
              </div>
              <div className="p-3 border border-border rounded-md">
                <p className="text-muted-foreground">متوسط الفاتورة</p>
                <p className="font-mono font-semibold mt-1" dir="ltr">{formatCurrency(ap.avgBill)}</p>
              </div>
              <div className="p-3 border border-border rounded-md">
                <p className="text-muted-foreground">معدل السداد</p>
                <p className="font-mono font-semibold mt-1" dir="ltr">{formatPercent(ap.paymentRate)}</p>
              </div>
            </div>
          </div>
        </ChartContainer>
      </div>

      {/* AR Aging */}
      <ChartContainer title="أعمار الديون المدينة" subtitle="المستحقات غير المحصلة حسب عمر الدين">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {agingEntries.map(([period, amount]) => {
              const pct = totalAging > 0 ? (amount / totalAging) * 100 : 0;
              const barPct = maxAging > 0 ? (amount / maxAging) * 100 : 0;
              const isOld = period === "61-90" || period === "90+";
              return (
                <div key={period} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className={`font-medium ${isOld ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                      {period} يوم
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground" dir="ltr">{pct.toFixed(0)}%</span>
                      <span className={`font-mono font-semibold ${isOld ? "text-red-500" : ""}`} dir="ltr">
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
              <span className="font-semibold">إجمالي المستحقات</span>
              <span className="font-mono font-bold" dir="ltr">{formatCurrency(ar.outstandingAR)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-4 border border-border rounded-lg">
              <h4 className="text-xs font-semibold mb-3">تقييم المخاطر</h4>
              <div className="space-y-2">
                {agingEntries.map(([period, amount]) => {
                  const risk = period === "0-30" ? "منخفض" : period === "31-60" ? "متوسط" : period === "61-90" ? "مرتفع" : "حرج";
                  const color = period === "0-30" ? "bg-emerald-500" : period === "31-60" ? "bg-amber-500" : period === "61-90" ? "bg-orange-500" : "bg-red-500";
                  const riskColor = period === "0-30" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                    period === "31-60" ? "bg-amber-500/10 text-amber-600" :
                    period === "61-90" ? "bg-orange-500/10 text-orange-600" :
                    "bg-red-500/10 text-red-600";
                  return (
                    <div key={period} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${color}`} />
                        <span className="text-muted-foreground">{period} يوم</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${riskColor}`}>{risk}</span>
                        <span className="font-mono" dir="ltr">{formatCurrency(amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border border-border rounded-lg">
              <h4 className="text-xs font-semibold mb-2">التوصيات</h4>
              <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                {ar.aging["90+"] > 0 && (
                  <li className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                    مراجعة شطب الديون المتأخرة أكثر من 90 يوم
                  </li>
                )}
                {ar.aging["61-90"] > 0 && (
                  <li className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                    تصعيد التحصيل للأرصدة المتأخرة 61-90 يوم
                  </li>
                )}
                {ar.collectionRate < 0.9 && (
                  <li className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                    تطبيق تذكيرات دفع آلية
                  </li>
                )}
                {ar.dso < 30 && ar.collectionRate > 0.85 && (
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                    عملية التحصيل تعمل بكفاءة
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
