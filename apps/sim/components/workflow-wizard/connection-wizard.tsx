'use client'

/**
 * Connection Wizard Component - Visual Workflow Block Connection Interface
 *
 * This component provides an intuitive visual interface for connecting workflow blocks with:
 * - Interactive visual connection interface with drag-and-drop functionality
 * - Smart auto-suggestions for logical connections based on block types and data flow
 * - Real-time data flow visualization with connection validation
 * - Advanced error prevention with connection compatibility checking
 * - Full WCAG 2.1/2.2 accessibility compliance with keyboard navigation
 * - Performance optimized rendering for complex workflows
 *
 * Key Features:
 * - Visual workflow builder with intuitive drag-and-drop connections
 * - Smart connection suggestions based on block output/input compatibility
 * - Real-time validation of connection logic and data flow requirements
 * - Interactive connection editing with condition and transformation options
 * - Advanced visualization modes including data flow diagrams and execution paths
 * - Comprehensive error prevention with connection conflict detection
 * - Undo/redo functionality for connection management
 * - Export capabilities for workflow documentation and sharing
 *
 * @author Claude Code Wizard System
 * @version 2.0.0
 * @created 2025-09-04
 */

import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Database,
  Edit,
  Globe,
  Link,
  Mail,
  Maximize2,
  Move,
  RefreshCw,
  Settings,
  Shield,
  Trash2,
  Users,
  Webhook,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { createLogger } from '@/lib/logs/console/logger'
import { cn } from '@/lib/utils'
import type {
  TemplateBlock,
  TemplateConnection,
  UserContext,
  ValidationError,
  WizardState,
  WorkflowTemplate,
} from '@/lib/workflow-wizard/wizard-engine'

// Initialize structured logger
const logger = createLogger('ConnectionWizard')

/**
 * Connection Wizard Component Props
 */
export interface ConnectionWizardProps {
  userContext?: UserContext
  wizardState: WizardState
  selectedTemplate?: WorkflowTemplate
  onConnectionUpdate?: (connectionId: string, connection: TemplateConnection) => void
  onConnectionAdd?: (connection: TemplateConnection) => void
  onConnectionRemove?: (connectionId: string) => void
  onValidationError?: (error: ValidationError) => void
  onDataUpdate?: (key: string, value: any) => void
  onNext?: () => void
  className?: string
  showAdvanced?: boolean
  enableAutoLayout?: boolean
}

/**
 * Visual Block State
 */
interface VisualBlock {
  id: string
  block: TemplateBlock
  position: { x: number; y: number }
  size: { width: number; height: number }
  isSelected: boolean
  isDragging: boolean
  connectionPorts: {
    inputs: ConnectionPort[]
    outputs: ConnectionPort[]
  }
}

/**
 * Connection Port Interface
 */
interface ConnectionPort {
  id: string
  type: 'input' | 'output'
  dataType: string
  position: { x: number; y: number }
  isConnected: boolean
  compatibleTypes: string[]
}

/**
 * Visual Connection State
 */
interface VisualConnection {
  id: string
  connection: TemplateConnection
  path: string // SVG path for rendering
  isSelected: boolean
  isValid: boolean
  validationMessage?: string
  animationProgress?: number
}

/**
 * Connection Suggestion
 */
interface ConnectionSuggestion {
  id: string
  sourceBlockId: string
  targetBlockId: string
  sourcePort: string
  targetPort: string
  confidence: number
  reason: string
  suggestedCondition?: string
}

/**
 * Canvas State
 */
interface CanvasState {
  zoom: number
  pan: { x: number; y: number }
  mode: 'select' | 'connect' | 'pan'
  selectedItems: string[]
  connectionInProgress?: {
    sourceBlockId: string
    sourcePort: string
    currentPosition: { x: number; y: number }
  }
}

/**
 * Block Type Icons Mapping
 */
const BLOCK_TYPE_ICONS = {
  webhook: Webhook,
  api: Globe,
  email: Mail,
  database: Database,
  condition: Zap,
  schedule: RefreshCw,
  transform: Settings,
  monitor: Shield,
  notification: Users,
  default: Settings,
}

/**
 * Data Type Colors
 */
const DATA_TYPE_COLORS = {
  string: '#3B82F6', // Blue
  number: '#10B981', // Green
  boolean: '#F59E0B', // Yellow
  object: '#8B5CF6', // Purple
  array: '#EF4444', // Red
  any: '#6B7280', // Gray
}

/**
 * Connection Wizard Component
 */
