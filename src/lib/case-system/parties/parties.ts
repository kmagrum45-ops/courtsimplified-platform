/**
 * THE PARTIES OF A CASE: ONE RECORD (site owner, 14 Nov 2026, rules 1 and 2; Chrome forms test on #550).
 *
 * Where it lives: the case record's own section, `sections.caseFile.parties` (CASE_FILE_SECTION), written only by the
 * browser's one writer (app/_components/caseWrite.ts writeParties) and saved with the case like every other answer.
 * Read only through caseFileOf (`file.parties`). An older case has no record: its parties are read from what it holds
 * (the other party's name, the whole Small Claims form's boxes: caseFile/oldParties.ts), never written back.
 *
 * The person is the party with `you: true`. Every party is on a side: "yours" (the person's side: co-plaintiffs, or
 * co-defendants when the person is sued) or "other". A form puts each side in its own boxes (plaintiffs or defendants by
 * the person's role), each party as its own entry, never two in one name.
 *
 * A detail is known (given), settled ("I'm not sure": never asked again) or still to ask. The other side's phone, email
 * and representative, and anyone's second name, other names and representative, are optional: accepted, never asked.
 *
 * PRIVACY (rule 3): nothing here is sent to a model. The AI client labels every name and detail this record holds
 * (privacy/nameLabels.ts), and no AI request builder may import this module (test:parties-never-to-ai).
 *
 * Pure: no React, no network, no model. States no law.
 */
import { sentences } from "../sentences";
import { partyDetailFits } from "../caseFile/factTypes";

export const PARTY_DETAILS = [
  "companyName", "firstName", "secondName", "lastName", "fullName", "alsoKnownAs",
  "street", "city", "province", "postalCode", "phone", "email",
  "repName", "repLso", "repStreet", "repCity", "repProvince", "repPostalCode", "repPhone", "repEmail",
] as const;
export type PartyDetail = (typeof PARTY_DETAILS)[number];
export type PartySide = "yours" | "other";
export type PartyKind = "person" | "company";

export type Party = {
  id: string;
  /** The person using the site. */
  you?: true;
  side: PartySide;
  kind?: PartyKind;
  details: Partial<Record<PartyDetail, string>>;
  /** Details the person said "I'm not sure" about: never asked again. */
  unsure: PartyDetail[];
};

export type PartiesRecord = {
  version: 1;
  list: Party[];
  /** Story offers the person answered "No, that's not right": never offered again. */
  declined: string[];
};

/** What caseFileOf holds: the list, and whether it is the person's record (false: read from an older case). */
export type PartiesHeld = { list: Party[]; recorded: boolean };

export const MAX_PARTIES = 40;
const MAX_DETAIL = 300;
const MAX_DECLINED = 400;

const object = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const isDetail = (key: unknown): key is PartyDetail => typeof key === "string" && (PARTY_DETAILS as readonly string[]).includes(key);
const clean = (value: unknown): string => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

/** The record as saved, checked; null when anything in it is not well formed (nothing half-read). */
export function readParties(raw: unknown): PartiesRecord | null {
  const record = object(raw);
  if (record.version !== 1 || !Array.isArray(record.list) || record.list.length > MAX_PARTIES) return null;
  const declined = record.declined === undefined ? [] : record.declined;
  if (!Array.isArray(declined) || declined.length > MAX_DECLINED || !declined.every((key) => typeof key === "string" && key.length <= 600)) return null;
  const list: Party[] = [];
  const ids = new Set<string>();
  for (const rawParty of record.list) {
    const party = object(rawParty);
    if (typeof party.id !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(party.id) || ids.has(party.id)) return null;
    ids.add(party.id);
    if (party.side !== "yours" && party.side !== "other") return null;
    if (party.kind !== undefined && party.kind !== "person" && party.kind !== "company") return null;
    if (party.you !== undefined && party.you !== true) return null;
    const details: Partial<Record<PartyDetail, string>> = {};
    for (const [key, value] of Object.entries(object(party.details))) {
      if (!isDetail(key) || typeof value !== "string" || value.length > MAX_DETAIL) return null;
      if (value.trim()) details[key] = value;
    }
    const unsure = party.unsure === undefined ? [] : party.unsure;
    if (!Array.isArray(unsure) || !unsure.every(isDetail)) return null;
    list.push({ id: party.id, ...(party.you === true ? { you: true as const } : {}), side: party.side, ...(party.kind ? { kind: party.kind as PartyKind } : {}), details, unsure: [...new Set(unsure as PartyDetail[])] });
  }
  if (list.filter((party) => party.you).length > 1) return null;
  return { version: 1, list, declined: declined as string[] };
}

