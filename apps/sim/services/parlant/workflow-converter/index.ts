/**
 * Workflow to Journey Mapping System - Main Export
 *
 * Central export point for the ReactFlow → Parlant Journey conversion engine.
 * Provides a clean API for integrating the conversion system into the broader
 * Sim application ecosystem.
 */

import { createLogger } from '@/lib/logs/console/logger'

// Core Engine
export { WorkflowConversionEngine } from './core-engine'

// Types
export type {
  // Input Types
  ReactFlowWorkflow,
  ReactFlowNode,
  ReactFlowEdge,
  ReactFlowNodeData,
  WorkflowMetadata,
  ReactFlowNodeType,

  // Output Types
  ParlantJourney,
  ParlantState,
  ParlantTransition,
  ParlantVariable,
  JourneyMetadata,
  ParlantStateType,

  // Conversion Types
  ConversionOptions,
  ConversionResult,
  ConversionError,
  ConversionWarning,
  ConversionMetadata,
  NodeConverter,
  ConversionContext,
  NodeConversionResult,
  ValidationResult,

  // Analysis Types
  EdgeAnalysis,
  ConditionalEdge,

  // State Preservation Types
  StatePreservation,
  LayoutPreservation,
  ConnectionPreservation,
  MetadataPreservation,

  // Utility Types
  ConversionLogger,
  ProgressCallback
} from './types'

// Analyzers
export { NodeAnalyzer } from './analyzers/node-analyzer'
export type { NodeAnalysis, ConversionStrategy, SpecialHandling } from './analyzers/node-analyzer'

// Converters
export { BaseNodeConverter } from './converters/base-converter'
export { StarterNodeConverter } from './converters/starter-converter'
export { AgentNodeConverter } from './converters/agent-converter'
export { ApiNodeConverter } from './converters/api-converter'

// Generators
export { StateGenerator } from './generators/state-generator'

// Builders
export { TransitionBuilder } from './builders/transition-builder'

// Error Handling
export { ErrorRecovery } from './error-handling/error-recovery'

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
    availableConverters: engine.getAvailableConverters()
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
    workflowName: workflow.name
  })

  const engine = createWorkflowConverter()
  const result = await engine.convert(workflow, options, progressCallback)

  logger.info('Workflow conversion completed', {
    workflowId: workflow.id,
    success: result.success,
    errorCount: result.errors.length,
    warningCount: result.warnings.length
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
    workflowId: workflow.id
  })

  const engine = createWorkflowConverter()
  const result = await engine.validateWorkflow(workflow)

  logger.info('Workflow validation completed', {
    workflowId: workflow.id,
    valid: result.valid,
    errorCount: result.errors.length,
    warningCount: result.warnings.length
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

// Import types for re-export
import type {
  ReactFlowWorkflow,
  ReactFlowNode,
  ReactFlowEdge,
  ReactFlowNodeData,
  WorkflowMetadata,
  ReactFlowNodeType,
  ParlantJourney,
  ParlantState,
  ParlantTransition,
  ParlantVariable,
  JourneyMetadata,
  ParlantStateType,
  ConversionOptions,
  ConversionResult,
  ConversionError,
  ConversionWarning,
  ConversionMetadata,
  NodeConverter,
  ConversionContext,
  NodeConversionResult,
  ValidationResult,
  EdgeAnalysis,
  ConditionalEdge,
  StatePreservation,
  LayoutPreservation,
  ConnectionPreservation,
  MetadataPreservation,
  ConversionLogger,
  ProgressCallback
} from './types'

import { WorkflowConversionEngine } from './core-engine'
import { StarterNodeConverter } from './converters/starter-converter'
import { AgentNodeConverter } from './converters/agent-converter'
import { ApiNodeConverter } from './converters/api-converter'