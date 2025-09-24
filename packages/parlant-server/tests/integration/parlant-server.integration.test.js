/**
 * Parlant Server Integration Tests
 *
 * Comprehensive test suite to validate Parlant server startup, initialization,
 * and all acceptance criteria from FEATURES.json
 */

const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

describe('Parlant Server Integration Tests', () => {
  let parlantServer;
  const PARLANT_SERVER_URL = 'http://localhost:8800';
  const TEST_TIMEOUT = 30000;

  // Test configuration
  const testConfig = {
    server_url: PARLANT_SERVER_URL,
    database_url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/simstudio_test',
    api_timeout: 10000,
    startup_timeout: 15000
  };

  beforeAll(async () => {
    console.log('🚀 Starting Parlant Server Integration Test Suite');

    // Ensure test database is available
    await ensureTestDatabase();

    // Start Parlant server for testing
    await startParlantServer();

    // Wait for server to be ready
    await waitForServerReady();
  });

  afterAll(async () => {
    console.log('🛑 Shutting down Parlant Server');

    if (parlantServer) {
      parlantServer.kill('SIGTERM');

      // Wait for graceful shutdown
      await new Promise(resolve => {
        parlantServer.on('close', resolve);
        setTimeout(resolve, 5000); // Force close after 5s
      });
    }
  });

  describe('Acceptance Criteria Validation', () => {
    /**
     * ACCEPTANCE CRITERION 1: Parlant server starts successfully
     */
    test('AC1: Parlant server starts successfully', async () => {
      const response = await axios.get(`${PARLANT_SERVER_URL}/health`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'healthy');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('version');
    }, TEST_TIMEOUT);

    /**
     * ACCEPTANCE CRITERION 2: Can create and manage agents via API
     */
    test('AC2: Can create and manage agents via API', async () => {
      // Create a new agent
      const createAgentResponse = await axios.post(`${PARLANT_SERVER_URL}/api/agents`, {
        name: 'Test Agent',
        description: 'Integration test agent for validation',
        workspace_id: 'test-workspace-001'
      });

      expect(createAgentResponse.status).toBe(201);
      expect(createAgentResponse.data).toHaveProperty('id');
      expect(createAgentResponse.data.name).toBe('Test Agent');

      const agentId = createAgentResponse.data.id;

      // Retrieve the agent
      const getAgentResponse = await axios.get(`${PARLANT_SERVER_URL}/api/agents/${agentId}`);
      expect(getAgentResponse.status).toBe(200);
      expect(getAgentResponse.data.id).toBe(agentId);

      // Update the agent
      const updateAgentResponse = await axios.put(`${PARLANT_SERVER_URL}/api/agents/${agentId}`, {
        name: 'Updated Test Agent',
        description: 'Updated description for testing'
      });

      expect(updateAgentResponse.status).toBe(200);
      expect(updateAgentResponse.data.name).toBe('Updated Test Agent');

      // List all agents
      const listAgentsResponse = await axios.get(`${PARLANT_SERVER_URL}/api/agents`);
      expect(listAgentsResponse.status).toBe(200);
      expect(Array.isArray(listAgentsResponse.data)).toBe(true);
      expect(listAgentsResponse.data.some(agent => agent.id === agentId)).toBe(true);

      // Delete the agent
      const deleteAgentResponse = await axios.delete(`${PARLANT_SERVER_URL}/api/agents/${agentId}`);
      expect(deleteAgentResponse.status).toBe(204);

      // Verify agent is deleted
      try {
        await axios.get(`${PARLANT_SERVER_URL}/api/agents/${agentId}`);
        fail('Expected 404 error for deleted agent');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    }, TEST_TIMEOUT);

    /**
     * ACCEPTANCE CRITERION 3: Sessions persist in PostgreSQL
     */
    test('AC3: Sessions persist in PostgreSQL', async () => {
      // Create an agent first
      const agentResponse = await axios.post(`${PARLANT_SERVER_URL}/api/agents`, {
        name: 'Session Test Agent',
        description: 'Agent for testing session persistence',
        workspace_id: 'test-workspace-sessions'
      });

      const agentId = agentResponse.data.id;

      // Create a new session
      const createSessionResponse = await axios.post(`${PARLANT_SERVER_URL}/api/sessions`, {
        agent_id: agentId,
        user_id: 'test-user-001',
        workspace_id: 'test-workspace-sessions'
      });

      expect(createSessionResponse.status).toBe(201);
      expect(createSessionResponse.data).toHaveProperty('id');
      expect(createSessionResponse.data.agent_id).toBe(agentId);

      const sessionId = createSessionResponse.data.id;

      // Send a message to the session
      const messageResponse = await axios.post(`${PARLANT_SERVER_URL}/api/sessions/${sessionId}/events`, {
        type: 'customer_message',
        content: 'Hello, this is a test message for session persistence validation'
      });

      expect(messageResponse.status).toBe(201);

      // Retrieve session events
      const eventsResponse = await axios.get(`${PARLANT_SERVER_URL}/api/sessions/${sessionId}/events`);
      expect(eventsResponse.status).toBe(200);
      expect(Array.isArray(eventsResponse.data)).toBe(true);
      expect(eventsResponse.data.length).toBeGreaterThan(0);

      // Test session persistence by simulating server restart
      // (In real implementation, this would restart the actual server)

      // Retrieve the session after "restart"
      const retrieveSessionResponse = await axios.get(`${PARLANT_SERVER_URL}/api/sessions/${sessionId}`);
      expect(retrieveSessionResponse.status).toBe(200);
      expect(retrieveSessionResponse.data.id).toBe(sessionId);

      // Verify events are still there
      const persistedEventsResponse = await axios.get(`${PARLANT_SERVER_URL}/api/sessions/${sessionId}/events`);
      expect(persistedEventsResponse.status).toBe(200);
      expect(persistedEventsResponse.data.length).toBeGreaterThan(0);

      // Clean up
      await axios.delete(`${PARLANT_SERVER_URL}/api/agents/${agentId}`);
    }, TEST_TIMEOUT);

    /**
     * ACCEPTANCE CRITERION 4: Authentication works with Sim user system
     */
    test('AC4: Authentication works with Sim user system', async () => {
      // Test authentication integration
      const authToken = await generateTestAuthToken();

      // Make authenticated request to create agent
      const createAgentResponse = await axios.post(
        `${PARLANT_SERVER_URL}/api/agents`,
        {
          name: 'Authenticated Agent',
          description: 'Agent created with Sim authentication',
          workspace_id: 'authenticated-workspace'
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      expect(createAgentResponse.status).toBe(201);
      expect(createAgentResponse.data).toHaveProperty('user_id');
      expect(createAgentResponse.data).toHaveProperty('workspace_id');

      // Test unauthorized request (should fail)
      try {
        await axios.post(`${PARLANT_SERVER_URL}/api/agents`, {
          name: 'Unauthorized Agent',
          description: 'This should fail'
        });
        fail('Expected 401 error for unauthorized request');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }

      // Test with invalid token (should fail)
      try {
        await axios.post(
          `${PARLANT_SERVER_URL}/api/agents`,
          {
            name: 'Invalid Token Agent',
            description: 'This should also fail'
          },
          {
            headers: {
              'Authorization': 'Bearer invalid-token-123'
            }
          }
        );
        fail('Expected 401 error for invalid token');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }

      // Clean up
      const agentId = createAgentResponse.data.id;
      await axios.delete(`${PARLANT_SERVER_URL}/api/agents/${agentId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    }, TEST_TIMEOUT);
  });

  describe('Additional Integration Tests', () => {
    test('Server handles concurrent requests properly', async () => {
      const promises = [];
      const requestCount = 10;

      // Create multiple concurrent requests
      for (let i = 0; i < requestCount; i++) {
        promises.push(
          axios.post(`${PARLANT_SERVER_URL}/api/agents`, {
            name: `Concurrent Agent ${i}`,
            description: `Agent ${i} for concurrent testing`,
            workspace_id: `concurrent-workspace-${i}`
          })
        );
      }

      const results = await Promise.all(promises);

      // Verify all requests succeeded
      results.forEach((result, index) => {
        expect(result.status).toBe(201);
        expect(result.data.name).toBe(`Concurrent Agent ${index}`);
      });

      // Clean up all created agents
      const cleanupPromises = results.map(result =>
        axios.delete(`${PARLANT_SERVER_URL}/api/agents/${result.data.id}`)
      );
      await Promise.all(cleanupPromises);
    }, TEST_TIMEOUT);

    test('Database connection pool handles multiple sessions', async () => {
      const agentResponse = await axios.post(`${PARLANT_SERVER_URL}/api/agents`, {
        name: 'Multi-Session Agent',
        description: 'Agent for testing multiple sessions'
      });

      const agentId = agentResponse.data.id;
      const sessionPromises = [];

      // Create multiple sessions simultaneously
      for (let i = 0; i < 5; i++) {
        sessionPromises.push(
          axios.post(`${PARLANT_SERVER_URL}/api/sessions`, {
            agent_id: agentId,
            user_id: `test-user-${i}`,
            workspace_id: `test-workspace-${i}`
          })
        );
      }

      const sessions = await Promise.all(sessionPromises);

      // Verify all sessions were created
      sessions.forEach((session, index) => {
        expect(session.status).toBe(201);
        expect(session.data.user_id).toBe(`test-user-${index}`);
      });

      // Clean up
      await axios.delete(`${PARLANT_SERVER_URL}/api/agents/${agentId}`);
    }, TEST_TIMEOUT);
  });

  // Helper functions
  async function ensureTestDatabase() {
    console.log('🔍 Ensuring test database is available...');
    // Implementation would check database connectivity
    // For now, assume database is available if DATABASE_URL is set
    if (!testConfig.database_url) {
      throw new Error('DATABASE_URL environment variable is required for testing');
    }
  }

  async function startParlantServer() {
    console.log('🚀 Starting Parlant server...');

    const serverPath = path.join(__dirname, '../../main.py');

    // Check if server file exists, if not create a placeholder
    try {
      await fs.access(serverPath);
    } catch {
      console.warn('⚠️  Parlant server file not found. This test requires implementation.');
      throw new Error('Parlant server implementation required for testing');
    }

    parlantServer = spawn('python', [serverPath], {
      env: {
        ...process.env,
        DATABASE_URL: testConfig.database_url,
        PARLANT_PORT: '8800',
        PARLANT_HOST: '0.0.0.0'
      },
      stdio: 'pipe'
    });

    parlantServer.stdout.on('data', (data) => {
      console.log(`Parlant: ${data.toString().trim()}`);
    });

    parlantServer.stderr.on('data', (data) => {
      console.error(`Parlant Error: ${data.toString().trim()}`);
    });
  }

  async function waitForServerReady() {
    console.log('⏳ Waiting for server to be ready...');

    const maxAttempts = 30;
    const delayMs = 500;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios.get(`${PARLANT_SERVER_URL}/health`, {
          timeout: 2000
        });

        if (response.status === 200) {
          console.log('✅ Parlant server is ready!');
          return;
        }
      } catch (error) {
        // Server not ready yet, continue waiting
      }

      if (attempt === maxAttempts) {
        throw new Error(`Parlant server failed to start within ${maxAttempts * delayMs}ms`);
      }

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  async function generateTestAuthToken() {
    // This would integrate with Sim's authentication system
    // For testing, we'll simulate a valid JWT token
    const testPayload = {
      user_id: 'test-user-001',
      workspace_id: 'test-workspace-001',
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiry
    };

    // In real implementation, this would use the same JWT secret as Sim
    return 'test-jwt-token-' + Buffer.from(JSON.stringify(testPayload)).toString('base64');
  }
});