import Link from "next/link";

const smallClaimsTopics = [
  {
    title: "Money owed",
    description:
      "Organize unpaid invoices, loans, deposits, refunds, repair costs, arrears, and other money disputes.",
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Contracts and agreements",
    description:
      "Prepare facts about written agreements, verbal agreements, missed payments, broken promises, poor work, and service disputes.",
    image:
      "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Property and damage claims",
    description:
      "Keep photos, receipts, estimates, messages, timelines, and proof of loss together for property damage or recovery claims.",
    image:
      "https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=1200&q=80",
  },
];

const smallClaimsSteps = [
  "Start with a guided intake that captures the claim, parties, dates, amount claimed, evidence, and what happened.",
  "Review a structured case summary that separates facts, proof, missing information, risks, and next procedural steps.",
  "Move into documents and forms with the small claims path carried forward.",
  "Organize evidence, messages, invoices, receipts, estimates, photos, and exhibits under the same case workflow.",
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
              Organize your Small Claims Court case from intake to court package.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#4f685f]">
              Small claims can involve money owed, unpaid work, damaged property,
              contracts, deposits, loans, services, defamation, repair disputes,
              and other civil disputes within the court’s limit.
            </p>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#4f685f]">
              CourtSimplified helps you collect the facts, identify missing
              proof, organize evidence, prepare documents, and move through the
              workflow without losing the case context.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/builder?path=small-claims"
                className="rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#276a57]"
              >
                Start Small Claims Intake →
              </Link>

              <Link
                href="/ontario-smallclaims"
                className="rounded-full border border-[#bdd4ca] bg-white px-6 py-3 text-sm font-semibold text-[#1c473d] transition hover:border-[#2f7d67] hover:text-[#2f7d67]"
              >
                Ontario Small Claims Information
              </Link>

              <Link
                href="/forms?path=small-claims"
                className="rounded-full border border-[#2f7d67] bg-white px-6 py-3 text-sm font-semibold text-[#2f7d67] transition hover:bg-[#edf7f3]"
              >
                Browse Small Claims Forms
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[#d8e6df] bg-white shadow-sm">
            <img
              src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1400&q=80"
              alt="Small claims documents"
              className="h-[320px] w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-[#d9e6df] bg-[#edf7f3]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="max-w-4xl rounded-3xl border border-[#9fcbb9] bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold tracking-tight text-[#10231f]">
              Ontario Small Claims Court limit
            </h2>
            <p className="mt-3 text-base leading-7 text-[#33584d]">
              Ontario Small Claims Court can decide claims for money or the
              return of personal property up to $50,000, excluding interest and
              costs.
            </p>
            <p className="mt-3 text-sm leading-6 text-[#557168]">
              If the amount is higher, review the official court information
              before deciding where to proceed.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-[#10231f]">
            What small claims may involve
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#557168]">
            Choose this path if your dispute involves money, property, unpaid
            work, services, contracts, or civil claims that belong in Small
            Claims Court.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {smallClaimsTopics.map((topic) => (
            <article
              key={topic.title}
              className="overflow-hidden rounded-3xl border border-[#d8e6df] bg-white shadow-sm"
            >
              <img
                src={topic.image}
                alt={topic.title}
                className="h-44 w-full object-cover"
              />

              <div className="p-6">
                <h3 className="text-2xl font-semibold text-[#10231f]">
                  {topic.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#5a736a]">
                  {topic.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[#d9e6df] bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="overflow-hidden rounded-3xl border border-[#d8e6df] bg-white shadow-sm">
            <img
              src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1400&q=80"
              alt="Organized civil evidence"
              className="h-full min-h-[320px] w-full object-cover"
            />
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[#10231f]">
              How this path connects
            </h2>

            <p className="mt-4 max-w-3xl text-base leading-7 text-[#557168]">
              Your small claims case should stay connected from intake through
              case analysis, evidence, forms, document workspace, strategy,
              court package, and export.
            </p>

            <div className="mt-8 space-y-4">
              {smallClaimsSteps.map((point) => (
                <div
                  key={point}
                  className="rounded-2xl border border-[#dbe8e2] bg-[#f8fbf9] px-5 py-4"
                >
                  <p className="text-base font-medium text-[#15312b]">
                    {point}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/builder?path=small-claims"
                className="inline-block rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#276a57]"
              >
                Continue to Small Claims Intake →
              </Link>

              <Link
                href="/document-workspace?path=small-claims"
                className="inline-block rounded-full border border-[#bdd4ca] bg-white px-6 py-3 text-sm font-semibold text-[#1c473d] transition hover:border-[#2f7d67] hover:text-[#2f7d67]"
              >
                Go to Small Claims Documents →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#d9e6df] bg-[#edf7f3]">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h2 className="text-3xl font-bold tracking-tight text-[#10231f]">
            Official Ontario resources
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#557168]">
            These links provide official Ontario information. Verify final court
            requirements directly with the court and official sources.
          </p>
          <ul className="mt-7 grid gap-3 md:grid-cols-2" aria-label="Official Ontario Small Claims Court resources">
            {[
              ["Suing someone in Small Claims Court", "https://www.ontario.ca/page/suing-someone-small-claims-court"],
              ["Being sued in Small Claims Court", "https://www.ontario.ca/page/being-sued-small-claims-court"],
              ["Guide to procedures in Small Claims Court", "https://www.ontario.ca/document/guide-procedures-small-claims-court"],
              ["Official Small Claims Court forms", "https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/"],
              ["Rules of the Small Claims Court", "https://www.ontario.ca/laws/regulation/980258"],
            ].map(([label, href]) => (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl border border-[#bdd4ca] bg-white px-5 py-4 text-sm font-semibold text-[#1c473d] transition hover:border-[#2f7d67] hover:text-[#2f7d67]"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-[#d9e6df] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h2 className="text-3xl font-bold text-[#10231f]">
            Looking for a specific small claims form?
          </h2>

          <p className="mt-4 max-w-3xl text-[#557168]">
            Browse Small Claims Court forms directly if you already know what you
            need, or continue through the intake if you want CourtSimplified to
            help identify the likely next documents.
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/forms?path=small-claims"
              className="inline-block rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white hover:bg-[#276a57]"
            >
              Search Small Claims Forms →
            </Link>

            <Link
              href="/dashboard"
              className="inline-block rounded-full border border-[#bdd4ca] bg-white px-6 py-3 text-sm font-semibold text-[#1c473d] hover:border-[#2f7d67] hover:text-[#2f7d67]"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