const COMPANY = /\b(?:Ltd|Limited|Inc|Incorporated|Corp|Corporation|Co|Company|LLP|LP|Ltée|Ltee|Ltd\.?|Inc\.?|Corp\.?)\b\.?$|\b(?:Ltd|Inc|Corp|LLP)\.?\b/i;
/** A name that names a company in its own words ("Ltd.", "Inc.", "Corporation"). */
export const isCompanyName = (name: string): boolean => COMPANY.test(name.trim());

/** A party's name as it is written: the company's name, or the person's names in order, or the name as given whole. */
export function partyName(party: Party): string {
  const { companyName, firstName, secondName, lastName, fullName } = party.details;
  if (party.kind !== "person" && companyName) return companyName;
  const parts = [firstName, secondName, lastName].map(clean).filter(Boolean);
  return parts.length ? parts.join(" ") : clean(fullName) || clean(companyName);
}

/** Known (given), settled ("I'm not sure"), or still to ask. */
export function detailStatus(party: Party, detail: PartyDetail): "known" | "settled" | "ask" {
  if (clean(party.details[detail])) return "known";
  return party.unsure.includes(detail) ? "settled" : "ask";
}

const ADDRESS: PartyDetail[] = ["street", "city", "province", "postalCode"];

/**
 * The details the asker still asks of a party, in order: the kind (a person or a company), the name, the address; and,
 * for the person, their phone and email. Optional details are never asked (rule 1: "and, if given ...").
 */
export function detailsToAsk(party: Party): PartyDetail[] {
  const name: PartyDetail[] = party.kind === "company" ? ["companyName"] : party.kind === "person" ? ["firstName", "lastName"] : [];
  const own: PartyDetail[] = party.you ? ["phone", "email"] : [];
  return [...name, ...ADDRESS, ...own].filter((detail) => detailStatus(party, detail) === "ask");
}

/** Whether the kind (person or company) is still to ask. */
export const kindToAsk = (party: Party): boolean => !party.kind;

// ---- The details typed in the story, offered once each (rule 2) -------------------------------------------------

export type PartyOffer = {
  /** Stable: the same detail in the same story is the same offer ("you:email:a@b.ca"). */
  key: string;
  /** "you", or "other:N" for the Nth other party the story names. */
  party: string;
  /** The other party's name as the story gives it (to match a party already held). */
  partyName?: string;
  kind?: PartyKind;
  detail: PartyDetail;
  value: string;
  /** The story's own words the value comes from (or, `from` not "story", the words to show where it came from). */
  quote: string;
  /** Where it came from: the story (default), the start's city, or an answer the person typed (findings 2, 3). */
  from?: "story" | "start" | "answer";
};

// An English street ("100 Sample Road") or a French one, the street word first ("8 rue de l'Église"; Chrome pass 3 on
// #550, S2, 19 Nov 2026: the defendant's Gatineau address, typed as an answer, was not carried to the Parties step).
const STREET = String.raw`\d+[A-Za-z]?(?:-\d+)?\s+(?:(?:[A-Z][\p{L}'.-]*\s+){0,4}(?:Street|St\.?|Road|Rd\.?|Avenue|Ave\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Way|Court|Ct\.?|Crescent|Cres\.?|Place|Pl\.?|Terrace|Parkway|Highway|Hwy\.?)|(?:[Rr]ue|[Cc]hemin|[Cc]h\.|[Bb]oulevard|[Bb]oul\.|[Aa]venue|[Aa]v\.|[Rr]oute|[Rr]ang|[Mm]ontée|[Cc]ôte|[Pp]lace|[Pp]romenade)\s+(?:(?:de|du|des|de la|de l'|de l’|la|le|les|l'|l’|d'|d’)\s*)?[\p{L}'’.-]+(?:\s+[\p{Lu}][\p{L}'’.-]*){0,3})`;
/** Every province and territory as an address writes it; the province is kept as written (Ontario as ON). */
const PROVINCE = String.raw`ON|Ont\.?|Ontario|QC|Qc|Que\.?|Québec|Quebec|AB|Alta\.?|Alberta|BC|B\.C\.|British Columbia|MB|Man\.?|Manitoba|NB|New Brunswick|NL|Newfoundland and Labrador|NS|Nova Scotia|PE|PEI|Prince Edward Island|SK|Sask\.?|Saskatchewan|NT|Northwest Territories|NU|Nunavut|YT|Yukon`;
const ADDRESS_RE = new RegExp(String.raw`(${STREET})(?:\s*,\s*(?:(?:Unit|Apt\.?|Suite|app\.?|bureau)\s*\w+)\s*)?\s*,\s*([\p{Lu}][\p{L}'.-]*(?:\s+[\p{Lu}][\p{L}'.-]*){0,3})\s*,?\s+(${PROVINCE})(?![\p{L}])\.?\s*,?\s*([A-Z]\d[A-Z]\s?\d[A-Z]\d)?`, "u");
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/;
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const YOU_NAME_RE = /\b[Mm]y (?:full |legal )?name is ([A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+){0,3})/u;
const SUING_RE = /\b(?:I am|I'm|we are|we're) (?:suing|making a claim against|claiming against)\s+(.+)$/i;
const SAME_ADDRESS_RE = /\bat the same address\b/i;

