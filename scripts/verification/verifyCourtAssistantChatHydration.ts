import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  createChatExternalStore,
  type ChatStorageLike,
} from "../../app/builder/_components/CourtAssistantChat";
import {
  directPrefillValues,
  extractNarrativePrefill,
} from "../../src/lib/case-system/intelligence/narrativePrefill";

class MemoryStorage implements ChatStorageLike {
  readonly values = new Map<string, string>();
  reads = 0;
  removals = 0;
  writes = 0;

  getItem(key: string) {
    this.reads += 1;
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.writes += 1;
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.removals += 1;
    this.values.delete(key);
  }
}

const localStorage = new MemoryStorage();
const sessionStorage = new MemoryStorage();
const storageKey = "courtsimplified-ai-case-partner-chat:session:hydration-test";
const routeTransferKey =
  "courtsimplified-ai-case-partner-chat:route-transfer";
const restoredNarrative =
  "I am Alex Example. Alex Example served Jordan Example with a Plaintiff's Claim.";
let browserReady = false;

localStorage.values.set(
  storageKey,
  JSON.stringify({
    messages: [{ role: "assistant", content: "Saved case context" }],
    routingConfirmed: false,
  }),
);
sessionStorage.values.set(
  routeTransferKey,
  JSON.stringify({
    targetPath: "small-claims",
    messages: [{ role: "user", content: restoredNarrative }],
    routingConfirmed: true,
  }),
);

const store = createChatExternalStore({
  storageKey,
  path: "small-claims",
  isBrowser: () => browserReady,
  getBrowserStorage: () => ({ localStorage, sessionStorage }),
  subscribeToBrowserStorage: () => () => undefined,
});

const serverSnapshot = store.getServerSnapshot();
assert.strictEqual(
  store.getServerSnapshot(),
  serverSnapshot,
  "The server snapshot must be referentially stable",
);
assert.strictEqual(
  store.getSnapshot(),
  serverSnapshot,
  "The first hydration snapshot must match the server snapshot",
);
assert.equal(
  localStorage.reads + sessionStorage.reads,
  0,
  "Creating and reading the server snapshot must not touch browser storage",
);

browserReady = true;
const browserSnapshot = store.getSnapshot();
assert.equal(browserSnapshot.phase, "browser");
assert.equal(browserSnapshot.state.messages[0]?.content, restoredNarrative);
assert.equal(browserSnapshot.state.routingConfirmed, true);
assert.strictEqual(
  store.getSnapshot(),
  browserSnapshot,
  "Browser snapshots must remain cached between storage notifications",
);
assert.equal(
  sessionStorage.removals,
  0,
  "Route transfer cleanup must not occur while React reads a snapshot",
);

let notifications = 0;
const unsubscribe = store.subscribe(() => {
  notifications += 1;
});
assert.equal(
  sessionStorage.removals,
  1,
  "Route transfer cleanup must occur through the post-hydration subscription",
);

const updatedState = {
  ...browserSnapshot.state,
  messages: [
    ...browserSnapshot.state.messages,
    { role: "assistant" as const, content: "Restored safely" },
  ],
};
store.persist(updatedState, JSON.stringify(updatedState));
assert.equal(notifications, 1, "Component storage writes must notify subscribers");
assert.equal(localStorage.writes, 1, "A component update must persist exactly once");
unsubscribe();

const source = readFileSync(
  "app/builder/_components/CourtAssistantChat.tsx",
  "utf8",
);
assert.match(source, /useSyncExternalStore\(/);
assert.match(source, /value=\{input\}/);
assert.match(source, /onChange=\{\(event\) => setInput\(event\.target\.value\)\}/);
assert.match(source, /disabled=\{loading \|\| !input\.trim\(\)\}/);
assert.match(source, /onClick=\{\(\) => sendMessage\(\)\}/);
assert.doesNotMatch(
  source,
  /useState\(\(\) =>[\s\S]{0,1200}(?:localStorage|sessionStorage)/,
);
assert.doesNotMatch(source, /setTimeout|eslint-disable|hydrationWarning/);
assert.match(
  source,
  /!messages\.some\(\(message\) => message\.role === "user"\)/,
);
assert.match(source, /persistNarrativePrefill\(/);

const prefill = extractNarrativePrefill({
  narrative: restoredNarrative,
  courtPath: "small-claims",
  caseId: "hydration-test-case",
});
assert.equal(prefill.narrative, restoredNarrative);
assert.equal(directPrefillValues(prefill).facts, restoredNarrative);

console.log(
  "CourtAssistantChat hydration verification passed: stable server snapshot, post-hydration restoration, live input enablement, notified single-write persistence, and narrative handoff.",
);
