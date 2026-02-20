"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    window.location.href = callbackUrl;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-brand-pewter/20 bg-white/95 p-8 shadow-card">
          <div className="flex flex-col items-center gap-6">
            <Image
              src="/frazerwalker-logo.svg"
              alt="Frazer Walker"
              width={446}
              height={69}
              priority
              className="h-8 w-auto"
            />
            <div className="text-center">
              <h1 className="text-xl font-semibold text-brand-charcoal">
                Sign in
              </h1>
              <p className="mt-1 text-sm text-brand-pewter">
                FW Admin Dashboard
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wide text-brand-pewter"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-brand-pewter/30 bg-white px-4 py-2.5 text-sm text-brand-charcoal outline-none transition focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
                placeholder="you@frazerwalker.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wide text-brand-pewter"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-brand-pewter/30 bg-white px-4 py-2.5 text-sm text-brand-charcoal outline-none transition focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-brand-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-teal-deep disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-brand-pewter">
          © {new Date().getFullYear()} FW Admin
        </p>
      </div>
    </div>
  );
}
