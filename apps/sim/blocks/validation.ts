/**
 * Block Validation Utility Module
 *
 * This module provides comprehensive validation functions for block configurations,
 * parameters, outputs, and runtime state validation.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  BlockConfig,
  OutputFieldDefinition,
  ParamConfig,
  ParamType,
  PrimitiveValueType,
  SubBlockConfig,
  SubBlockType,
} from '@/blocks/types'

const logger = createLogger('BlockValidation')

/**
 * Validation error types for detailed error reporting
 */
export interface ValidationError {
  code: string
  message: string
  field?: string
  value?: any
  context?: Record<string, any>
}

/**
 * Validation result with detailed error information
 */
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings?: string[]
}

/**
 * Parameter validation options
 */
export interface ValidationOptions {
  strict?: boolean
  allowEmpty?: boolean
  validateSchema?: boolean
  maxDepth?: number
}

/**
 * Validates a complete block configuration
 */
export function validateBlockConfig(
  blockConfig: Partial<BlockConfig>,
  options: ValidationOptions = {}
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Handle null/undefined input
  if (!blockConfig || typeof blockConfig !== 'object') {
    errors.push({
      code: 'MISSING_BLOCK_CONFIG',
      message: 'Block configuration is required and must be an object',
      value: blockConfig,
    })
    return { isValid: false, errors }
  }

  logger.debug('Validating block configuration', {
    blockType: blockConfig?.type,
    options,
  })

  try {
    // Required fields validation
    if (!blockConfig.type) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Block type is required',
        field: 'type',
      })
    } else if (typeof blockConfig.type !== 'string') {
      errors.push({
        code: 'INVALID_FIELD_TYPE',
        message: 'Block type must be a string',
        field: 'type',
        value: blockConfig.type,
      })
    } else if (!blockConfig.type.match(/^[a-z][a-z0-9_]*[a-z0-9]?$/)) {
      errors.push({
        code: 'INVALID_BLOCK_TYPE_FORMAT',
        message:
          'Block type must follow naming convention: lowercase, alphanumeric, underscores only',
        field: 'type',
        value: blockConfig.type,
      })
    }

    if (!blockConfig.name) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Block name is required',
        field: 'name',
      })
    } else if (typeof blockConfig.name !== 'string') {
      errors.push({
        code: 'INVALID_FIELD_TYPE',
        message: 'Block name must be a string',
        field: 'name',
        value: blockConfig.name,
      })
    }

    if (!blockConfig.description) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Block description is required',
        field: 'description',
      })
    } else if (typeof blockConfig.description !== 'string') {
      errors.push({
        code: 'INVALID_FIELD_TYPE',
        message: 'Block description must be a string',
        field: 'description',
        value: blockConfig.description,
      })
    }

    if (!blockConfig.category) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Block category is required',
        field: 'category',
      })
    } else if (!['blocks', 'tools', 'triggers'].includes(blockConfig.category)) {
      errors.push({
        code: 'INVALID_CATEGORY',
        message: 'Block category must be one of: blocks, tools, triggers',
        field: 'category',
        value: blockConfig.category,
      })
    }

    if (!blockConfig.bgColor) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Block background color is required',
        field: 'bgColor',
      })
    } else if (typeof blockConfig.bgColor !== 'string') {
      errors.push({
        code: 'INVALID_FIELD_TYPE',
        message: 'Block background color must be a string',
        field: 'bgColor',
        value: blockConfig.bgColor,
      })
    } else if (!blockConfig.bgColor.match(/^#[0-9A-Fa-f]{6}$/)) {
      errors.push({
        code: 'INVALID_COLOR_FORMAT',
        message: 'Block background color must be a valid hex color (#RRGGBB)',
        field: 'bgColor',
        value: blockConfig.bgColor,
      })
    }

    if (!blockConfig.icon) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Block icon is required',
        field: 'icon',
      })
    } else if (typeof blockConfig.icon !== 'function') {
      errors.push({
        code: 'INVALID_FIELD_TYPE',
        message: 'Block icon must be a React component function',
        field: 'icon',
        value: typeof blockConfig.icon,
      })
    }

    // Validate subBlocks array
    if (!blockConfig.subBlocks) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Block subBlocks array is required',
        field: 'subBlocks',
      })
    } else if (!Array.isArray(blockConfig.subBlocks)) {
      errors.push({
        code: 'INVALID_FIELD_TYPE',
        message: 'Block subBlocks must be an array',
        field: 'subBlocks',
        value: typeof blockConfig.subBlocks,
      })
    } else {
      blockConfig.subBlocks.forEach((subBlock, index) => {
        const subBlockValidation = validateSubBlockConfig(subBlock, options)
        if (!subBlockValidation.isValid) {
          subBlockValidation.errors.forEach((error) => {
            errors.push({
              ...error,
              field: `subBlocks[${index}].${error.field || 'unknown'}`,
              context: { subBlockIndex: index, ...error.context },
            })
          })
        }
      })
    }

    // Validate tools configuration
    if (!blockConfig.tools) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Block tools configuration is required',
        field: 'tools',
      })
    } else {
      if (!blockConfig.tools.access) {
        errors.push({
          code: 'MISSING_REQUIRED_FIELD',
          message: 'Block tools.access array is required',
          field: 'tools.access',
        })
      } else if (!Array.isArray(blockConfig.tools.access)) {
        errors.push({
          code: 'INVALID_FIELD_TYPE',
          message: 'Block tools.access must be an array',
          field: 'tools.access',
          value: typeof blockConfig.tools.access,
        })
      }

      if (blockConfig.tools.config) {
        if (blockConfig.tools.config.tool && typeof blockConfig.tools.config.tool !== 'function') {
          errors.push({
            code: 'INVALID_FIELD_TYPE',
            message: 'Block tools.config.tool must be a function',
            field: 'tools.config.tool',
            value: typeof blockConfig.tools.config.tool,
          })
        }

        if (
          blockConfig.tools.config.params &&
          typeof blockConfig.tools.config.params !== 'function'
        ) {
          errors.push({
            code: 'INVALID_FIELD_TYPE',
            message: 'Block tools.config.params must be a function',
            field: 'tools.config.params',
            value: typeof blockConfig.tools.config.params,
          })
        }
      }
    }

    // Validate inputs
    if (!blockConfig.inputs) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Block inputs configuration is required',
        field: 'inputs',
      })
    } else if (typeof blockConfig.inputs !== 'object' || Array.isArray(blockConfig.inputs)) {
      errors.push({
        code: 'INVALID_FIELD_TYPE',
        message: 'Block inputs must be an object',
        field: 'inputs',
        value: typeof blockConfig.inputs,
      })
    } else {
      Object.entries(blockConfig.inputs).forEach(([inputKey, inputConfig]) => {
        const inputValidation = validateParamConfig(inputConfig)
        if (!inputValidation.isValid) {
          inputValidation.errors.forEach((error) => {
            errors.push({
              ...error,
              field: `inputs.${inputKey}.${error.field || 'unknown'}`,
              context: { inputKey, ...error.context },
            })
          })
        }
      })
    }

    // Validate outputs
    if (!blockConfig.outputs) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Block outputs configuration is required',
        field: 'outputs',
      })
    } else if (typeof blockConfig.outputs !== 'object' || Array.isArray(blockConfig.outputs)) {
      errors.push({
        code: 'INVALID_FIELD_TYPE',
        message: 'Block outputs must be an object',
        field: 'outputs',
        value: typeof blockConfig.outputs,
      })
    } else {
      Object.entries(blockConfig.outputs).forEach(([outputKey, outputConfig]) => {
        // Skip the special 'visualization' key as it has a different structure
        if (outputKey === 'visualization') {
          return
        }
        // TypeScript assertion: we've filtered out visualization, so this must be OutputFieldDefinition
        const outputValidation = validateOutputFieldDefinition(
          outputConfig as OutputFieldDefinition
        )
        if (!outputValidation.isValid) {
          outputValidation.errors.forEach((error) => {
            errors.push({
              ...error,
              field: `outputs.${outputKey}.${error.field || 'unknown'}`,
              context: { outputKey, ...error.context },
            })
          })
        }
      })
    }

    // Optional field validation
    if (blockConfig.longDescription && typeof blockConfig.longDescription !== 'string') {
      errors.push({
        code: 'INVALID_FIELD_TYPE',
        message: 'Block longDescription must be a string',
        field: 'longDescription',
        value: typeof blockConfig.longDescription,
      })
    }

    if (blockConfig.docsLink && typeof blockConfig.docsLink !== 'string') {
      errors.push({
        code: 'INVALID_FIELD_TYPE',
        message: 'Block docsLink must be a string',
        field: 'docsLink',
        value: typeof blockConfig.docsLink,
      })
    } else if (blockConfig.docsLink && !isValidUrl(blockConfig.docsLink)) {
      warnings.push(`Block docsLink appears to be an invalid URL: ${blockConfig.docsLink}`)
    }

    if (blockConfig.hideFromToolbar && typeof blockConfig.hideFromToolbar !== 'boolean') {
      errors.push({
        code: 'INVALID_FIELD_TYPE',
        message: 'Block hideFromToolbar must be a boolean',
        field: 'hideFromToolbar',
        value: typeof blockConfig.hideFromToolbar,
      })
    }

    // Trigger configuration validation
    if (blockConfig.triggers) {
      if (typeof blockConfig.triggers !== 'object' || Array.isArray(blockConfig.triggers)) {
        errors.push({
          code: 'INVALID_FIELD_TYPE',
          message: 'Block triggers must be an object',
          field: 'triggers',
          value: typeof blockConfig.triggers,
        })
      } else {
        if (typeof blockConfig.triggers.enabled !== 'boolean') {
          errors.push({
            code: 'INVALID_FIELD_TYPE',
            message: 'Block triggers.enabled must be a boolean',
            field: 'triggers.enabled',
            value: typeof blockConfig.triggers.enabled,
          })
        }

        if (!Array.isArray(blockConfig.triggers.available)) {
          errors.push({
            code: 'INVALID_FIELD_TYPE',
            message: 'Block triggers.available must be an array',
            field: 'triggers.available',
            value: typeof blockConfig.triggers.available,
          })
        }
      }
    }
  } catch (error) {
    logger.error('Error during block configuration validation', {
      error: error instanceof Error ? error.message : String(error),
      blockType: blockConfig.type,
    })

    errors.push({
      code: 'VALIDATION_EXCEPTION',
      message: `Unexpected error during validation: ${error instanceof Error ? error.message : String(error)}`,
      context: { originalError: error },
    })
  }

  const isValid = errors.length === 0

  logger.debug('Block configuration validation completed', {
    blockType: blockConfig.type,
    isValid,
    errorCount: errors.length,
    warningCount: warnings.length,
  })

  return {
    isValid,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

/**
 * Validates a parameter configuration
 */
export function validateParamConfig(paramConfig: ParamConfig): ValidationResult {
  const errors: ValidationError[] = []

  if (!paramConfig) {
    errors.push({
      code: 'MISSING_PARAM_CONFIG',
      message: 'Parameter configuration is required',
    })
    return { isValid: false, errors }
  }

  // Validate param type
  if (!paramConfig.type) {
    errors.push({
      code: 'MISSING_REQUIRED_FIELD',
      message: 'Parameter type is required',
      field: 'type',
    })
  } else if (!['string', 'number', 'boolean', 'json'].includes(paramConfig.type)) {
    errors.push({
      code: 'INVALID_PARAM_TYPE',
      message: 'Parameter type must be one of: string, number, boolean, json',
      field: 'type',
      value: paramConfig.type,
    })
  }

  // Validate optional description
  if (paramConfig.description && typeof paramConfig.description !== 'string') {
    errors.push({
      code: 'INVALID_FIELD_TYPE',
      message: 'Parameter description must be a string',
      field: 'description',
      value: typeof paramConfig.description,
    })
  }

  // Validate schema if present
  if (paramConfig.schema) {
    const schemaValidation = validateJsonSchema(paramConfig.schema)
    if (!schemaValidation.isValid) {
      schemaValidation.errors.forEach((error) => {
        errors.push({
          ...error,
          field: `schema.${error.field || 'unknown'}`,
        })
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validates a sub-block configuration
 */
export function validateSubBlockConfig(
  subBlockConfig: SubBlockConfig,
  options: ValidationOptions = {}
): ValidationResult {
  const errors: ValidationError[] = []

  if (!subBlockConfig) {
    errors.push({
      code: 'MISSING_SUBBLOCK_CONFIG',
      message: 'Sub-block configuration is required',
    })
    return { isValid: false, errors }
  }

  // Required fields
  if (!subBlockConfig.id) {
    errors.push({
      code: 'MISSING_REQUIRED_FIELD',
      message: 'Sub-block ID is required',
      field: 'id',
    })
  } else if (typeof subBlockConfig.id !== 'string') {
    errors.push({
      code: 'INVALID_FIELD_TYPE',
      message: 'Sub-block ID must be a string',
      field: 'id',
      value: typeof subBlockConfig.id,
    })
  }

  if (!subBlockConfig.type) {
    errors.push({
      code: 'MISSING_REQUIRED_FIELD',
      message: 'Sub-block type is required',
      field: 'type',
    })
  } else if (!isValidSubBlockType(subBlockConfig.type)) {
    errors.push({
      code: 'INVALID_SUBBLOCK_TYPE',
      message: 'Sub-block type is not valid',
      field: 'type',
      value: subBlockConfig.type,
    })
  }

  // Optional field validation
  if (subBlockConfig.layout && !['full', 'half'].includes(subBlockConfig.layout)) {
    errors.push({
      code: 'INVALID_LAYOUT',
      message: 'Sub-block layout must be "full" or "half"',
      field: 'layout',
      value: subBlockConfig.layout,
    })
  }

  if (subBlockConfig.mode && !['basic', 'advanced', 'both'].includes(subBlockConfig.mode)) {
    errors.push({
      code: 'INVALID_MODE',
      message: 'Sub-block mode must be "basic", "advanced", or "both"',
      field: 'mode',
      value: subBlockConfig.mode,
    })
  }

  if (subBlockConfig.required && typeof subBlockConfig.required !== 'boolean') {
    errors.push({
      code: 'INVALID_FIELD_TYPE',
      message: 'Sub-block required must be a boolean',
      field: 'required',
      value: typeof subBlockConfig.required,
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validates an output field definition
 */
export function validateOutputFieldDefinition(
  outputField: OutputFieldDefinition
): ValidationResult {
  const errors: ValidationError[] = []

  if (!outputField) {
    errors.push({
      code: 'MISSING_OUTPUT_FIELD',
      message: 'Output field definition is required',
    })
    return { isValid: false, errors }
  }

  // Handle both formats: string type or { type, description } object
  if (typeof outputField === 'string') {
    if (!isValidPrimitiveValueType(outputField)) {
      errors.push({
        code: 'INVALID_OUTPUT_TYPE',
        message: 'Output field type is not valid',
        value: outputField,
      })
    }
  } else if (typeof outputField === 'object') {
    if (!outputField.type) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Output field type is required',
        field: 'type',
      })
    } else if (!isValidPrimitiveValueType(outputField.type)) {
      errors.push({
        code: 'INVALID_OUTPUT_TYPE',
        message: 'Output field type is not valid',
        field: 'type',
        value: outputField.type,
      })
    }

    if (outputField.description && typeof outputField.description !== 'string') {
      errors.push({
        code: 'INVALID_FIELD_TYPE',
        message: 'Output field description must be a string',
        field: 'description',
        value: typeof outputField.description,
      })
    }
  } else {
    errors.push({
      code: 'INVALID_OUTPUT_FIELD_FORMAT',
      message: 'Output field must be a string type or object with type property',
      value: typeof outputField,
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validates runtime parameter values against their configuration
 */
export function validateParameterValues(
  values: Record<string, any>,
  paramConfigs: Record<string, ParamConfig>,
  options: ValidationOptions = {}
): ValidationResult {
  logger.debug('Validating parameter values', {
    paramCount: Object.keys(values).length,
    configCount: Object.keys(paramConfigs).length,
    options,
  })

  const errors: ValidationError[] = []

  try {
    // Check required parameters
    Object.entries(paramConfigs).forEach(([paramName, paramConfig]) => {
      const value = values[paramName]

      // Check if value exists for required parameters
      if (value === undefined || value === null) {
        if (!options.allowEmpty) {
          errors.push({
            code: 'MISSING_REQUIRED_PARAMETER',
            message: `Required parameter '${paramName}' is missing`,
            field: paramName,
            context: { paramConfig },
          })
        }
        return
      }

      // Type validation
      const typeValidation = validateParameterType(value, paramConfig.type, paramName)
      if (!typeValidation.isValid) {
        errors.push(...typeValidation.errors)
      }

      // Schema validation
      if (paramConfig.schema && options.validateSchema) {
        const schemaValidation = validateValueAgainstSchema(value, paramConfig.schema, paramName)
        if (!schemaValidation.isValid) {
          errors.push(...schemaValidation.errors)
        }
      }
    })

    // Check for unexpected parameters in strict mode
    if (options.strict) {
      Object.keys(values).forEach((paramName) => {
        if (!(paramName in paramConfigs)) {
          errors.push({
            code: 'UNEXPECTED_PARAMETER',
            message: `Unexpected parameter '${paramName}' found`,
            field: paramName,
            value: values[paramName],
          })
        }
      })
    }
  } catch (error) {
    logger.error('Error during parameter validation', {
      error: error instanceof Error ? error.message : String(error),
      paramCount: Object.keys(values).length,
    })

    errors.push({
      code: 'PARAMETER_VALIDATION_EXCEPTION',
      message: `Unexpected error during parameter validation: ${error instanceof Error ? error.message : String(error)}`,
      context: { originalError: error },
    })
  }

  const isValid = errors.length === 0

  logger.debug('Parameter validation completed', {
    isValid,
    errorCount: errors.length,
  })

  return {
    isValid,
    errors,
  }
}

/**
 * Validates a parameter value against its expected type
 */
function validateParameterType(
  value: any,
  expectedType: ParamType,
  paramName: string
): ValidationResult {
  const errors: ValidationError[] = []

  switch (expectedType) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push({
          code: 'INVALID_PARAMETER_TYPE',
          message: `Parameter '${paramName}' must be a string`,
          field: paramName,
          value: value,
          context: { expectedType: 'string', actualType: typeof value },
        })
      }
      break

    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value)) {
        errors.push({
          code: 'INVALID_PARAMETER_TYPE',
          message: `Parameter '${paramName}' must be a valid number`,
          field: paramName,
          value: value,
          context: { expectedType: 'number', actualType: typeof value },
        })
      }
      break

    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push({
          code: 'INVALID_PARAMETER_TYPE',
          message: `Parameter '${paramName}' must be a boolean`,
          field: paramName,
          value: value,
          context: { expectedType: 'boolean', actualType: typeof value },
        })
      }
      break

    case 'json':
      try {
        if (typeof value === 'string') {
          JSON.parse(value)
        } else if (typeof value !== 'object' || value === null) {
          errors.push({
            code: 'INVALID_PARAMETER_TYPE',
            message: `Parameter '${paramName}' must be a valid JSON object or string`,
            field: paramName,
            value: value,
            context: { expectedType: 'json', actualType: typeof value },
          })
        }
      } catch (jsonError) {
        errors.push({
          code: 'INVALID_JSON_FORMAT',
          message: `Parameter '${paramName}' contains invalid JSON`,
          field: paramName,
          value: value,
          context: {
            parseError: jsonError instanceof Error ? jsonError.message : String(jsonError),
          },
        })
      }
      break

    default:
      errors.push({
        code: 'UNKNOWN_PARAMETER_TYPE',
        message: `Unknown parameter type '${expectedType}' for parameter '${paramName}'`,
        field: paramName,
        context: { unknownType: expectedType },
      })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Helper function to validate JSON schema structure
 */
function validateJsonSchema(schema: any): ValidationResult {
  const errors: ValidationError[] = []

  if (!schema || typeof schema !== 'object') {
    errors.push({
      code: 'INVALID_SCHEMA_FORMAT',
      message: 'Schema must be a valid object',
      value: typeof schema,
    })
    return { isValid: false, errors }
  }

  if (!schema.type) {
    errors.push({
      code: 'MISSING_SCHEMA_TYPE',
      message: 'Schema type is required',
      field: 'type',
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validates a value against a JSON schema
 */
function validateValueAgainstSchema(value: any, schema: any, fieldName: string): ValidationResult {
  const errors: ValidationError[] = []

  // Basic schema validation implementation
  if (schema.type === 'object' && typeof value !== 'object') {
    errors.push({
      code: 'SCHEMA_TYPE_MISMATCH',
      message: `Value for '${fieldName}' must be an object according to schema`,
      field: fieldName,
      value: value,
      context: { expectedSchemaType: 'object', actualType: typeof value },
    })
  }

  if (schema.required && Array.isArray(schema.required)) {
    schema.required.forEach((requiredField: string) => {
      if (!value || typeof value !== 'object' || !(requiredField in value)) {
        errors.push({
          code: 'MISSING_REQUIRED_SCHEMA_FIELD',
          message: `Required field '${requiredField}' is missing in '${fieldName}'`,
          field: `${fieldName}.${requiredField}`,
          context: { requiredField, parentField: fieldName },
        })
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Helper function to check if a SubBlockType is valid
 */
function isValidSubBlockType(type: string): type is SubBlockType {
  const validTypes: SubBlockType[] = [
    'short-input',
    'long-input',
    'dropdown',
    'combobox',
    'slider',
    'table',
    'code',
    'switch',
    'tool-input',
    'checkbox-list',
    'condition-input',
    'eval-input',
    'time-input',
    'oauth-input',
    'webhook-config',
    'trigger-config',
    'schedule-config',
    'file-selector',
    'project-selector',
    'channel-selector',
    'folder-selector',
    'knowledge-base-selector',
    'knowledge-tag-filters',
    'document-selector',
    'document-tag-entry',
    'input-format',
    'response-format',
    'file-upload',
  ]

  return validTypes.includes(type as SubBlockType)
}

/**
 * Helper function to check if a PrimitiveValueType is valid
 */
function isValidPrimitiveValueType(type: string): type is PrimitiveValueType {
  const validTypes: PrimitiveValueType[] = ['string', 'number', 'boolean', 'json', 'array', 'any']
  return validTypes.includes(type as PrimitiveValueType)
}

/**
 * Helper function to validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
