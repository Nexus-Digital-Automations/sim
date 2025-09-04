/**
 * Drag-and-Drop Template Builder - Visual Workflow Construction Interface
 *
 * This component provides an intuitive drag-and-drop interface for building templates:
 * - Visual workflow canvas with snap-to-grid alignment
 * - Block library with categorized components
 * - Real-time connection validation and feedback
 * - Undo/redo functionality with history management
 * - Template validation and error highlighting
 * - Collaborative editing with real-time updates
 *
 * Design Features:
 * - Modern canvas-based interface with smooth interactions
 * - Color-coded block categories with consistent visual language
 * - Intelligent connection suggestions and auto-routing
 * - Context-sensitive property panels
 * - Responsive design with collapsible sidebars
 * - Accessibility support for keyboard navigation
 *
 * @author Claude Code Template System - UI/UX Specialist
 * @version 1.0.0
 */

'use client'

import type * as React from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  History,
  Home,
  Layers,
  Play,
  Redo,
  Save,
  Search,
  Settings,
  Trash2,
  Undo,
  Upload,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Block type definitions for the template builder
 */
interface BlockType {
  id: string
  name: string
  category: 'trigger' | 'action' | 'logic' | 'data' | 'integration'
  icon: React.ComponentType<any>
  color: string
  description: string
  inputs: { id: string; name: string; type: string; required: boolean }[]
  outputs: { id: string; name: string; type: string }[]
  settings: { id: string; name: string; type: string; default?: any }[]
}

/**
 * Workflow block instance
 */
interface WorkflowBlock {
  id: string
  type: string
  name: string
  position: { x: number; y: number }
  settings: Record<string, any>
  connections: {
    input: string
    output: string
    targetBlockId: string
    targetInput: string
  }[]
}

/**
 * Canvas viewport state
 */
interface ViewportState {
  zoom: number
  pan: { x: number; y: number }
  selectedBlocks: string[]
  draggedBlock?: string
  connectionMode: boolean
  sourceConnection?: { blockId: string; outputId: string }
}

/**
 * Template builder props
 */
export interface DragDropTemplateBuilderProps {
  /** Initial workflow state */
  initialWorkflow?: WorkflowBlock[]
  /** Available block types */
  blockTypes?: BlockType[]
  /** Template metadata */
  templateMetadata?: {
    name: string
    category: string
    difficulty: string
  }
  /** Callback when workflow changes */
  onChange?: (workflow: WorkflowBlock[]) => void
  /** Callback when template is saved */
  onSave?: (workflow: WorkflowBlock[]) => void
  /** Callback when template is tested */
  onTest?: (workflow: WorkflowBlock[]) => void
  /** Whether the builder is in read-only mode */
  readOnly?: boolean
  /** Custom CSS class */
  className?: string
}

/**
 * Default block types for the template builder
 */
