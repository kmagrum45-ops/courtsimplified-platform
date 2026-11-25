/**
 * THE JOURNEY MATRIX'S ELEVEN CHECKS, AS PURE FUNCTIONS OVER ONE JOURNEY'S RECORD (site owner, Round 6, 25 Nov 2026).
 *
 * A journey (one story, one court and side, one way of signing in) is driven by journey-matrix.spec.ts; the ask-once
 * recorder (harness/askOnce.ts) logs every question, offer and box with its fact, screen and time, and the spec adds
 * what the recorder cannot see (each screen's way forward, what survived signing up, the not-sure and removed labels
 * after a reload, Form 7A's fill values). These functions turn that record into failures, each naming the journey, the
 * check, the screen, the fact and the words, so the report is one table and every row says what went wrong where.
 *
 * Pure (no page, no network): verifyMatrixChecks.ts (npm run test:matrix-checks) runs each check on planted records,
 * one that must fail and one that must pass, so a check that can never fail is caught in CI.
 *
 *   1 held         a question whose fact the record already held
 *   2 twice        a question asked again after the person gave it
 *   3 applies      a question that does not apply to this side and stage (APPLICABILITY, below)
 *   4 logged       a visible box or question neither logged nor on the recorder's exempt list
 *   5 one-place    a fact that can be typed in more than one place across the journey
 *   6 offered      a fact the story gives that is not offered from the story exactly once (or is asked cold)
 *   7 carried      something given before signing up that is gone after
 *   8 persists     "not sure" or "removed" not kept after a reload, or removed worded as not sure
 *   9 same         a guest who signs up and a signed-in person with the same story are asked different things
 *  10 forward      a screen with no box, no question and no way forward, or a journey that never reaches its end
 *  11 form7a       Form 7A's fill values missing or contradicting a fact the record holds (Small Claims claims)
 */
import type { Asked } from "../harness/askOnce";

export type Court = "small-claims" | "civil" | "family";
export type Side = "plaintiff" | "defendant" | "applicant" | "respondent";
export type Mode = "signed-in" | "guest-then-signup";
export type CheckId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const CHECK_NAMES: Record<CheckId, string> = {
  1: "asked while held",
  2: "asked twice",
  3: "does not apply",
  4: "not logged",
  5: "typed in two places",
  6: "story fact not offered once",
  7: "lost at sign-up",
  8: "not sure / removed not kept",
  9: "guest and signed in differ",
  10: "dead end",
  11: "Form 7A value",
};

/** A story of the matrix: who, where they start, and what the story itself gives (each a fact id and its value). */
export type MatrixStory = {
  id: string;
  court: Court;
  side: Side;
  /** The stage map's starting point this story starts from (stageSequence.ts STARTING_POINTS), or "chrome" for Chrome's own. */
  startingPoint: string;
  text: string;
  city: string;
  /** Facts the story states, each to be offered once from the story: fact id -> the value in the story's own words. */
  facts: Record<string, string>;
  /** Every name in the story (people and businesses), never to reach the AI as typed. */
  names: string[];
  /** Nothing has been filed with a court yet (the start says so). */
  nothingFiled: boolean;
};

/** One screen as the spec found it after each step. */
/** `at`: when it was seen (ms); a screen seen after the journey ended (the matrix's own reads: probesFrom) is not the person's. */
export type ScreenState = { screen: string; file?: string; box: boolean; question: boolean; forward: boolean; working: boolean; idleWords: boolean; at?: number };

export type JourneyRecord = {
  journey: string;
  story: MatrixStory;
  mode: Mode;
  events: Asked[];
  /** Facts the recorder already found asked while held / twice (askOnce.ts heldViolations, factsAskedTwice), as failures. */
  held: { fact: string; screen: string; text: string }[];
  twice: { fact: string; screen: string; text: string }[];
  /** Boxes the recorder saw and could not log (askOnce.ts blindBoxes). */
  blind: string[];
  screens: ScreenState[];
  ended: boolean;
  /** When the matrix began its own reads after the journey (review entries, the reload probe, Form 7A). */
  probesFrom?: number;
  /** Before signing up -> after (guest-then-signup only): fact -> value. */
  carried?: { before: Record<string, string>; after: Record<string, string> };
  /** After a reload: the words shown where "not sure" was chosen, and where a value was removed. */
  persisted?: { notSure?: { fact: string; shown: string; askedAgain: boolean }; removed?: { fact: string; shown: string; askedAgain: boolean }; notMeasured?: string };
  /** The review's "Not filled in yet" items. */
  notFilled: string[];
  /** Every field the review shows, answered or not (a field that does not apply must not be shown at all: check 3). */
  shown?: Asked[];
  /** Form 7A's fill values (the fill function's fields) and the record's facts it should hold. */
  form7a?: { fields: Record<string, string>; record: Record<string, string> };
};

