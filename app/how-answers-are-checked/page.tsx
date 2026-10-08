import Link from "next/link";

/**
 * How answers are checked (2026-10-08): the method behind every answer the
 * site gives, in plain words, for the people who use it and for anyone
 * reviewing it (lawyers, paralegals, the Law Society). It describes the code in
 * src/lib/case-system/retrieval/checkedAnswer.ts; change one, change the other.
 */

const steps = [
  {
    title: "The question is answered the way a lawyer would",
    text: "The site reads your question and the facts you have given, applies the law to them, and names the Act, regulation or court rule behind every statement. Two answers are written independently and combined, so a point one leaves out the other can supply.",
  },
  {
    title: "The law itself is fetched",
    text: "Every section named is pulled from the site's library: the official text of Ontario statutes, regulations and court rules saved from ontario.ca (e-Laws), federal law from the Justice Laws website, Ontario government guides, and court decisions saved from the courts' own websites.",
  },
  {
    title: "Every statement is checked on its own",
    text: "A separate check reads each statement against the law and must copy, word for word, the words that support it. Code then confirms those words really are in the official text, that every number comes from the law or from your own figures, and that nothing predicts or grades your case. A statement that fails is checked once more against a wider search.",
  },
  {
    title: "A second look for anything missing",
    text: "A separate review reads the question, the confirmed answer and the law behind it, the way a senior lawyer reviews a file: what else does a complete answer need, and does every rule fit your facts? Anything it adds goes through the same word-for-word check. Anything it doubts is checked again and removed if it fails.",
  },
  {
    title: "Only what passed is shown",
    text: "Each statement is shown with the official words that support it and a link to the official text. A point the site could not confirm is not stated; it is listed as something we could not confirm, so you know to look it up or ask.",
  },
];

const never = [
  "It never tells you whether you will win, how strong your case is, or what a judge will decide.",
  "It never states a law it could not find in its library of official text.",
  "It never shows a statement whose supporting words are not really in the law.",
  "It is not a lawyer and does not represent you. A lawyer or licensed paralegal can advise on your whole situation.",
];

const limits = [
  "An answer can still leave out a point. If something matters to you, open the official text linked under each statement.",
  "The library holds the law as it was saved, with the date of each version. Law changes; the link opens the current official text.",
  "Court decisions have not been checked for later decisions that changed them. Each one is marked that way.",
  "Answers take up to two minutes, because each statement is checked before you see it.",
];

export default function HowAnswersAreCheckedPage() {
  return (
    <main className="min-h-screen bg-[#f8faf8] px-6 py-16 text-[#16302b]">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#2f7d67]">How answers are checked</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#10231f]">
          Every statement of law is checked against the official text before you see it.
        </h1>
        <p className="mt-6 text-lg leading-8 text-[#4f685f]">
          When you ask a question or tell your story, CourtSimplified answers it in plain words and applies the law
          to your facts. Before anything is shown, each statement is proven against the official law, word for word.
          Here is how.
        </p>

        <ol className="mt-10 space-y-6">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f7d67]">Step {index + 1}</p>
              <h2 className="mt-2 text-xl font-bold text-[#10231f]">{step.title}</h2>
              <p className="mt-2 text-base leading-7 text-[#4f685f]">{step.text}</p>
            </li>
          ))}
        </ol>

        <h2 className="mt-12 text-2xl font-bold text-[#10231f]">What it never does</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-7 text-[#4f685f]">
          {never.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <h2 className="mt-12 text-2xl font-bold text-[#10231f]">How we test it</h2>
        <p className="mt-4 text-base leading-7 text-[#4f685f]">
          The site sits a 160-question exam written like a licensing exam: open answers, not multiple choice, across
          small claims, civil procedure, family, housing, employment, consumer, estates and provincial offences. Every
          answer key is quoted from the official text. Thirty questions are held back and never used to tune the site,
          so its score on them is an honest measure.
        </p>

        <h2 className="mt-12 text-2xl font-bold text-[#10231f]">Its limits</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-7 text-[#4f685f]">
          {limits.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <div className="mt-12 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold leading-6 text-[#4f685f]">
            CourtSimplified guides you through the Ontario court system and helps you organize and manage your case on
            your own. It does not represent you in court or guarantee an outcome.
          </p>
        </div>

        <Link href="/" className="mt-8 inline-flex text-sm font-semibold text-[#2f7d67] underline underline-offset-4">
          ← Back to CourtSimplified
        </Link>
      </div>
    </main>
  );
}
