/**
 * Template Preview Dialog Component
 *
 * A comprehensive full-screen modal dialog for previewing templates before instantiation.
 * Provides code visualization, metadata display, installation instructions, and action buttons.
 *
 * Features:
 * - Full-screen responsive modal with mobile optimization
 * - Syntax-highlighted code preview with copy functionality
 * - Template metadata including description, tags, requirements, and usage info
 * - Installation and usage instructions with step-by-step guidance
 * - Action buttons for use template, bookmark, and share functionality
 * - Integration with template instantiation workflow
 * - Professional UI with consistent design patterns
 *
 * @author Claude Code Template System
 * @version 1.0.0
 */

'use client'

import { useMemo, useState } from 'react'
import {
  Calendar,
  Clock,
  Copy,
  Eye,
  Heart,
  Maximize2,
  Minimize2,
  Play,
  Share2,
  Star,
  Tag,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge as UIBadge } from '@/components/ui/badge'
// UI Components
import { Button } from '@/components/ui/button'
import { CodeBlock } from '@/components/ui/code-block'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// Types
import type { Template } from '@/lib/templates/types'
import { cn } from '@/lib/utils'

/**
 * Props for the TemplatePreviewDialog component
 */
interface TemplatePreviewDialogProps {
  /** Template to preview - null or undefined means dialog is closed */
  template: Template | null
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Callback to instantiate the template */
  onInstantiate: (templateId: string) => Promise<void>
  /** Callback to star/unstar the template */
  onStar: (templateId: string, isStarred: boolean) => Promise<void>
  /** Callback to share the template */
  onShare: (template: Template) => Promise<void>
  /** Optional callback when template is bookmarked */
  onBookmark?: (templateId: string) => Promise<void>
  /** Whether the dialog should be fullscreen on mobile */
  fullscreenMobile?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Difficulty level styling configuration
 */
const difficultyConfig = {
  beginner: {
    color: 'bg-green-500 text-green-50',
    label: 'Beginner',
    description: 'Perfect for getting started',
  },
  intermediate: {
    color: 'bg-blue-500 text-blue-50',
    label: 'Intermediate',
    description: 'Some experience recommended',
  },
  advanced: {
    color: 'bg-orange-500 text-orange-50',
    label: 'Advanced',
    description: 'Requires solid understanding',
  },
  expert: {
    color: 'bg-red-500 text-red-50',
    label: 'Expert',
    description: 'For experienced users only',
  },
}

/**
 * Utility function to format large numbers
 */
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

/**
 * Utility function to format date
 */
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

/**
 * Template Preview Dialog Component
 *
 * Provides a comprehensive preview experience for templates including:
 * - Code visualization with syntax highlighting
 * - Template metadata and statistics
 * - Installation instructions and requirements
 * - Action buttons for instantiation and social features
 */
export function TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
  onInstantiate,
  onStar,
  onShare,
  onBookmark,
  fullscreenMobile = true,
  className,
}: TemplatePreviewDialogProps) {
  // Local state for UI interactions
  const [isStarLoading, setIsStarLoading] = useState(false)
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false)
  const [isInstantiating, setIsInstantiating] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Don't render if no template
  if (!template) return null

  // Extract workflow state for code preview
  const workflowCode = useMemo(() => {
    if (!template.state) return 'No workflow code available'

    try {
      return JSON.stringify(template.state, null, 2)
    } catch (error) {
      return 'Error: Unable to parse workflow state'
    }
  }, [template.state])

  // Get difficulty configuration
  const difficulty = difficultyConfig[template.metadata?.difficulty || 'beginner']

  // Handle star toggle
  const handleStarClick = async () => {
    if (isStarLoading) return

    setIsStarLoading(true)
    try {
      await onStar(template.id, template.isStarred || false)
      toast.success(template.isStarred ? 'Template unstarred' : 'Template starred')
    } catch (error) {
      toast.error('Failed to update star status')
    } finally {
      setIsStarLoading(false)
    }
  }

  // Handle bookmark
  const handleBookmark = async () => {
    if (!onBookmark || isBookmarkLoading) return

    setIsBookmarkLoading(true)
    try {
      await onBookmark(template.id)
      toast.success('Template bookmarked')
    } catch (error) {
      toast.error('Failed to bookmark template')
    } finally {
      setIsBookmarkLoading(false)
    }
  }

  // Handle share
  const handleShare = async () => {
    try {
      await onShare(template)
    } catch (error) {
      toast.error('Failed to share template')
    }
  }

  // Handle instantiate
  const handleInstantiate = async () => {
    if (isInstantiating) return

    setIsInstantiating(true)
    try {
      await onInstantiate(template.id)
    } catch (error) {
      toast.error('Failed to instantiate template')
    } finally {
      setIsInstantiating(false)
    }
  }

  // Handle copy code
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(workflowCode)
      toast.success('Code copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy code')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // Base styles
          'h-[90vh] max-w-7xl gap-0 p-0',
          // Fullscreen on mobile if enabled
          fullscreenMobile &&
            'h-full max-w-full rounded-none sm:h-[90vh] sm:max-w-7xl sm:rounded-lg',
          // Fullscreen toggle
          isFullscreen && 'h-full max-w-full rounded-none',
          className
        )}
        hideCloseButton
      >
        {/* Header */}
        <div className='flex items-center justify-between border-b p-6'>
          <div className='flex min-w-0 flex-1 items-center gap-4'>
            {/* Template Icon */}
            <div
              className={cn(
                'flex flex-shrink-0 items-center justify-center rounded-lg',
                'h-12 w-12'
              )}
              style={{ backgroundColor: template.color }}
            >
              <div className='text-lg text-white'>{template.icon || '📋'}</div>
            </div>

            {/* Template Title and Meta */}
            <div className='min-w-0 flex-1'>
              <DialogTitle className='truncate text-left font-semibold text-xl'>
                {template.name}
              </DialogTitle>
              <div className='mt-1 flex items-center gap-3 text-muted-foreground text-sm'>
                <span className='flex items-center gap-1'>
                  <User className='h-3 w-3' />
                  {template.author}
                </span>
                <span className='flex items-center gap-1'>
                  <Calendar className='h-3 w-3' />
                  {formatDate(template.createdAt)}
                </span>
                <span className='flex items-center gap-1'>
                  <Eye className='h-3 w-3' />
                  {formatNumber(template.views)} views
                </span>
              </div>
            </div>

            {/* Difficulty Badge */}
            <UIBadge className={cn('font-medium text-xs', difficulty.color)}>
              {difficulty.label}
            </UIBadge>
          </div>

          {/* Header Actions */}
          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setIsFullscreen(!isFullscreen)}
              className='hidden sm:flex'
            >
              {isFullscreen ? <Minimize2 className='h-4 w-4' /> : <Maximize2 className='h-4 w-4' />}
            </Button>
            <Button variant='ghost' size='sm' onClick={() => onOpenChange(false)}>
              <X className='h-4 w-4' />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className='flex min-h-0 flex-1 flex-col'>
          <Tabs value={activeTab} onValueChange={setActiveTab} className='flex flex-1 flex-col'>
            {/* Tab Navigation */}
            <div className='border-b px-6'>
              <TabsList className='grid w-full max-w-md grid-cols-4'>
                <TabsTrigger value='overview'>Overview</TabsTrigger>
                <TabsTrigger value='code'>Code</TabsTrigger>
                <TabsTrigger value='instructions'>Setup</TabsTrigger>
                <TabsTrigger value='reviews'>Reviews</TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className='min-h-0 flex-1'>
              {/* Overview Tab */}
              <TabsContent value='overview' className='m-0 h-full'>
                <ScrollArea className='h-full'>
                  <div className='space-y-6 p-6'>
                    {/* Description */}
                    <div>
                      <h3 className='mb-3 font-semibold'>Description</h3>
                      <p className='text-muted-foreground leading-relaxed'>
                        {template.description || 'No description available for this template.'}
                      </p>
                    </div>

                    {/* Statistics */}
                    <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                      <div className='rounded-lg bg-secondary/50 p-4 text-center'>
                        <div className='font-semibold text-lg'>{formatNumber(template.stars)}</div>
                        <div className='text-muted-foreground text-sm'>Stars</div>
                      </div>
                      <div className='rounded-lg bg-secondary/50 p-4 text-center'>
                        <div className='font-semibold text-lg'>{formatNumber(template.views)}</div>
                        <div className='text-muted-foreground text-sm'>Views</div>
                      </div>
                      <div className='rounded-lg bg-secondary/50 p-4 text-center'>
                        <div className='font-semibold text-lg'>
                          {formatNumber(template.downloadCount || 0)}
                        </div>
                        <div className='text-muted-foreground text-sm'>Downloads</div>
                      </div>
                      <div className='rounded-lg bg-secondary/50 p-4 text-center'>
                        <div className='font-semibold text-lg'>
                          {template.ratingAverage?.toFixed(1) || 'N/A'}
                        </div>
                        <div className='text-muted-foreground text-sm'>Rating</div>
                      </div>
                    </div>

                    {/* Tags */}
                    {template.metadata?.tags && template.metadata.tags.length > 0 && (
                      <div>
                        <h3 className='mb-3 font-semibold'>Tags</h3>
                        <div className='flex flex-wrap gap-2'>
                          {template.metadata.tags.map((tag, index) => (
                            <UIBadge key={index} variant='secondary' className='text-xs'>
                              <Tag className='mr-1 h-3 w-3' />
                              {tag}
                            </UIBadge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Requirements */}
                    {template.metadata?.requirements &&
                      template.metadata.requirements.length > 0 && (
                        <div>
                          <h3 className='mb-3 font-semibold'>Requirements</h3>
                          <ul className='list-inside list-disc space-y-1 text-muted-foreground'>
                            {template.metadata.requirements.map((requirement, index) => (
                              <li key={index}>{requirement}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {/* Use Cases */}
                    {template.metadata?.useCases && template.metadata.useCases.length > 0 && (
                      <div>
                        <h3 className='mb-3 font-semibold'>Use Cases</h3>
                        <ul className='list-inside list-disc space-y-1 text-muted-foreground'>
                          {template.metadata.useCases.map((useCase, index) => (
                            <li key={index}>{useCase}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Estimated Time */}
                    {template.metadata?.estimatedTime && (
                      <div className='rounded-lg border border-blue-200 bg-blue-50 p-4'>
                        <div className='flex items-center gap-2 text-blue-700'>
                          <Clock className='h-4 w-4' />
                          <span className='font-medium'>Estimated Setup Time</span>
                        </div>
                        <p className='mt-1 text-blue-600'>{template.metadata.estimatedTime}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Code Tab */}
              <TabsContent value='code' className='m-0 h-full'>
                <div className='flex h-full flex-col'>
                  <div className='flex items-center justify-between border-b p-4'>
                    <span className='font-medium text-sm'>Workflow Configuration</span>
                    <Button variant='outline' size='sm' onClick={handleCopyCode}>
                      <Copy className='mr-2 h-4 w-4' />
                      Copy Code
                    </Button>
                  </div>
                  <ScrollArea className='flex-1'>
                    <div className='p-4'>
                      <CodeBlock code={workflowCode} language='json' />
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              {/* Instructions Tab */}
              <TabsContent value='instructions' className='m-0 h-full'>
                <ScrollArea className='h-full'>
                  <div className='space-y-6 p-6'>
                    <div>
                      <h3 className='mb-4 font-semibold'>Installation Instructions</h3>
                      <div className='space-y-4'>
                        <div className='flex gap-4'>
                          <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm'>
                            1
                          </div>
                          <div>
                            <h4 className='font-medium'>Click "Use Template"</h4>
                            <p className='text-muted-foreground text-sm'>
                              This will create a new workflow based on this template in your
                              workspace.
                            </p>
                          </div>
                        </div>

                        <div className='flex gap-4'>
                          <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm'>
                            2
                          </div>
                          <div>
                            <h4 className='font-medium'>Configure Settings</h4>
                            <p className='text-muted-foreground text-sm'>
                              Review and adjust the workflow configuration to match your needs.
                            </p>
                          </div>
                        </div>

                        <div className='flex gap-4'>
                          <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm'>
                            3
                          </div>
                          <div>
                            <h4 className='font-medium'>Set Up Integrations</h4>
                            <p className='text-muted-foreground text-sm'>
                              Connect any required services and configure authentication
                              credentials.
                            </p>
                          </div>
                        </div>

                        <div className='flex gap-4'>
                          <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm'>
                            4
                          </div>
                          <div>
                            <h4 className='font-medium'>Test & Deploy</h4>
                            <p className='text-muted-foreground text-sm'>
                              Run a test execution to ensure everything works correctly, then
                              deploy.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Notes */}
                    <div className='rounded-lg border border-amber-200 bg-amber-50 p-4'>
                      <div className='mb-2 flex items-center gap-2 text-amber-700'>
                        <Zap className='h-4 w-4' />
                        <span className='font-medium'>Pro Tip</span>
                      </div>
                      <p className='text-amber-600 text-sm'>
                        After instantiation, you can customize the workflow further by adding,
                        removing, or modifying blocks to better fit your specific requirements.
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value='reviews' className='m-0 h-full'>
                <ScrollArea className='h-full'>
                  <div className='p-6'>
                    <div className='py-12 text-center'>
                      <Users className='mx-auto mb-4 h-12 w-12 text-muted-foreground' />
                      <h3 className='mb-2 font-semibold'>Reviews Coming Soon</h3>
                      <p className='text-muted-foreground'>
                        User reviews and ratings will be displayed here once available.
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer Actions */}
        <div className='border-t p-6'>
          <div className='flex items-center justify-between gap-4'>
            {/* Left side - Secondary actions */}
            <div className='flex items-center gap-2'>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleStarClick}
                disabled={isStarLoading}
                className='gap-2'
              >
                <Star
                  className={cn(
                    'h-4 w-4',
                    template.isStarred ? 'fill-current text-yellow-500' : 'text-muted-foreground'
                  )}
                />
                {template.isStarred ? 'Starred' : 'Star'}
              </Button>

              {onBookmark && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleBookmark}
                  disabled={isBookmarkLoading}
                  className='gap-2'
                >
                  <Heart className='h-4 w-4' />
                  Bookmark
                </Button>
              )}

              <Button variant='ghost' size='sm' onClick={handleShare} className='gap-2'>
                <Share2 className='h-4 w-4' />
                Share
              </Button>
            </div>

            {/* Right side - Primary action */}
            <Button
              onClick={handleInstantiate}
              disabled={isInstantiating}
              className='gap-2 px-8'
              size='lg'
            >
              {isInstantiating ? (
                <>
                  <div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                  Creating...
                </>
              ) : (
                <>
                  <Play className='h-4 w-4' />
                  Use Template
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TemplatePreviewDialog
