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
    return <EmptyState title="لا توجد بيانات" description="ارفع ملفات الحسابات المدينة والدائنة والأستاذ العام أو حمّل بيانات تجريبية لعرض لوحة المؤشرات." />;
  }

  const { forecast, ar, ap, funding, ccc, assumptions, gl, scenarios, dataSources } = state.analysis;
  const isPreRevenue = gl.isPreRevenue && assumptions.m1Revenue === 0;
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
      {/* Data source indicator */}
      {(!dataSources.hasAR || !dataSources.hasAP || !dataSources.hasGL) && (
        <div className="flex items-center gap-2 p-2.5 border border-border rounded-lg bg-muted/30 text-xs text-muted-foreground">
          <span className="font-medium">البيانات المحملة:</span>
          <span className={dataSources.hasAR ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50"}>مدينة {dataSources.hasAR ? "✓" : "—"}</span>
          <span className={dataSources.hasAP ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50"}>دائنة {dataSources.hasAP ? "✓" : "—"}</span>
          <span className={dataSources.hasGL ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50"}>أستاذ {dataSources.hasGL ? "✓" : "—"}</span>
          <span className="mr-1 text-muted-foreground/60">| البيانات المفقودة تستخدم معايير قياسية</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">لوحة المؤشرات التنفيذية</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            نظرة عامة مالية لـ 12 شهر{dataSources.hasAR ? ` · ${ar.invoiceCount} فاتورة` : ""}{dataSources.hasAP ? ` · ${ap.billCount} مستحق` : ""}{dataSources.hasGL ? " · الأستاذ محمّل" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            تصدير Excel
          </button>
          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded" dir="ltr">
            {new Date().toLocaleDateString("ar-SA")}
          </span>
        </div>
      </div>

      {/* KPI Grid — adapts to pre-revenue vs revenue company */}
      {isPreRevenue ? (
        <>
          {/* Pre-revenue: Balance Sheet KPIs */}
          <div className="p-3 border border-amber-500/30 bg-amber-500/5 rounded-lg text-xs text-amber-700 dark:text-amber-400">
            شركة في مرحلة التطوير — لا توجد إيرادات حالية. يعرض التحليل الوضع المالي الفعلي من دفتر الأستاذ.
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="إجمالي الأصول" value={formatCurrency(gl.totalAssets)} icon={TrendingUp} highlight />
            <KPICard label="إجمالي الالتزامات" value={formatCurrency(gl.totalLiabilities)} icon={Shield} />
            <KPICard label="حقوق الملكية" value={formatCurrency(gl.totalEquity)} icon={Wallet} />
            <KPICard
              label="الرصيد النقدي"
              value={formatCurrency(gl.cashBalance)}
              trend={gl.cashBalance > 0 ? "up" : "down"}
              icon={DollarSign}
            />
            <KPICard
              label="المصاريف الجارية"
              value={formatCurrency(gl.opex + gl.cogs)}
              subValue="مصاريف تشغيلية + تكاليف"
              icon={BarChart3}
            />
            <KPICard
              label="الذمم الدائنة"
              value={formatCurrency(ap.totalAP)}
              subValue={`${ap.billCount} فاتورة مستحقة`}
              icon={Clock}
            />
            <KPICard
              label="نسبة الدين/الملكية"
              value={gl.totalEquity > 0 ? `${((gl.totalLiabilities / gl.totalEquity) * 100).toFixed(0)}%` : "—"}
              subValue={gl.totalLiabilities > gl.totalEquity * 0.5 ? "مرتفعة" : "مقبولة"}
              trend={gl.totalLiabilities > gl.totalEquity * 0.5 ? "down" : "up"}
              icon={Shield}
            />
            <KPICard
              label="الإيرادات"
              value="$0"
              subValue="مرحلة ما قبل الإيرادات"
              trend="neutral"
              icon={TrendingUp}
            />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
          <KPICard label="الرصيد الافتتاحي" value={formatCurrency(startingCash)} icon={DollarSign} />
          <KPICard
            label="الرصيد (شهر 12)"
            value={formatCurrency(endingCash)}
            trend={cashChange > 0 ? "up" : "down"}
            subValue={`${cashChange > 0 ? "+" : ""}${formatCurrency(cashChange)}`}
            icon={DollarSign}
            highlight
          />
          <KPICard
            label="إيرادات 12 شهر"
            value={formatCurrency(totalRev)}
            subValue={`نمو: ${formatPercent(assumptions.growthRate)}/شهر`}
            icon={TrendingUp}
          />
          <KPICard
            label="أرباح تشغيلية 12 شهر"
            value={formatCurrency(totalEbitda)}
            subValue={`هامش: ${formatPercent(totalEbitda / totalRev)}`}
            icon={BarChart3}
          />
          <KPICard
            label="دورة التحويل النقدي"
            value={formatDays(ccc)}
            subValue={`تحصيل ${ar.dso.toFixed(0)}ي | سداد ${ap.dpo.toFixed(0)}ي`}
            trend={ccc < 30 ? "up" : ccc > 60 ? "down" : "neutral"}
            icon={Clock}
          />
          <KPICard
            label="نسبة تغطية الدين"
            value={`${funding.dscr.toFixed(2)}x`}
            subValue={funding.dscr >= 1.5 ? "قدرة صحية" : "محدودة"}
            trend={funding.dscr >= 1.5 ? "up" : "down"}
            icon={Shield}
          />
          <KPICard
            label="هامش الربح الإجمالي"
            value={formatPercent(grossMargin)}
            subValue={`تكلفة المبيعات: ${formatPercent(assumptions.cogsPct)}`}
            icon={Wallet}
          />
          <KPICard
            label="المدرج النقدي"
            value={cashRunway >= 999 ? "∞" : `${cashRunway.toFixed(0)} شهر`}
            subValue={monthlyBurn > 0 ? `حرق: ${formatCurrency(monthlyBurn)}/شهر` : "تدفق نقدي إيجابي"}
            trend={cashRunway >= 12 || cashRunway >= 999 ? "up" : "down"}
            icon={Clock}
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartContainer title="مسار الإيرادات" subtitle="الإيرادات الشهرية مع معدل النمو">
          <div className="space-y-1.5">
            {forecast.map((m, i) => {
              const pct = (m.revenue / forecast[11].revenue) * 100;
              const growth = i > 0 ? ((m.revenue - forecast[i-1].revenue) / forecast[i-1].revenue) : 0;
              return (
                <div key={m.month} className="flex items-center gap-2 text-xs">
                  <span className="w-7 text-muted-foreground font-mono shrink-0" dir="ltr">M{m.month}</span>
                  <div className="flex-1 bg-muted/20 rounded h-5 overflow-hidden relative">
                    <div className="h-full rounded bg-primary/70 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-20 text-left font-mono text-foreground shrink-0" dir="ltr">
                    {formatCurrency(m.revenue)}
                  </span>
                  {i > 0 && (
                    <span className="w-12 text-left font-mono text-emerald-500 text-[10px] shrink-0" dir="ltr">
                      +{formatPercent(growth)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </ChartContainer>

        <ChartContainer title="الوضع النقدي" subtitle="الرصيد النهائي الشهري مع صافي التدفق">
          <div className="space-y-1.5">
            {forecast.map((m) => {
              const maxCash = forecast[11].endingCash;
              const pct = maxCash > 0 ? (m.endingCash / maxCash) * 100 : 0;
              return (
                <div key={m.month} className="flex items-center gap-2 text-xs">
                  <span className="w-7 text-muted-foreground font-mono shrink-0" dir="ltr">M{m.month}</span>
                  <div className="flex-1 bg-muted/20 rounded h-5 overflow-hidden">
                    <div className="h-full rounded bg-emerald-500/60 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-22 text-left font-mono text-emerald-600 dark:text-emerald-400 shrink-0" dir="ltr">
                    {formatCurrency(m.endingCash)}
                  </span>
                  <span className={`w-16 text-left font-mono text-[10px] shrink-0 ${m.netCashFlow >= 0 ? "text-emerald-500" : "text-red-500"}`} dir="ltr">
                    {m.netCashFlow >= 0 ? "+" : ""}{formatCurrency(m.netCashFlow)}
                  </span>
                </div>
              );
            })}
          </div>
        </ChartContainer>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartContainer title="ملخص السيناريوهات" subtitle="الرصيد النهائي لـ 12 شهر">
          <div className="space-y-4">
            {[
              { label: "أفضل حالة", value: scenarios.best.endingCashM12, color: "bg-emerald-500/70" },
              { label: "الحالة الأساسية", value: scenarios.base.endingCashM12, color: "bg-primary/70" },
              { label: "أسوأ حالة", value: scenarios.worst.endingCashM12, color: "bg-red-500/70" },
            ].map((s) => {
              const maxVal = Math.max(scenarios.best.endingCashM12, 1);
              const pct = (Math.max(s.value, 0) / maxVal) * 100;
              return (
                <div key={s.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-mono font-semibold" dir="ltr">{formatCurrency(s.value)}</span>
                  </div>
                  <div className="w-full bg-muted/20 rounded h-3 overflow-hidden">
                    <div className={`h-full rounded ${s.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartContainer>

        <ChartContainer title="رأس المال العامل" subtitle="الأرصدة الحالية">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-border rounded-md">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">مدينة مستحقة</p>
                <p className="text-sm font-bold font-mono" dir="ltr">{formatCurrency(ar.outstandingAR)}</p>
              </div>
              <ArrowDownRight className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-center justify-between p-3 border border-border rounded-md">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">دائنة مستحقة</p>
                <p className="text-sm font-bold font-mono" dir="ltr">{formatCurrency(ap.outstandingAP)}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between p-3 border border-primary/20 bg-primary/5 rounded-md">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">صافي رأس المال العامل</p>
                <p className="text-sm font-bold font-mono" dir="ltr">{formatCurrency(ar.outstandingAR - ap.outstandingAP)}</p>
              </div>
              <Wallet className="w-4 h-4 text-primary" />
            </div>
          </div>
        </ChartContainer>

        <ChartContainer title="الديون والتمويل" subtitle="نظرة عامة على القدرة">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">تسهيل ائتماني متاح</span>
              <span className="font-mono font-semibold" dir="ltr">{formatCurrency(funding.locSize)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">فائدة التسهيل/شهر</span>
              <span className="font-mono" dir="ltr">{formatCurrency(funding.locMonthlyInterest)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">قسط القرض/شهر</span>
              <span className="font-mono" dir="ltr">{formatCurrency(funding.pmt)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">تكلفة التخصيم/شهر</span>
              <span className="font-mono" dir="ltr">{formatCurrency(funding.factoringCost)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground font-medium">إجمالي خدمة الدين</span>
              <span className="font-mono font-semibold" dir="ltr">{formatCurrency(funding.totalDebtService)}</span>
            </div>
            <div className={`mt-2 p-2 rounded text-center text-[10px] font-medium ${
              funding.dscr >= 1.5 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600"
            }`}>
              نسبة التغطية {funding.dscr.toFixed(2)}x — {funding.dscr >= 1.5 ? "تغطية قوية للديون" : "يجب المراقبة"}
            </div>
          </div>
        </ChartContainer>
      </div>
    </div>
  );
}
