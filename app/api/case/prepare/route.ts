/**
 * CHAT ITEM 7 — the runtime door for presentation help, Level 1.
 *
 * *** NO MODEL IS INVOLVED, AND THAT IS THE FEATURE ***
 *
 * Everything this returns is either the court's own checklist, quoted with its
 * source, or the person's own events put in date order. There is nothing here
 * for a model to do, and giving it something to do is how "help me get ready"
 * turns into "here is what you should argue".
 *
 * *** WHY A SEPARATE ROUTE RATHER THAN A CHAT INTENT ***
 *
 * The chat's contract is a model returning ids. Folding preparation into it
 * would put a model call in front of a feature that needs none, and would widen
 * the one interface in this product that is deliberately narrow.
 *
 * It also exists so this does not become another engine with no caller. The
 * deadline engine was built correctly, checked thoroughly, and unreachable for
 * two parts of this work; that finding is recent enough to act on.
 */

import { NextResponse } from "next/server";

import {
  PRESENTATION_CHECKLISTS,
  CHRONOLOGICAL_ORDER_BASIS,
} from "../../../../src/lib/content-library/presentationHelp";
import {
  gapsInStory,
  structureStory,
  type RecordedEvent,
} from "../../../../src/lib/content-library/structureStory";
import { OFFICIAL_URLS, SOURCE_NAMES } from "../../../../src/lib/case-system/stage-map/citations";

type Body = { occasion?: unknown; events?: unknown };

const MAX_EVENTS = 100;
const MAX_EVENT_CHARS = 2_000;

/** Whatever the caller sent, reduced to events we will actually work with. */
function readEvents(value: unknown): RecordedEvent[] {
  if (!Array.isArray(value)) return [];

  const events: RecordedEvent[] = [];
  for (const entry of value.slice(0, MAX_EVENTS)) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const what = typeof record.what === "string" ? record.what.trim() : "";
    if (!what) continue;

    events.push({
      id: typeof record.id === "string" ? record.id : `event-${events.length}`,
      /*
       * Truncated, not rewritten. A 4,000-character event is a paste, and the
       * cap is the one place this route touches somebody's words at all — so it
       * cuts and never edits. The permutation property in
       * `test:presentation-help` covers `structureStory`; this is the boundary
       * before it.
       */
      what: what.length > MAX_EVENT_CHARS ? what.slice(0, MAX_EVENT_CHARS) : what,
      when: typeof record.when === "string" ? record.when : undefined,
    });
  }

  return events;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const occasion = typeof body.occasion === "string" ? body.occasion : "";
  const checklist = PRESENTATION_CHECKLISTS.find((entry) => entry.occasion === occasion);

  if (!checklist) {
    return NextResponse.json(
      {
        error: "occasion must be one of: " +
          PRESENTATION_CHECKLISTS.map((entry) => entry.occasion).join(", "),
      },
      { status: 400 },
    );
  }

  const story = structureStory(readEvents(body.events));

  return NextResponse.json({
    checklist: {
      id: checklist.id,
      title: checklist.title,
      occasion: checklist.occasion,
      items: checklist.items.map((entry) => ({
        id: entry.id,
        text: entry.text,
        /*
         * The quote travels with the item. A person told to serve something 30
         * days before trial can read the sentence that says so, which is the
         * same standard every stage answer is held to.
         */
        source: {
          quote: entry.quote,
          name: entry.citation ? SOURCE_NAMES[entry.citation.sourceId] : "Ministry guide",
          pinpoint: entry.citation?.pinpoint ?? null,
          url: entry.citation ? OFFICIAL_URLS[entry.citation.sourceId] : null,
        },
      })),
    },
    story: {
      events: story.events,
      undated: story.undated,
      /*
       * Why the order is what it is, in the guide's words rather than ours. It
       * is the one piece of guidance here that could be mistaken for our own
       * advice about running a case.
       */
      orderedBecause: CHRONOLOGICAL_ORDER_BASIS.quote,
    },
    /*
     * Facts about the record, never about the case. CLAUDE.md §3 permits "no
     * date is recorded"; it forbids anything that grades the merits, and
     * `test:presentation-help` asserts these say neither more nor less.
     */
    gaps: gapsInStory(story),
  });
}
