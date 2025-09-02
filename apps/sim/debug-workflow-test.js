/**
 * Debug script to understand why workflow API tests are returning 500 errors
 */

import { createEnhancedMockRequest } from './app/api/__test-utils__/enhanced-utils.js'
// Import the modules we need to test
import { GET } from './app/api/workflows/route.js'

// Import mocks
import './app/api/__test-utils__/module-mocks.js'
import { mockControls } from './app/api/__test-utils__/module-mocks.js'

async function debugTest() {
  console.log('🐞 Starting debug test for workflow API')

  try {
    // Reset all mocks
    mockControls.reset()

    // Set authenticated user
    mockControls.setAuthUser({ id: 'user-123', email: 'test@example.com' })

    // Set database results
    const sampleData = [
      {
        id: 'workflow-123',
        name: 'Test Workflow',
        userId: 'user-123',
      },
    ]
    mockControls.setDatabaseResults([sampleData, [{ count: 1 }]])

    console.log('🔧 Mocks configured')

    // Create request
    const request = createEnhancedMockRequest('GET')
    console.log('🔧 Request created')

    // Call the API
    console.log('🚀 Calling GET /api/workflows')
    const response = await GET(request)

    console.log('📊 Response status:', response.status)

    if (response.status !== 200) {
      console.log('❌ Non-200 response, attempting to read error:')
      try {
        const errorData = await response.json()
        console.log('❌ Error data:', errorData)
      } catch (e) {
        console.log('❌ Could not parse response as JSON:', e.message)
        console.log('❌ Response body:', await response.text())
      }
    } else {
      const data = await response.json()
      console.log('✅ Success! Response data:', data)
    }
  } catch (error) {
    console.log('💥 Caught error in debug test:')
    console.log('💥 Error:', error.message)
    console.log('💥 Stack:', error.stack)
  }
}

// Run the debug test
debugTest().catch(console.error)
