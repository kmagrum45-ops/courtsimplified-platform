/**
 * No file name reaches a model. Asserted three ways, because one way is not
 * enough for a property this easy to reintroduce.
 *
 * COSTS NOTHING. Reads source off disk and calls pure payload builders. No
 * network, no AI, no database.
 *
 * *** WHY THIS IS THREE CHECKS AND NOT ONE ***
 *
 *   STRUCTURAL   No evidence-file type has a field that can hold a name.
 *                This is the strong one. If it holds, the other two cannot
 *                fail — there is nothing in the system to leak.
 *
 *   SOURCE       No file picker reads `.name` off the DOM File object.
 *                Catches the reintroduction at the only door it can come
 *                through, before it reaches a type at all.
 *
 *   BEHAVIOURAL  The real payload builders, run over real inputs, produce
 *                text with nothing filename-shaped in it. Catches a leak
 *                that arrives some other way — a field called something
 *                else, a stringified blob, an id built from a name.
 *
 * *** THE NEGATIVE CONTROL ***
 *
 * A detector that never fires passes every check for the wrong reason. So the
 * behavioural half also runs a payload that DOES contain a filename, in a
 * field users legitimately type into, and asserts the detector catches it. If
 * that control ever stops failing, the detector has stopped working and every
 * other pass in this file is worthless.
 *
 * *** WHY A USER'S OWN TEXT IS NOT SCRUBBED ***
 *
 * Someone may write "I have attached invoice-4471.pdf" in their own
 * description. That is a disclosure they chose to make, in a field the UI says
 * is sent to the AI. It is not the leak this file exists to prevent, which is
 * the system reading a name the user never offered. So the behavioural check
 * uses fixtures whose free text is clean, and tests the BUILDER, not the user.
 *
 * Run: node --import tsx scripts/verification/verifyNoFilenamesToModel.ts
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import {
  buildRawUserText,
  type SmallClaimsIntelligenceInput,
} from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { buildUploadNarrative } from "../../src/lib/case-system/orchestration/civilIntakeCanonicalAdapter";
import {
  assignReferences,
  evidenceFileId,
  readSelectedFiles,
  highestReferenceNumber,
} from "../../src/lib/case-system/evidence/evidenceReference";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

let failures = 0;

function pass(message: string): void {
  console.log(`pass  ${message}`);
}

function fail(message: string, detail?: string): void {
  failures += 1;
  console.log(`FAIL  ${message}`);
  if (detail) for (const line of detail.split("\n")) console.log(`      ${line}`);
}

function read(relative: string): string {
  return readFileSync(path.join(ROOT, relative), "utf8");
}

/**
 * Anything shaped like a file name: a token with no spaces ending in a
 * document or image extension.
 *
 * Deliberately broad. A false positive here costs someone five minutes
 * renaming a fixture; a false negative ships a leak.
 */
const FILENAME_PATTERN =
  /\b[\w][\w .()\-]{0,80}\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|gif|heic|webp|txt|csv|rtf|odt|zip|eml|msg|mov|mp4|m4a|heif)\b/i;

function findFilenames(text: string): string[] {
  const found = new Set<string>();
  const global = new RegExp(FILENAME_PATTERN.source, "gi");
  for (const match of text.matchAll(global)) found.add(match[0]);
  return [...found];
}

// ===========================================================================
// 1. STRUCTURAL — no type can hold a name
// ===========================================================================

const EVIDENCE_TYPES: Array<{ file: string; typeName: string }> = [
  {
    file: "src/lib/case-system/intelligence/smallClaimsIntelligenceEngine.ts",
    typeName: "SmallClaimsEvidenceFile",
  },
  {
    file: "src/lib/case-system/orchestration/civilIntakeCanonicalAdapter.ts",
    typeName: "CivilCanonicalEvidenceFile",
  },
  { file: "app/builder/_components/CivilIntake.tsx", typeName: "EvidenceFile" },
  { file: "app/builder/_components/FamilyIntake.tsx", typeName: "EvidenceFile" },
];

