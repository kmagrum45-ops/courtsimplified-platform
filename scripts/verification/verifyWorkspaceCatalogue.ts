/**
 * The document-type catalogue in code and the CHECK constraint in the migration say
 * the same thing, and no type label characterises anything legally.
 *
 * WHAT THIS CATCHES: the duplicated list drifting.
 *
 * The type list exists twice on purpose — in TypeScript, which the picker reads, and
 * in a CHECK constraint, which stops any other client writing outside it. A
 * duplicate that can drift is worse than no duplicate: add a type in code and the
 * database rejects every document a user files under it, with an error that names a
 * constraint and not the cause.
 *
 * It also catches a label that starts doing legal work. "Contract" describes a
 * document; "binding contract" or "proof of payment" asserts something about the
 * user's case, and the type a user confirms becomes the record — so the labels have
 * to stay descriptive (CLAUDE.md §2, the "who does the applying" test).
 *
 * COSTS NOTHING. Reads the catalogue and the migration text.
 *
 * Run: node --import tsx scripts/verification/verifyWorkspaceCatalogue.ts
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_IDS,
  TIMELINE_EVENT_TYPES,
  TIMELINE_EVENT_TYPE_IDS,
} from "../../src/lib/case-workspace/documentTypes";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const MIGRATION = path.join(
  ROOT,
  "supabase",
  "migrations",
  "20260927090000_case_workspace_documents.sql",
);

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

console.log("");
console.log("WORKSPACE CATALOGUE");
console.log("");

// ---------------------------------------------------------------------------
// 1. Code and CHECK constraint agree, exactly
// ---------------------------------------------------------------------------

{
  if (!existsSync(MIGRATION)) {
    fail("the workspace migration is missing", MIGRATION);
  } else {
    const sql = readFileSync(MIGRATION, "utf8");
    const block = /workspace_documents_type_in_catalogue[\s\S]*?\]::"text"\[\]/.exec(sql);

    if (!block) {
      fail("the type CHECK constraint could not be found in the migration");
    } else {
      const inSql: string[] = [...block[0].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]).sort();
      const inCode: string[] = [...DOCUMENT_TYPE_IDS].sort();

      const missingFromSql = inCode.filter((id) => !inSql.includes(id));
      const missingFromCode = inSql.filter((id) => !inCode.includes(id));

      if (missingFromSql.length === 0 && missingFromCode.length === 0) {
        pass(`the ${inCode.length} document types match between code and the CHECK constraint`);
      } else {
        fail(
          "the document-type list has drifted between code and the database",
          [
            ...missingFromSql.map(
              (id) => `"${id}" is in code but NOT in the CHECK — the database will reject it`,
            ),
            ...missingFromCode.map(
              (id) => `"${id}" is in the CHECK but NOT in code — no user can choose it`,
            ),
          ].join("\n"),
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Ids are unique and well-formed
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  for (const [label, ids] of [
    ["document type", DOCUMENT_TYPE_IDS],
    ["timeline event type", TIMELINE_EVENT_TYPE_IDS],
  ] as Array<[string, readonly string[]]>) {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) problems.push(`duplicate ${label} id: ${id}`);
      seen.add(id);
      if (!/^[a-z][a-z-]*[a-z]$/.test(id)) {
        problems.push(`${label} id "${id}" is not lowercase kebab-case`);
      }
    }
  }

  if (problems.length === 0) pass("every catalogue id is unique and kebab-case");
  else fail("a catalogue id is malformed", problems.join("\n"));
}

// ---------------------------------------------------------------------------
// 3. Every type has a label and a usable hint
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];
  for (const type of DOCUMENT_TYPES) {
    if (!type.label || type.label.length < 3) problems.push(`${type.id} has no usable label`);
    if (!type.hint || type.hint.length < 20) {
      problems.push(
        `${type.id} has no usable hint — somebody who is not a lawyer has to be able to choose`,
      );
    }
  }
  for (const type of TIMELINE_EVENT_TYPES) {
    if (!type.label || type.label.length < 3) problems.push(`${type.id} has no usable label`);
  }

  if (problems.length === 0) {
    pass(`all ${DOCUMENT_TYPES.length} document types and ${TIMELINE_EVENT_TYPES.length} event types are described`);
  } else {
    fail("a catalogue entry is not usable", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 4. No label or hint characterises anything legally
// ---------------------------------------------------------------------------

{
  /*
   * The type a user confirms becomes the record, and the record is read back to them
   * and printed in an exhibit index. So a label may describe what a document IS and
   * may never say what it establishes. "Proof of service" is on the safe side of that
   * line because it is the document's own name — a court form is literally called an
   * Affidavit of Service — whereas "proof of payment" would be us asserting that a
   * receipt proves something.
   */
  const FORBIDDEN: Array<{ pattern: RegExp; why: string }> = [
    { pattern: /\bproves?\b|\bproven\b/i, why: "says a document proves something" },
    { pattern: /\bbreach/i, why: "characterises conduct as a breach" },
    { pattern: /\bliable|liability\b/i, why: "assigns liability" },
    { pattern: /\bvalid|invalid|enforceable\b/i, why: "rules on validity" },
    { pattern: /\bbinding\b/i, why: "says an agreement binds" },
    { pattern: /\bstrong|weak|helps|hurts|damaging\b/i, why: "grades the document" },
    { pattern: /\bentitled\b/i, why: "states an entitlement" },
    { pattern: /\byou (should|must|need to)\b/i, why: "gives the reader an instruction" },
  ];

  const problems: string[] = [];
  const texts: Array<[string, string]> = [
    ...DOCUMENT_TYPES.flatMap((t) => [
      [`${t.id} label`, t.label],
      [`${t.id} hint`, t.hint],
    ] as Array<[string, string]>),
    ...TIMELINE_EVENT_TYPES.map((t) => [`${t.id} label`, t.label] as [string, string]),
  ];

  for (const [where, text] of texts) {
    for (const { pattern, why } of FORBIDDEN) {
      // "Proof of service" and "proof that something was paid for" are the
      // document's own name and a plain description of it; neither says the
      // document PROVES a fact in issue. Exempted by exact phrase, not by pattern.
      if (/^proof of service$/i.test(text.trim())) continue;
      if (pattern.test(text)) {
        problems.push(`${where}: ${why} — "${text}"`);
      }
    }
  }

  if (problems.length === 0) {
    pass("no type label or hint characterises a document legally or grades it");
  } else {
    fail("a catalogue label does legal work", problems.join("\n"));
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
