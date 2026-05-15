# Dockerfile for @poker/server — deployed to Hugging Face Spaces (Docker SDK).
# Build context = repo root (pnpm workspace needs root package.json + lockfile).

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
# HF Spaces default port. Server reads process.env.PORT.
ENV PORT=7860

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Workspace metadata + source. @poker/shared is consumed as TS source
# (main: "./src/index.ts") so we ship the source and run via tsx.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY apps/server ./apps/server
COPY packages/shared ./packages/shared

# HF Spaces runs containers as a non-root user (UID 1000).
RUN addgroup -g 1000 user && adduser -D -u 1000 -G user user && \
    chown -R user:user /app
USER user

EXPOSE 7860
WORKDIR /app/apps/server
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
