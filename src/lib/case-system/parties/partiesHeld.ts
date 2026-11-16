/**
 * WHETHER THE PARTIES RECORD HOLDS EACH PARTY DETAIL A CHECK ASKS ABOUT: yes or no only, never the detail itself (site
 * owner, 16 Nov 2026).
 *
 * The case review's "Your full legal name isn't in your case file yet" read the form's old name box while the Parties step
 * held the name. The case review sits beside a model call, and party details are never sent to OpenAI (rule 3;
 * test:parties-never-to-ai), so it gets only these yes-or-no answers, from here, and no name, address or number.
 *
 * Pure. Imports no AI code.
 */
import { caseFileOfMaster } from "../caseFile/caseFileOfMaster";
import { detailStatus, partyName } from "./parties";

export type PartiesHeld = { you: boolean; other: boolean; otherAddress: boolean };

export function partiesHeldOfMaster(master: unknown, courtPath: string | null): PartiesHeld {
  const file = caseFileOfMaster(master, courtPath);
  if (!file.parties.recorded) return { you: false, other: false, otherAddress: false };
  const you = file.parties.list.find((party) => party.you);
  const other = file.parties.list.find((party) => party.side === "other");
  return {
    you: Boolean(you && partyName(you)),
    other: Boolean(other && partyName(other)),
    otherAddress: Boolean(other && detailStatus(other, "street") === "known"),
  };
}
