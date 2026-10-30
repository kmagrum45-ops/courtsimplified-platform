/**
 * THE SUPPORT LINES PAGE'S CONTENT (/support), linked from the safety line in every
 * page's footer (site owner, 2026-10-29). Nothing here is new wording: the list is the
 * "Other support that may help" part of IMMEDIATE_DANGER_MESSAGE (crisisMessages.ts),
 * and the Victim Support Line line is SafetyNotice's. Each number was re-read on its
 * ontario.ca page on 2026-10-29 (quoted in `SUPPORT_LINE_SOURCES`).
 *
 * This file imports only crisisMessages.ts, which imports nothing, so a client or
 * server component can read it.
 */
import { IMMEDIATE_DANGER_MESSAGE } from "./crisisMessages";

/** The reviewed list, word for word: IMMEDIATE_DANGER_MESSAGE without its 911 line and its "this intake cannot continue" paragraph. */
export const SUPPORT_LINES_TEXT = IMMEDIATE_DANGER_MESSAGE.split("\n\n").slice(2).join("\n\n");

/** SafetyNotice's Victim Support Line line, word for word. */
export const VICTIM_SUPPORT_LINE = "- Victim Support Line: 1-888-579-2888 (toll-free), or 416-314-2447";

export type SupportLineSource = { title: string; url: string; quoted: string[]; checked: string };

export const SUPPORT_LINE_SOURCES: SupportLineSource[] = [
  {
    title: "Ontario.ca — Connect to supports for survivors of violence",
    url: "https://www.ontario.ca/page/connect-supports-survivors-violence",
    quoted: ["Toll-free: 1-866-863-0511", "416-863-0511", "Toll-free: 1-877-336-2433 (1-877-FEMAIDE)", "Ontario Toll-free: 1-888-579-2888", "Greater Toronto Area (GTA): 416-314-2447"],
    checked: "2026-10-29",
  },
  {
    title: "Ontario.ca — Find mental health support",
    url: "https://www.ontario.ca/page/find-mental-health-support",
    quoted: ["Toll-free: 1-866-531-2600"],
    checked: "2026-10-29",
  },
  {
    title: "Ontario.ca — Report child abuse and neglect",
    url: "https://www.ontario.ca/page/report-child-abuse-and-neglect",
    quoted: ["Report it to a children's aid society or, if someone is in immediate danger, call the police."],
    checked: "2026-10-29",
  },
];
