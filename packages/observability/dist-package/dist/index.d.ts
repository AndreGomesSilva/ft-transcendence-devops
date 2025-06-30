import { FastifyInstance } from "fastify";
import { Logger } from "pino";
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
export declare const setupObservability: (fastify: FastifyInstance, config: string | ObservabilityConfig) => ObservabilitySetup;
export declare const setupObservabilityLegacy: (fastify: FastifyInstance, serviceName: string) => ObservabilitySetup;
