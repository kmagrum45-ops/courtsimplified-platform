import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";

import { baseScenarios } from "./scenarioRegistry";
import {
  KNOWN_FACT_FIELDS,
  QUESTION_BANK,
  type FactCondition,
} from "../../src/lib/case-system/intake/questionBank";
import { EDUCATION_TOPICS, type EducationTopic } from "../../src/lib/case-system/intake/educationTopics";
import { REMEDY_TYPES, type RemedyTopic } from "../../src/lib/case-system/intake/remedyTypes";
import { CLAIM_TYPES, DEFENCE_CONCEPTS } from "../../src/lib/case-system/intake/claimTypes";
import { JURISDICTION_ROUTES } from "../../src/lib/case-system/intake/jurisdictionRoutes";
import { FAMILY_RESOURCE_TOPICS } from "../../src/lib/case-system/intake/familySafetyResources";
import { OUT_OF_SCOPE_FORUMS } from "../../src/lib/case-system/intelligence/outOfScopeForums";
import { VERIFIED_AUTHORITY_SEED_ENTRIES } from "../../src/lib/case-system/authority-intelligence/verifiedAuthoritySeedRegistry";

// EducationTopic and RemedyTopic share the same fields these checks care
// about (id, surfacedWhen, citations, status) -- checked structurally
// rather than importing one as the other's type, since they're separate
// registries by design (educationTopics.ts vs remedyTypes.ts) that happen
// to follow the same shape, not the same type.
type TopicLike = Pick<EducationTopic | RemedyTopic, "id" | "surfacedWhen" | "citations" | "status">;

/**
 * CLAUDE.md section 2's full acceptable-sources list: ontario.ca,
 * ontariocourts.ca, ontariocourtforms.on.ca, CanLII (canlii.org), the
 * Courts of Justice Act, the Rules of the Small Claims Court (O. Reg.
 * 258/98), Justice Ontario, and Law Society of Ontario public materials.
 *
 * The Courts of Justice Act and O. Reg. 258/98 are both published on
 * ontario.ca's e-Laws system (already covered below -- see the
 * "ontario.ca/laws/..." URLs throughout claimTypes.ts, e.g.
 * "https://www.ontario.ca/laws/docs/90o02_eV006.doc") -- they don't need
 * their own domain entry.
 *
 * Justice Ontario does NOT get its own domain entry here. Checked before
 * adding it: the one distinct domain found for it
 * (attorneygeneral.jus.gov.on.ca/english/justice-ont/) has an EXPIRED TLS
 * certificate as of this check (2026-09) -- not a currently resolvable
 * source, so adding it would let something through that doesn't actually
 * meet the "real, verifiable source" bar. No other live, distinct domain
 * was found for it; Ontario's public-facing legal-help content has
 * generally consolidated under ontario.ca, which is already covered. If a
 * future session finds Justice Ontario live at its own current domain,
 * add it here with that evidence.
 */
const ALLOWED_SOURCE_DOMAINS = [
  "https://www.ontario.ca/",
  "https://ontario.ca/",
  "https://www.ontariocourts.ca/",
  "https://ontariocourts.ca/",
  "https://www.ontariocourtforms.on.ca/",
  "https://ontariocourtforms.on.ca/",
  "https://www.canlii.org/",
  "https://canlii.org/",
  "https://www.lso.ca/",
  "https://lso.ca/",
];

// Shared error-message fragment so the three "no resolvable source" checks
// below don't each carry their own copy of the domain list to fall out of
// sync -- update ALLOWED_SOURCE_DOMAINS and this string together.
const RESOLVABLE_SOURCE_HINT =
  "ontario.ca, ontariocourts.ca, ontariocourtforms.on.ca, canlii.org, or lso.ca, " +
  "or a file under docs/sources/ (see that folder's README)";

// CLAUDE.md section 2: a primary source saved locally under docs/sources/
// is a first-class citation route, for sources (CanLII, the SCC's own
// site) that block automated fetching -- reading it from disk satisfies
// "retrieved and read" the same way a live fetch does, provided
// docs/sources/README.md records where and when it came from. A local
// file has no URL to check the resolvability of, so "resolvable" for one
// means something different in kind, not just in degree: the file
// actually exists on disk, checked here the same deterministic way as
// everything else in this script -- not a live network fetch (this
// script has never made one), and not an assumption that a path ending
// in ".pdf" is good enough. citation.officialUrl carries the repo-
// relative path (e.g. "docs/sources/mustapha-v-culligan-2008-SCC-27.pdf")
// exactly as it would appear in docs/sources/README.md's own entry; this
// check does not separately verify the README entry exists -- that's a
// content-review step, not something this script can check structurally
// the way it checks id references elsewhere.
const LOCAL_SOURCE_PREFIX = "docs/sources/";
const REPO_ROOT = path.resolve(__dirname, "..", "..");

