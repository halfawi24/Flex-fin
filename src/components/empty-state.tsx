"use client";

import { useAppState } from "@/lib/store";
import { useRouter } from "next/navigation";
import { Upload, Play, BarChart3 } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  const { loadDemo } = useAppState();
  const router = useRouter();

  const handleDemo = () => {
    loadDemo();
  };

  const handleUpload = () => {
    router.push("/");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mb-5">
        <BarChart3 className="w-6 h-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
        {description}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={handleDemo}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity shadow-sm"
        >
          <Play className="w-3.5 h-3.5" />
          تحميل بيانات تجريبية
        </button>
        <button
          onClick={handleUpload}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          رفع ملفات
        </button>
      </div>
    </div>
  );
}
