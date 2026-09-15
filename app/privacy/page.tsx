import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy & Terms | CourtSimplified",
  description:
    "What CourtSimplified collects, where it is stored, what is sent to OpenAI, and how to have it deleted.",
};

/**
 * Sourced from docs/security/DATA_FLOW_INVENTORY.md, section by section. When
 * that document changes, this page changes with it — a privacy notice that
 * describes something other than what the system does is worse than none,
 * because a user relies on it.
 *
 * Held as data rather than inline JSX so the text stays exactly as written,
 * without apostrophes and em dashes being escaped into HTML entities.
 *
 * Plain language throughout, deliberately. The people reading this are
 * self-represented and many are in distress. A notice they cannot read is one
 * they have not consented to.
 */
const sections: { heading: string; paragraphs: string[] }[] = [
  {
    heading: "What CourtSimplified is",
    paragraphs: [
      "CourtSimplified helps you organize your own court case. It gives you legal information, not legal advice. It is not a law firm, and using it does not create a lawyer-client relationship.",
      "It can tell you what a rule says and what a form asks for. It cannot tell you whether you will win, whether your case is strong, or what you should do. Those are decisions for you, and a licensed lawyer or paralegal can help you make them.",
    ],
  },
  {
    heading: "What you give us",
    paragraphs: [
      "Your account details: your email address, and your password, which is stored by our database provider in a scrambled form that nobody here can read.",
      "Everything you enter about your case: what happened, when, who was involved, the amounts of money at issue, and the answers you give to the intake questions. In family matters this can include income figures, information about your children, and information about your relationship.",
      "Any files you upload as evidence, and any documents the platform generates for you.",
    ],
  },
  {
    heading: "About the other person in your case",
    paragraphs: [
      "To fill out a court form, we ask for the other party's name and address. That means we hold information about a person who does not have an account here and has not been told we hold it.",
      "We are telling you this plainly because you should know it. We do not contact that person, we do not sell or share their information, and we do not use it for anything except the documents you are preparing. But it is their information, sitting in our database, and they have not been asked.",
    ],
  },
  {
    heading: "What we send to OpenAI",
    paragraphs: [
      "The platform uses OpenAI to read what you have written and help organize it — to pull dates and names out of your description, suggest what a form field should say, and work out which questions to ask you next.",
      "That means the words you write about your case leave our systems and go to OpenAI. This is the part of this notice we most want you to read.",
      "What we have checked: API call logging is turned off on our OpenAI account, and we have confirmed that nothing has ever been recorded there. Under OpenAI's terms, data sent through the API is not used to train their models.",
      "What we have not solved: OpenAI's standard terms allow them to retain API data for up to 30 days for abuse monitoring. We have not applied for the zero-retention arrangement that would remove this. So for up to 30 days, what you wrote can exist on OpenAI's systems, outside our control. We would rather say that than leave it out.",
      "If you would prefer not to send something to OpenAI, do not type it into the platform.",
    ],
  },
  {
    heading: "Emails we send you",
    paragraphs: [
      "We send email for one reason only: to let you get back into your account. A password reset link, or a sign-in link if you ask for one. We do not send newsletters, marketing, or reminders.",
      "Those emails come from noreply@courtsimplified.com and are delivered by a company called Resend, which in turn delivers through Amazon's email service. That means your email address goes to Resend and to Amazon in order to reach you.",
      "What goes to them is your email address and the link itself. Nothing about your case is in those emails and nothing about your case is sent to Resend or Amazon.",
    ],
  },
  {
    heading: "Where your information is kept",
    paragraphs: [
      "Your information is stored in Canada. The database the live site runs on is hosted by Supabase in their Canadian region, in central Canada. Uploaded evidence is stored there too.",
      "The exception is the OpenAI processing described above, which happens on OpenAI's systems outside Canada.",
    ],
  },
  {
    heading: "Deleting your information",
    paragraphs: [
      "There is no delete button yet. We are building one. Until it exists, email us and we will delete your information by hand.",
      "We have tested what that removes. Deleting your account removes everything held in the database: your case, your intake answers, your generated documents, the evidence records, and the timeline — all of it, automatically, with nothing left behind.",
      "One thing is not automatic. The evidence files themselves are held in separate file storage, and that storage is not covered by the database deletion. Those files have to be deleted as a second, explicit step. We would do that too, as part of the same request — but it is a step a person has to remember to take, rather than something the system guarantees, and that is a gap we are closing.",
      "Ask us and we will confirm when it is done.",
    ],
  },
  {
    heading: "Cookies and what your browser keeps",
    paragraphs: [
      "One cookie: cs_site_access. It records that you entered the password that gates the site while it is in testing. Nothing else.",
      "If you have an account, your sign-in session is kept in your browser's local storage rather than a cookie, so you stay signed in between visits. Signing out clears it.",
      "There are no tracking cookies and no advertising cookies.",
    ],
  },
  {
    heading: "What we don't do",
    paragraphs: [
      "We do not use analytics, advertising, or session-replay tools. Nobody is watching a recording of you using the site, and no third party is being told that you visited.",
      "We do not sell your information. We do not share it with anyone except the service providers named here — Supabase, which stores it, OpenAI, which processes what you write, and Resend and Amazon, which deliver the sign-in emails.",
    ],
  },
  {
    heading: "While we're in testing",
    paragraphs: [
      "CourtSimplified is still being built. Things can break, and information you enter could be lost while we are changing how it is stored. Keep your own copies of anything that matters.",
      "Do not upload a document you would not want held on a platform that is still being tested.",
      "A full Privacy Policy and Terms of Service are being finalized with legal counsel before public launch. This notice describes what the platform actually does today.",
    ],
  },
];

const contactEmail = "courtsimplified@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f8faf8] text-[#16302b]">
      <section className="border-b border-[#d9e6df] bg-white">
        <div className="mx-auto w-full max-w-3xl px-6 py-16">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#2f7d67]">
            Privacy & Terms
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#10231f] md:text-5xl">
            {"What we collect, and what happens to it"}
          </h1>

          <p className="mt-6 text-lg leading-8 text-[#4f685f]">
            {"CourtSimplified is in testing. This page says what the platform actually does with what you give it — including the parts we have not finished. If something here is unclear, ask us."}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="rounded-3xl border border-[#d9e6df] bg-white p-6 md:p-8">
          {sections.map((section, index) => (
            <div
              key={section.heading}
              className={
                index === 0
                  ? ""
                  : "mt-10 border-t border-[#e5ece9] pt-10"
              }
            >
              <h2 className="text-2xl font-bold tracking-tight text-[#10231f]">
                {section.heading}
              </h2>

              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 40)}
                  className="mt-4 text-lg leading-8 text-[#4f685f]"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ))}

          <div className="mt-10 border-t border-[#e5ece9] pt-10">
            <h2 className="text-2xl font-bold tracking-tight text-[#10231f]">
              {"Getting in touch"}
            </h2>

            <p className="mt-4 text-lg leading-8 text-[#4f685f]">
              {"To ask a question, to have your information deleted, or to tell us something here is wrong: "}
              <a
                className="font-semibold text-[#2f7d67] underline transition hover:text-[#256454]"
                href={`mailto:${contactEmail}`}
              >
                {contactEmail}
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
