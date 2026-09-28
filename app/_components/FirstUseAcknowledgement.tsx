"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/src/lib/supabase/client";
import {
  ACKNOWLEDGEMENT_KEY,
  readAcknowledgement,
  writeAcknowledgement,
} from "@/src/lib/content-library/acknowledgement";

/**
 * One screen, one checkbox, shown once, before a user starts a case.
 *
 * *** WHY IT IS DELIBERATELY SMALL ***
 *
 * The A2I policy wants users told that this is legal information and that AI
 * is involved. A long consent wall would satisfy that on paper and fail in
 * practice: the audience is self-represented people, often mid-crisis, and a
 * wall of text before they can begin is a wall they will click past. One
 * paragraph, one checkbox, one button, shown once per account.
 *
 * *** WHERE THE ACKNOWLEDGEMENT IS STORED ***
 *
 * localStorage, keyed by user id for signed-in users and a guest key
 * otherwise, with an ISO timestamp. Not a database table: that would need a
 * migration, and Step 7's migrations are deliberately unapplied, so a DB-backed
 * gate would either block every user or silently pass. See
 * acknowledgement.ts for the upgrade path and its known limits — this is
 * honest about being per-browser rather than per-account.
 *
 * *** WHAT IT DOES NOT CLAIM ***
 *
 * It does not call itself consent to anything, does not ask the user to waive
 * anything, and does not say they have read the Terms. It records that the two
 * notices were put in front of them, which is what it actually does.
 */
export default function FirstUseAcknowledgement({
  onAcknowledged,
  onStatus,
}: {
  onAcknowledged?: () => void;
  /**
   * Reports whether the acknowledgement is still OUTSTANDING.
   *
   * Added 2026-09-23. Independent review found this component rendered as one
   * item in a stack above the intake, so a user could scroll past it and
   * complete a whole case without ever ticking the box. Its own header called
   * it a gate. It was a notice.
   *
   * A caller that wants it to gate now has something to gate on. Called with
   * null while the answer is still unknown, so a caller never flashes the
   * intake and then hides it.
   */
  onStatus?: (outstanding: boolean | null) => void;
}) {
  const [checked, setChecked] = useState(false);
  const [needed, setNeeded] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      if (!active) return;
      const id = data.user?.id ?? null;
      setUserId(id);
      const outstanding = !readAcknowledgement(id);
      setNeeded(outstanding);
      onStatus?.(outstanding);
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  // Never flash the gate before we know whether it is needed.
  if (needed === null || needed === false) return null;

  return (
    <section
      data-testid="first-use-acknowledgement"
      className="rounded-3xl border-2 border-[#2f7d67] bg-white p-6 shadow-sm"
    >
      <h2 className="text-xl font-bold text-[#10231f]">Before you start</h2>

      <p className="mt-3 text-[15px] leading-7 text-[#24463d]">
        CourtSimplified gives <strong>legal information, not legal advice</strong>. We are not
        a law firm and using this site does not make us your lawyer or paralegal.
      </p>

      <p className="mt-3 text-[15px] leading-7 text-[#24463d]">
        We use AI to help organize what you write and point you to the right part of the
        site. The legal and procedural information you read comes from a library we prepare in
        advance with AI help and check against the court rules and laws it cites. The AI does
        not write it for you on the spot. It has <strong>not yet been reviewed by a licensed
        Ontario lawyer or paralegal</strong>. Check anything here against the official source
        before relying on it.
      </p>

      <label className="mt-5 flex items-start gap-3">
        <input
          type="checkbox"
          data-testid="acknowledgement-checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          className="mt-1 h-5 w-5"
        />
        <span className="text-[15px] leading-7 text-[#16302b]">
          I understand this is legal information, not legal advice, and that AI is used to
          help organize my information.
        </span>
      </label>

      <button
        type="button"
        data-testid="acknowledgement-continue"
        disabled={!checked}
        onClick={() => {
          writeAcknowledgement(userId);
          setNeeded(false);
          onStatus?.(false);
          onAcknowledged?.();
        }}
        className="mt-5 rounded-xl bg-[#2f7d67] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Continue
      </button>

      <p className="mt-3 text-xs leading-5 text-[#6b8078]">
        Recorded on this device with the date and time. Storage key:{" "}
        <code>{ACKNOWLEDGEMENT_KEY}</code>
      </p>
    </section>
  );
}