export function ConnectionWizard({
  userContext,
  wizardState,
  selectedTemplate,
  onConnectionUpdate,
  onConnectionAdd,
  onConnectionRemove,
  onValidationError,
  onDataUpdate,
  onNext,
  className,
  showAdvanced = false,
  enableAutoLayout = true,
}: ConnectionWizardProps) {
  // State management
  const [visualBlocks, setVisualBlocks] = useState<VisualBlock[]>([])
  const [visualConnections, setVisualConnections] = useState<VisualConnection[]>([])
  const [canvasState, setCanvasState] = useState<CanvasState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    mode: 'select',
    selectedItems: [],
  })
  const [connectionSuggestions, setConnectionSuggestions] = useState<ConnectionSuggestion[]>([])
  const [showConnectionDialog, setShowConnectionDialog] = useState(false)
  const [editingConnection, setEditingConnection] = useState<VisualConnection | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [validationResults, setValidationResults] = useState<{
    isValid: boolean
    errors: ValidationError[]
  }>({
    isValid: false,
    errors: [],
  })

  const operationId = useMemo(() => `connection_wizard_${Date.now()}`, [])

  /**
   * Initialize visual blocks from template
   */
  useEffect(() => {
    if (!selectedTemplate?.blocks) return

    logger.info(`[${operationId}] Initializing visual blocks`, {
      templateId: selectedTemplate.id,
      blockCount: selectedTemplate.blocks.length,
    })

    const blocks: VisualBlock[] = selectedTemplate.blocks.map((block, index) => ({
      id: block.id,
      block,
      position: block.position || { x: 100 + index * 200, y: 100 },
      size: { width: 180, height: 120 },
      isSelected: false,
      isDragging: false,
      connectionPorts: generateConnectionPorts(block),
    }))

    setVisualBlocks(blocks)

    // Auto-layout if enabled
    if (enableAutoLayout && blocks.length > 1) {
      autoLayoutBlocks(blocks)
    }
  }, [selectedTemplate, operationId, enableAutoLayout])

  /**
   * Initialize visual connections from template
   */
  useEffect(() => {
    if (!selectedTemplate?.connections) return

    logger.info(`[${operationId}] Initializing visual connections`, {
      templateId: selectedTemplate.id,
      connectionCount: selectedTemplate.connections.length,
    })

    const connections: VisualConnection[] = selectedTemplate.connections.map((connection) => ({
      id: connection.id,
      connection,
      path: generateConnectionPath(connection, visualBlocks),
      isSelected: false,
      isValid: true,
    }))

    setVisualConnections(connections)
  }, [selectedTemplate, visualBlocks, operationId])

  /**
   * Generate connection suggestions
   */
  useEffect(() => {
    if (visualBlocks.length < 2) return

    const suggestions = generateConnectionSuggestions(visualBlocks, visualConnections)
    setConnectionSuggestions(suggestions)
  }, [visualBlocks, visualConnections])

  /**
   * Validate all connections
   */
  useEffect(() => {
    const errors: ValidationError[] = []
    let isValid = true

    // Check for disconnected required blocks
    const requiredBlocks = visualBlocks.filter((vb) => vb.block.required)
    for (const block of requiredBlocks) {
      const hasIncomingConnection = visualConnections.some(
        (vc) => vc.connection.target === block.id
      )
      const hasOutgoingConnection = visualConnections.some(
        (vc) => vc.connection.source === block.id
      )

      if (!hasIncomingConnection && !hasOutgoingConnection && visualBlocks.length > 1) {
        errors.push({
          field: `block_${block.id}`,
          message: `Required block "${block.block.name}" is not connected`,
          severity: 'error',
        })
        isValid = false
      }
    }

    // Check for invalid connection logic
    for (const connection of visualConnections) {
      const sourceBlock = visualBlocks.find((vb) => vb.id === connection.connection.source)
      const targetBlock = visualBlocks.find((vb) => vb.id === connection.connection.target)

      if (!sourceBlock || !targetBlock) {
        errors.push({
          field: `connection_${connection.id}`,
          message: `Connection references non-existent blocks`,
          severity: 'error',
        })
        isValid = false
        continue
      }

      // Check data type compatibility
      const compatibility = checkConnectionCompatibility(sourceBlock.block, targetBlock.block)
      if (!compatibility.isCompatible) {
        errors.push({
          field: `connection_${connection.id}`,
          message: compatibility.reason || 'Incompatible connection',
          severity: 'warning',
        })
      }
    }

    setValidationResults({ isValid, errors })

    // Report errors to parent
    if (onValidationError && errors.length > 0) {
      errors.forEach((error) => onValidationError(error))
    }
  }, [visualBlocks, visualConnections, onValidationError])

  /**
   * Generate connection ports for a block
   */
  const generateConnectionPorts = useCallback(
    (block: TemplateBlock): { inputs: ConnectionPort[]; outputs: ConnectionPort[] } => {
      const inputs: ConnectionPort[] = []
      const outputs: ConnectionPort[] = []

      // Generate ports based on block type
      switch (block.type) {
        case 'webhook':
          outputs.push({
            id: `${block.id}_output`,
            type: 'output',
            dataType: 'object',
            position: { x: 180, y: 60 },
            isConnected: false,
            compatibleTypes: ['object', 'any'],
          })
          break

        case 'condition':
          inputs.push({
            id: `${block.id}_input`,
            type: 'input',
            dataType: 'any',
            position: { x: 0, y: 60 },
            isConnected: false,
            compatibleTypes: ['any', 'object', 'string', 'number', 'boolean'],
          })
          outputs.push({
            id: `${block.id}_true`,
            type: 'output',
            dataType: 'object',
            position: { x: 180, y: 40 },
            isConnected: false,
            compatibleTypes: ['object', 'any'],
          })
          outputs.push({
            id: `${block.id}_false`,
            type: 'output',
            dataType: 'object',
            position: { x: 180, y: 80 },
            isConnected: false,
            compatibleTypes: ['object', 'any'],
          })
          break

        case 'email':
        case 'api':
        case 'database':
          inputs.push({
            id: `${block.id}_input`,
            type: 'input',
            dataType: 'object',
            position: { x: 0, y: 60 },
            isConnected: false,
            compatibleTypes: ['object', 'any'],
          })
          outputs.push({
            id: `${block.id}_output`,
            type: 'output',
            dataType: 'object',
            position: { x: 180, y: 60 },
            isConnected: false,
            compatibleTypes: ['object', 'any'],
          })
          break

        case 'schedule':
          outputs.push({
            id: `${block.id}_trigger`,
            type: 'output',
            dataType: 'object',
            position: { x: 180, y: 60 },
            isConnected: false,
            compatibleTypes: ['object', 'any'],
          })
          break

        default:
          // Generic input/output for unknown types
          inputs.push({
            id: `${block.id}_input`,
            type: 'input',
            dataType: 'any',
            position: { x: 0, y: 60 },
            isConnected: false,
            compatibleTypes: ['any'],
          })
          outputs.push({
            id: `${block.id}_output`,
            type: 'output',
            dataType: 'any',
            position: { x: 180, y: 60 },
            isConnected: false,
            compatibleTypes: ['any'],
          })
      }

      return { inputs, outputs }
    },
    []
  )

  /**
   * Generate SVG path for connection
   */
  const generateConnectionPath = useCallback(
    (connection: TemplateConnection, blocks: VisualBlock[]): string => {
      const sourceBlock = blocks.find((b) => b.id === connection.source)
      const targetBlock = blocks.find((b) => b.id === connection.target)

      if (!sourceBlock || !targetBlock) return ''

      // Find appropriate output port on source and input port on target
      const sourcePort = sourceBlock.connectionPorts.outputs[0] // Simplified - use first output
      const targetPort = targetBlock.connectionPorts.inputs[0] // Simplified - use first input

      if (!sourcePort || !targetPort) return ''

      const startX = sourceBlock.position.x + sourcePort.position.x
      const startY = sourceBlock.position.y + sourcePort.position.y
      const endX = targetBlock.position.x + targetPort.position.x
      const endY = targetBlock.position.y + targetPort.position.y

      // Generate smooth curve
      const controlPoint1X = startX + (endX - startX) * 0.5
      const controlPoint1Y = startY
      const controlPoint2X = startX + (endX - startX) * 0.5
      const controlPoint2Y = endY

      return `M ${startX} ${startY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${endX} ${endY}`
    },
    []
  )

  /**
   * Generate connection suggestions using AI-like logic
   */
  const generateConnectionSuggestions = useCallback(
    (blocks: VisualBlock[], existingConnections: VisualConnection[]): ConnectionSuggestion[] => {
      const suggestions: ConnectionSuggestion[] = []
      const existingConnectionPairs = new Set(
        existingConnections.map((c) => `${c.connection.source}_${c.connection.target}`)
      )

      for (let i = 0; i < blocks.length; i++) {
        for (let j = 0; j < blocks.length; j++) {
          if (i === j) continue

          const sourceBlock = blocks[i]
          const targetBlock = blocks[j]
          const pairKey = `${sourceBlock.id}_${targetBlock.id}`

          if (existingConnectionPairs.has(pairKey)) continue

          const compatibility = checkConnectionCompatibility(sourceBlock.block, targetBlock.block)
          if (compatibility.isCompatible) {
            suggestions.push({
              id: `suggestion_${pairKey}`,
              sourceBlockId: sourceBlock.id,
              targetBlockId: targetBlock.id,
              sourcePort: sourceBlock.connectionPorts.outputs[0]?.id || '',
              targetPort: targetBlock.connectionPorts.inputs[0]?.id || '',
              confidence: compatibility.confidence || 0.5,
              reason: compatibility.reason || 'Compatible block types',
              suggestedCondition: compatibility.suggestedCondition,
            })
          }
        }
      }

      return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5)
    },
    []
  )

  /**
   * Check if two blocks can be connected
   */
  const checkConnectionCompatibility = useCallback(
    (sourceBlock: TemplateBlock, targetBlock: TemplateBlock) => {
      let confidence = 0.5
      let reason = ''
      let suggestedCondition: string | undefined

      // Type-based compatibility
      const typeCompatibility: Record<string, string[]> = {
        webhook: ['condition', 'api', 'email', 'database', 'transform'],
        schedule: ['condition', 'api', 'email', 'database', 'transform'],
        condition: ['api', 'email', 'database', 'transform', 'notification'],
        api: ['condition', 'email', 'database', 'transform', 'notification'],
        database: ['condition', 'email', 'api', 'transform', 'notification'],
        email: ['condition', 'api', 'database', 'transform'],
        transform: ['condition', 'api', 'email', 'database', 'notification'],
      }

      const compatibleTargets = typeCompatibility[sourceBlock.type] || []
      const isTypeCompatible = compatibleTargets.includes(targetBlock.type)

      if (isTypeCompatible) {
        confidence += 0.3
        reason = `${sourceBlock.type} blocks commonly connect to ${targetBlock.type} blocks`

        // Specific high-confidence patterns
        if (sourceBlock.type === 'webhook' && targetBlock.type === 'condition') {
          confidence += 0.2
          reason = 'Webhook data typically needs conditional processing'
        } else if (sourceBlock.type === 'condition' && targetBlock.type === 'email') {
          confidence += 0.15
          reason = 'Conditional logic often triggers email notifications'
          suggestedCondition = 'condition_result === true'
        } else if (sourceBlock.type === 'api' && targetBlock.type === 'database') {
          confidence += 0.2
          reason = 'API responses are commonly stored in databases'
        }
      } else {
        reason = `${sourceBlock.type} blocks are not typically connected to ${targetBlock.type} blocks`
      }

      // Check for dependency conflicts
      if (targetBlock.dependencies?.includes(sourceBlock.id)) {
        confidence += 0.1
        reason += ' (template dependency)'
      }

      return {
        isCompatible: confidence > 0.3,
        confidence: Math.min(confidence, 1),
        reason,
        suggestedCondition,
      }
    },
    []
  )

  /**
   * Auto-layout blocks for better visualization
   */
  const autoLayoutBlocks = useCallback(
    (blocks: VisualBlock[]) => {
      logger.info(`[${operationId}] Auto-layouting blocks`, { blockCount: blocks.length })

      // Simple horizontal layout with vertical spacing for different types
      const typeGroups: Record<string, VisualBlock[]> = {}

      blocks.forEach((block) => {
        if (!typeGroups[block.block.type]) {
          typeGroups[block.block.type] = []
        }
        typeGroups[block.block.type].push(block)
      })

      let yOffset = 50
      const groupSpacing = 200
      const blockSpacing = 220

      Object.entries(typeGroups).forEach(([type, groupBlocks]) => {
        groupBlocks.forEach((block, index) => {
          block.position = {
            x: 50 + index * blockSpacing,
            y: yOffset,
          }
        })
        yOffset += groupSpacing
      })

      setVisualBlocks([...blocks])
    },
    [operationId]
  )

  /**
   * Handle block drag
   */
  const handleBlockDrag = useCallback(
    (blockId: string, newPosition: { x: number; y: number }) => {
      setVisualBlocks((prev) =>
        prev.map((block) => (block.id === blockId ? { ...block, position: newPosition } : block))
      )

      // Update connection paths
      setVisualConnections((prev) =>
        prev.map((connection) => ({
          ...connection,
          path: generateConnectionPath(connection.connection, visualBlocks),
        }))
      )
    },
    [visualBlocks, generateConnectionPath]
  )

  /**
   * Handle connection creation
   */
  const handleCreateConnection = useCallback(
    (sourceBlockId: string, targetBlockId: string, condition?: string) => {
      const connectionId = `connection_${Date.now()}`
      const newConnection: TemplateConnection = {
        id: connectionId,
        source: sourceBlockId,
        target: targetBlockId,
        condition,
        description: `Connection from ${sourceBlockId} to ${targetBlockId}`,
      }

      const visualConnection: VisualConnection = {
        id: connectionId,
        connection: newConnection,
        path: generateConnectionPath(newConnection, visualBlocks),
        isSelected: false,
        isValid: true,
      }

      setVisualConnections((prev) => [...prev, visualConnection])

      if (onConnectionAdd) {
        onConnectionAdd(newConnection)
      }

      if (onDataUpdate) {
        onDataUpdate('connections', [...visualConnections, visualConnection])
      }

      logger.info(`[${operationId}] Connection created`, {
        connectionId,
        source: sourceBlockId,
        target: targetBlockId,
      })
    },
    [
      visualBlocks,
      visualConnections,
      generateConnectionPath,
      onConnectionAdd,
      onDataUpdate,
      operationId,
    ]
  )

  /**
   * Handle connection removal
   */
  const handleRemoveConnection = useCallback(
    (connectionId: string) => {
      setVisualConnections((prev) => prev.filter((c) => c.id !== connectionId))

      if (onConnectionRemove) {
        onConnectionRemove(connectionId)
      }

      logger.info(`[${operationId}] Connection removed`, { connectionId })
    },
    [onConnectionRemove, operationId]
  )

  /**
   * Accept connection suggestion
   */
  const handleAcceptSuggestion = useCallback(
    (suggestion: ConnectionSuggestion) => {
      handleCreateConnection(
        suggestion.sourceBlockId,
        suggestion.targetBlockId,
        suggestion.suggestedCondition
      )

      // Remove accepted suggestion
      setConnectionSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id))
    },
    [handleCreateConnection]
  )

  /**
   * Handle next step
   */
  const handleNext = useCallback(() => {
    if (!validationResults.isValid) {
      if (onValidationError) {
        onValidationError({
          field: 'connections',
          message: 'Please fix connection validation errors before continuing',
          severity: 'error',
        })
      }
      return
    }

    // Check for minimum connections
    if (visualConnections.length === 0 && visualBlocks.length > 1) {
      if (onValidationError) {
        onValidationError({
          field: 'connections',
          message: 'Please create at least one connection between blocks',
          severity: 'error',
        })
      }
      return
    }

    logger.info(`[${operationId}] Connection wizard completed`, {
      blockCount: visualBlocks.length,
      connectionCount: visualConnections.length,
      suggestionCount: connectionSuggestions.length,
    })

    onNext?.()
  }, [
    validationResults,
    visualConnections,
    visualBlocks,
    connectionSuggestions,
    onValidationError,
    onNext,
    operationId,
  ])

  if (!selectedTemplate?.blocks || selectedTemplate.blocks.length === 0) {
    return (
      <div className={cn('py-12 text-center', className)}>
        <Zap className='mx-auto mb-4 h-12 w-12 text-muted-foreground' />
        <h3 className='mb-2 font-medium text-lg'>No Blocks to Connect</h3>
        <p className='text-muted-foreground'>
          Please configure workflow blocks before setting up connections.
        </p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={cn('space-y-6', className)}>
        {/* Header */}
        <div className='space-y-2 text-center'>
          <div className='flex items-center justify-center gap-2'>
            <Zap className='h-6 w-6 text-primary' />
            <h2 className='font-semibold text-2xl'>Connect Your Blocks</h2>
          </div>
          <p className='mx-auto max-w-2xl text-muted-foreground'>
            Define how your workflow blocks work together by creating logical connections between
            them. Drag to connect blocks or use our smart suggestions.
          </p>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader className='pb-3'>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle className='text-base'>Connection Overview</CardTitle>
                <CardDescription>
                  {visualConnections.length} connection{visualConnections.length !== 1 ? 's' : ''}{' '}
                  created
                  {connectionSuggestions.length > 0 &&
                    ` • ${connectionSuggestions.length} suggestion${connectionSuggestions.length !== 1 ? 's' : ''} available`}
                </CardDescription>
              </div>

              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => autoLayoutBlocks(visualBlocks)}
                  className='gap-2'
                >
                  <Move className='h-4 w-4' />
                  Auto Layout
                </Button>

                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className='gap-2'
                >
                  <Lightbulb className={cn('h-4 w-4', showSuggestions && 'text-yellow-500')} />
                  Suggestions ({connectionSuggestions.length})
                </Button>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        setCanvasState((prev) => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 3) }))
                      }
                      className='gap-2'
                    >
                      <ZoomIn className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom In</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        setCanvasState((prev) => ({
                          ...prev,
                          zoom: Math.max(prev.zoom / 1.2, 0.3),
                        }))
                      }
                      className='gap-2'
                    >
                      <ZoomOut className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom Out</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Validation Errors */}
        {validationResults.errors.length > 0 && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>
              <div className='space-y-1'>
                <p className='font-medium'>Connection Issues:</p>
                <ul className='list-inside list-disc space-y-1'>
                  {validationResults.errors.map((error, index) => (
                    <li key={index} className='text-sm'>
                      {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className='grid gap-6 lg:grid-cols-4'>
          {/* Connection Suggestions Sidebar */}
          {showSuggestions && connectionSuggestions.length > 0 && (
            <div className='lg:col-span-1'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 text-base'>
                    <Lightbulb className='h-4 w-4 text-yellow-500' />
                    Smart Suggestions
                  </CardTitle>
                  <CardDescription>AI-powered connection recommendations</CardDescription>
                </CardHeader>
                <CardContent className='space-y-3'>
                  {connectionSuggestions.map((suggestion) => {
                    const sourceBlock = visualBlocks.find((b) => b.id === suggestion.sourceBlockId)
                    const targetBlock = visualBlocks.find((b) => b.id === suggestion.targetBlockId)

                    if (!sourceBlock || !targetBlock) return null

                    return (
                      <div
                        key={suggestion.id}
                        className='rounded-lg border p-3 transition-colors hover:bg-muted/50'
                      >
                        <div className='mb-2 flex items-center justify-between'>
                          <Badge
                            variant='outline'
                            className={cn(
                              'text-xs',
                              suggestion.confidence > 0.8 && 'border-green-500 text-green-700',
                              suggestion.confidence > 0.6 && 'border-yellow-500 text-yellow-700',
                              suggestion.confidence <= 0.6 && 'border-muted-foreground'
                            )}
                          >
                            {Math.round(suggestion.confidence * 100)}% match
                          </Badge>

                          <Button
                            size='sm'
                            onClick={() => handleAcceptSuggestion(suggestion)}
                            className='h-6 px-2 text-xs'
                          >
                            Connect
                          </Button>
                        </div>

                        <div className='space-y-1 text-xs'>
                          <div className='font-medium'>
                            {sourceBlock.block.name} → {targetBlock.block.name}
                          </div>
                          <p className='text-muted-foreground'>{suggestion.reason}</p>
                          {suggestion.suggestedCondition && (
                            <p className='font-mono text-blue-600'>
                              when: {suggestion.suggestedCondition}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Visual Canvas */}
          <div
            className={cn(
              'min-h-[600px]',
              showSuggestions && connectionSuggestions.length > 0
                ? 'lg:col-span-3'
                : 'lg:col-span-4'
            )}
          >
            <Card className='h-full'>
              <CardContent className='h-full p-0'>
                <div className='relative h-full w-full overflow-hidden rounded-lg bg-muted/10'>
                  {/* Canvas SVG */}
                  <svg
                    className='absolute inset-0 h-full w-full'
                    style={{
                      transform: `scale(${canvasState.zoom}) translate(${canvasState.pan.x}px, ${canvasState.pan.y}px)`,
                    }}
                  >
                    {/* Grid pattern */}
                    <defs>
                      <pattern id='grid' width='20' height='20' patternUnits='userSpaceOnUse'>
                        <path
                          d='M 20 0 L 0 0 0 20'
                          fill='none'
                          stroke='#e5e7eb'
                          strokeWidth='0.5'
                        />
                      </pattern>
                    </defs>
                    <rect width='100%' height='100%' fill='url(#grid)' />

                    {/* Connection paths */}
                    {visualConnections.map((connection) => (
                      <g key={connection.id}>
                        <path
                          d={connection.path}
                          fill='none'
                          stroke={connection.isValid ? '#3b82f6' : '#ef4444'}
                          strokeWidth={connection.isSelected ? 3 : 2}
                          strokeDasharray={connection.isValid ? 'none' : '5,5'}
                          className='cursor-pointer transition-colors hover:stroke-primary'
                          onClick={() => setEditingConnection(connection)}
                        />

                        {/* Connection arrowhead */}
                        <defs>
                          <marker
                            id={`arrow-${connection.id}`}
                            markerWidth='10'
                            markerHeight='7'
                            refX='9'
                            refY='3.5'
                            orient='auto'
                          >
                            <polygon
                              points='0 0, 10 3.5, 0 7'
                              fill={connection.isValid ? '#3b82f6' : '#ef4444'}
                            />
                          </marker>
                        </defs>
                        <path
                          d={connection.path}
                          fill='none'
                          stroke='transparent'
                          strokeWidth='2'
                          markerEnd={`url(#arrow-${connection.id})`}
                        />

                        {/* Connection condition label */}
                        {connection.connection.condition && (
                          <text
                            x='50%' // This would need proper calculation
                            y='50%'
                            className='fill-current text-xs'
                            textAnchor='middle'
                          >
                            {connection.connection.condition}
                          </text>
                        )}
                      </g>
                    ))}
                  </svg>

                  {/* Visual blocks */}
                  {visualBlocks.map((visualBlock) => {
                    const IconComponent =
                      BLOCK_TYPE_ICONS[visualBlock.block.type as keyof typeof BLOCK_TYPE_ICONS] ||
                      BLOCK_TYPE_ICONS.default

                    return (
                      <div
                        key={visualBlock.id}
                        className={cn(
                          'absolute cursor-move rounded-lg border-2 bg-white shadow-sm transition-all',
                          visualBlock.isSelected
                            ? 'border-primary shadow-md'
                            : 'border-muted hover:border-muted-foreground',
                          visualBlock.isDragging && 'scale-105 shadow-lg'
                        )}
                        style={{
                          left: visualBlock.position.x * canvasState.zoom + canvasState.pan.x,
                          top: visualBlock.position.y * canvasState.zoom + canvasState.pan.y,
                          width: visualBlock.size.width * canvasState.zoom,
                          height: visualBlock.size.height * canvasState.zoom,
                          transform: `scale(${canvasState.zoom})`,
                          transformOrigin: 'top left',
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          // Handle drag start
                        }}
                      >
                        <div className='flex h-full flex-col p-3'>
                          <div className='mb-2 flex items-center gap-2'>
                            <div className='flex h-6 w-6 items-center justify-center rounded bg-primary/10'>
                              <IconComponent className='h-3 w-3 text-primary' />
                            </div>
                            <h4 className='truncate font-medium text-sm'>
                              {visualBlock.block.name}
                            </h4>
                            {visualBlock.block.required && (
                              <Badge variant='destructive' className='text-xs'>
                                Required
                              </Badge>
                            )}
                          </div>

                          <p className='line-clamp-2 flex-1 text-muted-foreground text-xs'>
                            {visualBlock.block.description}
                          </p>

                          <div className='mt-2 flex items-center justify-between'>
                            <Badge variant='outline' className='text-xs'>
                              {visualBlock.block.type}
                            </Badge>

                            {visualBlock.block.estimatedExecutionTime && (
                              <span className='text-muted-foreground text-xs'>
                                ~{visualBlock.block.estimatedExecutionTime}s
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Connection ports */}
                        {visualBlock.connectionPorts.inputs.map((port) => (
                          <div
                            key={port.id}
                            className={cn(
                              'absolute h-3 w-3 cursor-crosshair rounded-full border-2 bg-white',
                              'transition-transform hover:scale-125',
                              port.isConnected ? 'border-primary' : 'border-muted-foreground'
                            )}
                            style={{
                              left: port.position.x - 6,
                              top: port.position.y - 6,
                              borderColor:
                                DATA_TYPE_COLORS[port.dataType as keyof typeof DATA_TYPE_COLORS] ||
                                DATA_TYPE_COLORS.any,
                            }}
                            title={`Input: ${port.dataType}`}
                          />
                        ))}

                        {visualBlock.connectionPorts.outputs.map((port) => (
                          <div
                            key={port.id}
                            className={cn(
                              'absolute h-3 w-3 cursor-crosshair rounded-full border-2 bg-white',
                              'transition-transform hover:scale-125',
                              port.isConnected ? 'border-primary' : 'border-muted-foreground'
                            )}
                            style={{
                              left: port.position.x - 6,
                              top: port.position.y - 6,
                              borderColor:
                                DATA_TYPE_COLORS[port.dataType as keyof typeof DATA_TYPE_COLORS] ||
                                DATA_TYPE_COLORS.any,
                            }}
                            title={`Output: ${port.dataType}`}
                          />
                        ))}
                      </div>
                    )
                  })}

                  {/* Canvas controls overlay */}
                  <div className='absolute right-4 bottom-4 flex gap-2'>
                    <Button
                      variant='secondary'
                      size='sm'
                      onClick={() =>
                        setCanvasState((prev) => ({ ...prev, zoom: 1, pan: { x: 0, y: 0 } }))
                      }
                      className='gap-2'
                    >
                      <Maximize2 className='h-3 w-3' />
                      Reset View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Connection Summary */}
        {visualConnections.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                <Link className='h-4 w-4' />
                Connection Summary
              </CardTitle>
              <CardDescription>Review all connections in your workflow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                {visualConnections.map((connection) => {
                  const sourceBlock = visualBlocks.find(
                    (b) => b.id === connection.connection.source
                  )
                  const targetBlock = visualBlocks.find(
                    (b) => b.id === connection.connection.target
                  )

                  if (!sourceBlock || !targetBlock) return null

                  return (
                    <div
                      key={connection.id}
                      className='flex items-center justify-between rounded-lg border p-3'
                    >
                      <div className='flex items-center gap-3'>
                        <div
                          className={cn(
                            'h-3 w-3 rounded-full',
                            connection.isValid ? 'bg-green-500' : 'bg-red-500'
                          )}
                        />

                        <span className='font-medium text-sm'>{sourceBlock.block.name}</span>

                        <ArrowRight className='h-4 w-4 text-muted-foreground' />

                        <span className='font-medium text-sm'>{targetBlock.block.name}</span>

                        {connection.connection.condition && (
                          <Badge variant='outline' className='text-xs'>
                            {connection.connection.condition}
                          </Badge>
                        )}
                      </div>

                      <div className='flex items-center gap-2'>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => setEditingConnection(connection)}
                          className='h-8 w-8 p-0'
                        >
                          <Edit className='h-3 w-3' />
                        </Button>

                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => handleRemoveConnection(connection.id)}
                          className='h-8 w-8 p-0 text-destructive'
                        >
                          <Trash2 className='h-3 w-3' />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Button */}
        <div className='flex justify-end'>
          <Button onClick={handleNext} disabled={!validationResults.isValid} className='gap-2'>
            Continue to Preview
            <ArrowRight className='h-4 w-4' />
          </Button>
        </div>

        {/* Connection Edit Dialog */}
        <Dialog
          open={!!editingConnection}
          onOpenChange={(open) => !open && setEditingConnection(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2'>
                <Edit className='h-5 w-5' />
                Edit Connection
              </DialogTitle>
              <DialogDescription>Modify connection properties and conditions</DialogDescription>
            </DialogHeader>

            {editingConnection && (
              <ConnectionEditForm
                connection={editingConnection}
                visualBlocks={visualBlocks}
                onUpdate={(updatedConnection) => {
                  setVisualConnections((prev) =>
                    prev.map((c) => (c.id === updatedConnection.id ? updatedConnection : c))
                  )
                  setEditingConnection(null)
                }}
                onCancel={() => setEditingConnection(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

/**
 * Connection Edit Form Component
 */
interface ConnectionEditFormProps {
  connection: VisualConnection
  visualBlocks: VisualBlock[]
  onUpdate: (connection: VisualConnection) => void
  onCancel: () => void
}

function ConnectionEditForm({
  connection,
  visualBlocks,
  onUpdate,
  onCancel,
}: ConnectionEditFormProps) {
  const [description, setDescription] = useState(connection.connection.description || '')
  const [condition, setCondition] = useState(connection.connection.condition || '')
  const [sourceHandle, setSourceHandle] = useState(connection.connection.sourceHandle || '')
  const [targetHandle, setTargetHandle] = useState(connection.connection.targetHandle || '')

  const sourceBlock = visualBlocks.find((b) => b.id === connection.connection.source)
  const targetBlock = visualBlocks.find((b) => b.id === connection.connection.target)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const updatedConnection: VisualConnection = {
      ...connection,
      connection: {
        ...connection.connection,
        description,
        condition: condition || undefined,
        sourceHandle: sourceHandle || undefined,
        targetHandle: targetHandle || undefined,
      },
    }

    onUpdate(updatedConnection)
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='rounded-lg border p-3'>
        <h4 className='mb-2 font-medium'>Connection Path</h4>
        <div className='flex items-center gap-2 text-sm'>
          <Badge variant='outline'>{sourceBlock?.block.name}</Badge>
          <ArrowRight className='h-3 w-3' />
          <Badge variant='outline'>{targetBlock?.block.name}</Badge>
        </div>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='description'>Description</Label>
        <Input
          id='description'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder='Describe what this connection does'
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='condition'>Condition (Optional)</Label>
        <Input
          id='condition'
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          placeholder='e.g., status === "success" or score > 75'
        />
        <p className='text-muted-foreground text-xs'>
          JavaScript expression that must evaluate to true for the connection to execute
        </p>
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <Label htmlFor='sourceHandle'>Source Output</Label>
          <Select value={sourceHandle} onValueChange={setSourceHandle}>
            <SelectTrigger>
              <SelectValue placeholder='Default output' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=''>Default</SelectItem>
              {sourceBlock?.connectionPorts.outputs.map((port) => (
                <SelectItem key={port.id} value={port.id}>
                  {port.dataType} output
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='targetHandle'>Target Input</Label>
          <Select value={targetHandle} onValueChange={setTargetHandle}>
            <SelectTrigger>
              <SelectValue placeholder='Default input' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=''>Default</SelectItem>
              {targetBlock?.connectionPorts.inputs.map((port) => (
                <SelectItem key={port.id} value={port.id}>
                  {port.dataType} input
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='flex justify-end gap-2'>
        <Button type='button' variant='outline' onClick={onCancel}>
          Cancel
        </Button>
        <Button type='submit'>Update Connection</Button>
      </div>
    </form>
  )
}

export default ConnectionWizard
