# ── Stage 1: build the SPA with Vite ─────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
# API base is relative ("/api"); nginx proxies it at runtime (ADR D5), so no
# absolute URL is baked into the bundle.
RUN npm run build

# ── Stage 2: serve static assets with nginx ──────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# SPA + reverse-proxy config.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Use 127.0.0.1, not localhost: nginx listens on IPv4 (:80) but busybox wget resolves
# "localhost" to IPv6 ::1 first inside Alpine, so the probe gets "connection refused"
# and the container is reported unhealthy even though it serves fine.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
