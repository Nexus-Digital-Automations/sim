/**
 * Result Compatibility Engine
 * ===========================
 *
 * Ensures that journey execution produces identical results to workflow execution
 * through result formatting, transformation, validation, and comparison systems.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  ExecutionResult,
  WorkflowExecutionResult,
  JourneyExecutionResult,
  ResultComparison,
  ResultCompatibilityConfig,
  ResultFormatter,
  ResultTransformer,
  ResultValidator,
  ExecutionContext,
  CompatibilityReport,
  ResultDiff,
  FormatValidationResult
} from './types'

const logger = createLogger('ResultCompatibilityEngine')

/**
 * Core engine that ensures result compatibility between workflow and journey execution
 */
export class ResultCompatibilityEngine {
  private config: ResultCompatibilityConfig
  private formatters: Map<string, ResultFormatter> = new Map()
  private transformers: Map<string, ResultTransformer> = new Map()
  private validators: Map<string, ResultValidator> = new Map()

  constructor(config: ResultCompatibilityConfig) {
    this.config = config
    this.initializeBuiltInComponents()
    logger.info('ResultCompatibilityEngine initialized', { config })
  }

  /**
   * Compare execution results between workflow and journey modes
   */
  async compareExecutionResults(
    workflowResult: WorkflowExecutionResult,
    journeyResult: JourneyExecutionResult,
    context: ExecutionContext
  ): Promise<ResultComparison> {
    const startTime = Date.now()
    logger.info('Starting result comparison', {
      workflowId: workflowResult.workflowId,
      journeyId: journeyResult.journeyId,
      executionId: context.executionId
    })

    try {
      // Normalize results to common format
      const normalizedWorkflowResult = await this.normalizeWorkflowResult(workflowResult, context)
      const normalizedJourneyResult = await this.normalizeJourneyResult(journeyResult, context)

      // Perform deep comparison
      const comparison = await this.performDeepComparison(
        normalizedWorkflowResult,
        normalizedJourneyResult,
        context
      )

      // Generate compatibility report
      const report = await this.generateCompatibilityReport(comparison, context)

      const processingTime = Date.now() - startTime
      logger.info('Result comparison completed', {
        compatible: comparison.compatible,
        differences: comparison.differences.length,
        processingTimeMs: processingTime
      })

      return {
        ...comparison,
        metadata: {
          ...comparison.metadata,
          processingTimeMs: processingTime,
          comparedAt: new Date().toISOString()
        }
      }

    } catch (error) {
      logger.error('Result comparison failed', {
        error: error instanceof Error ? error.message : String(error),
        workflowId: workflowResult.workflowId,
        journeyId: journeyResult.journeyId
      })
      throw error
    }
  }

  /**
   * Format result for compatibility checking
   */
  async formatResult(
    result: ExecutionResult,
    targetFormat: string,
    context: ExecutionContext
  ): Promise<any> {
    const formatter = this.formatters.get(targetFormat)
    if (!formatter) {
      throw new Error(`No formatter found for format: ${targetFormat}`)
    }

    logger.debug('Formatting result', { targetFormat, resultType: result.type })
    return await formatter.format(result, context)
  }

  /**
   * Transform result structure for comparison
   */
  async transformResult(
    result: any,
    transformation: string,
    context: ExecutionContext
  ): Promise<any> {
    const transformer = this.transformers.get(transformation)
    if (!transformer) {
      throw new Error(`No transformer found for transformation: ${transformation}`)
    }

    logger.debug('Transforming result', { transformation })
    return await transformer.transform(result, context)
  }

  /**
   * Validate result format and structure
   */
  async validateResult(
    result: any,
    validationType: string,
    context: ExecutionContext
  ): Promise<FormatValidationResult> {
    const validator = this.validators.get(validationType)
    if (!validator) {
      throw new Error(`No validator found for validation type: ${validationType}`)
    }

    logger.debug('Validating result', { validationType })
    return await validator.validate(result, context)
  }

