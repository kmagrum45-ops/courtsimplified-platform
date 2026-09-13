/**
 * The eight live stories for runLiveStoryBatch.ts.
 *
 * Separated from the harness so the stories can be read and reviewed on their
 * own — they are the actual test inputs, and what they say matters more than
 * how the runner walks them.
 *
 * Every story is written the way a real person would write it: no legal
 * vocabulary unless the person would naturally use it, inconsistent
 * capitalisation where that is realistic, and no attempt to hit the matcher's
 * signal phrases.
 */

import type { SlotValues } from "../../src/lib/case-system/intake/depth/slots";

export type LiveStory = {
  id: string;
  note: string;
  story: string;
  answers: Record<string, string>;
  slotValues: SlotValues;
  depthAnswers: Record<string, string>;
  fallbackDepthAnswer: string;
  location: { province: "Ontario"; city: string };
  /** What the batch design expects, so a divergence is visible rather than assumed correct. */
  expectedClaimTypeId?: string;
};

/** Plaintiff-side defaults for the questions every story reaches. */
const BASE: Record<string, string> = {
  "sc-orient-when-happened": "About two months ago.",
  "sc-orient-role": "Starting a claim (plaintiff)",
  "sc-orient-dispute-category": "Starting a Small Claims case",
  "sc-claim-filed": "No, I have not filed anything yet.",
  "sc-defendant-served": "Not applicable.",
  "sc-defence-filed": "Not applicable.",
  "sc-defence-time-elapsed": "Not applicable.",
  "sc-defendant-noted-in-default": "Not applicable.",
  "sc-contractor-completion-date": "Not applicable.",
  "sc-contractor-notice-before-replacement": "Not applicable.",
  "sc-safety-check": "No safety concerns.",
  "sc-service-details": "Nothing has been served yet.",
  "sc-defamation-publication-details": "Not applicable.",
  "sc-defendant-claim-received": "Not applicable.",
  "sc-defendant-response-facts": "Not applicable.",
  "sc-defendant-response-evidence": "Not applicable.",
  "sc-defendant-outcome": "Not applicable.",
  "sc-defendant-service-method": "Not applicable.",
  "sc-defendant-counterclaim": "Not applicable.",
  "sc-defendant-admission-payment": "Not applicable.",
};

/** A user who cannot answer anything. Property 4's hardest live case. */
const DONT_KNOW: Record<string, string> = {
  ...BASE,
  "sc-orient-when-happened": "I am not sure exactly when.",
  "sc-amount-claimed": "I don't know what it would come to.",
  "sc-evidence-available": "I don't have anything really.",
  "sc-remedy-sought": "I don't know what I can even ask for.",
};

