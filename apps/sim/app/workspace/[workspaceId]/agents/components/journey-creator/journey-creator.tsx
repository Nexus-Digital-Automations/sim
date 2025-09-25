/**
 * Journey Creator Component
 *
 * Visual journey designer that complements the existing ReactFlow workflow editor,
 * enabling creation of Parlant journey state machines for conversational flows.
 */

'use client'

import { useCallback, useRef, useState } from 'react'
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  type EdgeTypes,
  MiniMap,
  type Node,
  type NodeTypes,
  Panel,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from 'reactflow'
import 'reactflow/dist/style.css'

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  Info,
  MessageSquare,
  RotateCcw,
  Save,
  Settings,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JourneyPreview } from './journey-preview'
import { JourneySettings } from './journey-settings'
import { JourneyStateNode } from './journey-state-node'
import { JourneyToolbox } from './journey-toolbox'
import { JourneyTransitionEdge } from './journey-transition-edge'

interface JourneyCreatorProps {
  agentId: string
  workspaceId: string
  journeyId?: string
  initialJourney?: any
  onSave?: (journey: any) => void
  onClose?: () => void
}

const nodeTypes: NodeTypes = {
  journeyState: JourneyStateNode,
}

const edgeTypes: EdgeTypes = {
  journeyTransition: JourneyTransitionEdge,
}

const initialNodes: Node[] = [
  {
    id: 'start',
    type: 'journeyState',
    position: { x: 250, y: 50 },
    data: {
      label: 'Start',
      stateType: 'initial',
      title: 'Journey Start',
      description: 'Entry point for this conversational journey',
      conditions: [],
      actions: [],
      isEditable: false,
    },
  },
]

const initialEdges: Edge[] = []