  /**
   * Register custom result formatter
   */
  registerFormatter(name: string, formatter: ResultFormatter): void {
    this.formatters.set(name, formatter)
    logger.info('Result formatter registered', { name })
  }

  /**
   * Register custom result transformer
   */
  registerTransformer(name: string, transformer: ResultTransformer): void {
    this.transformers.set(name, transformer)
    logger.info('Result transformer registered', { name })
  }

  /**
   * Register custom result validator
   */
  registerValidator(name: string, validator: ResultValidator): void {
    this.validators.set(name, validator)
    logger.info('Result validator registered', { name })
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private async normalizeWorkflowResult(
    result: WorkflowExecutionResult,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    logger.debug('Normalizing workflow result')

    // Apply configured transformations
    let normalizedResult: any = {
      type: 'workflow',
      executionId: result.executionId,
      workflowId: result.workflowId,
      status: result.status,
      startTime: result.startTime,
      endTime: result.endTime,
      duration: result.duration,
      outputs: result.outputs,
      blockResults: result.blockResults,
      variables: result.variables,
      errors: result.errors,
      warnings: result.warnings,
      metadata: result.metadata
    }

    // Apply standard normalizations
    normalizedResult = await this.applyStandardNormalizations(normalizedResult, 'workflow', context)

    // Apply custom transformations if configured
    for (const transformation of this.config.workflowTransformations) {
      normalizedResult = await this.transformResult(normalizedResult, transformation, context)
    }

    return normalizedResult
  }

  private async normalizeJourneyResult(
    result: JourneyExecutionResult,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    logger.debug('Normalizing journey result')

    // Apply configured transformations
    let normalizedResult: any = {
      type: 'journey',
      executionId: result.executionId,
      journeyId: result.journeyId,
      status: result.status,
      startTime: result.startTime,
      endTime: result.endTime,
      duration: result.duration,
      outputs: result.outputs,
      stepResults: result.stepResults,
      variables: result.variables,
      errors: result.errors,
      warnings: result.warnings,
      metadata: result.metadata
    }

    // Apply standard normalizations
    normalizedResult = await this.applyStandardNormalizations(normalizedResult, 'journey', context)

    // Apply custom transformations if configured
    for (const transformation of this.config.journeyTransformations) {
      normalizedResult = await this.transformResult(normalizedResult, transformation, context)
    }

    return normalizedResult
  }

  private async applyStandardNormalizations(
    result: any,
    type: 'workflow' | 'journey',
    context: ExecutionContext
  ): Promise<any> {
    const normalized = { ...result }

    // Normalize timestamps to consistent format
    if (normalized.startTime) {
      normalized.startTime = new Date(normalized.startTime).toISOString()
    }
    if (normalized.endTime) {
      normalized.endTime = new Date(normalized.endTime).toISOString()
    }

    // Normalize duration to milliseconds
    if (normalized.duration && typeof normalized.duration === 'string') {
      normalized.duration = this.parseDurationToMs(normalized.duration)
    }

    // Normalize status values
    normalized.status = this.normalizeStatusValue(normalized.status)

    // Sort arrays for consistent comparison
    if (normalized.errors) {
      normalized.errors = this.sortErrorsByKey(normalized.errors)
    }
    if (normalized.warnings) {
      normalized.warnings = this.sortWarningsByKey(normalized.warnings)
    }

    // Normalize outputs structure
    if (normalized.outputs) {
      normalized.outputs = await this.normalizeOutputsStructure(normalized.outputs, type, context)
    }

    // Remove execution-specific metadata that shouldn't be compared
    if (normalized.metadata) {
      normalized.metadata = this.cleanMetadataForComparison(normalized.metadata)
    }

    return normalized
  }

  private async performDeepComparison(
    workflowResult: ExecutionResult,
    journeyResult: ExecutionResult,
    context: ExecutionContext
  ): Promise<ResultComparison> {
    logger.debug('Performing deep result comparison')

    const differences: ResultDiff[] = []
    let compatible = true

    // Compare core execution properties
    await this.compareExecutionProperties(workflowResult, journeyResult, differences)

    // Compare outputs
    await this.compareOutputs(workflowResult.outputs, journeyResult.outputs, differences, context)

    // Compare variables
    await this.compareVariables(workflowResult.variables, journeyResult.variables, differences)

    // Compare errors and warnings
    await this.compareErrorsAndWarnings(workflowResult, journeyResult, differences)

    // Compare execution results (blocks vs steps)
    await this.compareExecutionResults(workflowResult, journeyResult, differences, context)

    // Determine overall compatibility
    compatible = differences.filter(diff => diff.severity === 'critical' || diff.severity === 'error').length === 0

    // Calculate similarity score
    const similarityScore = this.calculateSimilarityScore(differences)

    return {
      compatible,
      similarityScore,
      differences,
      workflowResult,
      journeyResult,
      metadata: {
        comparisonId: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        context,
        totalDifferences: differences.length,
        criticalDifferences: differences.filter(d => d.severity === 'critical').length,
        errorDifferences: differences.filter(d => d.severity === 'error').length,
        warningDifferences: differences.filter(d => d.severity === 'warning').length
      }
    }
  }

  private async compareExecutionProperties(
    workflowResult: ExecutionResult,
    journeyResult: ExecutionResult,
    differences: ResultDiff[]
  ): Promise<void> {
    // Compare status
    if (workflowResult.status !== journeyResult.status) {
      differences.push({
        path: 'status',
        workflowValue: workflowResult.status,
        journeyValue: journeyResult.status,
        difference: 'value_mismatch',
        severity: 'error',
        description: 'Execution status differs between workflow and journey'
      })
    }

    // Compare duration (with tolerance)
    if (this.config.enableDurationComparison) {
      const durationDiff = Math.abs(workflowResult.duration - journeyResult.duration)
      const tolerance = this.config.durationToleranceMs || 1000

      if (durationDiff > tolerance) {
        differences.push({
          path: 'duration',
          workflowValue: workflowResult.duration,
          journeyValue: journeyResult.duration,
          difference: 'performance_variation',
          severity: 'warning',
          description: `Execution duration differs by ${durationDiff}ms (tolerance: ${tolerance}ms)`
        })
      }
    }
  }

  private async compareOutputs(
    workflowOutputs: any,
    journeyOutputs: any,
    differences: ResultDiff[],
    context: ExecutionContext
  ): Promise<void> {
    logger.debug('Comparing outputs')

    if (!workflowOutputs && !journeyOutputs) {
      return
    }

    if (!workflowOutputs || !journeyOutputs) {
      differences.push({
        path: 'outputs',
        workflowValue: workflowOutputs,
        journeyValue: journeyOutputs,
        difference: 'missing_data',
        severity: 'critical',
        description: 'One execution mode has outputs while the other does not'
      })
      return
    }

    // Deep compare output objects
    await this.deepCompareObjects(
      workflowOutputs,
      journeyOutputs,
      'outputs',
      differences,
      context
    )
  }

  private async compareVariables(
    workflowVars: Record<string, any>,
    journeyVars: Record<string, any>,
    differences: ResultDiff[]
  ): Promise<void> {
    logger.debug('Comparing variables')

    const workflowKeys = new Set(Object.keys(workflowVars || {}))
    const journeyKeys = new Set(Object.keys(journeyVars || {}))

    // Check for missing variables
    for (const key of workflowKeys) {
      if (!journeyKeys.has(key)) {
        differences.push({
          path: `variables.${key}`,
          workflowValue: workflowVars[key],
          journeyValue: undefined,
          difference: 'missing_key',
          severity: 'error',
          description: `Variable '${key}' exists in workflow but not in journey`
        })
      }
    }

    for (const key of journeyKeys) {
      if (!workflowKeys.has(key)) {
        differences.push({
          path: `variables.${key}`,
          workflowValue: undefined,
          journeyValue: journeyVars[key],
          difference: 'extra_key',
          severity: 'warning',
          description: `Variable '${key}' exists in journey but not in workflow`
        })
      }
    }

    // Compare values for common variables
    for (const key of workflowKeys) {
      if (journeyKeys.has(key)) {
        const workflowValue = workflowVars[key]
        const journeyValue = journeyVars[key]

        if (!this.deepEqual(workflowValue, journeyValue)) {
          differences.push({
            path: `variables.${key}`,
            workflowValue,
            journeyValue,
            difference: 'value_mismatch',
            severity: 'error',
            description: `Variable '${key}' has different values`
          })
        }
      }
    }
  }

  private async compareErrorsAndWarnings(
    workflowResult: ExecutionResult,
    journeyResult: ExecutionResult,
    differences: ResultDiff[]
  ): Promise<void> {
    // Compare errors
    await this.compareArrays(
      workflowResult.errors || [],
      journeyResult.errors || [],
      'errors',
      differences,
      'error'
    )

    // Compare warnings
    await this.compareArrays(
      workflowResult.warnings || [],
      journeyResult.warnings || [],
      'warnings',
      differences,
      'warning'
    )
  }

  private async compareExecutionResults(
    workflowResult: ExecutionResult,
    journeyResult: ExecutionResult,
    differences: ResultDiff[],
    context: ExecutionContext
  ): Promise<void> {
    // Compare block results vs step results
    const workflowSteps = (workflowResult as any).blockResults || []
    const journeySteps = (journeyResult as any).stepResults || []

    // Map blocks to steps using conversion mapping
    const mappedResults = await this.mapBlocksToSteps(workflowSteps, journeySteps, context)

    for (const [blockId, stepId] of mappedResults) {
      const blockResult = workflowSteps.find((r: any) => r.blockId === blockId)
      const stepResult = journeySteps.find((r: any) => r.stepId === stepId)

      if (blockResult && stepResult) {
        await this.compareStepExecution(blockResult, stepResult, differences, context)
      }
    }
  }

  private async compareStepExecution(
    blockResult: any,
    stepResult: any,
    differences: ResultDiff[],
    context: ExecutionContext
  ): Promise<void> {
    const basePath = `execution.${blockResult.blockId}`

    // Compare step status
    if (blockResult.status !== stepResult.status) {
      differences.push({
        path: `${basePath}.status`,
        workflowValue: blockResult.status,
        journeyValue: stepResult.status,
        difference: 'value_mismatch',
        severity: 'error',
        description: `Step execution status differs`
      })
    }

    // Compare outputs
    if (blockResult.outputs || stepResult.outputs) {
      await this.deepCompareObjects(
        blockResult.outputs,
        stepResult.outputs,
        `${basePath}.outputs`,
        differences,
        context
      )
    }
  }

  private async deepCompareObjects(
    obj1: any,
    obj2: any,
    path: string,
    differences: ResultDiff[],
    context: ExecutionContext,
    maxDepth: number = 10
  ): Promise<void> {
    if (maxDepth <= 0) {
      logger.warn('Maximum comparison depth reached', { path })
      return
    }

    if (typeof obj1 !== typeof obj2) {
      differences.push({
        path,
        workflowValue: obj1,
        journeyValue: obj2,
        difference: 'type_mismatch',
        severity: 'error',
        description: `Type mismatch at path ${path}`
      })
      return
    }

    if (obj1 === null || obj2 === null) {
      if (obj1 !== obj2) {
        differences.push({
          path,
          workflowValue: obj1,
          journeyValue: obj2,
          difference: 'value_mismatch',
          severity: 'error',
          description: `Null value mismatch at path ${path}`
        })
      }
      return
    }

    if (typeof obj1 === 'object') {
      if (Array.isArray(obj1) && Array.isArray(obj2)) {
        await this.compareArrays(obj1, obj2, path, differences, 'error')
      } else if (!Array.isArray(obj1) && !Array.isArray(obj2)) {
        const keys1 = Object.keys(obj1)
        const keys2 = Object.keys(obj2)
        const allKeys = new Set([...keys1, ...keys2])

        for (const key of allKeys) {
          const newPath = `${path}.${key}`
          if (!(key in obj1)) {
            differences.push({
              path: newPath,
              workflowValue: undefined,
              journeyValue: obj2[key],
              difference: 'missing_key',
              severity: 'warning',
              description: `Key '${key}' missing in workflow result`
            })
          } else if (!(key in obj2)) {
            differences.push({
              path: newPath,
              workflowValue: obj1[key],
              journeyValue: undefined,
              difference: 'extra_key',
              severity: 'warning',
              description: `Key '${key}' missing in journey result`
            })
          } else {
            await this.deepCompareObjects(
              obj1[key],
              obj2[key],
              newPath,
              differences,
              context,
              maxDepth - 1
            )
          }
        }
      } else {
        differences.push({
          path,
          workflowValue: obj1,
          journeyValue: obj2,
          difference: 'structure_mismatch',
          severity: 'error',
          description: `Structure mismatch at path ${path} (array vs object)`
        })
      }
    } else if (obj1 !== obj2) {
      differences.push({
        path,
        workflowValue: obj1,
        journeyValue: obj2,
        difference: 'value_mismatch',
        severity: 'error',
        description: `Value mismatch at path ${path}`
      })
    }
  }

  private async compareArrays(
    arr1: any[],
    arr2: any[],
    path: string,
    differences: ResultDiff[],
    severity: 'critical' | 'error' | 'warning' | 'info'
  ): Promise<void> {
    if (arr1.length !== arr2.length) {
      differences.push({
        path: `${path}.length`,
        workflowValue: arr1.length,
        journeyValue: arr2.length,
        difference: 'count_mismatch',
        severity,
        description: `Array length differs at path ${path}`
      })
    }

    const maxLength = Math.min(arr1.length, arr2.length)
    for (let i = 0; i < maxLength; i++) {
      if (!this.deepEqual(arr1[i], arr2[i])) {
        differences.push({
          path: `${path}[${i}]`,
          workflowValue: arr1[i],
          journeyValue: arr2[i],
          difference: 'value_mismatch',
          severity,
          description: `Array element differs at index ${i}`
        })
      }
    }
  }

  private async generateCompatibilityReport(
    comparison: ResultComparison,
    context: ExecutionContext
  ): Promise<CompatibilityReport> {
    logger.debug('Generating compatibility report')

    const report: CompatibilityReport = {
      compatible: comparison.compatible,
      similarityScore: comparison.similarityScore,
      summary: {
        totalDifferences: comparison.differences.length,
        criticalIssues: comparison.differences.filter(d => d.severity === 'critical').length,
        errorIssues: comparison.differences.filter(d => d.severity === 'error').length,
        warningIssues: comparison.differences.filter(d => d.severity === 'warning').length,
        infoIssues: comparison.differences.filter(d => d.severity === 'info').length
      },
      categories: this.categorizeDifferences(comparison.differences),
      recommendations: await this.generateRecommendations(comparison.differences),
      metadata: {
        generatedAt: new Date().toISOString(),
        context,
        comparisonMetadata: comparison.metadata
      }
    }

    return report
  }

  private categorizeDifferences(differences: ResultDiff[]): Record<string, ResultDiff[]> {
    const categories: Record<string, ResultDiff[]> = {
      outputs: [],
      variables: [],
      execution: [],
      performance: [],
      errors: [],
      metadata: []
    }

    for (const diff of differences) {
      if (diff.path.startsWith('outputs')) {
        categories.outputs.push(diff)
      } else if (diff.path.startsWith('variables')) {
        categories.variables.push(diff)
      } else if (diff.path.startsWith('execution')) {
        categories.execution.push(diff)
      } else if (diff.difference === 'performance_variation') {
        categories.performance.push(diff)
      } else if (diff.path.includes('error') || diff.path.includes('warning')) {
        categories.errors.push(diff)
      } else {
        categories.metadata.push(diff)
      }
    }

    return categories
  }

  private async generateRecommendations(differences: ResultDiff[]): Promise<string[]> {
    const recommendations: Set<string> = new Set()

    for (const diff of differences) {
      switch (diff.difference) {
        case 'value_mismatch':
          recommendations.add('Review result transformation logic to ensure consistent value formatting')
          break
        case 'missing_key':
          recommendations.add('Check if all workflow outputs are properly mapped to journey outputs')
          break
        case 'type_mismatch':
          recommendations.add('Verify data type consistency between workflow and journey execution')
          break
        case 'performance_variation':
          recommendations.add('Consider performance optimization to reduce execution time differences')
          break
        case 'structure_mismatch':
          recommendations.add('Ensure result structure compatibility between execution modes')
          break
      }
    }

    return Array.from(recommendations)
  }

  private calculateSimilarityScore(differences: ResultDiff[]): number {
    if (differences.length === 0) return 100

    const weights = {
      critical: 20,
      error: 10,
      warning: 5,
      info: 1
    }

    const totalPenalty = differences.reduce((penalty, diff) => {
      return penalty + (weights[diff.severity] || 1)
    }, 0)

    // Scale to 0-100, with diminishing returns for many differences
    const score = Math.max(0, 100 - (totalPenalty / (1 + Math.log(differences.length + 1)) * 10))
    return Math.round(score * 100) / 100
  }

  // Helper methods

  private async mapBlocksToSteps(
    blockResults: any[],
    stepResults: any[],
    context: ExecutionContext
  ): Promise<Map<string, string>> {
    // This would use the conversion mapping from the workflow-to-journey conversion
    // For now, return a simple mapping based on order
    const mapping = new Map<string, string>()

    const minLength = Math.min(blockResults.length, stepResults.length)
    for (let i = 0; i < minLength; i++) {
      const blockId = blockResults[i]?.blockId || `block_${i}`
      const stepId = stepResults[i]?.stepId || `step_${i}`
      mapping.set(blockId, stepId)
    }

    return mapping
  }

  private deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true
    if (obj1 == null || obj2 == null) return obj1 === obj2
    if (typeof obj1 !== typeof obj2) return false

    if (typeof obj1 === 'object') {
      if (Array.isArray(obj1) && Array.isArray(obj2)) {
        if (obj1.length !== obj2.length) return false
        return obj1.every((item, index) => this.deepEqual(item, obj2[index]))
      }

      if (Array.isArray(obj1) || Array.isArray(obj2)) return false

      const keys1 = Object.keys(obj1)
      const keys2 = Object.keys(obj2)
      if (keys1.length !== keys2.length) return false

      return keys1.every(key => this.deepEqual(obj1[key], obj2[key]))
    }

    return false
  }

