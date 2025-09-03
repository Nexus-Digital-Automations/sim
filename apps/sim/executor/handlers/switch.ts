/**
 * Switch Block Handler
 *
 * Handles execution of Switch blocks for advanced conditional branching
 * in workflow automation. Provides comprehensive JavaScript expression evaluation
 * and case matching with detailed logging and error handling.
 *
 * Features:
 * - JavaScript expression evaluation with safe context
 * - Multiple case matching with flexible comparison options
 * - Default case handling for unmatched conditions
 * - Comprehensive execution logging and performance tracking
 * - Production-ready error handling and recovery
 *
 * @author Claude Code Assistant
 * @created 2025-09-03
 */

import { createLogger } from '@/lib/logs/console/logger'
import { evaluateExpression, processSwitch } from '@/blocks/blocks/switch'
import type { BlockHandler, ExecutionContext, NormalizedBlockOutput } from '@/executor/types'
import type { SerializedBlock } from '@/serializer/types'

const logger = createLogger('SwitchBlockHandler')

/**
 * Switch Block Handler Class
 *
 * Implements the BlockHandler interface for Switch blocks, providing
 * execution logic for advanced conditional branching with switch/case patterns.
 */
export class SwitchBlockHandler implements BlockHandler {
  /**
   * Determines if this handler can process the given block
   * @param block - The serialized block to check
   * @returns True if this handler can process the block
   */
  canHandle(block: SerializedBlock): boolean {
    return block.metadata?.id === 'switch'
  }

  /**
   * Executes the Switch block logic
   *
   * @param block - The serialized switch block configuration
   * @param inputs - Resolved input parameters for the block
   * @param context - Current workflow execution context
   * @returns Normalized block output with switch evaluation results
   */
  async execute(
    block: SerializedBlock,
    inputs: Record<string, any>,
    context: ExecutionContext
  ): Promise<NormalizedBlockOutput> {
    const executionStartTime = performance.now()
    const blockName = block.metadata?.name || 'Switch'

    logger.info('Executing Switch block', {
      blockId: block.id,
      blockName,
      workflowId: context.workflowId,
      executionId: context.executionId,
    })

    try {
      // Extract block configuration
      const {
        expression,
        cases = [],
        defaultCase = true,
        defaultLabel = 'Default',
        strictComparison = true,
        caseSensitive = true,
      } = inputs

      // Validate required inputs
      if (!expression || typeof expression !== 'string') {
        throw new Error('Switch block requires a valid expression to evaluate')
      }

      if (!Array.isArray(cases)) {
        throw new Error('Switch block requires cases to be configured as an array')
      }

      if (cases.length === 0 && !defaultCase) {
        throw new Error('Switch block requires at least one case or a default case')
      }

      logger.info('Switch block configuration validated', {
        blockId: block.id,
        expression: expression.substring(0, 100),
        totalCases: cases.length,
        hasDefaultCase: defaultCase,
        strictComparison,
        caseSensitive,
      })

      // Create evaluation context from workflow state
      const evaluationContext = this.createEvaluationContext(context, block)

      // Evaluate the switch expression
      const evaluationStartTime = performance.now()
      const expressionResult = evaluateExpression(expression, evaluationContext)
      const evaluationDuration = performance.now() - evaluationStartTime

      if (!expressionResult.success) {
        throw new Error(expressionResult.error || 'Failed to evaluate switch expression')
      }

      const switchValue = expressionResult.result

      logger.info('Switch expression evaluated', {
        blockId: block.id,
        expression: expression.substring(0, 100),
        switchValue,
        switchValueType: typeof switchValue,
        evaluationDuration: Math.round(evaluationDuration),
      })

      // Process switch cases to find match
      const switchProcessingStartTime = performance.now()
      const switchResult = processSwitch(switchValue, cases, {
        strict: strictComparison,
        caseSensitive,
        hasDefaultCase: defaultCase,
        defaultLabel,
      })
      const switchProcessingDuration = performance.now() - switchProcessingStartTime

      const { matchedCase, totalCases } = switchResult

      // Update execution path based on matched case
      if (matchedCase) {
        this.updateExecutionPath(context, block, matchedCase)

        logger.info('Switch case matched and execution path updated', {
          blockId: block.id,
          matchedCaseId: matchedCase.caseId,
          matchedCaseLabel: matchedCase.caseLabel,
          isDefaultCase: matchedCase.isDefaultCase,
          switchProcessingDuration: Math.round(switchProcessingDuration),
        })
      } else {
        logger.warn('Switch block found no matching case', {
          blockId: block.id,
          switchValue,
          totalCases,
          hasDefaultCase: defaultCase,
        })
      }

      // Calculate total execution time
      const totalExecutionDuration = performance.now() - executionStartTime

      // Build comprehensive output
      const output: NormalizedBlockOutput = {
        success: true,
        content: this.generateSwitchSummary(switchValue, matchedCase, totalCases),
        switchResult: switchValue,
        selectedCase: matchedCase
          ? {
              caseId: matchedCase.caseId,
              caseValue: matchedCase.caseValue,
              caseLabel: matchedCase.caseLabel,
              blockId: block.id,
              blockType: 'switch',
              blockTitle: blockName,
            }
          : null,
        matchedCondition: matchedCase
          ? matchedCase.isDefaultCase
            ? 'default'
            : `case_${matchedCase.caseIndex}`
          : 'none',
        evaluationDetails: {
          inputExpression: expression,
          evaluatedValue: switchValue,
          totalCases,
          matchedCaseIndex: matchedCase?.caseIndex ?? -1,
          isDefaultCase: matchedCase?.isDefaultCase ?? false,
          evaluationTime: Math.round(totalExecutionDuration),
        },
      }

      logger.info('Switch block execution completed successfully', {
        blockId: block.id,
        blockName,
        matchedCase: matchedCase?.caseLabel || 'none',
        executionDuration: Math.round(totalExecutionDuration),
      })

      return output
    } catch (error: any) {
      const executionDuration = performance.now() - executionStartTime

      logger.error('Switch block execution failed', {
        blockId: block.id,
        blockName,
        error: error.message,
        executionDuration: Math.round(executionDuration),
      })

      // Return error output that matches expected interface
      return {
        success: false,
        error: error.message || 'Switch block execution failed',
        content: `Switch evaluation failed: ${error.message}`,
        switchResult: null,
        selectedCase: null,
        matchedCondition: 'error',
        evaluationDetails: {
          inputExpression: inputs.expression || '',
          evaluatedValue: null,
          totalCases: Array.isArray(inputs.cases) ? inputs.cases.length : 0,
          matchedCaseIndex: -1,
          isDefaultCase: false,
          evaluationTime: Math.round(performance.now() - executionStartTime),
        },
      }
    }
  }

