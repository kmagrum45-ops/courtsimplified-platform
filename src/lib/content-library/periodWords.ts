/**
 * A STAGE-MAP PERIOD IN WORDS, ONE COPY (27 Nov 2026). The next-step card (StageAnswerPanel's period line) and the new
 * Small Claims results step's deadlines block both write a period with no date counted yet as
 * "{what}. {count} {unit} after {countFrom}." from the stage map's own fields: this is the only place that wording is
 * put together, so the two can never word one period differently. States no law of its own.
 */
export const periodUnit = (count: number, word: string): string => `${count} ${count === 1 ? word.replace(/s$/, "") : word}`;

export const periodLine = (period: { what: string; count: number; unit: string; countFrom: string }): string => `${period.what}. ${periodUnit(period.count, period.unit)} after ${period.countFrom}.`;
