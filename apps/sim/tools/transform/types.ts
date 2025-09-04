/**
 * Data transformation tool types
 */

export interface TransformConfig {
  input: {
    format: 'json' | 'csv' | 'xml' | 'yaml' | 'text'
    data: unknown
    schema?: Record<string, unknown>
  }
  output: {
    format: 'json' | 'csv' | 'xml' | 'yaml' | 'text'
    schema?: Record<string, unknown>
    options?: TransformOptions
  }
  transformations: Transformation[]
}

export interface TransformOptions {
  pretty?: boolean
  delimiter?: string // for CSV
  encoding?: string
  headers?: boolean // for CSV
}

export interface Transformation {
  type: 'map' | 'filter' | 'sort' | 'group' | 'aggregate' | 'convert' | 'validate'
  field?: string
  condition?: string // JavaScript expression
  operation?: string // JavaScript expression
  target?: string
  options?: Record<string, unknown>
}

export interface TransformResponse {
  success: boolean
  output: Record<string, any> // Required by ToolResponse interface
  data: unknown
  originalFormat: string
  outputFormat: string
  transformationsApplied: number
  metadata?: {
    recordsProcessed: number
    recordsFiltered: number
    errors: TransformError[]
  }
  error?: string
}

export interface TransformError {
  message: string
  field?: string
  line?: number
  transformation?: string
}

export interface DataSchema {
  fields: SchemaField[]
  required?: string[]
  validation?: ValidationRule[]
}

export interface SchemaField {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array'
  description?: string
  example?: unknown
  constraints?: FieldConstraints
}

export interface FieldConstraints {
  minLength?: number
  maxLength?: number
  pattern?: string
  minimum?: number
  maximum?: number
  enum?: unknown[]
}

export interface ValidationRule {
  field: string
  rule: string // JavaScript expression
  message: string
}