export function scrollAndFocus(element: HTMLElement | null) {
  if (!element) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "center",
  });
  element.focus({ preventScroll: true });
}
