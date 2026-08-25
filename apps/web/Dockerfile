# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/types/package.json packages/types/package.json
COPY packages/plugin-sdk/package.json packages/plugin-sdk/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
ARG PUBLIC_API_URL
ARG PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=$PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$PUBLIC_WS_URL
COPY packages packages
COPY apps/web apps/web
RUN pnpm --filter @osint/types run build
RUN pnpm --filter @osint/plugin-sdk run build
RUN pnpm --filter @osint/web run build

# `output: 'standalone'` (next.config.mjs) makes Next.js trace and copy only
# the production-necessary node_modules subset into .next/standalone —
# self-contained, no need to reason about pnpm's node_modules layout here.
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo/apps/web
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
