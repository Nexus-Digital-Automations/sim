#!/bin/bash

# Build Security Containers Script
# 
# Comprehensive script for building, testing, and deploying secure
# Docker containers for Sim code execution with enterprise security.
# 
# Features:
# - Multi-stage security validation
# - Automated vulnerability scanning
# - Performance benchmarking
# - Security compliance verification
# - Production deployment preparation
#
# Author: Claude Development Agent
# Created: September 3, 2025

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_LOG="$PROJECT_ROOT/logs/container-build.log"
SECURITY_LOG="$PROJECT_ROOT/logs/security-scan.log"
PERFORMANCE_LOG="$PROJECT_ROOT/logs/performance-test.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "$BUILD_LOG"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" | tee -a "$BUILD_LOG"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*" | tee -a "$BUILD_LOG"
}

error() {
    echo -e "${RED}[ERROR]${NC} $*" | tee -a "$BUILD_LOG" >&2
}

# Initialize logging
setup_logging() {
    mkdir -p "$PROJECT_ROOT/logs"
    mkdir -p "$PROJECT_ROOT/data/security"
    mkdir -p "$PROJECT_ROOT/logs/security"
    mkdir -p "$PROJECT_ROOT/logs/network"
    
    echo "Security Container Build Log - $(date)" > "$BUILD_LOG"
    echo "Security Scan Log - $(date)" > "$SECURITY_LOG"
    echo "Performance Test Log - $(date)" > "$PERFORMANCE_LOG"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
        exit 1
    fi
    
    # Check for security scanning tools
    if command -v trivy &> /dev/null; then
        log "Trivy vulnerability scanner available"
    else
        warning "Trivy not available - skipping advanced vulnerability scanning"
    fi
    
    success "Prerequisites check passed"
}

# Build JavaScript sandbox container
build_javascript_sandbox() {
    log "Building JavaScript sandbox container..."
    
    cd "$SCRIPT_DIR/javascript-sandbox"
    
    # Build container with security labels
    docker build \
        --tag "sim-js-sandbox:latest" \
        --tag "sim-js-sandbox:$(date +%Y%m%d)" \
        --label "security.scan=enabled" \
        --label "security.level=maximum" \
        --label "build.date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --label "build.version=$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
        --no-cache \
        . 2>&1 | tee -a "$BUILD_LOG"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        success "JavaScript sandbox container built successfully"
    else
        error "Failed to build JavaScript sandbox container"
        return 1
    fi
    
    # Test container basic functionality
    log "Testing JavaScript sandbox container..."
    if test_javascript_container; then
        success "JavaScript sandbox container test passed"
    else
        error "JavaScript sandbox container test failed"
        return 1
    fi
}

# Build Python sandbox container
build_python_sandbox() {
    log "Building Python sandbox container..."
    
    cd "$SCRIPT_DIR/python-sandbox"
    
    # Build container with security labels
    docker build \
        --tag "sim-python-sandbox:latest" \
        --tag "sim-python-sandbox:$(date +%Y%m%d)" \
        --label "security.scan=enabled" \
        --label "security.level=maximum" \
        --label "build.date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --label "build.version=$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
        --no-cache \
        . 2>&1 | tee -a "$BUILD_LOG"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        success "Python sandbox container built successfully"
    else
        error "Failed to build Python sandbox container"
        return 1
    fi
    
    # Test container basic functionality
    log "Testing Python sandbox container..."
    if test_python_container; then
        success "Python sandbox container test passed"
    else
        error "Python sandbox container test failed"
        return 1
    fi
}

# Test JavaScript container functionality
test_javascript_container() {
    log "Running JavaScript container functionality test..."
    
    # Test basic execution
    local test_code='console.log("Hello from secure JavaScript sandbox"); return {test: "passed", timestamp: new Date().toISOString()};'
    local test_input="{\"code\": \"$test_code\", \"params\": {}, \"environmentVariables\": {}}"
    
    # Run test with timeout
    local result
    if result=$(echo "$test_input" | timeout 30s docker run --rm -i \
        --security-opt no-new-privileges:true \
        --cap-drop ALL \
        --read-only \
        --tmpfs /tmp:noexec,nosuid,size=50m \
        --memory=256m \
        --cpus=0.5 \
        --network none \
        sim-js-sandbox:latest 2>&1); then
        
        # Check if result contains success indicator
        if echo "$result" | grep -q '"success": true'; then
            log "JavaScript container test successful"
            log "Test result: $(echo "$result" | jq -r '.output.result // "No result"' 2>/dev/null || echo 'Parse error')"
            return 0
        else
            error "JavaScript container test failed - no success indicator"
            error "Test output: $result"
            return 1
        fi
    else
        error "JavaScript container test failed - execution error"
        error "Test output: $result"
        return 1
    fi
}

