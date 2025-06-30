FROM node:18-alpine

WORKDIR /app

# Install curl for health check
RUN apk add --no-cache curl

# First, build the observability package
COPY packages/observability ./packages/observability
RUN cd packages/observability && npm install && npm run build && npm pack

# Copy example service files
COPY packages/example_service/package*.json ./

# Install the packed observability package
RUN npm install ./packages/observability/ft-transcendence-observability-1.0.0.tgz

# Install other dependencies
RUN npm install

# Copy TypeScript config and source code
COPY packages/example_service/tsconfig.json ./
COPY packages/example_service/src ./src
COPY packages/example_service/.env ./.env

# Build the application
RUN npm run build

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["npm", "start"]
