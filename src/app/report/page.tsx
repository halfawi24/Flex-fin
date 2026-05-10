"use client";

import { useAppState } from "@/lib/store";
import { useCallback, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Download, Copy, CheckCircle2 } from "lucide-react";

export default function ReportPage() {
  const { state } = useAppState();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!state.analysis) return;
    navigator.clipboard.writeText(state.analysis.executiveSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [state.analysis]);

  const handleDownload = useCallback(() => {
    if (!state.analysis) return;
    const blob = new Blob([state.analysis.executiveSummary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `تقرير_التحليل_المالي_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.analysis]);

  if (!state.analysis) {
    return <EmptyState title="لا توجد بيانات تقرير" description="ارفع بياناتك المالية أو حمّل بيانات تجريبية لإنشاء التقرير التنفيذي." />;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">التقرير التنفيذي</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            تقرير تحليل شامل مع النتائج الرئيسية والتوصيات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "تم النسخ" : "نسخ"}
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
          >
            <Download className="w-3.5 h-3.5" />
            تحميل .txt
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            تاريخ الإنشاء {new Date().toLocaleDateString("ar-SA")} · فليكس فين — التحليل المالي
          </p>
        </div>
        <div className="px-6 py-6">
          <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap text-foreground/90" dir="rtl">
            {state.analysis.executiveSummary}
          </pre>
        </div>
      </div>
    </div>
  );
}