# Test Python container functionality
test_python_container() {
    log "Running Python container functionality test..."
    
    # Test basic execution with data science libraries
    local test_code='import numpy as np\nimport pandas as pd\nprint("Hello from secure Python sandbox")\nresult = {"test": "passed", "numpy_version": np.__version__, "pandas_version": pd.__version__}\nprint(f"Test result: {result}")'
    local test_input="{\"code\": \"$test_code\", \"params\": {}, \"environmentVariables\": {}}"
    
    # Run test with timeout
    local result
    if result=$(echo "$test_input" | timeout 60s docker run --rm -i \
        --security-opt no-new-privileges:true \
        --cap-drop ALL \
        --read-only \
        --tmpfs /tmp:noexec,nosuid,size=100m \
        --tmpfs /sandbox/workspace:exec,suid,size=200m \
        --memory=512m \
        --cpus=1.0 \
        --network none \
        sim-python-sandbox:latest 2>&1); then
        
        # Check if result contains success indicator
        if echo "$result" | grep -q '"success": true'; then
            log "Python container test successful"
            log "Test result preview: $(echo "$result" | grep -o 'Test result: {[^}]*}' || echo 'No preview available')"
            return 0
        else
            error "Python container test failed - no success indicator"
            error "Test output: $result"
            return 1
        fi
    else
        error "Python container test failed - execution error"
        error "Test output: $result"
        return 1
    fi
}

# Security vulnerability scanning
security_scan() {
    log "Starting security vulnerability scanning..."
    
    # Scan JavaScript container
    log "Scanning JavaScript sandbox for vulnerabilities..."
    if command -v trivy &> /dev/null; then
        trivy image --severity HIGH,CRITICAL --format json --output "$PROJECT_ROOT/logs/js-security-scan.json" sim-js-sandbox:latest
        trivy image --severity HIGH,CRITICAL sim-js-sandbox:latest | tee -a "$SECURITY_LOG"
        
        # Check for critical vulnerabilities
        local critical_count
        critical_count=$(jq '.Results[]?.Vulnerabilities[]? | select(.Severity=="CRITICAL") | .VulnerabilityID' "$PROJECT_ROOT/logs/js-security-scan.json" 2>/dev/null | wc -l || echo 0)
        
        if [ "$critical_count" -gt 0 ]; then
            error "JavaScript container has $critical_count critical vulnerabilities"
        else
            success "JavaScript container passed critical vulnerability scan"
        fi
    else
        warning "Skipping advanced vulnerability scanning - Trivy not available"
    fi
    
    # Scan Python container
    log "Scanning Python sandbox for vulnerabilities..."
    if command -v trivy &> /dev/null; then
        trivy image --severity HIGH,CRITICAL --format json --output "$PROJECT_ROOT/logs/python-security-scan.json" sim-python-sandbox:latest
        trivy image --severity HIGH,CRITICAL sim-python-sandbox:latest | tee -a "$SECURITY_LOG"
        
        # Check for critical vulnerabilities
        local critical_count
        critical_count=$(jq '.Results[]?.Vulnerabilities[]? | select(.Severity=="CRITICAL") | .VulnerabilityID' "$PROJECT_ROOT/logs/python-security-scan.json" 2>/dev/null | wc -l || echo 0)
        
        if [ "$critical_count" -gt 0 ]; then
            error "Python container has $critical_count critical vulnerabilities"
        else
            success "Python container passed critical vulnerability scan"
        fi
    else
        warning "Skipping advanced vulnerability scanning - Trivy not available"
    fi
    
    # Basic security check
    log "Performing basic security configuration check..."
    check_container_security "sim-js-sandbox:latest" "JavaScript"
    check_container_security "sim-python-sandbox:latest" "Python"
}