export type Failure = { journey: string; check: CheckId; screen: string; file: string; fact: string; text: string };

/** Which surface a recorder event is in: the file that renders it, for the per-file counts. */
export const SURFACE_FILES: Record<string, string> = {
  situation: "app/_components/SituationQuestions.tsx",
  "home-location": "app/_components/HomeLocationGate.tsx",
  "home-reading": "app/_components/HomeLocationGate.tsx",
  // The recorder's own surface names (harness/askOnce.ts SURFACES).
  chat: "app/builder/_components/GuidedFormChat.tsx",
  "chat-story": "app/builder/_components/GuidedFormChat.tsx",
  "sc-chat": "app/builder/_components/GuidedSmallClaimsIntake.tsx",
  "sc-claim-kind": "app/builder/_components/GuidedSmallClaimsIntake.tsx",
  "sc-form": "app/builder/_components/SmallClaimsIntake.tsx",
  "sc-form-offer": "app/builder/_components/SmallClaimsIntake.tsx",
  date: "app/builder/_components/StageAnswerPanel.tsx",
  "event-candidate": "app/builder/_components/EventCandidateSurface.tsx",
  end: "app/cases/_components/CaseFilePanel.tsx",
  story: "app/builder/_components/GuidedSmallClaimsIntake.tsx",
  "home-story": "app/_components/HomeLocationGate.tsx",
  "sc-guided": "app/builder/_components/GuidedSmallClaimsIntake.tsx",
  "sc-proposal": "app/builder/_components/GuidedSmallClaimsIntake.tsx",
  "story-proposal-row": "app/builder/_components/GuidedSmallClaimsIntake.tsx",
  "story-box": "app/builder/_components/GuidedSmallClaimsIntake.tsx",
  review: "app/_components/IntakeReviewPanel.tsx",
  "review-entry": "app/_components/IntakeReviewPanel.tsx",
  triage: "app/builder/_components/FamilyStatusTriage.tsx",
  stage: "app/builder/_components/StageConfirmation.tsx",
  "claim-kind": "app/builder/_components/GuidedSmallClaimsIntake.tsx",
  "stage-date": "app/builder/_components/StageAnswerPanel.tsx",
  "service-method": "app/builder/_components/StageAnswerPanel.tsx",
  "form-field": "app/builder/_components/SmallClaimsIntake.tsx",
  "parties-offer": "app/_components/PartiesStep.tsx",
  parties: "app/_components/PartiesStep.tsx",
  "chat-reply": "app/builder/_components/CourtAssistantChat.tsx",
  law: "app/builder/_components/StageAnswerPanel.tsx",
  forms: "app/forms/page.tsx",
  "forms-offer": "app/forms/page.tsx",
};
/** The component a screen (its address) is drawn by, for a row that has no surface (check 10). */
export function screenFile(screen: string, court: Court): string {
  if (/step=guided/.test(screen)) return court === "small-claims" ? "app/builder/_components/GuidedSmallClaimsIntake.tsx" : "app/builder/_components/GuidedFormChat.tsx";
  if (/step=review|change=/.test(screen)) return "app/_components/IntakeReviewPanel.tsx";
  if (screen.startsWith("/builder")) return "app/builder/page.tsx";
  if (screen.startsWith("/cases/")) return "app/cases/[id]/page.tsx";
  if (screen === "/" || screen.startsWith("/?")) return "app/_components/HomeLocationGate.tsx";
  return `(screen ${screen})`;
}
/** Where a fact the story gives is offered from: the one home of story offers. */
export const OFFERS_HOME = "src/lib/case-system/caseFile/storyOffers.ts";
export const fileOf = (surface: string) => SURFACE_FILES[surface] ?? SURFACE_FILES[surface.replace(/-.*$/, "")] ?? `(surface ${surface})`;

/** The surfaces that offer a value from the story for one confirmation (harness/questionLog.ts OFFER_SURFACES). */
export const OFFER_SURFACES = new Set(["sc-proposal", "story-proposal-row", "chat-story", "claim-kind", "sc-claim-kind", "parties-offer", "forms-offer", "form7a-found", "sc-form-offer"]);

