/**
 * Server-only availability check for the configured reasoning provider.
 * This deliberately returns no credential or model details.
 */
export function hasConfiguredServerAi(): boolean {
  return typeof process.env.OPENAI_API_KEY === "string" &&
    process.env.OPENAI_API_KEY.trim().length > 0;
}
