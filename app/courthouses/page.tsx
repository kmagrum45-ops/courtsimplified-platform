import Link from "next/link";

import {
  COURT_LOCATIONS,
  COURT_LOCATIONS_RETRIEVED_AT,
  COURT_LOCATIONS_SOURCE,
  OCJ_COURTHOUSES,
  OCJ_SOURCE,
} from "../../src/lib/content-library/courts/courtLocations";
import CourthouseList from "./CourthouseList";

/**
 * Superior Court of Justice courthouses (2026-09-30). Addresses and contacts
 * are the court's own, from its location pages; see courtLocations.ts.
 */

export const metadata = {
  title: "Courthouses | CourtSimplified",
  description: "Addresses and contacts for Ontario Superior Court of Justice courthouses: Small Claims, civil and family.",
};

export default async function CourthousesPage({
  searchParams,
}: {
  searchParams: Promise<{ court?: string }>;
}) {
  const requested = (await searchParams).court;
  const initialCourt =
    requested === "small-claims" || requested === "civil" || requested === "family" || requested === "divisional"
      ? requested
      : "all";
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#2f7d67]">Courthouses</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#10231f] sm:text-4xl">Find a courthouse</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-[#4d675f]">
        Addresses and contact details for {COURT_LOCATIONS.length} Superior Court of Justice locations, including
        Small Claims Court, as the court publishes them. Contacts change; the court&apos;s own page for each location
        is linked and is the one to rely on.
      </p>
      <p className="mt-3 text-sm text-[#4d675f]">
        Source:{" "}
        <a href={COURT_LOCATIONS_SOURCE} target="_blank" rel="noreferrer" className="underline">
          Ontario Superior Court of Justice, court locations
        </a>
        , read {COURT_LOCATIONS_RETRIEVED_AT}. Ontario Court of Justice courthouses, where many family cases are
        heard, are listed <a href="#ocj" className="underline">below</a>. For filing online, see the{" "}
        <Link href="/guides/starting-a-civil-action" className="underline">
          civil
        </Link>{" "}
        and{" "}
        <Link href="/guides/fee-waivers" className="underline">
          fee waiver
        </Link>{" "}
        guides.
      </p>
      <CourthouseList locations={COURT_LOCATIONS} initialCourt={initialCourt} />

      <section id="ocj" className="mt-12">
        <h2 className="text-2xl font-bold text-[#10231f]">Ontario Court of Justice courthouses</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4d675f]">
          Many family cases are heard in the Ontario Court of Justice. This is the court&apos;s own list of courthouse
          email addresses, by region. For addresses, the court says the locations of its courthouses are posted on the
          Ministry of the Attorney General website.{" "}
          <a href={OCJ_SOURCE} target="_blank" rel="noreferrer" className="underline">
            Source: Ontario Court of Justice, courthouse email addresses
          </a>
          , read {COURT_LOCATIONS_RETRIEVED_AT}.
        </p>
        {Array.from(new Set(OCJ_COURTHOUSES.map((c) => c.region))).map((region) => (
          <div key={region} className="mt-5">
            <h3 className="text-lg font-bold text-[#10231f]">{region}</h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {OCJ_COURTHOUSES.filter((c) => c.region === region).map((c) => (
                <li key={`${region}-${c.city}`} className="rounded-xl border border-[#d8e6df] bg-white p-3 text-sm">
                  <span className="font-semibold text-[#16302b]">{c.city}</span>
                  {c.emails.map((email) => {
                    const address = email.match(/[\w.+-]+@[\w.-]+/)?.[0];
                    return (
                      <span key={email} className="block text-[#4d675f]">
                        {address ? <a href={`mailto:${address}`} className="underline">{email}</a> : email}
                      </span>
                    );
                  })}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
