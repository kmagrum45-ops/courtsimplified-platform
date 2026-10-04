import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthNavAction from "./_components/AuthNavAction";
import AuthStorageGuard from "./_components/AuthStorageGuard";
import MobileNav from "./_components/MobileNav";
import ScrollToTopOnNavigation from "./_components/ScrollToTopOnNavigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CourtSimplified | Tools for Self-Represented Litigants",
  description:
    "CourtSimplified helps self-represented litigants understand court procedures, organize evidence, prepare case materials, and manage their legal matters in one connected platform.",
};

/**
 * Case-management links (Family/Small Claims/Civil, Start Case, Workspace,
 * Evidence, Court Package) live on the homepage and inside the case
 * workflow instead of here -- they only make sense once a court type or
 * case exists, and the previous 11-item nav wrapped onto two lines. Their
 * routes and pages are unchanged; only their presence in the global nav is
 * removed.
 */
const navLinks = [
  { href: "/", label: "Home" },
  // The in-depth guides index links on to the procedure cards (/legal-principles).
  { href: "/guides", label: "Guides" },
  // Every official form for each court, explained (2026-09-30, site owner:
  // "a forms button so each court type has full list of forms").
  { href: "/claims", label: "Case types" },
  { href: "/forms/guide", label: "Forms" },
  { href: "/glossary", label: "Glossary" },
  { href: "/courthouses", label: "Courthouses" },
  { href: "/about", label: "About" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-screen bg-[#F7FAFA] text-[#1F2937]">
        <AuthStorageGuard />
        {/* useSearchParams() bails out of static prerendering unless it sits
            inside a Suspense boundary, which would fail the build for every
            statically rendered route. It renders null, so no fallback needed. */}
        <Suspense fallback={null}>
          <ScrollToTopOnNavigation />
        </Suspense>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 border-b border-[#D7E7E5] bg-white/95 backdrop-blur">
            <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
              <Link
                href="/"
                className="shrink-0 text-xl font-bold tracking-tight text-[#1F2937]"
              >
                <span className="text-[#2FB8AC]">Court</span>Simplified
              </Link>

              <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-medium text-[#4B5563] transition hover:text-[#2FB8AC]"
                  >
                    {link.label}
                  </Link>
                ))}

                <AuthNavAction className="rounded-full bg-[#2FB8AC] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#239B91]" />
              </nav>

              <MobileNav navLinks={navLinks} />
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-[#D7E7E5] bg-white">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <div className="text-lg font-semibold text-[#1F2937]">
                  CourtSimplified
                </div>

                <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                  Built for self-represented litigants. CourtSimplified helps
                  people understand court procedures, organize evidence,
                  prepare case materials, and manage their legal matter through
                  one connected platform.
                </p>

                <p className="mt-3 text-xs leading-5 text-[#7B8491]">
                  CourtSimplified guides you through the Ontario court system and helps you organize and manage your case on your own. It does not represent you in court or guarantee an outcome.
                </p>
              </div>

              <div className="flex max-w-xl flex-wrap gap-x-4 gap-y-3 text-sm text-[#4B5563]">
                {navLinks.map((link) => (
                  <Link
                    key={`footer-${link.href}`}
                    href={link.href}
                    className="transition hover:text-[#2FB8AC]"
                  >
                    {link.label}
                  </Link>
                ))}

                <AuthNavAction className="font-semibold transition hover:text-[#2FB8AC]" />
              </div>
            </div>

            {/*
              SITE-WIDE DISCLAIMER AND CONTACTS (LSO Step 6a).

              The site's legal notice (worded "legal information, not legal advice"
              until 2026-10-04, when the site owner set the guide-like-a-lawyer rule in
              CLAUDE.md; it now says what the site does and that it is not a law firm)
              existed only on six
              pages and was absent from the builder, which is the main intake and
              the primary AI surface. In the footer it is on every page by
              construction, and cannot be missed off a new one.

              Both contact addresses are here because the audit found that
              complaints@courtsimplified.com appeared nowhere in the codebase,
              and A2I participants must report complaints quarterly. An address
              nobody can find produces no complaints and a misleading return.
            */}
            <div className="border-t border-[#E5ECEA]">
              <div className="mx-auto w-full max-w-7xl px-6 py-5 text-xs leading-6 text-[#7B8491]">
                <p data-testid="site-legal-disclaimer" className="font-semibold text-[#4B5563]">
                  CourtSimplified helps you navigate the Ontario court system on your own,
                  without a lawyer. We are not a law firm and are not your lawyer.
                </p>

                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    © {new Date().getFullYear()} CourtSimplified. All rights reserved.
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <Link
                      href="/privacy"
                      className="font-semibold transition hover:text-[#2FB8AC]"
                    >
                      Privacy Policy &amp; Terms of Use
                    </Link>

                    <a
                      href="mailto:complaints@courtsimplified.com"
                      className="font-semibold transition hover:text-[#2FB8AC]"
                    >
                      complaints@courtsimplified.com
                    </a>

                    <a
                      href="mailto:privacy@courtsimplified.com"
                      className="font-semibold transition hover:text-[#2FB8AC]"
                    >
                      privacy@courtsimplified.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
