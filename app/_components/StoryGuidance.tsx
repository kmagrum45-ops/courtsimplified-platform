import { STORY_GUIDANCE } from "../../src/lib/case-system/copy/storyGuidance";

/**
 * The one guidance text every story box shows (copy/storyGuidance.ts), visible
 * while typing. The box points at it with aria-describedby={id}, so a screen
 * reader reads it with the box. A block <span>, not a <p>, so it can sit inside a
 * <label> (a <p> there is invalid HTML). `npm run test:story-guidance` checks every story
 * box renders this and carries no guidance of its own.
 */
export default function StoryGuidance({ id, className = "mt-2" }: { id: string; className?: string }) {
  return (
    <span id={id} data-testid="story-guidance" className={`${className} block text-sm font-normal leading-6 text-[#4d675f]`}>
      {STORY_GUIDANCE}
    </span>
  );
}
