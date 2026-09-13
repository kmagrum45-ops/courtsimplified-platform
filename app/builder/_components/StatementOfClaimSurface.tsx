"use client";

import { useMemo, useState } from "react";

import {
  evaluateReadinessGate,
  outstandingHeading,
  type OutstandingElement,
} from "@/src/lib/case-system/readiness/readinessGate";
import {
  recordCannotProvide,
  recordDepthAnswer,
  type ElementStateMap,
} from "@/src/lib/case-system/intake/depth/elementStateMap";
import { CLAIM_TYPES } from "@/src/lib/case-system/intake/claimTypes";
import {
  draftStatementOfClaimParticulars,
  type StatementOfClaimDraft,
} from "@/src/lib/case-system/statementOfClaimDraftEngine";
import type { SmallClaimsIntelligenceInput } from "@/src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";

/**
 * The Statement of Claim surface: readiness gate, attestation, party details,
 * and the draft itself.
 *
 * NO API CALL ANYWHERE IN THIS COMPONENT. The gate is a pure function, the
 * drafting engine is deterministic by hard constraint (see its file header),
 * attestation is user clicks, and party details are form fields. This screen
 * adds nothing to a journey's ~27 calls.
 *
 * CLAUDE.md section 4 — suggest, never decide. Nothing here auto-applies.
 * Every element state comes from the user pressing a button, the remedy is
 * chosen by the user from the claim type's own options, and the draft is
 * labelled a proposal by the engine itself, at both top and bottom.
 *
 * CLAUDE.md section 3 — no score, no percentage, no ordinal label on this
 * screen. Counts only ("2 of 3 still to add"), which is a fact about the case
 * file. Session 48 found six score formulas that survived name-based removal
 * passes; this screen authors no seventh, and verifyStatementOfClaimSurface.ts
 * checks the source for one.
 */

export type StatementOfClaimSurfaceProps = {
  /** The claim type the user confirmed. Null means the gate holds at step 1. */
  matchedClaimTypeId: string | null;
  /** Produced by the depth layer. Edited here by attestation; same structure. */
  initialElementStateMap: ElementStateMap;
  /** What the mapper produced from guided intake. */
  mappedInput: SmallClaimsIntelligenceInput;
  /** Persist attestation + party details back to the case file. */
  onStateMapChange?: (map: ElementStateMap) => void;
};

type PartyDetails = {
  yourName: string;
  yourAddress: string;
  otherParty: string;
  defendantAddress: string;
};

