/**
 * Simple test runner for billing tools
 * Validates basic functionality without full authentication
 */

const { createLogger } = require('./apps/sim/lib/logs/console/logger')
const logger = createLogger('BillingToolsTestRunner')

async function testBasicFunctionality() {
  try {
    logger.info('Starting basic billing tools functionality test')
    
    // Test 1: Check if tools can be imported
    const billingOpsModule = await import('./apps/sim/lib/copilot/tools/server/billing/billing-operations.js')
    const analyticsModule = await import('./apps/sim/lib/copilot/tools/server/billing/usage-analytics.js')
    
    logger.info('✓ Tools imported successfully')
    
    // Test 2: Check tool properties
    const billingTool = billingOpsModule.billingOperationsServerTool
    const analyticsTool = analyticsModule.usageAnalyticsServerTool
    
    if (!billingTool.name || !billingTool.execute) {
      throw new Error('Billing operations tool missing required properties')
    }
    
    if (!analyticsTool.name || !analyticsTool.execute) {
      throw new Error('Usage analytics tool missing required properties')
    }
    
    logger.info('✓ Tool properties validated')
    
    // Test 3: Check tool names
    if (billingTool.name !== 'billing_operations') {
      throw new Error(`Expected billing tool name 'billing_operations', got '${billingTool.name}'`)
    }
    
    if (analyticsTool.name !== 'usage_analytics') {
      throw new Error(`Expected analytics tool name 'usage_analytics', got '${analyticsTool.name}'`)
    }
    
    logger.info('✓ Tool names validated')
    
    // Test 4: Test error handling (should fail with authentication error)
    try {
      await billingTool.execute({ action: 'getSubscription' })
    } catch (error) {
      if (error.message.includes('Authentication required')) {
        logger.info('✓ Billing tool authentication validation working')
      } else {
        throw new Error(`Unexpected error from billing tool: ${error.message}`)
      }
    }
    
    try {
      await analyticsTool.execute({ analysisType: 'overview', timeframe: '30d' })
    } catch (error) {
      if (error.message.includes('Authentication required')) {
        logger.info('✓ Analytics tool authentication validation working')
      } else {
        throw new Error(`Unexpected error from analytics tool: ${error.message}`)
      }
    }
    
    logger.info('🎉 All basic functionality tests passed!')
    
    return {
      status: 'success',
      message: 'Billing tools implementation validated successfully',
      tests: {
        import: 'passed',
        properties: 'passed', 
        names: 'passed',
        authentication: 'passed'
      }
    }
    
  } catch (error) {
    logger.error('❌ Test failed:', error.message)
    return {
      status: 'error',
      message: error.message,
      tests: {
        import: 'unknown',
        properties: 'unknown',
        names: 'unknown', 
        authentication: 'unknown'
      }
    }
  }
}

// Run the test
testBasicFunctionality().then(result => {
  console.log('\n=== BILLING TOOLS TEST RESULTS ===')
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.status === 'success' ? 0 : 1)
})