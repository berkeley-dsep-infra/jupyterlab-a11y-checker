import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  server: {
    port: 3002,
    proxy: {
      "/api/marketplace-badge": {
        target:
          "https://marketplace.orbrx.io/api/badge/jupyterlab-a11y-checker?metric=downloads",
        changeOrigin: true,
        rewrite: () => "",
      },
    },
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
