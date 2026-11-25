/**
 * Builds the Case Law Map, batch 1 (owner, 2026-11-22) into the authority registry's store,
 * src/lib/case-system/authority-intelligence/caseLawBatch1.json, from the owner's file
 * docs/law-map/case-law-batch1-2026-11-22.md. Wording is copied, never rewritten; each entry is put through the checks
 * in caseLawChecks.ts and the results are stored with it. A CanLII check result already in the store (written by
 * scripts/sources/checkCaseLawCitations.ts) is kept.
 *
 * What it never sets: a review date. Every entry's status is "needs review" and confirmed_at is empty; only the owner's
 * review saved through the site's review mechanism may set it, and that mechanism does not exist yet (the
 * content_reviews table, #523, is a draft and not applied).
 *
 * Run: node --import tsx scripts/content/buildCaseLawBatch1.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readCaseLawFixture, readLinks, NO_CAUTION, CASE_LAW_FIXTURE } from "./caseLawFixture";
import {
  decisionTextCheck,
  linkAllowed,
  predictionCheck,
  procedureMentions,
  STATUTE_PINPOINTS,
  statutePinpointFound,
} from "./caseLawChecks";
import type { CaseLawBatch, CaseLawEntry, CanliiCheck } from "../../src/lib/case-system/authority-intelligence/caseLawBatch1";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const STORE = path.join(ROOT, "src", "lib", "case-system", "authority-intelligence", "caseLawBatch1.json");

const COURTS: Record<string, CaseLawEntry["courts"][number]> = { small_claims: "small-claims", civil: "civil", family: "family" };

export function buildCaseLawBatch(previous: CaseLawBatch | null): CaseLawBatch {
  const fixtureText = readFileSync(CASE_LAW_FIXTURE, "utf8");
  const reviewer = /^Reviewer for all: (.+?)\. All times/m.exec(fixtureText)?.[1] ?? "";
  const texts: Record<string, string> = {};
  const entries: CaseLawEntry[] = [];

  for (const { number, slug, fields } of readCaseLawFixture()) {
    const isCase = "case" in fields;
    const kind: CaseLawEntry["kind"] = isCase ? "case-law" : /Rules of the Small Claims Court/.test(fields.source) ? "rule" : "statute";

    const textId = (part: string) => `caseLaw.${slug}.${part}`;
    texts[textId("topic")] = fields.topic;
    texts[textId("summary")] = fields.summary;
    const hasCaution = !NO_CAUTION.test(fields.cautions);
    if (hasCaution) texts[textId("cautions")] = fields.cautions;

    const allLinks = [
      ...(fields.link_hint ? [{ label: "CanLII", url: fields.link_hint, role: "decision" as const }] : []),
      ...(fields.link ? [{ label: fields.source, url: fields.link, role: "source" as const }] : []),
      ...["extra_link", "statute_link", "statute_links", "rule_link"].flatMap((key) =>
        fields[key] ? readLinks(fields[key]).map((l) => ({ ...l, role: "related" as const })) : [],
      ),
    ];
    const links = allLinks.filter((l) => linkAllowed(l.url));
    const linkPendingSourceDecision = allLinks
      .filter((l) => !linkAllowed(l.url))
      .map((l) => ({
        label: l.label,
        url: l.url,
        reason: `${new URL(l.url).hostname} is not on CLAUDE.md s. 2's acceptable list and is not used anywhere else on the site. Held, never shown, until the owner decides.`,
      }));

    let stopped: CaseLawEntry["stoppedByPredictionCheck"] = null;
    for (const field of ["topic", "summary", "cautions"] as const) {
      const hit = field === "cautions" && !hasCaution ? null : predictionCheck(fields[field]);
      if (hit) {
        stopped = { field, ...hit };
        break;
      }
    }

    const notChecked: CanliiCheck = {
      status: "not checked",
      checkedOn: null,
      url: null,
      note: "No CANLII_API_KEY where this was built, so CanLII was not asked. Run npm run canlii:check-case-law with the key.",
    };
    const kept = previous?.entries.find((e) => e.id === slug)?.canliiCheck;
    const canliiCheck: CanliiCheck = !isCase
      ? { status: "not applicable", checkedOn: null, url: null, note: "A statute or rule, not a decision: its link is the official e-Laws page." }
      : kept && kept.status !== "not checked"
        ? kept
        : notChecked;

    const decided = /(decided|reasons released) (\d{4}-\d{2}-\d{2})/.exec(fields.court ?? "");
    entries.push({
      number,
      id: slug,
      kind,
      courts: fields.courts.split(", ").map((c) => {
        const court = COURTS[c];
        if (!court) throw new Error(`${number}: unknown court "${c}"`);
        return court;
      }),
      topicTextId: textId("topic"),
      title: isCase ? fields.case : fields.source,
      citations: isCase ? fields.citations.split("; ") : [fields.source],
      court: fields.court ? fields.court.replace(/; (decided|reasons released) .*$/, "") : null,
      decided: decided?.[2] ?? null,
      decidedAs: (decided?.[1] as CaseLawEntry["decidedAs"]) ?? null,
      sourceLabel: isCase ? "Source: CanLII" : "Source: Ontario e-Laws",
      links,
      linkPendingSourceDecision,
      summaryTextId: textId("summary"),
      cautionsTextId: hasCaution ? textId("cautions") : null,
      cautionsAsGiven: fields.cautions,
      review: { status: "needs review", confirmed_at: null, reviewer, owner_check_notes: fields.review },
      canliiCheck,
      hidden_until_checked: isCase && canliiCheck.status !== "pass",
      stoppedByPredictionCheck: stopped,
      procedureMentions: procedureMentions([fields.topic, fields.summary, hasCaution ? fields.cautions : ""].join(" ")),
      machineCheck: {
        verified: false,
        decisionText: isCase ? decisionTextCheck(slug, fields.summary) : null,
        statutePinpoints: STATUTE_PINPOINTS.filter((s) => s.entry === number).map((s) => ({
          corpusId: s.corpusId,
          pinpoint: s.pinpoint,
          phrase: s.phrase,
          found: statutePinpointFound(s),
        })),
      },
      inUse: false,
    });
  }

  return {
    batch: "case-law-map-batch-1",
    from: "docs/law-map/case-law-batch1-2026-11-22.md",
    note: "Owner's Case Law Map, batch 1. Every entry needs review; none is shown to anyone (no render path reads this file). Built by scripts/content/buildCaseLawBatch1.ts; do not edit by hand.",
    texts,
    entries,
  };
}

if (process.argv[1]?.endsWith("buildCaseLawBatch1.ts")) {
  const previous = existsSync(STORE) ? (JSON.parse(readFileSync(STORE, "utf8")) as CaseLawBatch) : null;
  const batch = buildCaseLawBatch(previous);
  writeFileSync(STORE, `${JSON.stringify(batch, null, 2)}\n`);
  console.log(`${batch.entries.length} entries written to ${path.relative(ROOT, STORE)}`);
}
