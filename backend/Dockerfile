FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

# Copy workspace package manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

# Install builder dependencies
RUN pnpm install --filter backend... --frozen-lockfile

# Copy backend source
COPY backend/ ./backend/

WORKDIR /app/backend

# Generate Prisma Client
RUN pnpm prisma generate

# Transpile TypeScript
RUN pnpm run build

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime utilities and python3 for fallback runner
RUN apk add --no-cache python3 make g++

RUN npm install -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

# Install only production dependencies
RUN pnpm install --filter backend... --prod --frozen-lockfile

# Copy transpile assets and generated prisma structures
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8000

ENV NODE_ENV=production

WORKDIR /app/backend

CMD ["pnpm", "start"]