  private parseDurationToMs(duration: string): number {
    // Parse duration string to milliseconds
    // Supports formats like "1.5s", "500ms", "2m 30s", etc.
    const patterns = {
      ms: /(\d+(?:\.\d+)?)\s*ms/g,
      s: /(\d+(?:\.\d+)?)\s*s/g,
      m: /(\d+(?:\.\d+)?)\s*m/g
    }

    let totalMs = 0

    // Parse milliseconds
    const msMatch = duration.match(patterns.ms)
    if (msMatch) {
      totalMs += parseFloat(msMatch[0].replace(/[^\d.]/g, ''))
    }

    // Parse seconds
    const sMatch = duration.match(patterns.s)
    if (sMatch) {
      totalMs += parseFloat(sMatch[0].replace(/[^\d.]/g, '')) * 1000
    }

    // Parse minutes
    const mMatch = duration.match(patterns.m)
    if (mMatch) {
      totalMs += parseFloat(mMatch[0].replace(/[^\d.]/g, '')) * 60000
    }

    return totalMs || 0
  }

  private normalizeStatusValue(status: string): string {
    const statusMap: Record<string, string> = {
      'success': 'completed',
      'completed': 'completed',
      'finished': 'completed',
      'done': 'completed',
      'failed': 'error',
      'error': 'error',
      'cancelled': 'cancelled',
      'canceled': 'cancelled',
      'aborted': 'cancelled',
      'running': 'running',
      'executing': 'running',
      'pending': 'pending',
      'queued': 'pending'
    }

    return statusMap[status?.toLowerCase()] || status
  }