export default function StatementOfClaimSurface({
  matchedClaimTypeId,
  initialElementStateMap,
  mappedInput,
  onStateMapChange,
}: StatementOfClaimSurfaceProps) {
  const [stateMap, setStateMap] = useState<ElementStateMap>(initialElementStateMap);
  const [confirmedRemedyId, setConfirmedRemedyId] = useState<string | null>(null);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [party, setParty] = useState<PartyDetails>({
    yourName: "",
    yourAddress: "",
    otherParty: "",
    defendantAddress: "",
  });
  const [showDraft, setShowDraft] = useState(false);

  const claimType = useMemo(
    () => CLAIM_TYPES.find((candidate) => candidate.id === matchedClaimTypeId) || null,
    [matchedClaimTypeId],
  );

  const gate = useMemo(
    () =>
      evaluateReadinessGate({
        claimType,
        elementStateMap: stateMap,
        confirmedRemedyId,
        storyText: mappedInput.facts || "",
      }),
    [claimType, stateMap, confirmedRemedyId, mappedInput.facts],
  );

  /**
   * Party details are merged into the engine's input here rather than being
   * invented by the engine. An empty field stays empty, so the engine emits
   * its own "[... to be confirmed]" placeholder — that is the behaviour the
   * constraint requires, and it is why these are plain optional fields with no
   * defaults and no inference from the story text.
   */
  const draft: StatementOfClaimDraft | null = useMemo(() => {
    if (!gate.draftAvailable || !claimType) return null;

    return draftStatementOfClaimParticulars(
      {
        ...mappedInput,
        yourName: party.yourName,
        yourAddress: party.yourAddress,
        otherParty: party.otherParty,
        defendantAddress: party.defendantAddress,
      },
      { claimTypeId: claimType.id, claimTypeName: claimType.name },
      // cannot-provide elements travel INTO the document, not just this screen.
      gate.cannotProvide.map((item) => ({ elementId: item.elementId, name: item.name })),
    );
  }, [gate, claimType, mappedInput, party]);

  function applyStateMap(next: ElementStateMap) {
    setStateMap(next);
    onStateMapChange?.(next);
  }

  function handleHaveThis(element: OutstandingElement) {
    const text = (answerDrafts[element.elementId] || "").trim();
    if (!text) return;

    applyStateMap(
      recordDepthAnswer(stateMap, {
        elementId: element.elementId,
        questionId: `attestation:${element.elementId}`,
        answerText: text,
      }),
    );
  }

  function handleDontHaveThis(element: OutstandingElement) {
    applyStateMap(
      recordCannotProvide(stateMap, {
        elementId: element.elementId,
        questionId: `attestation:${element.elementId}`,
      }),
    );
  }

  if (!matchedClaimTypeId || !claimType) {
    return (
      <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6">
        <h2 className="text-xl font-bold text-[#10231f]">Statement of Claim</h2>
        <p className="mt-2 text-sm text-[#4d675f]">
          A claim type has not been confirmed for this case yet. Once it is, this section will show
          what a claim of that kind generally involves.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6">
      <h2 className="text-xl font-bold text-[#10231f]">Statement of Claim</h2>
      <p className="mt-2 text-sm text-[#4d675f]">
        Claims like this one — {claimType.name} — generally involve the items below. Recording what
        you have (or don&apos;t have) for each one lets us assemble a draft from your own words.
      </p>

      {/* --- Remedy: seeded from the claim type, confirmed by the user --- */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
          What are you asking the court for?
        </h3>
        <div className="mt-3 space-y-2">
          {gate.remedyOptions.map((remedy) => (
            <label key={remedy.id} className="flex gap-3 rounded-2xl border border-[#d8e6df] p-3">
              <input
                type="radio"
                name="remedy"
                checked={confirmedRemedyId === remedy.id}
                onChange={() => setConfirmedRemedyId(remedy.id)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold text-[#10231f]">{remedy.title}</span>
                <span className="block text-sm text-[#4d675f]">{remedy.plainExplanation}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* --- Attestation for outstanding elements --- */}
      {gate.outstanding.length > 0 ? (
        <div className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
            {/* A COUNT, not a score. No percentage, no progress bar, no grade. */}
            {gate.outstandingCount} of {gate.totalElements} still to add
          </h3>

          <div className="mt-3 space-y-5">
            {gate.outstanding.map((element) => (
              <div key={element.elementId} className="rounded-2xl border border-[#d8e6df] p-4">
                <p className="font-semibold text-[#10231f]">{outstandingHeading(element)}</p>
                <p className="mt-1 text-sm text-[#4d675f]">{element.plainExplanation}</p>

                {element.thingsThatOftenHelp.length > 0 ? (
                  <div className="mt-3 text-sm text-[#4d675f]">
                    <span className="font-semibold">Things that often help:</span>
                    <ul className="mt-1 list-disc pl-5">
                      {element.thingsThatOftenHelp.map((category) => (
                        <li key={category.name}>
                          {category.name} — {category.examples.join(", ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <textarea
                  value={answerDrafts[element.elementId] || ""}
                  onChange={(event) =>
                    setAnswerDrafts((current) => ({
                      ...current,
                      [element.elementId]: event.target.value,
                    }))
                  }
                  placeholder="Describe what you have, in your own words..."
                  className="mt-3 min-h-16 w-full rounded-xl border border-[#d8e6df] px-3 py-2 text-sm"
                />

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleHaveThis(element)}
                    disabled={!(answerDrafts[element.elementId] || "").trim()}
                    className="rounded-xl bg-[#2f7d67] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    I have this
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDontHaveThis(element)}
                    className="rounded-xl border border-[#2f7d67] bg-white px-4 py-2 text-sm font-semibold text-[#2f7d67]"
                  >
                    I don&apos;t have this
                  </button>
                </div>

                {/* Never presented as a lesser answer (readiness design section 4). */}
                <p className="mt-2 text-xs text-[#6b8078]">
                  Saying you don&apos;t have something records a fact about your records. It does not
                  stop you reaching a draft, and it is not a judgment about your case.
                </p>

                <a
                  href={element.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs font-semibold text-[#2f7d67] underline"
                >
                  Read the source for this
                </a>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {gate.cannotProvide.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
          <p className="text-sm font-semibold text-[#10231f]">Recorded as not held</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-[#4d675f]">
            {gate.cannotProvide.map((item) => (
              <li key={item.elementId}>{item.name}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[#6b8078]">
            These appear in the draft too, so what is not recorded is visible in the document.
          </p>
        </div>
      ) : null}

      {/* --- Party details the drafting engine needs --- */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
          Names and addresses
        </h3>
        <p className="mt-1 text-sm text-[#4d675f]">
          Leave anything you don&apos;t have yet blank — the draft will show a placeholder rather
          than guessing.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["yourName", "Your full legal name"],
              ["yourAddress", "Your address"],
              ["otherParty", "The other party's name"],
              ["defendantAddress", "The other party's address"],
            ] as [keyof PartyDetails, string][]
          ).map(([field, label]) => (
            <label key={field} className="block text-sm">
              <span className="font-semibold text-[#10231f]">{label}</span>
              <input
                type="text"
                value={party[field]}
                onChange={(event) =>
                  setParty((current) => ({ ...current, [field]: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-[#d8e6df] px-3 py-2"
              />
            </label>
          ))}
        </div>
      </div>

      {/* --- The gate --- */}
      <div className="mt-8 border-t border-[#d8e6df] pt-6">
        {gate.draftAvailable ? (
          <button
            type="button"
            onClick={() => setShowDraft(true)}
            className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white"
          >
            Assemble the draft
          </button>
        ) : (
          <div className="text-sm text-[#4d675f]">
            <p className="font-semibold text-[#10231f]">Not ready to assemble yet</p>
            <ul className="mt-2 list-disc pl-5">
              {gate.blockers.map((blocker) => (
                <li key={blocker.kind}>{blockerText(blocker.kind, gate.outstandingCount)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {showDraft && draft ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
            Draft for your review
          </h3>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm leading-6 text-[#10231f]">
            {draft.draftText}
          </pre>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Blocker copy. States what is not in the case file, never what the user
 * lacks or cannot prove.
 */
function blockerText(kind: string, outstandingCount: number): string {
  if (kind === "no-remedy-confirmed") return "Choose what you are asking the court for.";
  if (kind === "no-story-entered") return "Your account of what happened has not been entered.";
  if (kind === "elements-not-yet") {
    return `${outstandingCount} item(s) above have nothing recorded either way yet.`;
  }
  return "A claim type has not been confirmed for this case.";
}
