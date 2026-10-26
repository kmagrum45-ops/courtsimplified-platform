/**
 * No name FIELD reaches a model.
 *
 * The user's name and the other party's name are entered in plain form fields
 * and stored in the Canadian database. Until 2026-09-27 all three intake
 * adapters (Small Claims, civil, family) copied them into the raw text the
 * brain sends to OpenAI. The LSO A2I application now states that they are
 * never sent; this suite is what makes that statement true over time.
 *
 * Asserts, over the REAL paths (Small Claims analyzeSmallClaimsWithBrain,
 * runCivilIntakeCanonicalIntegration, runFamilyIntakeCanonicalIntegration,
 * each with the model call OFF), that the normalized intake -- the object
 * JSON-serialised into the prompt in courtSimplifiedBrain.buildCognitionPrompt
 * -- contains neither name, anywhere.
 *
 * NEGATIVE CONTROL: a name the user types inside their own story is still
 * sent (the story is sent; that is disclosed, not hidden). The suite asserts
 * that such a name IS found, so a detector that silently stopped matching
 * would fail here instead of passing everything.
 *
 * No model call, no database, no network.
 *
 * Run: npm run test:no-names-to-model
 */

import { analyzeSmallClaimsWithBrain, type SmallClaimsIntelligenceInput } from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { runCivilIntakeCanonicalIntegration } from "../../src/lib/case-system/orchestration/civilIntakeCanonicalAdapter";
import { runFamilyIntakeCanonicalIntegration } from "../../src/lib/case-system/orchestration/familyIntakeCanonicalAdapter";
import { mapGuidedIntakeToSmallClaimsInput } from "../../app/builder/_components/guidedIntakeToSmallClaimsInput";
import { caseFactsText, readCaseRecord } from "../../src/lib/case-system/caseRecord";
import { forceNoStore } from "../../src/lib/case-system/openaiClient";
import { knownNameLabels } from "../../src/lib/case-system/privacy/nameLabels";
import { withNameLabelsFor } from "../../src/lib/case-system/privacy/modelNameContext";
import { withConfirmedGuidance } from "../../src/lib/security/intakeGuidanceGate";
import { storyNames, withRequestNames } from "../../src/lib/security/requestNames";
import { remainingEssentialQuestions, transitionReview } from "../../src/lib/case-system/intakeReview";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { getCaseValues, pickValueForField } from "../../app/api/generate-form/route";
import { yourStoryDraft } from "../../src/lib/case-system/drafts/caseDrafts";