/**
 * e-Laws viewer URLs that return a JS shell with no readable text.
 *
 * `ontario.ca/laws/statute/<id>` and `ontario.ca/laws/regulation/<id>` are the
 * e-Laws *viewer*. Fetched directly they return an empty HTML shell — confirmed
 * repeatedly and recorded in docs/SOURCING_NOTES.md. The fetching route for the
 * same text is `ontario.ca/laws/docs/<id>_e.doc`.
 *
 * This mattered in practice: `verifiedAuthoritySeedRegistry.ts` cited
 * O. Reg. 626/00 — the regulation that prescribes the $50,000 Small Claims
 * limit — as `ontario.ca/laws/regulation/000626`. The citation was on the right
 * instrument and resolved to nothing anyone could read, and a session
 * separately reported that the repo "did not cite the regulation" partly
 * because of it.
 *
 * The old check validated domain and protocol only, so every viewer URL passed.
 * A check that cannot tell a readable source from an empty page is not checking
 * sourcing — it is checking spelling.
 */
const NON_RESOLVING_ROUTES = [
  "https://www.ontario.ca/laws/statute/",
  "https://www.ontario.ca/laws/regulation/",
  "https://ontario.ca/laws/statute/",
  "https://ontario.ca/laws/regulation/",
];

export function isJsShellRoute(value: string): boolean {
  return NON_RESOLVING_ROUTES.some((prefix) => value.startsWith(prefix));
}

function isResolvableSourceUrl(value: string | undefined): boolean {
  if (!value) return false;

  if (value.startsWith(LOCAL_SOURCE_PREFIX)) {
    return existsSync(path.resolve(REPO_ROOT, value));
  }

  // Rejected before the domain check: these ARE on an allowed domain, which is
  // exactly why the domain check alone let them through.
  if (isJsShellRoute(value)) return false;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
  } catch {
    return false;
  }
  return ALLOWED_SOURCE_DOMAINS.some((prefix) => value.startsWith(prefix));
}

function collectFactFields(condition: FactCondition, out: Set<string>): void {
  if ("all" in condition) {
    condition.all.forEach((inner) => collectFactFields(inner, out));
    return;
  }
  if ("any" in condition) {
    condition.any.forEach((inner) => collectFactFields(inner, out));
    return;
  }
  out.add(condition.field);
}

