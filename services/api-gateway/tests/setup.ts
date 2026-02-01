/**
 * Test Setup File
 *
 * This file runs before each test file. It sets up the test environment
 * with appropriate environment variables and global configuration.
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";

// =============================================================================
// ENVIRONMENT SETUP
// =============================================================================

// Set test environment before any imports
process.env.NODE_ENV = "test";
process.env.FW_ADMIN_API_KEYS = "test-key-1,test-key-2";
process.env.FW_ANALYSIS_SERVICE_URL = "http://localhost:5050";
process.env.BACKPRO_SERVICE_URL = "http://localhost:8000";
process.env.RATE_LIMIT_WINDOW_MS = "60000";
process.env.RATE_LIMIT_MAX_REQUESTS = "100";
process.env.LOG_LEVEL = "silent"; // Suppress logs during tests

// =============================================================================
// GLOBAL HOOKS
// =============================================================================

beforeAll(() => {
  // Global setup before all tests
});

afterAll(() => {
  // Global cleanup after all tests
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});

// =============================================================================
// GLOBAL TEST UTILITIES
// =============================================================================

/**
 * Valid API keys for testing
 */
export const TEST_API_KEYS = {
  valid: "test-key-1",
  validSecondary: "test-key-2",
  invalid: "invalid-key-12345"
};
