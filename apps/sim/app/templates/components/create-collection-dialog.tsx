/**
 * Create Collection Dialog - Template Collection Management Component
 *
 * This component provides a comprehensive interface for creating new template collections
 * in the template marketplace, enabling users to organize templates with advanced
 * collection management and social features.
 *
 * FEATURES:
 * - Collection creation with validation and error handling
 * - Visibility settings (private, unlisted, public)
 * - Collaborative collection management
 * - Tag-based organization and categorization
 * - Cover image upload support
 * - Real-time form validation with user feedback
 *
 * INTEGRATION:
 * - Template marketplace integration
 * - Collection management API integration
 * - User authentication and permissions
 * - Social features and community integration
 *
 * @author Claude Code Template System
 * @version 1.0.0
 */

'use client'

import { useCallback, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, EyeOff, FolderPlus, Globe, Loader2, Lock, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('CreateCollectionDialog')

// Collection creation form validation schema
const createCollectionSchema = z.object({
  name: z
    .string()
    .min(1, 'Collection name is required')
    .max(100, 'Collection name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_.,!?()&]+$/, 'Collection name contains invalid characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).default('public'),
  tags: z
    .array(z.string())
    .default([])
    .or(
      z
        .string()
        .default('')
        .transform(
          (str) =>
            str
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
              .slice(0, 10) // Max 10 tags
        )
    ),
  coverImage: z.string().url('Please enter a valid image URL').optional().or(z.literal('')),
  isCollaborative: z.boolean().default(false),
})

type CreateCollectionFormData = z.infer<typeof createCollectionSchema>

interface Collection {
  id: string
  name: string
  description?: string
  visibility: 'private' | 'unlisted' | 'public'
  tags: string[]
  coverImage?: string
  isCollaborative: boolean
  templateCount: number
  followerCount: number
  creator: {
    id: string
    name: string
    displayName?: string
    image?: string
    isVerified: boolean
  }
  createdAt: string
  updatedAt: string
}

interface CreateCollectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCollectionCreated?: (collection: Collection) => void
  onError?: (error: Error) => void
}

/**
 * Visibility option configuration
 */
const VISIBILITY_OPTIONS = [
  {
    value: 'public' as const,
    label: 'Public',
    description: 'Anyone can view and discover this collection',
    icon: Globe,
  },
  {
    value: 'unlisted' as const,
    label: 'Unlisted',
    description: 'Only people with the link can view this collection',
    icon: EyeOff,
  },
  {
    value: 'private' as const,
    label: 'Private',
    description: 'Only you and collaborators can view this collection',
    icon: Lock,
  },
] as const

