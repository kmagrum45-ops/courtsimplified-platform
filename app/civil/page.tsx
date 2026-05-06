import Link from "next/link";

const civilTopics = [
  {
    title: "Negligence and damages",
    description:
      "Claims involving harm, injury, or loss where responsibility needs to be clearly explained.",
    image:
      "https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Contract disputes",
    description:
      "Situations where agreements were not followed, payments were not made, or terms were broken.",
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Property and financial issues",
    description:
      "Disputes involving property, money, debts, or other civil obligations.",
    image:
      "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80",
  },
];

const civilSteps = [
  "Add the facts, timeline, and people involved in your situation.",
  "Review a clear summary of what happened and what matters most.",
  "Move into the correct forms with your information already organized.",
  "Keep documents, messages, and evidence connected to your case.",
];

export default function CivilPage() {
  return (
    <main className="min-h-screen bg-[#f8faf8] text-[#16302b]">

      <section className="border-b border-[#d9e6df] bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#2f7d67]">
              Civil Court
            </p>

            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[#10231f] md:text-5xl">
              Prepare your civil case with clear facts and organized information.
            </h1>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/builder?path=civil"
                className="rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white"
              >
                Start Your Civil Case →
              </Link>

              {/* ✅ FIXED HERE */}
              <Link
                href="/forms?path=civil"
                className="rounded-full border border-[#2f7d67] bg-white px-6 py-3 text-sm font-semibold text-[#2f7d67]"
              >
                Browse Civil Forms
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[#d8e6df] bg-white shadow-sm">
            <img
              src="https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=1400&q=80"
              alt="Civil case preparation"
              className="h-[320px] w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-[#d9e6df] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h2 className="text-3xl font-bold text-[#10231f]">
            Looking for a specific civil form?
          </h2>

          <Link
            href="/forms?path=civil"
            className="mt-6 inline-block rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white"
          >
            Search Civil Forms →
          </Link>
        </div>
      </section>

    </main>
  );
}