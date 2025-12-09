import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  target: "es2020",
  format: ["cjs", "esm"],
  dts: false,
  shims: true,
  clean: true,
  // CRITICAL: Inline the workspace dependency so it's not treated as external
  noExternal: ["@berkeley-dsep-infra/a11y-checker-core"],
  external: ["canvas"],
  // CRITICAL: Make the output executable
  banner: {
    js: "#!/usr/bin/env node",
  },
  loader: {
    ".md": "text",
  },
});