export const STORIES: LiveStory[] = [
  // 1
  {
    id: "L1-personal-loan",
    note:
      "Personal loan between individuals — never run end to end. Exercises the two authored loan depth questions, which have never fired, and checks the unshadowing fix (71adaa9) routes it here rather than to debt/services.",
    story:
      "My younger sister asked me for help in March when she was behind on her car payments. I moved " +
      "her two thousand eight hundred dollars from my account to hers. She said she would give it back " +
      "when her tax return came in. Her tax return came in April. She bought a holiday with it. Every " +
      "time I raise it now she tells me I am being unfair and changes the subject.",
    answers: {
      ...BASE,
      "sc-amount-claimed": "$2,800.",
      "sc-evidence-available": "The bank transfer, and a text where she says she will give it back after her return.",
      "sc-remedy-sought": "I just want the money back.",
    },
    slotValues: { defendantLabel: "my sister", amountLabel: "the $2,800" },
    depthAnswers: {
      "depth-loan-agreement": "She said she would give it back when her tax return came in. It was over text.",
      "depth-loan-unpaid": "None of it has come back.",
    },
    fallbackDepthAnswer: "I am not certain about that.",
    location: { province: "Ontario", city: "Toronto" },
    expectedClaimTypeId: "sc-claim-personal-loan-between-individuals",
  },

  // 2
  {
    id: "L2-goods-damaged",
    note:
      "Breach of contract for goods — ZERO authored depth questions. Tests the degrade-to-attestation path live: all elements should come back unauthored, and no bad question should be generated.",
    story:
      "I ordered a sofa from a furniture shop in the spring. When it turned up the frame was cracked " +
      "on one side and the fabric was torn along the back. I rang them the same afternoon and sent " +
      "photos. They said they would sort a replacement out. That was in May. Nothing has arrived and " +
      "they have stopped taking my calls.",
    answers: {
      ...BASE,
      "sc-amount-claimed": "$1,950, which is what I paid.",
      "sc-evidence-available": "Photos I took the day it arrived, and the order confirmation.",
      "sc-remedy-sought": "Either the sofa replaced or my money back.",
    },
    slotValues: { defendantLabel: "the furniture shop", amountLabel: "the $1,950" },
    depthAnswers: {},
    fallbackDepthAnswer: "I am not certain about that.",
    location: { province: "Ontario", city: "Ottawa" },
    expectedClaimTypeId: "sc-claim-breach-of-contract-goods",
  },

  // 3
  {
    id: "L3-vague",
    note:
      "Deliberately vague. Tests whether the classifier declines rather than guessing, and whether the site asserts anything it cannot support when it has almost nothing to work with.",
    story:
      "I paid a company for something a while back and it did not work out the way I expected and now " +
      "I am out of pocket. I have tried to sort it with them and got nowhere.",
    answers: {
      ...BASE,
      "sc-amount-claimed": "Somewhere around a thousand dollars I think.",
      "sc-evidence-available": "Not much, some emails maybe.",
      "sc-remedy-sought": "I want my money back.",
    },
    slotValues: {},
    depthAnswers: {},
    fallbackDepthAnswer: "I am not certain about that.",
    location: { province: "Ontario", city: "Hamilton" },
  },

  // 4
  {
    id: "L4-spans-two",
    note:
      "Spans two plausible claim types — contractor damage AND abandoning the job (breach of contract for services). Tests suggest-never-decide under genuine ambiguity: does confirmation present a choice, or railroad one reading?",
    story:
      "I hired a man to put new flooring through the downstairs. He pulled up the old floor, scratched " +
      "the hallway radiator badly getting it out, and then only laid about half the new boards before " +
      "he stopped turning up. I have paid him most of it already. So I have got a half finished floor " +
      "and a radiator that needs replacing.",
    answers: {
      ...BASE,
      "sc-contractor-completion-date": "He never finished — he stopped coming in June.",
      "sc-amount-claimed": "About $5,400 between finishing the floor and the radiator.",
      "sc-evidence-available": "Photos of the floor and the radiator, and the payments I made to him.",
      "sc-remedy-sought": "What it costs me to finish the job and fix the radiator.",
    },
    slotValues: { defendantLabel: "the floor fitter", amountLabel: "the $5,400" },
    depthAnswers: {
      "depth-contractor-agreement": "We agreed a price for the whole downstairs. He wrote it on the back of a card.",
      "depth-contractor-damage": "The hallway radiator is gouged along the bottom, and half the floor is still bare.",
      "depth-contractor-loss": "It is two quotes — one to finish the floor, one for the radiator.",
    },
    fallbackDepthAnswer: "I am not certain about that.",
    location: { province: "Ontario", city: "London" },
  },

  // 5 — RUN FIRST
  {
    id: "L5-cannot-answer",
    note:
      "The user cannot answer almost anything. Property 4 end to end: every element should resolve to cannot-provide, and the readiness gate must still OPEN so a draft stays reachable. The most important story in the batch.",
    story:
      "my neighbours dog got out and bit my leg when i was walking past. i went to the walk in clinic " +
      "after. i dont really know what to do about it",
    answers: {
      ...DONT_KNOW,
      "sc-safety-check": "No, nothing like that.",
    },
    slotValues: {},
    depthAnswers: {},
    fallbackDepthAnswer: "I don't know.",
    location: { province: "Ontario", city: "Windsor" },
    expectedClaimTypeId: "sc-claim-dog-bite-animal-injury",
  },

  // 6
  {
    id: "L6-very-short",
    note:
      "One sentence. Worst case for turn-1-only classification (619a9e4): if a short opener cannot classify, nothing later rescues it, because the classifier no longer runs on answers.",
    story: "someone gave me a cheque for 900 and it bounced",
    answers: {
      ...BASE,
      "sc-amount-claimed": "$900.",
      "sc-evidence-available": "The cheque and the letter from my bank.",
      "sc-remedy-sought": "The $900.",
    },
    slotValues: { amountLabel: "the $900" },
    depthAnswers: {},
    fallbackDepthAnswer: "I am not certain about that.",
    location: { province: "Ontario", city: "Kingston" },
    expectedClaimTypeId: "sc-claim-dishonoured-nsf-cheque",
  },

  // 7
  {
    id: "L7-vacation-pay",
    note:
      "Employment claim type — unexercised category, and no authored depth questions. Tests a pipeline built mostly on debt and contract against something structurally different.",
    story:
      "I left my job at the end of April after four years. I had holiday built up that I never took, " +
      "about three weeks worth. My final pay came through with none of it in. I emailed the office " +
      "twice and the second time they said it had all been dealt with, which it has not.",
    answers: {
      ...BASE,
      "sc-amount-claimed": "Roughly $3,100 for the holiday I did not take.",
      "sc-evidence-available": "My final payslip, my contract, and the emails to the office.",
      "sc-remedy-sought": "The holiday pay I am owed.",
    },
    slotValues: { defendantLabel: "my old employer", amountLabel: "the $3,100" },
    depthAnswers: {},
    fallbackDepthAnswer: "I am not certain about that.",
    location: { province: "Ontario", city: "Mississauga" },
    expectedClaimTypeId: "sc-claim-unpaid-overtime-vacation-pay",
  },

  // 8
  {
    id: "L8-towing",
    note:
      "Smallest claim type in the catalogue (2 elements). Tests the gate and the attestation path on a minimal element set, where an off-by-one in the gate would be most visible.",
    story:
      "I parked behind the plaza where I always park when I visit my mum and when I came back the car " +
      "was gone. There was no sign up that I could see. I had to pay four hundred and sixty to get it " +
      "released from the yard the next morning, plus a day of storage on top.",
    answers: {
      ...BASE,
      "sc-amount-claimed": "$460 plus the storage, so about $540.",
      "sc-evidence-available": "The receipt from the tow yard and photos of where I parked.",
      "sc-remedy-sought": "What it cost me to get the car back.",
    },
    slotValues: { defendantLabel: "the towing company", amountLabel: "the $540" },
    depthAnswers: {},
    fallbackDepthAnswer: "I am not certain about that.",
    location: { province: "Ontario", city: "Brampton" },
    expectedClaimTypeId: "sc-claim-improper-unauthorized-towing",
  },
];
