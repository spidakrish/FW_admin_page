# FW Admin Page - Situation Report
**Date:** January 24, 2026  
**Status:** ✅ Development Environment Operational

---

## Executive Summary

The FW Admin Page is a **unified dashboard and API gateway** that orchestrates access to two separate systems for Frazer Walker:
1. **FW Document Analysis Tool** - Insurance policy extraction and comparison
2. **BackPro AI Platform** - RAG-based compliance and document intelligence

**Current State:** All three repositories are integrated via Git submodules, local development environment is configured and running, and the dashboard successfully routes to both tools.

---

## Architecture Overview

### Repository Structure
```
FW_admin_page/                    # Main orchestration repository
├── apps/dashboard/               # Next.js 14 dashboard (port 3000)
├── services/api-gateway/         # Express proxy gateway (port 8787)
├── packages/
│   ├── api-client/              # Shared API client
│   └── shared-ui/               # Tailwind preset & design tokens
└── external/                     # Git submodules
    ├── fw_frontend/             # BackPro platform (Next.js, port 3001)
    ├── backend-v2/              # BackPro backend APIs (FastAPI, port 8000)
    └── FW_document_analysis/    # Document analysis tool (Vite, port 5173)
```

### Technology Stack

**Dashboard (apps/dashboard/)**
- Framework: Next.js 14.2.35 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS with custom Frazer Walker brand tokens
- UI Components: Custom built with lucide-react icons
- Port: `3000`

**API Gateway (services/api-gateway/)**
- Framework: Express + TypeScript
- Proxy: http-proxy-middleware
- Authentication: Custom API key middleware (`x-fw-admin-key`)
- Build Tool: tsx (TypeScript executor)
- Port: `8787`

**External Systems (Submodules)**
1. **FW Document Analysis** (`external/FW_document_analysis/`)
   - Framework: Vite 5.4.21 (static site)
   - Purpose: Vision AI document extraction (Gemini/GPT-4)
   - Port: `5173`
   - Entry: `web-ui/index.html`

2. **BackPro Frontend** (`external/fw_frontend/`)
   - Framework: Next.js 14
   - Purpose: RAG agents, compliance dashboards, document chat
   - Port: `3001`
   - Features: Multi-modal search, knowledge graphs, DDQ automation

3. **BackPro Backend** (`external/backend-v2/`)
   - Framework: FastAPI (Python)
   - Port: `8000`
   - Database: PostgreSQL with pgvector
   - Features: Document ingestion, embeddings, agent orchestration

---

## Current Configuration

### Environment Variables

**FW_admin_page/.env**
```env
FW_ANALYSIS_SERVICE_URL=http://localhost:5173
BACKPRO_SERVICE_URL=http://localhost:8000
FW_ADMIN_API_KEYS=dev
```

**Purpose:**
- `FW_ANALYSIS_SERVICE_URL` - Backend proxy target for document analysis API (currently points to Vite dev server)
- `BACKPRO_SERVICE_URL` - Backend proxy target for BackPro APIs
- `FW_ADMIN_API_KEYS` - Comma-separated API keys for gateway authentication

### Port Allocation

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| Dashboard | 3000 | ✅ Running | Main entry point UI |
| API Gateway | 8787 | ✅ Running | Proxy/routing layer |
| FW Document Analysis | 5173 | ✅ Running | Policy extraction UI |
| BackPro Frontend | 3001 | ✅ Running | RAG platform UI |
| BackPro Backend | 8000 | ⚠️ Not started | API services |

### Git Submodules

**Configured Submodules:**
```
[submodule "external/fw_frontend"]
    path = external/fw_frontend
    url = https://github.com/BackPro-AI/fw_frontend.git
    commit = 5a91016

[submodule "external/backend-v2"]
    path = external/backend-v2
    url = https://github.com/BackPro-AI/backend-v2.git
    commit = 307c053

[submodule "external/FW_document_analysis"]
    path = external/FW_document_analysis
    url = https://github.com/BackPro-AI/FW_document_analysis.git
    commit = eeea3cc
```

All submodules are on `main` branch and properly tracked.

---

## What's Working

### ✅ Operational Features

1. **Dashboard Navigation**
   - Header navigation with 3 tabs: Dashboard, Document Analysis Tool, Backpro Platform
   - Hero section with Frazer Walker branding
   - Two workspace cards with "Launch tool" buttons
   - Responsive design with custom brand colors (teal, parchment, pewter)

