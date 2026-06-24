# syntax=docker/dockerfile:1
# ACMS Frontend (Next.js 15, basePath /acms) — multi-target.
#   target `dev`  : `next dev` hot-reload (source di-bind-mount).
#   target `prod` : build standalone, dijalankan dgn `node server.js`.

# ---------- deps ----------
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---------- dev ----------
FROM node:20-bookworm-slim AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---------- build (prod) ----------
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* harus tersedia saat BUILD (di-bake ke bundle klien).
# Contoh: https://domain.ums.ac.id/acms
ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- runner (prod) ----------
FROM node:20-bookworm-slim AS prod
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Output standalone: server.js + node_modules minimal + static.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
