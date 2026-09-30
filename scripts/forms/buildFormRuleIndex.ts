/**
 * Builds src/lib/content-library/forms/formRuleIndex.json: every form in the
 * official table of forms of the three court rules, with the rule text that
 * names it.
 *
 *   node --import tsx scripts/forms/buildFormRuleIndex.ts
 *
 * WHY (2026-09-30). The forms page listed 356 forms from the database, and its
 * "purpose" column repeated the title for every one of them. The regulations
 * themselves say what each form is for: the rule that calls for "a defence
 * (Form 9A)" is the explanation of Form 9A. This reads the three vendored
 * regulations (docs/sources/corpus, e-Laws copies; see manifest.json) and
 * records, for each form in each regulation's own TABLE OF FORMS, every rule
 * provision that names it, verbatim.
 *
 * Nothing here is written by hand or by a model. test:form-explanations checks
 * that every quote is still in the corpus and names its form.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

type Court = "small-claims" | "civil" | "family";

const SOURCES: Record<Court, { file: string; citation: string; url: string; formsPage: string }> = {
  "small-claims": {
    file: "docs/sources/corpus/oreg-258-98-small-claims-rules.txt",
    citation: "Rules of the Small Claims Court, O. Reg. 258/98",
    url: "https://www.ontario.ca/laws/regulation/980258",
    formsPage: "https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/",
  },
  civil: {
    file: "docs/sources/corpus/rules-of-civil-procedure.txt",
    citation: "Rules of Civil Procedure, R.R.O. 1990, Reg. 194",
    url: "https://www.ontario.ca/laws/regulation/900194",
    formsPage: "https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/",
  },
  family: {
    file: "docs/sources/corpus/family-law-rules.txt",
    citation: "Family Law Rules, O. Reg. 114/99",
    url: "https://www.ontario.ca/laws/regulation/990114",
    formsPage: "https://ontariocourtforms.on.ca/en/family-law-rules-forms/",
  },
};

export type FormMention = { rule: string; quote: string };
export type IndexedForm = {
  court: Court;
  number: string;
  title: string;
  dateOfForm: string;
  revoked: boolean;
  mentions: FormMention[];
};

const TOKEN = String.raw`\d+[A-Z]?(?:\.\d+)*[A-Z]?(?:\.\d+)?`;
const MENTION = new RegExp(String.raw`Forms?\s+(${TOKEN}(?:\s*(?:,|or|and|to)\s*${TOKEN})*)`, "g");
const MAX_MENTIONS = 3;
const MAX_QUOTE = 420;

function tableOfForms(text: string): { body: string; rows: Omit<IndexedForm, "court" | "mentions">[] } {
  const heads = [...text.matchAll(/^\s{10,}table of forms\s*$/gim)];
  const at = heads[heads.length - 1].index!;
  const rows: Omit<IndexedForm, "court" | "mentions">[] = [];
  let current: (typeof rows)[number] | null = null;
  for (const line of text.slice(at).split("\n").slice(1)) {
    if (!line.startsWith("|")) {
      if (rows.length > 5 && line.trim()) break;
      continue;
    }
    const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
    const [number, title = "", date = ""] = cells;
    if (/^form/i.test(number) || /^number$/i.test(number)) continue;
    if (number) {
      current = { number, title, dateOfForm: date, revoked: false };
      rows.push(current);
    } else if (current) {
      current.title = `${current.title} ${title}`.trim();
      current.dateOfForm = `${current.dateOfForm} ${date}`.trim();
    }
  }
  for (const row of rows) {
    row.revoked = /^revoked/i.test(row.title) || /^revoked/i.test(row.number);
    row.title = row.title.replace(/\s+/g, " ");
    row.dateOfForm = row.dateOfForm.replace(/\s+/g, " ");
  }
  return { body: text.slice(0, at), rows };
}

/**
 * Splits the regulation into provisions, each labelled with its rule number
 * ("r. 9.01", "r. 10 (1)", "r. 14.01 (2)"). A provision runs from one rule or
 * subrule marker to the next.
 */
