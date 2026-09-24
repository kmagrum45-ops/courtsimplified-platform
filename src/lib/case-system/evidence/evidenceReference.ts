/**
 * Turning a chosen file into something we can talk about without naming it.
 *
 * *** WHY THIS MODULE EXISTS ***
 *
 * Three intakes each had their own copy of "read the FileList into objects",
 * and each copy read `file.name`. The name then reached OpenAI in the case
 * description on all three paths.
 *
 * A file name is a disclosure nobody decides to make. "restraining-order-
 * application-2025.pdf" and "hiv-results-march.pdf" say something the user
 * never chose to say, because nobody thinks of a file name as content. The
 * user picks a file to prove a delivery date and hands over a diagnosis.
 *
 * *** THE NAME IS NOT SCRUBBED. IT IS NEVER READ. ***
 *
 * `readSelectedFiles` touches `size`, `type` and `lastModified` and nothing
 * else. There is no field on the result that can hold a name, so there is no
 * egress point to audit, no scrubber to keep in sync with new call sites, and
 * no way for the eighth payload builder to reintroduce the leak.
 *
 * That is the difference between a control and a habit, and it is the same
 * argument as `forceNoStore` living in the client: a property that has to be
 * remembered at every call site is not a property.
 *
 * *** WHAT THE USER GETS INSTEAD ***
 *
 * "Document 1", plus the file's type and size, plus whatever label they choose
 * to type. The label is theirs, it is optional, and the UI says plainly that it
 * is sent to the AI — which is the whole point: a disclosure the user makes on
 * purpose is a different thing from one they make by accident.
 *
 * *** WHAT IS LOST, STATED PLAINLY ***
 *
 * A user who selects four similar PDFs at once can no longer tell them apart in
 * the list by name. They are distinguished by position, type and size, and by
 * the label the user adds. That is a real cost. It is accepted because the
 * alternative is to keep sending names and hope every future payload builder
 * remembers not to.
 */

/** Everything we are willing to learn about a file the user chose. */
export type SelectedFileFacts = {
  size: number;
  /** MIME type as the browser reports it, or "" when it reports nothing. */
  type: string;
  lastModified: number;
};

/** A file as the rest of the system sees it: by position, never by name. */
export type ReferencedFile = SelectedFileFacts & {
  id: string;
  /** "Document 1", "Document 2". See the module header. */
  reference: string;
};

/**
 * Reads a FileList into facts, deliberately ignoring `name`.
 *
 * Synchronous and eager because a FileList is only valid during the change
 * event; the values are copied out now so the File objects can be dropped.
 */
export function readSelectedFiles(files: FileList | null): SelectedFileFacts[] {
  if (!files) return [];
  return Array.from(files).map((file) => ({
    size: file.size,
    type: file.type || "",
    lastModified: file.lastModified,
  }));
}

/**
 * The stable id for a chosen file.
 *
 * Used only to stop the same file being added twice. It was
 * `${name}-${size}-${lastModified}`, which put the name into every persisted
 * record and every payload that carried an id.
 *
 * Size, modification time and type together are a good enough natural key for
 * de-duplication: two genuinely different files agreeing on all three is
 * possible and the consequence is one of them being dropped from the list,
 * which the user can see and correct. That is a better failure than a name in a
 * prompt.
 */
export function evidenceFileId(facts: SelectedFileFacts): string {
  const type = facts.type.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "unknown";
  return `doc-${facts.size}-${facts.lastModified}-${type}`;
}

/**
 * Numbers newly chosen files, continuing from what is already listed.
 *
 * NUMBERS ARE NOT REUSED WHEN A FILE IS REMOVED, and that is deliberate. If
 * removing Document 2 renumbered Document 3, every description the user had
 * already written referring to "Document 3" would quietly start pointing at a
 * different file. A gap in the numbering is visible and harmless; a silent
 * renumber is neither.
 *
 * `highestExistingNumber` is therefore read from the references already in the
 * list rather than from its length.
 */
export function assignReferences(
  existingReferences: readonly string[],
  chosen: readonly SelectedFileFacts[],
): ReferencedFile[] {
  let next = highestReferenceNumber(existingReferences);

  return chosen.map((facts) => {
    next += 1;
    return {
      ...facts,
      id: evidenceFileId(facts),
      reference: `Document ${next}`,
    };
  });
}

/** The largest N across "Document N" strings, or 0 when there are none. */
export function highestReferenceNumber(references: readonly string[]): number {
  let highest = 0;
  for (const reference of references) {
    const match = /^Document (\d+)$/.exec(reference.trim());
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > highest) highest = value;
  }
  return highest;
}

/**
 * A short, human-readable size. Display only — never sent anywhere.
 *
 * Binary units, because that is what a file manager shows and a user comparing
 * this list to their own folder should see the same number.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * A plain-language file type for display.
 *
 * Falls back to the raw MIME type, and then to "unknown type" — never to a
 * guess from an extension, because there is no name to take an extension from.
 */
export function describeFileType(mimeType: string): string {
  const known: Record<string, string> = {
    "application/pdf": "PDF",
    "image/jpeg": "JPEG image",
    "image/png": "PNG image",
    "image/heic": "HEIC image",
    "image/gif": "GIF image",
    "text/plain": "text file",
    "text/csv": "CSV file",
    "application/msword": "Word document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "Word document",
    "application/vnd.ms-excel": "Excel spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      "Excel spreadsheet",
  };

  const trimmed = (mimeType || "").trim();
  if (!trimmed) return "unknown type";
  return known[trimmed] ?? trimmed;
}
