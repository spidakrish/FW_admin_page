import helmet from "helmet";
import type { RequestHandler } from "express";
import { config } from "../config";

/**
 * Configures Helmet security headers for the API Gateway.
 *
 * Since this is an API gateway (serving JSON, not HTML), we configure
 * headers appropriately for API use cases while maintaining strong security.
 *
 * @see https://helmetjs.github.io/
 * @see https://expressjs.com/en/advanced/best-practice-security.html
 */
export const securityHeaders: RequestHandler = helmet({
  // ==========================================================================
  // Content Security Policy
  // ==========================================================================
  // For APIs, we use a restrictive CSP since we don't serve HTML/JS.
  // This prevents any injected content from executing if responses are
  // somehow rendered in a browser.
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"]
    }
  },

  // ==========================================================================
  // HTTP Strict Transport Security (HSTS)
  // ==========================================================================
  // Instructs browsers to only use HTTPS for this domain.
  // - maxAge: 1 year (31536000 seconds) - standard for production
  // - includeSubDomains: Apply to all subdomains
  // - preload: Ready for HSTS preload list submission
  //
  // NOTE: Only enable in production when HTTPS is properly configured.
  // Enabling HSTS without HTTPS will break the site.
  strictTransportSecurity: config.isProduction
    ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      }
    : false,

  // ==========================================================================
  // X-Frame-Options
  // ==========================================================================
  // Prevents clickjacking by disabling framing entirely.
  // APIs should never be framed.
  frameguard: {
    action: "deny"
  },

  // ==========================================================================
  // X-Content-Type-Options
  // ==========================================================================
  // Prevents browsers from MIME-sniffing the response away from the declared
  // content-type. Important for APIs returning JSON.
  noSniff: true,

  // ==========================================================================
  // X-DNS-Prefetch-Control
  // ==========================================================================
  // Controls browser DNS prefetching. Disabled for privacy.
  dnsPrefetchControl: {
    allow: false
  },

  // ==========================================================================
  // X-Download-Options
  // ==========================================================================
  // Prevents IE from executing downloads in the site's context.
  ieNoOpen: true,

  // ==========================================================================
  // X-Permitted-Cross-Domain-Policies
  // ==========================================================================
  // Prevents Adobe Flash and Acrobat from loading content.
  permittedCrossDomainPolicies: {
    permittedPolicies: "none"
  },

  // ==========================================================================
  // Referrer-Policy
  // ==========================================================================
  // Controls how much referrer information is sent with requests.
  // "no-referrer" is the most private option for APIs.
  referrerPolicy: {
    policy: "no-referrer"
  },

  // ==========================================================================
  // X-XSS-Protection
  // ==========================================================================
  // Modern browsers have this deprecated in favor of CSP, but it's still
  // useful for older browsers. However, helmet disables this by default
  // as it can introduce vulnerabilities in some edge cases.
  // We explicitly disable it (helmet default).
  xssFilter: false,

  // ==========================================================================
  // Cross-Origin Headers
  // ==========================================================================
  // Configure cross-origin policies for additional isolation.
  crossOriginEmbedderPolicy: false, // Disabled for API compatibility
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },

  // ==========================================================================
  // Origin-Agent-Cluster
  // ==========================================================================
  // Provides additional process isolation hint to browsers.
  originAgentCluster: true
});

/**
 * Additional security headers not covered by Helmet.
 * Applied after Helmet middleware.
 */
export const additionalSecurityHeaders: RequestHandler = (_req, res, next) => {
  // Cache-Control for API responses
  // Prevents caching of sensitive API responses by default
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  // Permissions-Policy (formerly Feature-Policy)
  // Disables unnecessary browser features for API responses
  res.setHeader(
    "Permissions-Policy",
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
  );

  next();
};
