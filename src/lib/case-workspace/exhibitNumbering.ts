/**
 * Exhibit numbers: proposing them, and the rule about when they may change.
 *
 * WHAT THIS CATCHES: an exhibit number moving after somebody has relied on it.
 *
 * *** THE HARD PART IS NOT THE COUNTING ***
 *
 * Assigning 1, 2, 3 in date order is trivial. The question that matters is what
 * happens when a document is added afterwards, and the naive answer — renumber
 * everything so the order stays perfect — is the one that causes real harm.
 *
 * Once an exhibit book has been served or filed, its numbers are cited. They are
 * cited in the claim, in a defence, in an affidavit, in correspondence, and out
 * loud at a hearing. If the product silently renumbers because a document was
 * added, every one of those references now points at the wrong document, and the
 * person least able to notice is the self-represented litigant who trusted it.
 *
 * So numbering is a PROPOSAL and the assigned numbers are persisted. Adding a
 * document does not move anything. `proposeNumbering` says what it would do and
 * the user confirms, which is CLAUDE.md §4 applied to the one place in this
 * feature where a silent change would be worst.
 *
 * *** WHY A LATE DOCUMENT GETS A SUFFIX INSTEAD OF A NUMBER ***
 *
 * A document that belongs chronologically between exhibits 4 and 5 can be offered
 * as 4A rather than forcing a renumber. Suffixes are how paper practice has always
 * solved this, and `workspace_documents` already carries `exhibit_suffix` beside
 * `exhibit_number` for it. The suffix is also how attachments are handled: a letter
 * that arrived with three enclosures is 7, 7A, 7B, 7C, which keeps the enclosure
 * visibly attached to the letter it came with.
 *
 * *** WHAT THIS MODULE MAY NOT DO ***
 *
 * It orders and numbers documents. It says nothing about whether a document helps,
 * matters, or should be included — CLAUDE.md §3. "Exhibit 1" is a label, not a
 * ranking, and nothing here sorts by importance because nothing here is allowed to
 * have an opinion about importance.
 *
 * NO MODEL IS CALLED HERE. Pure functions.
 */

import { chronological, type DatePrecision } from "./parseDate";

export type NumberableDocument = {
  id: string;
  /** Confirmed by the user. Never a guess — an unconfirmed date leaves this null. */
  userDate: string | null;
  userDatePrecision?: DatePrecision;
  /** Already assigned and relied upon, or null if never numbered. */
  exhibitNumber: number | null;
  exhibitSuffix: string | null;
  /** The document this is an enclosure of, if any. */
  attachedToId?: string | null;
  /** For a stable order among documents that share a date. */
  uploadedAt?: string | null;
  originalName?: string | null;
};

export type ProposedNumber = {
  documentId: string;
  /** What it would be called: "4", or "4A". */
  label: string;
  exhibitNumber: number;
  exhibitSuffix: string | null;
  /**
   * Why this number, in plain words, for the confirmation screen. A user asked to
   * confirm a change is owed the reason.
   */
  reason: string;
  /** True where this differs from what the document already carries. */
  isChange: boolean;
};

export type NumberingProposal = {
  proposed: ProposedNumber[];
  /**
   * Documents that cannot be placed because the user has not confirmed a date.
   * They are NOT numbered and NOT guessed at.
   */
  needDates: string[];
  /**
   * Set when accepting this proposal would move a number that already exists.
   * The confirmation screen leads with this.
   */
  warning: string | null;
};

const SUFFIX_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** "4" or "4A". The one place a label is formed, so it cannot be formed two ways. */
export function exhibitLabel(exhibitNumber: number, exhibitSuffix: string | null): string {
  return `${exhibitNumber}${exhibitSuffix ?? ""}`;
}

/**
 * Sorts for the exhibit book and the document table.
 *
 * Confirmed date first, then upload time, then name. The tie-breakers matter more
 * than they look: without them the order of two documents dated the same day
 * depends on whatever order the database returned, so the exhibit book would
 * reorder itself between two renders and the index would stop matching the pages.
 */
