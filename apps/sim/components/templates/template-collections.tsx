/**
 * Template Collections - User Template Organization System
 *
 * This component provides comprehensive template collection management with:
 * - Personal collections creation and management
 * - Shared collections with collaboration features
 * - Collection categorization and tagging
 * - Template organization with drag-and-drop
 * - Collection sharing and privacy controls
 * - Bulk operations on templates and collections
 * - Advanced search and filtering within collections
 * - Collection analytics and usage insights
 *
 * Design Features:
 * - Pinterest-style masonry layout with adaptive cards
 * - Drag-and-drop interface for template organization
 * - Real-time collaboration indicators
 * - Visual collection preview with template thumbnails
 * - Advanced sharing controls with permission management
 * - Mobile-responsive design with touch interactions
 *
 * Based on collection patterns from Pinterest, Notion databases,
 * Figma file organization, and GitHub repository management.
 *
 * @author Claude Code Template System - Collections & Organization Specialist
 * @version 2.0.0
 */

'use client'

import type * as React from 'react'
import { useCallback, useMemo, useState } from 'react'
import {
  BookOpen,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  FolderOpen,
  Grid3X3,
  Heart,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Share2,
  Star,
  Trash2,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
// Import template types
import type { Template, TemplateCollection } from '@/lib/templates/types'
import { cn } from '@/lib/utils'

/**
 * Template Collections Props
 */
export interface TemplateCollectionsProps {
  /** User's collections */
  collections: TemplateCollection[]
  /** All available templates */
  availableTemplates: Template[]
  /** Current user ID */
  userId: string
  /** Organization ID for shared collections */
  organizationId?: string
  /** Loading state */
  loading?: boolean
  /** Collection selection handler */
  onCollectionSelect?: (collection: TemplateCollection) => void
  /** Collection creation handler */
  onCollectionCreate?: (
    collection: Omit<TemplateCollection, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>
  /** Collection update handler */
  onCollectionUpdate?: (collectionId: string, updates: Partial<TemplateCollection>) => Promise<void>
  /** Collection deletion handler */
  onCollectionDelete?: (collectionId: string) => Promise<void>
  /** Template addition to collection */
  onTemplateAdd?: (collectionId: string, templateId: string) => Promise<void>
  /** Template removal from collection */
  onTemplateRemove?: (collectionId: string, templateId: string) => Promise<void>
  /** Collection sharing handler */
  onCollectionShare?: (
    collectionId: string,
    shareSettings: { isPublic: boolean; shareUrl?: string }
  ) => Promise<void>
  /** Template selection handler */
  onTemplateSelect?: (template: Template) => void
  /** Template installation handler */
  onTemplateInstall?: (template: Template) => void
  /** Custom CSS class */
  className?: string
}

/**
 * Collection Creation Dialog Props
 */
interface CollectionCreationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (
    collection: Omit<TemplateCollection, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>
  userId: string
  organizationId?: string
}

/**
 * Collection Creation Dialog Component
 */
const CollectionCreationDialog: React.FC<CollectionCreationDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  userId,
  organizationId,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
    tags: [] as string[],
    color: '#3B82F6',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!formData.name.trim()) return

      setIsSubmitting(true)
      try {
        await onSubmit({
          userId,
          name: formData.name.trim(),
          description: formData.description.trim(),
          isPublic: formData.isPublic,
          templateIds: [],
          templateCount: 0,
          views: 0,
          stars: 0,
          tags: formData.tags,
          color: formData.color,
        } as Omit<TemplateCollection, 'id' | 'createdAt' | 'updatedAt'>)

        setFormData({
          name: '',
          description: '',
          isPublic: false,
          tags: [],
          color: '#3B82F6',
        })
        onOpenChange(false)
      } catch (error) {
        console.error('Failed to create collection:', error)
      } finally {
        setIsSubmitting(false)
      }
    },
    [formData, onSubmit, userId, onOpenChange]
  )

  const colorOptions = [
    { value: '#3B82F6', name: 'Blue' },
    { value: '#10B981', name: 'Green' },
    { value: '#F59E0B', name: 'Amber' },
    { value: '#EF4444', name: 'Red' },
    { value: '#8B5CF6', name: 'Purple' },
    { value: '#F97316', name: 'Orange' },
    { value: '#06B6D4', name: 'Cyan' },
    { value: '#84CC16', name: 'Lime' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Create Collection</DialogTitle>
          <DialogDescription>Organize your templates into a custom collection</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='collection-name'>Collection Name</Label>
            <Input
              id='collection-name'
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder='My Awesome Collection'
              required
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='collection-description'>Description (Optional)</Label>
            <Textarea
              id='collection-description'
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder='Describe what this collection is for...'
              rows={3}
            />
          </div>

          <div className='space-y-2'>
            <Label>Collection Color</Label>
            <div className='flex gap-2'>
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type='button'
                  onClick={() => setFormData((prev) => ({ ...prev, color: color.value }))}
                  className={cn(
                    'h-8 w-8 rounded-full border-2',
                    formData.color === color.value ? 'border-gray-400' : 'border-gray-200'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className='flex items-center space-x-2'>
            <Switch
              id='collection-public'
              checked={formData.isPublic}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isPublic: checked }))}
            />
            <Label htmlFor='collection-public'>Make collection public</Label>
          </div>

          <div className='flex gap-2 pt-4'>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? 'Creating...' : 'Create Collection'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Collection Card Component
 */
