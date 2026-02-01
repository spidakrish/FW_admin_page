import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use Node.js environment for Express testing
    environment: "node",

    // Enable global test APIs (describe, it, expect)
    globals: true,

    // Test file patterns
    include: ["tests/**/*.test.ts"],

    // Setup files to run before each test file
    setupFiles: ["tests/setup.ts"],

    // Timeout for each test (10 seconds - allows for rate limit tests)
    testTimeout: 10000,

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/index.ts", // Entry point with side effects
        "src/openapi/**" // Documentation files
      ],
      // Report coverage even if tests fail
      reportOnFailure: true
    },

    // Isolate tests to prevent state leakage
    isolate: true,

    // Run tests sequentially to avoid rate limiter conflicts
    sequence: {
      shuffle: false
    }
  }
});
