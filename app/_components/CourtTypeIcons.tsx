/**
 * No icon library (lucide, heroicons, etc.) is used anywhere else in the app
 * -- checked before adding one. These are plain inline SVGs sharing one
 * stroke style (24x24, currentColor, 1.5 stroke) so the four homepage cards
 * read as one consistent set rather than mixed styles.
 */

type IconProps = { className?: string };

const shared = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function CoinsIcon({ className }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <ellipse cx="8" cy="7" rx="5.25" ry="3" />
      <path d="M2.75 7v6c0 1.66 2.35 3 5.25 3s5.25-1.34 5.25-3V7" />
      <path d="M2.75 10.5c0 1.66 2.35 3 5.25 3s5.25-1.34 5.25-3" />
      <ellipse cx="15.75" cy="12.5" rx="5.25" ry="3" />
      <path d="M10.5 12.5v4c0 1.66 2.35 3 5.25 3s5.25-1.34 5.25-3v-4" />
      <path d="M10.5 16c0 1.66 2.35 3 5.25 3s5.25-1.34 5.25-3" />
    </svg>
  );
}

export function FamilyIcon({ className }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="8.5" cy="7" r="2.75" />
      <path d="M3 19v-1.5c0-2.21 2.46-4 5.5-4s5.5 1.79 5.5 4V19" />
      <circle cx="17" cy="8.5" r="2.25" />
      <path d="M14.75 19v-1.25c0-1.7 1.7-3.1 3.75-3.35" />
    </svg>
  );
}

export function ScalesIcon({ className }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M12 3v16" />
      <path d="M7 21h10" />
      <path d="M4 7h6M14 7h6" />
      <path d="M4 7l-2.5 5a2.5 2.5 0 0 0 5 0z" />
      <path d="M20 7l-2.5 5a2.5 2.5 0 0 0 5 0z" />
      <circle cx="12" cy="3" r="1" />
    </svg>
  );
}

export function CompassQuestionIcon({ className }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="11" r="8.25" />
      <path d="M9.6 9.3a2.4 2.4 0 1 1 3.5 2.14c-.66.35-1.1.86-1.1 1.56v.3" />
      <circle cx="12" cy="15.75" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}