2. **Routing Configuration**
   - Dashboard → `http://localhost:3000`
   - Document Analysis Tool → `http://localhost:5173` (both header link and card button)
   - BackPro Platform → `http://localhost:3001` (both header link and card button)

3. **API Gateway**
   - Express server running on port 8787
   - API key authentication middleware
   - Health check endpoints:
     - `/api/v1/health` - Gateway health
     - `/api/v1/fw-analysis/health` - Proxied FW analysis health
     - `/api/v1/backpro/health` - Proxied BackPro health
   - CORS enabled
   - Request/response logging with morgan

4. **Submodule Integration**
   - All three external repos linked and tracked
   - Can update independently with `git submodule update --remote`

5. **Development Workflow**
   - npm workspaces configured for monorepo management
   - Linting passes across all workspaces
   - TypeScript compilation working
   - Hot reload enabled for all services

---

## Technical Implementation Details

### Dashboard Implementation

**Key Files:**
- [`apps/dashboard/app/page.tsx`](apps/dashboard/app/page.tsx) - Main landing page with workspace cards
- [`apps/dashboard/lib/routes.ts`](apps/dashboard/lib/routes.ts) - Navigation header configuration
- [`apps/dashboard/components/navigation.tsx`](apps/dashboard/components/navigation.tsx) - Header component
- [`apps/dashboard/app/layout.tsx`](apps/dashboard/app/layout.tsx) - Root layout with branding