/** The story's sentences, kept whole ("Ltd., 100 Sample Road" and "ON K1A 0A1" are not ends of sentences). */
export function storySentences(story: string): string[] {
  // The one sentence splitter (sentences.ts; test:shared-behaviour).
  return sentences(story.replace(/\s+/g, " ").trim()).map((sentence) => sentence.trim()).filter(Boolean);
}

type Address = { street: string; city: string; province: string; postalCode?: string; quote: string };
/** A province as an address writes it, as its two-letter code (the form's province box): "Quebec", "Qc", "Que." are QC. */
function provinceCode(written: string): string {
  const word = written.trim().replace(/\.$/, "").toLowerCase();
  const codes: [RegExp, string][] = [[/^(?:on|ont|ontario)$/, "ON"], [/^(?:qc|que|québec|quebec)$/, "QC"], [/^(?:ab|alta|alberta)$/, "AB"], [/^(?:bc|b\.c|british columbia)$/, "BC"], [/^(?:mb|man|manitoba)$/, "MB"], [/^(?:nb|new brunswick)$/, "NB"], [/^(?:nl|newfoundland and labrador)$/, "NL"], [/^(?:ns|nova scotia)$/, "NS"], [/^(?:pe|pei|prince edward island)$/, "PE"], [/^(?:sk|sask|saskatchewan)$/, "SK"], [/^(?:nt|northwest territories)$/, "NT"], [/^(?:nu|nunavut)$/, "NU"], [/^(?:yt|yukon)$/, "YT"]];
  return codes.find(([pattern]) => pattern.test(word))?.[1] ?? written.trim();
}

function addressIn(text: string): Address | null {
  const match = ADDRESS_RE.exec(text);
  if (!match) return null;
  return { street: match[1].trim(), city: match[2].trim(), province: provinceCode(match[3]), ...(match[4] ? { postalCode: match[4].toUpperCase().replace(/^(\w{3})(\w{3})$/, "$1 $2") } : {}), quote: match[0].trim() };
}

const isYouSentence = (sentence: string) => YOU_NAME_RE.test(sentence);
const isSuingSentence = (sentence: string) => SUING_RE.test(sentence);

/**
 * Where a name read from "I am suing <name> ..." ends: just after a company's suffix ("Saint-Jérôme Rénovations Ltée"),
 * else before the sentence goes on ("... for my $1,200 deposit", "... because ..."). Read past them, "Saint-Jérôme
 * Rénovations Ltée for my $1" was offered as a person's name (19 Nov 2026).
 */
function nameEnd(name: string | undefined): string | undefined {
  if (!name) return name;
  const company = /^(.*?\s(?:Ltd|Ltée|Ltee|Limited|Inc|Incorporated|Corp|Corporation|Co|LLC|LLP)\.?)(?=\s|$)/u.exec(name);
  if (company) return company[1].trim();
  return name.split(/\s+(?:for|because|over|about|after|since|who|which|to|from|on|in)\s/)[0].trim();
}

function offersOf(party: string, details: { detail: PartyDetail; value: string; quote: string }[], name?: string, kind?: PartyKind): PartyOffer[] {
  return details.map(({ detail, value, quote }) => ({ key: `${party === "you" ? "you" : `other:${(name ?? "").toLowerCase()}`}:${detail}:${value.toLowerCase()}`, party, ...(name ? { partyName: name } : {}), ...(kind ? { kind } : {}), detail, value, quote }));
}

