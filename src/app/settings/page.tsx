"use client";

import { useAppState } from "@/lib/store";
import { useState, useCallback, useEffect } from "react";
import { ChartContainer } from "@/components/chart-container";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { Assumptions } from "@/lib/financial-engine";
import { RefreshCw } from "lucide-react";

interface FieldConfig {
  key: keyof Assumptions;
  label: string;
  format: "currency" | "percent" | "number" | "months";
  step: number;
  min?: number;
  max?: number;
  group: string;
}

const fields: FieldConfig[] = [
  { key: "openingCash", label: "Opening Cash Balance", format: "currency", step: 10000, group: "Cash & Revenue" },
  { key: "m1Revenue", label: "Month 1 Revenue", format: "currency", step: 5000, group: "Cash & Revenue" },
  { key: "growthRate", label: "Monthly Revenue Growth", format: "percent", step: 0.005, min: -0.1, max: 0.5, group: "Cash & Revenue" },
  { key: "cogsPct", label: "COGS as % of Revenue", format: "percent", step: 0.01, min: 0, max: 1, group: "Operations" },
  { key: "monthlyOpex", label: "Monthly Operating Expenses", format: "currency", step: 1000, group: "Operations" },
  { key: "monthlyCapex", label: "Monthly CapEx", format: "currency", step: 1000, group: "Operations" },
  { key: "taxRate", label: "Tax Rate", format: "percent", step: 0.01, min: 0, max: 0.5, group: "Operations" },
  { key: "arDays", label: "AR Days Outstanding (DSO)", format: "number", step: 1, min: 0, max: 120, group: "Working Capital" },
  { key: "apDays", label: "AP Days Outstanding (DPO)", format: "number", step: 1, min: 0, max: 120, group: "Working Capital" },
  { key: "locSize", label: "LOC Available", format: "currency", step: 10000, group: "Funding" },
  { key: "locRate", label: "LOC Interest Rate", format: "percent", step: 0.005, min: 0, max: 0.3, group: "Funding" },
  { key: "loanAmount", label: "Term Loan Amount", format: "currency", step: 5000, group: "Funding" },
  { key: "loanTerm", label: "Loan Term", format: "months", step: 6, min: 6, max: 120, group: "Funding" },
  { key: "loanRate", label: "Loan Annual Rate", format: "percent", step: 0.005, min: 0, max: 0.3, group: "Funding" },
  { key: "factoringFee", label: "Factoring Fee %", format: "percent", step: 0.005, min: 0, max: 0.1, group: "Funding" },
];

export default function SettingsPage() {
  const { state, setCustomAssumptions } = useAppState();

  const [localValues, setLocalValues] = useState<Assumptions | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (state.analysis && !localValues) {
      setLocalValues({ ...state.analysis.assumptions });
    }
  }, [state.analysis, localValues]);

  const handleChange = useCallback((key: keyof Assumptions, value: number) => {
    setLocalValues((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: value };
    });
    setHasChanges(true);
  }, []);

  const handleApply = useCallback(() => {
    if (!localValues) return;
    setCustomAssumptions(localValues);
    setHasChanges(false);
  }, [localValues, setCustomAssumptions]);

  const handleReset = useCallback(() => {
    if (state.analysis) {
      setLocalValues({ ...state.analysis.assumptions });
      setHasChanges(false);
    }
  }, [state.analysis]);

  if (!state.analysis) {
    return <EmptyState title="No Analysis Data" description="Upload financial data or load demo data first, then adjust model assumptions here." />;
  }

  if (!localValues) return null;

  function displayValue(field: FieldConfig, val: number): string {
    switch (field.format) {
      case "currency": return formatCurrency(val);
      case "percent": return formatPercent(val);
      case "months": return `${val} months`;
      default: return val.toFixed(1);
    }
  }

  function inputValue(field: FieldConfig, val: number): number {
    if (field.format === "percent") return val * 100;
    return val;
  }

  function fromInput(field: FieldConfig, inputVal: number): number {
    if (field.format === "percent") return inputVal / 100;
    return inputVal;
  }

  // Group fields
  const groups = [...new Set(fields.map(f => f.group))];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Model Assumptions</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Adjust parameters and instantly re-run the 12-month forecast
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors"
            >
              Reset
            </button>
          )}
          <button
            onClick={handleApply}
            disabled={!hasChanges}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
              hasChanges
                ? "bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-calculate
          </button>
        </div>
      </div>

      {groups.map(group => (
        <ChartContainer key={group} title={group} subtitle="Drag sliders to adjust values">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            {fields.filter(f => f.group === group).map((field) => {
              const val = localValues[field.key] as number;
              const maxRange = field.max !== undefined ? inputValue(field, field.max) : inputValue(field, val) * 3;
              const minRange = field.min !== undefined ? inputValue(field, field.min) : 0;
              return (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">{field.label}</label>
                    <span className="text-xs font-mono font-semibold">{displayValue(field, val)}</span>
                  </div>
                  <input
                    type="range"
                    min={minRange}
                    max={maxRange}
                    step={field.format === "percent" ? field.step * 100 : field.step}
                    value={inputValue(field, val)}
                    onChange={(e) => handleChange(field.key, fromInput(field, parseFloat(e.target.value)))}
                    className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[9px] text-muted-foreground/50 font-mono">
                    <span>{displayValue(field, field.min !== undefined ? field.min : 0)}</span>
                    <span>{displayValue(field, field.max !== undefined ? field.max : val * 3)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartContainer>
      ))}

      {hasChanges && (
        <div className="border border-primary/30 bg-primary/5 rounded-lg p-4">
          <p className="text-xs text-primary font-medium">
            You have unsaved changes. Click &ldquo;Re-calculate&rdquo; to update all charts and analysis with new assumptions.
          </p>
        </div>
      )}
    </div>
  );
}
