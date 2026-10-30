/**
 * WHICH CASE IS OPEN: THE ADDRESS, AND NOTHING ELSE (site owner's rule 1, 30 Oct 2026).
 *
 *   "One case id decides which case is open. The id in the address (the intake
 *    or case id) is the only authority. No remembered 'last case' in tab storage,
 *    a cookie, or the most recently opened case may override it. Creating a case
 *    sets that id and goes to it. 'Continue with <court>' opens the intake just
 *    created, with its own court path. With no id, show the case chooser, and
 *    never guess."
 *
 * This is the one place a page asks that question. It is given the address and
 * only the address: it has no access to sessionStorage, localStorage, cookies or
 * the account, so nothing remembered can reach its answer. Every page that opens
 * a case from its address (the builder, the home page's intake, /forms,
 * /legal-principles, the sign-in return) reads it through here;
 * `npm run test:open-case` checks that no page reads caseId or intake any other
 * way, and that nothing reads a remembered "last case".
 *
 * Why it exists: the builder kept the case it last saved in tab storage
 * (courtSimplifiedBuilderLastCase) and, on an address with no case id, put that
 * case's id into the address -- the "tab lost its place" recovery of 6 and
 * 15 Oct. That is exactly a remembered last case overriding the address, and it
 * twice opened an older case when a new one was meant (16 Oct, and the owner's
 * Chrome check of 30 Oct). The address already carries the id for every intake
 * (?intake= is written the moment one starts, IntakeRecovery.tsx), so a reload
 * resumes from the address without any memory.
 */
import type { IntakeCourt } from "./intakeCheckpoint";

/** Anything with URLSearchParams' get: useSearchParams(), URLSearchParams, a URL's searchParams. */
export type AddressParams = { get(name: string): string | null };

/** The case the address names. `caseId` and `intake` are exactly as written there (null when absent or empty). */
export type OpenCase = {
  /** The court path the address names, or null: never a default. */
  court: IntakeCourt | null;
  /** ?caseId= : a case saved to the account. */
  caseId: string | null;
  /** ?intake= : an intake flow (its id becomes the case's id when it is first saved). */
  intake: string | null;
  /** ?step= on the builder. */
  step: string | null;
};

export const CASE_CHOOSER = "/dashboard";
export const START_PAGE = "/";

function court(value: string | null): IntakeCourt | null {
  return value === "small-claims" || value === "family" || value === "civil" ? value : null;
}

/** The case the address names: the only answer to "which case is open". */
export function openCaseFromAddress(params: AddressParams): OpenCase {
  return {
    court: court(params.get("path")),
    caseId: params.get("caseId") || null,
    intake: params.get("intake") || null,
    step: params.get("step") || null,
  };
}

/** True when the address names a case or an intake. */
export function namesACase(open: OpenCase): boolean {
  return Boolean(open.caseId || open.intake);
}

/**
 * What a page does when its address names no case. Never a remembered one.
 *
 *   "chooser"    signed in: the case chooser (My cases), where the person picks.
 *   "start"      a guest with no court: the start page, where they pick a court.
 *   "new-intake" start a new intake on this court; its id goes straight into the
 *                address (IntakeRecovery.tsx). An unsaved intake already in this
 *                tab is never overwritten silently: the person is asked first
 *                (the existing "You have an unsaved case in this tab" choice).
 *   "general"    the page has a general, case-free view (/forms, /legal-principles).
 *   null         the address names a case: open that one.
 *
 * On the builder, an address with a court and no step is "start a new case"
 * (the home page's and My cases' start links). An address on a step (?step=
 * guided, form or results) with no id is a tab returning to a case it no longer
 * names: signed in, they choose it from My cases; a guest's only intake lives in
 * this tab, so they get the same unsaved-intake choice as above.
 */
export function withoutACase(open: OpenCase, where: { pathname: string; signedIn: boolean }): "chooser" | "start" | "new-intake" | "general" | null {
  if (namesACase(open)) return null;
  if (where.pathname === "/builder") {
    if (!open.court) return where.signedIn ? "chooser" : "start";
    if (open.step && where.signedIn) return "chooser";
    return "new-intake";
  }
  if (where.pathname === "/") return open.court ? "new-intake" : "general";
  return "general";
}

/** The address a page goes to for "chooser" or "start"; null when it stays. */
export function addressWithoutACase(choice: ReturnType<typeof withoutACase>): string | null {
  return choice === "chooser" ? CASE_CHOOSER : choice === "start" ? START_PAGE : null;
}

/**
 * An address that names a case or intake but no court (30 Oct, "never guess"):
 * the builder used to run it as Family. The court comes from that case's own
 * saved row (`savedCourt`, its court_path, read by the caller for the signed-in
 * owner); the same address with that court added, the same id. With no saved
 * court (no row, a guest, an unknown value): the chooser, never a default.
 */
export function addressWithSavedCourt(open: OpenCase, savedCourt: string | null | undefined, where: { pathname: string; signedIn: boolean; search?: string }): string {
  const saved = court(savedCourt ?? null);
  if (!saved || !where.signedIn) return where.signedIn ? CASE_CHOOSER : START_PAGE;
  // Everything else the address says (e.g. ?situation=change) is kept.
  const params = new URLSearchParams(where.search ?? "");
  params.set("path", saved);
  if (open.caseId) params.set("caseId", open.caseId);
  if (open.intake) params.set("intake", open.intake);
  if (open.step) params.set("step", open.step);
  return `${where.pathname}?${params.toString()}`;
}

/**
 * What the intake boundary (IntakeRecoveryBoundary, IntakeRecovery.tsx) renders
 * for an address. One decision, called by the boundary itself and by
 * test:open-case, so the check exercises what the page does.
 *   "no-case"         the builder, no court, no id: the chooser (NoCaseInAddress)
 *   "court-from-case" the builder, an id, no court: the case's own court (CourtFromCase)
 *   "children"        another page with no court (the home page's own start)
 *   "store"           a court in the address: the intake store for the id it names
 */
export function boundaryView(open: OpenCase, pathname: string): "no-case" | "court-from-case" | "children" | "store" {
  if (open.court) return "store";
  if (pathname !== "/builder") return "children";
  return namesACase(open) ? "court-from-case" : "no-case";
}

/**
 * Where CourtFromCase sends an address with an id and no court: the same address
 * under that case's own saved court, else the chooser. `signedInUser` and
 * `savedCourtOf` are the browser's account and its read of the case row (the
 * owner's own row only); they are passed in so this module reads nothing itself.
 */
export async function courtFromCaseAddress(
  href: string,
  read: { signedInUser: () => Promise<string | null>; savedCourtOf: (id: string, userId: string) => Promise<string | null> },
): Promise<string> {
  const address = new URL(href);
  const open = openCaseFromAddress(address.searchParams);
  const userId = await read.signedInUser();
  const id = open.caseId || open.intake;
  const saved = userId && id ? await read.savedCourtOf(id, userId) : null;
  return addressWithSavedCourt(open, saved, { pathname: address.pathname, signedIn: Boolean(userId), search: address.search });
}
