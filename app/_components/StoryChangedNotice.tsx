"use client";

import { useIntakeRecovery, useIntakeReviewView } from "./IntakeRecovery";
import { storyAnswersOutdated } from "../../src/lib/case-system/storyBasis";

/** True while any answer was based on another version of the story (storyBasis.ts), in any area. */
export function useStoryAnswersOutdated(): boolean {
  const view = useIntakeReviewView();
  return Boolean(view && storyAnswersOutdated(view.checkpoint));
}

/**
 * The one message for answers based on an earlier version of the story (re-test
 * 2026-10-18), shown beside every button that leads to a next step, and in each
 * area's questions with the way to start them again.
 */
export default function StoryChangedNotice({ where, onStartAgain }: { where: "button" | "questions"; onStartAgain?: () => void }) {
  const recovery = useIntakeRecovery();
  const outdated = useStoryAnswersOutdated();
  if (!outdated || !recovery) return null;
  return (
    <div data-testid={where === "button" ? "story-changed-beside-button" : "questions-story-changed"} role="status" className="mt-3 rounded-xl border border-[#ead9a7] bg-[#fffaf0] p-3 text-sm text-[#5c4a14]">
      {where === "button" ? (
        <>
          <p>Your story has changed since the questions read it. Start the questions again from your story first, so your next step comes from what you have now.</p>
          <button type="button" onClick={() => recovery.openQuestions()} className="mt-2 font-semibold text-[#2f7d67] underline">Go to the questions</button>
        </>
      ) : (
        <>
          <p className="font-semibold">Your story has changed since it was last read.</p>
          <p className="mt-1">The answers given for the earlier version are set aside, so nothing here reflects it. Start the questions again from your story as it is now.</p>
          <button type="button" onClick={() => { onStartAgain?.(); recovery.discardStaleAnswers(); }} className="mt-3 rounded-xl bg-[#2f7d67] px-4 py-2 font-semibold text-white">Start the questions again from my story</button>
        </>
      )}
    </div>
  );
}
