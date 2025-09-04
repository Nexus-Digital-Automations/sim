/**
 * List Workflows Tool - Comprehensive Test Suite
 *
 * Tests all aspects of the List Workflows tool including:
 * - Input validation and sanitization
 * - Authentication and authorization
 * - Database query optimization
 * - Filtering and sorting logic
 * - Pagination handling
 * - Error scenarios and edge cases
 * - Performance benchmarks
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type createMockDatabase,
  createMockSession,
  createMockUser,
  createMockWorkflow,
  IntegrationTestHelper,
  NexusTestAssertions,
  PerformanceTestHelper,
} from './__test-utils__'
import { listWorkflows } from './list-workflows'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/db', () => ({
  db: {},
}))

vi.mock('@/db/schema', () => ({
  workflow: {},
  workflowFolder: {},
}))

describe('ListWorkflows Tool', () => {
  let integrationHelper: IntegrationTestHelper
  let mockDatabase: ReturnType<typeof createMockDatabase>
  let testEnvironment: any

  beforeEach(async () => {
    integrationHelper = new IntegrationTestHelper()
    testEnvironment = await integrationHelper.setupTestEnvironment()
    mockDatabase = testEnvironment.database

    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await integrationHelper.cleanup()
  })

  describe('Input Validation', () => {
    it('should validate required workspaceId parameter', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(createMockSession())

      const result = await listWorkflows.execute(
        {
          workspaceId: 'test-workspace-id',
          limit: 10,
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      NexusTestAssertions.assertError(result)
      expect(result.message).toContain('workspaceId')
    })

    it('should validate pagination parameters', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(createMockSession())

      const result = await listWorkflows.execute(
        {
          workspaceId: testEnvironment.workspace.id,
          limit: -1, // Invalid limit
          offset: -5, // Invalid offset
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      NexusTestAssertions.assertError(result)
      expect(result.message).toContain('Invalid input')
    })

    it('should validate enum values for status and sortBy', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(createMockSession())

      const result = await listWorkflows.execute(
        {
          workspaceId: testEnvironment.workspace.id,
          // @ts-expect-error - Testing invalid enum value
          status: 'invalid-status',
          // @ts-expect-error - Testing invalid enum value
          sortBy: 'invalid-sort',
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      NexusTestAssertions.assertError(result)
      expect(result.message).toContain('Invalid input')
    })

    it('should apply default values for optional parameters', async () => {
      const user = testEnvironment.users[0]
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(createMockSession(user))

      // Mock database to track query parameters
      const mockSelect = vi.fn().mockReturnValue(
        {
          where: vi.fn().mockReturnValue(
            {
              orderBy: vi.fn().mockReturnValue(
                {
                  limit: vi.fn().mockReturnValue(
                    {
                      offset: vi.fn().mockResolvedValue([]),
                    },
                    {
                      toolCallId: 'test-call-id',
                      messages: [],
                    }
                  ),
                },
                {
                  toolCallId: 'test-call-id',
                  messages: [],
                }
              ),
            },
            {
              toolCallId: 'test-call-id',
              messages: [],
            }
          ),
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      const { db } = await import('@/db')
      vi.mocked(db).select = mockSelect

      await listWorkflows.execute(
        {
          workspaceId: testEnvironment.workspace.id,
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      // Verify default values were applied
      expect(mockSelect).toHaveBeenCalled()
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const result = await listWorkflows.execute(
        {
          workspaceId: testEnvironment.workspace.id,
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      NexusTestAssertions.assertError(result)
      expect(result.message).toContain('Authentication required')
    })

    it('should validate user has access to workspace', async () => {
      const unauthorizedUser = createMockUser()
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(createMockSession(unauthorizedUser))

      // Mock database to return empty results for unauthorized access
      const { db } = await import('@/db')
      vi.mocked(db).select = vi.fn().mockReturnValue(
        {
          where: vi.fn().mockReturnValue(
            {
              orderBy: vi.fn().mockReturnValue(
                {
                  limit: vi.fn().mockReturnValue(
                    {
                      offset: vi.fn().mockResolvedValue([]),
                    },
                    {
                      toolCallId: 'test-call-id',
                      messages: [],
                    }
                  ),
                },
                {
                  toolCallId: 'test-call-id',
                  messages: [],
                }
              ),
            },
            {
              toolCallId: 'test-call-id',
              messages: [],
            }
          ),
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      const result = await listWorkflows.execute(
        {
          workspaceId: testEnvironment.workspace.id,
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      NexusTestAssertions.assertSuccess(result)
      expect(result.data.workflows).toHaveLength(0)
    })

    it('should return workflows for authorized user', async () => {
      const user = testEnvironment.users[0]
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(createMockSession(user))

      // Mock database to return user's workflows
      const userWorkflows = testEnvironment.workflows.filter(
        (w: any) => w.userId === user.id || w.collaborators.includes(user.id)
      )

      const { db } = await import('@/db')
      vi.mocked(db).select = vi.fn().mockReturnValue(
        {
          where: vi.fn().mockReturnValue(
            {
              orderBy: vi.fn().mockReturnValue(
                {
                  limit: vi.fn().mockReturnValue(
                    {
                      offset: vi.fn().mockResolvedValue(userWorkflows),
                    },
                    {
                      toolCallId: 'test-call-id',
                      messages: [],
                    }
                  ),
                },
                {
                  toolCallId: 'test-call-id',
                  messages: [],
                }
              ),
            },
            {
              toolCallId: 'test-call-id',
              messages: [],
            }
          ),
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      const result = await listWorkflows.execute(
        {
          workspaceId: testEnvironment.workspace.id,
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      NexusTestAssertions.assertSuccess(result)
      expect(result.data.workflows.length).toBeGreaterThan(0)
    })
  })

  describe('Filtering and Sorting', () => {
    beforeEach(() => {
      const user = testEnvironment.users[0]
      const { getSession } = vi.mocked(import('@/lib/auth'))
      getSession.mockResolvedValue(createMockSession(user))
    })

    it('should filter workflows by status', async () => {
      const publishedWorkflows = [
        createMockWorkflow({ isPublished: true, userId: testEnvironment.users[0].id }),
        createMockWorkflow({ isPublished: true, userId: testEnvironment.users[0].id }),
      ]

      const { db } = await import('@/db')
      vi.mocked(db).select = vi.fn().mockReturnValue(
        {
          where: vi.fn().mockReturnValue(
            {
              orderBy: vi.fn().mockReturnValue(
                {
                  limit: vi.fn().mockReturnValue(
                    {
                      offset: vi.fn().mockResolvedValue(publishedWorkflows),
                    },
                    {
                      toolCallId: 'test-call-id',
                      messages: [],
                    }
                  ),
                },
                {
                  toolCallId: 'test-call-id',
                  messages: [],
                }
              ),
            },
            {
              toolCallId: 'test-call-id',
              messages: [],
            }
          ),
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      const result = await listWorkflows.execute(
        {
          workspaceId: testEnvironment.workspace.id,
          status: 'published',
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      NexusTestAssertions.assertSuccess(result)
      expect(result.data.workflows).toHaveLength(2)
      expect(result.data.workflows.every((w) => w.isPublished)).toBe(true)
    })

    it('should filter workflows by folder', async () => {
      const folderId = 'test-folder-123'
      const folderWorkflows = [
        createMockWorkflow({ folderId, userId: testEnvironment.users[0].id }),
      ]

      const { db } = await import('@/db')
      vi.mocked(db).select = vi.fn().mockReturnValue(
        {
          where: vi.fn().mockReturnValue(
            {
              orderBy: vi.fn().mockReturnValue(
                {
                  limit: vi.fn().mockReturnValue(
                    {
                      offset: vi.fn().mockResolvedValue(folderWorkflows),
                    },
                    {
                      toolCallId: 'test-call-id',
                      messages: [],
                    }
                  ),
                },
                {
                  toolCallId: 'test-call-id',
                  messages: [],
                }
              ),
            },
            {
              toolCallId: 'test-call-id',
              messages: [],
            }
          ),
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      const result = await listWorkflows.execute(
        {
          workspaceId: testEnvironment.workspace.id,
          folderId,
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      NexusTestAssertions.assertSuccess(result)
      expect(result.data.workflows[0].folder?.id).toBe(folderId)
    })

    it('should search workflows by name and description', async () => {
      const searchTerm = 'automation'
      const matchingWorkflows = [
        createMockWorkflow(
          {
            name: 'Automation Workflow',
            userId: testEnvironment.users[0].id,
          },
          {
            toolCallId: 'test-call-id',
            messages: [],
          }
        ),
        createMockWorkflow(
          {
            description: 'Workflow for automation tasks',
            userId: testEnvironment.users[0].id,
          },
          {
            toolCallId: 'test-call-id',
            messages: [],
          }
        ),
      ]

      const { db } = await import('@/db')
      vi.mocked(db).select = vi.fn().mockReturnValue(
        {
          where: vi.fn().mockReturnValue(
            {
              orderBy: vi.fn().mockReturnValue(
                {
                  limit: vi.fn().mockReturnValue(
                    {
                      offset: vi.fn().mockResolvedValue(matchingWorkflows),
                    },
                    {
                      toolCallId: 'test-call-id',
                      messages: [],
                    }
                  ),
                },
                {
                  toolCallId: 'test-call-id',
                  messages: [],
                }
              ),
            },
            {
              toolCallId: 'test-call-id',
              messages: [],
            }
          ),
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      const result = await listWorkflows.execute(
        {
          workspaceId: testEnvironment.workspace.id,
          searchTerm,
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      NexusTestAssertions.assertSuccess(result)
      expect(result.data.workflows).toHaveLength(2)
    })

    it('should sort workflows by different criteria', async () => {
      const workflows = [
        createMockWorkflow(
          {
            name: 'A Workflow',
            createdAt: new Date('2024-01-01'),
            userId: testEnvironment.users[0].id,
          },
          {
            toolCallId: 'test-call-id',
            messages: [],
          }
        ),
        createMockWorkflow(
          {
            name: 'B Workflow',
            createdAt: new Date('2024-01-02'),
            userId: testEnvironment.users[0].id,
          },
          {
            toolCallId: 'test-call-id',
            messages: [],
          }
        ),
      ]

      const { db } = await import('@/db')
      vi.mocked(db).select = vi.fn().mockReturnValue(
        {
          where: vi.fn().mockReturnValue(
            {
              orderBy: vi.fn().mockReturnValue(
                {
                  limit: vi.fn().mockReturnValue(
                    {
                      offset: vi.fn().mockResolvedValue(workflows),
                    },
                    {
                      toolCallId: 'test-call-id',
                      messages: [],
                    }
                  ),
                },
                {
                  toolCallId: 'test-call-id',
                  messages: [],
                }
              ),
            },
            {
              toolCallId: 'test-call-id',
              messages: [],
            }
          ),
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      const result = await listWorkflows.execute(
        {
          workspaceId: testEnvironment.workspace.id,
          sortBy: 'name',
          sortOrder: 'asc',
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      NexusTestAssertions.assertSuccess(result)
      expect(result.data.workflows[0].name).toBe('A Workflow')
    })
  })

  describe('Pagination', () => {
    it('should handle pagination correctly', async () => {
      const user = testEnvironment.users[0]
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(createMockSession(user))

      const workflows = Array.from({ length: 25 }, (_, i) =>
        createMockWorkflow(
          {
            name: `Workflow ${i}`,
            userId: user.id,
          },
          {
            toolCallId: 'test-call-id',
            messages: [],
          }
        )
      )

      const { db } = await import('@/db')
      vi.mocked(db).select = vi.fn().mockReturnValueOnce(
        {
          where: vi.fn().mockReturnValue(
            {
              orderBy: vi.fn().mockReturnValue(
                {
                  limit: vi.fn().mockReturnValue(
                    {
                      offset: vi.fn().mockResolvedValue(workflows.slice(0, 10)),
                    },
                    {
                      toolCallId: 'test-call-id',
                      messages: [],
                    }
                  ),
                },
                {
                  toolCallId: 'test-call-id',
                  messages: [],
                }
              ),
            },
            {
              toolCallId: 'test-call-id',
              messages: [],
            }
          ),
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      const result = await listWorkflows.execute(
        {
          workspaceId: testEnvironment.workspace.id,
          limit: 10,
          offset: 0,
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      NexusTestAssertions.assertSuccess(result)
      expect(result.data.workflows).toHaveLength(10)
      expect(result.data.pagination.limit).toBe(10)
      expect(result.data.pagination.offset).toBe(0)
      expect(result.data.pagination.hasMore).toBe(true)
    })

    it('should calculate total count correctly', async () => {
      const user = testEnvironment.users[0]
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(createMockSession(user))

      const totalWorkflows = 15
      const currentPage = Array.from({ length: 10 }, (_, i) =>
        createMockWorkflow({ userId: user.id })
      )

      const { db } = await import('@/db')

      // Mock the count query
      vi.mocked(db).select = vi
        .fn()
        .mockReturnValueOnce(
          {
            where: vi.fn().mockResolvedValue([{ count: totalWorkflows }]),
          },
          {
            toolCallId: 'test-call-id',
            messages: [],
          }
        )
        .mockReturnValueOnce(
          {
            where: vi.fn().mockReturnValue(
              {
                orderBy: vi.fn().mockReturnValue(
                  {
                    limit: vi.fn().mockReturnValue(
                      {
                        offset: vi.fn().mockResolvedValue(currentPage),
                      },
                      {
                        toolCallId: 'test-call-id',
                        messages: [],
                      }
                    ),
                  },
                  {
                    toolCallId: 'test-call-id',
                    messages: [],
                  }
                ),
              },
              {
                toolCallId: 'test-call-id',
                messages: [],
              }
            ),
          },
          {
            toolCallId: 'test-call-id',
            messages: [],
          }
        )

      const result = await listWorkflows.execute(
        {
          workspaceId: testEnvironment.workspace.id,
          limit: 10,
          offset: 0,
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      NexusTestAssertions.assertSuccess(result)
      expect(result.data.pagination.total).toBe(totalWorkflows)
    })
  })

  describe('Performance', () => {
    it('should complete within acceptable time limits', async () => {
      const user = testEnvironment.users[0]
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(createMockSession(user))

      const { db } = await import('@/db')
      vi.mocked(db).select = vi.fn().mockReturnValue(
        {
          where: vi.fn().mockReturnValue(
            {
              orderBy: vi.fn().mockReturnValue(
                {
                  limit: vi.fn().mockReturnValue(
                    {
                      offset: vi.fn().mockResolvedValue([]),
                    },
                    {
                      toolCallId: 'test-call-id',
                      messages: [],
                    }
                  ),
                },
                {
                  toolCallId: 'test-call-id',
                  messages: [],
                }
              ),
            },
            {
              toolCallId: 'test-call-id',
              messages: [],
            }
          ),
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      const { result, duration } = await PerformanceTestHelper.measureAsync(() =>
        listWorkflows.execute(
          {
            workspaceId: testEnvironment.workspace.id,
          },
          {
            toolCallId: 'test-call-id',
            messages: [],
          }
        )
      )

      NexusTestAssertions.assertSuccess(result)
      NexusTestAssertions.assertPerformance(duration, 1000) // Should complete within 1 second
    })

    it('should handle large result sets efficiently', async () => {
      const user = testEnvironment.users[0]
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(createMockSession(user))

      // Mock large dataset
      const largeWorkflowSet = Array.from({ length: 1000 }, (_, i) =>
        createMockWorkflow({ name: `Workflow ${i}`, userId: user.id })
      )

      const { db } = await import('@/db')
      vi.mocked(db).select = vi.fn().mockReturnValue(
        {
          where: vi.fn().mockReturnValue(
            {
              orderBy: vi.fn().mockReturnValue(
                {
                  limit: vi.fn().mockReturnValue(
                    {
                      offset: vi.fn().mockResolvedValue(largeWorkflowSet.slice(0, 50)),
                    },
                    {
                      toolCallId: 'test-call-id',
                      messages: [],
                    }
                  ),
                },
                {
                  toolCallId: 'test-call-id',
                  messages: [],
                }
              ),
            },
            {
              toolCallId: 'test-call-id',
              messages: [],
            }
          ),
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      const { result, duration } = await PerformanceTestHelper.measureAsync(() =>
        listWorkflows.execute(
          {
            workspaceId: testEnvironment.workspace.id,
            limit: 50,
          },
          {
            toolCallId: 'test-call-id',
            messages: [],
          }
        )
      )

      NexusTestAssertions.assertSuccess(result)
      expect(result.data.workflows).toHaveLength(50)
      NexusTestAssertions.assertPerformance(duration, 500) // Should handle large sets efficiently
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const user = testEnvironment.users[0]
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(createMockSession(user))

      const { db } = await import('@/db')
      vi.mocked(db).select = vi.fn().mockImplementation(
        () => {
          throw new Error('Database connection failed')
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      const result = await listWorkflows.execute(
        {
          workspaceId: testEnvironment.workspace.id,
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      NexusTestAssertions.assertError(result)
      expect(result.message).toContain('Database connection failed')
      expect(result.metadata.operationId).toBeDefined()
    })

    it('should handle malformed database responses', async () => {
      const user = testEnvironment.users[0]
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(createMockSession(user))

      const { db } = await import('@/db')
      vi.mocked(db).select = vi.fn().mockReturnValue(
        {
          where: vi.fn().mockReturnValue(
            {
              orderBy: vi.fn().mockReturnValue(
                {
                  limit: vi.fn().mockReturnValue(
                    {
                      offset: vi.fn().mockResolvedValue([
                        { id: 'test', name: null }, // Missing required fields
                      ]),
                    },
                    {
                      toolCallId: 'test-call-id',
                      messages: [],
                    }
                  ),
                },
                {
                  toolCallId: 'test-call-id',
                  messages: [],
                }
              ),
            },
            {
              toolCallId: 'test-call-id',
              messages: [],
            }
          ),
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      const result = await listWorkflows.execute(
        {
          workspaceId: testEnvironment.workspace.id,
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      // Should handle gracefully and return what it can
      NexusTestAssertions.assertSuccess(result)
    })

    it('should include comprehensive error context', async () => {
      const user = testEnvironment.users[0]
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(createMockSession(user))

      const { db } = await import('@/db')
      const testError = new Error('Test database error')
      vi.mocked(db).select = vi.fn().mockImplementation(
        () => {
          throw testError
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      const result = await listWorkflows.execute(
        {
          workspaceId: testEnvironment.workspace.id,
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      NexusTestAssertions.assertError(result)
      expect(result.metadata).toHaveProperty('operationId')
      expect(result.metadata).toHaveProperty('timestamp')
      expect(result.metadata).toHaveProperty('executionTimeMs')
    })
  })

  describe('Response Structure', () => {
    it('should return properly structured success response', async () => {
      const user = testEnvironment.users[0]
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(createMockSession(user))

      const mockWorkflows = [createMockWorkflow({ userId: user.id })]

      const { db } = await import('@/db')
      vi.mocked(db).select = vi
        .fn()
        .mockReturnValueOnce(
          {
            where: vi.fn().mockResolvedValue([{ count: 1 }]),
          },
          {
            toolCallId: 'test-call-id',
            messages: [],
          }
        )
        .mockReturnValueOnce(
          {
            where: vi.fn().mockReturnValue(
              {
                orderBy: vi.fn().mockReturnValue(
                  {
                    limit: vi.fn().mockReturnValue(
                      {
                        offset: vi.fn().mockResolvedValue(mockWorkflows),
                      },
                      {
                        toolCallId: 'test-call-id',
                        messages: [],
                      }
                    ),
                  },
                  {
                    toolCallId: 'test-call-id',
                    messages: [],
                  }
                ),
              },
              {
                toolCallId: 'test-call-id',
                messages: [],
              }
            ),
          },
          {
            toolCallId: 'test-call-id',
            messages: [],
          }
        )

      const result = await listWorkflows.execute(
        {
          workspaceId: testEnvironment.workspace.id,
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      NexusTestAssertions.assertSuccess(result)

      // Verify response structure
      expect(result.data).toHaveProperty('workflows')
      expect(result.data).toHaveProperty('pagination')
      expect(result.data).toHaveProperty('filters')
      expect(result.data).toHaveProperty('performance')

      expect(result.data.pagination).toHaveProperty('limit')
      expect(result.data.pagination).toHaveProperty('offset')
      expect(result.data.pagination).toHaveProperty('total')
      expect(result.data.pagination).toHaveProperty('hasMore')

      expect(result.metadata).toHaveProperty('operationId')
      expect(result.metadata).toHaveProperty('timestamp')
      expect(result.metadata).toHaveProperty('executionTimeMs')
    })

    it('should include proper workflow data structure', async () => {
      const user = testEnvironment.users[0]
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(createMockSession(user))

      const mockWorkflow = createMockWorkflow({ userId: user.id })

      const { db } = await import('@/db')
      vi.mocked(db).select = vi
        .fn()
        .mockReturnValueOnce(
          {
            where: vi.fn().mockResolvedValue([{ count: 1 }]),
          },
          {
            toolCallId: 'test-call-id',
            messages: [],
          }
        )
        .mockReturnValueOnce(
          {
            where: vi.fn().mockReturnValue(
              {
                orderBy: vi.fn().mockReturnValue(
                  {
                    limit: vi.fn().mockReturnValue(
                      {
                        offset: vi.fn().mockResolvedValue([mockWorkflow]),
                      },
                      {
                        toolCallId: 'test-call-id',
                        messages: [],
                      }
                    ),
                  },
                  {
                    toolCallId: 'test-call-id',
                    messages: [],
                  }
                ),
              },
              {
                toolCallId: 'test-call-id',
                messages: [],
              }
            ),
          },
          {
            toolCallId: 'test-call-id',
            messages: [],
          }
        )

      const result = await listWorkflows.execute(
        {
          workspaceId: testEnvironment.workspace.id,
        },
        {
          toolCallId: 'test-call-id',
          messages: [],
        }
      )

      NexusTestAssertions.assertSuccess(result)

      const workflow = result.data.workflows[0]
      NexusTestAssertions.assertWorkflowStructure(workflow)

      expect(workflow).toHaveProperty('id')
      expect(workflow).toHaveProperty('name')
      expect(workflow).toHaveProperty('description')
      expect(workflow).toHaveProperty('color')
      expect(workflow).toHaveProperty('createdAt')
      expect(workflow).toHaveProperty('updatedAt')
    })
  })
})
