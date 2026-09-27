/**
 * No document text and no file name can reach a model while document analysis is off —
 * and it is off, and stays off.
 *
 * WHAT THIS CATCHES:
 *
 *   1. The flag becoming a single boolean somebody can set from an environment
 *      variable. It requires BOTH the env var and `ZDR_CONFIRMED_AT`, which is a source
 *      constant — so turning this on needs a commit and a diff, which is the
 *      conversation that must happen before any document reaches a processor.
 *
 *   2. Any code outside aiAnalysis.ts reading AI_DOCUMENT_ANALYSIS_ENABLED directly.
 *      That bypasses the ZDR key, and it is the obvious shortcut.
 *
 *   3. A file name reaching a payload. `restraining-order-application.pdf` is a
 *      disclosure independent of the document's contents, and it is the most tempting
 *      field to include because it is short and looks like helpful context.
 *      lso-fixes-report Step 8 records that file names used to reach OpenAI.
 *
 *   4. A suggestion that grades the case getting through the validator. §3: the schema
 *      is the enforcement, because a prompt asking for no assessment is a request and a
 *      schema with nowhere to put one is a constraint.
 *
 * *** WHAT THIS HONESTLY DOES NOT PROVE ***
 *
 * That the ON path works. It has never run, there is no model call wired, and no check
 * here can tell you how a model behaves. What it proves about the ON path is everything
 * decidable without one — the payload carries only extracted text, the caps hold, the
 * validator refuses an assessment — because the payload builder and the validator are
 * pure functions written that way on purpose.
 *
 * Read a green run here as "the door is shut and the hinges are sound", not as "the
 * feature is safe to open".
 *
 * COSTS NOTHING. Pure functions and file reads. No model, no network, no database.
 *
 * Run: node --import tsx scripts/verification/verifyWorkspaceAiFlag.ts
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import {
  ANALYSIS_DISABLED_REASON,
  FORBIDDEN_IN_PAYLOAD,
  MAX_ANALYSIS_CHARS,
  MAX_DOCUMENTS_PER_CALL,
  ZDR_CONFIRMED_AT,
  buildAnalysisPayload,
  documentAnalysisEnabled,
  subjectLineGate,
  validateAnalysis,
} from "../../src/lib/case-workspace/aiAnalysis";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

console.log("");
console.log("WORKSPACE AI FLAG — the door is shut");
console.log("");

// ---------------------------------------------------------------------------
// 1. The flag is off, and cannot be turned on from the environment alone
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  if (ZDR_CONFIRMED_AT !== null) {
    problems.push(
      `ZDR_CONFIRMED_AT is set to "${ZDR_CONFIRMED_AT}". That unblocks the flag, so it ` +
        `must only be set once OpenAI's zero-data-retention and modified-abuse-monitoring ` +
        `confirmation for UPLOADED DOCUMENTS is in writing and recorded in ` +
        `DATA_FLOW_INVENTORY §3.2. If that has happened, update this check deliberately.`,
    );
  }

  /*
   * *** THE TWO-KEY PROPERTY ***
   *
   * Driven with the env var set to every truthy spelling somebody might reach for. All
   * of them must still be false, because the second key is missing.
   */
  for (const value of ["true", "TRUE", "1", "yes", "on"]) {
    if (documentAnalysisEnabled({ AI_DOCUMENT_ANALYSIS_ENABLED: value })) {
      problems.push(
        `setting AI_DOCUMENT_ANALYSIS_ENABLED="${value}" turned analysis ON with no ` +
          `recorded ZDR confirmation. The environment alone must never be enough.`,
      );
    }
  }

  if (documentAnalysisEnabled({})) {
    problems.push("analysis is on with no environment variable at all");
  }

  if (documentAnalysisEnabled()) {
    problems.push("analysis is ON in this process");
  }

  if (!/zero data retention/i.test(ANALYSIS_DISABLED_REASON)) {
    problems.push("the disabled reason does not say what is actually blocking it");
  }

  if (problems.length === 0) {
    pass(
      "analysis is off, and no spelling of the environment variable turns it on while " +
        "ZDR_CONFIRMED_AT is null",
    );
  } else {
    fail("the flag can be turned on without the confirmation", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 2. Nothing outside aiAnalysis.ts reads the environment variable
// ---------------------------------------------------------------------------

{
  /*
   * A caller checking `process.env.AI_DOCUMENT_ANALYSIS_ENABLED` itself has bypassed
   * the ZDR key entirely. That is the obvious shortcut, it looks correct in review, and
   * it silently reduces a two-key gate to one.
   *
   * Comments are stripped: several files legitimately DISCUSS the flag by name, and a
   * check that read comments would fail on correct code for documenting the hazard.
   * This repository has been caught by that twice.
   */
  const problems: string[] = [];
  const allowed = path.join("src", "lib", "case-workspace", "aiAnalysis.ts");

  const walk = (directory: string, files: string[] = []): string[] => {
    for (const entry of readdirSync(directory)) {
      if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
      const full = path.join(directory, entry);
      if (statSync(full).isDirectory()) walk(full, files);
      else if (/\.tsx?$/.test(entry)) files.push(full);
    }
    return files;
  };

  const stripComments = (source: string): string =>
    source
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((line) => {
        const trimmed = line.trimStart();
        return !trimmed.startsWith("//") && !trimmed.startsWith("*");
      })
      .join("\n");

  for (const directory of ["src", "app", "scripts"]) {
    for (const file of walk(path.join(ROOT, directory))) {
      const relative = path.relative(ROOT, file);
      if (relative === allowed) continue;
      // This suite names the variable in its own assertions.
      if (relative === path.join("scripts", "verification", "verifyWorkspaceAiFlag.ts")) continue;

      const code = stripComments(readFileSync(file, "utf8"));
      if (/AI_DOCUMENT_ANALYSIS_ENABLED/.test(code)) {
        problems.push(
          `${relative} reads AI_DOCUMENT_ANALYSIS_ENABLED directly — that bypasses ` +
            `ZDR_CONFIRMED_AT and turns the two-key gate into one. Call ` +
            `documentAnalysisEnabled() instead.`,
        );
      }
    }
  }

  if (problems.length === 0) {
    pass("only aiAnalysis.ts reads the environment variable; everything else goes through the gate");
  } else {
    fail("the two-key gate is bypassed", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 3. The payload carries extracted text and nothing else
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  /*
   * Distinctive values, so a leak is unmistakable. The file name is the one that
   * matters: it is a disclosure in its own right, independent of the contents.
   */
  const input = {
    extractedText: "Invoice 4471 dated 3 March 2026. Amount owing: $4,200.00.",
    originalName: "restraining-order-application-UNIQUEMARKER.pdf",
    storagePath: "11111111-1111-4111-8111-111111111111/2222/3333-UNIQUEPATH",
    userId: "11111111-1111-4111-8111-111111111111",
    caseId: "44444444-4444-4444-8444-444444444444",
  };

  const built = buildAnalysisPayload(input);

  if (!built.ok) {
    problems.push(`a document with text produced no payload: ${built.reason}`);
  } else {
    const serialised = JSON.stringify(built.payload);

    for (const [label, value] of [
      ["the file name", input.originalName],
      ["the storage path", input.storagePath],
      ["the user id", input.userId],
      ["the case id", input.caseId],
    ] as const) {
      if (serialised.includes(value)) {
        problems.push(`${label} appears in the payload`);
      }
    }

    // Only the two expected keys.
    const keys = Object.keys(built.payload).sort().join(",");
    if (keys !== "text,truncated") {
      problems.push(`the payload carries keys "${keys}" — expected only text and truncated`);
    }

    if (built.payload.text !== input.extractedText) {
      problems.push("the payload's text is not the document's extracted text");
    }
  }

  // No text means no payload — never a payload built from the file name instead.
  for (const empty of [null, "", "   \n  "]) {
    const result = buildAnalysisPayload({ ...input, extractedText: empty });
    if (result.ok) {
      problems.push(`a document with no extracted text (${JSON.stringify(empty)}) produced a payload`);
    }
  }

  // The cap holds, and truncation is declared rather than hidden.
  const long = buildAnalysisPayload({ ...input, extractedText: "x".repeat(MAX_ANALYSIS_CHARS * 3) });
  if (long.ok) {
    if (long.payload.text.length !== MAX_ANALYSIS_CHARS) {
      problems.push(`the cap did not hold: ${long.payload.text.length} characters sent`);
    }
    if (!long.payload.truncated) {
      problems.push("text was cut without truncated being set, so a model is told it has all of it");
    }
  } else {
    problems.push("a long document produced no payload at all");
  }

  if (problems.length === 0) {
    pass(
      `the payload carries only extracted text, capped at ${MAX_ANALYSIS_CHARS} characters, ` +
        `with the file name, storage path, user id and case id all absent`,
    );
  } else {
    fail("the payload carries more than the document's text", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 4. The gate catches a leak the builder did not produce
// ---------------------------------------------------------------------------

{
  /*
   * The gate exists for the version of buildAnalysisPayload somebody writes later, when
   * adding "just the document type for context" looks harmless. So it is driven with
   * payloads the current builder cannot produce — which is the only way to test a guard
   * against a future mistake.
   */
  const problems: string[] = [];

  const forbidden = {
    extractedText: "anything",
    originalName: "restraining-order-application.pdf",
    storagePath: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee/case/doc",
    userId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    caseId: "ffffffff-1111-4222-8333-444444444444",
  };

  const leaks: [string, Record<string, unknown>][] = [
    [
      "the file name interpolated into the text",
      { text: `Document ${forbidden.originalName} says the invoice is due.`, truncated: false },
    ],
    [
      "the file name under its own key",
      { text: "fine", truncated: false, originalName: forbidden.originalName },
    ],
    ["the storage path", { text: `path ${forbidden.storagePath}`, truncated: false }],
    ["the user id", { text: `for user ${forbidden.userId}`, truncated: false }],
    ["the case id", { text: `case ${forbidden.caseId}`, truncated: false }],
  ];

  for (const [label, payload] of leaks) {
    const result = subjectLineGate(
      payload as { text: string; truncated: boolean },
      forbidden,
    );
    if (result.ok) {
      problems.push(`${label} passed the gate`);
    }
  }

  // And a clean payload is not refused, or the gate would be disabled for noise.
  const clean = subjectLineGate(
    { text: "Invoice 4471 dated 3 March 2026.", truncated: false },
    forbidden,
  );
  if (!clean.ok) {
    problems.push(`a clean payload was refused for ${clean.leaked}, which would make the gate noise`);
  }

  if (FORBIDDEN_IN_PAYLOAD.some((entry) => entry.why.trim().length < 20)) {
    problems.push("a forbidden field has no real explanation of why it matters");
  }

  if (problems.length === 0) {
    pass(
      `the gate refuses all ${leaks.length} leak shapes, including a value interpolated into ` +
        `the text, and passes a clean payload`,
    );
  } else {
    fail("the payload gate can be got past", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 5. The response schema refuses anything that grades a case
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  /*
   * §3, at the schema rather than in the prompt. A prompt asking for no assessment is a
   * request; a validator that refuses one is a constraint.
   */
  /*
   * *** THE ADVERSARIAL CORPUS: 56 SENTENCES, ONE PER STEM AND INFLECTION ***
   *
   * Driven with real sentences a model could plausibly return, not inspected as a
   * pattern. That distinction found every bug in this filter:
   *
   *   - `\bstrong\b` missed "strongest" and `\bweak\b` missed "weakens" -- no word
   *     boundary between a stem and its suffix.
   *   - `\bhelpful\b` missed "unhelpful", for the same reason at the other end.
   *   - And SIXTEEN of the fifty-six escaped because an entire class was absent: the
   *     system applying law to the user facts. "The contractor is liable for the
   *     damage" contains no word about strength, chances or importance. It simply
   *     decides the case, and a case-grading filter cannot see it.
   *
   * The MUST_ACCEPT list is not decoration. A filter that refuses "a copy of the
   * defence filed by Ms Tremblay" or "a photograph of the damage to the fence" is
   * unusable, and an unusable safety check is one somebody switches off. Both
   * directions are asserted on every run.
   */
  const ADVERSARIAL: [string, string][] = [
    // ---- §3: grading the case ----
    ["strong", "This is a strong document for your position."],
    ["strongest", "This is your strongest document."],
    ["strongly", "This strongly supports what you are claiming."],
    ["weak", "This is a weak piece of evidence."],
    ["weakens", "This weakens the other side's position."],
    ["weakest", "The weakest of the documents you uploaded."],
    ["weakness", "The weakness here is the missing signature."],
    ["help", "This will help your claim."],
    ["helps", "This helps establish what you are owed."],
    ["helpful", "A helpful document to have."],
    ["unhelpful", "An unhelpful document for your case."],
    ["hurt", "This could hurt your case."],
    ["hurts", "This hurts your position."],
    ["harm", "This may harm your claim."],
    ["harmful", "A harmful admission."],
    ["prove", "This will prove the debt is owed."],
    ["proves", "This invoice proves the debt."],
    ["proven", "The amount is proven by this receipt."],
    ["proving", "A document proving the work was never done."],
    ["important", "This is an important document."],
    ["crucial", "A crucial piece of your case."],
    ["vital", "Vital to establishing the timeline."],
    ["essential", "Essential evidence for your claim."],
    ["significant", "A significant document."],
    ["risk", "There is a risk this is not enough."],
    ["risky", "Relying on this alone is risky."],
    ["likely", "This is likely to be accepted."],
    ["likelihood", "It increases the likelihood of success."],
    ["unlikely", "Unlikely to be disputed."],
    ["chance", "This improves your chances."],
    ["win", "This should help you win."],
    ["winning", "A winning document."],
    ["lose", "Without this you could lose."],
    ["losing", "You are at risk of losing on this point."],
    ["best", "The best document you have."],
    ["worst", "The worst of the three invoices."],
    ["supports your", "This supports your claim."],
    ["key evidence", "Key evidence for the amount owed."],
    ["key piece", "A key piece of evidence for your claim."],
    ["in your favour", "The wording is in your favour."],
    ["against you", "This document works against you."],

    // ---- §2: applying law to the user's facts (the "who does the applying" test) ----
    ["breach", "This shows a breach of the contract."],
    ["breached", "The contract was breached on 3 March."],
    ["breaches", "The letter breaches the agreement's notice clause."],
    ["liable", "The contractor is liable for the damage."],
    ["liability", "This establishes liability."],
    ["at fault", "This shows the other party was at fault."],
    ["negligent", "The work was negligent."],
    ["negligence", "Evidence of negligence."],
    ["entitled", "You are entitled to the full amount."],
    ["establishes", "This establishes that the money was never repaid."],
    ["obligation", "This creates an obligation to pay."],
    ["damages", "The damages come to $4,200."],
    ["good (not defence)", "A good defence to the claim."],
    ["valid claim", "You have a valid claim for this amount."],
    ["responsible for the repair", "The landlord is responsible for the repair."],
  ];


  const MUST_ACCEPT: string[] = [
    "An invoice from Tremblay Renovations for work at 42 Main Street.",
    "A letter about an unpaid account, dated 3 March 2026.",
    "A photograph of a damaged fence.",
    "A bank statement showing transfers in February 2026.",
    "An email from Ms Tremblay about the kitchen renovation.",
    "A repair estimate for $1,800 from Okonkwo Contracting.",
    "A signed contract for driveway work.",
    "A text message thread about scheduling.",
    "A receipt for materials bought on 12 January 2026.",
    "A notice of trial from the court office.",
    "A witness statement from the neighbour.",
    "A proof of service for the claim.",
    "A copy of the defence filed by Ms Tremblay.",
    "A photograph of the damage to the fence.",
    "An invoice for goods delivered on 12 January 2026.",
    "A contract containing a notice clause.",
    "A letter from the insurance company about the claim.",
    "A statement of account showing the balance.",
    "An email in which Ms Tremblay offers to pay in instalments.",
    "A letter naming the person responsible for the account.",
  ];


  for (const [stem, sentence] of ADVERSARIAL) {
    const result = validateAnalysis({ description: sentence, documentType: "invoice-receipt" });
    if (result.ok) {
      problems.push(`an assessment escaped [${stem}]: "${sentence}"`);
    }
  }

  for (const sentence of MUST_ACCEPT) {
    const result = validateAnalysis({ description: sentence, documentType: "invoice-receipt" });
    if (!result.ok) {
      problems.push(`a plain description was refused: "${sentence}" — ${result.reason}`);
    }
  }

  // A malformed date must not be smuggled through.
  if (validateAnalysis({ date: "03/04/2026" }).ok) {
    problems.push("accepted an ambiguous date format");
  }
  if (validateAnalysis({ date: "2026-03-03" }).ok === false) {
    problems.push("refused a well-formed ISO date");
  }

  /*
   * Unknown fields are dropped, not passed through. A model adding a field is not
   * necessarily misbehaving; what must not happen is that field reaching a screen.
   */
  const extra = validateAnalysis({
    description: "An invoice.",
    caseStrength: "strong",
    recommendation: "rely on this one",
  });
  if (extra.ok) {
    const keys = Object.keys(extra.suggestion);
    for (const unexpected of ["caseStrength", "recommendation"]) {
      if (keys.includes(unexpected)) {
        problems.push(`an unknown field "${unexpected}" was passed through to the caller`);
      }
    }
  } else {
    problems.push("a response with an extra field was refused rather than having it dropped");
  }

  if (validateAnalysis(null).ok || validateAnalysis("text").ok) {
    problems.push("a non-object response was accepted");
  }

  if (problems.length === 0) {
    pass(
      `the validator refuses all ${ADVERSARIAL.length} adversarial sentences, accepts all ` +
        `${MUST_ACCEPT.length} plain descriptions, ` +
        `and drops unknown fields instead of passing them on`,
    );
  } else {
    fail("the response schema lets an assessment through", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 6. The route refuses before it touches anything
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  const routePath = path.join(
    ROOT,
    "app",
    "api",
    "workspace",
    "documents",
    "analyse",
    "route.ts",
  );

  let source = "";
  try {
    source = readFileSync(routePath, "utf8");
  } catch {
    problems.push(`the analyse route is missing at ${routePath}`);
  }

  if (source) {
    const body = source.slice(source.indexOf("export async function POST"));

    /*
     * *** THE ORDER MATTERS AND IS ASSERTED ***
     *
     * A refusal that happens after a database read is a refusal that already touched the
     * document. The flag check must come before authentication, the case lookup and any
     * read — so its position in the function body is compared with theirs.
     */
    const gateAt = body.indexOf("documentAnalysisEnabled()");
    const authAt = body.indexOf("getAuthenticatedUser");
    const readAt = body.indexOf("workspace_document_text");

    if (gateAt < 0) {
      problems.push("the route never calls documentAnalysisEnabled()");
    } else {
      if (authAt >= 0 && gateAt > authAt) {
        problems.push("the flag is checked AFTER authentication, so a refusal has already done work");
      }
      if (readAt >= 0 && gateAt > readAt) {
        problems.push(
          "the flag is checked AFTER the document text is read — a refusal that has already " +
            "loaded the document has touched exactly what it exists not to touch",
        );
      }
    }

    // It must not reach for the env var itself.
    if (/process\.env\.AI_DOCUMENT_ANALYSIS_ENABLED/.test(body)) {
      problems.push("the route reads the environment variable directly, bypassing the ZDR key");
    }

    if (MAX_DOCUMENTS_PER_CALL !== 1) {
      problems.push(
        `MAX_DOCUMENTS_PER_CALL is ${MAX_DOCUMENTS_PER_CALL}. A batch is a bigger mistake ` +
          `if the batch is wrong, and this flow has never run.`,
      );
    }
  }

  if (problems.length === 0) {
    pass("the route checks the flag before authentication and before any document is read");
  } else {
    fail("the route does work before refusing", problems.join("\n"));
  }
}

console.log("");
if (failures > 0) {
  console.log(`${failures} FAILURE(S).`);
  process.exitCode = 1;
} else {
  console.log("All checks passed.");
}
console.log("");
