/**
 * Every model call is attributable in the audit log.
 *
 * COSTS NOTHING. Reads source off disk. No network, no AI, no database.
 *
 * WHY THIS IS STATIC AND NOT A RUNTIME CHECK. `observeAiCall` logs a console
 * error when a call happens outside `withAiCallContext`, and a console error
 * on a server nobody is reading is not a control. The property the LSO A2I
 * framework needs — a licensee can review every AI call this system makes —
 * either holds for all call sites or it does not hold at all, and that is a
 * question about the source, answerable before anything ships.
 *
 * WHAT IS ASSERTED, AND WHY EACH ONE IS A PROPERTY RATHER THAN A VALUE
 * (CLAUDE.md section 5: a check must fail on a regression, never on the work
 * we want done):
 *
 *   1. openaiClient.ts routes BOTH create paths through observeAiCall.
 *      Fails if someone unwraps one. Does not care how many call sites exist.
 *
 *   2. Every file that builds a client also opens a context.
 *      Fails when a SEVENTH call site is added without one. Adding a properly
 *      wrapped call site keeps it green, so the check does not punish the work.
 *
 *   3. No OpenAI client is constructed outside openaiClient.ts.
 *      A `new OpenAI()` elsewhere would bypass forceNoStore AND the audit log
 *      in one line. This is the same property verifyNoStore asserts, checked
 *      here too because the reason differs and a future edit to one should not
 *      silently weaken the other.
 *
 *   4. Every call type the code can emit is accepted by the migration's CHECK
 *      constraint, and every value in the constraint is emitted by the code.
 *      Both directions: a type the database rejects means rows silently fail
 *      to insert, and a constraint value nothing emits is a dormant entry of
 *      exactly the kind CLAUDE.md warns about.
 *
 *   5. aiCallLog.ts holds no column that could carry the user's narrative.
 *      Migration Decision 1, asserted rather than trusted.
 *
 * Run: node --import tsx scripts/verification/verifyAiCallLogging.ts
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

const CLIENT_FILE = "src/lib/case-system/openaiClient.ts";
const AUDIT_FILE = "src/lib/audit/aiCallLog.ts";
const MIGRATION = "supabase/migrations/20260922120000_add_ai_call_log.sql";

let failures = 0;

function pass(message: string): void {
  console.log(`pass  ${message}`);
}

function fail(message: string, detail?: string): void {
  failures += 1;
  console.log(`FAIL  ${message}`);
  if (detail) {
    for (const line of detail.split("\n")) console.log(`      ${line}`);
  }
}

function read(relative: string): string {
  return readFileSync(path.join(ROOT, relative), "utf8");
}

/** Every .ts/.tsx under src/ and app/, excluding build output. */
function sourceFiles(): string[] {
  const found: string[] = [];

  function walk(relative: string): void {
    const absolute = path.join(ROOT, relative);
    for (const entry of readdirSync(absolute)) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      const childRelative = path.join(relative, entry);
      const child = path.join(ROOT, childRelative);
      if (statSync(child).isDirectory()) {
        walk(childRelative);
      } else if (/\.tsx?$/.test(entry)) {
        found.push(childRelative.split(path.sep).join("/"));
      }
    }
  }

  walk("src");
  walk("app");
  return found;
}

// ---------------------------------------------------------------------------
// 1. Both create paths are observed.
// ---------------------------------------------------------------------------

const clientSource = read(CLIENT_FILE);

