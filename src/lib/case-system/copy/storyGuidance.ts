/**
 * WHAT EVERY STORY BOX SAYS, ONCE (site owner, 30 Oct).
 *
 * A person is asked to tell their story in several places: the home page, the
 * "not sure which court" guide, the Small Claims, civil and Family forms (the
 * "Case story" editor), the one-at-a-time questions (Small Claims chat and the
 * civil/Family question list), and the review panel's story box. Each used to
 * carry its own hint ("Share the main events…", "Tell us what happened…", none
 * at all), so the same person read different advice depending on the route.
 *
 * Every story box shows this text as visible helper text (StoryGuidance.tsx),
 * tied to the box with aria-describedby. It is not a placeholder: a placeholder
 * disappears on the first keystroke, and the line about not sharing a social
 * insurance number or bank and card numbers has to stay on screen while typing.
 *
 * No story box carries its own copy: `npm run test:story-guidance` fails when
 * one does. The words are the owner's; change them here and nowhere else.
 * The site is English only (no translation system exists, 30 Oct).
 */
export const STORY_GUIDANCE =
  "Tell us what happened in your own words, as much as you can remember. Include who was involved, what happened, dates (even approximate), where it took place, any amounts of money, what you have already done about it, and what you want to happen. Don’t worry if you don’t know something; you can leave it out. Please don’t include your social insurance number, or bank or card numbers.";

/**
 * The name every story box that is named for the story carries: its visible
 * label and accessible name (home page, Small Claims chat), and the civil/Family
 * one-at-a-time story question (site owner, 30 Oct). It must not repeat the
 * guidance's opening words: the home label used to read "Tell us what happened
 * in your own words", right above guidance starting with the same words.
 * `npm run test:story-guidance` checks no story box's name repeats them.
 */
export const STORY_LABEL = "Your story";

/**
 * THE LENGTH THE SITE READS (site owner, 17 Nov). Every story box keeps the whole story in the case, however long; some
 * steps read only this many characters of it, and the Small Claims questions one at a time cannot go on past it (the
 * guided-turn route refuses a longer story: MAX_STORY_TEXT_LENGTH, the same number). So it is never cut off silently:
 * past it, every story box shows storyLengthNote while the person types (StoryGuidance.tsx), and the Small Claims chat
 * says it in place of sending a turn the route would refuse. `npm run test:story-guidance` (6) checks both.
 */
export const STORY_READ_LIMIT = 8_000;

/** The story is longer than the site reads. */
export function storyTooLong(text: string): boolean {
  return text.length > STORY_READ_LIMIT;
}

/** What the person is told past the limit: the length, the limit, and that the whole story stays saved. */
export function storyLengthNote(length: number): string {
  const count = (value: number) => value.toLocaleString("en-CA");
  return `Your story is ${count(length)} characters. All of it is saved in your case, but some steps read only the first ${count(STORY_READ_LIMIT)} characters, and the questions asked one at a time cannot go on past that. Please shorten it to ${count(STORY_READ_LIMIT)} characters or fewer.`;
}
