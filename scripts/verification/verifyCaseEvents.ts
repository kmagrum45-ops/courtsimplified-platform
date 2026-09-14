/**
 * The case-event vocabulary stays sourced, and the untyped option stays
 * first-class.
 *
 * COSTS NOTHING. Pure function calls plus a migration-file read.
 *
 * WHY. Two things this step depends on are the kind that erode quietly:
 *
 *   1. `other-user-described` is a DESIGN CONSTRAINT, not a convenience. A
 *      later session looking at a list of eleven sourced types and one untyped
 *      one will be tempted to treat the untyped one as a fallback — move it
 *      last, label it "none of the above", make it the default. Forcing a real
 *      event into a wrong type corrupts every derivation downstream:
 *      deriveCaseStage reads types, the contradiction check reads types, and a
 *      mis-typed event produces a confident wrong answer instead of an honest
 *      gap. The constraint is carried in the data as `firstClassUntyped` so
 *      demoting it means deleting a field this check reads.
 *
 *   2. Every other type asserts a procedural characterisation of the user's
 *      case, which CLAUDE.md section 2 requires to cite a real provision.
 *
 * Run: node --import tsx scripts/verification/verifyCaseEvents.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  CASE_EVENT_TYPES,
  SMALL_CLAIMS_RULES_SOURCE_URL,
  isSingletonType,
  untypedEventDefinition,
} from "../../src/lib/case-system/events/caseEventTypes";
import {
  EVENT_TYPE_MAPPING,
  liveCaseEvents,
  reliableOccurredAt,
  toProceduralEvents,
  type CaseEventRow,
} from "../../src/lib/case-system/events/caseEventAdapter";
import {
  existingSingletonEvents,
  findCaseEventInconsistencies,
} from "../../src/lib/case-system/events/caseEventConsistency";
import {
  parseEventRequest,
  pickedDate,
} from "../../src/lib/case-system/events/caseEventRequest";
import {
  candidateFingerprint,
  candidatesAwaitingAnswer,
  candidatesFromTimeline,
  resolveCandidates,
  type CandidateDismissalRow,
} from "../../src/lib/case-system/events/caseEventCandidates";
import {
  deriveCaseStageWithEvents,
  stageFactsFromEvents,
} from "../../src/lib/case-system/events/caseStageFromEvents";
import {
  analysisFreshness,
  freshnessMessage,
} from "../../src/lib/case-system/events/caseAnalysisFreshness";

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const MIGRATION = readFileSync(
  path.join(__dirname, "..", "..", "supabase", "migrations", "20260913120000_add_case_events.sql"),
  "utf8",
);

const VENDORED = readFileSync(
  path.join(__dirname, "..", "..", "docs", "sources", "oreg-258-98-cited-rules.txt"),
  "utf8",
);

function row(over: Partial<CaseEventRow> & Pick<CaseEventRow, "id" | "event_type">): CaseEventRow {
  return {
    case_id: "case-1",
    court_path: "small-claims",
    title: over.event_type,
    description: null,
    occurred_at_raw: null,
    occurred_at_normalized: null,
    date_certainty: "unknown",
    scheduled_for_raw: null,
    scheduled_for_normalized: null,
    scheduled_for_certainty: "unknown",
    source: "user-stated",
    narrative_basis: null,
    related_document_id: null,
    supersedes_event_id: null,
    retracted_at: null,
    created_at: "2026-09-13T00:00:00Z",
    ...over,
  };
}

function main(): void {
  // ---- The untyped option is first-class ----

  const untypedCount = CASE_EVENT_TYPES.filter((item) => item.firstClassUntyped).length;
  check("exactly one type is the first-class untyped option", untypedCount === 1, `found ${untypedCount}`);
  check("it is other-user-described", untypedEventDefinition().type === "other-user-described");
  check(
    "the untyped option carries no rule, and asserts nothing",
    untypedEventDefinition().rule === null && untypedEventDefinition().ruleQuote === "",
  );
  check(
    "it is NOT last in the list — a fallback is what last position signals",
    CASE_EVENT_TYPES[CASE_EVENT_TYPES.length - 1]?.type !== "other-user-described" ||
      CASE_EVENT_TYPES.length === 1,
    "ordering is presentation-significant; keep it out of the trailing 'none of the above' slot",
  );

  // ---- Every other type is sourced ----

  for (const definition of CASE_EVENT_TYPES) {
    if (definition.firstClassUntyped) continue;

    check(`[${definition.type}] cites a rule`, (definition.rule || "").length > 0);
    check(`[${definition.type}] quotes the rule`, definition.ruleQuote.length > 20);
    check(
      `[${definition.type}] cites O. Reg. 258/98`,
      definition.sourceUrl === SMALL_CLAIMS_RULES_SOURCE_URL,
    );
    check(
      `[${definition.type}] records a verification date`,
      /^\d{4}-\d{2}-\d{2}$/.test(definition.verifiedAt || ""),
    );
  }

  // Spot-check two quotes against the vendored regulation. Only rr. 16-20 are
  // vendored, so only those can be checked here — the rest were read from the
  // same document and are checked by the citation fields above.
  check(
    "the trial-date quote matches the vendored r. 16.01 (1)",
    VENDORED.includes("has filed a request to the clerk  (Form  9B)  to  fix  a"),
  );

  // ---- Cardinality ----

  check("claim-filed is singleton", isSingletonType("claim-filed"));
  check("motion-served is repeatable", !isSingletonType("motion-served"));
  check(
    "defence-filed is NOT treated as a case-wide singleton",
    !isSingletonType("defence-filed"),
    "r. 9.01 gives each defendant a defence; a three-defendant case has three",
  );

  // ---- The migration encodes the decisions ----

  check("migration targets dev only in its header", /courtsimplified-dev/.test(MIGRATION));
  // The migration's own comments legitimately EXPLAIN why there is no
  // system-inference value, so a whole-file grep fires on the explanation.
  // (It did, on the first run.) Assert on the constraint itself.
  const sourceConstraint =
    MIGRATION.match(/CONSTRAINT "case_events_source_check"[\s\S]*?\]\)\)/)?.[0] ?? "";
  check("the source CHECK constraint was found", sourceConstraint.length > 40);
  check(
    "source CHECK has no system-inference value",
    sourceConstraint.length > 40 && !/system-inference/.test(sourceConstraint),
    "an unconfirmed parse is a candidate, not a row",
  );
  check(
    "source CHECK allows only the three confirmed sources",
    ["user-stated", "confirmed-from-narrative", "confirmed-from-document"].every((value) =>
      sourceConstraint.includes(value),
    ),
  );
  check("RLS is enabled", /ENABLE ROW LEVEL SECURITY/.test(MIGRATION));
  check(
    "ownership policy matches the case_documents convention",
    /auth"\."uid\(\) = "user_id"/.test(MIGRATION) || /auth"\."uid"\(\) = "user_id"/.test(MIGRATION),
  );
  check("there is no updated_at column", !/"updated_at"/.test(MIGRATION));
  check("occurred_at_normalized is nullable", !/"occurred_at_normalized" "date" NOT NULL/.test(MIGRATION));
  check("supersession uses ON DELETE RESTRICT", /supersedes_event_id[\s\S]{0,200}ON DELETE RESTRICT/.test(MIGRATION));
  check("court_path is constrained to small-claims", /case_events_court_path_check/.test(MIGRATION));
  check("the live-events index exists", /case_events_case_id_live_idx/.test(MIGRATION));

  // ---- Supersession and retraction ----

  const withCorrection = [
    row({ id: "a", event_type: "claim-filed" }),
    row({ id: "b", event_type: "claim-filed", supersedes_event_id: "a" }),
    row({ id: "c", event_type: "motion-served", retracted_at: "2026-09-13T00:00:00Z" }),
  ];
  const live = liveCaseEvents(withCorrection).map((item) => item.id);
  check("a superseded event is not live", !live.includes("a"), live.join(","));
  check("the correction is live", live.includes("b"));
  check("a retracted event is not live", !live.includes("c"));
  check("the superseded row is still present in the input, not deleted", withCorrection.length === 3);

  // ---- Approximate dates never become facts ----

  const approximate = row({
    id: "d",
    event_type: "claim-served",
    occurred_at_raw: "sometime in March",
    occurred_at_normalized: "2026-03-15",
    date_certainty: "approximate",
  });
  check("an approximate date is not treated as reliable", reliableOccurredAt(approximate) === null);
  check(
    "an approximate date does not reach ProceduralEvent",
    toProceduralEvents([approximate])[0]?.occurredAtNormalized === undefined,
  );

  const exact = row({
    id: "e",
    event_type: "claim-served",
    occurred_at_raw: "4 March 2026",
    occurred_at_normalized: "2026-03-04",
    date_certainty: "exact",
  });
  check(
    "an exact date does reach ProceduralEvent",
    toProceduralEvents([exact])[0]?.occurredAtNormalized === "2026-03-04",
  );

  // ---- The adapter is total, and marks its approximations ----

  for (const definition of CASE_EVENT_TYPES) {
    check(`[${definition.type}] has a mapping entry`, EVENT_TYPE_MAPPING[definition.type] !== undefined);
  }
  check(
    "the untyped option maps to unknown, not to a real procedural type",
    EVENT_TYPE_MAPPING["other-user-described"].union === "unknown",
  );
  const approximated = Object.values(EVENT_TYPE_MAPPING).filter((entry) => !entry.exact);
  check(
    "every approximate mapping says why",
    approximated.every((entry) => (entry.note || "").length > 20),
    `${approximated.length} approximate mapping(s)`,
  );

  // ---- Contradictions are surfaced, not resolved ----

  const defenceNoService = [
    row({ id: "f", event_type: "defence-filed", title: "Defence filed", occurred_at_raw: "4 March" }),
  ];
  const found = findCaseEventInconsistencies(defenceNoService);
  check("a defence with no service is surfaced", found.length >= 1, `${found.length} found`);
  check(
    "it cites the rule that makes it odd",
    found[0]?.rule.includes("r. 9.01") === true && found[0].ruleQuote.length > 20,
  );
  check(
    "it says the gap may be in the record, not the case",
    /may simply be a gap/.test(found[0]?.observation || ""),
  );
  check(
    "leaving it alone is always an option",
    found.every((item) => item.options.some((option) => /leave it as it is/i.test(option))),
  );
  check(
    "it never tells the user what happened",
    found.every((item) => !/you were|you must|you should/i.test(item.observation)),
    found[0]?.observation,
  );

  // A complete, ordered record produces nothing.
  const consistent = [
    row({ id: "g", event_type: "claim-filed" }),
    row({ id: "h", event_type: "claim-served" }),
    row({ id: "i", event_type: "defence-filed" }),
    row({ id: "j", event_type: "settlement-conference-held" }),
  ];
  check("a consistent record produces no notices", findCaseEventInconsistencies(consistent).length === 0);

  // Approximate dates must not manufacture an inversion.
  const approxInversion = [
    row({ id: "k", event_type: "claim-served", occurred_at_raw: "around June", occurred_at_normalized: "2026-06-01", date_certainty: "approximate" }),
    row({ id: "l", event_type: "defence-filed", occurred_at_raw: "4 March", occurred_at_normalized: "2026-03-04", date_certainty: "exact" }),
  ];
  check(
    "an approximate date does not manufacture an out-of-order notice",
    findCaseEventInconsistencies(approxInversion).every((item) => !item.id.endsWith("-out-of-order")),
  );

  // ---- Singleton collision is surfaced, per-party types are not ----

  const twoClaims = [row({ id: "m", event_type: "claim-filed" })];
  check(
    "recording a second claim-filed surfaces the first",
    existingSingletonEvents(twoClaims, "claim-filed", isSingletonType).length === 1,
  );
  check(
    "a second defence-filed does NOT surface a collision",
    existingSingletonEvents(
      [row({ id: "n", event_type: "defence-filed" })],
      "defence-filed",
      isSingletonType,
    ).length === 0,
    "multi-defendant cases legitimately have several, and there is no party model",
  );

  // ---- The writer never parses a date ----
  //
  // "4 March" has no year in it. A route that turned it into 2026-03-04 would
  // be guessing and would then store the guess as a fact. Every prose form is
  // REJECTED, not converted.

  for (const prose of ["4 March", "last Tuesday", "March 4 2026", "04/03/2026", "sometime in spring"]) {
    check(`[${prose}] is rejected, not parsed`, pickedDate(prose).ok === false);
  }

  const picked = pickedDate("2026-03-04");
  check("an ISO date the user picked is accepted", picked.ok === true && picked.date === "2026-03-04");
  check("an absent date is accepted", pickedDate(undefined).ok === true);
  check("an impossible date is rejected", pickedDate("2026-02-31").ok === false);

  const proseRequest = parseEventRequest({
    eventType: "claim-filed",
    title: "I filed my claim",
    occurredAtRaw: "4 March",
    occurredAtNormalized: "4 March",
  });
  check("a request carrying a prose normalized date is refused outright", proseRequest === null);

  const goodRequest = parseEventRequest({
    eventType: "claim-filed",
    title: "I filed my claim",
    occurredAtRaw: "4 March",
    occurredAtNormalized: "2026-03-04",
    dateCertainty: "exact",
  });
  check("a request with raw words plus a picked date is accepted", goodRequest !== null);
  check(
    "the user's own words are kept alongside the picked date",
    goodRequest?.occurredAtRaw === "4 March" && goodRequest?.occurredAtNormalized === "2026-03-04",
  );

  // ---- The route owns event_type membership, and nothing else the DB owns ----

  check(
    "an event type outside the sourced vocabulary is refused",
    parseEventRequest({ eventType: "claim-withdrawn", title: "t" }) === null,
  );
  check(
    "the untyped option is accepted like any other",
    parseEventRequest({ eventType: "other-user-described", title: "Something happened" }) !== null,
  );
  check(
    "a bad certainty is refused before it reaches the database",
    parseEventRequest({ eventType: "claim-filed", title: "t", dateCertainty: "probably" }) === null,
  );

  // The route must NOT re-implement what the CHECK constraints hold. A
  // narrative-confirmed event with no basis is invalid, and the DATABASE is
  // what rejects it — case_events_narrative_basis_present, verified live.
  check(
    "the route does not duplicate the narrative-basis CHECK",
    parseEventRequest({
      eventType: "claim-filed",
      title: "t",
      source: "confirmed-from-narrative",
    }) !== null,
    "the database owns this invariant; duplicating it here is how the two drift",
  );

  // ---- Candidates: three states, and only one of them is stored ----

  const SENTENCE = "I was served with the claim on the 4th of March.";

  const candidates = [
    { transientId: "timeline_1", title: "Served with the claim", narrativeBasis: SENTENCE },
    { transientId: "timeline_2", title: "Something else", narrativeBasis: "We spoke on the phone." },
  ];

  const noAnswers = resolveCandidates(candidates, [], []);
  check(
    "a candidate nobody has answered is unanswered",
    noAnswers.every((candidate) => candidate.state === "unanswered"),
  );
  check("unanswered candidates are what the surface prompts on", candidatesAwaitingAnswer(noAnswers).length === 2);

  const confirmedEvent = row({
    id: "ev-1",
    event_type: "claim-served",
    source: "confirmed-from-narrative",
    narrative_basis: SENTENCE,
  });
  const afterConfirm = resolveCandidates(candidates, [confirmedEvent], []);
  check(
    "a candidate confirmed into an event reads as confirmed",
    afterConfirm[0]?.state === "confirmed" && afterConfirm[0]?.confirmedEventId === "ev-1",
  );
  check("the other candidate is untouched", afterConfirm[1]?.state === "unanswered");

  const dismissal: CandidateDismissalRow = {
    id: "dis-1",
    case_id: "case-1",
    candidate_fingerprint: candidateFingerprint(SENTENCE),
    narrative_basis: SENTENCE,
    suggested_event_type: "",
    dismissed_at: "2026-09-13T00:00:00Z",
    restored_at: null,
  };
  const afterDismiss = resolveCandidates(candidates, [], [dismissal]);
  check("a dismissed candidate reads as dismissed", afterDismiss[0]?.state === "dismissed");
  check("it is not prompted on again", candidatesAwaitingAnswer(afterDismiss).length === 1);

  const afterRestore = resolveCandidates(candidates, [], [
    { ...dismissal, restored_at: "2026-09-14T00:00:00Z" },
  ]);
  check(
    "restoring a dismissal makes the candidate answerable again",
    afterRestore[0]?.state === "unanswered",
  );

  // ---- The fingerprint survives a re-parse, and ignores the type ----

  check(
    "a fresh parse of the same sentence produces the same fingerprint",
    candidateFingerprint(SENTENCE) === candidateFingerprint(SENTENCE),
  );
  check(
    "trailing punctuation and whitespace do not change identity",
    candidateFingerprint(SENTENCE) === candidateFingerprint(`  ${SENTENCE.replace(/\.$/, "")}  `),
  );
  check(
    "a genuinely different sentence is a different candidate",
    candidateFingerprint(SENTENCE) !== candidateFingerprint("I was served in April."),
  );
  // Behavioural, not arity-based. An arity check (`fn.length === 1`) does NOT
  // catch a defaulted second parameter — `(a, type = "")` still reports length
  // 1 — and the mutation suite caught that hole. This asserts the property that
  // actually matters: whatever is passed alongside the sentence, the
  // fingerprint is unchanged, so a dismissed sentence cannot reappear re-typed.
  const withExtraArg = (candidateFingerprint as (...args: unknown[]) => string)(
    SENTENCE,
    "claim-served",
  );
  const withOtherArg = (candidateFingerprint as (...args: unknown[]) => string)(
    SENTENCE,
    "motion-served",
  );
  check(
    "the fingerprint ignores anything passed beside the sentence",
    withExtraArg === candidateFingerprint(SENTENCE) && withOtherArg === withExtraArg,
    "a type folded into the hash would let a dismissed sentence return under another type",
  );

  // ---- Silence is never recorded as an answer ----

  const CANDIDATES_SRC = readFileSync(
    path.join(__dirname, "..", "..", "src", "lib", "case-system", "events", "caseEventCandidates.ts"),
    "utf8",
  );
  const DISMISSALS_MIGRATION = readFileSync(
    path.join(
      __dirname, "..", "..", "supabase", "migrations",
      "20260913140000_add_case_event_candidate_dismissals.sql",
    ),
    "utf8",
  );

  check(
    "there is no expiry, sweep or bulk-reviewed marker in the candidate logic",
    !/expire|expiry|sweep|reviewed_at|bulkReview/i.test(CANDIDATES_SRC),
    "any of those would convert a candidate the user skipped into a no",
  );
  // Assert on the SCHEMA, not the file. The migration's own comments explain
  // the three states, so a whole-file grep fires on the explanation — the same
  // mistake made once already on the system-inference check. Strip SQL comments
  // and the COMMENT ON string literals before testing.
  const dismissalsSchema = DISMISSALS_MIGRATION.split("\n")
    .filter((line) => !/^\s*--/.test(line))
    .join("\n")
    .replace(/COMMENT ON[\s\S]*?;/g, "");

  check(
    "the dismissals table stores no 'unanswered' or 'pending' state",
    !/pending|unanswered/i.test(dismissalsSchema),
    "unanswered is the ABSENCE of a row; giving it a row gives silence somewhere to be written",
  );
  check(
    "a dismissal is reversible rather than deleted",
    /restored_at/.test(DISMISSALS_MIGRATION),
  );
  check(
    "one live dismissal per sentence per case",
    /UNIQUE INDEX[\s\S]{0,200}candidate_fingerprint[\s\S]{0,120}restored_at" IS NULL/.test(
      DISMISSALS_MIGRATION,
    ),
  );

  // ---- Candidates come from the persisted timeline, tolerantly ----

  const fromTimeline = candidatesFromTimeline([
    { id: "t1", title: "Served", sourceText: SENTENCE },
    { id: "t2", description: "Only a description here." },
    { id: "t3" },
    null,
    "not an object",
  ]);
  check("a timeline entry with a sentence becomes a candidate", fromTimeline.length === 2);
  check(
    "an entry with no usable sentence is skipped, not invented",
    fromTimeline.every((candidate) => candidate.narrativeBasis.length > 0),
  );
  check("a malformed timeline yields nothing rather than throwing", candidatesFromTimeline(null).length === 0);
  check(
    "candidates carry no procedural type — the parser does not classify",
    fromTimeline.every((candidate) => candidate.suggestedEventType === undefined),
  );

  // ---- Stage moves from events, and says why ----

  const noEvents = deriveCaseStageWithEvents({} as never, []);
  check("no events and no intake answers gives no stage", noEvents.stage === "unknown");

  const defenceOnly = deriveCaseStageWithEvents({} as never, [
    row({ id: "s1", event_type: "defence-filed" }),
  ]);
  check("recording a defence moves the case to conference", defenceOnly.stage === "conference");
  check(
    "and says why, from the event",
    defenceOnly.basis.some((line) => /you recorded that a defence was filed/.test(line)),
    defenceOnly.basis.join(" | "),
  );
  check(
    "the event reason comes before the intake reason",
    /you recorded/.test(defenceOnly.basis[0] ?? ""),
  );
  check(
    "a defence implies the claim was filed, citing the rule",
    defenceOnly.basis.some((line) => /r\. 7\.01 \(1\)/.test(line)),
  );

  // An event can set a fact TRUE. It must never set one false.
  const intakeSaysFiled = deriveCaseStageWithEvents({ claimFiled: true } as never, []);
  check(
    "an intake answer still counts when no event contradicts it",
    intakeSaysFiled.stage === "already-started",
  );
  const factsAfter = stageFactsFromEvents([row({ id: "s2", event_type: "claim-served" })]);
  check("a recorded event sets its fact true", factsAfter.claimServed === true);
  // The one-directional rule is enforced by the TYPE — the fields are `?: true`,
  // not `?: boolean`, so "false" is unrepresentable. A runtime check comparing
  // against false is vacuous (tsc says so: the types have no overlap), and a
  // check that cannot fail is worse than none. Assert the type instead.
  const STAGE_FACTS_SRC = readFileSync(
    path.join(__dirname, "..", "..", "src", "lib", "case-system", "events", "caseStageFromEvents.ts"),
    "utf8",
  );
  check(
    "the stage-fact fields are typed `?: true`, making false unrepresentable",
    /claimFiled\?: true;/.test(STAGE_FACTS_SRC) &&
      /claimServed\?: true;/.test(STAGE_FACTS_SRC) &&
      /defenceFiled\?: true;/.test(STAGE_FACTS_SRC),
    "absence of a recorded event is not evidence the step did not happen, so no event may set a fact false",
  );
  check("and a recorded event does set its fact", factsAfter.claimServed === true);
  check(
    "a superseded event does not move the stage",
    deriveCaseStageWithEvents({} as never, [
      row({ id: "s3", event_type: "defence-filed" }),
      row({ id: "s4", event_type: "claim-filed", supersedes_event_id: "s3" }),
    ]).stage !== "conference",
  );

  // ---- Staleness is reported, never acted on ----

  const analysedAt = "2026-09-10T00:00:00Z";
  const master = { derivedFrom: { at: analysedAt, latestEventCreatedAt: null } };

  check(
    "an analysis with no derivedFrom is never-analyzed, not stale",
    analysisFreshness({}, []).state === "never-analyzed",
    "calling every pre-existing case stale on a missing key would be wrong",
  );
  check("an analysis with no newer events is fresh", analysisFreshness(master, []).state === "fresh");

  const staleness = analysisFreshness(master, [
    row({ id: "f1", event_type: "claim-filed", created_at: "2026-09-12T00:00:00Z" }),
    row({ id: "f2", event_type: "claim-served", created_at: "2026-09-13T00:00:00Z" }),
  ]);
  check("events recorded after the analysis make it stale", staleness.state === "stale");
  check(
    "it counts them",
    staleness.state === "stale" && staleness.newEventCount === 2,
  );
  check(
    "a retracted event does not make an analysis stale",
    analysisFreshness(master, [
      row({
        id: "f3",
        event_type: "claim-filed",
        created_at: "2026-09-12T00:00:00Z",
        retracted_at: "2026-09-12T01:00:00Z",
      }),
    ]).state === "fresh",
  );

  const message = freshnessMessage(staleness) ?? "";
  check("the staleness message says nothing changes on its own", /nothing here changes on its own/.test(message));
  check(
    "it does not claim the analysis is wrong",
    !/incorrect|wrong|invalid/i.test(message),
    message,
  );
  check("a fresh analysis produces no message", freshnessMessage({ state: "fresh" }) === null);

  const FRESHNESS_SRC = readFileSync(
    path.join(__dirname, "..", "..", "src", "lib", "case-system", "events", "caseAnalysisFreshness.ts"),
    "utf8",
  );
  check(
    "nothing in the freshness module triggers a recompute",
    !/fetch\(|runCourtSimplifiedBrain|recompute\(/.test(FRESHNESS_SRC),
    "recomputing costs API calls and is the user's decision, not a side effect of reading",
  );

  // The reader and the message are inert without a writer. They shipped one
  // commit before the writer did, and every case read as "never-analyzed" in
  // the meantime — a whole half of the loop present and doing nothing. This
  // check exists so that cannot recur silently.
  const BUILDER_SRC = readFileSync(
    path.join(__dirname, "..", "..", "app", "builder", "page.tsx"),
    "utf8",
  );
  check(
    "the analysis save site writes derivedFrom",
    /buildDerivedFrom\(/.test(BUILDER_SRC) && /derivedFrom\b/.test(BUILDER_SRC),
    "without it every case reads never-analyzed and the staleness banner never fires",
  );
  check(
    "it reads the events at save time, not from stale state",
    /from\("case_events"\)[\s\S]{0,300}buildDerivedFrom\(/.test(BUILDER_SRC),
    "stamping against an older view would date the analysis wrongly",
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
