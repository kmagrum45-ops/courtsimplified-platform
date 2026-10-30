"use client";

/**
 * The case page: one home for a case after intake.
 *
 * WHY (2026-10-04). A case was spread over fourteen pages: three dashboards,
 * four package/export builders, link-only hub pages, and a timeline and a
 * documents workspace that almost nothing linked to. Several read browser
 * storage that nothing fills any more and could only ever show "no case
 * found". The site owner asked for it to be made right, not merely trimmed.
 *
 * This layout loads the case once, shows who and where it is, and gives each
 * part of the work its own section with its own URL, so a deep link, the back
 * button and a bookmark all land where the user was:
 *
 *   /cases/[id]            Overview: where the case is, the next step, dates
 *   /cases/[id]/timeline   What happened, what the user recorded, deadlines
 *   /cases/[id]/documents  Upload, check and date documents; communications
 *   /cases/[id]/forms      Official forms, and which apply to this case
 *   /cases/[id]/drafts     The user's own working drafts, saved on the case
 *   /cases/[id]/case-file  The whole case on one page, to print or save as PDF
 *
 * Nothing on these pages grades the case (CLAUDE.md section 3), and every
 * stage or date shown is one the user confirmed (section 4).
 */

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import GetHelp from "../../_components/GetHelp";
import LegalInformationNotice from "../../_components/LegalInformationNotice";
import { userIsResponding } from "../../builder/_components/respondingSide";
import { positionSavesSettled } from "../../builder/_components/positionSave";
import type { StoredCaseData } from "../../builder/_components/builderTypes";
import { courtPathAsPathway, readCasePosition } from "@/src/lib/case-system/casePosition";
import { caseStepFor } from "@/src/lib/case-system/caseStep";
import { readCaseRecord, sideFromParts } from "@/src/lib/case-system/caseRecord";
import { situationLine, situationOfCase } from "@/src/lib/case-system/situation/situation";
import { confirmedIntakeRevision, guidanceIsCurrent, guidanceNeedsUpdate } from "@/src/lib/case-system/intakeReview";
import {
  CaseHomeContext,
  COURT_LABELS,
  builderHref,
  caseTitle,
  formatDate,
  type CaseHome,
  type CaseRecord,
} from "../_components/CaseHomeContext";

