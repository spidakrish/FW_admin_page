import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

interface ParsedUser {
  email: string;
  hash: string;
  role: "admin" | "viewer";
}

function parseUsers(): ParsedUser[] {
  const raw = process.env.AUTH_USERS;
  if (!raw) return [];

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split(":");
      if (parts.length < 3) return null;
      // bcrypt hashes contain colons in some formats, but standard bcrypt
      // starts with $2a$ or $2b$ — the role is always the last segment
      const email = parts[0];
      const role = parts[parts.length - 1] as "admin" | "viewer";
      const hash = parts.slice(1, parts.length - 1).join(":");
      if (role !== "admin" && role !== "viewer") return null;
      return { email, hash, role };
    })
    .filter((u): u is ParsedUser => u !== null);
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const users = parseUsers();
        const user = users.find(
          (u) => u.email.toLowerCase() === credentials.email.toLowerCase()
        );
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.hash);
        if (!valid) return null;

        return {
          id: user.email,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role;
      }
      return session;
    },
  },
};
