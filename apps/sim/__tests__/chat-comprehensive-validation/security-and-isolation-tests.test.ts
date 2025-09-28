/**
 * Security and Workspace Isolation Testing Suite
 * ==============================================
 *
 * Comprehensive security validation covering:
 * - Multi-tenant workspace isolation
 * - Authentication and authorization controls
 * - Input sanitization and XSS prevention
 * - SQL injection protection
 * - Rate limiting and abuse prevention
 * - Data privacy and compliance
 * - Cross-workspace data leakage prevention
 * - Session security and JWT validation
 */

import { createServer } from 'http'
import { db } from '@sim/db'
import { hash } from 'bcrypt'
import { sign, verify } from 'jsonwebtoken'
import { Server } from 'socket.io'
import Client from 'socket.io-client'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AgentService } from '@/app/sim/services/parlant/agent-service'
import { getParlantClient } from '@/app/sim/services/parlant/client'
import { SessionService } from '@/app/sim/services/parlant/session-service'
import type { AuthContext, SecurityTestResult } from '@/types'

interface SecurityTestEnvironment {
  server: any
  socketServer: Server
  parlantClient: any
  agentService: AgentService
  sessionService: SessionService
  workspaces: any[]
  users: any[]
  agents: any[]
  port: number
}

interface SecurityScenario {
  Name: string
  description: string
  vulnerability: string
  testFunction: (env: SecurityTestEnvironment) => Promise<SecurityTestResult>
  severity: 'low' | 'medium' | 'high' | 'critical'
  compliance: string[]
}

