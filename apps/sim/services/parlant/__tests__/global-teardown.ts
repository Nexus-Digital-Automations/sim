/**
 * Global teardown for Universal Tool Adapter System Integration Testing
 */

import { writeFile } from 'fs/promises'
import { join } from 'path'

export default async function globalTeardown() {
  console.log(
    '🧹 Global Teardown: Cleaning up Universal Tool Adapter System Integration Testing Environment'
  )

  try {
    // Calculate test session duration
    const endTime = Date.now()
    const startTime = global.testStartTime || endTime
    const duration = endTime - startTime

    // Create test session summary
    const sessionSummary = {
      testSession: {
        id: global.testSessionId || `tool-adapter-integration-${endTime}`,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration: duration,
        durationFormatted: formatDuration(duration),
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        finalMemoryUsage: process.memoryUsage(),
      },
      summary: {
        note: 'Universal Tool Adapter System not yet implemented - tests serve as specification and readiness check',
        expectation: 'All tests should currently fail until adapter system is implemented',
        nextSteps: [
          'Implement Universal Tool Adapter System foundation',
          'Create base adapter patterns and registry',
          'Implement individual tool adapters',
          'Re-run integration tests for validation',
        ],
      },
    }

    // Save session summary
    const reportsDir = join(process.cwd(), 'test-reports')
    const summaryPath = join(reportsDir, 'test-session-summary.json')
    await writeFile(summaryPath, JSON.stringify(sessionSummary, null, 2))
    console.log(`📄 Created test session summary: ${summaryPath}`)

    console.log(`⏱️  Test session duration: ${sessionSummary.testSession.durationFormatted}`)
    console.log('✅ Global teardown complete')
  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    // Don't throw - teardown failures shouldn't break tests
  }
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}
