import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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

const publicNavLinks = [
  { href: "/", label: "Home" },
  { href: "/family", label: "Family" },
  { href: "/small-claims", label: "Small Claims" },
  { href: "/civil", label: "Civil" },
  { href: "/legal-principles", label: "Legal Principles" },
  { href: "/case-law", label: "Case Law" },
];

const workspaceLinks = [
  { href: "/dashboard", label: "My Workspace" },
  { href: "/builder", label: "Start Case" },
  { href: "/document-workspace", label: "Workspace" },
  { href: "/evidence", label: "Evidence" },
  { href: "/court-package", label: "Court Package" },
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
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 border-b border-[#D7E7E5] bg-white/95 backdrop-blur">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-4">
              <Link
                href="/"
                className="shrink-0 text-xl font-bold tracking-tight text-[#1F2937]"
              >
                <span className="text-[#2FB8AC]">Court</span>Simplified
              </Link>

              <nav className="hidden items-center gap-4 md:flex">
                {publicNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-medium text-[#4B5563] transition hover:text-[#2FB8AC]"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="hidden items-center gap-3 md:flex">
                {workspaceLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-semibold text-[#374151] transition hover:text-[#2FB8AC]"
                  >
                    {link.label}
                  </Link>
                ))}

                <Link
                  href="/login"
                  className="rounded-full bg-[#2FB8AC] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#239B91]"
                >
                  Login / Create Account
                </Link>
              </div>
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
                  CourtSimplified provides legal information and case-management
                  tools. It does not provide legal representation, guarantee an
                  outcome, or replace advice from a qualified legal professional
                  when one is needed.
                </p>
              </div>

              <div className="flex max-w-xl flex-wrap gap-x-4 gap-y-3 text-sm text-[#4B5563]">
                {[...publicNavLinks, ...workspaceLinks].map((link) => (
                  <Link
                    key={`footer-${link.href}`}
                    href={link.href}
                    className="transition hover:text-[#2FB8AC]"
                  >
                    {link.label}
                  </Link>
                ))}

                <Link
                  href="/login"
                  className="font-semibold transition hover:text-[#2FB8AC]"
                >
                  Login
                </Link>
              </div>
            </div>

            <div className="border-t border-[#E5ECEA]">
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-6 py-5 text-xs text-[#7B8491] sm:flex-row sm:items-center sm:justify-between">
                <p>
                  © {new Date().getFullYear()} CourtSimplified. All rights
                  reserved.
                </p>

                <p>
                  Making court procedures more understandable, organized, and
                  manageable.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}