function main() {
  const knownFields = new Set<string>(KNOWN_FACT_FIELDS);

  // ---- 1. Every small-claims scenario's intentionalGaps must be covered ----
  const smallClaimsScenarios = baseScenarios.filter((scenario) => scenario.courtPath === "small-claims");
  assert.ok(smallClaimsScenarios.length > 0, "expected at least one small-claims scenario in the registry");

  const coveredGaps = new Set<string>();
  for (const question of QUESTION_BANK) {
    (question.covers ?? []).forEach((gap) => coveredGaps.add(gap));
  }

  const uncoveredGaps: string[] = [];
  for (const scenario of smallClaimsScenarios) {
    for (const gap of scenario.intentionalGaps) {
      if (!coveredGaps.has(gap)) {
        uncoveredGaps.push(`${scenario.id}: "${gap}"`);
      }
    }
  }
  assert.equal(
    uncoveredGaps.length,
    0,
    `intentionalGaps with no covering question (add a question with a matching \`covers\` entry):\n` +
      uncoveredGaps.join("\n"),
  );

  // ---- 2. appliesWhen / surfacedWhen must only reference known fact fields ----
  const unknownFieldRefs: string[] = [];
  for (const question of QUESTION_BANK) {
    if (!question.appliesWhen) continue;
    const fields = new Set<string>();
    collectFactFields(question.appliesWhen, fields);
    for (const field of fields) {
      if (!knownFields.has(field)) {
        unknownFieldRefs.push(`question "${question.id}" appliesWhen references unknown field "${field}"`);
      }
    }
  }
  // ClaimType and JurisdictionRoute both structurally satisfy TopicLike
  // (id/citations/status present, surfacedWhen simply absent -- fine for
  // an optional property), so they reuse checks 2, 3, and the bonus check
  // below for free. DEFENCE_CONCEPTS has a different shape (a bare
  // sourceUrl, not a citations tuple) and gets its own small check further
  // down instead of being forced in here.
  const allTopics: TopicLike[] = [...EDUCATION_TOPICS, ...REMEDY_TYPES, ...CLAIM_TYPES, ...JURISDICTION_ROUTES];
  for (const topic of allTopics) {
    if (!topic.surfacedWhen) continue;
    const fields = new Set<string>();
    collectFactFields(topic.surfacedWhen, fields);
    for (const field of fields) {
      if (!knownFields.has(field)) {
        unknownFieldRefs.push(`topic "${topic.id}" surfacedWhen references unknown field "${field}"`);
      }
    }
  }
  assert.equal(
    unknownFieldRefs.length,
    0,
    `appliesWhen/surfacedWhen referencing a field not in KNOWN_FACT_FIELDS ` +
      `(questionBank.ts) -- add the field there first, deliberately:\n` +
      unknownFieldRefs.join("\n"),
  );

  // ---- 3. Every non-draft item stating a legal fact needs a resolvable sourceUrl ----
  const missingSources: string[] = [];
  for (const question of QUESTION_BANK) {
    if (question.status === "draft") continue;
    const statesLegalFact = Boolean(question.why);
    if (statesLegalFact && !isResolvableSourceUrl(question.sourceUrl)) {
      missingSources.push(
        `question "${question.id}" is status "${question.status}" with a \`why\` but no resolvable ` +
          `sourceUrl from ${RESOLVABLE_SOURCE_HINT}`,
      );
    }
  }
  for (const topic of allTopics) {
    if (topic.status === "draft") continue;
    const hasResolvableCitation = topic.citations.some((citation) => isResolvableSourceUrl(citation.officialUrl));
    if (!hasResolvableCitation) {
      missingSources.push(
        `topic "${topic.id}" is status "${topic.status}" but has no citation with a resolvable ` +
          `officialUrl from ${RESOLVABLE_SOURCE_HINT}`,
      );
    }
  }
  assert.equal(
    missingSources.length,
    0,
    `non-draft entries stating a legal fact without a resolvable source ` +
      `(mark them "draft" until sourced, or add the citation):\n` + missingSources.join("\n"),
  );

  // ---- DEFENCE_CONCEPTS: same non-draft-needs-source rule, different shape
  // (a bare sourceUrl rather than a citations tuple, so it can't join
  // allTopics above) ----
  for (const concept of DEFENCE_CONCEPTS) {
    if (concept.status === "draft") continue;
    if (!isResolvableSourceUrl(concept.sourceUrl)) {
      missingSources.push(
        `defence concept "${concept.id}" is status "${concept.status}" but has no resolvable ` +
          `sourceUrl from ${RESOLVABLE_SOURCE_HINT}`,
      );
    }
  }
  assert.equal(
    missingSources.length,
    0,
    `non-draft entries stating a legal fact without a resolvable source ` +
      `(mark them "draft" until sourced, or add the citation):\n` + missingSources.join("\n"),
  );

  // ---- 4. Every ClaimType sub-entry's sourceUrl is mandatory by type (not
  // gated behind a `why` the way questionBank.ts's is) -- verified for every
  // claim type regardless of draft status, since a bad or missing value in a
  // required field is a content bug on its own terms. ----
  const badSubEntrySources: string[] = [];
  for (const claimType of CLAIM_TYPES) {
    for (const element of claimType.plaintiffElements) {
      if (!isResolvableSourceUrl(element.sourceUrl)) {
        badSubEntrySources.push(`claim type "${claimType.id}" plaintiffElement "${element.id}" has no resolvable sourceUrl`);
      }
    }
    for (const consideration of claimType.defendantConsiderations) {
      if (!isResolvableSourceUrl(consideration.sourceUrl)) {
        badSubEntrySources.push(`claim type "${claimType.id}" defendantConsideration "${consideration.id}" has no resolvable sourceUrl`);
      }
    }
    for (const note of claimType.proceduralNotes) {
      if (!isResolvableSourceUrl(note.sourceUrl)) {
        badSubEntrySources.push(`claim type "${claimType.id}" proceduralNote "${note.note.slice(0, 40)}..." has no resolvable sourceUrl`);
      }
    }
  }
  assert.equal(
    badSubEntrySources.length,
    0,
    `ClaimType sub-entries with an unresolvable sourceUrl (this field is mandatory, not conditional):\n` +
      badSubEntrySources.join("\n"),
  );

  // ---- 5. Referential integrity: ClaimType.remedies and
  // .applicableDefenceConceptIds must point at real entries, not typos ----
  const remedyIds = new Set(REMEDY_TYPES.map((remedy) => remedy.id));
  const defenceConceptIds = new Set(DEFENCE_CONCEPTS.map((concept) => concept.id));
  const danglingReferences: string[] = [];
  for (const claimType of CLAIM_TYPES) {
    for (const remedyId of claimType.remedies) {
      if (!remedyIds.has(remedyId)) {
        danglingReferences.push(`claim type "${claimType.id}" references unknown remedy id "${remedyId}"`);
      }
    }
    for (const conceptId of claimType.applicableDefenceConceptIds) {
      if (!defenceConceptIds.has(conceptId)) {
        danglingReferences.push(`claim type "${claimType.id}" references unknown defence concept id "${conceptId}"`);
      }
    }
  }
  assert.equal(
    danglingReferences.length,
    0,
    `ClaimType entries referencing a remedy or defence concept id that doesn't exist:\n` +
      danglingReferences.join("\n"),
  );

  // ---- Bonus: every topic's citations tuple is genuinely non-empty (belt & suspenders on the type) ----
  for (const topic of allTopics) {
    assert.ok(topic.citations.length > 0, `topic "${topic.id}" has an empty citations array`);
  }

  // ---- Noting up: count case-law citations never checked for subsequent treatment ----
  //
  // A citation's `verifiedAt` says the source was retrieved and the pinpoint
  // says what we claim. It says NOTHING about whether the holding is still
  // good law. `notedUpAt` is that second question, and it is null everywhere
  // today: the standard noting-up route is CanLII's, and CLAUDE.md section 2
  // forbids scraping CanLII, so there is no automated path yet.
  //
  // This REPORTS rather than fails. Failing would block every build on a gap
  // that currently has no route to close, which trains people to ignore it.
  // Printing the count on every run keeps it in front of whoever is working,
  // and makes it obvious the day the number starts going down.
  //
  // Case law is identified structurally, not by a hand-maintained list: a
  // citation is case law if its officialUrl is a docs/sources/ PDF or a
  // CanLII /doc/ path. Confirmed 2026-09-11 that no statute or regulation
  // citation uses either route -- those are ontario.ca/laws/docs/*.doc.
  const isCaseLawUrl = (url: string): boolean =>
    url.startsWith(LOCAL_SOURCE_PREFIX) || /^https:\/\/(www\.)?canlii\.org\/.*\/doc\//.test(url);

  const caseLawCitations = allTopics
    .flatMap((topic) => topic.citations)
    .filter((citation) => isCaseLawUrl(citation.officialUrl));
  let notNotedUpCount = caseLawCitations.filter((citation) => !citation.notedUpAt).length;
  let caseLawCount = caseLawCitations.length;

  // DEFENCE_CONCEPTS carry a bare sourceUrl rather than a citations tuple, so
  // they are not in allTopics and would be silently missed here -- which is
  // exactly the invisible-by-omission failure this check exists to prevent.
  // `defence-failure-to-mitigate` is sourced to an SCC judgment and has no
  // notedUpAt field to carry a date on, so it counts as un-noted-up.
  for (const concept of DEFENCE_CONCEPTS) {
    if (isCaseLawUrl(concept.sourceUrl)) {
      caseLawCount += 1;
      notNotedUpCount += 1;
    }
  }

  // ---- Registries this script did not previously reach ----
  //
  // familySafetyResources, outOfScopeForums and the verified-authority seed
  // registry all carry sourced legal content and none was checked here. An
  // audit found the authority registry citing O. Reg. 626/00 through the
  // e-Laws viewer route, which returns no text — a broken citation that no
  // check could see because no check looked at that file.
  //
  // These are folded into the SAME resolvability rule as everything else
  // rather than given their own, so there is one definition of "resolvable"
  // in this repo and not four.

  const unreachedRegistryProblems: string[] = [];

  for (const topic of FAMILY_RESOURCE_TOPICS) {
    for (const citation of topic.citations) {
      if (!isResolvableSourceUrl(citation.officialUrl)) {
        unreachedRegistryProblems.push(
          `familySafetyResources "${topic.id}" citation "${citation.sourceName}" ` +
            `has no resolvable officialUrl (${citation.officialUrl})`,
        );
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(citation.verifiedAt)) {
        unreachedRegistryProblems.push(
          `familySafetyResources "${topic.id}" citation "${citation.sourceName}" has no verifiedAt`,
        );
      }
    }
  }

  for (const forum of Object.values(OUT_OF_SCOPE_FORUMS)) {
    for (const citation of forum.citations) {
      if (!isResolvableSourceUrl(citation.officialUrl)) {
        unreachedRegistryProblems.push(
          `outOfScopeForums "${forum.id}" citation "${citation.sourceName}" ` +
            `has no resolvable officialUrl (${citation.officialUrl})`,
        );
      }
    }
  }

  // The authority registry uses a third field name (`sourceUrl`, optional) and
  // its own reference shape. A source reference that names a URL must name one
  // that resolves; a reference with no URL at all is legitimate for case law
  // cited by neutral citation, so absence is not an error here.
  for (const entry of VERIFIED_AUTHORITY_SEED_ENTRIES) {
    for (const reference of entry.sourceReferences) {
      if (reference.sourceUrl !== undefined && !isResolvableSourceUrl(reference.sourceUrl)) {
        unreachedRegistryProblems.push(
          `verifiedAuthoritySeedRegistry "${entry.id}" source "${reference.id}" ` +
            `has an unresolvable sourceUrl (${reference.sourceUrl})`,
        );
      }
    }
  }

  assert.equal(
    unreachedRegistryProblems.length,
    0,
    `Sourced content with an unresolvable or undated citation:\n` +
      unreachedRegistryProblems.map((problem) => `  - ${problem}`).join("\n"),
  );

  const authoritySourceCount = VERIFIED_AUTHORITY_SEED_ENTRIES.reduce(
    (sum, entry) => sum + entry.sourceReferences.length,
    0,
  );

  console.log(
    `Previously unchecked registries verified: ${FAMILY_RESOURCE_TOPICS.length} family resource ` +
      `topic(s), ${Object.keys(OUT_OF_SCOPE_FORUMS).length} out-of-scope forum(s), ` +
      `${VERIFIED_AUTHORITY_SEED_ENTRIES.length} authority entr(ies) carrying ` +
      `${authoritySourceCount} source reference(s).`,
  );

  console.log(
    `Intake coverage verified: ${smallClaimsScenarios.length} small-claims scenario(s), ` +
      `${QUESTION_BANK.length} question(s) (0 uncovered intentionalGaps), ` +
      `${EDUCATION_TOPICS.length} education topic(s), ${REMEDY_TYPES.length} remedy topic(s), ` +
      `${CLAIM_TYPES.length} claim type(s), ${DEFENCE_CONCEPTS.length} defence concept(s), ` +
      `${JURISDICTION_ROUTES.length} jurisdiction route(s), ` +
      `0 unknown appliesWhen/surfacedWhen fields, 0 non-draft entries missing a resolvable source, ` +
      `0 dangling remedy/defence-concept references.`,
  );
  // ---- Undated sourceUrls, reported not enforced ----
  //
  // The same treatment as noting-up above, for the same reason: the gap is real,
  // closing it needs a content review rather than a code change, and a number
  // printed every run keeps it visible instead of invisible by omission.
  //
  // NOT enforced, deliberately. Failing here would pressure someone into
  // stamping 146 dates to make the build green, and a verifiedAt that was not
  // verified is worse than none.

  let undatedSubEntries = 0;
  let datedSubEntries = 0;

  const countDate = (verifiedAt: string | undefined): void => {
    if (verifiedAt && /^\d{4}-\d{2}-\d{2}$/.test(verifiedAt)) datedSubEntries += 1;
    else undatedSubEntries += 1;
  };

  for (const claimType of CLAIM_TYPES) {
    claimType.plaintiffElements.forEach((element) => countDate(element.verifiedAt));
    (claimType.defendantConsiderations ?? []).forEach((item) => countDate(item.verifiedAt));
    (claimType.proceduralNotes ?? []).forEach((note) => countDate(note.verifiedAt));
  }
  DEFENCE_CONCEPTS.forEach((concept) => countDate(concept.verifiedAt));

  console.log(
    `Undated sources: ${undatedSubEntries} of ${undatedSubEntries + datedSubEntries} ClaimType ` +
      `sub-entr(ies) carry a sourceUrl with NO verifiedAt, so nothing tracks whether they have ` +
      `gone stale. Reported, not enforced -- closing this is a content review, not a backfill ` +
      `(a verifiedAt that was not verified is worse than none). See OUTSTANDING_ISSUES.md.`,
  );

  console.log(
    `Noting up: ${notNotedUpCount} of ${caseLawCount} case-law citation(s) have NEVER ` +
      `been checked for subsequent treatment (overruled/narrowed/distinguished). ` +
      `Reported, not enforced -- no automated route exists (CanLII scraping is forbidden by ` +
      `CLAUDE.md section 2). See docs/SOURCING_NOTES.md, "Noting up".`,
  );
}

main();