export function documentOrder<T extends NumberableDocument>(documents: readonly T[]): {
  dated: T[];
  undated: T[];
} {
  const { dated, undated } = chronological([...documents]);

  const tieBreak = (a: T, b: T): number => {
    if (a.userDate !== b.userDate) return (a.userDate ?? "") < (b.userDate ?? "") ? -1 : 1;
    const aUploaded = a.uploadedAt ?? "";
    const bUploaded = b.uploadedAt ?? "";
    if (aUploaded !== bUploaded) return aUploaded < bUploaded ? -1 : 1;
    return (a.originalName ?? "").localeCompare(b.originalName ?? "");
  };

  return {
    dated: [...dated].sort(tieBreak),
    /*
     * Undated documents keep upload order rather than being sorted by name. They
     * are in the "Date needed" group, and the order a person uploaded things in is
     * the order they remember them in.
     */
    undated: [...undated].sort((a, b) => (a.uploadedAt ?? "") < (b.uploadedAt ?? "") ? -1 : 1),
  };
}

/**
 * Numbers documents that have never been numbered, leaving existing numbers alone.
 *
 * This is the ordinary case and it is deliberately the conservative one: it never
 * returns `isChange: true`, so it can be applied without a warning. A new document
 * gets the next free number, or a suffix where it belongs chronologically inside a
 * run that is already numbered.
 */
export function proposeNumbering(documents: readonly NumberableDocument[]): NumberingProposal {
  const { dated, undated } = documentOrder(documents);

  const proposed: ProposedNumber[] = [];

  const highest = documents.reduce(
    (max, document) => Math.max(max, document.exhibitNumber ?? 0),
    0,
  );

  /** Suffixes already used under each number, so a new one does not collide. */
  const usedSuffixes = new Map<number, Set<string>>();
  for (const document of documents) {
    if (document.exhibitNumber !== null && document.exhibitSuffix) {
      const set = usedSuffixes.get(document.exhibitNumber) ?? new Set<string>();
      set.add(document.exhibitSuffix.toUpperCase());
      usedSuffixes.set(document.exhibitNumber, set);
    }
  }

  const nextSuffix = (exhibitNumber: number): string | null => {
    const used = usedSuffixes.get(exhibitNumber) ?? new Set<string>();
    for (const letter of SUFFIX_ALPHABET) {
      if (!used.has(letter)) {
        used.add(letter);
        usedSuffixes.set(exhibitNumber, used);
        return letter;
      }
    }
    /*
     * Twenty-six enclosures under one exhibit. Returning null rather than going to
     * AA is honest: nothing downstream has been designed for two-letter suffixes,
     * and inventing one here would put an untested label in an exhibit book.
     */
    return null;
  };

  let nextNumber = highest + 1;

  for (const document of dated) {
    // Already numbered and relied upon. Left exactly as it is.
    if (document.exhibitNumber !== null) {
      proposed.push({
        documentId: document.id,
        label: exhibitLabel(document.exhibitNumber, document.exhibitSuffix),
        exhibitNumber: document.exhibitNumber,
        exhibitSuffix: document.exhibitSuffix,
        reason: "Already numbered. Left as it is.",
        isChange: false,
      });
      continue;
    }

    /*
     * An enclosure follows its parent, whatever the dates say. A receipt attached to
     * a letter belongs with the letter even if the receipt is dated a week earlier.
     */
    if (document.attachedToId) {
      const parent = documents.find((candidate) => candidate.id === document.attachedToId);
      if (parent?.exhibitNumber != null) {
        const suffix = nextSuffix(parent.exhibitNumber);
        if (suffix !== null) {
          proposed.push({
            documentId: document.id,
            label: exhibitLabel(parent.exhibitNumber, suffix),
            exhibitNumber: parent.exhibitNumber,
            exhibitSuffix: suffix,
            reason: `Attached to exhibit ${parent.exhibitNumber}, so it is numbered under it.`,
            isChange: false,
          });
          continue;
        }
      }
      // No numbered parent yet, or suffixes exhausted: fall through to a plain number.
    }

    /*
     * A document dated before something already numbered gets a SUFFIX on the
     * exhibit it follows, rather than a number that would sit out of order — and
     * rather than renumbering everything after it.
     */
    const precedingNumbered = dated
      .filter(
        (candidate) =>
          candidate.exhibitNumber !== null &&
          (candidate.userDate ?? "") <= (document.userDate ?? ""),
      )
      .reduce<NumberableDocument | null>(
        (latest, candidate) =>
          latest === null || (candidate.exhibitNumber ?? 0) > (latest.exhibitNumber ?? 0)
            ? candidate
            : latest,
        null,
      );

    const laterNumberedExists = dated.some(
      (candidate) =>
        candidate.exhibitNumber !== null &&
        (candidate.userDate ?? "") > (document.userDate ?? ""),
    );

    if (precedingNumbered?.exhibitNumber != null && laterNumberedExists) {
      const suffix = nextSuffix(precedingNumbered.exhibitNumber);
      if (suffix !== null) {
        proposed.push({
          documentId: document.id,
          label: exhibitLabel(precedingNumbered.exhibitNumber, suffix),
          exhibitNumber: precedingNumbered.exhibitNumber,
          exhibitSuffix: suffix,
          reason:
            `This is dated between exhibit ${precedingNumbered.exhibitNumber} and the ` +
            `one after it, so it is offered as ${exhibitLabel(precedingNumbered.exhibitNumber, suffix)} ` +
            `rather than moving the numbers that come later.`,
          isChange: false,
        });
        continue;
      }
    }

    proposed.push({
      documentId: document.id,
      label: exhibitLabel(nextNumber, null),
      exhibitNumber: nextNumber,
      exhibitSuffix: null,
      reason: "Added after the documents already numbered, so it takes the next number.",
      isChange: false,
    });
    nextNumber += 1;
  }

  return {
    proposed,
    needDates: undated.map((document) => document.id),
    warning: null,
  };
}

