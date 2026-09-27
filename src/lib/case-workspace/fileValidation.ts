/**
 * What a user is allowed to upload, decided from the FILE'S OWN BYTES.
 *
 * WHAT THIS CATCHES: a file whose declared type is not what it is.
 *
 * *** WHY THE DECLARED TYPE IS NOT USED FOR THE DECISION ***
 *
 * `Content-Type` on an upload and the extension on a file name are both supplied
 * by whoever is uploading. Neither is evidence of anything. A request can claim
 * `application/pdf` for a file that is a script, and the browser will say so
 * faithfully because the browser is also just reading the extension.
 *
 * So the allowlist is checked against a signature read from the first bytes, and
 * the DETECTED type is what gets stored and what is later used as the object's
 * content type. The declared value is recorded for the user's benefit and never
 * trusted for a decision.
 *
 * *** A MISMATCH IS NOT A REJECTION, AND THAT IS DELIBERATE ***
 *
 * Litigants have genuinely mislabelled files — a phone photo saved as `.pdf`, a
 * scan renamed by hand. Refusing those would be refusing real evidence for a
 * cosmetic reason. A mismatch is surfaced to the user instead. It is safe to
 * accept because the decision was never made on the declared value: if the bytes
 * are not on the allowlist the file is refused whatever it is called, and if they
 * are, the file is one of a handful of inert document formats.
 *
 * *** WHERE THIS IS NOT ENOUGH ***
 *
 * This module runs in our route. The storage insert policy also permits an
 * authenticated user to write to their own folder directly with their own token,
 * bypassing the route entirely. Checked on staging 2026-09-27: the bucket itself
 * carried `file_size_limit = null` and `allowed_mime_types = null`, so nothing
 * stopped that. The bucket now carries both limits as well
 * (20260927100000_case_evidence_bucket_limits.sql). Two layers, because only one
 * of them is on a path the client cannot avoid.
 */

/** 25 MB. A scanned multi-page PDF from a phone is comfortably under this. */
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

/** How many leading bytes a caller must supply for a decision to be possible. */
export const SNIFF_BYTES = 64;

export type DetectedType = {
  /** The content type the object will be stored with. */
  mime: string;
  /** Extensions a file of this type is usually called. For the mismatch notice. */
  extensions: string[];
};

type Signature = DetectedType & {
  /** True when the bytes are a file of this type. */
  match: (bytes: Uint8Array) => boolean;
};

const ascii = (bytes: Uint8Array, start: number, length: number): string =>
  Array.from(bytes.slice(start, start + length))
    .map((byte) => String.fromCharCode(byte))
    .join("");

const startsWith = (bytes: Uint8Array, prefix: number[]): boolean =>
  prefix.length <= bytes.length && prefix.every((byte, index) => bytes[index] === byte);

/*
 * The ISO base-media brands that mean "this is a still image", as opposed to the
 * same container holding video. `ftyp` sits at offset 4 and the brand at offset 8.
 */
const HEIF_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "heim",
  "heis",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
]);

/*
 * DOCX is a ZIP, and so is every other ZIP. The first local file header's name
 * field is read to tell an Office document from an arbitrary archive. A .zip of
 * evidence is NOT accepted: the workspace stores documents one at a time so each
 * can carry its own date, exhibit number and type, and an archive would arrive as
 * one undated blob standing for many documents.
 */
const OFFICE_FIRST_ENTRIES = ["[Content_Types].xml", "word/", "docProps/", "mimetype"];

function zipFirstEntryName(bytes: Uint8Array): string | null {
  if (!startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return null;
  if (bytes.length < 30) return null;
  const nameLength = bytes[26] | (bytes[27] << 8);
  if (nameLength <= 0 || 30 + nameLength > bytes.length) return null;
  return ascii(bytes, 30, nameLength);
}

const SIGNATURES: Signature[] = [
  {
    mime: "application/pdf",
    extensions: [".pdf"],
    match: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]), // %PDF-
  },
  {
    mime: "image/jpeg",
    extensions: [".jpg", ".jpeg"],
    match: (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  },
  {
    mime: "image/png",
    extensions: [".png"],
    match: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    mime: "image/tiff",
    extensions: [".tif", ".tiff"],
    match: (b) =>
      startsWith(b, [0x49, 0x49, 0x2a, 0x00]) || startsWith(b, [0x4d, 0x4d, 0x00, 0x2a]),
  },
  {
    mime: "image/webp",
    extensions: [".webp"],
    match: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP",
  },
  {
    mime: "image/heic",
    extensions: [".heic", ".heif"],
    match: (b) => ascii(b, 4, 4) === "ftyp" && HEIF_BRANDS.has(ascii(b, 8, 4)),
  },
  {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extensions: [".docx"],
    match: (b) => {
      const name = zipFirstEntryName(b);
      return name !== null && OFFICE_FIRST_ENTRIES.some((entry) => name.startsWith(entry));
    },
  },
  {
    // OLE2 compound file: .doc, and also .xls — the container does not say which.
    mime: "application/msword",
    extensions: [".doc"],
    match: (b) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
  },
  {
    mime: "application/rtf",
    extensions: [".rtf"],
    // "{\rtf"
    match: (b) => startsWith(b, [0x7b, 0x5c, 0x72, 0x74, 0x66]),
  },
];

