"use client";

/**
 * A SAVE THAT RUNS WHEN A BOX LOSES FOCUS WAITS FOR THE CLICK THAT TOOK THE FOCUS AWAY (site owner, 16 Nov 2026; Chrome
 * milestone test of #550, row 12: "the first click after typing in a box often did nothing": "A person", "A company or
 * business", "Yes" on the outcome offer).
 *
 * Cause: a box saved on blur. Pressing the mouse on a button blurs the box first; the save redraws the page at once (the
 * box becomes a line of text, a question moves to "answered"), so what was under the pointer moved between the mouse
 * going down and coming up, and the click landed on nothing. Fix, for every save on blur: while a pointer is pressed, the
 * save waits until it is released and the click has been delivered, then runs. With no pointer pressed (Tab, Enter, a
 * tap that has ended), it runs at once.
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

function release() {
  if (!pressed) return;
  pressed = false;
  // A press with no click after it (on empty space, or dragged away): the saves run in the next task.
  if (waiting.length) setTimeout(runWaiting, 0);
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", () => { pressed = true; }, true);
  window.addEventListener("pointerup", release, true);
  window.addEventListener("pointercancel", release, true);
  // The click itself: its target is fixed already, so the saves run first, here (window, capture), and the page is drawn
  // with them before the clicked button's own handler runs: "Continue" right after typing confirms what was typed.
  window.addEventListener("click", runWaiting, true);
  // A press that ends outside the window never sends pointerup to it.
  window.addEventListener("blur", () => { pressed = false; runWaiting(); });
}

/** Run `save` now, or, while a pointer is pressed, once it is released and its click delivered. */
export function afterPointer(save: () => void): void {
  if (pressed) waiting.push(save);
  else save();
}
