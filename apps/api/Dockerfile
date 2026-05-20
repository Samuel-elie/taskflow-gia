# =========================
# Build stage
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

# Dépendances système utiles pour certaines libs Node
RUN apk add --no-cache openssl libc6-compat

COPY apps/api/package*.json ./
RUN npm ci

COPY apps/api ./

# Génération Prisma client + build NestJS
RUN npx prisma generate
RUN npm run build

# =========================
# Runtime stage
# =========================
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

# Créer un user non-root avec UID/GID numériques
RUN addgroup -g 10001 -S appgroup && adduser -S -D -H -u 10001 -G appgroup appuser

COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN chown -R 10001:10001 /app

ENV NODE_ENV=production
ENV PORT=3001

USER 10001:10001

EXPOSE 3001

CMD ["node", "--require", "./dist/otel.js", "dist/main.js"]