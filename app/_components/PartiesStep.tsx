"use client";

/**
 * THE PARTIES STEP: THE ONE PLACE PARTY DETAILS ARE ASKED (site owner, 14 Nov 2026, rules 1 and 2; Chrome forms test on
 * #550: the site never asked the person's name, address, phone or email or the defendant's address, and a second
 * defendant could not be added).
 *
 * Reads the parties from the case record (caseFileOf, file.parties) and writes them back through the one writer
 * (caseWrite.ts writeParties). Asks only what is still to ask (parties.ts detailsToAsk): a detail given, or marked
 * "I'm not sure", is never asked again. The other side's phone, email and representative, and anyone's second name,
 * are taken if given and never asked. Each detail the story gives is offered once with the three choices
 * (UseSuggestion: Yes / No, that's not right / I'm not sure); No is never offered again, Not sure is never asked again.
 * More than one party on either side, each its own entry.
 *
 * No model is involved, and nothing here is sent to one (rule 3). States no law.
 */
import { useMemo, useState, useSyncExternalStore } from "react";
import { useIntakeRecovery } from "./IntakeRecovery";
import { writeParties } from "./caseWrite";
import { UseSuggestion } from "./UseSuggestion";
import { bringsTheCase, caseFileOf, storyOfFile } from "../../src/lib/case-system/caseFile/caseFile";
import {
  detailStatus, detailsToAsk, partyName, partyOfOffer, storyPartyOffers,
  type Party, type PartiesRecord, type PartyDetail, type PartyKind, type PartyOffer,
} from "../../src/lib/case-system/parties/parties";
import { OFFER_CHOICES } from "../../src/lib/case-system/copy/suggestionCopy";

const LABELS: Record<PartyDetail, string> = {
  companyName: "Company's full legal name", firstName: "First name", secondName: "Second name", lastName: "Last name", fullName: "Name",
  alsoKnownAs: "Also known as", street: "Street address (number, street, apartment or unit)", city: "City or town", province: "Province", postalCode: "Postal code",
  phone: "Phone number", email: "Email address",
  repName: "Representative's name", repLso: "Representative's Law Society of Ontario number", repStreet: "Representative's street address", repCity: "Representative's city or town",
  repProvince: "Representative's province", repPostalCode: "Representative's postal code", repPhone: "Representative's phone number", repEmail: "Representative's email address",
};
const OPTIONAL: PartyDetail[] = ["secondName", "phone", "email", "repName", "repLso", "repStreet", "repCity", "repProvince", "repPostalCode", "repPhone", "repEmail"];

const newId = () => `p-${Math.random().toString(36).slice(2, 10)}`;

/** The record to edit: the saved one, or what an older case holds (the person always first). */
function startingRecord(list: readonly Party[], declined: readonly string[]): PartiesRecord {
  const parties = list.map((party) => ({ ...party, details: { ...party.details }, unsure: [...party.unsure] }));
  if (!parties.some((party) => party.you)) parties.unshift({ id: "you", you: true, side: "yours", details: {}, unsure: [] });
  if (!parties.some((party) => party.side === "other")) parties.push({ id: newId(), side: "other", details: {}, unsure: [] });
  return { version: 1, list: parties, declined: [...declined] };
}

/** The name given whole, split at its last space, as an offer from the person's own words ("Test Plaintiff"). */
function nameSplit(party: Party, declined: readonly string[]): { firstName: string; lastName: string } | null {
  if (declined.includes(`name-split:${party.id}`) || party.kind !== "person" || party.details.firstName || party.details.lastName || !party.details.fullName) return null;
  const parts = party.details.fullName.trim().split(/\s+/);
  return parts.length >= 2 ? { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] } : null;
}

