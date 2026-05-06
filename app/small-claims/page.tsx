import Link from "next/link";

const smallClaimsTopics = [
  {
    title: "Money owed",
    description:
      "Organize unpaid invoices, loans, deposits, refunds, repair costs, and other money disputes.",
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Contracts and agreements",
    description:
      "Prepare information about written agreements, verbal agreements, missed payments, broken promises, and service disputes.",
    image:
      "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Property and damage claims",
    description:
      "Keep photos, receipts, estimates, messages, and timelines together for property damage or recovery claims.",
    image:
      "https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=1200&q=80",
  },
];

export default function SmallClaimsPage() {
  return (
    <main className="min-h-screen bg-[#f8faf8] text-[#16302b]">
      <section className="border-b border-[#d9e6df] bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#2f7d67]">
              Small Claims Court
            </p>

            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[#10231f] md:text-5xl">
              Organize your Small Claims Court information clearly.
            </h1>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/builder?path=small-claims"
                className="rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white"
              >
                Start Your Small Claims Case →
              </Link>

              {/* ✅ FIXED */}
              <Link
                href="/forms?path=small-claims"
                className="rounded-full border border-[#2f7d67] bg-white px-6 py-3 text-sm font-semibold text-[#2f7d67]"
              >
                Browse Small Claims Forms
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#d9e6df] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h2 className="text-3xl font-bold text-[#10231f]">
            Looking for a specific form?
          </h2>

          {/* ✅ FIXED */}
          <Link
            href="/forms?path=small-claims"
            className="mt-6 inline-block rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white"
          >
            Search Small Claims Forms →
          </Link>
        </div>
      </section>
    </main>
  );
}