export function CreateCollectionDialog({
  open,
  onOpenChange,
  onCollectionCreated,
  onError,
}: CreateCollectionDialogProps) {
  // State management
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form management with validation
  const form = useForm<CreateCollectionFormData>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: {
      name: '',
      description: '',
      visibility: 'public' as const,
      tags: [] as string[],
      coverImage: '',
      isCollaborative: false,
    },
  })

  // Watch form values for dynamic UI updates
  const visibility = form.watch('visibility')
  const isCollaborative = form.watch('isCollaborative')

  /**
   * Handle collection creation with comprehensive error handling
   */
  const handleCreateCollection = useCallback(
    async (formData: CreateCollectionFormData) => {
      const startTime = Date.now()
      setIsCreating(true)
      setError(null)

      try {
        logger.info('Creating new template collection', {
          name: formData.name,
          visibility: formData.visibility,
          isCollaborative: formData.isCollaborative,
        })

        // Prepare collection data for API
        const collectionData = {
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          visibility: formData.visibility,
          tags: formData.tags || [],
          coverImage: formData.coverImage || undefined,
          isCollaborative: formData.isCollaborative,
          templateIds: [], // Start with empty collection
          collaborators: [], // Start with no collaborators
        }

        // Create collection via API
        const response = await fetch('/api/community/social/collections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(collectionData),
        })

        if (!response.ok) {
          const errorResult = await response.json()
          throw new Error(
            errorResult.error ||
              errorResult.message ||
              `Failed to create collection: ${response.statusText}`
          )
        }

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Failed to create collection')
        }

        const createdCollection = result.data
        const executionTime = Date.now() - startTime

        logger.info('Collection created successfully', {
          collectionId: createdCollection.id,
          collectionName: createdCollection.name,
          executionTime,
          pointsAwarded: result.pointsAwarded,
        })

        // Show success notification
        toast.success('Collection created successfully!', {
          description: `Your collection "${createdCollection.name}" is now available.`,
        })

        // Notify parent component
        onCollectionCreated?.(createdCollection)

        // Reset form and close dialog
        form.reset()
        onOpenChange(false)
      } catch (error) {
        const executionTime = Date.now() - startTime
        const errorMessage = error instanceof Error ? error.message : 'Failed to create collection'

        setError(errorMessage)
        logger.error('Collection creation failed', {
          error: errorMessage,
          executionTime,
          formData,
        })

        // Show error notification
        toast.error('Failed to create collection', {
          description: errorMessage,
        })

        // Notify parent component of error
        onError?.(error instanceof Error ? error : new Error(errorMessage))
      } finally {
        setIsCreating(false)
      }
    },
    [form, onCollectionCreated, onOpenChange, onError]
  )

  /**
   * Handle dialog close with form reset
   */
  const handleDialogClose = useCallback(
    (open: boolean) => {
      if (!open && !isCreating) {
        form.reset()
        setError(null)
      }
      onOpenChange(open)
    },
    [form, isCreating, onOpenChange]
  )

  /**
   * Get visibility option details
   */
  const getVisibilityOption = useCallback((value: string) => {
    return VISIBILITY_OPTIONS.find((option) => option.value === value)
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <FolderPlus className='h-5 w-5' />
            Create Collection
          </DialogTitle>
          <DialogDescription>
            Create a new template collection to organize and share your favorite templates with the
            community.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleCreateCollection as any)}
            className='space-y-6'
            id='create-collection-form'
          >
            {/* Error Alert */}
            {error && (
              <Alert variant='destructive'>
                <AlertTriangle className='h-4 w-4' />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Collection Name */}
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Collection Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Enter a name for your collection'
                      {...field}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormDescription>
                    Choose a descriptive name that reflects the theme or purpose of your collection.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Describe what this collection is about...'
                      className='resize-none'
                      rows={3}
                      {...field}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormDescription>
                    Help others understand the purpose and contents of your collection.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Visibility Settings */}
            <FormField
              control={form.control}
              name='visibility'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibility</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isCreating}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select visibility level' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {VISIBILITY_OPTIONS.map((option) => {
                        const Icon = option.icon
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className='flex items-center gap-2'>
                              <Icon className='h-4 w-4' />
                              <div>
                                <div className='font-medium'>{option.label}</div>
                                <div className='text-muted-foreground text-xs'>
                                  {option.description}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormDescription>{getVisibilityOption(visibility)?.description}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <FormField
              control={form.control}
              name='tags'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Enter tags separated by commas (e.g., automation, productivity, business)'
                      {...field}
                      value={
                        Array.isArray(field.value) ? field.value.join(', ') : field.value || ''
                      }
                      onChange={(e) => {
                        const value = e.target.value
                        field.onChange(value)
                      }}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormDescription>
                    Add up to 10 tags to help people discover your collection.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cover Image */}
            <FormField
              control={form.control}
              name='coverImage'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Image (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type='url'
                      placeholder='https://example.com/image.jpg'
                      {...field}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormDescription>
                    Add a cover image URL to make your collection more visually appealing.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Collaborative Collection Toggle */}
            <FormField
              control={form.control}
              name='isCollaborative'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='flex items-center gap-2 text-base'>
                      <Users className='h-4 w-4' />
                      Collaborative Collection
                    </FormLabel>
                    <FormDescription>
                      Allow others to contribute templates to this collection.
                      {isCollaborative && visibility === 'private' && (
                        <span className='mt-1 block text-amber-600 text-sm'>
                          Note: Collaborators will be able to view private collections.
                        </span>
                      )}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isCreating}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => handleDialogClose(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            form='create-collection-form'
            disabled={isCreating}
            className='min-w-32'
          >
            {isCreating ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Creating...
              </>
            ) : (
              <>
                <FolderPlus className='mr-2 h-4 w-4' />
                Create Collection
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
