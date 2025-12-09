import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  target: "es2020",
  format: ["cjs", "esm"],
  dts: false,
  shims: true,
  clean: true,
  // CRITICAL: Inline ALL dependencies for the GitHub Action to work without npm install
  noExternal: ["@berkeley-dsep-infra/a11y-checker-core", "commander", "chalk"],
  external: ["canvas"],
  // CRITICAL: Make the output executable
  banner: {
    js: "#!/usr/bin/env node",
  },
  loader: {
    ".md": "text",
  },
});
