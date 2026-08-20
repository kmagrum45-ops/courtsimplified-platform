import Link from "next/link";

const familyTopics = [
  {
    title: "Parenting and decision-making",
    description:
      "Organize parenting schedules, decision-making responsibility, exchanges, communication issues, children’s routines, safety concerns, and communication problems.",
    image:
      "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Support and disclosure",
    description:
      "Track child support, spousal support, income, arrears, expenses, financial disclosure, and missing documents.",
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Separation, divorce, and property",
    description:
      "Prepare facts about separation dates, agreements, property, debts, the home, requested orders, and unresolved issues.",
    image:
      "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Adoption — review required",
    description:
      "A Family-law pathway that requires review of the current Ontario forms and court requirements. CourtSimplified does not automate or recommend an adoption filing here.",
    image:
      "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80",
  },
];

const familySteps = [
  "Start with a guided family intake so the case facts are captured once.",
  "Review a structured case summary showing issues, dates, missing information, and next steps.",
  "Move into documents and forms with the family path carried forward.",
  "Organize evidence, messages, screenshots, disclosure, and exhibits under the same case workflow.",
];

export default function FamilyPage() {
  return (
    <main className="min-h-screen bg-[#f8faf8] text-[#16302b]">
      <section className="border-b border-[#d9e6df] bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#2f7d67]">
              Family Court
            </p>

            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[#10231f] md:text-5xl">
              Get your family court information organized in one connected case
              system.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#4f685f]">
              Family court can involve parenting, decision-making, support,
              separation, divorce, property, safety concerns, and urgent issues.
              CourtSimplified helps you organize the facts before moving into
              analysis, forms, evidence, documents, and court packages.
            </p>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#4f685f]">
              Start by adding the facts, dates, people involved, documents, and
              what you want the court to consider.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/builder?path=family"
                className="rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#276a57]"
              >
                Start Family Intake →
              </Link>

              <Link
                href="/family/ontario"
                className="rounded-full border border-[#bdd4ca] bg-white px-6 py-3 text-sm font-semibold text-[#1c473d] transition hover:border-[#2f7d67] hover:text-[#2f7d67]"
              >
                Ontario Family Information
              </Link>

              <Link
                href="/forms?path=family"
                className="rounded-full border border-[#2f7d67] bg-white px-6 py-3 text-sm font-semibold text-[#2f7d67] transition hover:bg-[#edf7f3]"
              >
                Browse Family Forms
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[#d8e6df] bg-white shadow-sm">
            <img
              src="https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1400&q=80"
              alt="Family support"
              className="h-[320px] w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-[#d9e6df] bg-[#edf7f3]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="rounded-3xl border border-[#9fcbb9] bg-white p-7 shadow-sm">
            <h2 className="text-3xl font-bold tracking-tight text-[#10231f]">
              Safety, violence and support
            </h2>
            <p className="mt-3 max-w-4xl text-base leading-7 text-[#33584d]">
              If you or a child may be unsafe, your immediate safety comes first.
              If you are in immediate danger, call 911. These official Ontario
              resources can help women and anyone experiencing family or
              gender-based violence.
            </p>
            <ul className="mt-7 grid gap-3 md:grid-cols-2" aria-label="Official Ontario safety and family support resources">
              {[
                ["Connect with supports for survivors of violence", "https://www.ontario.ca/page/connect-supports-survivors-violence"],
                ["Family Court Support Workers", "https://www.ontario.ca/page/family-court-support-workers"],
                ["Ontario family law services", "https://www.ontario.ca/page/family-law-services"],
                ["Guide to procedures in Family Court", "https://www.ontario.ca/document/guide-procedures-family-court"],
                ["Official Family Law Rules forms", "https://ontariocourtforms.on.ca/en/family-law-rules-forms/"],
                ["Family Law Rules", "https://www.ontario.ca/laws/regulation/990114"],
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
            <p className="mt-5 max-w-4xl text-sm leading-6 text-[#557168]">
              These resources are official information, not legal advice. They
              do not determine a legal remedy or recommend a form.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-[#10231f]">
            What family court may involve
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#557168]">
            Choose this path if your situation involves family relationships,
            children, support, separation, divorce, property, or family safety
            concerns.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {familyTopics.map((topic) => (
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
              src="https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=1400&q=80"
              alt="Organized documents"
              className="h-full min-h-[320px] w-full object-cover"
            />
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[#10231f]">
              How this path connects
            </h2>

            <p className="mt-4 max-w-3xl text-base leading-7 text-[#557168]">
              Your family case should stay connected from intake through case
              analysis, documents, evidence, strategy, court package, and export.
            </p>

            <div className="mt-8 space-y-4">
              {familySteps.map((point) => (
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
                href="/builder?path=family"
                className="inline-block rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#276a57]"
              >
                Continue to Family Intake →
              </Link>

              <Link
                href="/document-workspace?path=family"
                className="inline-block rounded-full border border-[#bdd4ca] bg-white px-6 py-3 text-sm font-semibold text-[#1c473d] transition hover:border-[#2f7d67] hover:text-[#2f7d67]"
              >
                Go to Family Documents →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#d9e6df] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h2 className="text-3xl font-bold text-[#10231f]">
            Looking for a specific family form?
          </h2>

          <p className="mt-4 max-w-3xl text-[#557168]">
            Browse family court forms directly if you already know what you need,
            or continue through the intake if you want CourtSimplified to help
            identify likely next documents.
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/forms?path=family"
              className="inline-block rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white hover:bg-[#276a57]"
            >
              Search Family Forms →
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
