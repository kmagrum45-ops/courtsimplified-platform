export type NarrativeFactState = "direct" | "unclear" | "contradictory" | "missing";

export type NarrativePrefillFact = {
  field: string;
  value: string | string[];
  state: NarrativeFactState;
  sourceText: string;
};

export type NarrativePrefill = {
  courtPath: "small-claims" | "family" | "civil";
  caseId?: string;
  narrative: string;
  facts: NarrativePrefillFact[];
  questions: string[];
};

const STORAGE_PREFIX = "courtsimplified-ai-case-partner-chat:narrative-prefill";

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function addDirect(
  facts: NarrativePrefillFact[],
  field: string,
  value: string | string[],
  sourceText: string,
) {
  if (!facts.some((fact) => fact.field === field)) {
    facts.push({ field, value, state: "direct", sourceText });
  }
}

function addReview(
  facts: NarrativePrefillFact[],
  field: string,
  state: "unclear" | "contradictory",
  sourceText: string,
) {
  facts.push({ field, value: "", state, sourceText });
}

function storageKey(courtPath: NarrativePrefill["courtPath"]): string {
  return `${STORAGE_PREFIX}:${courtPath}`;
}

/**
 * Extract only literal, reviewable intake values. It deliberately leaves actor
 * identity unresolved unless the narrator identifies their own role.
 */
