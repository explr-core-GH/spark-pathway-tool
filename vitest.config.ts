import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Minimal vitest setup — added with the EXPLR STEM survey battery.
// Scope is deliberately narrow: it runs the *.test.ts unit tests
// (currently just the survey scoring math). It does not touch the
// app build, which still goes through vite.config.ts untouched.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
