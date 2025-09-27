// TypeScript declarations for the parlant-server package

declare module "parlant-server" {
  // Health monitoring types and exports
  export * from "./health";
  export * from "./monitoring";

  // Logging and error handling types and exports
  export * from "./logging";
  export * from "./error-tracking";
  export * from "./error-intelligence";
  export * from "./error-taxonomy";
  export * from "./error-explanations";
  export * from "./error-handler";
  export * from "./error-recovery";
  export * from "./error-analytics";

  // Integration health types and exports
  export * from "./integration-health";

  // Quick health check function
  export * from "./quick-health-check";

  // Additional common types
  export interface ParlantServerConfig {
    host?: string;
    port?: number;
    database?: string;
    logLevel?: "debug" | "info" | "warn" | "error";
  }

  export interface HealthCheckResult {
    status: "healthy" | "unhealthy";
    checks: Record<string, any>;
    timestamp: string;
  }
}
