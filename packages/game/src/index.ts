import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import dotenv from "dotenv";
import { setupObservability } from "@ft-transcendence/observability";
import { AddressInfo } from "net";
import path from "path";
import fs from "fs";

dotenv.config();

const app = Fastify();

// Setup observability for ELK stack
const observabilitySetup = setupObservability(app, {
  serviceName: "game-service",
  logLevel: process.env['LOG_LEVEL'] || "info",
  enableMetrics: true,
  enableHealthCheck: true,
  healthPath: "/health",
  metricsPath: "/metrics",
});

// MIME types for different file extensions
const mimeTypes: { [key: string]: string } = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'application/font-woff',
  '.woff2': 'application/font-woff2',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Initialize async setup
const initializeApp = async () => {
  // Logging for service startup
  app.log.info("Game service starting up");

  // Static file serving from dist directory
  app.get('*', async (request: FastifyRequest, reply: FastifyReply) => {
    const requestUrl = request.url === '/' ? '/index.html' : request.url;
    const distDir = path.join(__dirname, '../dist/game');
    let filePath = path.join(distDir, requestUrl);
    
    app.log.info(
      {
        action: "static_file_request",
        path: requestUrl,
        filePath: filePath,
        ip: request.ip,
        userAgent: request.headers["user-agent"],
      },
      "Static file requested",
    );

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        // File not found, serve index.html for SPA routing
        filePath = path.join(distDir, 'index.html');
        app.log.info(
          {
            action: "spa_fallback",
            originalPath: requestUrl,
            fallbackPath: filePath,
          },
          "File not found, serving index.html for SPA routing",
        );
      }

      const content = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = mimeTypes[ext] || 'application/octet-stream';
      
      app.log.info(
        {
          action: "static_file_served",
          path: requestUrl,
          mimeType: mimeType,
          size: content.length,
        },
        "Static file served successfully",
      );

      return reply.type(mimeType).send(content);
    } catch (error) {
      app.log.error(
        {
          error: error,
          path: requestUrl,
          filePath: filePath,
        },
        'Error serving static file'
      );
      return reply.code(404).send('File not found');
    }
  });
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, shutting down gracefully`);
  try {
    await app.close();
    app.log.info("Game service closed successfully");
    process.exit(0);
  } catch (error) {
    app.log.error(error, "Error during shutdown");
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server
const start = async () => {
  try {
    // Initialize the app first
    await initializeApp();
    
    const port = parseInt(process.env['PORT'] || "3002");
    const address = await app.listen({
      port: port,
      host: "0.0.0.0"
    });
    
    app.log.info(
      {
        service: "game-service",
        address: address,
        port: port,
      },
      "Game service started successfully"
    );
  } catch (err) {
    app.log.error(err, "Error starting game service");
    process.exit(1);
  }
};

start(); 