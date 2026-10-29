/**
 * The platform only does what A2I has approved -- and on production, an
 * unapproved feature reaches nobody but the listed testers.
 *
 * COSTS NOTHING. Pure checks: no network, no database, no model.
 *
 * WHAT FAILURE THIS CATCHES:
 *   - a "needs-a2i-approval" capability switched on with no recorded approval
 *     (date, reference, conditions) -- legal-services help turned on without
 *     the regulator's written go-ahead;
 *   - ON PRODUCTION (VERCEL_ENV or NEXT_PUBLIC_VERCEL_ENV "production"), any
 *     approval-tier capability or AI-advice switch (every key in
 *     capabilities.CAPABILITY_KEYS) being on for someone who is not a signed-in
 *     user listed in A2I_TESTER_USER_IDS: with no list, an unparsable list, no
 *     user, or an unlisted user (site owner, 2026-10-29: "production defaults
 *     off, owner allowlist"). Until that date OWNER_LIVE_TESTING and the
 *     switches' code defaults turned all of it on for everyone on production;
 *   - a listed tester on production getting anything other than what the same
 *     switches give on a preview (the owner tests the real thing);
 *   - previews, staging and local changing behaviour: there each key must be
 *     exactly what its own switch says, whoever asks;
 *   - a switch's "off" variable no longer turning it off, testers included;
 *   - library code deep inside a request not seeing the request's user
 *     (capabilityRequest.ts), or seeing it outside the request;
 *   - the browser deciding on its own: there every switch must return the
 *     server's answer (CapabilityProvider), and with none, off;
 *   - a previewed capability not reported as preview-only (no testing notice).
 *
 * It does NOT assert which switches are on: approving one is exactly the work
 * the registry exists to make easy (CLAUDE.md section 5, "a check must assert
 * a property, not a current value"). Opening a key to everyone on production
 * (OPEN_TO_EVERYONE_ON_PRODUCTION, or an A2I approval) passes too.
 *
 * Run: npm run test:a2i-scope
 */

import { readFileSync } from "node:fs";
import * as gateModule from "../../middleware";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  A2I_SCOPE,
  OWNER_LIVE_TESTING,
  approvedForRealUsers,
  isInScope,
  listScope,
  scopeIsPreviewOnly,
  type ScopeKey,
} from "../../src/lib/case-system/policy/a2iScope";
import { OPEN_TO_EVERYONE_ON_PRODUCTION, TESTER_ENV_VAR, setClientCapabilities, testerIds } from "../../src/lib/case-system/policy/capabilityAccess";
import { CAPABILITY_KEYS, capabilityOn, capabilitySetFor, type CapabilityKey } from "../../src/lib/case-system/policy/capabilities";
import { withCapabilityUserId } from "../../src/lib/case-system/policy/capabilityRequest";
import * as phaseScope from "../../src/lib/content-library/phaseScope";
import { SWITCH_BASE } from "../../src/lib/content-library/phaseScope";
import { documentAnalysisEnabled } from "../../src/lib/case-workspace/aiAnalysis";

