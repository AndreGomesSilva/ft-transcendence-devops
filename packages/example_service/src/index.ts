import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import dotenv from "dotenv";
import { setupObservability } from "@ft-transcendence/observability";
import { AddressInfo } from "net";

dotenv.config();

const app = Fastify();

// Setup observability for ELK stack
const observabilitySetup = setupObservability(app, {
  serviceName: "example_service",
  logLevel: process.env.LOG_LEVEL || "info",
  enableMetrics: true,
  enableHealthCheck: true,
  healthPath: "/health",
});

// Demo logs for ELK stack
app.log.info("Application starting up");
app.log.warn("This is a warning message for ELK demo");
app.log.error("This is an error message for ELK demo");

// Simple route with structured logging for ELK
app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
  app.log.info(
    {
      userId: "demo",
      action: "root_request",
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    },
    "Root endpoint accessed",
  );
  return {
    message: "Hello World from ELK demo!",
    service: "example_service",
    timestamp: new Date().toISOString(),
  };
});

// User endpoint with detailed logging
app.get("/users/:id", async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const startTime = Date.now();

  app.log.info(
    {
      userId: id,
      action: "get_user_start",
      requestId: request.headers["x-request-id"],
      ip: request.ip,
    },
    "Starting user fetch",
  );

  // Simulate database work
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 200));

  const duration = Date.now() - startTime;

  app.log.info(
    {
      userId: id,
      action: "get_user_success",
      requestId: request.headers["x-request-id"],
      duration: duration,
      responseSize: "small",
    },
    "User fetch completed successfully",
  );

  return {
    user: {
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
      active: true,
    },
    requestId: request.headers["x-request-id"],
  };
});

// Error endpoint for testing error logs
app.get("/error", async (request: FastifyRequest, reply: FastifyReply) => {
  app.log.warn(
    {
      action: "intentional_error",
      requestId: request.headers["x-request-id"],
      ip: request.ip,
    },
    "Intentional error endpoint called for testing",
  );

  try {
    throw new Error("This is a demo error for ELK testing");
  } catch (error) {
    app.log.error(
      {
        action: "error_occurred",
        errorMessage: error instanceof Error ? error.message : String(error),
        requestId: request.headers["x-request-id"],
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Error thrown for ELK demo",
    );
    throw error;
  }
});

// Order creation with complex logging
app.post("/orders", async (request: FastifyRequest, reply: FastifyReply) => {
  const orderData = request.body as any;
  const orderId = Date.now();

  app.log.info(
    {
      action: "create_order_start",
      orderId: orderId,
      userId: orderData.userId,
      itemCount: orderData.items?.length || 0,
      totalAmount: orderData.total,
      requestId: request.headers["x-request-id"],
    },
    "Starting order creation",
  );

  // Simulate order processing
  await new Promise((resolve) => setTimeout(resolve, 300));

  app.log.info(
    {
      action: "create_order_success",
      orderId: orderId,
      userId: orderData.userId,
      status: "created",
      requestId: request.headers["x-request-id"],
    },
    "Order created successfully",
  );

  return {
    order: {
      id: orderId,
      ...orderData,
      status: "created",
      createdAt: new Date().toISOString(),
    },
  };
});

const start = async () => {
  const port = parseInt(process.env.PORT || "3000", 10);
  const host = process.env.HOST || "0.0.0.0";

  try {
    await app.listen({ port, host });
    const address = app.server.address() as AddressInfo;

    app.log.info(
      {
        event: "server_started",
        port: address.port,
        host: address.address,
        environment: process.env.NODE_ENV || "development",
        logstashHost: process.env.LOGSTASH_HOST,
        logstashPort: process.env.LOGSTASH_PORT,
      },
      "Server started and ready for ELK logging",
    );

    app.log.info(
      {
        event: "endpoints_available",
        endpoints: [
          "GET / - Hello World with logging",
          "GET /users/:id - User fetch with detailed logs",
          "POST /orders - Order creation with structured logs",
          "GET /error - Error handling demo",
          "GET /health - Health check",
        ],
      },
      "ELK demo endpoints available",
    );
  } catch (err) {
    app.log.error(
      {
        event: "server_start_failed",
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      "Failed to start server",
    );
    process.exit(1);
  }
};

start();
