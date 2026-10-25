"use client";

/**
 * THE SAFETY NOTICE (item 8, 2026-10-24). When the person's story mentions threats, fear
 * or violence (storySuggestsDanger, the screen the safety question already uses), this
 * box is shown open -- on the first screen after the story, on the results and on the
 * case page, in all three areas -- and never folded away.
 *
 * Wording reused, not written: the 911 sentence is IMMEDIATE_DANGER_MESSAGE's first line
 * (crisisMessages.ts); the Victim Support Line line is familySafetyResources.ts's, whose
 * numbers were checked again on ontario.ca/page/victim-services-ontario on 2026-10-24
 * ("416-314-2447", "Toll-free: 1-888-579-2888"; page updated August 20, 2026).
 *
 * A screen for when to show help, never a finding about anyone. No advice, no scoring.
 */
import { storySuggestsDanger } from "@/src/lib/case-system/intake/dangerWords";

export const VICTIM_SERVICES_URL = "https://www.ontario.ca/page/victim-services-ontario";
export const VICTIM_SUPPORT_VERIFIED = "2026-10-24";

export default function SafetyNotice({ story }: { story: string }) {
  if (!storySuggestsDanger(story)) return null;
  return (
    <section data-testid="safety-notice" role="note" className="mx-auto my-4 max-w-6xl rounded-2xl border-2 border-[#b45309] bg-[#fff7ed] px-5 py-4 text-sm leading-6 text-[#3b2a12]">
      <p className="font-semibold">If you are in immediate danger, please call 911.</p>
      <p className="mt-1">- Victim Support Line: 1-888-579-2888 (toll-free), or 416-314-2447</p>
      <p className="mt-1 text-xs text-[#6b5a26]">
        Shown because your story mentions threats, fear or violence. Source:{" "}
        <a href={VICTIM_SERVICES_URL} target="_blank" rel="noreferrer" className="underline">Ontario.ca — Victim Services Ontario</a> (checked {VICTIM_SUPPORT_VERIFIED}).
      </p>
    </section>
  );
}

