#!/usr/bin/env node

/**
 * Parlant Server Test Runner
 *
 * Orchestrates the complete test suite for Parlant server validation.
 * Runs tests in the correct order and provides comprehensive reporting.
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class ParlantTestRunner {
  constructor() {
    this.testSuites = [
      {
        name: 'Integration Tests',
        description: 'Core server functionality and acceptance criteria',
        path: 'tests/integration/parlant-server.integration.test.js',
        priority: 1,
        timeout: 60000
      },
      {
        name: 'Database Tests',
        description: 'PostgreSQL integration and session persistence',
        path: 'tests/database/database-tests.js',
        priority: 1,
        timeout: 30000
      },
      {
        name: 'Authentication Tests',
        description: 'JWT integration and user mapping with Sim',
        path: 'tests/auth/auth-integration.test.js',
        priority: 2,
        timeout: 30000
      },
      {
        name: 'Health Monitoring Tests',
        description: 'Health checks and monitoring endpoints',
        path: 'tests/health/health-monitoring.test.js',
        priority: 2,
        timeout: 45000
      },
      {
        name: 'API Endpoint Tests',
        description: 'Complete agent management API validation',
        path: 'tests/api/agent-api.test.js',
        priority: 3,
        timeout: 45000
      },
      {
        name: 'Performance Tests',
        description: 'Load testing and performance validation',
        path: 'tests/performance/load-tests.js',
        priority: 4,
        timeout: 180000 // 3 minutes
      }
    ];

    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      suiteResults: []
    };
  }

  async run() {
    console.log('🚀 Parlant Server Test Suite Runner');
    console.log('=====================================\n');

    // Check if Jest is available
    if (!await this.checkJestAvailability()) {
      console.error('❌ Jest is not available. Please install Jest to run tests.');
      console.log('   Run: npm install --save-dev jest\n');
      process.exit(1);
    }

    // Check server availability
    await this.checkServerAvailability();

    // Run tests by priority
    const priorityGroups = this.groupTestsByPriority();

    for (const [priority, suites] of Object.entries(priorityGroups)) {
      console.log(`\n📋 Running Priority ${priority} Tests`);
      console.log('─'.repeat(40));

      for (const suite of suites) {
        await this.runTestSuite(suite);
      }
    }

    // Generate final report
    this.generateFinalReport();
  }

  async checkJestAvailability() {
    try {
      const { execSync } = require('child_process');
      execSync('npx jest --version', { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  async checkServerAvailability() {
    console.log('🔍 Checking Parlant server availability...');

    try {
      const axios = require('axios');
      const response = await axios.get('http://localhost:8001/health', { timeout: 3000 });
      console.log('✅ Parlant server is running and healthy');
      console.log(`   Status: ${response.data.status || 'unknown'}`);
    } catch (error) {
      console.warn('⚠️  Parlant server is not available');
      console.log('   This is expected if the server is not yet implemented');
      console.log('   Tests will validate this condition and provide implementation guidance\n');
    }
  }

  groupTestsByPriority() {
    const groups = {};

    this.testSuites.forEach(suite => {
      if (!groups[suite.priority]) {
        groups[suite.priority] = [];
      }
      groups[suite.priority].push(suite);
    });

    return groups;
  }

  async runTestSuite(suite) {
    console.log(`\n🧪 ${suite.name}`);
    console.log(`   ${suite.description}`);

    const startTime = Date.now();

    try {
      const result = await this.executeJestTest(suite);
      const duration = Date.now() - startTime;

      const suiteResult = {
        name: suite.name,
        status: result.success ? 'PASSED' : 'FAILED',
        duration: duration,
        tests: result.tests,
        output: result.output
      };

      this.results.suiteResults.push(suiteResult);
      this.results.total += result.tests.total || 0;
      this.results.passed += result.tests.passed || 0;
      this.results.failed += result.tests.failed || 0;
      this.results.skipped += result.tests.skipped || 0;

      if (result.success) {
        console.log(`   ✅ PASSED (${duration}ms)`);
        if (result.tests.total > 0) {
          console.log(`   📊 ${result.tests.passed}/${result.tests.total} tests passed`);
        }
      } else {
        console.log(`   ❌ FAILED (${duration}ms)`);
        if (result.tests.total > 0) {
          console.log(`   📊 ${result.tests.passed}/${result.tests.total} tests passed`);
        }
        if (result.output) {
          console.log(`   💭 Output: ${result.output.slice(0, 200)}...`);
        }
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);

      this.results.suiteResults.push({
        name: suite.name,
        status: 'ERROR',
        duration: Date.now() - startTime,
        error: error.message
      });
    }
  }

  async executeJestTest(suite) {
    return new Promise((resolve) => {
      const jestProcess = spawn('npx', ['jest', suite.path, '--verbose', '--json'], {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      jestProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      jestProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        jestProcess.kill('SIGTERM');
        resolve({
          success: false,
          tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
          output: 'Test suite timed out',
          timeout: true
        });
      }, suite.timeout);

      jestProcess.on('close', (code) => {
        clearTimeout(timer);

        let testResults = { total: 0, passed: 0, failed: 0, skipped: 0 };
        let success = code === 0;

        // Try to parse Jest JSON output
        try {
          const lines = stdout.split('\n');
          const jsonLine = lines.find(line => line.startsWith('{') && line.includes('testResults'));

          if (jsonLine) {
            const jestResult = JSON.parse(jsonLine);

            if (jestResult.testResults && jestResult.testResults.length > 0) {
              const testSuite = jestResult.testResults[0];
              testResults = {
                total: testSuite.numPassingTests + testSuite.numFailingTests + testSuite.numPendingTests,
                passed: testSuite.numPassingTests,
                failed: testSuite.numFailingTests,
                skipped: testSuite.numPendingTests
              };
            }
          }
        } catch (parseError) {
          // If we can't parse, use exit code
        }

        resolve({
          success: success,
          tests: testResults,
          output: stderr || stdout
        });
      });
    });
  }

  generateFinalReport() {
    console.log('\n\n📊 Final Test Results');
    console.log('=====================');

    console.log(`\n📈 Overall Statistics:`);
    console.log(`   Total Test Suites: ${this.testSuites.length}`);
    console.log(`   Total Tests: ${this.results.total}`);
    console.log(`   ✅ Passed: ${this.results.passed}`);
    console.log(`   ❌ Failed: ${this.results.failed}`);
    console.log(`   ⏭️  Skipped: ${this.results.skipped}`);

    const passRate = this.results.total > 0
      ? ((this.results.passed / this.results.total) * 100).toFixed(1)
      : '0.0';
    console.log(`   📊 Pass Rate: ${passRate}%`);

    console.log(`\n📋 Suite Results:`);
    this.results.suiteResults.forEach(suite => {
      const statusIcon = suite.status === 'PASSED' ? '✅' :
                        suite.status === 'FAILED' ? '❌' : '⚠️';
      console.log(`   ${statusIcon} ${suite.name}: ${suite.status} (${suite.duration}ms)`);

      if (suite.tests) {
        console.log(`      Tests: ${suite.tests.passed}/${suite.tests.total} passed`);
      }
    });

    // Implementation Status Assessment
    console.log(`\n🎯 Implementation Status:`);
    const implementationGuidance = this.assessImplementationStatus();
    console.log(implementationGuidance);

    // Next Steps
    console.log(`\n🚀 Next Steps:`);
    if (this.results.failed > 0 || this.results.total === 0) {
      console.log('   1. ⚠️  Implement missing Parlant server components');
      console.log('   2. 🔧 Run tests again to validate implementation');
      console.log('   3. 🔍 Review TESTING_VALIDATION_REPORT.md for detailed guidance');
    } else {
      console.log('   1. ✅ All tests passing - Ready for production!');
      console.log('   2. 🚀 Deploy to staging environment');
      console.log('   3. 📊 Monitor performance in production');
    }

    console.log('\n📖 For detailed implementation guidance, see:');
    console.log('   📄 TESTING_VALIDATION_REPORT.md');
    console.log('   🐳 docker-compose.local.yml (Parlant server configuration)');
    console.log('   🧪 Test files in tests/ directory\n');
  }

  assessImplementationStatus() {
    const passedSuites = this.results.suiteResults.filter(s => s.status === 'PASSED').length;
    const totalSuites = this.results.suiteResults.length;

    if (passedSuites === 0) {
      return '   🔴 Implementation Required: Parlant server not yet implemented\n' +
             '      → Start with core server setup and health endpoints\n' +
             '      → Use Docker configuration in docker-compose.local.yml';
    } else if (passedSuites < totalSuites / 2) {
      return '   🟡 Partial Implementation: Basic components working\n' +
             '      → Focus on API endpoints and authentication integration\n' +
             '      → Database schema may need completion';
    } else if (passedSuites < totalSuites) {
      return '   🟢 Near Complete: Most components implemented\n' +
             '      → Focus on performance optimization and edge cases\n' +
             '      → Ready for staging deployment soon';
    } else {
      return '   ✅ Implementation Complete: All components validated\n' +
             '      → Production ready!\n' +
             '      → Consider performance monitoring setup';
    }
  }
}

// Run the test suite if called directly
if (require.main === module) {
  const runner = new ParlantTestRunner();
  runner.run().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = ParlantTestRunner;