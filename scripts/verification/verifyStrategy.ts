/**
 * Case strategy stays switched off, sourced, and never grades a case.
 *
 * WHAT IT CATCHES (retrieval/strategy.ts, /api/case/strategy, 2026-10-08):
 *   - strategy answering on the live site: it must be off unless STRATEGY=on,
 *     and the page must not show it unless NEXT_PUBLIC_STRATEGY=on;
 *   - the route answering someone not signed in, or a malformed request;
 *   - a seat missing (what must be proven, the other side, the court, the
 *     steps), or a seat's question that does not forbid grading the case;
 *   - a seat that failed being shown, or the internal list of missing laws
 *     reaching the page;
 *   - a statement that grades the case or predicts the outcome passing the
 *     check (strategy rests on statementRejection, the same code check as
 *     every answer);
 *   - CLAUDE.md losing the rule that the ban on grading stays absolute.
 *
 * COSTS NOTHING: the checked answer is a stub; no model is called.
 *
 * Run: npm run test:strategy
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { NextRequest } from "next/server";

import { createStrategyPost } from "../../app/api/case/strategy/route";
import { statementRejection, type CheckedAnswer } from "../../src/lib/case-system/retrieval/checkedAnswer";
import type { Passage } from "../../src/lib/case-system/retrieval/corpusIndex";
import { buildStrategy, strategyQuestions } from "../../src/lib/case-system/retrieval/strategy";
import { strategyEnabled } from "../../src/lib/content-library/phaseScope";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
}

const STORY = "I did renovation work on a client's kitchen in Ottawa and they have not paid the final $6,000 invoice.";

async function main() {
  console.log("\n1. Off unless switched on");
  check("off by default", !strategyEnabled({}));
  check("on with STRATEGY=on", strategyEnabled({ STRATEGY: "on" }));
  check("off when checked answers are off", !strategyEnabled({ STRATEGY: "on", CHECKED_ANSWERS: "off" }));
  const panel = readFileSync(path.join(ROOT, "app/_components/StrategyPanel.tsx"), "utf8");
  check("the page shows it only with NEXT_PUBLIC_STRATEGY=on", panel.includes('process.env.NEXT_PUBLIC_STRATEGY !== "on"'));

  console.log("\n2. Every seat, each forbidding any grading");
  for (const side of ["plaintiff", "defendant"] as const) {
    const seats = strategyQuestions(side);
    check(`${side}: all four seats`, ["prove", "other-side", "judge", "procedure"].every((seat) => seats.some((item) => item.seat === seat)));
    check(`${side}: every seat's question forbids grading the case`, seats.every((item) => /never say or suggest how strong the case is/i.test(item.question)));
  }

  console.log("\n3. The route");
  const asked: string[] = [];
  const stubAnswer = async (input: { question: string }): Promise<CheckedAnswer> => {
    asked.push(input.question);
    const failed = /court must decide/.test(input.question);
    return {
      status: failed ? "unavailable" : "answered",
      statements: failed ? [] : [{ text: "A checked statement.", sources: [{ passageId: "p", citation: "Some Act, s. 1", sourceUrl: "", quote: "words of the law here", kind: "legislation" }] }],
      notConfirmed: [],
      declinedToJudge: false,
      missingLaw: ["A Missing Act"],
    };
  };
  const filed: string[] = [];
  const route = (enabled: boolean, signedIn = true) =>
    createStrategyPost({
      enabled: () => enabled,
      hasAi: () => true,
      authenticate: (async () => (signedIn ? { id: "u" } : null)) as never,
      build: (input) => buildStrategy(input, { answer: stubAnswer }),
      fileRequests: (async (names: string[]) => {
        filed.push(...names);
        return { filed: names, skipped: [] };
      }) as never,
    });
  const post = (body: unknown, enabled = true, signedIn = true) =>
    route(enabled, signedIn)(new NextRequest("http://localhost/api/case/strategy", { method: "POST", body: JSON.stringify(body) }));
  const off = await (await post({ story: STORY, courtPath: "small-claims", side: "plaintiff" }, false)).json();
  check("switched off: nothing is built and no model is called", off.skipped === "off" && asked.length === 0);
  const out = await (await post({ story: STORY, courtPath: "small-claims", side: "plaintiff" }, true, false)).json();
  check("not signed in: nothing is built", out.skipped === "signed-out" && asked.length === 0);
  check("a request without a side is refused", (await post({ story: STORY, courtPath: "small-claims" })).status === 400);
  const done = await (await post({ story: STORY, courtPath: "small-claims", side: "plaintiff" })).json();
  check("on and signed in: every seat is asked", asked.length === 4);
  check("a seat that could not be answered is not shown", done.sections.length === 3 && !done.sections.some((section: { seat: string }) => section.seat === "judge"));
  check("the internal list of missing laws never reaches the page", !JSON.stringify(done).includes("A Missing Act") && filed.includes("A Missing Act"));

  console.log("\n4. Nothing that grades the case can pass the check");
  const passage = { id: "p", sourceId: "s", text: "A defendant may raise the defence that the claim was not brought within two years.", pinpoint: "s. 4", heading: "", source: { id: "s", title: "Limitations Act, 2002", url: "", readableUrl: "", tier: "legislation", file: "" } } as unknown as Passage;
  const support = [{ passage, quote: "the defence that the claim was not brought within two years" }];
  for (const text of [
    "You have a strong case because the defence that the claim was not brought within two years does not apply.",
    "You will likely win, since the claim was brought within two years.",
    "The judge will likely find that the claim was not brought within two years.",
  ]) {
    check(`refused: "${text.slice(0, 50)}..."`, Boolean(statementRejection(text, support, STORY)));
  }
  check(
    "allowed: the law the other side has, stated as law",
    statementRejection("The law gives a defendant the defence that the claim was not brought within two years.", support, STORY) === null,
  );

  console.log("\n5. The rule is written down");
  const rules = readFileSync(path.join(ROOT, "CLAUDE.md"), "utf8");
  check("CLAUDE.md keeps the ban on grading absolute inside strategy", /Case strategy is the one exception/.test(rules) && /ban on grading the case stays absolute/i.test(rules));

  console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
  process.exitCode = failures ? 1 : 0;
}

void main();
