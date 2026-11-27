/**
 * Every published sentence that was checked against a quote shows that quote,
 * one click away, with its citation; and the answer's source list names every
 * section and rule those quotes sit in (site owner, 2026-10-29, "exact words"
 * step 1).
 *
 * THE PRINCIPLE. Every legal statement shown has a plain sentence plus the
 * exact words of the official source one click away, with the citation.
 *
 * WHAT IT CATCHES:
 *   (a) a published sentence whose verdict carries a found quote, shown on
 *       the full answer or in the next-step card's lead paragraph, without an
 *       "Exact words" control; a control whose words are not the stored quote
 *       (every part, joined, must equal it), or whose citation does not name
 *       the verdict's source. The renderer used to drop the quote: only six
 *       sentences (sentenceRules.ts) showed one.
 *   (b) a section or rule a shown sentence's quote sits in that the answer's
 *       Sources list leaves out. Found 2026-10-29: Limitations Act s. 16 (1)
 *       (h.1) and (h.2) after PR #519, and s. 15 (2) on the Small Claims
 *       "deciding whether to sue" answer, were dropped because a source
 *       already listed was skipped. The pinpoints are placed afresh here from
 *       the saved text (pinpointsForQuote), not read from the generated file,
 *       so a stale or emptied file cannot make this pass.
 *   (c) a control beside a sentence with no checked quote (the "stage-premise"
 *       descriptions, whose quote was not found in any source).
 *   (d) the generated placing (quotePinpoints.generated.json) going stale.
 *
 * WHAT IT DOES NOT ASSERT: which sentences exist or how many; a sentence the
 * screen deliberately shows as the rule's own words instead (the leave rule,
 * leaveRuleWords.ts) is exempt, because those words already carry their
 * citation in the text.
 *
 * Runs the real route (createStageAnswerPost, no auth wrapper) and the real
 * components (AnswerView, NextStepCard) through react-dom/server. No network,
 * no model, no database.
 *
 * Run: npm run test:exact-words
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AnswerView, NextStepCard, shownOnScreen } from "../../app/builder/_components/StageAnswerPanel";
import { createStageAnswerPost } from "../../app/api/case/stage-answer/route";
import { buildQuotePinpoints, pinpointsForQuote } from "../content/buildVerdictSources";
import { findStage } from "../../src/lib/case-system/stage-map/stageMap";
import { sourceDisplayFor, NOT_A_SOURCE } from "../../src/lib/content-library/sourceDisplay";
import { isLeaveSentence } from "../../src/lib/content-library/leaveRuleWords";
import { quoteParts } from "../../src/lib/content-library/quoteKey";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const POST = createStageAnswerPost();

let failures = 0;
const failed: string[] = [];
/** Failures by kind (the check's name without its answer, sentence or provision), so a run says which property broke. */
const kinds = new Map<string, number>();
function check(name: string, ok: boolean, detail = "") {
  if (!ok) {
    failures += 1;
    const kind = name
      .replace(/^answer:\S*: /, "")
      .replace(/"[^"]*"/g, '"..."')
      .replace(/(Sources lists) (?!s\. 16 \(1\) \(h).*/, "$1 <a provision a quote sits in>");
    kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
    if (failed.length < 40) failed.push(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

type Verdict = { sentence: string; supported: boolean; quote?: string; sourceId?: string; quoteFound?: boolean };
type Block = { id: string; stageId: string; verification: { verdicts?: Verdict[] } };
const published = JSON.parse(readFileSync(path.join(ROOT, "src/lib/content-library/published/stageAnswers.published.json"), "utf8")) as { blocks: Block[] };

const checked = (verdict: Verdict): verdict is Verdict & { quote: string; sourceId: string } =>
  Boolean(verdict.supported && verdict.quoteFound && verdict.quote && verdict.sourceId && !NOT_A_SOURCE.has(verdict.sourceId));

// ---------------------------------------------------------------- a tiny tree of the static markup

type Node = { tag: string; attrs: Record<string, string>; children: (Node | string)[] };
const VOID = new Set(["br", "img", "input", "hr", "meta", "link", "source", "wbr", "area", "col", "embed"]);
const unescape = (text: string) =>
  text.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

function parse(markup: string): Node {
  const root: Node = { tag: "#root", attrs: {}, children: [] };
  const stack = [root];
  for (const token of markup.split(/(<[^>]+>)/)) {
    if (!token) continue;
    const top = stack[stack.length - 1];
    if (token.startsWith("</")) {
      stack.pop();
    } else if (token.startsWith("<!")) {
      continue;
    } else if (token.startsWith("<")) {
      const tag = /^<([a-zA-Z0-9-]+)/.exec(token)?.[1]?.toLowerCase() ?? "";
      const attrs: Record<string, string> = {};
      for (const match of token.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:="([^"]*)")?/g)) if (match[1] !== tag) attrs[match[1]] = unescape(match[2] ?? "");
      const node: Node = { tag, attrs, children: [] };
      top.children.push(node);
      if (!VOID.has(tag) && !token.endsWith("/>")) stack.push(node);
    } else {
      top.children.push(unescape(token));
    }
  }
  return root;
}
const all = (node: Node, test: (node: Node) => boolean, out: Node[] = []): Node[] => {
  if (test(node)) out.push(node);
  for (const child of node.children) if (typeof child !== "string") all(child, test, out);
  return out;
};
const byTestId = (node: Node, id: string) => all(node, (each) => each.attrs["data-testid"] === id);
const textOf = (node: Node, skip: (node: Node) => boolean = () => false): string =>
  node.children.map((child) => (typeof child === "string" ? child : skip(child) ? "" : textOf(child, skip))).join("");
const isControl = (node: Node) => node.attrs["data-testid"] === "exact-words";

/** Each sentence on screen that has a control: its words, and what its panel shows. */
function controlsIn(root: Node) {
  return byTestId(root, "exact-words-sentence").map((segment) => {
    const control = segment.children.find((child): child is Node => typeof child !== "string" && isControl(child));
    const button = control ? all(control, (node) => node.tag === "button")[0] : undefined;
    const panel = control ? byTestId(control, "exact-words-panel")[0] : undefined;
    return {
      sentence: textOf(segment, isControl),
      reachable: Boolean(button && panel && button.attrs["aria-controls"] === panel.attrs.id && /Exact words/.test(textOf(button))),
      sources: panel
        ? byTestId(panel, "exact-words-source").map((source) => ({
            sourceId: source.attrs["data-source-id"],
            names: all(source, (node) => node.tag === "a").map((anchor) => textOf(anchor)),
            quote: byTestId(source, "exact-words-quote").map((quote) => textOf(quote).replace(/^“|”$/g, "")).join(" | "),
          }))
        : [],
    };
  });
}

type Body = {
  outcome: string;
  answer?: Parameters<typeof AnswerView>[0]["answer"] & { sources: { name: string; pinpoint: string }[] };
  nextStep?: Parameters<typeof NextStepCard>[0]["summary"] | null;
};

async function ask(stageId: string, court: string): Promise<Body> {
  const required = findStage(stageId)?.requiresConfirmedFact?.key;
  const confirmedFacts: Record<string, string> = { municipality: "Toronto", ...(required ? { [required]: "Toronto" } : {}) };
  const response = await POST(new Request("http://local/api/case/stage-answer", { method: "POST", body: JSON.stringify({ stageId, courtPath: court, confirmedFacts, dateAnswers: {} }) }));
  return (await response.json()) as Body;
}

async function main() {
  console.log("\nThe generated placing is current");
  {
    const saved = readFileSync(path.join(ROOT, "src/lib/content-library/published/quotePinpoints.generated.json"), "utf8");
    check("quotePinpoints.generated.json matches a fresh build", saved.replace(/\r\n/g, "\n") === `${JSON.stringify(buildQuotePinpoints(), null, 1)}\n`, "run: npx tsx scripts/content/buildVerdictSources.ts");
  }

  let sentencesChecked = 0;
  let leaveExempt = 0;
  let cardSentences = 0;
  let quotelessChecked = 0;
  let pinpointsChecked = 0;
  const h1Answers: string[] = [];

  for (const block of published.blocks) {
    const stage = findStage(block.stageId);
    const court = stage?.pathway ?? "small-claims";
    const body = await ask(block.stageId, court);
    const answer = body.answer;
    check(`${block.id}: the route renders the published answer`, body.outcome === "rendered" && answer?.stageId === block.stageId, `outcome ${body.outcome}`);
    if (!answer || answer.stageId !== block.stageId) continue;

    const verdicts = block.verification.verdicts ?? [];
    const withQuote = verdicts.filter(checked);
    const variants = shownOnScreen(court);

    // (a) the full answer: every checked sentence has its words, one click away.
    const full = parse(renderToStaticMarkup(createElement(AnswerView, { answer, court, userWords: "" })));
    const shown = controlsIn(full);
    for (const verdict of withQuote) {
      if (isLeaveSentence(verdict.sentence)) {
        leaveExempt += 1;
        continue;
      }
      sentencesChecked += 1;
      const display = sourceDisplayFor(verdict.sourceId);
      check(`${block.id}: the source of "${verdict.sentence.slice(0, 60)}" has a name, page and checked date`, Boolean(display), verdict.sourceId);
      const forIt = shown.filter((control) => variants(verdict.sentence).includes(control.sentence));
      check(`${block.id}: "${verdict.sentence.slice(0, 70)}" has an Exact words control on the full answer`, forIt.length > 0 && forIt.every((control) => control.reachable));
      check(
        `${block.id}: its words are the stored quote, with its source named`,
        forIt.length > 0 && forIt.every((control) => control.sources.some((source) => source.sourceId === verdict.sourceId && source.quote === verdict.quote && Boolean(display && source.names.includes(display.name)))),
        `"${verdict.sentence.slice(0, 60)}" from ${verdict.sourceId}`,
      );
    }

    // (c) no control beside a sentence with no checked quote, and none on words that are not a sentence of this answer.
    const quoted = new Set(withQuote.flatMap((verdict) => variants(verdict.sentence)));
    for (const control of shown) check(`${block.id}: a control sits only beside a sentence with a checked quote`, quoted.has(control.sentence), control.sentence.slice(0, 80));
    for (const verdict of verdicts.filter((each) => !checked(each) && !withQuote.some((other) => other.sentence === each.sentence))) {
      quotelessChecked += 1;
      check(`${block.id}: no control beside "${verdict.sentence.slice(0, 60)}" (no checked quote)`, !shown.some((control) => variants(verdict.sentence).includes(control.sentence)));
    }

    // (a) the card's first paragraph: every checked sentence it shows has its control.
    if (body.nextStep) {
      const card = parse(
        renderToStaticMarkup(
          createElement(NextStepCard, { summary: body.nextStep, answer, court, stepId: block.stageId, userWords: "", city: "Toronto", askedForDates: false }),
        ),
      );
      for (const lead of byTestId(card, "next-step-lead")) {
        const visible = textOf(lead, isControl);
        const leadControls = controlsIn(lead);
        for (const verdict of withQuote) {
          if (isLeaveSentence(verdict.sentence)) continue;
          const onCard = variants(verdict.sentence).filter((variant) => visible.includes(variant));
          if (onCard.length === 0) continue;
          cardSentences += 1;
          check(
            `${block.id}: "${verdict.sentence.slice(0, 60)}" on the card has its exact words`,
            leadControls.some((control) => onCard.includes(control.sentence) && control.reachable && control.sources.some((source) => source.quote === verdict.quote)),
          );
        }
        for (const control of leadControls) check(`${block.id}: a card control sits only beside a sentence with a checked quote`, quoted.has(control.sentence), control.sentence.slice(0, 80));
      }
    }

    // (b) every section or rule a shown sentence's quote sits in is in the Sources list.
    const listed = new Set(answer.sources.map((source) => `${source.name}|${source.pinpoint}`));
    for (const verdict of withQuote) {
      const display = sourceDisplayFor(verdict.sourceId);
      if (!display) continue;
      for (const pinpoint of pinpointsForQuote(verdict.sourceId, verdict.quote)) {
        if (!pinpoint || !/^[rs]\.\s/.test(pinpoint)) continue;
        pinpointsChecked += 1;
        check(`${block.id}: Sources lists ${display.name}, ${pinpoint}`, listed.has(`${display.name}|${pinpoint}`), `for "${verdict.sentence.slice(0, 60)}"`);
      }
    }
    if (withQuote.some((verdict) => quoteParts(verdict.quote).some((part) => part.startsWith("(h.1)")))) h1Answers.push(block.id);
  }

  console.log(`\n(b) The answers whose quotes rely on Limitations Act s. 16 (1) (h.1): ${h1Answers.length}`);
  check("the (h.1) check is not vacuous: some published answer relies on it", h1Answers.length > 0);
  for (const id of h1Answers) {
    const block = published.blocks.find((each) => each.id === id)!;
    const body = await ask(block.stageId, findStage(block.stageId)?.pathway ?? "small-claims");
    const pinpoints = (body.answer?.sources ?? []).filter((source) => /Limitations Act/.test(source.name)).map((source) => source.pinpoint);
    console.log(`  ${id}: Limitations Act ${pinpoints.join("; ")}`);
    check(`${id}: Sources lists s. 16 (1) (h.1)`, pinpoints.includes("s. 16 (1) (h.1)"));
    const usesH2 = (block.verification.verdicts ?? []).some((verdict) => verdict.quote && quoteParts(verdict.quote).some((part) => part.startsWith("(h.2)")));
    if (usesH2) check(`${id}: Sources lists s. 16 (1) (h.2)`, pinpoints.includes("s. 16 (1) (h.2)"));
  }

  console.log(
    `\nChecked ${sentencesChecked} quoted sentences on the full answer (${leaveExempt} leave-rule sentences shown in the rule's own words instead), ` +
      `${cardSentences} on the card, ${quotelessChecked} without a checked quote, ${pinpointsChecked} provisions in Sources.`,
  );
  check("the sentence check is not vacuous", sentencesChecked > 0 && cardSentences > 0 && pinpointsChecked > 0);
  if (failures) {
    console.log(failed.join("\n"));
    console.log("\nFailures by kind:");
    for (const [kind, count] of kinds) console.log(`  ${count}  ${kind}`);
    console.log(`\n${failures} failure(s)${failures > failed.length ? ` (first ${failed.length} shown)` : ""}.`);
    process.exit(1);
  }
  console.log("\nAll exact-words checks pass.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
