/**
 * Nexus Tools Test Utilities
 * 
 * Comprehensive testing utilities for Nexus tools including mocks,
 * fixtures, and helper functions for unit and integration testing.
 * 
 * FEATURES:
 * - Mock operation contexts and user sessions
 * - Sample workflow data and fixtures
 * - Database mocking utilities
 * - Performance testing helpers
 * - Error scenario generators
 */

import { nanoid } from 'nanoid';
import type { NexusOperationContext } from '../base-nexus-tool';

/**
 * Mock user data for testing
 */
export interface MockUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

/**
 * Mock workspace data for testing
 */
export interface MockWorkspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
}

/**
 * Mock workflow data for testing
 */
export interface MockWorkflow {
  id: string;
  name: string;
  description: string | null;
  color: string;
  userId: string;
  workspaceId: string;
  folderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSynced: Date;
  isDeployed: boolean;
  deployedAt: Date | null;
  deployedState: any;
  pinnedApiKey: string | null;
  collaborators: string[];
  runCount: number;
  lastRunAt: Date | null;
  variables: Record<string, any>;
  isPublished: boolean;
  marketplaceData: any;
}

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: nanoid(),
    email: `test-${nanoid(8)}@example.com`,
    name: `Test User ${nanoid(4)}`,
    createdAt: new Date(),
    ...overrides
  };
}

/**
 * Create a mock workspace for testing
 */
export function createMockWorkspace(overrides: Partial<MockWorkspace> = {}): MockWorkspace {
  return {
    id: nanoid(),
    name: `Test Workspace ${nanoid(4)}`,
    ownerId: nanoid(),
    createdAt: new Date(),
    ...overrides
  };
}

/**
 * Create a mock workflow for testing
 */
export function createMockWorkflow(overrides: Partial<MockWorkflow> = {}): MockWorkflow {
  const now = new Date();
  
  return {
    id: nanoid(),
    name: `Test Workflow ${nanoid(4)}`,
    description: `Test workflow description ${nanoid(6)}`,
    color: '#3972F6',
    userId: nanoid(),
    workspaceId: nanoid(),
    folderId: null,
    createdAt: now,
    updatedAt: now,
    lastSynced: now,
    isDeployed: false,
    deployedAt: null,
    deployedState: null,
    pinnedApiKey: null,
    collaborators: [],
    runCount: 0,
    lastRunAt: null,
    variables: {},
    isPublished: false,
    marketplaceData: null,
    ...overrides
  };
}

/**
 * Create a mock Nexus operation context
 */
export function createMockNexusContext(overrides: Partial<NexusOperationContext> = {}): NexusOperationContext {
  return {
    operationId: `test-${nanoid()}`,
    userId: nanoid(),
    toolName: 'TestTool',
    startTime: Date.now(),
    metadata: {},
    ...overrides
  };
}

/**
 * Create mock session data
 */
export function createMockSession(user?: Partial<MockUser>) {
  const mockUser = createMockUser(user);
  
  return {
    user: mockUser,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    sessionToken: `session_${nanoid(32)}`
  };
}

/**
 * Database query result mock helpers
 */
export class MockDatabaseResult<T> {
  private data: T[];
  
  constructor(data: T[] = []) {
    this.data = data;
  }
  
  /**
   * Simulate a SELECT query result
   */
  select(fields?: any) {
    return this;
  }
  
  /**
   * Simulate a WHERE clause
   */
  where(condition: any) {
    return this;
  }
  
  /**
   * Simulate an ORDER BY clause
   */
  orderBy(...fields: any[]) {
    return this;
  }
  
  /**
   * Simulate a LIMIT clause
   */
  limit(count: number) {
    return {
      ...this,
      data: this.data.slice(0, count)
    };
  }
  
  /**
   * Simulate an OFFSET clause
   */
  offset(count: number) {
    return {
      ...this,
      data: this.data.slice(count)
    };
  }
  
  /**
   * Return the mock data (simulates await)
   */
  then(callback: (data: T[]) => any) {
    return Promise.resolve(callback(this.data));
  }
  
  /**
   * Get raw data
   */
  getData(): T[] {
    return this.data;
  }
}

/**
 * Create mock database with common operations
 */
export function createMockDatabase() {
  const workflows: MockWorkflow[] = [];
  const users: MockUser[] = [];
  const workspaces: MockWorkspace[] = [];
  
  return {
    // Add test data
    addWorkflow(workflow: MockWorkflow) {
      workflows.push(workflow);
      return workflow;
    },
    
    addUser(user: MockUser) {
      users.push(user);
      return user;
    },
    
    addWorkspace(workspace: MockWorkspace) {
      workspaces.push(workspace);
      return workspace;
    },
    
    // Mock queries
    select: (from: string) => {
      switch (from) {
        case 'workflow':
          return new MockDatabaseResult(workflows);
        case 'user':
          return new MockDatabaseResult(users);
        case 'workspace':
          return new MockDatabaseResult(workspaces);
        default:
          return new MockDatabaseResult([]);
      }
    },
    
    insert: (into: string) => ({
      values: (data: any) => ({
        returning: () => Promise.resolve([data])
      })
    }),
    
    update: (table: string) => ({
      set: (data: any) => ({
        where: (condition: any) => ({
          returning: () => {
            const updated = { ...data, updatedAt: new Date() };
            return Promise.resolve([updated]);
          }
        })
      })
    }),
    
    delete: (from: string) => ({
      where: (condition: any) => Promise.resolve({ deletedCount: 1 })
    })
  };
}

