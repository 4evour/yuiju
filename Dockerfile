ARG NODE_BASE_IMAGE=node:24-bookworm-slim
FROM ${NODE_BASE_IMAGE} AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/site/package.json ./apps/site/package.json
COPY packages/message/package.json ./packages/message/package.json
COPY packages/satorijs-adapter-onebot/package.json ./packages/satorijs-adapter-onebot/package.json
COPY packages/source/package.json ./packages/source/package.json
COPY packages/utils/package.json ./packages/utils/package.json
COPY packages/web/package.json ./packages/web/package.json
COPY packages/world/package.json ./packages/world/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY . .

RUN cp yuiju.config.json.example yuiju.config.json && pnpm run build:web

FROM base AS runner

ENV NODE_ENV=production

COPY --from=build /app /app

EXPOSE 3010

CMD ["pnpm", "exec", "pm2-runtime", "ecosystem.config.js"]
