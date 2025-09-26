/**
 * Visual Guideline Builder Component
 *
 * Advanced visual interface for creating and managing agent guidelines
 * with drag-and-drop reordering, condition/action templates, and
 * intelligent suggestions based on tool registry.
 */

'use client'

import { useCallback, useRef, useState } from 'react'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Copy,
  Edit3,
  GripVertical,
  Lightbulb,
  MessageSquare,
  Plus,
  Search,
  Target,
  Trash2,
  Zap,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

interface Guideline {
  id: string
  condition: string
  action: string
  priority: number
  category?: string
  tools?: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface VisualGuidelineBuilderProps {
  agentId?: string
  workspaceId: string
  guidelines?: Guideline[]
  onGuidelinesChange?: (guidelines: Guideline[]) => void
  readonly?: boolean
}

const CONDITION_TEMPLATES = [
  {
    id: 'user-greets',
    name: 'User Greeting',
    template: 'the user greets you or says hello',
    category: 'conversation',
    description: 'When user starts conversation with greeting',
  },
  {
    id: 'user-confused',
    name: 'User Confusion',
    template: 'the user seems confused or asks for clarification',
    category: 'conversation',
    description: 'When user needs help understanding',
  },
  {
    id: 'data-request',
    name: 'Data Request',
    template: 'the user asks for data, analytics, or information',
    category: 'data',
    description: 'When user needs information or analysis',
  },
  {
    id: 'urgent-issue',
    name: 'Urgent Issue',
    template: 'the user indicates their request is urgent or time-sensitive',
    category: 'priority',
    description: 'When user has urgent needs',
  },
  {
    id: 'error-help',
    name: 'Error Help',
    template: 'the user reports an error or technical problem',
    category: 'support',
    description: 'When user encounters problems',
  },
]

const ACTION_TEMPLATES = [
  {
    id: 'ask-clarification',
    name: 'Ask for Clarification',
    template: 'ask clarifying questions to better understand their needs',
    tools: [],
    description: 'Get more information from user',
  },
  {
    id: 'provide-data',
    name: 'Provide Data Analysis',
    template:
      'use available data tools to gather and analyze the requested information, then present it clearly',
    tools: ['postgresql-query', 'google-sheets'],
    description: 'Analyze and present data',
  },
  {
    id: 'escalate-urgent',
    name: 'Escalate Urgent Issue',
    template:
      'prioritize their request and provide immediate assistance, escalating to human support if necessary',
    tools: ['slack-messaging', 'email-sender'],
    description: 'Handle urgent situations',
  },
  {
    id: 'troubleshoot',
    name: 'Technical Troubleshooting',
    template:
      'guide them through systematic troubleshooting steps and gather diagnostic information',
    tools: ['github-integration', 'file-operations'],
    description: 'Help resolve technical issues',
  },
]

export function VisualGuidelineBuilder({
  agentId,
  workspaceId,
  guidelines: initialGuidelines = [],
  onGuidelinesChange,
  readonly = false,
}: VisualGuidelineBuilderProps) {
  const [guidelines, setGuidelines] = useState<Guideline[]>(initialGuidelines)
  const [editingGuideline, setEditingGuideline] = useState<Guideline | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const nextId = useRef(
    Math.max(0, ...guidelines.map((g) => Number.parseInt(g.id.split('-')[1] || '0'))) + 1
  )

  const createGuideline = useCallback(
    (template?: { condition: string; action: string; tools?: string[] }) => {
      const newGuideline: Guideline = {
        id: `guideline-${nextId.current++}`,
        condition: template?.condition || '',
        action: template?.action || '',
        priority: 5,
        category: 'general',
        tools: template?.tools || [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setEditingGuideline(newGuideline)
      setIsDialogOpen(true)
    },
    []
  )

  const saveGuideline = useCallback(
    (guideline: Guideline) => {
      const updatedGuidelines =
        editingGuideline?.id.startsWith('guideline-') &&
        !guidelines.find((g) => g.id === editingGuideline.id)
          ? [...guidelines, { ...guideline, updatedAt: new Date().toISOString() }]
          : guidelines.map((g) =>
              g.id === guideline.id ? { ...guideline, updatedAt: new Date().toISOString() } : g
            )

      setGuidelines(updatedGuidelines)
      onGuidelinesChange?.(updatedGuidelines)
      setEditingGuideline(null)
      setIsDialogOpen(false)
    },
    [guidelines, editingGuideline, onGuidelinesChange]
  )

  const deleteGuideline = useCallback(
    (id: string) => {
      const updatedGuidelines = guidelines.filter((g) => g.id !== id)
      setGuidelines(updatedGuidelines)
      onGuidelinesChange?.(updatedGuidelines)
    },
    [guidelines, onGuidelinesChange]
  )

  const duplicateGuideline = useCallback(
    (guideline: Guideline) => {
      const duplicated: Guideline = {
        ...guideline,
        id: `guideline-${nextId.current++}`,
        condition: `${guideline.condition} (copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const updatedGuidelines = [...guidelines, duplicated]
      setGuidelines(updatedGuidelines)
      onGuidelinesChange?.(updatedGuidelines)
    },
    [guidelines, onGuidelinesChange]
  )

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination || readonly) return

      const reorderedGuidelines = Array.from(guidelines)
      const [removed] = reorderedGuidelines.splice(result.source.index, 1)
      reorderedGuidelines.splice(result.destination.index, 0, removed)

      setGuidelines(reorderedGuidelines)
      onGuidelinesChange?.(reorderedGuidelines)
    },
    [guidelines, onGuidelinesChange, readonly]
  )

  const filteredGuidelines = guidelines.filter((guideline) => {
    const matchesSearch =
      !searchQuery ||
      guideline.condition.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guideline.action.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || guideline.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  const getGuidelineIcon = (category?: string) => {
    switch (category) {
      case 'conversation':
        return MessageSquare
      case 'data':
        return BarChart3
      case 'support':
        return Lightbulb
      case 'priority':
        return AlertTriangle
      default:
        return Target
    }
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'text-red-600 bg-red-50 border-red-200'
    if (priority >= 6) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-blue-600 bg-blue-50 border-blue-200'
  }

  return (
    <div className='space-y-6'>
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <Brain className='h-5 w-5' />
                Guideline Builder
              </CardTitle>
              <p className='mt-1 text-muted-foreground text-sm'>
                Create and manage behavior rules for your agent
              </p>
            </div>

            {!readonly && (
              <div className='flex gap-2'>
                <Button variant='outline' size='sm' onClick={() => setShowTemplates(true)}>
                  <Lightbulb className='mr-2 h-4 w-4' />
                  Templates
                </Button>
                <Button size='sm' onClick={() => createGuideline()}>
                  <Plus className='mr-2 h-4 w-4' />
                  New Guideline
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      {guidelines.length > 0 && (
        <Card>
          <CardContent className='pt-4'>
            <div className='flex flex-col gap-4 sm:flex-row'>
              <div className='relative flex-1'>
                <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground' />
                <Input
                  placeholder='Search guidelines...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-10'
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className='w-48'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Categories</SelectItem>
                  <SelectItem value='conversation'>Conversation</SelectItem>
                  <SelectItem value='data'>Data & Analysis</SelectItem>
                  <SelectItem value='support'>Support</SelectItem>
                  <SelectItem value='priority'>Priority</SelectItem>
                  <SelectItem value='general'>General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guidelines List */}
      {filteredGuidelines.length === 0 ? (
        <Card>
          <CardContent className='py-12 text-center'>
            <Brain className='mx-auto mb-4 h-12 w-12 text-muted-foreground/50' />
            <h3 className='mb-2 font-medium'>
              {guidelines.length === 0 ? 'No guidelines yet' : 'No matching guidelines'}
            </h3>
            <p className='mb-4 text-muted-foreground text-sm'>
              {guidelines.length === 0
                ? 'Create your first guideline to define agent behavior'
                : 'Try adjusting your search or filters'}
            </p>
            {!readonly && guidelines.length === 0 && (
              <Button onClick={() => setShowTemplates(true)}>
                <Lightbulb className='mr-2 h-4 w-4' />
                Browse Templates
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId='guidelines'>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className='space-y-3'>
                {filteredGuidelines.map((guideline, index) => {
                  const IconComponent = getGuidelineIcon(guideline.category)

                  return (
                    <Draggable
                      key={guideline.id}
                      draggableId={guideline.id}
                      index={index}
                      isDragDisabled={readonly}
                    >
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`${
                            snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
                          } ${!guideline.isActive ? 'opacity-60' : ''}`}
                        >
                          <CardContent className='p-4'>
                            <div className='flex items-start gap-4'>
                              {!readonly && (
                                <div
                                  {...provided.dragHandleProps}
                                  className='mt-2 cursor-grab active:cursor-grabbing'
                                >
                                  <GripVertical className='h-4 w-4 text-muted-foreground' />
                                </div>
                              )}

                              <div className='flex-1 space-y-3'>
                                {/* Header */}
                                <div className='flex items-center justify-between'>
                                  <div className='flex items-center gap-2'>
                                    <IconComponent className='h-4 w-4' />
                                    <Badge
                                      variant='outline'
                                      className={getPriorityColor(guideline.priority)}
                                    >
                                      Priority {guideline.priority}
                                    </Badge>
                                    {guideline.category && (
                                      <Badge variant='secondary' className='capitalize'>
                                        {guideline.category}
                                      </Badge>
                                    )}
                                  </div>

                                  {!readonly && (
                                    <div className='flex items-center gap-1'>
                                      <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={() => {
                                          setEditingGuideline(guideline)
                                          setIsDialogOpen(true)
                                        }}
                                      >
                                        <Edit3 className='h-4 w-4' />
                                      </Button>
                                      <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={() => duplicateGuideline(guideline)}
                                      >
                                        <Copy className='h-4 w-4' />
                                      </Button>
                                      <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={() => deleteGuideline(guideline.id)}
                                        className='text-destructive hover:text-destructive'
                                      >
                                        <Trash2 className='h-4 w-4' />
                                      </Button>
                                    </div>
                                  )}
                                </div>

                                {/* Condition and Action */}
                                <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                                  <div>
                                    <div className='mb-1 flex items-center gap-1 font-medium text-muted-foreground text-sm'>
                                      <Target className='h-3 w-3' />
                                      When
                                    </div>
                                    <div className='rounded bg-muted/50 p-2 text-sm'>
                                      {guideline.condition || 'No condition specified'}
                                    </div>
                                  </div>

                                  <div>
                                    <div className='mb-1 flex items-center gap-1 font-medium text-muted-foreground text-sm'>
                                      <ArrowRight className='h-3 w-3' />
                                      Then
                                    </div>
                                    <div className='rounded bg-muted/50 p-2 text-sm'>
                                      {guideline.action || 'No action specified'}
                                    </div>
                                  </div>
                                </div>

                                {/* Tools */}
                                {guideline.tools && guideline.tools.length > 0 && (
                                  <div>
                                    <div className='mb-1 flex items-center gap-1 font-medium text-muted-foreground text-sm'>
                                      <Zap className='h-3 w-3' />
                                      Uses Tools
                                    </div>
                                    <div className='flex flex-wrap gap-1'>
                                      {guideline.tools.map((tool) => (
                                        <Badge key={tool} variant='outline' className='text-xs'>
                                          {tool}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  )
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className='max-w-4xl'>
          <DialogHeader>
            <DialogTitle>Guideline Templates</DialogTitle>
            <DialogDescription>
              Choose from pre-built templates to quickly create common guidelines
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue='conditions'>
            <TabsList>
              <TabsTrigger value='conditions'>Condition Templates</TabsTrigger>
              <TabsTrigger value='actions'>Action Templates</TabsTrigger>
              <TabsTrigger value='complete'>Complete Guidelines</TabsTrigger>
            </TabsList>

            <TabsContent value='conditions' className='space-y-3'>
              {CONDITION_TEMPLATES.map((template) => (
                <Card key={template.id} className='cursor-pointer hover:bg-muted/50'>
                  <CardContent className='p-4'>
                    <div className='flex items-start justify-between'>
                      <div>
                        <h4 className='font-medium'>{template.name}</h4>
                        <p className='mb-2 text-muted-foreground text-sm'>{template.description}</p>
                        <code className='rounded bg-muted px-2 py-1 text-xs'>
                          {template.template}
                        </code>
                      </div>
                      <Badge variant='secondary'>{template.category}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value='actions' className='space-y-3'>
              {ACTION_TEMPLATES.map((template) => (
                <Card key={template.id} className='cursor-pointer hover:bg-muted/50'>
                  <CardContent className='p-4'>
                    <div className='space-y-2'>
                      <h4 className='font-medium'>{template.name}</h4>
                      <p className='text-muted-foreground text-sm'>{template.description}</p>
                      <code className='block rounded bg-muted px-2 py-1 text-xs'>
                        {template.template}
                      </code>
                      {template.tools.length > 0 && (
                        <div className='flex flex-wrap gap-1'>
                          {template.tools.map((tool) => (
                            <Badge key={tool} variant='outline' className='text-xs'>
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value='complete' className='space-y-3'>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                {CONDITION_TEMPLATES.map((conditionTemplate) => {
                  const matchingAction = ACTION_TEMPLATES[0] // Simple matching for demo
                  return (
                    <Card
                      key={conditionTemplate.id}
                      className='cursor-pointer hover:bg-muted/50'
                      onClick={() => {
                        createGuideline({
                          condition: conditionTemplate.template,
                          action: matchingAction.template,
                          tools: matchingAction.tools,
                        })
                        setShowTemplates(false)
                      }}
                    >
                      <CardContent className='p-4'>
                        <h4 className='mb-2 font-medium'>
                          {conditionTemplate.name} → {matchingAction.name}
                        </h4>
                        <div className='space-y-2 text-xs'>
                          <div>
                            <strong>When:</strong> {conditionTemplate.template}
                          </div>
                          <div>
                            <strong>Then:</strong> {matchingAction.template}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Guideline Dialog */}
      <GuidelineEditDialog
        guideline={editingGuideline}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          setEditingGuideline(null)
        }}
        onSave={saveGuideline}
        workspaceId={workspaceId}
      />
    </div>
  )
}

// Separate dialog component for editing guidelines
interface GuidelineEditDialogProps {
  guideline: Guideline | null
  isOpen: boolean
  onClose: () => void
  onSave: (guideline: Guideline) => void
  workspaceId: string
}

function GuidelineEditDialog({
  guideline,
  isOpen,
  onClose,
  onSave,
  workspaceId,
}: GuidelineEditDialogProps) {
  const [editedGuideline, setEditedGuideline] = useState<Guideline | null>(null)

  // Update local state when guideline prop changes
  useState(() => {
    setEditedGuideline(guideline)
  }, [guideline])

  if (!editedGuideline) return null

  const handleSave = () => {
    if (editedGuideline.condition && editedGuideline.action) {
      onSave(editedGuideline)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            {editedGuideline.id.startsWith('guideline-') && !guideline?.createdAt
              ? 'Create Guideline'
              : 'Edit Guideline'}
          </DialogTitle>
          <DialogDescription>
            Define when this guideline applies and what action the agent should take.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Basic Settings */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label htmlFor='priority-select' className='font-medium text-sm'>
                Priority
              </label>
              <Select
                value={editedGuideline.priority.toString()}
                onValueChange={(value) =>
                  setEditedGuideline({
                    ...editedGuideline,
                    priority: Number.parseInt(value),
                  })
                }
              >
                <SelectTrigger id='priority-select'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      Priority {i + 1} {i >= 7 ? '(High)' : i >= 4 ? '(Medium)' : '(Low)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor='category-select' className='font-medium text-sm'>
                Category
              </label>
              <Select
                value={editedGuideline.category || 'general'}
                onValueChange={(value) =>
                  setEditedGuideline({
                    ...editedGuideline,
                    category: value,
                  })
                }
              >
                <SelectTrigger id='category-select'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='general'>General</SelectItem>
                  <SelectItem value='conversation'>Conversation</SelectItem>
                  <SelectItem value='data'>Data & Analysis</SelectItem>
                  <SelectItem value='support'>Support</SelectItem>
                  <SelectItem value='priority'>Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Condition */}
          <div>
            <label htmlFor='condition-textarea' className='mb-2 block font-medium text-sm'>
              When (Condition) *
            </label>
            <Textarea
              id='condition-textarea'
              placeholder='Describe the situation that triggers this guideline...'
              value={editedGuideline.condition}
              onChange={(e) =>
                setEditedGuideline({
                  ...editedGuideline,
                  condition: e.target.value,
                })
              }
              rows={3}
            />
          </div>

          {/* Action */}
          <div>
            <label htmlFor='action-textarea' className='mb-2 block font-medium text-sm'>
              Then (Action) *
            </label>
            <Textarea
              id='action-textarea'
              placeholder='Describe what the agent should do...'
              value={editedGuideline.action}
              onChange={(e) =>
                setEditedGuideline({
                  ...editedGuideline,
                  action: e.target.value,
                })
              }
              rows={4}
            />
          </div>

          {/* Validation */}
          {(!editedGuideline.condition || !editedGuideline.action) && (
            <Alert>
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription>
                Both condition and action are required to create a guideline.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!editedGuideline.condition || !editedGuideline.action}
          >
            <CheckCircle2 className='mr-2 h-4 w-4' />
            Save Guideline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
