import Link from "next/link";

const processSteps = [
  {
    title: "1. Understand the dispute",
    text: "Clarify what happened, who is responsible, what evidence exists, what amount is claimed or disputed, and what outcome you want.",
  },
  {
    title: "2. Prepare the claim or defence",
    text: "Organize the facts into a clear timeline and explain the loss, damage, unpaid amount, or disagreement.",
  },
  {
    title: "3. File and serve documents",
    text: "Use the correct Small Claims Court documents, then serve the other side properly and keep proof of service.",
  },
  {
    title: "4. Organize evidence",
    text: "Collect screenshots, invoices, receipts, contracts, photos, messages, estimates, witness details, and timelines.",
  },
  {
    title: "5. Prepare for settlement conference",
    text: "A judge may review the issues, explore settlement, identify weaknesses, and discuss what proof is still missing.",
  },
  {
    title: "6. Prepare for trial or enforcement",
    text: "If the case does not resolve, organize the evidence and documents needed for trial or judgment enforcement.",
  },
];

const prepareItems = [
  "Names and addresses of all parties",
  "A clear timeline of events",
  "Invoices, receipts, screenshots, emails, letters, contracts, and photos",
  "The amount being claimed or disputed",
  "Evidence showing damages, loss, payment, non-payment, or responsibility",
  "Possible defence arguments, weaknesses, or proof gaps",
];

export default function OntarioSmallClaimsPage() {
  return (
    <main className="min-h-screen bg-[#f8faf8] text-[#16302b]">
      <section className="border-b border-[#d9e6df] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#2f7d67]">
            Ontario Small Claims Court
          </p>

          <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-[#10231f] md:text-5xl">
            Build a structured Ontario Small Claims Court file.
          </h1>

          <p className="mt-6 max-w-4xl text-lg leading-8 text-[#4f685f]">
            This section helps you understand Ontario Small Claims Court,
            organize evidence, prepare documents, and move into the connected
            CourtSimplified workflow.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/builder?path=small-claims"
              className="rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#276a57]"
            >
              Start Small Claims Intake →
            </Link>

            <Link
              href="/documents?path=small-claims"
              className="rounded-full border border-[#bdd4ca] bg-white px-6 py-3 text-sm font-semibold text-[#1c473d] transition hover:border-[#2f7d67] hover:text-[#2f7d67]"
            >
              Go to Documents
            </Link>

            <Link
              href="/forms?path=small-claims"
              className="rounded-full border border-[#2f7d67] bg-white px-6 py-3 text-sm font-semibold text-[#2f7d67] transition hover:bg-[#edf7f3]"
            >
              Browse Forms
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f7d67]">
                Claim limit
              </p>
              <p className="mt-2 text-2xl font-bold text-[#10231f]">
                Up to $50,000
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f7d67]">
                Common documents
              </p>
              <p className="mt-2 text-sm leading-7 text-[#557168]">
                Plaintiff’s Claim, Defence, Settlement Conference Brief,
                affidavits, witness materials, and enforcement documents.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f7d67]">
                Court focus
              </p>
              <p className="mt-2 text-sm leading-7 text-[#557168]">
                Clear timelines, focused evidence, consistent facts, and
                organized documents are stronger than emotional arguments.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#10231f]">
              What Small Claims Court is for
            </h2>

            <p className="mt-4 leading-7 text-[#557168]">
              Small Claims Court is commonly used for disputes involving unpaid
              money, property damage, contracts, services, business disputes,
              debt, defamation, negligence, refunds, and other civil disputes
              within the monetary limit.
            </p>

            <div className="mt-6 rounded-2xl border border-[#efe2a5] bg-[#fff9db] p-4">
              <h3 className="font-semibold text-[#10231f]">
                Strong cases are organized cases
              </h3>
              <p className="mt-2 text-sm leading-7 text-[#5f5a3d]">
                CourtSimplified should help users separate facts from opinions,
                connect evidence to each issue, identify proof gaps, and prepare
                court-ready materials.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#10231f]">
              How the process usually works
            </h2>

            <div className="mt-6 space-y-4">
              {processSteps.map((step) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-[#dbe8e2] bg-[#f8fbf9] p-4"
                >
                  <h3 className="font-semibold text-[#10231f]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[#557168]">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#d9e6df] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-2xl font-bold text-[#10231f]">
            What you should prepare
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {prepareItems.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[#dbe8e2] bg-[#f8fbf9] px-5 py-4 text-sm font-medium text-[#15312b]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f8faf8]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="rounded-3xl border border-[#d8e6df] bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-[#10231f]">
              Continue into the CourtSimplified workflow
            </h2>

            <p className="mx-auto mt-4 max-w-3xl leading-7 text-[#557168]">
              Start the structured intake so the case can move through analysis,
              evidence, forms, documents, strategy, court package, and export.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-4">
              <Link
                href="/builder?path=small-claims"
                className="rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#276a57]"
              >
                Start Small Claims Intake →
              </Link>

              <Link
                href="/small-claims"
                className="rounded-full border border-[#bdd4ca] bg-white px-6 py-3 text-sm font-semibold text-[#1c473d] transition hover:border-[#2f7d67] hover:text-[#2f7d67]"
              >
                Back to Small Claims Overview
              </Link>

              <Link
                href="/dashboard"
                className="rounded-full border border-[#bdd4ca] bg-white px-6 py-3 text-sm font-semibold text-[#1c473d] transition hover:border-[#2f7d67] hover:text-[#2f7d67]"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}