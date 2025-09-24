/**
 * Jest Global Setup
 * =================
 *
 * Runs once before all test suites
 */

export default async function globalSetup() {
  console.log('🧪 Starting Conversational Workflows test suite...')

  // Set up test environment variables
  process.env.NODE_ENV = 'test'
  process.env.SOCKET_URL = 'http://localhost:3001'

  // Mock external service endpoints for tests
  process.env.PARLANT_API_URL = 'http://localhost:3002'
  process.env.PARLANT_API_KEY = 'test_key'

  // Database setup for tests (if needed)
  // This would connect to test database and run migrations
  console.log('🔧 Test environment configured')

  // Start any required test services
  // This could include starting a test Socket.io server
  console.log('📡 Test services initialized')

  console.log('✅ Global test setup completed')
}
