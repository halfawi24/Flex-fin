"use client";

import { useState, useCallback, useMemo } from "react";
import { AppContext, type AppState } from "@/lib/store";
import type { FullAnalysis, Assumptions } from "@/lib/financial-engine";
import {
  parseARData,
  parseAPData,
  parseGLData,
  runFullAnalysis,
  getSampleData,
  analyzeAR,
  analyzeAP,
  analyzeGL,
} from "@/lib/financial-engine";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    analysis: null,
    isLoading: false,
    error: null,
    files: { ar: null, ap: null, gl: null },
    customAssumptions: {},
  });

  const setAnalysis = useCallback((analysis: FullAnalysis | null) => {
    setState((prev) => ({ ...prev, analysis, error: null }));
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setState((prev) => ({ ...prev, isLoading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error, isLoading: false }));
  }, []);

  const setFiles = useCallback(
    (files: { ar: string | null; ap: string | null; gl: string | null }) => {
      setState((prev) => ({ ...prev, files }));
    },
    []
  );

  const setCustomAssumptions = useCallback(
    (customAssumptions: Partial<Assumptions>) => {
      setState((prev) => {
        const newState = { ...prev, customAssumptions };
        // If we have files, re-run analysis with new assumptions
        if (prev.files.ar && prev.files.ap && prev.files.gl) {
          try {
            const arRecords = parseARData(prev.files.ar);
            const apRecords = parseAPData(prev.files.ap);
            const glRecords = parseGLData(prev.files.gl);
            const analysis = runFullAnalysis(arRecords, apRecords, glRecords, customAssumptions);
            return { ...newState, analysis, error: null };
          } catch (e) {
            return { ...newState, error: (e as Error).message };
          }
        }
        return newState;
      });
    },
    []
  );

  const runAnalysis = useCallback(
    (ar: string, ap: string, gl: string, customAssumptions?: Partial<Assumptions>) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null, files: { ar, ap, gl } }));
      // Use setTimeout to allow UI to update
      setTimeout(() => {
        try {
          const arRecords = parseARData(ar);
          const apRecords = parseAPData(ap);
          const glRecords = parseGLData(gl);
          const analysis = runFullAnalysis(
            arRecords,
            apRecords,
            glRecords,
            customAssumptions || state.customAssumptions
          );
          setState((prev) => ({ ...prev, analysis, isLoading: false, error: null }));
        } catch (e) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: (e as Error).message,
          }));
        }
      }, 50);
    },
    [state.customAssumptions]
  );

  const loadDemo = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    setTimeout(() => {
      try {
        const { ar, ap, gl } = getSampleData();
        const arAnalysis = analyzeAR(ar);
        const apAnalysis = analyzeAP(ap);
        const glAnalysis = analyzeGL(gl);
        const analysis = runFullAnalysis(ar, ap, gl);
        setState((prev) => ({
          ...prev,
          analysis,
          isLoading: false,
          error: null,
          files: { ar: "demo", ap: "demo", gl: "demo" },
        }));
      } catch (e) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: (e as Error).message,
        }));
      }
    }, 100);
  }, []);

  const contextValue = useMemo(
    () => ({
      state,
      setAnalysis,
      setLoading,
      setError,
      setFiles,
      setCustomAssumptions,
      runAnalysis,
      loadDemo,
    }),
    [state, setAnalysis, setLoading, setError, setFiles, setCustomAssumptions, runAnalysis, loadDemo]
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}
