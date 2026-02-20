#!/usr/bin/env node

/**
 * Hash a password for use in the AUTH_USERS environment variable.
 *
 * Usage:
 *   node scripts/hash-password.mjs <password>
 *
 * Example:
 *   node scripts/hash-password.mjs MySecurePassword123
 *   # Output: $2a$10$...
 *
 * Then use the hash in AUTH_USERS:
 *   AUTH_USERS=admin@example.com:$2a$10$...:admin
 */

import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error("Usage: node scripts/hash-password.mjs <password>");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log(hash);
