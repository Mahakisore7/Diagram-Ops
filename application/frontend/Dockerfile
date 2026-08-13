# Multi-stage, unlike the backend: this stage's job is to produce dist/ —
# a build artifact in a shape the runtime stage never needs Node, npm, or
# node_modules to serve.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# nginxinc/nginx-unprivileged, not nginx:alpine. Stock nginx:alpine binds
# port 80, which requires root — it CANNOT run as a non-root user, and
# will crash outright the moment Phase 12 applies runAsNonRoot (this is a
# real, documented failure mode, not a hypothetical one). The unprivileged
# variant already runs as a non-root `nginx` user and listens on 8080 by
# default, so restricted Pod Security Standards apply with zero changes
# needed later.
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

# 127.0.0.1, not localhost: this image's `listen 8080;` binds IPv4 only
# (0.0.0.0:8080), but BusyBox wget resolves "localhost" to the IPv6
# loopback (::1) first and gets a real connection refused there — a
# genuine failure observed while building this, not a hypothetical one.
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
