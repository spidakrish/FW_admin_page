import { Redis } from "@upstash/redis";
import bcrypt from "bcryptjs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoredUser {
  email: string;
  hash: string;
  role: "admin" | "viewer";
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<StoredUser, "hash">;

// ---------------------------------------------------------------------------
// Redis client (lazy singleton — only created when Upstash env vars exist)
// ---------------------------------------------------------------------------

const REDIS_KEY = "dashboard:users";

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// ---------------------------------------------------------------------------
// ENV fallback — parse AUTH_USERS the same way the old auth.ts did
// ---------------------------------------------------------------------------

function parseEnvUsers(): StoredUser[] {
  const raw = process.env.AUTH_USERS;
  if (!raw) return [];

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split(":");
      if (parts.length < 3) return null;
      const email = parts[0];
      const role = parts[parts.length - 1] as "admin" | "viewer";
      const hash = parts.slice(1, parts.length - 1).join(":");
      if (role !== "admin" && role !== "viewer") return null;
      return {
        email,
        hash,
        role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    })
    .filter((u): u is StoredUser => u !== null);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get a single user by email (used at login time). */
export async function getUserByEmail(
  email: string
): Promise<StoredUser | null> {
  const redis = getRedis();
  if (redis) {
    const data = await redis.hget<StoredUser>(REDIS_KEY, email.toLowerCase());
    return data ?? null;
  }

  // Fallback to env var
  const users = parseEnvUsers();
  return (
    users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null
  );
}

/** List every user (hashes stripped). */
export async function listUsers(): Promise<SafeUser[]> {
  const redis = getRedis();
  if (redis) {
    const all = await redis.hgetall<Record<string, StoredUser>>(REDIS_KEY);
    if (!all) return [];
    return Object.values(all).map(stripHash);
  }

  return parseEnvUsers().map(stripHash);
}

/** Create a new user. Returns the safe user on success. */
export async function createUser(
  email: string,
  password: string,
  role: "admin" | "viewer"
): Promise<SafeUser> {
  const redis = getRedis();
  if (!redis) {
    throw new Error(
      "Cannot create users without Upstash Redis configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
  }

  const normalised = email.toLowerCase().trim();

  const existing = await redis.hget(REDIS_KEY, normalised);
  if (existing) {
    throw new Error("A user with this email already exists.");
  }

  const hash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  const user: StoredUser = {
    email: normalised,
    hash,
    role,
    createdAt: now,
    updatedAt: now,
  };

  await redis.hset(REDIS_KEY, { [normalised]: user });
  return stripHash(user);
}

/** Update a user's role and/or password. */
export async function updateUser(
  email: string,
  updates: { role?: "admin" | "viewer"; password?: string }
): Promise<SafeUser> {
  const redis = getRedis();
  if (!redis) {
    throw new Error(
      "Cannot update users without Upstash Redis configured."
    );
  }

  const normalised = email.toLowerCase().trim();
  const existing = await redis.hget<StoredUser>(REDIS_KEY, normalised);
  if (!existing) {
    throw new Error("User not found.");
  }

  const patched: StoredUser = { ...existing, updatedAt: new Date().toISOString() };

  if (updates.role) {
    patched.role = updates.role;
  }
  if (updates.password) {
    patched.hash = await bcrypt.hash(updates.password, 10);
  }

  await redis.hset(REDIS_KEY, { [normalised]: patched });
  return stripHash(patched);
}

/** Delete a user by email. */
export async function deleteUser(email: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    throw new Error(
      "Cannot delete users without Upstash Redis configured."
    );
  }

  const normalised = email.toLowerCase().trim();
  const removed = await redis.hdel(REDIS_KEY, normalised);
  if (removed === 0) {
    throw new Error("User not found.");
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripHash(user: StoredUser): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hash, ...safe } = user;
  return safe;
}
