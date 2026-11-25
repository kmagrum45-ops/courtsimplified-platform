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
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { FROM_YOUR_STORY } from "../../src/lib/case-system/caseFile/storyOffers";
import { afterPointer } from "./afterPointer";
import { useIntakeRecovery } from "./IntakeRecovery";
import { writeParties } from "./caseWrite";
import { UseSuggestion } from "./UseSuggestion";
import { answeredInIntake, bringsTheCase, caseFileOf, heldOtherName, storyOfFile } from "../../src/lib/case-system/caseFile/caseFile";
import { locationOf } from "../../src/lib/case-system/intakeStory";
import {
  detailStatus, detailsToAsk, partyName, partyOfOffer, partySideWord, sideWordsOf, storyPartyOffers, withHeldOtherName, withHeldYourName, withNameParts, withStartLocation,
  type Party, type PartiesRecord, type PartyDetail, type PartyKind, type PartyOffer,
  isCompanyName,
} from "../../src/lib/case-system/parties/parties";
import { OFFER_CHOICES } from "../../src/lib/case-system/copy/suggestionCopy";
import { factStatus } from "../../src/lib/case-system/caseFile/factStatus";
import { boxView } from "../../src/lib/case-system/caseFile/boxView";
import { offeredOtherParty, readingFactsOf } from "../../src/lib/case-system/caseFile/storyOffers";

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
function startingRecord(list: readonly Party[], declined: readonly string[], placeholderId?: string): PartiesRecord {
  const parties = list.map((party) => ({ ...party, details: { ...party.details }, unsure: [...party.unsure] }));
  if (!parties.some((party) => party.you)) parties.unshift({ id: "you", you: true, side: "yours", details: {}, unsure: [] });
  if (!parties.some((party) => party.side === "other")) parties.push({ id: placeholderId ?? newId(), side: "other", details: {}, unsure: [] });
  return { version: 1, list: parties, declined: [...declined] };
}

// A whole name is split into a first and last name on read (parties.ts withNameParts), shown filled in with Change, never
// offered (the split was offered again after the chat had confirmed the name: site owner, 23 Nov 2026).