export function JourneyCreator({
  agentId,
  workspaceId,
  journeyId,
  initialJourney,
  onSave,
  onClose,
}: JourneyCreatorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)

  const [journeySettings, setJourneySettings] = useState({
    title: initialJourney?.title || 'New Journey',
    description: initialJourney?.description || '',
    conditions: initialJourney?.conditions || [],
    maxDuration: initialJourney?.maxDuration || 3600, // 1 hour default
    allowInterruption: initialJourney?.allowInterruption ?? true,
    fallbackAction:
      initialJourney?.fallbackAction || 'End journey and return to general conversation',
  })

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge = {
        ...connection,
        id: `edge-${Date.now()}`,
        type: 'journeyTransition',
        data: {
          condition: '',
          priority: 5,
          description: '',
        },
      }
      setEdges((edges) => addEdge(newEdge, edges))
    },
    [setEdges]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      if (!reactFlowInstance) return

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
      if (!reactFlowBounds) return

      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: 'journeyState',
        position,
        data: {
          label: getNodeLabel(type),
          stateType: type,
          title: getNodeTitle(type),
          description: getNodeDescription(type),
          conditions: [],
          actions: getDefaultActions(type),
          isEditable: true,
        },
      }

      setNodes((nodes) => nodes.concat(newNode))
    },
    [reactFlowInstance, setNodes]
  )

  const getNodeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      chat: 'Chat',
      tool: 'Tool',
      condition: 'Condition',
      action: 'Action',
      end: 'End',
    }
    return labels[type] || type
  }

  const getNodeTitle = (type: string): string => {
    const titles: Record<string, string> = {
      chat: 'Chat State',
      tool: 'Tool Execution',
      condition: 'Conditional Branch',
      action: 'Action State',
      end: 'Journey End',
    }
    return titles[type] || `${type} State`
  }

  const getNodeDescription = (type: string): string => {
    const descriptions: Record<string, string> = {
      chat: 'Agent communicates with the user',
      tool: 'Execute a tool or integration',
      condition: 'Branch based on conditions',
      action: 'Perform an action',
      end: 'Complete the journey',
    }
    return descriptions[type] || `${type} state description`
  }

  const getDefaultActions = (type: string): string[] => {
    const defaults: Record<string, string[]> = {
      chat: ['respond to user'],
      tool: ['execute tool'],
      condition: ['evaluate condition'],
      action: ['perform action'],
      end: ['end journey'],
    }
    return defaults[type] || []
  }

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setSelectedEdge(null)
  }, [])

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge)
    setSelectedNode(null)
  }, [])

  const updateNode = useCallback(
    (nodeId: string, updates: any) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: { ...node.data, ...updates },
              }
            : node
        )
      )
    },
    [setNodes]
  )

  const updateEdge = useCallback(
    (edgeId: string, updates: any) => {
      setEdges((edges) =>
        edges.map((edge) =>
          edge.id === edgeId
            ? {
                ...edge,
                data: { ...edge.data, ...updates },
              }
            : edge
        )
      )
    },
    [setEdges]
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      if (nodeId === 'start') return // Don't allow deleting start node

      setNodes((nodes) => nodes.filter((node) => node.id !== nodeId))
      setEdges((edges) => edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
      setSelectedNode(null)
    },
    [setNodes, setEdges]
  )

  const deleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((edges) => edges.filter((edge) => edge.id !== edgeId))
      setSelectedEdge(null)
    },
    [setEdges]
  )

  const validateJourney = useCallback(() => {
    const validation = {
      isValid: true,
      warnings: [] as string[],
      errors: [] as string[],
    }

    // Check for disconnected nodes
    const connectedNodes = new Set(['start'])
    edges.forEach((edge) => {
      connectedNodes.add(edge.source)
      connectedNodes.add(edge.target)
    })

    const disconnectedNodes = nodes.filter((node) => !connectedNodes.has(node.id))
    if (disconnectedNodes.length > 0) {
      validation.warnings.push(`${disconnectedNodes.length} disconnected state(s) found`)
    }

    // Check for end states
    const hasEndState = nodes.some((node) => node.data.stateType === 'end')
    if (!hasEndState) {
      validation.warnings.push('No end state defined - journey may run indefinitely')
    }

    // Check for empty conditions on edges
    const edgesWithoutConditions = edges.filter((edge) => !edge.data?.condition)
    if (edgesWithoutConditions.length > 0) {
      validation.warnings.push(`${edgesWithoutConditions.length} transition(s) without conditions`)
    }

    // Check for circular paths without exit conditions
    // Simplified check - in practice would need more sophisticated cycle detection
    const nodeConnections = nodes.reduce(
      (acc, node) => {
        acc[node.id] = edges.filter((edge) => edge.source === node.id).length
        return acc
      },
      {} as Record<string, number>
    )

    validation.isValid = validation.errors.length === 0

    return validation
  }, [nodes, edges])

  const saveJourney = async () => {
    setIsSaving(true)

    try {
      const journey = {
        id: journeyId || `journey-${Date.now()}`,
        agentId,
        ...journeySettings,
        states: nodes.map((node) => ({
          id: node.id,
          type: node.data.stateType,
          title: node.data.title,
          description: node.data.description,
          position: node.position,
          conditions: node.data.conditions || [],
          actions: node.data.actions || [],
        })),
        transitions: edges.map((edge) => ({
          id: edge.id,
          sourceStateId: edge.source,
          targetStateId: edge.target,
          condition: edge.data?.condition || '',
          priority: edge.data?.priority || 5,
          description: edge.data?.description || '',
        })),
        validation: validateJourney(),
        updatedAt: new Date().toISOString(),
      }

      onSave?.(journey)

      // Mock save success
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('Failed to save journey:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const validation = validateJourney()

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <Card className='rounded-b-none border-b-0'>
        <CardHeader className='pb-4'>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <ArrowRight className='h-5 w-5' />
                {journeySettings.title}
              </CardTitle>
              <p className='mt-1 text-muted-foreground text-sm'>
                {journeySettings.description || 'Design conversational journey flows'}
              </p>
            </div>

            <div className='flex items-center gap-2'>
              <Badge
                variant={validation.isValid ? 'default' : 'destructive'}
                className='flex items-center gap-1'
              >
                {validation.isValid ? (
                  <CheckCircle2 className='h-3 w-3' />
                ) : (
                  <AlertTriangle className='h-3 w-3' />
                )}
                {validation.errors.length + validation.warnings.length} issue
                {validation.errors.length + validation.warnings.length !== 1 ? 's' : ''}
              </Badge>

              <Badge variant='outline'>
                {nodes.length} state{nodes.length !== 1 ? 's' : ''}
              </Badge>

              <Badge variant='outline'>
                {edges.length} transition{edges.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>

          {/* Validation Alerts */}
          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className='mt-4 space-y-2'>
              {validation.errors.map((error, index) => (
                <Alert key={`error-${index}`} variant='destructive'>
                  <AlertTriangle className='h-4 w-4' />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ))}
              {validation.warnings.map((warning, index) => (
                <Alert key={`warning-${index}`}>
                  <Info className='h-4 w-4' />
                  <AlertDescription>{warning}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Main Content */}
      <div className='flex min-h-0 flex-1'>
        {/* Toolbox Sidebar */}
        <div className='w-64 border-r bg-muted/30'>
          <JourneyToolbox />
        </div>

        {/* Flow Canvas */}
        <div className='relative flex-1' ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onInit={setReactFlowInstance}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            className='bg-teal-50'
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />

            {/* Top Panel */}
            <Panel position='top-right'>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setIsPreviewOpen(true)}
                  className='bg-white'
                >
                  <Eye className='mr-2 h-4 w-4' />
                  Preview
                </Button>

                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setIsSettingsOpen(true)}
                  className='bg-white'
                >
                  <Settings className='mr-2 h-4 w-4' />
                  Settings
                </Button>

                <Button
                  size='sm'
                  onClick={saveJourney}
                  disabled={isSaving || !validation.isValid}
                  className='bg-white text-black hover:bg-gray-100'
                >
                  {isSaving ? (
                    <>
                      <RotateCcw className='mr-2 h-4 w-4 animate-spin' />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className='mr-2 h-4 w-4' />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Properties Sidebar */}
        <div className='w-80 overflow-y-auto border-l bg-muted/30'>
          <div className='p-4'>
            {selectedNode ? (
              <Card>
                <CardHeader>
                  <CardTitle className='text-base'>State Properties</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {/* Node editing interface would go here */}
                  <div>
                    <div className='mb-2 font-medium text-sm'>State Type</div>
                    <Badge variant='outline'>{selectedNode.data.stateType}</Badge>
                  </div>

                  <div>
                    <div className='mb-2 font-medium text-sm'>Title</div>
                    <div className='text-sm'>{selectedNode.data.title}</div>
                  </div>

                  <div>
                    <div className='mb-2 font-medium text-sm'>Description</div>
                    <div className='text-muted-foreground text-sm'>
                      {selectedNode.data.description}
                    </div>
                  </div>

                  {selectedNode.data.isEditable && (
                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          /* Edit implementation */
                        }}
                      >
                        <Edit3 className='mr-2 h-4 w-4' />
                        Edit
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => deleteNode(selectedNode.id)}
                        className='text-destructive'
                      >
                        <Trash2 className='mr-2 h-4 w-4' />
                        Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : selectedEdge ? (
              <Card>
                <CardHeader>
                  <CardTitle className='text-base'>Transition Properties</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div>
                    <div className='mb-2 font-medium text-sm'>Condition</div>
                    <div className='text-sm'>
                      {selectedEdge.data?.condition || 'No condition specified'}
                    </div>
                  </div>

                  <div>
                    <div className='mb-2 font-medium text-sm'>Priority</div>
                    <Badge variant='outline'>{selectedEdge.data?.priority || 5}</Badge>
                  </div>

                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        /* Edit implementation */
                      }}
                    >
                      <Edit3 className='mr-2 h-4 w-4' />
                      Edit
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => deleteEdge(selectedEdge.id)}
                      className='text-destructive'
                    >
                      <Trash2 className='mr-2 h-4 w-4' />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className='py-8 text-center'>
                  <MessageSquare className='mx-auto mb-2 h-8 w-8 text-muted-foreground/50' />
                  <div className='mb-1 font-medium text-sm'>No Selection</div>
                  <div className='text-muted-foreground text-xs'>
                    Select a state or transition to edit properties
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <JourneyPreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        journey={{ states: nodes, transitions: edges, ...journeySettings }}
      />

      <JourneySettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={journeySettings}
        onSave={setJourneySettings}
      />
    </div>
  )
}

// Wrapper component to provide ReactFlow context
export function JourneyCreatorWrapper(props: JourneyCreatorProps) {
  return (
    <ReactFlowProvider>
      <JourneyCreator {...props} />
    </ReactFlowProvider>
  )
}
