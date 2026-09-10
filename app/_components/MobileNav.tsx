"use client";

import Link from "next/link";
import { useState } from "react";
import AuthNavAction from "./AuthNavAction";

type NavLink = { href: string; label: string };

/**
 * The header's `md:flex` desktop nav is `hidden` below that breakpoint with
 * nothing standing in for it, so on a phone the primary nav was previously
 * unreachable -- only the wordmark showed. This is the phone-width
 * counterpart: a toggle button plus a full-width panel using the same link
 * list.
 */
export default function MobileNav({ navLinks }: { navLinks: NavLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D7E7E5] text-[#1F2937]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      {open ? (
        <div
          id="mobile-nav-panel"
          className="absolute inset-x-0 top-full border-b border-[#D7E7E5] bg-white px-4 py-4 shadow-sm"
        >
          <nav
            aria-label="Primary"
            className="flex flex-col gap-1"
            onClick={() => setOpen(false)}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-3 text-base font-medium text-[#374151] transition hover:bg-[#F0F9F8] hover:text-[#2FB8AC]"
              >
                {link.label}
              </Link>
            ))}

            <AuthNavAction className="mt-2 rounded-xl bg-[#2FB8AC] px-3 py-3 text-center text-base font-bold text-white transition hover:bg-[#239B91]" />
          </nav>
        </div>
      ) : null}
    </div>
  );
}
