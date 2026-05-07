"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  icon?: LucideIcon;
  highlight?: boolean;
}

export function KPICard({ label, value, subValue, trend, icon: Icon, highlight }: KPICardProps) {
  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          {label}
        </span>
        {Icon && (
          <Icon className="w-4 h-4 text-muted-foreground/50" />
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-xl font-bold font-mono tracking-tight">{value}</span>
        {trend && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium mb-0.5 ${
              trend === "up"
                ? "text-emerald-500"
                : trend === "down"
                ? "text-red-500"
                : "text-muted-foreground"
            }`}
          >
            {trend === "up" ? (
              <TrendingUp className="w-3 h-3" />
            ) : trend === "down" ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
          </span>
        )}
      </div>
      {subValue && (
        <p className="text-[11px] text-muted-foreground mt-1 font-mono">{subValue}</p>
      )}
    </div>
  );
}
