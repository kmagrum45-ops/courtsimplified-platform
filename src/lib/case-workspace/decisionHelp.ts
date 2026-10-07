/**
 * The model call behind plain-language help with a court decision a person
 * uploaded to their own case (app/api/workspace/documents/decision-help).
 *
 * Kept out of the route, as aiAnalysis.ts is, so the workspace routes import
 * no model client (test:workspace-upload) and this file is the one declared
 * call site (test:output-guard). JSON output only; nothing the model writes is
 * returned until checkedDecisionHelp has passed it (courtDecision.ts): quotes
 * word for word in the uploaded text, nothing judging the person's case, no
 * name the decision does not itself contain.
 *
 * Runs inside withAiCallContext, so the audit row keeps a hash and a length of
 * what was sent, never the text (aiCallLog.ts), and the request carries
 * store:false (openaiClient.ts).
 */

import { recordAiValidation, withAiCallContext } from "../audit/aiCallLog";
import { modelParams } from "../case-system/aiModels";
import { createOpenAIClient } from "../case-system/openaiClient";
import { checkedDecisionHelp, DECISION_SOURCE, type DecisionHelp } from "./courtDecision";

export const MAX_DECISION_CHARS = 60_000;
export const MAX_STORY_CHARS = 2_000;

const SYSTEM = `You help a person who is representing themselves in an Ontario court read a court decision they downloaded from ${DECISION_SOURCE} for their own case.
Return JSON: {"explanation": string, "passages": [{"quote": string, "why": string}]}.
- explanation: 4 to 8 plain sentences on what the case was about, what the court decided and its main reasons, in words a non-lawyer understands.
- passages: up to 5 passages from the decision that relate to the person's situation. "quote" must be copied exactly, word for word, from the decision. "why" says in one plain sentence what the passage is about and how its subject connects to their situation.
Never say or suggest how the person's own case will turn out, whether their case is strong or weak, or their chances. Never guess at or fill in a name the decision leaves out or shortens to initials, and never connect the decision to real people, including anyone in the person's situation. If the decision does not relate to their situation, say so plainly.`;

export async function askDecisionHelp(input: {
  userId: string;
  caseId: string;
  story: string;
  decisionText: string;
}): Promise<DecisionHelp | null> {
  return withAiCallContext({ callType: "decision-help", userId: input.userId, caseId: input.caseId }, async () => {
    const client = createOpenAIClient(process.env.OPENAI_API_KEY ?? "");
    const response = await client.chat.completions.create({
      ...modelParams("standard"),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content:
            `The person's situation, in their words:\n${input.story.slice(0, MAX_STORY_CHARS) || "(not given)"}\n\n` +
            `The decision:\n${input.decisionText.slice(0, MAX_DECISION_CHARS)}`,
        },
      ],
    });
    let raw: unknown = null;
    try {
      raw = JSON.parse(response.choices[0]?.message?.content ?? "null");
    } catch {
      raw = null;
    }
    const checked = checkedDecisionHelp(raw, input.decisionText);
    recordAiValidation(checked ? "valid" : "invalid", checked ? null : "failed the decision-help checks");
    return checked;
  }).catch(() => null);
}
