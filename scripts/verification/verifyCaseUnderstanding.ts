/**
 * The front door understands the story, and shows only law that is checked.
 *
 * WHAT THIS CATCHES: the reasoning step's words reaching a person without the
 * official-text check. understandCase (understanding/understandCase.ts) lets
 * the strongest model read the whole story and reason about it; this suite
 * drives it with a fake reasoner and a fake checker over the REAL library and
 * asserts the properties, whatever the model writes:
 *   - every legal point the reasoner makes goes through the checked answer:
 *     one the check cannot confirm is not shown, only listed as unconfirmed;
 *   - law slipped into the restated facts, the stage or a question's "why"
 *     is removed, because those parts are shown without the check;
 *   - the person's own facts ("you noted her in default") are kept: they are
 *     facts, not law;
 *   - the court the checker reads is the one the reasoning found, not the
 *     menu choice made before the person wrote anything;
 *   - a reply that is not JSON, or no reply in time, answers "unavailable"
 *     (the site falls back to the old front door); it never throws;
 *   - the stage map owns the next step, its form and deadline (CLAUDE.md
 *     s. 2a): a point stating one is never shown, the step is a real step of
 *     the chosen court's map or none, and a construction lien is the Superior
 *     Court with no ordinary step suggested (the 2026-10-13 walkthrough was
 *     told a 20-day Defence was due when nobody had sued him).
 *
 * COSTS NOTHING. No model, no network.
 *
 * Run: node --import tsx scripts/verification/verifyCaseUnderstanding.ts
 */

import { loadCorpusIndex, type Passage } from "../../src/lib/case-system/retrieval/corpusIndex";
import type { CheckedAnswerDeps } from "../../src/lib/case-system/retrieval/checkedAnswer";
import {
  betterDestinationKnown,
  parseUnderstanding,
  retrievalCourtFor,
  stepCatalogue,
  storyWithAnswers,
  understandCase,
  validStep,
  withFixedRegime,
  withoutLaw,
} from "../../src/lib/case-system/understanding/understandCase";
import { isMapOwnedProcedure } from "../../src/lib/case-system/procedureOwnership";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`pass  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
    // Shown on the pull request's checks page, where the job log may not be readable.
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=test:case-understanding::${name}${detail ? `: ${detail.replace(/\n/g, " ").slice(0, 400)}` : ""}`);
  }
}

const index = loadCorpusIndex();
const noSearch: CheckedAnswerDeps["embed"] = async (texts, _model, dimensions) => texts.map(() => new Array(dimensions).fill(0));

const SLANDER = "i am sueing by uncles ex girlfriend for slander and she never responded so i noted her in default which the court accepted";

const reasoned = {
  summary:
    "You are suing your uncle's ex-girlfriend for slander. She did not file a defence, and you had her noted in default. You must now prove your damages under r. 11.03.",
  facts: [
    { label: "Your side", value: "Bringing the claim" },
    { label: "Other party", value: "Your uncle's ex-girlfriend" },
    { label: "What has happened", value: "She was noted in default." },
    { label: "Amount", value: "Not given" },
  ],
  matters: [{ title: "Your slander claim", court: "small-claims" }],
  side: "starting",
  stage: "The defendant has been noted in default; damages have not been assessed.",
  questions: [
    { question: "How much are you claiming?", why: "It decides which court hears the claim." },
    { question: "Have you asked the clerk for anything since she was noted in default?", why: "The deadline is within 30 days under the rules." },
    { question: "Did you already file Form 11A under the Courts of Justice Act?", why: "It changes the next step." },
  ],
  asksForPrediction: false,
  step: "plaintiff:defence-period-expired-no-defence",
  points: [
    { text: "The defendant noted in default; you may ask for an assessment of damages.", cites: ["Rules of the Small Claims Court, O. Reg. 258/98, r. 11.03"] },
    { text: "You will likely win because she did not defend.", cites: ["Rules of the Small Claims Court, O. Reg. 258/98, r. 11.03"] },
    { text: "A made-up statute gives you double damages.", cites: ["Invented Damages Act, s. 1"] },
    { text: "Your next step is to file Form 11A within 30 days.", cites: ["Rules of the Small Claims Court, O. Reg. 258/98, r. 11.03"] },
  ],
};

const LIEN = "Our interlock contractor did a bad job and when we told him to stop he registered a $60,000 construction lien on our house. What do I do?";

