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
  title: "CourtSimplified",
  description:
    "CourtSimplified helps people prepare court documents, organize evidence, and understand legal steps more clearly.",
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
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-8 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-lg font-semibold text-[#1F2937]">
                  CourtSimplified
                </div>

                <p className="mt-1 max-w-xl text-sm text-[#6B7280]">
                  Clear legal guidance, evidence organization, litigation
                  strategy, chronology building, intelligent drafting, document
                  workspace management, and court workflow tools.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-[#4B5563]">
                {[...publicNavLinks, ...workspaceLinks].map((link) => (
                  <Link
                    key={`footer-${link.href}`}
                    href={link.href}
                    className="hover:text-[#2FB8AC]"
                  >
                    {link.label}
                  </Link>
                ))}

                <Link href="/login" className="font-semibold hover:text-[#2FB8AC]">
                  Login
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}