/**
 * CHECK 3's RULES: where a fact applies, from the owner's own examples (Chrome test of #563, 25 Nov 2026). Each has its
 * reason. Test-side and deliberately short: PR 2's fact registry (each fact's court, side and stage from the stage map)
 * replaces this table, and this check then reads the registry.
 */
export type Context = { court: Court; side: Side; nothingFiled: boolean };
const responding = (c: Context) => c.side === "defendant" || c.side === "respondent";
export const APPLICABILITY: { fact: string; applies: (c: Context) => boolean; why: string }[] = [
  { fact: "responseFacts", applies: responding, why: "a defence response is for the person responding to someone else's claim (Chrome: \"Defence response\" shown to someone suing)" },
  { fact: "defenceFiled", applies: responding, why: "whether a defence was filed is the responding side's question" },
  { fact: "defendantsClaim", applies: responding, why: "a claim of the defendant's own is asked of the defendant" },
  { fact: "servedDate", applies: responding, why: "the day they were served is asked of the person served" },
  { fact: "claimServed", applies: (c) => !c.nothingFiled, why: "a claim cannot have been served when nothing was filed (Chrome: \"Claim served\" on a case where nothing was filed)" },
  { fact: "claimIssuedDate", applies: (c) => !c.nothingFiled || responding(c), why: "a claim issued date exists only once a claim was filed" },
  { fact: "courtFileNumber", applies: (c) => !c.nothingFiled || responding(c), why: "a court file number exists only once something was filed" },
  { fact: "filed", applies: (c) => !(c.nothingFiled && !responding(c)), why: "\"Has anything been filed\" after the person said they want to start a case and nothing is filed (Chrome, 25 Nov)" },
];

const fail = (r: JourneyRecord, check: CheckId, screen: string, file: string, fact: string, text: string): Failure => ({ journey: r.journey, check, screen, file, fact, text: text.replace(/\s+/g, " ").trim().slice(0, 240) });

export function check1Held(r: JourneyRecord): Failure[] {
  return r.held.map((item) => fail(r, 1, item.screen, fileOf(item.screen.split("@")[0]), item.fact, item.text));
}

export function check2Twice(r: JourneyRecord): Failure[] {
  return r.twice.map((item) => fail(r, 2, item.screen, fileOf(item.screen.split("@")[0]), item.fact, item.text));
}

export function check3Applies(r: JourneyRecord, factsOfEvent: (event: Asked) => string[]): Failure[] {
  const context: Context = { court: r.story.court, side: r.story.side, nothingFiled: r.story.nothingFiled };
  const out: Failure[] = [];
  for (const event of [...r.events, ...(r.shown ?? [])]) {
    if (event.kind !== "ask") continue;
    for (const fact of factsOfEvent(event)) {
      const rule = APPLICABILITY.find((item) => item.fact === fact);
      if (rule && !rule.applies(context)) out.push(fail(r, 3, event.screen, fileOf(event.surface), fact, `${event.text} -- ${rule.why}`));
    }
  }
  return dedupe(out);
}

export function check4Logged(r: JourneyRecord): Failure[] {
  // The sign-in page's email and password are the account, not a question about the case.
  return r.blind.filter((box) => !box.includes("@ /login")).map((box) => fail(r, 4, box.split(" | ")[0] ?? box, "(not logged)", "", box));
}

/** A place to type: an ask event on a box-bearing surface (not an offer, which shows above its own box). */
export function check5OnePlace(r: JourneyRecord, factsOfEvent: (event: Asked) => string[]): Failure[] {
  const places = new Map<string, Map<string, Asked>>();
  for (const event of r.events) {
    if (event.kind !== "ask" || OFFER_SURFACES.has(event.surface)) continue;
    for (const fact of factsOfEvent(event)) {
      if (!places.has(fact)) places.set(fact, new Map());
      const place = fileOf(event.surface);
      if (!places.get(fact)!.has(place)) places.get(fact)!.set(place, event);
    }
  }
  const out: Failure[] = [];
  for (const [fact, where] of places) if (where.size > 1) {
    const list = [...where.entries()];
    out.push(fail(r, 5, list[1][1].screen, list[1][0], fact, `typed in ${where.size} places: ${list.map(([file, event]) => `${file} ("${event.text.slice(0, 60)}")`).join("; ")}`));
  }
  return out;
}

