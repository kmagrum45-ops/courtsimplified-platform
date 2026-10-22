/**
 * The follow-up chat as a real person reaches it, without a browser.
 *
 * test:chat-first-line passed while the live chat did not (#469 re-test): it
 * called the gateway with an empty conversation and a near-empty case, and only
 * checked that a word appeared. This drives the guided assistant ROUTE itself
 * (createGuidedAssistantPost), with a saved case shaped like the builder saves
 * one (intakeData, intakeFacts, position, the confirmed intake) and a request
 * body built the way CourtAssistantChat builds it: the chat's greeting first,
 * then each earlier exchange, then the new message. Auth and the case read are
 * stubbed; everything after them is the live code.
 */
import { createGuidedAssistantPost } from "../../app/api/guided-assistant/route";
import { INITIAL_ASSISTANT_MESSAGE } from "../../app/builder/_components/CourtAssistantChat";

export type Court = "small-claims" | "family" | "civil";
const CASE_ID = "77777777-7777-4777-8777-777777777777";

/** What the builder saves for a confirmed case (the parts the route reads). */
/**
 * The labelled record each form saves as `facts` for the analysis (CivilIntake
 * buildCivilNarrative, FamilyIntake buildNarrative, smallClaimsIntelligenceEngine
 * buildRawUserText), with the person's own words kept beside it as the forms keep
 * them. Saving the plain story here hid the #470 re-test's "Court path: Civil /
 * Stage: Stage unclear / Main story:" quoted back as evidence.
 */
const RECORD: Record<Court, (story: string) => { facts: string; extra: Record<string, unknown> }> = {
  civil: (story) => ({ facts: ["Court path: Civil", "Stage: Stage unclear", "User role: plaintiff", "Existing document signals: Nothing filed yet", `Main story: ${story}`].join("\n"), extra: { civilInput: { facts: story }, story } }),
  family: (story) => ({ facts: ["Court path: Family", "Stage: Stage unclear", "Existing family documents: Nothing filed yet", `Case story: ${story}`].join("\n"), extra: { story } }),
  "small-claims": (story) => ({ facts: ["Small Claims Ontario intake", "Stage selected: Stage unclear", "Selected issue hints: None selected", `Facts: ${story}`].join("\n\n"), extra: { story } }),
};

export function savedCase(court: Court, story: string, extra: Record<string, unknown> = {}) {
  const record = RECORD[court](story);
  return {
    id: CASE_ID,
    court_path: court,
    master_result: {
      intakeData: { courtPath: court, facts: record.facts, extra: record.extra, caseStage: "starting-case", evidence: "", timeline: "", goal: "", ...extra },
      intakeFacts: { role: court === "family" ? "applicant" : "plaintiff" },
      position: { confirmedStage: "starting-case", stepId: null, dateAnswers: {} },
      workflowStatus: { intakeCompleted: true },
    },
  };
}

/** Sends `messages` one by one, as the chat does, and returns the reply shown for each. */
export async function chatReplies(court: Court, story: string, messages: string[], extra: Record<string, unknown> = {}): Promise<string[]> {
  const owned = savedCase(court, story, extra);
  const post = createGuidedAssistantPost({
    authenticate: (async () => ({ id: "11111111-1111-4111-8111-111111111111" })) as never,
    owned: (async () => owned) as never,
  });
  const conversation: { role: "user" | "assistant"; content: string }[] = [{ ...INITIAL_ASSISTANT_MESSAGE }];
  const replies: string[] = [];
  for (const message of messages) {
    conversation.push({ role: "user", content: message });
    const body = {
      message,
      caseId: CASE_ID,
      mode: "builder-chat",
      courtContext: { courtPath: court, jurisdiction: "Ontario", city: "Ottawa", stage: "starting-case" },
      conversation,
    };
    const response = await post(new Request("http://localhost/api/guided-assistant", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" },
      body: JSON.stringify(body),
    }) as never);
    const data = (await response.json()) as { answer?: string; userFacingAnswer?: string; error?: string };
    // The chat shows `answer`, else `userFacingAnswer` (CourtAssistantChat).
    const reply = (data.answer || data.userFacingAnswer || `ERROR ${response.status}: ${data.error ?? ""}`).trim();
    replies.push(reply);
    conversation.push({ role: "assistant", content: reply });
  }
  return replies;
}
