# syntax=docker/dockerfile:1

FROM node:18-alpine AS base
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "process.exit(0)"

CMD ["node", "src/index.js"]
