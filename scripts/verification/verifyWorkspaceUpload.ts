/**
 * Uploaded documents are typed from their own bytes, pathed under their owner, and
 * bounded by a limit that says the same number in the code and in the bucket.
 *
 * WHAT THIS CATCHES: a file being accepted for what it is called rather than for
 * what it is; an object path whose first segment is not the owner; and the size
 * limit drifting between the route and the bucket, which would produce a route
 * that accepts files storage refuses.
 *
 * *** WHY EACH CHECK IS A PROPERTY AND NOT A LIST OF TYPES ***
 *
 * CLAUDE.md §5. A check that enumerates today's allowlist fails the day somebody
 * adds HEIF support, which is the work we want. So the type checks assert the
 * RULE instead:
 *
 *   - the same bytes get the same answer under every file name (the decision does
 *     not consult the name)
 *   - a file on the allowlist is accepted no matter what it is called
 *   - bytes that match no signature are refused no matter what they are called
 *
 * Adding a format to the allowlist keeps all three true. Deciding by extension
 * breaks the first one immediately.
 *
 * The migration check is the exception that has to name a number, because its
 * whole job is that two places say the same number. It reads both and compares
 * them, so it fails on drift and not on the value.
 *
 * COSTS NOTHING. Pure functions and one file read. No network, no model, no
 * database.
 *
 * Run: node --import tsx scripts/verification/verifyWorkspaceUpload.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import {
  MAX_DOCUMENT_BYTES,
  allowedMimeTypes,
  detectType,
  validateUpload,
} from "../../src/lib/case-workspace/fileValidation";
import {
  documentObjectPath,
  parseObjectPath,
  pathBelongsTo,
} from "../../src/lib/case-workspace/storagePaths";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

console.log("");
console.log("WORKSPACE UPLOAD");
console.log("");

// ---------------------------------------------------------------------------
// Fixtures: real leading bytes for each format, and some things that are not
// documents at all.
// ---------------------------------------------------------------------------

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string) => new Uint8Array(Buffer.from(value, "utf8"));

/** A ZIP local file header whose first entry has the given name. */
function zipWithFirstEntry(name: string): Uint8Array {
  const header = new Uint8Array(30 + name.length);
  header.set([0x50, 0x4b, 0x03, 0x04], 0);
  header[26] = name.length & 0xff;
  header[27] = (name.length >> 8) & 0xff;
  header.set(Buffer.from(name, "ascii"), 30);
  return header;
}

/** ISO base media: `ftyp` at offset 4, brand at offset 8. */
function isoBaseMedia(brand: string): Uint8Array {
  const header = new Uint8Array(32);
  header.set([0x00, 0x00, 0x00, 0x18], 0);
  header.set(Buffer.from("ftyp", "ascii"), 4);
  header.set(Buffer.from(brand, "ascii"), 8);
  return header;
}

const ACCEPTED: { label: string; head: Uint8Array }[] = [
  { label: "PDF", head: text("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>") },
  { label: "JPEG", head: bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46) },
  { label: "PNG", head: bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x0d) },
  { label: "TIFF little-endian", head: bytes(0x49, 0x49, 0x2a, 0x00, 0x08) },
  { label: "TIFF big-endian", head: bytes(0x4d, 0x4d, 0x00, 0x2a, 0x08) },
  {
    label: "WEBP",
    head: (() => {
      const h = new Uint8Array(16);
      h.set(Buffer.from("RIFF", "ascii"), 0);
      h.set(Buffer.from("WEBP", "ascii"), 8);
      return h;
    })(),
  },
  { label: "HEIC", head: isoBaseMedia("heic") },
  { label: "DOCX", head: zipWithFirstEntry("[Content_Types].xml") },
  { label: "DOC (OLE2)", head: bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1) },
  { label: "RTF", head: text("{\\rtf1\\ansi\\deff0") },
  { label: "plain text", head: text("Dear Sir,\r\n\r\nFurther to my letter of 3 March.\r\n") },
];