  private sortErrorsByKey(errors: any[]): any[] {
    return errors.sort((a, b) => {
      const keyA = `${a.code || ''}_${a.message || ''}_${a.blockId || a.stepId || ''}`
      const keyB = `${b.code || ''}_${b.message || ''}_${b.blockId || b.stepId || ''}`
      return keyA.localeCompare(keyB)
    })
  }

  private sortWarningsByKey(warnings: any[]): any[] {
    return warnings.sort((a, b) => {
      const keyA = `${a.code || ''}_${a.message || ''}_${a.blockId || a.stepId || ''}`
      const keyB = `${b.code || ''}_${b.message || ''}_${b.blockId || b.stepId || ''}`
      return keyA.localeCompare(keyB)
    })
  }

  private async normalizeOutputsStructure(
    outputs: any,
    type: 'workflow' | 'journey',
    context: ExecutionContext
  ): Promise<any> {
    if (!outputs || typeof outputs !== 'object') return outputs

    const normalized = { ...outputs }

    // Apply type-specific normalizations
    if (type === 'workflow') {
      // Normalize workflow outputs
      if (normalized.blockOutputs) {
        normalized.outputs = normalized.blockOutputs
        delete normalized.blockOutputs
      }
    } else {
      // Normalize journey outputs
      if (normalized.stepOutputs) {
        normalized.outputs = normalized.stepOutputs
        delete normalized.stepOutputs
      }
    }

    // Sort object keys for consistent comparison
    if (typeof normalized === 'object' && !Array.isArray(normalized)) {
      const sortedKeys = Object.keys(normalized).sort()
      const sortedObj: any = {}
      for (const key of sortedKeys) {
        sortedObj[key] = normalized[key]
      }
      return sortedObj
    }

    return normalized
  }

