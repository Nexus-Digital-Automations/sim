/**
 * Global setup for Universal Tool Adapter System Integration Testing
 */

import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

export default async function globalSetup() {
  console.log(
    '🔧 Global Setup: Preparing Universal Tool Adapter System Integration Testing Environment'
  )

  try {
    // Create test reports directory
    const reportsDir = join(process.cwd(), 'test-reports')
    await mkdir(reportsDir, { recursive: true })
    console.log(`📁 Created test reports directory: ${reportsDir}`)

    // Create test metadata file
    const testMetadata = {
      testSession: {
        id: `tool-adapter-integration-${Date.now()}`,
        startTime: new Date().toISOString(),
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          memoryUsage: process.memoryUsage(),
        },
        configuration: {
          maxTimeout: 300000,
          maxWorkers: 1,
          testEnvironment: 'node',
        },
      },
    }

    const metadataPath = join(reportsDir, 'test-session-metadata.json')
    await writeFile(metadataPath, JSON.stringify(testMetadata, null, 2))
    console.log(`📄 Created test metadata: ${metadataPath}`)

    // Environment validation
    const requiredEnvVars = []
    const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar])

    if (missingEnvVars.length > 0) {
      console.warn(`⚠️  Missing environment variables: ${missingEnvVars.join(', ')}`)
    }

    // Set global test configuration
    global.testSessionId = testMetadata.testSession.id
    global.testStartTime = Date.now()

    console.log('✅ Global setup complete')
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  }
}
