/**
 * SAVE, THEN GO WHERE THE PERSON CLICKED -- ALWAYS (owner's Chrome check, 2026-10-30).
 *
 * While a signed-in intake has text not yet saved, IntakeRecovery takes any same-site
 * link click (the footer's "Other support lines", the header's "My Workspace", any link
 * on the page), saves, and then leaves, so nothing typed is lost. Before this, it left
 * only when the save succeeded and the intake had not re-opened in the meantime: a failed
 * save, or an intake re-opened while saving, dropped the click, and the link "did
 * nothing". Now it always goes once the save settles. If the save failed, the text is
 * still pending, so the page's beforeunload asks the browser's "Leave site?" question
 * and the person decides; the click is never silently lost.
 *
 * A pure function of the click, the link and the state, so a terminal suite can prove it
 * (test:safety-footer, links-never-dropped).
 */
export type LeaveClick = {
  defaultPrevented: boolean;
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  preventDefault(): void;
  stopPropagation(): void;
};
export type LeaveLink = { href: string; target: string; hasAttribute(name: string): boolean };

/**
 * Takes the click when signed-in text is pending and the link goes elsewhere on this
 * site: saves, then goes, whatever the save answered. Returns the address it will go to,
 * or null when the click is left to the browser.
 */
export function saveThenLeave(
  event: LeaveClick,
  link: LeaveLink | null,
  state: { pending: boolean; here: string },
  save: () => Promise<unknown>,
  go: (href: string) => void,
): string | null {
  if (!state.pending || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return null;
  if (!link || link.target === "_blank" || link.hasAttribute("download")) return null;
  const here = new URL(state.here);
  const target = new URL(link.href, here);
  if (target.origin !== here.origin || target.href === here.href) return null;
  event.preventDefault();
  event.stopPropagation();
  const leave = () => go(target.href);
  void save().then(leave, leave);
  return target.href;
}
