/**
 * THE ONE COPY OF THE PERSON'S STORY AND LOCATION.
 *
 * Until 2026-10-18 the story lived in five places at once — home.facts,
 * builder.homeStory, family.facts, civil/small-claims input.facts and
 * guided.storyText — and the location in two (home.city,
 * builder.confirmedLocation). Each screen copied it forward on mount, so
 * correcting it on one screen left the others holding the old text: a
 * confirmed review changed builder.homeStory while home.facts still showed
 * the original after Back (PR #463 re-test).
 *
 * Now every screen reads and writes `sections.story` and nothing else.
 * `migrateStory` moves an older checkpoint's copies into it once, on load,
 * and deletes them, so a stale copy cannot survive to be shown again.
 */
import type { Checkpoint } from "./intakeCheckpoint";

export const STORY_SECTION = "story";
export type CaseLocation = { province: string; city: string };

type Sections = Checkpoint["sections"];
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === "string" ? value : "";

export function storyOf(sections: Sections): string {
  return text(sections[STORY_SECTION]?.text);
}

export function locationOf(sections: Sections): CaseLocation | null {
  const location = object(sections[STORY_SECTION]?.location);
  return typeof location.city === "string" ? { province: text(location.province) || "Ontario", city: location.city } : null;
}

/** A location counts only once it names a city. */
export function confirmedLocationOf(sections: Sections): CaseLocation | null {
  const location = locationOf(sections);
  return location && location.city.trim() ? location : null;
}

/** Fields of a court's form input that are the story/location, not answers of that form. */
export const STORY_INPUT_KEYS = new Set(["facts", "yourCity", "yourProvince"]);

/**
 * Moves the legacy copies into `sections.story` and removes them. Returns the
 * same object when there was nothing to move, so a current checkpoint is left
 * byte-for-byte alone (its revision is not disturbed).
 */
export function migrateStory(checkpoint: Checkpoint): Checkpoint {
  const s = checkpoint.sections;
  const home = object(s.home), builder = object(s.builder), guided = object(s.guided), family = object(s.family);
  const scInput = object(s["small-claims"]?.input), civilInput = object(s.civil?.input);
  const legacy = "facts" in home || "city" in home || "homeStory" in builder || "confirmedLocation" in builder ||
    "facts" in family || "storyText" in guided || [scInput, civilInput].some(input => [...STORY_INPUT_KEYS].some(key => key in input)) ||
    ("inputText" in guided && !guided.started);
  if (!legacy) return checkpoint;

  const formStory = checkpoint.courtPath === "family" ? family.facts : checkpoint.courtPath === "civil" ? civilInput.facts : scInput.facts;
  const candidates = builder.step === "guided" ? [guided.storyText, guided.started ? "" : guided.inputText, builder.homeStory, formStory, home.facts]
    : [formStory, builder.homeStory, guided.storyText, home.facts];
  const current = storyOf(s);
  const story = current || candidates.map(text).find(value => value.trim()) || "";
  const saved = object(builder.confirmedLocation);
  const location = locationOf(s) ?? (typeof saved.city === "string" ? { province: text(saved.province) || "Ontario", city: saved.city }
    : typeof home.city === "string" ? { province: "Ontario", city: home.city } : null);

  const strip = (value: Record<string, unknown>, keys: string[]) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
  const sections: Sections = { ...s, [STORY_SECTION]: { ...object(s[STORY_SECTION]), text: story, ...(location ? { location } : {}) } };
  if (s.home) sections.home = strip(home, ["facts", "city"]);
  if (s.builder) sections.builder = strip(builder, ["homeStory", "confirmedLocation"]);
  if (s.family) sections.family = strip(family, ["facts"]);
  if (s.guided) sections.guided = strip(guided, guided.started ? ["storyText"] : ["storyText", "inputText"]);
  for (const court of ["small-claims", "civil"] as const) {
    if (s[court]?.input) sections[court] = { ...s[court], input: strip(object(s[court].input), [...STORY_INPUT_KEYS]) };
  }
  return { ...checkpoint, sections };
}