**Design System:**
- Custom Tailwind brand colors:
  - `brand-teal`: Primary action color (#00A99D)
  - `brand-charcoal`: Text color (#2D2D2D)
  - `brand-parchment`: Background accent (#F5F3EF)
  - `brand-pewter`: Muted text (#7A7A7A)
  - `brand-mist`: Subtle background (#E8F4F3)

**Workspace Cards:**
```typescript
const workspaces = [
  {
    title: "Document Analysis Tool",
    href: "http://localhost:5173",
    status: "Launch ready",
    note: "Running locally on port 5173"
  },
  {
    title: "BackPro AI Platform",
    href: "http://localhost:3001",
    status: "Preview",
    note: "Start with: cd fw_frontend && npm run dev"
  }
]
```

### API Gateway Implementation

**Proxy Routes:**
```typescript
// services/api-gateway/src/index.ts
app.use("/api/v1/fw-analysis", apiKeyGuard, fwAnalysisRouter);
app.use("/api/v1/backpro", apiKeyGuard, backproRouter);
```

**Authentication:**
- Middleware checks for `x-fw-admin-key` header
- Compares against comma-separated keys in `FW_ADMIN_API_KEYS` env var
- Returns 401 if missing/invalid

**Proxy Configuration:**
```typescript
// Forwards requests to backend services
createProxyMiddleware({
  target: config.services.fwAnalysis, // or backpro
  changeOrigin: true,
  proxyTimeout: 300000, // 5 minutes
  timeout: 300000
})
```

---

## Development Setup

### Starting All Services

**Terminal 1 - Dashboard:**
```powershell
cd C:\Users\dodso\FW_admin_page
npm run dev:dashboard
# Runs on http://localhost:3000
```

**Terminal 2 - API Gateway:**
```powershell
cd C:\Users\dodso\FW_admin_page
npm run dev --workspace services/api-gateway
# Runs on http://localhost:8787
```

**Terminal 3 - FW Document Analysis:**
```powershell
cd C:\Users\dodso\FW_document_analysis\web-ui
npm run dev
# Runs on http://localhost:5173
```

**Terminal 4 - BackPro Frontend:**
```powershell
cd C:\Users\dodso\fw_frontend
npm run dev -- --port 3001
# Runs on http://localhost:3001
```

**Terminal 5 - BackPro Backend (Optional):**
```powershell
cd C:\Users\dodso\backend-v2
# Requires Python environment setup
python start_server.py
# Runs on http://localhost:8000
```

### Package Scripts

**Root `package.json`:**
```json
{
  "scripts": {
    "dev:dashboard": "npm run dev --workspace apps/dashboard",
    "dev:api": "npm run dev --workspace services/api-gateway",
    "build": "npm run build --workspaces",
    "lint": "npm run lint --if-present --workspaces"
  }
}
```

---

## Integration Points

### Dashboard → External Tools

**Navigation Flow:**
1. User opens `http://localhost:3000`
2. Clicks "Launch tool" button or header link
3. Browser opens external URL in new tab:
   - FW Document Analysis → `http://localhost:5173`
   - BackPro Platform → `http://localhost:3001`

**No authentication handoff** - Each tool maintains its own auth (currently dev mode).

### API Gateway → Backend Services

**Request Flow:**
```
Frontend (3000/3001/5173)
    ↓ HTTP request
API Gateway (8787)
    ↓ Verify x-fw-admin-key header
    ↓ Proxy request
Backend Service (8000 or 5173)
    ↓ Process & respond
API Gateway
    ↓ Forward response
Frontend
```

**Example API Call:**
```bash
curl -H "x-fw-admin-key: dev" \
  http://localhost:8787/api/v1/backpro/documents
# Proxies to http://localhost:8000/documents
```

---

## Known Issues & Limitations

### Current Gaps

1. **FW Analysis Backend Not Integrated**
   - `FW_ANALYSIS_SERVICE_URL` points to Vite dev server (5173)
   - Should point to Python Flask API (likely port 5050)
   - Document analysis web-ui currently static/client-side only

2. **No Shared Authentication**
   - Each tool has independent auth
   - Dashboard doesn't pass tokens between systems
   - Future: Could implement SSO or token relay

3. **Backend Not Running**
   - BackPro backend-v2 (port 8000) not started
   - Required for full BackPro platform functionality
   - Needs Python environment setup

4. **Environment Configuration Mismatch**
   - `.env` has `BACKPRO_SERVICE_URL=http://localhost:8000`
   - But frontend runs on 3001
   - These are for different purposes (API vs UI) but naming is confusing

5. **Build Artifacts in Git**
   - `services/api-gateway/dist/` is now tracked
   - Should be in `.gitignore` for cleaner commits
   - Consider adding `.gitignore` rule

### Browser Warnings

**Next.js Config Warning:**
```
Invalid next.config.mjs options detected:
Expected object, received boolean at "experimental.serverActions"
```
**Fix:** Remove deprecated `experimental.serverActions` from `next.config.mjs`

### Vite Warning

**FW Document Analysis:**
```
Could not auto-determine entry point from rollupOptions or html files
```
**Status:** False alarm - `index.html` exists and Vite serves correctly

---

## Future Enhancements

### Short-term (Next Sprint)

1. **Polish Dashboard UI**
   - Add status indicators (green dot for running services)
   - Real-time health check display
   - Service uptime counters

2. **Unified Auth**
   - Implement JWT token generation in gateway
   - Pass auth tokens to submodules via query params or postMessage
   - Single sign-on experience

3. **API Gateway Enhancement**
   - Add request logging to database
   - Implement rate limiting
   - Add response caching for health checks

4. **Documentation**
   - Add API documentation (Swagger/OpenAPI)
   - Create deployment guide for Azure/AWS
   - Document environment variables

### Medium-term (Next Month)

1. **Production Deployment**
   - Azure Static Web Apps for dashboard
   - Azure Container Apps for API gateway
   - Configure HTTPS with custom domain (fw-data.com)

2. **Monitoring & Observability**
   - Application Insights integration
   - Error tracking (Sentry)
   - Performance metrics dashboard

3. **CI/CD Pipeline**
   - GitHub Actions for automated builds
   - Automated testing on PR
   - Staging environment deployment

4. **Service Health Dashboard**
   - Add admin panel showing all service statuses
   - Restart capabilities
   - Log aggregation viewer

### Long-term (Q2 2026)

1. **Multi-tenant Architecture**
   - User accounts and permissions
   - Organization isolation
   - Usage tracking and billing integration

2. **Advanced Routing**
   - Intelligent load balancing
   - Circuit breaker patterns
   - Graceful degradation

3. **Module Federation**
   - Remote module loading for submodules
   - Shared component libraries
   - Micro-frontend architecture

---

## Dependencies

### Root Dependencies
```json
{
  "devDependencies": {
    "prettier": "^3.2.5"
  }
}
```

### Dashboard Dependencies
- next: 14.2.35
- react: 18
- tailwindcss: 3.4.1
- lucide-react: ^0.562.0
- TypeScript: 5

### API Gateway Dependencies
- express: 4.x
- cors: 2.x
- helmet: 7.x
- morgan: 1.x
- http-proxy-middleware: 2.x
- dotenv: 16.x
- tsx: latest (dev)

---

## Git Repository Status

**Last Commit:** `c969d96` - "Configure local development URLs for dashboard and API gateway"

**Changes in Last Commit:**
- Updated dashboard page.tsx with local URLs
- Updated routes.ts with correct ports
- API gateway build files
- Package updates for tsx

**Branch:** `main`  
**Remote:** `https://github.com/BackPro-AI/FW_admin_page.git`  
**Tracking:** `origin/main` (up to date)

**Submodule Status:**
- ✅ All three submodules properly tracked
- ✅ All on main branch
- ✅ No uncommitted changes in submodules

---

## Testing Status

### Manual Testing Completed

✅ **Dashboard Load** - Renders correctly at localhost:3000  
✅ **Navigation Links** - All header links point to correct URLs  
✅ **Launch Buttons** - Both workspace cards navigate correctly  
✅ **API Gateway** - Starts and listens on port 8787  
✅ **FW Document Analysis** - Serves at localhost:5173  
✅ **BackPro Frontend** - Serves at localhost:3001  
✅ **Submodule Commands** - `git submodule update` works  
✅ **Workspace Commands** - npm workspace scripts execute  

### Not Yet Tested

⚠️ **API Proxying** - Gateway forwarding to backends  
⚠️ **Authentication Flow** - API key validation end-to-end  
⚠️ **Error Handling** - Service down scenarios  
⚠️ **Cross-origin Requests** - CORS in production  
⚠️ **Production Build** - `npm run build` for all workspaces  

---

## Risk Assessment

### Low Risk ✅
- Submodule integration working well
- Dashboard UI stable and responsive
- Local development experience smooth

### Medium Risk ⚠️
- No automated testing yet (unit, integration, e2e)
- API gateway is basic - no error handling, logging, rate limiting
- Environment config can be confusing (multiple .env files)

### High Risk 🔴
- No production deployment pipeline established
- Authentication is placeholder ("dev" key)
- No monitoring or alerting configured
- Backend services not fully integrated

---

## Recommended Next Actions

### Immediate (Today/Tomorrow)

1. **Fix Next.js Warning**
   ```bash
   # Remove experimental.serverActions from apps/dashboard/next.config.mjs
   ```

2. **Add .gitignore Entry**
   ```gitignore
   # Add to FW_admin_page/.gitignore
   services/api-gateway/dist/
   ```

3. **Test API Gateway Proxying**
   ```bash
   # Start BackPro backend, then test proxy
   curl -H "x-fw-admin-key: dev" http://localhost:8787/api/v1/backpro/health
   ```

### This Week

1. **Document API Endpoints** - Create OpenAPI spec for gateway
2. **Add Health Check Dashboard** - Visual service status indicators
3. **Implement Basic Logging** - File-based request logs
4. **Write Unit Tests** - Start with API gateway middleware

### This Month

1. **Production Deployment Plan** - Document Azure deployment steps
2. **CI/CD Setup** - GitHub Actions workflows
3. **Monitoring Integration** - Application Insights or Datadog
4. **Security Audit** - Review auth, CORS, rate limiting

---

## Contact & Resources

**Repository:** https://github.com/BackPro-AI/FW_admin_page  
**Related Repos:**
- https://github.com/BackPro-AI/fw_frontend
- https://github.com/BackPro-AI/backend-v2
- https://github.com/BackPro-AI/FW_document_analysis

**Documentation:**
- [README.md](README.md) - Setup instructions
- [SITREP.md](SITREP.md) - This document

**Tech Stack Docs:**
- Next.js: https://nextjs.org/docs
- Express: https://expressjs.com/
- Vite: https://vitejs.dev/

---

## Conclusion

**Overall Health: 🟢 Good**

The FW Admin Page successfully achieves its core objective: providing a unified entry point to both the FW Document Analysis Tool and BackPro AI Platform. The monorepo structure with Git submodules enables independent development of each tool while maintaining centralized orchestration.

**Key Strengths:**
- Clean architecture with clear separation of concerns
- All local services running and accessible
- Git submodules properly configured
- Modern tech stack (Next.js 14, TypeScript, Express)

**Key Gaps:**
- Backend integration incomplete
- No authentication system
- Limited error handling
- No production deployment

**Readiness Assessment:**
- ✅ Local Development: Ready
- ⚠️ Staging Deployment: Needs work (auth, monitoring)
- 🔴 Production Deployment: Not ready (security, testing, CI/CD)

**Recommendation:** Continue with local development and testing. Prioritize API gateway hardening and backend integration before moving to staging/production environments.

---

*Last Updated: January 24, 2026*  
*Generated by: AI Assistant*
