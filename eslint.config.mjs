import { readFileSync } from "node:fs";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Browser storage only through the storage module or the intake store (Part 3).
// The same list is checked in CI by npm run test:story-data-registry.
const storageList = JSON.parse(readFileSync(new URL("./src/lib/case-system/storage/directStorageAllowlist.json", import.meta.url), "utf8"));
const storageAllowed = [...Object.keys(storageList.allowed), ...Object.keys(storageList.existing)]
  // Brackets in a path ("[id]") are glob syntax: escaped so they match literally.
  .map((entry) => entry.replace(/[[\]]/g, "\\$&"))
  .map((entry) => (entry.endsWith("/") ? `${entry}**` : entry));
const storageMessage = "Store through the storage module (src/lib/case-system/storage/) or the intake store (IntakeRecovery.tsx), and list the data in storyDataRegistry.ts.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    ignores: storageAllowed,
    rules: {
      "no-restricted-globals": ["error", { name: "localStorage", message: storageMessage }, { name: "sessionStorage", message: storageMessage }],
      "no-restricted-properties": ["error", { object: "window", property: "localStorage", message: storageMessage }, { object: "window", property: "sessionStorage", message: storageMessage }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
