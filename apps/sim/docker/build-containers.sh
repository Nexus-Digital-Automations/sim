#!/bin/bash

# Docker Container Build Script for Sim Code Execution Sandboxes
# Builds secure, minimal containers for JavaScript and Python code execution

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Building Sim code execution containers..."
echo "Script directory: $SCRIPT_DIR"
echo "Project root: $PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running"
    exit 1
fi

print_success "Docker is available and running"

# Build JavaScript sandbox container
print_status "Building JavaScript sandbox container..."
cd "$SCRIPT_DIR/javascript"

if docker build -t sim-javascript-sandbox:latest -t sim-javascript-sandbox:1.0 .; then
    print_success "JavaScript sandbox container built successfully"
else
    print_error "Failed to build JavaScript sandbox container"
    exit 1
fi

# Build Python sandbox container
print_status "Building Python sandbox container..."
cd "$SCRIPT_DIR/python"

if docker build -t sim-python-sandbox:latest -t sim-python-sandbox:1.0 .; then
    print_success "Python sandbox container built successfully"
else
    print_error "Failed to build Python sandbox container"
    exit 1
fi

# Test container functionality
print_status "Testing container functionality..."

# Test JavaScript container
print_status "Testing JavaScript container..."
JS_TEST_RESULT=$(docker run --rm --user 1000:1000 --memory=50m --cpus=0.5 --network=none \
    sim-javascript-sandbox:latest node -e "console.log('JavaScript sandbox working'); process.exit(0)" 2>&1)

if [[ $? -eq 0 ]]; then
    print_success "JavaScript container test passed"
else
    print_error "JavaScript container test failed: $JS_TEST_RESULT"
fi

# Test Python container
print_status "Testing Python container..."
PY_TEST_RESULT=$(docker run --rm --user sandbox --memory=50m --cpus=0.5 --network=none \
    sim-python-sandbox:latest python -c "print('Python sandbox working'); import sys; sys.exit(0)" 2>&1)

if [[ $? -eq 0 ]]; then
    print_success "Python container test passed"
else
    print_error "Python container test failed: $PY_TEST_RESULT"
fi

# Display container information
print_status "Container build summary:"
echo ""
echo "JavaScript Container:"
docker images sim-javascript-sandbox --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
echo ""
echo "Python Container:"
docker images sim-python-sandbox --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
echo ""

# Security recommendations
print_status "Security recommendations:"
print_warning "1. Regularly update base images to patch security vulnerabilities"
print_warning "2. Scan containers for vulnerabilities using 'docker scan' or similar tools"
print_warning "3. Monitor container resource usage in production"
print_warning "4. Implement proper logging and monitoring for container activities"
print_warning "5. Review and update package whitelists regularly"

# Performance recommendations
print_status "Performance recommendations:"
print_warning "1. Consider using multi-stage builds to reduce image size"
print_warning "2. Pre-warm containers in production for faster execution"
print_warning "3. Implement container pool management for better resource utilization"
print_warning "4. Monitor and tune memory and CPU limits based on actual usage patterns"

# Optional: Clean up dangling images
read -p "Do you want to clean up dangling Docker images? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Cleaning up dangling images..."
    docker image prune -f
    print_success "Cleanup completed"
fi

print_success "Container build process completed successfully!"
print_status "Containers are ready for use in Sim code execution workflows"

# Usage examples
echo ""
print_status "Usage examples:"
echo ""
echo "JavaScript execution:"
echo "docker run --rm --user 1000:1000 --memory=256m --cpus=0.5 --network=none \\"
echo "  sim-javascript-sandbox:latest node -e \"console.log('Hello from sandbox')\""
echo ""
echo "Python execution:"
echo "docker run --rm --user sandbox --memory=512m --cpus=0.5 --network=none \\"
echo "  sim-python-sandbox:latest python -c \"import pandas; print('Pandas available')\""
echo ""

exit 0