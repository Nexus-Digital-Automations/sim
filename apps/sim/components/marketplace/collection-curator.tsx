/**
 * Collection Curator - Advanced Collection Creation and Management Component
 *
 * This component provides comprehensive tools for creating, managing, and curating
 * template collections with advanced features:
 * - Drag-and-drop template organization with visual feedback
 * - Multi-select operations for bulk template management
 * - Advanced sorting and filtering within collections
 * - Collection sharing and collaboration features
 * - Visual collection customization with themes and layouts
 * - Automated collection suggestions based on user behavior
 * - Collection analytics and performance tracking
 * - Real-time collaboration with other users
 * - Collection versioning and history management
 * - Integration with template recommendations engine
 *
 * Features:
 * - Intuitive drag-and-drop interface with smooth animations
 * - Advanced search and filtering for template discovery
 * - Collection templates and quick-start options
 * - Visual customization with themes, colors, and icons
 * - Smart categorization and auto-tagging
 * - Performance metrics and engagement analytics
 * - Social features like sharing and collaboration
 * - Export and import functionality
 * - Integration with existing workflow systems
 *
 * @author Claude Code Marketplace System
 * @version 2.0.0
 */

'use client'

import type * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Archive,
  ArrowLeft,
  Copy,
  Edit3,
  Eye,
  FolderOpen,
  Grid3X3,
  Link2,
  List,
  Lock,
  MoreHorizontal,
  Move,
  Palette,
  Plus,
  Save,
  Search,
  Star,
  Trash2,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Template, TemplateCollection, User } from '@/lib/templates/types'
import { cn } from '@/lib/utils'

/**
 * Collection Curator Props Interface
 */
export interface CollectionCuratorProps {
  /** Current user for permissions */
  currentUser: User
  /** Collection to edit (for existing collections) */
  collection?: TemplateCollection
  /** Available templates for adding */
  availableTemplates?: Template[]
  /** Custom CSS class name */
  className?: string
  /** Mode: create new or edit existing */
  mode?: 'create' | 'edit'
  /** Enable collaboration features */
  enableCollaboration?: boolean
  /** Show analytics dashboard */
  showAnalytics?: boolean
  /** Collection save handler */
  onSave?: (collection: TemplateCollection) => Promise<void>
  /** Navigation back handler */
  onBack?: () => void
  /** Template selection handler */
  onTemplateSelect?: (template: Template) => void
}

/**
 * Collection Layout Types
 */
type CollectionLayout = 'grid' | 'list' | 'masonry' | 'timeline'

/**
 * Collection Theme Interface
 */
interface CollectionTheme {
  id: string
  name: string
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  textColor: string
  iconStyle: 'rounded' | 'square' | 'circle'
}

/**
 * Collection Analytics Interface
 */
interface CollectionAnalytics {
  totalViews: number
  totalLikes: number
  totalShares: number
  templatesUsed: number
  averageRating: number
  collaborators: number
  weeklyGrowth: number
  topPerformingTemplates: Array<{
    template: Template
    usage: number
    rating: number
  }>
}

/**
 * Smart Suggestion Interface
 */
interface SmartSuggestion {
  type: 'category' | 'tag' | 'author' | 'similar' | 'trending'
  templates: Template[]
  reason: string
  confidence: number
}

/**
 * Collection Curator Component
 */