  /**
   * Creates a safe evaluation context for switch expression evaluation
   * @param context - Workflow execution context
   * @param block - Current switch block
   * @returns Safe evaluation context object
   */
  private createEvaluationContext(
    context: ExecutionContext,
    block: SerializedBlock
  ): Record<string, any> {
    const evaluationContext: Record<string, any> = {}

    try {
      // Add workflow variables
      if (context.workflowVariables) {
        Object.assign(evaluationContext, context.workflowVariables)
      }

      // Add environment variables (safe subset)
      if (context.environmentVariables) {
        const safeEnvVars = Object.keys(context.environmentVariables)
          .filter(
            (key) =>
              !key.toLowerCase().includes('secret') &&
              !key.toLowerCase().includes('password') &&
              !key.toLowerCase().includes('token')
          )
          .reduce(
            (acc, key) => {
              acc[key] = context.environmentVariables[key]
              return acc
            },
            {} as Record<string, string>
          )

        evaluationContext.env = safeEnvVars
      }

      // Add block states (outputs from previous blocks)
      if (context.blockStates) {
        context.blockStates.forEach((blockState, blockId) => {
          if (blockId !== block.id && blockState.output) {
            // Use block name or ID as context key
            const contextKey =
              context.workflow?.blocks.find((b) => b.id === blockId)?.metadata?.name || blockId
            evaluationContext[contextKey] = blockState.output
          }
        })
      }

      logger.debug('Switch evaluation context created', {
        blockId: block.id,
        contextKeys: Object.keys(evaluationContext),
        hasWorkflowVariables: !!context.workflowVariables,
        blockStatesCount: context.blockStates?.size || 0,
      })

      return evaluationContext
    } catch (error: any) {
      logger.warn('Error creating evaluation context, using minimal context', {
        blockId: block.id,
        error: error.message,
      })

      return {}
    }
  }

  /**
   * Updates the execution path based on the matched switch case
   * @param context - Workflow execution context
   * @param block - Current switch block
   * @param matchedCase - The case that matched the switch value
   */
  private updateExecutionPath(
    context: ExecutionContext,
    block: SerializedBlock,
    matchedCase: { caseId: string; caseLabel: string; isDefaultCase: boolean }
  ): void {
    try {
      // Store switch decision for path routing
      if (!context.decisions) {
        context.decisions = { router: new Map(), condition: new Map() }
      }

      if (!context.decisions.router) {
        context.decisions.router = new Map()
      }

      // Store the switch decision
      context.decisions.router.set(block.id, matchedCase.caseId)

      // Add connected blocks to active execution path
      if (context.workflow?.connections) {
        const switchConnections = context.workflow.connections.filter(
          (conn) =>
            conn.source === block.id &&
            (conn.sourceHandle === matchedCase.caseId ||
              (matchedCase.isDefaultCase && conn.sourceHandle === 'default'))
        )

        switchConnections.forEach((conn) => {
          context.activeExecutionPath.add(conn.target)
          logger.debug('Added block to execution path from switch', {
            fromBlock: block.id,
            toBlock: conn.target,
            caseId: matchedCase.caseId,
            caseLabel: matchedCase.caseLabel,
          })
        })
      }

      logger.info('Switch execution path updated', {
        blockId: block.id,
        selectedCase: matchedCase.caseId,
        caseLabel: matchedCase.caseLabel,
        activePaths: context.activeExecutionPath.size,
      })
    } catch (error: any) {
      logger.error('Failed to update execution path for switch block', {
        blockId: block.id,
        matchedCase: matchedCase.caseId,
        error: error.message,
      })
    }
  }

  /**
   * Generates a human-readable summary of the switch evaluation
   * @param switchValue - The evaluated switch value
   * @param matchedCase - The matched case information
   * @param totalCases - Total number of cases configured
   * @returns Formatted summary string
   */
  private generateSwitchSummary(
    switchValue: any,
    matchedCase: { caseId: string; caseLabel: string; isDefaultCase: boolean } | null,
    totalCases: number
  ): string {
    try {
      const switchValueStr =
        switchValue === null
          ? 'null'
          : switchValue === undefined
            ? 'undefined'
            : typeof switchValue === 'string'
              ? `"${switchValue}"`
              : JSON.stringify(switchValue)

      if (matchedCase) {
        if (matchedCase.isDefaultCase) {
          return `Switch evaluated to ${switchValueStr}, matched default case: "${matchedCase.caseLabel}"`
        }
        return `Switch evaluated to ${switchValueStr}, matched case: "${matchedCase.caseLabel}"`
      }
      return `Switch evaluated to ${switchValueStr}, no matching case found among ${totalCases} cases`
    } catch (error: any) {
      return `Switch evaluation completed with ${totalCases} cases`
    }
  }
}
