// Simple debug test to understand the import issue
import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import '@/app/api/__test-utils__/module-mocks'

describe('Debug Route Import', () => {
  it('should be able to import the route', async () => {
    try {
      console.log('Attempting to import route...')
      const routeModule = await import('./route')
      console.log('Route module keys:', Object.keys(routeModule))
      console.log('POST function:', typeof routeModule.POST)

      expect(routeModule.POST).toBeDefined()
      expect(typeof routeModule.POST).toBe('function')
    } catch (error) {
      console.error('Import failed:', error)
      throw error
    }
  })

  it('should be able to call POST function', async () => {
    try {
      const routeModule = await import('./route')
      const { POST } = routeModule

      const mockRequest = new NextRequest('http://localhost:3000/api/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: '/test/path.txt' })
      })

      console.log('Calling POST function...')
      const result = await POST(mockRequest)
      console.log('POST result:', result)
      console.log('Result type:', typeof result)
      console.log('Result constructor:', result?.constructor?.name)

      expect(result).toBeDefined()
    } catch (error) {
      console.error('POST call failed:', error)
      throw error
    }
  })
})