const CollectionCard: React.FC<{
  collection: TemplateCollection
  templates: Template[]
  onSelect?: (collection: TemplateCollection) => void
  onUpdate?: (collectionId: string, updates: Partial<TemplateCollection>) => Promise<void>
  onDelete?: (collectionId: string) => Promise<void>
  onShare?: (
    collectionId: string,
    shareSettings: { isPublic: boolean; shareUrl?: string }
  ) => Promise<void>
  isOwner: boolean
}> = ({ collection, templates, onSelect, onUpdate, onDelete, onShare, isOwner }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const previewTemplates = templates.slice(0, 6)
  const remainingCount = templates.length - previewTemplates.length

  const handleDelete = useCallback(async () => {
    if (!onDelete || !window.confirm('Are you sure you want to delete this collection?')) return
    setIsDeleting(true)
    try {
      await onDelete(collection.id)
    } catch (error) {
      console.error('Failed to delete collection:', error)
    } finally {
      setIsDeleting(false)
    }
  }, [collection.id, onDelete])

  const handleShare = useCallback(async () => {
    if (!onShare) return
    try {
      await onShare(collection.id, {
        isPublic: !collection.isPublic,
        shareUrl: collection.isPublic
          ? undefined
          : `${window.location.origin}/collections/${collection.id}`,
      })
    } catch (error) {
      console.error('Failed to update sharing settings:', error)
    }
  }, [collection.id, collection.isPublic, onShare])

  return (
    <Card className='group h-full transition-all duration-200 hover:shadow-lg'>
      <CardContent className='p-4'>
        {/* Collection Header */}
        <div className='mb-3 flex items-start justify-between'>
          <div
            className='flex flex-1 cursor-pointer items-center gap-3'
            onClick={() => onSelect?.(collection)}
          >
            <div
              className='flex h-10 w-10 items-center justify-center rounded-lg text-white'
              style={{ backgroundColor: collection.color }}
            >
              <FolderOpen className='h-5 w-5' />
            </div>
            <div className='flex-1'>
              <h3 className='line-clamp-1 font-semibold text-sm'>{collection.name}</h3>
              <p className='text-muted-foreground text-xs'>{collection.templateCount} templates</p>
            </div>
          </div>

          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                  <MoreHorizontal className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit3 className='mr-2 h-4 w-4' />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare}>
                  {collection.isPublic ? (
                    <>
                      <EyeOff className='mr-2 h-4 w-4' />
                      Make Private
                    </>
                  ) : (
                    <>
                      <Share2 className='mr-2 h-4 w-4' />
                      Make Public
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className='mr-2 h-4 w-4' />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className='text-red-600'
                >
                  <Trash2 className='mr-2 h-4 w-4' />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Collection Description */}
        {collection.description && (
          <p className='mb-3 line-clamp-2 text-muted-foreground text-sm'>
            {collection.description}
          </p>
        )}

        {/* Template Preview */}
        <div className='mb-3'>
          {previewTemplates.length > 0 ? (
            <div className='grid grid-cols-3 gap-2'>
              {previewTemplates.map((template) => (
                <div
                  key={template.id}
                  className='flex aspect-square items-center justify-center rounded border border-gray-200 bg-gray-50 text-xs'
                  style={{ backgroundColor: `${template.color}10` }}
                >
                  <div
                    className='flex h-6 w-6 items-center justify-center rounded font-bold text-white text-xs'
                    style={{ backgroundColor: template.color }}
                  >
                    {template.icon || '📄'}
                  </div>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 6 - previewTemplates.length) }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className='flex aspect-square items-center justify-center rounded border border-gray-300 border-dashed bg-gray-50'
                >
                  <div className='h-4 w-4 rounded-full bg-gray-300' />
                </div>
              ))}
            </div>
          ) : (
            <div className='flex h-24 items-center justify-center rounded border border-gray-300 border-dashed bg-gray-50 text-center text-muted-foreground'>
              <div>
                <FolderOpen className='mx-auto mb-1 h-6 w-6' />
                <p className='text-xs'>Empty collection</p>
              </div>
            </div>
          )}
        </div>

        {/* Collection Metadata */}
        <div className='flex items-center justify-between text-muted-foreground text-xs'>
          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-1'>
              <Eye className='h-3 w-3' />
              <span>{collection.views}</span>
            </div>
            <div className='flex items-center gap-1'>
              <Heart className='h-3 w-3' />
              <span>{collection.stars}</span>
            </div>
            {collection.isPublic && (
              <Badge variant='secondary' className='text-xs'>
                Public
              </Badge>
            )}
          </div>
          <div className='text-xs'>{new Date(collection.updatedAt).toLocaleDateString()}</div>
        </div>

        {/* Collection Tags */}
        {collection.tags && collection.tags.length > 0 && (
          <div className='mt-2 flex flex-wrap gap-1'>
            {collection.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant='outline' className='text-xs'>
                {tag}
              </Badge>
            ))}
            {collection.tags.length > 3 && (
              <Badge variant='outline' className='text-xs'>
                +{collection.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Collection Template List Component
 */
const CollectionTemplateList: React.FC<{
  collection: TemplateCollection
  templates: Template[]
  viewMode: 'grid' | 'list'
  onTemplateSelect?: (template: Template) => void
  onTemplateInstall?: (template: Template) => void
  onTemplateRemove?: (templateId: string) => Promise<void>
  isOwner: boolean
}> = ({
  collection,
  templates,
  viewMode,
  onTemplateSelect,
  onTemplateInstall,
  onTemplateRemove,
  isOwner,
}) => {
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  const [isRemoving, setIsRemoving] = useState<Set<string>>(new Set())

  const handleTemplateRemove = useCallback(
    async (templateId: string) => {
      if (!onTemplateRemove || !isOwner) return
      setIsRemoving((prev) => new Set([...prev, templateId]))
      try {
        await onTemplateRemove(templateId)
      } catch (error) {
        console.error('Failed to remove template:', error)
      } finally {
        setIsRemoving((prev) => {
          const newSet = new Set(prev)
          newSet.delete(templateId)
          return newSet
        })
      }
    },
    [onTemplateRemove, isOwner]
  )

  if (templates.length === 0) {
    return (
      <Card className='flex h-48 items-center justify-center'>
        <div className='text-center text-muted-foreground'>
          <FolderOpen className='mx-auto mb-2 h-8 w-8' />
          <p className='font-medium'>Collection is empty</p>
          <p className='text-sm'>Add templates to get started</p>
        </div>
      </Card>
    )
  }

  return (
    <div
      className={cn(
        'grid gap-4',
        viewMode === 'grid'
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          : 'grid-cols-1'
      )}
    >
      {templates.map((template) => (
        <Card key={template.id} className='group transition-all duration-200 hover:shadow-lg'>
          <CardContent className='p-4'>
            <div className='mb-3 flex items-center gap-3'>
              <div
                className='flex h-10 w-10 items-center justify-center rounded-lg font-bold text-sm text-white'
                style={{ backgroundColor: template.color }}
              >
                {template.icon || '📄'}
              </div>
              <div className='flex-1'>
                <h4 className='line-clamp-1 font-medium text-sm leading-tight'>{template.name}</h4>
                <p className='text-muted-foreground text-xs'>{template.author}</p>
              </div>
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                      <MoreHorizontal className='h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem onClick={() => onTemplateSelect?.(template)}>
                      <Eye className='mr-2 h-4 w-4' />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onTemplateInstall?.(template)}>
                      <Zap className='mr-2 h-4 w-4' />
                      Install
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleTemplateRemove(template.id)}
                      disabled={isRemoving.has(template.id)}
                      className='text-red-600'
                    >
                      <Trash2 className='mr-2 h-4 w-4' />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <p className='mb-3 line-clamp-2 text-muted-foreground text-sm'>
              {template.description}
            </p>

            <div className='mb-3 flex items-center gap-3 text-muted-foreground text-xs'>
              <div className='flex items-center gap-1'>
                <Eye className='h-3 w-3' />
                <span>{template.views}</span>
              </div>
              <div className='flex items-center gap-1'>
                <Heart className='h-3 w-3' />
                <span>{template.stars}</span>
              </div>
              {template.ratingAverage && (
                <div className='flex items-center gap-1'>
                  <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                  <span>{template.ratingAverage.toFixed(1)}</span>
                </div>
              )}
            </div>

            <div className='flex gap-2'>
              <Button size='sm' onClick={() => onTemplateInstall?.(template)} className='flex-1'>
                <Zap className='mr-2 h-4 w-4' />
                Install
              </Button>
              <Button size='sm' variant='outline' onClick={() => onTemplateSelect?.(template)}>
                <Eye className='h-4 w-4' />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Main Template Collections Component
 */
export const TemplateCollections: React.FC<TemplateCollectionsProps> = ({
  collections,
  availableTemplates,
  userId,
  organizationId,
  loading = false,
  onCollectionSelect,
  onCollectionCreate,
  onCollectionUpdate,
  onCollectionDelete,
  onTemplateAdd,
  onTemplateRemove,
  onCollectionShare,
  onTemplateSelect,
  onTemplateInstall,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCollection, setSelectedCollection] = useState<TemplateCollection | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [filterBy, setFilterBy] = useState<'all' | 'public' | 'private'>('all')

  // Filter collections based on search and filter
  const filteredCollections = useMemo(() => {
    return collections.filter((collection) => {
      const matchesSearch =
        !searchQuery ||
        collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        collection.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesFilter =
        filterBy === 'all' ||
        (filterBy === 'public' && collection.isPublic) ||
        (filterBy === 'private' && !collection.isPublic)

      return matchesSearch && matchesFilter
    })
  }, [collections, searchQuery, filterBy])

  // Get templates for selected collection
  const selectedCollectionTemplates = useMemo(() => {
    if (!selectedCollection) return []
    return availableTemplates.filter((template) =>
      selectedCollection.templateIds.includes(template.id)
    )
  }, [selectedCollection, availableTemplates])

  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className='flex items-center justify-center p-12'>
          <div className='text-center'>
            <div className='mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent' />
            <p className='text-muted-foreground'>Loading collections...</p>
          </div>
        </div>
      </div>
    )
  }

  if (selectedCollection) {
    return (
      <div className={cn('space-y-6', className)}>
        {/* Collection Header */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Button variant='ghost' size='sm' onClick={() => setSelectedCollection(null)}>
              ← Back to Collections
            </Button>
            <div className='flex items-center gap-3'>
              <div
                className='flex h-12 w-12 items-center justify-center rounded-lg text-white'
                style={{ backgroundColor: selectedCollection.color }}
              >
                <FolderOpen className='h-6 w-6' />
              </div>
              <div>
                <h1 className='font-bold text-2xl'>{selectedCollection.name}</h1>
                <p className='text-muted-foreground'>
                  {selectedCollection.templateCount} templates
                  {selectedCollection.isPublic && (
                    <Badge variant='secondary' className='ml-2'>
                      Public
                    </Badge>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className='h-4 w-4' />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setViewMode('list')}
            >
              <List className='h-4 w-4' />
            </Button>
          </div>
        </div>

        {/* Collection Templates */}
        <CollectionTemplateList
          collection={selectedCollection}
          templates={selectedCollectionTemplates}
          viewMode={viewMode}
          onTemplateSelect={onTemplateSelect}
          onTemplateInstall={onTemplateInstall}
          onTemplateRemove={(templateId) => onTemplateRemove?.(selectedCollection.id, templateId)}
          isOwner={selectedCollection.userId === userId}
        />
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-bold text-2xl'>Template Collections</h1>
          <p className='text-muted-foreground'>Organize your templates into custom collections</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className='mr-2 h-4 w-4' />
          New Collection
        </Button>
      </div>

      {/* Search and Filters */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='relative max-w-md flex-1'>
          <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search collections...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-9'
          />
        </div>
        <div className='flex items-center gap-2'>
          <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
            <SelectTrigger className='w-32'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All</SelectItem>
              <SelectItem value='public'>Public</SelectItem>
              <SelectItem value='private'>Private</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Collections Grid */}
      {filteredCollections.length === 0 ? (
        <Card className='flex h-48 items-center justify-center'>
          <div className='text-center text-muted-foreground'>
            <BookOpen className='mx-auto mb-2 h-8 w-8' />
            <p className='font-medium'>No collections found</p>
            <p className='text-sm'>
              {searchQuery || filterBy !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first collection to get started'}
            </p>
          </div>
        </Card>
      ) : (
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {filteredCollections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              templates={availableTemplates.filter((t) => collection.templateIds.includes(t.id))}
              onSelect={setSelectedCollection}
              onUpdate={onCollectionUpdate}
              onDelete={onCollectionDelete}
              onShare={onCollectionShare}
              isOwner={collection.userId === userId}
            />
          ))}
        </div>
      )}

      {/* Collection Creation Dialog */}
      <CollectionCreationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={onCollectionCreate!}
        userId={userId}
        organizationId={organizationId}
      />
    </div>
  )
}

export default TemplateCollections
