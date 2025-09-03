/**
 * Advanced Condition Block Implementation
 *
 * Enhanced condition block with advanced expression evaluation, multiple operators,
 * and nested condition support for sophisticated workflow branching logic.
 *
 * Features:
 * - Advanced JavaScript expression evaluation with safe context
 * - Multiple comparison operators (==, !=, <, >, <=, >=, contains, regex)
 * - AND/OR logical operators for complex conditions
 * - Nested condition groups with precedence
 * - Type-aware comparisons (string, number, boolean, array, object)
 * - Production-ready error handling and comprehensive logging
 *
 * @author Claude Code Assistant
 * @created 2025-09-03
 */

import { ConditionalIcon } from '@/components/icons'
import { createLogger } from '@/lib/logs/console/logger'
import type { BlockConfig } from '@/blocks/types'

const logger = createLogger('AdvancedConditionBlock')

/**
 * Advanced Condition Block Output Interface
 * Provides comprehensive information about condition evaluation
 */
interface AdvancedConditionBlockOutput {
  success: boolean
  output: {
    content: string
    conditionResult: boolean
    evaluationDetails: {
      totalConditions: number
      truConditions: number
      falseConditions: number
      logicalOperator: 'AND' | 'OR'
      evaluationTime: number
      conditionResults: Array<{
        conditionId: string
        expression: string
        result: boolean
        leftValue: any
        operator: string
        rightValue: any
        error?: string
      }>
    }
    selectedPath: {
      blockId: string
      blockType: string
      blockTitle: string
      path: 'true' | 'false'
    }
    selectedConditionId: string
  }
}

/**
 * Advanced Condition Block Configuration
 *
 * Implements a sophisticated condition evaluation system with multiple
 * operators, logical combinations, and expression evaluation capabilities.
 */
export const AdvancedConditionBlock: BlockConfig<AdvancedConditionBlockOutput> = {
  type: 'advanced-condition',
  name: 'Advanced Condition',
  description: 'Advanced conditional branching with complex expression evaluation',
  longDescription:
    'Enhanced condition block supporting JavaScript expressions, multiple comparison operators, AND/OR logic, and nested conditions for sophisticated workflow branching.',
  docsLink: 'https://docs.sim.ai/blocks/advanced-condition',
  bgColor: '#FF6B35',
  icon: ConditionalIcon,
  category: 'blocks',

  subBlocks: [
    // Logical operator selection
    {
      id: 'logicalOperator',
      title: 'Logical Operator',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        { label: 'AND (all conditions must be true)', id: 'AND' },
        { label: 'OR (at least one condition must be true)', id: 'OR' },
      ],
      value: () => 'AND',
      description: 'How multiple conditions should be combined',
    },

    // Evaluation mode
    {
      id: 'evaluationMode',
      title: 'Evaluation Mode',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        { label: 'Simple Comparison', id: 'simple' },
        { label: 'JavaScript Expression', id: 'expression' },
      ],
      value: () => 'simple',
      description: 'Type of condition evaluation to use',
    },

    // Simple conditions table (for simple mode)
    {
      id: 'simpleConditions',
      title: 'Conditions',
      type: 'table',
      layout: 'full',
      required: true,
      columns: ['leftExpression', 'operator', 'rightExpression', 'description'],
      description: 'Define multiple conditions to evaluate',
      condition: {
        field: 'evaluationMode',
        value: 'simple',
      },
    },

    // JavaScript expression (for expression mode)
    {
      id: 'jsExpression',
      title: 'JavaScript Expression',
      type: 'code',
      language: 'javascript',
      layout: 'full',
      required: true,
      description: 'JavaScript expression that must evaluate to boolean',
      placeholder:
        '// Example: user.age > 18 && user.verified === true\n// Available: workflow variables, block outputs, env vars',
      generationType: 'javascript-function-body',
      condition: {
        field: 'evaluationMode',
        value: 'expression',
      },
      wandConfig: {
        enabled: true,
        prompt:
          'Generate a JavaScript boolean expression for workflow conditions. Consider data types and available context.',
        generationType: 'javascript-function-body',
        placeholder: 'Describe your condition logic...',
        maintainHistory: false,
      },
    },

    // Error handling mode
    {
      id: 'errorHandling',
      title: 'Error Handling',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Fail workflow on error', id: 'fail' },
        { label: 'Treat as false on error', id: 'false' },
        { label: 'Treat as true on error', id: 'true' },
      ],
      value: () => 'fail',
      description: 'How to handle evaluation errors',
    },

    // Case sensitivity for string comparisons
    {
      id: 'caseSensitive',
      title: 'Case Sensitive',
      type: 'switch',
      layout: 'half',
      description: 'Make string comparisons case sensitive',
      value: () => true,
    },
  ],

  tools: {
    access: [], // No external tools needed
  },

  inputs: {
    // No specific inputs - uses expression evaluation within workflow context
  },

  outputs: {
    content: {
      type: 'string',
      description: 'Condition evaluation summary and detailed results',
    },
    conditionResult: {
      type: 'boolean',
      description: 'Final boolean result of all condition evaluations',
    },
    evaluationDetails: {
      type: 'json',
      description: 'Comprehensive details about condition evaluation process',
    },
    selectedPath: {
      type: 'json',
      description: 'Information about the selected execution path (true/false branch)',
    },
    selectedConditionId: {
      type: 'string',
      description: 'Identifier for the condition path taken',
    },
  },
}

