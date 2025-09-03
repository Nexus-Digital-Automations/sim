#!/bin/bash

##############################################################################
# Sim Documentation Generator Execution Script
#
# This script executes the Sim block documentation generator with proper
# error handling, dependency checking, and debug support. It orchestrates
# the complete documentation generation process for all Sim blocks.
#
# Features:
# - Automatic dependency installation if missing
# - Comprehensive error handling and validation
# - Debug mode support for troubleshooting
# - Cross-platform compatibility
# - CI/CD integration ready
#
# Usage:
#   ./scripts/generate-docs.sh          # Normal execution
#   DEBUG=1 ./scripts/generate-docs.sh  # Debug mode with verbose output
#
# Prerequisites:
#   - Node.js and npm/npx installed
#   - Bun package manager (for dependency installation)
#   - Access to Sim project source files
#
# Output:
#   - Generated MDX files in apps/docs/content/docs/tools/
#   - Updated meta.json for documentation navigation
#   - Console logs showing generation progress
#
# Exit Codes:
#   0 - Success
#   1 - Error (missing files, compilation failures, etc.)
#
# Author: Sim Platform Team
# Version: 1.0.0
##############################################################################

# Enable strict error handling for robust script execution
set -e

# Enable debug mode if DEBUG environment variable is set
# Usage: DEBUG=1 ./scripts/generate-docs.sh
if [ ! -z "$DEBUG" ]; then
  set -x
  echo "🔍 Debug mode enabled - verbose output activated"
fi

# Determine script and project directory paths
SCRIPTS_DIR=$(dirname "$0")
ROOT_DIR=$(cd "$SCRIPTS_DIR/.." && pwd)
echo "📂 Scripts directory: $SCRIPTS_DIR"
echo "📁 Root directory: $ROOT_DIR"

# Dependency validation and automatic installation
if [ ! -d "$SCRIPTS_DIR/node_modules" ]; then
  echo "⚠️  Required dependencies not found in scripts directory"
  echo "🔧 Running automatic setup process..."
  bash "$SCRIPTS_DIR/setup-doc-generator.sh"
fi

# Start documentation generation process
echo "🚀 Starting Sim block documentation generation..."

# Validate required files exist before proceeding
echo "🔍 Validating required files..."

if [ ! -f "$SCRIPTS_DIR/generate-block-docs.ts" ]; then
  echo "❌ Error: Could not find generate-block-docs.ts script"
  echo "📋 Contents of scripts directory:"
  ls -la "$SCRIPTS_DIR"
  exit 1
fi

if [ ! -f "$SCRIPTS_DIR/tsconfig.json" ]; then
  echo "❌ Error: Could not find tsconfig.json in scripts directory"
  echo "💡 Try running setup-doc-generator.sh first"
  exit 1
fi

# Validate Node.js toolchain availability
if ! command -v npx &> /dev/null; then
  echo "❌ Error: npx is not installed. Please install Node.js first."
  echo "🔗 Visit: https://nodejs.org/ for installation instructions"
  exit 1
fi

# Execute documentation generation in scripts directory context
# This ensures local dependencies are properly resolved
cd "$SCRIPTS_DIR"
echo "⚡ Executing: npx tsx ./generate-block-docs.ts"
echo "📍 Working directory: $(pwd)"

# Run the TypeScript documentation generator using tsx
# tsx provides better TypeScript support than ts-node for modern projects
if ! npx tsx ./generate-block-docs.ts; then
  echo ""
  echo "❌ Documentation generation failed"
  echo "🔧 Troubleshooting steps:"
  echo "   1. Check that all source files exist and are readable"
  echo "   2. Verify TypeScript compilation succeeds"
  echo "   3. Run with debug mode for detailed logs:"
  echo "      DEBUG=1 ./scripts/generate-docs.sh"
  echo ""
  exit 1
fi

echo "🎉 Documentation generation completed successfully!"
echo "📖 Generated files are available in apps/docs/content/docs/tools/"
