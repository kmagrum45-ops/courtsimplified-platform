/**
 * Shared filter for issue classifications that name nothing.
 *
 * The engines use "unknown" as their unclassified domain and carry it through
 * primaryClaimTypes into AnalysisResult.detectedIssues. Renderers then printed
 * it verbatim, so the case overview told users "Possible issue to review:
 * unknown." -- an internal token presented as a legal issue.
 *
 * The vocabulary lives here once because more than one surface renders these
 * values: the builder overview and the settlement conference page both list
 * them, and other pages count them. A local fix in one renderer would leave the
 * others leaking.
 */

/** Classification values that carry no information about the matter. */
const EMPTY_ISSUE_PATTERN = /^(unknown|unspecified|none|not[-\s]?sure|n\/a|other)?$/i;

/**
 * True when a classification names an actual issue. "other" is excluded: it is
 * a real user selection on the intake, but as a bare label it tells a reader
 * nothing, and it only ever reaches these lists alongside its own descriptive
 * text.
 */
export function isMeaningfulIssueSignal(value: unknown): boolean {
  const text = String(value || "").trim();
  if (!text) return false;
  return !EMPTY_ISSUE_PATTERN.test(text);
}

/** Keep only classifications that name an actual issue, preserving order. */
export function meaningfulIssueSignals(values: readonly unknown[]): string[] {
  return (values || [])
    .map((value) => String(value || "").trim())
    .filter((value) => isMeaningfulIssueSignal(value));
}
