"use client";

import { useMemo, useState } from "react";

import {
  LOCATION_COURT_LABELS,
  type CourtLocation,
  type LocationCourt,
} from "../../src/lib/content-library/courts/courtLocations";

const FILTERS: (LocationCourt | "all")[] = ["all", "small-claims", "civil", "family", "divisional"];

export default function CourthouseList({ locations }: { locations: CourtLocation[] }) {
  const [query, setQuery] = useState("");
  const [court, setCourt] = useState<LocationCourt | "all">("all");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return locations.filter(
      (location) =>
        (court === "all" || location.services.some((service) => service.court === court)) &&
        (!q || `${location.name} ${location.address.join(" ")}`.toLowerCase().includes(q)),
    );
  }, [locations, query, court]);

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className="text-sm font-semibold text-[#16302b]">City, town or postal code</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="For example: Ottawa, Barrie, M5G"
            aria-label="Search courthouses"
            className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white px-4 py-3 text-base"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-[#16302b]">Court</span>
          <select
            value={court}
            onChange={(event) => setCourt(event.target.value as LocationCourt | "all")}
            className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white px-4 py-3 text-base sm:w-56"
          >
            {FILTERS.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All courts" : LOCATION_COURT_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-2 text-sm text-[#4d675f]" aria-live="polite">
        Showing {shown.length} of {locations.length} locations
      </p>

      <ul className="mt-4 space-y-3">
        {shown.map((location) => (
          <li key={location.slug} className="rounded-2xl border border-[#d8e6df] bg-white p-5">
            <h2 className="text-lg font-bold text-[#10231f]">{location.name}</h2>
            <p className="mt-1 whitespace-pre-line text-sm text-[#24463d]">{location.address.join("\n")}</p>
            {location.services
              .filter((service) => court === "all" || service.court === court)
              .map((service) => (
                <details key={service.court} className="mt-3 text-sm text-[#4d675f]">
                  <summary className="cursor-pointer font-semibold text-[#1c473d]">
                    {LOCATION_COURT_LABELS[service.court]} contacts ({service.contacts.length})
                  </summary>
                  {service.address.length > 0 && service.address.join(" ") !== location.address.join(" ") ? (
                    <p className="mt-2 whitespace-pre-line">{service.address.join("\n")}</p>
                  ) : null}
                  <ul className="mt-2 space-y-1">
                    {service.contacts.map((contact) => (
                      <li key={`${service.court}-${contact.event}`}>
                        <span className="font-semibold text-[#16302b]">{contact.event}:</span>{" "}
                        {contact.email ? (
                          <a href={`mailto:${contact.email}`} className="underline">
                            {contact.email}
                          </a>
                        ) : null}
                        {contact.email && contact.phone ? " · " : null}
                        {contact.phone ? <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>{contact.phone}</a> : null}
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            <p className="mt-3 text-xs">
              <a href={location.url} target="_blank" rel="noreferrer" className="underline">
                The court&apos;s page for this location
              </a>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
