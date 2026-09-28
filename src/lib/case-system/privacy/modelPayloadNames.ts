/**
 * Names never go to the model.
 *
 * The three intake adapters (Small Claims, civil, family) write a raw-text
 * summary of the intake that becomes `rawUserText`, and the brain sends the
 * normalized intake -- rawUserText included -- to OpenAI. They used to write
 * the user's and the other party's names into it verbatim.
 *
 * Nothing downstream needs the name itself: missing-information checks read
 * `input.yourName` directly, and documents are filled from the database, not
 * from model output. The model only needs to know whether a name was entered,
 * so that is all it is told.
 *
 * Decided 2026-09-27 for the LSO A2I application, which states that the name
 * fields are stored in the Canadian database and never sent to the AI. Names a
 * user types inside their own story still reach the model as part of the
 * story; that is disclosed, not claimed otherwise.
 *
 * Asserted by `npm run test:no-names-to-model`.
 */
export const NAME_RECORDED = "recorded (not shared with AI)";
export const NAME_NOT_ENTERED = "not entered";

export function nameRecorded(value: unknown): string {
  return typeof value === "string" && value.trim() ? NAME_RECORDED : NAME_NOT_ENTERED;
}
