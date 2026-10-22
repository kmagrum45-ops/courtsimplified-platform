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
 *
 * The review panel uses the same editor (#470 re-test: its story box changed the
 * story at every keystroke, setting every answer aside), with its own draft so
 * the form's box and the panel's open and close on their own.
 */
export default function StoryEditor({
  section,
  story,
  onSave,
  ids,
  startOpen = false,
  draftField = "storyDraft",
  label = "Case story",
  heading = "Case story",
  showStory = true,
}: {
  section: string;
  story: string;
  /** Called with the new story, never an empty one. */
  onSave: (text: string) => void;
  ids: { toggle?: string; draft: string; save: string };
  /** Open from the start (Small Claims, where the story is first written here). */
  startOpen?: boolean;
  /** Where the draft is kept; the review panel keeps its own. */
  draftField?: string;
  /** The box's accessible name. */
  label?: string;
  /** The heading above the story, or null for none. */
  heading?: string | null;
  /** The saved story shown above the box (the review panel shows only the box). */
  showStory?: boolean;
}) {
  // The draft remembers the story it started from. With no unsaved edits the box
  // shows the story as it is now, however it changed (the review panel, a reload);
  // unsaved edits are never overwritten. (A plain string is an older draft.)
  const [stored, setStored] = useIntakeState<{ text: string; base: string } | string | null>(section, draftField, () => (startOpen ? { text: story, base: story } : null));
  const draft = typeof stored === "string" ? { text: stored, base: stored } : stored;
  const unsaved = draft !== null && draft.text !== draft.base;
  const shown = draft === null ? "" : unsaved ? draft.text : story;
  return (
    <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
      {heading ? <h3 className="font-semibold text-[#16302b]">{heading}</h3> : null}
      {showStory ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#4d675f]">{story}</p> : null}
      {draft === null ? (
        <button type="button" data-testid={ids.toggle} onClick={() => setStored({ text: story, base: story })} className="mt-3 text-sm font-semibold text-[#2f7d67]">
          Edit case story
        </button>
      ) : (
        <>
          <textarea
            aria-label={label}
            data-testid={ids.draft}
            value={shown}
            onChange={(event) => setStored({ text: event.target.value, base: unsaved ? draft.base : story })}
            className="mt-3 min-h-32 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
          />
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              type="button"
              data-testid={ids.save}
              disabled={!unsaved || !shown.trim()}
              onClick={() => { if (!shown.trim()) return; onSave(shown); setStored({ text: shown, base: shown }); }}
              className="rounded-xl bg-[#2f7d67] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Save story
            </button>
            <button type="button" onClick={() => setStored(null)} className="text-sm font-semibold text-[#2f7d67] underline">
              {unsaved ? "Close without saving" : "Close"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
