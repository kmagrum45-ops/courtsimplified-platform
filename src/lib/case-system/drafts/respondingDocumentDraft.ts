/**
 * A working draft of the document a party files to RESPOND to a case: Defence
 * (Small Claims Form 9A), Statement of Defence (civil Form 18A), Answer
 * (family Form 10) -- laid out from the person's own answers.
 *
 * WHY (2026-10-06). The site drafted the document that starts a case and
 * nothing for the other side: a defendant or respondent, who has the shorter
 * clock, was told only that the starting document was "not offered". The
 * form numbers and what each form is for come from the sourced form
 * summaries (src/lib/content-library/forms/formSummaries.json: Small Claims
 * 9A, civil 18A, family 10).
 *
 * Same rules as startingDocumentDraft.ts: every line is the person's own
 * answer or a plain label, "Not entered" marks what they have not given, and
 * nothing here says how the case will go. It is a layout to compare with the
 * official form, which the person completes and files themselves.
 *
 * Offered only to the side responding (callers gate on userIsResponding).
 * Asserted by `npm run test:responding-draft`.
 */

import { newId, type CaseDraft, type DraftSection } from "./caseDrafts";

export type RespondingDocumentIntake = {
  yourName?: string;
  otherParty?: string;
  facts?: string;
  timeline?: string;
  evidence?: string;
  goal?: string;
  extra?: Record<string, unknown>;
};

const RESPONDING_DOCUMENT: Record<string, { title: string; responseHeading: string; side: string; other: string }> = {
  "small-claims": { title: "Draft Defence (Form 9A)", responseHeading: "What you dispute in the claim, and why", side: "Defendant", other: "Plaintiff" },
  civil: { title: "Draft Statement of Defence (Form 18A)", responseHeading: "What you admit, deny, or do not know about the claim", side: "Defendant", other: "Plaintiff" },
  family: { title: "Draft Answer (Form 10)", responseHeading: "What you agree with and disagree with in the application", side: "Respondent", other: "Applicant" },
};

export function respondingDocumentTitle(courtPath: string | null | undefined): string | null {
  return (courtPath && RESPONDING_DOCUMENT[courtPath]?.title) || null;
}

const part = (heading: string, lines: string[]): DraftSection => ({
  id: newId("part"),
  heading,
  text: lines.join("\n\n"),
  reviewed: false,
});

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function respondingDocumentDraft(
  courtPath: string | null | undefined,
  intake: RespondingDocumentIntake,
  now: Date,
): CaseDraft | null {
  const spec = courtPath ? RESPONDING_DOCUMENT[courtPath] : undefined;
  if (!spec) return null;
  const extra = (intake.extra ?? {}) as Record<string, unknown>;
  const response = text(extra.defenceResponse);
  const stamp = now.toISOString();
  return {
    id: newId("draft"),
    title: spec.title,
    kind: "responding-document",
    createdAt: stamp,
    updatedAt: stamp,
    sections: [
      part("Parties", [`${spec.side} (you): ${text(intake.yourName) || "Not entered"}`, `${spec.other}: ${text(intake.otherParty) || "Not entered"}`]),
      part(spec.responseHeading, [response || "Not entered yet. Go through the other side's document paragraph by paragraph and note each point you agree with, disagree with, or do not know about."]),
      part("Your account of what happened", [text(intake.facts) || "Not entered yet."]),
      part("Dates", [text(intake.timeline) || "No dates entered yet."]),
      part("What you are asking the court to do", [text(intake.goal) || "Not entered yet."]),
      part("Evidence to review", [text(intake.evidence) || "No evidence description entered yet."]),
    ],
  };
}
