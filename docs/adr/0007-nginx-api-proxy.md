# ADR-0007: nginx proxies /api to the backend instead of a build-time API URL

**Status:** Accepted

## Context
The frontend (served by nginx in its own container) needs to reach the backend, in two environments — Docker Compose locally and behind the ALB in EKS (Phase 10) — from the same built image. Vite resolves `import.meta.env.*` variables at **build** time, not run time.

## Decision
The frontend calls relative paths (`/api/...`). The nginx config in the frontend container proxies `location /api/ { proxy_pass http://backend:5000; }` (Compose) or the equivalent Service DNS name (Kubernetes). No `VITE_API_URL` build argument exists.

## Alternatives considered
- **`baseURL: import.meta.env.VITE_API_URL`, passed as a Docker build arg.** This was the original Phase 1 draft. It failed for a specific, instructive reason: the frontend Dockerfile never actually passed the build arg, so `VITE_API_URL` baked in as `undefined`, axios fell back to relative paths anyway, those hit nginx's SPA fallback (`try_files ... /index.html`), and the app tried to `JSON.parse()` an HTML page. Even fixed, this approach means one image per environment and a live cross-origin (CORS) concern between frontend and backend origins.

## Consequences
One frontend image works unmodified in both Compose and EKS — same-origin from the browser's perspective, so no CORS configuration anywhere. The nginx config becomes the thing that differs per environment, not the application image.
