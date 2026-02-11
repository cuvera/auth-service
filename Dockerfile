FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json .npmrc ./

RUN npm ci --silent

COPY . .

RUN npm run build

# Production stage
FROM node:22-alpine AS production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S cuvera -u 1001

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
RUN npm prune --omit=dev --silent

COPY --from=builder --chown=cuvera:nodejs /app/dist ./dist

USER cuvera

CMD ["node", "dist/app.js"]
