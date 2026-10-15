"use client";

/**
 * My cases: every case the signed-in user has, newest first, each opening its
 * case page (/cases/[id]).
 *
 * Rewritten 2026-10-04. The old dashboard graded cases: it created each new
 * case with a starter record carrying a readiness score of 0 and a
 * "medium"-severity risk, counted cases by "outstanding items", showed a
 * completeness bar and workflow chips marked ready/needed, and picked each
 * case's "next action" from a ladder that sent users to review "critical
 * risks" and "credibility" (CLAUDE.md section 3). It also linked into pages
 * that no longer exist. A case now shows what the user confirmed — where it
 * is — and opens the case page, which shows the next step.
 *
 * New cases start in the builder, which creates the case when the story is
 * saved, so a case is never an empty shell with invented content in it.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "../../src/lib/supabase/client";
import { resetIntakeInBrowser } from "../../src/lib/case-system/storage/resetIntake";
import { readCasePosition, settledStage } from "../../src/lib/case-system/casePosition";
import { readCaseDrafts } from "../../src/lib/case-system/drafts/caseDrafts";
import { getStageLabel } from "../builder/_components/builderTypes";
import { COURT_LABELS, caseTitle, formatDate, type CaseRecord } from "../cases/_components/CaseHomeContext";
import { nextCountedDate, ontarioToday, reminderLine, type CountedDateReminder } from "../../src/lib/case-workspace/upcomingDeadline";
import type { TimelineItem } from "../../src/lib/case-workspace/timeline";

/** The most cases whose counted dates are fetched for the cards; the rest show none. */
const REMINDER_CASES = 10;

/**
 * Each case's nearest counted date, from the same Timeline view the case
 * shows (master plan 6D, in-app reminders). A case that fails to load simply
 * shows no line: a reminder is a convenience, never a gate.
 */
async function loadReminders(records: CaseRecord[]): Promise<Record<string, CountedDateReminder>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  const headers = { Authorization: `Bearer ${session.access_token}` };
  const today = ontarioToday();
  const withStep = records.filter((record) => settledStage(readCasePosition(record.master_result, record.court_path))).slice(0, REMINDER_CASES);
  const entries = await Promise.all(
    withStep.map(async (record) => {
      try {
        const response = await fetch(`/api/workspace/organisation?caseId=${encodeURIComponent(record.id)}&view=timeline`, { headers });
        if (!response.ok) return null;
        const payload = (await response.json()) as { success?: boolean; items?: TimelineItem[] };
        const reminder = payload.success && Array.isArray(payload.items) ? nextCountedDate(payload.items, today) : null;
        return reminder ? ([record.id, reminder] as const) : null;
      } catch {
        return null;
      }
    }),
  );
  return Object.fromEntries(entries.filter((entry): entry is readonly [string, CountedDateReminder] => Boolean(entry)));
}

const START_OPTIONS = [
  {
    path: "small-claims",
    title: "Small Claims Court",
    description: "Money owed, damaged property, unpaid work, deposits and other claims up to the Small Claims limit.",
  },
  {
    path: "family",
    title: "Family court",
    description: "Parenting time, decision-making, child and spousal support, property and other family matters.",
  },
  {
    path: "civil",
    title: "Superior Court (civil)",
    description: "Larger civil claims and the matters that go to the Superior Court of Justice.",
  },
] as const;

function stageLine(record: CaseRecord): string {
  const position = readCasePosition(record.master_result, record.court_path);
  const stage = settledStage(position);
  if (stage) {
    return getStageLabel(stage) || "Stage confirmed";
  }
  return "Where the case is: not confirmed yet";
}

