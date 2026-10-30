"use client";

/**
 * THE SAFETY NOTICE (item 8, 2026-10-24; shown once since 2026-10-29). When what the
 * person said mentions threats, fear or violence (storySuggestsDanger, the screen the
 * safety question already uses), this box is shown at that moment -- the screen where
 * those words first appear -- and once: the same words never bring it back on a later
 * page in this tab (safetyNoticeOnce.ts; a fingerprint, never the words). Site owner, 2026-10-29: "The fuller support
 * information shows only when what the person said indicates danger, at that moment,
 * once." Every page's footer carries the 911 line and the other support lines
 * (SafetyFooterLine.tsx), so the help is never out of reach after the box is gone.
 *
 * Wording reused, not written: the 911 sentence is IMMEDIATE_DANGER_MESSAGE's first line
 * (crisisMessages.ts); the Victim Support Line line is familySafetyResources.ts's, whose
 * numbers were checked again on ontario.ca/page/victim-services-ontario on 2026-10-24
 * ("416-314-2447", "Toll-free: 1-888-579-2888"; page updated August 20, 2026).
 *
 * A screen for when to show help, never a finding about anyone. No advice, no scoring.
 */
import { useEffect, useState } from "react";
import { storySuggestsDanger } from "@/src/lib/case-system/intake/dangerWords";
import { readShownKeys, recordShownKey, safetyNoticeToShow } from "@/src/lib/case-system/intake/safetyNoticeOnce";
import { safetyNoticeStore } from "@/src/lib/case-system/storage/safetyNoticeStore";
import { VICTIM_SUPPORT_LINE } from "@/src/lib/content-library/supportLines";

export const VICTIM_SERVICES_URL = "https://www.ontario.ca/page/victim-services-ontario";
export const VICTIM_SUPPORT_VERIFIED = "2026-10-24";

export default function SafetyNotice({ story }: { story: string }) {
  // The words this mount decided to show for; kept while the same words are on screen.
  // Only a one-way fingerprint is stored (safetyNoticeOnce.ts), never the words.
  const [showing, setShowing] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const store = safetyNoticeStore();
    void safetyNoticeToShow(story, readShownKeys(store)).then((decision) => {
      if (!live || !decision.show) return;
      if (decision.fingerprint) recordShownKey(store, decision.fingerprint);
      setShowing(story);
    });
    return () => { live = false; };
  }, [story]);
  if (showing === null || !storySuggestsDanger(story) || showing !== story) return null;
  return (
    <section data-testid="safety-notice" role="note" className="mx-auto my-4 max-w-6xl rounded-2xl border-2 border-[#b45309] bg-[#fff7ed] px-5 py-4 text-sm leading-6 text-[#3b2a12]">
      <p className="font-semibold">If you are in immediate danger, please call 911.</p>
      <p className="mt-1">{VICTIM_SUPPORT_LINE}</p>
      <p className="mt-1 text-xs text-[#6b5a26]">
        Shown because your story mentions threats, fear or violence. Source:{" "}
        <a href={VICTIM_SERVICES_URL} target="_blank" rel="noreferrer" className="underline">Ontario.ca — Victim Services Ontario</a> (checked {VICTIM_SUPPORT_VERIFIED}).
      </p>
    </section>
  );
}
