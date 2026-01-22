# FW Admin Page

This repository will host the unified dashboard that links the FW Document Analysis tool and the Backpro AI Platform. All shared orchestration (frontend shell, API gateway, deployment glue) lives here while the three source systems remain in their own repositories.

## Repo-Link Strategy (Locked)

We will use **Git submodules** to pull the other projects into this repo under the `external/` directory:

| Path | Repository | Purpose |
| --- | --- | --- |
| `external/fw_frontend` | `git@github.com:BackPro-AI/fw_frontend.git` | Source of shared UI patterns, Tailwind config, shadcn components |
| `external/backend-v2` | `git@github.com:BackPro-AI/backend-v2.git` | Authoritative backend APIs and schemas |
| `external/FW_document_analysis` | `git@github.com:BackPro-AI/FW_document_analysis.git` | Extraction/comparison logic + OpenAPI specs |

### Why Submodules?

1. **Version locking** – Each dashboard release pins the exact revisions of all upstream repos, preventing drift between environments.
2. **Local parity** – Developers can run the dashboard plus linked tooling without bespoke scripts or CI-only logic.
3. **Auditability** – Pull requests clearly show when upstream dependencies change (submodule SHA diff).

(Alternatives like CI-time `git clone` or artifact fetches were rejected because they make local iteration harder and obscure dependency changes.)

### Developer Workflow

```bash
# clone with submodules
git clone --recurse-submodules git@github.com:BackPro-AI/FW_admin_page.git

# or, if already cloned
git submodule update --init --recursive

# pull latest upstream changes
 git pull
 git submodule update --remote --merge
```

### Updating Submodules

1. `cd external/<submodule>`
2. `git checkout <target-branch>` and `git pull`
3. Return to repo root and `git add external/<submodule>`
4. Commit the submodule pointer change with a message like `chore: bump fw_frontend submodule`

### CI/CD Considerations

- Pipelines must include `git submodule update --init --recursive` before building.
- Dependabot (or Renovate) can be configured to monitor submodule SHAs if desired.
- For read-only deployments (e.g., container builds), we can rely on submodules being present in the build context rather than fetching via script.

---

Additional documentation (architecture, API gateway specs, dashboard implementation notes) will land here as the project progresses.

### Repository Layout (current)

```
FW_admin_page/
├── apps/
│   └── dashboard/          # Next.js 14 App Router shell (Tailwind configured)
├── packages/
│   ├── shared-ui/          # Tailwind preset + tokens
│   └── api-client/         # Lightweight fetch wrapper for the gateway
├── services/
│   └── api-gateway/        # Express-based gateway with health endpoints
├── infra/                  # (reserved for bicep/terraform)
└── external/               # Git submodules (to be added)
```

Run `npm install` once, then `npm run dev:dashboard` and `npm run dev:api` (in a second terminal) to see both tiers locally.

## Next Implementation Steps

1. **Bootstrap Next.js Dashboard**
	- `cd FW_admin_page && npx create-next-app@latest apps/dashboard`
	- Configure Tailwind, shadcn, and ESLint to match `external/fw_frontend`
	- Create shared UI tokens in `packages/shared-ui`
2. **Add Submodules**
	- `git submodule add git@github.com:BackPro-AI/fw_frontend.git external/fw_frontend`
	- Repeat for `backend-v2` and `FW_document_analysis`
	- Commit submodule pointers
3. **Seed Shared Packages**
	- `packages/shared-ui`: Tailwind config, typography, shadcn components
	- `packages/api-client`: Axios/fetch client pointed at future API gateway, plus React hooks
4. **Scaffold API Gateway**
	- `npm init -y` under `services/api-gateway`
	- Install Express/Fastify, zod, pino, cors, helmet
	- Add placeholder routes `/health`, `/api/v1/fw-analysis/*`, `/api/v1/backpro/*`
5. **Document Deployment Targets**
	- Capture frontend hosting choice (e.g., Vercel) and DNS steps for fw-data.com
	- Note Azure Container Apps environments for backend services and gateway

Feel free to call out any deviations you want before we begin scaffolding.
