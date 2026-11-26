/**
 * NAMES, ADDRESSES, PHONE NUMBERS AND EMAILS ARE NEVER SENT TO OPENAI (site owner, 14 Nov 2026, rule 3). They are put
 * into a form only at render time, on the server, from the case record (POST /api/cases/forms/filled).
 *
 * What it asserts, with no browser, database or network (a fake model stands in; nothing reaches OpenAI):
 *   1. BUILD CHECK: no AI request builder (server code in src/ or a route in app/api/ that can reach the AI client,
 *      openaiClient.ts, found by walking the imports backwards, so the answer does not depend on the order files are
 *      visited) can read the parties: it does not import the parties
 *      record, the form maps, the filled-form route's pieces or the parties writer, and reads no `.parties` of a case
 *      file. The label layer (security/requestNames.ts) is the one declared exception: it reads the record to hide it.
 *      Self-tests: a planted read is found; a declared exception that no longer reads the record is stale;
 *   2. in all three courts, a saved case with a fake party (a name, street, postal code, phone, email and a
 *      representative that appear nowhere else) run through the confirmed-guidance gate, whose handler sends the fake
 *      details in a story to the model: none of the fake strings is in anything sent (create, parse, embeddings), each
 *      is sent as its label, and the reply the person sees has them put back;
 *   3. the filled form does hold them (the negative control: the detail is there to be found, so a detector that stopped
 *      matching would fail here).
 *
 * WHAT FAILURE THIS CATCHES: an AI request builder that starts reading party details, or a party detail the label layer
 * does not know.
 *
 * Run: npm run test:parties-never-to-ai
 */
import fs from "node:fs";
import path from "node:path";
import { forceNoStore } from "../../src/lib/case-system/openaiClient";
import { withConfirmedGuidance } from "../../src/lib/security/intakeGuidanceGate";
import { remainingEssentialQuestions, transitionReview } from "../../src/lib/case-system/intakeReview";
import { fillForm, pdfValues } from "../../src/lib/case-system/forms/formMap";
import { FORM_7A } from "../../src/lib/case-system/forms/maps/form7A";
import { FILED_BY, FORM_MAPS } from "../../src/lib/case-system/forms/maps";
import { formContextOf } from "../../src/lib/case-system/forms/formContext";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import type { PartiesRecord } from "../../src/lib/case-system/parties/parties";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`); if (!ok) failures += 1; };

// ---- 1. Build check ---------------------------------------------------------------------------------------------
const ROOT = path.resolve(__dirname, "..", "..");
const CLIENT = path.join(ROOT, "src", "lib", "case-system", "openaiClient.ts");
/** Reads of the parties a file may not make if it can reach the AI client. */
export const PARTY_READS: [string, RegExp][] = [
  ["the parties record", /from\s+["'][^"']*\/parties\/parties["']/],
  ["the form maps or the filled form", /from\s+["'][^"']*\/forms\/(?:formContext|formMap|maps(?:\/[^"']*)?|officialPdf|partyBoxes)["']/],
  ["the parties writer", /\bwriteParties\b/],
  ["a case file's parties", /\.parties\.(?:list|recorded)\b|\bfile\.parties\b|\bpartiesByRole\(|\bpartyName\(/],
];
/** The label layer: reads the record only to hide it from the model. */
const LABEL_LAYER = new Map<string, string>([[path.join("src", "lib", "security", "requestNames.ts"), "the label layer: every party detail becomes a label the AI client sends instead"]]);

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) out.push(full);
  }
  return out;
}
const resolveFrom = (from: string, spec: string): string | null => {
  const base = spec.startsWith("@/") ? path.join(ROOT, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  return null;
};
/** Every file whose imports (type imports included) reach the AI client: a walk backwards from the client. */
export function filesReachingClient(files: readonly string[]): Set<string> {
  const importedBy = new Map<string, string[]>();
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    // A bare `import "x";` (no `from`) loads x too: followed as well (Lane B, 15 Nov 2026: a planted one went unseen).
    for (const match of text.matchAll(/(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|(?:^|;|\n)\s*import\s+["']([^"']+)["']/g)) {
      const target = resolveFrom(file, match[1] ?? match[2] ?? match[3]);
      if (target) importedBy.set(target, [...(importedBy.get(target) ?? []), file]);
    }
  }
  const reached = new Set<string>([CLIENT]);
  const queue = [CLIENT];
  while (queue.length) for (const parent of importedBy.get(queue.pop()!) ?? []) if (!reached.has(parent)) { reached.add(parent); queue.push(parent); }
  return reached;
}
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
export function partyReadsIn(text: string): string[] {
  return PARTY_READS.filter(([, pattern]) => pattern.test(code(text))).map(([what]) => what);
}

const files = [...sourceFiles(path.join(ROOT, "app")), ...sourceFiles(path.join(ROOT, "src"))];
// The AI request builders: server code that can reach the client (src/, and the routes in app/api/). A screen runs in the
// browser and cannot call the client; what it sends goes through a route, which is checked here.
const API = path.join(ROOT, "app", "api") + path.sep;
const SRC = path.join(ROOT, "src") + path.sep;
const reaching = new Set([...filesReachingClient(files)].filter((file) => file.startsWith(API) || file.startsWith(SRC)));
check("1. setup: the walk finds the AI client's callers (understandCase, the brain, the case reader)", ["understandCase.ts", "courtSimplifiedBrain.ts", "caseReaderModel.ts"].every((name) => [...reaching].some((file) => file.endsWith(name))), `${reaching.size} files`);
const offenders = [...reaching].map((file) => [path.relative(ROOT, file), partyReadsIn(fs.readFileSync(file, "utf8"))] as const).filter(([file, reads]) => reads.length && !LABEL_LAYER.has(file));
check("1. no file that can reach the AI client reads party details", offenders.length === 0, offenders.map(([file, reads]) => `${file}: ${reads.join(", ")}`).join(" | "));
// Every form map and the code that fills them (forms/, every form added there included) fills on the server only: none
// of it can reach the AI client at all, whatever it reads (Lane B, 15 Nov 2026: the forms after 7A).
const FORMS_DIR = path.join(ROOT, "src", "lib", "case-system", "forms") + path.sep;
const formFiles = files.filter((file) => file.startsWith(FORMS_DIR));
check("1. setup: the forms' code is found (the maps, the filler)", formFiles.some((file) => file.endsWith("officialPdf.ts")) && formFiles.filter((file) => file.includes(`${path.sep}maps${path.sep}`)).length >= FORM_MAPS.length, `${formFiles.length} files`);
const formsReaching = formFiles.filter((file) => reaching.has(file)).map((file) => path.relative(ROOT, file));
check("1. no form map, and nothing that fills a form, can reach the AI client", formsReaching.length === 0, formsReaching.join(" | "));
for (const [file, reason] of LABEL_LAYER) check(`1. the declared exception still reads the record (${file}: ${reason})`, partyReadsIn(fs.readFileSync(path.join(ROOT, file), "utf8")).length > 0, "stale: delete it from LABEL_LAYER");
check("1. self-test: a planted read is found", partyReadsIn(`import { partyName } from "../parties/parties";`).length > 0 && partyReadsIn(`const names = file.parties.list;`).length > 0);
check("1. self-test: a comment naming the record is not a read", partyReadsIn(`// file.parties.list is read by the forms only`).length === 0);

