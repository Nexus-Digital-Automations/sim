/**
 * Journey Preview Component
 *
 * Provides real-time preview and testing capabilities for journey flows.
 * Simulates user interactions and shows journey execution state.
 */

'use client'

import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Code,
  Eye,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  Settings,
  User,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { JourneyStateData } from './journey-state-node'

interface JourneyPreviewProps {
  nodes: any[]
  edges: any[]
  onNodeHighlight?: (nodeId: string | null) => void
  onEdgeHighlight?: (edgeId: string | null) => void
  className?: string
}

interface ExecutionStep {
  id: string
  timestamp: Date
  type:
    | 'state_enter'
    | 'state_exit'
    | 'message_sent'
    | 'message_received'
    | 'condition_check'
    | 'action_execute'
    | 'error'
  nodeId: string
  data: any
  duration?: number
  success?: boolean
  error?: string
}

interface ConversationMessage {
  id: string
  type: 'user' | 'bot' | 'system'
  content: string
  timestamp: Date
  nodeId?: string
  metadata?: {
    confidence?: number
    intent?: string
    entities?: Record<string, any>
  }
}

interface JourneyExecutionState {
  currentNode: string | null
  isRunning: boolean
  isComplete: boolean
  variables: Record<string, any>
  conversation: ConversationMessage[]
  executionLog: ExecutionStep[]
  startTime?: Date
  totalDuration?: number
}