function addressDetails(address: Address | null): { detail: PartyDetail; value: string; quote: string }[] {
  if (!address) return [];
  return [
    { detail: "street" as const, value: address.street, quote: address.quote },
    { detail: "city" as const, value: address.city, quote: address.quote },
    { detail: "province" as const, value: address.province, quote: address.quote },
    ...(address.postalCode ? [{ detail: "postalCode" as const, value: address.postalCode, quote: address.quote }] : []),
  ];
}

/** Every party detail the story gives, as offers (before taking out what is held or turned down). */
function allStoryOffers(story: string): PartyOffer[] {
  const offers: PartyOffer[] = [];
  let others = 0;
  for (const sentence of storySentences(story)) {
    if (isYouSentence(sentence)) {
      const name = YOU_NAME_RE.exec(sentence)![1];
      const phone = PHONE_RE.exec(sentence)?.[0];
      const email = EMAIL_RE.exec(sentence)?.[0];
      offers.push(...offersOf("you", [
        { detail: "fullName", value: name, quote: name },
        ...addressDetails(addressIn(sentence)),
        ...(phone ? [{ detail: "phone" as const, value: phone, quote: phone }] : []),
        ...(email ? [{ detail: "email" as const, value: email, quote: email }] : []),
      ]));
      continue;
    }
    const suing = SUING_RE.exec(sentence);
    if (!suing) continue;
    let previous: Address | null = null;
    for (const rawChunk of suing[1].split(/,?\s+and also\s+|,\s+and\s+(?=the\s|[A-Z])|;\s*/)) {
      // "the store manager, Test Manager, at the same address": the role words before the name are not the name.
      const chunk = rawChunk.replace(/^(?:the\s+)?(?:[a-z]+\s+){0,3}[a-z]+,\s*/, "").replace(/[.]$/, (end) => (/\b(?:Ltd|Inc|Corp|Co)$/.test(rawChunk.slice(0, -1)) ? end : ""));
      const name = nameEnd(/^([A-Z][^,]*?)(?=,|\s+at\s+the\s+same\s+address|\s*$)/.exec(chunk)?.[1]?.trim());
      if (!name) continue;
      others += 1;
      const kind: PartyKind = isCompanyName(name) ? "company" : "person";
      const own = addressIn(chunk);
      const address = own ?? (SAME_ADDRESS_RE.test(chunk) ? previous : null);
      if (own) previous = own;
      const phone = PHONE_RE.exec(chunk)?.[0];
      const email = EMAIL_RE.exec(chunk)?.[0];
      offers.push(...offersOf(`other:${others}`, [
        { detail: kind === "company" ? "companyName" : "fullName", value: name, quote: name },
        ...addressDetails(address).map((item) => (own ? item : { ...item, quote: /at the same address/i.exec(chunk)?.[0] ?? item.quote })),
        ...(phone ? [{ detail: "phone" as const, value: phone, quote: phone }] : []),
        ...(email ? [{ detail: "email" as const, value: email, quote: email }] : []),
      ], name, kind));
    }
  }
  return offers;
}


/**
 * What the person gave outside the story that a party detail is (Chrome milestone pass 2, findings 2 and 3): the city and
 * province they gave at the start (S1 to S5, S7: "Ottawa", Ontario, then empty boxes on the Parties step), and an address
 * they typed as the answer to a question about the other side (S1: "100 Sample Road, Ottawa ON K1B 0B1", the store's
 * address, then empty Defendant 1 address boxes). Each is offered once, like a story detail, never filled in for them.
 */
export type GivenElsewhere = {
  /** The city given at the start (intakeStory.ts locationOf). */
  location?: { city: string; province?: string } | null;
  /** The questions the person answered in the intake (the home page's reading, the chat), with their words. */
  answered?: readonly { question: string; answer: string }[];
};

/** A question about the other side (the store, the business, the landlord...), not about the person themself. */
const ABOUT_OTHER_SIDE = /\b(?:store|shop|business|company|operator|owner|landlord|tenant|contractor|neighbou?r|employer|seller|buyer|defendant|other (?:party|side|person)|they|their|them)\b/i;
const ABOUT_YOU = /\b(?:your (?:own |home |mailing )?address|where do you live|you live)\b/i;

/**
 * A question naming a business the story names as the place it happened ("at a Circle K": a name after "a", so a business,
 * not a street or a person) asks about that business, the other side (real readings S1 r1-r3, 18 Nov 2026: "What is the
 * street address of the Circle K where you fell?").
 */
