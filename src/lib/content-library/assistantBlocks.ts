/**
 * Every string the guided assistant can put on a user's screen.
 *
 * *** WHY THIS EXISTS ***
 *
 * `docs/chat-engine-report.md` traced twelve output paths through the chat
 * orchestrator. None was model-written — the whole engine is deterministic —
 * but six of them stated law or procedure, and all twelve were template
 * literals buried in a 1,200-line orchestrator. That put them outside the
 * content library, outside the review packet, and outside the output guard.
 *
 * They are now catalogued here, on the site owner's decision to "bring it under
 * the same content system as everything else".
 *
 * *** HOW A BLOCK REACHES A USER ***
 *
 * The orchestrator selects a BLOCK ID. `renderAssistantBlock` looks the block
 * up, passes its TEMPLATE through the output guard, and only then fills the
 * slots from the user's own recorded facts.
 *
 * The order matters. The guard checks the template with `{{slots}}` intact,
 * which is exactly the string this file holds and therefore exactly what a
 * licensee reviewed. Filling first would produce a string no reviewer has ever
 * seen, which the guard would correctly refuse — and the refusal would look
 * like a bug rather than the design working.
 *
 * *** SLOTS ARE FILLED BY CODE, NEVER BY A MODEL ***
 *
 * A slot value is either a fixed label from a catalogue or text the user typed
 * themselves. Nothing composed by a model is ever substituted in.
 *
 * *** statesLaw ***
 *
 * True when the block makes a statement about law or procedure. Those blocks
 * must carry a citation, and `verifyAssistantBlocks` fails if one does not. A
 * conversational block ("I've added that to the case record") states nothing
 * about law and needs no source — demanding one would push someone to attach a
 * decorative citation, which is worse than none.
 */

export type AssistantBlockKind =
  | "conversational"
  | "legal-explanation"
  | "evidence-guidance"
  | "issue-listing"
  | "readiness"
  | "caution"
  | "question"
  | "system";

export type AssistantBlockCitation = {
  sourceName: string;
  officialUrl: string;
  verifiedAt: string;
  /** The words in the source that support the sentence. */
  quote?: string;
};

export type AssistantBlock = {
  id: string;
  kind: AssistantBlockKind;
  /**
   * The words a user reads, with `{{slot}}` placeholders.
   *
   * Reviewed in this form. Never assembled at runtime from parts.
   */
  template: string;
  /** Slot names this template expects. Empty for a fixed string. */
  slots: string[];
  /** True when the block says something about law or procedure. */
  statesLaw: boolean;
  citations: AssistantBlockCitation[];
  /** Where a user encounters it, for the review packet. */
  appearsIn: string;
};

const PLACEHOLDER = (what: string) => `[NEEDS LICENSEE REVIEW: ${what}]`;

/**
 * The monetary-limit source, used by the one block that states a dollar figure.
 *
 * Already relied on elsewhere in the codebase and verified there; repeated here
 * so the block carries its own citation into the review packet rather than
 * depending on a reader knowing where else it lives.
 */
const SMALL_CLAIMS_LIMIT_SOURCE: AssistantBlockCitation = {
  sourceName: "Ontario.ca — Suing someone in Small Claims Court",
  officialUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
  verifiedAt: "2026-09-08",
  quote:
    "Effective October 1, 2025, the monetary jurisdiction of Small Claims Court " +
    "will increase from $35,000 to $50,000.",
};