export default function PartiesStep({ heading = "The parties" }: { heading?: string }) {
  const recovery = useIntakeRecovery();
  const view = useSyncExternalStore(recovery?.subscribe ?? (() => () => {}), recovery?.getReview ?? (() => null), () => null);
  const file = useMemo(() => (view ? caseFileOf(view.checkpoint, recovery?.getSavedMaster() ?? undefined) : null), [view, recovery]);
  const savedDeclined = useMemo(() => {
    const saved = (view?.checkpoint.sections as Record<string, Record<string, unknown>> | undefined)?.caseFile?.parties as { declined?: string[] } | undefined;
    return Array.isArray(saved?.declined) ? saved!.declined : [];
  }, [view]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // The empty other party shown before any is saved keeps one id while this step is on screen: a new id on every draw
  // remade its entry each time (a box typed in lost its words) and a change to it could find no party.
  const placeholder = useRef(newId());
  const [error, setError] = useState("");
  const [showOptional, setShowOptional] = useState<Record<string, boolean>>({});
  // A box typed in stays a box while the focus is still in its party's entry, showing what was saved: it became one line
  // the moment it was left, so the boxes below moved up under the next click and typing landed in the wrong box (Chrome
  // pass 2 on #550, 1.9: "City or town: 100 Sample Road", Province "Ottawa"). It folds into the kept line when the focus
  // leaves the entry, after the pointer is released (afterPointer), so a button below never moves under a click.
  const [inEntry, setInEntry] = useState<string | null>(null);
  const [typedHere, setTypedHere] = useState<Record<string, true>>({});
  const step = useRef<HTMLElement | null>(null);
  // The focus left this party's entry (read once it has moved: after the click, or after Tab): its typed boxes fold into
  // their kept lines. Focus dropped to nothing (an element taken away) counts as left.
  const leftEntry = (id: string) => {
    const entry = Array.from(step.current?.querySelectorAll<HTMLElement>("[data-party-id]") ?? []).find((element) => element.dataset.partyId === id);
    if (entry && entry.contains(document.activeElement)) return;
    setInEntry((current) => (current === id ? null : current));
    setTypedHere((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${id}:`))));
  };
  if (!recovery || !file) return null;

  // Family: every party is a person (a parent, a spouse): never asked "A person or a company?" (Chrome milestone test of
  // #550, row 42 note). Read as a person here, and saved as one with the first detail given.
  const familyCourt = (view?.checkpoint.courtPath ?? file.area) === "family";
  const asPerson = (party: Party): Party => (familyCourt && !party.kind ? { ...party, kind: "person" } : party);
  // The person's own city and province from the home page (C9): shown as held in their entry, never asked again here.
  const givenOf = (sections: Record<string, unknown> | undefined) => ({ location: locationOf((sections ?? {}) as never), answered: answeredInIntake(sections) });
  const recordOf = (list: readonly Party[], declined: readonly string[], placeholderId?: string): PartiesRecord => { const held = startingRecord(list, declined, placeholderId); return { ...held, list: held.list.map(asPerson) }; };
  const withHeld = (held: PartiesRecord, sections: Record<string, unknown> | undefined, otherName: string): PartiesRecord => ({ ...held, list: withNameParts(withHeldYourName(withHeldOtherName(withStartLocation(held.list, givenOf(sections)), otherName), familyYourName(sections))) });
  // The person's own name typed in the Family form (C9): held in their own entry, never asked again here.
  const familyYourName = (sections: Record<string, unknown> | undefined) => { const name = (sections?.family as Record<string, unknown> | undefined)?.yourName; return typeof name === "string" ? name : null; };
  const placeholderId = placeholder.current;
  const record = withHeld(recordOf(file.parties.list, savedDeclined, placeholderId), view?.checkpoint.sections as Record<string, unknown> | undefined, heldOtherName(file));
  // Every change is made to the record as it is NOW, never to the copy this screen was drawn with: a box saved when the
  // focus left it and the button that took the focus each change the record, and the second built on the old copy undid
  // the first (Chrome milestone test of #550, row 12: the first click after typing "did nothing"; full local run of
  // 3774a858: "A person" and "Add another" lost to the name typed just before).
  const latest = (): PartiesRecord => {
    const checkpoint = recovery.getReview()?.checkpoint;
    if (!checkpoint) return record;
    const saved = (checkpoint.sections as Record<string, Record<string, unknown>> | undefined)?.caseFile?.parties as { declined?: string[] } | undefined;
    const now = caseFileOf(checkpoint, recovery.getSavedMaster() ?? undefined);
    return withHeld(recordOf(now.parties.list, Array.isArray(saved?.declined) ? saved!.declined : [], placeholderId), checkpoint.sections as Record<string, unknown> | undefined, heldOtherName(now));
  };
  const personSues = bringsTheCase(file) || !file.side.value;
  // The court's own words for each side (parties.ts sideWordsOf): Family's applicant and respondent (row 42).
  const court = view?.checkpoint.courtPath ?? file.area;
  const sideWord = (party: Party) => partySideWord(court, party, personSues);
  const words = sideWordsOf(court);
  const save = (change: (current: PartiesRecord) => PartiesRecord) => { try { writeParties(recovery, change(latest())); setError(""); } catch (problem) { setError((problem as Error).message); } };
  const update = (id: string, change: (party: Party) => Party) => save((current) => ({ ...current, list: current.list.map((party) => (party.id === id ? change(party) : party)) }));
  // A detail typed here is the person's own: saved, no longer read from the start (heldElsewhere).
  const give = (id: string, detail: PartyDetail, value: string) => update(id, (party) => ({ ...party, details: { ...party.details, [detail]: value.trim() }, unsure: party.unsure.filter((item) => item !== detail), heldElsewhere: party.heldElsewhere?.filter((item) => item !== detail) }));
  const unsure = (id: string, detail: PartyDetail) => update(id, (party) => ({ ...party, unsure: [...new Set([...party.unsure, detail])] }));
  const setKind = (id: string, kind: PartyKind) => update(id, (party) => ({ ...party, kind }));

  // The other party's name: the answer the case holds (not from this step), else the story reading's (storyOffers.ts).
  const heldOther = heldOtherName(file);
  const named = heldOther ? { value: heldOther, quote: heldOther } : offeredOtherParty(storyOfFile(file), readingFactsOf(view?.checkpoint.sections as Record<string, unknown> | undefined, storyOfFile(file)));
  // What the person gave outside the story too: the city at the start, and an address typed as an answer (findings 2, 3).
  const sections = view?.checkpoint.sections as Record<string, unknown> | undefined;
  const offers = storyPartyOffers(storyOfFile(file), record, named, { location: locationOf((sections ?? {}) as never), answered: answeredInIntake(sections) });
  const acceptOffer = (offer: PartyOffer) => {
    const record = latest();
    const held = partyOfOffer(record, offer);
    if (held) return update(held.id, (party) => ({ ...party, ...(offer.kind && !party.kind ? { kind: offer.kind } : {}), details: { ...party.details, [offer.detail]: offer.value } }));
    // A party the story names that is not held yet: added as its own entry, with this detail.
    const blankOther = record.list.find((party) => party.side === "other" && !partyName(party) && !Object.keys(party.details).length);
    const added: Party = { id: blankOther?.id ?? newId(), side: "other", ...(offer.kind ? { kind: offer.kind } : {}), details: { [offer.detail]: offer.value }, unsure: [] };
    if (offer.detail !== "fullName" && offer.detail !== "companyName" && offer.detail !== "firstName" && offer.partyName) added.details[offer.kind === "company" ? "companyName" : "fullName"] = offer.partyName;
    save((current) => ({ ...current, list: blankOther ? current.list.map((party) => (party.id === blankOther.id ? added : party)) : [...current.list, added] }));
  };
  const declineOffer = (offer: PartyOffer) => save((current) => ({ ...current, declined: [...new Set([...current.declined, offer.key])] }));
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
    // A box the person is editing stays that box while the focus is in its entry, typed or emptied (an emptied name part
    // turned into an empty question at once, asking for a name the case still held by its other part: carry runs of
    // 24 Nov, "remove a value"). It folds when the focus leaves the entry (leftEntry).
    const typing = (status === "known" || status === "ask") && inEntry === party.id && Boolean(typedHere[key]);
    if (status === "known" && !typing) {
      return (
        <p key={key} data-testid="parties-detail-held" data-detail={detail} className="text-sm">
          <span className="font-semibold">{LABELS[detail]}:</span> {party.details[detail]}{" "}
          <button type="button" data-testid="parties-detail-change" className="text-[#2f7d67] underline" onClick={() => {
            // Change opens the same box, pre-filled and typeable (boxView, "answered"): the answer stays held until the
            // person types another or empties the box and leaves it. It used to be taken away at once for a detail typed
            // here, which showed an empty box asking for a name the case still held (carry runs of 24 Nov, "remove a value").
            setDrafts((current) => ({ ...current, [key]: party.details[detail] ?? "" }));
            setInEntry(party.id);
            setTypedHere((current) => ({ ...current, [key]: true }));
          }}>Change</button>
        </p>
      );
    }
    // The one other party's name the record holds as "not sure" or removed in another place (the chat, the review, the
    // questions): not asked again here (one asker; the carry and story-pack runs of #563: "What is the other person's
    // name?" answered "I do not know yet", then First name and Last name asked here).
    const nameDetail = detail === "firstName" || detail === "lastName" || detail === "fullName" || detail === "companyName" || detail === "secondName";
    const settledElsewhere = !typing && status === "ask" && nameDetail && party.side === "other" && !partyName(party) && record.list.filter((item) => item.side === "other").length === 1 && factStatus(file, "otherParty") === "settled";
    // "Not sure" here, or the name "not sure" or removed elsewhere: the box stays, typeable, with the note that it is not
    // asked again (boxView, site owner 24 Nov 2026 rule 1: a box people type into exists in every state). Not a question:
    // its own testid, never "parties-detail-ask".
    const settledNote = status === "settled" || settledElsewhere ? boxView({ state: "unsure" }, drafts[key] ?? "").note : null;
    return (
      <label key={key} className="block text-sm" data-testid={typing ? "parties-detail-typing" : settledNote !== null || status === "settled" || settledElsewhere ? "parties-detail-unsure" : "parties-detail-ask"} data-detail={detail}>
        <span className="font-semibold">{LABELS[detail]}</span>{optional ? <span className="text-[#4d675f]"> (if you have it)</span> : null}
        {settledNote ? <span className="ml-1 text-[#4d675f]" data-testid="not-answered-yet" data-detail={detail}>{settledNote}</span> : null}
        <span className="mt-1 flex flex-wrap gap-2">
          <input type={detail.toLowerCase().includes("email") ? "email" : "text"} aria-label={`${sideWord(party)}${party.you ? " (you)" : ""}: ${LABELS[detail]}`} data-testid={`parties-input-${detail}`} className="min-w-0 flex-[1_1_14rem] rounded border p-2" value={drafts[key] ?? (typing ? party.details[detail] ?? "" : "")} onChange={(event) => { const value = event.target.value; setDrafts((current) => ({ ...current, [key]: value })); setTypedHere((current) => (current[key] ? current : { ...current, [key]: true })); }}
            onBlur={() => afterPointer(() => (() => {
              const draft = drafts[key];
              if (draft === undefined) return;
              const typed = draft.trim();
              const held = typing ? (party.details[detail] ?? "").trim() : "";
              // Typed: saved. Emptied while it still shows the saved words: taken away AND kept as not asked again (boxView,
              // "removed": the same box with "Not sure yet (not asked again)", and it stays removed; site owner 24 Nov 2026
              // rule 1). It was taken away into an open question, asked again at once (carry runs of 24 Nov, "remove a
              // value"). Typing in its box later gives it again (give() clears the mark). Unchanged: nothing.
              if (typed && typed !== held) give(party.id, detail, typed);
              else if (!typed && held) update(party.id, (current) => { const details = { ...current.details }; delete details[detail]; return { ...current, details, unsure: [...new Set([...current.unsure, detail])] }; });
              setDrafts((current) => { const next = { ...current }; delete next[key]; return next; });
            })())}
            onKeyDown={(event) => { if (event.key === "Enter") (event.target as HTMLInputElement).blur(); }} />
          {/* Kept while the box is typed in: Tab from a box lands on this button, and the box's save then turned it into a
              typed box; taking the button away there dropped the focus to nothing, so the entry never heard it was left and
              stayed open (local run of the Parties spec, 18 Nov). Pressed after typing, the typed words are taken back out. */}
          {optional || status === "settled" || settledElsewhere ? null : <button type="button" data-testid="parties-detail-not-sure" className="rounded border px-3 py-1" onClick={() => {
            if (!typing) return unsure(party.id, detail);
            setDrafts((current) => { const next = { ...current }; delete next[key]; return next; });
            update(party.id, (held) => { const details = { ...held.details }; delete details[detail]; return { ...held, details, unsure: [...new Set([...held.unsure, detail])] }; });
          }}>{OFFER_CHOICES.unsure}</button>}
        </span>
      </label>
    );
  };

  return (
    <section ref={step} data-testid="parties-step" id="parties" className="space-y-4 rounded-xl border border-[#d8e6df] bg-white p-4">
      <h2 className="text-lg font-semibold text-[#16302b]">{heading}</h2>
      <p className="text-sm text-[#4d675f]">Each person or company is its own entry. Your details are kept in your case and written into the forms when you download them.</p>
      {record.list.map((party) => {
        const asked = detailsToAsk(party);
        const own = offersFor(party);
        const number = record.list.filter((other) => other.side === party.side).indexOf(party) + 1;
        return (
          <article key={party.id} data-testid="parties-party" data-party={party.you ? "you" : party.side} data-party-id={party.id} className="space-y-2 rounded-lg border border-[#e3ece7] p-3"
            onFocus={() => setInEntry(party.id)}
            onBlur={() => afterPointer(() => window.setTimeout(() => leftEntry(party.id), 0))}>
            <h3 className="font-semibold">{sideWord(party)} {number}{party.you ? " (you)" : ""}{partyName(party) ? `: ${partyName(party)}` : ""}</h3>
            {own.map((offer) => (
              <UseSuggestion key={offer.key} offer={{ key: offer.key, fact: null, recordedBy: "screen" }} testId="parties-offer-yes" noTestId="parties-offer-no" unsureTestId="parties-offer-unsure" what={`${LABELS[offer.detail]}: ${offer.value}`} note={offer.from && offer.from !== "story" ? offer.quote : `${FROM_YOUR_STORY} "${offer.quote}"`} onUse={() => acceptOffer(offer)} onNo={() => declineOffer(offer)} onUnsure={() => unsureOffer(offer)} />
            ))}
            {/* Not asked while the story's name for this party is offered with its kind ("Inc." is a company): the offer
                settles it on Yes, and after "No" this is asked (one asker; the question logs of #563: asked beside the offer). */}
            {!party.kind && !own.some((offer) => offer.kind && (offer.detail === "fullName" || offer.detail === "companyName")) ? (
              <div role="group" aria-label={`Is ${partyName(party) || "this party"} a person or a company?`} className="flex flex-wrap gap-2 text-sm" data-testid="parties-kind">
                <span className="font-semibold">A person or a company?</span>
                <button type="button" data-testid="parties-kind-person" className="rounded border px-3 py-1" onClick={() => setKind(party.id, "person")}>A person</button>
                <button type="button" data-testid="parties-kind-company" className="rounded border px-3 py-1" onClick={() => setKind(party.id, "company")}>A company or business</button>
              </div>
            ) : null}
            {(party.kind === "company" ? (["companyName"] as PartyDetail[]) : party.kind === "person" ? (["firstName", "lastName"] as PartyDetail[]) : []).map((detail) => (asked.includes(detail) || detailStatus(party, detail) !== "ask" ? box(party, detail) : null))}
            {(["street", "city", "province", "postalCode"] as PartyDetail[]).map((detail) => box(party, detail))}
            {party.you ? (["phone", "email"] as PartyDetail[]).map((detail) => box(party, detail)) : null}
            {OPTIONAL.filter((detail) => !(party.you && (detail === "phone" || detail === "email"))).some((detail) => detailStatus(party, detail) === "known") || showOptional[party.id]
              ? OPTIONAL.filter((detail) => !(party.you && (detail === "phone" || detail === "email")) && !(party.kind === "company" && detail === "secondName")).map((detail) => box(party, detail, true))
              : <button type="button" data-testid="parties-optional-open" className="text-sm text-[#2f7d67] underline" onClick={() => setShowOptional((current) => ({ ...current, [party.id]: true }))}>Add {party.you ? "a second name or a representative" : "a phone number, email or representative"} (if you have them)</button>}
            {!party.you ? <button type="button" data-testid="parties-remove" className="text-sm text-[#8a4b12] underline" onClick={() => save((current) => ({ ...current, list: current.list.filter((other) => other.id !== party.id) }))}>Remove this {sideWord(party).toLowerCase()}</button> : null}
          </article>
        );
      })}
      {unheldOffers.length ? (
        <div data-testid="parties-story-others" className="space-y-2">
          <p className="text-sm font-semibold">Your story also names:</p>
          {unheldOffers.filter((offer) => offer.detail === "companyName" || offer.detail === "fullName").map((offer) => (
            <UseSuggestion key={offer.key} offer={{ key: offer.key, fact: null, recordedBy: "screen" }} testId="parties-offer-yes" noTestId="parties-offer-no" unsureTestId="parties-offer-unsure" what={`Another ${(personSues ? words.responds : words.starts).toLowerCase()}: ${offer.value}`} note={offer.from && offer.from !== "story" ? offer.quote : `${FROM_YOUR_STORY} "${offer.quote}"`} onUse={() => acceptOffer(offer)} onNo={() => declineOffer(offer)} onUnsure={() => declineOffer(offer)} />
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid="parties-add-other" className="rounded-xl border border-[#2f7d67] px-4 py-2 text-sm font-semibold text-[#2f7d67]" onClick={() => save((current) => ({ ...current, list: [...current.list, { id: newId(), side: "other", details: {}, unsure: [] }] }))}>Add another {(personSues ? words.responds : words.starts).toLowerCase()}</button>
        <button type="button" data-testid="parties-add-yours" className="rounded-xl border border-[#d8e6df] px-4 py-2 text-sm font-semibold text-[#16302b]" onClick={() => save((current) => ({ ...current, list: [...current.list, { id: newId(), side: "yours", details: {}, unsure: [] }] }))}>Add another {(personSues ? words.starts : words.responds).toLowerCase()} on your side</button>
      </div>
      {error ? <p role="alert" className="text-sm text-[#8a4b12]">{error}</p> : null}
    </section>
  );
}
