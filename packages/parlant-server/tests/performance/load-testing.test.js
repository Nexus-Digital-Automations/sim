/**
 * Performance and Load Testing Suite for Sim-Parlant Integration
 * =============================================================
 *
 * This suite performs comprehensive performance testing to ensure the integration
 * can handle production workloads with multiple concurrent users, agents, and
 * real-time communications.
 *
 * Test Categories:
 * - Concurrent user authentication and authorization
 * - Agent creation and management under load
 * - Real-time communication performance
 * - Database connection pooling efficiency
 * - Memory usage and resource management
 * - Response time benchmarking
 * - Stress testing and breaking point identification
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
const io = require('socket.io-client');
const { performance } = require('perf_hooks');

describe('Performance and Load Testing Suite', () => {
  const testConfig = {
    parlant_server_url: process.env.PARLANT_SERVER_URL || 'http://localhost:8800',
    socket_server_url: process.env.SOCKET_SERVER_URL || 'http://localhost:3001',
    jwt_secret: process.env.BETTER_AUTH_SECRET || 'test-auth-secret',

    // Performance thresholds
    max_response_time: 2000, // 2 seconds
    max_concurrent_users: 100,
    max_agents_per_workspace: 50,
    target_throughput: 1000, // requests per minute

    // Test parameters
    ramp_up_time: 30000, // 30 seconds
    load_test_duration: 120000, // 2 minutes
    cooldown_time: 10000, // 10 seconds
  };

  let performanceMetrics = {
    authentication: {},
    agent_management: {},
    real_time_communication: {},
    database_performance: {},
    resource_usage: {},
    breaking_points: {}
  };

  let testUsers = [];
  let createdAgents = [];
  let activeConnections = [];

  beforeAll(async () => {
    console.log('⚡ Starting Performance and Load Testing Suite');
    console.log(`📊 Target Configuration:`);
    console.log(`  → Max Response Time: ${testConfig.max_response_time}ms`);
    console.log(`  → Max Concurrent Users: ${testConfig.max_concurrent_users}`);
    console.log(`  → Target Throughput: ${testConfig.target_throughput} req/min`);

    // Generate test users for load testing
    testUsers = generateTestUsers(testConfig.max_concurrent_users);
    console.log(`👥 Generated ${testUsers.length} test users for load testing`);
  });

  afterAll(async () => {
    console.log('🧹 Performance test cleanup...');

    // Disconnect all socket connections
    activeConnections.forEach(socket => {
      if (socket.connected) {
        socket.disconnect();
      }
    });

    // Clean up created agents
    await cleanupCreatedAgents();

    // Generate performance report
    await generatePerformanceReport();

    console.log('✅ Performance testing cleanup completed');
  });

  describe('🔐 Authentication Performance Testing', () => {
    test('Concurrent authentication load testing', async () => {
      console.log('Testing concurrent authentication performance...');

      const concurrentUsers = 50;
      const testUsers = generateTestUsers(concurrentUsers);
      const authPromises = [];

      const startTime = performance.now();

      // Generate concurrent authentication requests
      for (const user of testUsers) {
        const authToken = generateValidJwtToken(user);

        authPromises.push(
          axios.get(`${testConfig.parlant_server_url}/api/v1/profile`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          }).then(response => ({
            success: true,
            status: response.status,
            response_time: performance.now() - startTime
          })).catch(error => ({
            success: false,
            status: error.response?.status || 0,
            error: error.message
          }))
        );
      }

      const results = await Promise.all(authPromises);
      const totalTime = performance.now() - startTime;

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const avgResponseTime = results
        .filter(r => r.response_time)
        .reduce((sum, r) => sum + r.response_time, 0) / successful;

      performanceMetrics.authentication = {
        concurrent_users: concurrentUsers,
        successful_authentications: successful,
        failed_authentications: failed,
        success_rate: `${((successful / concurrentUsers) * 100).toFixed(2)}%`,
        total_time: `${totalTime.toFixed(2)}ms`,
        average_response_time: `${avgResponseTime.toFixed(2)}ms`,
        throughput: `${(successful / (totalTime / 1000)).toFixed(2)} req/sec`
      };

      expect(successful).toBeGreaterThan(concurrentUsers * 0.95); // 95% success rate
      expect(avgResponseTime).toBeLessThan(testConfig.max_response_time);

      console.log(`✅ Authentication Load Test: ${successful}/${concurrentUsers} successful (${avgResponseTime.toFixed(2)}ms avg)`);
    }, 30000);

    test('JWT token validation performance under load', async () => {
      console.log('Testing JWT token validation performance...');

      const tokenValidationCount = 1000;
      const user = generateTestUsers(1)[0];
      const authToken = generateValidJwtToken(user);

      const validationPromises = [];
      const startTime = performance.now();

      // Generate many concurrent JWT validation requests
      for (let i = 0; i < tokenValidationCount; i++) {
        validationPromises.push(
          axios.get(`${testConfig.parlant_server_url}/api/v1/user-context`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          }).then(() => ({ success: true }))
            .catch(() => ({ success: false }))
        );
      }

      const results = await Promise.all(validationPromises);
      const totalTime = performance.now() - startTime;

      const successful = results.filter(r => r.success).length;
      const validationsPerSecond = successful / (totalTime / 1000);

      performanceMetrics.authentication.jwt_validation = {
        total_validations: tokenValidationCount,
        successful_validations: successful,
        total_time: `${totalTime.toFixed(2)}ms`,
        validations_per_second: `${validationsPerSecond.toFixed(2)} val/sec`,
        average_validation_time: `${(totalTime / tokenValidationCount).toFixed(2)}ms`
      };

      expect(successful).toBeGreaterThan(tokenValidationCount * 0.98); // 98% success rate
      expect(validationsPerSecond).toBeGreaterThan(100); // At least 100 validations per second

      console.log(`✅ JWT Validation Performance: ${validationsPerSecond.toFixed(2)} validations/sec`);
    }, 45000);
  });

  describe('🤖 Agent Management Performance Testing', () => {
    test('Concurrent agent creation load testing', async () => {
      console.log('Testing concurrent agent creation performance...');

      const concurrentAgents = 25;
      const user = generateTestUsers(1)[0];
      const authToken = generateValidJwtToken(user);

      const agentCreationPromises = [];
      const startTime = performance.now();

      for (let i = 0; i < concurrentAgents; i++) {
        agentCreationPromises.push(
          axios.post(
            `${testConfig.parlant_server_url}/api/v1/agents`,
            {
              name: `Load Test Agent ${i}`,
              description: `Agent ${i} for load testing`,
              workspace_id: user.workspace_id,
              configuration: {
                model: 'gpt-3.5-turbo',
                temperature: 0.7
              }
            },
            {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              }
            }
          ).then(response => {
            createdAgents.push({
              id: response.data.id,
              auth_token: authToken
            });
            return {
              success: true,
              agent_id: response.data.id,
              creation_time: performance.now() - startTime
            };
          }).catch(error => ({
            success: false,
            error: error.message
          }))
        );
      }

      const results = await Promise.all(agentCreationPromises);
      const totalTime = performance.now() - startTime;

      const successful = results.filter(r => r.success).length;
      const avgCreationTime = results
        .filter(r => r.creation_time)
        .reduce((sum, r) => sum + r.creation_time, 0) / successful;

      performanceMetrics.agent_management.creation = {
        concurrent_creations: concurrentAgents,
        successful_creations: successful,
        failed_creations: concurrentAgents - successful,
        total_time: `${totalTime.toFixed(2)}ms`,
        average_creation_time: `${avgCreationTime.toFixed(2)}ms`,
        creations_per_second: `${(successful / (totalTime / 1000)).toFixed(2)} agents/sec`
      };

      expect(successful).toBeGreaterThan(concurrentAgents * 0.9); // 90% success rate
      expect(avgCreationTime).toBeLessThan(testConfig.max_response_time * 2); // Allow 2x normal time

      console.log(`✅ Agent Creation Load Test: ${successful}/${concurrentAgents} successful (${avgCreationTime.toFixed(2)}ms avg)`);
    }, 60000);

    test('Agent CRUD operations performance benchmark', async () => {
      console.log('Benchmarking agent CRUD operations performance...');

      const user = generateTestUsers(1)[0];
      const authToken = generateValidJwtToken(user);
      const operationsCount = 100;

      let crudMetrics = {
        create: [],
        read: [],
        update: [],
        delete: []
      };

      // Create agents for testing
      console.log('  → Creating agents for CRUD benchmarking...');
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const response = await axios.post(
          `${testConfig.parlant_server_url}/api/v1/agents`,
          {
            name: `CRUD Benchmark Agent ${i}`,
            description: `Agent ${i} for CRUD benchmarking`,
            workspace_id: user.workspace_id
          },
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const creationTime = performance.now() - startTime;
        crudMetrics.create.push(creationTime);

        createdAgents.push({
          id: response.data.id,
          auth_token: authToken
        });
      }

      // Benchmark READ operations
      console.log('  → Benchmarking READ operations...');
      for (let i = 0; i < Math.min(operationsCount, createdAgents.length * 10); i++) {
        const agent = createdAgents[i % createdAgents.length];
        const startTime = performance.now();

        await axios.get(
          `${testConfig.parlant_server_url}/api/v1/agents/${agent.id}`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const readTime = performance.now() - startTime;
        crudMetrics.read.push(readTime);
      }

      // Benchmark UPDATE operations
      console.log('  → Benchmarking UPDATE operations...');
      for (let i = 0; i < Math.min(50, createdAgents.length); i++) {
        const agent = createdAgents[i % createdAgents.length];
        const startTime = performance.now();

        await axios.put(
          `${testConfig.parlant_server_url}/api/v1/agents/${agent.id}`,
          {
            name: `Updated Benchmark Agent ${i}`,
            description: `Updated agent ${i} for performance testing`
          },
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const updateTime = performance.now() - startTime;
        crudMetrics.update.push(updateTime);
      }

      // Calculate performance metrics
      const calculateStats = (times) => ({
        count: times.length,
        avg: times.reduce((sum, time) => sum + time, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        p95: times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]
      });

      performanceMetrics.agent_management.crud_benchmark = {
        create: calculateStats(crudMetrics.create),
        read: calculateStats(crudMetrics.read),
        update: calculateStats(crudMetrics.update),
        operations_total: crudMetrics.create.length + crudMetrics.read.length + crudMetrics.update.length
      };

      // Validate performance thresholds
      expect(crudMetrics.read.every(time => time < 1000)).toBe(true); // All reads under 1s
      expect(crudMetrics.update.every(time => time < 2000)).toBe(true); // All updates under 2s

      console.log(`✅ CRUD Benchmark: CREATE avg ${performanceMetrics.agent_management.crud_benchmark.create.avg.toFixed(2)}ms, READ avg ${performanceMetrics.agent_management.crud_benchmark.read.avg.toFixed(2)}ms`);
    }, 120000);
  });

  describe('🔌 Real-Time Communication Performance', () => {
    test('Multiple concurrent Socket.io connections stress test', async () => {
      console.log('Stress testing multiple concurrent Socket.io connections...');

      const concurrentConnections = 25;
      const user = generateTestUsers(1)[0];
      const authToken = generateValidJwtToken(user);

      const connectionPromises = [];
      const startTime = performance.now();

      for (let i = 0; i < concurrentConnections; i++) {
        connectionPromises.push(
          new Promise((resolve, reject) => {
            const socket = io(testConfig.socket_server_url, {
              auth: { token: authToken }
            });

            activeConnections.push(socket);

            const connectionStartTime = performance.now();

            socket.on('connect', () => {
              const connectionTime = performance.now() - connectionStartTime;

              socket.emit('join_workspace', user.workspace_id);

              socket.on('workspace_joined', () => {
                resolve({
                  success: true,
                  connection_time: connectionTime,
                  socket_id: socket.id
                });
              });
            });

            socket.on('connect_error', (error) => {
              resolve({
                success: false,
                error: error.message
              });
            });

            setTimeout(() => {
              resolve({
                success: false,
                error: 'Connection timeout'
              });
            }, 10000);
          })
        );
      }

      const results = await Promise.all(connectionPromises);
      const totalTime = performance.now() - startTime;

      const successful = results.filter(r => r.success).length;
      const avgConnectionTime = results
        .filter(r => r.connection_time)
        .reduce((sum, r) => sum + r.connection_time, 0) / successful;

      performanceMetrics.real_time_communication = {
        concurrent_connections: concurrentConnections,
        successful_connections: successful,
        failed_connections: concurrentConnections - successful,
        success_rate: `${((successful / concurrentConnections) * 100).toFixed(2)}%`,
        total_setup_time: `${totalTime.toFixed(2)}ms`,
        average_connection_time: `${avgConnectionTime.toFixed(2)}ms`,
        connections_per_second: `${(successful / (totalTime / 1000)).toFixed(2)} conn/sec`
      };

      expect(successful).toBeGreaterThan(concurrentConnections * 0.8); // 80% success rate
      expect(avgConnectionTime).toBeLessThan(5000); // Under 5 seconds

      console.log(`✅ Socket.io Stress Test: ${successful}/${concurrentConnections} connections (${avgConnectionTime.toFixed(2)}ms avg)`);
    }, 60000);

    test('Real-time message throughput testing', async () => {
      console.log('Testing real-time message throughput...');

      const messageCount = 1000;
      const user = generateTestUsers(1)[0];
      const authToken = generateValidJwtToken(user);

      return new Promise((resolve, reject) => {
        const socket = io(testConfig.socket_server_url, {
          auth: { token: authToken }
        });

        activeConnections.push(socket);

        let messagesReceived = 0;
        let messageTimestamps = [];
        const startTime = performance.now();

        socket.on('connect', () => {
          socket.emit('join_workspace', user.workspace_id);
        });

        socket.on('workspace_joined', () => {
          console.log('  → Starting message throughput test...');

          // Send messages rapidly
          for (let i = 0; i < messageCount; i++) {
            socket.emit('test_message', {
              workspace_id: user.workspace_id,
              message_id: i,
              content: `Throughput test message ${i}`,
              timestamp: performance.now()
            });
          }
        });

        socket.on('test_message_ack', (data) => {
          messagesReceived++;
          messageTimestamps.push({
            sent: data.timestamp,
            received: performance.now(),
            message_id: data.message_id
          });

          if (messagesReceived === messageCount) {
            const totalTime = performance.now() - startTime;
            const messagesPerSecond = messageCount / (totalTime / 1000);

            const latencies = messageTimestamps.map(msg => msg.received - msg.sent);
            const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;

            performanceMetrics.real_time_communication.message_throughput = {
              messages_sent: messageCount,
              messages_received: messagesReceived,
              total_time: `${totalTime.toFixed(2)}ms`,
              messages_per_second: `${messagesPerSecond.toFixed(2)} msg/sec`,
              average_latency: `${avgLatency.toFixed(2)}ms`,
              max_latency: `${Math.max(...latencies).toFixed(2)}ms`,
              min_latency: `${Math.min(...latencies).toFixed(2)}ms`
            };

            expect(messagesPerSecond).toBeGreaterThan(50); // At least 50 messages per second
            expect(avgLatency).toBeLessThan(100); // Average latency under 100ms

            console.log(`✅ Message Throughput: ${messagesPerSecond.toFixed(2)} msg/sec, ${avgLatency.toFixed(2)}ms avg latency`);

            socket.disconnect();
            resolve();
          }
        });

        socket.on('error', (error) => {
          socket.disconnect();
          reject(error);
        });

        setTimeout(() => {
          if (messagesReceived < messageCount) {
            console.log(`  ⚠️  Message throughput test incomplete: ${messagesReceived}/${messageCount} received`);

            if (messagesReceived > 0) {
              const partialThroughput = messagesReceived / ((performance.now() - startTime) / 1000);
              console.log(`  → Partial throughput: ${partialThroughput.toFixed(2)} msg/sec`);

              socket.disconnect();
              resolve(); // Partial success
            } else {
              socket.disconnect();
              reject(new Error('Message throughput test timeout'));
            }
          }
        }, 30000);
      });
    }, 45000);
  });

  describe('💾 Database and Resource Performance', () => {
    test('Database connection pool efficiency under load', async () => {
      console.log('Testing database connection pool efficiency...');

      const concurrentDbOperations = 50;
      const user = generateTestUsers(1)[0];
      const authToken = generateValidJwtToken(user);

      const dbOperationPromises = [];
      const startTime = performance.now();

      // Mix of different database operations
      for (let i = 0; i < concurrentDbOperations; i++) {
        const operationType = i % 3; // Cycle through operation types

        if (operationType === 0) {
          // Agent creation (INSERT)
          dbOperationPromises.push(
            axios.post(
              `${testConfig.parlant_server_url}/api/v1/agents`,
              {
                name: `DB Pool Test Agent ${i}`,
                description: `Agent ${i} for database pool testing`,
                workspace_id: user.workspace_id
              },
              {
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                }
              }
            ).then(response => {
              createdAgents.push({
                id: response.data.id,
                auth_token: authToken
              });
              return { operation: 'CREATE', success: true, time: performance.now() - startTime };
            }).catch(() => ({ operation: 'CREATE', success: false, time: performance.now() - startTime }))
          );
        } else if (operationType === 1) {
          // Agent listing (SELECT)
          dbOperationPromises.push(
            axios.get(`${testConfig.parlant_server_url}/api/v1/agents`, {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              }
            }).then(() => ({ operation: 'READ', success: true, time: performance.now() - startTime }))
              .catch(() => ({ operation: 'READ', success: false, time: performance.now() - startTime }))
          );
        } else {
          // Health check (lightweight SELECT)
          dbOperationPromises.push(
            axios.get(`${testConfig.parlant_server_url}/health`)
              .then(() => ({ operation: 'HEALTH', success: true, time: performance.now() - startTime }))
              .catch(() => ({ operation: 'HEALTH', success: false, time: performance.now() - startTime }))
          );
        }
      }

      const results = await Promise.all(dbOperationPromises);
      const totalTime = performance.now() - startTime;

      const successful = results.filter(r => r.success).length;
      const operationsByType = {
        CREATE: results.filter(r => r.operation === 'CREATE'),
        READ: results.filter(r => r.operation === 'READ'),
        HEALTH: results.filter(r => r.operation === 'HEALTH')
      };

      performanceMetrics.database_performance = {
        concurrent_operations: concurrentDbOperations,
        successful_operations: successful,
        failed_operations: concurrentDbOperations - successful,
        total_time: `${totalTime.toFixed(2)}ms`,
        operations_per_second: `${(successful / (totalTime / 1000)).toFixed(2)} ops/sec`,
        operation_breakdown: {
          create_operations: operationsByType.CREATE.filter(op => op.success).length,
          read_operations: operationsByType.READ.filter(op => op.success).length,
          health_operations: operationsByType.HEALTH.filter(op => op.success).length
        }
      };

      expect(successful).toBeGreaterThan(concurrentDbOperations * 0.9); // 90% success rate
      expect(totalTime).toBeLessThan(30000); // Complete within 30 seconds

      console.log(`✅ Database Pool Test: ${successful}/${concurrentDbOperations} operations (${(successful / (totalTime / 1000)).toFixed(2)} ops/sec)`);
    }, 60000);
  });

  // Helper functions
  function generateTestUsers(count) {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push({
        id: `load-test-user-${i}-${Date.now()}`,
        name: `Load Test User ${i}`,
        email: `load-test-${i}@example.com`,
        workspace_id: `load-test-workspace-${i % 5}` // Distribute across 5 workspaces
      });
    }
    return users;
  }

  function generateValidJwtToken(user) {
    const payload = {
      user_id: user.id,
      email: user.email,
      name: user.name,
      workspace_id: user.workspace_id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    };

    return jwt.sign(payload, testConfig.jwt_secret, { algorithm: 'HS256' });
  }

  async function cleanupCreatedAgents() {
    console.log(`🗑️  Cleaning up ${createdAgents.length} created agents...`);

    const cleanupPromises = createdAgents.map(agent =>
      axios.delete(
        `${testConfig.parlant_server_url}/api/v1/agents/${agent.id}`,
        {
          headers: {
            'Authorization': `Bearer ${agent.auth_token}`,
            'Content-Type': 'application/json'
          }
        }
      ).catch(() => {
        // Ignore cleanup errors
      })
    );

    await Promise.allSettled(cleanupPromises);
    console.log('✅ Agent cleanup completed');
  }

  async function generatePerformanceReport() {
    const report = {
      test_suite: 'Sim-Parlant Integration Performance and Load Testing',
      test_configuration: testConfig,
      test_results: performanceMetrics,
      generated_at: new Date().toISOString(),
      summary: {
        authentication_performance: performanceMetrics.authentication?.success_rate || 'N/A',
        agent_crud_performance: performanceMetrics.agent_management?.crud_benchmark?.read?.avg || 'N/A',
        realtime_performance: performanceMetrics.real_time_communication?.success_rate || 'N/A',
        database_performance: performanceMetrics.database_performance?.operations_per_second || 'N/A'
      }
    };

    // Write performance report
    const reportPath = require('path').join(__dirname, 'performance-test-report.json');
    await require('fs').promises.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 PERFORMANCE TEST SUMMARY:');
    console.log(`  → Authentication Success Rate: ${report.summary.authentication_performance}`);
    console.log(`  → Average Read Time: ${report.summary.agent_crud_performance}ms`);
    console.log(`  → Real-time Success Rate: ${report.summary.realtime_performance}`);
    console.log(`  → Database Operations/sec: ${report.summary.database_performance}`);
    console.log(`📋 Full report: ${reportPath}`);
  }
});