export default function PartiesStep({ heading = "The parties" }: { heading?: string }) {
  const recovery = useIntakeRecovery();
  const view = useSyncExternalStore(recovery?.subscribe ?? (() => () => {}), recovery?.getReview ?? (() => null), () => null);
  const file = useMemo(() => (view ? caseFileOf(view.checkpoint, recovery?.getSavedMaster() ?? undefined) : null), [view, recovery]);
  const savedDeclined = useMemo(() => {
    const saved = (view?.checkpoint.sections as Record<string, Record<string, unknown>> | undefined)?.caseFile?.parties as { declined?: string[] } | undefined;
    return Array.isArray(saved?.declined) ? saved!.declined : [];
  }, [view]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [showOptional, setShowOptional] = useState<Record<string, boolean>>({});
  if (!recovery || !file) return null;

  const record = startingRecord(file.parties.list, savedDeclined);
  const personSues = bringsTheCase(file) || !file.side.value;
  const sideWord = (party: Party) => (party.side === "other" ? (personSues ? "Defendant" : "Plaintiff") : personSues ? "Plaintiff" : "Defendant");
  const save = (next: PartiesRecord) => { try { writeParties(recovery, next); setError(""); } catch (problem) { setError((problem as Error).message); } };
  const update = (id: string, change: (party: Party) => Party) => save({ ...record, list: record.list.map((party) => (party.id === id ? change(party) : party)) });
  const give = (id: string, detail: PartyDetail, value: string) => update(id, (party) => ({ ...party, details: { ...party.details, [detail]: value.trim() }, unsure: party.unsure.filter((item) => item !== detail) }));
  const unsure = (id: string, detail: PartyDetail) => update(id, (party) => ({ ...party, unsure: [...new Set([...party.unsure, detail])] }));
  const setKind = (id: string, kind: PartyKind) => update(id, (party) => ({ ...party, kind }));

  const offers = storyPartyOffers(storyOfFile(file), record);
  const acceptOffer = (offer: PartyOffer) => {
    const held = partyOfOffer(record, offer);
    if (held) return update(held.id, (party) => ({ ...party, ...(offer.kind && !party.kind ? { kind: offer.kind } : {}), details: { ...party.details, [offer.detail]: offer.value } }));
    // A party the story names that is not held yet: added as its own entry, with this detail.
    const blankOther = record.list.find((party) => party.side === "other" && !partyName(party) && !Object.keys(party.details).length);
    const added: Party = { id: blankOther?.id ?? newId(), side: "other", ...(offer.kind ? { kind: offer.kind } : {}), details: { [offer.detail]: offer.value }, unsure: [] };
    if (offer.detail !== "fullName" && offer.detail !== "companyName" && offer.partyName) added.details[offer.kind === "company" ? "companyName" : "fullName"] = offer.partyName;
    save({ ...record, list: blankOther ? record.list.map((party) => (party.id === blankOther.id ? added : party)) : [...record.list, added] });
  };
  const declineOffer = (offer: PartyOffer) => save({ ...record, declined: [...new Set([...record.declined, offer.key])] });
  const unsureOffer = (offer: PartyOffer) => {
    const held = partyOfOffer(record, offer);
    if (held) unsure(held.id, offer.detail);
    else declineOffer(offer);
  };
  const offersFor = (party: Party) => offers.filter((offer) => partyOfOffer(record, offer)?.id === party.id || (!partyOfOffer(record, offer) && party.side === "other" && !partyName(party) && offer.party === "other:1"));
  const unheldOffers = offers.filter((offer) => offer.party !== "you" && !partyOfOffer(record, offer) && offer.party !== "other:1");

  const box = (party: Party, detail: PartyDetail, optional = false) => {
    const key = `${party.id}:${detail}`;
    const status = detailStatus(party, detail);
    // The story gives this detail: it is offered (Yes / No / Not sure), not asked as an empty box beside the offer.
    if (status === "ask" && offersFor(party).some((offer) => offer.detail === detail || ((detail === "firstName" || detail === "lastName" || detail === "companyName") && (offer.detail === "fullName" || offer.detail === "companyName")))) return null;
    if (status === "ask" && (detail === "firstName" || detail === "lastName") && nameSplit(party, record.declined)) return null;
    if (status === "known") {
      return (
        <p key={key} data-testid="parties-detail-held" data-detail={detail} className="text-sm">
          <span className="font-semibold">{LABELS[detail]}:</span> {party.details[detail]}{" "}
          <button type="button" data-testid="parties-detail-change" className="text-[#2f7d67] underline" onClick={() => { setDrafts((current) => ({ ...current, [key]: party.details[detail] ?? "" })); update(party.id, (held) => { const details = { ...held.details }; delete details[detail]; return { ...held, details }; }); }}>Change</button>
        </p>
      );
    }
    if (status === "settled") return <p key={key} data-testid="parties-detail-unsure" data-detail={detail} className="text-sm"><span className="font-semibold">{LABELS[detail]}:</span> Not sure yet <span className="text-[#4d675f]">(not asked again)</span></p>;
    return (
      <label key={key} className="block text-sm" data-testid="parties-detail-ask" data-detail={detail}>
        <span className="font-semibold">{LABELS[detail]}</span>{optional ? <span className="text-[#4d675f]"> (if you have it)</span> : null}
        <span className="mt-1 flex flex-wrap gap-2">
          <input type={detail.toLowerCase().includes("email") ? "email" : "text"} aria-label={`${sideWord(party)}${party.you ? " (you)" : ""}: ${LABELS[detail]}`} data-testid={`parties-input-${detail}`} className="min-w-[14rem] flex-1 rounded border p-2" value={drafts[key] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))}
            onBlur={() => { const typed = (drafts[key] ?? "").trim(); if (typed) { give(party.id, detail, typed); setDrafts((current) => { const next = { ...current }; delete next[key]; return next; }); } }}
            onKeyDown={(event) => { if (event.key === "Enter") (event.target as HTMLInputElement).blur(); }} />
          {optional ? null : <button type="button" data-testid="parties-detail-not-sure" className="rounded border px-3 py-1" onClick={() => unsure(party.id, detail)}>{OFFER_CHOICES.unsure}</button>}
        </span>
      </label>
    );
  };

  return (
    <section data-testid="parties-step" id="parties" className="space-y-4 rounded-xl border border-[#d8e6df] bg-white p-4">
      <h2 className="text-lg font-semibold text-[#16302b]">{heading}</h2>
      <p className="text-sm text-[#4d675f]">Each person or company is its own entry. Your details are kept in your case and written into the forms when you download them.</p>
      {record.list.map((party) => {
        const split = nameSplit(party, record.declined);
        const asked = detailsToAsk(party);
        const own = offersFor(party);
        const number = record.list.filter((other) => other.side === party.side).indexOf(party) + 1;
        return (
          <article key={party.id} data-testid="parties-party" data-party={party.you ? "you" : party.side} data-party-id={party.id} className="space-y-2 rounded-lg border border-[#e3ece7] p-3">
            <h3 className="font-semibold">{sideWord(party)} {number}{party.you ? " (you)" : ""}{partyName(party) ? `: ${partyName(party)}` : ""}</h3>
            {own.map((offer) => (
              <UseSuggestion key={offer.key} testId="parties-offer-yes" noTestId="parties-offer-no" unsureTestId="parties-offer-unsure" what={`${LABELS[offer.detail]}: ${offer.value}`} note={`From your story: "${offer.quote}"`} onUse={() => acceptOffer(offer)} onNo={() => declineOffer(offer)} onUnsure={() => unsureOffer(offer)} />
            ))}
            {!party.kind ? (
              <div role="group" aria-label={`Is ${partyName(party) || "this party"} a person or a company?`} className="flex flex-wrap gap-2 text-sm" data-testid="parties-kind">
                <span className="font-semibold">A person or a company?</span>
                <button type="button" data-testid="parties-kind-person" className="rounded border px-3 py-1" onClick={() => setKind(party.id, "person")}>A person</button>
                <button type="button" data-testid="parties-kind-company" className="rounded border px-3 py-1" onClick={() => setKind(party.id, "company")}>A company or business</button>
              </div>
            ) : null}
            {split ? (
              <UseSuggestion testId="parties-name-split-yes" noTestId="parties-name-split-no" unsureTestId="parties-name-split-unsure" what={`First name: ${split.firstName} · Last name: ${split.lastName}`} note={`From the name you gave: "${party.details.fullName}"`}
                onUse={() => update(party.id, (held) => ({ ...held, details: { ...held.details, firstName: split.firstName, lastName: split.lastName } }))}
                onNo={() => save({ ...record, declined: [...new Set([...record.declined, `name-split:${party.id}`])] })}
                onUnsure={() => update(party.id, (held) => ({ ...held, unsure: [...new Set([...held.unsure, "firstName" as const, "lastName" as const])] }))} />
            ) : null}
            {(party.kind === "company" ? (["companyName"] as PartyDetail[]) : party.kind === "person" ? (["firstName", "lastName"] as PartyDetail[]) : []).map((detail) => (asked.includes(detail) || detailStatus(party, detail) !== "ask" ? box(party, detail) : null))}
            {(["street", "city", "province", "postalCode"] as PartyDetail[]).map((detail) => box(party, detail))}
            {party.you ? (["phone", "email"] as PartyDetail[]).map((detail) => box(party, detail)) : null}
            {OPTIONAL.filter((detail) => !(party.you && (detail === "phone" || detail === "email"))).some((detail) => detailStatus(party, detail) === "known") || showOptional[party.id]
              ? OPTIONAL.filter((detail) => !(party.you && (detail === "phone" || detail === "email")) && !(party.kind === "company" && detail === "secondName")).map((detail) => box(party, detail, true))
              : <button type="button" data-testid="parties-optional-open" className="text-sm text-[#2f7d67] underline" onClick={() => setShowOptional((current) => ({ ...current, [party.id]: true }))}>Add {party.you ? "a second name or a representative" : "a phone number, email or representative"} (if you have them)</button>}
            {!party.you ? <button type="button" data-testid="parties-remove" className="text-sm text-[#8a4b12] underline" onClick={() => save({ ...record, list: record.list.filter((other) => other.id !== party.id) })}>Remove this {sideWord(party).toLowerCase()}</button> : null}
          </article>
        );
      })}
      {unheldOffers.length ? (
        <div data-testid="parties-story-others" className="space-y-2">
          <p className="text-sm font-semibold">Your story also names:</p>
          {unheldOffers.filter((offer) => offer.detail === "companyName" || offer.detail === "fullName").map((offer) => (
            <UseSuggestion key={offer.key} testId="parties-offer-yes" noTestId="parties-offer-no" unsureTestId="parties-offer-unsure" what={`Another ${personSues ? "defendant" : "plaintiff"}: ${offer.value}`} note={`From your story: "${offer.quote}"`} onUse={() => acceptOffer(offer)} onNo={() => declineOffer(offer)} onUnsure={() => declineOffer(offer)} />
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid="parties-add-other" className="rounded-xl border border-[#2f7d67] px-4 py-2 text-sm font-semibold text-[#2f7d67]" onClick={() => save({ ...record, list: [...record.list, { id: newId(), side: "other", details: {}, unsure: [] }] })}>Add another {personSues ? "defendant" : "plaintiff"}</button>
        <button type="button" data-testid="parties-add-yours" className="rounded-xl border border-[#d8e6df] px-4 py-2 text-sm font-semibold text-[#16302b]" onClick={() => save({ ...record, list: [...record.list, { id: newId(), side: "yours", details: {}, unsure: [] }] })}>Add another {personSues ? "plaintiff" : "defendant"} on your side</button>
      </div>
      {error ? <p role="alert" className="text-sm text-[#8a4b12]">{error}</p> : null}
    </section>
  );
}
