# Environment Variables Setup Guide

## Quick Setup

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Customize your environment variables:**
   Edit the `.env` file and update any values specific to your environment.

3. **Start the services:**
   ```bash
   docker-compose up -d
   ```

## Environment Configuration

### Core Services Configuration

The `.env` file controls all aspects of your ft-transcendence DevOps stack:

#### **ELK Stack (Elasticsearch, Logstash, Kibana)**
- `ELASTICSEARCH_PORT=9200` - Elasticsearch web interface
- `KIBANA_PORT=5601` - Kibana dashboard
- `LOGSTASH_TCP_PORT=5000` - Log ingestion port
- `LOGSTASH_HTTP_PORT=9600` - Logstash management API

#### **Monitoring Stack (Prometheus, Grafana)**
- `PROMETHEUS_PORT=9090` - Prometheus metrics interface
- `GRAFANA_PORT=3001` - Grafana dashboards
- `GRAFANA_ADMIN_USER=admin` - Default Grafana admin username
- `GRAFANA_ADMIN_PASSWORD=admin` - **Change this in production!**

### Security Considerations

🔒 **Important**: Before deploying to production:

1. **Change default passwords:**
   ```bash
   # Update in .env file
   GRAFANA_ADMIN_PASSWORD=your-secure-password-here
   ```

2. **Add application secrets:**
   ```bash
   # Uncomment and set these in .env
   JWT_SECRET=your-super-secret-jwt-key-here
   SESSION_SECRET=your-session-secret-here
   DATABASE_URL=sqlite:///app/data/ft_transcendence.db
   ```

3. **Configure CORS origins:**
   ```bash
   CORS_ORIGINS=http://localhost:3000,http://localhost:3001
   ```

## Service URLs

After running `docker-compose up -d`, access your services at:

- **Elasticsearch**: http://localhost:9200
- **Kibana**: http://localhost:5601
- **Logstash**: http://localhost:9600 (management)
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

## Validation Commands

```bash
# Check if all services are running
docker-compose ps

# View service logs
docker-compose logs [service-name]

# Test Elasticsearch
curl http://localhost:9200/_cluster/health

# Test Prometheus metrics
curl http://localhost:9090/api/v1/status/config
```

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   - Update ports in `.env` if they're already in use
   - Example: `GRAFANA_PORT=3002` instead of `3001`

2. **Memory issues:**
   - Reduce Java heap sizes in `.env`:
     ```bash
     ELASTICSEARCH_JAVA_OPTS=-Xms256m -Xmx256m
     LOGSTASH_JAVA_OPTS=-Xmx128m -Xms128m
     ```

3. **Volume permissions:**
   ```bash
   # Fix Elasticsearch volume permissions
   sudo chown -R 1000:1000 /var/lib/docker/volumes/ft_transcendence_esdata
   ```

## Adding Application Services

When you add your application services, uncomment and configure these variables in `.env`:

```bash
# Application Configuration
APP_PORT=3000
APP_HOST=localhost
DATABASE_URL=sqlite:///app/data/ft_transcendence.db

# Observability
LOG_LEVEL=info
OBSERVABILITY_SERVICE_NAME=ft-transcendence
```

Then update your service in `docker-compose.yml`:
```yaml
your_service:
  build: .
  ports:
    - "${APP_PORT:-3000}:3000"
  environment:
    - LOG_LEVEL=${LOG_LEVEL:-info}
    - DATABASE_URL=${DATABASE_URL}
  networks:
    - ${NETWORK_NAME:-ft-net}
```