let failures = 0;
function check(name: string, ok: boolean, detail?: string): void {
  if (ok) console.log(`pass  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

type Env = Record<string, string | undefined>;
const TESTER = "0d8f5a52-3c1e-4c7b-9a51-2f6e1b0c7a11";
const OTHER = "7b2e9c40-1a3d-4e8f-b6c5-d4a3b2c1e0f9";
const PROD: Env = { VERCEL_ENV: "production" };
const PROD_PUBLIC: Env = { NEXT_PUBLIC_VERCEL_ENV: "production" };
const LISTED: Env = { [TESTER_ENV_VAR]: `${TESTER}` };

/** On for everyone on production by a recorded decision: an A2I approval, or the owner's open list. */
function openToEveryone(key: CapabilityKey): boolean {
  if (OPEN_TO_EVERYONE_ON_PRODUCTION.includes(key)) return true;
  if (key in A2I_SCOPE) {
    const capability = A2I_SCOPE[key as ScopeKey] as { productionTestersOnly?: string } & Parameters<typeof approvedForRealUsers>[0];
    return approvedForRealUsers(capability) && !capability.productionTestersOnly;
  }
  return false;
}

const listOf = (keys: CapabilityKey[]) => keys.join(", ");

function main(): void {
  // Nothing in this process's own environment may colour the answers.
  for (const name of ["VERCEL_ENV", "NEXT_PUBLIC_VERCEL_ENV", TESTER_ENV_VAR, "NEXT_PUBLIC_CS_SCOPE_PREVIEW"]) delete process.env[name];
  const keys = [...CAPABILITY_KEYS];

  // ---- the registry ----
  const unapproved = listScope().filter(
    (c) =>
      c.tier === "needs-a2i-approval" &&
      c.enabled &&
      !(c.approval && c.approval.approvedOn && c.approval.reference && c.approval.conditions),
  );
  check(
    "no approval-tier capability is switched on without a recorded A2I approval",
    unapproved.length === 0,
    unapproved.map((c) => c.id).join(", "),
  );
  check(
    "no capability claims an A2I approval it does not have",
    listScope().every((c) => !c.approval || Boolean(c.approval.approvedOn && c.approval.reference)),
  );
  const ids = listScope().map((c) => c.id);
  check("capability ids are unique", new Set(ids).size === ids.length);
  check("every A2I capability and every switch is in the one list", Object.keys(A2I_SCOPE).every((key) => keys.includes(key as CapabilityKey)) && Object.keys(SWITCH_BASE).every((key) => keys.includes(key as CapabilityKey)) && keys.includes("documentAnalysis"));

  if (OWNER_LIVE_TESTING.enabled) {
    check(
      "owner live testing: the decision is recorded (date, who, why)",
      Boolean(OWNER_LIVE_TESTING.decidedOn && OWNER_LIVE_TESTING.decidedBy && OWNER_LIVE_TESTING.reason),
    );
    const middleware = readFileSync(path.join(path.resolve(import.meta.dirname, "..", ".."), "middleware.ts"), "utf8");
    check(
      "owner live testing: the whole site is behind the password gate, which fails closed",
      middleware.includes("cs_site_access") && /SITE_ACCESS_PASSWORD/.test(middleware) && /[Ff]ails closed/.test(middleware),
    );
  }
  // The temporary Preview opening (2026-10-09) never opens Production. A
  // property, not today's code: with the opening removed, this still passes.
  const gate = gateModule as { previewIsOpen?: (env: Env) => boolean };
  check(
    "the password gate is never opened on Production (or with no environment set)",
    !gate.previewIsOpen ||
      (!gate.previewIsOpen({ VERCEL_ENV: "production" }) && !gate.previewIsOpen({}) && !gate.previewIsOpen({ VERCEL_ENV: "development" })),
  );

  // ---- production: off unless a listed tester ----
  const closedTo = (env: Env, userId: string | null) => keys.filter((key) => !openToEveryone(key) && capabilityOn(key, { env, userId }));
  check("production, no tester list: everything gated is off for a signed-in user", closedTo(PROD, TESTER).length === 0, listOf(closedTo(PROD, TESTER)));
  check("production (public variable only), no tester list: everything gated is off", closedTo(PROD_PUBLIC, TESTER).length === 0, listOf(closedTo(PROD_PUBLIC, TESTER)));
  check("production, listed tester list: off for a user not on it", closedTo({ ...PROD, ...LISTED }, OTHER).length === 0, listOf(closedTo({ ...PROD, ...LISTED }, OTHER)));
  check("production, listed tester list: off for nobody signed in", closedTo({ ...PROD, ...LISTED }, null).length === 0, listOf(closedTo({ ...PROD, ...LISTED }, null)));
  for (const [label, list] of [
    ["empty", ""],
    ["only commas and spaces", " , ,"],
    ["an email instead of an id", "owner@example.com"],
    ["one good id and one bad entry", `${TESTER},not-an-id`],
    ["ids separated by semicolons", `${TESTER};${OTHER}`],
  ] as const) {
    const env = { ...PROD, [TESTER_ENV_VAR]: list };
    check(`production, tester list ${label}: fails closed (off for the tester too)`, testerIds(env).size === 0 && closedTo(env, TESTER).length === 0, listOf(closedTo(env, TESTER)));
  }
  check("production: a user id that merely contains a listed id is not listed", closedTo({ ...PROD, ...LISTED }, `${TESTER}0`).length === 0);
  check("production: the anonymous answer the page starts with is off for everything gated", keys.every((key) => openToEveryone(key) || !capabilitySetFor({ env: PROD, userId: null })[key]));

  // ---- production: a listed tester gets what a preview gets ----
  const previewEnv: Env = { VERCEL_ENV: "preview" };
  for (const [label, extra] of [
    ["", {}],
    [" (several ids, spaces, capitals)", { [TESTER_ENV_VAR]: ` ${OTHER} , ${TESTER.toUpperCase()} ` }],
  ] as const) {
    const env = { ...PROD, ...LISTED, ...extra };
    const differ = keys.filter((key) => capabilityOn(key, { env, userId: TESTER }) !== capabilityOn(key, { env: previewEnv, userId: TESTER }));
    check(`production, listed tester${label}: every capability is exactly as on a preview`, differ.length === 0, listOf(differ));
  }
  const testerOn = keys.filter((key) => capabilityOn(key, { env: { ...PROD, ...LISTED }, userId: TESTER }));
  check("production, listed tester: the testing switches really are on for them (not merely equal)", OWNER_LIVE_TESTING.enabled ? (Object.keys(A2I_SCOPE) as ScopeKey[]).every((key) => testerOn.includes(key)) : true, `on: ${listOf(testerOn)}`);

  // ---- previews, staging, local: everything on while the owner tests, whoever asks ----
  // A property, not the code under test: with OWNER_LIVE_TESTING on and no switch
  // variable set, off production every capability is on, for anyone (formFilling
  // only while the recorded code-level pause is off). The "off" variables are
  // checked below.
  if (OWNER_LIVE_TESTING.enabled) {
    for (const [label, env] of [
      ["a preview", { VERCEL_ENV: "preview" }],
      ["development", { VERCEL_ENV: "development" }],
      ["local (no Vercel variable)", {}],
      ["a preview with a tester list", { VERCEL_ENV: "preview", ...LISTED }],
    ] as const) {
      const wrong = keys.filter((key) =>
        [TESTER, OTHER, null].some((userId) => capabilityOn(key, { env, userId }) !== (key === "formFilling" ? !phaseScope.FORM_COMPLETION_PAUSED : true)),
      );
      check(`${label}, owner live testing on, no switch variables: every capability is on, for anyone`, wrong.length === 0, listOf(wrong));
    }
  }

  // ---- each switch's "off" still turns it off, testers included ----
  const OFF_VARIABLES: Partial<Record<CapabilityKey, Env>> = {
    aiAnalysisText: { AI_ANALYSIS_TEXT_TO_USERS: "off" },
    appliedLaw: { APPLIED_LAW: "off" },
    plainExplanations: { PLAIN_EXPLANATIONS: "off" },
    deepAnalysis: { ANALYSIS_DEPTH: "fast" },
    researchStep: { RESEARCH_STEP: "off" },
    sourcedQuestions: { SOURCED_QUESTIONS: "off" },
    assistantLaw: { ASSISTANT_LAW: "off" },
    checkedAnswers: { CHECKED_ANSWERS: "off" },
    strategy: { STRATEGY: "off" },
    caseUnderstanding: { CASE_UNDERSTANDING: "off" },
    caseReader: { CASE_READER: "off" },
    documentAnalysis: { AI_DOCUMENT_ANALYSIS_ENABLED: "false" },
  };
  const stillOn = (Object.keys(OFF_VARIABLES) as CapabilityKey[]).filter((key) =>
    [previewEnv, { ...PROD, ...LISTED }].some((env) => capabilityOn(key, { env: { ...env, ...OFF_VARIABLES[key] }, userId: TESTER })),
  );
  check("each switch's own off variable turns it off on a preview and for a production tester", stillOn.length === 0, listOf(stillOn));
  const unswitched = keys.filter((key) => !(key in A2I_SCOPE) && key !== "formFilling" && !(key in OFF_VARIABLES));
  check("every switch has its off variable checked here", unswitched.length === 0, listOf(unswitched));

  // ---- the named functions are the same decision as capabilityOn ----
  const named: Record<string, (env: Env, userId: string | null) => boolean> = {
    aiAnalysisText: (env, userId) => phaseScope.aiAnalysisTextToUsers(env, { userId }),
    appliedLaw: (env, userId) => phaseScope.appliedLawEnabled(env, { userId }),
    plainExplanations: (env, userId) => phaseScope.plainExplanationsEnabled(env, { userId }),
    deepAnalysis: (env, userId) => phaseScope.deepIntakeAnalysis(env, { userId }),
    researchStep: (env, userId) => phaseScope.researchStepEnabled(env, { userId }),
    sourcedQuestions: (env, userId) => phaseScope.sourcedQuestionsEnabled(env, { userId }),
    assistantLaw: (env, userId) => phaseScope.assistantLawEnabled(env, { userId }),
    checkedAnswers: (env, userId) => phaseScope.checkedAnswersEnabled(env, { userId }),
    strategy: (env, userId) => phaseScope.strategyEnabled(env, { userId }),
    caseUnderstanding: (env, userId) => phaseScope.caseUnderstandingEnabled(env, { userId }),
    caseReader: (env, userId) => phaseScope.caseReaderEnabled(env, { userId }),
    formFilling: (env, userId) => phaseScope.formFillingEnabled(env, { userId }),
    documentAnalysis: (env, userId) => documentAnalysisEnabled(env, undefined, userId),
  };
  const mismatched: string[] = [];
  for (const env of [PROD, { ...PROD, ...LISTED }, previewEnv]) {
    for (const userId of [TESTER, OTHER, null]) {
      for (const [name, fn] of Object.entries(named)) {
        const key = name as CapabilityKey;
        if (fn(env, userId) !== capabilityOn(key, { env, userId })) mismatched.push(`${name}@${env.VERCEL_ENV}/${userId ? (userId === TESTER ? "tester" : "other") : "none"}`);
      }
      for (const key of Object.keys(A2I_SCOPE) as ScopeKey[]) {
        if (isInScope(key, { env, userId }) !== capabilityOn(key, { env, userId })) mismatched.push(`isInScope ${key}`);
        if (scopeIsPreviewOnly(key, { env, userId }) !== (capabilityOn(key, { env, userId }) && !approvedForRealUsers(A2I_SCOPE[key]))) mismatched.push(`preview-only ${key}`);
      }
    }
  }
  check("every named switch answers exactly as capabilityOn", mismatched.length === 0, mismatched.slice(0, 8).join(", "));

  // ---- the request's user, at any depth ----
  void (async () => {
    process.env.VERCEL_ENV = "production";
    process.env[TESTER_ENV_VAR] = TESTER;
    const outside = keys.filter((key) => !openToEveryone(key) && capabilityOn(key));
    const asTester = await withCapabilityUserId(TESTER, async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return keys.filter((key) => capabilityOn(key));
    });
    const asOther = await withCapabilityUserId(OTHER, async () => keys.filter((key) => !openToEveryone(key) && capabilityOn(key)));
    const deepCalls = await withCapabilityUserId(TESTER, async () => [isInScope("caseSpecificDeadlines"), phaseScope.checkedAnswersEnabled(), documentAnalysisEnabled()]);
    // A caller handing in a partial env (no VERCEL_ENV in it) while the deployment
    // itself is production must still get production's answer, not the preview's.
    const partialEnvs: Env[] = [{}, { APPLIED_LAW: "on" }, { VERCEL_ENV: "preview" }];
    const partialLeaks = partialEnvs.flatMap((env) =>
      [OTHER, null].flatMap((userId) => [
        ...keys.filter((key) => !openToEveryone(key) && capabilityOn(key, { env, userId })).map((key) => `capabilityOn ${key}`),
        ...Object.entries(named).filter(([key, fn]) => !openToEveryone(key as CapabilityKey) && fn(env, userId)).map(([key]) => `named ${key}`),
        ...(Object.keys(A2I_SCOPE) as ScopeKey[]).filter((key) => !openToEveryone(key) && isInScope(key, { env, userId })).map((key) => `isInScope ${key}`),
      ]),
    );
    const partialTester = keys.filter((key) => capabilityOn(key, { env: {}, userId: TESTER }) !== capabilityOn(key, { env: { ...PROD, ...LISTED }, userId: TESTER }));
    // The owner-testing override of documentAnalysisEnabled is a check's lever, never production's.
    const overrideOnProd = [documentAnalysisEnabled({}, true, OTHER), documentAnalysisEnabled({}, true, null), documentAnalysisEnabled({ ...PROD }, true, null)];
    delete process.env.VERCEL_ENV;
    delete process.env[TESTER_ENV_VAR];
    check("production: a check made outside any request is off (no user, fails closed)", outside.length === 0, listOf(outside));
    check("production: inside a listed tester's request, every check at any depth sees them (after an await too)", testerOn.every((key) => asTester.includes(key)) && asTester.length === testerOn.length, `${listOf(asTester)} vs ${listOf(testerOn)}`);
    check("production: inside an unlisted user's request, everything gated is off", asOther.length === 0, listOf(asOther));
    check("production deployment, a caller passes a partial env (or a preview's): still off for anyone not listed", partialLeaks.length === 0, partialLeaks.slice(0, 8).join(", "));
    check("production deployment, a caller passes a partial env: a listed tester still gets the tester's answer", partialTester.length === 0, listOf(partialTester));
    check("production: documentAnalysisEnabled's owner-testing override is refused for anyone not listed", overrideOnProd.every((value) => !value));
    check("production: library code with no parameter (deadlines, checked answers, documents) reads the request's user", deepCalls.every((value, index) => value === [isInScope("caseSpecificDeadlines", { env: { ...PROD, ...LISTED }, userId: TESTER }), phaseScope.checkedAnswersEnabled({ ...PROD, ...LISTED }, { userId: TESTER }), documentAnalysisEnabled({ ...PROD, ...LISTED }, undefined, TESTER)][index]));

    // ---- the browser never decides ----
    const g = globalThis as { window?: unknown };
    g.window = {};
    try {
      setClientCapabilities(null);
      const beforeAnswer = keys.filter((key) => capabilityOn(key, { env: previewEnv, userId: TESTER }) || named[key]?.(previewEnv, TESTER));
      const deepBefore = [isInScope("caseSpecificDeadlines"), phaseScope.strategyEnabled(), documentAnalysisEnabled()].some(Boolean);
      check("browser, before the server answers: every capability is off (even where a preview would have it on)", beforeAnswer.length === 0 && !deepBefore, listOf(beforeAnswer));
      const served = Object.fromEntries(keys.map((key, index) => [key, index % 2 === 0]));
      setClientCapabilities(served);
      const notServed = keys.filter((key) => capabilityOn(key, { env: PROD, userId: null }) !== served[key] || (named[key] && named[key](PROD, null) !== served[key]));
      check("browser: every capability is exactly the server's answer, whatever env it is handed", notServed.length === 0, listOf(notServed));
    } finally {
      setClientCapabilities(null);
      delete g.window;
    }

    // ---- the testing preview, when the owner's live testing is off ----
    if (!OWNER_LIVE_TESTING.enabled) {
      const unapprovedKeys = (Object.keys(A2I_SCOPE) as ScopeKey[]).filter((key) => A2I_SCOPE[key].tier === "needs-a2i-approval" && !approvedForRealUsers(A2I_SCOPE[key]));
      check("preview variable on, on a preview: unapproved capabilities on and flagged", unapprovedKeys.every((key) => isInScope(key, { env: { NEXT_PUBLIC_CS_SCOPE_PREVIEW: "on", VERCEL_ENV: "preview" }, userId: null }) && scopeIsPreviewOnly(key, { env: { NEXT_PUBLIC_CS_SCOPE_PREVIEW: "on", VERCEL_ENV: "preview" }, userId: null })));
      check("preview variable not exactly \"on\": off", unapprovedKeys.every((key) => !isInScope(key, { env: { NEXT_PUBLIC_CS_SCOPE_PREVIEW: "true", VERCEL_ENV: "preview" }, userId: null })));
      check("preview variable on, on production, even for a tester: off", unapprovedKeys.every((key) => !isInScope(key, { env: { NEXT_PUBLIC_CS_SCOPE_PREVIEW: "on", ...PROD, ...LISTED }, userId: TESTER })));
    }
    check(
      "information-tier capabilities are never reported as preview-only",
      (Object.keys(A2I_SCOPE) as ScopeKey[]).filter((key) => A2I_SCOPE[key].tier === "information").every((key) => !scopeIsPreviewOnly(key, { env: previewEnv, userId: TESTER })),
    );
    check(
      "a capability on for testing is reported as preview-only, so its screen shows the notice",
      (Object.keys(A2I_SCOPE) as ScopeKey[]).every((key) => !isInScope(key, { env: previewEnv, userId: TESTER }) || approvedForRealUsers(A2I_SCOPE[key]) || scopeIsPreviewOnly(key, { env: previewEnv, userId: TESTER })),
    );

    // ---- the list is server-side only ----
    const root = path.resolve(import.meta.dirname, "..", "..");
    const access = readFileSync(path.join(root, "src/lib/case-system/policy/capabilityAccess.ts"), "utf8");
    check("the tester list is read from a server-side variable, never a NEXT_PUBLIC_ one", TESTER_ENV_VAR === "A2I_TESTER_USER_IDS" && !/NEXT_PUBLIC_A2I/.test(access));

    console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
    if (failures) process.exitCode = 1;
  })();
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
