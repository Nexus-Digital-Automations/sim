#!/usr/bin/env node

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * Optimized build script for modular architecture
 * Handles large file splitting and production optimization
 */

const BUILD_CONFIG = {
  // Build timeout (increased for large projects)
  timeout: 15 * 60 * 1000, // 15 minutes

  // Memory settings
  maxMemory: "8192", // 8GB

  // Build environment
  env: {
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    // Enable webpack cache
    WEBPACK_CACHE: "1",
    // Enable modular optimization
    MODULAR_ARCHITECTURE: "1",
  },

  // Files to check for size optimization
  largeFileThresholds: {
    warning: 500 * 1024, // 500KB
    error: 2 * 1024 * 1024, // 2MB
  },
};

/**
 * Check if modular architecture files exist
 */
function checkModularArchitecture() {
  const requiredFiles = [
    "components/icons/index.tsx",
    "components/icons/ui-icons.tsx",
    "components/icons/action-icons.tsx",
    "components/icons/navigation-icons.tsx",
    "app/workspace/[workspaceId]/w/[workflowId]/components/panel/components/copilot/components/user-input/components/file-attachment-manager.tsx",
    "app/workspace/[workspaceId]/w/[workflowId]/components/panel/components/copilot/components/user-input/components/mention-system.tsx",
    "app/workspace/[workspaceId]/w/[workflowId]/components/panel/components/copilot/components/user-input/user-input-refactored.tsx",
    "executor/core/execution-engine.ts",
    "executor/core/handler-registry.ts",
    "executor/core/context-manager.ts",
    "executor/executor-refactored.ts",
    "stores/copilot/chat-store.ts",
    "stores/copilot/tool-store.ts",
    "stores/copilot/copilot-store-refactored.ts",
  ];

  console.log("🔍 Checking modular architecture files...");

  const missingFiles = requiredFiles.filter((file) => {
    const exists = fs.existsSync(path.join(process.cwd(), file));
    if (!exists) {
      console.log(`❌ Missing: ${file}`);
    }
    return !exists;
  });

  if (missingFiles.length > 0) {
    console.log(
      `⚠️  Warning: ${missingFiles.length} modular architecture files are missing.`,
    );
    console.log("Build will continue with existing architecture.");
    return false;
  }

  console.log("✅ All modular architecture files found.");
  return true;
}

/**
 * Analyze bundle sizes after build
 */
function analyzeBundleSizes() {
  console.log("📊 Analyzing bundle sizes...");

  const buildDir = path.join(process.cwd(), ".next");
  const staticDir = path.join(buildDir, "static", "chunks");

  if (!fs.existsSync(staticDir)) {
    console.log("⚠️  Build directory not found, skipping analysis.");
    return;
  }

  const chunks = fs
    .readdirSync(staticDir)
    .filter((file) => file.endsWith(".js"))
    .map((file) => {
      const filePath = path.join(staticDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        sizeKB: Math.round(stats.size / 1024),
        sizeMB: Math.round((stats.size / 1024 / 1024) * 100) / 100,
      };
    })
    .sort((a, b) => b.size - a.size);

  console.log("\n📦 Chunk Analysis:");
  chunks.slice(0, 10).forEach((chunk) => {
    const sizeStr =
      chunk.sizeMB > 1 ? `${chunk.sizeMB}MB` : `${chunk.sizeKB}KB`;

    let indicator = "✅";
    if (chunk.size > BUILD_CONFIG.largeFileThresholds.error) {
      indicator = "🔴";
    } else if (chunk.size > BUILD_CONFIG.largeFileThresholds.warning) {
      indicator = "🟡";
    }

    console.log(`  ${indicator} ${chunk.name}: ${sizeStr}`);
  });

  // Check for optimization success
  const largeChunks = chunks.filter(
    (chunk) => chunk.size > BUILD_CONFIG.largeFileThresholds.error,
  );

  if (largeChunks.length === 0) {
    console.log("\n🎉 Bundle optimization successful! No chunks exceed 2MB.");
  } else {
    console.log(
      `\n⚠️  ${largeChunks.length} chunks still exceed 2MB. Consider further optimization.`,
    );
  }

  return {
    totalChunks: chunks.length,
    largeChunks: largeChunks.length,
    totalSize: chunks.reduce((sum, chunk) => sum + chunk.size, 0),
  };
}

