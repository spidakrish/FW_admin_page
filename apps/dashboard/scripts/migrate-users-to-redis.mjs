#!/usr/bin/env node

/**
 * One-time migration: copy users from AUTH_USERS env var into Upstash Redis.
 *
 * Prerequisites:
 *   1. UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set.
 *   2. AUTH_USERS must be set in the format:
 *        email:bcrypt_hash:role,email:bcrypt_hash:role,...
 *
 * Usage:
 *   # Set env vars first (or use a .env loader like dotenv-cli)
 *   node scripts/migrate-users-to-redis.mjs
 *
 *   # Or pass them inline:
 *   UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... AUTH_USERS=... node scripts/migrate-users-to-redis.mjs
 */

const REDIS_KEY = "dashboard:users";

async function main() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const authUsers = process.env.AUTH_USERS;

  if (!url || !token) {
    console.error(
      "Error: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set."
    );
    process.exit(1);
  }

  if (!authUsers) {
    console.error("Error: AUTH_USERS env var is empty or not set.");
    process.exit(1);
  }

  // Parse AUTH_USERS
  const entries = authUsers
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  const users = [];
  for (const entry of entries) {
    const parts = entry.split(":");
    if (parts.length < 3) {
      console.warn(`Skipping malformed entry: ${entry}`);
      continue;
    }
    const email = parts[0].toLowerCase().trim();
    const role = parts[parts.length - 1];
    const hash = parts.slice(1, parts.length - 1).join(":");

    if (role !== "admin" && role !== "viewer") {
      console.warn(`Skipping entry with invalid role "${role}": ${email}`);
      continue;
    }

    users.push({ email, hash, role });
  }

  if (users.length === 0) {
    console.error("No valid users found in AUTH_USERS.");
    process.exit(1);
  }

  console.log(`Found ${users.length} user(s) to migrate:\n`);
  for (const u of users) {
    console.log(`  ${u.email} (${u.role})`);
  }
  console.log();

  // Build the HSET command body.
  // Upstash REST API: POST with body ["HSET", key, field, value, field, value, ...]
  const now = new Date().toISOString();
  const args = ["HSET", REDIS_KEY];
  for (const u of users) {
    args.push(
      u.email,
      JSON.stringify({
        email: u.email,
        hash: u.hash,
        role: u.role,
        createdAt: now,
        updatedAt: now,
      })
    );
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Redis error (${res.status}): ${text}`);
    process.exit(1);
  }

  const result = await res.json();
  console.log(`Migration complete. Redis HSET result: ${result.result}`);
  console.log("Users are now stored in Upstash Redis.");
  console.log(
    "You can optionally remove the AUTH_USERS env var once verified."
  );
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
