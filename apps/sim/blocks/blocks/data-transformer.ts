import { ComponentIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { TransformResponse } from '@/tools/transform/types'

export const DataTransformerBlock: BlockConfig<TransformResponse> = {
  type: 'data_transformer',
  name: 'Data Transformer',
  description: 'Advanced data transformation and ETL pipeline processor',
  longDescription:
    'Transform, validate, and process data through configurable pipelines. Support for complex mappings, data validation, format conversion, and batch processing with streaming capabilities.',
  docsLink: 'https://docs.sim.ai/blocks/data-transformer',
  category: 'blocks',
  bgColor: '#7C3AED',
  icon: ComponentIcon,
  subBlocks: [
    {
      id: 'inputData',
      title: 'Input Data',
      type: 'code',
      layout: 'full',
      language: 'json',
      placeholder: `{
  "users": [
    {"id": 1, "name": "John Doe", "email": "john@example.com"},
    {"id": 2, "name": "Jane Smith", "email": "jane@example.com"}
  ]
}`,
      required: true,
      rows: 8,
      description: 'Data to transform (JSON, CSV, XML, or reference to previous block)',
    },
    {
      id: 'inputFormat',
      title: 'Input Format',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        { label: 'JSON', id: 'json' },
        { label: 'CSV', id: 'csv' },
        { label: 'XML', id: 'xml' },
        { label: 'YAML', id: 'yaml' },
        { label: 'Array of Objects', id: 'array' },
        { label: 'Key-Value Pairs', id: 'keyvalue' },
      ],
      value: () => 'json',
    },
    {
      id: 'outputFormat',
      title: 'Output Format',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        { label: 'JSON', id: 'json' },
        { label: 'CSV', id: 'csv' },
        { label: 'XML', id: 'xml' },
        { label: 'YAML', id: 'yaml' },
        { label: 'Array of Objects', id: 'array' },
        { label: 'Flattened Object', id: 'flat' },
      ],
      value: () => 'json',
    },
    {
      id: 'transformationMode',
      title: 'Transformation Mode',
      type: 'dropdown',
      layout: 'full',
      required: true,
      options: [
        { label: 'Field Mapping', id: 'mapping' },
        { label: 'JavaScript Transform', id: 'javascript' },
        { label: 'JSONata Expression', id: 'jsonata' },
        { label: 'Template Engine', id: 'template' },
        { label: 'SQL-like Transform', id: 'sql' },
      ],
      value: () => 'mapping',
    },
    // Field Mapping Mode
    {
      id: 'fieldMappings',
      title: 'Field Mappings',
      type: 'table',
      layout: 'full',
      columns: ['Source Field', 'Target Field', 'Transform Function'],
      condition: { field: 'transformationMode', value: 'mapping' },
      description: 'Map source fields to target fields with optional transformations',
    },
    {
      id: 'defaultValues',
      title: 'Default Values',
      type: 'code',
      layout: 'full',
      language: 'json',
      placeholder: `{
  "created_at": "{{NOW}}",
  "status": "active",
  "version": 1
}`,
      condition: { field: 'transformationMode', value: 'mapping' },
      description: 'Default values for new fields',
    },
    // JavaScript Transform Mode
    {
      id: 'jsTransform',
      title: 'JavaScript Transformation',
      type: 'code',
      layout: 'full',
      language: 'javascript',
      placeholder: `function transform(data, context) {
  // Transform array of objects
  if (Array.isArray(data)) {
    return data.map(item => ({
      id: item.id,
      fullName: \`\${item.firstName} \${item.lastName}\`,
      email: item.email.toLowerCase(),
      createdAt: new Date().toISOString(),
      // Add computed fields
      displayName: item.firstName || item.email.split('@')[0]
    }));
  }
  
  // Transform single object
  return {
    ...data,
    processed: true,
    timestamp: Date.now()
  };
}`,
      condition: { field: 'transformationMode', value: 'javascript' },
      required: true,
      rows: 15,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `You are an expert JavaScript developer specializing in data transformation. Create a transformation function based on the user's requirements.

Current context: {context}

The function should:
1. Take parameters: (data, context)
2. Handle both arrays and single objects
3. Return transformed data
4. Include error handling
5. Be efficient for large datasets

Generate ONLY the JavaScript function, no explanations:

function transform(data, context) {
  // Your transformation logic here
  return transformedData;
}`,
        placeholder: 'Describe the data transformation you need...',
        generationType: 'javascript-function-body',
      },
    },
    // JSONata Expression Mode
    {
      id: 'jsonataExpression',
      title: 'JSONata Expression',
      type: 'code',
      layout: 'full',
      language: 'javascript',
      placeholder: `$map(users, function($user) {
  {
    "id": $user.id,
    "name": $user.firstName & " " & $user.lastName,
    "email": $lowercase($user.email),
    "domain": $substringAfter($user.email, "@"),
    "age_group": $user.age > 30 ? "senior" : "junior"
  }
})`,
      condition: { field: 'transformationMode', value: 'jsonata' },
      required: true,
      rows: 10,
      description: 'JSONata expression for advanced data transformation',
    },
    // Template Engine Mode
    {
      id: 'transformTemplate',
      title: 'Transform Template',
      type: 'code',
      layout: 'full',
      language: 'javascript',
      placeholder: `{
  "users": "{{#each data.users}}",
  "id": "{{this.id}}",
  "fullName": "{{this.firstName}} {{this.lastName}}",
  "email": "{{lowercase this.email}}",
  "processedAt": "{{now}}"
  "{{/each}}"
}`,
      condition: { field: 'transformationMode', value: 'template' },
      required: true,
      rows: 12,
      description: 'Handlebars-style template for transformation',
    },
    // SQL-like Transform Mode
    {
      id: 'sqlTransform',
      title: 'SQL Transform Query',
      type: 'code',
      layout: 'full',
      language: 'sql',
      placeholder: `SELECT 
  id,
  CONCAT(firstName, ' ', lastName) as fullName,
  LOWER(email) as email,
  CASE 
    WHEN age > 30 THEN 'senior'
    ELSE 'junior'
  END as ageGroup,
  NOW() as processedAt
FROM users
WHERE active = true
ORDER BY lastName, firstName`,
      condition: { field: 'transformationMode', value: 'sql' },
      required: true,
      rows: 12,
      description: 'SQL-like transformation query',
    },
    {
      id: 'dataValidation',
      title: 'Enable Data Validation',
      type: 'switch',
      layout: 'half',
      description: 'Validate data before and after transformation',
    },
    {
      id: 'inputSchema',
      title: 'Input Schema',
      type: 'code',
      layout: 'full',
      language: 'json',
      placeholder: `{
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id", "email"],
    "properties": {
      "id": {"type": "number"},
      "email": {"type": "string", "format": "email"},
      "name": {"type": "string", "minLength": 1}
    }
  }
}`,
      condition: { field: 'dataValidation', value: true },
      description: 'JSON Schema for input validation',
    },
    {
      id: 'outputSchema',
      title: 'Output Schema',
      type: 'code',
      layout: 'full',
      language: 'json',
      placeholder: `{
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id", "fullName", "email"],
    "properties": {
      "id": {"type": "number"},
      "fullName": {"type": "string"},
      "email": {"type": "string", "format": "email"},
      "processedAt": {"type": "string", "format": "date-time"}
    }
  }
}`,
      condition: { field: 'dataValidation', value: true },
      description: 'JSON Schema for output validation',
    },
    {
      id: 'errorHandling',
      title: 'Error Handling',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Fail on First Error', id: 'fail_fast' },
        { label: 'Skip Invalid Records', id: 'skip_invalid' },
        { label: 'Collect All Errors', id: 'collect_errors' },
        { label: 'Use Default Values', id: 'use_defaults' },
      ],
      value: () => 'fail_fast',
      description: 'How to handle transformation errors',
    },
    {
      id: 'batchProcessing',
      title: 'Enable Batch Processing',
      type: 'switch',
      layout: 'half',
      description: 'Process data in batches for large datasets',
    },
    {
      id: 'batchSize',
      title: 'Batch Size',
      type: 'slider',
      layout: 'half',
      min: 10,
      max: 10000,
      step: 10,
      value: () => '1000',
      condition: { field: 'batchProcessing', value: true },
      description: 'Number of records per batch',
    },
    {
      id: 'parallelProcessing',
      title: 'Parallel Processing',
      type: 'switch',
      layout: 'half',
      condition: { field: 'batchProcessing', value: true },
      description: 'Process batches in parallel',
    },
    {
      id: 'preserveOriginal',
      title: 'Preserve Original Data',
      type: 'switch',
      layout: 'half',
      description: 'Include original data in output',
    },
    {
      id: 'compressionOutput',
      title: 'Compress Output',
      type: 'switch',
      layout: 'half',
      description: 'Compress output for large datasets',
    },
  ],
  tools: {
    access: ['data_transformer'],
  },
  inputs: {
    inputData: { type: 'json', description: 'Data to transform' },
    inputFormat: { type: 'string', description: 'Input data format' },
    outputFormat: { type: 'string', description: 'Output data format' },
    transformationMode: { type: 'string', description: 'Transformation method' },
    fieldMappings: { type: 'json', description: 'Field mapping configuration' },
    defaultValues: { type: 'json', description: 'Default field values' },
    jsTransform: { type: 'string', description: 'JavaScript transformation function' },
    jsonataExpression: { type: 'string', description: 'JSONata transformation expression' },
    transformTemplate: { type: 'string', description: 'Transformation template' },
    sqlTransform: { type: 'string', description: 'SQL-like transformation query' },
    dataValidation: { type: 'boolean', description: 'Enable data validation' },
    inputSchema: { type: 'json', description: 'Input validation schema' },
    outputSchema: { type: 'json', description: 'Output validation schema' },
    errorHandling: { type: 'string', description: 'Error handling strategy' },
    batchProcessing: { type: 'boolean', description: 'Enable batch processing' },
    batchSize: { type: 'number', description: 'Batch size for processing' },
    parallelProcessing: { type: 'boolean', description: 'Enable parallel processing' },
    preserveOriginal: { type: 'boolean', description: 'Preserve original data' },
    compressionOutput: { type: 'boolean', description: 'Compress output data' },
  },
  outputs: {
    transformedData: { type: 'json', description: 'Transformed data' },
    originalData: { type: 'json', description: 'Original data (if preserved)' },
    recordCount: { type: 'number', description: 'Number of records processed' },
    errorCount: { type: 'number', description: 'Number of errors encountered' },
    errors: { type: 'array', description: 'Processing errors' },
    validationResults: { type: 'json', description: 'Validation results' },
    processingTime: { type: 'number', description: 'Processing time in milliseconds' },
    batchInfo: { type: 'json', description: 'Batch processing information' },
    compressionRatio: { type: 'number', description: 'Compression ratio if enabled' },
    metadata: { type: 'json', description: 'Transformation metadata' },
    error: { type: 'string', description: 'Error message if transformation failed' },
  },
}