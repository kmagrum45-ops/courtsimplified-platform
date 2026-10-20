import { IMMEDIATE_DANGER_MESSAGE } from "../../../src/lib/content-library/crisisMessages";

/**
 * Family only (site owner, 2026-10-18): when the AI safety check could not run for
 * a signed-in person, guidance is not blocked, but the fixed safety and help
 * resources come first. The words of the resources are the same fixed message the
 * review panel shows; nothing here is model-generated.
 */
export default function SafetyCheckUnavailable() {
  const parts = IMMEDIATE_DANGER_MESSAGE.split("\n\n");
  return (
    <section data-testid="safety-check-unavailable" role="note" className="mt-6 rounded-2xl border border-[#ead9a7] bg-[#fffaf0] p-5 text-sm leading-6 text-[#3f3410]">
      <h2 className="text-base font-bold">Our safety check could not run just now</h2>
      <p className="mt-2">It usually reads your story for signs that someone may not be safe. It was not available, which does not mean your situation is safe. If you or your children may be in danger, these services can help.</p>
      <p className="mt-3 whitespace-pre-line">{[parts[0], ...parts.slice(2)].join("\n\n")}</p>
    </section>
  );
}
