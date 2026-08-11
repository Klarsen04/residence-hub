import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit + component tests. Pure logic runs in node; component tests (*.test.tsx)
// run in jsdom. The "@" alias mirrors tsconfig paths.
export default defineConfig({
  // Use the automatic JSX runtime so tests don't need `import React`.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
