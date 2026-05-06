import Link from "next/link";

const casePaths = [
  {
    title: "Family",
    href: "/family",
    description:
      "Get help organizing parenting, decision-making, support, separation, divorce, and property information.",
    image:
      "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Small Claims",
    href: "/small-claims",
    description:
      "Organize claims about money owed, unpaid invoices, property damage, contracts, and other disputes.",
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Civil",
    href: "/civil",
    description:
      "Prepare information for larger claims, negligence matters, contract disputes, property issues, and complex cases.",
    image:
      "https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=1200&q=80",
  },
];

const howItWorks = [
  {
    title: "Choose your court path",
    text: "Start with Family, Civil, or Small Claims.",
  },
  {
    title: "Tell your story once",
    text: "Add the facts, dates, people involved, evidence, and what you are asking for.",
  },
  {
    title: "Review your organized summary",
    text: "See your information organized into issues, next steps, missing details, and helpful documents.",
  },
  {
    title: "Build your forms and evidence package",
    text: "Keep your forms, messages, exhibits, and documents together in one organized case file.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f8faf8] text-[#16302b]">
      <div className="w-full border-b border-yellow-300 bg-yellow-100 text-sm text-yellow-900">
        <div className="mx-auto max-w-7xl px-6 py-2 text-center font-medium">
          CourtSimplified is currently being improved. Some tools may still be in progress.
        </div>
      </div>

      <section className="border-b border-[#d9e6df] bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#2f7d67]">
              Canada-Wide Court Help
            </p>

            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-[#10231f] md:text-5xl">
              Navigate the court system with clarity and confidence.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#4f685f]">
              CourtSimplified helps you organize your story, evidence, timelines,
              and court documents in one clear place.
            </p>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#4f685f]">
              Choose the court path that fits your situation below.
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[#d8e6df] bg-white shadow-sm">
            <img
              src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1400&q=80"
              alt="Organized legal guidance"
              className="h-[340px] w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-[#10231f]">
            Choose your court path
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#557168]">
            Select the area that matches your situation.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {casePaths.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group overflow-hidden rounded-3xl border border-[#d8e6df] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <img
                src={item.image}
                alt={item.title}
                className="h-48 w-full object-cover"
              />

              <div className="p-6">
                <h3 className="text-2xl font-bold text-[#10231f]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#5a736a]">
                  {item.description}
                </p>

                <div className="mt-5 inline-flex items-center text-sm font-semibold text-[#2f7d67]">
                  Open {item.title} →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-[#d9e6df] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h2 className="mb-8 text-3xl font-bold tracking-tight text-[#10231f]">
            How CourtSimplified works
          </h2>

          <div className="space-y-8">
            {howItWorks.map((item, index) => (
              <div key={item.title}>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#2f7d67]">
                  Step {index + 1}
                </p>
                <h3 className="mt-2 text-2xl font-bold text-[#10231f]">
                  {item.title}
                </h3>
                <p className="mt-3 max-w-4xl text-base leading-8 text-[#557168]">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}