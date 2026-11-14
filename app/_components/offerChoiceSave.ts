"use client";

/**
 * THE ONE HANDLER FOR AN OFFER'S "NO, THAT'S NOT RIGHT" AND "I'M NOT SURE" (site owner, 14 Nov 2026, decision 2 on the
 * batch report). UseSuggestion.tsx calls it on every offer; no screen saves an offer's choice another way, except the
 * three that keep it in a record of their own (OfferTarget.recordedBy, listed in verifySuggestionsOffered.ts).
 *
 * What is saved is worked out in src/lib/case-system/caseFile/offerChoice.ts; where it goes:
 *   - inside the intake (the builder and the home page: IntakeRecovery), through the one writer (caseWrite.ts
 *     writeOfferChoice): the choice in the case record's own section, and "not sure" in the change record, which the
 *     intake sends to the server like every edit;
 *   - on a case page (CaseHomeContext), to POST /api/cases/facts: the offer choice and the "not sure" fact in one save,
 *     then the case is read again;
 *   - anywhere else (a page with no case and no intake, such as the public forms list): kept on this page only, as before.
 */
import { useCallback, useContext, useState } from "react";
import { useIntakeRecovery, useIntakeReviewView } from "./IntakeRecovery";
import { writeOfferChoice } from "./caseWrite";
import { authHeaders, CaseHomeContext } from "../cases/_components/CaseHomeContext";
import { offerChoicesOf, offerChoiceWrites, type OfferChoice, type OfferTarget } from "../../src/lib/case-system/caseFile/offerChoice";
import { readCheckpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { caseFileOfMaster } from "../../src/lib/case-system/caseFile/caseFileOfMaster";

export type OfferChoices = {
  /** The choice the case holds on this offer, or null. */
  choiceOf: (key: string) => OfferChoice | null;
  /** Record the person's choice: never throws; a failed save on a case page is said beside the offer by the caller. */
  record: (target: OfferTarget, choice: OfferChoice) => Promise<boolean>;
  /** Where the choice is kept: "intake", "case", or "page" (this page only). */
  where: "intake" | "case" | "page";
};

export function useOfferChoices(): OfferChoices {
  const recovery = useIntakeRecovery();
  const view = useIntakeReviewView();
  const home = useContext(CaseHomeContext);
  const [onPage, setOnPage] = useState<Record<string, OfferChoice>>({});

  const caseSections = (() => {
    if (recovery || !home) return undefined;
    const master = (home.caseRecord.master_result ?? {}) as Record<string, unknown>;
    const court = home.courtPath;
    return court ? readCheckpoint(master.intakeCheckpoint, court, home.caseRecord.id)?.sections : undefined;
  })();
  const held = recovery ? offerChoicesOf(view?.checkpoint.sections as Record<string, unknown> | undefined) : caseSections ? offerChoicesOf(caseSections as Record<string, unknown>) : {};

  const record = useCallback(async (target: OfferTarget, choice: OfferChoice): Promise<boolean> => {
    if (recovery) {
      writeOfferChoice(recovery, target, choice);
      return true;
    }
    if (home && home.courtPath) {
      const headers = await authHeaders();
      if (!headers) return false;
      try {
        const response = await fetch("/api/cases/facts", { method: "POST", headers, body: JSON.stringify({ caseId: home.caseRecord.id, facts: offerChoiceWrites(target, choice, 0, caseFileOfMaster(home.caseRecord.master_result ?? {}, home.courtPath)), offers: [{ key: target.key, choice }] }) });
        if (!response.ok) return false;
        await home.reload();
        return true;
      } catch {
        return false;
      }
    }
    setOnPage((now) => ({ ...now, [target.key]: choice }));
    return true;
  }, [recovery, home]);

  return {
    choiceOf: (key: string) => held[key] ?? onPage[key] ?? null,
    record,
    where: recovery ? "intake" : home && home.courtPath ? "case" : "page",
  };
}
