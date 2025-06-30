# Multi-stage build for efficient Docker image
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY packages/observability/package*.json ./packages/observability/
COPY packages/example_service/package*.json ./packages/example_service/

# Install TypeScript globally and dependencies
RUN npm install -g typescript
RUN cd packages/observability && npm ci
RUN cd packages/example_service && npm ci

# Copy TypeScript config files
COPY packages/observability/tsconfig.json ./packages/observability/
COPY packages/example_service/tsconfig.json ./packages/example_service/

# Copy source code
COPY packages/observability/src ./packages/observability/src
COPY packages/example_service/src ./packages/example_service/src

# Build observability package first
RUN cd packages/observability && npm run build

# Build example service
RUN cd packages/example_service && npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install curl for health check
RUN apk add --no-cache curl

# Copy package.json files
COPY packages/observability/package*.json ./packages/observability/
COPY packages/example_service/package*.json ./packages/example_service/

# Install production dependencies
RUN cd packages/observability && npm ci --only=production
RUN cd packages/example_service && npm ci --only=production

# Copy built artifacts
COPY --from=builder /app/packages/observability/dist ./packages/observability/dist
COPY --from=builder /app/packages/example_service/dist ./packages/example_service/dist

# Set working directory to example service
WORKDIR /app/packages/example_service

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["npm", "start"]