/**
 * Numbers everything from 1 in date order, ignoring what is already assigned.
 *
 * *** THIS IS THE DANGEROUS ONE AND IT IS NAMED ACCORDINGLY ***
 *
 * It exists because a user who has not yet served anything genuinely may want a
 * clean 1..n in date order, and telling them they cannot would be worse. But it
 * moves numbers that may already have been cited, so it always reports
 * `isChange` per document and a `warning` naming how many move.
 *
 * It must never be called without the user confirming that warning. The route
 * requires an explicit acknowledgement; this function cannot enforce that, so it
 * makes the consequence impossible to miss instead.
 */
export function proposeRenumberFromOne(
  documents: readonly NumberableDocument[],
): NumberingProposal {
  const { dated, undated } = documentOrder(documents);

  const proposed: ProposedNumber[] = [];
  let nextNumber = 1;

  /*
   * Enclosures are grouped under their parent, so they do not consume a number of
   * their own and stay visibly attached.
   */
  const enclosuresOf = new Map<string, NumberableDocument[]>();
  for (const document of dated) {
    if (document.attachedToId) {
      const list = enclosuresOf.get(document.attachedToId) ?? [];
      list.push(document);
      enclosuresOf.set(document.attachedToId, list);
    }
  }

  for (const document of dated) {
    if (document.attachedToId) continue;

    const number = nextNumber;
    nextNumber += 1;

    const changed =
      document.exhibitNumber !== number || (document.exhibitSuffix ?? null) !== null;

    proposed.push({
      documentId: document.id,
      label: exhibitLabel(number, null),
      exhibitNumber: number,
      exhibitSuffix: null,
      reason:
        document.exhibitNumber === null
          ? "Numbered in date order."
          : `Was exhibit ${exhibitLabel(document.exhibitNumber, document.exhibitSuffix)}, now ${number} in date order.`,
      isChange: changed,
    });

    const enclosures = enclosuresOf.get(document.id) ?? [];
    enclosures.forEach((enclosure, index) => {
      const suffix = SUFFIX_ALPHABET[index] ?? null;
      if (suffix === null) return;
      proposed.push({
        documentId: enclosure.id,
        label: exhibitLabel(number, suffix),
        exhibitNumber: number,
        exhibitSuffix: suffix,
        reason: `Attached to exhibit ${number}.`,
        isChange:
          enclosure.exhibitNumber !== number ||
          (enclosure.exhibitSuffix ?? null) !== suffix,
      });
    });
  }

  const moving = proposed.filter(
    (entry) => entry.isChange && documents.some((d) => d.id === entry.documentId && d.exhibitNumber !== null),
  ).length;

  return {
    proposed,
    needDates: undated.map((document) => document.id),
    warning:
      moving > 0
        ? `This changes the number of ${moving} document${moving === 1 ? "" : "s"} that ` +
          `already had one. If you have already served or filed an exhibit book, or ` +
          `referred to an exhibit by number in anything you have sent, those references ` +
          `will no longer match.`
        : null,
  };
}
