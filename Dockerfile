ARG NODE_BASE_IMAGE=node:22-bookworm-slim
FROM ${NODE_BASE_IMAGE} AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/message/package.json ./packages/message/package.json
COPY packages/source/package.json ./packages/source/package.json
COPY packages/utils/package.json ./packages/utils/package.json
COPY packages/web/package.json ./packages/web/package.json
COPY packages/world/package.json ./packages/world/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY . .

ARG YUIJU_PUBLIC_DEPLOYMENT=0
ARG YUIJU_MEMORY_DIR=~/.local/share/yuiju/memory
ARG YUIJU_MONGO_URI=mongodb://mongodb:27017/yuiju?authSource=admin
ARG YUIJU_REDIS_URL=redis://redis:6379
ARG YUIJU_NAPCAT_HOST=host.docker.internal
ARG YUIJU_NAPCAT_PORT=3001
ARG YUIJU_DEEPSEEK_API_KEY=xxx
ARG YUIJU_SILICONFLOW_API_KEY=xxx
ARG YUIJU_MOONSHOT_API_KEY=xxx
ARG YUIJU_NAPCAT_ACCESS_TOKEN=xxx

ENV YUIJU_PUBLIC_DEPLOYMENT=${YUIJU_PUBLIC_DEPLOYMENT}
ENV YUIJU_MEMORY_DIR=${YUIJU_MEMORY_DIR}
ENV YUIJU_MONGO_URI=${YUIJU_MONGO_URI}
ENV YUIJU_REDIS_URL=${YUIJU_REDIS_URL}
ENV YUIJU_NAPCAT_HOST=${YUIJU_NAPCAT_HOST}
ENV YUIJU_NAPCAT_PORT=${YUIJU_NAPCAT_PORT}
ENV YUIJU_DEEPSEEK_API_KEY=${YUIJU_DEEPSEEK_API_KEY}
ENV YUIJU_SILICONFLOW_API_KEY=${YUIJU_SILICONFLOW_API_KEY}
ENV YUIJU_MOONSHOT_API_KEY=${YUIJU_MOONSHOT_API_KEY}
ENV YUIJU_NAPCAT_ACCESS_TOKEN=${YUIJU_NAPCAT_ACCESS_TOKEN}

RUN cp yuiju.config.json.example yuiju.config.json

FROM base AS runner

ENV NODE_ENV=production

COPY --from=build /app /app

EXPOSE 3010

CMD ["pnpm", "exec", "pm2-runtime", "ecosystem.config.js"]
