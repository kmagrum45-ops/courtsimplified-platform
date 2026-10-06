"use client";

import { createContext, useContext } from "react";

import type { CasePosition } from "@/src/lib/case-system/casePosition";
import { caseTitleFromIntake, isGeneratedTitle } from "@/src/lib/case-system/caseTitle";

/** The case row the case page loads once and every section reads. */
export type CaseRecord = {
  id: string;
  title: string | null;
  court_path: string | null;
  status: string | null;
  current_stage: string | null;
  created_at: string | null;
  updated_at: string | null;
  master_result: Record<string, unknown> | null;
};

export type CaseHome = {
  caseRecord: CaseRecord;
  position: CasePosition;
  /** "small-claims" | "civil" | "family", or null for a case with no court yet. */
  courtPath: "small-claims" | "civil" | "family" | null;
  /** Whether the user is on the responding side, from their own answers. */
  responding: boolean;
  reload: () => Promise<void>;
};

export const CaseHomeContext = createContext<CaseHome | null>(null);

export function useCaseHome(): CaseHome {
  const value = useContext(CaseHomeContext);
  if (!value) throw new Error("useCaseHome must be used inside the case page layout.");
  return value;
}

export async function authHeaders(): Promise<Record<string, string> | null> {
  const { supabase } = await import("@/src/lib/supabase/client");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }
    : null;
}

export const COURT_LABELS: Record<string, string> = {
  "small-claims": "Ontario Small Claims Court",
  civil: "Ontario Superior Court of Justice (civil)",
  // Not "family court": the Family Court is one branch that sits only in some
  // places (FLR r. 1 (3)); a Sudbury case is not in it (page review, 2026-10-06).
  family: "Ontario family case",
};

export function caseTitle(record: CaseRecord): string {
  const title = (record.title || "").trim();
  if (!isGeneratedTitle(title)) return title;
  const intake = (record.master_result?.intakeData ?? {}) as { otherParty?: unknown };
  return caseTitleFromIntake(intake.otherParty, record.court_path);
}

export function builderHref(record: CaseRecord): string {
  const params = new URLSearchParams({ caseId: record.id });
  if (record.court_path && record.court_path !== "unknown") params.set("path", record.court_path);
  return `/builder?${params.toString()}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}
