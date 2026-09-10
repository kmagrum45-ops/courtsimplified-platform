export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f8faf8] px-6 py-16 text-[#16302b]">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#2f7d67]">
          About CourtSimplified
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#10231f]">
          Access to justice should not depend on how much money you have.
        </h1>

        <p className="mt-6 text-lg leading-8 text-[#4f685f]">
          Many people must represent themselves in court because full legal
          representation can cost thousands of dollars. CourtSimplified is
          being built to give self-represented litigants a more affordable
          way to understand court procedures, organize evidence, prepare
          documents, and manage a case from beginning to end.
        </p>

        <p className="mt-4 text-lg leading-8 text-[#4f685f]">
          Our goal is practical, structured tools at a cost ordinary people
          can manage, while being clear about when a court requirement should
          be verified or a licensed paralegal or lawyer is the right next
          step.
        </p>

        <div className="mt-10 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold leading-6 text-[#4f685f]">
            CourtSimplified provides legal information and case-management
            tools. It does not provide legal representation, guarantee an
            outcome, or replace advice from a qualified legal professional
            when one is needed.
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-[#f1c78d] bg-[#fff4e5] p-6">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9a4f13]">
            Ontario beta in development
          </p>
          <p className="mt-2 text-sm leading-6 text-[#6f4727]">
            CourtSimplified is currently in active development and is
            expected to launch an Ontario beta in the coming months. Features,
            information, and workflows may change during testing.
          </p>
        </div>
      </div>
    </main>
  );
}
