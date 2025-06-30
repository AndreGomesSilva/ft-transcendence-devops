import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import pino, { Logger } from "pino";
import promClient from "prom-client";

export interface ObservabilityConfig {
  serviceName: string;
  logLevel?: string;
  enableMetrics?: boolean;
  enableHealthCheck?: boolean;
  metricsPath?: string;
  healthPath?: string;
}

export interface ObservabilitySetup {
  logger: Logger;
  metricsRegistry: promClient.Registry;
}

const setupLogging = (serviceName: string, logLevel?: string): Logger => {
  const level = logLevel || process.env.LOG_LEVEL || "info";

  // Create streams for logging
  const streams: any[] = [];

  // Always add console output for development
  if (process.env.NODE_ENV !== "production") {
    streams.push({
      stream: pino.destination({
        sync: false,
      }),
      level,
    });
  }

  // Add Logstash output for ELK stack
  const logstashHost = process.env.LOGSTASH_HOST || "logstash";
  const logstashPort = parseInt(process.env.LOGSTASH_PORT || "5000", 10);

  if (logstashHost && logstashPort) {
    const net = require("net");
    const logstashStream = new net.Socket();

    // Connect to Logstash
    logstashStream.connect(logstashPort, logstashHost, () => {
      console.log(`Connected to Logstash at ${logstashHost}:${logstashPort}`);
    });

    logstashStream.on("error", (err: Error) => {
      console.error("Logstash connection error:", err.message);
    });

    streams.push({
      stream: {
        write: (msg: string) => {
          if (logstashStream.writable) {
            logstashStream.write(msg + "\n");
          }
        },
      },
      level,
    });
  }

  // Fallback to stdout if no streams configured
  if (streams.length === 0) {
    streams.push({
      stream: process.stdout,
      level,
    });
  }

  return pino(
    {
      name: serviceName,
      level,
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
    },
    pino.multistream(streams),
  );
};

const setupMetrics = (
  fastify: FastifyInstance,
  serviceName: string,
  metricsPath: string = "/metrics",
): promClient.Registry => {
  const register = new promClient.Registry();
  register.setDefaultLabels({ service: serviceName });

  // Collect default metrics
  promClient.collectDefaultMetrics({
    register,
  });

  // HTTP request duration histogram
  const httpRequestDuration = new promClient.Histogram({
    name: "http_request_duration_ms",
    help: "Duration of HTTP requests in ms",
    labelNames: ["method", "route", "status_code", "service"],
    buckets: [0.1, 5, 15, 50, 100, 200, 300, 400, 500, 1000, 2000, 5000],
    registers: [register],
  });

  // HTTP request counter
  const httpRequestsTotal = new promClient.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code", "service"],
    registers: [register],
  });

  // Active connections gauge
  const activeConnections = new promClient.Gauge({
    name: "http_active_connections",
    help: "Number of active HTTP connections",
    labelNames: ["service"],
    registers: [register],
  });

  // Track active connections
  fastify.addHook("onRequest", async () => {
    activeConnections.labels(serviceName).inc();
  });

  fastify.addHook("onResponse", async () => {
    activeConnections.labels(serviceName).dec();
  });

  // Track request metrics
  fastify.addHook(
    "onResponse",
    (
      request: FastifyRequest,
      reply: FastifyReply,
      done: (err?: Error) => void,
    ) => {
      const route = request.routeOptions.url || request.url;

      // Skip metrics endpoint to avoid self-monitoring
      if (route !== metricsPath) {
        const labels = {
          method: request.method,
          route,
          status_code: reply.statusCode.toString(),
          service: serviceName,
        };

        httpRequestDuration.labels(labels).observe(reply.elapsedTime);
        httpRequestsTotal.labels(labels).inc();
      }
      done();
    },
  );

  // Metrics endpoint
  fastify.get(
    metricsPath,
    {
      schema: {
        description: "Prometheus metrics endpoint",
        tags: ["monitoring"],
        response: {
          200: {
            type: "string",
            description: "Prometheus metrics in text format",
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      reply.header("Content-Type", register.contentType);
      return register.metrics();
    },
  );

  return register;
};

const setupHealthCheck = (
  fastify: FastifyInstance,
  serviceName: string,
  healthPath: string = "/health",
) => {
  fastify.get(
    healthPath,
    {
      schema: {
        description: "Health check endpoint",
        tags: ["monitoring"],
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              timestamp: { type: "string" },
              uptime: { type: "number" },
              service: { type: "string" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: serviceName,
      };
    },
  );
};

export const setupObservability = (
  fastify: FastifyInstance,
  config: string | ObservabilityConfig,
): ObservabilitySetup => {
  // Handle backward compatibility - allow string as first parameter
  const observabilityConfig: ObservabilityConfig =
    typeof config === "string" ? { serviceName: config } : config;

  const {
    serviceName,
    logLevel,
    enableMetrics = true,
    enableHealthCheck = true,
    metricsPath = "/metrics",
    healthPath = "/health",
  } = observabilityConfig;

  // Setup logging
  const logger = setupLogging(serviceName, logLevel);
  fastify.log = logger;

  let metricsRegistry: promClient.Registry | undefined;

  // Setup metrics if enabled
  if (enableMetrics) {
    metricsRegistry = setupMetrics(fastify, serviceName, metricsPath);
  }

  // Setup health check if enabled
  if (enableHealthCheck) {
    setupHealthCheck(fastify, serviceName, healthPath);
  }

  // Add request ID generation
  fastify.addHook("onRequest", async (request, reply) => {
    const requestId =
      request.headers["x-request-id"] ||
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    request.headers["x-request-id"] = requestId;
    reply.header("x-request-id", requestId);
  });

  // Enhanced error handling
  fastify.setErrorHandler((error, request, reply) => {
    const requestId = request.headers["x-request-id"];

    logger.error(
      {
        err: error,
        req: {
          id: requestId,
          method: request.method,
          url: request.url,
        },
      },
      "Request error occurred",
    );

    const statusCode = error.statusCode || 500;
    const response = {
      error: {
        message: statusCode >= 500 ? "Internal Server Error" : error.message,
        statusCode,
        ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
      },
      requestId,
    };

    reply.status(statusCode).send(response);
  });

  logger.info(
    {
      service: serviceName,
      features: {
        logging: true,
        metrics: enableMetrics,
        healthCheck: enableHealthCheck,
        metricsPath: enableMetrics ? metricsPath : undefined,
        healthPath: enableHealthCheck ? healthPath : undefined,
      },
    },
    "Observability setup complete",
  );

  return {
    logger,
    metricsRegistry: metricsRegistry || new promClient.Registry(),
  };
};

// Backward compatibility export
export const setupObservabilityLegacy = (
  fastify: FastifyInstance,
  serviceName: string,
) => {
  return setupObservability(fastify, { serviceName });
};