const REFUSED: { label: string; head: Uint8Array; why: string }[] = [
  {
    label: "a ZIP archive of evidence",
    head: zipWithFirstEntry("photos/img_0417.jpg"),
    why: "an archive stands for many documents and can carry no single date or exhibit number",
  },
  {
    label: "a Windows executable",
    head: bytes(0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00),
    why: "not a document",
  },
  {
    label: "an ELF binary",
    head: bytes(0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00),
    why: "not a document",
  },
  {
    label: "an ISO base media VIDEO brand",
    head: isoBaseMedia("mp42"),
    why: "the same container as HEIC; only the still-image brands are accepted",
  },
  {
    label: "arbitrary binary noise",
    head: bytes(0x8f, 0x00, 0x11, 0xac, 0xfe, 0x09, 0x00, 0x44),
    why: "matches no signature and is not text",
  },
];

/*
 * Names chosen to be actively misleading. If any decision consulted the name, one
 * of these would change an answer.
 */
const MISLEADING_NAMES = [
  "evidence.pdf",
  "photo.jpg",
  "contract.docx",
  "notes.txt",
  "archive.zip",
  "invoice",
  "INVOICE.PDF",
  "weird.name.with.dots.png",
];

const TEN_KB = 10 * 1024;

// ---------------------------------------------------------------------------
// 1. The name never changes the answer
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  for (const sample of [...ACCEPTED, ...REFUSED]) {
    const answers = new Set(
      MISLEADING_NAMES.map((name) => {
        const result = validateUpload({
          originalName: name,
          declaredMime: "application/pdf", // deliberately wrong for most of them
          sizeBytes: TEN_KB,
          head: sample.head,
        });
        return result.ok ? `ok:${result.storedMime}` : `refused:${result.reason}`;
      }),
    );

    if (answers.size !== 1) {
      problems.push(
        `${sample.label} got ${answers.size} different answers depending on the file ` +
          `name: ${[...answers].join(", ")}`,
      );
    }
  }

  if (problems.length === 0) {
    pass(
      `the same bytes get the same answer under ${MISLEADING_NAMES.length} different ` +
        `names, for all ${ACCEPTED.length + REFUSED.length} samples`,
    );
  } else {
    fail("the file name is influencing the decision", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 2. Documents are accepted; things that are not documents are refused
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  for (const sample of ACCEPTED) {
    const result = validateUpload({
      originalName: "archive.zip", // the worst possible name for each of them
      declaredMime: "application/zip",
      sizeBytes: TEN_KB,
      head: sample.head,
    });
    if (!result.ok) {
      problems.push(`${sample.label} was refused (${result.reason}) — it is a document`);
    } else if (detectType(sample.head)?.mime !== result.storedMime) {
      problems.push(`${sample.label} stored a mime that is not what detectType returned`);
    }
  }

  for (const sample of REFUSED) {
    const result = validateUpload({
      originalName: "evidence.pdf", // the most respectable possible name
      declaredMime: "application/pdf",
      sizeBytes: TEN_KB,
      head: sample.head,
    });
    if (result.ok) {
      problems.push(
        `${sample.label} was ACCEPTED as ${result.storedMime} — ${sample.why}`,
      );
    }
  }

  if (problems.length === 0) {
    pass(
      `${ACCEPTED.length} document formats accepted under a .zip name; ` +
        `${REFUSED.length} non-documents refused under a .pdf name`,
    );
  } else {
    fail("the allowlist is not deciding on bytes", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 3. A mismatch is surfaced and is never a refusal
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  const jpeg = ACCEPTED.find((s) => s.label === "JPEG");
  if (!jpeg) {
    problems.push("the JPEG fixture is gone, so this check is asserting nothing");
  } else {
    const renamed = validateUpload({
      originalName: "scan-of-receipt.pdf",
      declaredMime: "application/pdf",
      sizeBytes: TEN_KB,
      head: jpeg.head,
    });

    if (!renamed.ok) {
      problems.push("a JPEG named .pdf was refused — a renamed file is not a threat");
    } else {
      if (renamed.storedMime !== "image/jpeg") {
        problems.push(`stored as ${renamed.storedMime}, but the bytes are a JPEG`);
      }
      if (renamed.mismatchNotice === null) {
        problems.push("no mismatch notice, so the user is not told what the file really is");
      }
    }

    const honest = validateUpload({
      originalName: "scan-of-receipt.jpg",
      declaredMime: "image/jpeg",
      sizeBytes: TEN_KB,
      head: jpeg.head,
    });
    if (honest.ok && honest.mismatchNotice !== null) {
      problems.push("a correctly named JPEG was given a mismatch notice");
    }

    const noExtension = validateUpload({
      originalName: "scan",
      declaredMime: null,
      sizeBytes: TEN_KB,
      head: jpeg.head,
    });
    if (noExtension.ok && noExtension.mismatchNotice !== null) {
      problems.push("a file with no extension was given a mismatch notice — nothing disagreed");
    }
  }

  if (problems.length === 0) {
    pass("a renamed file is stored as what it is, with the user told, and not refused");
  } else {
    fail("the mismatch handling is wrong", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 4. Size and emptiness
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];
  const pdf = ACCEPTED[0].head;

  const atLimit = validateUpload({
    originalName: "scan.pdf",
    declaredMime: "application/pdf",
    sizeBytes: MAX_DOCUMENT_BYTES,
    head: pdf,
  });
  if (!atLimit.ok) problems.push("a file exactly at the limit was refused — the limit is off by one");

  const overLimit = validateUpload({
    originalName: "scan.pdf",
    declaredMime: "application/pdf",
    sizeBytes: MAX_DOCUMENT_BYTES + 1,
    head: pdf,
  });
  if (overLimit.ok) problems.push("a file one byte over the limit was accepted");

  for (const size of [0, -1, 1.5, Number.NaN]) {
    const result = validateUpload({
      originalName: "scan.pdf",
      declaredMime: "application/pdf",
      sizeBytes: size,
      head: pdf,
    });
    if (result.ok) problems.push(`a size of ${size} was accepted`);
  }

  const noName = validateUpload({
    originalName: "   ",
    declaredMime: "application/pdf",
    sizeBytes: TEN_KB,
    head: pdf,
  });
  if (noName.ok) problems.push("a file with a blank name was accepted");

  if (problems.length === 0) {
    pass("the limit is inclusive, one byte over is refused, and 0/negative/NaN/fractional sizes are refused");
  } else {
    fail("the size and name checks are wrong", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 5. The object path puts the owner first, and cannot be talked out of it
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  const userId = "11111111-1111-4111-8111-111111111111";
  const otherUserId = "22222222-2222-4222-8222-222222222222";
  const caseId = "33333333-3333-4333-8333-333333333333";
  const documentId = "44444444-4444-4444-8444-444444444444";

  const built = documentObjectPath({ userId, caseId, documentId });

  if (built.split("/")[0] !== userId) {
    problems.push(
      `the first path segment is "${built.split("/")[0]}" and not the user id. The ` +
        `storage policies compare exactly that segment to auth.uid().`,
    );
  }
  if (built !== `${userId}/${caseId}/${documentId}`) {
    problems.push(`unexpected path shape: ${built}`);
  }

  // Non-UUID input must throw, not be sanitised into a path.
  for (const bad of [
    "../../etc/passwd",
    `${userId}/../${otherUserId}`,
    "",
    "not-a-uuid",
    `${userId}x`,
  ]) {
    let threw = false;
    try {
      documentObjectPath({ userId: bad, caseId, documentId });
    } catch {
      threw = true;
    }
    if (!threw) problems.push(`documentObjectPath accepted a non-UUID user id: ${JSON.stringify(bad)}`);
  }

  // Ownership must be decided on the whole segment, not a prefix.
  if (pathBelongsTo(built, otherUserId)) {
    problems.push("a path was reported as belonging to a different user");
  }
  if (!pathBelongsTo(built, userId)) {
    problems.push("a path was NOT reported as belonging to its own owner");
  }

  /*
   * The prefix trap: a first segment that STARTS WITH the user's id but is a
   * different folder. `startsWith` would pass this. Nothing currently creates such
   * a path, which is the point — the check exists so a future refactor to
   * startsWith is caught rather than shipped.
   */
  const prefixAttack = `${userId}-extra/${caseId}/${documentId}`;
  if (pathBelongsTo(prefixAttack, userId)) {
    problems.push(
      `pathBelongsTo accepted "${prefixAttack}" for user ${userId} — it is matching a ` +
        `prefix rather than the whole first segment`,
    );
  }

  for (const bad of [
    built + "/extra",
    `${caseId}/${documentId}`,
    `/${built}`,
    `${userId}//${documentId}`,
  ]) {
    if (parseObjectPath(bad) !== null) problems.push(`parseObjectPath accepted ${JSON.stringify(bad)}`);
  }

  if (problems.length === 0) {
    pass("the owner is the first path segment, non-UUIDs throw, and a prefix match is not an ownership match");
  } else {
    fail("the object path is not safe", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 6. The code and the bucket state the same limit and the same allowlist
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];
  const migrationPath = path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260927100000_case_evidence_bucket_limits.sql",
  );

  let sql = "";
  try {
    sql = readFileSync(migrationPath, "utf8");
  } catch {
    problems.push(
      `the bucket-limits migration is missing at ${migrationPath}. Without it the ` +
        `bucket enforces no size limit, and a direct-to-storage upload has no ceiling.`,
    );
  }

  if (sql) {
    /*
     * The migration writes the limit twice, in the VALUES row and in the ON
     * CONFLICT update, and both must agree with the code — a fresh project takes
     * the first and an existing one takes the second.
     */
    const limits = new Set([...sql.matchAll(/"file_size_limit"[^,)]*?(\d{4,})/g)].map((m) => m[1]));
    const inserted = [...sql.matchAll(/^\s+(\d{7,})\s*,/gm)].map((m) => m[1]);
    const stated = new Set([...limits, ...inserted].map(Number));

    if (stated.size === 0) {
      problems.push("no byte limit could be read out of the migration");
    } else if (stated.size > 1) {
      problems.push(
        `the migration states more than one limit: ${[...stated].join(", ")} — the ` +
          `VALUES row and the ON CONFLICT update disagree`,
      );
    } else if (![...stated][0] || [...stated][0] !== MAX_DOCUMENT_BYTES) {
      problems.push(
        `the bucket limit is ${[...stated][0]} bytes and MAX_DOCUMENT_BYTES is ` +
          `${MAX_DOCUMENT_BYTES}. The route would accept files storage refuses.`,
      );
    }

    const inMigration = new Set(
      [...sql.matchAll(/'([a-z]+\/[A-Za-z0-9.+-]+)'/g)].map((m) => m[1]),
    );
    const inCode = new Set(allowedMimeTypes());

    const missing = [...inCode].filter((mime) => !inMigration.has(mime));
    const extra = [...inMigration].filter((mime) => !inCode.has(mime));

    if (missing.length > 0) {
      problems.push(
        `the code accepts types the bucket does not: ${missing.join(", ")}. Storage ` +
          `would refuse an upload the route had already approved.`,
      );
    }
    if (extra.length > 0) {
      problems.push(
        `the bucket permits types the code does not detect: ${extra.join(", ")}. The ` +
          `bucket is looser than intended on the direct-upload path.`,
      );
    }
  }

  if (problems.length === 0) {
    pass(
      `the code and the bucket agree on the ${MAX_DOCUMENT_BYTES / (1024 * 1024)} MB ` +
        `limit and on all ${allowedMimeTypes().length} content types`,
    );
  } else {
    fail("the code and the bucket have drifted apart", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 7. The workspace document routes call no model
// ---------------------------------------------------------------------------

{
  /*
   * Part 1 has nothing to do with AI, and that is exactly why this is asserted
   * now rather than when the AI work starts: the moment to notice a model call on
   * the upload path is before there is any reason for one to be there.
   *
   * The assertion is on IMPORTS, not on the word "openai" appearing — a comment
   * mentioning OpenAI must not fail a check, and an import is what actually makes
   * a call possible.
   */
  const routes = [
    "app/api/workspace/documents/route.ts",
    "app/api/workspace/documents/upload-url/route.ts",
  ];

  const problems: string[] = [];

  for (const relative of routes) {
    let source = "";
    try {
      source = readFileSync(path.join(ROOT, relative), "utf8");
    } catch {
      problems.push(`${relative} is missing`);
      continue;
    }

    const imports = [...source.matchAll(/^\s*import\s[^;]*?from\s+["']([^"']+)["']/gm)].map(
      (m) => m[1],
    );

    const modelImports = imports.filter((specifier) =>
      /openai|anthropic|\/ai\/|modelClient|callModel/i.test(specifier),
    );

    if (modelImports.length > 0) {
      problems.push(`${relative} imports ${modelImports.join(", ")}`);
    }
  }

  if (problems.length === 0) {
    pass(`neither document route imports a model client (${routes.length} routes read)`);
  } else {
    fail("a document route can reach a model", problems.join("\n"));
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