{
  const observed = (clientSource.match(/observeAiCall\(/g) || []).length;
  /*
   * Three: chat.completions.create, chat.completions.parse, responses.create.
   *
   * `.parse` was added on 2026-09-23 after independent review noted only
   * `.create` was wrapped. It is the method someone reaches for when they want
   * a typed response under a JSON schema — the direction this codebase is
   * being pushed — so it was the most likely next call, and it would have
   * bypassed both store:false and this log in one line.
   */
  if (observed >= 3) {
    pass(`openaiClient.ts routes every create path through observeAiCall (${observed} call sites)`);
  } else {
    fail(
      "openaiClient.ts must route chat.completions.create, chat.completions.parse AND responses.create through observeAiCall",
      `found ${observed} observeAiCall(...) call(s); expected at least 3`,
    );
  }
}

// ---------------------------------------------------------------------------
// 2. Every client-building file opens a context.
// 3. No client is constructed outside openaiClient.ts.
// ---------------------------------------------------------------------------

const files = sourceFiles();
const builders: string[] = [];
const unwrapped: string[] = [];
const rogueConstructions: string[] = [];

for (const file of files) {
  const source = read(file);

  if (file !== CLIENT_FILE && /new OpenAI\s*\(/.test(source)) {
    rogueConstructions.push(file);
  }

  if (file === CLIENT_FILE || file === AUDIT_FILE) continue;
  if (!/createOpenAIClient\s*\(/.test(source)) continue;

  builders.push(file);
  if (!/withAiCallContext\s*\(/.test(source)) unwrapped.push(file);
}

if (builders.length === 0) {
  fail(
    "no file builds an OpenAI client",
    "either every call site was removed, or this check stopped finding them — both need a human",
  );
} else if (unwrapped.length === 0) {
  pass(`all ${builders.length} OpenAI call-site file(s) open an audit context`);
} else {
  fail(
    "every file that builds an OpenAI client must run its call inside withAiCallContext",
    `missing in:\n${unwrapped.map((file) => `  ${file}`).join("\n")}`,
  );
}

if (rogueConstructions.length === 0) {
  pass("no OpenAI client is constructed outside openaiClient.ts");
} else {
  fail(
    "an OpenAI client constructed outside openaiClient.ts bypasses both store:false and the audit log",
    rogueConstructions.map((file) => `  ${file}`).join("\n"),
  );
}

// ---------------------------------------------------------------------------
// 4. Code's call types and the database's CHECK constraint agree, both ways.
// ---------------------------------------------------------------------------

{
  const auditSource = read(AUDIT_FILE);
  const unionMatch = auditSource.match(/export type AiCallType =([\s\S]*?);/);
  const codeTypes = new Set(
    Array.from(unionMatch?.[1]?.matchAll(/"([^"]+)"/g) ?? [], (match) => match[1]),
  );

  const migrationSource = read(MIGRATION);
  const checkMatch = migrationSource.match(
    /ai_call_log_call_type_check"\s+CHECK\s*\("call_type"\s+IN\s*\(([\s\S]*?)\)\)/,
  );
  const dbTypes = new Set(
    Array.from(checkMatch?.[1]?.matchAll(/'([^']+)'/g) ?? [], (match) => match[1]),
  );

  if (codeTypes.size === 0 || dbTypes.size === 0) {
    fail(
      "could not read the call-type list from both the code and the migration",
      `code: ${codeTypes.size} value(s); migration: ${dbTypes.size} value(s)`,
    );
  } else {
    const codeOnly = [...codeTypes].filter((value) => !dbTypes.has(value));
    const dbOnly = [...dbTypes].filter((value) => !codeTypes.has(value));

    if (codeOnly.length === 0) {
      pass(`every AiCallType (${codeTypes.size}) is accepted by the CHECK constraint`);
    } else {
      fail(
        "an AiCallType the database will reject means rows that silently fail to insert",
        `in code but not in the constraint: ${codeOnly.join(", ")}`,
      );
    }

    if (dbOnly.length === 0) {
      pass("every value in the CHECK constraint is a call type the code can emit");
    } else {
      fail(
        "a CHECK-constraint value nothing emits is a dormant entry — remove it or wire it",
        `in the constraint but not in code: ${dbOnly.join(", ")}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Migration Decision 1 — no column can carry the narrative.
// ---------------------------------------------------------------------------

{
  const auditSource = read(AUDIT_FILE);
  const rowMatch = auditSource.match(/type AiCallLogRow = \{([\s\S]*?)\n\};/);
  const rowBody = rowMatch?.[1] ?? "";

  if (!rowBody) {
    fail("could not read AiCallLogRow", "this check cannot assert Decision 1 without it");
  } else {
    // Named fields, not a substring sweep: "input_chars" and "input_sha256"
    // both contain "input", and a check that flagged them would fail on the
    // very design it exists to protect.
    const forbidden = ["prompt\b", "input_text", "story", "narrative", "messages", "content"];
    const found = forbidden.filter((name) =>
      new RegExp(`^\\s*${name.replace("\\b", "")}\\s*:`, "m").test(rowBody),
    );

    if (found.length === 0) {
      pass("no audit-log column can carry the user's narrative (migration Decision 1)");
    } else {
      fail(
        "an audit-log column that could hold the user's narrative",
        `fields: ${found.join(", ")} — see migration Decision 1`,
      );
    }
  }

  /*
   * `structured_output` IS a column that can carry the narrative, and the
   * sweep above cannot see it.
   *
   * Independent review on 2026-09-23: the migration's Decision 2 claimed the
   * structured output was "non-legal by construction" because every call
   * returns "a classification label, a stage code, a content id, a boolean".
   * That is untrue of four of the six call types — safety-pass returns
   * `reason` (the model's sentence about why someone is in distress),
   * court-path-classifier returns `reasoning`, small-claims-analysis returns
   * free sentences naming evidence and counterparties, and
   * extract-intake-facts exists to return facts pulled from the story.
   *
   * So the check is not "is there a column called narrative" — it is "is the
   * one unbounded column redacted before it is written". Asserted three ways,
   * because this is the claim the proposed privacy wording rests on.
   */
  {
    const problems: string[] = [];

    if (!/structured_output: structuredOutputOf\(/.test(auditSource)) {
      problems.push("structured_output is not produced by structuredOutputOf()");
    }
    if (!/return redact\(JSON\.parse\(content\)\)/.test(auditSource)) {
      problems.push("structuredOutputOf does not pass the parsed body through redact()");
    }
    if (/content\.slice\(/.test(auditSource)) {
      problems.push(
        "raw model text is still sliced into the row on a parse failure — record its length, not its content",
      );
    }

    if (problems.length === 0) {
      pass("structured_output is redacted before it is written");
    } else {
      fail("the audit log can store the model's prose about the user", problems.join("\n"));
    }

    // And the redactor must actually redact. A `redact` that returned its
    // input would satisfy every check above.
    const proseFields = auditSource.match(/const PROSE_FIELDS = new Set\(\[([\s\S]*?)\]\)/);
    const named = Array.from(proseFields?.[1]?.matchAll(/"([^"]+)"/g) ?? [], (m) => m[1]);
    const mustCover = ["reason", "reasoning", "caseFileRecorded", "caseFileNotRecorded"];
    const missing = mustCover.filter((field) => !named.includes(field));

    if (missing.length === 0) {
      pass(`PROSE_FIELDS names all ${mustCover.length} known prose fields (${named.length} total)`);
    } else {
      fail(
        "PROSE_FIELDS omits a field a call type is known to return as prose",
        missing.join(", "),
      );
    }
  }

  // prompt_version is the one field whose name contains "prompt", and it must
  // be a DERIVED hash rather than the prompt itself. Asserted separately
  // because the sweep above deliberately does not catch it.
  if (/prompt_version: promptVersionOf\(/.test(auditSource)) {
    pass("prompt_version is derived by promptVersionOf, not the prompt text");
  } else {
    fail("prompt_version must be set from promptVersionOf(), never from prompt text");
  }
}

console.log("");
console.log(
  `${builders.length} OpenAI call-site file(s) checked. ` +
    (failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`),
);

process.exit(failures === 0 ? 0 : 1);
