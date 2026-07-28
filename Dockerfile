# ---- PropMatch frontend (Next.js 16) — production image ----

# 1. Build stage. NEXT_PUBLIC_* values are inlined into the client bundle at
#    build time, so the browser-facing socket URL MUST be provided here.
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# npm install (not `npm ci`): the committed lock file is resolved on Windows and
# omits some Linux-only transitive deps (e.g. @swc/helpers), which makes the
# strict `npm ci` fail in this Linux image. `npm install` reconciles the tree.
COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

# Browser-facing (baked into the bundle at build time).
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
ARG API_MOCKING=disabled
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}
ENV API_MOCKING=${API_MOCKING}
RUN npm run build

# 2. Runtime stage. Uses Next's standalone output: only the traced runtime deps
#    are copied (small layers), avoiding the giant node_modules blob. NESTJS_API_URL
#    is read server-side at runtime (the /api/backend/* proxy + rewrites), so it is
#    injected via compose, not baked.
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
