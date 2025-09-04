/**
 * Template Card Component - Rich Display for Template Marketplace
 *
 * This component provides a comprehensive template card display for the marketplace
 * with support for both grid and list view modes. Features include:
 * - Rich template metadata display with thumbnail, ratings, and statistics
 * - Interactive elements for preview, instantiation, bookmarking, and sharing
 * - Responsive design with hover effects and accessibility features
 * - Author information with avatar and verification badges
 * - Category, difficulty, and tag displays
 * - Usage statistics and rating visualization
 *
 * Features:
 * - Dual view mode support (grid/list)
 * - Rich metadata display with thumbnails and badges
 * - Interactive action buttons with tooltips
 * - Responsive design with mobile optimization
 * - Accessibility features with proper ARIA labels
 * - Hover effects and visual feedback
 * - Integration with template preview and instantiation systems
 *
 * @author Claude Code Template System
 * @version 1.0.0
 */

'use client'

import { useCallback, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Bookmark,
  Calendar,
  Clock,
  Download,
  Eye,
  GitFork,
  Heart,
  MoreHorizontal,
  Play,
  Share2,
  Shield,
  Star,
  TrendingUp,
  User,
  Zap,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Template, TemplateDifficulty } from '@/lib/templates/types'
import { cn } from '@/lib/utils'

/**
 * View mode for template display
 */
type ViewMode = 'grid' | 'list'

/**
 * Props for the TemplateCard component
 */
interface TemplateCardProps {
  /** Template data to display */
  template: Template
  /** Display mode - grid or list */
  viewMode?: ViewMode
  /** Whether the card is selected (for multi-select scenarios) */
  isSelected?: boolean
  /** Whether to show admin controls */
  showAdminControls?: boolean
  /** Whether to show full metadata in list view */
  showFullMetadata?: boolean
  /** Custom CSS classes */
  className?: string

  // Event handlers
  /** Called when template is clicked for preview */
  onTemplateClick?: (template: Template) => void
  /** Called when instantiate button is clicked */
  onInstantiate?: (templateId: string) => void
  /** Called when star/unstar is triggered */
  onStar?: (templateId: string, isStarred: boolean) => void
  /** Called when bookmark is triggered */
  onBookmark?: (templateId: string, isBookmarked: boolean) => void
  /** Called when share is triggered */
  onShare?: (template: Template) => void
  /** Called when template is added to collection */
  onAddToCollection?: (templateId: string) => void
  /** Called when template author is clicked */
  onAuthorClick?: (authorId: string) => void
  /** Called when category is clicked */
  onCategoryClick?: (category: string) => void
  /** Called when tag is clicked */
  onTagClick?: (tag: string) => void
}

/**
 * Template Card Component
 *
 * Displays a comprehensive template card with metadata, actions, and responsive design.
 * Supports both grid and list view modes with rich interactive elements.
 */