/**
 * Run the optimized build process
 */
async function runOptimizedBuild() {
  console.log("🚀 Starting optimized build for modular architecture...");
  console.log("⏱️  Build timeout: 15 minutes");
  console.log(`💾 Max memory: ${BUILD_CONFIG.maxMemory}MB\n`);

  // Check modular architecture
  const hasModularArch = checkModularArchitecture();

  // Use optimized config if modular architecture exists
  const configFile = hasModularArch
    ? "next.config.optimized.ts"
    : "next.config.ts";
  console.log(`📋 Using config: ${configFile}\n`);

  const buildArgs = [
    "build",
    "--no-lint", // Linting is handled separately
  ];

  const buildEnv = {
    ...process.env,
    ...BUILD_CONFIG.env,
    NODE_OPTIONS: `--max-old-space-size=${BUILD_CONFIG.maxMemory}`,
  };

  // If using optimized config, copy it to next.config.ts temporarily
  const originalConfig = path.join(process.cwd(), "next.config.ts");
  const optimizedConfig = path.join(process.cwd(), "next.config.optimized.ts");
  const backupConfig = path.join(process.cwd(), "next.config.ts.backup");

  const useOptimizedConfig = hasModularArch && fs.existsSync(optimizedConfig);

  if (useOptimizedConfig) {
    console.log("🔄 Switching to optimized configuration...");
    // Backup original config
    if (fs.existsSync(originalConfig)) {
      fs.copyFileSync(originalConfig, backupConfig);
    }
    // Use optimized config
    fs.copyFileSync(optimizedConfig, originalConfig);
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    console.log("🏗️  Running Next.js build...\n");
    const build = spawn("npx", ["next", ...buildArgs], {
      stdio: "inherit",
      env: buildEnv,
      timeout: BUILD_CONFIG.timeout,
    });

    build.on("close", (code) => {
      const duration = Math.round((Date.now() - startTime) / 1000);

      // Restore original config
      if (useOptimizedConfig && fs.existsSync(backupConfig)) {
        console.log("\n🔄 Restoring original configuration...");
        fs.copyFileSync(backupConfig, originalConfig);
        fs.unlinkSync(backupConfig);
      }

      if (code === 0) {
        console.log(`\n✅ Build completed successfully in ${duration}s!`);

        // Analyze bundle sizes
        const analysis = analyzeBundleSizes();

        if (analysis) {
          console.log(`\n📊 Build Summary:`);
          console.log(`  Total chunks: ${analysis.totalChunks}`);
          console.log(`  Large chunks (>2MB): ${analysis.largeChunks}`);
          console.log(
            `  Total bundle size: ${Math.round((analysis.totalSize / 1024 / 1024) * 100) / 100}MB`,
          );
        }

        resolve(code);
      } else {
        console.error(
          `\n❌ Build failed with exit code ${code} after ${duration}s`,
        );
        reject(new Error(`Build process exited with code ${code}`));
      }
    });

    build.on("error", (error) => {
      // Restore original config on error
      if (useOptimizedConfig && fs.existsSync(backupConfig)) {
        fs.copyFileSync(backupConfig, originalConfig);
        fs.unlinkSync(backupConfig);
      }

      console.error("❌ Build process error:", error.message);
      reject(error);
    });

    // Handle timeout
    setTimeout(() => {
      console.error(
        `\n⏰ Build timed out after ${BUILD_CONFIG.timeout / 1000}s`,
      );
      build.kill("SIGTERM");

      // Restore original config on timeout
      if (useOptimizedConfig && fs.existsSync(backupConfig)) {
        fs.copyFileSync(backupConfig, originalConfig);
        fs.unlinkSync(backupConfig);
      }

      reject(new Error("Build timeout"));
    }, BUILD_CONFIG.timeout);
  });
}

// Run if called directly
if (require.main === module) {
  runOptimizedBuild()
    .then(() => {
      console.log("\n🎉 Optimized build completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Build failed:", error.message);
      process.exit(1);
    });
}

module.exports = {
  runOptimizedBuild,
  analyzeBundleSizes,
  checkModularArchitecture,
};