/** Every fact the story gives is offered once from the story, and never asked cold. */
export function check6Offered(r: JourneyRecord, factsOfEvent: (event: Asked) => string[]): Failure[] {
  const out: Failure[] = [];
  for (const fact of Object.keys(r.story.facts)) {
    const offers = r.events.filter((event) => OFFER_SURFACES.has(event.surface) && event.kind === "ask" && factsOfEvent(event).includes(fact));
    const cold = r.events.filter((event) => event.kind === "ask" && !OFFER_SURFACES.has(event.surface) && factsOfEvent(event).includes(fact));
    if (offers.length === 0) {
      const first = cold[0];
      out.push(fail(r, 6, first?.screen ?? "(whole journey)", first ? fileOf(first.surface) : OFFERS_HOME, fact, first ? `asked cold, never offered from the story: ${first.text}` : `the story gives "${r.story.facts[fact]}" and it was never offered`));
    } else if (offers.length > 1) {
      out.push(fail(r, 6, offers[1].screen, fileOf(offers[1].surface), fact, `offered ${offers.length} times: ${offers.map((o) => o.screen).join(", ")}`));
    }
  }
  return out;
}

export function check7Carried(r: JourneyRecord): Failure[] {
  if (r.mode !== "guest-then-signup" || !r.carried) return [];
  return Object.entries(r.carried.before)
    .filter(([fact, value]) => (r.carried!.after[fact] ?? "").trim() !== value.trim())
    .map(([fact, value]) => fail(r, 7, "after signing up", "(the case after sign-up)", fact, `given before signing up as "${value}", after: "${r.carried!.after[fact] ?? "(gone)"}"`));
}

export const NOT_SURE_WORDS = /not sure yet/i;
export const REMOVED_WORDS = /\bremoved\b/i;
export function check8Persists(r: JourneyRecord): Failure[] {
  const out: Failure[] = [];
  const p = r.persisted;
  if (!p) return out;
  if (p.notSure) {
    if (p.notSure.askedAgain) out.push(fail(r, 8, "after reload", "", p.notSure.fact, "\"not sure\" was asked again after a reload"));
    if (!NOT_SURE_WORDS.test(p.notSure.shown)) out.push(fail(r, 8, "after reload", "", p.notSure.fact, `"not sure" shows as "${p.notSure.shown}"`));
  }
  if (p.removed) {
    if (p.removed.askedAgain) out.push(fail(r, 8, "after reload", "", p.removed.fact, "a removed value was asked again after a reload"));
    if (!REMOVED_WORDS.test(p.removed.shown) || NOT_SURE_WORDS.test(p.removed.shown)) out.push(fail(r, 8, "after reload", "", p.removed.fact, `removed shows as "${p.removed.shown}", not as removed`));
  }
  return out;
}

/** The same story, signed in and guest-then-signup: the same facts asked and the same "Not filled in yet" items. */
/** A recorder fact id, not a question's own words standing in for one ("home-reading:Is anything urgent..."). */
export const hasFactId = (fact: string) => Boolean(fact) && !fact.includes(":");

export function check9Same(a: JourneyRecord, b: JourneyRecord, factsOfEvent: (event: Asked) => string[]): Failure[] {
  // Only questions that name a real fact: a question with no fact id is listed by the report on its own (its words differ
  // from path to path, so comparing them would only compare wording).
  const asked = (r: JourneyRecord) => new Set(r.events.filter((e) => e.kind === "ask").flatMap(factsOfEvent).filter(hasFactId));
  const [x, y] = [asked(a), asked(b)];
  const out: Failure[] = [];
  const onlyIn = (s: Set<string>, t: Set<string>) => [...s].filter((f) => !t.has(f)).sort();
  // The file where the one journey asked it.
  const where = (r: JourneyRecord, fact: string) => { const e = r.events.find((item) => item.kind === "ask" && factsOfEvent(item).includes(fact)); return e ? [e.screen, fileOf(e.surface)] as const : ["(whole journey)", ""] as const; };
  for (const fact of onlyIn(x, y)) out.push(fail(b, 9, ...where(a, fact), fact, `asked ${a.mode}, not ${b.mode}`));
  for (const fact of onlyIn(y, x)) out.push(fail(b, 9, ...where(b, fact), fact, `asked ${b.mode}, not ${a.mode}`));
  const nf = (r: JourneyRecord) => new Set(r.notFilled);
  for (const item of onlyIn(nf(a), nf(b))) out.push(fail(b, 9, "review", "app/_components/IntakeReviewPanel.tsx", item, `"Not filled in yet" ${a.mode}, missing ${b.mode}`));
  for (const item of onlyIn(nf(b), nf(a))) out.push(fail(b, 9, "review", "app/_components/IntakeReviewPanel.tsx", item, `"Not filled in yet" ${b.mode}, missing ${a.mode}`));
  return out;
}