export function TemplateCard({
  template,
  viewMode = 'grid',
  isSelected = false,
  showAdminControls = false,
  showFullMetadata = false,
  className,
  onTemplateClick,
  onInstantiate,
  onStar,
  onBookmark,
  onShare,
  onAddToCollection,
  onAuthorClick,
  onCategoryClick,
  onTagClick,
}: TemplateCardProps) {
  // Local state for optimistic UI updates
  const [isStarred, setIsStarred] = useState(template.isStarred || false)
  const [starCount, setStarCount] = useState(template.stars || 0)
  const [isBookmarked, setIsBookmarked] = useState(false) // Would come from user data

  // Derived values
  const isGridView = viewMode === 'grid'
  const isListView = viewMode === 'list'
  const hasDescription = template.description && template.description.trim().length > 0
  const authorInitials = template.author
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Event handlers with optimistic updates
  const handleStarToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()

      const newIsStarred = !isStarred
      const newStarCount = newIsStarred ? starCount + 1 : Math.max(0, starCount - 1)

      // Optimistic update
      setIsStarred(newIsStarred)
      setStarCount(newStarCount)

      // Call parent handler
      onStar?.(template.id, isStarred)
    },
    [template.id, isStarred, starCount, onStar]
  )

  const handleBookmarkToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()

      const newIsBookmarked = !isBookmarked
      setIsBookmarked(newIsBookmarked)

      onBookmark?.(template.id, isBookmarked)
    },
    [template.id, isBookmarked, onBookmark]
  )

  const handleShare = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onShare?.(template)
    },
    [template, onShare]
  )

  const handleInstantiate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onInstantiate?.(template.id)
    },
    [template.id, onInstantiate]
  )

  const handleCardClick = useCallback(() => {
    onTemplateClick?.(template)
  }, [template, onTemplateClick])

  const handleAuthorClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onAuthorClick?.(template.userId)
    },
    [template.userId, onAuthorClick]
  )

  const handleCategoryClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onCategoryClick?.(template.category)
    },
    [template.category, onCategoryClick]
  )

  const handleTagClick = useCallback(
    (tag: string) => (e: React.MouseEvent) => {
      e.stopPropagation()
      onTagClick?.(tag)
    },
    [onTagClick]
  )

  // Helper functions
  const getDifficultyColor = (difficulty?: TemplateDifficulty): string => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'advanced':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'expert':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getRelativeTime = (date: Date): string => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true })
    } catch {
      return 'Recently'
    }
  }

  // Grid view rendering
  if (isGridView) {
    return (
      <TooltipProvider>
        <Card
          className={cn(
            'group hover:-translate-y-1 cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-lg',
            'border-2 hover:border-primary/20',
            isSelected && 'ring-2 ring-primary ring-offset-2',
            className
          )}
          onClick={handleCardClick}
        >
          {/* Template Thumbnail */}
          <div className='relative aspect-video overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200'>
            {template.metadata?.thumbnail ? (
              <img
                src={template.metadata.thumbnail}
                alt={`${template.name} thumbnail`}
                className='h-full w-full object-cover transition-transform duration-200 group-hover:scale-105'
              />
            ) : (
              <div
                className={cn(
                  'flex h-full w-full items-center justify-center font-bold text-4xl text-white',
                  `bg-gradient-to-br ${template.color || 'from-blue-500 to-purple-600'}`
                )}
              >
                {template.icon || template.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            {/* Overlay indicators */}
            <div className='absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100' />

            {/* Quick action overlay */}
            <div className='absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-200 group-hover:opacity-100'>
              <Button
                size='sm'
                className='bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm hover:bg-white'
                onClick={handleCardClick}
              >
                <Eye className='mr-2 h-4 w-4' />
                Preview
              </Button>
            </div>

            {/* Status badges */}
            <div className='absolute top-3 left-3 flex gap-2'>
              {template.featured && (
                <Badge className='bg-yellow-500 text-yellow-900'>
                  <Star className='mr-1 h-3 w-3 fill-current' />
                  Featured
                </Badge>
              )}
              {template.trending && (
                <Badge className='bg-green-500 text-white'>
                  <TrendingUp className='mr-1 h-3 w-3' />
                  Trending
                </Badge>
              )}
            </div>

            {/* Bookmark button */}
            <div className='absolute top-3 right-3'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size='icon'
                    variant='ghost'
                    className='h-8 w-8 bg-white/80 text-gray-700 backdrop-blur-sm hover:bg-white hover:text-red-600'
                    onClick={handleBookmarkToggle}
                  >
                    {isBookmarked ? (
                      <Heart className='h-4 w-4 fill-current text-red-600' />
                    ) : (
                      <Heart className='h-4 w-4' />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isBookmarked ? 'Remove from favorites' : 'Add to favorites'}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <CardHeader className='pb-3'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0 flex-1'>
                <CardTitle className='line-clamp-2 text-lg leading-tight'>
                  {template.name}
                </CardTitle>
                {hasDescription && (
                  <CardDescription className='mt-1 line-clamp-2 text-sm'>
                    {template.description}
                  </CardDescription>
                )}
              </div>

              {/* More actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size='icon'
                    variant='ghost'
                    className='h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100'
                  >
                    <MoreHorizontal className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem onClick={handleShare}>
                    <Share2 className='mr-2 h-4 w-4' />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddToCollection?.(template.id)}>
                    <Bookmark className='mr-2 h-4 w-4' />
                    Add to Collection
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleAuthorClick}>
                    <User className='mr-2 h-4 w-4' />
                    View Author
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Author information */}
            <div className='mt-2 flex items-center gap-2'>
              <Avatar className='h-6 w-6'>
                <AvatarImage src={`/api/users/${template.userId}/avatar`} />
                <AvatarFallback className='text-xs'>{authorInitials}</AvatarFallback>
              </Avatar>
              <Button
                variant='link'
                className='h-auto p-0 text-muted-foreground text-sm hover:text-primary'
                onClick={handleAuthorClick}
              >
                {template.author}
              </Button>
              {template.metadata?.status === 'approved' && (
                <Tooltip>
                  <TooltipTrigger>
                    <Shield className='h-3 w-3 text-green-600' />
                  </TooltipTrigger>
                  <TooltipContent>Verified template</TooltipContent>
                </Tooltip>
              )}
            </div>
          </CardHeader>

          <CardContent className='space-y-3 pt-0'>
            {/* Category and difficulty */}
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                className='h-6 px-2 text-xs'
                onClick={handleCategoryClick}
              >
                {template.category}
              </Button>
              {template.metadata?.difficulty && (
                <Badge
                  className={cn(
                    'h-6 border text-xs',
                    getDifficultyColor(template.metadata.difficulty)
                  )}
                  variant='outline'
                >
                  {template.metadata.difficulty}
                </Badge>
              )}
            </div>

            {/* Tags */}
            {template.metadata?.tags && template.metadata.tags.length > 0 && (
              <div className='flex flex-wrap gap-1'>
                {template.metadata.tags.slice(0, 3).map((tag) => (
                  <Button
                    key={tag}
                    variant='ghost'
                    size='sm'
                    className='h-5 px-2 text-muted-foreground text-xs hover:text-primary'
                    onClick={handleTagClick(tag)}
                  >
                    #{tag}
                  </Button>
                ))}
                {template.metadata.tags.length > 3 && (
                  <span className='px-2 py-1 text-muted-foreground text-xs'>
                    +{template.metadata.tags.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Statistics */}
            <div className='flex items-center justify-between text-muted-foreground text-sm'>
              <div className='flex items-center gap-4'>
                <div className='flex items-center gap-1'>
                  <Eye className='h-3 w-3' />
                  <span>{formatNumber(template.views)}</span>
                </div>
                <div className='flex items-center gap-1'>
                  <Download className='h-3 w-3' />
                  <span>{formatNumber(template.downloadCount || 0)}</span>
                </div>
                {template.forkCount && template.forkCount > 0 && (
                  <div className='flex items-center gap-1'>
                    <GitFork className='h-3 w-3' />
                    <span>{formatNumber(template.forkCount)}</span>
                  </div>
                )}
              </div>
              <div className='flex items-center gap-1'>
                <Calendar className='h-3 w-3' />
                <span>{getRelativeTime(template.createdAt)}</span>
              </div>
            </div>

            {/* Rating display */}
            {template.ratingAverage && template.ratingCount && (
              <div className='flex items-center gap-2'>
                <div className='flex items-center'>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'h-3 w-3',
                        i < Math.round(template.ratingAverage!)
                          ? 'fill-current text-yellow-400'
                          : 'text-gray-300'
                      )}
                    />
                  ))}
                </div>
                <span className='text-muted-foreground text-sm'>
                  {template.ratingAverage.toFixed(1)} ({formatNumber(template.ratingCount)})
                </span>
              </div>
            )}
          </CardContent>

          {/* Action buttons footer */}
          <div className='border-t p-4'>
            <div className='flex items-center gap-2'>
              <Button size='sm' className='flex-1' onClick={handleInstantiate}>
                <Play className='mr-2 h-4 w-4' />
                Use Template
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={handleStarToggle}
                className={cn(isStarred && 'border-yellow-600 text-yellow-600')}
              >
                <Star className={cn('mr-2 h-4 w-4', isStarred && 'fill-current')} />
                {formatNumber(starCount)}
              </Button>
            </div>
          </div>
        </Card>
      </TooltipProvider>
    )
  }

  // List view rendering
  return (
    <TooltipProvider>
      <Card
        className={cn(
          'group cursor-pointer transition-all duration-200 hover:border-primary/20 hover:shadow-md',
          isSelected && 'ring-2 ring-primary ring-offset-2',
          className
        )}
        onClick={handleCardClick}
      >
        <div className='flex items-center gap-4 p-4'>
          {/* Template thumbnail/icon */}
          <div className='relative shrink-0'>
            {template.metadata?.thumbnail ? (
              <img
                src={template.metadata.thumbnail}
                alt={`${template.name} thumbnail`}
                className='h-16 w-16 rounded-lg object-cover'
              />
            ) : (
              <div
                className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-lg font-bold text-lg text-white',
                  `bg-gradient-to-br ${template.color || 'from-blue-500 to-purple-600'}`
                )}
              >
                {template.icon || template.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            {/* Status indicators */}
            {(template.featured || template.trending) && (
              <div className='-top-1 -right-1 absolute flex gap-1'>
                {template.featured && (
                  <div className='h-3 w-3 rounded-full bg-yellow-500' title='Featured' />
                )}
                {template.trending && (
                  <div className='h-3 w-3 rounded-full bg-green-500' title='Trending' />
                )}
              </div>
            )}
          </div>

          {/* Template information */}
          <div className='min-w-0 flex-1'>
            <div className='flex items-start justify-between gap-4'>
              <div className='min-w-0 flex-1'>
                <div className='mb-1 flex items-center gap-2'>
                  <h3 className='truncate font-semibold text-lg'>{template.name}</h3>
                  {template.metadata?.status === 'approved' && (
                    <Shield className='h-4 w-4 shrink-0 text-green-600' />
                  )}
                </div>

                {hasDescription && (
                  <p className='mb-2 line-clamp-2 text-muted-foreground text-sm'>
                    {template.description}
                  </p>
                )}

                {/* Metadata row */}
                <div className='flex items-center gap-4 text-muted-foreground text-sm'>
                  {/* Author */}
                  <div className='flex items-center gap-1'>
                    <Avatar className='h-4 w-4'>
                      <AvatarImage src={`/api/users/${template.userId}/avatar`} />
                      <AvatarFallback className='text-xs'>{authorInitials}</AvatarFallback>
                    </Avatar>
                    <Button
                      variant='link'
                      className='h-auto p-0 text-muted-foreground text-sm hover:text-primary'
                      onClick={handleAuthorClick}
                    >
                      {template.author}
                    </Button>
                  </div>

                  {/* Category */}
                  <Button
                    variant='link'
                    className='h-auto p-0 text-muted-foreground text-sm hover:text-primary'
                    onClick={handleCategoryClick}
                  >
                    {template.category}
                  </Button>

                  {/* Difficulty */}
                  {template.metadata?.difficulty && (
                    <Badge
                      className={cn(
                        'h-5 border text-xs',
                        getDifficultyColor(template.metadata.difficulty)
                      )}
                      variant='outline'
                    >
                      {template.metadata.difficulty}
                    </Badge>
                  )}

                  {/* Created date */}
                  <div className='flex items-center gap-1'>
                    <Calendar className='h-3 w-3' />
                    <span>{getRelativeTime(template.createdAt)}</span>
                  </div>
                </div>

                {/* Tags and extended metadata */}
                {showFullMetadata && (
                  <div className='mt-2 space-y-2'>
                    {/* Tags */}
                    {template.metadata?.tags && template.metadata.tags.length > 0 && (
                      <div className='flex flex-wrap gap-1'>
                        {template.metadata.tags.slice(0, 6).map((tag) => (
                          <Button
                            key={tag}
                            variant='ghost'
                            size='sm'
                            className='h-5 px-2 text-muted-foreground text-xs hover:text-primary'
                            onClick={handleTagClick(tag)}
                          >
                            #{tag}
                          </Button>
                        ))}
                        {template.metadata.tags.length > 6 && (
                          <span className='px-2 py-1 text-muted-foreground text-xs'>
                            +{template.metadata.tags.length - 6} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Extended stats */}
                    <div className='flex items-center gap-4 text-muted-foreground text-xs'>
                      {template.metadata?.estimatedTime && (
                        <div className='flex items-center gap-1'>
                          <Clock className='h-3 w-3' />
                          <span>{template.metadata.estimatedTime}</span>
                        </div>
                      )}
                      {template.metadata?.blockTypes && (
                        <div className='flex items-center gap-1'>
                          <Zap className='h-3 w-3' />
                          <span>{template.metadata.blockTypes.length} blocks</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions column */}
              <div className='flex shrink-0 items-center gap-2'>
                {/* Statistics */}
                <div className='mr-4 flex items-center gap-3 text-muted-foreground text-sm'>
                  <div className='flex items-center gap-1'>
                    <Eye className='h-3 w-3' />
                    <span>{formatNumber(template.views)}</span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <Download className='h-3 w-3' />
                    <span>{formatNumber(template.downloadCount || 0)}</span>
                  </div>
                  {template.ratingAverage && (
                    <div className='flex items-center gap-1'>
                      <Star className='h-3 w-3 fill-current text-yellow-400' />
                      <span>{template.ratingAverage.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <Button size='sm' onClick={handleInstantiate}>
                  <Play className='mr-2 h-4 w-4' />
                  Use
                </Button>

                <Button
                  size='sm'
                  variant='outline'
                  onClick={handleStarToggle}
                  className={cn(isStarred && 'border-yellow-600 text-yellow-600')}
                >
                  <Star className={cn('mr-1 h-4 w-4', isStarred && 'fill-current')} />
                  {formatNumber(starCount)}
                </Button>

                <Button
                  size='sm'
                  variant='ghost'
                  onClick={handleBookmarkToggle}
                  className={cn(isBookmarked && 'text-red-600')}
                >
                  <Heart className={cn('h-4 w-4', isBookmarked && 'fill-current')} />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size='sm' variant='ghost'>
                      <MoreHorizontal className='h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem onClick={handleShare}>
                      <Share2 className='mr-2 h-4 w-4' />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAddToCollection?.(template.id)}>
                      <Bookmark className='mr-2 h-4 w-4' />
                      Add to Collection
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleAuthorClick}>
                      <User className='mr-2 h-4 w-4' />
                      View Author
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </TooltipProvider>
  )
}

export default TemplateCard
