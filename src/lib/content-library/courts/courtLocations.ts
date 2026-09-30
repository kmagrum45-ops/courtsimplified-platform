/**
 * Superior Court of Justice courthouses: address and the contact for each kind
 * of court event, for Small Claims, civil, family and Divisional Court
 * (2026-09-30). The site had no courthouse information at all.
 *
 * Built from the court's own location pages (ontariocourts.ca/scj/locations),
 * fetched by the Fetch Decisions workflow; the page text is saved under
 * docs/sources/court-locations/ and test:court-locations checks that every
 * name, address line, email and phone number here is on its page. Criminal
 * scheduling contacts are left out: the site does not cover criminal matters.
 *
 * Ontario Court of Justice courthouses (where many family cases are heard) come
 * from a different page: the court's list of courthouse email addresses, by
 * region (ocjCourthouses.json; saved text in
 * docs/sources/court-locations/ocj-courthouse-email-addresses.txt). Their
 * addresses are not included: the OCJ location pages carry the address inside
 * an HTML comment, so it is not reliably what the page shows.
 */
import data from "./courtLocations.json";
import ocj from "./ocjCourthouses.json";

export type LocationCourt = "small-claims" | "civil" | "family" | "divisional";

export type CourtLocation = {
  slug: string;
  name: string;
  url: string;
  address: string[];
  services: {
    court: LocationCourt;
    address: string[];
    contacts: { event: string; email: string | null; phone: string | null }[];
  }[];
};

export const COURT_LOCATIONS_RETRIEVED_AT: string = data.retrievedAt;
export const COURT_LOCATIONS_SOURCE: string = data.source;
export const COURT_LOCATIONS = data.locations as CourtLocation[];

export const LOCATION_COURT_LABELS: Record<LocationCourt, string> = {
  "small-claims": "Small Claims Court",
  civil: "Civil",
  family: "Family",
  divisional: "Divisional Court",
};

export type OcjCourthouse = { region: string; city: string; emails: string[] };

export const OCJ_COURTHOUSES = ocj.courthouses as OcjCourthouse[];
export const OCJ_SOURCE: string = ocj.source;
