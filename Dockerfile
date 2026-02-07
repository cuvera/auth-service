FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json .npmrc ./

RUN npm ci

COPY . .

RUN npm run build

# Production stage
FROM node:22-alpine AS production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S cuvera -u 1001

WORKDIR /app

COPY package*.json .npmrc ./

RUN npm ci --omit=dev && npm cache clean --force && rm -f .npmrc

COPY --from=builder --chown=cuvera:nodejs /app/dist ./dist

USER cuvera

CMD ["node", "dist/app.js"]