function namesStoryBusiness(question: string, story: string): boolean {
  for (const match of story.matchAll(/\bat an? ((?:[A-Z][\w'&.-]*)(?: [A-Z][\w'&.-]*){0,3})/g)) {
    if (question.includes(match[1])) return true;
  }
  return false;
}

function elsewhereOffers(record: PartiesRecord, given: GivenElsewhere, namedOther?: string, story = ""): PartyOffer[] {
  const offers: PartyOffer[] = [];
  const city = given.location?.city?.trim();
  if (city) {
    const quote = `The city you gave at the start: ${city}`;
    // Never a value over one the person gave (site owner, 19 Nov 2026; Chrome pass 3 on #550, S2: "Province: ON" offered
    // after "Gatineau, Quebec"): an answer naming this city with another province gives the province instead.
    const cityWithProvince = new RegExp(String.raw`${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\s*,?\s+(${PROVINCE})(?![\p{L}])`, "u");
    const answeredProvince = (given.answered ?? []).map((item) => ({ item, match: cityWithProvince.exec(item.answer) })).find(({ match }) => match && !/^(?:ON|Ont\.?|Ontario)$/i.test(match[1]));
    offers.push(...offersOf("you", [
      { detail: "city", value: city, quote },
      ...(answeredProvince ? [{ detail: "province" as const, value: provinceCode(answeredProvince.match![1]), quote: `You answered “${answeredProvince.item.answer.trim()}”` }]
        : !given.location?.province || /^(?:ontario|on)$/i.test(given.location.province.trim()) ? [{ detail: "province" as const, value: "ON", quote: `${quote}, Ontario` }] : []),
    ]).map((offer) => ({ ...offer, from: "start" as const })));
  }
  const firstOther = record.list.find((party) => party.side === "other");
  for (const { question, answer } of given.answered ?? []) {
    const address = addressIn(answer);
    if (!address) continue;
    const quoted = addressDetails({ ...address, quote: `You answered “${answer.trim()}” to “${question.trim()}”` });
    if (ABOUT_YOU.test(question)) offers.push(...offersOf("you", quoted).map((offer) => ({ ...offer, from: "answer" as const })));
    else if ((ABOUT_OTHER_SIDE.test(question) || namesStoryBusiness(question, story)) && record.list.filter((party) => party.side === "other").length <= 1) {
      // For the one other party: by its held name, else the name the case or reading gives, else unnamed (S1, all three
      // real readings: Defendant 1 had no name yet, so the store's address was never offered).
      const name = (firstOther && partyName(firstOther)) || namedOther;
      const kind = firstOther && partyName(firstOther) ? firstOther.kind : name && isCompanyName(name) ? "company" as const : undefined;
      offers.push(...offersOf("other:1", quoted, name, kind).map((offer) => ({ ...offer, from: "answer" as const })));
    }
  }
  return offers;
}

const sameName = (a: string, b: string) => a.replace(/[.,]/g, "").trim().toLowerCase() === b.replace(/[.,]/g, "").trim().toLowerCase();

/** The party an offer is for, among those held: the person, or the other party with the story's name. */
export function partyOfOffer(record: Pick<PartiesRecord, "list">, offer: PartyOffer): Party | undefined {
  if (offer.party === "you") return record.list.find((party) => party.you);
  // An unnamed offer for the first other party (an address typed as an answer) is for the one other party held.
  const others = record.list.filter((party) => party.side === "other");
  if (offer.party === "other:1" && !offer.partyName) return others.length === 1 ? others[0] : undefined;
  return record.list.find((party) => party.side === "other" && offer.partyName && (sameName(partyName(party), offer.partyName) || sameName(clean(party.details.fullName), offer.partyName) || sameName(clean(party.details.companyName), offer.partyName)));
}

/** A name given whole that the record already holds split ("Test Plaintiff" as first and last name) is held. */
function nameHeld(party: Party, detail: PartyDetail): boolean {
  if (detail !== "fullName" && detail !== "companyName") return false;
  return Boolean(partyName(party)) || party.unsure.includes("firstName") || party.unsure.includes("lastName") || party.unsure.includes("companyName");
}

/**
 * The party details the story gives that are still to offer: each once, never one the person turned down, never one
 * the record already holds (given or "I'm not sure").
 */