export function JourneyPreview({
  nodes,
  edges,
  onNodeHighlight,
  onEdgeHighlight,
  className = '',
}: JourneyPreviewProps) {
  const [executionState, setExecutionState] = useState<JourneyExecutionState>({
    currentNode: null,
    isRunning: false,
    isComplete: false,
    variables: {},
    conversation: [],
    executionLog: [],
  })

  const [userInput, setUserInput] = useState('')
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false)
  const [selectedTestScenario, setSelectedTestScenario] = useState<string>('')

  // Find start node
  const startNode = nodes.find((node) => node.data?.type === 'start')

  // Mock test scenarios
  const testScenarios = [
    {
      id: 'happy-path',
      name: 'Happy Path',
      description: 'Standard successful journey execution',
      messages: ['Hi there!', 'I need help with my account', 'Thank you!'],
    },
    {
      id: 'edge-case',
      name: 'Edge Case',
      description: 'Test edge cases and error handling',
      messages: ['', 'invalid input', 'What?', 'Cancel'],
    },
    {
      id: 'complex-flow',
      name: 'Complex Flow',
      description: 'Test all branches and conditions',
      messages: ['Help me', 'Technical support', 'Reset password', 'Done'],
    },
  ]

  useEffect(() => {
    // Highlight current node
    onNodeHighlight?.(executionState.currentNode)

    return () => {
      onNodeHighlight?.(null)
    }
  }, [executionState.currentNode, onNodeHighlight])

  const startJourney = () => {
    if (!startNode) {
      addExecutionStep('error', '', {
        error: 'No start node found',
      })
      return
    }

    setExecutionState({
      currentNode: startNode.id,
      isRunning: true,
      isComplete: false,
      variables: {},
      conversation: [],
      executionLog: [],
      startTime: new Date(),
    })

    addExecutionStep('state_enter', startNode.id, {
      stateName: startNode.data?.name,
      stateType: startNode.data?.type,
    })

    // Process start node
    processNode(startNode)
  }

  const stopJourney = () => {
    setExecutionState((prev) => ({
      ...prev,
      isRunning: false,
      totalDuration: prev.startTime ? Date.now() - prev.startTime.getTime() : undefined,
    }))

    onNodeHighlight?.(null)
  }

  const resetJourney = () => {
    setExecutionState({
      currentNode: null,
      isRunning: false,
      isComplete: false,
      variables: {},
      conversation: [],
      executionLog: [],
    })

    setUserInput('')
    onNodeHighlight?.(null)
  }

  const addExecutionStep = (
    type: ExecutionStep['type'],
    nodeId: string,
    data: any,
    success = true,
    error?: string
  ) => {
    const step: ExecutionStep = {
      id: `step_${Date.now()}`,
      timestamp: new Date(),
      type,
      nodeId,
      data,
      success,
      error,
    }

    setExecutionState((prev) => ({
      ...prev,
      executionLog: [...prev.executionLog, step],
    }))
  }

  const addMessage = (type: ConversationMessage['type'], content: string, nodeId?: string) => {
    const message: ConversationMessage = {
      id: `msg_${Date.now()}`,
      type,
      content,
      timestamp: new Date(),
      nodeId,
    }

    setExecutionState((prev) => ({
      ...prev,
      conversation: [...prev.conversation, message],
    }))
  }

  const processNode = (node: any) => {
    const nodeData: JourneyStateData = node.data

    switch (nodeData.type) {
      case 'start':
        // Move to next node automatically
        setTimeout(() => {
          const nextEdge = edges.find((edge) => edge.source === node.id)
          if (nextEdge) {
            moveToNode(nextEdge.target)
          }
        }, 500)
        break

      case 'message':
        // Send bot message
        if (nodeData.content) {
          addMessage('bot', nodeData.content, node.id)
          addExecutionStep('message_sent', node.id, {
            content: nodeData.content,
          })
        }

        // Move to next node after delay
        setTimeout(() => {
          const nextEdge = edges.find((edge) => edge.source === node.id)
          if (nextEdge) {
            moveToNode(nextEdge.target)
          }
        }, 1000)
        break

      case 'condition': {
        // Evaluate conditions (simplified)
        const conditions = nodeData.conditions || []
        let matchedCondition = null

        for (const condition of conditions) {
          // Mock condition evaluation
          const isMatch = Math.random() > 0.5 // Random for demo
          addExecutionStep(
            'condition_check',
            node.id,
            {
              condition: condition.condition,
              result: isMatch,
            },
            isMatch
          )

          if (isMatch) {
            matchedCondition = condition
            break
          }
        }

        if (matchedCondition) {
          const targetNode = nodes.find((n) => n.id === matchedCondition.nextState)
          if (targetNode) {
            moveToNode(targetNode.id)
          }
        } else {
          // Use default edge
          const defaultEdge = edges.find((edge) => edge.source === node.id)
          if (defaultEdge) {
            moveToNode(defaultEdge.target)
          }
        }
        break
      }

      case 'action': {
        // Execute actions
        const actions = nodeData.actions || []
        actions.forEach((action) => {
          addExecutionStep('action_execute', node.id, {
            actionType: action.type,
            parameters: action.parameters,
          })

          // Mock action execution
          if (action.type === 'send_message' && action.parameters.message) {
            addMessage('bot', action.parameters.message, node.id)
          }
        })

        // Move to next node
        setTimeout(() => {
          const nextEdge = edges.find((edge) => edge.source === node.id)
          if (nextEdge) {
            moveToNode(nextEdge.target)
          }
        }, 1000)
        break
      }

      case 'end':
        // Journey complete
        setExecutionState((prev) => ({
          ...prev,
          isComplete: true,
          isRunning: false,
          totalDuration: prev.startTime ? Date.now() - prev.startTime.getTime() : undefined,
        }))
        addMessage('system', 'Journey completed', node.id)
        break
    }
  }

  const moveToNode = (nodeId: string) => {
    const targetNode = nodes.find((n) => n.id === nodeId)
    if (!targetNode) return

    addExecutionStep('state_exit', executionState.currentNode || '', {})

    setExecutionState((prev) => ({
      ...prev,
      currentNode: nodeId,
    }))

    addExecutionStep('state_enter', nodeId, {
      stateName: targetNode.data?.name,
      stateType: targetNode.data?.type,
    })

    processNode(targetNode)
  }

  const handleUserMessage = () => {
    if (!userInput.trim() || !executionState.isRunning) return

    addMessage('user', userInput)
    addExecutionStep('message_received', executionState.currentNode || '', {
      content: userInput,
    })

    setUserInput('')

    // Continue journey processing based on current state
    const currentNode = nodes.find((n) => n.id === executionState.currentNode)
    if (currentNode) {
      // For demo purposes, continue with next node
      setTimeout(() => {
        const nextEdge = edges.find((edge) => edge.source === currentNode.id)
        if (nextEdge) {
          moveToNode(nextEdge.target)
        }
      }, 1000)
    }
  }

  const runTestScenario = async (scenario: (typeof testScenarios)[0]) => {
    resetJourney()
    startJourney()

    // Wait for journey to start
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Send test messages with delays
    for (const message of scenario.messages) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      if (message) {
        addMessage('user', message)
        addExecutionStep('message_received', executionState.currentNode || '', {
          content: message,
        })
      }
    }
  }

  const getExecutionStepIcon = (step: ExecutionStep) => {
    switch (step.type) {
      case 'state_enter':
      case 'state_exit':
        return <Activity className='h-3 w-3' />
      case 'message_sent':
        return <Bot className='h-3 w-3 text-blue-500' />
      case 'message_received':
        return <User className='h-3 w-3 text-green-500' />
      case 'condition_check':
        return <AlertTriangle className='h-3 w-3 text-yellow-500' />
      case 'action_execute':
        return <CheckCircle2 className='h-3 w-3 text-purple-500' />
      case 'error':
        return <XCircle className='h-3 w-3 text-red-500' />
      default:
        return <Clock className='h-3 w-3' />
    }
  }

  return (
    <Card className={`h-full ${className}`}>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <Eye className='h-5 w-5' />
            Journey Preview
          </CardTitle>

          <div className='flex items-center gap-2'>
            <Badge variant={executionState.isRunning ? 'default' : 'secondary'}>
              {executionState.isRunning
                ? 'Running'
                : executionState.isComplete
                  ? 'Complete'
                  : 'Stopped'}
            </Badge>

            <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
              <DialogTrigger asChild>
                <Button variant='outline' size='sm'>
                  <Settings className='mr-1 h-4 w-4' />
                  Test
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Test Journey</DialogTitle>
                  <DialogDescription>
                    Run predefined test scenarios to validate your journey flow
                  </DialogDescription>
                </DialogHeader>

                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <Label>Test Scenario</Label>
                    <Select value={selectedTestScenario} onValueChange={setSelectedTestScenario}>
                      <SelectTrigger>
                        <SelectValue placeholder='Select a test scenario' />
                      </SelectTrigger>
                      <SelectContent>
                        {testScenarios.map((scenario) => (
                          <SelectItem key={scenario.id} value={scenario.id}>
                            {scenario.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTestScenario && (
                    <div className='space-y-2'>
                      <Label>Description</Label>
                      <p className='text-muted-foreground text-sm'>
                        {testScenarios.find((s) => s.id === selectedTestScenario)?.description}
                      </p>

                      <Label>Test Messages</Label>
                      <div className='space-y-1'>
                        {testScenarios
                          .find((s) => s.id === selectedTestScenario)
                          ?.messages.map((msg, i) => (
                            <div key={i} className='rounded bg-muted p-2 text-sm'>
                              {msg || '<empty>'}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className='flex justify-end gap-2'>
                    <Button variant='outline' onClick={() => setIsTestDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        const scenario = testScenarios.find((s) => s.id === selectedTestScenario)
                        if (scenario) {
                          runTestScenario(scenario)
                          setIsTestDialogOpen(false)
                        }
                      }}
                      disabled={!selectedTestScenario}
                    >
                      Run Test
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className='p-0'>
        {/* Control Panel */}
        <div className='border-b p-4'>
          <div className='mb-3 flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={startJourney}
              disabled={executionState.isRunning || !startNode}
            >
              <Play className='mr-1 h-3 w-3' />
              Start
            </Button>

            <Button
              variant='outline'
              size='sm'
              onClick={stopJourney}
              disabled={!executionState.isRunning}
            >
              <Pause className='mr-1 h-3 w-3' />
              Stop
            </Button>

            <Button variant='outline' size='sm' onClick={resetJourney}>
              <RotateCcw className='mr-1 h-3 w-3' />
              Reset
            </Button>

            {executionState.totalDuration && (
              <Badge variant='outline'>{Math.round(executionState.totalDuration / 1000)}s</Badge>
            )}
          </div>

          {/* User Input */}
          {executionState.isRunning && (
            <div className='flex gap-2'>
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder='Type a message...'
                onKeyDown={(e) => e.key === 'Enter' && handleUserMessage()}
              />
              <Button size='sm' onClick={handleUserMessage}>
                <MessageSquare className='mr-1 h-3 w-3' />
                Send
              </Button>
            </div>
          )}
        </div>

        {/* Preview Content */}
        <div className='flex-1'>
          <Tabs defaultValue='conversation' className='h-full'>
            <TabsList className='mx-4 my-2 grid w-full grid-cols-3'>
              <TabsTrigger value='conversation'>Conversation</TabsTrigger>
              <TabsTrigger value='execution'>Execution</TabsTrigger>
              <TabsTrigger value='variables'>Variables</TabsTrigger>
            </TabsList>

            <TabsContent value='conversation' className='m-0 p-0'>
              <ScrollArea className='h-[400px] p-4'>
                <div className='space-y-3'>
                  {executionState.conversation.length === 0 ? (
                    <div className='py-8 text-center text-muted-foreground'>
                      <MessageSquare className='mx-auto mb-2 h-8 w-8 opacity-50' />
                      <p className='text-sm'>No messages yet</p>
                      <p className='text-xs'>Start the journey to see conversation</p>
                    </div>
                  ) : (
                    executionState.conversation.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.type === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.type === 'user'
                              ? 'bg-blue-500 text-white'
                              : message.type === 'bot'
                                ? 'bg-muted'
                                : 'bg-yellow-100 text-center text-yellow-800'
                          }`}
                        >
                          <div className='flex items-start gap-2'>
                            {message.type === 'user' ? (
                              <User className='mt-0.5 h-4 w-4 flex-shrink-0' />
                            ) : message.type === 'bot' ? (
                              <Bot className='mt-0.5 h-4 w-4 flex-shrink-0' />
                            ) : (
                              <Settings className='mt-0.5 h-4 w-4 flex-shrink-0' />
                            )}
                            <div className='flex-1'>
                              <p className='text-sm'>{message.content}</p>
                              <p
                                className={`mt-1 text-xs ${
                                  message.type === 'user'
                                    ? 'text-blue-100'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value='execution' className='m-0 p-0'>
              <ScrollArea className='h-[400px] p-4'>
                <div className='space-y-2'>
                  {executionState.executionLog.length === 0 ? (
                    <div className='py-8 text-center text-muted-foreground'>
                      <Code className='mx-auto mb-2 h-8 w-8 opacity-50' />
                      <p className='text-sm'>No execution steps yet</p>
                      <p className='text-xs'>Start the journey to see execution log</p>
                    </div>
                  ) : (
                    executionState.executionLog.map((step) => (
                      <div key={step.id} className='flex items-start gap-3 rounded border p-2'>
                        <div className='mt-0.5'>{getExecutionStepIcon(step)}</div>
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-2'>
                            <span className='font-medium text-sm capitalize'>
                              {step.type.replace('_', ' ')}
                            </span>
                            <Badge variant='outline' className='text-xs'>
                              {step.timestamp.toLocaleTimeString()}
                            </Badge>
                            {step.success === false && (
                              <Badge variant='destructive' className='text-xs'>
                                Error
                              </Badge>
                            )}
                          </div>
                          {step.data && (
                            <div className='mt-1 text-muted-foreground text-xs'>
                              {JSON.stringify(step.data, null, 2)}
                            </div>
                          )}
                          {step.error && (
                            <div className='mt-1 text-red-600 text-xs'>{step.error}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value='variables' className='m-0 p-0'>
              <ScrollArea className='h-[400px] p-4'>
                <div className='space-y-3'>
                  {Object.keys(executionState.variables).length === 0 ? (
                    <div className='py-8 text-center text-muted-foreground'>
                      <Settings className='mx-auto mb-2 h-8 w-8 opacity-50' />
                      <p className='text-sm'>No variables set</p>
                      <p className='text-xs'>Variables will appear here during execution</p>
                    </div>
                  ) : (
                    Object.entries(executionState.variables).map(([key, value]) => (
                      <div key={key} className='rounded border p-3'>
                        <div className='mb-1 font-medium text-sm'>{key}</div>
                        <div className='text-muted-foreground text-xs'>
                          {typeof value === 'object'
                            ? JSON.stringify(value, null, 2)
                            : String(value)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  )
}