/** Field names that would hold, or could be made to hold, a file name. */
const FORBIDDEN_FIELDS = [
  "name",
  "fileName",
  "filename",
  "originalName",
  "originalFilename",
  "path",
  "filePath",
  "fullPath",
  "webkitRelativePath",
];

{
  const offenders: string[] = [];

  for (const { file, typeName } of EVIDENCE_TYPES) {
    const source = read(file);
    const start = source.indexOf(`type ${typeName} = {`);
    if (start === -1) {
      fail(`could not find type ${typeName} in ${file}`);
      continue;
    }
    const body = source.slice(start, source.indexOf("\n};", start));

    for (const field of FORBIDDEN_FIELDS) {
      // Match a property declaration at the start of a line, so that a
      // mention inside a comment (this codebase has many) does not trip it.
      if (new RegExp(`^\\s{2}${field}\\??\\s*:`, "m").test(body)) {
        offenders.push(`${typeName} (${file}) has a \`${field}\` field`);
      }
    }
  }

  if (offenders.length === 0) {
    pass(`no evidence-file type (${EVIDENCE_TYPES.length} checked) can hold a file name`);
  } else {
    fail(
      "an evidence-file type has a field that can hold a file name",
      `${offenders.join("\n")}\nSee src/lib/case-system/evidence/evidenceReference.ts.`,
    );
  }
}

// ===========================================================================
// 2. SOURCE — no picker reads .name off a File
// ===========================================================================

function sourceFiles(): string[] {
  const found: string[] = [];
  function walk(relative: string): void {
    for (const entry of readdirSync(path.join(ROOT, relative))) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      const childRelative = path.join(relative, entry);
      if (statSync(path.join(ROOT, childRelative)).isDirectory()) walk(childRelative);
      else if (/\.tsx?$/.test(entry)) found.push(childRelative.split(path.sep).join("/"));
    }
  }
  walk("src");
  walk("app");
  return found;
}

{
  // The one module allowed to touch a FileList is the one that deliberately
  // does not read `name` from it.
  const READER = "src/lib/case-system/evidence/evidenceReference.ts";
  const offenders: string[] = [];

  for (const file of sourceFiles()) {
    if (file === READER) continue;
    const source = read(file);

    /*
     * Reading a FileList anywhere else is itself the finding: a second reader
     * is how the first rule gets quietly re-broken.
     *
     * BROADENED 2026-09-23. The first version matched three spellings —
     * `Array.from(files)`, `new FileReader`, `.files[0]` — and independent
     * review pointed out that `for (const f of e.target.files)` or
     * `[...files]` would walk straight past it. The catch-all now is any read
     * of `.files` off a target, plus the spread and for-of forms.
     *
     * A false positive here costs someone a minute adding a file to the
     * exception above. A false negative ships a leak.
     */
    // `[\w$.]*files` so a dotted path matches: `e.target.files` is the
    // ordinary spelling and an earlier version of this list only handled
    // `files` and `x.files`, so a for-of over `e.target.files` walked past it.
    const FILES_EXPR = String.raw`[\w$.]*\bfiles\b`;
    const readers = [
      new RegExp(String.raw`Array\.from\(\s*${FILES_EXPR}`),
      /new FileReader/,
      new RegExp(String.raw`${FILES_EXPR}\s*\[`),
      new RegExp(String.raw`\.\.\.\s*${FILES_EXPR}`),
      new RegExp(String.raw`\bof\s+${FILES_EXPR}`),
      new RegExp(String.raw`${FILES_EXPR}\s*\.\s*(?:map|forEach|filter|reduce|item)\s*\(`),
    ];
    if (readers.some((pattern) => pattern.test(source))) {
      offenders.push(`${file} reads a FileList directly`);
    }
  }

  if (offenders.length === 0) {
    pass(`only ${READER} reads a FileList, and it never reads \`name\``);
  } else {
    fail(
      "a second FileList reader exists; route it through readSelectedFiles instead",
      offenders.join("\n"),
    );
  }
}

