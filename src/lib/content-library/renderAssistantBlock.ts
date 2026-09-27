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
 * Whether the knowledge gate refuses this block, and nothing else.
 *
 * *** WHY THIS IS SEPARATE AND EXPORTED ***
 *
 * The gate used to fail OPEN: the condition was
 * `knowledgeVerification !== undefined && !renderable`, so omitting the argument
 * rendered the block. One call site out of thirty-seven passed it, and anything
 * drawing on doctrineSeedLibrary -- eleven entries, all "not-verified" -- would
 * have reached a user by default.
 *
 * The first check written for the fix PASSED with the fix reverted, because the
 * only block declaring the dependency is also a placeholder and is refused a step
 * earlier in renderAssistantBlock. The check was watching the wrong refusal.
 *
 * So the decision lives here, takes a block rather than an id, and a suite drives
 * it with a synthetic non-placeholder block. That tests the RULE instead of
 * whichever real block happens to be marked today (CLAUDE.md §5).
 */
export function knowledgeGateRefusal(
  block: Pick<AssistantBlock, "drawsOnUnverifiedKnowledge">,
  knowledgeVerification: string | undefined,
): "unverified-knowledge" | null {
  /*
   * A block that DECLARES the dependency must be given a renderable status.
   * Omission refuses.
   */
  if (block.drawsOnUnverifiedKnowledge === true) {
    return isRenderableVerification(knowledgeVerification) ? null : "unverified-knowledge";
  }

  /*
   * A block that declares nothing keeps the older behaviour on purpose: most
   * blocks stand on their own citations and have no knowledge object behind them,
   * so requiring a status everywhere would mean thirty-seven call sites passing a
   * placeholder value, which is ceremony rather than safety. A caller that DOES
   * pass an unrenderable status is still refused.
   */
  if (knowledgeVerification !== undefined && !isRenderableVerification(knowledgeVerification)) {
    return "unverified-knowledge";
  }

  return null;
}
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

  const knowledgeRefusal = knowledgeGateRefusal(block, args.knowledgeVerification);
  if (knowledgeRefusal) {
    return { text: "", refusedBecause: knowledgeRefusal, block };
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
