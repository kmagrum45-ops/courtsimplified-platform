/**
 * Meaning-based retrieval over the corpus: the passages are cut where the law
 * is cut, carry only law in force, are found by meaning, and can only be cited
 * through the grounding gate.
 *
 * WHAT IT CATCHES:
 *   - A passage labelled with the wrong provision (a pinpoint the words do
 *     not come from), or one provision swallowed into another's passage.
 *   - Not-in-force text in a passage: e-Laws prints proclaimed-later
 *     replacements inline (FLA s. 46 is the reference case), and a quote from
 *     one would state law that does not apply yet.
 *   - Page furniture ("Was this information helpful?") in what is searched.
 *   - Search returning another court's procedure, or one statute crowding out
 *     every other source.
 *   - A stale vector serving new words: a passage whose text changed after
 *     the index was built must be skipped, not served.
 *   - Retrieval that throws, or that blocks the analysis when it fails.
 *   - A retrieved passage that can be cited without the quote check, or a
 *     corpus id the gate accepts when retrieval did not supply it.
 *   - The brain not wiring retrieval through the same pack the gate checks.
 *   - The query step sending the story to the embeddings call, or leaving
 *     the audit log without the call.
 *
 * COSTS NOTHING. The model and embeddings calls are replaced by stubs; the
 * real corpus files are read from disk. No network, no database.
 *
 * Run: npm run test:corpus-retrieval
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import {
  chunkSource,
  collapse,
  isLegislation,
  readableUrl,
  type CorpusChunk,
} from "../../src/lib/case-system/retrieval/corpusChunker";
import {
  namedSources,
  NAMED_SOURCE_BOOST,
  passageHash,
  quantize,
  sourceTextPath,
  readPassage,
  searchIndex,
  type CorpusIndexMeta,
  type IndexedSource,
  type LoadedIndex,
} from "../../src/lib/case-system/retrieval/corpusIndex";
import { chunkDecision } from "../../src/lib/case-system/retrieval/decisionChunker";
import { findProvision, referencedProvisions } from "../../src/lib/case-system/retrieval/crossReferences";
import { DECISION_SOURCES } from "../retrieval/decisionSources";
import { RECALL_SET } from "../eval/retrievalRecallSet";
import {
  excludedForCourt,
  followCrossReferences,
  parseQueries,
  passageItem,
  QUERY_SYSTEM_PROMPT,
  retrieveForStory,
} from "../../src/lib/case-system/retrieval/storyRetrieval";
import {
  buildSourcePack,
  sourcePackForPrompt,
  verifyGroundedCognition,
  verifiedSourceIds,
  withRetrievedItems,
} from "../../src/lib/case-system/intelligence/groundedCognition";
import { appliedLawEnabled } from "../../src/lib/content-library/phaseScope";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CORPUS = path.join(ROOT, "docs", "sources", "corpus");
const read = (relative: string) => readFileSync(path.join(ROOT, relative), "utf8");

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

type Entry = { id: string; title: string; citation?: string; url: string; file: string };
const manifest = JSON.parse(readFileSync(path.join(CORPUS, "manifest.json"), "utf8")) as { entries: Entry[] };
const entry = (id: string) => manifest.entries.find((item) => item.id === id)!;
const chunksOf = (id: string) => chunkSource(entry(id), readFileSync(path.join(CORPUS, entry(id).file), "utf8"));

async function main() {
  // ---------------------------------------------------------------- 1. the cut
  console.log("\n1. Passages are cut on the law's own boundaries");

  const all: { entry: Entry; chunks: CorpusChunk[] }[] = manifest.entries
    .filter((item) => existsSync(path.join(CORPUS, item.file)))
    .map((item) => ({ entry: item, chunks: chunkSource(item, readFileSync(path.join(CORPUS, item.file), "utf8")) }));
  const passages = all.flatMap((item) => item.chunks);

  check("the corpus yields passages", passages.length > 1000, `${passages.length} passages`);
  check("every passage id is unique", new Set(passages.map((item) => item.id)).size === passages.length);

  // The first passage of every provision starts with that provision's number,
  // so a pinpoint is the provision the words come from.
  const misnumbered: string[] = [];
  for (const { entry: source, chunks } of all) {
    if (!isLegislation(source)) continue;
    const seen = new Set<string>();
    for (const chunk of chunks) {
      const number = chunk.pinpoint.split(" ")[1];
      if (seen.has(number)) continue;
      seen.add(number);
      const ok = chunk.text.startsWith(`${number} `) || chunk.text.startsWith(`${number}.`) || /^RULE /.test(chunk.text);
      if (!ok) misnumbered.push(`${chunk.id} ${chunk.pinpoint}: ${chunk.text.slice(0, 60)}`);
    }
  }
  check("each provision's first passage starts with its own number", misnumbered.length === 0, misnumbered.slice(0, 5).join(" | "));

  // ...and starts on the provision, not on the wrapped end of the one before
  // ("8.09.1.  O. Reg. 521/22, s. 4." closes r. 8.09).
  const startsOnReference = passages.filter((chunk) =>
    /^[\d.]+\.?\s+(O\. Reg\.|R\.S\.O\.|R\.R\.O\.|S\.O\.|R\.S\.,|SOR\/|\d{4}, c\.)/.test(chunk.text),
  );
  check("no passage starts on a wrapped history reference", startsOnReference.length === 0, startsOnReference.slice(0, 3).map((chunk) => chunk.id).join(", "));

  // A passage carrying another provision's amendment history ("..., c. N.1,
  // s. 4") has swallowed that provision. A few cross-references read the same
  // way, so the bound is a tripwire, not zero: it was 1318 passages before the
  // section detector was fixed and 9 after (2026-10-05).
  let swallowed = 0;
  let legislationPassages = 0;
  for (const { entry: source, chunks } of all) {
    if (!isLegislation(source) || !source.citation) continue;
    const own = /(c\. [A-Z0-9.]+(?:, Sched\. [A-Z0-9]+)?|Reg\. \d+(?:\/\d+)?)$/.exec(source.citation)?.[1];
    if (!own) continue;
    const history = new RegExp(own.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") + ",\\s*[sr]\\.\\s*(\\d+(?:\\.\\d+)*)", "g");
    for (const chunk of chunks) {
      legislationPassages += 1;
      const number = chunk.pinpoint.split(" ")[1];
      if ([...chunk.text.matchAll(history)].some((match) => match[1] !== number)) swallowed += 1;
    }
  }
  check(
    "fewer than 1 in 200 legislation passages carry another provision's history",
    swallowed * 200 < legislationPassages,
    `${swallowed} of ${legislationPassages}`,
  );

  check("no passage holds a not-in-force note", !passages.some((item) => /Note: On |\(See:/.test(item.text)));
  check(
    "no passage holds page furniture",
    !passages.some((item) => /strongly disagree|was this information helpful|enable javascript/i.test(item.text)),
  );

  // The reference cases, each a bug this suite exists to keep fixed.
  const fla46 = chunksOf("family-law-act").find((item) => item.pinpoint.startsWith("s. 46 (1)"));
  check(
    "FLA s. 46 (1): the in-force wording is there",
    Boolean(fla46?.text.includes("reasonable grounds to fear for his or her own safety")),
  );
  check(
    "FLA s. 46: the proclaimed-later replacements are not",
    Boolean(fla46) &&
      !fla46!.text.includes("on the application of,") &&
      !fla46!.text.includes("in clause (1) (a) or with any child in that person"),
  );
  const r901 = chunksOf("oreg-258-98-small-claims-rules").find((item) => item.pinpoint === "r. 9.01");
  check("Small Claims r. 9.01 is its own passage, with its 20 days", Boolean(r901?.text.includes("within 20 days of being served")));
  const r2004 = chunksOf("rules-of-civil-procedure").find((item) => item.pinpoint.startsWith("r. 20.04"));
  check(
    "civil r. 20.04 survives its revoked subrule (1) with the summary judgment test",
    Boolean(r2004?.text.includes("The court shall grant summary judgment if")),
  );
  const civil = chunksOf("rules-of-civil-procedure").map((item) => item.pinpoint);
  check(
    "civil r. 24.02 sorts before r. 24.1.01 (subrules are the two-digit part)",
    civil.some((pin) => pin.startsWith("r. 24.02")) && civil.some((pin) => pin.startsWith("r. 24.1.01")),
  );
  const flr24 = chunksOf("family-law-rules").filter((item) => item.pinpoint.startsWith("r. 24 ("));
  check("Family Law Rules cite by rule and subrule", flr24.length > 1, flr24.map((item) => item.pinpoint).join(", "));
  const divorce = chunksOf("divorce-act").find((item) => item.pinpoint.startsWith("s. 16.9 ("));
  check("Divorce Act s. 16.9 (relocation notice) is found", Boolean(divorce?.text.includes("relocation")));
  const divorcePins = chunksOf("divorce-act").map((item) => item.pinpoint);
  check(
    "a statute's s. 16.91-16.96 follow s. 16.9 (only court rules sort by a two-digit subrule)",
    ["s. 16.91", "s. 16.92", "s. 16.93", "s. 16.94"].every((pin) => divorcePins.some((candidate) => candidate === pin || candidate.startsWith(`${pin} (`))),
    divorcePins.filter((pin) => pin.startsWith("s. 16.9")).join(", "),
  );
  check("CJA s. 21.10 is its own passage", chunksOf("cja-courts-of-justice-act").some((item) => item.pinpoint.startsWith("s. 21.10")));
  check(
    "a web page is cut into passages without a pinpoint",
    chunksOf("guide-making-a-claim").length > 2 && chunksOf("guide-making-a-claim").every((item) => item.pinpoint === ""),
  );

  // Every passage is the source's own words: walked as runs, each run is
  // verbatim in the source (whitespace collapsed). Runs break only where a
  // note, history line or page furniture was removed.
  const sample = ["oreg-258-98-small-claims-rules", "family-law-act", "divorce-act", "guide-making-a-claim", "cleo-tribunals-and-courts-how-do-i-collect-money-i-am-owed"];
  const notVerbatim: string[] = [];
  for (const id of sample) {
    const flat = collapse(readFileSync(path.join(CORPUS, entry(id).file), "utf8"));
    for (const chunk of chunksOf(id)) {
      let rest = chunk.text;
      while (rest.length > 0) {
        let low = 0;
        let high = rest.length;
        while (low < high) {
          const mid = Math.ceil((low + high) / 2);
          if (flat.includes(rest.slice(0, mid))) low = mid;
          else high = mid - 1;
        }
        if (low < 12 && rest.length >= 12) {
          notVerbatim.push(`${chunk.id}: "${rest.slice(0, 40)}"`);
          break;
        }
        rest = rest.slice(Math.max(low, 1)).trimStart();
      }
    }
  }
  check("passages are verbatim runs of their source", notVerbatim.length === 0, notVerbatim.slice(0, 3).join(" | "));

  // ---------------------------------------------------------------- 1b. decisions
  console.log("\n1b. Court decisions: the majority's reasoning only, under its own paragraph numbers");
  const decisionText = (id: string) => {
    const source = DECISION_SOURCES.find((item) => item.id === id)!;
    return { source, text: readFileSync(path.join(ROOT, "docs", "sources", source.path), "utf8") };
  };
  const decisionChunks = (id: string) => {
    const { source, text } = decisionText(id);
    return chunkDecision(source, text);
  };
  const titleMismatch = DECISION_SOURCES.filter((source) => {
    const file = path.join(ROOT, "docs", "sources", source.path);
    if (!existsSync(file)) return true;
    const head = collapse(readFileSync(file, "utf8").slice(0, 20000)).replace(/[‘’']/g, "'");
    const short = source.title.replace(/[‘’']/g, "'").split(" v. ")[0];
    return !head.includes(short) || !(head.includes(source.citation) || head.includes(source.citation.replace("SCC", "CSC")) || source.citation.startsWith("["));
  });
  check("every decision's file exists and names the case and citation its registry entry gives", titleMismatch.length === 0, titleMismatch.map((source) => source.id).join(", "));
  check("every decision links to a public page", DECISION_SOURCES.every((source) => source.readableUrl.startsWith("https://")));
  const everyDecisionChunk = DECISION_SOURCES.flatMap((source) => decisionChunks(source.id));
  check("decisions yield passages", everyDecisionChunk.length > 500, `${everyDecisionChunk.length}`);
  check(
    "no decision passage is a dissent (no paragraph opens by naming its author \"dissenting\")",
    !everyDecisionChunk.some((chunk) => /(^|\] )[A-Z][\w'’.\- ]{0,60}?(C\.J\.|J\.|JJ\.)[^—]{0,10}\((dissenting|dissident)/.test(chunk.text)),
  );
  const honda = decisionChunks("decision-honda");
  const hondaParas = honda.flatMap((chunk) => (chunk.pinpoint.match(/\d+/g) ?? []).map(Number));
  check("Honda v. Keays: the majority's para. 28 (the Bardal factors) is there", honda.some((chunk) => chunk.text.includes("the character of the employment, the length of service")));
  check("Honda v. Keays: the dissent (paras. 81 on) is not", Math.max(...hondaParas) <= 80, `max para ${Math.max(...hondaParas)}`);
  check("Honda v. Keays: \"Decisions Below\" (paras. 8-18) is not", !hondaParas.some((para) => para >= 8 && para <= 18));
  const pecore = decisionChunks("decision-pecore").flatMap((chunk) => (chunk.pinpoint.match(/\d+/g) ?? []).map(Number));
  check("Pecore: the majority runs to para. 76 and Abella J.'s dissent (77 on) is not there", Math.max(...pecore) === 76, `max ${Math.max(...pecore)}`);
  const southcott = decisionChunks("decision-southcott").flatMap((chunk) => (chunk.pinpoint.match(/\d+/g) ?? []).map(Number));
  check(
    "Southcott: a majority whose heading the extraction lost is still found; the dissent (64 on) is not",
    southcott.length > 0 && Math.max(...southcott) <= 63,
    `max ${Math.max(...southcott)}`,
  );
  const machtinger = decisionChunks("decision-machtinger");
  check(
    "Machtinger: the Court of Appeal's view the Court reversed (\"Judgments Below\") is never a passage",
    machtinger.length > 5 && !machtinger.some((chunk) => /Howland C\.J\.O\. held that Pickup|limited to the benefits conferred by the Act/.test(chunk.text)),
  );
  check(
    "Machtinger: the Court's own holding on minimum notice is there",
    machtinger.some((chunk) => chunk.text.includes("an approach more consistent with the objects of the Act")),
  );
  check(
    "a separate concurrence is not the majority (Machtinger: McLachlin J.'s reasons are left out)",
    !machtinger.some((chunk) => chunk.text.includes("I agree with my colleague Justice Iacobucci")),
  );
  const decisionNotVerbatim: string[] = [];
  for (const id of ["decision-honda", "decision-machtinger", "decision-brake", "decision-garland"]) {
    const { text } = decisionText(id);
    const flat = collapse(text);
    for (const chunk of decisionChunks(id)) {
      let rest = chunk.text;
      while (rest.length > 0) {
        let low = 0;
        let high = rest.length;
        while (low < high) {
          const mid = Math.ceil((low + high) / 2);
          if (flat.includes(rest.slice(0, mid))) low = mid;
          else high = mid - 1;
        }
        if (low < 12 && rest.length >= 12) {
          // A paragraph number set on its own line (and a page header dropped
          // after it) is a run of its own: "9", then the paragraph's text.
          const token = /^\S{1,4}\s/.exec(rest);
          if (token && /^\d+\s$/.test(token[0])) {
            rest = rest.slice(token[0].length);
            continue;
          }
          decisionNotVerbatim.push(`${chunk.id}: "${rest.slice(0, 40)}"`);
          break;
        }
        rest = rest.slice(Math.max(low, 1)).trimStart();
      }
    }
  }
  check("decision passages are verbatim runs of the judgment's text", decisionNotVerbatim.length === 0, decisionNotVerbatim.slice(0, 3).join(" | "));
  check("no soft hyphens left in a decision's text", !everyDecisionChunk.some((chunk) => chunk.text.includes("\u00AD")));

  // ---------------------------------------------------------------- 1c. the labelled set
  console.log("\n1c. Every label in the recall set points at a provision that says what the label claims");
  const badLabels: string[] = [];
  for (const story of RECALL_SET) {
    for (const label of story.expect) {
      const chunks = label.source.startsWith("decision-")
        ? decisionChunks(label.source)
        : manifest.entries.some((item) => item.id === label.source)
          ? chunksOf(label.source)
          : [];
      const provision = label.section
        ? chunks.filter((chunk) => chunk.pinpoint.split(" ")[1] === label.section)
        : chunks;
      if (!provision.some((chunk) => chunk.text.toLowerCase().includes(label.phrase.toLowerCase()))) {
        badLabels.push(`${story.id}: ${label.source} ${label.section ?? ""} "${label.phrase}"`);
      }
    }
  }
  check(
    `all ${RECALL_SET.reduce((sum, story) => sum + story.expect.length, 0)} labels in ${RECALL_SET.length} stories are confirmed by the provision's own text`,
    badLabels.length === 0,
    badLabels.join(" | "),
  );
  check("story ids are unique", new Set(RECALL_SET.map((story) => story.id)).size === RECALL_SET.length);

  // ---------------------------------------------------------------- 2. links
  console.log("\n2. Each passage links to the page a person can read");
  const url = (value: string) => readableUrl({ id: "x", title: "x", url: value });
  check("an e-Laws regulation .doc links to its regulation page", url("https://www.ontario.ca/laws/docs/980258_e.doc") === "https://www.ontario.ca/laws/regulation/980258");
  check("an e-Laws statute .doc links to its statute page", url("https://www.ontario.ca/laws/docs/90c43_e.doc") === "https://www.ontario.ca/laws/statute/90c43");
  check("the elaws_statutes_ form maps the same way", url("https://www.ontario.ca/laws/docs/elaws_statutes_90n01_e.doc") === "https://www.ontario.ca/laws/statute/90n01");
  check("a schedule suffix is dropped (19c07c -> 19c07)", url("https://www.ontario.ca/laws/docs/19c07c_e.doc") === "https://www.ontario.ca/laws/statute/19c07");
  check("a federal FullText page links to the act", url("https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html") === "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/");

  // ---------------------------------------------------------------- 3. search
  console.log("\n3. Search finds by meaning, within the court, without crowding");

  // A synthetic index over real passages: each passage gets a direction, and
  // queries are built from those directions. What is tested is the search,
  // the court scope and the re-read, not OpenAI's embeddings.
  const dims = 16;
  const picks: { chunk: CorpusChunk; source: IndexedSource }[] = [];
  const sources: Record<string, IndexedSource> = {};
  const want = [
    ["oreg-258-98-small-claims-rules", 6],
    ["family-law-rules", 2],
    ["residential-tenancies-act-2006", 2],
    ["rules-of-civil-procedure", 2],
  ] as const;
  for (const [id, count] of want) {
    const source: IndexedSource = { ...entry(id), readableUrl: readableUrl(entry(id)), tier: "legislation" };
    sources[id] = source;
    for (const chunk of chunksOf(id).slice(0, count)) picks.push({ chunk, source });
  }
  const axis = (row: number) => Array.from({ length: dims }, (_, d) => (d === row ? 1 : d === (row + 1) % dims ? 0.3 : 0));
  const vectors = new Int8Array(picks.length * dims);
  picks.forEach((_, row) => vectors.set(quantize(axis(row)), row * dims));
  const meta: CorpusIndexMeta = {
    generatedAt: "test",
    model: "test",
    dimensions: dims,
    sources,
    chunks: picks.map(({ chunk, source }) => [chunk.id, passageHash(chunk, source)]),
  };
  const index: LoadedIndex = { meta, vectors, root: ROOT };

  const nearest = searchIndex(index, [axis(7)], { perQuery: 1, minScore: 0 });
  check("the nearest passage to a query is returned first", nearest[0]?.id === picks[7].chunk.id, JSON.stringify(nearest[0]));

  // Six queries that each point at a different Small Claims passage, plus
  // weaker matches elsewhere: each query keeps its own best passage even past
  // the per-source ceiling, which then applies to the rest.
  const crowd = searchIndex(index, picks.slice(0, 6).map((_, row) => axis(row)), { perQuery: 2, minScore: 0, total: 12 });
  check(
    "every query keeps its best passage",
    picks.slice(0, 6).every(({ chunk }) => crowd.some((hit) => hit.id === chunk.id)),
    crowd.map((hit) => hit.id).join(", "),
  );
  const filler = searchIndex(index, [axis(0), axis(1)], { perQuery: 6, minScore: 0, total: 12 });
  check(
    "beyond each query's best, no more than four passages from one source",
    filler.filter((hit) => hit.sourceId === "oreg-258-98-small-claims-rules").length <= 4,
    filler.map((hit) => hit.id).join(", "),
  );

  const familyHits = searchIndex(index, picks.map((_, row) => axis(row)), {
    perQuery: 1,
    minScore: 0,
    excludeSource: (id) => excludedForCourt("family", id),
  });
  check(
    "a family case is never handed Small Claims or civil procedure",
    familyHits.length > 0 && familyHits.every((hit) => hit.sourceId !== "oreg-258-98-small-claims-rules" && hit.sourceId !== "rules-of-civil-procedure"),
    familyHits.map((hit) => hit.sourceId).join(", "),
  );
  check("a family case can still get substantive law (tenancies)", familyHits.some((hit) => hit.sourceId === "residential-tenancies-act-2006"));
  check(
    "a Small Claims case is never handed the family or civil rules",
    excludedForCourt("small-claims", "family-law-rules") && excludedForCourt("small-claims", "rules-of-civil-procedure") && !excludedForCourt("small-claims", "oreg-258-98-small-claims-rules"),
  );
  check(
    "a civil case is never handed the Small Claims rules or guides",
    excludedForCourt("civil", "oreg-258-98-small-claims-rules") && excludedForCourt("civil", "guide-making-a-claim") && !excludedForCourt("civil", "rules-of-civil-procedure"),
  );
  check(
    "a query naming a law names it (\"under the Residential Tenancies Act, 2006\")",
    [...namedSources(index, "May a landlord keep a rent deposit under the Residential Tenancies Act, 2006?")].join() === "residential-tenancies-act-2006",
  );
  check("a law the query does not name is not named", namedSources(index, "What is a rent deposit?").size === 0);
  // Two passages equally near the query; naming one's law puts it first.
  const tie = picks.findIndex((pick) => pick.source.id === "residential-tenancies-act-2006");
  const tieQuery = axis(tie).map((value, d) => (d === 0 ? 1 : value));
  const plain = searchIndex(index, [tieQuery], { perQuery: 2, minScore: 0 });
  const lifted = searchIndex(index, [tieQuery], { perQuery: 2, minScore: 0, namedSources: [new Set(["residential-tenancies-act-2006"])] });
  check(
    `naming a law lifts its passages by ${NAMED_SOURCE_BOOST}, no more`,
    lifted[0]?.sourceId === "residential-tenancies-act-2006" &&
      Math.abs((lifted.find((hit) => hit.id === picks[tie].chunk.id)?.score ?? 0) - (plain.find((hit) => hit.id === picks[tie].chunk.id)?.score ?? 0) - NAMED_SOURCE_BOOST) < 1e-9,
    JSON.stringify({ plain, lifted }),
  );
  check("nothing scores below the floor", searchIndex(index, [axis(3).map((v) => -v)], { minScore: 0.2 }).length === 0);

  // ---------------------------------------------------------------- 4. re-read
  console.log("\n4. A hit is re-read from the source, and a stale one is refused");
  const fresh = readPassage(index, picks[0].chunk.id, 0.9);
  check("a hit's words are re-cut from the vendored file", fresh?.text === picks[0].chunk.text);
  const staleMeta: CorpusIndexMeta = { ...meta, chunks: meta.chunks.map(([id], row) => [id, row === 1 ? "0000000000000000" : meta.chunks[row][1]]) };
  const stale = readPassage({ ...index, meta: staleMeta }, picks[1].chunk.id, 0.9);
  check("a passage whose text changed since indexing is not served", stale === null);
  check("an id from a source the index does not hold is refused", readPassage(index, "corpus:no-such-source:0", 0.9) === null);

  // ---------------------------------------------------------------- 5. the pipeline
  console.log("\n5. The pipeline: queries, embeddings, items -- and failure is harmless");
  check(
    "queries are cleaned: strings only, de-duplicated, capped at six",
    JSON.stringify(parseQueries('{"queries":["a rent deposit when the tenancy ends","a rent deposit when the tenancy ends",4,"x","q2 about service of a claim","q3 time to file a defence","q4 x x x x","q5 y y y y","q6 z z z z","q7 w w w w"]}')) ===
      JSON.stringify(["a rent deposit when the tenancy ends", "q2 about service of a claim", "q3 time to file a defence", "q4 x x x x", "q5 y y y y", "q6 z z z z"]),
  );
  check("a response that is not JSON gives no queries", parseQueries("not json").length === 0);

  let embedded: string[] = [];
  const story = "I was served with a claim by my old landlord saying I owe rent. I moved out in June and he kept my deposit.";
  const result = await retrieveForStory(
    { story, courtPath: "small-claims", stage: "responding", side: "defendant" },
    {
      index,
      writeQueries: async () => ["time for a defendant to file a defence after service", "landlord rent deposit at end of tenancy"],
      embed: async (texts) => {
        embedded = texts;
        return [axis(0), axis(8)];
      },
    },
  );
  check("retrieval returns citable items", result.items.length >= 2, `${result.items.length} items, skipped=${result.skipped}`);
  check("the embeddings call is sent the legal queries, not the story", embedded.length === 2 && !embedded.some((text) => text.includes("landlord saying")));
  const item = result.items.find((candidate) => candidate.id === picks[0].chunk.id);
  check(
    "an item carries the passage's words, its pinpoint and the readable page",
    Boolean(item && item.text === picks[0].chunk.text && item.citation?.includes(picks[0].chunk.pinpoint) && item.sourceUrl.startsWith("https://www.ontario.ca/laws/regulation/")),
    JSON.stringify(item)?.slice(0, 200),
  );
  const decisionSource = DECISION_SOURCES.find((source) => source.id === "decision-honda")!;
  const decisionItem = passageItem({
    ...decisionChunks("decision-honda")[5],
    source: { ...decisionSource, readableUrl: decisionSource.readableUrl, tier: "case-law", file: "x", path: decisionSource.path },
    score: 1,
  });
  check(
    "a decision passage is labelled as a court decision, with the case, citation and paragraph",
    decisionItem.kind === "decision" && decisionItem.label.startsWith("Court decision: Honda Canada Inc. v. Keays, 2008 SCC 39, para"),
    decisionItem.label,
  );
  check(
    "a guidance passage is labelled as guidance, not legislation",
    passageItem({ ...picks[0].chunk, source: { ...picks[0].source, tier: "practical" }, score: 1 }).label.startsWith("Official or public-legal-education guidance"),
  );

  const failing = await retrieveForStory(
    { story, courtPath: "small-claims" },
    { index, writeQueries: async () => { throw new Error("boom"); }, embed: async () => [] },
  );
  check("a failure resolves to nothing instead of throwing", failing.items.length === 0 && failing.skipped === "error");
  const noIndex = await retrieveForStory({ story, courtPath: "civil" }, { index: null });
  check("with no index built, retrieval adds nothing", noIndex.items.length === 0 && noIndex.skipped === "no index");

  // ---------------------------------------------------------------- 5b. cross-references
  console.log("\n5b. A found provision brings the provisions it points to, in the same law only");
  const refs = (text: string, own?: string) => JSON.stringify(referencedProvisions(text, own));
  check(
    "\"an order made under section 9 or 10\" points to ss. 9 and 10, and amendment history (\"2009, c. 11, s. 26\") points nowhere",
    refs("(3) An order made under section 9 or 10 may provide for a transfer. 2009, c. 11, s. 26.") === JSON.stringify([{ number: "9" }, { number: "10" }]),
  );
  check(
    "a reference into another law is not followed (\"section 67.2 or ... section 67.7 of that Act\")",
    refs("determined in accordance with section 67.2 or, in the case of a variable benefit account, section 67.7 of that Act.") === "[]" &&
      refs("sections 19 and 20 of the Pooled Registered Pension Plans Act, 2015 apply") === "[]",
  );
  check("\"of this Act\" is the same law", refs("Despite section 4 of this Act, the court may") === JSON.stringify([{ number: "4" }]));
  check("a subrule reference keeps its subrule", refs("in accordance with subrule 8.01 (4).") === JSON.stringify([{ number: "8.01", sub: "4" }]));
  check("a range yields its two ends", refs("rules 24.02 to 24.05 apply") === JSON.stringify([{ number: "24.02" }, { number: "24.05" }]));
  check(
    "\"subsection (6)\" with no number is the passage's own section",
    refs("the payment required by subsection (6)", "106") === JSON.stringify([{ number: "106", sub: "6" }]) && refs("the payment required by subsection (6)") === "[]",
  );
  const scChunks = chunksOf("oreg-258-98-small-claims-rules");
  check("a subrule resolves to the passage holding it", findProvision(scChunks, { number: "8.01", sub: "4" })?.pinpoint.startsWith("r. 8.01 (1)") === true);
  check("a provision the law does not have resolves to nothing", findProvision(scChunks, { number: "99.99" }) === null);

  // Followed against a synthetic index holding the whole Family Law Act, so
  // the passages read back are the real ones.
  const flaSource: IndexedSource = { ...entry("family-law-act"), readableUrl: readableUrl(entry("family-law-act")), tier: "legislation" };
  const flaChunks = chunksOf("family-law-act");
  const flaIndex: LoadedIndex = {
    meta: { generatedAt: "test", model: "test", dimensions: 1, sources: { "family-law-act": flaSource }, chunks: flaChunks.map((chunk) => [chunk.id, passageHash(chunk, flaSource)]) },
    vectors: new Int8Array(flaChunks.length),
    root: ROOT,
  };
  const s101 = flaChunks.find((chunk) => chunk.pinpoint.startsWith("s. 10.1 (3)"))!;
  const followed = followCrossReferences(flaIndex, [{ ...s101, source: flaSource, score: 0.8 }]);
  check(
    "FLA s. 10.1 (3) brings ss. 9 and 10, marked as referred to, at the referring passage's score",
    followed.length === 2 && followed.every((passage) => passage.referredBy === s101.pinpoint && passage.score === 0.8) &&
      followed.some((passage) => passage.pinpoint.startsWith("s. 9 ")) && followed.some((passage) => passage.pinpoint.startsWith("s. 10 ")),
    followed.map((passage) => passage.pinpoint).join(", "),
  );
  check("a followed passage says which provision referred to it", passageItem(followed[0]).label.includes(`(referred to in ${s101.pinpoint})`));
  const input = [{ ...s101, source: flaSource, score: 0.8 }, ...followed];
  check(
    "a passage already found is not added again",
    followCrossReferences(flaIndex, input).every((passage) => !input.some((existing) => existing.id === passage.id)),
  );
  const many = flaChunks.slice(0, 40).map((chunk) => ({ ...chunk, source: flaSource, score: 0.5 }));
  check("following is capped (six in all)", followCrossReferences(flaIndex, many).length <= 6);
  check(
    "a decision's references are not followed",
    followCrossReferences(flaIndex, [{ ...s101, source: { ...flaSource, tier: "case-law" }, score: 0.8 }]).length === 0,
  );

  // ---------------------------------------------------------------- 6. the gate
  console.log("\n6. A retrieved passage is citable only through the quote check");
  const basePack = buildSourcePack({ stage: "responding", side: "defendant" });
  const pack = withRetrievedItems(basePack, result.items);
  check("retrieved items join the pack", result.items.every((candidate) => pack.byId.has(candidate.id)));
  check("the catalogue items are kept", basePack.items.every((candidate) => pack.byId.get(candidate.id) === candidate));
  check("an id already in the pack is not replaced", withRetrievedItems(pack, [{ ...result.items[0], text: "changed" }]).byId.get(result.items[0].id)?.text === result.items[0].text);

  const passage = result.items[0];
  const goodQuote = passage.text.split(" ").slice(2, 12).join(" ");
  const { cognition } = verifyGroundedCognition(
    {
      nextBestActions: [
        { text: "Check the time limit the rule sets for this step.", sourceIds: [passage.id], quote: goodQuote },
        { text: "The court must rule for you within 5 days.", sourceIds: [passage.id], quote: "the court must rule for you within 5 days" },
        { text: "File the form within 10 days.", sourceIds: ["corpus:oreg-258-98-small-claims-rules:99999"], quote: goodQuote },
      ],
    } as Record<string, unknown>,
    pack,
  );
  const kept = (cognition as { nextBestActionSources?: { text: string; sourceUrl?: string }[] }).nextBestActionSources ?? [];
  check("a statement quoting the retrieved passage is kept, with its link", kept.some((action) => action.text.startsWith("Check the time limit") && action.sourceUrl === passage.sourceUrl));
  check("a statement whose quote is not in the passage is dropped", !kept.some((action) => action.text.includes("within 5 days")));
  check("a corpus id retrieval did not supply is dropped", !kept.some((action) => action.text.includes("within 10 days")));

  const prompt = sourcePackForPrompt(pack);
  check("the prompt lists the retrieved passages", prompt.includes(`[${passage.id}]`));
  check("the prompt warns that a search hit may not govern these facts", /found by searching/.test(prompt) && /condition, exception or time limit/.test(prompt));
  check("a pack with no retrieved items carries no such warning", !/found by searching/.test(sourcePackForPrompt(basePack)));

  // ---------------------------------------------------------------- 6b. applied law
  console.log("\n6b. The person sees the law their analysis rests on -- verified, verbatim, switchable");
  const cited = verifiedSourceIds(
    {
      claimClassifications: [{ elements: [{ sourceIds: [passage.id], quote: goodQuote }] }],
      litigationRisks: [{ sourceIds: [result.items[1].id], quote: "words that are not in the passage at all" }],
      formRecommendations: [{ sourceIds: ["corpus:not-in-pack:1"], quote: goodQuote }],
    },
    pack,
  );
  check("a citation with a verified quote counts, wherever it sits in the response", cited.has(passage.id));
  check("a citation whose quote fails does not", !cited.has(result.items[1].id));
  check("an id outside the pack does not", !cited.has("corpus:not-in-pack:1"));
  check("the applied-law switch is on unless APPLIED_LAW=off", appliedLawEnabled({}) && !appliedLawEnabled({ APPLIED_LAW: "off" }));

  // ---------------------------------------------------------------- 7. wiring
  console.log("\n7. Wiring");
  const brain = read("src/lib/case-system/intelligence/courtSimplifiedBrain.ts");
  check("the brain starts retrieval before normalizing the intake", brain.indexOf("retrieveForStory(") > 0 && brain.indexOf("retrieveForStory(") < brain.indexOf("await normalizeIntake(input)"));
  check("retrieved items join the pack the analysis is given", /withRetrievedItems\(\s*buildSourcePack\(/.test(brain) && /runStructuredGptCognition\(\s*input,\s*normalizedIntake,\s*sourcePack/.test(brain));
  check("the gate checks against that same pack", /verifyGroundedCognition\(structuredCognition as unknown as Record<string, unknown>, sourcePack\)/.test(brain));
  check("retrieval is skipped when the analysis will not call the model", /allowExternalCognition === false\s*\?\s*Promise\.resolve\(null\)/.test(brain));
  check(
    "applied law is the retrieved passages the model cited with a verified quote, behind its switch",
    /verifiedSourceIds\(structuredCognition, sourcePack\)/.test(brain) &&
      /appliedLawEnabled\(\)\s*\?\s*sourcePack\.items\s*\.filter\(\(item\) => isRetrievedItem\(item\) && citedIds\.has\(item\.id\)\)/.test(brain),
  );
  check(
    "applied law carries the source's words only (id, label, citation, text, link)",
    /\.map\(\(\{ id, label, citation, text, sourceUrl, kind \}\)/.test(brain),
  );
  for (const [court, file] of [
    ["Small Claims", "src/lib/case-system/intelligence/smallClaimsIntelligenceEngine.ts"],
    ["civil", "app/builder/_components/CivilIntake.tsx"],
    ["family", "app/builder/_components/familyAnalysis.ts"],
  ]) {
    check(`the ${court} analysis carries applied law to the page`, /appliedLaw: (result\.brain\.)?intelligence\.appliedLaw/.test(read(file)));
  }
  const panel = read("app/_components/AppliedLawPanel.tsx");
  check("the overview renders the panel", /<AppliedLawPanel items=\{analysis\.appliedLaw\}/.test(read("app/builder/_components/IntelligenceOverviewPanel.tsx")));
  check(
    "the panel shows the provision's text, citation and official link, and says it is not a view on the outcome",
    panel.includes("{item.text}") && panel.includes("item.citation || item.label") && panel.includes("publicSourceUrl(item.sourceUrl)") && panel.includes("not how your case"),
  );
  check(
    "the panel says a court decision is an earlier case and has not been checked for later changes",
    /item\.kind === "decision"/.test(panel) && panel.includes("has not been checked for later decisions"),
  );
  check("the prompt tells the analysis a court decision is not legislation", /Court decision/.test(sourcePackForPrompt(withRetrievedItems(basePack, [decisionItem]))));

  const retrieval = read("src/lib/case-system/retrieval/storyRetrieval.ts");
  check("the retrieval calls are in the audit log", (retrieval.match(/withAiCallContext\(/g) ?? []).length >= 2);
  check("the query step is told to leave out personal details", /leave out every name, address, date, amount and other personal detail/.test(QUERY_SYSTEM_PROMPT));
  check("the audit log redacts the queries", /"queries"/.test(read("src/lib/audit/aiCallLog.ts")));
  check("the client wraps embeddings in the audit log", /embeddings\.create = [\s\S]{0,120}observeAiCall/.test(read("src/lib/case-system/openaiClient.ts")));

  const config = read("next.config.ts");
  check(
    "the three analysis routes ship the index and corpus",
    ["/api/small-claims/analyze", "/api/civil/analyze", "/api/family/analyze"].every((route) => config.includes(`"${route}": RETRIEVAL_FILES`)) &&
      config.includes("./docs/sources/retrieval/**") &&
      config.includes("./docs/sources/corpus/*.txt") &&
      config.includes("./docs/sources/decisions/*.txt"),
  );

  // ---------------------------------------------------------------- 8. the index
  console.log("\n8. The built index, when present");
  const metaPath = path.join(ROOT, "docs", "sources", "retrieval", "corpus-index.json");
  const binPath = path.join(ROOT, "docs", "sources", "retrieval", "corpus-vectors.bin");
  if (!existsSync(metaPath)) {
    console.log("  --    not built yet (the Corpus Index workflow builds it); retrieval adds nothing until it is");
  } else {
    const built = JSON.parse(readFileSync(metaPath, "utf8")) as CorpusIndexMeta;
    const bytes = existsSync(binPath) ? readFileSync(binPath).byteLength : -1;
    check("the vectors file matches the index (rows x dimensions)", bytes === built.chunks.length * built.dimensions, `${bytes} bytes for ${built.chunks.length} x ${built.dimensions}`);
    check("every indexed source has its text file", Object.values(built.sources).every((source) => existsSync(sourceTextPath(ROOT, source))));
    check("index ids are unique", new Set(built.chunks.map(([id]) => id)).size === built.chunks.length);
    const current = new Map([...passages, ...everyDecisionChunk].map((chunk) => [chunk.id, chunk]));
    let fresh = 0;
    for (const [id, hash] of built.chunks) {
      const chunk = current.get(id);
      const source = built.sources[id.split(":")[1]];
      if (chunk && source && passageHash(chunk, source) === hash) fresh += 1;
    }
    // Reported, not failed: a re-vendored source makes some vectors stale,
    // readPassage skips those, and the workflow rebuilds them. Failing here
    // would punish vendoring a source.
    console.log(`  info  ${fresh} of ${built.chunks.length} indexed passages match the corpus as it is now; ${current.size - fresh} passages are not yet indexed`);
  }

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

void main();
