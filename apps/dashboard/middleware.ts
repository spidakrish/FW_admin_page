export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login
     * - /api/auth (NextAuth endpoints)
     * - /_next (Next.js internals)
     * - /favicon.ico, /frazerwalker-logo.svg (static assets)
     */
    "/((?!login|api/auth|_next|favicon\\.ico|frazerwalker-logo\\.svg).*)",
  ],
};
