# syntax=docker/dockerfile:1
FROM node:20.11-alpine AS base
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
COPY packages packages
COPY apps/api apps/api
RUN pnpm --filter @osint/types run build
RUN pnpm --filter @osint/plugin-sdk run build
RUN pnpm --filter @osint/api exec prisma generate
RUN pnpm --filter @osint/api run build

# Deliberately not using `pnpm deploy` here: it re-resolves a fresh virtual
# store from the content-addressable cache rather than reusing this stage's
# node_modules, which drops the Prisma-generated query engine (written
# in-place by `prisma generate` above, not tracked by pnpm's store) and
# breaks the workspace symlink layout. Copying node_modules as-is is bigger
# but is exactly what typecheck/build already ran against.
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
EXPOSE 4000
CMD ["node", "apps/api/dist/apps/api/src/main.js"]
