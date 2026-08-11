# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build

WORKDIR /opt/pro-flow

COPY packages/career-core/package.json packages/career-core/package-lock.json ./packages/career-core/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefix packages/career-core

COPY packages/career-core ./packages/career-core
RUN npm run build --prefix packages/career-core

COPY apps/web/package.json apps/web/package-lock.json ./apps/web/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefix apps/web

COPY . .
RUN npm run build --prefix apps/web

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PRO_FLOW_PROJECT_ROOT=/opt/pro-flow \
    PRO_FLOW_CHROME_PATH=/usr/local/bin/chrome.exe

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       chromium \
       fonts-dejavu-core \
       fonts-liberation \
       poppler-utils \
       texlive-fonts-recommended \
       texlive-luatex \
       texlive-xetex \
    && ln -s /usr/bin/chromium /usr/local/bin/chrome.exe \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/pro-flow
COPY --from=build /opt/pro-flow /opt/pro-flow

RUN mkdir -p /opt/pro-flow/career-data /opt/pro-flow/apps/web/.next/cache \
    && chown -R node:node \
       /opt/pro-flow/career-data \
       /opt/pro-flow/apps/web/.next/cache

USER node
WORKDIR /opt/pro-flow/apps/web

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["npm", "run", "start", "--", "-H", "0.0.0.0"]
