# Observability Library - Technical Documentation

## Architecture Overview

The `@ft-transcendence/observability` library provides a comprehensive observability solution for Node.js applications built with Fastify. It integrates three core pillars of observability:

1. **Logging** - Structured JSON logging with Pino
2. **Metrics** - Prometheus-compatible metrics collection
3. **Health Monitoring** - HTTP health check endpoints

## Core Components

### 1. Logging System (`setupLogging`)

#### Features
- **Structured Logging**: Uses Pino for high-performance JSON logging
- **Multi-Stream Output**: Console for development, Logstash for production
- **Automatic Reconnection**: Resilient TCP connection to Logstash
- **Service Context**: All logs include service name and metadata

#### Technical Implementation

```typescript
const setupLogging = (serviceName: string, logLevel?: string): Logger => {
  const level = logLevel || process.env.LOG_LEVEL || "info";
  const streams: any[] = [];

  // Console stream for development
  if (process.env.NODE_ENV !== "production") {
    streams.push({
      stream: pino.destination({ sync: false }),
      level,
    });
  }

  // Logstash TCP stream for production
  const logstashHost = process.env.LOGSTASH_HOST || "logstash";
  const logstashPort = parseInt(process.env.LOGSTASH_PORT || "5000", 10);
  
  // ... TCP connection logic with automatic reconnection
}
```

#### Connection Management
- **Graceful Reconnection**: Exponential backoff with maximum retry attempts
- **Error Handling**: Comprehensive error handling for network issues
- **Timeout Management**: Connection timeout handling to prevent hanging

### 2. Metrics Collection (`setupMetrics`)

#### Prometheus Integration
The library automatically registers and collects:

1. **HTTP Request Metrics**:
   - `http_requests_total` - Counter of total HTTP requests
   - `http_request_duration_seconds` - Histogram of request durations
   - Labels: `method`, `route`, `status_code`, `service`

2. **Node.js Runtime Metrics**:
   - Memory usage (heap, external, RSS)
   - CPU usage and process information
   - Event loop lag and active handles
   - Garbage collection statistics

#### Technical Implementation

```typescript
const setupMetrics = (
  fastify: FastifyInstance,
  serviceName: string,
  metricsPath: string = "/metrics"
): promClient.Registry => {
  const register = new promClient.Registry();
  
  // Collect default Node.js metrics
  promClient.collectDefaultMetrics({
    register,
    prefix: 'nodejs_',
    labels: { service: serviceName }
  });

  // HTTP request metrics
  const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'service'],
    registers: [register]
  });

  const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code', 'service'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    registers: [register]
  });

  // Fastify hooks for automatic metric collection
  fastify.addHook('onRequest', async (request) => {
    request.startTime = process.hrtime();
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const diff = process.hrtime(request.startTime);
    const duration = diff[0] + diff[1] * 1e-9;

    const labels = {
      method: request.method,
      route: request.routerPath || request.url,
      status_code: reply.statusCode.toString(),
      service: serviceName
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });

  return register;
};
```

### 3. Health Check System (`setupHealthCheck`)

#### Health Endpoint Features
- **Service Status**: Always returns operational status
- **Metadata**: Includes service name, timestamp, and uptime
- **Extensible**: Can be extended with custom health checks

#### Response Format

```json
{
  "status": "ok",
  "service": "my-service",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600
}
```

## Configuration System

### Main Configuration Interface

```typescript
export interface ObservabilityConfig {
  serviceName: string;
  logLevel?: string;           // debug, info, warn, error
  enableMetrics?: boolean;     // default: true
  enableHealthCheck?: boolean; // default: true
  metricsPath?: string;        // default: "/metrics"
  healthPath?: string;         // default: "/health"
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level | `info` |
| `NODE_ENV` | Environment mode | `development` |
| `LOGSTASH_HOST` | Logstash server host | `logstash` |
| `LOGSTASH_PORT` | Logstash TCP port | `5000` |

## Integration Patterns

### 1. ELK Stack Integration

```yaml
# docker-compose.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    ports:
      - "9200:9200"
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    ports:
      - "5000:5000"
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
```

### 2. Prometheus Integration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'my-service'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s
```

## Error Handling & Resilience

### Logging Resilience
- **Connection Failures**: Automatic reconnection with exponential backoff
- **Network Issues**: Graceful degradation, continues local logging
- **Buffer Management**: Internal buffering during connection outages

### Metrics Resilience
- **Registry Isolation**: Each service gets its own metrics registry
- **Memory Management**: Automatic cleanup of stale metrics
- **Performance**: Non-blocking metric collection

## Performance Considerations

### Logging Performance
- **Async Operations**: All logging operations are asynchronous
- **Stream Optimization**: Efficient stream handling with Pino
- **Minimal Overhead**: < 1ms average logging overhead

### Metrics Performance
- **In-Memory Collection**: All metrics stored in memory
- **Efficient Serialization**: Optimized Prometheus format serialization
- **Hook Optimization**: Minimal request processing overhead

## Deployment Best Practices

### 1. Container Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Build if necessary
RUN npm run build

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "dist/index.js"]
```