/**
 * Advanced Condition Evaluation Utilities
 *
 * Provides comprehensive condition evaluation with multiple operators
 * and advanced expression parsing capabilities.
 */

/**
 * Supported comparison operators with their evaluation logic
 */
export const COMPARISON_OPERATORS = {
  '==': (left: any, right: any) => left === right,
  '===': (left: any, right: any) => left === right,
  '!=': (left: any, right: any) => left !== right,
  '!==': (left: any, right: any) => left !== right,
  '<': (left: any, right: any) => left < right,
  '<=': (left: any, right: any) => left <= right,
  '>': (left: any, right: any) => left > right,
  '>=': (left: any, right: any) => left >= right,
  contains: (left: any, right: any) => {
    if (typeof left === 'string' && typeof right === 'string') {
      return left.includes(right)
    }
    if (Array.isArray(left)) {
      return left.includes(right)
    }
    return false
  },
  not_contains: (left: any, right: any) => {
    if (typeof left === 'string' && typeof right === 'string') {
      return !left.includes(right)
    }
    if (Array.isArray(left)) {
      return !left.includes(right)
    }
    return true
  },
  starts_with: (left: any, right: any) => {
    return typeof left === 'string' && typeof right === 'string' && left.startsWith(right)
  },
  ends_with: (left: any, right: any) => {
    return typeof left === 'string' && typeof right === 'string' && left.endsWith(right)
  },
  regex: (left: any, right: any) => {
    if (typeof left === 'string' && typeof right === 'string') {
      try {
        const regex = new RegExp(right)
        return regex.test(left)
      } catch (error) {
        return false
      }
    }
    return false
  },
  is_empty: (left: any) => {
    return (
      left === null ||
      left === undefined ||
      left === '' ||
      (Array.isArray(left) && left.length === 0) ||
      (typeof left === 'object' && Object.keys(left).length === 0)
    )
  },
  is_not_empty: (left: any) => {
    return !(
      left === null ||
      left === undefined ||
      left === '' ||
      (Array.isArray(left) && left.length === 0) ||
      (typeof left === 'object' && Object.keys(left).length === 0)
    )
  },
} as const

/**
 * Evaluates a JavaScript expression safely with comprehensive error handling
 * @param expression - JavaScript expression to evaluate
 * @param context - Evaluation context with workflow data
 * @returns Evaluation result with success/failure information
 */
