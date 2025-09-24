/**
 * Workflow to Journey Mapping System - Main Export
 *
 * Central export point for the ReactFlow → Parlant Journey conversion engine.
 * Provides a clean API for integrating the conversion system into the broader
 * Sim application ecosystem.
 */

import { createLogger } from '@/lib/logs/console/logger'

export type { ConversionStrategy, NodeAnalysis, SpecialHandling } from './analyzers/node-analyzer'
// Analyzers
export { NodeAnalyzer } from './analyzers/node-analyzer'
// Builders
export { TransitionBuilder } from './builders/transition-builder'
export { AgentNodeConverter } from './converters/agent-converter'
export { ApiNodeConverter } from './converters/api-converter'
// Converters
export { BaseNodeConverter } from './converters/base-converter'
export { StarterNodeConverter } from './converters/starter-converter'
// Core Engine
export { WorkflowConversionEngine } from './core-engine'
// Error Handling
export { ErrorRecovery } from './error-handling/error-recovery'
// Generators
export { StateGenerator } from './generators/state-generator'
// Types
export type {
  ConditionalEdge,
  ConnectionPreservation,
  ConversionContext,
  ConversionError,
  // Utility Types
  ConversionLogger,
  ConversionMetadata,
  // Conversion Types
  ConversionOptions,
  ConversionResult,
  ConversionWarning,
  // Analysis Types
  EdgeAnalysis,
  JourneyMetadata,
  LayoutPreservation,
  MetadataPreservation,
  NodeConversionResult,
  NodeConverter,
  // Output Types
  ParlantJourney,
  ParlantState,
  ParlantStateType,
  ParlantTransition,
  ParlantVariable,
  ProgressCallback,
  ReactFlowEdge,
  ReactFlowNode,
  ReactFlowNodeData,
  ReactFlowNodeType,
  // Input Types
  ReactFlowWorkflow,
  // State Preservation Types
  StatePreservation,
  ValidationResult,
  WorkflowMetadata,
} from './types'
// Validation
export { ValidationEngine } from './validation/validation-engine'

const logger = createLogger('WorkflowConverter')

/**
 * Factory function to create a pre-configured conversion engine
 */
export function createWorkflowConverter(): WorkflowConversionEngine {
  logger.info('Creating workflow conversion engine')

  const engine = new WorkflowConversionEngine()

  // Register built-in converters
  engine.registerNodeConverter('starter', new StarterNodeConverter())
  engine.registerNodeConverter('agent', new AgentNodeConverter())
  engine.registerNodeConverter('api', new ApiNodeConverter())

  logger.info('Workflow conversion engine created and configured', {
    availableConverters: engine.getAvailableConverters(),
  })

  return engine
}

/**
 * Convenience function for quick conversions with default settings
 */
export async function convertWorkflowToJourney(
  workflow: ReactFlowWorkflow,
  options?: ConversionOptions,
  progressCallback?: ProgressCallback
): Promise<ConversionResult> {
  logger.info('Converting workflow to journey', {
    workflowId: workflow.id,
    workflowName: workflow.name,
  })

  const engine = createWorkflowConverter()
  const result = await engine.convert(workflow, options, progressCallback)

  logger.info('Workflow conversion completed', {
    workflowId: workflow.id,
    success: result.success,
    errorCount: result.errors.length,
    warningCount: result.warnings.length,
  })

  return result
}

/**
 * Validate a workflow before attempting conversion
 */
export async function validateWorkflowForConversion(
  workflow: ReactFlowWorkflow
): Promise<ValidationResult> {
  logger.info('Validating workflow for conversion', {
    workflowId: workflow.id,
  })

  const engine = createWorkflowConverter()
  const result = await engine.validateWorkflow(workflow)

  logger.info('Workflow validation completed', {
    workflowId: workflow.id,
    valid: result.valid,
    errorCount: result.errors.length,
    warningCount: result.warnings.length,
  })

  return result
}

/**
 * Get information about available node converters
 */
export function getAvailableConverters(): string[] {
  const engine = createWorkflowConverter()
  return engine.getAvailableConverters()
}

import { AgentNodeConverter } from './converters/agent-converter'
import { ApiNodeConverter } from './converters/api-converter'
import { StarterNodeConverter } from './converters/starter-converter'
import { WorkflowConversionEngine } from './core-engine'
// Import types for re-export
import type {
  ConversionOptions,
  ConversionResult,
  ProgressCallback,
  ReactFlowWorkflow,
  ValidationResult,
} from './types'