async function main() {
  check("the library loads", Boolean(index));
  if (!index) {
    process.exitCode = 1;
    return;
  }

  // ---- 1. Parsing keeps the person's facts and removes law from the unchecked parts
  const parsed = parseUnderstanding(JSON.stringify(reasoned));
  check("a reasoned reply parses", Boolean(parsed));
  const u = parsed!.understanding;
  check("the restated facts keep the person's own facts", /noted in default/.test(u.summary) && /slander/.test(u.summary), u.summary);
  check("a sentence of law in the restated facts is removed (it is shown unchecked)", !/r\. 11\.03|must now prove/.test(u.summary), u.summary);
  check("a fact that states law is removed", !u.facts.some((fact) => /\br\.\s*\d|must/i.test(fact.value)));
  check("a question is kept; a 'why' that states a rule is removed", u.questions.length === 2 && !u.questions[1].why && Boolean(u.questions[0].why), JSON.stringify(u.questions));
  check("a question that cites a form or an Act is not shown (it is never checked against the official text)", !u.questions.some((q) => /Form 11A/.test(q.question)));
  check("the court and side come from the reasoning", u.mainCourt === "small-claims" && u.side === "starting");
  check("withoutLaw keeps plain facts", withoutLaw("You were served on September 30. She never responded.") === "You were served on September 30. She never responded.");
  check("withoutLaw removes a stated rule", withoutLaw("You were served. You must file a defence within 20 days.") === "You were served.");

  // ---- 2. The court the checker reads is the reasoning's, not the menu's
  check("the checker reads the court the reasoning found", retrievalCourtFor(u, "family") === "small-claims");
  check("a tribunal matter falls back to the person's choice for the checker", retrievalCourtFor({ ...u, mainCourt: "tribunal" }, "family") === "family");

  // ---- 3. Answers travel with the story
  const withAnswers = storyWithAnswers({ story: SLANDER, city: "Ottawa", answers: [{ question: "How much are you claiming?", answer: "$12,000" }, { question: "Empty?", answer: " " }] });
  check("the person's answers are added to the story, empty ones dropped", /\$12,000/.test(withAnswers) && !/Empty\?/.test(withAnswers) && /Ottawa/.test(withAnswers));

  // ---- 4. The whole pipeline: only checked points are shown
  let checkerCourt = "";
  const seen: Passage[] = [];
  const result = await understandCase(
    { story: SLANDER, city: "Ottawa", chosenCourt: "family" },
    {
      reason: async () => JSON.stringify(reasoned),
      check: {
        index,
        embed: noSearch,
        thorough: false,
        check: async (statements, passages, input) => {
          checkerCourt = input.courtPath;
          seen.push(...passages);
          const rule = passages.find((passage) => passage.sourceId === "oreg-258-98-small-claims-rules" && /11\.03/.test(passage.pinpoint ?? ""));
          const text = statements[0];
          if (/assessment of damages/.test(text) && rule) {
            const words = rule.text.replace(/\s+/g, " ").trim().split(" ").slice(0, 14).join(" ");
            return JSON.stringify({ results: [{ n: 1, verdict: "supported", passage: rule.id, quote: words, topic: "assessment of damages" }] });
          }
          if (/likely win/.test(text) && rule) {
            const words = rule.text.replace(/\s+/g, " ").trim().split(" ").slice(0, 14).join(" ");
            return JSON.stringify({ results: [{ n: 1, verdict: "supported", passage: rule.id, quote: words, topic: "outcome" }] });
          }
          return JSON.stringify({ results: [{ n: 1, verdict: "unsupported", passage: "", quote: "", topic: "double damages" }] });
        },
      },
    },
  );
  check("the pipeline understands the story", result.status === "understood");
  if (result.status === "understood") {
    check("the checker reads Small Claims law, not the Family menu choice", checkerCourt === "small-claims", checkerCourt);
    check("the section the reasoning named is fetched from the library", seen.some((passage) => /11\.03/.test(passage.pinpoint ?? "")));
    check(
      "a point the official text supports is shown, with its source",
      result.answer.statements.some((statement) => /assessment of damages/.test(statement.text) && statement.sources.length > 0),
      JSON.stringify(result.answer.statements.map((s) => s.text)),
    );
    check("a point that predicts the outcome is never shown", !result.answer.statements.some((statement) => /likely win/.test(statement.text)));
    check("a point the check cannot confirm is not shown, only listed", !result.answer.statements.some((s) => /double damages/.test(s.text)) && result.answer.notConfirmed.length > 0);
    check("law the library does not hold is reported as missing", result.answer.missingLaw.some((law) => /Invented Damages Act/.test(law)));
  }

  // ---- 4b. The stage map owns the next step, its form and deadline (s. 2a)
  check("a point stating a step, form or deadline is never passed on", !parsed!.points.some((point) => /Form 11A/.test(point.text)));
  check(
    "map-owned wording is recognised",
    isMapOwnedProcedure("You must file your Defence within 20 days.") &&
      isMapOwnedProcedure("Use Form 9A.") &&
      isMapOwnedProcedure("Your defence is due 20 days after you were served.") &&
      isMapOwnedProcedure("Your next step is a motion."),
  );
  check(
    "law that is not the person's step is not map-owned",
    !isMapOwnedProcedure("A claim must be started within two years after the day it was discovered.") &&
      !isMapOwnedProcedure("The Small Claims Court hears claims up to $50,000."),
  );
  check("a fact about what someone did is not an instruction", !isMapOwnedProcedure("She did not file a defence, and you had her noted in default."));
  check(
    "common ways of stating a deadline or step are caught (review, 2026-10-14)",
    isMapOwnedProcedure("You have 20 days to file your defence.") &&
      isMapOwnedProcedure("The defendant has twenty days to respond.") &&
      isMapOwnedProcedure("You must serve the defendant personally.") &&
      isMapOwnedProcedure("You will need to serve them."),
  );
  check(
    "the person's own past facts with a period or 'due' are kept",
    withoutLaw("I was served 20 days after the accident.") === "I was served 20 days after the accident." &&
      withoutLaw("The rent was due on the first. She stopped work due to illness.") === "The rent was due on the first. She stopped work due to illness.",
  );
  check("withoutLaw removes a due date the old filter missed", withoutLaw("You were served. Your defence is due 20 days after service.") === "You were served.");
  const realStep = parsed!.understanding.step;
  check("a real step of the chosen court is kept", realStep === "plaintiff:defence-period-expired-no-defence", String(realStep));
  check("an invented step is dropped", validStep("plaintiff:made-up-step", "small-claims") === null);
  check("a step from another court's map is dropped", validStep("plaintiff:defence-period-expired-no-defence", "family") === null);
  check("no step for a tribunal", validStep("plaintiff:defence-period-expired-no-defence", "tribunal") === null);
  check("the step list covers all three courts", /SMALL-CLAIMS STEPS/.test(stepCatalogue()) && /CIVIL STEPS/.test(stepCatalogue()) && /FAMILY STEPS/.test(stepCatalogue()));
  const lienRead = withFixedRegime({ ...u, side: "unclear", mainCourt: "small-claims", step: "plaintiff:defence-period-expired-no-defence" }, LIEN);
  check(
    "a construction lien goes to the Superior Court, at the map's lien step, never an ordinary one",
    lienRead.mainCourt === "civil" && lienRead.step === "civil:defendant:lien-registered-on-title" && lienRead.regime?.id === "construction-lien" && lienRead.regime.ownProcedure,
    JSON.stringify({ court: lienRead.mainCourt, step: lienRead.step, regime: lienRead.regime }),
  );
  const servedLien = withFixedRegime(
    { ...u, side: "responding", step: "civil:defendant:served-defence-period-running" },
    "The contractor registered a construction lien and now served me with a statement of claim.",
  );
  check("an owner served in a lien action is at the lien action's step, not the ordinary defence step", servedLien.step === "civil:defendant:served-with-lien-claim", String(servedLien.step));
  const claimant = withFixedRegime({ ...u, side: "starting", step: null }, "I'm a subcontractor and want to register a construction lien for my unpaid framing work.");
  check("an unpaid contractor asking about a lien is at the claimant's step", claimant.step === "civil:plaintiff:lien-claimant", String(claimant.step));
  check("each lien step is a real step of the civil map", ["civil:defendant:lien-registered-on-title", "civil:defendant:served-with-lien-claim", "civil:plaintiff:lien-claimant"].every((id) => validStep(id, "civil") === id));
  check("no rule, no change", withFixedRegime(u, SLANDER) === u);

  // ---- 5. Failures fall back, never throw
  const notJson = await understandCase({ story: SLANDER }, { reason: async () => "not json" });
  check("a reply that is not JSON answers unavailable", notJson.status === "unavailable");
  const thrown = await understandCase({ story: SLANDER }, { reason: async () => { throw new Error("network"); } });
  check("a failed reasoning call answers unavailable", thrown.status === "unavailable");
  const slow = await understandCase({ story: SLANDER }, { reason: () => new Promise((resolve) => setTimeout(() => resolve(JSON.stringify(reasoned)), 500)), understandMs: 50 });
  check("no reply in time answers unavailable", slow.status === "unavailable");
  const empty = await understandCase({ story: "   " }, { reason: async () => JSON.stringify(reasoned) });
  check("an empty story answers unavailable", empty.status === "unavailable");

  // ---- 6. The "Continue" button's own style
  //
  // 2026-10-17 live bug: a landlord-held deposit was correctly read as
  // belonging to the Landlord and Tenant Board, but the only button on the
  // page still said "Continue with Small Claims" in the same bright green
  // used when nothing better is known. betterDestinationKnown is the one
  // thing CaseUnderstandingCard's button style depends on.
  check(
    "a tribunal reading (no CourtPath to offer) still downgrades the chosen-path button",
    betterDestinationKnown("tribunal", "small-claims", null) === true,
  );
  check(
    "outside Ontario downgrades it too",
    betterDestinationKnown("outside-ontario", "small-claims", null) === true,
  );
  check(
    "genuinely unclear keeps the chosen-path button primary -- nothing better is known",
    betterDestinationKnown("unclear", "small-claims", null) === false,
  );
  check(
    "the mainCourt agreeing with what the person chose keeps it primary",
    betterDestinationKnown("small-claims", "small-claims", null) === false,
  );
  check(
    "a different, available path still downgrades it (unchanged behaviour)",
    betterDestinationKnown("civil", "small-claims", true) === true,
  );
  check(
    "a different path that is NOT available in this build leaves it primary -- it is the only button left to click",
    betterDestinationKnown("civil", "small-claims", false) === false,
  );

  console.log(failures ? `\n${failures} failed` : "\nAll passed");
  process.exitCode = failures ? 1 : 0;
}

void main();
