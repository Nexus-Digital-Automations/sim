#!/usr/bin/env node

/**
 * Parlant Server Configuration Validation Script
 * =============================================
 *
 * Validates environment variables for Parlant server setup
 * Ensures all required configuration is present and valid
 */

import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration validation rules
const CONFIG_RULES = {
  required: [
    "DATABASE_URL",
    "PARLANT_HOST",
    "PARLANT_PORT",
    "AI_PROVIDER",
    "OPENAI_API_KEY",
    "SIM_API_URL",
    "SIM_API_KEY",
  ],
  optional: [
    "DEBUG",
    "AI_MODEL",
    "LOG_LEVEL",
    "SESSION_TIMEOUT",
    "SESSION_STORAGE",
    "MAX_CONCURRENT_SESSIONS",
    "CACHE_TTL",
    "ANTHROPIC_API_KEY",
    "CEREBRAS_API_KEY",
  ],
  validation: {
    PARLANT_PORT: (value) => {
      const port = Number.parseInt(value, 10);
      return port >= 1000 && port <= 65535;
    },
    DATABASE_URL: (value) => {
      return (
        value.startsWith("postgresql://") || value.startsWith("postgres://")
      );
    },
    SIM_API_URL: (value) => {
      return value.startsWith("http://") || value.startsWith("https://");
    },
    AI_PROVIDER: (value) => {
      return ["openai", "anthropic", "cerebras", "ollama"].includes(
        value.toLowerCase(),
      );
    },
    LOG_LEVEL: (value) => {
      return ["DEBUG", "INFO", "WARN", "ERROR"].includes(value.toUpperCase());
    },
    SESSION_TIMEOUT: (value) => {
      const timeout = Number.parseInt(value, 10);
      return timeout >= 300 && timeout <= 86400; // 5 minutes to 24 hours
    },
    MAX_CONCURRENT_SESSIONS: (value) => {
      const sessions = Number.parseInt(value, 10);
      return sessions >= 1 && sessions <= 10000;
    },
    CACHE_TTL: (value) => {
      const ttl = Number.parseInt(value, 10);
      return ttl >= 60 && ttl <= 3600; // 1 minute to 1 hour
    },
  },
};

/**
 * Load environment variables from file
 */
function loadEnvFile(envPath) {
  if (!existsSync(envPath)) {
    throw new Error(`Environment file not found: ${envPath}`);
  }

  const envContent = readFileSync(envPath, "utf8");
  const envVars = {};

  envContent.split("\n").forEach((line) => {
    line = line.trim();
    if (line && !line.startsWith("#")) {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join("=").trim();
      }
    }
  });

  return envVars;
}

/**
 * Validate configuration
 */
function validateConfig(config, environment = "development") {
  const errors = [];
  const warnings = [];

  console.log(`\n🔍 Validating Parlant ${environment} configuration...\n`);

  // Check required variables
  CONFIG_RULES.required.forEach((key) => {
    if (!config[key]) {
      errors.push(`❌ Missing required variable: ${key}`);
    } else {
      console.log(`✅ ${key}: Present`);
    }
  });

  // Validate variable formats
  Object.entries(CONFIG_RULES.validation).forEach(([key, validator]) => {
    if (config[key]) {
      try {
        if (!validator(config[key])) {
          errors.push(`❌ Invalid format for ${key}: ${config[key]}`);
        } else {
          console.log(`✅ ${key}: Valid format`);
        }
      } catch (error) {
        errors.push(`❌ Validation error for ${key}: ${error.message}`);
      }
    }
  });

  // Environment-specific validations
  if (environment === "production") {
    if (config.DEBUG === "true") {
      warnings.push(`⚠️  DEBUG is enabled in production`);
    }
    if (config.LOG_LEVEL === "DEBUG") {
      warnings.push(`⚠️  LOG_LEVEL is DEBUG in production`);
    }
  }

  // AI Provider specific checks
  if (config.AI_PROVIDER === "openai" && !config.OPENAI_API_KEY) {
    errors.push(`❌ OPENAI_API_KEY required when AI_PROVIDER is openai`);
  }

  if (config.AI_PROVIDER === "anthropic" && !config.ANTHROPIC_API_KEY) {
    errors.push(`❌ ANTHROPIC_API_KEY required when AI_PROVIDER is anthropic`);
  }

  // Database connectivity check (basic format validation)
  if (config.DATABASE_URL) {
    try {
      const url = new URL(config.DATABASE_URL);
      if (!url.hostname || !url.port) {
        warnings.push(`⚠️  DATABASE_URL missing hostname or port`);
      }
    } catch (error) {
      errors.push(`❌ Invalid DATABASE_URL format: ${error.message}`);
    }
  }

  return { errors, warnings };
}

/**
 * Main validation function
 */
function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || "development";

  try {
    console.log(`\n🚀 Parlant Server Configuration Validator`);
    console.log(`📋 Environment: ${environment}`);

    // Determine env file path
    let envFile;
    if (environment === "example") {
      envFile = join(__dirname, ".env.example");
    } else {
      envFile = join(__dirname, `.env.${environment}`);
    }

    // Check if specific env file exists, fallback to .env
    if (!existsSync(envFile)) {
      envFile = join(__dirname, ".env");
      if (!existsSync(envFile)) {
        throw new Error(
          `No environment file found for '${environment}' environment`,
        );
      }
    }

    console.log(`📄 Loading: ${envFile}`);

    // Load and validate configuration
    const config = loadEnvFile(envFile);
    const { errors, warnings } = validateConfig(config, environment);

    // Display results
    console.log(`\n📊 Validation Results:`);
    console.log(`   • Variables loaded: ${Object.keys(config).length}`);
    console.log(`   • Errors: ${errors.length}`);
    console.log(`   • Warnings: ${warnings.length}`);

    if (warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      for (const warning of warnings) {
        console.log(`   ${warning}`);
      }
    }

    if (errors.length > 0) {
      console.log(`\n❌ Errors:`);
      for (const error of errors) {
        console.log(`   ${error}`);
      }
      console.log(`\n💡 Fix these errors before starting Parlant server`);
      process.exit(1);
    } else {
      console.log(`\n✨ Configuration validation passed!`);
      console.log(
        `🎉 Parlant server is ready to start with ${environment} configuration\n`,
      );
    }
  } catch (error) {
    console.error(`\n💥 Validation failed: ${error.message}\n`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateConfig, loadEnvFile };