{
  const reader = read("src/lib/case-system/evidence/evidenceReference.ts");
  const body = reader.slice(reader.indexOf("export function readSelectedFiles"));
  const fn = body.slice(0, body.indexOf("\n}"));

  if (/file\.name|\.webkitRelativePath/.test(fn)) {
    fail("readSelectedFiles reads the file name — that is the one thing it must not do");
  } else {
    pass("readSelectedFiles reads size, type and lastModified only");
  }
}

// ===========================================================================
// 2b. The API routes refuse a body that still carries a name
// ===========================================================================
//
// Added 2026-09-23. The three analyze routes each validate uploads against a
// STRICT allowlist — unknown keys are rejected — and two of them still listed
// `name`, `fileName` and `originalName` after the field was removed from the
// types. That was wrong in both directions at once: the routes would have
// rejected every payload carrying the new neutral `reference`, AND accepted
// one carrying a file name.
//
// Found by inspection rather than by any check, which is why this now exists.
// With the allowlists corrected these routes are a second, independent control
// behind the structural one: even if a future edit puts `name` back on a type,
// the request does not get past the door.

{
  const ROUTES = [
    "app/api/small-claims/analyze/route.ts",
    "app/api/civil/analyze/route.ts",
    "app/api/family/analyze/route.ts",
  ];

  const offenders: string[] = [];
  const accepting: string[] = [];

  for (const route of ROUTES) {
    const source = read(route);
    // Only the allowlist declarations, not the comments explaining them.
    const declarations = source
      .split("\n")
      .filter((line) => /^\s*"(?:name|fileName|filename|originalName|path|filePath)",?\s*$/.test(line));

    if (declarations.length > 0) {
      offenders.push(`${route} still allows: ${declarations.map((l) => l.trim()).join(" ")}`);
    }
    if (/"reference"/.test(source)) accepting.push(route);
  }

  if (offenders.length === 0) {
    pass(`no analyze route (${ROUTES.length}) accepts a file-name field`);
  } else {
    fail("an analyze route's upload allowlist accepts a file name", offenders.join("\n"));
  }

  // The other direction: a route that allows nothing would pass the check
  // above and reject every real request.
  if (accepting.length === ROUTES.length) {
    pass("all three analyze routes accept the neutral `reference` field");
  } else {
    fail(
      "an analyze route does not accept `reference`, so real payloads are rejected",
      ROUTES.filter((route) => !accepting.includes(route)).join("\n"),
    );
  }
}

// ===========================================================================
// 2c. No verification fixture still carries a removed field
// ===========================================================================
//
// Added 2026-09-23, after the fact, because this exact defect hid twice.
//
// Removing `name` from the evidence types also removed it from three strict
// route allowlists. Fixtures that still sent it started getting 400s — and the
// suites that used them went red in ways that looked unrelated:
//
//   verifyCaseOutcomeMatrix   38 passing -> 24, via test:case-simulations
//   verifyAiCasePartnerContext  a 400 that masked two further defects
//
// Neither was noticed at the time, because neither suite names the field in
// its failure. A 400 says "A complete Small Claims intake is required", which
// reads like a fixture that is missing something rather than one that has an
// extra.
//
// So: no fixture may carry a field the types no longer have.