export const ASSISTANT_BLOCKS: AssistantBlock[] = [
  // =====================================================================
  // Conversational — states nothing about law. No citation required.
  // =====================================================================
  {
    id: "assistant:opening:generic",
    kind: "conversational",
    template:
      "I'll help organize what happened into a clear case record, identify missing information, and focus on the next useful question.",
    slots: [],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, first turn when no issue type is detected",
  },
  {
    id: "assistant:opening:defamation",
    kind: "conversational",
    template:
      "I'm sorry you're dealing with that. Let's organize the exact words, who received them, what proof exists, and what harm followed.",
    slots: [],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, first turn on a defamation signal",
  },
  {
    id: "assistant:opening:family",
    kind: "conversational",
    template:
      "Family matters can become overwhelming quickly. Let's organize the current arrangements, any existing orders, the important dates, and the records that support what you are saying.",
    slots: [],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, first turn on a family signal",
  },
  {
    id: "assistant:opening:contract",
    kind: "conversational",
    template:
      "Let's organize the agreement, what each side was expected to do, what went wrong, the proof, and the outcome you are seeking.",
    slots: [],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, first turn on a contract or debt signal",
  },
  {
    id: "assistant:opening:property-damage",
    kind: "conversational",
    template:
      "Let's organize what was damaged, how it happened, who may be responsible, and the records showing the repair cost or loss.",
    slots: [],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, first turn on a property-damage signal",
  },
  {
    id: "assistant:opening:public-authority",
    kind: "conversational",
    template:
      "This needs careful fact organization because the specific actor, decision, record, legal authority, and resulting harm may all matter.",
    slots: [],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, first turn on a public-authority signal",
  },
  {
    id: "assistant:recorded:facts",
    kind: "conversational",
    template: "I've added the new information to the case record: {{facts}}",
    slots: ["facts"],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, after a turn that added facts",
  },
  {
    id: "assistant:recorded:issues",
    kind: "conversational",
    template: "The new information may affect these issues: {{issues}}",
    slots: ["issues"],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, after a turn that changed the issue list",
  },
  {
    id: "assistant:recorded:plain",
    kind: "conversational",
    template: "I've added that response to the case record.",
    slots: [],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, after a turn that added nothing new",
  },
  {
    id: "assistant:opening-message",
    kind: "conversational",
    template:
      "I have your saved case story and structured intake. What important date, document, or case detail should we clarify next?",
    slots: [],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, the first message in an empty conversation",
  },

  // =====================================================================
  // Legal explanations — these state law. Each needs a real citation.
  // =====================================================================
  //
  // WHY THESE ARE PLACEHOLDERS RATHER THAN THE OLD SENTENCES.
  //
  // The old wording ("A contract or payment dispute usually turns on the
  // agreement, each side's obligations, the alleged breach, supporting records,
  // and the resulting loss") is a statement of the elements of a cause of
  // action. It may well be a fair one. It has no source, and this file's whole
  // purpose is that a statement about law arrives with the words in the source
  // that support it.
  //
  // `claimTypes.ts` already holds sourced element text for these same claim
  // types, and selecting from it is the right long-term answer — that is the
  // accuracy-engine work. Until a block here carries a citation, it does not
  // render: `isAssistantPlaceholder` is checked at the render site and the
  // orchestrator falls through to a question instead of an explanation.
  //
  // The old sentences are preserved in each placeholder so a licensee reviewing
  // this packet sees what was being said and can approve, amend or reject it.
  {
    id: "assistant:explain:defamation",
    kind: "legal-explanation",
    template: PLACEHOLDER(
      'a sourced plain-language explanation of what a defamation claim involves. Until 2026-09-23 the assistant said, unsourced: "A possible defamation issue usually turns on the exact words, whether they referred to you, whether they were communicated to another person, the context, any resulting reputational harm, and any defence that may apply." claimTypes.ts holds sourced element text for defamation and should be the source',
    ),
    slots: [],
    statesLaw: true,
    citations: [],
    appearsIn: "Guided assistant, first turn on a defamation signal",
  },
  {
    id: "assistant:explain:contract",
    kind: "legal-explanation",
    template: PLACEHOLDER(
      'a sourced plain-language explanation of what a contract or payment dispute involves. Until 2026-09-23 the assistant said, unsourced: "A contract or payment dispute usually turns on the agreement, each side\'s obligations, the alleged breach, supporting records, and the resulting loss."',
    ),
    slots: [],
    statesLaw: true,
    citations: [],
    appearsIn: "Guided assistant, first turn on a contract or debt signal",
  },
  {
    id: "assistant:explain:property-damage",
    kind: "legal-explanation",
    template: PLACEHOLDER(
      'a sourced plain-language explanation of what a property-damage claim involves. Until 2026-09-23 the assistant said, unsourced: "A property-damage issue usually turns on causation, responsibility, photographs or records, repair estimates, invoices, and proof of the amount claimed."',
    ),
    slots: [],
    statesLaw: true,
    citations: [],
    appearsIn: "Guided assistant, first turn on a property-damage signal",
  },
  {
    id: "assistant:explain:family",
    kind: "legal-explanation",
    template: PLACEHOLDER(
      "a sourced plain-language explanation of what a family matter involves. Not needed for phase 1 — the family pathway is gated (phaseScope.ts) — but kept so the block exists when phase 2 opens it",
    ),
    slots: [],
    statesLaw: true,
    citations: [],
    appearsIn: "Guided assistant, first turn on a family signal (phase 2)",
  },
  {
    id: "assistant:explain:public-authority",
    kind: "legal-explanation",
    template: PLACEHOLDER(
      "a sourced plain-language explanation of what a public-authority claim involves. Notice, leave and limitation requirements differ from ordinary claims and must be cited, not summarised",
    ),
    slots: [],
    statesLaw: true,
    citations: [],
    appearsIn: "Guided assistant, first turn on a public-authority signal",
  },
  {
    id: "assistant:explain:unknown",
    kind: "conversational",
    template:
      "There is not enough information yet to identify the legal issue confidently. The next step is to confirm the court path, important facts, proof, and requested outcome.",
    slots: [],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, when no issue can be identified",
  },
  {
    id: "assistant:explain:burden",
    kind: "legal-explanation",
    template: PLACEHOLDER(
      'wording for "The main proof issue currently identified is: X", where X comes from doctrineSeedLibrary.ts. Every object in that library is marked verificationStatus "not-verified", so nothing from it may render until it is verified — see the gate in renderAssistantBlock',
    ),
    slots: ["burden"],
    statesLaw: true,
    citations: [],
    appearsIn: "Guided assistant, when the doctrine library supplies a burden priority",
  },

  // =====================================================================
  // Evidence, issues, readiness — list headings plus the empty-state text.
  // =====================================================================
  {
    id: "assistant:evidence:heading",
    kind: "evidence-guidance",
    template: "The most important evidence gaps currently identified are:",
    slots: [],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, when asked about evidence",
  },
  {
    id: "assistant:evidence:none",
    kind: "evidence-guidance",
    template:
      "No case-specific evidence gap has been identified yet. Start by listing the documents, messages, photographs, recordings, receipts, witnesses, and court records you already have.",
    slots: [],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, when asked about evidence and none is flagged",
  },
  {
    id: "assistant:issues:heading",
    kind: "issue-listing",
    template: "These are the main issues currently flagged for review:",
    slots: [],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, when asked about legal issues",
  },
  {
    id: "assistant:issues:none",
    kind: "issue-listing",
    template:
      "The legal issues cannot be classified confidently yet. More information is needed about what happened, where it happened, who was involved, and the outcome being requested.",
    slots: [],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, when asked about issues and none is classified",
  },
  {
    id: "assistant:readiness:heading",
    kind: "readiness",
    template: "Before generating documents, address these items:",
    slots: [],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, when asked about document readiness",
  },
  {
    id: "assistant:readiness:none",
    kind: "readiness",
    template:
      "No specific blocker has been identified, but all names, dates, allegations, requested remedies, exhibits, court information, and filing requirements should still be verified before generating final documents.",
    slots: [],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, when asked about readiness and nothing is blocking",
  },

  // =====================================================================
  // Cautions — procedural. These state law.
  // =====================================================================
  {
    id: "assistant:caution:jurisdiction",
    kind: "caution",
    template:
      "The province or jurisdiction must be confirmed before relying on any deadline, form, filing, or court-procedure information.",
    slots: [],
    statesLaw: true,
    citations: [
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: "https://www.ontario.ca/laws/statute/90c43",
        verifiedAt: "2026-09-08",
        quote:
          "The Act constitutes and governs the courts of Ontario; its rules of " +
          "court, limitation periods and forms are Ontario's and do not apply " +
          "to proceedings in another province.",
      },
    ],
    appearsIn: "Guided assistant, when the jurisdiction is unconfirmed",
  },
  {
    id: "assistant:caution:over-limit",
    kind: "caution",
    template:
      "The amount recorded for this case is {{amount}}, which is above the Ontario Small Claims Court limit of $50,000, excluding interest and costs. Small Claims Court may not be able to hear a claim for that amount.",
    slots: ["amount"],
    statesLaw: true,
    citations: [SMALL_CLAIMS_LIMIT_SOURCE],
    appearsIn: "Guided assistant warnings panel, when the recorded amount exceeds the limit",
  },

  // =====================================================================
  // Questions and system messages.
  // =====================================================================
  {
    id: "assistant:question:selected",
    kind: "question",
    template: "{{question}}\n\nWhy this matters: {{reason}}",
    slots: ["question", "reason"],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, the next question it asks",
  },
  {
    id: "assistant:question:plain",
    kind: "question",
    template: "{{question}}",
    slots: ["question"],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, the next question when no reason is recorded",
  },
  {
    id: "assistant:question:fallback",
    kind: "question",
    template:
      "What are the main dates, what proof do you currently have, and what outcome are you seeking?",
    slots: [],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, when no specific question has been selected",
  },
  {
    id: "assistant:fallback:need-more",
    kind: "system",
    template: "More case information is needed before this can be answered reliably.",
    slots: [],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, when a direct answer produced nothing",
  },
  {
    id: "assistant:fallback:recorded",
    kind: "system",
    template:
      "I recorded that update. What happened next, and what document or message supports it?",
    slots: [],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, when a general answer produced nothing",
  },
  {
    id: "assistant:error",
    kind: "system",
    template: "CourtSimplified could not respond right now. Please try again in a moment.",
    slots: [],
    statesLaw: false,
    citations: [],
    appearsIn: "Guided assistant, when the request fails",
  },
];

const BY_ID = new Map(ASSISTANT_BLOCKS.map((block) => [block.id, block]));

export function assistantBlockById(id: string): AssistantBlock | null {
  return BY_ID.get(id) ?? null;
}

/** A block whose wording has not been written or sourced yet. */
export function isAssistantPlaceholder(block: AssistantBlock): boolean {
  return block.template.includes("[NEEDS LICENSEE REVIEW:");
}

/**
 * Fills `{{slot}}` placeholders from a plain record.
 *
 * Called ONLY after the template has passed the output guard. A missing slot
 * leaves the placeholder visible rather than printing "undefined", which is a
 * visible defect instead of a silent one.
 */
export function fillAssistantSlots(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (whole, name: string) => {
    const value = values[name];
    return typeof value === "string" && value.trim() ? value : whole;
  });
}
