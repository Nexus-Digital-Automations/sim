/**
 * Workflow to Journey Mapping System - Type Definitions
 *
 * Core type definitions for the ReactFlow → Parlant Journey conversion engine.
 * Provides type safety and clear interfaces for all conversion operations.
 */

import type { Edge, Node } from 'reactflow'

// ========================================
// REACTFLOW INPUT TYPES
// ========================================

export interface ReactFlowWorkflow {
  id: string
  name: string
  description?: string
  nodes: ReactFlowNode[]
  edges: ReactFlowEdge[]
  metadata: WorkflowMetadata
}

export interface ReactFlowNode extends Node {
  id: string
  type: ReactFlowNodeType
  position: { x: number; y: number }
  data: ReactFlowNodeData
  parentId?: string
}

export interface ReactFlowEdge extends Edge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type?: string
  data?: any
}

export interface ReactFlowNodeData {
  type: string
  config?: any
  name?: string
  [key: string]: any
}

export interface WorkflowMetadata {
  version: string
  createdAt?: string
  updatedAt?: string
  author?: string
  workspaceId?: string
}

export type ReactFlowNodeType =
  | 'workflowBlock'
  | 'subflowNode'
  | 'starter'
  | 'condition'
  | 'loop'
  | 'parallel'
  | 'api'
  | 'agent'
  | 'function'
  | 'response'
  | 'evaluator'
  | 'router'
  | 'webhook'
  | string

// ========================================
// PARLANT OUTPUT TYPES
// ========================================

export interface ParlantJourney {
  id: string
  title: string
  description: string
  conditions: string[]
  states: ParlantState[]
  transitions: ParlantTransition[]
  metadata: JourneyMetadata
}

export interface ParlantState {
  id: string
  type: ParlantStateType
  name: string
  description?: string
  content?: string
  tools?: string[]
  variables?: ParlantVariable[]
  conditions?: string[]
  position: { x: number; y: number }
}

export interface ParlantTransition {
  id: string
  sourceStateId: string
  targetStateId: string
  condition?: string
  description?: string
  weight?: number
}

export interface ParlantVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'json' | 'array'
  description?: string
  defaultValue?: any
}

export interface JourneyMetadata {
  originalWorkflowId: string
  conversionTimestamp: string
  conversionVersion: string
  preservedData: Record<string, any>
}

export type ParlantStateType =
  | 'initial'
  | 'chat'
  | 'tool'
  | 'condition'
  | 'loop_start'
  | 'loop_end'
  | 'parallel_start'
  | 'parallel_end'
  | 'final'

// ========================================
// CONVERSION ENGINE TYPES
// ========================================

export interface ConversionOptions {
  preserveLayout?: boolean
  includeDebugInfo?: boolean
  validateOutput?: boolean
  customNodeHandlers?: Record<string, NodeConverter>
  contextVariables?: Record<string, any>
}

export interface ConversionResult {
  success: boolean
  journey?: ParlantJourney
  errors: ConversionError[]
  warnings: ConversionWarning[]
  metadata: ConversionMetadata
}

export interface ConversionError {
  code: string
  message: string
  nodeId?: string
  severity: 'critical' | 'error' | 'warning'
  suggestions: string[]
}

export interface ConversionWarning {
  code: string
  message: string
  nodeId?: string
  impact: 'high' | 'medium' | 'low'
  suggestions: string[]
}

export interface ConversionMetadata {
  totalNodes: number
  convertedNodes: number
  skippedNodes: number
  totalEdges: number
  convertedTransitions: number
  processingTimeMs: number
  conversionMap: Record<string, string> // nodeId -> stateId mapping
}

export interface NodeConverter {
  canConvert(node: ReactFlowNode): boolean
  convert(node: ReactFlowNode, context: ConversionContext): Promise<NodeConversionResult>
  validateInput?(node: ReactFlowNode): ValidationResult
}

export interface ConversionContext {
  workflow: ReactFlowWorkflow
  options: ConversionOptions
  nodeMap: Map<string, ReactFlowNode>
  edgeMap: Map<string, ReactFlowEdge[]>
  stateMap: Map<string, ParlantState>
  variables: Map<string, ParlantVariable>
  errors: ConversionError[]
  warnings: ConversionWarning[]
}

export interface NodeConversionResult {
  states: ParlantState[]
  transitions: ParlantTransition[]
  variables?: ParlantVariable[]
  skipConnections?: boolean
}

export interface ValidationResult {
  valid: boolean
  errors: ConversionError[]
  warnings: ConversionWarning[]
}

// ========================================
// EDGE ANALYSIS TYPES
// ========================================

export interface EdgeAnalysis {
  incoming: ReactFlowEdge[]
  outgoing: ReactFlowEdge[]
  conditionalOutgoing: ConditionalEdge[]
  hasConditionalFlow: boolean
  isLoopConnection: boolean
  isParallelConnection: boolean
}

export interface ConditionalEdge extends ReactFlowEdge {
  condition: string
  priority: number
}

// ========================================
// STATE PRESERVATION TYPES
// ========================================

export interface StatePreservation {
  originalNodeData: Record<string, any>
  layoutPreservation: LayoutPreservation
  connectionPreservation: ConnectionPreservation
  metadataPreservation: MetadataPreservation
}

export interface LayoutPreservation {
  nodePositions: Record<string, { x: number; y: number }>
  containerHierarchy: Record<string, string[]>
  visualProperties: Record<string, any>
}

export interface ConnectionPreservation {
  originalEdges: ReactFlowEdge[]
  handleMappings: Record<string, string>
  conditionalLogic: Record<string, string>
}

export interface MetadataPreservation {
  originalTypes: Record<string, string>
  blockConfigurations: Record<string, any>
  customProperties: Record<string, any>
}

// ========================================
// UTILITY TYPES
// ========================================

export type ConversionLogger = {
  info: (message: string, data?: any) => void
  warn: (message: string, data?: any) => void
  error: (message: string, data?: any) => void
  debug: (message: string, data?: any) => void
}

export type ProgressCallback = (progress: {
  step: string
  completed: number
  total: number
  currentNode?: string
}) => void