  private cleanMetadataForComparison(metadata: any): any {
    if (!metadata || typeof metadata !== 'object') return metadata

    const cleaned = { ...metadata }

    // Remove execution-specific timestamps and IDs that shouldn't be compared
    const excludeKeys = [
      'executionId',
      'timestamp',
      'startedAt',
      'completedAt',
      'processId',
      'nodeId',
      'containerId',
      'requestId',
      'traceId'
    ]

    for (const key of excludeKeys) {
      delete cleaned[key]
    }

    return cleaned
  }

  private initializeBuiltInComponents(): void {
    // Register built-in formatters
    this.registerFormatter('json', {
      format: async (result: ExecutionResult) => JSON.stringify(result, null, 2)
    })

    this.registerFormatter('compact', {
      format: async (result: ExecutionResult) => ({
        status: result.status,
        outputs: result.outputs,
        duration: result.duration
      })
    })

    // Register built-in transformers
    this.registerTransformer('normalize_timestamps', {
      transform: async (result: any) => {
        const transformed = { ...result }
        if (transformed.startTime) {
          transformed.startTime = new Date(transformed.startTime).toISOString()
        }
        if (transformed.endTime) {
          transformed.endTime = new Date(transformed.endTime).toISOString()
        }
        return transformed
      }
    })

    // Register built-in validators
    this.registerValidator('basic_structure', {
      validate: async (result: any) => ({
        valid: result && typeof result === 'object' && 'status' in result,
        errors: [],
        warnings: []
      })
    })

    logger.info('Built-in compatibility components initialized')
  }
}