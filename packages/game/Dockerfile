FROM node:18-alpine

WORKDIR /app

# Install curl for health check
RUN apk add --no-cache curl

# First, build the observability package
COPY packages/observability ./packages/observability
RUN cd packages/observability && npm install && npm run build && npm pack

# Copy game service files
COPY packages/game/package*.json ./

# Install the packed observability package
RUN npm install ./packages/observability/ft-transcendence-observability-1.0.0.tgz

# Install other dependencies
RUN npm install

# Copy TypeScript config, source code and game files
COPY packages/game/tsconfig.json ./
COPY packages/game/tsconfig.server.json ./
COPY packages/game/src ./src
COPY packages/game/index.html ./
COPY packages/game/public ./public
COPY packages/game/env_example ./.env

# Build the game and server
RUN npm run build

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1

EXPOSE 3002

CMD ["npm", "start"] 