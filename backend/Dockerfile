# syntax=docker/dockerfile:1
# Production dependencies are installed in a separate stage so build tooling and
# dev dependencies never ship in the runtime image.
FROM node:18-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# curl is only used by the container health check.
RUN apk add --no-cache curl
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Uploads and the local SQLite fallback must survive restarts; both are mounted
# as volumes in docker-compose.yml. Ownership is set before dropping privileges.
RUN mkdir -p uploads data PrivateUploads && chown -R node:node /app
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3001/health || exit 1

CMD ["node", "src/index.js"]
