import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  server: {
    port: 3002,
  },
  resolve: {
    alias: {
      "@berkeley-dsep-infra/a11y-checker-core": path.resolve(
        __dirname,
        "../../packages/core/src/index.ts",
      ),
    },
  },
});
