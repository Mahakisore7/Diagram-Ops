# Single-stage: unlike the frontend, there's no build/transpile step for
# plain CommonJS — a second stage would have nothing different to copy out.
FROM node:24-alpine

# tini as PID 1 is not decorative. Kubernetes (and `docker stop`) send
# SIGTERM to PID 1 in the container. `CMD ["node", "src/server.js"]` below
# uses exec form (no shell), so node itself becomes PID 1 and DOES receive
# that SIGTERM directly — the graceful-shutdown handler in server.js works
# without tini. tini earns its place for the other half of PID 1's job:
# reaping zombie child processes, which no ordinary process (node included)
# does automatically. Costs ~600KB.
RUN apk add --no-cache tini && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Dependencies installed before source is copied, so `docker build` only
# re-runs `npm ci` when package*.json actually changes — not on every
# source edit.
COPY package.json package-lock.json ./
# npm itself is only needed to install these deps - CMD below calls `node`
# directly and never shells out to npm/npx at runtime. The npm CLI bundled
# with the base image carries its own internal deps (unrelated to ours)
# that can pick up CVEs, so it's removed once the install is done rather
# than left as unused attack surface in the shipped image.
RUN npm ci --omit=dev && npm cache clean --force && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

COPY src ./src

USER appuser
ENV NODE_ENV=production
EXPOSE 5000

# Uses Node's own http client instead of curl/wget so the image doesn't
# need either package installed just for this one check.
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/healthz', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["tini", "--"]
CMD ["node", "src/server.js"]