// Names chosen so they cannot appear in any template or source by accident.
const USER = "Zebediah Quartermaine";
const OTHER = "Ottoline Brackenbury";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : ` -- ${detail}`}`);
  if (!ok) failures += 1;
}

/** Everything that would be JSON-serialised into the model prompt. */
function sentText(output: unknown): string {
  const o = output as Record<string, any>;
  const normalized =
    o?.analysis?.intelligence?.normalizedIntake ??
    o?.intelligence?.normalizedIntake ??
    o?.brain?.normalizedIntake ??
    o?.brainOutput?.normalizedIntake ??
    findNormalized(o);
  if (!normalized) throw new Error("could not locate normalizedIntake in output -- update sentText()");
  return JSON.stringify(normalized);
}

function findNormalized(value: unknown, depth = 0): unknown {
  if (!value || typeof value !== "object" || depth > 6) return null;
  const v = value as Record<string, unknown>;
  if ("normalizedIntake" in v && v.normalizedIntake) return v.normalizedIntake;
  for (const child of Object.values(v)) {
    const hit = findNormalized(child, depth + 1);
    if (hit) return hit;
  }
  return null;
}

function hasName(text: string, name: string): boolean {
  const [first, last] = name.split(" ");
  return text.includes(first) || text.includes(last);
}

function smallClaimsInput(story: string): SmallClaimsIntelligenceInput {
  const base = mapGuidedIntakeToSmallClaimsInput(
    { facts: { role: "plaintiff", amountClaimedText: "$2,000", evidenceText: "An invoice." }, answeredIds: [], matchedClaimType: null } as never,
    { province: "Ontario", city: "Ottawa" },
    story,
  );
  return { ...base, yourName: USER, otherParty: OTHER };
}

(async () => {
  // --- Small Claims
  const sc = await analyzeSmallClaimsWithBrain(smallClaimsInput("They never paid my invoice."), { allowExternalCognition: false });
  const scText = sentText(sc);
  check("Small Claims: user's name field is not sent", !hasName(scText, USER));
  check("Small Claims: other party's name field is not sent", !hasName(scText, OTHER));
  check("Small Claims: the model is still told a name was entered", scText.includes("recorded (not shared with AI)"));

  // --- Negative control: a name typed inside the story IS sent.
  const control = await analyzeSmallClaimsWithBrain(
    smallClaimsInput(`${OTHER} never paid my invoice.`),
    { allowExternalCognition: false },
  );
  check("control: a name the user types in their own story is detected in the payload", hasName(sentText(control), OTHER));

  // --- Civil
  const civilBlank = {
    caseStage: "starting-case", issues: [], documents: [], uploadedEvidenceFiles: [],
    yourName: USER, otherParty: OTHER, yourRole: "Plaintiff", courtLocation: "", courtFileNumber: "",
    amountClaimed: "", limitationDeadline: "", facts: "The contractor damaged my basement.", timeline: "",
    evidence: "Photos.", missingEvidence: "", damagesBreakdown: "", legalRemedy: "Repair costs.",
    settlementEfforts: "", serviceDetails: "", urgent: "", humanRightsGrounds: "", discriminationFacts: "",
    accommodationRequests: "", governmentActor: "", publicDecisionOrConduct: "", institutionalFacts: "",
    privacyRecordsFacts: "",
  };
  const civil = await runCivilIntakeCanonicalIntegration(civilBlank as never);
  const civilText = sentText(civil);
  check("Civil: user's name field is not sent", !hasName(civilText, USER));
  check("Civil: other party's name field is not sent", !hasName(civilText, OTHER));

  // --- Family
  const family = await runFamilyIntakeCanonicalIntegration({
    caseStage: "starting-case",
    role: "applicant",
    yourName: USER,
    otherParty: OTHER,
    issues: [],
    filedDocuments: [],
    facts: "We separated last year and need a parenting schedule.",
  } as never);
  const familyText = sentText(family);
  check("Family: user's name field is not sent", !hasName(familyText, USER));
  check("Family: other party's name field is not sent", !hasName(familyText, OTHER));

  // The assistant's case facts (caseFactsText), sent to the checked answer by /api/assistant/law.
  const record = readCaseRecord({ intakeData: { yourName: USER, otherParty: OTHER, facts: "We separated last year." } }, "family");
  const factsText = caseFactsText(record);
  check("Assistant case facts: the other party's name field is not sent", !hasName(factsText, OTHER), factsText);
  check("Assistant case facts: the user's name field is not sent", !hasName(factsText, USER), factsText);
  check("Assistant case facts: it still says a name is recorded", factsText.includes("recorded (not shared with AI)"), factsText);

  // ---- Every model call, through the one client (site owner, 2026-10-25) -------------------
  // Names the site knows are replaced with labels in what is sent, and put back in what comes
  // back, in every AI route: the confirmed-guidance gate and withRequestNames set the case's
  // names; openaiClient.ts applies them. A fake model stands in; nothing reaches OpenAI.
  const CHILD_A = "Wilhelmina";
  const CHILD_B = "Barnaby";
  const sent: string[] = [];
  const fakeModel = () => forceNoStore({
    chat: { completions: {
      create: async (body: unknown) => { sent.push(JSON.stringify(body)); return { choices: [{ message: { content: "[the other party] and [you] share [child 1] and [child 2]. The other party may answer." } }], usage: {} }; },
      parse: async (body: unknown) => { sent.push(JSON.stringify(body)); return { choices: [{ message: { content: "{}", parsed: { quote: "[the other party] said no" } } }], usage: {} }; },
    } },
    embeddings: { create: async (body: unknown) => { sent.push(JSON.stringify(body)); return { data: [] }; } },
  } as never) as unknown as { chat: { completions: { create: (body: unknown) => Promise<any>; parse: (body: unknown) => Promise<any> } }; embeddings: { create: (body: unknown) => Promise<unknown> } };
  const familyIntake = { yourName: USER, otherParty: OTHER, childrenInfo: `${CHILD_A} (7) and ${CHILD_B} (4), living with me`, facts: `${OTHER} and I separated. ${CHILD_A} is in grade 2.` };
  const labels = knownNameLabels(familyIntake, storyNames(familyIntake.facts));
  check("Labels: the person, the other party and each child are known", [USER, OTHER, CHILD_A, CHILD_B].every((name) => labels.some((item) => item.name === name)), JSON.stringify(labels));
  const modelCall = async () => {
    const client = fakeModel();
    const reply = await client.chat.completions.create({ model: "x", messages: [{ role: "user", content: `Story: ${familyIntake.facts} Children: ${familyIntake.childrenInfo}. You: ${USER}.` }] });
    const parsed = await client.chat.completions.parse({ model: "x", messages: [{ role: "user", content: `${OTHER} refused.` }] });
    await client.embeddings.create({ model: "x", input: [`${OTHER} contract`] });
    return { reply: reply.choices[0].message.content as string, parsed: parsed.choices[0].message.parsed.quote as string };
  };
  sent.length = 0;
  const back = await withNameLabelsFor(labels, modelCall);
  const allSent = sent.join("\n");
  check("Client: no known name in anything sent (create, parse, embeddings)", ![USER, OTHER, CHILD_A, CHILD_B].some((name) => hasName(allSent, name)), allSent.slice(0, 300));
  check("Client: the labels are sent instead", /\[the other party\]/.test(allSent) && /\[child 1\]/.test(allSent) && /\[you\]/.test(allSent));
  check("Client: the real names are put back in what the person sees", back.reply.includes(OTHER) && back.reply.includes(USER) && back.reply.includes(CHILD_A) && back.parsed.includes(OTHER), back.reply);
  check("Client: ordinary words are never replaced (\"The other party may answer\" stays)", back.reply.endsWith("The other party may answer."), back.reply);

  // The confirmed-guidance gate (case review, strategy, the three analyses, the law lookup, the
  // case reader, sourced questions, depth turns, stage resolving) sets the saved case's names.
  const caseId = "11111111-1111-4111-8111-111111111478";
  const revision = "22222222-2222-4222-8222-222222222478";
  const cp: Checkpoint = { version: 1, flowId: caseId, courtPath: "family", revision, inputRevision: revision, sections: { story: { text: familyIntake.facts, location: { city: "Toronto", province: "Ontario" } }, builder: {} } };
  cp.sections.builder.initialUnknowns = remainingEssentialQuestions(cp).map((question) => question.id);
  const master: Record<string, unknown> = { intakeCheckpoint: cp, workflowStatus: transitionReview(transitionReview({}, cp, "review", revision, "now"), cp, "confirm", revision, "now"), guidanceInputRevision: revision, intakeData: familyIntake };
  const owner = { id: "44444444-4444-4444-8444-444444444478" };
  const gated = withConfirmedGuidance(async () => { await modelCall(); return Response.json({ ok: true }); }, { currentAnalysis: true }, {
    authenticate: async () => owner,
    owned: async () => ({ id: caseId, court_path: "family", master_result: master }),
    names: async () => ({ id: caseId, court_path: "family", master_result: master }),
  });
  sent.length = 0;
  const gatedResponse = await gated(new Request("http://localhost/api/case/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caseId }) }));
  check("Gate: the route ran", gatedResponse.status === 200, String(gatedResponse.status));
  check("Gate: no name from the saved case in anything sent", sent.length > 0 && ![USER, OTHER, CHILD_A, CHILD_B].some((name) => hasName(sent.join("\n"), name)), sent.join("\n").slice(0, 300));

  // Routes outside the gate (tidy wording, decision help, guided turns, safety, claim type, the
  // story reading, the court suggestion) set the names their request carries.
  const ungated = withRequestNames(async () => { await modelCall(); return Response.json({ ok: true }); });
  sent.length = 0;
  await ungated(new Request("http://localhost/api/intake/tidy-wording", { method: "POST", body: JSON.stringify({ input: familyIntake }) }));
  check("Outside the gate: no name from the request in anything sent", sent.length > 0 && ![USER, OTHER, CHILD_A, CHILD_B].some((name) => hasName(sent.join("\n"), name)), sent.join("\n").slice(0, 300));

  // The form and the draft are filled from the case file directly: the names are in them.
  const values = getCaseValues(master, "family");
  check("Form: the person's name fills the form", values.plaintiffName === USER, JSON.stringify(values.plaintiffName));
  check("Form: the other party's name fills the form", values.defendantName === OTHER, JSON.stringify(values.defendantName));
  check("Form: a name field on the form takes it", pickValueForField("Applicant full name", values).value === USER || pickValueForField("Name of applicant", values).value === USER, JSON.stringify(pickValueForField("Applicant full name", values)));
  const draft = JSON.stringify(yourStoryDraft(familyIntake as never, new Date("2026-10-25T00:00:00Z")));
  check("Draft: the names are in the person's draft", draft.includes(USER) && draft.includes(OTHER));
  check("Form and draft, with the AI for the same case: the names went nowhere near the model", ![USER, OTHER].some((name) => hasName(allSent, name)));

  // Every API route that can reach the AI client sets its case's names: it is behind the
  // confirmed-guidance gate or withRequestNames. A new AI route without either fails here.
  {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const root = path.resolve(import.meta.dirname, "..", "..");
    const resolveFrom = (from: string, spec: string): string | null => {
      const base = spec.startsWith("@/") ? path.join(root, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null;
      if (!base) return null;
      for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
      return null;
    };
    const reaches = new Map<string, boolean>();
    const reachesModel = (file: string, seen = new Set<string>()): boolean => {
      if (reaches.has(file)) return reaches.get(file)!;
      if (seen.has(file)) return false;
      seen.add(file);
      if (file.endsWith(path.join("case-system", "openaiClient.ts"))) return true;
      const text = fs.readFileSync(file, "utf8");
      const found = [...text.matchAll(/(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)].some((match) => {
        const target = resolveFrom(file, match[1] ?? match[2]);
        return target ? reachesModel(target, seen) : false;
      });
      reaches.set(file, found);
      return found;
    };
    const routes: string[] = [];
    const walk = (dir: string) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full); else if (entry.name === "route.ts") routes.push(full); } };
    walk(path.join(root, "app", "api"));
    const unlabelled = routes.filter((file) => reachesModel(file) && !/withConfirmedGuidance\(|withRequestNames\(/.test(fs.readFileSync(file, "utf8"))).map((file) => path.relative(root, file));
    // Official text only, no person's words: the plain explanation of a provision.
    const NO_PERSON_TEXT = new Set([path.join("app", "api", "law", "explain", "route.ts")]);
    const missing = unlabelled.filter((file) => !NO_PERSON_TEXT.has(file));
    check("Every AI route sets its case's names (the gate or withRequestNames)", missing.length === 0, missing.join(", "));
  }

  // Names typed in the story: a known one is replaced there too; one the site cannot know is not.
  sent.length = 0;
  await withNameLabelsFor(labels, async () => { await fakeModel().chat.completions.create({ model: "x", messages: [{ role: "user", content: `${OTHER} told Zebulon Fairweather everything.` }] }); });
  check("Story: a known name typed in the story is replaced", !hasName(sent.join(""), OTHER));
  check("Story (control): a name the site does not know is sent as typed", sent.join("").includes("Zebulon Fairweather"));
  const storyOnly = knownNameLabels({}, storyNames("My ex, Sarah Jones, kept the car."));
  check("Story: a name the story readers pick out as the other party is labelled", storyOnly.some((item) => item.name === "Sarah Jones" && item.label === "[the other party]"), JSON.stringify(storyOnly));

  console.log(failures ? `\n${failures} failure(s).` : "\nAll checks passed.");
  if (failures) process.exitCode = 1;
})().catch((error) => {
  console.error("verifyNoNamesToModel threw:", error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
