/**
 * NAMES THE SITE KNOWS, AS LABELS FOR THE AI (site owner, 2026-10-25).
 *
 * Before anything goes to a model, every name the site knows for this case -- the person's
 * own, the other party's, the children's, a name the story readers picked out as the other
 * party -- is replaced with a label such as "[the other party]" or "[child 1]". The real
 * names are put back in what the model returns, so the person reads their own names.
 *
 * Labels are in square brackets so putting the names back is exact: "the other party" in
 * ordinary prose is never touched, only "[the other party]". A name is matched whole and by
 * each of its parts ("Ottoline Brackenbury", "Ottoline", "Brackenbury"), capitalised, as a
 * word. A name the site does not know (typed in the story and not picked out by a reader)
 * is not found and goes as typed: privacy/modelPayloadNames.ts says so.
 *
 * Forms and drafts never go through here: they are filled from the case file directly and
 * no model is involved.
 *
 * Pure: no React, no network.
 */

export type NameLabel = { name: string; label: string };

const object = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** Capitalised words that are not names: never taken from the children's details. */
const NOT_NAMES = new Set([
  "I", "We", "My", "Our", "He", "She", "They", "His", "Her", "Their", "The", "A", "An", "And", "Or", "But", "With", "Both", "One", "Two", "Three", "Four", "Five",
  "Son", "Daughter", "Child", "Children", "Kids", "Baby", "Boy", "Girl", "Age", "Aged", "Years", "Old", "Lives", "Live", "Living", "School", "Grade",
  "Mom", "Dad", "Mother", "Father", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
  "Ontario", "Canada", "Toronto", "Ottawa", "Mississauga", "Hamilton", "London", "Kingston", "Sudbury", "Not", "Sure", "Yes", "No", "Unknown",
]);

/** The children's names in a free-text line ("Mia (4) and Noah (2), with both of us"). */
export function childNamesIn(line: string): string[] {
  const names: string[] = [];
  for (const match of line.matchAll(/\b[A-Z][a-z]+(?:[-'][A-Z]?[a-z]+)?\b/g)) {
    const word = match[0];
    if (!NOT_NAMES.has(word) && !names.includes(word)) names.push(word);
  }
  return names;
}

/** The parts of a name worth matching: the whole, and each capitalised part of three letters or more. */
function partsOf(name: string): string[] {
  const parts = name.split(/\s+/).filter((part) => /^[A-Z][\p{L}'-]{2,}$/u.test(part) && !NOT_NAMES.has(part));
  return [...new Set([name, ...parts])].filter(Boolean);
}

/**
 * Every name the site knows for a case, each with its label: from the intake (or the saved
 * case's intakeData and its extra), and any the story readers picked out as the other party
 * (passed in by the caller: this module stays free of the readers, so the AI client that
 * imports it carries nothing else).
 */
export function knownNameLabels(source: unknown, storyNames: readonly string[] = []): NameLabel[] {
  const intake = object(source);
  const data = { ...object(intake.intakeData), ...intake };
  const extra = { ...object(object(intake.intakeData).extra), ...object(intake.extra) };
  const labels: NameLabel[] = [];
  const add = (name: string, label: string) => {
    if (name.length < 2 || labels.some((item) => item.name.toLowerCase() === name.toLowerCase())) return;
    labels.push({ name, label });
  };
  for (const name of [data.yourName, extra.yourName].map(text).filter(Boolean)) add(name, "[you]");
  const others = [data.otherParty, data.otherPartyName, extra.otherParty, extra.otherPartyName, extra.defendantName, extra.plaintiffName, extra.respondentName, extra.applicantName].map(text).filter(Boolean);
  for (const said of storyNames) if (/^[A-Z]/.test(said) && !/^(?:The|My|A|An|City)\b/.test(said)) others.push(said);
  others.forEach((name, index) => add(name, index === 0 ? "[the other party]" : `[other party ${index + 1}]`));
  const children = [data.childrenInfo, data.children, extra.childrenInfo].map(text).filter(Boolean).join(" ");
  childNamesIn(children).forEach((name, index) => add(name, `[child ${index + 1}]`));
  return labels;
}

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Text with every known name (and each part of it) replaced by its label. */
export function withNameLabels(input: string, labels: readonly NameLabel[]): string {
  let out = input;
  // Longest first, so "Ottoline Brackenbury" is replaced before "Ottoline".
  const pairs = labels.flatMap((item) => partsOf(item.name).map((part) => ({ part, label: item.label }))).sort((a, b) => b.part.length - a.part.length);
  for (const { part, label } of pairs) out = out.replace(new RegExp(`(?<![\\p{L}\\d])${escape(part)}(?![\\p{L}\\d])`, "gu"), label);
  return out;
}

/** Text with each label put back as the real name. */
export function withRealNames(input: string, labels: readonly NameLabel[]): string {
  let out = input;
  for (const { name, label } of labels) out = out.split(label).join(name);
  return out;
}

/** The same structure with every string passed through `change` (request bodies, model replies). */
export function mapStrings<T>(value: T, change: (text: string) => string, skipKeys: ReadonlySet<string> = new Set()): T {
  if (typeof value === "string") return change(value) as T;
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, change, skipKeys)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) out[key] = skipKeys.has(key) ? item : mapStrings(item, change, skipKeys);
    return out as T;
  }
  return value;
}
