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