/** The pages only the matrix's own reads open (records written before `at` and probesFrom were kept). */
const PROBE_PAGES = /[?&](change=amount|step=form)/;
export function check10Forward(r: JourneyRecord): Failure[] {
  const out: Failure[] = [];
  // The person's own journey only: not the pages the matrix opens afterwards to read the review and probe the Parties step.
  const own = r.screens.filter((s) => (r.probesFrom && s.at ? s.at < r.probesFrom : !PROBE_PAGES.test(s.screen)));
  for (const s of own) {
    const file = s.file && !s.file.startsWith("(surface") ? s.file : screenFile(s.screen, r.story.court);
    if (s.idleWords && !s.working) out.push(fail(r, 10, s.screen, file, "", "shows an idle \"Send your story below\" while the story is being read, with no question and no working sign"));
    else if (!s.box && !s.question && !s.forward && !s.working) out.push(fail(r, 10, s.screen, file, "", "no box, no question and no way forward"));
  }
  if (!r.ended) out.push(fail(r, 10, r.screens.at(-1)?.screen ?? "(start)", r.screens.at(-1) ? screenFile(r.screens.at(-1)!.screen, r.story.court) : "", "", "the journey did not reach its end"));
  return out;
}

/** Form 7A's fields that carry each fact (the fill function's names), checked when the record holds the fact. */
export const FORM7A_FACTS: { fact: string; field: RegExp; label: string }[] = [
  { fact: "otherParty", field: /defendant.*(last name|company)|defendant.*name/i, label: "Defendant's name" },
  { fact: "amount", field: /principal|amount claimed|claim amount/i, label: "Amount claimed" },
  { fact: "courtLocation", field: /court (office|location)|small claims court$/i, label: "Small Claims Court office" },
];
const digits = (value: string) => value.replace(/[^\d.]/g, "").replace(/\.0+$/, "");
export function check11Form7A(r: JourneyRecord): Failure[] {
  if (!r.form7a) return [];
  const out: Failure[] = [];
  for (const { fact, field, label } of FORM7A_FACTS) {
    const held = r.form7a.record[fact];
    if (!held) continue;
    const entry = Object.entries(r.form7a.fields).find(([name]) => field.test(name));
    const value = entry?.[1] ?? "";
    const same = fact === "amount" ? digits(value) === digits(held) : value.toLowerCase().includes(held.toLowerCase().split(/\s+/).slice(-1)[0] ?? "");
    if (!value.trim()) out.push(fail(r, 11, "Form 7A", "src/lib/case-system/forms", fact, `${label} is blank; the record holds "${held}"`));
    else if (!same) out.push(fail(r, 11, "Form 7A", "src/lib/case-system/forms", fact, `${label} is "${value}"; the record holds "${held}"`));
  }
  return out;
}

function dedupe(list: Failure[]): Failure[] {
  const seen = new Set<string>();
  return list.filter((f) => { const k = `${f.check}|${f.fact}|${f.screen}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** Every check of one journey (9 needs the pair and runs separately). */
export function journeyFailures(r: JourneyRecord, factsOfEvent: (event: Asked) => string[]): Failure[] {
  return [
    ...check1Held(r), ...check2Twice(r), ...check3Applies(r, factsOfEvent), ...check4Logged(r), ...check5OnePlace(r, factsOfEvent),
    ...check6Offered(r, factsOfEvent), ...check7Carried(r), ...check8Persists(r), ...check10Forward(r), ...check11Form7A(r),
  ];
}

/** The report's counts: per check and per file. */
export function counts(failures: readonly Failure[]): { perCheck: Record<string, number>; perFile: Record<string, number> } {
  const perCheck: Record<string, number> = {};
  const perFile: Record<string, number> = {};
  for (const f of failures) {
    const name = `${f.check} ${CHECK_NAMES[f.check]}`;
    perCheck[name] = (perCheck[name] ?? 0) + 1;
    perFile[f.file || "(none)"] = (perFile[f.file || "(none)"] ?? 0) + 1;
  }
  return { perCheck, perFile };
}

/** The table, one row per failure: journey / screen / file / fact / text / check. */
export function table(failures: readonly Failure[]): string {
  const rows = failures.map((f) => `| ${f.journey} | ${f.screen} | ${f.file} | ${f.fact || "(none)"} | ${f.text.replace(/\|/g, "/")} | ${f.check} ${CHECK_NAMES[f.check]} |`);
  return ["| Journey | Screen | File | Fact | Text | Check |", "|---|---|---|---|---|---|", ...rows].join("\n");
}
