"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupObservabilityLegacy = exports.setupObservability = void 0;
const pino_1 = __importDefault(require("pino"));
const prom_client_1 = __importDefault(require("prom-client"));
const setupLogging = (serviceName, logLevel) => {
    const level = logLevel || process.env.LOG_LEVEL || "info";
    return (0, pino_1.default)({
        name: serviceName,
        level,
        timestamp: pino_1.default.stdTimeFunctions.isoTime,
        formatters: {
            level: (label) => {
                return { level: label };
            },
        },
        transport: process.env.NODE_ENV !== "production"
            ? {
                target: "pino-pretty",
                options: {
                    colorize: true,
                    translateTime: "SYS:standard",
                    ignore: "pid,hostname",
                },
            }
            : undefined,
    });
};
const setupMetrics = (fastify, serviceName, metricsPath = "/metrics") => {
    const register = new prom_client_1.default.Registry();
    register.setDefaultLabels({ service: serviceName });
    // Collect default metrics
    prom_client_1.default.collectDefaultMetrics({
        register,
    });
    // HTTP request duration histogram
    const httpRequestDuration = new prom_client_1.default.Histogram({
        name: "http_request_duration_ms",
        help: "Duration of HTTP requests in ms",
        labelNames: ["method", "route", "status_code", "service"],
        buckets: [0.1, 5, 15, 50, 100, 200, 300, 400, 500, 1000, 2000, 5000],
        registers: [register],
    });
    // HTTP request counter
    const httpRequestsTotal = new prom_client_1.default.Counter({
        name: "http_requests_total",
        help: "Total number of HTTP requests",
        labelNames: ["method", "route", "status_code", "service"],
        registers: [register],
    });
    // Active connections gauge
    const activeConnections = new prom_client_1.default.Gauge({
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
    fastify.addHook("onResponse", (request, reply, done) => {
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
    });
    // Metrics endpoint
    fastify.get(metricsPath, {
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
    }, async (request, reply) => {
        reply.header("Content-Type", register.contentType);
        return register.metrics();
    });
    return register;
};
const setupHealthCheck = (fastify, serviceName, healthPath = "/health") => {
    fastify.get(healthPath, {
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
    }, async (request, reply) => {
        return {
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            service: serviceName,
        };
    });
};
const setupObservability = (fastify, config) => {
    // Handle backward compatibility - allow string as first parameter
    const observabilityConfig = typeof config === "string" ? { serviceName: config } : config;
    const { serviceName, logLevel, enableMetrics = true, enableHealthCheck = true, metricsPath = "/metrics", healthPath = "/health", } = observabilityConfig;
    // Setup logging
    const logger = setupLogging(serviceName, logLevel);
    fastify.log = logger;
    let metricsRegistry;
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
        const requestId = request.headers["x-request-id"] ||
            `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        request.headers["x-request-id"] = requestId;
        reply.header("x-request-id", requestId);
    });
    // Enhanced error handling
    fastify.setErrorHandler((error, request, reply) => {
        const requestId = request.headers["x-request-id"];
        logger.error({
            err: error,
            req: {
                id: requestId,
                method: request.method,
                url: request.url,
            },
        }, "Request error occurred");
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
    logger.info({
        service: serviceName,
        features: {
            logging: true,
            metrics: enableMetrics,
            healthCheck: enableHealthCheck,
            metricsPath: enableMetrics ? metricsPath : undefined,
            healthPath: enableHealthCheck ? healthPath : undefined,
        },
    }, "Observability setup complete");
    return {
        logger,
        metricsRegistry: metricsRegistry || new prom_client_1.default.Registry(),
    };
};
exports.setupObservability = setupObservability;
// Backward compatibility export
const setupObservabilityLegacy = (fastify, serviceName) => {
    return (0, exports.setupObservability)(fastify, { serviceName });
};
exports.setupObservabilityLegacy = setupObservabilityLegacy;
