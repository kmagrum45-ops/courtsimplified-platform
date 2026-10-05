"use client";

import { createContext, useContext } from "react";

import type { CasePosition } from "@/src/lib/case-system/casePosition";

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
  family: "Ontario family court",
};

export function caseTitle(record: CaseRecord): string {
  const title = (record.title || "").trim();
  if (!title || /^(new courtsimplified case|untitled courtsimplified case)$/i.test(title)) {
    return "Your case";
  }
  return title;
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
