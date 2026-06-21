import Link from "next/link";

const processSteps = [
  {
    title: "1. Identify the legal path",
    text: "Clarify whether the matter sounds like negligence, contract, Charter, misfeasance, property, defamation, employment, institutional failure, or another civil theory.",
  },
  {
    title: "2. Organize the facts",
    text: "Build a timeline, identify parties, separate facts from conclusions, and connect each major point to evidence.",
  },
  {
    title: "3. Prepare the claim",
    text: "Draft a clear claim that explains what happened, who is responsible, what legal theory applies, what harm resulted, and what remedy is requested.",
  },
  {
    title: "4. File and serve documents",
    text: "File the correct court documents, serve the other parties properly, and keep proof of service.",
  },
  {
    title: "5. Respond to defence issues",
    text: "Anticipate limitation arguments, causation attacks, damages disputes, evidentiary gaps, jurisdiction issues, and procedural objections.",
  },
  {
    title: "6. Build the court package",
    text: "Prepare evidence, chronology, issue-proof charts, affidavits, motion materials, settlement materials, or trial materials as needed.",
  },
];

const prepareItems = [
  "Full legal names of all parties",
  "A clear timeline of events",
  "Contracts, emails, letters, screenshots, records, receipts, reports, and court documents",
  "The harm, loss, or remedy being requested",
  "Any deadline, limitation issue, court date, urgency, or service problem",
  "Possible weaknesses or arguments the other side may raise",
];

export default function OntarioCivilPage() {
  return (
    <main className="min-h-screen bg-[#f8faf8] text-[#16302b]">
      <section className="border-b border-[#d9e6df] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#2f7d67]">
            Ontario Civil Court
          </p>

          <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-[#10231f] md:text-5xl">
            Prepare a structured Ontario Superior Court civil case.
          </h1>

          <p className="mt-6 max-w-4xl text-lg leading-8 text-[#4f685f]">
            This section is for larger or more complex Ontario civil disputes,
            including contract claims, negligence, property disputes,
            Charter-related claims, institutional failure, defamation, and other
            matters that may require a formal court process.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/builder?path=civil"
              className="rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#276a57]"
            >
              Start Civil Intake →
            </Link>

            <Link
              href="/documents?path=civil"
              className="rounded-full border border-[#bdd4ca] bg-white px-6 py-3 text-sm font-semibold text-[#1c473d] transition hover:border-[#2f7d67] hover:text-[#2f7d67]"
            >
              Go to Documents
            </Link>

            <Link
              href="/forms?path=civil"
              className="rounded-full border border-[#2f7d67] bg-white px-6 py-3 text-sm font-semibold text-[#2f7d67] transition hover:bg-[#eef8f5]"
            >
              Browse Civil Forms
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f7d67]">
                Court
              </p>
              <p className="mt-2 text-2xl font-bold text-[#10231f]">
                Superior Court of Justice
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f7d67]">
                Common documents
              </p>
              <p className="mt-2 text-sm leading-7 text-[#557168]">
                Statement of Claim, Defence, Reply, motion materials,
                affidavits, discovery materials, settlement materials, and trial
                preparation documents.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f7d67]">
                Court focus
              </p>
              <p className="mt-2 text-sm leading-7 text-[#557168]">
                Civil claims need careful issue, evidence, limitation, damages,
                causation, party, and procedural analysis.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#10231f]">
              What this court is for
            </h2>

            <p className="mt-4 leading-7 text-[#557168]">
              Civil court is used for higher-value or more complex legal issues
              where the claim may involve legal duties, damages, evidence
              disputes, government action, professional conduct, property,
              contracts, negligence, defamation, Charter issues, or other
              structured causes of action.
            </p>

            <div className="mt-6 rounded-2xl border border-[#efe2a5] bg-[#fff9db] p-4">
              <h3 className="font-semibold text-[#10231f]">
                Civil cases need structure
              </h3>
              <p className="mt-2 text-sm leading-7 text-[#5f5a3d]">
                Strong civil preparation connects facts, legal issues, evidence,
                damages, procedure, and likely defence arguments into one
                organized case file.
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
              Continue into the CourtSimplified civil workflow
            </h2>

            <p className="mx-auto mt-4 max-w-3xl leading-7 text-[#557168]">
              Start the structured intake so the case can move through analysis,
              evidence, forms, documents, litigation strategy, court package,
              and export.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-4">
              <Link
                href="/builder?path=civil"
                className="rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#276a57]"
              >
                Start Civil Intake →
              </Link>

              <Link
                href="/evidence?path=civil"
                className="rounded-full border border-[#bdd4ca] bg-white px-6 py-3 text-sm font-semibold text-[#1c473d] transition hover:border-[#2f7d67] hover:text-[#2f7d67]"
              >
                Open Evidence Workspace
              </Link>

              <Link
                href="/civil"
                className="rounded-full border border-[#bdd4ca] bg-white px-6 py-3 text-sm font-semibold text-[#1c473d] transition hover:border-[#2f7d67] hover:text-[#2f7d67]"
              >
                Back to Civil Overview
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