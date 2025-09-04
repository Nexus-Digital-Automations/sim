import { beforeEach, describe, expect, it } from 'vitest'

// Import mocks first
import '@/app/api/__test-utils__/module-mocks'
import { eq } from 'drizzle-orm'
import { mockControls } from '@/app/api/__test-utils__/module-mocks'
// Import modules that should be mocked
import { db } from '@/db'
import { subscription } from '@/db/schema'

describe('Database Mock Debug', () => {
  beforeEach(() => {
    mockControls.reset()
  })

  it('should test database mock directly', async () => {
    console.log('🧪 Testing database mock directly')

    // Setup mock data
    const testSubscription = {
      id: 'sub-123',
      plan: 'pro',
      referenceId: 'user-123',
      status: 'active',
    }

    mockControls.setDatabaseResults([
      [testSubscription], // First query result
    ])

    console.log('🔧 Mock database results set')

    try {
      console.log('🔍 Attempting database query...')

      const result = await db
        .select()
        .from(subscription)
        .where(eq(subscription.id, 'sub-123'))
        .then((rows) => {
          console.log('🔍 Database then() callback called with:', rows?.length, 'rows')
          return rows[0]
        })

      console.log('✅ Query result:', result)
      expect(result).toBeDefined()
      expect(result.id).toBe('sub-123')
    } catch (error) {
      console.error('🚫 Database query error:', error)
      throw error
    }
  })
})