{
  const FIXTURE_FIELDS = [
    "name",
    "fileName",
    "originalName",
    "filename",
  ];

  const offenders: string[] = [];
  const scriptFiles = readdirSync(path.join(ROOT, "scripts/verification"))
    .filter((entry) => /\.(ts|mjs)$/.test(entry))
    .map((entry) => `scripts/verification/${entry}`);

  for (const file of scriptFiles) {
    // This file names the forbidden fields by definition.
    if (file.endsWith("verifyNoFilenamesToModel.ts")) continue;

    const source = read(file);

    // Only lines that are building an evidence-file object — identified by the
    // sibling fields that only appear there. A bare `name:` elsewhere in a
    // fixture is a party name and is fine.
    for (const [index, line] of source.split("\n").entries()) {
      const isEvidenceObject =
        /uploadedEvidenceFiles|uploadedFiles/.test(line) ||
        (/lastModified|sizeBytes|mimeType/.test(line) && /id:/.test(line));
      if (!isEvidenceObject) continue;

      for (const field of FIXTURE_FIELDS) {
        if (new RegExp(`\\b${field}\\s*:\\s*["'\`]`).test(line)) {
          offenders.push(`${file}:${index + 1} — evidence fixture sets \`${field}\``);
        }
      }
    }
  }

  if (offenders.length === 0) {
    pass(`no verification fixture carries a removed evidence field (${scriptFiles.length} files)`);
  } else {
    fail(
      "a fixture still sets a field the evidence types no longer have",
      `${offenders.join("\n")}\nThe analyze routes reject it with a 400 that does not name the field.`,
    );
  }
}

// ===========================================================================
// 3. BEHAVIOURAL — the real builder, over real input
// ===========================================================================

/**
 * A complete Small Claims input whose free text mentions no file names.
 *
 * Every evidence field a user can fill is filled, so the builder has the
 * maximum opportunity to leak something, and the assertion below is that it
 * leaks nothing rather than that it happened to be given nothing.
 */
function smallClaimsFixture(): SmallClaimsIntelligenceInput {
  const chosen = [
    { size: 24_000, type: "application/pdf", lastModified: 1_767_225_600_000 },
    { size: 180_400, type: "image/jpeg", lastModified: 1_767_312_000_000 },
  ];
  const referenced = assignReferences([], chosen);

  return {
    caseStage: "starting-case",
    yourRole: "Plaintiff",
    yourName: "A. Plaintiff",
    otherParty: "B. Defendant",
    defendantAddress: "1 Example Street, Toronto ON",
    facts:
      "I paid for a deck rebuild in February and the work was never finished. " +
      "The railing was never installed and the contractor stopped replying.",
    timeline: "Paid 3 February 2026. Work abandoned 20 March 2026.",
    amountClaimed: "$4,800",
    goal: "I want the money back.",
    issues: ["contract"],
    documents: [],
    filedDocuments: [],
    evidence: "A signed quote and text messages.",
    serviceDetails: "",
    defenceResponse: "",
    uploadedEvidenceFiles: referenced.map((file, index) => ({
      ...file,
      title: index === 0 ? "Signed quote" : "Photo of the unfinished railing",
      description:
        index === 0
          ? "The quote both of us signed before the work started."
          : "Shows the railing was never installed.",
      category: "contract",
      evidenceDate: index === 0 ? "2026-02-03" : "2026-03-21",
      source: "me",
      relevance: "Shows what was agreed and what was delivered.",
    })),
  // Through unknown: the engine input has 18 further address and contact
  // fields that no payload builder puts near evidence, and filling them would
  // make this fixture about everything except the thing under test.
  } as unknown as SmallClaimsIntelligenceInput;
}

/**
 * Everything the engine hands onward, flattened.
 *
 * The prompt text is the thing that actually reaches OpenAI, but the whole
 * result is scanned: a name surviving in a field the prompt does not use today
 * is a name one refactor away from being used.
 */
function flattenResult(value: unknown): string {
  return JSON.stringify(value);
}

{
  const input = smallClaimsFixture();
  const payload = buildRawUserText(input);

  const leaked = findFilenames(payload);
  if (leaked.length === 0) {
    pass("the Small Claims payload builder emits no file name");
  } else {
    fail(
      "a file name reached the Small Claims payload",
      leaked.map((entry) => `  ${entry}`).join("\n"),
    );
  }

  // Passing for the wrong reason: a builder that dropped evidence entirely
  // would also emit no file name. Assert the evidence IS there, by its
  // neutral reference.
  if (payload.includes("Document 1") && payload.includes("Document 2")) {
    pass("the payload still carries both documents, by neutral reference");
  } else {
    fail(
      "the payload does not mention Document 1 and Document 2",
      "Either evidence stopped being included, or the reference scheme changed.\n" +
        "Without this, the check above passes trivially.",
    );
  }
}