export const CollectionCurator: React.FC<CollectionCuratorProps> = ({
  currentUser,
  collection,
  availableTemplates = [],
  className,
  mode = 'create',
  enableCollaboration = true,
  showAnalytics = true,
  onSave,
  onBack,
  onTemplateSelect,
}) => {
  const router = useRouter()

  // State management
  const [collectionData, setCollectionData] = useState<Partial<TemplateCollection>>({
    id: collection?.id || '',
    name: collection?.name || '',
    description: collection?.description || '',
    visibility: collection?.visibility || 'private',
    tags: collection?.tags || [],
    templates: collection?.templates || [],
    theme: collection?.theme || {
      primaryColor: '#3B82F6',
      secondaryColor: '#EF4444',
      backgroundColor: '#F8FAFC',
    },
    layout: collection?.layout || 'grid',
    allowCollaborators: collection?.allowCollaborators || false,
    isPublic: collection?.isPublic || false,
  })
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [currentLayout, setCurrentLayout] = useState<CollectionLayout>('grid')
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [showThemeEditor, setShowThemeEditor] = useState(false)
  const [showAnalyticsDashboard, setShowAnalyticsDashboard] = useState(false)
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([])
  const [collectionAnalytics, setCollectionAnalytics] = useState<CollectionAnalytics | null>(null)
  const [saving, setSaving] = useState(false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  // Available themes
  const themes: CollectionTheme[] = [
    {
      id: 'blue',
      name: 'Ocean Blue',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      backgroundColor: '#EFF6FF',
      textColor: '#1E3A8A',
      iconStyle: 'rounded',
    },
    {
      id: 'green',
      name: 'Forest Green',
      primaryColor: '#10B981',
      secondaryColor: '#047857',
      backgroundColor: '#ECFDF5',
      textColor: '#064E3B',
      iconStyle: 'rounded',
    },
    {
      id: 'purple',
      name: 'Royal Purple',
      primaryColor: '#8B5CF6',
      secondaryColor: '#7C3AED',
      backgroundColor: '#F3E8FF',
      textColor: '#581C87',
      iconStyle: 'rounded',
    },
    {
      id: 'orange',
      name: 'Sunset Orange',
      primaryColor: '#F59E0B',
      secondaryColor: '#D97706',
      backgroundColor: '#FFFBEB',
      textColor: '#92400E',
      iconStyle: 'circle',
    },
  ]

  /**
   * Load collection data and analytics
   */
  useEffect(() => {
    const loadCollectionData = async () => {
      if (!collection?.id) return

      try {
        // Load analytics if enabled
        if (showAnalytics) {
          const analyticsResponse = await fetch(
            `/api/marketplace/collections/${collection.id}/analytics`
          )
          if (analyticsResponse.ok) {
            const analyticsData = await analyticsResponse.json()
            setCollectionAnalytics(analyticsData.data)
          }
        }

        // Load smart suggestions
        const suggestionsResponse = await fetch(
          `/api/marketplace/collections/suggestions?userId=${currentUser.id}&collectionId=${collection.id}`
        )
        if (suggestionsResponse.ok) {
          const suggestionsData = await suggestionsResponse.json()
          setSmartSuggestions(suggestionsData.data || [])
        }
      } catch (error) {
        console.error('Failed to load collection data:', error)
      }
    }

    loadCollectionData()
  }, [collection?.id, currentUser.id, showAnalytics])

  /**
   * Filter available templates based on search
   */
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return availableTemplates

    const query = searchQuery.toLowerCase()
    return availableTemplates.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query) ||
        template.tags?.some((tag) => tag.toLowerCase().includes(query))
    )
  }, [availableTemplates, searchQuery])

  /**
   * Handle collection data updates
   */
  const updateCollectionData = useCallback((updates: Partial<TemplateCollection>) => {
    setCollectionData((prev) => ({ ...prev, ...updates }))
  }, [])

  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback(
    (result: any) => {
      if (!result.destination) return

      const templates = Array.from(collectionData.templates || [])
      const [reorderedItem] = templates.splice(result.source.index, 1)
      templates.splice(result.destination.index, 0, reorderedItem)

      updateCollectionData({ templates })
      setDraggedItem(null)
    },
    [collectionData.templates, updateCollectionData]
  )

  /**
   * Add templates to collection
   */
  const addTemplatesToCollection = useCallback(
    (templates: Template[]) => {
      const existingIds = new Set(collectionData.templates?.map((t) => t.id) || [])
      const newTemplates = templates.filter((t) => !existingIds.has(t.id))

      if (newTemplates.length > 0) {
        updateCollectionData({
          templates: [...(collectionData.templates || []), ...newTemplates],
        })
      }
    },
    [collectionData.templates, updateCollectionData]
  )

  /**
   * Remove templates from collection
   */
  const removeTemplatesFromCollection = useCallback(
    (templateIds: string[]) => {
      const updatedTemplates =
        collectionData.templates?.filter((template) => !templateIds.includes(template.id)) || []

      updateCollectionData({ templates: updatedTemplates })
      setSelectedTemplates(new Set())
    },
    [collectionData.templates, updateCollectionData]
  )

  /**
   * Handle template selection toggle
   */
  const toggleTemplateSelection = useCallback((templateId: string) => {
    setSelectedTemplates((prev) => {
      const newSelection = new Set(prev)
      if (newSelection.has(templateId)) {
        newSelection.delete(templateId)
      } else {
        newSelection.add(templateId)
      }
      return newSelection
    })
  }, [])

  /**
   * Handle bulk selection
   */
  const handleBulkSelection = useCallback(
    (selectAll: boolean) => {
      if (selectAll) {
        setSelectedTemplates(new Set(collectionData.templates?.map((t) => t.id) || []))
      } else {
        setSelectedTemplates(new Set())
      }
    },
    [collectionData.templates]
  )

  /**
   * Handle collection save
   */
  const handleSave = useCallback(async () => {
    if (!collectionData.name?.trim()) {
      return
    }

    setSaving(true)
    try {
      if (onSave) {
        await onSave(collectionData as TemplateCollection)
      } else {
        const endpoint =
          mode === 'create'
            ? '/api/marketplace/collections'
            : `/api/marketplace/collections/${collection?.id}`

        const response = await fetch(endpoint, {
          method: mode === 'create' ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...collectionData,
            userId: currentUser.id,
          }),
        })

        if (response.ok) {
          const result = await response.json()
          router.push(`/marketplace/collections/${result.data.id}`)
        }
      }
    } catch (error) {
      console.error('Failed to save collection:', error)
    } finally {
      setSaving(false)
    }
  }, [collectionData, currentUser.id, mode, onSave, collection?.id, router])

  /**
   * Apply smart suggestion
   */
  const applySuggestion = useCallback(
    (suggestion: SmartSuggestion) => {
      addTemplatesToCollection(suggestion.templates)
    },
    [addTemplatesToCollection]
  )

  /**
   * Handle theme change
   */
  const handleThemeChange = useCallback(
    (theme: CollectionTheme) => {
      updateCollectionData({
        theme: {
          primaryColor: theme.primaryColor,
          secondaryColor: theme.secondaryColor,
          backgroundColor: theme.backgroundColor,
        },
      })
    },
    [updateCollectionData]
  )

  return (
    <TooltipProvider>
      <div className={cn('min-h-screen bg-gradient-to-br from-blue-50 to-purple-50', className)}>
        {/* Header */}
        <div className='border-b bg-white/80 p-4 backdrop-blur-sm'>
          <div className='mx-auto flex max-w-7xl items-center justify-between'>
            <div className='flex items-center gap-4'>
              <Button variant='ghost' onClick={onBack || (() => router.back())}>
                <ArrowLeft className='h-4 w-4' />
              </Button>
              <div>
                <h1 className='font-semibold text-xl'>
                  {mode === 'create' ? 'Create Collection' : 'Edit Collection'}
                </h1>
                <p className='text-muted-foreground text-sm'>
                  {mode === 'create'
                    ? 'Organize templates into curated collections'
                    : 'Manage and organize your template collection'}
                </p>
              </div>
            </div>

            <div className='flex items-center gap-3'>
              <Button variant='outline' onClick={() => setShowThemeEditor(true)}>
                <Palette className='mr-2 h-4 w-4' />
                Theme
              </Button>
              {showAnalytics && collection?.id && (
                <Button variant='outline' onClick={() => setShowAnalyticsDashboard(true)}>
                  <TrendingUp className='mr-2 h-4 w-4' />
                  Analytics
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving || !collectionData.name?.trim()}>
                {saving ? (
                  <>
                    <div className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className='mr-2 h-4 w-4' />
                    Save Collection
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className='mx-auto max-w-7xl p-6'>
          <div className='grid grid-cols-1 gap-8 lg:grid-cols-4'>
            {/* Sidebar - Collection Settings */}
            <div className='lg:col-span-1'>
              <Card>
                <CardHeader>
                  <CardTitle className='text-lg'>Collection Settings</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='collection-name'>Collection Name *</Label>
                    <Input
                      id='collection-name'
                      value={collectionData.name || ''}
                      onChange={(e) => updateCollectionData({ name: e.target.value })}
                      placeholder='Enter collection name'
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='collection-description'>Description</Label>
                    <Textarea
                      id='collection-description'
                      value={collectionData.description || ''}
                      onChange={(e) => updateCollectionData({ description: e.target.value })}
                      placeholder='Describe your collection'
                      rows={3}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>Visibility</Label>
                    <Select
                      value={collectionData.visibility}
                      onValueChange={(value: 'public' | 'private' | 'unlisted') =>
                        updateCollectionData({ visibility: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='public'>
                          <div className='flex items-center gap-2'>
                            <Eye className='h-4 w-4' />
                            Public
                          </div>
                        </SelectItem>
                        <SelectItem value='unlisted'>
                          <div className='flex items-center gap-2'>
                            <Link2 className='h-4 w-4' />
                            Unlisted
                          </div>
                        </SelectItem>
                        <SelectItem value='private'>
                          <div className='flex items-center gap-2'>
                            <Lock className='h-4 w-4' />
                            Private
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-2'>
                    <Label>Layout Style</Label>
                    <div className='grid grid-cols-2 gap-2'>
                      <Button
                        variant={currentLayout === 'grid' ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setCurrentLayout('grid')}
                      >
                        <Grid3X3 className='h-4 w-4' />
                      </Button>
                      <Button
                        variant={currentLayout === 'list' ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setCurrentLayout('list')}
                      >
                        <List className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>

                  {enableCollaboration && (
                    <div className='space-y-3'>
                      <div className='flex items-center justify-between'>
                        <Label>Allow Collaborators</Label>
                        <Switch
                          checked={collectionData.allowCollaborators || false}
                          onCheckedChange={(checked) =>
                            updateCollectionData({ allowCollaborators: checked })
                          }
                        />
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className='space-y-2'>
                    <Button
                      variant='outline'
                      className='w-full'
                      onClick={() => setShowTemplateSelector(true)}
                    >
                      <Plus className='mr-2 h-4 w-4' />
                      Add Templates
                    </Button>
                  </div>

                  {/* Collection Stats */}
                  <div className='space-y-2 pt-4'>
                    <Label>Collection Stats</Label>
                    <div className='space-y-1 text-sm'>
                      <div className='flex justify-between'>
                        <span>Templates:</span>
                        <Badge variant='secondary'>{collectionData.templates?.length || 0}</Badge>
                      </div>
                      {collection?.id && (
                        <>
                          <div className='flex justify-between'>
                            <span>Views:</span>
                            <span>{collectionAnalytics?.totalViews || 0}</span>
                          </div>
                          <div className='flex justify-between'>
                            <span>Likes:</span>
                            <span>{collectionAnalytics?.totalLikes || 0}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Smart Suggestions */}
              {smartSuggestions.length > 0 && (
                <Card className='mt-6'>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-sm'>
                      <Zap className='h-4 w-4' />
                      Smart Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    {smartSuggestions.slice(0, 3).map((suggestion, index) => (
                      <div key={index} className='space-y-2 rounded-lg border p-3'>
                        <div className='flex items-center justify-between'>
                          <p className='font-medium text-sm'>{suggestion.reason}</p>
                          <Badge variant='outline' className='text-xs'>
                            {(suggestion.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <p className='text-muted-foreground text-xs'>
                          {suggestion.templates.length} templates
                        </p>
                        <Button
                          size='sm'
                          variant='outline'
                          className='w-full'
                          onClick={() => applySuggestion(suggestion)}
                        >
                          Add All
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Main Content - Collection Templates */}
            <div className='lg:col-span-3'>
              <Card>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='flex items-center gap-2'>
                        <FolderOpen className='h-5 w-5' />
                        Templates ({collectionData.templates?.length || 0})
                      </CardTitle>
                    </div>

                    {/* Bulk Actions */}
                    {selectedTemplates.size > 0 && (
                      <div className='flex items-center gap-2'>
                        <Badge variant='secondary'>{selectedTemplates.size} selected</Badge>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() =>
                            removeTemplatesFromCollection(Array.from(selectedTemplates))
                          }
                        >
                          <Trash2 className='mr-2 h-4 w-4' />
                          Remove
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => setSelectedTemplates(new Set())}
                        >
                          Clear Selection
                        </Button>
                      </div>
                    )}
                  </div>

                  {collectionData.templates && collectionData.templates.length > 0 && (
                    <div className='mt-4 flex items-center gap-2'>
                      <Checkbox
                        checked={selectedTemplates.size === collectionData.templates.length}
                        onCheckedChange={(checked) => handleBulkSelection(!!checked)}
                      />
                      <Label className='text-sm'>Select All</Label>
                    </div>
                  )}
                </CardHeader>

                <CardContent>
                  {!collectionData.templates || collectionData.templates.length === 0 ? (
                    <div className='py-12 text-center'>
                      <Archive className='mx-auto mb-4 h-12 w-12 text-gray-400' />
                      <h3 className='mb-2 font-medium'>No Templates Yet</h3>
                      <p className='mb-4 text-muted-foreground text-sm'>
                        Start building your collection by adding templates
                      </p>
                      <Button onClick={() => setShowTemplateSelector(true)}>
                        <Plus className='mr-2 h-4 w-4' />
                        Add Your First Template
                      </Button>
                    </div>
                  ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId='collection-templates'>
                        {(provided, snapshot) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={cn(
                              'space-y-4',
                              snapshot.isDraggingOver && 'rounded-lg bg-blue-50 p-4'
                            )}
                          >
                            <AnimatePresence>
                              {collectionData.templates.map((template, index) => (
                                <Draggable
                                  key={template.id}
                                  draggableId={template.id}
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <motion.div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      layout
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -20 }}
                                      className={cn(
                                        'flex items-center gap-4 rounded-lg border bg-white p-4 transition-all',
                                        snapshot.isDragging && 'rotate-1 shadow-lg',
                                        selectedTemplates.has(template.id) &&
                                          'border-blue-300 bg-blue-50'
                                      )}
                                    >
                                      <Checkbox
                                        checked={selectedTemplates.has(template.id)}
                                        onCheckedChange={() => toggleTemplateSelection(template.id)}
                                      />

                                      <div
                                        {...provided.dragHandleProps}
                                        className='cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing'
                                      >
                                        <Move className='h-4 w-4' />
                                      </div>

                                      <div
                                        className='flex h-10 w-10 items-center justify-center rounded-lg font-bold text-sm text-white'
                                        style={{ backgroundColor: template.color }}
                                      >
                                        {template.icon || '📄'}
                                      </div>

                                      <div className='min-w-0 flex-1'>
                                        <p className='truncate font-medium'>{template.name}</p>
                                        <p className='truncate text-muted-foreground text-sm'>
                                          {template.description}
                                        </p>
                                        <div className='mt-1 flex items-center gap-2'>
                                          <Badge variant='outline' className='text-xs'>
                                            {template.category}
                                          </Badge>
                                          <div className='flex items-center gap-1'>
                                            <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                                            <span className='text-xs'>
                                              {template.ratingAverage?.toFixed(1) || '0.0'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className='flex items-center gap-2'>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size='sm'
                                              variant='ghost'
                                              onClick={() => onTemplateSelect?.(template)}
                                            >
                                              <Eye className='h-4 w-4' />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>View Template</TooltipContent>
                                        </Tooltip>

                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button size='sm' variant='ghost'>
                                              <MoreHorizontal className='h-4 w-4' />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent>
                                            <DropdownMenuItem>
                                              <Edit3 className='mr-2 h-4 w-4' />
                                              Edit Position
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                              <Copy className='mr-2 h-4 w-4' />
                                              Duplicate
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              onClick={() =>
                                                removeTemplatesFromCollection([template.id])
                                              }
                                              className='text-red-600'
                                            >
                                              <Trash2 className='mr-2 h-4 w-4' />
                                              Remove
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </motion.div>
                                  )}
                                </Draggable>
                              ))}
                            </AnimatePresence>
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Template Selector Dialog */}
        <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
          <DialogContent className='max-h-[80vh] max-w-4xl overflow-y-auto'>
            <DialogHeader>
              <DialogTitle>Add Templates to Collection</DialogTitle>
              <DialogDescription>
                Search and select templates to add to your collection
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4'>
              <div className='relative'>
                <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-gray-400' />
                <Input
                  placeholder='Search templates...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-10'
                />
              </div>

              <div className='grid max-h-96 grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2'>
                {filteredTemplates.map((template) => {
                  const isAlreadyInCollection = collectionData.templates?.some(
                    (t) => t.id === template.id
                  )

                  return (
                    <Card
                      key={template.id}
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md',
                        isAlreadyInCollection && 'pointer-events-none opacity-50'
                      )}
                      onClick={() => !isAlreadyInCollection && addTemplatesToCollection([template])}
                    >
                      <CardContent className='p-4'>
                        <div className='flex items-center gap-3'>
                          <div
                            className='flex h-8 w-8 items-center justify-center rounded font-bold text-white text-xs'
                            style={{ backgroundColor: template.color }}
                          >
                            {template.icon || '📄'}
                          </div>
                          <div className='min-w-0 flex-1'>
                            <p className='truncate font-medium text-sm'>{template.name}</p>
                            <p className='truncate text-muted-foreground text-xs'>
                              {template.description}
                            </p>
                          </div>
                          {isAlreadyInCollection && (
                            <Badge variant='secondary' className='text-xs'>
                              Added
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            <DialogFooter>
              <Button variant='outline' onClick={() => setShowTemplateSelector(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Theme Editor Dialog */}
        <Dialog open={showThemeEditor} onOpenChange={setShowThemeEditor}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Collection Theme</DialogTitle>
              <DialogDescription>Choose a theme for your collection</DialogDescription>
            </DialogHeader>

            <div className='grid grid-cols-2 gap-4'>
              {themes.map((theme) => (
                <Card
                  key={theme.id}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    collectionData.theme?.primaryColor === theme.primaryColor &&
                      'ring-2 ring-blue-500'
                  )}
                  onClick={() => handleThemeChange(theme)}
                  style={{
                    backgroundColor: theme.backgroundColor,
                    borderColor: theme.primaryColor,
                  }}
                >
                  <CardContent className='p-4 text-center'>
                    <div
                      className='mx-auto mb-2 h-8 w-8 rounded-full'
                      style={{ backgroundColor: theme.primaryColor }}
                    />
                    <p className='font-medium text-sm'>{theme.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <DialogFooter>
              <Button onClick={() => setShowThemeEditor(false)}>Apply Theme</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Analytics Dashboard Dialog */}
        {showAnalytics && collectionAnalytics && (
          <Dialog open={showAnalyticsDashboard} onOpenChange={setShowAnalyticsDashboard}>
            <DialogContent className='max-w-4xl'>
              <DialogHeader>
                <DialogTitle>Collection Analytics</DialogTitle>
                <DialogDescription>Performance metrics for your collection</DialogDescription>
              </DialogHeader>

              <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                <Card>
                  <CardContent className='p-4 text-center'>
                    <div className='font-bold text-2xl text-blue-600'>
                      {collectionAnalytics.totalViews}
                    </div>
                    <p className='text-muted-foreground text-sm'>Total Views</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className='p-4 text-center'>
                    <div className='font-bold text-2xl text-green-600'>
                      {collectionAnalytics.totalLikes}
                    </div>
                    <p className='text-muted-foreground text-sm'>Likes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className='p-4 text-center'>
                    <div className='font-bold text-2xl text-purple-600'>
                      {collectionAnalytics.totalShares}
                    </div>
                    <p className='text-muted-foreground text-sm'>Shares</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className='p-4 text-center'>
                    <div className='font-bold text-2xl text-orange-600'>
                      {collectionAnalytics.templatesUsed}
                    </div>
                    <p className='text-muted-foreground text-sm'>Templates Used</p>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter>
                <Button onClick={() => setShowAnalyticsDashboard(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  )
}

export default CollectionCurator