export function storyPartyOffers(story: string, record: PartiesRecord, named?: { value: string; quote: string } | null, given: GivenElsewhere = {}): PartyOffer[] {
  const declined = new Set(record.declined);
  const seen = new Set<string>();
  // The story first; then what the person gave elsewhere, for a detail the story does not give (findings 2 and 3).
  const told = allStoryOffers(story);
  const fromStory = [...told, ...elsewhereOffers(record, given, named?.value.trim() || undefined, story).filter((offer) => !told.some((item) => item.party === offer.party && item.detail === offer.detail))];
  // The other party's name the case already holds, or the story reading showed (caseFile/storyOffers.ts), offered for the
  // first other party when the story's own sentences name none: "Alex" was the case title and the reading's other party,
  // and Defendant 1's first name was an empty box (Chrome milestone test of #550, S5). A one-word name is a first name.
  const name = named?.value.trim();
  if (name && !fromStory.some((offer) => offer.party === "other:1" && (offer.detail === "fullName" || offer.detail === "companyName"))) {
    const kind: PartyKind = isCompanyName(name) ? "company" : "person";
    const detail: PartyDetail = kind === "company" ? "companyName" : name.includes(" ") ? "fullName" : "firstName";
    fromStory.push(...offersOf("other:1", [{ detail, value: name, quote: named!.quote }], name, kind));
  }
  return fromStory.filter((offer) => {
    if (declined.has(offer.key) || seen.has(offer.key)) return false;
    // Only a value of the detail's type: a place is never offered as a name (factTypes.ts; decision 1, 18 Nov 2026).
    if (!partyDetailFits(offer.detail, offer.value)) return false;
    seen.add(offer.key);
    const party = partyOfOffer(record, offer);
    if (!party) return true;
    return detailStatus(party, offer.detail) === "ask" && !nameHeld(party, offer.detail);
  });
}

/** The story without its sentences that only give the parties' details (they are offered, never numbered as facts). */
export function storyWithoutPartyDetails(story: string): string {
  return storySentences(story).filter((sentence) => !isYouSentence(sentence) && !isSuingSentence(sentence)).join(" ");
}

/** The plaintiffs and defendants, in order, by the person's role: each party its own entry. */
export function partiesByRole(list: readonly Party[], personSues: boolean): { plaintiffs: Party[]; defendants: Party[] } {
  const yours = [...list.filter((party) => party.you), ...list.filter((party) => party.side === "yours" && !party.you)];
  const other = list.filter((party) => party.side === "other");
  return personSues ? { plaintiffs: yours, defendants: other } : { plaintiffs: other, defendants: yours };
}

/**
 * THE NAMES EVERY SCREEN SHOWS FOR THE PARTIES, from the parties record (site owner, 16 Nov 2026; Chrome milestone test
 * of #550, row 21: the case snapshot's "Parties recorded" and the case file page's "Other side" named only Circle K, while
 * the record held Circle K and Test Manager). The person's own name, and each other party its own name, in order; the
 * case's other-party answer only when the record names none. One function: the case snapshot, the case file page and
 * "What we have so far" all read it.
 */
export function partyNames(list: readonly Party[], fallback: { you?: string; other?: string } = {}): { you: string; others: string[] } {
  const you = list.find((party) => party.you);
  const others = list.filter((party) => party.side === "other").map(partyName).filter(Boolean);
  return { you: (you ? partyName(you) : "") || (fallback.you ?? "").trim(), others: others.length ? others : fallback.other?.trim() ? [fallback.other.trim()] : [] };
}

/**
 * THE WORDS EACH SIDE IS CALLED BY IN A COURT: the one function (site owner, 16 Nov 2026; Chrome milestone test of #550,
 * row 42: the Family Parties step said "Plaintiff 1 (you)", "Defendant 1", "Add another defendant" while the overview of
 * the same case said "Applicant"). Family: the applicant and the respondent; Small Claims and Civil: the plaintiff and
 * the defendant. The Parties step, the drafts, the start answers, the exhibit book and every form read it.
 */
export function sideWordsOf(court: string | null | undefined): { starts: string; responds: string } {
  return court === "family" ? { starts: "Applicant", responds: "Respondent" } : { starts: "Plaintiff", responds: "Defendant" };
}

/** The word for a party's side: the person's own side is the side that starts the case when the person starts it. */
export function partySideWord(court: string | null | undefined, party: Pick<Party, "side">, personStarts: boolean): string {
  const words = sideWordsOf(court);
  const theirsStarts = party.side === "other" ? !personStarts : personStarts;
  return theirsStarts ? words.starts : words.responds;
}
