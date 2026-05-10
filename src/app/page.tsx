"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/store";
import { Upload, FileText, Play, CheckCircle2, AlertCircle, X, Info } from "lucide-react";

type FileType = "ar" | "ap" | "gl";

interface FileState {
  file: File | null;
  content: string | null;
  status: "empty" | "loaded" | "error" | "parsing";
  error?: string;
  preview?: { headers: string[]; rowCount: number };
}

const fileConfig: Record<FileType, { label: string; description: string; hint: string }> = {
  ar: {
    label: "الحسابات المدينة",
    description: "بيانات الفواتير مع تواريخ الإصدار والسداد",
    hint: "أعمدة: تاريخ الفاتورة، المبلغ، تاريخ السداد",
  },
  ap: {
    label: "الحسابات الدائنة",
    description: "بيانات المشتريات وأعمار الديون",
    hint: "أعمدة: تاريخ الفاتورة، المبلغ، تاريخ الدفع",
  },
  gl: {
    label: "دفتر الأستاذ العام",
    description: "قيود يومية مع أكواد الحسابات والمبالغ",
    hint: "أعمدة: رمز الحساب، المدين، الدائن",
  },
};

export default function UploadPage() {
  const router = useRouter();
  const { runAnalysis, loadDemo, state } = useAppState();
  const [files, setFiles] = useState<Record<FileType, FileState>>({
    ar: { file: null, content: null, status: "empty" },
    ap: { file: null, content: null, status: "empty" },
    gl: { file: null, content: null, status: "empty" },
  });

  const handleFile = useCallback(async (type: FileType, file: File) => {
    // Show parsing state
    setFiles((prev) => ({
      ...prev,
      [type]: { file, content: null, status: "parsing" as const },
    }));

    try {
      const ext = file.name.toLowerCase().split(".").pop() || "";
      let csvText: string;
      let headers: string[];
      let rowCount: number;

      if (ext === "xlsx" || ext === "xls" || ext === "xlsm") {
        // Excel files → parse server-side via API
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);

        const response = await fetch("/api/parse-file", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          throw new Error(result.error || "فشل في تحليل الملف");
        }

        csvText = result.csvText;
        headers = result.headers;
        rowCount = result.rowCount;
      } else {
        // CSV/TSV files → parse client-side (simple text parsing)
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) throw new Error("الملف يجب أن يحتوي على صف عناوين وصف بيانات واحد على الأقل");

        let sep = ",";
        if (lines[0].includes("\t") && !lines[0].includes(",")) sep = "\t";
        else if (lines[0].includes(";") && !lines[0].includes(",")) sep = ";";

        headers = lines[0].split(sep).map((h) => h.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
        rowCount = lines.length - 1;
        csvText = text;
      }

      setFiles((prev) => ({
        ...prev,
        [type]: {
          file,
          content: csvText,
          status: "loaded" as const,
          preview: { headers, rowCount },
        },
      }));
    } catch (e) {
      setFiles((prev) => ({
        ...prev,
        [type]: { file: null, content: null, status: "error" as const, error: (e as Error).message },
      }));
    }
  }, []);

  const handleDrop = useCallback(
    (type: FileType) => (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(type, file);
    },
    [handleFile]
  );

  const handleSelect = useCallback(
    (type: FileType) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(type, file);
    },
    [handleFile]
  );

  const clearFile = useCallback((type: FileType) => {
    setFiles((prev) => ({ ...prev, [type]: { file: null, content: null, status: "empty" } }));
  }, []);

  const loadedCount = [files.ar, files.ap, files.gl].filter((f) => f.status === "loaded").length;
  const parsingCount = [files.ar, files.ap, files.gl].filter((f) => f.status === "parsing").length;
  const hasAnyFile = loadedCount > 0;

  const handleAnalyze = useCallback(() => {
    const arContent = files.ar.status === "loaded" ? files.ar.content : null;
    const apContent = files.ap.status === "loaded" ? files.ap.content : null;
    const glContent = files.gl.status === "loaded" ? files.gl.content : null;
    if (!arContent && !apContent && !glContent) return;
    runAnalysis(arContent, apContent, glContent);
    router.push("/dashboard");
  }, [files, runAnalysis, router]);

  const handleDemo = useCallback(() => {
    loadDemo();
    router.push("/dashboard");
  }, [loadDemo, router]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Hero */}
      <section className="px-6 pt-16 pb-10 text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          تحليل مالي <span className="text-primary">في ثوانٍ</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto mb-8">
          ارفع بيانات الحسابات المدينة والدائنة ودفتر الأستاذ العام.
          احصل على توقعات 12 شهر، تحليل السيناريوهات، مؤشرات رأس المال العامل، وتقارير تنفيذية — 
          كل الحسابات تتم محلياً بدون تكلفة.
        </p>
        <button
          onClick={handleDemo}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          تجربة بيانات تجريبية
        </button>
      </section>

      {/* Upload Cards */}
      <section className="flex-1 px-6 pb-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {(Object.keys(fileConfig) as FileType[]).map((type) => {
            const config = fileConfig[type];
            const fileState = files[type];

            return (
              <div
                key={type}
                className={`relative border rounded-lg p-5 transition-all ${
                  fileState.status === "loaded"
                    ? "border-primary/40 bg-primary/5"
                    : fileState.status === "error"
                    ? "border-destructive/40 bg-destructive/5"
                    : fileState.status === "parsing"
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border hover:border-primary/30"
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop(type)}
              >
                {fileState.status === "loaded" && (
                  <button
                    onClick={() => clearFile(type)}
                    className="absolute top-3 left-3 p-1 rounded hover:bg-muted"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}

                <div className="flex items-start gap-3 mb-4">
                  <div
                    className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                      fileState.status === "loaded"
                        ? "bg-primary/20"
                        : fileState.status === "parsing"
                        ? "bg-amber-500/20"
                        : "bg-muted"
                    }`}
                  >
                    {fileState.status === "loaded" ? (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    ) : fileState.status === "error" ? (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    ) : fileState.status === "parsing" ? (
                      <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{config.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                  </div>
                </div>

                {fileState.status === "loaded" && fileState.preview ? (
                  <div className="text-xs space-y-1">
                    <p className="text-foreground font-medium">{fileState.file?.name}</p>
                    <p className="text-muted-foreground">
                      {fileState.preview.rowCount} صف &middot;{" "}
                      {fileState.preview.headers.length} عمود
                    </p>
                    <p className="text-muted-foreground/70 font-mono text-[10px] truncate" dir="ltr">
                      {fileState.preview.headers.slice(0, 4).join(", ")}
                      {fileState.preview.headers.length > 4 && "..."}
                    </p>
                  </div>
                ) : fileState.status === "parsing" ? (
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    <p>جارٍ قراءة الملف...</p>
                    <p className="text-muted-foreground mt-0.5">{fileState.file?.name}</p>
                  </div>
                ) : fileState.status === "error" ? (
                  <p className="text-xs text-destructive">{fileState.error}</p>
                ) : (
                  <div className="text-center py-3">
                    <label className="cursor-pointer inline-flex flex-col items-center gap-2">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        اسحب الملف هنا أو{" "}
                        <span className="text-primary font-medium">تصفح</span>
                      </span>
                      <input
                        type="file"
                        accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm"
                        className="sr-only"
                        onChange={handleSelect(type)}
                      />
                    </label>
                    <p className="text-[10px] text-muted-foreground/60 mt-2 font-mono" dir="ltr">
                      {config.hint}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info banner */}
        <div className="max-w-5xl mx-auto mb-6">
          <div className="flex items-start gap-2 p-3 border border-border rounded-lg bg-muted/30 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>
              يدعم ملفات <strong>CSV و Excel (.xlsx)</strong> بما في ذلك الأعمدة العربية.
              يمكنك رفع أي مزيج من الملفات — مع الثلاثة تحصل على التحليل الكامل.
              مع ملف أو ملفين تحصل على تحليل جزئي. البيانات المفقودة تستخدم معايير قياسية.
            </p>
          </div>
        </div>

        {/* Analyze Button */}
        <div className="max-w-5xl mx-auto text-center">
          <button
            onClick={handleAnalyze}
            disabled={!hasAnyFile || state.isLoading || parsingCount > 0}
            className={`inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-md transition-all ${
              hasAnyFile && parsingCount === 0
                ? "bg-primary text-primary-foreground hover:opacity-90 shadow-md"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {state.isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                جارٍ التحليل...
              </>
            ) : parsingCount > 0 ? (
              <>
                <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                جارٍ قراءة الملفات...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                {hasAnyFile
                  ? `تشغيل التحليل (${loadedCount}/3 ملفات)`
                  : "ارفع ملفاً واحداً على الأقل للبدء"}
              </>
            )}
          </button>
          {state.error && (
            <p className="text-xs text-destructive mt-3 max-w-md mx-auto">{state.error}</p>
          )}
        </div>
      </section>
    </div>
  );
}