function provisions(body: string): { rule: string; text: string }[] {
  const out: { rule: string; text: string }[] = [];
  let rule = "";
  let current: { rule: string; lines: string[] } | null = null;
  const ruleWithSub = /^\s+(\d+(?:\.\d+)*)\.?\s+\((\d+(?:\.\d+)?)\)\s/;
  const ruleOnly = /^\s+(\d+\.\d+(?:\.\d+)?)\s{2,}\S/;
  const subOnly = /^\s+\((\d+(?:\.\d+)?)\)\s/;
  const flush = () => {
    if (current) out.push({ rule: current.rule, text: current.lines.join(" ").replace(/\s+/g, " ").trim() });
  };
  // Rule numbers only move forward through a regulation. A "number" that
  // jumps backwards, or far ahead, is a numbered paragraph inside a rule
  // ("1.1 The notice of motion shall be in Form 37A." inside rule 61), not a
  // new rule, and must not relabel what follows.
  let major = 0;
  const plausible = (candidate: string) => {
    const next = Number.parseInt(candidate, 10);
    return major === 0 || (next >= major && next <= major + 6);
  };
  for (const line of body.split("\n")) {
    let label: string | null = null;
    let m = line.match(ruleWithSub);
    if (m && plausible(m[1])) {
      rule = m[1];
      major = Number.parseInt(rule, 10);
      label = `r. ${rule} (${m[2]})`;
    } else if ((m = line.match(ruleOnly)) && plausible(m[1])) {
      rule = m[1];
      major = Number.parseInt(rule, 10);
      label = `r. ${rule}`;
    } else if (rule && (m = line.match(subOnly))) {
      label = `r. ${rule} (${m[1]})`;
    }
    if (label) {
      flush();
      current = { rule: label, lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  flush();
  return out;
}

/** The sentence around a mention, verbatim (whitespace collapsed), at most MAX_QUOTE characters. */
function quoteAround(text: string, index: number, length: number): string {
  let start = text.lastIndexOf(". ", index);
  start = start === -1 ? 0 : start + 2;
  let end = text.indexOf(". ", index + length);
  end = end === -1 ? text.length : end + 1;
  // Drop the amendment history that ends each provision ("O. Reg. 78/06, s. 5.")
  let quote = text.slice(start, end).replace(/\s*(?:O\. Reg\.|R\.R\.O\.)\s[\s\S]*$/, "").trim();
  if (quote.length > MAX_QUOTE) {
    // The window must contain the whole mention ("Form 64C)", the number
    // included): cutting just after the word "Form" produced 14 quotes that
    // no longer named their form (caught by test:form-explanations).
    const mentionStart = index - start;
    const mentionEnd = mentionStart + length;
    const from = Math.max(0, mentionStart - 160);
    const to = Math.max(from + MAX_QUOTE, mentionEnd + 1);
    const cut = quote.slice(from, to);
    const firstSpace = from === 0 ? 0 : cut.indexOf(" ") + 1;
    const lastSpace = to >= quote.length ? cut.length : cut.lastIndexOf(" ");
    quote = cut.slice(firstSpace, lastSpace > mentionEnd - from ? lastSpace : cut.length).trim();
  }
  return quote;
}

/**
 * The form numbers a "Form 8, 8A or 8B.1" / "Forms 64B to 64D" list names.
 * "to" is a range: 64B to 64D is 64B, 64C and 64D.
 */
export function formsInList(list: string): string[] {
  const parts = list.match(new RegExp(`${TOKEN}|\\bto\\b`, "g")) || [];
  const out: string[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    if (parts[i] === "to" && out.length && parts[i + 1]) {
      const from = out[out.length - 1].match(/^(.*?)([A-Z])$/);
      const to = parts[i + 1].match(/^(.*?)([A-Z])$/);
      if (from && to && from[1] === to[1]) {
        for (let code = from[2].charCodeAt(0) + 1; code < to[2].charCodeAt(0); code += 1) {
          out.push(from[1] + String.fromCharCode(code));
        }
      }
      continue;
    }
    out.push(parts[i]);
  }
  return out;
}

export function buildIndex(root = process.cwd()): Record<Court, IndexedForm[]> {
  const result = {} as Record<Court, IndexedForm[]>;
  for (const court of Object.keys(SOURCES) as Court[]) {
    const text = readFileSync(path.join(root, SOURCES[court].file), "utf8");
    const { body, rows } = tableOfForms(text);
    const provs = provisions(body);
    const mentions = new Map<string, FormMention[]>();
    for (const prov of provs) {
      for (const match of prov.text.matchAll(MENTION)) {
        const numbers = formsInList(match[1]);
        for (const number of numbers) {
          const list = mentions.get(number) || [];
          if (list.length >= MAX_MENTIONS || list.some((m) => m.rule === prov.rule)) continue;
          list.push({ rule: prov.rule, quote: quoteAround(prov.text, match.index!, match[0].length) });
          mentions.set(number, list);
        }
      }
    }
    result[court] = rows.map((row) => ({
      court,
      ...row,
      mentions: row.revoked ? [] : mentions.get(row.number) || [],
    }));
  }
  return result;
}

export const FORM_SOURCES = SOURCES;

if (process.argv[1] && process.argv[1].endsWith("buildFormRuleIndex.ts")) {
  const index = buildIndex();
  const out = path.join(process.cwd(), "src/lib/content-library/forms/formRuleIndex.json");
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(
    out,
    JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), sources: SOURCES, forms: index }, null, 1) + "\n",
  );
  for (const [court, forms] of Object.entries(index)) {
    const live = forms.filter((f) => !f.revoked);
    console.log(`${court}: ${live.length} forms, ${live.filter((f) => f.mentions.length).length} named in a rule`);
  }
  console.log(`written to ${path.relative(process.cwd(), out)}`);
}
