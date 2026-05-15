# Dockerfile for @poker/server — deployed to Koyeb.
# Run from repo root: the pnpm workspace needs root package.json + lockfile.

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

# --- deps stage: install workspace deps only for the server + its shared dep ---
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --filter "@poker/server..."

# --- runtime stage ---
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=2567

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy workspace metadata + source. @poker/shared is consumed as TS source
# (main: "./src/index.ts") so we ship the source and run via tsx.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY apps/server ./apps/server
COPY packages/shared ./packages/shared

EXPOSE 2567
WORKDIR /app/apps/server
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
