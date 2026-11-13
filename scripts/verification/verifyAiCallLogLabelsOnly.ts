/**
 * THE AI CALL LOG HOLDS LABELS, COUNTS AND TIMES ONLY (site owner, 11 Nov 2026, option (a): "Store kind of request,
 * model, token counts, times and result status. Never store story text, quotes, names or model output, in any column,
 * including structured_output").
 *
 * A real logged call (src/lib/audit/aiCallLog.ts, through withAiCallContext and observeAiCall, written to a stand-in
 * database client) whose request carries a story with a name and an amount, whose model answer repeats that story, a
 * quote and a name, and whose caller records a detail naming the person. Checks:
 *   1. no text column of the written row holds any of the story's or the answer's words (any run of four words), or
 *      the name;
 *   2. structured_output holds the token counts only (input, cached input, output: numbers), never the model's output;
 *   3. a validation detail that is not a short label (a sentence, a quote) is not stored as written;
 *   4. every caller of recordAiValidation passes a fixed label, or one built from codes (a static scan), so the detail
 *      can never carry a person's words;
 *   5. the privacy page says what the records hold and that they never hold the story, names or what the AI wrote.
 *
 * WHAT FAILURE THIS CATCHES: a person's words, or the AI's words about them, kept in the audit log.
 *
 * Run: npm run test:ai-call-log-labels-only
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { observeAiCall, recordAiValidation, setAiCallLogClientFactory, withAiCallContext } from "../../src/lib/audit/aiCallLog";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const NAME = "Alder Testplum";
const STORY = `Synthetic: my neighbour ${NAME} cut down my maple tree on October 4, 2026 and I got a quote for 1500 to replace it.`;
const ANSWER = JSON.stringify({ summary: `You say ${NAME} cut down your tree.`, quote: "cut down my maple tree", amount: "1500", label: "vandalism", reason: "the story says the neighbour cut the tree" });

async function main() {
  const rows: Record<string, unknown>[] = [];
  const restore = setAiCallLogClientFactory((() => ({ from: () => ({ insert: (row: Record<string, unknown>) => { rows.push(row); return Promise.resolve({ error: null }); } }) })) as never);
  const saved = { ...process.env };
  process.env.AI_CALL_LOG = "database";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:1";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
  try {
    await withAiCallContext({ callType: "stage-resolver", caseId: "labels-only-test" }, async () => {
      await observeAiCall({ model: "gpt-5.5", messages: [{ role: "user", content: STORY }] }, async () => ({
        model: "gpt-5.5",
        choices: [{ message: { content: ANSWER } }],
        usage: { prompt_tokens: 812, completion_tokens: 140, prompt_tokens_details: { cached_tokens: 300 } },
      }));
      recordAiValidation("invalid", `the person ${NAME} said "cut down my maple tree"`);
    });
  } finally {
    restore();
    process.env = saved;
  }
  check("setup: one row written", rows.length === 1, `${rows.length} rows`);
  const row = rows[0] ?? {};
  const texts = Object.entries(row).flatMap(([key, value]) => (typeof value === "string" ? [[key, value]] : value && typeof value === "object" ? [[key, JSON.stringify(value)]] : [])) as [string, string][];
  const words = `${STORY} ${ANSWER}`.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const runs = new Set(words.slice(0, -3).map((_, index) => words.slice(index, index + 4).join(" ").toLowerCase()));
  const leaked = texts.filter(([, text]) => {
    const flat = text.replace(/[^A-Za-z0-9 ]/g, " ").replace(/\s+/g, " ").toLowerCase();
    return flat.includes(NAME.toLowerCase()) || [...runs].some((run) => flat.includes(run));
  });
  check("1. no text column holds the story's or the answer's words, or the name", leaked.length === 0, leaked.map(([key, text]) => `${key}: ${text.slice(0, 120)}`).join("\n      "));
  check("2. structured_output holds the token counts only", JSON.stringify(row.structured_output) === JSON.stringify({ input_tokens: 812, cached_input_tokens: 300, output_tokens: 140 }), JSON.stringify(row.structured_output));
  check("3. a detail that is not a short label is not stored as written", typeof row.validation_detail !== "string" || !/Testplum|maple/i.test(row.validation_detail as string), String(row.validation_detail));

  // 4. Every caller's detail: a fixed string, null, or a template built from codes only.
  const ALLOWED_PARTS = new Set(["stage.stageId", "stage.confidence", "resolved.kind", "stage.kind", "stage ? ` / ${stage.kind}` : \"\""]);
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full, out);
      else if (/\.(ts|tsx)$/.test(name)) out.push(full);
    }
    return out;
  };
  const loose: string[] = [];
  for (const file of [...walk("app"), ...walk("src")].filter((file) => !/aiCallLog.ts$/.test(file))) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/recordAiValidation\(\s*([\s\S]*?)\);/g)) {
      if (/export function recordAiValidation/.test(text.slice(Math.max(0, match.index! - 40), match.index))) continue;
      const args = match[1];
      const detail = args.slice(args.indexOf(",") + 1).trim();
      const templateParts = [...detail.matchAll(/\$\{([^}]*(?:\}[^}]*)?)\}/g)].map((part) => part[1].trim());
      const fixed = /^(null|"[^"]*"|'[^']*'|[^,]*\?\s*null\s*:\s*"[^"]*"|[^,]*\?\s*"[^"]*"\s*:\s*null)$/.test(detail.replace(/\s+/g, " "));
      const codes = templateParts.length > 0 && templateParts.every((part) => [...ALLOWED_PARTS].some((allowed) => part.includes(allowed.split(" ")[0])));
      const reasonOfCode = /^validated\.reason$/.test(detail) && /reason: ("[^"]*"|`[^`$]*`)/.test(readFileSync("src/lib/case-workspace/aiAnalysis.ts", "utf8"));
      if (!fixed && !codes && !reasonOfCode && !/^undefined$/.test(detail)) loose.push(`${file}: ${detail.replace(/\s+/g, " ").slice(0, 100)}`);
    }
  }
  check("4. every caller records a fixed label, or one built from codes", loose.length === 0, loose.join("\n      "));

  const privacy = readFileSync("app/privacy/page.tsx", "utf8");
  check("5. the privacy page says what the AI request records hold", /Records of AI requests/.test(privacy) && /token|how much text/i.test(privacy) && /never (?:contain|hold)/i.test(privacy));
  check("5. it never claims zero retention", !/zero[- ]retention/i.test(privacy));

  console.log(failures ? `\n${failures} check(s) failed.` : "\nThe AI call log: labels, counts and times only.");
  process.exit(failures ? 1 : 0);
}
void main();
