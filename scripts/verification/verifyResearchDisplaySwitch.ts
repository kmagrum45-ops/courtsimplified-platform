/**
 * RESEARCH_STEP=off hides the research SAVED with a case, on every page that shows it.
 *
 * WHAT IT CATCHES (2026-10-29): the owner set RESEARCH_STEP=off on production
 * and "What we looked into" still showed on their live case. The switch only
 * stopped NEW research (courtSimplifiedBrain.ts); the research saved in
 * master_result.intakeAnalysis.research is read from the database by client
 * pages and was shown whatever the switch said. This suite fails if:
 *   - with RESEARCH_STEP=off, "What we looked into" or the "The law behind
 *     this" lines built from it render for a case with saved research, on the
 *     builder results or the case page, in Small Claims, civil or Family;
 *   - with the switch on, they stop rendering (so the check fails both ways,
 *     and a change that simply deleted the section would fail too);
 *   - the switch is read in the browser (where a server-only variable is
 *     undefined) instead of by the server layouts above /builder and /cases;
 *   - the saved research is removed from the case rather than hidden.
 *
 * How: each page's real server layout (app/builder/layout.tsx,
 * app/cases/layout.tsx) is called with the environment set, and the real
 * IntelligenceOverviewPanel is rendered inside it with a saved analysis that
 * carries research. Where a layout does not exist (main before this fix), the
 * panel is rendered as those pages rendered it, which is how the suite shows
 * the leak. Stand-in data only; costs nothing.
 *
 * Run: npm run test:research-display-switch
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// The panel imports the browser Supabase client, which needs a URL to load; a stand-in, never contacted.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "stand-in-anon-key";
let IntelligenceOverviewPanel: typeof import("../../app/builder/_components/IntelligenceOverviewPanel").default;
import type { AnalysisResult } from "../../app/builder/_components/builderTypes";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const read = (relative: string) => readFileSync(path.join(ROOT, relative), "utf8");

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

// Stand-ins: invented words, never shown to anyone.
const QUESTION = "STAND-IN research question about the stand-in act?";
const PROVISION = {
  id: "standin-act-s1",
  label: "Legislation: Stand-in Act -- s. 1",
  citation: "Stand-in Act, s. 1",
  text: "STAND-IN provision words for the display test.",
  sourceUrl: "https://www.ontario.ca/laws/statute/standin",
  checkedOn: "2026-10-29",
  quote: "STAND-IN provision words",
};
const APPLIED = {
  id: "standin-applied-s2",
  label: "Legislation: Stand-in Act -- s. 2",
  citation: "Stand-in Act, s. 2",
  text: "STAND-IN applied law words.",
  sourceUrl: "https://www.ontario.ca/laws/statute/standin2",
  checkedOn: "2026-10-29",
};

function savedAnalysis(courtPath: "small-claims" | "civil" | "family"): AnalysisResult {
  return {
    courtPath,
    caseStage: "not-sure",
    completedForms: [], receivedForms: [], requiredNextForms: [], notNeededNow: [],
    detectedIssues: [], inferredFacts: [], missingInformation: [], risksAndGaps: [], guidance: [], summary: "",
    research: { rounds: 1, sourceRequests: [], findings: [{ question: QUESTION, status: "answered", provisions: [PROVISION] }] },
    appliedLaw: [APPLIED],
  } as unknown as AnalysisResult;
}

type Layout = (props: { children: ReactNode }) => ReactElement;
async function layoutAt(relative: string): Promise<Layout | null> {
  const file = path.join(ROOT, relative);
  if (!existsSync(file)) return null;
  return ((await import(pathToFileURL(file).href)) as { default: Layout }).default;
}

function render(layout: Layout | null, analysis: AnalysisResult, env: string | undefined): string {
  const before = process.env.RESEARCH_STEP;
  if (env === undefined) delete process.env.RESEARCH_STEP;
  else process.env.RESEARCH_STEP = env;
  try {
    const panel = createElement(IntelligenceOverviewPanel, { analysis, intake: null });
    return renderToStaticMarkup(layout ? layout({ children: panel }) : panel);
  } finally {
    if (before === undefined) delete process.env.RESEARCH_STEP;
    else process.env.RESEARCH_STEP = before;
  }
}

const shows = (html: string) => ({
  lookedInto: html.includes("What we looked into") || html.includes('data-testid="research-findings"') || html.includes(QUESTION),
  lawBehindLines: html.includes('data-testid="law-behind-lines"'),
  applied: html.includes("STAND-IN applied law words."),
});

async function main() {
  IntelligenceOverviewPanel = (await import("../../app/builder/_components/IntelligenceOverviewPanel")).default;
  const routes: Array<{ name: string; layout: string; page: string; source: RegExp }> = [
    // The builder results show the analysis of the run (all three courts: /builder?court=...).
    { name: "builder results", layout: "app/builder/layout.tsx", page: "app/builder/page.tsx", source: /<IntelligenceOverviewPanel analysis=\{analysis\}/ },
    // The case page shows the analysis saved with the case.
    { name: "case page", layout: "app/cases/layout.tsx", page: "app/cases/[id]/page.tsx", source: /const analysis = asRecord\(master\.intakeAnalysis\)[\s\S]*<IntelligenceOverviewPanel analysis=\{analysis\}/ },
  ];
  for (const route of routes) {
    console.log(`\n${route.name}`);
    check(`${route.page} renders IntelligenceOverviewPanel from the analysis (the path tested here)`, route.source.test(read(route.page)));
    const layout = await layoutAt(route.layout);
    for (const court of ["small-claims", "civil", "family"] as const) {
      const analysis = savedAnalysis(court);
      const off = shows(render(layout, analysis, "off"));
      check(`${court}, RESEARCH_STEP=off: "What we looked into" is not shown for saved research`, !off.lookedInto);
      check(`${court}, RESEARCH_STEP=off: no "The law behind this" lines built from the research`, !off.lawBehindLines);
      check(`${court}, RESEARCH_STEP=off: law the analysis cited (APPLIED_LAW) still shows`, off.applied);
      for (const value of [undefined, "on"]) {
        const on = shows(render(layout, analysis, value));
        check(`${court}, RESEARCH_STEP=${value ?? "(unset)"}: "What we looked into" and its lines show as before`, on.lookedInto && on.lawBehindLines);
      }
      check(`${court}: the saved research is left on the case (hidden, not deleted)`, analysis.research?.findings.length === 1);
    }
  }

  console.log("\nthe switch is decided on the server");
  for (const layoutFile of ["app/builder/layout.tsx", "app/cases/layout.tsx"]) {
    const text = existsSync(path.join(ROOT, layoutFile)) ? read(layoutFile) : "";
    check(`${layoutFile} is a server layout that reads the switch per request`, Boolean(text) && !/^["']use client["']/m.test(text) && /displaySwitchesFromEnv\(\)/.test(text) && /export const dynamic = "force-dynamic"/.test(text));
  }
  const panel = read("app/builder/_components/IntelligenceOverviewPanel.tsx");
  check("the panel never reads RESEARCH_STEP in the browser (it is undefined there)", !/RESEARCH_STEP|researchStepEnabled/.test(panel));

  if (failures) {
    console.log(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll research display switch checks passed.");
}

void main();
