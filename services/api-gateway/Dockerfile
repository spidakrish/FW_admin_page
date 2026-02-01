# =============================================================================
# FW Admin API Gateway - Production Dockerfile
# =============================================================================
# Multi-stage build for minimal, secure production image.
#
# IMPORTANT: Build from monorepo root, not from this directory!
#
# Build: docker build -f services/api-gateway/Dockerfile -t fw-admin-api-gateway .
# Run:   docker run -p 8787:8787 -e FW_ADMIN_API_KEYS=your-key fw-admin-api-gateway
#
# Security features:
#   - Multi-stage build (smaller attack surface)
#   - Non-root user (principle of least privilege)
#   - Alpine base image (minimal packages)
#   - No devDependencies in production
#   - Explicit HEALTHCHECK
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Install build dependencies for native modules (if any)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy root package files for npm workspaces
COPY package.json package-lock.json ./

# Copy workspace package.json files (needed for npm ci to understand workspace structure)
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/shared-ui/package.json ./packages/shared-ui/
COPY services/api-gateway/package.json ./services/api-gateway/

# Install dependencies for api-gateway workspace only
RUN npm ci --workspace=@fw-admin/api-gateway

# Copy TypeScript configuration (api-gateway extends tsconfig.base.json)
COPY tsconfig.base.json ./
COPY services/api-gateway/tsconfig.json ./services/api-gateway/

# Copy api-gateway source code
COPY services/api-gateway/src ./services/api-gateway/src

# Build TypeScript to JavaScript
RUN npm run build --workspace=services/api-gateway

# Copy static assets that aren't handled by TypeScript
RUN cp services/api-gateway/src/openapi/spec.yaml services/api-gateway/dist/openapi/spec.yaml

# -----------------------------------------------------------------------------
# Stage 2: Production
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

# Security: Create non-root user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy root package files (needed for workspace resolution)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

# Copy workspace package.json files
COPY --from=builder /app/packages/api-client/package.json ./packages/api-client/
COPY --from=builder /app/packages/shared-ui/package.json ./packages/shared-ui/
COPY --from=builder /app/services/api-gateway/package.json ./services/api-gateway/

# Copy node_modules from builder (includes workspace dependencies)
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy compiled application from builder
COPY --from=builder --chown=nodejs:nodejs /app/services/api-gateway/dist ./services/api-gateway/dist

# Security: Switch to non-root user
USER nodejs

# Set working directory to the api-gateway service
WORKDIR /app/services/api-gateway

# Expose the application port (matches config default)
EXPOSE 8787

# Health check using the existing health endpoint
# Checks every 30s, times out after 3s, starts checking after 5s, fails after 3 retries
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { hostname: 'localhost', port: process.env.PORT || 8787, path: '/api/v1/health', timeout: 2000 }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();"

# Graceful shutdown signal
STOPSIGNAL SIGTERM

# Start the application
CMD ["node", "dist/index.js"]
