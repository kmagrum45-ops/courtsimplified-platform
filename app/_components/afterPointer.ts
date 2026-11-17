"use client";

/**
 * A SAVE THAT RUNS WHEN A BOX LOSES FOCUS WAITS FOR THE CLICK THAT TOOK THE FOCUS AWAY (site owner, 16 Nov 2026; Chrome
 * milestone test of #550, row 12: "the first click after typing in a box often did nothing": "A person", "A company or
 * business", "Yes" on the outcome offer).
 *
 * Cause: a box saved on blur. Pressing the mouse on a button blurs the box first; the save redraws the page at once (the
 * box becomes a line of text, a question moves to "answered"), so what was under the pointer moved between the mouse
 * going down and coming up, and the click landed on nothing. Fix, for every save on blur: while a pointer is pressed, the
 * save waits until it is released, then runs, before the click (release); for a tick box or radio button, after its
 * click (onClick). With no pointer pressed (Tab, Enter, a tap that has ended), it runs at once.
 *
 * The one helper: every onBlur that saves calls it (test:first-click-after-typing finds a new one that does not).
 */
let pressed = false;
let waiting: (() => void)[] = [];

/** Run every waiting save, once. */
function runWaiting() {
  const run = waiting;
  waiting = [];
  for (const save of run) save();
}

/**
 * At the click. For a tick box or radio button the browser has already changed it when the click is delivered: a save run
 * now redraws the page from the record before the box's own change handler, which puts the box back, and the change is
 * lost (full local run of 4d1ae680: ticks that "did not change", a Defendant's Claim and "Were you married?" answer
 * asked again). So for those the saves run after the click. For anything else they run here, first.
 */
function onClick(event: { target: unknown }) {
  if (checkable(event.target)) {
    if (waiting.length) setTimeout(runWaiting, 0);
    return;
  }
  runWaiting();
}

/** A tick box or radio button: the browser changes it when its click is delivered. */
function checkable(target: unknown): boolean {
  const element = target as { tagName?: string; type?: string } | null;
  return element?.tagName === "INPUT" && (element.type === "checkbox" || element.type === "radio");
}

/**
 * At the release. Where it lands is already fixed (the release and its click go where the pointer is now), so a redraw
 * here cannot move the click; the saves run now, and the page is drawn with them before the click. Not a task later:
 * Chrome delivered no click for a Continue pressed straight from a box while the page waited unredrawn through the press
 * (full local run of 4d1ae680, story pack root cause 3). A tick box or radio button waits for its click (onClick).
 */
function release(event: { target: unknown }) {
  if (!pressed) return;
  pressed = false;
  if (!waiting.length) return;
  if (checkable(event.target)) setTimeout(runWaiting, 0);
  else runWaiting();
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", () => { pressed = true; }, true);
  window.addEventListener("pointerup", release, true);
  window.addEventListener("pointercancel", release, true);
  // The click itself (window, capture): a tick box's or radio button's waiting saves run after it; anything still waiting
  // runs before the clicked button's own handler, so "Continue" right after typing confirms what was typed.
  window.addEventListener("click", onClick, true);
  // A press that ends outside the window never sends pointerup to it.
  window.addEventListener("blur", () => { pressed = false; runWaiting(); });
}

/** Run `save` now, or, while a pointer is pressed, once it is released (a tick box's or radio button's: after its click). */
export function afterPointer(save: () => void): void {
  if (pressed) waiting.push(save);
  else save();
}