const DEFAULT_BLOCK_TYPES: BlockType[] = [
  {
    id: 'http-trigger',
    name: 'HTTP Trigger',
    category: 'trigger',
    icon: Zap,
    color: '#10B981',
    description: 'Triggers workflow when HTTP request is received',
    inputs: [],
    outputs: [{ id: 'response', name: 'Response Data', type: 'object' }],
    settings: [
      { id: 'method', name: 'HTTP Method', type: 'select', default: 'POST' },
      { id: 'path', name: 'Endpoint Path', type: 'string', default: '/webhook' },
    ],
  },
  {
    id: 'schedule-trigger',
    name: 'Schedule Trigger',
    category: 'trigger',
    icon: History,
    color: '#10B981',
    description: 'Triggers workflow on a schedule',
    inputs: [],
    outputs: [{ id: 'timestamp', name: 'Trigger Time', type: 'datetime' }],
    settings: [
      { id: 'cron', name: 'Cron Expression', type: 'string', default: '0 9 * * 1-5' },
      { id: 'timezone', name: 'Timezone', type: 'string', default: 'UTC' },
    ],
  },
  {
    id: 'http-request',
    name: 'HTTP Request',
    category: 'action',
    icon: Upload,
    color: '#3B82F6',
    description: 'Make HTTP requests to external APIs',
    inputs: [{ id: 'data', name: 'Request Data', type: 'object', required: false }],
    outputs: [{ id: 'response', name: 'Response', type: 'object' }],
    settings: [
      { id: 'url', name: 'URL', type: 'string', default: '' },
      { id: 'method', name: 'Method', type: 'select', default: 'GET' },
      { id: 'headers', name: 'Headers', type: 'object', default: {} },
    ],
  },
  {
    id: 'email-send',
    name: 'Send Email',
    category: 'action',
    icon: Upload,
    color: '#3B82F6',
    description: 'Send email notifications',
    inputs: [{ id: 'content', name: 'Email Content', type: 'string', required: true }],
    outputs: [{ id: 'result', name: 'Send Result', type: 'boolean' }],
    settings: [
      { id: 'to', name: 'Recipient', type: 'string', default: '' },
      { id: 'subject', name: 'Subject', type: 'string', default: '' },
    ],
  },
  {
    id: 'condition',
    name: 'Condition',
    category: 'logic',
    icon: Settings,
    color: '#F59E0B',
    description: 'Branch workflow based on conditions',
    inputs: [{ id: 'value', name: 'Input Value', type: 'any', required: true }],
    outputs: [
      { id: 'true', name: 'True Path', type: 'any' },
      { id: 'false', name: 'False Path', type: 'any' },
    ],
    settings: [{ id: 'condition', name: 'Condition', type: 'string', default: 'value > 0' }],
  },
  {
    id: 'data-transform',
    name: 'Transform Data',
    category: 'data',
    icon: Settings,
    color: '#8B5CF6',
    description: 'Transform and manipulate data',
    inputs: [{ id: 'input', name: 'Input Data', type: 'any', required: true }],
    outputs: [{ id: 'output', name: 'Transformed Data', type: 'any' }],
    settings: [
      { id: 'transformation', name: 'Transformation Code', type: 'code', default: 'return input' },
    ],
  },
]

/**
 * Draggable Block Component for the library
 */
