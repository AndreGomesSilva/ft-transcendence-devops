const Fastify = require('fastify');
const { setupObservability } = require('@ft-transcendence/observability');

// Example 1: Basic setup with string parameter (backward compatibility)
function basicExample() {
  const app = Fastify();

  // Simple setup - just pass service name
  setupObservability(app, 'my-basic-service');

  app.get('/', async (request, reply) => {
    return { message: 'Hello from basic service!' };
  });

  return app;
}

// Example 2: Advanced setup with configuration object
function advancedExample() {
  const app = Fastify();

  // Advanced setup with full configuration
  const { logger, metricsRegistry } = setupObservability(app, {
    serviceName: 'my-advanced-service',
    logLevel: 'debug',
    enableMetrics: true,
    enableHealthCheck: true,
    metricsPath: '/custom-metrics',
    healthPath: '/custom-health'
  });

  // Use the returned logger and metrics registry
  logger.info('Service configured with advanced settings');

  app.get('/', async (request, reply) => {
    // Structured logging with additional context
    app.log.info({
      userId: request.headers['user-id'],
      action: 'home_page_view',
      timestamp: new Date().toISOString()
    }, 'Home page accessed');

    return {
      message: 'Hello from advanced service!',
      requestId: request.headers['x-request-id']
    };
  });

  return app;
}

// Example 3: Production-ready setup
function productionExample() {
  const app = Fastify();

  setupObservability(app, {
    serviceName: process.env.SERVICE_NAME || 'production-service',
    logLevel: process.env.LOG_LEVEL || 'info',
    enableMetrics: process.env.ENABLE_METRICS !== 'false',
    enableHealthCheck: process.env.ENABLE_HEALTH_CHECK !== 'false',
    metricsPath: process.env.METRICS_PATH || '/metrics',
    healthPath: process.env.HEALTH_PATH || '/health'
  });

  // Business logic routes
  app.get('/api/users', async (request, reply) => {
    const startTime = Date.now();

    try {
      // Simulate database call
      const users = await getUsersFromDatabase();

      app.log.info({
        operation: 'get_users',
        duration: Date.now() - startTime,
        count: users.length
      }, 'Users retrieved successfully');

      return { users };
    } catch (error) {
      app.log.error({
        operation: 'get_users',
        error: error.message,
        duration: Date.now() - startTime
      }, 'Failed to retrieve users');

      throw error;
    }
  });

  app.post('/api/users', async (request, reply) => {
    const userData = request.body;

    app.log.info({
      operation: 'create_user',
      userId: userData.id
    }, 'Creating new user');

    // Simulate user creation
    const newUser = await createUser(userData);

    reply.status(201);
    return { user: newUser };
  });

  return app;
}

// Example 4: Microservices setup with service discovery
function microserviceExample() {
  const app = Fastify();

  setupObservability(app, {
    serviceName: 'user-service',
    logLevel: 'info',
    enableMetrics: true,
    enableHealthCheck: true
  });

  // Service-to-service communication logging
  app.register(async function (fastify) {
    fastify.addHook('onRequest', async (request, reply) => {
      const serviceHeader = request.headers['x-calling-service'];
      if (serviceHeader) {
        request.log.info({
          callingService: serviceHeader,
          endpoint: request.url,
          method: request.method
        }, 'Inter-service call received');
      }
    });
  });

  app.get('/internal/users/:id', async (request, reply) => {
    const { id } = request.params;

    // Log with correlation ID for distributed tracing
    app.log.info({
      operation: 'get_user_internal',
      userId: id,
      correlationId: request.headers['x-correlation-id']
    }, 'Internal user request');

    return { user: { id, name: `User ${id}` } };
  });

  return app;
}

// Example 5: Error handling and monitoring
function errorHandlingExample() {
  const app = Fastify();

  setupObservability(app, 'error-demo-service');

  // Route that demonstrates error logging
  app.get('/api/risky-operation', async (request, reply) => {
    const shouldFail = Math.random() > 0.5;

    if (shouldFail) {
      const error = new Error('Random failure for demo');
      error.statusCode = 500;

      app.log.error({
        operation: 'risky_operation',
        errorType: 'random_failure',
        probability: 0.5
      }, 'Operation failed randomly');

      throw error;
    }

    app.log.info({
      operation: 'risky_operation',
      success: true
    }, 'Operation completed successfully');

    return { success: true, message: 'Operation completed' };
  });

  // Route that demonstrates different error types
  app.get('/api/error/:type', async (request, reply) => {
    const { type } = request.params;

    switch (type) {
      case 'validation':
        const validationError = new Error('Invalid input data');
        validationError.statusCode = 400;
        throw validationError;

      case 'unauthorized':
        const authError = new Error('Access denied');
        authError.statusCode = 401;
        throw authError;

      case 'notfound':
        const notFoundError = new Error('Resource not found');
        notFoundError.statusCode = 404;
        throw notFoundError;

      case 'timeout':
        // Simulate timeout
        await new Promise(resolve => setTimeout(resolve, 30000));
        break;

      default:
        return { error: 'Unknown error type' };
    }
  });

  return app;
}

// Mock functions for examples
async function getUsersFromDatabase() {
  // Simulate database delay
  await new Promise(resolve => setTimeout(resolve, 100));
  return [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ];
}

async function createUser(userData) {
  // Simulate database delay
  await new Promise(resolve => setTimeout(resolve, 150));
  return { id: Date.now(), ...userData, createdAt: new Date().toISOString() };
}

// Usage examples
if (require.main === module) {
  console.log('🚀 Starting observability examples...\n');

  // Basic example
  const basicApp = basicExample();
  basicApp.listen({ port: 3001 }, (err) => {
    if (err) throw err;
    console.log('📊 Basic example running on http://localhost:3001');
    console.log('   - GET / (main route)');
    console.log('   - GET /health (health check)');
    console.log('   - GET /metrics (metrics)\n');
  });

  // Advanced example
  const advancedApp = advancedExample();
  advancedApp.listen({ port: 3002 }, (err) => {
    if (err) throw err;
    console.log('⚡ Advanced example running on http://localhost:3002');
    console.log('   - GET / (main route)');
    console.log('   - GET /custom-health (custom health endpoint)');
    console.log('   - GET /custom-metrics (custom metrics endpoint)\n');
  });

  // Production example
  const productionApp = productionExample();
  productionApp.listen({ port: 3003 }, (err) => {
    if (err) throw err;
    console.log('🏭 Production example running on http://localhost:3003');
    console.log('   - GET /api/users (get users)');
    console.log('   - POST /api/users (create user)');
    console.log('   - GET /health (health check)');
    console.log('   - GET /metrics (metrics)\n');
  });

  // Error handling example
  const errorApp = errorHandlingExample();
  errorApp.listen({ port: 3004 }, (err) => {
    if (err) throw err;
    console.log('🚨 Error handling example running on http://localhost:3004');
    console.log('   - GET /api/risky-operation (random failures)');
    console.log('   - GET /api/error/:type (different error types)');
    console.log('   - GET /health (health check)');
    console.log('   - GET /metrics (metrics)\n');
  });

  console.log('💡 Tips:');
  console.log('   - Check logs in your terminal');
  console.log('   - Visit /metrics endpoints to see Prometheus metrics');
  console.log('   - Visit /health endpoints to see health status');
  console.log('   - Use curl or Postman to test the endpoints');
  console.log('   - Try different LOG_LEVEL values: trace, debug, info, warn, error');
}

module.exports = {
  basicExample,
  advancedExample,
  productionExample,
  microserviceExample,
  errorHandlingExample
};
