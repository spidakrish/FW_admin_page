import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import yaml from "js-yaml";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { RequestHandler } from "express";

// =============================================================================
// OPENAPI SPECIFICATION LOADING
// =============================================================================

/**
 * Resolves the path to the OpenAPI spec file.
 *
 * Handles multiple runtime scenarios:
 * - Development with tsx (working directory is services/api-gateway)
 * - Development from monorepo root
 * - Production with compiled JS
 */
function resolveSpecPath(): string {
  const possiblePaths = [
    // Development: running from services/api-gateway directory
    join(process.cwd(), "src", "openapi", "spec.yaml"),
    // Development: running from monorepo root
    join(process.cwd(), "services", "api-gateway", "src", "openapi", "spec.yaml"),
    // Production: compiled, spec copied to dist
    join(process.cwd(), "dist", "openapi", "spec.yaml")
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  throw new Error(
    `OpenAPI spec not found. Searched paths:\n${possiblePaths.map((p) => `  - ${p}`).join("\n")}`
  );
}

/**
 * Loads the OpenAPI specification from the YAML file.
 * The file is read synchronously at startup for simplicity and performance.
 */
function loadOpenApiSpec(): Record<string, unknown> {
  const specPath = resolveSpecPath();

  try {
    const specContent = readFileSync(specPath, "utf8");
    return yaml.load(specContent) as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load OpenAPI spec from ${specPath}: ${message}`);
  }
}

// Load spec once at module initialization
const openApiSpec = loadOpenApiSpec();

// =============================================================================
// SWAGGER UI CONFIGURATION
// =============================================================================

/**
 * Custom CSS for Swagger UI to match Frazer Walker branding.
 */
const customCss = `
  .swagger-ui .topbar { display: none; }
  .swagger-ui .info .title { color: #2D2D2D; }
  .swagger-ui .scheme-container { background: #F5F3EF; padding: 15px; }
  .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #00A99D; }
  .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #00A99D; }
  .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #7A7A7A; }
  .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #dc3545; }
  .swagger-ui .btn.execute { background: #00A99D; border-color: #00A99D; }
  .swagger-ui .btn.execute:hover { background: #008C82; border-color: #008C82; }
`;

/**
 * Swagger UI options for display customization.
 */
const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
  customCss,
  customSiteTitle: "FW Admin API Gateway - Documentation",
  customfavIcon: "", // Could add Frazer Walker favicon URL
  swaggerOptions: {
    persistAuthorization: true, // Keep API key between page reloads
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: "list", // Collapse operations by default
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    tryItOutEnabled: true // Enable "Try it out" by default
  }
};

// =============================================================================
// CSP OVERRIDE FOR SWAGGER UI
// =============================================================================

/**
 * Middleware to relax Content Security Policy for Swagger UI routes.
 *
 * Swagger UI requires inline styles and scripts to function properly.
 * This middleware sets a permissive CSP only for the /docs route,
 * while the rest of the API maintains strict CSP.
 */
const swaggerCspOverride: RequestHandler = (_req, res, next) => {
  // Override the strict CSP set by Helmet for Swagger UI
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://validator.swagger.io",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'"
    ].join("; ")
  );
  next();
};

// =============================================================================
// ROUTER SETUP
// =============================================================================

const router = Router();

// Apply CSP override before Swagger UI middleware
router.use(swaggerCspOverride);

// Serve Swagger UI
router.use("/", swaggerUi.serve);
router.get("/", swaggerUi.setup(openApiSpec, swaggerUiOptions));

// Serve raw OpenAPI spec as JSON (useful for code generators, Postman import)
router.get("/openapi.json", (_req, res) => {
  res.json(openApiSpec);
});

// Serve raw OpenAPI spec as YAML
router.get("/openapi.yaml", (_req, res) => {
  res.setHeader("Content-Type", "text/yaml");
  res.send(yaml.dump(openApiSpec));
});

export { router as openApiRouter, openApiSpec };