// ---- 2 and 3. A fake party, in every court -----------------------------------------------------------------------
const FAKE = { name: "Quillon Farthingale", company: "Zebrascape Holdings Ltd.", street: "77 Zephyr Crescent", postal: "K9Z 9Z9", phone: "613-555-0987", email: "quillon@farthingale.example", rep: "Orsolya Vantablack", repPhone: "416-555-0321", repEmail: "orsolya@vantablack.example" };
const PARTIES: PartiesRecord = {
  version: 1, declined: [],
  list: [
    { id: "you", you: true, side: "yours", kind: "person", details: { fullName: FAKE.name, street: FAKE.street, city: "Ottawa", province: "ON", postalCode: FAKE.postal, phone: FAKE.phone, email: FAKE.email }, unsure: [] },
    { id: "d1", side: "other", kind: "company", details: { companyName: FAKE.company, repName: FAKE.rep, repPhone: FAKE.repPhone, repEmail: FAKE.repEmail }, unsure: [] },
  ],
};
const SECRETS = Object.values(FAKE);

async function main() {
  for (const court of ["small-claims", "civil", "family"] as const) {
    const caseId = "11111111-1111-4111-8111-11111111161" + ["0", "1", "2"][["small-claims", "civil", "family"].indexOf(court)];
    const revision = "22222222-2222-4222-8222-222222222615";
    const cp: Checkpoint = { version: 1, flowId: caseId, courtPath: court, revision, inputRevision: revision, sections: { story: { text: "Synthetic story with no names.", location: { city: "Ottawa", province: "Ontario" } }, builder: {}, caseFile: { parties: PARTIES } } as never };
    (cp.sections.builder as Record<string, unknown>).initialUnknowns = remainingEssentialQuestions(cp).map((question) => question.id);
    const master: Record<string, unknown> = { intakeCheckpoint: cp, workflowStatus: transitionReview(transitionReview({}, cp, "review", revision, "now"), cp, "confirm", revision, "now"), guidanceInputRevision: revision, intakeData: {} };
    const sent: string[] = [];
    const client = forceNoStore({
      chat: { completions: {
        create: async (body: unknown) => { sent.push(JSON.stringify(body)); return { choices: [{ message: { content: "[you] at [street address 1] wrote to [the other party]." } }], usage: {} }; },
        parse: async (body: unknown) => { sent.push(JSON.stringify(body)); return { choices: [{ message: { content: "{}", parsed: {} } }], usage: {} }; },
      } },
      embeddings: { create: async (body: unknown) => { sent.push(JSON.stringify(body)); return { data: [] }; } },
    } as never) as unknown as { chat: { completions: { create: (body: unknown) => Promise<{ choices: { message: { content: string } }[] }>; parse: (body: unknown) => Promise<unknown> } }; embeddings: { create: (body: unknown) => Promise<unknown> } };
    let reply = "";
    const handler = async () => {
      // Any builder that let a detail through (here, on purpose, all of them in one story).
      const story = `${FAKE.name} of ${FAKE.street}, ${FAKE.postal}, phone ${FAKE.phone}, email ${FAKE.email}, sued ${FAKE.company}; their representative ${FAKE.rep} (${FAKE.repPhone}, ${FAKE.repEmail}).`;
      reply = (await client.chat.completions.create({ model: "x", messages: [{ role: "user", content: story }] })).choices[0].message.content;
      await client.chat.completions.parse({ model: "x", messages: [{ role: "user", content: story }] });
      await client.embeddings.create({ model: "x", input: [story] });
      return Response.json({ ok: true });
    };
    const gated = withConfirmedGuidance(handler, { currentAnalysis: true }, {
      authenticate: async () => ({ id: "44444444-4444-4444-8444-444444444615" }),
      owned: async () => ({ id: caseId, court_path: court, master_result: master }),
      names: async () => ({ id: caseId, court_path: court, master_result: master }),
    });
    const response = await gated(new Request("http://localhost/api/case/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caseId }) }));
    check(`2. ${court}: the route ran`, response.status === 200, String(response.status));
    const all = sent.join("\n");
    const leaked = SECRETS.filter((secret) => all.includes(secret));
    check(`2. ${court}: no fake party detail is in anything sent to the model (create, parse, embeddings)`, sent.length === 3 && leaked.length === 0, `leaked: ${leaked.join(", ")} | ${all.slice(0, 200)}`);
    check(`2. ${court}: each detail is sent as its label`, /\[you\]/.test(all) && /\[the other party\]/.test(all) && /\[street address 1\]/.test(all) && /\[phone number 1\]/.test(all) && /\[email address 1\]/.test(all) && /\[representative 1\]/.test(all), all.slice(0, 300));
    check(`2. ${court}: the person reads their own details back`, reply.includes(FAKE.name) && reply.includes(FAKE.street) && reply.includes(FAKE.company), reply);
    if (court === "small-claims") {
      const values = pdfValues(fillForm(FORM_7A, formContextOf(cp, master)));
      check("3. negative control: the filled form holds the details (the server puts them in, from the record)", Object.values(values).some((value) => value === FAKE.street) && Object.values(values).some((value) => value === FAKE.company), JSON.stringify(values).slice(0, 200));
    }
    // Every other form of this court (Form 1A is filled per copy, from the parties after the first: checked in test:form-maps).
    // A form the responding side files is filled from the same record with that side stated (26 Nov 2026: Form 10A fills
    // the person's own details only when the record says the person is the defendant, so a record with no side holds none).
    for (const map of FORM_MAPS.filter((item) => item.court === court && item.id !== "small-claims/1A" && item.id !== "small-claims/7A")) {
      const record = FILED_BY[map.id] === "responds" ? ({ ...cp, sections: { ...cp.sections, situation: { record: { where: "served", court } } } } as Checkpoint) : cp;
      const text = JSON.stringify(Object.values(pdfValues(fillForm(map, formContextOf(record, master)))));
      check(`3. negative control, ${map.id}: the filled form holds the fake party's details (put in on the server, from the record)`, SECRETS.some((secret) => text.includes(secret)), text.slice(0, 200));
    }
  }
  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
}
void main();
