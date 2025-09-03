/**
 * Advanced Condition Block Handler
 *
 * Handles execution of Advanced Condition blocks with sophisticated expression evaluation,
 * multiple operators, logical combinations, and comprehensive error handling.
 *
 * Features:
 * - JavaScript expression evaluation with safe execution context
 * - Multiple comparison operators with type-aware logic
 * - AND/OR logical operators for complex condition combinations
 * - Comprehensive execution logging and performance tracking
 * - Flexible error handling strategies
 * - Production-ready state management and path routing
 *
 * @author Claude Code Assistant
 * @created 2025-09-03
 */

import { createLogger } from '@/lib/logs/console/logger'
import {
  COMPARISON_OPERATORS,
  evaluateJSExpression,
  evaluateMultipleConditions,
} from '@/blocks/blocks/advanced-condition'
import type { BlockHandler, ExecutionContext, NormalizedBlockOutput } from '@/executor/types'
import type { SerializedBlock } from '@/serializer/types'

const logger = createLogger('AdvancedConditionBlockHandler')

/**
 * Advanced Condition Block Handler Class
 *
 * Implements sophisticated condition evaluation with multiple modes:
 * - Simple conditions with operator-based comparisons
 * - JavaScript expression evaluation for complex logic
 * - Logical combinations with AND/OR operators
 */
export class AdvancedConditionBlockHandler implements BlockHandler {
  /**
   * Determines if this handler can process the given block
   * @param block - The serialized block to check
   * @returns True if this handler can process the block
   */
  canHandle(block: SerializedBlock): boolean {
    return block.metadata?.id === 'advanced-condition'
  }

