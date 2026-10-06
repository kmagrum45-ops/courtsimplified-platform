/**
 * The user's own story, for showing back to them.
 *
 * WHY THIS EXISTS (page review, 2026-10-06). The civil, family and Small
 * Claims form intakes save `facts` as a labelled record built for the
 * analysis engine ("Court path: Civil / User role: defendant / Selected issue
 * signals: ... / Main story: ..."). Three pages showed that record to the user
 * as "What you told us" and "What happened, in your words", and the Timeline
 * offered "Small Claims Ontario intake Stage selected: ... User name: not
 * entered ..." as a sentence "from what you wrote". Every page that shows the
 * user their words reads them through here instead.
 *
 * The record itself is left alone: the engines downstream read it.
 */

/** The labels the intakes' records use for the story itself. */
const STORY_LABELS = ["Main story", "Case story", "Facts"];

/**
 * Every label the three intake records write (CivilIntake buildCivilNarrative,
 * FamilyIntake buildNarrative, smallClaimsIntelligenceEngine buildRawUserText).
 */
const RECORD_LABELS = [
  "Court path",
  "Stage",
  "Stage selected",
  "User / party name",
  "Your full legal name",
  "Other party",
  "User role",
  "User name",
  "Court or tribunal location",
  "Court location",
  "File number",
  "Claim number",
  "Amount claimed or disputed",
  "Limitation or deadline concern",
  "Selected issue signals",
  "Selected issue hints",
  "Existing document signals",
  "Existing family documents",
  "Family issue signals selected by user",
  "Filed or received documents",
  "Children and parenting details",
  "Current living situation",
  "Past caregiving and living history",
  "Damages breakdown",
  "Damages / impact",
  "Agreement details",
  "Payment history",
  "Service details",
  "Deadline details",
  "Timeline",
  "Known evidence",
  "Evidence described",
  "Missing evidence",
  "Evidence still missing",
  "Settlement efforts",
  "Defence response",
  "Requested remedy",
  "Requested court order / outcome",
  "Goal / requested outcome",
  "Urgent concerns",
  "Urgent or deadline-related concerns",
  "Safety concerns",
  "Property, home, support, or financial disclosure details",
  "Upcoming court date or deadline",
  "Adoption details",
  "Human Rights ground",
  "Discrimination facts",
  "Accommodation requests",
  "Government / public actor",
  "Public decision or conduct",
  "Institutional / professional facts",
  "Privacy / records facts",
  "Uploaded evidence files",
  "Uploaded evidence metadata",
  "Evidence file",
  ...STORY_LABELS,
];

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

const ANY_LABEL = new RegExp(`(?:^|\\s)(?:${RECORD_LABELS.map(escape).join("|")}):(?=\\s|$)`, "g");
const STORY_LABEL = new RegExp(`(?:^|\\s)(?:${STORY_LABELS.map(escape).join("|")}):\\s*`);
const RECORD_START = /^\s*(?:Court path:|Small Claims Ontario intake\b)/;

/** True when the text is an intake record rather than the user's own words. */
export function isIntakeRecord(text: string): boolean {
  return RECORD_START.test(text);
}

/**
 * The story out of an intake record: the text after its story label, up to
 * the next label. Text that is not a record comes back unchanged.
 */
export function storyFromRecord(text: string): string {
  if (!isIntakeRecord(text)) return text.trim();
  return afterStoryLabel(text);
}

function afterStoryLabel(text: string): string {
  const start = text.match(STORY_LABEL);
  if (!start || start.index === undefined) return "";
  const rest = text.slice(start.index + start[0].length);
  ANY_LABEL.lastIndex = 0;
  const next = ANY_LABEL.exec(rest);
  return (next ? rest.slice(0, next.index) : rest).trim();
}

/**
 * A sentence offered back to the user (the Timeline's "sentences from what
 * you wrote"), cleaned of record labels. Returns "" when nothing of the
 * user's own words is left, so the caller drops it.
 */
export function sentenceFromRecord(sentence: string): string {
  const trimmed = sentence.trim();
  ANY_LABEL.lastIndex = 0;
  if (!ANY_LABEL.test(trimmed)) return trimmed;
  return afterStoryLabel(trimmed);
}

type IntakeLike = { facts?: unknown; extra?: unknown } | null | undefined;

/** The user's story from a saved intake, whichever intake wrote it. */
export function userStory(intake: IntakeLike): string {
  if (!intake || typeof intake !== "object") return "";
  const extra = intake.extra && typeof intake.extra === "object" ? (intake.extra as Record<string, unknown>) : {};
  const civilInput = extra.civilInput && typeof extra.civilInput === "object" ? (extra.civilInput as Record<string, unknown>) : null;
  const direct =
    (typeof extra.story === "string" && extra.story) ||
    (civilInput && typeof civilInput.facts === "string" && civilInput.facts) ||
    "";
  if (direct.trim()) return direct.trim();
  return typeof intake.facts === "string" ? storyFromRecord(intake.facts) : "";
}
