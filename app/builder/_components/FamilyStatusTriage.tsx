"use client";

/**
 * The family status-and-routing triage, on screen.
 *
 * WHY IT EXISTS AND WHERE IT SITS. `family/statusTriage.ts` was built, sourced,
 * verified and mutation-covered — and it had no screen. Its only importer was
 * its own verification suite, so the suite passed while no user could reach a
 * question of it. This is that screen; the module is unchanged.
 *
 * It sits ABOVE FamilyIntake and does not block it. The routing question does
 * come before the claim question in family law — that is the module's whole
 * premise — but the module RECORDS FACTS and gates nothing downstream, so
 * putting a multi-step form in front of a user who wants to look around would
 * be a cost with no matching benefit. A visible prompt, answerable or
 * dismissable, and the intake stays open the whole time.
 *
 * WHAT THIS COMPONENT MUST NOT DO. Four things, enumerated in the module as
 * TRIAGE_NON_CONCLUSIONS and asserted by verifyStatusTriage:
 *
 *   - never state that a statutory definition is satisfied
 *   - never say which court the user must use
 *   - never say a proceeding is or is not available to them
 *   - never compute a duration from their dates
 *
 * The one that bites hardest in UI is the municipality list. All 24 rows render,
 * always. Filtering to the user's own match would feel like good UX and would
 * write "your case goes to the Family Court" into the experience without ever
 * saying it — a conclusion that cannot be argued with because it was never
 * stated. `matchesRecordedAnswer` highlights a row; it never removes the others.
 *
 * DISMISSAL NEVER EXPIRES. Same rule as event candidates: silence is not "no".
 * A user who dismisses this sees it again only if they ask for it.
 */

import { useState } from "react";

import {
  buildTriageOutcome,
  emptyStatusRecord,
  selectNextTriageQuestion,
  type FamilyStatusRecord,
  type TriageQuestion,
} from "../../../src/lib/case-system/family/statusTriage";

export type FamilyTriageState = {
  record: FamilyStatusRecord;
  /** Set when the user puts the triage away. Never cleared by time. */
  dismissed: boolean;
};

export function emptyTriageState(): FamilyTriageState {
  return { record: emptyStatusRecord(), dismissed: false };
}

/** Tolerant of anything previously persisted, including nothing. */
export function triageStateFromStored(value: unknown): FamilyTriageState {
  const empty = emptyTriageState();
  if (!value || typeof value !== "object") return empty;

  const stored = value as Partial<FamilyTriageState>;
  const record =
    stored.record && typeof stored.record === "object"
      ? { ...empty.record, ...stored.record }
      : empty.record;

  return { record, dismissed: stored.dismissed === true };
}

type Props = {
  state: FamilyTriageState;
  onChange: (next: FamilyTriageState) => void;
};