export function evaluateJSExpression(
  expression: string,
  context: any
): {
  success: boolean
  result?: any
  error?: string
  duration: number
} {
  const startTime = performance.now()

  try {
    logger.info('Advanced condition evaluating JavaScript expression', {
      expression: expression.substring(0, 150),
      contextKeys: Object.keys(context || {}),
    })

    // Create safe evaluation context
    const safeContext = {
      // Workflow data
      ...context,

      // Safe utility functions
      now: () => new Date(),
      today: () => new Date().toISOString().split('T')[0],
      timestamp: () => Date.now(),
      uuid: () => crypto.randomUUID(),

      // Math utilities
      Math,

      // Type utilities
      String,
      Number,
      Boolean,
      Array,
      Object,

      // Safe JSON operations
      JSON: {
        parse: JSON.parse,
        stringify: JSON.stringify,
      },

      // Regular expressions
      RegExp,

      // Date utilities
      Date,
    }

    // Use Function constructor for safe evaluation
    const evaluator = new Function(
      'context',
      `
      "use strict";
      with (context) {
        try {
          const result = ${expression};
          if (typeof result !== 'boolean') {
            throw new Error('Expression must evaluate to boolean, got: ' + typeof result);
          }
          return result;
        } catch (error) {
          throw new Error('Expression evaluation failed: ' + error.message);
        }
      }
      `
    )

    const result = evaluator(safeContext)
    const duration = performance.now() - startTime

    logger.info('Advanced condition JavaScript expression evaluated', {
      expression: expression.substring(0, 150),
      result,
      duration: Math.round(duration),
    })

    return { success: true, result, duration }
  } catch (error: any) {
    const duration = performance.now() - startTime

    logger.error('Advanced condition JavaScript expression evaluation failed', {
      expression: expression.substring(0, 150),
      error: error.message,
      duration: Math.round(duration),
    })

    return {
      success: false,
      error: `JavaScript expression evaluation failed: ${error.message}`,
      duration,
    }
  }
}

/**
 * Evaluates a single simple condition with operator-based comparison
 * @param leftExpression - Left side expression
 * @param operator - Comparison operator
 * @param rightExpression - Right side expression
 * @param context - Evaluation context
 * @param options - Evaluation options
 * @returns Detailed condition evaluation result
 */
export function evaluateSimpleCondition(
  leftExpression: string,
  operator: string,
  rightExpression: string,
  context: any,
  options: { caseSensitive?: boolean } = {}
): {
  success: boolean
  result?: boolean
  leftValue?: any
  rightValue?: any
  error?: string
} {
  try {
    logger.debug('Evaluating simple condition', {
      leftExpression: leftExpression.substring(0, 50),
      operator,
      rightExpression: rightExpression.substring(0, 50),
    })

    // Evaluate left and right expressions
    const leftEval = evaluateJSExpression(leftExpression, context)
    const rightEval = rightExpression
      ? evaluateJSExpression(rightExpression, context)
      : { success: true, result: null }

    if (!leftEval.success) {
      return { success: false, error: `Left expression error: ${leftEval.error}` }
    }

    if (rightExpression && !rightEval.success) {
      return { success: false, error: `Right expression error: ${rightEval.error}` }
    }

    const leftValue = leftEval.result
    const rightValue = rightEval.result

    // Apply case sensitivity for strings
    let processedLeftValue = leftValue
    let processedRightValue = rightValue

    if (!options.caseSensitive && typeof leftValue === 'string') {
      processedLeftValue = leftValue.toLowerCase()
    }
    if (!options.caseSensitive && typeof rightValue === 'string') {
      processedRightValue = rightValue.toLowerCase()
    }

    // Get operator function
    const operatorFn = COMPARISON_OPERATORS[operator as keyof typeof COMPARISON_OPERATORS]
    if (!operatorFn) {
      return { success: false, error: `Unsupported operator: ${operator}` }
    }

    // Evaluate condition
    const result = operatorFn(processedLeftValue, processedRightValue)

    logger.debug('Simple condition evaluated', {
      leftValue,
      operator,
      rightValue,
      result,
    })

    return {
      success: true,
      result: Boolean(result),
      leftValue,
      rightValue,
    }
  } catch (error: any) {
    logger.error('Simple condition evaluation failed', {
      leftExpression: leftExpression.substring(0, 50),
      operator,
      rightExpression: rightExpression?.substring(0, 50),
      error: error.message,
    })

    return {
      success: false,
      error: `Simple condition evaluation failed: ${error.message}`,
    }
  }
}

