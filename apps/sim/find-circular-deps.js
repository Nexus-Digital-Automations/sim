#!/usr/bin/env node

/**
 * Simple circular dependency detector for TypeScript/JavaScript files
 */

const fs = require("fs");
const path = require("path");

function getAllTsFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (
      entry.isDirectory() &&
      entry.name !== "node_modules" &&
      entry.name !== ".next"
    ) {
      getAllTsFiles(fullPath, files);
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const imports = [];

    // Match import statements
    const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];

      // Resolve relative imports
      if (importPath.startsWith("./") || importPath.startsWith("../")) {
        const resolvedPath = path.resolve(path.dirname(filePath), importPath);

        // Try different extensions
        for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
          if (fs.existsSync(resolvedPath + ext)) {
            imports.push(resolvedPath + ext);
            break;
          }
        }

        // Check for index files
        if (fs.existsSync(path.join(resolvedPath, "index.ts"))) {
          imports.push(path.join(resolvedPath, "index.ts"));
        }
        if (fs.existsSync(path.join(resolvedPath, "index.tsx"))) {
          imports.push(path.join(resolvedPath, "index.tsx"));
        }
      }
    }

    return imports;
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}`);
    return [];
  }
}

function findCircularDependencies(files) {
  const dependencyGraph = new Map();

  // Build dependency graph
  console.log("Building dependency graph...");
  for (const file of files) {
    const imports = extractImports(file);
    dependencyGraph.set(file, imports);
  }

  console.log(`Analyzing ${files.length} files...`);

  function detectCycle(file, visited = new Set(), path = []) {
    if (path.includes(file)) {
      return [...path, file];
    }

    if (visited.has(file)) {
      return null;
    }

    visited.add(file);
    const imports = dependencyGraph.get(file) || [];

    for (const importFile of imports) {
      if (dependencyGraph.has(importFile)) {
        const cycle = detectCycle(importFile, visited, [...path, file]);
        if (cycle) {
          return cycle;
        }
      }
    }

    return null;
  }

  const visitedGlobal = new Set();
  const cycles = [];

  for (const file of files) {
    if (!visitedGlobal.has(file)) {
      const cycle = detectCycle(file, new Set(), []);
      if (cycle) {
        cycles.push(cycle);
        // Mark all files in cycle as visited
        for (const f of cycle) {
          visitedGlobal.add(f);
        }
      }
    }
  }

  return { cycles, dependencyGraph };
}

function main() {
  console.log("🔍 Scanning for circular dependencies...");

  const appDir = "./app";
  if (!fs.existsSync(appDir)) {
    console.error(
      "❌ App directory not found. Run this from the Next.js app root.",
    );
    process.exit(1);
  }

  const files = getAllTsFiles(appDir);
  console.log(`Found ${files.length} TypeScript files`);

  const { cycles, dependencyGraph } = findCircularDependencies(files);

  if (cycles.length === 0) {
    console.log("✅ No circular dependencies found in app directory");
  } else {
    console.log(`❌ Found ${cycles.length} circular dependencies:`);
    cycles.forEach((cycle, index) => {
      console.log(`\nCycle ${index + 1}:`);
      cycle.forEach((file, i) => {
        const relativePath = path.relative(process.cwd(), file);
        console.log(`  ${i + 1}. ${relativePath}`);
      });
    });
  }

  // Check for potential problematic patterns
  console.log("\n🔍 Checking for problematic import patterns...");

  let problematicFiles = 0;
  for (const file of files) {
    const imports = dependencyGraph.get(file) || [];
    if (imports.length > 20) {
      console.log(
        `⚠️ High import count (${imports.length}): ${path.relative(process.cwd(), file)}`,
      );
      problematicFiles++;
    }
  }

  if (problematicFiles === 0) {
    console.log("✅ No files with unusually high import counts");
  }
}

if (require.main === module) {
  main();
}
