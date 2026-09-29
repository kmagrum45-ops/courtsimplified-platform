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
 * 2. Where the legal information comes from: a library prepared in advance,
 *    with AI help, and checked against the rules and legislation it cites --
 *    never written by the AI on the spot for this user.
 *
 *    Corrected 2026-09-27. This used to say the wording was "written by
 *    people ... not composed by" the AI. The published answer library was
 *    drafted by a model and machine-checked against quoted sources (see
 *    published/stageAnswers.published.json), so that was not true, and the
 *    LSO A2I response describes the library the way this notice now does.
 *    When founder or licensee sign-off is enforced (REQUIRE_APPROVED_CONTENT),
 *    this notice can say so -- not before.
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
        The legal and procedural information you read comes from a library we prepare in
        advance with AI help and check against the court rules and laws it cites. The AI does
        not write it for you on the spot. That information has <strong>not yet been reviewed by
        a licensed Ontario lawyer or paralegal</strong>. Please check anything here against the official
        source before relying on it — CourtSimplified gives legal information, not legal advice.
      </p>
    </aside>
  );
}
