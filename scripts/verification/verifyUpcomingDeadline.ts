/**
 * Checks the in-app deadline reminder on "My cases"
 * (src/lib/case-workspace/upcomingDeadline.ts, master plan 6D).
 *
 * Exists to catch: a reminder that picks the wrong date (a far one over a
 * near one, a document date instead of a counted deadline), hides a date that
 * has just passed, keeps showing an old passed date forever, or words a
 * counted date as certain. Also that the dashboard takes the date from the
 * Timeline view (the deadline engine) and counts nothing of its own
 * (CLAUDE.md s. 2a).
 *
 * Offline and free.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import type { TimelineItem } from "../../src/lib/case-workspace/timeline";
import {
  PASSED_SHOWN_DAYS,
  REMINDER_HORIZON_DAYS,
  nextCountedDate,
  ontarioToday,
  reminderLine,
} from "../../src/lib/case-workspace/upcomingDeadline";

let failures = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (error) {
    failures += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  FAIL ${name}\n       ${message}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=test:upcoming-deadline::${name}: ${message.replace(/\n/g, " ")}`);
  }
}

function counted(date: string, title: string, passed = false): TimelineItem {
  return {
    date,
    precision: "day",
    displayDate: date,
    title,
    eventType: null,
    source: { kind: "computed", deadlineId: title, rule: null, ruleUrl: null, description: "Computed by counting" },
    notes: [],
    ...(passed ? { standing: { passed: true, urgent: false, statement: "", lines: [], rule: null, ruleQuote: null } } : {}),
  };
}
function document(date: string): TimelineItem {
  return {
    date,
    precision: "day",
    displayDate: date,
    title: "Invoice",
    eventType: null,
    source: { kind: "document", documentId: "d1", exhibitLabel: null, dateConfirmedByUser: true } as never,
    notes: [],
  };
}

const TODAY = "2026-10-14";

console.log("In-app deadline reminder");

check("the nearest coming counted date wins", () => {
  const r = nextCountedDate([counted("2026-11-01", "Far"), counted("2026-10-20", "Near")], TODAY);
  assert.equal(r?.title, "Near");
  assert.equal(r?.daysAway, 6);
  assert.equal(r?.passed, false);
});

check("a document date is never a reminder", () => {
  assert.equal(nextCountedDate([document("2026-10-15")], TODAY), null);
});

check("a counted date beyond the horizon is not shown", () => {
  const far = new Date(Date.UTC(2026, 9, 14 + REMINDER_HORIZON_DAYS + 1)).toISOString().slice(0, 10);
  assert.equal(nextCountedDate([counted(far, "Far")], TODAY), null);
});

check("a date that just passed is shown, plainly as passed", () => {
  const r = nextCountedDate([counted("2026-10-10", "Defence")], TODAY);
  assert.equal(r?.passed, true);
  assert.match(reminderLine(r!), /has passed/);
});

check("an old passed date gives way", () => {
  const old = new Date(Date.UTC(2026, 9, 14 - PASSED_SHOWN_DAYS - 1)).toISOString().slice(0, 10);
  assert.equal(nextCountedDate([counted(old, "Old")], TODAY), null);
});

check("a coming date wins over a passed one", () => {
  const r = nextCountedDate([counted("2026-10-12", "Passed"), counted("2026-10-25", "Coming")], TODAY);
  assert.equal(r?.title, "Coming");
});

check("the engine's own passed flag counts even on the day", () => {
  const r = nextCountedDate([counted(TODAY, "Today", true)], TODAY);
  assert.equal(r?.passed, true);
});

check("the line says the date was counted, never that it is certain", () => {
  const line = reminderLine({ title: "Deliver your Defence", date: "2026-10-15", displayDate: "2026-10-15", daysAway: 1, passed: false });
  assert.match(line, /tomorrow/);
  assert.match(line, /Counted from the dates you gave/);
  assert.doesNotMatch(line, /\b(?:must|will win|strong|weak|chance)\b/i);
});

check("today in Ontario is an ISO date and follows Toronto, not UTC", () => {
  assert.match(ontarioToday(), /^\d{4}-\d{2}-\d{2}$/);
  // 02:00 UTC on Oct 15 is still Oct 14 in Toronto (EDT, UTC-4).
  assert.equal(ontarioToday(new Date("2026-10-15T02:00:00Z")), "2026-10-14");
});

check("the dashboard reads the Timeline view and counts nothing itself", () => {
  const src = readFileSync(path.join(process.cwd(), "app/dashboard/page.tsx"), "utf8");
  assert.match(src, /\/api\/workspace\/organisation\?caseId=.*view=timeline/);
  assert.match(src, /nextCountedDate\(/);
  assert.doesNotMatch(src, /deadlineEngine|computeDeadline|computedDeadlinesFor/);
});

if (failures) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll reminder checks passed.");
