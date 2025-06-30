# @ft-transcendence/observability

🚀 **Simple observability for your Node.js services** - Add logging, metrics, and health checks in seconds!

## Quick Setup (3 steps)

### 1. Get the package
```bash
# From this repo (recommended for peers)
git clone <this-repo>
cd packages/observability
npm pack
# This creates: ft-transcendence-observability-1.0.0.tgz

# In your service directory
npm install /path/to/ft-transcendence-observability-1.0.0.tgz
```

### 2. Add to your Fastify service
```javascript
const Fastify = require('fastify');
const { setupObservability } = require('@ft-transcendence/observability');

const fastify = Fastify();

// One line setup!
const { logger } = setupObservability(fastify, 'my-service-name');

// Your routes
fastify.get('/', async () => {
  logger.info('Hello world!');
  return { message: 'Hello World!' };
});

fastify.listen({ port: 3000 });
```

### 3. That's it! You now have:
- ✅ **Structured logging** with JSON format
- ✅ **Health endpoint** at `/health`
- ✅ **Metrics endpoint** at `/metrics` (Prometheus format)
- ✅ **HTTP request tracking** (automatic)
- ✅ **ELK stack integration** (if available)

## Configuration Options

```javascript
// Simple (recommended)
setupObservability(fastify, 'my-service');

// Or with options
setupObservability(fastify, {
  serviceName: 'my-service',
  logLevel: 'info',              // debug, info, warn, error
  enableMetrics: true,           // /metrics endpoint
  enableHealthCheck: true,       // /health endpoint
  metricsPath: '/custom-metrics', // change metrics path
  healthPath: '/custom-health'    // change health path
});
```

## What endpoints do I get?

| Endpoint | What it does |
|----------|-------------|
| `GET /health` | Returns `{"status":"ok","service":"my-service","timestamp":"..."}` |
| `GET /metrics` | Prometheus metrics (CPU, memory, HTTP requests, etc.) |

## Environment Variables (optional)

```bash
# Set log level
LOG_LEVEL=debug

# Connect to ELK stack (if you have it)
LOGSTASH_HOST=localhost
LOGSTASH_PORT=5000
```

## Examples

### Basic Express-style service
```javascript
const Fastify = require('fastify');
const { setupObservability } = require('@ft-transcendence/observability');

const fastify = Fastify();
const { logger } = setupObservability(fastify, 'user-service');

fastify.get('/users/:id', async (request) => {
  const { id } = request.params;
  logger.info('Fetching user', { userId: id });
  
  // Your business logic here
  return { id, name: 'John Doe' };
});

fastify.listen({ port: 3000 }, () => {
  logger.info('User service started on port 3000');
});
```

### With Docker
Works seamlessly with Docker and container orchestration:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## 🤝 Contributing

This package is part of the ft-transcendence project. For issues or contributions, please refer to the main repository.

## 📄 License

MIT
