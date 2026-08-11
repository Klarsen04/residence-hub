import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Unit + component tests. Pure logic runs in node; component tests opt into
// jsdom via a top-of-file `// @vitest-environment jsdom` docblock. The React
// plugin handles JSX/TSX (Vitest 4 uses oxc, which otherwise honors tsconfig's
// jsx: "preserve" and can't parse JSX). The "@" alias mirrors tsconfig paths.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
