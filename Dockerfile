FROM node:25.2.1-alpine AS install

WORKDIR /app/install

COPY package*.json ./

RUN npm ci --omit=dev --no-audit --no-fund && \
    npm cache clean --force

FROM node:25.2.1-slim AS production

WORKDIR /usr/src/app

COPY --from=install /app/install/node_modules ./node_modules
COPY . .

CMD ["node", "src/index.js"]