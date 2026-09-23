import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // SPEC §1.1 picks plain Axios, not a fetching library (SWR/React
      // Query) — so every page's "fetch on mount, refetch on SSE `changed`"
      // effect calls setState from inside an async callback by design. This
      // React-Compiler-era rule can't tell that apart from a genuinely
      // synchronous setState-in-render footgun, so it's downgraded to a
      // warning here rather than either littering ~8 identical suppressions
      // or migrating every page to Suspense/`use()`, which SPEC doesn't ask
      // for.
      "react-hooks/set-state-in-effect": "warn",
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
