import Link from "next/link";

const FAMILY_TOPICS = [
  {
    title: "Parenting",
    description:
      "Decision-making responsibility, parenting time, schedules, safety concerns, and parenting disputes.",
  },
  {
    title: "Support",
    description:
      "Child support, spousal support, income disclosure, expenses, and financial obligations.",
  },
  {
    title: "Separation & Divorce",
    description:
      "Separation agreements, divorce process, property issues, and long-term family restructuring.",
  },
];

const COURT_STEPS = [
  {
    step: "1",
    title: "Identify the legal issues",
    description:
      "Clarify parenting, support, separation, property, disclosure, urgency, or enforcement concerns.",
  },
  {
    step: "2",
    title: "Build your case facts",
    description:
      "Organize timelines, communications, financial records, children’s information, and supporting evidence.",
  },
  {
    step: "3",
    title: "Generate forms and documents",
    description:
      "CourtSimplified analyzes your situation and prepares the proper Ontario family court workflow.",
  },
  {
    step: "4",
    title: "Prepare for court",
    description:
      "Move into conferences, motions, evidence preparation, drafting assistance, and court packages.",
  },
];

export default function OntarioFamilyPage() {
  return (
    <main className="min-h-screen bg-[#F7FAFA] text-[#1F2937]">
      {/* HERO */}
      <section className="border-b border-[#DDEAEA] bg-[linear-gradient(180deg,#F7FEFE_0%,#FBF8F2_100%)]">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#1A9F96]">
            Ontario Family Law
          </div>

          <h1 className="max-w-4xl text-5xl font-bold leading-tight text-[#10231f]">
            Family law in Ontario, organized into a real litigation workflow
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-[#607376]">
            CourtSimplified helps you organize your facts, understand the
            Ontario family court process, prepare evidence, generate the right
            forms, and move step-by-step through your case with structure and
            clarity.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#workflow"
              className="rounded-2xl bg-[#2FB8AC] px-7 py-4 font-semibold text-white transition hover:bg-[#249d92]"
            >
              Understand the Process
            </a>

            <Link
              href="/builder?path=family"
              className="rounded-2xl border border-[#D6E4E3] bg-white px-7 py-4 font-semibold text-[#16302b] transition hover:border-[#2FB8AC]"
            >
              Start Your Family Case →
            </Link>

            <Link
              href="/family"
              className="rounded-2xl border border-[#D6E4E3] bg-[#F9FCFC] px-7 py-4 font-semibold text-[#16302b]"
            >
              Back to Provinces
            </Link>
          </div>
        </div>
      </section>

      {/* OVERVIEW */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-[#10231f]">
            What CourtSimplified helps you do
          </h2>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#607376]">
            This is not just a forms page. CourtSimplified is designed to help
            you understand your case, organize your evidence, prepare documents,
            identify legal risks, and build a stronger court-ready file.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-[#DDEAEA] bg-white p-7 shadow-sm">
            <h3 className="mb-3 text-xl font-bold text-[#16302b]">
              Understand your situation
            </h3>

            <p className="leading-7 text-[#607376]">
              Clarify parenting disputes, support issues, disclosure problems,
              urgency concerns, separation conflicts, and procedural next steps.
            </p>
          </div>

          <div className="rounded-3xl border border-[#DDEAEA] bg-white p-7 shadow-sm">
            <h3 className="mb-3 text-xl font-bold text-[#16302b]">
              Build organized evidence
            </h3>

            <p className="leading-7 text-[#607376]">
              Structure timelines, communications, financial records, parenting
              concerns, court orders, and supporting documents into one coherent
              litigation workspace.
            </p>
          </div>

          <div className="rounded-3xl border border-[#DDEAEA] bg-white p-7 shadow-sm">
            <h3 className="mb-3 text-xl font-bold text-[#16302b]">
              Prepare for the court process
            </h3>

            <p className="leading-7 text-[#607376]">
              Move into drafting, conferences, motions, forms, court packages,
              and procedural preparation with AI-assisted workflow support.
            </p>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section
        id="workflow"
        className="border-y border-[#E3ECEB] bg-[#F8FBFB] py-16"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-[#10231f]">
              Typical Ontario family court workflow
            </h2>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-[#607376]">
              Every family case is different, but most cases move through
              similar stages. CourtSimplified is designed to support this full
              process from intake to court preparation.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {COURT_STEPS.map((item) => (
              <div
                key={item.step}
                className="rounded-3xl border border-[#DDEAEA] bg-white p-7 shadow-sm"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7FAF8] text-lg font-bold text-[#1A9F96]">
                  {item.step}
                </div>

                <h3 className="mb-3 text-xl font-bold text-[#16302b]">
                  {item.title}
                </h3>

                <p className="leading-7 text-[#607376]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TOPICS */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-[#10231f]">
            Main Ontario family law areas
          </h2>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#607376]">
            CourtSimplified is being engineered to support complex family law
            litigation workflows, procedural preparation, and evidence
            organization across a wide range of Ontario family court matters.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {FAMILY_TOPICS.map((topic) => (
            <div
              key={topic.title}
              className="rounded-3xl border border-[#DDEAEA] bg-white p-7 shadow-sm"
            >
              <h3 className="mb-3 text-xl font-bold text-[#16302b]">
                {topic.title}
              </h3>

              <p className="leading-7 text-[#607376]">
                {topic.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* NEXT ACTION */}
      <section className="border-t border-[#E3ECEB] bg-[#F8FBFB] py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-[32px] border border-[#DDEAEA] bg-white p-10 shadow-sm">
            <div className="max-w-4xl">
              <h2 className="text-4xl font-bold text-[#10231f]">
                Start building your family case
              </h2>

              <p className="mt-5 text-lg leading-8 text-[#607376]">
                Begin your intake, organize your facts, generate your case
                analysis, and move into your litigation workspace.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/builder?path=family"
                className="rounded-2xl bg-[#2FB8AC] px-8 py-4 font-semibold text-white transition hover:bg-[#249d92]"
              >
                Start Family Intake →
              </Link>

              <Link
                href="/documents?path=family"
                className="rounded-2xl border border-[#D6E4E3] bg-white px-8 py-4 font-semibold text-[#16302b]"
              >
                View Family Forms & Documents
              </Link>

              <Link
                href="/dashboard"
                className="rounded-2xl border border-[#D6E4E3] bg-[#F9FCFC] px-8 py-4 font-semibold text-[#16302b]"
              >
                Open My Workspace
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}