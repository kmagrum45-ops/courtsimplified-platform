"use client";

import { useIntakeState } from "../../_components/IntakeRecovery";

/**
 * "Case story" with "Edit case story", the same in Small Claims, Family and civil
 * (L42, #468 re-test).
 *
 * Typing used to change the story key by key. In civil, select-all and delete
 * emptied it mid-edit and the editor closed; in Small Claims and Family the box
 * closed on the first keystroke and the rest of the typing was lost
 * (" We separated in March 2026." saved only " W"). Now typing is a draft:
 *   - the story changes only on "Save story";
 *   - the box stays open while the draft is empty, and an empty draft can never
 *     be saved over a real story;
 *   - after saving, the box stays open on the saved text; "Close" puts it away,
 *     "Close without saving" when there are unsaved edits;
 *   - the draft is kept in the intake record (section.storyDraft), so a reload
 *     keeps it. It is not an answer (storyBasis.ts NOT_ANSWERS).
 */
export default function StoryEditor({
  section,
  story,
  onSave,
  ids,
  startOpen = false,
}: {
  section: string;
  story: string;
  /** Called with the new story, never an empty one. */
  onSave: (text: string) => void;
  ids: { toggle?: string; draft: string; save: string };
  /** Open from the start (Small Claims, where the story is first written here). */
  startOpen?: boolean;
}) {
  const [draft, setDraft] = useIntakeState<string | null>(section, "storyDraft", () => (startOpen ? story : null));
  return (
    <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
      <h3 className="font-semibold text-[#16302b]">Case story</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#4d675f]">{story}</p>
      {draft === null ? (
        <button type="button" data-testid={ids.toggle} onClick={() => setDraft(story)} className="mt-3 text-sm font-semibold text-[#2f7d67]">
          Edit case story
        </button>
      ) : (
        <>
          <textarea
            aria-label="Case story"
            data-testid={ids.draft}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="mt-3 min-h-32 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
          />
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              type="button"
              data-testid={ids.save}
              disabled={!draft.trim() || draft === story}
              onClick={() => { if (draft.trim()) onSave(draft); }}
              className="rounded-xl bg-[#2f7d67] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Save story
            </button>
            <button type="button" onClick={() => setDraft(null)} className="text-sm font-semibold text-[#2f7d67] underline">
              {draft === story ? "Close" : "Close without saving"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
