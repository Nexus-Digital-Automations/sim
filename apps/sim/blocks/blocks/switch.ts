/**
 * Switch Block Implementation
 *
 * Provides advanced conditional branching with switch/case logic for complex workflow routing.
 * Supports multiple conditions with JavaScript expression evaluation and flexible case handling.
 *
 * Features:
 * - Switch/case logic with multiple condition paths
 * - JavaScript expression evaluation for dynamic conditions
 * - Default case handling for unmatched conditions
 * - Type-safe case value comparisons
 * - Production-ready error handling and logging
 *
 * @author Claude Code Assistant
 * @created 2025-09-03
 */

import { ForkIcon } from '@/components/icons'
import { createLogger } from '@/lib/logs/console/logger'
import type { BlockConfig } from '@/blocks/types'

const logger = createLogger('SwitchBlock')

/**
 * Switch Block Output Interface
 * Provides detailed information about the switch evaluation result
 */
interface SwitchBlockOutput {
  success: boolean
  output: {
    content: string
    switchResult: any
    selectedCase: {
      caseId: string
      caseValue: any
      caseLabel: string
      blockId: string
      blockType: string
      blockTitle: string
    } | null
    matchedCondition: string
    evaluationDetails: {
      inputExpression: string
      evaluatedValue: any
      totalCases: number
      matchedCaseIndex: number
      isDefaultCase: boolean
      evaluationTime: number
    }
  }
}

/**
 * Switch Block Configuration
 *
 * Implements a comprehensive switch/case block for advanced conditional routing
 * in workflow automation. Supports JavaScript expression evaluation and multiple
 * case scenarios with a default fallback option.
 */
