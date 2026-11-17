FROM node:22-alpine3.22 AS deps
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

# Desenvolvimento: Vite com hot reload. O proxy de /api vai para API_PROXY_TARGET (definido no compose).
FROM node:22-alpine3.22 AS dev
WORKDIR /app
RUN chown node:node /app
USER node
ENV NO_UPDATE_NOTIFIER=1
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# Build de produção. VITE_* são públicos (vão para o JS do navegador): nunca coloque segredo aqui.
FROM node:22-alpine3.22 AS build
WORKDIR /app
RUN chown node:node /app
USER node
ARG VITE_API_URL=
ARG VITE_CONTACT_EMAIL=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_CONTACT_EMAIL=$VITE_CONTACT_EMAIL
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
RUN npm run build

# Produção: nginx sem root servindo o dist, com fallback de SPA e proxy de /api para a API.
FROM nginxinc/nginx-unprivileged:1.28-alpine AS prod
ENV API_UPSTREAM=http://worker:8787
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

