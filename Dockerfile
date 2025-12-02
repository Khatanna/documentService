FROM node:25.2.1-alpine AS install

WORKDIR /app/install

COPY package*.json ./

RUN npm ci --omit=dev --no-audit --no-fund && \
    npm cache clean --force

FROM node:25.2.1-slim AS production

WORKDIR /usr/src/app

# Instalar LibreOffice y dependencias necesarias
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    libreoffice-java-common \
    default-jre-headless \
    fonts-liberation \
    fonts-dejavu \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio temporal con permisos correctos
RUN mkdir -p /usr/src/app/temp && chmod 777 /usr/src/app/temp

COPY --from=install /app/install/node_modules ./node_modules
COPY . .

CMD ["node", "src/index.js"]