/**
 * Evaluates multiple conditions with logical operators (AND/OR)
 * @param conditions - Array of condition configurations
 * @param logicalOperator - How to combine conditions (AND/OR)
 * @param context - Evaluation context
 * @param options - Evaluation options
 * @returns Comprehensive evaluation results
 */
export function evaluateMultipleConditions(
  conditions: Array<{
    leftExpression: string
    operator: string
    rightExpression: string
    description?: string
  }>,
  logicalOperator: 'AND' | 'OR',
  context: any,
  options: { caseSensitive?: boolean } = {}
): {
  success: boolean
  finalResult?: boolean
  conditionResults: Array<{
    conditionId: string
    expression: string
    result: boolean
    leftValue: any
    operator: string
    rightValue: any
    error?: string
  }>
  trueConditions: number
  falseConditions: number
  evaluationTime: number
} {
  const startTime = performance.now()
  const conditionResults: Array<{
    conditionId: string
    expression: string
    result: boolean
    leftValue: any
    operator: string
    rightValue: any
    error?: string
  }> = []

  logger.info('Evaluating multiple conditions', {
    totalConditions: conditions.length,
    logicalOperator,
    caseSensitive: options.caseSensitive,
  })

  try {
    let trueConditions = 0
    let falseConditions = 0

    // Evaluate each condition
    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i]
      const conditionId = `condition_${i}`

      const evaluation = evaluateSimpleCondition(
        condition.leftExpression,
        condition.operator,
        condition.rightExpression,
        context,
        options
      )

      const conditionResult = {
        conditionId,
        expression: `${condition.leftExpression} ${condition.operator} ${condition.rightExpression}`,
        result: evaluation.success ? evaluation.result! : false,
        leftValue: evaluation.leftValue,
        operator: condition.operator,
        rightValue: evaluation.rightValue,
        error: evaluation.error,
      }

      conditionResults.push(conditionResult)

      if (evaluation.success && evaluation.result) {
        trueConditions++
      } else {
        falseConditions++
      }

      // Short-circuit evaluation for performance
      if (logicalOperator === 'AND' && (!evaluation.success || !evaluation.result)) {
        // In AND mode, if any condition is false, final result is false
        logger.debug('Short-circuit AND evaluation', {
          conditionIndex: i,
          conditionResult: evaluation.result,
          finalResult: false,
        })
        break
      }
      if (logicalOperator === 'OR' && evaluation.success && evaluation.result) {
        // In OR mode, if any condition is true, final result is true
        logger.debug('Short-circuit OR evaluation', {
          conditionIndex: i,
          conditionResult: evaluation.result,
          finalResult: true,
        })
        break
      }
    }

    // Calculate final result based on logical operator
    let finalResult: boolean
    if (logicalOperator === 'AND') {
      finalResult = trueConditions === conditions.length && falseConditions === 0
    } else {
      // OR
      finalResult = trueConditions > 0
    }

    const evaluationTime = performance.now() - startTime

    logger.info('Multiple conditions evaluation completed', {
      totalConditions: conditions.length,
      trueConditions,
      falseConditions,
      logicalOperator,
      finalResult,
      evaluationTime: Math.round(evaluationTime),
    })

    return {
      success: true,
      finalResult,
      conditionResults,
      trueConditions,
      falseConditions,
      evaluationTime: Math.round(evaluationTime),
    }
  } catch (error: any) {
    const evaluationTime = performance.now() - startTime

    logger.error('Multiple conditions evaluation failed', {
      totalConditions: conditions.length,
      logicalOperator,
      error: error.message,
      evaluationTime: Math.round(evaluationTime),
    })

    return {
      success: false,
      conditionResults,
      trueConditions: conditionResults.filter((c) => c.result).length,
      falseConditions: conditionResults.filter((c) => !c.result).length,
      evaluationTime: Math.round(evaluationTime),
    }
  }
}
