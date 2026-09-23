/**
 * PART 0 — trace ten realistic Small Claims stories through the CURRENT
 * pipeline and record which layer produces the wrong answer.
 *
 * READ-ONLY. This script changes nothing. It exists to establish WHY output is
 * wrong before anything is rewritten, so that the rewrite is aimed at the
 * actual defect rather than at the most visible symptom.
 *
 * WHAT IT TRACES, in the order a user hits it:
 *
 *   1. classifyCourtPath        live model call — is this Small Claims at all?
 *   2. extractIntakeFacts       live model call — role, claimFiled, claimServed…
 *   3. deriveCaseStage          pure — the GUIDED path's stage
 *   4. inferStage (replica)     pure — the STATIC FORM path's stage
 *   5. nextStepBlockFor         pure — which block gets selected
 *   6. the block's text         what the user actually reads
 *
 * ON THE inferStage REPLICA. `inferStage` is module-private inside
 * SmallClaimsIntake.tsx and Part 0 forbids code changes, so it is copied here
 * verbatim and labelled. `verifyInferStageReplica()` below re-reads the real
 * function out of the .tsx and fails this script if the copy has drifted — a
 * replica that silently diverges would make every finding about it worthless.
 *
 * Run: node --import tsx --env-file=.env.local scripts/diagnosis/traceAccuracy.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { classifyCourtPath } from "../../src/lib/case-system/intelligence/courtPathClassifier";
import { extractIntakeFacts } from "../../src/lib/case-system/intake/extractIntakeFacts";
import { deriveCaseStage } from "../../src/lib/case-system/intake/caseStageDerivation";
import { nextStepBlockFor, isPlaceholder } from "../../src/lib/content-library/nextSteps";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

// ---------------------------------------------------------------------------
// The replica, and the check that keeps it honest.
// ---------------------------------------------------------------------------

type StaticFormInput = {
  caseStage: string;
  yourRole: string;
  facts: string;
  serviceDetails: string;
  defenceResponse: string;
  filedDocuments: string[];
};

function firstLineOf(text: string): string {
  const line = text
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)[0];
  return (line ?? "").slice(0, 170);
}

function normalizeText(value: string): string {
  return value.toLowerCase();
}

/** VERBATIM COPY of SmallClaimsIntake.tsx's inferStage. Do not "improve" it. */
function inferStageReplica(input: StaticFormInput): string {
  if (input.caseStage !== "not-sure") return input.caseStage;

  const text = normalizeText(
    [input.yourRole, input.facts, input.serviceDetails, input.defenceResponse].join(" "),
  );

  if (input.filedDocuments.includes("settlement-conference")) return "conference";
  if (input.filedDocuments.includes("enforcement-documents")) return "enforcement";
  if (input.filedDocuments.includes("plaintiffs-claim")) return "already-started";

  if (
    input.filedDocuments.includes("defence") ||
    text.includes("served with a claim") ||
    text.includes("defendant") ||
    text.includes("responding") ||
    text.includes("defending")
  ) {
    return "responding";
  }

  return "starting-case";
}

/**
 * Asserts the replica still matches the original.
 *
 * Compares the distinguishing pieces rather than the whole function body,
 * because the body carries comments and formatting that are allowed to change.
 * What must not change is the ORDER of the tests and the literals they match,
 * which is what every finding about this function depends on.
 */
