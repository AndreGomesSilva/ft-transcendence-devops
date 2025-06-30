# @ft-transcendence/observability

A comprehensive observability library providing logging, metrics, and monitoring for Node.js applications using Fastify, Pino, and Prometheus.

## Features

- 🚀 **Easy Integration**: One-line setup for complete observability
- 📊 **Prometheus Metrics**: Automatic HTTP request metrics and custom metrics support
- 📝 **Structured Logging**: High-performance logging with Pino
- 🎯 **Fastify Optimized**: Built specifically for Fastify applications
- 📈 **Performance Monitoring**: HTTP request duration tracking
- 🔧 **Configurable**: Environment-based configuration
- 📦 **TypeScript Support**: Full TypeScript definitions included

## Installation

```bash
npm install @ft-transcendence/observability
```

## Quick Start

```typescript
import Fastify from 'fastify';
import { setupObservability } from '@ft-transcendence/observability';

const app = Fastify();

// Setup observability with one line
setupObservability(app, 'my-service');

app.get('/', async (request, reply) => {
  return { message: 'Hello World!' };
});

app.listen({ port: 3000 });
```

## What's Included

### Logging
- Structured JSON logging with Pino
- Automatic service name labeling
- Environment-based log level configuration
- Pretty printing in development

### Metrics
- HTTP request duration histogram
- Default Node.js metrics (memory, CPU, etc.)
- Automatic `/metrics` endpoint for Prometheus scraping
- Service-specific labels

### Monitoring Endpoints
- `GET /metrics` - Prometheus metrics endpoint

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level (trace, debug, info, warn, error, fatal) | `info` |
| `NODE_ENV` | Environment (affects log formatting) | - |

### Log Levels
- `trace`: Most verbose, includes all logs
- `debug`: Debug information
- `info`: General information (default)
- `warn`: Warning messages
- `error`: Error messages
- `fatal`: Critical errors

## Usage Examples

### Basic Setup
```typescript
import Fastify from 'fastify';
import { setupObservability } from '@ft-transcendence/observability';

const app = Fastify();
setupObservability(app, 'user-service');

app.get('/users', async (request, reply) => {
  app.log.info('Fetching users');
  return { users: [] };
});
```

### With Environment Configuration
```typescript
// Set environment variables
process.env.LOG_LEVEL = 'debug';
process.env.NODE_ENV = 'production';

import Fastify from 'fastify';
import { setupObservability } from '@ft-transcendence/observability';

const app = Fastify();
setupObservability(app, 'api-gateway');
```

### Custom Logging
```typescript
app.get('/health', async (request, reply) => {
  app.log.info({ userId: 123, action: 'health_check' }, 'Health check performed');
  return { status: 'healthy' };
});
```

## Metrics Collected

### HTTP Metrics
- `http_request_duration_ms`: Histogram of HTTP request durations
  - Labels: `method`, `route`, `code`, `service`
  - Buckets: [0.1, 5, 15, 50, 100, 200, 300, 400, 500] ms

### Default Node.js Metrics
- Process CPU usage
- Process memory usage
- Event loop lag
- Active handles and requests
- Garbage collection metrics

## Prometheus Integration

The library automatically exposes metrics at `/metrics` endpoint in Prometheus format:

```
# HELP http_request_duration_ms Duration of HTTP requests in ms
# TYPE http_request_duration_ms histogram
http_request_duration_ms_bucket{le="0.1",method="GET",route="/",code="200",service="my-service"} 0
http_request_duration_ms_bucket{le="5",method="GET",route="/",code="200",service="my-service"} 1
...
```

## Docker Integration

Example Dockerfile:
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

Example docker-compose.yml with Prometheus:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - LOG_LEVEL=info
      - NODE_ENV=production
    
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    configs:
      - source: prometheus_config
        target: /etc/prometheus/prometheus.yml

configs:
  prometheus_config:
    content: |
      global:
        scrape_interval: 15s
      scrape_configs:
        - job_name: 'my-service'
          static_configs:
            - targets: ['app:3000']
```

## TypeScript Support

Full TypeScript definitions are included. The main export:

```typescript
import { FastifyInstance } from 'fastify';

export declare const setupObservability: (
  fastify: FastifyInstance, 
  serviceName: string
) => void;
```

## Requirements

- Node.js >= 16.0.0
- Fastify >= 5.0.0

## Dependencies

- `pino`: High-performance logging
- `pino-pretty`: Pretty printing for development
- `prom-client`: Prometheus metrics

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Changelog

### 1.0.0
- Initial release
- Basic logging and metrics setup
- Fastify integration
- Prometheus metrics endpoint