export function extractNarrativePrefill(args: {
  narrative: string;
  courtPath: NarrativePrefill["courtPath"];
  caseId?: string;
}): NarrativePrefill {
  const narrative = clean(args.narrative);
  const lower = narrative.toLowerCase();
  const facts: NarrativePrefillFact[] = [];
  const questions: string[] = [];

  addDirect(facts, "facts", narrative, narrative);

  const namedSelf = /\b(?:my name is|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/i.exec(narrative);
  if (namedSelf) addDirect(facts, "yourName", namedSelf[1], namedSelf[0]);

  const namedOther = /\b(?:against|from|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/i.exec(narrative);
  if (namedOther) addDirect(facts, "otherParty", namedOther[1], namedOther[0]);

  const amount = /\b(?:total(?: amount)? (?:is|of)|claim(?:ed)? (?:is|for))\s*(?:\$\s*|CAD\s*)(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/i.exec(narrative)
    || /(?:\$\s*|CAD\s*)(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/i.exec(narrative);
  if (amount) addDirect(facts, "amountClaimed", `$${amount[1]}`, amount[0]);

  const remedy = /\b(?:i (?:want|seek|am seeking)|seeking)\s+([^.!?]{3,100})/i.exec(narrative);
  if (remedy) {
    const value = clean(remedy[1]);
    addDirect(facts, args.courtPath === "civil" ? "legalRemedy" : "goal", value, remedy[0]);
  }

  const dateMatches = narrative.match(/\b(?:on\s+)?(?:\d{4}-\d{2}-\d{2}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4})\b/gi);
  if (dateMatches?.length) addDirect(facts, "timeline", dateMatches.join("; "), dateMatches.join("; "));

  const evidence = narrative.match(/\b(?:screenshots?|emails?|text messages?|messages?|receipts?|invoices?|photos?|witness(?:es)?|documents?|records?)\b/gi);
  if (evidence?.length) addDirect(facts, "evidence", Array.from(new Set(evidence.map(clean))).join(", "), evidence.join(", "));

  const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.exec(narrative);
  if (email && /\b(?:email|contact|reach)\b/i.test(narrative)) {
    addDirect(facts, "yourEmail", email[0], email[0]);
  }

  const address = /\b(?:my address is|i live at|my mailing address is)\s+(\d{1,5}\s+[^.!?]{4,140})/i.exec(narrative);
  if (address) addDirect(facts, "addressDetails", clean(address[1]), address[0]);

  const settlement = /\b(?:i offered to settle|we discussed settlement|they rejected my settlement offer|we reached a settlement)\b[^.!?]*/i.exec(narrative);
  if (settlement) addDirect(facts, "settlementEfforts", clean(settlement[0]), settlement[0]);

  const enforcement = /\b(?:i am trying to enforce|enforcement is needed|the judgment remains unpaid|the order remains unpaid)\b[^.!?]*/i.exec(narrative);
  if (enforcement) addDirect(facts, "enforcementDetails", clean(enforcement[0]), enforcement[0]);

  const urgency = /\b(?:this is urgent|urgent because|immediate harm|deadline is)\b[^.!?]*/i.exec(narrative);
  if (urgency) addDirect(facts, "urgent", clean(urgency[0]), urgency[0]);

  const existingOrder = /\b(?:there is an existing court order|an order was made|we have a court order|there is a judgment)\b[^.!?]*/i.exec(narrative);
  if (existingOrder) {
    addDirect(facts, "existingOrderDetails", clean(existingOrder[0]), existingOrder[0]);
    addDirect(
      facts,
      "documentStatus",
      args.courtPath === "family" ? ["order-agreement"] : args.courtPath === "civil" ? ["order"] : ["judgment"],
      existingOrder[0],
    );
  }

  const breakdown = /\b(?:breakdown is|made up of|includes)\s+([^.!?]{6,180})/i.exec(narrative);
  if (breakdown && /\$|amount|cost|damage|invoice|loss/i.test(breakdown[0])) {
    addDirect(facts, "damagesBreakdown", clean(breakdown[1]), breakdown[0]);
  }

  const service = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+served\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+with\s+(?:a |the )?(Plaintiff'?s Claim|Statement of Claim|Application)\b/i.exec(narrative);
  if (service) {
    const document = service[3];
    addDirect(facts, "serviceDetails", service[0], service[0]);
    addDirect(facts, "caseStage", "already-started", service[0]);
    addDirect(facts, "plaintiffName", service[1], service[0]);
    addDirect(facts, "defendantName", service[2], service[0]);
    addDirect(
      facts,
      "documentStatus",
      args.courtPath === "family"
        ? ["Application already filed / served"]
        : args.courtPath === "civil"
          ? ["statement-claim"]
          : ["plaintiffs-claim"],
      document,
    );
    if (!/\b(?:i|me)\b/i.test(service[0])) {
      questions.push("Which person in that service statement are you?");
    }
  } else if (/\bserved\b/i.test(narrative)) {
    addReview(facts, "serviceDetails", "unclear", narrative);
    questions.push("Who served whom, with which document, and when?");
  }

  if (/\b(?:my address|contact details|service address)\b/i.test(narrative) && !address && !email) {
    addReview(facts, "addressDetails", "unclear", narrative);
    questions.push("What exact address or contact detail should be used, and whose is it?");
  }

  const wasServed = /\b(?:i was served|i received)\b/i.test(lower);
  const served = /\b(?:i served|i filed)\b/i.test(lower);
  if (wasServed && served) {
    addReview(facts, "yourRole", "contradictory", narrative);
    questions.push("You described both serving and being served. Which role applies to this case?");
  } else if (wasServed) {
    addDirect(facts, "yourRole", args.courtPath === "small-claims" ? "Defendant / responding party" : "respondent", "I was served/received");
    addDirect(facts, "caseStage", "already-started", "I was served/received");
  } else if (served) {
    addDirect(facts, "yourRole", args.courtPath === "small-claims" ? "Plaintiff / claimant" : "plaintiff", "I served/filed");
    addDirect(facts, "caseStage", "already-started", "I served/filed");
  }

  return { courtPath: args.courtPath, caseId: args.caseId, narrative, facts, questions };
}

export function persistNarrativePrefill(prefill: NarrativePrefill) {
  if (typeof window === "undefined" || !prefill.narrative) return;
  sessionStorage.setItem(storageKey(prefill.courtPath), JSON.stringify(prefill));
}

export function consumeNarrativePrefill(args: {
  courtPath: NarrativePrefill["courtPath"];
  caseId?: string | null;
}): NarrativePrefill | null {
  if (typeof window === "undefined") return null;
  const key = storageKey(args.courtPath);
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as NarrativePrefill;
    if (value.courtPath !== args.courtPath || (value.caseId && value.caseId !== args.caseId)) return null;
    sessionStorage.removeItem(key);
    return value;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}

export function directPrefillValues(prefill: NarrativePrefill): Record<string, string | string[]> {
  return Object.fromEntries(
    prefill.facts
      .filter((fact) => fact.state === "direct")
      .map((fact) => [fact.field, fact.value]),
  );
}
