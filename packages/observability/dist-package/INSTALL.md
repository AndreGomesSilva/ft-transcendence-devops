# @ft-transcendence/observability - Local Installation Guide

## Installation Methods

### Method 1: Direct Archive Installation

```bash
# Extract the archive
tar -xzf ft-transcendence-observability-*.tar.gz

# Navigate to your service directory
cd your-service-directory

# Install the package locally
npm install file:../path/to/ft-transcendence-observability-*
```

### Method 2: Copy and Install

```bash
# Copy to your project's dependencies directory
cp -r ft-transcendence-observability-* your-project/libs/

# Install from local directory
cd your-project
npm install file:./libs/ft-transcendence-observability-*
```

### Method 3: Using npm pack (recommended)

```bash
# In the extracted directory
cd ft-transcendence-observability-*
npm pack

# This creates a .tgz file that can be installed
npm install ft-transcendence-observability-*.tgz
```

## Usage

```typescript
import { setupObservability } from '@ft-transcendence/observability';

const app = Fastify();
setupObservability(app, 'your-service-name');
```

## Microservices Setup

For microservices architecture, install in each service:

```bash
# Service 1
cd user-service
npm install file:../shared/ft-transcendence-observability-*

# Service 2
cd order-service
npm install file:../shared/ft-transcendence-observability-*

# Service 3
cd notification-service
npm install file:../shared/ft-transcendence-observability-*
```

## Docker Integration

Add to your service's Dockerfile:

```dockerfile
# Copy the observability package
COPY shared/ft-transcendence-observability-* ./shared/

# Install it
RUN npm install file:./shared/ft-transcendence-observability-*
```

## Features

- 📊 Prometheus metrics collection
- 📝 Structured JSON logging with Pino
- 🏥 Built-in health checks
- 🔗 Request tracing and correlation
- 🚨 Enhanced error handling
- 🔧 TypeScript support

## Endpoints Available

- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

## Environment Variables

- `LOG_LEVEL` - Logging level (trace, debug, info, warn, error, fatal)
- `NODE_ENV` - Environment (affects log formatting)

## Support

For issues or questions, check the README.md file or contact the ft-transcendence team.
