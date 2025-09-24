#!/bin/bash

# Sim-Parlant Integration Bridge - Comprehensive Test Execution Script
# ==================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Sim-Parlant Integration Bridge Test Suite${NC}"
echo "============================================="
echo

# Check environment setup
echo -e "${YELLOW}🔍 Checking Environment Setup...${NC}"

# Check for required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL environment variable not set${NC}"
    echo "   Set with: export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/simstudio_test'"
    exit 1
fi

if [ -z "$BETTER_AUTH_SECRET" ]; then
    echo -e "${YELLOW}⚠️  BETTER_AUTH_SECRET not set, using default test secret${NC}"
    export BETTER_AUTH_SECRET="test-auth-secret"
fi

# Set default URLs if not provided
export PARLANT_SERVER_URL=${PARLANT_SERVER_URL:-"http://localhost:8800"}
export SIM_SERVER_URL=${SIM_SERVER_URL:-"http://localhost:3000"}
export SOCKET_SERVER_URL=${SOCKET_SERVER_URL:-"http://localhost:3001"}

echo -e "${GREEN}✅ Environment configuration complete${NC}"
echo "   → Database: ${DATABASE_URL}"
echo "   → Parlant Server: ${PARLANT_SERVER_URL}"
echo "   → Sim Server: ${SIM_SERVER_URL}"
echo "   → Socket Server: ${SOCKET_SERVER_URL}"
echo

# Check if this is the parlant-server directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Please run this script from the parlant-server directory${NC}"
    exit 1
fi

# Create test reports directory
mkdir -p tests/reports
echo -e "${GREEN}✅ Test reports directory ready: tests/reports${NC}"
echo

# Function to run test suite with error handling
run_test_suite() {
    local test_name="$1"
    local test_command="$2"
    local test_description="$3"

    echo -e "${BLUE}📋 Running: ${test_name}${NC}"
    echo "   ${test_description}"
    echo "   Command: ${test_command}"
    echo

    if eval "$test_command"; then
        echo -e "${GREEN}✅ ${test_name} - PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ ${test_name} - FAILED${NC}"
        return 1
    fi
}

# Initialize test results tracking
total_suites=0
passed_suites=0
failed_suites=0

# Run comprehensive integration tests (main acceptance criteria validation)
total_suites=$((total_suites + 1))
if run_test_suite \
    "Comprehensive Integration Tests" \
    "npm test -- tests/integration/comprehensive-integration.test.js --testTimeout=300000" \
    "Complete end-to-end acceptance criteria validation"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo

# Run real-time communication tests
total_suites=$((total_suites + 1))
if run_test_suite \
    "Real-Time Communication Tests" \
    "npm test -- tests/integration/realtime-communication.test.js --testTimeout=180000" \
    "Socket.io integration and workspace isolation testing"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo

# Run performance and load tests
total_suites=$((total_suites + 1))
if run_test_suite \
    "Performance and Load Tests" \
    "npm test -- tests/performance/load-testing.test.js --testTimeout=600000" \
    "Performance benchmarking and concurrent load testing"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo

# Run existing authentication integration tests
total_suites=$((total_suites + 1))
if run_test_suite \
    "Authentication Integration Tests" \
    "npm test -- tests/auth/auth-integration.test.js --testTimeout=120000" \
    "Better Auth and JWT authentication flow testing"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo

# Run existing parlant server integration tests
total_suites=$((total_suites + 1))
if run_test_suite \
    "Parlant Server Integration Tests" \
    "npm test -- tests/integration/parlant-server.integration.test.js --testTimeout=240000" \
    "Core Parlant server functionality and API testing"; then
    passed_suites=$((passed_suites + 1))
else
    failed_suites=$((failed_suites + 1))
fi
echo

# Calculate results
success_rate=$(( (passed_suites * 100) / total_suites ))

echo "======================================="
echo -e "${BLUE}📊 INTEGRATION TEST SUMMARY${NC}"
echo "======================================="
echo -e "Total Test Suites:     ${total_suites}"
echo -e "Passed Suites:         ${GREEN}${passed_suites}${NC}"
echo -e "Failed Suites:         ${RED}${failed_suites}${NC}"
echo -e "Success Rate:          ${success_rate}%"
echo

# Check if orchestrated test runner exists and run it
if [ -f "tests/integration/test-runner.js" ]; then
    echo -e "${YELLOW}🎯 Running Orchestrated Test Suite for Comprehensive Reporting...${NC}"
    echo

    if node tests/integration/test-runner.js; then
        echo -e "${GREEN}✅ Orchestrated test runner completed successfully${NC}"
        echo -e "${BLUE}📋 Comprehensive reports generated in tests/reports/${NC}"
    else
        echo -e "${YELLOW}⚠️  Orchestrated test runner encountered issues but core tests completed${NC}"
    fi
    echo
fi

# Generate final status
echo "======================================="
if [ $failed_suites -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED - INTEGRATION BRIDGE READY!${NC}"
    echo -e "${GREEN}✅ All 4 Acceptance Criteria Validated${NC}"
    echo -e "${GREEN}✅ Security and Performance Testing Passed${NC}"
    echo -e "${GREEN}✅ Real-Time Communication Verified${NC}"
    echo -e "${GREEN}✅ Multi-Tenant Workspace Isolation Confirmed${NC}"
    echo
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "   → Review generated test reports in tests/reports/"
    echo "   → Integration bridge is ready for production deployment"
    echo "   → Consider running additional user acceptance testing"

    exit 0
elif [ $passed_suites -gt $((total_suites / 2)) ]; then
    echo -e "${YELLOW}⚠️  MOSTLY PASSING - SOME TESTS FAILED${NC}"
    echo -e "${YELLOW}   ${passed_suites}/${total_suites} test suites passed${NC}"
    echo
    echo -e "${BLUE}📋 Recommended Actions:${NC}"
    echo "   → Review test reports to identify specific failures"
    echo "   → Address failing tests before production deployment"
    echo "   → Re-run tests after fixes"

    exit 1
else
    echo -e "${RED}❌ SIGNIFICANT TEST FAILURES${NC}"
    echo -e "${RED}   Only ${passed_suites}/${total_suites} test suites passed${NC}"
    echo
    echo -e "${BLUE}📋 Required Actions:${NC}"
    echo "   → Review all test failures in detail"
    echo "   → Address implementation gaps"
    echo "   → Ensure all services are running and accessible"
    echo "   → Verify environment configuration"
    echo "   → Re-run complete test suite after fixes"

    exit 2
fi