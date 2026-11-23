/**
 * WHEN AND WHERE EACH FACT IS ASKED, OFFERED OR CONFIRMED (C9, site owner, 23 Nov 2026: "Build the list of EVERY place a
 * fact can be asked, offered or confirmed to a person ... For each place, which facts it can show, and as what").
 *
 * One row per place a person sees. For each fact the place can show, as what:
 *   ask      a question for it (a box, choices);
 *   offer    a value read from the story or the AI, for the person to accept ("From the name you gave");
 *   confirm  a held value shown back, with Change (never a question).
 * and what decides whether it is shown once the fact is held somewhere else (the gate):
 *   case-file  the one function (factStatus.ts): shown only while the fact is "ask" (or "offer", once). test:fact-places
 *              calls the place's own decider with a file where every fact is held, and fails if it would still ask;
 *   answers    the same question id's saved answer (CaseFile.answers), for a date the case file keeps by question id;
 *   first      the first place the fact is asked: nothing comes before it, so nothing can be repeated;
 *   own-copy   a record of the place's own (the situation record, the parties record ...), not the case file: it does not
 *              know what another place was told, so it can ask or offer again. `copy` names it;
 *   none       nothing checks: shown whenever the place is.
 * A fact the case file cannot hold (not in SLOT_FACTS) is never stopped by the one function, whatever the row says.
 *
 * `ids`: the question ids the row shows (the question bank, the Civil and Family fields, the Family triage, the home
 * page): test:fact-places fails when a question id is in no row, so a new question cannot be added without its place.
 * `at`: the file that shows it (no line numbers: they drift).
 *
 * The rule (C9): for every fact, in every court, once one place has it, no other place may ask or offer it again. A row
 * that asks or offers a fact with no case-file gate, where another place in the same court also has the fact, is a
 * violation; test:fact-places counts them by court, and the known ones are frozen in factPlacesKnown.json, which may
 * only shrink. Pure data. States no law. No model.
 */
import type { CaseFact } from "./factsOfQuestion";

/**
 * Facts the case file holds outside its slots, each with the one reader every place reads it through (in caseFile.ts). A
 * case-file gate on one of these is real; on any other fact outside SLOT_FACTS it is not (test:fact-places).
 */
export const HELD_BY_READER: Readonly<Partial<Record<CaseFact, string>>> = {
  // The parties in the case file (written only by the Parties step).
  yourName: "heldYourName",
  // The home page's city and province (the story section's location).
  municipality: "heldLocation",
  // The papers filed (the case file's documents list).
  filedDocuments: "heldDocuments",
  // Where the other person lives (the Family status questions).
  otherPartyMunicipality: "heldOtherPartyCity",
  // Where the children live now (the Family form, the review).
  livingSituation: "heldLivingSituation",
};

export type PlaceCourt = "small-claims" | "civil" | "family";
export const ALL_COURTS: readonly PlaceCourt[] = ["small-claims", "civil", "family"];
export type PlaceKind = "ask" | "offer" | "confirm";
export type PlaceGate = { by: "case-file" } | { by: "answers" } | { by: "first" } | { by: "own-copy"; copy: string } | { by: "none" };

export type FactAtPlace = {
  fact: CaseFact;
  kind: PlaceKind;
  courts: readonly PlaceCourt[];
  gate: PlaceGate;
  /** The question ids that show it here, when it is asked by id. */
  ids?: readonly string[];
  /** For a person reading the table: what it looks like. */
  shows?: string;
};

export type Place = {
  id: string;
  /** The place, in plain words. */
  name: string;
  at: string;
  /** A decider test:fact-places can call with a held file ("home", "chat", "sc-guided", "review", "triage", "step"). */
  probe?: "home" | "chat" | "sc-guided" | "review" | "triage" | "step";
  facts: readonly FactAtPlace[];
  /** Question ids that are a fact of their own (factsOfQuestion gives the id back), asked only here. */
  ownIds?: readonly string[];
};