  /**
   * Executes the Advanced Condition block logic
   *
   * @param block - The serialized advanced condition block configuration
   * @param inputs - Resolved input parameters for the block
   * @param context - Current workflow execution context
   * @returns Normalized block output with condition evaluation results
   */
  async execute(
    block: SerializedBlock,
    inputs: Record<string, any>,
    context: ExecutionContext
  ): Promise<NormalizedBlockOutput> {
    const executionStartTime = performance.now()
    const blockName = block.metadata?.name || 'Advanced Condition'

    logger.info('Executing Advanced Condition block', {
      blockId: block.id,
      blockName,
      workflowId: context.workflowId,
      executionId: context.executionId,
    })

    try {
      // Extract and validate block configuration
      const {
        logicalOperator = 'AND',
        evaluationMode = 'simple',
        simpleConditions = [],
        jsExpression,
        errorHandling = 'fail',
        caseSensitive = true,
      } = inputs

      // Validate configuration based on evaluation mode
      if (evaluationMode === 'simple') {
        if (!Array.isArray(simpleConditions) || simpleConditions.length === 0) {
          throw new Error('Advanced Condition block requires at least one simple condition')
        }

        // Validate each simple condition
        for (const condition of simpleConditions) {
          if (!condition.leftExpression || !condition.operator) {
            throw new Error('Each condition must have leftExpression and operator')
          }

          if (!(condition.operator in COMPARISON_OPERATORS)) {
            throw new Error(`Unsupported operator: ${condition.operator}`)
          }
        }
      } else if (evaluationMode === 'expression') {
        if (!jsExpression || typeof jsExpression !== 'string') {
          throw new Error(
            'Advanced Condition block requires a JavaScript expression in expression mode'
          )
        }
      } else {
        throw new Error(`Invalid evaluation mode: ${evaluationMode}`)
      }

      logger.info('Advanced Condition block configuration validated', {
        blockId: block.id,
        evaluationMode,
        logicalOperator,
        conditionsCount: evaluationMode === 'simple' ? simpleConditions.length : 1,
        errorHandling,
        caseSensitive,
      })

      // Create evaluation context from workflow state
      const evaluationContext = this.createEvaluationContext(context, block)

      // Execute condition evaluation based on mode
      let conditionResult: boolean
      let evaluationDetails: any

      if (evaluationMode === 'expression') {
        // JavaScript expression mode
        const result = await this.executeExpressionMode(
          jsExpression,
          evaluationContext,
          errorHandling
        )
        conditionResult = result.conditionResult
        evaluationDetails = result.evaluationDetails
      } else {
        // Simple conditions mode
        const result = await this.executeSimpleMode(
          simpleConditions,
          logicalOperator,
          evaluationContext,
          { caseSensitive },
          errorHandling
        )
        conditionResult = result.conditionResult
        evaluationDetails = result.evaluationDetails
      }

      // Update execution path based on condition result
      this.updateExecutionPath(context, block, conditionResult)

      // Calculate total execution time
      const totalExecutionDuration = performance.now() - executionStartTime

      // Build comprehensive output
      const output: NormalizedBlockOutput = {
        success: true,
        content: this.generateConditionSummary(conditionResult, evaluationDetails, evaluationMode),
        conditionResult,
        evaluationDetails,
        selectedPath: {
          blockId: block.id,
          blockType: 'advanced-condition',
          blockTitle: blockName,
          path: conditionResult ? 'true' : 'false',
        },
        selectedConditionId: conditionResult ? 'true_path' : 'false_path',
      }

      logger.info('Advanced Condition block execution completed successfully', {
        blockId: block.id,
        blockName,
        conditionResult,
        evaluationMode,
        executionDuration: Math.round(totalExecutionDuration),
      })

      return output
    } catch (error: any) {
      const executionDuration = performance.now() - executionStartTime

      logger.error('Advanced Condition block execution failed', {
        blockId: block.id,
        blockName,
        error: error.message,
        executionDuration: Math.round(executionDuration),
      })

      // Handle errors based on error handling strategy
      if (inputs.errorHandling === 'false') {
        // Treat as false and continue execution
        this.updateExecutionPath(context, block, false)

        return {
          success: true,
          content: `Condition evaluation failed (treated as false): ${error.message}`,
          conditionResult: false,
          evaluationDetails: {
            totalConditions: 0,
            trueConditions: 0,
            falseConditions: 1,
            logicalOperator: inputs.logicalOperator || 'AND',
            evaluationTime: Math.round(performance.now() - executionStartTime),
            conditionResults: [],
            error: error.message,
          },
          selectedPath: {
            blockId: block.id,
            blockType: 'advanced-condition',
            blockTitle: blockName,
            path: 'false',
          },
          selectedConditionId: 'false_path',
        }
      }
      if (inputs.errorHandling === 'true') {
        // Treat as true and continue execution
        this.updateExecutionPath(context, block, true)

        return {
          success: true,
          content: `Condition evaluation failed (treated as true): ${error.message}`,
          conditionResult: true,
          evaluationDetails: {
            totalConditions: 0,
            trueConditions: 1,
            falseConditions: 0,
            logicalOperator: inputs.logicalOperator || 'AND',
            evaluationTime: Math.round(performance.now() - executionStartTime),
            conditionResults: [],
            error: error.message,
          },
          selectedPath: {
            blockId: block.id,
            blockType: 'advanced-condition',
            blockTitle: blockName,
            path: 'true',
          },
          selectedConditionId: 'true_path',
        }
      }
      // Fail workflow execution
      return {
        success: false,
        error: error.message || 'Advanced Condition block execution failed',
        content: `Condition evaluation failed: ${error.message}`,
        conditionResult: false,
        evaluationDetails: {
          totalConditions: 0,
          trueConditions: 0,
          falseConditions: 0,
          logicalOperator: inputs.logicalOperator || 'AND',
          evaluationTime: Math.round(performance.now() - executionStartTime),
          conditionResults: [],
          error: error.message,
        },
        selectedPath: null,
        selectedConditionId: 'error',
      }
    }
  }

  /**
   * Executes JavaScript expression evaluation mode
   * @param jsExpression - JavaScript expression to evaluate
   * @param context - Evaluation context
   * @param errorHandling - Error handling strategy
   * @returns Condition result and evaluation details
   */
  private async executeExpressionMode(
    jsExpression: string,
    context: any,
    errorHandling: string
  ): Promise<{
    conditionResult: boolean
    evaluationDetails: any
  }> {
    const startTime = performance.now()

    logger.info('Executing JavaScript expression mode', {
      expression: jsExpression.substring(0, 100),
      errorHandling,
    })

    const evaluation = evaluateJSExpression(jsExpression, context)

    if (!evaluation.success) {
      throw new Error(evaluation.error || 'JavaScript expression evaluation failed')
    }

    const evaluationDetails = {
      totalConditions: 1,
      trueConditions: evaluation.result ? 1 : 0,
      falseConditions: evaluation.result ? 0 : 1,
      logicalOperator: 'N/A' as const,
      evaluationTime: Math.round(performance.now() - startTime),
      conditionResults: [
        {
          conditionId: 'js_expression',
          expression: jsExpression,
          result: evaluation.result,
          leftValue: null,
          operator: 'javascript',
          rightValue: null,
        },
      ],
      jsExpression,
      evaluationMode: 'expression',
    }

    logger.info('JavaScript expression evaluation completed', {
      result: evaluation.result,
      duration: evaluation.duration,
    })

    return {
      conditionResult: Boolean(evaluation.result),
      evaluationDetails,
    }
  }

