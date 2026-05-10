"use client";

import { createContext, useContext } from "react";
import type { FullAnalysis, Assumptions } from "./financial-engine";

export interface AppState {
  analysis: FullAnalysis | null;
  isLoading: boolean;
  error: string | null;
  files: { ar: string | null; ap: string | null; gl: string | null };
  customAssumptions: Partial<Assumptions>;
}

export interface AppContextType {
  state: AppState;
  setAnalysis: (analysis: FullAnalysis | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFiles: (files: { ar: string | null; ap: string | null; gl: string | null }) => void;
  setCustomAssumptions: (assumptions: Partial<Assumptions>) => void;
  runAnalysis: (ar: string | null, ap: string | null, gl: string | null, customAssumptions?: Partial<Assumptions>) => void;
  loadDemo: () => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export function useAppState(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppState must be used within AppProvider");
  }
  return context;
}