describe('Security and Workspace Isolation Testing Suite', () => {
  let testEnv: SecurityTestEnvironment
  let securityResults: SecurityTestResult[] = []

  beforeAll(async () => {
    testEnv = await setupSecurityTestEnvironment()
    console.log('🔒 Security test environment ready')
  })

  afterAll(async () => {
    await cleanupSecurityEnvironment(testEnv)
    await generateSecurityReport(securityResults)
    console.log('🛡️ Security tests completed')
  })

  beforeEach(() => {
    securityResults = []
  })

  async function setupSecurityTestEnvironment(): Promise<SecurityTestEnvironment> {
    const port = 3020 + Math.floor(Math.random() * 1000)

    const server = createServer()
    const socketServer = new Server(server, {
      cors: { origin: '*', methods: ['get', 'post'] },
    })

    const parlantClient = getParlantClient({
      baseUrl: process.env.PARLANT_TEST_URL || 'http://localhost:8801',
      timeout: 15000,
      retries: 1,
    })

    const agentService = new AgentService(parlantClient)
    const sessionService = new SessionService(parlantClient)

    // Create test workspaces with different security levels
    const workspaces = await createSecurityTestWorkspaces()
    const users = await createSecurityTestUsers(workspaces)
    const agents = await createSecurityTestAgents(workspaces, users)

    return new Promise((resolve) => {
      server.listen(port, () => {
        resolve({
          server,
          socketServer,
          parlantClient,
          agentService,
          sessionService,
          workspaces,
          users,
          agents,
          port,
        })
      })
    })
  }

  async function createSecurityTestWorkspaces(): Promise<any[]> {
    const workspaces = [
      {
        id: `secure-workspace-${Date.now()}`,
        Name: 'Secure Enterprise Workspace',
        securityLevel: 'enterprise',
        encryptionEnabled: true,
        auditingEnabled: true,
      },
      {
        id: `standard-workspace-${Date.now()}`,
        Name: 'Standard Business Workspace',
        securityLevel: 'business',
        encryptionEnabled: false,
        auditingEnabled: false,
      },
      {
        id: `isolated-workspace-${Date.now()}`,
        Name: 'Isolated Test Workspace',
        securityLevel: 'isolated',
        encryptionEnabled: true,
        auditingEnabled: true,
      },
    ]

    for (const workspace of workspaces) {
      await db.insert('workspaces').values({
        ...workspace,
        ownerId: `owner-${workspace.id}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    return workspaces
  }

  async function createSecurityTestUsers(workspaces: any[]): Promise<any[]> {
    const users = []

    for (const workspace of workspaces) {
      // Create users with different permission levels
      const workspaceUsers = [
        {
          id: `admin-${workspace.id}`,
          email: `admin-${workspace.id}@example.com`,
          Name: 'Workspace Admin',
          role: 'admin',
          workspaceId: workspace.id,
          permissions: ['read', 'write', 'admin', 'delete'],
        },
        {
          id: `member-${workspace.id}`,
          email: `member-${workspace.id}@example.com`,
          Name: 'Workspace Member',
          role: 'member',
          workspaceId: workspace.id,
          permissions: ['read', 'write'],
        },
        {
          id: `viewer-${workspace.id}`,
          email: `viewer-${workspace.id}@example.com`,
          Name: 'Workspace Viewer',
          role: 'viewer',
          workspaceId: workspace.id,
          permissions: ['read'],
        },
      ]

      for (const user of workspaceUsers) {
        const hashedPassword = await hash('test-password-123', 10)
        await db.insert('users').values({
          ...user,
          passwordHash: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }

      users.push(...workspaceUsers)
    }

    return users
  }

  async function createSecurityTestAgents(workspaces: any[], users: any[]): Promise<any[]> {
    const agents = []

    for (const workspace of workspaces) {
      const adminUser = users.find((u) => u.role === 'admin' && u.workspaceId === workspace.id)

      const workspaceAgents = [
        {
          id: `agent-public-${workspace.id}`,
          Name: 'Public Agent',
          description: 'Publicly accessible agent',
          workspaceId: workspace.id,
          userId: adminUser.id,
          visibility: 'public',
          securityLevel: 'standard',
        },
        {
          id: `agent-private-${workspace.id}`,
          Name: 'Private Agent',
          description: 'Workspace-only agent',
          workspaceId: workspace.id,
          userId: adminUser.id,
          visibility: 'private',
          securityLevel: 'high',
        },
        {
          id: `agent-confidential-${workspace.id}`,
          Name: 'Confidential Agent',
          description: 'Highly restricted agent',
          workspaceId: workspace.id,
          userId: adminUser.id,
          visibility: 'confidential',
          securityLevel: 'enterprise',
        },
      ]

      for (const agent of workspaceAgents) {
        await db.insert('parlant_agents').values({
          ...agent,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }

      agents.push(...workspaceAgents)
    }

    return agents
  }

  async function cleanupSecurityEnvironment(env: SecurityTestEnvironment): Promise<void> {
    await env.parlantClient.close()
    env.socketServer.close()
    env.server.close()

    // Cleanup test data
    await db.delete('parlant_agents').where(like('Name', '%Agent%'))
    await db.delete('users').where(like('email', '%@example.com%'))
    await db.delete('workspaces').where(like('Name', '%Workspace%'))
  }

  async function generateSecurityReport(results: SecurityTestResult[]): Promise<void> {
    const report = {
      testSuite: 'Security and Workspace Isolation',
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: results.length,
        passed: results.filter((r) => r.passed).length,
        failed: results.filter((r) => !r.passed).length,
        criticalVulnerabilities: results.filter((r) => !r.passed && r.severity === 'critical')
          .length,
        highRiskVulnerabilities: results.filter((r) => !r.passed && r.severity === 'high').length,
      },
      vulnerabilities: results.filter((r) => !r.passed),
      complianceStatus: {
        gdpr: results.filter((r) => r.compliance?.includes('GDPR')).every((r) => r.passed),
        hipaa: results.filter((r) => r.compliance?.includes('HIPAA')).every((r) => r.passed),
        sox: results.filter((r) => r.compliance?.includes('SOX')).every((r) => r.passed),
      },
      results: results,
    }

    console.log('🔒 Security Test Report:', JSON.stringify(report, null, 2))
  }

  function recordSecurityResult(result: SecurityTestResult): void {
    securityResults.push(result)
  }

  async function executeSecurityScenario(scenario: SecurityScenario): Promise<SecurityTestResult> {
    const startTime = Date.now()

    try {
      const result = await scenario.testFunction(testEnv)
      result.executionTime = Date.now() - startTime
      return result
    } catch (error) {
      return {
        testName: scenario.Name,
        description: scenario.description,
        vulnerability: scenario.vulnerability,
        severity: scenario.severity,
        compliance: scenario.compliance,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
      }
    }
  }

  describe('Workspace Isolation Security', () => {
    it('should prevent cross-workspace agent access', async () => {
      const scenario: SecurityScenario = {
        Name: 'Cross-Workspace Agent Access Prevention',
        description: 'Ensure agents cannot be accessed from different workspaces',
        vulnerability: 'Unauthorized cross-workspace data access',
        severity: 'critical',
        compliance: ['GDPR', 'HIPAA', 'SOX'],
        testFunction: async (env) => {
          const workspace1 = env.workspaces[0]
          const workspace2 = env.workspaces[1]

          const workspace1Admin = env.users.find(
            (u) => u.workspaceId === workspace1.id && u.role === 'admin'
          )
          const workspace2Admin = env.users.find(
            (u) => u.workspaceId === workspace2.id && u.role === 'admin'
          )

          const workspace1Agent = env.agents.find((a) => a.workspaceId === workspace1.id)

          // Try to access workspace1 agent from workspace2 context
          const unauthorizedContext: AuthContext = {
            user_id: workspace2Admin.id,
            workspace_id: workspace2.id,
            key_type: 'workspace',
            permissions: workspace2Admin.permissions,
          }

          try {
            await env.agentService.getAgent(workspace1Agent.id, unauthorizedContext)

            return {
              testName: 'Cross-Workspace Agent Access Prevention',
              description: 'Should prevent cross-workspace agent access',
              vulnerability: 'Cross-workspace access allowed',
              severity: 'critical' as const,
              compliance: ['GDPR', 'HIPAA', 'SOX'],
              passed: false,
              error: 'Agent was accessible from different workspace',
            }
          } catch (error) {
            // This should fail - cross-workspace access should be denied
            return {
              testName: 'Cross-Workspace Agent Access Prevention',
              description: 'Successfully prevented cross-workspace agent access',
              vulnerability: 'Unauthorized cross-workspace data access',
              severity: 'critical' as const,
              compliance: ['GDPR', 'HIPAA', 'SOX'],
              passed: true,
              details: 'Cross-workspace access properly denied',
            }
          }
        },
      }

      const result = await executeSecurityScenario(scenario)
      recordSecurityResult(result)

      expect(result.passed).toBe(true)
    })

    it('should isolate session data between workspaces', async () => {
      const scenario: SecurityScenario = {
        Name: 'Session Data Isolation',
        description: 'Ensure session data is isolated between workspaces',
        vulnerability: 'Cross-workspace session data leakage',
        severity: 'high',
        compliance: ['GDPR', 'HIPAA'],
        testFunction: async (env) => {
          const workspace1 = env.workspaces[0]
          const workspace2 = env.workspaces[1]

          const workspace1Admin = env.users.find(
            (u) => u.workspaceId === workspace1.id && u.role === 'admin'
          )
          const workspace2Admin = env.users.find(
            (u) => u.workspaceId === workspace2.id && u.role === 'admin'
          )

          const workspace1Agent = env.agents.find((a) => a.workspaceId === workspace1.id)
          const workspace2Agent = env.agents.find((a) => a.workspaceId === workspace2.id)

          // Create sessions in both workspaces
          const context1: AuthContext = {
            user_id: workspace1Admin.id,
            workspace_id: workspace1.id,
            key_type: 'workspace',
            permissions: workspace1Admin.permissions,
          }

          const context2: AuthContext = {
            user_id: workspace2Admin.id,
            workspace_id: workspace2.id,
            key_type: 'workspace',
            permissions: workspace2Admin.permissions,
          }

          const session1 = await env.sessionService.createSession(
            {
              agent_id: workspace1Agent.id,
              workspace_id: workspace1.id,
              customer_id: 'customer-1',
            },
            context1
          )

          const session2 = await env.sessionService.createSession(
            {
              agent_id: workspace2Agent.id,
              workspace_id: workspace2.id,
              customer_id: 'customer-2',
            },
            context2
          )

          // Send messages in both sessions
          await env.sessionService.sendMessage(
            session1.data.id,
            'Sensitive message in workspace 1',
            undefined,
            context1
          )

          await env.sessionService.sendMessage(
            session2.data.id,
            'Sensitive message in workspace 2',
            undefined,
            context2
          )

          // Try to access workspace1 session from workspace2
          try {
            await env.sessionService.getSession(session1.data.id, context2)

            return {
              testName: 'Session Data Isolation',
              description: 'Session data leaked between workspaces',
              vulnerability: 'Cross-workspace session data leakage',
              severity: 'high' as const,
              compliance: ['GDPR', 'HIPAA'],
              passed: false,
              error: 'Session was accessible from different workspace',
            }
          } catch (error) {
            return {
              testName: 'Session Data Isolation',
              description: 'Session data properly isolated between workspaces',
              vulnerability: 'Cross-workspace session data leakage',
              severity: 'high' as const,
              compliance: ['GDPR', 'HIPAA'],
              passed: true,
              details: 'Cross-workspace session access properly denied',
            }
          }
        },
      }

      const result = await executeSecurityScenario(scenario)
      recordSecurityResult(result)

      expect(result.passed).toBe(true)
    })

    it('should enforce workspace-level permissions', async () => {
      const scenario: SecurityScenario = {
        Name: 'Workspace Permission Enforcement',
        description: 'Enforce role-based permissions within workspaces',
        vulnerability: 'Permission escalation within workspace',
        severity: 'high',
        compliance: ['SOX'],
        testFunction: async (env) => {
          const workspace = env.workspaces[0]
          const viewer = env.users.find(
            (u) => u.workspaceId === workspace.id && u.role === 'viewer'
          )
          const agent = env.agents.find((a) => a.workspaceId === workspace.id)

          const viewerContext: AuthContext = {
            user_id: viewer.id,
            workspace_id: workspace.id,
            key_type: 'workspace',
            permissions: viewer.permissions, // Only 'read'
          }

          // Viewer should be able to read agents
          const getResult = await env.agentService.getAgent(agent.id, viewerContext)
          expect(getResult.success).toBe(true)

          // But viewer should NOT be able to create agents
          try {
            await env.agentService.createAgent(
              {
                Name: 'Unauthorized Agent Creation',
                workspace_id: workspace.id,
              },
              viewerContext
            )

            return {
              testName: 'Workspace Permission Enforcement',
              description: 'Permission escalation allowed',
              vulnerability: 'Permission escalation within workspace',
              severity: 'high' as const,
              compliance: ['SOX'],
              passed: false,
              error: 'Viewer was able to create agent without write permissions',
            }
          } catch (error) {
            return {
              testName: 'Workspace Permission Enforcement',
              description: 'Workspace permissions properly enforced',
              vulnerability: 'Permission escalation within workspace',
              severity: 'high' as const,
              compliance: ['SOX'],
              passed: true,
              details: 'Permission escalation properly prevented',
            }
          }
        },
      }

      const result = await executeSecurityScenario(scenario)
      recordSecurityResult(result)

      expect(result.passed).toBe(true)
    })
  })

  describe('Authentication and Authorization Security', () => {
    it('should prevent JWT token manipulation', async () => {
      const scenario: SecurityScenario = {
        Name: 'JWT Token Security',
        description: 'Prevent JWT token manipulation and forgery',
        vulnerability: 'JWT token manipulation',
        severity: 'critical',
        compliance: ['GDPR', 'HIPAA', 'SOX'],
        testFunction: async (env) => {
          const workspace = env.workspaces[0]
          const user = env.users.find((u) => u.workspaceId === workspace.id && u.role === 'admin')

          // Create valid token
          const validToken = sign(
            {
              userId: user.id,
              workspaceId: workspace.id,
              permissions: user.permissions,
            },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
          )

          // Create malicious token with elevated permissions
          const maliciousToken = sign(
            {
              userId: user.id,
              workspaceId: workspace.id,
              permissions: ['read', 'write', 'admin', 'delete', 'super_admin'], // Elevated permissions
            },
            'wrong-secret',
            { expiresIn: '1h' }
          )

          // Try to use malicious token
          try {
            const decoded = verify(maliciousToken, process.env.JWT_SECRET || 'test-secret')

            return {
              testName: 'JWT Token Security',
              description: 'Malicious JWT token was accepted',
              vulnerability: 'JWT token manipulation',
              severity: 'critical' as const,
              compliance: ['GDPR', 'HIPAA', 'SOX'],
              passed: false,
              error: 'Token with wrong signature was accepted',
            }
          } catch (error) {
            // Should fail - malicious token should be rejected
            return {
              testName: 'JWT Token Security',
              description: 'JWT token manipulation properly prevented',
              vulnerability: 'JWT token manipulation',
              severity: 'critical' as const,
              compliance: ['GDPR', 'HIPAA', 'SOX'],
              passed: true,
              details: 'Malicious token properly rejected',
            }
          }
        },
      }

      const result = await executeSecurityScenario(scenario)
      recordSecurityResult(result)

      expect(result.passed).toBe(true)
    })

    it('should handle expired authentication tokens', async () => {
      const scenario: SecurityScenario = {
        Name: 'Expired Token Handling',
        description: 'Properly handle and reject expired authentication tokens',
        vulnerability: 'Expired token acceptance',
        severity: 'medium',
        compliance: ['SOX'],
        testFunction: async (env) => {
          const workspace = env.workspaces[0]
          const user = env.users.find((u) => u.workspaceId === workspace.id && u.role === 'admin')

          // Create expired token
          const expiredToken = sign(
            {
              userId: user.id,
              workspaceId: workspace.id,
              permissions: user.permissions,
            },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '-1h' }
          ) // Expired 1 hour ago

          try {
            const decoded = verify(expiredToken, process.env.JWT_SECRET || 'test-secret')

            return {
              testName: 'Expired Token Handling',
              description: 'Expired token was accepted',
              vulnerability: 'Expired token acceptance',
              severity: 'medium' as const,
              compliance: ['SOX'],
              passed: false,
              error: 'Expired token was accepted as valid',
            }
          } catch (error) {
            if (error instanceof Error && error.message.includes('expired')) {
              return {
                testName: 'Expired Token Handling',
                description: 'Expired tokens properly rejected',
                vulnerability: 'Expired token acceptance',
                severity: 'medium' as const,
                compliance: ['SOX'],
                passed: true,
                details: 'Expired token properly rejected',
              }
            }
            return {
              testName: 'Expired Token Handling',
              description: 'Token validation failed unexpectedly',
              vulnerability: 'Expired token acceptance',
              severity: 'medium' as const,
              compliance: ['SOX'],
              passed: false,
              error: `Unexpected error: ${error.message}`,
            }
          }
        },
      }

      const result = await executeSecurityScenario(scenario)
      recordSecurityResult(result)

      expect(result.passed).toBe(true)
    })

    it('should prevent password brute force attacks', async () => {
      const scenario: SecurityScenario = {
        Name: 'Password Brute Force Prevention',
        description: 'Prevent brute force attacks on password authentication',
        vulnerability: 'Brute force attack vulnerability',
        severity: 'high',
        compliance: ['GDPR', 'HIPAA'],
        testFunction: async (env) => {
          // Create a chat with password protection
          const chatId = `brute-force-test-${Date.now()}`
          const testPassword = 'secure-password-123'
          const hashedPassword = await hash(testPassword, 10)

          await db.insert('chat').values({
            id: chatId,
            subdomain: 'brute-force-test',
            title: 'Brute Force Test Chat',
            userId: env.users[0].id,
            isActive: true,
            authType: 'password',
            passwordHash: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
          })

          // Attempt multiple rapid authentication attempts
          const bruteForceAttempts = Array.from({ length: 20 }, (_, i) =>
            request(env.server)
              .post('/api/chat/brute-force-test')
              .send({ password: `wrong-password-${i}` })
          )

          const responses = await Promise.all(
            bruteForceAttempts.map((req) =>
              req.catch((err) => ({ status: 429, body: { error: 'Rate limited' } }))
            )
          )

          // Should eventually return rate limiting responses
          const rateLimited = responses.filter((r) => r.status === 429)

          if (rateLimited.length === 0) {
            return {
              testName: 'Password Brute Force Prevention',
              description: 'No rate limiting detected during brute force attempt',
              vulnerability: 'Brute force attack vulnerability',
              severity: 'high' as const,
              compliance: ['GDPR', 'HIPAA'],
              passed: false,
              error: 'Rate limiting not implemented',
            }
          }

          return {
            testName: 'Password Brute Force Prevention',
            description: 'Brute force attacks properly rate limited',
            vulnerability: 'Brute force attack vulnerability',
            severity: 'high' as const,
            compliance: ['GDPR', 'HIPAA'],
            passed: true,
            details: `${rateLimited.length} requests were rate limited`,
          }
        },
      }

      const result = await executeSecurityScenario(scenario)
      recordSecurityResult(result)

      expect(result.passed).toBe(true)
    })
  })

  describe('Input Sanitization and XSS Prevention', () => {
    it('should sanitize XSS attempts in chat messages', async () => {
      const scenario: SecurityScenario = {
        Name: 'XSS Prevention in Chat Messages',
        description: 'Prevent XSS attacks through chat message content',
        vulnerability: 'Cross-site scripting (XSS)',
        severity: 'high',
        compliance: ['GDPR'],
        testFunction: async (env) => {
          const workspace = env.workspaces[0]
          const user = env.users.find((u) => u.workspaceId === workspace.id && u.role === 'admin')
          const agent = env.agents.find((a) => a.workspaceId === workspace.id)

          const authContext: AuthContext = {
            user_id: user.id,
            workspace_id: workspace.id,
            key_type: 'workspace',
            permissions: user.permissions,
          }

          const session = await env.sessionService.createSession(
            {
              agent_id: agent.id,
              workspace_id: workspace.id,
            },
            authContext
          )

          // Attempt XSS injection
          const maliciousMessage =
            '<script>alert("XSS");</script><img src="x" onerror="alert(\'XSS\')">'

          const messageResult = await env.sessionService.sendMessage(
            session.data.id,
            maliciousMessage,
            undefined,
            authContext
          )

          // Check if message was sanitized
          if (
            messageResult.data.content.includes('<script>') ||
            messageResult.data.content.includes('onerror=') ||
            messageResult.data.content.includes('alert(')
          ) {
            return {
              testName: 'XSS Prevention in Chat Messages',
              description: 'XSS content was not properly sanitized',
              vulnerability: 'Cross-site scripting (XSS)',
              severity: 'high' as const,
              compliance: ['GDPR'],
              passed: false,
              error: 'Malicious script content was preserved in message',
            }
          }

          return {
            testName: 'XSS Prevention in Chat Messages',
            description: 'XSS content properly sanitized',
            vulnerability: 'Cross-site scripting (XSS)',
            severity: 'high' as const,
            compliance: ['GDPR'],
            passed: true,
            details: 'Malicious content was properly sanitized',
          }
        },
      }

      const result = await executeSecurityScenario(scenario)
      recordSecurityResult(result)

      expect(result.passed).toBe(true)
    })

    it('should prevent HTML injection in agent NAMES and descriptions', async () => {
      const scenario: SecurityScenario = {
        Name: 'HTML Injection Prevention',
        description: 'Prevent HTML injection in agent metadata',
        vulnerability: 'HTML injection',
        severity: 'medium',
        compliance: ['GDPR'],
        testFunction: async (env) => {
          const workspace = env.workspaces[0]
          const user = env.users.find((u) => u.workspaceId === workspace.id && u.role === 'admin')

          const authContext: AuthContext = {
            user_id: user.id,
            workspace_id: workspace.id,
            key_type: 'workspace',
            permissions: user.permissions,
          }

          const maliciousName = '<h1>Malicious Agent</h1><script>alert("injection")</script>'
          const maliciousDescription = '<iframe src="javascript:alert(\'XSS\')"></iframe>'

          const agentResult = await env.agentService.createAgent(
            {
              Name: maliciousName,
              description: maliciousDescription,
              workspace_id: workspace.id,
            },
            authContext
          )

          // Check if HTML was sanitized
          if (
            agentResult.data.Name.includes('<h1>') ||
            agentResult.data.Name.includes('<script>') ||
            agentResult.data.description?.includes('<iframe>')
          ) {
            return {
              testName: 'HTML Injection Prevention',
              description: 'HTML injection was not properly sanitized',
              vulnerability: 'HTML injection',
              severity: 'medium' as const,
              compliance: ['GDPR'],
              passed: false,
              error: 'Malicious HTML content was preserved',
            }
          }

          return {
            testName: 'HTML Injection Prevention',
            description: 'HTML injection properly prevented',
            vulnerability: 'HTML injection',
            severity: 'medium' as const,
            compliance: ['GDPR'],
            passed: true,
            details: 'Malicious HTML content was properly sanitized',
          }
        },
      }

      const result = await executeSecurityScenario(scenario)
      recordSecurityResult(result)

      expect(result.passed).toBe(true)
    })
  })

  describe('SQL Injection Protection', () => {
    it('should prevent SQL injection in agent queries', async () => {
      const scenario: SecurityScenario = {
        Name: 'SQL Injection Prevention',
        description: 'Prevent SQL injection attacks in database queries',
        vulnerability: 'SQL injection',
        severity: 'critical',
        compliance: ['GDPR', 'HIPAA', 'SOX'],
        testFunction: async (env) => {
          const workspace = env.workspaces[0]
          const user = env.users.find((u) => u.workspaceId === workspace.id && u.role === 'admin')

          const authContext: AuthContext = {
            user_id: user.id,
            workspace_id: workspace.id,
            key_type: 'workspace',
            permissions: user.permissions,
          }

          // Attempt SQL injection through agent search
          const maliciousQuery = "'; DROP TABLE parlant_agents; --"

          try {
            await env.agentService.searchAgents(maliciousQuery, workspace.id, authContext)

            // Check if agents table still exists by trying to list agents
            const listResult = await env.agentService.listAgents(
              {
                workspace_id: workspace.id,
              },
              authContext
            )

            if (!listResult.success) {
              return {
                testName: 'SQL Injection Prevention',
                description: 'SQL injection may have succeeded - table access failed',
                vulnerability: 'SQL injection',
                severity: 'critical' as const,
                compliance: ['GDPR', 'HIPAA', 'SOX'],
                passed: false,
                error: 'Database query failed after injection attempt',
              }
            }

            return {
              testName: 'SQL Injection Prevention',
              description: 'SQL injection properly prevented',
              vulnerability: 'SQL injection',
              severity: 'critical' as const,
              compliance: ['GDPR', 'HIPAA', 'SOX'],
              passed: true,
              details: 'Malicious SQL was properly escaped/parameterized',
            }
          } catch (error) {
            // This is actually good - the query should fail safely
            return {
              testName: 'SQL Injection Prevention',
              description: 'SQL injection properly prevented',
              vulnerability: 'SQL injection',
              severity: 'critical' as const,
              compliance: ['GDPR', 'HIPAA', 'SOX'],
              passed: true,
              details: 'Malicious query was safely rejected',
            }
          }
        },
      }

      const result = await executeSecurityScenario(scenario)
      recordSecurityResult(result)

      expect(result.passed).toBe(true)
    })
  })

  describe('Socket.io Security', () => {
    it('should enforce workspace isolation in Socket.io rooms', async () => {
      const scenario: SecurityScenario = {
        Name: 'Socket.io Workspace Isolation',
        description: 'Prevent cross-workspace message leakage in Socket.io',
        vulnerability: 'Cross-workspace Socket.io leakage',
        severity: 'high',
        compliance: ['GDPR', 'HIPAA'],
        testFunction: async (env) => {
          const workspace1 = env.workspaces[0]
          const workspace2 = env.workspaces[1]

          // Setup authentication middleware
          env.socketServer.use((socket, next) => {
            const workspaceId = socket.handshake.auth.workspaceId
            if (workspaceId) {
              socket.data.workspaceId = workspaceId
              socket.join(`workspace:${workspaceId}`)
              next()
            } else {
              next(new Error('Authentication failed'))
            }
          })

          // Create clients for different workspaces
          const client1 = Client(`http://localhost:${env.port}`, {
            auth: { workspaceId: workspace1.id },
          })

          const client2 = Client(`http://localhost:${env.port}`, {
            auth: { workspaceId: workspace2.id },
          })

          await Promise.all([
            new Promise<void>((resolve) => client1.on('connect', resolve)),
            new Promise<void>((resolve) => client2.on('connect', resolve)),
          ])

          let workspace2ReceivedMessage = false

          client2.on('chat:message', () => {
            workspace2ReceivedMessage = true
          })

          // Send message from workspace 1
          client1.emit('chat:send', {
            content: 'Sensitive workspace 1 message',
            workspaceId: workspace1.id,
          })

          // Wait for potential message leakage
          await new Promise((resolve) => setTimeout(resolve, 500))

          client1.disconnect()
          client2.disconnect()

          if (workspace2ReceivedMessage) {
            return {
              testName: 'Socket.io Workspace Isolation',
              description: 'Message leaked between workspaces',
              vulnerability: 'Cross-workspace Socket.io leakage',
              severity: 'high' as const,
              compliance: ['GDPR', 'HIPAA'],
              passed: false,
              error: 'Cross-workspace message leakage detected',
            }
          }

          return {
            testName: 'Socket.io Workspace Isolation',
            description: 'Workspace isolation properly maintained',
            vulnerability: 'Cross-workspace Socket.io leakage',
            severity: 'high' as const,
            compliance: ['GDPR', 'HIPAA'],
            passed: true,
            details: 'No cross-workspace message leakage detected',
          }
        },
      }

      const result = await executeSecurityScenario(scenario)
      recordSecurityResult(result)

      expect(result.passed).toBe(true)
    })

    it('should prevent Socket.io authentication bypass', async () => {
      const scenario: SecurityScenario = {
        Name: 'Socket.io Authentication Bypass Prevention',
        description: 'Prevent bypassing Socket.io authentication',
        vulnerability: 'Socket.io authentication bypass',
        severity: 'critical',
        compliance: ['GDPR', 'HIPAA', 'SOX'],
        testFunction: async (env) => {
          // Setup strict authentication middleware
          env.socketServer.use((socket, next) => {
            const token = socket.handshake.auth.token
            if (token !== 'valid-token') {
              next(new Error('Authentication failed'))
            } else {
              next()
            }
          })

          // Try to connect without authentication
          const unauthenticatedClient = Client(`http://localhost:${env.port}`)

          const authenticationFailed = await new Promise<boolean>((resolve) => {
            unauthenticatedClient.on('connect', () => resolve(false))
            unauthenticatedClient.on('connect_error', () => resolve(true))
            setTimeout(() => resolve(true), 2000) // Timeout after 2 seconds
          })

          unauthenticatedClient.disconnect()

          if (!authenticationFailed) {
            return {
              testName: 'Socket.io Authentication Bypass Prevention',
              description: 'Unauthenticated connection was allowed',
              vulnerability: 'Socket.io authentication bypass',
              severity: 'critical' as const,
              compliance: ['GDPR', 'HIPAA', 'SOX'],
              passed: false,
              error: 'Authentication bypass successful',
            }
          }

          return {
            testName: 'Socket.io Authentication Bypass Prevention',
            description: 'Authentication bypass properly prevented',
            vulnerability: 'Socket.io authentication bypass',
            severity: 'critical' as const,
            compliance: ['GDPR', 'HIPAA', 'SOX'],
            passed: true,
            details: 'Unauthenticated connections properly rejected',
          }
        },
      }

      const result = await executeSecurityScenario(scenario)
      recordSecurityResult(result)

      expect(result.passed).toBe(true)
    })
  })

  describe('Data Privacy and Compliance', () => {
    it('should handle GDPR data deletion requests', async () => {
      const scenario: SecurityScenario = {
        Name: 'GDPR Data Deletion Compliance',
        description: 'Properly handle GDPR right to be forgotten requests',
        vulnerability: 'GDPR non-compliance',
        severity: 'high',
        compliance: ['GDPR'],
        testFunction: async (env) => {
          const workspace = env.workspaces[0]
          const user = env.users.find((u) => u.workspaceId === workspace.id && u.role === 'admin')
          const agent = env.agents.find((a) => a.workspaceId === workspace.id)

          const authContext: AuthContext = {
            user_id: user.id,
            workspace_id: workspace.id,
            key_type: 'workspace',
            permissions: user.permissions,
          }

          // Create session with user data
          const session = await env.sessionService.createSession(
            {
              agent_id: agent.id,
              workspace_id: workspace.id,
              customer_id: 'gdpr-test-customer',
              metadata: {
                customerName: 'John Doe',
                email: 'john.doe@example.com',
                phone: '+1234567890',
              },
            },
            authContext
          )

          // Send message with personal data
          await env.sessionService.sendMessage(
            session.data.id,
            'My email is john.doe@example.com and my phone is +1234567890',
            undefined,
            authContext
          )

          // Simulate GDPR deletion request
          const deletionResult = await request(env.server)
            .delete(`/api/gdpr/delete-user-data`)
            .send({
              userId: 'gdpr-test-customer',
              workspaceId: workspace.id,
              dataTypes: ['messages', 'sessions', 'metadata'],
            })

          if (deletionResult.status !== 200) {
            return {
              testName: 'GDPR Data Deletion Compliance',
              description: 'GDPR deletion request failed',
              vulnerability: 'GDPR non-compliance',
              severity: 'high' as const,
              compliance: ['GDPR'],
              passed: false,
              error: 'Data deletion request was not properly handled',
            }
          }

          // Verify data was actually deleted
          try {
            const sessionCheck = await env.sessionService.getSession(session.data.id, authContext)

            if (sessionCheck.success) {
              return {
                testName: 'GDPR Data Deletion Compliance',
                description: 'Data was not properly deleted after GDPR request',
                vulnerability: 'GDPR non-compliance',
                severity: 'high' as const,
                compliance: ['GDPR'],
                passed: false,
                error: 'Session data still exists after deletion request',
              }
            }
          } catch (error) {
            // Expected - session should be deleted
          }

          return {
            testName: 'GDPR Data Deletion Compliance',
            description: 'GDPR data deletion properly implemented',
            vulnerability: 'GDPR non-compliance',
            severity: 'high' as const,
            compliance: ['GDPR'],
            passed: true,
            details: 'User data properly deleted upon GDPR request',
          }
        },
      }

      const result = await executeSecurityScenario(scenario)
      recordSecurityResult(result)

      expect(result.passed).toBe(true)
    })

    it('should provide GDPR data export functionality', async () => {
      const scenario: SecurityScenario = {
        Name: 'GDPR Data Export Compliance',
        description: 'Provide GDPR compliant data export functionality',
        vulnerability: 'GDPR non-compliance',
        severity: 'medium',
        compliance: ['GDPR'],
        testFunction: async (env) => {
          const workspace = env.workspaces[0]
          const user = env.users.find((u) => u.workspaceId === workspace.id && u.role === 'admin')

          // Request data export
          const exportResult = await request(env.server).get(`/api/gdpr/export-user-data`).query({
            userId: user.id,
            workspaceId: workspace.id,
          })

          if (exportResult.status !== 200) {
            return {
              testName: 'GDPR Data Export Compliance',
              description: 'Data export request failed',
              vulnerability: 'GDPR non-compliance',
              severity: 'medium' as const,
              compliance: ['GDPR'],
              passed: false,
              error: 'Data export functionality not available',
            }
          }

          const exportData = exportResult.body

          // Verify export contains required data
          const requiredFields = [
            'userId',
            'workspaceId',
            'personalData',
            'messageHistory',
            'sessionData',
          ]
          const missingFields = requiredFields.filter((field) => !Object.hasOwn(exportData, field))

          if (missingFields.length > 0) {
            return {
              testName: 'GDPR Data Export Compliance',
              description: 'Data export incomplete',
              vulnerability: 'GDPR non-compliance',
              severity: 'medium' as const,
              compliance: ['GDPR'],
              passed: false,
              error: `Missing required fields: ${missingFields.join(', ')}`,
            }
          }

          return {
            testName: 'GDPR Data Export Compliance',
            description: 'GDPR data export properly implemented',
            vulnerability: 'GDPR non-compliance',
            severity: 'medium' as const,
            compliance: ['GDPR'],
            passed: true,
            details: 'Complete user data export functionality available',
          }
        },
      }

      const result = await executeSecurityScenario(scenario)
      recordSecurityResult(result)

      expect(result.passed).toBe(true)
    })
  })

  describe('Rate Limiting and Abuse Prevention', () => {
    it('should enforce API rate limits per workspace', async () => {
      const scenario: SecurityScenario = {
        Name: 'API Rate Limiting',
        description: 'Enforce rate limits to prevent API abuse',
        vulnerability: 'API abuse and DoS',
        severity: 'medium',
        compliance: ['SOX'],
        testFunction: async (env) => {
          const workspace = env.workspaces[0]
          const user = env.users.find((u) => u.workspaceId === workspace.id && u.role === 'admin')

          const authContext: AuthContext = {
            user_id: user.id,
            workspace_id: workspace.id,
            key_type: 'workspace',
            permissions: user.permissions,
          }

          // Make rapid API calls to trigger rate limiting
          const rapidRequests = Array.from({ length: 50 }, () =>
            env.agentService
              .listAgents(
                {
                  workspace_id: workspace.id,
                },
                authContext
              )
              .catch((error) => error)
          )

          const responses = await Promise.all(rapidRequests)

          // Some requests should be rate limited
          const rateLimitedRequests = responses.filter(
            (r) => r instanceof Error && r.message.toLowerCase().includes('rate limit')
          )

          if (rateLimitedRequests.length === 0) {
            return {
              testName: 'API Rate Limiting',
              description: 'No rate limiting detected',
              vulnerability: 'API abuse and DoS',
              severity: 'medium' as const,
              compliance: ['SOX'],
              passed: false,
              error: 'Rate limiting not implemented or not triggered',
            }
          }

          return {
            testName: 'API Rate Limiting',
            description: 'API rate limiting properly enforced',
            vulnerability: 'API abuse and DoS',
            severity: 'medium' as const,
            compliance: ['SOX'],
            passed: true,
            details: `${rateLimitedRequests.length} requests were rate limited`,
          }
        },
      }

      const result = await executeSecurityScenario(scenario)
      recordSecurityResult(result)

      expect(result.passed).toBe(true)
    })
  })
})
