"use client";

import type { CaseRecord as FactRecord } from "@/src/lib/case-system/caseRecord";
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
  /**
   * Everything the person has told us, read once (caseRecord.ts, master plan
   * Phase 1). Pages read facts from here rather than from master_result.
   */
  record: FactRecord;
  /** The step the person chose, or the one their confirmed stage points to; "" when neither. */
  stepId: string;
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

/**
 * The builder for this case, under its own court. A case whose court is not one
 * the builder knows gets its own page instead: a builder address with no court
 * used to open under Family (never a default court, 30 Oct; test:open-case).
 */
export function builderHref(record: Pick<CaseRecord, "id" | "court_path">): string {
  const court = record.court_path;
  if (court !== "small-claims" && court !== "family" && court !== "civil") return `/cases/${encodeURIComponent(record.id)}`;
  const params = new URLSearchParams({ caseId: record.id, path: court });
  return `/builder?${params.toString()}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}