/**
 * Plain text and email have NO signature, so they cannot be detected the way the
 * others are. They are accepted on a property instead: no NUL byte in the sniffed
 * head, and the head decodes as UTF-8 without stray control characters. That is a
 * heuristic and is labelled as one — it is the reason `text/plain` is the only
 * entry here that is not proved by a signature.
 *
 * A consequence worth stating rather than leaving to be found: a shell script is
 * indistinguishable from a letter, because both are just text. `#!/bin/sh` is
 * accepted and stored as `text/plain`. That is safe here and would not be
 * elsewhere — the bucket is private, the object is served only through a
 * short-lived signed URL, and nothing in this product executes or renders a stored
 * object. If any of those three ever stops being true, this heuristic becomes a
 * hole, so it is named here as the assumption it depends on.
 */
function looksLikeText(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return false;
  if (bytes.includes(0x00)) return false;
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    // A control character other than tab, newline or carriage return means binary.
    return !/[\u0001-\u0008\u000b\u000c\u000e-\u001f]/.test(decoded);
  } catch {
    /*
     * A fatal decode failure on a TRUNCATED head is expected: the sniff window can
     * cut a multi-byte character in half. So a failure here is not proof of binary
     * data, only absence of proof of text, and the file is refused for want of a
     * signature rather than declared malicious.
     */
    return false;
  }
}

const TEXT_TYPE: DetectedType = {
  mime: "text/plain",
  extensions: [".txt", ".eml", ".md", ".csv"],
};

export function detectType(bytes: Uint8Array): DetectedType | null {
  for (const signature of SIGNATURES) {
    if (signature.match(bytes)) {
      return { mime: signature.mime, extensions: signature.extensions };
    }
  }
  return looksLikeText(bytes) ? TEXT_TYPE : null;
}

/** Every content type an object may be stored with. Built from the allowlist. */
export function allowedMimeTypes(): string[] {
  return [...SIGNATURES.map((signature) => signature.mime), TEXT_TYPE.mime];
}

export type ValidationInput = {
  originalName: string;
  declaredMime: string | null;
  sizeBytes: number;
  /** The first bytes of the file. At least SNIFF_BYTES where the file is that long. */
  head: Uint8Array;
};

export type ValidationResult =
  | {
      ok: true;
      /** What the object is stored as. Never the declared value. */
      storedMime: string;
      /**
       * Set when the name suggests one type and the bytes are another. Shown to
       * the user; never a reason to refuse. Wording is factual and carries no
       * accusation, because the overwhelmingly likely cause is a renamed file.
       */
      mismatchNotice: string | null;
    }
  | { ok: false; reason: string; detail: string };

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot).toLowerCase();
}

export function validateUpload(input: ValidationInput): ValidationResult {
  const name = input.originalName.trim();

  if (name.length === 0) {
    return { ok: false, reason: "no-name", detail: "The file has no name." };
  }

  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    return {
      ok: false,
      reason: "empty",
      detail: "The file is empty, so there is nothing to store.",
    };
  }

  if (input.sizeBytes > MAX_DOCUMENT_BYTES) {
    const mb = (input.sizeBytes / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      reason: "too-large",
      detail:
        `This file is ${mb} MB and the limit is ` +
        `${MAX_DOCUMENT_BYTES / (1024 * 1024)} MB. If it is a long scan, splitting ` +
        `it into separate documents also lets each one carry its own date and ` +
        `exhibit number.`,
    };
  }

  const detected = detectType(input.head);

  if (detected === null) {
    return {
      ok: false,
      reason: "unrecognised-type",
      detail:
        "CourtSimplified could not tell what kind of file this is from its " +
        "contents. PDFs, photos, scans, Word documents and plain text can be " +
        "stored. An archive such as a .zip cannot, because each document needs " +
        "its own date and exhibit number.",
    };
  }

  const extension = extensionOf(name);
  const nameAgrees = extension === "" || detected.extensions.includes(extension);

  return {
    ok: true,
    storedMime: detected.mime,
    mismatchNotice: nameAgrees
      ? null
      : `This file is named "${name}" but its contents are a ` +
        `${detected.mime} file. It has been stored as it actually is, which is ` +
        `usually what you want — it happens when a file has been renamed.`,
  };
}
