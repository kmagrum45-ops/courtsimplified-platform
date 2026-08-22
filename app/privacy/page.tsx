import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy & Terms — Interim Notice | CourtSimplified",
  description:
    "Interim privacy and terms notice for CourtSimplified during pre-beta development.",
};

// Held as data rather than inline JSX so the notice text stays exactly as
// written, without escaping apostrophes or em dashes into HTML entities.
const noticeParagraphs = [
  "CourtSimplified is currently in pre-beta development. We collect the information necessary to provide the features you use — your intake responses, uploaded evidence, and account details — to help organize and assemble your case materials.",
  "CourtSimplified provides legal information only, not legal advice, and is not a law firm. Using this site does not create a lawyer-client relationship.",
  "A full Privacy Policy and Terms of Service are being finalized with legal counsel ahead of public launch. During this development period, please avoid uploading sensitive documents you wouldn't want stored while the platform is still being tested and refined.",
];

const contactEmail = "courtsimplified@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f8faf8] text-[#16302b]">
      <section className="border-b border-[#d9e6df] bg-white">
        <div className="mx-auto w-full max-w-3xl px-6 py-16">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#2f7d67]">
            Interim Notice
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#10231f] md:text-5xl">
            {"Privacy & Terms — Interim Notice"}
          </h1>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="rounded-3xl border border-[#d9e6df] bg-white p-6 md:p-8">
          {noticeParagraphs.map((paragraph) => (
            <p
              key={paragraph.slice(0, 40)}
              className="mt-6 text-lg leading-8 text-[#4f685f] first:mt-0"
            >
              {paragraph}
            </p>
          ))}

          <p className="mt-8 border-t border-[#e5ece9] pt-6 text-lg leading-8 text-[#4f685f]">
            {"Questions or concerns: "}
            <a
              className="font-semibold text-[#2f7d67] underline transition hover:text-[#256454]"
              href={`mailto:${contactEmail}`}
            >
              {contactEmail}
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
