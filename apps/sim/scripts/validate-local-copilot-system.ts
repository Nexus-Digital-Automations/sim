/**
 * Local Copilot System Validation Script
 *
 * Comprehensive validation script that tests all components of the local
 * Parlant copilot system including store, API endpoints, tool integration,
 * UI components, and mode switching functionality.
 */

import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('LocalCopilotValidation')

interface ValidationResult {
  component: string
  passed: boolean
  message: string
  duration: number
  error?: Error
}

interface ValidationSuite {
  Name: string
  results: ValidationResult[]
  passed: number
  failed: number
  totalDuration: number
}

class LocalCopilotValidator {
  private results: ValidationSuite[] = []

  /**
   * Run complete validation suite
   */
  async validate(): Promise<boolean> {
    logger.info('🚀 Starting Local Copilot System Validation')

    const suites = [
      { Name: 'Store System', validator: this.validateStore },
      { Name: 'API Endpoints', validator: this.validateAPI },
      { Name: 'Tool Integration', validator: this.validateToolIntegration },
      { Name: 'UI Components', validator: this.validateUIComponents },
      { Name: 'Mode Switching', validator: this.validateModeSwitching },
    ]

    for (const suite of suites) {
      await this.runSuite(suite.Name, suite.validator.bind(this))
    }

    this.generateReport()
    return this.isAllValid()
  }

