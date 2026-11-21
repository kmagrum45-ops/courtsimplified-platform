import { STORY_GUIDANCE, STORY_READ_LIMIT, storyLengthNote } from "../../src/lib/case-system/copy/storyGuidance";

/**
 * The one guidance text every story box shows (copy/storyGuidance.ts), visible
 * while typing. The box points at it with aria-describedby={id}, so a screen
 * reader reads it with the box. A block <span>, not a <p>, so it can sit inside a
 * <label> (a <p> there is invalid HTML). `npm run test:story-guidance` checks every story
 * box renders this and carries no guidance of its own.
 *
 * `length`: the story's length as typed. Past what the site reads (STORY_READ_LIMIT) the note says so while the person
 * types, so a long story is never cut off silently (site owner, 17 Nov; test:story-guidance 6).
 */
export default function StoryGuidance({ id, className = "mt-2", length }: { id: string; className?: string; length: number }) {
  return (
    <span id={id} data-testid="story-guidance" className={`${className} block text-sm font-normal leading-6 text-[#4d675f]`}>
      {STORY_GUIDANCE}
      {length > STORY_READ_LIMIT ? (
        <span data-testid="story-length-note" role="status" className="mt-1 block font-semibold text-[#8a4b12]">
          {storyLengthNote(length)}
        </span>
      ) : null}
    </span>
  );
}
