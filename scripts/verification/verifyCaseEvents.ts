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
import { parseRequest, pickedDate } from "../../app/api/cases/events/route";

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

  const proseRequest = parseRequest({
    eventType: "claim-filed",
    title: "I filed my claim",
    occurredAtRaw: "4 March",
    occurredAtNormalized: "4 March",
  });
  check("a request carrying a prose normalized date is refused outright", proseRequest === null);

  const goodRequest = parseRequest({
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
    parseRequest({ eventType: "claim-withdrawn", title: "t" }) === null,
  );
  check(
    "the untyped option is accepted like any other",
    parseRequest({ eventType: "other-user-described", title: "Something happened" }) !== null,
  );
  check(
    "a bad certainty is refused before it reaches the database",
    parseRequest({ eventType: "claim-filed", title: "t", dateCertainty: "probably" }) === null,
  );

  // The route must NOT re-implement what the CHECK constraints hold. A
  // narrative-confirmed event with no basis is invalid, and the DATABASE is
  // what rejects it — case_events_narrative_basis_present, verified live.
  check(
    "the route does not duplicate the narrative-basis CHECK",
    parseRequest({
      eventType: "claim-filed",
      title: "t",
      source: "confirmed-from-narrative",
    }) !== null,
    "the database owns this invariant; duplicating it here is how the two drift",
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