  /**
   * Run a validation suite
   */
  private async runSuite(
    Name: string,
    validator: () => Promise<ValidationResult[]>
  ): Promise<void> {
    logger.info(`📋 Running ${Name} validation`)
    const startTime = Date.now()

    try {
      const results = await validator()
      const suite: ValidationSuite = {
        Name,
        results,
        passed: results.filter((r) => r.passed).length,
        failed: results.filter((r) => !r.passed).length,
        totalDuration: Date.now() - startTime,
      }

      this.results.push(suite)

      if (suite.failed === 0) {
        logger.info(`✅ ${Name} validation passed (${suite.passed} tests)`)
      } else {
        logger.error(
          `❌ ${Name} validation failed (${suite.failed}/${suite.results.length} failures)`
        )
      }
    } catch (error) {
      logger.error(`💥 ${Name} validation crashed`, { error })
      this.results.push({
        Name,
        results: [
          {
            component: Name,
            passed: false,
            message: `Validation crashed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error : new Error('Unknown error'),
          },
        ],
        passed: 0,
        failed: 1,
        totalDuration: Date.now() - startTime,
      })
    }
  }

  /**
   * Validate store system
   */
  private async validateStore(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []

    // Test 1: Store import
    results.push(
      await this.testWithTimer('Store Import', async () => {
        try {
          const { useLocalCopilotStore } = await import('@/stores/local-copilot')
          if (!useLocalCopilotStore) {
            throw new Error('useLocalCopilotStore not exported')
          }
          return 'Store successfully imported'
        } catch (error) {
          throw new Error(`Failed to import store: ${error}`)
        }
      })
    )

    // Test 2: Store types
    results.push(
      await this.testWithTimer('Store Types', async () => {
        try {
          const types = await import('@/stores/local-copilot/types')
          const requiredTypes = [
            'LocalCopilotState',
            'LocalCopilotStore',
            'LocalCopilotMessage',
            'LocalCopilotConversation',
            'LocalCopilotToolCall',
          ]

          for (const typeName of requiredTypes) {
            if (!(typeName in types)) {
              throw new Error(`Required type ${typeName} not exported`)
            }
          }
          return `All ${requiredTypes.length} required types present`
        } catch (error) {
          throw new Error(`Store types validation failed: ${error}`)
        }
      })
    )

    // Test 3: Tool integration import
    results.push(
      await this.testWithTimer('Tool Integration Import', async () => {
        try {
          const integration = await import('@/services/local-copilot/tool-integration')
          if (!integration.localCopilotToolIntegration) {
            throw new Error('localCopilotToolIntegration not exported')
          }
          return 'Tool integration successfully imported'
        } catch (error) {
          throw new Error(`Failed to import tool integration: ${error}`)
        }
      })
    )

    return results
  }

  /**
   * Validate API endpoints
   */
  private async validateAPI(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []
    const testWorkspaceId = 'test-workspace'

    // Test API endpoints
    const endpoints = [
      {
        Name: 'Agents Endpoint',
        path: `/api/local-copilot/agents?workspaceId=${testWorkspaceId}`,
        method: 'get',
      },
      {
        Name: 'Conversations Endpoint',
        path: `/api/local-copilot/conversations?workspaceId=${testWorkspaceId}`,
        method: 'get',
      },
    ]

    for (const endpoint of endpoints) {
      results.push(
        await this.testWithTimer(`${endpoint.Name} Structure`, async () => {
          try {
            // Check if API route file exists
            const fs = require('fs')
            const path = require('path')
            const routePath = path.join(
              process.cwd(),
              'apps/sim/app',
              endpoint.path.split('?')[0],
              'route.ts'
            )

            if (!fs.existsSync(routePath)) {
              throw new Error(`API route file not found: ${routePath}`)
            }

            const content = fs.readFileSync(routePath, 'utf8')
            if (!content.includes(endpoint.method)) {
              throw new Error(`${endpoint.method} method not implemented`)
            }

            return `${endpoint.Name} route file exists and has ${endpoint.method} method`
          } catch (error) {
            throw new Error(`API validation failed: ${error}`)
          }
        })
      )
    }

    return results
  }

  /**
   * Validate tool integration
   */
  private async validateToolIntegration(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []

    // Test 1: Tool registry
    results.push(
      await this.testWithTimer('Tool Registry', async () => {
        try {
          const { toolRegistry } = await import('@/services/parlant/tool-adapter')
          if (!toolRegistry) {
            throw new Error('toolRegistry not exported')
          }

          const allTools = toolRegistry.getAllTools()
          if (!Array.isArray(allTools)) {
            throw new Error('getAllTools() should return an array')
          }

          return `Tool registry accessible with ${allTools.length} tools`
        } catch (error) {
          throw new Error(`Tool registry validation failed: ${error}`)
        }
      })
    )

    // Test 2: Universal tool adapter
    results.push(
      await this.testWithTimer('Universal Tool Adapter', async () => {
        try {
          const { toolAdapter } = await import('@/services/parlant/tool-adapter')
          if (!toolAdapter) {
            throw new Error('toolAdapter not exported')
          }
          return 'Universal tool adapter accessible'
        } catch (error) {
          throw new Error(`Tool adapter validation failed: ${error}`)
        }
      })
    )

    // Test 3: Intelligence engine
    results.push(
      await this.testWithTimer('Intelligence Engine', async () => {
        try {
          const { intelligenceEngine } = await import('@/services/parlant/tool-adapter')
          if (!intelligenceEngine) {
            throw new Error('intelligenceEngine not exported')
          }
          return 'Intelligence engine accessible'
        } catch (error) {
          throw new Error(`Intelligence engine validation failed: ${error}`)
        }
      })
    )

    // Test 4: Local copilot tool integration
    results.push(
      await this.testWithTimer('Local Copilot Tool Integration', async () => {
        try {
          const integration = await import('@/services/local-copilot/tool-integration')
          if (!integration.localCopilotToolIntegration) {
            throw new Error('localCopilotToolIntegration not exported')
          }

          // Test initialization
          await integration.localCopilotToolIntegration.initialize()
          return 'Local copilot tool integration initialized successfully'
        } catch (error) {
          throw new Error(`Tool integration validation failed: ${error}`)
        }
      })
    )

    return results
  }

  /**
   * Validate UI components
   */
  private async validateUIComponents(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []

    const components = [
      'LocalCopilot',
      'AgentSelector',
      'LocalCopilotMessage',
      'LocalCopilotWelcome',
      'LocalCopilotUserInput',
      'ModeToggle',
    ]

    for (const componentName of components) {
      results.push(
        await this.testWithTimer(`${componentName} Component`, async () => {
          try {
            const componentPath = `@/components/local-copilot/${componentName}`
            const component = await import(componentPath)

            if (!component[componentName]) {
              throw new Error(`Component ${componentName} not exported`)
            }

            return `${componentName} component successfully imported`
          } catch (error) {
            throw new Error(`Component validation failed: ${error}`)
          }
        })
      )
    }

    // Test unified components
    results.push(
      await this.testWithTimer('Unified Copilot Component', async () => {
        try {
          const { UnifiedCopilot } = await import('@/components/unified-copilot')
          if (!UnifiedCopilot) {
            throw new Error('UnifiedCopilot not exported')
          }
          return 'Unified copilot component successfully imported'
        } catch (error) {
          throw new Error(`Unified component validation failed: ${error}`)
        }
      })
    )

    results.push(
      await this.testWithTimer('Copilot Wrapper Component', async () => {
        try {
          const { CopilotWrapper } = await import('@/components/copilot-wrapper')
          if (!CopilotWrapper) {
            throw new Error('CopilotWrapper not exported')
          }
          return 'Copilot wrapper component successfully imported'
        } catch (error) {
          throw new Error(`Wrapper component validation failed: ${error}`)
        }
      })
    )

    return results
  }

  /**
   * Validate mode switching
   */
  private async validateModeSwitching(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []

    // Test 1: Unified copilot hook
    results.push(
      await this.testWithTimer('Unified Copilot Hook', async () => {
        try {
          const { useUnifiedCopilot } = await import('@/hooks/use-unified-copilot')
          if (!useUnifiedCopilot) {
            throw new Error('useUnifiedCopilot not exported')
          }
          return 'Unified copilot hook successfully imported'
        } catch (error) {
          throw new Error(`Hook validation failed: ${error}`)
        }
      })
    )

    // Test 2: Mode switching hook
    results.push(
      await this.testWithTimer('Mode Switch Hook', async () => {
        try {
          const { useCopilotModeSwitch } = await import('@/hooks/use-unified-copilot')
          if (!useCopilotModeSwitch) {
            throw new Error('useCopilotModeSwitch not exported')
          }
          return 'Mode switch hook successfully imported'
        } catch (error) {
          throw new Error(`Mode switch hook validation failed: ${error}`)
        }
      })
    )

    // Test 3: Workspace config hook
    results.push(
      await this.testWithTimer('Workspace Config Hook', async () => {
        try {
          const { useWorkspaceCopilotConfig } = await import('@/hooks/use-unified-copilot')
          if (!useWorkspaceCopilotConfig) {
            throw new Error('useWorkspaceCopilotConfig not exported')
          }
          return 'Workspace config hook successfully imported'
        } catch (error) {
          throw new Error(`Workspace config hook validation failed: ${error}`)
        }
      })
    )

    return results
  }

  /**
   * Helper to run test with timing
   */
  private async testWithTimer(
    Name: string,
    test: () => Promise<string>
  ): Promise<ValidationResult> {
    const startTime = Date.now()

    try {
      const message = await test()
      return {
        component: Name,
        passed: true,
        message,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        component: Name,
        passed: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }
    }
  }

  /**
   * Check if all validations passed
   */
  private isAllValid(): boolean {
    return this.results.every((suite) => suite.failed === 0)
  }

  /**
   * Generate validation report
   */
  private generateReport(): void {
    const totalTests = this.results.reduce((sum, suite) => sum + suite.results.length, 0)
    const totalPassed = this.results.reduce((sum, suite) => sum + suite.passed, 0)
    const totalFailed = this.results.reduce((sum, suite) => sum + suite.failed, 0)
    const totalDuration = this.results.reduce((sum, suite) => sum + suite.totalDuration, 0)

    logger.info('🎯 Local Copilot System Validation Report')
    logger.info('='.repeat(50))

    for (const suite of this.results) {
      const icon = suite.failed === 0 ? '✅' : '❌'
      logger.info(
        `${icon} ${suite.Name}: ${suite.passed}/${suite.results.length} passed (${suite.totalDuration}ms)`
      )

      if (suite.failed > 0) {
        for (const result of suite.results.filter((r) => !r.passed)) {
          logger.error(`  ❌ ${result.component}: ${result.message}`)
        }
      }
    }

    logger.info('='.repeat(50))
    logger.info(`📊 Summary: ${totalPassed}/${totalTests} tests passed in ${totalDuration}ms`)

    if (totalFailed === 0) {
      logger.info('🎉 All validations passed! Local Copilot System is ready.')
    } else {
      logger.error(`💥 ${totalFailed} validations failed. Please fix the issues above.`)
    }
  }
}

/**
 * Run the validation
 */
export async function validateLocalCopilotSystem(): Promise<boolean> {
  const validator = new LocalCopilotValidator()
  return validator.validate()
}

// CLI execution
if (require.main === module) {
  validateLocalCopilotSystem()
    .then((success) => {
      process.exit(success ? 0 : 1)
    })
    .catch((error) => {
      logger.error('Validation failed with error:', error)
      process.exit(1)
    })
}