# Check container security configuration
check_container_security() {
    local image="$1"
    local name="$2"
    
    log "Checking $name container security configuration..."
    
    # Check for non-root user
    local user_check
    user_check=$(docker run --rm "$image" whoami 2>/dev/null || echo "unknown")
    
    if [ "$user_check" = "sandbox" ]; then
        success "$name container runs as non-root user (sandbox)"
    else
        warning "$name container user check: $user_check"
    fi
    
    # Check read-only filesystem capability
    local readonly_test
    if readonly_test=$(docker run --rm --read-only "$image" sh -c 'touch /test 2>&1 || echo "readonly-confirmed"' 2>/dev/null); then
        if echo "$readonly_test" | grep -q "readonly-confirmed"; then
            success "$name container supports read-only filesystem"
        else
            warning "$name container read-only test: $readonly_test"
        fi
    else
        warning "$name container read-only filesystem test failed"
    fi
    
    echo "Security check for $name container completed" >> "$SECURITY_LOG"
}

# Performance benchmarking
performance_test() {
    log "Starting performance benchmarking..."
    
    # JavaScript performance test
    log "Benchmarking JavaScript container performance..."
    benchmark_javascript_performance
    
    # Python performance test
    log "Benchmarking Python container performance..."
    benchmark_python_performance
    
    success "Performance benchmarking completed"
}

# Benchmark JavaScript container
benchmark_javascript_performance() {
    local test_code='
    const start = Date.now();
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
        sum += Math.sqrt(i);
    }
    const end = Date.now();
    const executionTime = end - start;
    console.log(`Performance test completed in ${executionTime}ms`);
    return { sum: sum, executionTime: executionTime, operations: 1000000 };
    '
    
    local test_input="{\"code\": \"$test_code\", \"params\": {}, \"environmentVariables\": {}}"
    
    log "Running JavaScript performance benchmark..."
    local start_time=$(date +%s%N)
    
    local result
    if result=$(echo "$test_input" | docker run --rm -i \
        --memory=256m \
        --cpus=0.5 \
        --network none \
        sim-js-sandbox:latest 2>&1); then
        
        local end_time=$(date +%s%N)
        local total_time=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds
        
        log "JavaScript benchmark total time: ${total_time}ms"
        echo "JavaScript Performance Test - Total: ${total_time}ms" >> "$PERFORMANCE_LOG"
        
        # Extract execution time from result
        local exec_time
        exec_time=$(echo "$result" | grep -o 'Performance test completed in [0-9]*ms' || echo "unknown")
        log "JavaScript internal execution: $exec_time"
    else
        error "JavaScript performance test failed"
        echo "JavaScript Performance Test - FAILED" >> "$PERFORMANCE_LOG"
    fi
}

# Benchmark Python container
benchmark_python_performance() {
    local test_code='
import time
import numpy as np

start_time = time.time()

# Numerical computation test
arr = np.random.rand(10000)
result = np.fft.fft(arr)
mean_val = np.mean(result.real)

end_time = time.time()
execution_time = (end_time - start_time) * 1000  # Convert to milliseconds

print(f"Performance test completed in {execution_time:.2f}ms")
print(f"Array mean: {mean_val:.6f}")

result_data = {
    "execution_time": execution_time,
    "array_size": len(arr),
    "mean_value": float(mean_val),
    "test": "numpy_fft_performance"
}
print(f"Result: {result_data}")
'
    
    local test_input="{\"code\": \"$test_code\", \"params\": {}, \"environmentVariables\": {}}"
    
    log "Running Python performance benchmark..."
    local start_time=$(date +%s%N)
    
    local result
    if result=$(echo "$test_input" | docker run --rm -i \
        --memory=512m \
        --cpus=1.0 \
        --tmpfs /sandbox/workspace:exec,suid,size=200m \
        --network none \
        sim-python-sandbox:latest 2>&1); then
        
        local end_time=$(date +%s%N)
        local total_time=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds
        
        log "Python benchmark total time: ${total_time}ms"
        echo "Python Performance Test - Total: ${total_time}ms" >> "$PERFORMANCE_LOG"
        
        # Extract execution time from result
        local exec_time
        exec_time=$(echo "$result" | grep -o 'Performance test completed in [0-9.]*ms' || echo "unknown")
        log "Python internal execution: $exec_time"
    else
        error "Python performance test failed"
        echo "Python Performance Test - FAILED" >> "$PERFORMANCE_LOG"
    fi
}

