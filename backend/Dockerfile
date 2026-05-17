# syntax=docker/dockerfile:1.7

# ----- build stage -----
FROM node:20-alpine AS build
WORKDIR /app

# Install build deps once; copy lockfile first for cache efficiency.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Trim devDeps for the runtime image.
RUN npm prune --omit=dev

# ----- runtime stage -----
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
# unprivileged user
RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/package.json ./package.json

USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/v1/health || exit 1

CMD ["node", "dist/server.js"]