const SECTIONS = [
  { href: "", label: "Overview" },
  { href: "/timeline", label: "Timeline" },
  { href: "/documents", label: "Documents" },
  { href: "/forms", label: "Forms" },
  { href: "/drafts", label: "Drafts" },
  { href: "/case-file", label: "Case file" },
] as const;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export default function CaseLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const caseId = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "failed">("loading");
  const [loadError, setLoadError] = useState("");
  const ownerRef = useRef<string | null>(null);
  const loadVersion = useRef(0);

  const loadOnce = useCallback(async () => {
    const version = ++loadVersion.current;
    const { supabase } = await import("@/src/lib/supabase/client");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (version !== loadVersion.current) return;
    ownerRef.current = user?.id ?? null;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/cases/${caseId}`)}`);
      return;
    }
    // A stage, step, date or service method the person just gave (on the
    // results page, or on this page's deadline box) may still be on its way.
    // Reading before it lands asked for it again (walkthrough 2026-10-13, R4:
    // "Which year was that?" after "Saved to your case").
    await positionSavesSettled(caseId);
    const read = () =>
      supabase
        .from("cases")
        .select("id,title,court_path,status,current_stage,created_at,updated_at,master_result")
        .eq("id", caseId)
        .eq("user_id", user.id)
        .maybeSingle();
    let { data, error } = await read();
    // A failed read is not a missing case (2026-10-08: a walkthrough reload was
    // told its case "may have been deleted"). Try twice more before saying so.
    for (let attempt = 1; error && attempt <= 2; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1_500 * attempt));
      ({ data, error } = await read());
    }
    if (version !== loadVersion.current) return;
    if (error) {
      setLoadError(error.message);
      setState("failed");
      return;
    }
    if (!data) {
      setState("missing");
      return;
    }
    setCaseRecord(data as CaseRecord);
    setState("ready");
  }, [caseId, router]);

  /*
   * ONE READ OF THE CASE AT A TIME (2026-10-14, run 38525903567: GET
   * /rest/v1/cases 500 57014 while the case page opened). The whole case is
   * read here, and the page asked for it again from several places at once:
   * the first open, the look-again 2.5 seconds later, and once after every
   * save of the deadline box. A reload asked for while a read is going does
   * not start a second one beside it: it runs once more after it, however
   * many were asked for, so the newest save is still read.
   */
  const loadingRef = useRef<Promise<void> | null>(null);
  const againRef = useRef(false);
  const load = useCallback((): Promise<void> => {
    if (loadingRef.current) {
      againRef.current = true;
      return loadingRef.current;
    }
    const run = (async () => {
      try {
        do {
          againRef.current = false;
          await loadOnce();
        } while (againRef.current);
      } finally {
        loadingRef.current = null;
      }
    })();
    loadingRef.current = run;
    return run;
  }, [loadOnce]);

  useEffect(() => {
    if (caseId) void load();
  }, [caseId, load]);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    const invalidateLoads = () => { loadVersion.current++; };
    void import("@/src/lib/supabase/client").then(({ supabase }) => {
      if (!active) return;
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "INITIAL_SESSION" || ownerRef.current === (session?.user.id ?? null)) return;
        ownerRef.current = session?.user.id ?? null;
        loadVersion.current++;
        setCaseRecord(null); setState("loading");
        void load();
      });
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => { active = false; invalidateLoads(); unsubscribe(); };
  }, [load]);

  const home = useMemo<CaseHome | null>(() => {
    if (!caseRecord) return null;
    const master = asRecord(caseRecord.master_result);
    const position = readCasePosition(master, caseRecord.court_path);
    const courtPath = courtPathAsPathway(caseRecord.court_path);
    const responding = userIsResponding({
      confirmedStage: position.confirmedStage,
      caseData: (master.intakeData as StoredCaseData | undefined) ?? null,
      intakeFacts: asRecord(master.intakeFacts),
      situation: situationOfCase(master),
    });
    return {
      caseRecord,
      position,
      courtPath,
      responding,
      record: readCaseRecord(master, caseRecord.court_path),
      // The step the Overview's card opens on, worked out the card's way
      // (caseStep.ts): a notice step first where the card puts it first
      // (walkthrough 2026-10-13, R5: the Case file named the court-starting
      // step while the Overview counted the notice step's deadlines).
      stepId: caseStepFor(master, courtPath, responding, { requireConfirmedStage: true }),
      reload: load,
    };
  }, [caseRecord, load]);

  if (state === "loading" || caseRecord && caseRecord.id !== caseId) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-[#4f685f]" aria-live="polite">
        Opening your case…
      </main>
    );
  }

  if (state === "failed") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-3xl border border-[#d8e6df] bg-white p-8">
          <h1 className="text-2xl font-bold text-[#10231f]">Your case could not be loaded just now</h1>
          <p className="mt-3 text-[#4f685f]">Nothing has been lost. Please try again in a moment.</p>
          <p data-testid="case-load-error" className="mt-2 text-xs text-[#7a5418]">Details: {loadError.slice(0, 200)}</p>
          <button
            type="button"
            onClick={() => {
              setState("loading");
              void load();
            }}
            className="mt-6 inline-flex rounded-full bg-[#2f7d67] px-5 py-3 font-semibold text-white"
          >
            Try again
          </button>
          <GetHelp compact heading="Need help with your case in the meantime?" />
        </div>
      </main>
    );
  }

  if (state === "missing" || !home) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-3xl border border-[#d8e6df] bg-white p-8">
          <h1 className="text-2xl font-bold text-[#10231f]">This case could not be opened</h1>
          <p className="mt-3 text-[#4f685f]">
            It may have been deleted, or it belongs to a different account. Your other cases are on your
            dashboard.
          </p>
          <Link href="/dashboard" className="mt-6 inline-flex rounded-full bg-[#2f7d67] px-5 py-3 font-semibold text-white">
            Go to my cases
          </Link>
          <GetHelp compact heading="Need help with your case?" />
        </div>
      </main>
    );
  }

  const base = `/cases/${encodeURIComponent(caseId)}`;
  const record = home.caseRecord;
  if (caseRecord && !guidanceIsCurrent(caseRecord.master_result, caseRecord.court_path, caseRecord.id)) return <main className="mx-auto max-w-3xl p-8" data-testid="case-intake-gate">{situationLine(situationOfCase(caseRecord.master_result)) ? <p data-testid="situation-line" className="mb-4 text-sm font-semibold text-[#16302b]">{situationLine(situationOfCase(caseRecord.master_result))} · <Link data-testid="situation-change" href={`${builderHref(caseRecord)}${builderHref(caseRecord).includes("?") ? "&" : "?"}situation=change`} className="text-[#2f7d67] underline">Change</Link></p> : null}{/* Confirmed, with no next step made yet (the page stopped before it, #477 re-test case 11): said as it is, with the way on, never "review again". */}
    {/* Confirmed, but an answer was added after the next steps were made (D1 review): they are made again, nothing is confirmed again. */}
    {guidanceNeedsUpdate(caseRecord.master_result, caseRecord.court_path, caseRecord.id) ? <><h1 className="text-2xl font-bold">Your information is confirmed</h1><p data-testid="case-guidance-outdated" className="my-4">Your next steps were made before your latest answer. Update them so they include it; nothing needs to be confirmed again.</p><Link data-testid="case-update-next-steps" className="inline-flex rounded-full bg-[#2f7d67] px-5 py-3 font-semibold text-white" href={builderHref(caseRecord)}>Update my next steps</Link></> : confirmedIntakeRevision(caseRecord.master_result, caseRecord.court_path, caseRecord.id) ? <><h1 className="text-2xl font-bold">Your information is confirmed</h1><p data-testid="case-confirmed-no-step" className="my-4">Your next step has not been shown yet. Open it from your confirmed information; nothing needs to be answered again.</p><Link data-testid="case-show-next-step" className="inline-flex rounded-full bg-[#2f7d67] px-5 py-3 font-semibold text-white" href={builderHref(caseRecord)}>Show my next step</Link></> : <><h1 className="text-2xl font-bold">Review your initial information before receiving case guidance</h1><p className="my-4">Your saved documents, evidence and other case information remain on this case. Complete the initial questions, review your answers and confirm them, then generate guidance for the current information. Older completion records do not establish this confirmation.</p><Link className="underline" href={builderHref(caseRecord)}>Continue this case’s intake and review</Link></>}<p className="my-4"><Link href="/guides">General legal information</Link>{" · "}<Link href="/forms">General official forms catalogue</Link></p><GetHelp /><LegalInformationNotice /></main>;
  // Both sides are named, from the same rule (caseRecord.ts sideFromParts): only the responding
  // side had a line, so applicant and plaintiff pages said nothing about the side (#470 re-test).
  const starting = !home.responding && sideFromParts({ confirmedStage: home.position.confirmedStage, intakeData: asRecord(record.master_result).intakeData, intakeFacts: asRecord(record.master_result).intakeFacts, situation: situationOfCase(record.master_result) })?.value === "starting";
  const side = home.courtPath
    ? home.responding
      ? home.courtPath === "family" ? "You are responding (respondent)" : "You are responding (defendant)"
      : starting
        ? home.courtPath === "family" ? "You started, or plan to start, this case (applicant)" : "You are bringing this case (plaintiff)"
        : null
    : null;

  return (
    <CaseHomeContext.Provider value={home}>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 text-[#16302b] sm:px-6">
        <header className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm print:hidden">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
                {(record.court_path && COURT_LABELS[record.court_path]) || "Court not chosen yet"}
              </p>
              <h1 data-testid="case-home-title" className="mt-1 text-3xl font-bold text-[#10231f]">
                {caseTitle(record)}
              </h1>
              <p className="mt-2 text-sm text-[#4f685f]">
                {/* The person's own answers from before their story (situation.ts), with Change; the older side line only for a case saved before them. */}
                {situationLine(situationOfCase(record.master_result))
                  ? <><span data-testid="situation-line" className="font-semibold text-[#16302b]">{situationLine(situationOfCase(record.master_result))}</span>{" · "}<Link data-testid="situation-change" href={`${builderHref(record)}${builderHref(record).includes("?") ? "&" : "?"}situation=change`} className="font-semibold text-[#2f7d67] underline">Change</Link>{" · "}</>
                  : side ? `${side} · ` : ""}
                {record.updated_at ? `Last updated ${formatDate(record.updated_at)}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={builderHref(record)}
                className="rounded-full border border-[#2f7d67] bg-white px-4 py-2 text-sm font-semibold text-[#2f7d67]"
              >
                Update your story
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-4 py-2 text-sm font-semibold text-[#24463d]"
              >
                All my cases
              </Link>
            </div>
          </div>

          <nav aria-label="Case sections" className="-mb-2 mt-6 overflow-x-auto">
            <ul className="flex min-w-max gap-1 border-b border-[#e3efe9]">
              {SECTIONS.map((section) => {
                const href = `${base}${section.href}`;
                const active = section.href === "" ? pathname === base : pathname?.startsWith(href);
                return (
                  <li key={section.label}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      data-testid={`case-tab-${section.href.replace("/", "") || "overview"}`}
                      className={`inline-block border-b-2 px-4 py-3 text-sm font-semibold transition ${
                        active
                          ? "border-[#2f7d67] text-[#10231f]"
                          : "border-transparent text-[#4f685f] hover:border-[#bcd9cd] hover:text-[#10231f]"
                      }`}
                    >
                      {section.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </header>

        <div className="mt-6">{children}</div>

        <div className="mt-10 print:hidden">
          <LegalInformationNotice />
        </div>
      </main>
    </CaseHomeContext.Provider>
  );
}
