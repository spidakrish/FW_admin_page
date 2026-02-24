export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login
     * - /api/auth (NextAuth endpoints)
     * - /_next (Next.js internals)
     * - /.swa (Azure Static Web Apps health check)
     * - /favicon.ico, /frazerwalker-logo.svg (static assets)
     */
    "/((?!login|api/auth|_next|\\.swa|favicon\\.ico|frazerwalker-logo\\.svg).*)",
  ],
};
