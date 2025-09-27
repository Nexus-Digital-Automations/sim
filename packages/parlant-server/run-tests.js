#!/usr/bin/env node
/**
 * Parlant Server Test Runner
 *
 * This script sets up the test environment and runs the test suites
 * with proper configuration and environment setup.
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// Load test environment variables
const dotenv = require("dotenv");

// Load test environment
const testEnvPath = path.join(__dirname, ".env.test");
if (fs.existsSync(testEnvPath)) {
  console.log("📄 Loading test environment from .env.test");
  dotenv.config({ path: testEnvPath });
} else {
  console.warn(
    "⚠️  .env.test file not found, using default test configuration",
  );
}

// Set additional test-specific environment variables
process.env.NODE_ENV = "test";
process.env.TEST_MODE = "true";

console.log("🧪 Parlant Server Test Suite");
console.log("============================");
console.log(`Database URL: ${process.env.DATABASE_URL || "NOT SET"}`);
console.log(`Parlant Port: ${process.env.PARLANT_PORT || "NOT SET"}`);
console.log(
  `Auth Secret: ${process.env.BETTER_AUTH_SECRET ? "SET" : "NOT SET"}`,
);
console.log("============================\n");

// Function to run Jest with specific configuration
function runTests(testPattern = "", options = {}) {
  return new Promise((resolve, reject) => {
    const jestArgs = [
      "--verbose",
      "--colors",
      "--detectOpenHandles",
      "--forceExit",
      "--testTimeout=30000",
    ];

    if (testPattern) {
      jestArgs.push(testPattern);
    }

    if (options.coverage) {
      jestArgs.push("--coverage");
    }

    if (options.watch) {
      jestArgs.push("--watch");
    }

    console.log(`🚀 Running Jest with args: ${jestArgs.join(" ")}\n`);

    const jest = spawn("npx", ["jest", ...jestArgs], {
      stdio: "inherit",
      env: { ...process.env },
    });

    jest.on("close", (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Jest exited with code ${code}`));
      }
    });

    jest.on("error", (error) => {
      reject(error);
    });
  });
}

// Main execution
async function main() {
  try {
    const args = process.argv.slice(2);

    // Parse command line arguments
    const options = {
      coverage: args.includes("--coverage"),
      watch: args.includes("--watch"),
      health: args.includes("--health"),
    };

    // Determine test pattern based on options
    let testPattern = "";
    if (options.health) {
      testPattern = "tests/health/";
      console.log("🏥 Running health check tests only...");
    } else {
      console.log("🔧 Running all test suites...");
    }

    // Run the tests
    const exitCode = await runTests(testPattern, options);

    console.log("\n✅ All tests completed successfully");
    process.exit(exitCode);
  } catch (error) {
    console.error("\n❌ Test execution failed:", error.message);

    // Provide helpful debugging information
    console.log("\n🔍 Debug Information:");
    console.log("- Check that your test database is running");
    console.log("- Verify that .env.test contains all required variables");
    console.log('- Run "npm install" to ensure all dependencies are installed');
    console.log(
      "- Check if ports are available (default: 8801 for test server)",
    );

    process.exit(1);
  }
}

main();