const SC: readonly PlaceCourt[] = ["small-claims"];
const CV: readonly PlaceCourt[] = ["civil"];
const FA: readonly PlaceCourt[] = ["family"];
const CVFA: readonly PlaceCourt[] = ["civil", "family"];
const ALL = ALL_COURTS;
const FILE: PlaceGate = { by: "case-file" };
const NONE: PlaceGate = { by: "none" };
const FIRST: PlaceGate = { by: "first" };
const copy = (what: string): PlaceGate => ({ by: "own-copy", copy: what });

export const FACT_PLACES: readonly Place[] = [
  {
    id: "home-start",
    name: "Home page: where you live, and your story",
    at: "app/_components/HomeLocationGate.tsx",
    facts: [
      { fact: "municipality", kind: "ask", courts: ALL, gate: FIRST, shows: "Your city or town" },
      { fact: "story", kind: "ask", courts: ALL, gate: FIRST, shows: "Tell us what happened" },
    ],
  },
  {
    id: "home-card",
    name: "Home page: what we understood, and its questions",
    at: "app/_components/CaseUnderstandingCard.tsx",
    probe: "home",
    facts: [
      { fact: "amount", kind: "ask", courts: ["small-claims", "civil"], gate: FILE, ids: ["sc-amount-claimed", "amountClaimed"] },
      { fact: "whenHappened", kind: "ask", courts: SC, gate: FILE, ids: ["sc-orient-when-happened"] },
      { fact: "wants", kind: "ask", courts: ALL, gate: FILE, ids: ["sc-remedy-sought", "legalRemedy", "goal"], shows: "the end-goal question" },
      { fact: "defendantsClaim", kind: "ask", courts: SC, gate: FILE, ids: ["sc-defendant-counterclaim"] },
      { fact: "outcome", kind: "ask", courts: SC, gate: FILE, ids: ["sc-defendant-counterclaim"] },
      { fact: "urgent", kind: "ask", courts: CV, gate: FILE, ids: ["urgent"] },
      { fact: "children", kind: "ask", courts: FA, gate: FILE, ids: ["childrenInfo"], shows: "the children question (how many, how old, where they live)" },
      { fact: "court", kind: "offer", courts: ALL, gate: FILE, shows: "Where this seems to belong" },
    ],
  },
  {
    id: "home-other-party",
    name: "Home page: the other side's name from the reading, kept on Continue",
    at: "app/_components/HomeLocationGate.tsx",
    facts: [{ fact: "otherParty", kind: "offer", courts: ALL, gate: FILE }],
  },
  {
    id: "home-court-suggestion",
    name: "Home page: \"This looks like it may be X, not Y\"",
    at: "app/_components/HomeLocationGate.tsx",
    facts: [{ fact: "court", kind: "offer", courts: ALL, gate: FILE }],
  },
  {
    id: "situation",
    name: "Where things stand: the first questions after the home page (a fact the case file holds from another place is not asked: situationHeld.ts)",
    at: "app/_components/SituationQuestions.tsx",
    facts: [
      { fact: "situation", kind: "ask", courts: ALL, gate: FIRST },
      { fact: "side", kind: "ask", courts: ALL, gate: FILE },
      { fact: "papers", kind: "ask", courts: ALL, gate: FILE },
      { fact: "servedDate", kind: "ask", courts: ALL, gate: FILE },
      { fact: "filed", kind: "ask", courts: ALL, gate: FILE },
      { fact: "court", kind: "ask", courts: ALL, gate: FILE },
      { fact: "stage", kind: "ask", courts: ALL, gate: FILE },
    ],
  },
  {
    id: "side-check",
    name: "The side line (\"You started this case\") with Change",
    at: "app/_components/IntakeRecovery.tsx",
    facts: [{ fact: "side", kind: "confirm", courts: ALL, gate: FILE }],
  },
  {
    id: "chat-civil-family",
    name: "Civil and Family chat: questions one at a time",
    at: "app/builder/_components/GuidedFormChat.tsx",
    probe: "chat",
    facts: [
      { fact: "story", kind: "ask", courts: CVFA, gate: FILE, ids: ["facts"] },
      { fact: "side", kind: "ask", courts: CVFA, gate: FILE, ids: ["yourRole"] },
      { fact: "married", kind: "ask", courts: FA, gate: FILE, ids: ["married"] },
      { fact: "claimKind", kind: "ask", courts: CVFA, gate: FILE, ids: ["issues"] },
      { fact: "filedDocuments", kind: "ask", courts: CVFA, gate: FILE, ids: ["documents", "filedDocuments"] },
      { fact: "children", kind: "ask", courts: FA, gate: FILE, ids: ["childrenInfo"] },
      { fact: "servedDate", kind: "ask", courts: CVFA, gate: FILE, ids: ["servedDate", "serviceDetails"] },
      { fact: "serviceMethod", kind: "ask", courts: CV, gate: FILE, ids: ["serviceDetails"] },
      { fact: "courtDate", kind: "ask", courts: FA, gate: FILE, ids: ["upcomingCourtDate"] },
      { fact: "conferenceDate", kind: "ask", courts: FA, gate: FILE, ids: ["upcomingCourtDate"] },
      { fact: "amount", kind: "ask", courts: CV, gate: FILE, ids: ["amountClaimed"] },
      { fact: "courtFileNumber", kind: "ask", courts: CV, gate: copy("the chat's form values"), ids: ["courtFileNumber"] },
      { fact: "wants", kind: "ask", courts: CVFA, gate: FILE, ids: ["goal", "legalRemedy"] },
      { fact: "otherParty", kind: "ask", courts: CVFA, gate: FILE, ids: ["otherParty"] },
      { fact: "urgent", kind: "ask", courts: CVFA, gate: FILE, ids: ["urgent"] },
    ],
  },
  {
    id: "chat-story-offer",
    name: "Civil and Family chat: a value read from the story, offered with Is that right?",
    at: "app/builder/_components/GuidedFormChat.tsx",
    facts: [
      { fact: "children", kind: "offer", courts: FA, gate: FILE },
      { fact: "servedDate", kind: "offer", courts: CVFA, gate: FILE },
      { fact: "amount", kind: "offer", courts: CV, gate: FILE },
      { fact: "wants", kind: "offer", courts: CVFA, gate: FILE },
      { fact: "otherParty", kind: "offer", courts: CVFA, gate: FILE },
      { fact: "filedDocuments", kind: "offer", courts: CVFA, gate: FILE },
    ],
  },
  {
    id: "sc-guided",
    name: "Small Claims chat: questions one at a time",
    at: "app/builder/_components/GuidedSmallClaimsIntake.tsx",
    probe: "sc-guided",
    facts: [
      { fact: "whenHappened", kind: "ask", courts: SC, gate: FILE, ids: ["sc-orient-when-happened", "sc-date-injury"] },
      { fact: "side", kind: "ask", courts: SC, gate: FILE, ids: ["sc-orient-role"] },
      { fact: "claimKind", kind: "ask", courts: SC, gate: FILE, ids: ["sc-orient-dispute-category"] },
      { fact: "amount", kind: "ask", courts: SC, gate: FILE, ids: ["sc-amount-claimed"] },
      { fact: "filed", kind: "ask", courts: SC, gate: FILE, ids: ["sc-claim-filed"] },
      { fact: "defenceFiled", kind: "ask", courts: SC, gate: FILE, ids: ["sc-defence-filed", "sc-defendant-defence-filed"] },
      { fact: "servedDate", kind: "ask", courts: SC, gate: FILE, ids: ["sc-defendant-claim-received", "sc-defendant-service-method", "sc-date-claim-served"] },
      { fact: "papers", kind: "ask", courts: SC, gate: FILE, ids: ["sc-defendant-claim-received"] },
      { fact: "serviceMethod", kind: "ask", courts: SC, gate: FILE, ids: ["sc-defendant-service-method"] },
      { fact: "wants", kind: "ask", courts: SC, gate: FILE, ids: ["sc-remedy-sought"] },
      { fact: "safety", kind: "ask", courts: SC, gate: FILE, ids: ["sc-safety-check"] },
      { fact: "outcome", kind: "ask", courts: SC, gate: FILE, ids: ["sc-defendant-outcome", "sc-defendant-counterclaim"] },
      { fact: "defendantsClaim", kind: "ask", courts: SC, gate: FILE, ids: ["sc-defendant-outcome", "sc-defendant-counterclaim"] },
      { fact: "conferenceDate", kind: "ask", courts: SC, gate: FILE, ids: ["sc-date-settlement-conference"] },
      { fact: "claimServed", kind: "ask", courts: SC, gate: copy("the chat's own answered list"), ids: ["sc-defendant-served"] },
      { fact: "evidence", kind: "ask", courts: SC, gate: FILE, ids: ["sc-evidence-available", "sc-defendant-response-evidence"] },
      { fact: "publication", kind: "ask", courts: SC, gate: copy("the chat's own answered list"), ids: ["sc-defamation-publication-details"] },
      { fact: "twentyDaysPassed", kind: "ask", courts: SC, gate: copy("the chat's own answered list"), ids: ["sc-defence-time-elapsed"] },
      { fact: "notedInDefault", kind: "ask", courts: SC, gate: copy("the chat's own answered list"), ids: ["sc-defendant-noted-in-default"] },
      { fact: "responseFacts", kind: "ask", courts: SC, gate: copy("the chat's own answered list"), ids: ["sc-defendant-response-facts"] },
      { fact: "admission", kind: "ask", courts: SC, gate: copy("the chat's own answered list"), ids: ["sc-defendant-admission-payment"] },
      { fact: "completionDate", kind: "ask", courts: SC, gate: copy("the chat's own answered list"), ids: ["sc-contractor-completion-date"] },
      { fact: "noticeToContractor", kind: "ask", courts: SC, gate: copy("the chat's own answered list"), ids: ["sc-contractor-notice-before-replacement"] },
      { fact: "claimIssuedDate", kind: "ask", courts: SC, gate: { by: "answers" }, ids: ["sc-date-claim-issued"] },
      { fact: "defenceFiledDate", kind: "ask", courts: SC, gate: { by: "answers" }, ids: ["sc-date-defence-filed"] },
    ],
  },
  {
    id: "sc-understood",
    name: "Small Claims chat: \"Here's what I understood\" (values the AI read)",
    at: "app/builder/_components/GuidedSmallClaimsIntake.tsx",
    facts: [
      { fact: "amount", kind: "offer", courts: SC, gate: FILE },
      { fact: "whenHappened", kind: "offer", courts: SC, gate: FILE },
      { fact: "wants", kind: "offer", courts: SC, gate: FILE },
      { fact: "side", kind: "offer", courts: SC, gate: FILE },
    ],
  },
  {
    id: "sc-claim-type",
    name: "Small Claims chat: the kind of claim it seems to be",
    at: "app/builder/_components/GuidedSmallClaimsIntake.tsx",
    facts: [{ fact: "claimKind", kind: "offer", courts: SC, gate: FILE }],
  },
  {
    id: "sc-form",
    name: "Small Claims whole form (all the questions on one page)",
    at: "app/builder/_components/SmallClaimsIntake.tsx",
    facts: [
      { fact: "stage", kind: "confirm", courts: SC, gate: FILE },
      { fact: "side", kind: "confirm", courts: SC, gate: FILE },
      { fact: "otherParty", kind: "confirm", courts: SC, gate: FILE },
      { fact: "whenHappened", kind: "confirm", courts: SC, gate: FILE },
      { fact: "wants", kind: "confirm", courts: SC, gate: FILE },
      { fact: "amount", kind: "confirm", courts: SC, gate: FILE },
      { fact: "urgent", kind: "confirm", courts: SC, gate: FILE },
      { fact: "evidence", kind: "ask", courts: SC, gate: FILE },
      { fact: "missingEvidence", kind: "ask", courts: SC, gate: FIRST },
      { fact: "serviceMethod", kind: "ask", courts: SC, gate: FILE },
    ],
  },
  {
    id: "sc-form-found",
    name: "Small Claims whole form: \"Found in your description\"",
    at: "app/builder/_components/SmallClaimsIntake.tsx",
    facts: [
      { fact: "amount", kind: "offer", courts: SC, gate: FILE },
      { fact: "whenHappened", kind: "offer", courts: SC, gate: FILE },
      { fact: "evidence", kind: "offer", courts: SC, gate: FILE },
      { fact: "wants", kind: "offer", courts: SC, gate: FILE },
      { fact: "otherParty", kind: "offer", courts: SC, gate: FILE },
      { fact: "yourName", kind: "offer", courts: SC, gate: FILE },
    ],
  },
  {
    id: "family-form",
    name: "Family whole form",
    at: "app/builder/_components/FamilyIntake.tsx",
    facts: [
      { fact: "yourName", kind: "ask", courts: FA, gate: FILE, shows: "Your name (a name the parties hold is shown with Change: heldYourName)" },
      { fact: "otherParty", kind: "confirm", courts: FA, gate: FILE },
      { fact: "children", kind: "confirm", courts: FA, gate: FILE },
      { fact: "whenHappened", kind: "confirm", courts: FA, gate: FILE },
      { fact: "wants", kind: "confirm", courts: FA, gate: FILE },
      { fact: "urgent", kind: "confirm", courts: FA, gate: FILE },
      { fact: "municipality", kind: "confirm", courts: ["family", "small-claims"], gate: FILE, shows: "Location confirmed on Home" },
    ],
  },
  {
    id: "family-triage",
    name: "Family: the status questions (married, children, where you each live)",
    at: "app/builder/_components/FamilyStatusTriage.tsx",
    probe: "triage",
    facts: [
      { fact: "married", kind: "ask", courts: FA, gate: FILE, ids: ["married-to-other-party"] },
      { fact: "children", kind: "ask", courts: FA, gate: FILE, ids: ["child-together", "case-involves-children"] },
      { fact: "divorceSought", kind: "ask", courts: FA, gate: FIRST, ids: ["divorce-sought"] },
      { fact: "cohabitation", kind: "ask", courts: FA, gate: FIRST, ids: ["cohabitation-dates"] },
      { fact: "municipality", kind: "ask", courts: FA, gate: FILE, ids: ["municipalities"] },
      { fact: "otherPartyMunicipality", kind: "ask", courts: FA, gate: FIRST, ids: ["other-party-municipality"] },
    ],
  },
  {
    id: "review",
    name: "Review: \"Here is what we have\" and its remaining questions",
    at: "app/_components/IntakeReviewPanel.tsx",
    probe: "review",
    facts: [
      { fact: "side", kind: "ask", courts: ALL, gate: FILE },
      { fact: "claimKind", kind: "ask", courts: ALL, gate: FILE },
      { fact: "amount", kind: "ask", courts: ["small-claims", "civil"], gate: FILE },
      { fact: "wants", kind: "ask", courts: ALL, gate: FILE },
      { fact: "whenHappened", kind: "ask", courts: ALL, gate: FILE },
      { fact: "otherParty", kind: "ask", courts: ALL, gate: FILE },
      { fact: "children", kind: "ask", courts: FA, gate: FILE },
      { fact: "filed", kind: "ask", courts: ALL, gate: FILE },
      { fact: "defenceFiled", kind: "ask", courts: ["small-claims", "civil"], gate: FILE },
      { fact: "defendantsClaim", kind: "ask", courts: SC, gate: FILE },
      { fact: "servedDate", kind: "confirm", courts: FA, gate: FILE, shows: "Day you were served" },
      { fact: "municipality", kind: "confirm", courts: ALL, gate: FILE, shows: "City" },
      { fact: "livingSituation", kind: "confirm", courts: FA, gate: FILE, shows: "the answer given elsewhere, held in the box with Change (answeredElsewhere)" },
    ],
  },
  {
    id: "parties",
    name: "Parties step: names and addresses (review, Small Claims form, statement of claim)",
    at: "app/_components/PartiesStep.tsx",
    facts: [
      { fact: "otherParty", kind: "offer", courts: ALL, gate: FILE, shows: "the other side's name read from the story, when no other place holds it (a name the person gave is held: withHeldOtherName)" },
      { fact: "otherParty", kind: "confirm", courts: ALL, gate: FILE, shows: "the first and last name, split from the whole name already given, filled in with Change (withNameParts)" },
      { fact: "yourName", kind: "ask", courts: ALL, gate: FILE, shows: "Your first and last name (the parties in the case file are the one place it is kept: heldYourName)" },
      { fact: "municipality", kind: "confirm", courts: ALL, gate: FILE, shows: "your own city and province, held from the home page, with Change" },
    ],
  },
  {
    id: "results-overview",
    name: "AI summary page: what to confirm next",
    at: "app/builder/_components/IntelligenceOverviewPanel.tsx",
    facts: [
      { fact: "defenceFiled", kind: "ask", courts: ["small-claims", "civil"], gate: FILE, shows: "Has the defendant filed a Defence?" },
      { fact: "adoption", kind: "ask", courts: FA, gate: FIRST },
      { fact: "claimKind", kind: "offer", courts: SC, gate: FILE },
      // The AI's own questions (groundedCognition: each carries its fact), in words only: never asked once the fact is held
      // or the story says it (factStatus.ts mayAskWords, wordsOnly with the one story reader's reading).
      { fact: "agreementTerms", kind: "ask", courts: ALL, gate: FILE, shows: "What are the specific terms of the contract with the contractor?" },
    ],
  },
  {
    id: "sc-depth",
    name: "Small Claims chat: the questions for this kind of claim (and the story's answers to them, offered)",
    at: "app/builder/_components/GuidedSmallClaimsIntake.tsx",
    probe: "sc-guided",
    facts: [
      { fact: "agreementTerms", kind: "ask", courts: SC, gate: FILE, ids: ["depth-contractor-agreement", "depth-services-agreement", "depth-goods-contract-agreement", "depth-goods-agreement", "depth-commercial-terms", "depth-debt-agreement", "depth-loan-agreement"] },
      { fact: "agreementTerms", kind: "offer", courts: SC, gate: FILE, shows: "Your story already answers some of them: please check these" },
    ],
  },
  {
    id: "stage-confirmation",
    name: "AI summary page and case page: where your case is (confirm the stage)",
    at: "app/builder/page.tsx",
    facts: [{ fact: "stage", kind: "ask", courts: ALL, gate: FILE }],
  },
  {
    id: "step",
    name: "Next-step page: where is your case, its dates, and how papers were served",
    at: "app/builder/_components/StageAnswerPanel.tsx",
    probe: "step",
    facts: [
      { fact: "stage", kind: "ask", courts: ALL, gate: FILE, shows: "Where is your case?" },
      { fact: "whenHappened", kind: "ask", courts: ALL, gate: FILE, ids: ["sc-date-injury"] },
      { fact: "servedDate", kind: "ask", courts: ALL, gate: FILE, ids: ["sc-date-claim-served"] },
      { fact: "conferenceDate", kind: "ask", courts: ALL, gate: FILE, ids: ["sc-date-settlement-conference"] },
      { fact: "claimIssuedDate", kind: "ask", courts: ALL, gate: { by: "answers" }, ids: ["sc-date-claim-issued"] },
      { fact: "defenceFiledDate", kind: "ask", courts: ALL, gate: { by: "answers" }, ids: ["sc-date-defence-filed"] },
      { fact: "serviceMethod", kind: "ask", courts: ALL, gate: FILE, shows: "How were the papers served? (a method held elsewhere is this page's chosen method: heldServiceWords)" },
    ],
    ownIds: ["sc-date-defendants-claim-served", "sc-date-learned-of-default", "sc-date-learned-of-judgment"],
  },
  {
    id: "case-page",
    name: "Case page: \"What we have so far\"",
    at: "app/cases/_components/CaseFilePanel.tsx",
    facts: [
      { fact: "side", kind: "confirm", courts: ALL, gate: FILE },
      { fact: "amount", kind: "confirm", courts: ALL, gate: FILE },
      { fact: "otherParty", kind: "confirm", courts: ALL, gate: FILE },
      { fact: "wants", kind: "confirm", courts: ALL, gate: FILE },
      { fact: "children", kind: "confirm", courts: FA, gate: FILE },
      { fact: "whenHappened", kind: "confirm", courts: ALL, gate: FILE },
      { fact: "marriedWhere", kind: "confirm", courts: FA, gate: FILE },
    ],
  },
  {
    id: "statement-of-claim",
    name: "Statement of claim card: what you are asking the court for",
    at: "app/builder/_components/StatementOfClaimSurface.tsx",
    facts: [{ fact: "wants", kind: "ask", courts: SC, gate: FILE }],
  },
  {
    id: "court-chat",
    name: "Court chat (the assistant in each court)",
    at: "src/lib/case-system/guided-assistant/conversationIntelligenceEngine.ts",
    facts: [
      { fact: "whenHappened", kind: "ask", courts: ALL, gate: FILE },
      { fact: "filed", kind: "ask", courts: ALL, gate: FILE },
      { fact: "wants", kind: "ask", courts: ALL, gate: FILE },
      { fact: "otherParty", kind: "ask", courts: ALL, gate: FILE },
      { fact: "courtDate", kind: "ask", courts: ALL, gate: FILE },
      { fact: "amount", kind: "ask", courts: ALL, gate: FILE },
      { fact: "evidence", kind: "ask", courts: ALL, gate: FILE, shows: "What proof do you have?" },
      { fact: "municipality", kind: "ask", courts: ALL, gate: FILE },
    ],
  },
  {
    id: "child-support",
    name: "Family child support builder",
    at: "app/builder/_components/ChildSupportIntake.tsx",
    facts: [
      { fact: "yourName", kind: "ask", courts: FA, gate: FILE },
      { fact: "otherParty", kind: "ask", courts: FA, gate: FILE },
      { fact: "otherPartyMunicipality", kind: "ask", courts: FA, gate: FILE },
      { fact: "children", kind: "ask", courts: FA, gate: FILE },
      { fact: "livingSituation", kind: "ask", courts: FA, gate: FILE },
    ],
  },
  {
    id: "forms",
    name: "Forms page: which forms apply",
    at: "app/forms/FormsWorkspace.tsx",
    facts: [
      { fact: "defendantsClaim", kind: "offer", courts: ["small-claims"], gate: FILE },
      { fact: "side", kind: "confirm", courts: ALL, gate: FILE, shows: "kept from the case, with Change (firm); only the site's own suggested step is offered" },
      { fact: "stage", kind: "confirm", courts: ALL, gate: FILE, shows: "kept from the case, with Change (firm); only the site's own suggested step is offered" },
      { fact: "married", kind: "confirm", courts: FA, gate: FILE, shows: "kept from the case, with Change (firm)" },
    ],
  },
];
