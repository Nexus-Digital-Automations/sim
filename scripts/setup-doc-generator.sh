#!/bin/bash

##############################################################################
# Sim Documentation Generator Setup Script
#
# This script sets up the local development environment for the Sim block
# documentation generator. It creates necessary configuration files and
# installs required dependencies in the scripts directory.
#
# Features:
# - Creates isolated dependency installation in scripts directory
# - Configures TypeScript for ESM module resolution
# - Sets up ts-node configuration for script execution
# - Installs all required packages using Bun package manager
#
# Usage:
#   ./scripts/setup-doc-generator.sh
#
# Dependencies:
#   - Bun package manager (for fast dependency installation)
#   - Node.js (for script execution environment)
#
# Output:
#   - package.json: Project configuration for scripts directory
#   - tsconfig.json: TypeScript configuration optimized for documentation generation
#   - node_modules/: Locally installed dependencies
#
# Author: Sim Platform Team
# Version: 1.0.0
##############################################################################

# Get the scripts directory path and navigate to it
SCRIPTS_DIR=$(dirname "$0")
cd "$SCRIPTS_DIR"
echo "🔧 Working in scripts directory: $(pwd)"

echo "🚀 Setting up Sim documentation generator environment..."

# Create package.json for scripts directory
# This configuration enables ESM modules and marks the package as private
echo "📦 Creating package.json configuration..."
cat > package.json << EOF
{
  "name": "sim-doc-generator",
  "version": "1.0.0",
  "description": "Documentation generator for Sim blocks",
  "type": "module",
  "private": true
}
EOF

# Install development dependencies locally in scripts directory
# This ensures isolation from the main project dependencies
echo "📥 Installing development dependencies with Bun..."
bun install --save-dev typescript @types/node @types/react ts-node tsx glob

# Create TypeScript configuration optimized for documentation generation
# This configuration supports modern Node.js features and ESM modules
echo "⚙️  Creating TypeScript configuration..."
cat > tsconfig.json << EOF
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "allowImportingTsExtensions": true
  },
  "ts-node": {
    "esm": true,
    "experimentalSpecifierResolution": "node"
  },
  "include": ["./**/*.ts"]
}
EOF

echo "✅ Setup completed successfully!"
echo "🎯 Next steps:"
echo "   1. Run './scripts/generate-docs.sh' to generate documentation"
echo "   2. Check the generated files in apps/docs/content/docs/tools/"
echo "   3. Review the meta.json file for navigation structure" 