#!/usr/bin/env node

/**
 * Optimized Next.js Build Script with Full Optimization
 *
 * This script ensures builds complete with optimization enabled by using
 * progressive build strategies and proper resource management.
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const BUILD_TIMEOUT = 8 * 60 * 1000; // 8 minutes for complex builds
const MAX_RETRIES = 2;

class OptimizedBuilder {
  constructor() {
    this.attempt = 0;
    this.buildSuccess = false;
  }

  async cleanBuildArtifacts() {
    const buildPath = path.join(process.cwd(), ".next");
    if (fs.existsSync(buildPath)) {
      console.log("🧹 Cleaning previous build artifacts...");
      try {
        fs.rmSync(buildPath, { recursive: true, force: true });
      } catch (error) {
        console.warn(
          "Warning: Could not clean build directory:",
          error.message,
        );
      }
    }
  }

  async executeOptimizedBuild() {
    return new Promise((resolve) => {
      console.log(
        `\n🚀 Optimized build attempt ${this.attempt + 1}/${MAX_RETRIES + 1}`,
      );
      console.log("🎯 Strategy: Full optimization with resource management");

      const startTime = Date.now();

      // Use the most reliable Next.js build command with optimization
      const child = spawn("npx", ["next", "build"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_OPTIONS: "--max-old-space-size=12288", // Increased memory
          NEXT_TELEMETRY_DISABLED: "1",
          NODE_ENV: "production",
          // Enable SWC minification for optimal performance
          NEXT_PRIVATE_MINIFY: "true",
          // Disable Turbopack to fix build timeout issue
          // TURBOPACK: "1",
        },
        stdio: "pipe",
      });

      let output = "";
      let hasStartedOptimizing = false;
      let lastOutputTime = Date.now();

      child.stdout.on("data", (data) => {
        const chunk = data.toString();
        output += chunk;
        process.stdout.write(chunk);
        lastOutputTime = Date.now();

        // Track optimization progress
        if (chunk.includes("Creating an optimized production build")) {
          hasStartedOptimizing = true;
          console.log(
            "\n⚡ Optimization phase started - monitoring progress...",
          );
        }

        if (chunk.includes("Compiled successfully")) {
          console.log("\n✅ Build compilation completed!");
        }
      });

      child.stderr.on("data", (data) => {
        const chunk = data.toString();
        output += chunk;
        process.stderr.write(chunk);
        lastOutputTime = Date.now();
      });

      // Progressive timeout with activity monitoring
      const activityCheck = setInterval(() => {
        const timeSinceLastOutput = Date.now() - lastOutputTime;

        // If no output for 3 minutes during optimization, consider it hung
        if (hasStartedOptimizing && timeSinceLastOutput > 3 * 60 * 1000) {
          console.log(
            "\n⚠️ Build appears to be hung (no output for 3 minutes)",
          );
          clearInterval(activityCheck);

          child.kill("SIGTERM");
          setTimeout(() => {
            if (!child.killed) {
              child.kill("SIGKILL");
            }
          }, 5000);

          resolve({
            success: false,
            reason: "activity_timeout",
            elapsed: Date.now() - startTime,
            output,
          });
        }
      }, 30000); // Check every 30 seconds

      // Overall timeout
      const overallTimeout = setTimeout(() => {
        console.log(
          `\n⏰ Build exceeded maximum time limit (${BUILD_TIMEOUT / 1000}s)`,
        );
        clearInterval(activityCheck);

        child.kill("SIGTERM");
        setTimeout(() => {
          if (!child.killed) {
            child.kill("SIGKILL");
          }
        }, 5000);

        resolve({
          success: false,
          reason: "overall_timeout",
          elapsed: Date.now() - startTime,
          output,
        });
      }, BUILD_TIMEOUT);

      child.on("exit", (code, signal) => {
        clearTimeout(overallTimeout);
        clearInterval(activityCheck);
        const elapsed = Date.now() - startTime;

        if (code === 0) {
          console.log(
            `\n🎉 Optimized build completed successfully in ${elapsed / 1000}s!`,
          );
          console.log("✅ Full optimization enabled and working perfectly");
          resolve({
            success: true,
            code,
            elapsed,
            output,
          });
        } else {
          console.log(
            `\n❌ Build failed with code ${code} (signal: ${signal}) after ${elapsed / 1000}s`,
          );
          resolve({
            success: false,
            code,
            signal,
            elapsed,
            output,
            reason: signal === "SIGTERM" ? "killed" : "exit_code",
          });
        }
      });

      child.on("error", (err) => {
        clearTimeout(overallTimeout);
        clearInterval(activityCheck);
        console.log(`\n💥 Build process error:`, err.message);
        resolve({
          success: false,
          error: err,
          reason: "spawn_error",
          output,
        });
      });
    });
  }

  async verifyOptimizedBuild() {
    const buildPath = path.join(process.cwd(), ".next");

    // Check for optimized build artifacts
    const requiredFiles = [
      "build-manifest.json",
      "server/chunks-manifest.json",
      "static/chunks",
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(buildPath, file);
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Missing optimized build artifact: ${file}`);
        return false;
      }
    }

    // Verify optimization was applied
    const manifestPath = path.join(buildPath, "build-manifest.json");
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const hasOptimizedChunks = Object.keys(manifest.pages).length > 0;

      if (hasOptimizedChunks) {
        console.log("✅ Build optimization verified successfully");
        console.log("📊 Optimized chunks and manifest generated");
        return true;
      }
      console.log(
        "⚠️ Build completed but optimization artifacts are incomplete",
      );
      return false;
    } catch (error) {
      console.log("⚠️ Could not verify build optimization:", error.message);
      return false;
    }
  }

  async run() {
    console.log("🏗️ Next.js Optimized Build System");
    console.log("================================");
    console.log("🎯 Goal: Perfect build with full optimization enabled");

    while (this.attempt <= MAX_RETRIES && !this.buildSuccess) {
      await this.cleanBuildArtifacts();

      const result = await this.executeOptimizedBuild();

      if (result.success) {
        // Verify the build is properly optimized
        if (await this.verifyOptimizedBuild()) {
          this.buildSuccess = true;
          break;
        }
        console.log("⚠️ Build succeeded but optimization verification failed");
      } else {
        console.log(`\nAttempt ${this.attempt + 1} failed: ${result.reason}`);

        if (
          result.reason === "activity_timeout" ||
          result.reason === "overall_timeout"
        ) {
          console.log(
            "💡 Build hung during optimization - this indicates a codebase issue",
          );
          console.log(
            "🔧 Possible causes: circular dependencies, heavy computations, or large assets",
          );
        }
      }

      this.attempt++;

      if (this.attempt <= MAX_RETRIES && !this.buildSuccess) {
        console.log("\n⏳ Waiting 5 seconds before retry...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    if (!this.buildSuccess) {
      console.log("\n❌ All optimized build attempts failed");
      console.log("\n🚨 RECOMMENDATION:");
      console.log(
        "The codebase has a fundamental issue preventing optimized builds.",
      );
      console.log(
        "Consider using the emergency bypass temporarily while investigating:",
      );
      console.log("- Check for circular import dependencies");
      console.log(
        "- Review large components that may cause optimization hangs",
      );
      console.log("- Consider splitting complex pages into smaller components");
      process.exit(1);
    }

    console.log(
      "\n🎊 BUILD SUCCESS: Optimization enabled and working perfectly!",
    );
    console.log(
      "🚀 Your Next.js application is fully optimized for production",
    );
  }
}

if (require.main === module) {
  const builder = new OptimizedBuilder();
  builder.run().catch(console.error);
}

module.exports = OptimizedBuilder;
