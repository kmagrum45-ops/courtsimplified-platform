/**
 * Source scanning for the story-data registry check (verifyStoryDataRegistry.ts).
 * Finds, in app/ and src/: the tables written, the master_result keys written,
 * the intake sections used, and the files that touch browser storage directly.
 * Kept apart from the check so its reach is easy to read and to widen.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

export const REPO_ROOT = path.resolve(__dirname, "..", "..");
const ROOTS = ["app", "src"];

export function sourceFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(path.join(REPO_ROOT, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== "node_modules" && !entry.name.startsWith(".")) walk(rel); }
      else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) found.push(rel);
    }
  };
  for (const root of ROOTS) walk(root);
  return found.sort();
}

export const read = (file: string) => fs.readFileSync(path.join(REPO_ROOT, file), "utf8");

/** Tables that some chain starting `.from("table")` writes to (insert, update, upsert or delete). */
export function tablesWritten(files = sourceFiles()): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const file of files) {
    const text = read(file);
    const re = /\.from\(\s*["'`]([a-z_]+)["'`]\s*\)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text))) {
      const rest = text.slice(match.index + match[0].length, match.index + match[0].length + 800);
      const chain = rest.split(/\.from\(|;\s*(?:\r?\n|$)/)[0];
      if (/\.(insert|update|upsert|delete)\(/.test(chain)) out.set(match[1], [...(out.get(match[1]) ?? []), file]);
    }
  }
  return out;
}

/** Every table named in a `.from("table")`, written or read. */
export function tablesNamed(files = sourceFiles()): Set<string> {
  const out = new Set<string>();
  for (const file of files) for (const match of read(file).matchAll(/\.from\(\s*["'`]([a-z_]+)["'`]\s*\)/g)) out.add(match[1]);
  return out;
}

function propertyNames(node: ts.ObjectLiteralExpression, source: ts.SourceFile, seen = new Set<ts.Node>()): string[] {
  if (seen.has(node)) return [];
  seen.add(node);
  const names: string[] = [];
  for (const property of node.properties) {
    if ((ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property) || ts.isMethodDeclaration(property)) && property.name) {
      if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) names.push(property.name.text);
    } else if (ts.isSpreadAssignment(property) && ts.isIdentifier(property.expression)) {
      // A spread of a local object literal (`...masterPayload`) contributes its keys.
      const declaration = findDeclaration(property.expression.text, property, source);
      if (declaration && ts.isObjectLiteralExpression(declaration)) names.push(...propertyNames(declaration, source, seen));
    }
  }
  return names;
}

function findDeclaration(name: string, from: ts.Node, source: ts.SourceFile): ts.Expression | undefined {
  let found: ts.Expression | undefined;
  for (let scope: ts.Node | undefined = from.parent; scope && !found; scope = scope.parent) {
    ts.forEachChild(scope, function visit(child) {
      if (found) return;
      if (ts.isVariableDeclaration(child) && ts.isIdentifier(child.name) && child.name.text === name && child.initializer && child.end <= from.pos) found = child.initializer;
      else if (!ts.isFunctionLike(child)) ts.forEachChild(child, visit);
    });
    if (scope === source) break;
  }
  return found;
}

/**
 * master_result keys written: the keys of an object literal given as
 * `master_result: {...}`, and of the objects an updateMasterResult change
 * returns (a literal that spreads the stored master and sets keys on it).
 */
export function masterKeysWritten(files = sourceFiles()): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const add = (key: string, file: string) => out.set(key, [...new Set([...(out.get(key) ?? []), file])]);
  for (const file of files) {
    const text = read(file);
    if (!/master_result|updateMasterResult/.test(text)) continue;
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (node: ts.Node) => {
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === "master_result" && ts.isObjectLiteralExpression(node.initializer)) {
        for (const key of propertyNames(node.initializer, source)) add(key, file);
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "updateMasterResult") {
        const change = node.arguments[2];
        if (change && (ts.isArrowFunction(change) || ts.isFunctionExpression(change))) {
          const param = change.parameters[0]?.name;
          const stored = param && ts.isIdentifier(param) ? param.text : null;
          const inner = (child: ts.Node) => {
            if (ts.isObjectLiteralExpression(child) && child.properties.some((p) => ts.isSpreadAssignment(p) && ts.isIdentifier(p.expression) && p.expression.text === stored)) {
              for (const key of propertyNames(child, source)) add(key, file);
            }
            ts.forEachChild(child, inner);
          };
          inner(change.body);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return out;
}

/** Intake sections named by the intake store's hooks and puts, and by section accessors. */
export function intakeSectionsUsed(files = sourceFiles()): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const add = (section: string, file: string) => out.set(section, [...new Set([...(out.get(section) ?? []), file])]);
  for (const file of files) {
    const text = read(file);
    for (const match of text.matchAll(/use(?:IntakeState|InputWithStory)(?:<(?:[^<>]|<[^<>]*>)*>)?\(\s*"([a-z][a-zA-Z-]*)"/g)) add(match[1], file);
    for (const match of text.matchAll(/\.put\(\s*"([a-z][a-zA-Z-]*)"/g)) add(match[1], file);
  }
  return out;
}

/** Files that name localStorage or sessionStorage (comments excluded). */
export function directStorageFiles(files = sourceFiles()): string[] {
  return files.filter((file) => {
    const code = read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
    return /\b(?:localStorage|sessionStorage)\b/.test(code);
  });
}
