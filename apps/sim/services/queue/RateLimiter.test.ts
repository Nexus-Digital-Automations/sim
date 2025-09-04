import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RateLimiter } from '@/services/queue/RateLimiter'
import { MANUAL_EXECUTION_LIMIT, RATE_LIMITS, type UserRateLimit } from '@/services/queue/types'

/**
 * Mock database query chain interfaces for type safety
 */
interface MockSelectQuery {
  from: (table: any) => MockFromQuery
}

interface MockFromQuery {
  where: (condition: any) => MockWhereQuery
}

interface MockWhereQuery {
  limit: (count: number) => Promise<UserRateLimit[]>
}

interface MockInsertQuery {
  values: (values: any) => MockValuesQuery
}

interface MockValuesQuery {
  onConflictDoUpdate: (config: any) => MockOnConflictQuery
}

interface MockOnConflictQuery {
  returning: (fields: any) => Promise<UserRateLimit[]>
}

interface MockDeleteQuery {
  where: (condition: any) => Promise<void>
}

// Mock the database module with proper typing
vi.mock('@/db', () => ({
  db: {
    select: vi.fn() as vi.MockedFunction<() => MockSelectQuery>,
    insert: vi.fn() as vi.MockedFunction<(table: any) => MockInsertQuery>,
    update: vi.fn(),
    delete: vi.fn() as vi.MockedFunction<(table: any) => MockDeleteQuery>,
  },
}))

// Mock drizzle-orm with proper return types
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field: any, value: any) => ({ field, value })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: any[]) => ({
    sql: strings.join('?'),
    values,
  })),
  and: vi.fn((...conditions: any[]) => ({ and: conditions })),
}))

import { db } from '@/db'

describe('RateLimiter', () => {
  const rateLimiter = new RateLimiter()
  const testUserId = 'test-user-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkRateLimit', () => {
    it('should allow unlimited requests for manual trigger type', async () => {
      const result = await rateLimiter.checkRateLimit(testUserId, 'free', 'manual', false)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(MANUAL_EXECUTION_LIMIT)
      expect(result.resetAt).toBeInstanceOf(Date)
      expect(db.select).not.toHaveBeenCalled()
    })

    it('should allow first API request for sync execution', async () => {
      // Mock select query chain with proper typing
      const mockLimit = vi.fn().mockResolvedValue([] as UserRateLimit[])
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })

      vi.mocked(db.select).mockReturnValue({ from: mockFrom })

      // Mock insert query chain with proper typing
      const mockRateLimit: UserRateLimit = {
        id: '1',
        userId: 'test-user-123',
        syncApiRequests: 1,
        asyncApiRequests: 0,
        windowStart: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockReturning = vi.fn().mockResolvedValue([mockRateLimit])
      const mockOnConflictDoUpdate = vi.fn().mockReturnValue({ returning: mockReturning })
      const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate })

      vi.mocked(db.insert).mockReturnValue({ values: mockValues })

      const result = await rateLimiter.checkRateLimit(testUserId, 'free', 'api', false)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(RATE_LIMITS.free.syncApiExecutionsPerMinute - 1)
      expect(result.resetAt).toBeInstanceOf(Date)
    })

    it('should allow first API request for async execution', async () => {
      // Mock select query chain with proper typing
      const mockLimit = vi.fn().mockResolvedValue([] as UserRateLimit[])
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })

      vi.mocked(db.select).mockReturnValue({ from: mockFrom })

      // Mock insert query chain with proper typing
      const mockRateLimit: UserRateLimit = {
        id: '1',
        userId: 'test-user-123',
        syncApiRequests: 0,
        asyncApiRequests: 1,
        windowStart: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockReturning = vi.fn().mockResolvedValue([mockRateLimit])
      const mockOnConflictDoUpdate = vi.fn().mockReturnValue({ returning: mockReturning })
      const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate })

      vi.mocked(db.insert).mockReturnValue({ values: mockValues })

      const result = await rateLimiter.checkRateLimit(testUserId, 'free', 'api', true)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(RATE_LIMITS.free.asyncApiExecutionsPerMinute - 1)
      expect(result.resetAt).toBeInstanceOf(Date)
    })

    it('should work for all trigger types except manual', async () => {
      const triggerTypes = ['api', 'webhook', 'schedule', 'chat'] as const

      for (const triggerType of triggerTypes) {
        // Mock select query chain with proper typing
        const mockLimit = vi.fn().mockResolvedValue([] as UserRateLimit[])
        const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
        const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })

        vi.mocked(db.select).mockReturnValue({ from: mockFrom })

        // Mock insert query chain with proper typing
        const mockRateLimit: UserRateLimit = {
          id: '1',
          userId: 'test-user-123',
          syncApiRequests: 1,
          asyncApiRequests: 0,
          windowStart: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const mockReturning = vi.fn().mockResolvedValue([mockRateLimit])
        const mockOnConflictDoUpdate = vi.fn().mockReturnValue({ returning: mockReturning })
        const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate })

        vi.mocked(db.insert).mockReturnValue({ values: mockValues })

        const result = await rateLimiter.checkRateLimit(testUserId, 'free', triggerType, false)

        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(RATE_LIMITS.free.syncApiExecutionsPerMinute - 1)
      }
    })
  })

  describe('getRateLimitStatus', () => {
    it('should return unlimited for manual trigger type', async () => {
      const status = await rateLimiter.getRateLimitStatus(testUserId, 'free', 'manual', false)

      expect(status.used).toBe(0)
      expect(status.limit).toBe(MANUAL_EXECUTION_LIMIT)
      expect(status.remaining).toBe(MANUAL_EXECUTION_LIMIT)
      expect(status.resetAt).toBeInstanceOf(Date)
    })

    it('should return sync API limits for API trigger type', async () => {
      // Mock select query chain with proper typing
      const mockLimit = vi.fn().mockResolvedValue([] as UserRateLimit[])
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })

      vi.mocked(db.select).mockReturnValue({ from: mockFrom })

      const status = await rateLimiter.getRateLimitStatus(testUserId, 'free', 'api', false)

      expect(status.used).toBe(0)
      expect(status.limit).toBe(RATE_LIMITS.free.syncApiExecutionsPerMinute)
      expect(status.remaining).toBe(RATE_LIMITS.free.syncApiExecutionsPerMinute)
      expect(status.resetAt).toBeInstanceOf(Date)
    })
  })

  describe('resetRateLimit', () => {
    it('should delete rate limit record for user', async () => {
      // Mock delete query chain with proper typing
      const mockWhere = vi.fn().mockResolvedValue(undefined)
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere })

      await rateLimiter.resetRateLimit(testUserId)

      expect(db.delete).toHaveBeenCalled()
    })
  })
})