function verifyInferStageReplica(): string[] {
  const source = readFileSync(
    path.join(ROOT, "app/builder/_components/SmallClaimsIntake.tsx"),
    "utf8",
  );
  const body = source.slice(
    source.indexOf("function inferStage("),
    source.indexOf("function buildMissingPrompt("),
  );

  const problems: string[] = [];
  if (!body) return ["could not find inferStage in SmallClaimsIntake.tsx"];

  const required = [
    'if (input.caseStage !== "not-sure") return input.caseStage;',
    'input.filedDocuments.includes("settlement-conference")) return "conference"',
    'input.filedDocuments.includes("enforcement-documents")) return "enforcement"',
    'input.filedDocuments.includes("plaintiffs-claim")) return "already-started"',
    'text.includes("served with a claim")',
    'text.includes("defendant")',
    'text.includes("responding")',
    'text.includes("defending")',
    'return "responding";',
    'return "starting-case";',
  ];

  for (const fragment of required) {
    if (!body.includes(fragment)) problems.push(`replica drift: missing \`${fragment}\``);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// The scenarios.
// ---------------------------------------------------------------------------

type Scenario = {
  id: string;
  side: "plaintiff" | "defendant";
  /** What a correct system should conclude, and why. Not what today's does. */
  truth: string;
  story: string;
  /** What the static form would hold if the user filled it and left stage blank. */
  form: StaticFormInput;
};

const NOT_SURE: Pick<StaticFormInput, "caseStage" | "filedDocuments"> = {
  caseStage: "not-sure",
  filedDocuments: [],
};

const SCENARIOS: Scenario[] = [
  {
    id: "P1-before-filing",
    side: "plaintiff",
    truth: "Before filing. Nothing issued. Needs limitation check, right court, amount, demand.",
    story:
      "A contractor took $4,800 from me in February 2026 to rebuild my back deck and never " +
      "finished it. The railing was never installed and he stopped answering my messages in " +
      "March. I have the signed quote and about twenty texts. I want my money back. I have not " +
      "been to court about this and I have not sent him anything in writing yet.",
    form: {
      ...NOT_SURE,
      yourRole: "",
      facts:
        "A contractor took $4,800 in February 2026 to rebuild my back deck and never finished. " +
        "I want my money back. I have not filed anything.",
      serviceDetails: "",
      defenceResponse: "",
    },
  },
  {
    id: "P2-filed-not-served",
    side: "plaintiff",
    truth: "Claim issued, not yet served. r. 8.01(2) six-month service window is running.",
    story:
      "I filed my Plaintiff's Claim at the Brampton Small Claims Court on 4 August 2026 and the " +
      "clerk issued it the same day. I have not served the defendant yet because I could not " +
      "find a current address for him. What do I do now?",
    form: {
      ...NOT_SURE,
      yourRole: "Plaintiff",
      facts:
        "I filed my Plaintiff's Claim on 4 August 2026 and it was issued. I have not served the " +
        "defendant yet.",
      serviceDetails: "Not served yet.",
      defenceResponse: "",
    },
  },
  {
    id: "P3-served-defence-period",
    side: "plaintiff",
    truth:
      "Served; the r. 9.01 twenty-day defence period is running. Neither default nor conference yet.",
    story:
      "My claim was served on the defendant by a process server on 1 September 2026 and I have " +
      "the affidavit of service. It has been about two weeks and nothing has come back from " +
      "them. When can I do something about it?",
    form: {
      ...NOT_SURE,
      yourRole: "Plaintiff",
      facts:
        "My claim was served on the defendant on 1 September 2026 and I have the affidavit of " +
        "service. Nothing has come back yet.",
      serviceDetails: "Served personally by a process server on 1 September 2026.",
      defenceResponse: "",
    },
  },
  {
    id: "P4-no-defence-noting-default",
    side: "plaintiff",
    truth:
      "No defence after twenty days. Next act is noting in default by the CLERK, r. 11.01(1), Form 9B.",
    story:
      "I served the defendant on 20 July 2026. It is now late September and they have never " +
      "filed a defence. I want to move ahead and get judgment. What is the next step?",
    form: {
      ...NOT_SURE,
      yourRole: "Plaintiff",
      facts:
        "I served the defendant on 20 July 2026 and they have never filed a defence. I want to " +
        "get judgment.",
      serviceDetails: "Served 20 July 2026.",
      defenceResponse: "No defence was ever filed.",
    },
  },
  {
    id: "P5-settlement-conference",
    side: "plaintiff",
    truth: "Defence filed; a settlement conference is the next event, r. 13.",
    story:
      "The defendant filed a defence in August. The court has sent me a notice for a settlement " +
      "conference on 12 November 2026. What am I supposed to bring and what happens there?",
    form: {
      ...NOT_SURE,
      yourRole: "Plaintiff",
      facts:
        "The defendant filed a defence. I have a settlement conference notice for 12 November 2026.",
      serviceDetails: "",
      defenceResponse: "A defence was filed in August.",
    },
  },
  {
    id: "P6-enforcement",
    side: "plaintiff",
    truth: "Judgment obtained and unpaid. Enforcement: examination, garnishment, writ.",
    story:
      "I won at trial in May 2026 and got judgment for $9,200 plus costs. The defendant has paid " +
      "nothing. I know where he works. How do I actually collect this money?",
    form: {
      ...NOT_SURE,
      yourRole: "Plaintiff",
      facts:
        "I won at trial in May 2026 and have judgment for $9,200. The defendant has paid nothing. " +
        "I know where he works.",
      serviceDetails: "",
      defenceResponse: "",
    },
  },
  {
    id: "D1-just-served",
    side: "defendant",
    truth: "Served, defence period running. r. 9.01 twenty days, Form 9A.",
    story:
      "I got handed court papers at my door on 10 September 2026. It says Plaintiff's Claim and " +
      "someone is suing me for $6,000 over a car repair I already paid for. I do not agree with " +
      "any of it. What do I have to do and by when?",
    form: {
      ...NOT_SURE,
      yourRole: "Defendant",
      facts:
        "I was handed a Plaintiff's Claim on 10 September 2026. Someone is suing me for $6,000 " +
        "over a car repair I already paid for. I disagree with all of it.",
      serviceDetails: "Handed to me at my door on 10 September 2026.",
      defenceResponse: "",
    },
  },
  {
    id: "D2-noted-in-default",
    side: "defendant",
    truth:
      "Noted in default. Cannot file a defence or take steps without consent or leave; needs a motion to set aside, r. 11.06.",
    story:
      "I found out last week that I have been noted in default. I never filed anything because I " +
      "was in hospital for six weeks and the papers went to my old address. I want to fight this " +
      "case. Can I still file a defence?",
    form: {
      ...NOT_SURE,
      yourRole: "Defendant",
      facts:
        "I have been noted in default. I was in hospital and the papers went to my old address. " +
        "I want to defend the case.",
      serviceDetails: "Sent to my old address.",
      defenceResponse: "I never filed a defence.",
    },
  },
  {
    id: "D3-defence-filed-conference",
    side: "defendant",
    truth: "Defence filed; settlement conference next, r. 13.",
    story:
      "I filed my defence three weeks ago and paid the fee. The court clerk told me a settlement " +
      "conference gets scheduled next. Nobody has told me a date. What should I be doing in the " +
      "meantime?",
    form: {
      ...NOT_SURE,
      yourRole: "Defendant",
      facts: "I filed my defence three weeks ago. A settlement conference gets scheduled next.",
      serviceDetails: "",
      defenceResponse: "I filed a defence three weeks ago.",
    },
  },
  {
    id: "D4-default-judgment-against",
    side: "defendant",
    truth:
      "Default judgment already signed against them; needs a motion to set it aside, r. 11.06, not a defence.",
    story:
      "My bank account got garnished last month and that is how I learned there is a judgment " +
      "against me for $11,400. I never knew about any court case. I want this undone.",
    form: {
      ...NOT_SURE,
      yourRole: "Defendant",
      facts:
        "My bank account was garnished and that is how I found out there is a judgment against me " +
        "for $11,400. I never knew about the case.",
      serviceDetails: "I was never served as far as I know.",
      defenceResponse: "",
    },
  },
];

// ---------------------------------------------------------------------------
// Trace.
// ---------------------------------------------------------------------------

type LayerFailure = "a" | "b" | "c" | "d" | "e" | "f";

const LAYER_NAMES: Record<LayerFailure, string> = {
  a: "classification",
  b: "stage detection",
  c: "block selection / mapping",
  d: "content wrong or missing",
  e: "stage does not exist in the catalogue (too coarse)",
  f: "missing information the site never asked for",
};

type Trace = {
  scenario: Scenario;
  classification: { primaryPath: string; confidence: number; forum: string | null };
  facts: Record<string, unknown>;
  guidedStage: { stage: string; basis: string[] };
  staticStage: string;
  blockStage: string;
  blockId: string | null;
  blockIsPlaceholder: boolean;
  blockFirstLine: string;
  failures: LayerFailure[];
  notes: string[];
};

async function trace(scenario: Scenario, apiKey: string): Promise<Trace> {
  const classification = await classifyCourtPath({
    story: scenario.story,
    declaredCourtPath: "small-claims",
  });

  const facts = (await extractIntakeFacts(scenario.story, apiKey)) as Record<string, unknown>;
  const guided = deriveCaseStage(facts as never);
  const staticStage = inferStageReplica(scenario.form);

  // The static form path is the one that reaches the engine's
  // determineProceduralStage(), so it is the stage the next-step block is
  // chosen by for a user who filled the form.
  const blockStage = staticStage;
  const block = nextStepBlockFor("small-claims", blockStage);

  return {
    scenario,
    classification: {
      primaryPath: String(classification.primaryPath),
      confidence: Number(classification.confidence),
      forum: classification.outOfScopeForum?.id ?? null,
    },
    facts: {
      role: facts.role ?? null,
      claimFiled: facts.claimFiled ?? null,
      claimServed: facts.claimServed ?? null,
      defenceFiled: facts.defenceFiled ?? null,
    },
    guidedStage: { stage: guided.stage, basis: guided.basis },
    staticStage,
    blockStage,
    blockId: block?.id ?? null,
    blockIsPlaceholder: block ? isPlaceholder(block) : false,
    blockFirstLine: block ? firstLineOf(block.text) : "(no block)",
    failures: [],
    notes: [],
  };
}

function main(): Promise<void> {
  const drift = verifyInferStageReplica();
  if (drift.length > 0) {
    for (const problem of drift) console.error(problem);
    console.error("\nThe inferStage replica no longer matches the original. Findings about it");
    console.error("would be unreliable, so this script refuses to run.");
    process.exitCode = 1;
    return Promise.resolve();
  }
  console.log("replica check: inferStage copy matches SmallClaimsIntake.tsx\n");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set — run with --env-file=.env.local.");
    console.error("This trace needs the real model; a mocked one would diagnose nothing.");
    process.exitCode = 1;
    return Promise.resolve();
  }

  return (async () => {
    const traces: Trace[] = [];
    for (const scenario of SCENARIOS) {
      process.stdout.write(`tracing ${scenario.id}… `);
      traces.push(await trace(scenario, apiKey));
      console.log("done");
    }

    console.log("");
    console.log("=".repeat(78));
    console.log("");

    for (const t of traces) {
      console.log(`### ${t.scenario.id}  (${t.scenario.side})`);
      console.log(`TRUTH:         ${t.scenario.truth}`);
      console.log(
        `1 classify:    ${t.classification.primaryPath} (conf ${t.classification.confidence}${
          t.classification.forum ? `, forum ${t.classification.forum}` : ""
        })`,
      );
      console.log(`2 facts:       ${JSON.stringify(t.facts)}`);
      console.log(`3 guided:      ${t.guidedStage.stage}  [${t.guidedStage.basis.join("; ")}]`);
      console.log(`4 static form: ${t.staticStage}`);
      console.log(
        `5 block:       ${t.blockId ?? "(none)"}${t.blockIsPlaceholder ? "  [PLACEHOLDER — renders as nothing]" : ""}`,
      );
      console.log(`6 first line:  ${t.blockFirstLine}`);
      console.log("");
    }

    console.log("=".repeat(78));
    console.log("LAYER KEY");
    for (const [key, name] of Object.entries(LAYER_NAMES)) console.log(`  (${key}) ${name}`);
    console.log("");
    console.log(
      "Failure attribution is written up by hand in docs/accuracy-diagnosis.md —\n" +
        "the machine reports what each layer produced; deciding which layer is AT FAULT\n" +
        "for a wrong answer is a judgment, and labelling it automatically would bake in\n" +
        "the assumption the diagnosis is supposed to test.",
    );
  })();
}

main().catch((error) => {
  console.error("Trace failed.", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
