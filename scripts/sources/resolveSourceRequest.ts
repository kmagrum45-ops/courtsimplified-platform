/**
 * Turns a law the research step said the library lacks ("Statutory Accident
 * Benefits Schedule, O. Reg. 34/10") into a corpus declaration with an
 * official URL, and appends it to scripts/rules/requestedSources.json.
 *
 *   npx tsx scripts/sources/resolveSourceRequest.ts "<law name>"
 *
 * Prints one line: `id=<id>` when a new declaration was written,
 * `in-library=<id>` when the law is already vendored, or `unresolved=<why>`.
 *
 * WHY A MODEL MAY PROPOSE THE URL. Mapping a statute's name to its e-Laws
 * code (90h08) or its Justice Laws path (acts/C-46) is a lookup a model does
 * well and a person does slowly. It is safe because nothing it proposes is
 * trusted: the URL must be on ontario.ca/laws/docs or laws-lois.justice.gc.ca,
 * and the fetch keeps the document only if its text contains the title the
 * model named and, for e-Laws, "CONSOLIDATION PERIOD" (the current version,
 * never a historical one) -- fetchCorpus.ts's mustContain check. A wrong guess
 * fails the fetch and nothing is vendored.
 *
 * Run by .github/workflows/courtsimplified-source-requests.yml (it has the
 * key and can reach both sites; this workspace can reach neither).
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { CorpusSource } from "../rules/corpusSources";

const ROOT = process.cwd();
const REQUESTED = path.join(ROOT, "scripts", "rules", "requestedSources.json");
const MANIFEST = path.join(ROOT, "docs", "sources", "corpus", "manifest.json");

export type Proposal = {
  title: string;
  citation: string;
  jurisdiction: "ontario" | "canada";
  /** e-Laws document code: "90h08" for R.S.O. 1990, c. H.8; "100034" for O. Reg. 34/10. */
  elawsCode?: string;
  /** Justice Laws path: "acts/C-46", "regulations/SOR-97-175", or "Const" (the Constitution Acts, which hold the Charter). */
  justiceLawsPath?: string;
};

const SYSTEM = `You map the name of a Canadian or Ontario law to its official online text. Return JSON only:
{"title": "<the law's exact short title as printed at the top of the official text>", "citation": "<e.g. R.S.O. 1990, c. H.8 or O. Reg. 34/10 or R.S.C. 1985, c. C-46>", "jurisdiction": "ontario" | "canada", "elawsCode": "<for Ontario: the e-Laws document code, e.g. 90h08 for R.S.O. 1990, c. H.8, 02l24 for S.O. 2002, c. 24, Sched. B, 100034 for O. Reg. 34/10>", "justiceLawsPath": "<for federal: acts/C-46 or regulations/SOR-97-175; for the Constitution Acts, including the Canadian Charter of Rights and Freedoms, exactly Const>"}
If you do not know the code or path with confidence, omit it.`;

/** Kebab-case id from a title. Pure; exported for the suite. */
export function idFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
}

/**
 * The declaration for a proposal, or why there is none. Only the two official
 * hosts, only well-formed codes. Pure; exported for the suite.
 */
export function declarationFor(proposal: Proposal, requestedAs: string): CorpusSource | { unresolved: string } {
  // The short title only: "Statutory Accident Benefits Schedule - Effective
  // September 1, 2010" is printed with an en dash in e-Laws and a hyphen in a
  // model's answer, and the marker check is exact (first run, 2026-10-05:
  // resolved to the right document, failed on the dash).
  const title = (proposal.title || "").replace(/\s+/g, " ").trim().split(/\s[-–—]\s|,|\(/)[0].trim();
  if (title.length < 4) return { unresolved: "no title" };
  const id = idFromTitle(title);
  if (proposal.jurisdiction === "ontario" && proposal.elawsCode && /^[0-9]{2}[a-z][0-9]{2}$|^[0-9]{6}$/.test(proposal.elawsCode)) {
    return {
      id,
      title,
      citation: (proposal.citation || "").trim(),
      url: `https://www.ontario.ca/laws/docs/${proposal.elawsCode}_e.doc`,
      format: "elaws-doc",
      mustContain: [title.toUpperCase(), "CONSOLIDATION PERIOD"],
      why: `Named as missing by the research step ("${requestedAs.slice(0, 160)}").`,
    };
  }
  if (proposal.jurisdiction === "canada" && proposal.justiceLawsPath && /^(acts\/[A-Z0-9.-]+|regulations\/[A-Z0-9.-]+|Const)$/.test(proposal.justiceLawsPath)) {
    return {
      id,
      title,
      citation: (proposal.citation || "").trim(),
      url: `https://laws-lois.justice.gc.ca/eng/${proposal.justiceLawsPath}/FullText.html`,
      format: "html",
      mustContain: [title],
      // The Constitution Acts page prints the 1867 and 1982 Acts together;
      // the Charter is Part I of the 1982 Act. Kept alone so its sections are
      // numbered as its own (see CorpusSource.section).
      ...(proposal.justiceLawsPath === "Const" && /charter/i.test(title)
        ? { section: { from: "PART I Canadian Charter of Rights and Freedoms", to: "PART II Rights of the Aboriginal Peoples" } }
        : {}),
      why: `Named as missing by the research step ("${requestedAs.slice(0, 160)}").`,
    };
  }
  return { unresolved: "no official code or path proposed" };
}

async function propose(name: string): Promise<Proposal | null> {
  const { createOpenAIClient } = await import("../../src/lib/case-system/openaiClient");
  const { modelParams } = await import("../../src/lib/case-system/aiModels");
  const client = createOpenAIClient();
  const response = await client.chat.completions.create({
    ...modelParams("standard", { temperature: 0 }),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: name.slice(0, 300) },
    ],
  });
  try {
    return JSON.parse(response.choices[0]?.message?.content ?? "") as Proposal;
  } catch {
    return null;
  }
}

async function main() {
  const name = (process.argv[2] || "").trim();
  if (!name) {
    console.log("unresolved=no name given");
    return;
  }
  const proposal = await propose(name);
  if (!proposal) {
    console.log("unresolved=no proposal");
    return;
  }
  const declaration = declarationFor(proposal, name);
  if ("unresolved" in declaration) {
    console.log(`unresolved=${declaration.unresolved}`);
    return;
  }
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as { entries: { id: string; url: string }[] };
  const already = manifest.entries.find((entry) => entry.url === declaration.url || entry.id === declaration.id);
  if (already) {
    console.log(`in-library=${already.id}`);
    return;
  }
  const requested = JSON.parse(readFileSync(REQUESTED, "utf8")) as CorpusSource[];
  if (!requested.some((entry) => entry.id === declaration.id)) {
    requested.push(declaration);
    writeFileSync(REQUESTED, `${JSON.stringify(requested, null, 2)}\n`);
  }
  console.log(`id=${declaration.id}`);
}

const isDirect = process.argv[1] && /resolveSourceRequest\.ts$/.test(process.argv[1]);
if (isDirect) void main();