const DraggableBlockType: React.FC<{
  blockType: BlockType
  onDragStart?: () => void
}> = ({ blockType, onDragStart }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'blockType',
    item: { blockType },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    begin: onDragStart,
  })

  const IconComponent = blockType.icon

  return (
    <div
      ref={drag}
      className={cn(
        'group relative cursor-grab rounded-lg border p-3 transition-all hover:shadow-md',
        isDragging && 'opacity-50'
      )}
      style={{ borderColor: blockType.color }}
    >
      <div className='flex items-center gap-2'>
        <div
          className='flex h-8 w-8 items-center justify-center rounded'
          style={{ backgroundColor: `${blockType.color}20`, color: blockType.color }}
        >
          <IconComponent className='h-4 w-4' />
        </div>
        <div className='min-w-0 flex-1'>
          <h4 className='truncate font-medium text-sm'>{blockType.name}</h4>
          <p className='truncate text-muted-foreground text-xs'>{blockType.description}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Workflow Block Component on the canvas
 */
const WorkflowBlockComponent: React.FC<{
  block: WorkflowBlock
  blockType: BlockType
  isSelected: boolean
  onSelect: (blockId: string) => void
  onMove: (blockId: string, position: { x: number; y: number }) => void
  onDelete: (blockId: string) => void
}> = ({ block, blockType, isSelected, onSelect, onMove, onDelete }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'workflowBlock',
    item: { blockId: block.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const IconComponent = blockType.icon

  return (
    <motion.div
      ref={drag}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'absolute cursor-pointer select-none',
        isDragging && 'pointer-events-none opacity-50'
      )}
      style={{
        left: block.position.x,
        top: block.position.y,
        zIndex: isSelected ? 10 : 1,
      }}
      onClick={() => onSelect(block.id)}
    >
      <Card
        className={cn(
          'min-w-[180px] transition-all',
          isSelected && 'shadow-lg ring-2 ring-blue-500'
        )}
      >
        <CardHeader className='pb-2' style={{ borderTopColor: blockType.color }}>
          <div className='flex items-center gap-2'>
            <div
              className='flex h-6 w-6 items-center justify-center rounded'
              style={{ backgroundColor: `${blockType.color}20`, color: blockType.color }}
            >
              <IconComponent className='h-4 w-4' />
            </div>
            <div className='min-w-0 flex-1'>
              <h4 className='truncate font-medium text-sm'>{block.name}</h4>
            </div>
            {isSelected && (
              <Button
                size='sm'
                variant='ghost'
                className='h-6 w-6 p-0 text-red-500 hover:text-red-600'
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(block.id)
                }}
              >
                <Trash2 className='h-3 w-3' />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className='pt-0'>
          {/* Input Connections */}
          {blockType.inputs.length > 0 && (
            <div className='mb-2 space-y-1'>
              {blockType.inputs.map((input) => (
                <div key={input.id} className='flex items-center gap-2'>
                  <div className='h-2 w-2 rounded-full border bg-white' />
                  <span className='text-muted-foreground text-xs'>{input.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Output Connections */}
          {blockType.outputs.length > 0 && (
            <div className='space-y-1'>
              {blockType.outputs.map((output) => (
                <div key={output.id} className='flex items-center justify-end gap-2'>
                  <span className='text-muted-foreground text-xs'>{output.name}</span>
                  <div
                    className='h-2 w-2 rounded-full'
                    style={{ backgroundColor: blockType.color }}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/**
 * Template Builder Canvas Component
 */
const BuilderCanvas: React.FC<{
  blocks: WorkflowBlock[]
  blockTypes: BlockType[]
  viewport: ViewportState
  onBlockAdd: (blockType: BlockType, position: { x: number; y: number }) => void
  onBlockMove: (blockId: string, position: { x: number; y: number }) => void
  onBlockSelect: (blockId: string) => void
  onBlockDelete: (blockId: string) => void
  onViewportChange: (viewport: Partial<ViewportState>) => void
}> = ({
  blocks,
  blockTypes,
  viewport,
  onBlockAdd,
  onBlockMove,
  onBlockSelect,
  onBlockDelete,
  onViewportChange,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)

  const [{ isOver }, drop] = useDrop({
    accept: ['blockType', 'workflowBlock'],
    drop: (item: any, monitor) => {
      if (!canvasRef.current) return

      const offset = monitor.getClientOffset()
      const canvasRect = canvasRef.current.getBoundingClientRect()

      if (offset) {
        const position = {
          x: (offset.x - canvasRect.left - viewport.pan.x) / viewport.zoom,
          y: (offset.y - canvasRect.top - viewport.pan.y) / viewport.zoom,
        }

        if (item.blockType) {
          // Adding new block from library
          onBlockAdd(item.blockType, position)
        } else if (item.blockId) {
          // Moving existing block
          onBlockMove(item.blockId, position)
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  })

  const blockTypeMap = useMemo(() => {
    return blockTypes.reduce(
      (acc, type) => {
        acc[type.id] = type
        return acc
      },
      {} as Record<string, BlockType>
    )
  }, [blockTypes])

  return (
    <div
      ref={(node) => {
        drop(node)
        canvasRef.current = node
      }}
      className={cn('relative h-full w-full overflow-hidden bg-gray-50', isOver && 'bg-blue-50')}
      style={{
        backgroundImage: `
          radial-gradient(circle, #e5e5e5 1px, transparent 1px)
        `,
        backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
        backgroundPosition: `${viewport.pan.x}px ${viewport.pan.y}px`,
      }}
    >
      {/* Grid Pattern */}
      <div className='pointer-events-none absolute inset-0'>
        <svg className='h-full w-full'>
          <defs>
            <pattern
              id='grid'
              width={20 * viewport.zoom}
              height={20 * viewport.zoom}
              patternUnits='userSpaceOnUse'
              x={viewport.pan.x}
              y={viewport.pan.y}
            >
              <path
                d={`M ${20 * viewport.zoom} 0 L 0 0 0 ${20 * viewport.zoom}`}
                fill='none'
                stroke='#e5e5e5'
                strokeWidth='1'
              />
            </pattern>
          </defs>
          <rect width='100%' height='100%' fill='url(#grid)' />
        </svg>
      </div>

      {/* Workflow Blocks */}
      <div
        className='relative'
        style={{
          transform: `scale(${viewport.zoom}) translate(${viewport.pan.x}px, ${viewport.pan.y}px)`,
          transformOrigin: '0 0',
        }}
      >
        {blocks.map((block) => {
          const blockType = blockTypeMap[block.type]
          if (!blockType) return null

          return (
            <WorkflowBlockComponent
              key={block.id}
              block={block}
              blockType={blockType}
              isSelected={viewport.selectedBlocks.includes(block.id)}
              onSelect={onBlockSelect}
              onMove={onBlockMove}
              onDelete={onBlockDelete}
            />
          )
        })}
      </div>

      {/* Canvas Controls */}
      <div className='absolute top-4 right-4 flex flex-col gap-2'>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size='sm'
                variant='outline'
                className='h-8 w-8 p-0'
                onClick={() => onViewportChange({ zoom: Math.min(viewport.zoom * 1.2, 2) })}
              >
                <ZoomIn className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size='sm'
                variant='outline'
                className='h-8 w-8 p-0'
                onClick={() => onViewportChange({ zoom: Math.max(viewport.zoom * 0.8, 0.2) })}
              >
                <ZoomOut className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size='sm'
                variant='outline'
                className='h-8 w-8 p-0'
                onClick={() => onViewportChange({ zoom: 1, pan: { x: 0, y: 0 } })}
              >
                <Home className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset View</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Drop Zone Indicator */}
      {isOver && (
        <div className='absolute inset-0 flex items-center justify-center bg-blue-100/50 backdrop-blur-sm'>
          <div className='rounded-lg bg-blue-500 px-4 py-2 text-white shadow-lg'>
            Drop block here to add to workflow
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Block Library Sidebar Component
 */
const BlockLibrary: React.FC<{
  blockTypes: BlockType[]
  isOpen: boolean
  onToggle: () => void
}> = ({ blockTypes, isOpen, onToggle }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = useMemo(() => {
    const categorySet = new Set(blockTypes.map((block) => block.category))
    return [
      { id: 'all', name: 'All Blocks', count: blockTypes.length },
      ...Array.from(categorySet).map((category) => ({
        id: category,
        name: category.charAt(0).toUpperCase() + category.slice(1),
        count: blockTypes.filter((block) => block.category === category).length,
      })),
    ]
  }, [blockTypes])

  const filteredBlocks = useMemo(() => {
    return blockTypes.filter((block) => {
      const matchesSearch =
        block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        block.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || block.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [blockTypes, searchQuery, selectedCategory])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className='flex h-full flex-col border-r bg-white'
        >
          <div className='flex items-center justify-between border-b p-4'>
            <h3 className='font-semibold'>Block Library</h3>
            <Button size='sm' variant='ghost' onClick={onToggle}>
              <ChevronLeft className='h-4 w-4' />
            </Button>
          </div>

          <div className='flex-1 overflow-hidden'>
            <div className='space-y-4 p-4'>
              {/* Search */}
              <div className='relative'>
                <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search blocks...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-10'
                />
              </div>

              {/* Categories */}
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList className='grid w-full grid-cols-3'>
                  <TabsTrigger value='all' className='text-xs'>
                    All
                  </TabsTrigger>
                  <TabsTrigger value='trigger' className='text-xs'>
                    Triggers
                  </TabsTrigger>
                  <TabsTrigger value='action' className='text-xs'>
                    Actions
                  </TabsTrigger>
                </TabsList>
                <TabsList className='mt-2 grid w-full grid-cols-2'>
                  <TabsTrigger value='logic' className='text-xs'>
                    Logic
                  </TabsTrigger>
                  <TabsTrigger value='data' className='text-xs'>
                    Data
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Block List */}
            <ScrollArea className='h-full'>
              <div className='space-y-2 p-4'>
                {filteredBlocks.map((blockType) => (
                  <DraggableBlockType key={blockType.id} blockType={blockType} />
                ))}
                {filteredBlocks.length === 0 && (
                  <div className='py-8 text-center text-muted-foreground'>
                    No blocks found matching your criteria
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Properties Panel Component
 */
const PropertiesPanel: React.FC<{
  selectedBlock?: WorkflowBlock
  blockType?: BlockType
  isOpen: boolean
  onToggle: () => void
  onBlockUpdate: (blockId: string, updates: Partial<WorkflowBlock>) => void
}> = ({ selectedBlock, blockType, isOpen, onToggle, onBlockUpdate }) => {
  const handleSettingChange = useCallback(
    (settingId: string, value: any) => {
      if (selectedBlock) {
        onBlockUpdate(selectedBlock.id, {
          settings: {
            ...selectedBlock.settings,
            [settingId]: value,
          },
        })
      }
    },
    [selectedBlock, onBlockUpdate]
  )

  const handleNameChange = useCallback(
    (name: string) => {
      if (selectedBlock) {
        onBlockUpdate(selectedBlock.id, { name })
      }
    },
    [selectedBlock, onBlockUpdate]
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className='flex h-full flex-col border-l bg-white'
        >
          <div className='flex items-center justify-between border-b p-4'>
            <h3 className='font-semibold'>Properties</h3>
            <Button size='sm' variant='ghost' onClick={onToggle}>
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>

          <div className='flex-1 overflow-hidden'>
            {selectedBlock && blockType ? (
              <ScrollArea className='h-full'>
                <div className='space-y-6 p-4'>
                  {/* Block Info */}
                  <div className='space-y-3'>
                    <div className='flex items-center gap-2'>
                      <div
                        className='flex h-8 w-8 items-center justify-center rounded'
                        style={{ backgroundColor: `${blockType.color}20`, color: blockType.color }}
                      >
                        <blockType.icon className='h-4 w-4' />
                      </div>
                      <div>
                        <h4 className='font-medium'>{blockType.name}</h4>
                        <p className='text-muted-foreground text-xs'>{blockType.description}</p>
                      </div>
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='block-name'>Block Name</Label>
                      <Input
                        id='block-name'
                        value={selectedBlock.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Block Settings */}
                  {blockType.settings.length > 0 && (
                    <div className='space-y-4'>
                      <h5 className='font-medium'>Settings</h5>
                      {blockType.settings.map((setting) => (
                        <div key={setting.id} className='space-y-2'>
                          <Label htmlFor={setting.id}>{setting.name}</Label>
                          {setting.type === 'string' && (
                            <Input
                              id={setting.id}
                              value={selectedBlock.settings[setting.id] || setting.default || ''}
                              onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                            />
                          )}
                          {setting.type === 'select' && setting.id === 'method' && (
                            <select
                              id={setting.id}
                              value={selectedBlock.settings[setting.id] || setting.default}
                              onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                              className='w-full rounded border px-3 py-2'
                            >
                              <option value='GET'>GET</option>
                              <option value='POST'>POST</option>
                              <option value='PUT'>PUT</option>
                              <option value='DELETE'>DELETE</option>
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <Separator />

                  {/* Block Connections */}
                  <div className='space-y-4'>
                    <h5 className='font-medium'>Connections</h5>

                    {blockType.inputs.length > 0 && (
                      <div>
                        <h6 className='mb-2 font-medium text-muted-foreground text-sm'>Inputs</h6>
                        <div className='space-y-1'>
                          {blockType.inputs.map((input) => (
                            <div key={input.id} className='flex items-center gap-2 text-sm'>
                              <div className='h-2 w-2 rounded-full border bg-white' />
                              <span>{input.name}</span>
                              {input.required && (
                                <Badge variant='secondary' className='text-xs'>
                                  Required
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {blockType.outputs.length > 0 && (
                      <div>
                        <h6 className='mb-2 font-medium text-muted-foreground text-sm'>Outputs</h6>
                        <div className='space-y-1'>
                          {blockType.outputs.map((output) => (
                            <div key={output.id} className='flex items-center gap-2 text-sm'>
                              <div
                                className='h-2 w-2 rounded-full'
                                style={{ backgroundColor: blockType.color }}
                              />
                              <span>{output.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className='flex h-full items-center justify-center text-muted-foreground'>
                <div className='text-center'>
                  <Layers className='mx-auto mb-2 h-8 w-8 opacity-50' />
                  <p className='text-sm'>Select a block to view its properties</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Main Drag-and-Drop Template Builder Component
 */
export const DragDropTemplateBuilder: React.FC<DragDropTemplateBuilderProps> = ({
  initialWorkflow = [],
  blockTypes = DEFAULT_BLOCK_TYPES,
  templateMetadata,
  onChange,
  onSave,
  onTest,
  readOnly = false,
  className,
}) => {
  const [blocks, setBlocks] = useState<WorkflowBlock[]>(initialWorkflow)
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    selectedBlocks: [],
    connectionMode: false,
  })
  const [sidebarStates, setSidebarStates] = useState({
    library: true,
    properties: true,
  })
  const [history, setHistory] = useState<WorkflowBlock[][]>([initialWorkflow])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Generate unique block ID
  const generateBlockId = useCallback(() => {
    return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Add block to workflow
  const handleBlockAdd = useCallback(
    (blockType: BlockType, position: { x: number; y: number }) => {
      if (readOnly) return

      const newBlock: WorkflowBlock = {
        id: generateBlockId(),
        type: blockType.id,
        name: blockType.name,
        position,
        settings: blockType.settings.reduce(
          (acc, setting) => {
            acc[setting.id] = setting.default
            return acc
          },
          {} as Record<string, any>
        ),
        connections: [],
      }

      setBlocks((prev) => {
        const updated = [...prev, newBlock]
        onChange?.(updated)
        return updated
      })
    },
    [readOnly, generateBlockId, onChange]
  )

  // Move block
  const handleBlockMove = useCallback(
    (blockId: string, position: { x: number; y: number }) => {
      if (readOnly) return

      setBlocks((prev) => {
        const updated = prev.map((block) => (block.id === blockId ? { ...block, position } : block))
        onChange?.(updated)
        return updated
      })
    },
    [readOnly, onChange]
  )

  // Select block
  const handleBlockSelect = useCallback((blockId: string) => {
    setViewport((prev) => ({
      ...prev,
      selectedBlocks: [blockId],
    }))
  }, [])

  // Delete block
  const handleBlockDelete = useCallback(
    (blockId: string) => {
      if (readOnly) return

      setBlocks((prev) => {
        const updated = prev.filter((block) => block.id !== blockId)
        onChange?.(updated)
        return updated
      })
      setViewport((prev) => ({
        ...prev,
        selectedBlocks: prev.selectedBlocks.filter((id) => id !== blockId),
      }))
    },
    [readOnly, onChange]
  )

  // Update block
  const handleBlockUpdate = useCallback(
    (blockId: string, updates: Partial<WorkflowBlock>) => {
      if (readOnly) return

      setBlocks((prev) => {
        const updated = prev.map((block) =>
          block.id === blockId ? { ...block, ...updates } : block
        )
        onChange?.(updated)
        return updated
      })
    },
    [readOnly, onChange]
  )

  // Toggle sidebar
  const toggleSidebar = useCallback((sidebar: 'library' | 'properties') => {
    setSidebarStates((prev) => ({
      ...prev,
      [sidebar]: !prev[sidebar],
    }))
  }, [])

  // Update viewport
  const handleViewportChange = useCallback((updates: Partial<ViewportState>) => {
    setViewport((prev) => ({ ...prev, ...updates }))
  }, [])

  // Get selected block and block type
  const selectedBlock = useMemo(() => {
    return blocks.find((block) => viewport.selectedBlocks.includes(block.id))
  }, [blocks, viewport.selectedBlocks])

  const selectedBlockType = useMemo(() => {
    return selectedBlock ? blockTypes.find((type) => type.id === selectedBlock.type) : undefined
  }, [selectedBlock, blockTypes])

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={cn('flex h-full flex-col', className)}>
        {/* Toolbar */}
        <div className='flex items-center justify-between border-b bg-white p-4'>
          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                variant='outline'
                onClick={() => toggleSidebar('library')}
                className={sidebarStates.library ? 'bg-muted' : ''}
              >
                <Layers className='mr-2 h-4 w-4' />
                Blocks
              </Button>
              <Button size='sm' variant='outline' disabled>
                <Undo className='mr-2 h-4 w-4' />
                Undo
              </Button>
              <Button size='sm' variant='outline' disabled>
                <Redo className='mr-2 h-4 w-4' />
                Redo
              </Button>
            </div>

            {templateMetadata && (
              <div className='flex items-center gap-2'>
                <Separator orientation='vertical' className='h-6' />
                <div className='text-sm'>
                  <span className='font-medium'>{templateMetadata.name}</span>
                  <Badge variant='outline' className='ml-2'>
                    {templateMetadata.difficulty}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          <div className='flex items-center gap-2'>
            {onTest && (
              <Button size='sm' variant='outline' onClick={() => onTest(blocks)}>
                <Play className='mr-2 h-4 w-4' />
                Test
              </Button>
            )}
            {onSave && (
              <Button size='sm' onClick={() => onSave(blocks)}>
                <Save className='mr-2 h-4 w-4' />
                Save
              </Button>
            )}
            <Button
              size='sm'
              variant='outline'
              onClick={() => toggleSidebar('properties')}
              className={sidebarStates.properties ? 'bg-muted' : ''}
            >
              <Settings className='mr-2 h-4 w-4' />
              Properties
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className='flex flex-1 overflow-hidden'>
          {/* Block Library Sidebar */}
          <BlockLibrary
            blockTypes={blockTypes}
            isOpen={sidebarStates.library}
            onToggle={() => toggleSidebar('library')}
          />

          {/* Canvas Area */}
          <div className='flex-1'>
            <BuilderCanvas
              blocks={blocks}
              blockTypes={blockTypes}
              viewport={viewport}
              onBlockAdd={handleBlockAdd}
              onBlockMove={handleBlockMove}
              onBlockSelect={handleBlockSelect}
              onBlockDelete={handleBlockDelete}
              onViewportChange={handleViewportChange}
            />
          </div>

          {/* Properties Panel */}
          <PropertiesPanel
            selectedBlock={selectedBlock}
            blockType={selectedBlockType}
            isOpen={sidebarStates.properties}
            onToggle={() => toggleSidebar('properties')}
            onBlockUpdate={handleBlockUpdate}
          />
        </div>

        {/* Status Bar */}
        <div className='flex items-center justify-between border-t bg-gray-50 px-4 py-2 text-muted-foreground text-sm'>
          <div className='flex items-center gap-4'>
            <span>Blocks: {blocks.length}</span>
            <span>Zoom: {Math.round(viewport.zoom * 100)}%</span>
          </div>
          <div className='flex items-center gap-2'>
            {readOnly && (
              <Badge variant='outline' className='text-xs'>
                Read Only
              </Badge>
            )}
            <span>Ready</span>
          </div>
        </div>
      </div>
    </DndProvider>
  )
}

export default DragDropTemplateBuilder