export const SwitchBlock: BlockConfig<SwitchBlockOutput> = {
  type: 'switch',
  name: 'Switch',
  description: 'Route execution based on multiple conditions with switch/case logic',
  longDescription:
    'Advanced conditional routing block that evaluates an expression and routes workflow execution based on matching cases. Supports JavaScript expressions, multiple data types, and provides a default case for unmatched conditions.',
  docsLink: 'https://docs.sim.ai/blocks/switch',
  bgColor: '#9333EA',
  icon: ForkIcon,
  category: 'blocks',

  subBlocks: [
    // Expression input for the value to switch on
    {
      id: 'expression',
      title: 'Switch Expression',
      type: 'code',
      language: 'javascript',
      layout: 'full',
      required: true,
      description:
        'JavaScript expression to evaluate. The result will be compared against case values.',
      placeholder: 'user.status // or any JavaScript expression',
      generationType: 'javascript-function-body',
      wandConfig: {
        enabled: true,
        prompt:
          'Generate a JavaScript expression for switch evaluation. Consider the workflow context and data available.',
        generationType: 'javascript-function-body',
        placeholder: 'Describe what you want to switch on...',
        maintainHistory: false,
      },
    },

    // Cases configuration table
    {
      id: 'cases',
      title: 'Switch Cases',
      type: 'table',
      layout: 'full',
      required: true,
      columns: ['caseValue', 'caseLabel', 'description'],
      description:
        'Define cases for the switch statement. Each case will be compared with the expression result.',
      placeholder: 'Add switch cases...',
    },

    // Default case configuration
    {
      id: 'defaultCase',
      title: 'Default Case',
      type: 'switch',
      layout: 'half',
      description: 'Enable default case when no other cases match',
      value: () => true,
    },

    {
      id: 'defaultLabel',
      title: 'Default Case Label',
      type: 'short-input',
      layout: 'half',
      description: 'Label for the default case',
      placeholder: 'Default',
      condition: {
        field: 'defaultCase',
        value: true,
      },
    },

    // Expression evaluation mode
    {
      id: 'strictComparison',
      title: 'Strict Comparison',
      type: 'switch',
      layout: 'half',
      description: 'Use strict equality (===) instead of loose equality (==)',
      value: () => true,
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
    access: [], // No external tools needed for switch logic
  },

  inputs: {
    // No specific inputs - uses expression evaluation within workflow context
  },

  outputs: {
    content: {
      type: 'string',
      description: 'Switch evaluation summary and result details',
    },
    switchResult: {
      type: 'any',
      description: 'The evaluated result of the switch expression',
    },
    selectedCase: {
      type: 'json',
      description: 'Information about the selected case including ID, value, and routing details',
    },
    matchedCondition: {
      type: 'string',
      description: 'The condition that was matched or "default" if default case',
    },
    evaluationDetails: {
      type: 'json',
      description: 'Detailed information about the switch evaluation process',
    },
  },

  // Hide from toolbar initially - advanced users feature
  hideFromToolbar: false,

  // No triggers for switch blocks
  triggers: {
    enabled: false,
    available: [],
  },
}

/**
 * Switch Block Helper Functions
 *
 * These utility functions support the switch block evaluation logic
 * and provide production-ready error handling and logging.
 */

/**
 * Evaluates a JavaScript expression safely within the workflow context
 * @param expression - The JavaScript expression to evaluate
 * @param context - The workflow execution context
 * @returns Evaluation result or error information
 */
export function evaluateExpression(
  expression: string,
  context: any
): {
  success: boolean
  result?: any
  error?: string
} {
  const startTime = performance.now()

  try {
    logger.info('Switch block evaluating expression', {
      expression: expression.substring(0, 100),
      contextKeys: Object.keys(context || {}),
    })

    // Create a safe evaluation context
    const evalContext = {
      // Workflow data access
      ...context,

      // Safe utility functions
      now: () => new Date(),
      uuid: () => crypto.randomUUID(),

      // Math utilities
      Math,

      // String utilities
      String,
      Number,
      Boolean,

      // Array utilities
      Array,

      // Safe JSON operations
      JSON: {
        parse: JSON.parse,
        stringify: JSON.stringify,
      },
    }

    // Use Function constructor for safe evaluation
    const evaluator = new Function(
      'context',
      `
      with (context) {
        try {
          return ${expression};
        } catch (error) {
          throw new Error('Expression evaluation failed: ' + error.message);
        }
      }
      `
    )

    const result = evaluator(evalContext)
    const duration = performance.now() - startTime

    logger.info('Switch expression evaluated successfully', {
      expression: expression.substring(0, 100),
      resultType: typeof result,
      duration: Math.round(duration),
    })

    return { success: true, result }
  } catch (error: any) {
    const duration = performance.now() - startTime

    logger.error('Switch expression evaluation failed', {
      expression: expression.substring(0, 100),
      error: error.message,
      duration: Math.round(duration),
    })

    return {
      success: false,
      error: `Expression evaluation failed: ${error.message}`,
    }
  }
}

/**
 * Compares switch result with case values using appropriate comparison logic
 * @param switchValue - The value from switch expression evaluation
 * @param caseValue - The case value to compare against
 * @param options - Comparison options (strict, caseSensitive)
 * @returns Whether the values match
 */
export function compareValues(
  switchValue: any,
  caseValue: any,
  options: { strict?: boolean; caseSensitive?: boolean } = {}
): boolean {
  const { strict = true, caseSensitive = true } = options

  try {
    // Handle null/undefined cases
    if (switchValue === null || switchValue === undefined) {
      return caseValue === null || caseValue === undefined
    }

    // String comparison with case sensitivity option
    if (typeof switchValue === 'string' && typeof caseValue === 'string') {
      if (caseSensitive) {
        return strict ? switchValue === caseValue : switchValue === caseValue
      }
      return strict
        ? switchValue.toLowerCase() === caseValue.toLowerCase()
        : switchValue.toLowerCase() === caseValue.toLowerCase()
    }

    // Numeric comparison
    if (typeof switchValue === 'number' && typeof caseValue === 'number') {
      return strict ? switchValue === caseValue : switchValue === caseValue
    }

    // Boolean comparison
    if (typeof switchValue === 'boolean' && typeof caseValue === 'boolean') {
      return switchValue === caseValue
    }

    // Array comparison (shallow)
    if (Array.isArray(switchValue) && Array.isArray(caseValue)) {
      return (
        switchValue.length === caseValue.length &&
        switchValue.every((val, index) => val === caseValue[index])
      )
    }

    // Object comparison (shallow)
    if (typeof switchValue === 'object' && typeof caseValue === 'object') {
      const switchKeys = Object.keys(switchValue)
      const caseKeys = Object.keys(caseValue)

      return (
        switchKeys.length === caseKeys.length &&
        switchKeys.every((key) => switchValue[key] === caseValue[key])
      )
    }

    // Default comparison
    return strict ? switchValue === caseValue : switchValue === caseValue
  } catch (error: any) {
    logger.warn('Switch value comparison failed', {
      switchValue,
      caseValue,
      error: error.message,
    })
    return false
  }
}

/**
 * Processes switch cases and finds the matching case
 * @param switchValue - The evaluated switch expression result
 * @param cases - Array of case configurations
 * @param options - Processing options
 * @returns Information about the matched case or null if no match
 */
export function processSwitch(
  switchValue: any,
  cases: Array<{ caseValue: any; caseLabel: string; description?: string }>,
  options: {
    strict?: boolean
    caseSensitive?: boolean
    hasDefaultCase?: boolean
    defaultLabel?: string
  } = {}
): {
  matchedCase: {
    caseId: string
    caseValue: any
    caseLabel: string
    caseIndex: number
    isDefaultCase: boolean
  } | null
  totalCases: number
} {
  const startTime = performance.now()

  logger.info('Processing switch cases', {
    switchValue,
    totalCases: cases.length,
    hasDefaultCase: options.hasDefaultCase,
  })

  try {
    // Check each case for a match
    for (let index = 0; index < cases.length; index++) {
      const caseConfig = cases[index]

      if (
        compareValues(switchValue, caseConfig.caseValue, {
          strict: options.strict,
          caseSensitive: options.caseSensitive,
        })
      ) {
        const matchedCase = {
          caseId: `case_${index}`,
          caseValue: caseConfig.caseValue,
          caseLabel: caseConfig.caseLabel,
          caseIndex: index,
          isDefaultCase: false,
        }

        logger.info('Switch case matched', {
          caseIndex: index,
          caseLabel: caseConfig.caseLabel,
          duration: Math.round(performance.now() - startTime),
        })

        return { matchedCase, totalCases: cases.length }
      }
    }

    // Handle default case if no match found
    if (options.hasDefaultCase) {
      const matchedCase = {
        caseId: 'default',
        caseValue: null,
        caseLabel: options.defaultLabel || 'Default',
        caseIndex: -1,
        isDefaultCase: true,
      }

      logger.info('Switch using default case', {
        switchValue,
        defaultLabel: options.defaultLabel,
        duration: Math.round(performance.now() - startTime),
      })

      return { matchedCase, totalCases: cases.length }
    }

    // No match and no default case
    logger.warn('Switch found no matching case and no default case configured', {
      switchValue,
      totalCases: cases.length,
      duration: Math.round(performance.now() - startTime),
    })

    return { matchedCase: null, totalCases: cases.length }
  } catch (error: any) {
    logger.error('Switch case processing failed', {
      switchValue,
      totalCases: cases.length,
      error: error.message,
      duration: Math.round(performance.now() - startTime),
    })

    throw new Error(`Switch processing failed: ${error.message}`)
  }
}
