# API (Hono) rodando no workerd local via `wrangler dev`. Só para desenvolvimento.
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates wget && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /app/.wrangler && chown -R node:node /app

ENV WRANGLER_SEND_METRICS=false \
    NO_UPDATE_NOTIFIER=1

WORKDIR /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node . .

EXPOSE 8787

CMD ["npx", "wrangler", "dev", "--ip", "0.0.0.0", "--port", "8787"]
