/**
 * EVERY FAMILY SITUATION QUESTION NAMES ONLY THE BOXES IT SHOWS (Chrome re-check of #545 at dc909096, 10 Nov 2026: the
 * question "Which municipality does the other person live in, if you know?" still said "'Where you live' is filled in
 * from the location you gave on Home", though since #545 it shows only the other person's box).
 *
 * What it checks: the situation card (FamilyStatusTriage) rendered for every question it can ask, with a Home city
 * given and without one; for each, every box named in quotation marks in the card's own notes ("&ldquo;...&rdquo;") is a
 * box label the same card shows. Property, not a list: a new question or a new note is covered without editing this.
 *
 * WHAT FAILURE THIS CATCHES: a note that tells the person about a box the question does not have.
 *
 * Run: npm run test:triage-no-leftover-text
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { FamilyStatusRecord } from "../../src/lib/case-system/family/statusTriage";

// The card's module loads the browser's database client: a placeholder address (never contacted) and no key.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://127.0.0.1:9";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "placeholder";

async function main() {
  const { default: FamilyStatusTriage, emptyTriageState } =
    await import("../../app/builder/_components/FamilyStatusTriage");
  const { emptyStatusRecord } =
    await import("../../src/lib/case-system/family/statusTriage");

  let failures = 0;
  const check = (name: string, ok: boolean, detail = "") => {
    console.log(
      `${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`,
    );
    if (!ok) failures += 1;
  };

  const decode = (html: string) =>
    html
      .replace(/&amp;/g, "&")
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&quot;/g, '"');
  const render = (record: FamilyStatusRecord, homeCity: string) =>
    decode(
      renderToStaticMarkup(
        createElement(FamilyStatusTriage, {
          state: { ...emptyTriageState(), record },
          onChange: () => {},
          homeCity,
          story: "",
        }),
      ),
    );

  // One record per question, reached the way the card asks them (each answer moves to the next question).
  const base = emptyStatusRecord();
  const steps: Array<[string, Partial<FamilyStatusRecord>]> = [
    ["married", {}],
    ["divorce (married)", { marriedToOtherParty: "yes" }],
    ["lived together (not married)", { marriedToOtherParty: "no" }],
    [
      "child together",
      {
        marriedToOtherParty: "no",
        cohabitationStart: "2018-01",
        cohabitationEnd: "2025-08",
      },
    ],
    [
      "children involved",
      {
        marriedToOtherParty: "no",
        cohabitationStart: "2018-01",
        cohabitationEnd: "2025-08",
        haveChildTogether: "yes",
      },
    ],
    [
      "municipality",
      {
        marriedToOtherParty: "no",
        cohabitationStart: "2018-01",
        cohabitationEnd: "2025-08",
        haveChildTogether: "yes",
        caseInvolvesChildren: "yes",
      },
    ],
  ];

  let sawPair = false;
  let sawOther = false;
  for (const homeCity of ["", "Ottawa"]) {
    for (const [label, answers] of steps) {
      const html = render({ ...base, ...answers }, homeCity);
      const question = /data-question="([^"]+)"/.exec(html)?.[1] ?? "(none)";
      const labels = new Set(
        [
          ...html.matchAll(
            /<span class="font-semibold text-\[#10231f\]">([^<]+)<\/span>/g,
          ),
        ].map((m) => m[1].trim()),
      );
      // Quoted box names in the card's notes (outside the person's own words "You wrote: ...").
      const notes = [
        ...html.matchAll(
          /<p data-testid="triage-(?!story-quote)[a-z-]+"[^>]*>([\s\S]*?)<\/p>/g,
        ),
      ].map((m) => m[1]);
      const named = notes.flatMap((note) =>
        [...note.matchAll(/“([^”]+)”/g)].map((m) => m[1]),
      );
      const missing = named.filter((name) => !labels.has(name));
      if (question === "municipalities") sawPair = true;
      if (question === "other-party-municipality") sawOther = true;
      check(
        `${label}, Home city "${homeCity}" (${question}): every box a note names is shown`,
        missing.length === 0,
        `named but not shown: ${missing.join(", ")}; boxes: ${[...labels].join(", ") || "none"}`,
      );
    }
  }
  check(
    "setup: the card asked the other person's municipality (Home city given)",
    sawOther,
  );
  check("setup: the card asked both municipalities (no Home city)", sawPair);

  console.log(
    failures
      ? `\n${failures} check(s) failed.`
      : "\nEvery Family situation question names only the boxes it shows.",
  );
  process.exit(failures ? 1 : 0);
}
void main();
