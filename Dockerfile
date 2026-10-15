# Multi-stage Dockerfile for Tradiq Zium GrowthOS
# Google Cloud AI Builder Cup 2026 (Retail & Commerce)

# ─── Stage 1: Build Frontend ─────────────────────────────────
FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ─── Stage 2: Build Backend & Production Runner ───────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV SERVE_CLIENT=true

# Install root dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./backend/
COPY tsconfig.json ./

# Copy built frontend assets from Stage 1
COPY --from=client-builder /app/client/dist ./client/dist

EXPOSE 8080

CMD ["npx", "tsx", "backend/index.ts"]
