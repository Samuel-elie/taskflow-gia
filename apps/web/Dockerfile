# =========================
# Build stage
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY apps/web/package*.json ./
RUN npm ci

COPY apps/web ./

RUN npm run build

# =========================
# Runtime stage
# =========================
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat

RUN addgroup -g 10001 -S appgroup && adduser -S -D -H -u 10001 -G appgroup appuser

#  on copie DIRECTEMENT node_modules du builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.* ./ 

RUN chown -R 10001:10001 /app

ENV NODE_ENV=production
ENV PORT=3000

USER 10001:10001

EXPOSE 3000

CMD ["npm", "run", "start"]