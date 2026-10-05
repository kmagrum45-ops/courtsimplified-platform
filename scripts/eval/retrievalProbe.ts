/**
 * What meaning-based retrieval finds for stories written the way people write
 * them. Real model and embeddings calls; a report, not a gate.
 *
 * Each story names the sources a lawyer would reach for first. The report
 * shows the queries the model wrote, every passage retrieved with its score
 * and pinpoint, and whether each expected source was found -- so a change to
 * the chunker, the query prompt or the search shows up as recall moving, and
 * a passage that should never have come back is visible by name.
 *
 * Fabricated stories only; no user data. Needs OPENAI_API_KEY (the Story
 * Review workflow runs it and publishes retrieval-probe.md).
 *
 *   npm run eval:retrieval
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import { retrieveForStory, type RetrievalCourt } from "../../src/lib/case-system/retrieval/storyRetrieval";

type ProbeStory = {
  id: string;
  court: RetrievalCourt;
  stage?: string;
  side?: "plaintiff" | "defendant";
  story: string;
  /** Source ids a lawyer would look at first. At least one should come back. */
  expect: string[];
};

const STORIES: ProbeStory[] = [
  {
    id: "deposit-kept",
    court: "small-claims",
    story:
      "I rented a basement apartment for two years and moved out at the end of June. I paid first and last month when I moved in. My old landlord never gave back the last month and now he won't answer my texts. He says I left the place dirty but I cleaned it.",
    expect: ["residential-tenancies-act-2006"],
  },
  {
    id: "served-claim",
    court: "small-claims",
    stage: "responding",
    side: "defendant",
    story:
      "A guy I did some renovation work for is suing me. A man came to my door last week and handed me papers from the court saying I owe him $9,000 because the deck I built was bad. I don't agree. What do I have to do and how long do I have?",
    expect: ["oreg-258-98-small-claims-rules"],
  },
  {
    id: "dog-bite",
    court: "small-claims",
    story:
      "My neighbour's dog got out and bit my son on the leg when he was riding his bike past their house. We had to go to the hospital and he needed stitches and missed school. The neighbour says it's not their fault because the gate was broken.",
    expect: ["dog-owners-liability-act"],
  },
  {
    id: "sidewalk-fall",
    court: "small-claims",
    story:
      "I slipped on ice on the city sidewalk outside the library three weeks ago and broke my wrist. The sidewalk hadn't been salted at all. I want the city to pay for my lost wages.",
    expect: ["municipal-act-2001", "city-of-toronto-act-2006"],
  },
  {
    id: "repair-overcharge",
    court: "small-claims",
    story:
      "The garage said it would be about $600 to fix my brakes. When I went to pick up the car the bill was $1,400 and they won't give me my car back until I pay.",
    expect: ["consumer-protection-act-2002", "repair-and-storage-liens-act", "cleo-debt-and-consumer-rights-can-repair-shop-charge-me-more-they-said-they-would"],
  },
  {
    id: "facebook-post",
    court: "small-claims",
    story:
      "My ex-business partner posted on Facebook that I steal from customers. It's not true and I've lost two clients because of it. He also said it in the local paper's comment section.",
    expect: ["libel-and-slander-act"],
  },
  {
    id: "fired-no-notice",
    court: "civil",
    story:
      "I worked at a warehouse for eleven years. Last Friday they called me in and said my position was eliminated, effective immediately. They gave me two weeks' pay and that was it.",
    expect: ["esa-2000-ontario"],
  },
  {
    id: "move-with-child",
    court: "family",
    story:
      "My ex and I share our daughter week on week off. He just told me he took a job three hours away and is moving with her at the end of the month. I don't want her to go.",
    expect: ["childrens-law-reform-act", "divorce-act"],
  },
  {
    id: "support-unpaid",
    court: "family",
    story:
      "The father of my kids was ordered to pay child support two years ago and hasn't paid anything in eight months. I don't know where he works now.",
    expect: ["family-responsibility-support-arrears-enforcement-act"],
  },
  {
    id: "afraid-of-ex",
    court: "family",
    story:
      "My ex keeps showing up at my work and my apartment even though I told him to stop. Last time he threatened me. We were never married but we lived together for four years.",
    expect: ["family-law-act", "childrens-law-reform-act"],
  },
];

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set.");
  const lines: string[] = ["# Retrieval probe", "", `Run ${new Date().toISOString()}.`, ""];
  let found = 0;
  for (const probe of STORIES) {
    const result = await retrieveForStory({ story: probe.story, courtPath: probe.court, stage: probe.stage, side: probe.side });
    const sources = new Set(result.passages.map((passage) => passage.sourceId));
    const hit = probe.expect.some((id) => sources.has(id));
    if (hit) found += 1;
    lines.push(`## ${probe.id} (${probe.court}) -- ${hit ? "expected source found" : "EXPECTED SOURCE MISSING"}`, "");
    lines.push(`Expected one of: ${probe.expect.join(", ")}${result.skipped ? ` -- skipped: ${result.skipped}` : ""}`, "");
    lines.push("Queries:", ...result.queries.map((query) => `- ${query}`), "");
    lines.push("| score | passage | pinpoint | starts |", "|---|---|---|---|");
    for (const passage of result.passages) {
      lines.push(
        `| ${passage.score.toFixed(3)} | ${passage.id} | ${passage.pinpoint || passage.heading.slice(0, 40)} | ${passage.text.slice(0, 90).replace(/\|/g, "/")} |`,
      );
    }
    lines.push("");
  }
  lines.splice(3, 0, `**${found} of ${STORIES.length} stories retrieved an expected source.**`, "");
  const out = path.join(process.cwd(), "retrieval-probe.md");
  writeFileSync(out, lines.join("\n") + "\n");
  console.log(`${found} of ${STORIES.length} stories retrieved an expected source. Wrote ${out}.`);
}

main().catch((error) => {
  const status = (error as { status?: number })?.status;
  console.error(`${status ? `HTTP ${status}: ` : ""}${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
