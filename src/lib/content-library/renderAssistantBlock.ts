/**
 * The one way a guided-assistant block becomes text on a screen.
 *
 * *** THE ORDER IS THE POINT ***
 *
 *   1. Look the block up by id. An unknown id renders nothing.
 *   2. Refuse a placeholder.
 *   3. Refuse an unverified doctrine source.
 *   4. Pass the TEMPLATE through the output guard.
 *   5. Only then fill the slots.
 *
 * Step 4 before step 5, always. The guard checks the template with `{{slots}}`
 * intact — which is the exact string in `assistantBlocks.ts` and therefore the
 * exact string a licensee reviewed. Filling first would hand the guard a
 * sentence nobody has ever approved, it would correctly refuse, and the refusal
 * would look like a bug rather than the design working.
 *
 * *** WHY THIS IS A SEPARATE MODULE ***
 *
 * `assistantBlocks.ts` is content and imports nothing. This is the machinery.
 * Keeping them apart is what stopped the crisis messages breaking the client
 * bundle earlier this week: content that imports a Node API cannot be indexed
 * by the content inventory, because the inventory is read by a client
 * component.
 */

import {
  assistantBlockById,
  fillAssistantSlots,
  isAssistantPlaceholder,
  type AssistantBlock,
} from "./assistantBlocks";
import { assertApprovedUserContent } from "./outputGuard";

/**
 * Whether a block's supporting knowledge has been verified.
 *
 * *** WHY THIS GATE EXISTS ***
 *
 * `doctrineSeedLibrary.ts` supplies the evidence priorities, burden priorities
 * and procedural watch-points behind three of the assistant's answers. Every
 * one of its eleven objects carries `verificationStatus: "not-verified"`,
 * `authorityLevel: "operational-guidance"` and `jurisdiction: "Unknown"`. The
 * file is honest about itself in its own metadata; nothing downstream was
 * telling the user.
 *
 * The site owner's decision: "anything marked not-verified must not reach users
 * until verified". So a block whose text is drawn from that library renders
 * only when the supplying knowledge object says `verified-draft` or `approved`.
 *
 * Today that is none of them, so those three paths fall through to their
 * empty-state block — which is the honest answer and was already written.
 */
export type KnowledgeVerification = "not-verified" | "verified-draft" | "approved";

export const RENDERABLE_VERIFICATION: readonly KnowledgeVerification[] = [
  "verified-draft",
  "approved",
];

export function isRenderableVerification(status: string | undefined): boolean {
  return (RENDERABLE_VERIFICATION as readonly string[]).includes(status ?? "");
}

export type RenderAssistantBlockArgs = {
  id: string;
  slots?: Record<string, string>;
  /**
   * The verification status of the knowledge behind this block, when it draws
   * on `doctrineSeedLibrary`. Omitted for a block that stands on its own
   * citations.
   */
  knowledgeVerification?: string;
};

export type AssistantBlockRender = {
  text: string;
  /** Empty when the block rendered; otherwise why it did not. */
  refusedBecause:
    | ""
    | "unknown-block"
    | "placeholder"
    | "unverified-knowledge"
    | "guard-refused";
  block: AssistantBlock | null;
};

/**
 * Renders one block, or explains why it did not.
 *
 * Returns a reason rather than throwing. A refusal on a chat surface should
 * leave a gap the orchestrator can route around, not a stack trace in the
 * middle of someone's conversation about their legal problem.
 */
export function renderAssistantBlock(
  args: RenderAssistantBlockArgs,
): AssistantBlockRender {
  const block = assistantBlockById(args.id);
  if (!block) {
    return { text: "", refusedBecause: "unknown-block", block: null };
  }

  if (isAssistantPlaceholder(block)) {
    return { text: "", refusedBecause: "placeholder", block };
  }

  if (
    args.knowledgeVerification !== undefined &&
    !isRenderableVerification(args.knowledgeVerification)
  ) {
    return { text: "", refusedBecause: "unverified-knowledge", block };
  }

  const guarded = assertApprovedUserContent(block.template, `assistant:${block.id}`);
  if (!guarded) {
    return { text: "", refusedBecause: "guard-refused", block };
  }

  return {
    text: fillAssistantSlots(guarded, args.slots ?? {}),
    refusedBecause: "",
    block,
  };
}

/** Convenience for a caller that only wants the text. */
export function assistantText(
  id: string,
  slots?: Record<string, string>,
  knowledgeVerification?: string,
): string {
  return renderAssistantBlock({ id, slots, knowledgeVerification }).text;
}
