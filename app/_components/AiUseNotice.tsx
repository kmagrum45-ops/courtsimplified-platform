/**
 * Tells the user that AI is involved on this screen, and what it does.
 *
 * *** WHY THIS EXISTS ***
 *
 * The audit searched every string in `app/` for any phrasing disclosing AI use
 * and found none. The product used a model on the intake, the classifier and
 * the stage detection, and told the user nothing.
 *
 * *** WHAT IT SAYS, AND WHY THOSE THREE THINGS ***
 *
 * 1. What the AI actually does here -- organise and route, not advise. Stated
 *    concretely, because "we use AI" tells a user nothing about their risk.
 * 2. That the legal information itself was written by people. This is the
 *    claim that matters most and it must stay true: it is only true because of
 *    the content library and the output guard.
 * 3. That anything the AI suggests should be confirmed. The product is built
 *    on suggest-then-confirm, and the notice should say so rather than assume
 *    the user will infer it from the buttons.
 *
 * Plain language on purpose. The audience is self-represented people, often in
 * distress. A disclosure nobody can read has not disclosed anything.
 *
 * NOT licensee-reviewed -- it makes no legal statement, but it is still
 * user-facing copy and is in the review packet as a system message.
 */

export type AiUseNoticeProps = {
  /** What this particular screen uses AI for. Keep it to a short phrase. */
  activity?: string;
  className?: string;
};

export default function AiUseNotice({ activity, className }: AiUseNoticeProps) {
  return (
    <aside
      data-testid="ai-use-notice"
      className={
        className ??
        "rounded-2xl border border-[#cde7dc] bg-[#f8fcfa] px-4 py-3 text-sm leading-6 text-[#24463d]"
      }
    >
      <p>
        <strong className="font-semibold text-[#10231f]">How AI is used here.</strong>{" "}
        {activity
          ? `On this page, AI helps ${activity}.`
          : "AI helps organize what you write and point you to the right part of the site."}{" "}
        It does not write the legal information you see — that was written and checked by
        people. Please confirm anything the AI suggests before relying on it, and remember
        CourtSimplified gives legal information, not legal advice.
      </p>
    </aside>
  );
}