  /**
   * Executes simple conditions evaluation mode
   * @param conditions - Array of simple condition configurations
   * @param logicalOperator - Logical operator (AND/OR)
   * @param context - Evaluation context
   * @param options - Evaluation options
   * @param errorHandling - Error handling strategy
   * @returns Condition result and evaluation details
   */
  private async executeSimpleMode(
    conditions: Array<{
      leftExpression: string
      operator: string
      rightExpression: string
      description?: string
    }>,
    logicalOperator: 'AND' | 'OR',
    context: any,
    options: { caseSensitive: boolean },
    errorHandling: string
  ): Promise<{
    conditionResult: boolean
    evaluationDetails: any
  }> {
    logger.info('Executing simple conditions mode', {
      conditionsCount: conditions.length,
      logicalOperator,
      caseSensitive: options.caseSensitive,
    })

    const evaluation = evaluateMultipleConditions(conditions, logicalOperator, context, options)

    if (!evaluation.success) {
      throw new Error('Multiple conditions evaluation failed')
    }

    const evaluationDetails = {
      totalConditions: conditions.length,
      trueConditions: evaluation.trueConditions,
      falseConditions: evaluation.falseConditions,
      logicalOperator,
      evaluationTime: evaluation.evaluationTime,
      conditionResults: evaluation.conditionResults,
      evaluationMode: 'simple',
    }

    logger.info('Simple conditions evaluation completed', {
      finalResult: evaluation.finalResult,
      trueConditions: evaluation.trueConditions,
      falseConditions: evaluation.falseConditions,
      duration: evaluation.evaluationTime,
    })

    return {
      conditionResult: Boolean(evaluation.finalResult),
      evaluationDetails,
    }
  }

  /**
   * Creates a safe evaluation context for condition evaluation
   * @param context - Workflow execution context
   * @param block - Current condition block
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

      // Add metadata context
      evaluationContext.workflow = {
        id: context.workflowId,
        executionId: context.executionId,
        currentBlock: block.id,
      }

      logger.debug('Advanced condition evaluation context created', {
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
   * Updates the execution path based on the condition evaluation result
   * @param context - Workflow execution context
   * @param block - Current condition block
   * @param conditionResult - Boolean result of condition evaluation
   */
  private updateExecutionPath(
    context: ExecutionContext,
    block: SerializedBlock,
    conditionResult: boolean
  ): void {
    try {
      // Store condition decision for path routing
      if (!context.decisions) {
        context.decisions = { router: new Map(), condition: new Map() }
      }

      if (!context.decisions.condition) {
        context.decisions.condition = new Map()
      }

      // Store the condition decision
      context.decisions.condition.set(block.id, conditionResult)

      // Add connected blocks to active execution path
      if (context.workflow?.connections) {
        const pathHandle = conditionResult ? 'true' : 'false'
        const conditionConnections = context.workflow.connections.filter(
          (conn) => conn.source === block.id && conn.sourceHandle === pathHandle
        )

        conditionConnections.forEach((conn) => {
          context.activeExecutionPath.add(conn.target)
          logger.debug('Added block to execution path from advanced condition', {
            fromBlock: block.id,
            toBlock: conn.target,
            path: pathHandle,
            conditionResult,
          })
        })
      }

      logger.info('Advanced condition execution path updated', {
        blockId: block.id,
        conditionResult,
        selectedPath: conditionResult ? 'true' : 'false',
        activePaths: context.activeExecutionPath.size,
      })
    } catch (error: any) {
      logger.error('Failed to update execution path for advanced condition block', {
        blockId: block.id,
        conditionResult,
        error: error.message,
      })
    }
  }

  /**
   * Generates a human-readable summary of the condition evaluation
   * @param conditionResult - Final boolean result
   * @param evaluationDetails - Detailed evaluation information
   * @param evaluationMode - Mode used for evaluation
   * @returns Formatted summary string
   */
  private generateConditionSummary(
    conditionResult: boolean,
    evaluationDetails: any,
    evaluationMode: string
  ): string {
    try {
      if (evaluationMode === 'expression') {
        return (
          `JavaScript expression evaluated to ${conditionResult}. ` +
          `Execution took ${evaluationDetails.evaluationTime}ms.`
        )
      }
      const { totalConditions, trueConditions, falseConditions, logicalOperator } =
        evaluationDetails

      return (
        `Evaluated ${totalConditions} condition(s) with ${logicalOperator} logic: ` +
        `${trueConditions} true, ${falseConditions} false. ` +
        `Final result: ${conditionResult}. ` +
        `Execution took ${evaluationDetails.evaluationTime}ms.`
      )
    } catch (error: any) {
      return `Condition evaluation completed with result: ${conditionResult}`
    }
  }
}