/**
 * Performance testing utilities
 */
export class PerformanceTestHelper {
  private startTime: number = 0;
  private endTime: number = 0;
  
  start() {
    this.startTime = performance.now();
  }
  
  end() {
    this.endTime = performance.now();
    return this.endTime - this.startTime;
  }
  
  static async measureAsync<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    return { result, duration };
  }
}

/**
 * Error scenario generators for testing
 */
export class ErrorScenarioGenerator {
  /**
   * Generate authentication error scenarios
   */
  static authErrors() {
    return [
      { type: 'no-session', message: 'Authentication required' },
      { type: 'expired-session', message: 'Session expired' },
      { type: 'invalid-token', message: 'Invalid authentication token' }
    ];
  }
  
  /**
   * Generate permission error scenarios
   */
  static permissionErrors() {
    return [
      { type: 'access-denied', message: 'Access denied: You do not have permission to perform this action' },
      { type: 'workflow-not-found', message: 'Workflow not found' },
      { type: 'workspace-access-denied', message: 'Access denied: You do not have access to this workspace' }
    ];
  }
  
  /**
   * Generate validation error scenarios
   */
  static validationErrors() {
    return [
      { type: 'invalid-input', message: 'Invalid input data provided' },
      { type: 'missing-required-field', message: 'Required field is missing' },
      { type: 'invalid-format', message: 'Data format is invalid' }
    ];
  }
  
  /**
   * Generate database error scenarios
   */
  static databaseErrors() {
    return [
      { type: 'connection-error', message: 'Database connection failed' },
      { type: 'query-timeout', message: 'Database query timeout' },
      { type: 'constraint-violation', message: 'Database constraint violation' }
    ];
  }
}

/**
 * Test assertion helpers
 */
export class NexusTestAssertions {
  /**
   * Assert that a response is a success response
   */
  static assertSuccess<T>(response: any): asserts response is { status: 'success'; data: T; metadata: any } {
    if (response.status !== 'success') {
      throw new Error(`Expected success response, got: ${response.status} - ${response.message}`);
    }
  }
  
  /**
   * Assert that a response is an error response
   */
  static assertError(response: any): asserts response is { status: 'error'; message: string; metadata: any } {
    if (response.status !== 'error') {
      throw new Error(`Expected error response, got: ${response.status}`);
    }
  }
  
  /**
   * Assert workflow data structure
   */
  static assertWorkflowStructure(workflow: any) {
    const requiredFields = ['id', 'name', 'createdAt', 'updatedAt'];
    
    for (const field of requiredFields) {
      if (!(field in workflow)) {
        throw new Error(`Missing required field in workflow: ${field}`);
      }
    }
  }
  
  /**
   * Assert performance metrics are within acceptable bounds
   */
  static assertPerformance(duration: number, maxMs: number) {
    if (duration > maxMs) {
      throw new Error(`Performance assertion failed: ${duration}ms > ${maxMs}ms`);
    }
  }
}

/**
 * Integration test helpers
 */
export class IntegrationTestHelper {
  private mockDatabase: ReturnType<typeof createMockDatabase>;
  
  constructor() {
    this.mockDatabase = createMockDatabase();
  }
  
  /**
   * Setup test environment with sample data
   */
  async setupTestEnvironment() {
    // Create test users
    const user1 = this.mockDatabase.addUser(createMockUser({ 
      email: 'test1@example.com',
      name: 'Test User 1' 
    }));
    
    const user2 = this.mockDatabase.addUser(createMockUser({ 
      email: 'test2@example.com',
      name: 'Test User 2' 
    }));
    
    // Create test workspace
    const workspace = this.mockDatabase.addWorkspace(createMockWorkspace({ 
      name: 'Test Workspace',
      ownerId: user1.id 
    }));
    
    // Create test workflows
    const workflow1 = this.mockDatabase.addWorkflow(createMockWorkflow({
      name: 'Test Workflow 1',
      userId: user1.id,
      workspaceId: workspace.id
    }));
    
    const workflow2 = this.mockDatabase.addWorkflow(createMockWorkflow({
      name: 'Test Workflow 2',
      userId: user2.id,
      workspaceId: workspace.id,
      collaborators: [user1.id]
    }));
    
    return {
      users: [user1, user2],
      workspace,
      workflows: [workflow1, workflow2],
      database: this.mockDatabase
    };
  }
  
  /**
   * Cleanup test environment
   */
  async cleanup() {
    // In a real implementation, this would clean up test data
    // For now, just reset the mock database
    this.mockDatabase = createMockDatabase();
  }
}