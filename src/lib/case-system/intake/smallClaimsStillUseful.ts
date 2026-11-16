/**
 * THE SMALL CLAIMS FORM'S "STILL USEFUL TO ADD" LINE, FROM THE CASE RECORD (moved out of SmallClaimsIntake.tsx so it is
 * checked without a browser: test:milestone-ask-once).
 *
 * Pure. States no law.
 */
import { storyOfFile, type CaseFile } from "../caseFile/caseFile";
import { factStatus } from "../caseFile/factStatus";
import { evidenceIn, lossesIn } from "../caseFile/storyFacts";
import { detailStatus, partyName, type Party, type PartyDetail } from "../parties/parties";
import { dateSpans } from "../dates";
/** The Small Claims form's boxes this line reads (a part of SmallClaimsIntelligenceInput; no import of the engine, which
 *  reaches the AI client: test:parties-never-to-ai). */
type SmallClaimsIntelligenceInput = { yourName: string; otherParty: string; defendantAddress: string; facts: string; timeline: string; evidence: string; amountClaimed: string; damagesBreakdown: string; yourRole: string };

const hasText = (value: string | undefined): boolean => Boolean(value && value.trim().length > 0);
const isDefendantRole = (role: string | undefined): boolean => /defendant|responding/i.test(role ?? "");

/**
 * What is still useful to add, from the case record (site owner, 16 Nov 2026; Chrome milestone test of #550, row 15: the
 * banner asked for "your legal name, the other party's address for service, what evidence you have, how the amount was
 * calculated" when the Parties step held the names and addresses and the story gave the evidence and the breakdown). The
 * names and addresses are the Parties step's (parties.ts detailStatus: given or "not sure" is never asked again), the
 * other party and the amount the one function's (factStatus.ts), the evidence and the breakdown what the story states
 * (storyFacts.ts) as well as the form's own boxes. No list of its own.
 */
export function buildMissingPrompt(input: SmallClaimsIntelligenceInput, file: CaseFile): string {
  const missing: string[] = [];
  const story = storyOfFile(file) || input.facts;
  const you = file.parties.list.find((party) => party.you);
  const other = file.parties.list.find((party) => party.side === "other");
  const nameHeld = (party: Party | undefined) => Boolean(party && (partyName(party) || ["fullName", "firstName", "lastName", "companyName"].some((detail) => detailStatus(party, detail as PartyDetail) === "settled")));

  if (!nameHeld(you) && !hasText(input.yourName)) missing.push("your legal name");
  if (factStatus(file, "otherParty") === "ask" && !nameHeld(other) && !hasText(input.otherParty)) missing.push("the other party’s name");
  if (!(other && detailStatus(other, "street") !== "ask") && !hasText(input.defendantAddress)) missing.push("the other party’s address for service");
  if (!hasText(story)) missing.push("the case story");
  // Dates and evidence already in the story count (page review, 2026-10-06:
  // "important dates" was asked for after "the papers came on September 25").
  const storyHasDate = dateSpans(story).length > 0;
  if (!hasText(input.timeline) && !storyHasDate) missing.push("important dates");
  if (!hasText(input.evidence) && !evidenceIn(story)) missing.push("what evidence you have");
  if (factStatus(file, "amount") === "ask" && !hasText(input.amountClaimed)) missing.push(isDefendantRole(input.yourRole) ? "the amount the claim asks for" : "the amount claimed, if money is requested");
  if (!hasText(input.damagesBreakdown) && !lossesIn(story) && !isDefendantRole(input.yourRole)) missing.push("how the amount was calculated");

  if (!missing.length) {
    return "You have given enough to see your next steps. You can add more later.";
  }

  return `Still useful to add: ${missing.join(", ")}.`;
}