function CaseCard({ record, highlighted, reminder }: { record: CaseRecord; highlighted?: boolean; reminder?: CountedDateReminder }) {
  const drafts = readCaseDrafts(record.master_result).length;
  return (
    <Link
      href={`/cases/${encodeURIComponent(record.id)}`}
      data-testid="dashboard-case"
      className={`block rounded-3xl border bg-white p-6 shadow-sm transition hover:border-[#2f7d67] hover:shadow-md ${
        highlighted ? "border-[#2f7d67]" : "border-[#d8e6df]"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[#2f7d67]">
        {(record.court_path && COURT_LABELS[record.court_path]) || "Court not chosen yet"}
      </p>
      <h3 className="mt-1 text-xl font-bold text-[#10231f]">{caseTitle(record)}</h3>
      <p className="mt-2 text-sm text-[#24463d]">{stageLine(record)}</p>
      {reminder ? (
        <p
          data-testid="dashboard-reminder"
          className={`mt-3 rounded-2xl px-3 py-2 text-sm ${
            reminder.passed || reminder.daysAway <= 7 ? "bg-[#fdf3e3] text-[#7a5418]" : "bg-[#e8f6f4] text-[#1c5c55]"
          }`}
        >
          {reminderLine(reminder)}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-[#4f685f]">
        {record.updated_at ? `Updated ${formatDate(record.updated_at)}` : ""}
        {drafts ? ` · ${drafts} draft${drafts === 1 ? "" : "s"}` : ""}
      </p>
      <span className="mt-4 inline-block text-sm font-semibold text-[#2f7d67]">Open case →</span>
    </Link>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reminders, setReminders] = useState<Record<string, CountedDateReminder>>({});

  async function loadDashboard() {
    setLoading(true);
    setError("");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      router.push("/login?next=%2Fdashboard");
      return;
    }
    setEmail(user.email || "");
    /*
     * ONLY THE PARTS OF EACH CASE THE CARDS SHOW (2026-10-14, run
     * 38525903567). This read every case's whole master_result -- the
     * analysis, the intake, the reading, several copies of each -- to show a
     * stage, a draft count and the other party's name. PostgREST's JSON paths
     * read just those three.
     */
    const { data, error: loadError } = await supabase
      .from("cases")
      .select(
        "id,title,court_path,status,current_stage,created_at,updated_at,position:master_result->position,drafts:master_result->drafts,otherParty:master_result->intakeData->otherParty",
      )
      .order("updated_at", { ascending: false });
    if (loadError) {
      setError("Your cases could not be loaded. Please refresh the page.");
      setCases([]);
    } else {
      type Row = Omit<CaseRecord, "master_result"> & { position?: unknown; drafts?: unknown; otherParty?: unknown };
      const records = ((data || []) as unknown as Row[]).map(({ position, drafts, otherParty, ...row }) => ({
        ...row,
        master_result: {
          ...(position !== null && position !== undefined ? { position } : {}),
          ...(drafts !== null && drafts !== undefined ? { drafts } : {}),
          ...(otherParty !== null && otherParty !== undefined ? { intakeData: { otherParty } } : {}),
        },
      })) as CaseRecord[];
      setCases(records);
      // After the cards show, not before: a slow count never holds up the page.
      void loadReminders(records).then(setReminders);
    }
    setLoading(false);
  }

  async function logout() {
    // Everything, not a hand-kept list: the registry drives it. AuthStorageGuard
    // also clears on SIGNED_OUT; clearing first means nothing survives even if
    // the sign-out request fails.
    resetIntakeInBrowser();
    await supabase.auth.signOut();
    router.push("/login");
  }

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-[#4f685f]" aria-live="polite">
        Loading your cases…
      </main>
    );
  }

  const [latest, ...others] = cases;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 text-[#16302b] sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#10231f]">My cases</h1>
          {email ? <p className="mt-1 text-sm text-[#4f685f]">Signed in as {email}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-full border border-[#d8e6df] bg-white px-4 py-2 text-sm font-semibold text-[#24463d]"
        >
          Log out
        </button>
      </header>

      {error ? (
        <p role="alert" className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          {error}
        </p>
      ) : null}

      {latest ? (
        <section aria-labelledby="latest-heading" className="mt-8">
          <h2 id="latest-heading" className="text-lg font-bold text-[#10231f]">
            Pick up where you left off
          </h2>
          <div className="mt-3">
            <CaseCard record={latest} highlighted reminder={reminders[latest.id]} />
          </div>
        </section>
      ) : (
        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6">
          <h2 className="text-xl font-bold text-[#10231f]">You have no cases yet</h2>
          <p className="mt-2 text-sm text-[#4f685f]">
            Start with the court your matter is in. If you are not sure, the home page can help you find it.
          </p>
        </section>
      )}

      {others.length ? (
        <section aria-labelledby="all-heading" className="mt-8">
          <h2 id="all-heading" className="text-lg font-bold text-[#10231f]">
            Your other cases
          </h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {others.map((record) => (
              <CaseCard key={record.id} record={record} reminder={reminders[record.id]} />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="start-heading" className="mt-10">
        <h2 id="start-heading" className="text-lg font-bold text-[#10231f]">
          Start a new case
        </h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {START_OPTIONS.map((option) => (
            <Link
              key={option.path}
              href={`/?path=${option.path}`}
              className="rounded-3xl border border-[#d8e6df] bg-white p-5 transition hover:border-[#2f7d67]"
            >
              <p className="font-bold text-[#10231f]">{option.title}</p>
              <p className="mt-1 text-sm text-[#4f685f]">{option.description}</p>
            </Link>
          ))}
        </div>
        <p className="mt-3 text-sm text-[#4f685f]">
          Not sure which court?{" "}
          <Link href="/" className="font-semibold text-[#2f7d67] underline">
            Find your court
          </Link>
        </p>
      </section>
    </main>
  );
}
