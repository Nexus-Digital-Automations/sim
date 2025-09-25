/**
 * Journey Transition Edge Component
 *
 * Custom ReactFlow edge for representing transitions between journey states.
 * Supports conditional routing, animation, and interactive editing.
 */

'use client'

import { memo, useState } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  MarkerType,
} from '@xyflow/react'
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Settings, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export interface JourneyTransitionData {
  id: string
  label?: string
  condition?: string
  priority?: number
  delay?: number
  animation?: 'none' | 'pulse' | 'flow' | 'glow'
  style?: {
    stroke?: string
    strokeWidth?: number
    strokeDasharray?: string
  }
  metadata?: {
    description?: string
    tags?: string[]
    isConditional?: boolean
    isDefault?: boolean
  }
}

interface JourneyTransitionEdgeProps extends EdgeProps<JourneyTransitionData> {
  onEdgeUpdate?: (edgeId: string, data: Partial<JourneyTransitionData>) => void
  onEdgeDelete?: (edgeId: string) => void
}

export const JourneyTransitionEdge = memo<JourneyTransitionEdgeProps>(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data = {},
    selected,
    onEdgeUpdate,
    onEdgeDelete,
  }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editData, setEditData] = useState<JourneyTransitionData>(data)

    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    })

    const getEdgeStyle = () => {
      const baseStyle = {
        strokeWidth: data.style?.strokeWidth || (selected ? 3 : 2),
        stroke: data.style?.stroke || getEdgeColor(),
        strokeDasharray: data.style?.strokeDasharray,
      }

      // Add animation classes based on animation type
      const animationClass =
        data.animation === 'pulse'
          ? 'animate-pulse'
          : data.animation === 'flow'
            ? 'journey-flow-animation'
            : data.animation === 'glow'
              ? 'journey-glow-animation'
              : ''

      return { ...baseStyle, className: animationClass }
    }

    const getEdgeColor = () => {
      if (data.metadata?.isDefault) return '#10b981' // green
      if (data.metadata?.isConditional) return '#f59e0b' // amber
      if (data.priority && data.priority >= 8) return '#ef4444' // red
      return '#6b7280' // gray
    }

    const getEdgeIcon = () => {
      if (data.metadata?.isDefault) return <CheckCircle2 className='h-3 w-3 text-green-500' />
      if (data.metadata?.isConditional) return <AlertTriangle className='h-3 w-3 text-amber-500' />
      if (data.delay && data.delay > 0) return <Clock className='h-3 w-3 text-blue-500' />
      return <ArrowRight className='h-3 w-3 text-gray-500' />
    }

    const handleSaveChanges = () => {
      onEdgeUpdate?.(id, editData)
      setIsEditing(false)
    }

    const markerEnd = {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: getEdgeColor(),
    }

    return (
      <>
        <BaseEdge id={id} path={edgePath} style={getEdgeStyle()} markerEnd={markerEnd} />

        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className='nodrag nopan'
          >
            {/* Edge Label */}
            {(data.label || data.condition || selected) && (
              <div
                className={`flex items-center gap-2 rounded-lg border bg-white px-2 py-1 shadow-sm ${
                  selected ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {getEdgeIcon()}

                {data.label && (
                  <span className='font-medium text-gray-700 text-xs'>{data.label}</span>
                )}

                {data.condition && !data.label && (
                  <span className='max-w-[100px] truncate text-gray-500 text-xs'>
                    {data.condition}
                  </span>
                )}

                {data.delay && data.delay > 0 && (
                  <Badge variant='outline' className='text-xs'>
                    {data.delay}s
                  </Badge>
                )}

                {data.metadata?.tags?.map((tag) => (
                  <Badge key={tag} variant='secondary' className='text-xs'>
                    {tag}
                  </Badge>
                ))}

                {selected && (
                  <div className='flex items-center gap-1'>
                    <Dialog open={isEditing} onOpenChange={setIsEditing}>
                      <DialogTrigger asChild>
                        <Button variant='ghost' size='sm' className='h-5 w-5 p-0'>
                          <Settings className='h-3 w-3' />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className='max-w-lg'>
                        <DialogHeader>
                          <DialogTitle>Edit Transition</DialogTitle>
                          <DialogDescription>
                            Configure the behavior and appearance of this transition
                          </DialogDescription>
                        </DialogHeader>

                        <div className='space-y-4'>
                          {/* Basic Properties */}
                          <div className='space-y-3'>
                            <h3 className='font-medium text-sm'>Basic Properties</h3>

                            <div className='space-y-2'>
                              <Label htmlFor='transitionLabel'>Label</Label>
                              <Input
                                id='transitionLabel'
                                value={editData.label || ''}
                                onChange={(e) =>
                                  setEditData({ ...editData, label: e.target.value })
                                }
                                placeholder='Optional transition label'
                              />
                            </div>

                            <div className='space-y-2'>
                              <Label htmlFor='transitionCondition'>Condition</Label>
                              <Textarea
                                id='transitionCondition'
                                value={editData.condition || ''}
                                onChange={(e) =>
                                  setEditData({ ...editData, condition: e.target.value })
                                }
                                placeholder="e.g., user.intent === 'help' && user.confidence > 0.8"
                                rows={2}
                              />
                            </div>

                            <div className='grid grid-cols-2 gap-3'>
                              <div className='space-y-2'>
                                <Label htmlFor='transitionPriority'>Priority</Label>
                                <Select
                                  value={editData.priority?.toString() || '5'}
                                  onValueChange={(value) =>
                                    setEditData({
                                      ...editData,
                                      priority: Number.parseInt(value),
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

                              <div className='space-y-2'>
                                <Label htmlFor='transitionDelay'>Delay (seconds)</Label>
                                <Input
                                  id='transitionDelay'
                                  type='number'
                                  min='0'
                                  step='0.1'
                                  value={editData.delay || 0}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      delay: Number.parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  placeholder='0'
                                />
                              </div>
                            </div>
                          </div>

                          {/* Appearance */}
                          <div className='space-y-3'>
                            <h3 className='font-medium text-sm'>Appearance</h3>

                            <div className='grid grid-cols-2 gap-3'>
                              <div className='space-y-2'>
                                <Label htmlFor='transitionAnimation'>Animation</Label>
                                <Select
                                  value={editData.animation || 'none'}
                                  onValueChange={(value) =>
                                    setEditData({
                                      ...editData,
                                      animation: value as JourneyTransitionData['animation'],
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value='none'>None</SelectItem>
                                    <SelectItem value='pulse'>Pulse</SelectItem>
                                    <SelectItem value='flow'>Flow</SelectItem>
                                    <SelectItem value='glow'>Glow</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className='space-y-2'>
                                <Label htmlFor='transitionColor'>Color</Label>
                                <Select
                                  value={editData.style?.stroke || 'default'}
                                  onValueChange={(value) =>
                                    setEditData({
                                      ...editData,
                                      style: {
                                        ...editData.style,
                                        stroke: value === 'default' ? undefined : value,
                                      },
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value='default'>Default</SelectItem>
                                    <SelectItem value='#10b981'>Green</SelectItem>
                                    <SelectItem value='#f59e0b'>Amber</SelectItem>
                                    <SelectItem value='#ef4444'>Red</SelectItem>
                                    <SelectItem value='#3b82f6'>Blue</SelectItem>
                                    <SelectItem value='#8b5cf6'>Purple</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className='grid grid-cols-2 gap-3'>
                              <div className='space-y-2'>
                                <Label htmlFor='transitionWidth'>Line Width</Label>
                                <Select
                                  value={editData.style?.strokeWidth?.toString() || '2'}
                                  onValueChange={(value) =>
                                    setEditData({
                                      ...editData,
                                      style: {
                                        ...editData.style,
                                        strokeWidth: Number.parseInt(value),
                                      },
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value='1'>Thin</SelectItem>
                                    <SelectItem value='2'>Normal</SelectItem>
                                    <SelectItem value='3'>Thick</SelectItem>
                                    <SelectItem value='4'>Extra Thick</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className='space-y-2'>
                                <Label htmlFor='transitionStyle'>Line Style</Label>
                                <Select
                                  value={editData.style?.strokeDasharray ? 'dashed' : 'solid'}
                                  onValueChange={(value) =>
                                    setEditData({
                                      ...editData,
                                      style: {
                                        ...editData.style,
                                        strokeDasharray: value === 'dashed' ? '5,5' : undefined,
                                      },
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value='solid'>Solid</SelectItem>
                                    <SelectItem value='dashed'>Dashed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          {/* Metadata */}
                          <div className='space-y-3'>
                            <h3 className='font-medium text-sm'>Metadata</h3>

                            <div className='space-y-2'>
                              <Label htmlFor='transitionDescription'>Description</Label>
                              <Input
                                id='transitionDescription'
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

                            <div className='space-y-2'>
                              <Label htmlFor='transitionTags'>Tags (comma-separated)</Label>
                              <Input
                                id='transitionTags'
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
                                placeholder='e.g., validation, priority'
                              />
                            </div>

                            <div className='flex items-center gap-4'>
                              <label className='flex items-center gap-2 text-sm'>
                                <input
                                  type='checkbox'
                                  checked={editData.metadata?.isConditional || false}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      metadata: {
                                        ...editData.metadata,
                                        isConditional: e.target.checked,
                                      },
                                    })
                                  }
                                />
                                Conditional
                              </label>

                              <label className='flex items-center gap-2 text-sm'>
                                <input
                                  type='checkbox'
                                  checked={editData.metadata?.isDefault || false}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      metadata: {
                                        ...editData.metadata,
                                        isDefault: e.target.checked,
                                      },
                                    })
                                  }
                                />
                                Default Route
                              </label>
                            </div>
                          </div>

                          <div className='flex justify-between border-t pt-4'>
                            <Button variant='destructive' onClick={() => onEdgeDelete?.(id)}>
                              Delete Transition
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

                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => onEdgeDelete?.(id)}
                      className='h-5 w-5 p-0 text-red-500'
                    >
                      <X className='h-3 w-3' />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      </>
    )
  }
)

JourneyTransitionEdge.displayName = 'JourneyTransitionEdge'
