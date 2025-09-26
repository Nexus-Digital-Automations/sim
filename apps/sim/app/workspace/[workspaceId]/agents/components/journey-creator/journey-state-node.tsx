/**
 * Journey State Node Component
 *
 * Custom ReactFlow node for representing conversational states in journey flows.
 * Provides editing capabilities, conditional logic, and visual state indicators.
 */

'use client'

import { memo, useId, useState } from 'react'
import { Handle, type NodeProps, Position } from '@xyflow/react'
import {
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Settings,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export interface JourneyStateData {
  id: string
  name: string
  type: 'start' | 'message' | 'condition' | 'action' | 'end'
  content?: string
  conditions?: Array<{
    id: string
    condition: string
    nextState: string
  }>
  actions?: Array<{
    id: string
    type: string
    parameters: Record<string, any>
  }>
  isActive?: boolean
  metadata?: {
    description?: string
    tags?: string[]
    priority?: number
  }
}

interface JourneyStateNodeProps extends NodeProps<JourneyStateData> {
  onStateUpdate?: (nodeId: string, data: Partial<JourneyStateData>) => void
  onStateDelete?: (nodeId: string) => void
}

export const JourneyStateNode = memo<JourneyStateNodeProps>(
  ({ id, data, selected, onStateUpdate, onStateDelete }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editData, setEditData] = useState<JourneyStateData>(data)

    // Generate unique IDs for form elements
    const stateNameId = useId()
    const stateContentId = useId()
    const stateDescriptionId = useId()

    const getStateIcon = () => {
      switch (data.type) {
        case 'start':
          return <Play className='h-4 w-4 text-green-500' />
        case 'end':
          return <Pause className='h-4 w-4 text-red-500' />
        case 'message':
          return <MessageSquare className='h-4 w-4 text-blue-500' />
        case 'condition':
          return <AlertCircle className='h-4 w-4 text-yellow-500' />
        case 'action':
          return <CheckCircle2 className='h-4 w-4 text-purple-500' />
        default:
          return <MessageSquare className='h-4 w-4 text-gray-500' />
      }
    }

    const getStateColor = () => {
      switch (data.type) {
        case 'start':
          return 'border-green-500 bg-green-50'
        case 'end':
          return 'border-red-500 bg-red-50'
        case 'message':
          return 'border-blue-500 bg-blue-50'
        case 'condition':
          return 'border-yellow-500 bg-yellow-50'
        case 'action':
          return 'border-purple-500 bg-purple-50'
        default:
          return 'border-gray-300 bg-white'
      }
    }

    const handleSaveChanges = () => {
      onStateUpdate?.(id, editData)
      setIsEditing(false)
    }

    const handleAddCondition = () => {
      const newCondition = {
        id: `cond_${Date.now()}`,
        condition: 'user.message contains "yes"',
        nextState: '',
      }
      setEditData({
        ...editData,
        conditions: [...(editData.conditions || []), newCondition],
      })
    }

    const handleRemoveCondition = (conditionId: string) => {
      setEditData({
        ...editData,
        conditions: editData.conditions?.filter((c) => c.id !== conditionId) || [],
      })
    }

    const handleAddAction = () => {
      const newAction = {
        id: `act_${Date.now()}`,
        type: 'send_message',
        parameters: { message: '' },
      }
      setEditData({
        ...editData,
        actions: [...(editData.actions || []), newAction],
      })
    }

    const handleRemoveAction = (actionId: string) => {
      setEditData({
        ...editData,
        actions: editData.actions?.filter((a) => a.id !== actionId) || [],
      })
    }

    const showHandles = data.type !== 'start' && data.type !== 'end'

    return (
      <>
        {/* Input Handle */}
        {data.type !== 'start' && (
          <Handle
            type='target'
            position={Position.Top}
            className='!bg-gray-400 !border-2 !border-white h-3 w-3'
          />
        )}

        <Card
          className={`min-w-[200px] ${getStateColor()} ${
            selected ? 'ring-2 ring-blue-500' : ''
          } ${data.isActive ? 'shadow-lg' : ''}`}
        >
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                {getStateIcon()}
                <span className='font-medium text-sm'>{data.name}</span>
              </div>

              <div className='flex items-center gap-1'>
                {data.metadata?.tags?.map((tag) => (
                  <Badge key={tag} variant='outline' className='text-xs'>
                    {tag}
                  </Badge>
                ))}

                <Dialog open={isEditing} onOpenChange={setIsEditing}>
                  <DialogTrigger asChild>
                    <Button variant='ghost' size='sm' className='h-6 w-6 p-0'>
                      <Settings className='h-3 w-3' />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className='max-h-[80vh] max-w-2xl overflow-y-auto'>
                    <DialogHeader>
                      <DialogTitle>Edit State: {data.name}</DialogTitle>
                      <DialogDescription>
                        Configure the behavior and properties of this journey state
                      </DialogDescription>
                    </DialogHeader>

                    <div className='space-y-6'>
                      {/* Basic Information */}
                      <div className='space-y-4'>
                        <h3 className='font-medium text-sm'>Basic Information</h3>

                        <div className='grid grid-cols-2 gap-4'>
                          <div className='space-y-2'>
                            <Label htmlFor={stateNameId}>State Name</Label>
                            <Input
                              id={stateNameId}
                              value={editData.name}
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              placeholder='Enter state name'
                            />
                          </div>

                          <div className='space-y-2'>
                            <Label htmlFor='stateType'>Type</Label>
                            <Select
                              value={editData.type}
                              onValueChange={(value) =>
                                setEditData({
                                  ...editData,
                                  type: value as JourneyStateData['type'],
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='start'>Start</SelectItem>
                                <SelectItem value='message'>Message</SelectItem>
                                <SelectItem value='condition'>Condition</SelectItem>
                                <SelectItem value='action'>Action</SelectItem>
                                <SelectItem value='end'>End</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className='space-y-2'>
                          <Label htmlFor={stateContentId}>Content</Label>
                          <Textarea
                            id={stateContentId}
                            value={editData.content || ''}
                            onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                            placeholder='Enter state content or message template'
                            rows={3}
                          />
                        </div>

                        <div className='space-y-2'>
                          <Label htmlFor='stateDescription'>Description</Label>
                          <Input
                            id='stateDescription'
                            value={editData.metadata?.description || ''}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                metadata: {
                                  ...editData.metadata,
                                  description: e.target.value,
                                },
                              })
                            }
                            placeholder='Optional description'
                          />
                        </div>
                      </div>

                      {/* Conditions */}
                      {(editData.type === 'condition' || editData.type === 'message') && (
                        <div className='space-y-4'>
                          <div className='flex items-center justify-between'>
                            <h3 className='font-medium text-sm'>Conditions</h3>
                            <Button variant='outline' size='sm' onClick={handleAddCondition}>
                              <Plus className='mr-1 h-3 w-3' />
                              Add Condition
                            </Button>
                          </div>

                          <div className='space-y-3'>
                            {editData.conditions?.map((condition, index) => (
                              <div key={condition.id} className='space-y-3 rounded-lg border p-3'>
                                <div className='flex items-center justify-between'>
                                  <Label>Condition {index + 1}</Label>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => handleRemoveCondition(condition.id)}
                                    className='h-6 w-6 p-0 text-red-500'
                                  >
                                    <X className='h-3 w-3' />
                                  </Button>
                                </div>

                                <Input
                                  value={condition.condition}
                                  onChange={(e) => {
                                    const updated =
                                      editData.conditions?.map((c) =>
                                        c.id === condition.id
                                          ? { ...c, condition: e.target.value }
                                          : c
                                      ) || []
                                    setEditData({ ...editData, conditions: updated })
                                  }}
                                  placeholder="e.g., user.intent === 'help'"
                                />

                                <Input
                                  value={condition.nextState}
                                  onChange={(e) => {
                                    const updated =
                                      editData.conditions?.map((c) =>
                                        c.id === condition.id
                                          ? { ...c, nextState: e.target.value }
                                          : c
                                      ) || []
                                    setEditData({ ...editData, conditions: updated })
                                  }}
                                  placeholder='Next state ID'
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {editData.type === 'action' && (
                        <div className='space-y-4'>
                          <div className='flex items-center justify-between'>
                            <h3 className='font-medium text-sm'>Actions</h3>
                            <Button variant='outline' size='sm' onClick={handleAddAction}>
                              <Plus className='mr-1 h-3 w-3' />
                              Add Action
                            </Button>
                          </div>

                          <div className='space-y-3'>
                            {editData.actions?.map((action, index) => (
                              <div key={action.id} className='space-y-3 rounded-lg border p-3'>
                                <div className='flex items-center justify-between'>
                                  <Label>Action {index + 1}</Label>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => handleRemoveAction(action.id)}
                                    className='h-6 w-6 p-0 text-red-500'
                                  >
                                    <X className='h-3 w-3' />
                                  </Button>
                                </div>

                                <Select
                                  value={action.type}
                                  onValueChange={(value) => {
                                    const updated =
                                      editData.actions?.map((a) =>
                                        a.id === action.id
                                          ? { ...a, type: value, parameters: {} }
                                          : a
                                      ) || []
                                    setEditData({ ...editData, actions: updated })
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value='send_message'>Send Message</SelectItem>
                                    <SelectItem value='call_tool'>Call Tool</SelectItem>
                                    <SelectItem value='set_variable'>Set Variable</SelectItem>
                                    <SelectItem value='log_event'>Log Event</SelectItem>
                                    <SelectItem value='wait'>Wait</SelectItem>
                                  </SelectContent>
                                </Select>

                                <Textarea
                                  value={JSON.stringify(action.parameters, null, 2)}
                                  onChange={(e) => {
                                    try {
                                      const parameters = JSON.parse(e.target.value)
                                      const updated =
                                        editData.actions?.map((a) =>
                                          a.id === action.id ? { ...a, parameters } : a
                                        ) || []
                                      setEditData({ ...editData, actions: updated })
                                    } catch {
                                      // Invalid JSON - ignore for now
                                    }
                                  }}
                                  placeholder='Action parameters (JSON)'
                                  rows={3}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className='space-y-4'>
                        <h3 className='font-medium text-sm'>Metadata</h3>

                        <div className='grid grid-cols-2 gap-4'>
                          <div className='space-y-2'>
                            <Label htmlFor='stateTags'>Tags (comma-separated)</Label>
                            <Input
                              id='stateTags'
                              value={editData.metadata?.tags?.join(', ') || ''}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  metadata: {
                                    ...editData.metadata,
                                    tags: e.target.value
                                      .split(',')
                                      .map((t) => t.trim())
                                      .filter(Boolean),
                                  },
                                })
                              }
                              placeholder='e.g., important, validation'
                            />
                          </div>

                          <div className='space-y-2'>
                            <Label htmlFor='statePriority'>Priority</Label>
                            <Select
                              value={editData.metadata?.priority?.toString() || '5'}
                              onValueChange={(value) =>
                                setEditData({
                                  ...editData,
                                  metadata: {
                                    ...editData.metadata,
                                    priority: Number.parseInt(value, 10),
                                  },
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='1'>1 - Lowest</SelectItem>
                                <SelectItem value='3'>3 - Low</SelectItem>
                                <SelectItem value='5'>5 - Normal</SelectItem>
                                <SelectItem value='7'>7 - High</SelectItem>
                                <SelectItem value='10'>10 - Critical</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className='flex justify-between border-t pt-4'>
                        <Button variant='destructive' onClick={() => onStateDelete?.(id)}>
                          Delete State
                        </Button>

                        <div className='flex gap-2'>
                          <Button variant='outline' onClick={() => setIsEditing(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveChanges}>Save Changes</Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant='ghost' size='sm' className='h-6 w-6 p-0'>
                      <MoreHorizontal className='h-3 w-3' />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-48' align='end'>
                    <div className='space-y-1'>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='w-full justify-start'
                        onClick={() => setIsEditing(true)}
                      >
                        <Settings className='mr-2 h-3 w-3' />
                        Edit State
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='w-full justify-start text-red-600'
                        onClick={() => onStateDelete?.(id)}
                      >
                        <X className='mr-2 h-3 w-3' />
                        Delete State
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>

          <CardContent className='pt-0 pb-3'>
            <div className='space-y-2'>
              <div className='text-muted-foreground text-xs uppercase tracking-wide'>
                {data.type}
              </div>

              {data.content && <p className='line-clamp-2 text-gray-600 text-sm'>{data.content}</p>}

              {data.conditions && data.conditions.length > 0 && (
                <div className='text-muted-foreground text-xs'>
                  {data.conditions.length} condition{data.conditions.length !== 1 ? 's' : ''}
                </div>
              )}

              {data.actions && data.actions.length > 0 && (
                <div className='text-muted-foreground text-xs'>
                  {data.actions.length} action{data.actions.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Output Handles */}
        {data.type !== 'end' && (
          <>
            <Handle
              type='source'
              position={Position.Bottom}
              className='!bg-gray-400 !border-2 !border-white h-3 w-3'
            />

            {data.conditions?.map((condition, index) => (
              <Handle
                key={condition.id}
                type='source'
                position={Position.Right}
                id={condition.id}
                className='!bg-yellow-400 !border-2 !border-white h-3 w-3'
                style={{
                  top: `${30 + index * 20}%`,
                  transform: 'translateY(-50%)',
                }}
              />
            ))}
          </>
        )}
      </>
    )
  }
)

JourneyStateNode.displayName = 'JourneyStateNode'