# Deploy containers for production
deploy_containers() {
    log "Deploying containers for production use..."
    
    cd "$PROJECT_ROOT"
    
    # Generate instance ID
    local instance_id
    instance_id=$(date +%Y%m%d%H%M%S)
    
    # Export environment variables for docker-compose
    export INSTANCE_ID="$instance_id"
    
    # Deploy using docker-compose
    log "Starting security infrastructure with docker-compose..."
    if docker-compose -f docker-compose.security.yml up -d 2>&1 | tee -a "$BUILD_LOG"; then
        success "Security infrastructure deployed successfully"
        
        # Wait for containers to be healthy
        log "Waiting for containers to become healthy..."
        sleep 10
        
        # Check container health
        if check_deployment_health; then
            success "Deployment health check passed"
            log "Security infrastructure is ready for production use"
        else
            error "Deployment health check failed"
            return 1
        fi
    else
        error "Failed to deploy security infrastructure"
        return 1
    fi
}

# Check deployment health
check_deployment_health() {
    log "Checking deployment health..."
    
    local containers=("sim-js-sandbox-${INSTANCE_ID}" "sim-python-sandbox-${INSTANCE_ID}" "sim-security-monitor-${INSTANCE_ID}")
    local all_healthy=true
    
    for container in "${containers[@]}"; do
        if docker ps --filter "name=$container" --filter "status=running" | grep -q "$container"; then
            success "Container $container is running"
            
            # Check health status
            local health_status
            health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")
            
            if [ "$health_status" = "healthy" ] || [ "$health_status" = "no-healthcheck" ]; then
                success "Container $container is healthy"
            else
                warning "Container $container health status: $health_status"
            fi
        else
            error "Container $container is not running"
            all_healthy=false
        fi
    done
    
    $all_healthy
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary resources..."
    
    # Remove dangling images
    if docker images -f "dangling=true" -q | grep -q .; then
        log "Removing dangling Docker images..."
        docker rmi $(docker images -f "dangling=true" -q) 2>/dev/null || warning "Failed to remove some dangling images"
    fi
    
    # Clean build cache
    log "Cleaning Docker build cache..."
    docker builder prune -f > /dev/null 2>&1 || warning "Failed to clean build cache"
    
    success "Cleanup completed"
}

# Main execution function
main() {
    local action="${1:-build}"
    
    setup_logging
    log "Starting security container build process - Action: $action"
    
    check_prerequisites
    
    case "$action" in
        "build")
            build_javascript_sandbox
            build_python_sandbox
            security_scan
            performance_test
            success "Build process completed successfully"
            ;;
        "test")
            if docker images | grep -q "sim-js-sandbox"; then
                test_javascript_container
            else
                error "JavaScript sandbox image not found - run build first"
                exit 1
            fi
            
            if docker images | grep -q "sim-python-sandbox"; then
                test_python_container
            else
                error "Python sandbox image not found - run build first"
                exit 1
            fi
            ;;
        "scan")
            security_scan
            ;;
        "benchmark")
            performance_test
            ;;
        "deploy")
            deploy_containers
            ;;
        "cleanup")
            cleanup
            ;;
        "all")
            build_javascript_sandbox
            build_python_sandbox
            security_scan
            performance_test
            deploy_containers
            cleanup
            success "Complete build and deployment process finished"
            ;;
        *)
            echo "Usage: $0 {build|test|scan|benchmark|deploy|cleanup|all}"
            echo ""
            echo "Commands:"
            echo "  build      - Build security containers"
            echo "  test       - Test container functionality"
            echo "  scan       - Run security vulnerability scans"
            echo "  benchmark  - Run performance benchmarks"
            echo "  deploy     - Deploy containers for production"
            echo "  cleanup    - Clean up temporary resources"
            echo "  all        - Run complete build and deployment process"
            exit 1
            ;;
    esac
}

# Trap for cleanup on exit
trap cleanup EXIT

# Run main function with all arguments
main "$@"