function Citations({ items }: { items: { label: string; sourceUrl: string }[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
      {items.map((citation) => (
        <li key={citation.sourceUrl + citation.label}>
          <a
            className="text-[#2f7d67] underline"
            href={citation.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            {citation.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function FamilyStatusTriage({ state, onChange }: Props) {
  const [showWhy, setShowWhy] = useState(false);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [userMunicipality, setUserMunicipality] = useState("");
  const [otherMunicipality, setOtherMunicipality] = useState("");

  const { record, dismissed } = state;
  const question = selectNextTriageQuestion(record);
  const outcome = buildTriageOutcome(record);

  function update(next: Partial<FamilyStatusRecord>) {
    onChange({ ...state, record: { ...record, ...next } });
    setShowWhy(false);
  }

  if (dismissed) {
    return (
      <section
        data-testid="family-triage-dismissed"
        className="mt-8 rounded-2xl border border-[#d8e6df] bg-white p-4"
      >
        <p className="text-sm text-[#4d675f]">
          A few questions about your situation are set aside. Nothing expires — answering them later
          works the same as answering them now.{" "}
          <button
            type="button"
            onClick={() => onChange({ ...state, dismissed: false })}
            className="font-semibold text-[#2f7d67] underline"
          >
            Bring them back
          </button>
        </p>
      </section>
    );
  }

  /** The answer controls for whichever question is current. */
  function answers(current: TriageQuestion) {
    const chip =
      "rounded-full border border-[#d8e6df] bg-white px-4 py-2 text-sm font-semibold text-[#24463d]";

    if (current.kind === "yes-no" || current.kind === "yes-no-unsure") {
      const values =
        current.kind === "yes-no-unsure"
          ? ["yes", "no", "unsure"]
          : ["yes", "no"];

      return (
        <div className="mt-4 flex flex-wrap gap-3">
          {values.map((value) => (
            <button
              key={value}
              type="button"
              data-testid={`triage-answer-${value}`}
              onClick={() => {
                if (current.id === "married-to-other-party") update({ marriedToOtherParty: value as "yes" | "no" });
                if (current.id === "divorce-sought") update({ divorceSought: value as "yes" | "no" | "unsure" });
                if (current.id === "child-together") update({ haveChildTogether: value as "yes" | "no" });
                if (current.id === "case-involves-children") update({ caseInvolvesChildren: value as "yes" | "no" });
              }}
              className={chip}
            >
              {value === "unsure" ? "I'm not sure" : value === "yes" ? "Yes" : "No"}
            </button>
          ))}
          {/*
            The third state is REQUIRED, not a convenience. RecordedState is
            provided | not-yet | not-asked, and a user who does not know must be
            able to say so rather than guess. "Not yet" is a real recorded
            answer, and nothing treats it as a no.
          */}
          <button
            type="button"
            data-testid="triage-answer-not-yet"
            onClick={() => {
              if (current.id === "married-to-other-party") update({ marriedToOtherParty: "not-yet" });
              if (current.id === "divorce-sought") update({ divorceSought: "not-yet" });
              if (current.id === "child-together") update({ haveChildTogether: "not-yet" });
              if (current.id === "case-involves-children") update({ caseInvolvesChildren: "not-yet" });
            }}
            className={chip}
          >
            I&apos;d rather not answer yet
          </button>
        </div>
      );
    }

    if (current.kind === "date-range") {
      return (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-semibold text-[#10231f]">Started</span>
              <input
                type="date"
                data-testid="triage-cohabitation-start"
                value={dateStart}
                onChange={(event) => setDateStart(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#d8e6df] bg-white p-2"
              />
            </label>
            <label className="text-sm">
              <span className="font-semibold text-[#10231f]">Ended, if it has</span>
              <input
                type="date"
                data-testid="triage-cohabitation-end"
                value={dateEnd}
                onChange={(event) => setDateEnd(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#d8e6df] bg-white p-2"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              data-testid="triage-dates-record"
              disabled={!dateStart}
              onClick={() => update({ cohabitationStart: dateStart, cohabitationEnd: dateEnd || null })}
              className="rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              Record these dates
            </button>
            <button
              type="button"
              data-testid="triage-answer-not-yet"
              onClick={() => update({ cohabitationStart: "not-yet", cohabitationEnd: "not-yet" })}
              className={chip}
            >
              I&apos;d rather not answer yet
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-semibold text-[#10231f]">Where you live</span>
            <input
              data-testid="triage-municipality-user"
              value={userMunicipality}
              onChange={(event) => setUserMunicipality(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#d8e6df] bg-white p-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-semibold text-[#10231f]">Where the other person lives</span>
            <input
              data-testid="triage-municipality-other"
              value={otherMunicipality}
              onChange={(event) => setOtherMunicipality(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#d8e6df] bg-white p-2"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            data-testid="triage-municipality-record"
            disabled={!userMunicipality && !otherMunicipality}
            onClick={() =>
              update({
                userMunicipality: userMunicipality || null,
                otherPartyMunicipality: otherMunicipality || null,
              })
            }
            className="rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            Record these
          </button>
          <button
            type="button"
            data-testid="triage-answer-not-yet"
            onClick={() => update({ userMunicipality: "not-yet", otherPartyMunicipality: "not-yet" })}
            className={chip}
          >
            I&apos;d rather not answer yet
          </button>
        </div>
      </div>
    );
  }

  return (
    <section
      data-testid="family-status-triage"
      data-complete={outcome.complete ? "true" : "false"}
      className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-xl font-bold text-[#10231f]">A few questions about your situation</h2>
        <button
          type="button"
          data-testid="triage-dismiss"
          onClick={() => onChange({ ...state, dismissed: true })}
          className="text-sm font-semibold text-[#2f7d67] underline"
        >
          Set these aside
        </button>
      </div>

      <p className="mt-2 text-sm leading-6 text-[#4f685f]">
        Ontario&apos;s family statutes cover different situations in different ways. Recording these
        facts means you are shown the rules that are about your situation rather than all of them.
        Nothing here decides anything about your case, and you can answer later.
      </p>

      {question ? (
        <div className="mt-6 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
          <p data-testid="triage-prompt" className="font-semibold text-[#10231f]">
            {question.prompt}
          </p>
          <button
            type="button"
            onClick={() => setShowWhy((current) => !current)}
            className="mt-2 text-sm font-semibold text-[#2f7d67] underline"
          >
            {showWhy ? "Hide why this is asked" : "Why is this asked?"}
          </button>
          {showWhy ? <p className="mt-2 text-sm text-[#4f685f]">{question.whyAsked}</p> : null}
          {answers(question)}
        </div>
      ) : (
        <p data-testid="triage-all-answered" className="mt-6 font-semibold text-[#24463d]">
          That is everything asked here.
        </p>
      )}

      {/* What the user has said, read back verbatim. Never a derived value. */}
      {outcome.recorded.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[#2f7d67]">
            What is recorded
          </h3>
          <ul className="mt-2 space-y-1 text-sm">
            {outcome.recorded.map((item) => (
              <li key={item.label} data-testid="triage-recorded" data-state={item.state}>
                <span className="font-semibold text-[#10231f]">{item.label}:</span> {item.value}
              </li>
            ))}
          </ul>
        </div>
      )}

      {outcome.topics.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[#2f7d67]">
            Topics worth reading about
          </h3>
          <ul className="mt-3 space-y-5">
            {outcome.topics.map((topic) => (
              <li key={topic.id} data-testid="triage-topic">
                <p className="font-semibold text-[#10231f]">{topic.title}</p>
                <p className="mt-1 text-sm">{topic.summary}</p>
                <p className="mt-1 text-sm">{topic.body}</p>
                {topic.surfacedBecause.length > 0 && (
                  <p className="mt-1 text-xs text-[#4f685f]">
                    Shown because: {topic.surfacedBecause.join("; ")}.
                  </p>
                )}
                <Citations items={topic.citations} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {outcome.courtInformation.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[#2f7d67]">
            What the statutes say about which court
          </h3>
          <ul className="mt-3 space-y-4">
            {outcome.courtInformation.map((statement) => (
              <li key={statement.text} data-testid="triage-court-information">
                <p className="text-sm">{statement.text}</p>
                <Citations items={statement.citations} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/*
        All 24 rows, always. See the header note: filtering to the user's own
        match would state a conclusion by omission.
      */}
      <div className="mt-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-[#2f7d67]">
          Municipalities named in the Courts of Justice Act
        </h3>
        <ul
          data-testid="triage-municipality-list"
          data-row-count={outcome.municipalities.length}
          className="mt-3 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2"
        >
          {outcome.municipalities.map((row) => (
            <li
              key={row.name}
              data-testid="triage-municipality-row"
              data-matches={row.matchesRecordedAnswer ? "true" : "false"}
              className={row.matchesRecordedAnswer ? "font-semibold text-[#10231f]" : "text-[#4f685f]"}
            >
              {row.name}
              {row.matchesRecordedAnswer ? " — matches what you recorded" : ""}
            </li>
          ))}
        </ul>
        <Citations items={[outcome.municipalitiesCitation]} />
      </div>
    </section>
  );
}