// --- the negative control --------------------------------------------------

{
  const input = smallClaimsFixture();
  const files = [...input.uploadedEvidenceFiles];
  files[0] = { ...files[0], description: "This is a scan of invoice-4471.pdf from March." };
  const withFilename = { ...input, uploadedEvidenceFiles: files };

  const payload = buildRawUserText(withFilename);
  const caught = findFilenames(payload);

  if (caught.some((entry) => entry.toLowerCase().includes("invoice-4471.pdf"))) {
    pass("negative control: the detector catches a filename that IS present");
  } else {
    fail(
      "negative control FAILED — the detector did not catch a planted filename",
      "Every pass above this line is now meaningless: the detector is not working,\n" +
        "or the builder silently dropped the user's own description.",
    );
  }
}

// --- the Civil narrative builder ------------------------------------------
//
// Checked separately because it used to emit the most: `name=`, and also
// `id=` (built from the name) and `lastModified=` (document metadata beyond
// type and size — a timestamp of when the user last touched a private file,
// which says something about them and nothing about their case).

{
  const chosen = [{ size: 24_000, type: "application/pdf", lastModified: 1_767_225_600_000 }];
  const referenced = assignReferences([], chosen);

  const narrative = buildUploadNarrative({
    uploadedEvidenceFiles: referenced.map((file) => ({
      ...file,
      title: "Signed agreement",
      description: "The agreement both parties signed.",
      relatedIssue: "contract",
      evidenceDate: "2026-01-02",
      createdBy: "plaintiff",
      whyItMatters: "Records what was agreed.",
    })),
  } as unknown as Parameters<typeof buildUploadNarrative>[0]);

  const leaked = findFilenames(narrative);
  if (leaked.length === 0) {
    pass("the Civil upload narrative emits no file name");
  } else {
    fail("a file name reached the Civil narrative", leaked.map((e) => `  ${e}`).join("\n"));
  }

  if (!narrative.includes("lastModified")) {
    pass("the Civil narrative no longer sends lastModified");
  } else {
    fail(
      "the Civil narrative sends lastModified",
      "That is document metadata beyond type and size. See the note above this check.",
    );
  }

  if (narrative.includes("Document 1")) {
    pass("the Civil narrative still identifies the document, by neutral reference");
  } else {
    fail("the Civil narrative does not mention Document 1 — the check above passes trivially");
  }
}

// ===========================================================================
// 4. The reference helper behaves
// ===========================================================================

{
  const facts = { size: 100, type: "application/pdf", lastModified: 5 };
  const id = evidenceFileId(facts);

  if (!FILENAME_PATTERN.test(id) && id === "doc-100-5-application-pdf") {
    pass("evidenceFileId is built from size, time and type — no name, and not filename-shaped");
  } else {
    fail(`evidenceFileId produced ${id}`);
  }

  // Numbers continue rather than restart, and are not reused after a removal —
  // a silent renumber would repoint every description the user already wrote.
  const continued = assignReferences(["Document 1", "Document 3"], [facts]);
  if (continued[0]?.reference === "Document 4") {
    pass("references continue from the highest existing number, and are never reused");
  } else {
    fail(`expected "Document 4" after [1, 3], got ${continued[0]?.reference}`);
  }

  if (highestReferenceNumber([]) === 0 && highestReferenceNumber(["Signed quote"]) === 0) {
    pass("highestReferenceNumber ignores labels that are not references");
  } else {
    fail("highestReferenceNumber mishandled a non-reference label");
  }

  if (readSelectedFiles(null).length === 0) {
    pass("readSelectedFiles(null) is empty rather than throwing");
  } else {
    fail("readSelectedFiles(null) returned something");
  }
}

console.log("");
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`);
process.exitCode = failures === 0 ? 0 : 1;
