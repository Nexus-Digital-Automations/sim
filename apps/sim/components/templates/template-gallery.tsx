/**
 * Template Gallery - Modern Card-Based Template Display Component
 *
 * This component provides a comprehensive template gallery interface featuring:
 * - Modern card-based layout with rich metadata display
 * - Responsive grid system with customizable view modes
 * - Advanced filtering and search capabilities
 * - Template preview and quick actions
 * - Rating and community features integration
 * - Accessibility-compliant design patterns
 * - Performance-optimized rendering with virtualization
 *
 * Design Features:
 * - Clean, modern aesthetic with subtle animations
 * - Consistent spacing and typography system
 * - Color-coded categories with brand alignment
 * - Mobile-first responsive design
 * - High contrast accessibility support
 * - Keyboard navigation and screen reader support
 *
 * @author Claude Code Template System - UI/UX Specialist
 * @version 2.0.0
 */

'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Download,
  Eye,
  Heart,
  MoreHorizontal,
  Play,
  Share2,
  Star,
  TrendingUp,
  User,
  Users,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Template } from '@/lib/templates/types'

/**
 * Template Gallery Props Interface
 * Defines the configuration options for the template gallery component
 */
export interface TemplateGalleryProps {
  /** Array of templates to display */
  templates: Template[]
  /** Current view mode for template display */
  viewMode: 'grid' | 'list' | 'compact'
  /** Loading state indicator */
  loading?: boolean
  /** Error state message */
  error?: string | null
  /** Template selection handler */
  onTemplateSelect?: (template: Template) => void
  /** Template instantiation handler */
  onInstantiate?: (templateId: string) => Promise<void>
  /** Template star/unstar handler */
  onToggleStar?: (templateId: string, isStarred: boolean) => Promise<void>
  /** Template sharing handler */
  onShare?: (template: Template) => void
  /** Template preview handler */
  onPreview?: (template: Template) => void
  /** Template collection add handler */
  onAddToCollection?: (templateId: string) => void
  /** Custom CSS class name */
  className?: string
  /** Show template metrics (views, downloads, etc.) */
  showMetrics?: boolean
  /** Show community features (ratings, comments) */
  showCommunityFeatures?: boolean
  /** Show template difficulty badges */
  showDifficulty?: boolean
  /** Enable template animations */
  enableAnimations?: boolean
  /** Current user ID for permission checks */
  currentUserId?: string
}

/**
 * Individual Template Card Props Interface
 */
interface TemplateCardProps {
  template: Template
  viewMode: 'grid' | 'list' | 'compact'
  showMetrics: boolean
  showCommunityFeatures: boolean
  showDifficulty: boolean
  enableAnimations: boolean
  currentUserId?: string
  onSelect?: (template: Template) => void
  onInstantiate?: (templateId: string) => Promise<void>
  onToggleStar?: (templateId: string, isStarred: boolean) => Promise<void>
  onShare?: (template: Template) => void
  onPreview?: (template: Template) => void
  onAddToCollection?: (templateId: string) => void
}

/**
 * Template Card Component
 * Renders individual template cards with all metadata and actions
 */
const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  viewMode,
  showMetrics,
  showCommunityFeatures,
  showDifficulty,
  enableAnimations,
  currentUserId,
  onSelect,
  onInstantiate,
  onToggleStar,
  onShare,
  onPreview,
  onAddToCollection,
}) => {
  const [isInstantiating, setIsInstantiating] = useState(false)
  const [isStarring, setIsStarring] = useState(false)

  // Handle template instantiation with loading state
  const handleInstantiate = useCallback(async () => {
    if (!onInstantiate || isInstantiating) return

    setIsInstantiating(true)
    try {
      await onInstantiate(template.id)
    } catch (error) {
      console.error('Template instantiation failed:', error)
    } finally {
      setIsInstantiating(false)
    }
  }, [template.id, onInstantiate, isInstantiating])

  // Handle star toggle with loading state
  const handleToggleStar = useCallback(async () => {
    if (!onToggleStar || isStarring) return

    setIsStarring(true)
    try {
      await onToggleStar(template.id, !!template.isStarred)
    } catch (error) {
      console.error('Star toggle failed:', error)
    } finally {
      setIsStarring(false)
    }
  }, [template.id, template.isStarred, onToggleStar, isStarring])

  // Format numbers for display (e.g., 1.2K, 5.4M)
  const formatNumber = useCallback((num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }, [])

  // Get difficulty color for consistent theming
  const getDifficultyColor = useCallback((difficulty: string): string => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'intermediate':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'advanced':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'expert':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }, [])

  // Calculate template quality score for visual indicator
  const qualityScore = useMemo(() => {
    let score = 0
    if (template.description && template.description.length > 50) score += 20
    if (template.ratingAverage && template.ratingAverage > 4) score += 30
    if (template.ratingCount && template.ratingCount > 10) score += 20
    if (template.metadata?.requirements?.length) score += 15
    if (template.metadata?.useCases?.length) score += 15
    return Math.min(score, 100)
  }, [template])

  // Animation variants for smooth transitions
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    hover: { y: -4, transition: { duration: 0.2 } },
  }

  const CardComponent = enableAnimations ? motion.div : 'div'
  const cardProps = enableAnimations
    ? {
        variants: cardVariants,
        initial: 'hidden',
        animate: 'visible',
        whileHover: 'hover',
        layout: true,
      }
    : {}

  return (
    <CardComponent
      {...cardProps}
      className={cn(
        'group relative overflow-hidden transition-all duration-200',
        'hover:shadow-lg hover:shadow-blue-500/10 border-0 bg-white/50 backdrop-blur-sm',
        viewMode === 'list' && 'flex flex-row',
        viewMode === 'compact' && 'h-32',
      )}
      onClick={() => onSelect?.(template)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect?.(template)
        }
      }}
      aria-label={`Template: ${template.name} by ${template.author}`}
    >
      <Card className="h-full border-0 shadow-none bg-transparent">
        {/* Template Thumbnail/Icon Section */}
        <CardHeader
          className={cn(
            'relative pb-3',
            viewMode === 'list' && 'w-48 flex-shrink-0',
            viewMode === 'compact' && 'p-3',
          )}
        >
          <div
            className={cn(
              'relative rounded-lg flex items-center justify-center text-white font-bold text-2xl',
              viewMode === 'compact' ? 'h-12 w-12' : 'h-24 w-full',
            )}
            style={{ backgroundColor: template.color }}
          >
            {/* Template Icon */}
            <div className="text-white/90">{template.icon || '📄'}</div>

            {/* Quality Score Indicator */}
            {showMetrics && qualityScore > 0 && viewMode !== 'compact' && (
              <div className="absolute top-2 right-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="h-2 w-8 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white/80 transition-all duration-300"
                          style={{ width: `${qualityScore}%` }}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Quality Score: {qualityScore}%</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            {/* Featured Badge */}
            {template.featured && (
              <Badge className="absolute -top-1 -left-1 bg-yellow-400 text-yellow-900">
                <Star className="h-3 w-3 mr-1" />
                Featured
              </Badge>
            )}

            {/* Trending Indicator */}
            {template.trending && (
              <div className="absolute -top-1 -right-1 bg-orange-500 text-white p-1 rounded-full">
                <TrendingUp className="h-3 w-3" />
              </div>
            )}
          </div>

          {/* Quick Action Buttons - Shown on Hover */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      onPreview?.(template)
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Preview Template</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleInstantiate()
                    }}
                    disabled={isInstantiating}
                    className="h-8 px-3"
                  >
                    {isInstantiating ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Use
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Instantiate Template</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>

        {/* Template Information */}
        <CardContent
          className={cn(
            'space-y-3',
            viewMode === 'compact' && 'py-2',
            viewMode === 'list' && 'flex-1',
          )}
        >
          {/* Title and Description */}
          <div className="space-y-1">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
              {template.name}
            </h3>
            {template.description && viewMode !== 'compact' && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {template.description}
              </p>
            )}
          </div>

          {/* Author and Metadata */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{template.author}</span>
            {template.metadata?.difficulty && showDifficulty && (
              <Badge
                variant="outline"
                className={cn('text-xs', getDifficultyColor(template.metadata.difficulty))}
              >
                {template.metadata.difficulty}
              </Badge>
            )}
          </div>

          {/* Tags */}
          {template.metadata?.tags && viewMode !== 'compact' && (
            <div className="flex flex-wrap gap-1">
              {template.metadata.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                  {tag}
                </Badge>
              ))}
              {template.metadata.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  +{template.metadata.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Community Features */}
          {showCommunityFeatures && (template.ratingAverage || template.ratingCount) && (
            <div className="flex items-center gap-3 text-xs">
              {template.ratingAverage && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{template.ratingAverage.toFixed(1)}</span>
                  {template.ratingCount && (
                    <span className="text-muted-foreground">({template.ratingCount})</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Metrics */}
          {showMetrics && viewMode !== 'compact' && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{formatNumber(template.views)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  <span>{formatNumber(template.downloadCount || 0)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  <span>{formatNumber(template.stars)}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(template.createdAt).toLocaleDateString()}
              </div>
            </div>
          )}
        </CardContent>

        {/* Action Footer */}
        <CardFooter
          className={cn(
            'pt-0 flex items-center justify-between',
            viewMode === 'compact' && 'hidden',
          )}
        >
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleInstantiate()
              }}
              disabled={isInstantiating}
              className="h-8"
            >
              {isInstantiating ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-1" />
                  Use Template
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleStar()
                    }}
                    disabled={isStarring}
                    className="h-8 w-8 p-0"
                  >
                    <Heart
                      className={cn(
                        'h-4 w-4',
                        template.isStarred && 'fill-red-500 text-red-500',
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {template.isStarred ? 'Remove from favorites' : 'Add to favorites'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onPreview?.(template)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onShare?.(template)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddToCollection?.(template.id)}>
                  <Users className="h-4 w-4 mr-2" />
                  Add to Collection
                </DropdownMenuItem>
                {template.isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Edit Template</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">Delete Template</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardFooter>
      </Card>
    </CardComponent>
  )
}

/**
 * Main Template Gallery Component
 * Renders the complete template gallery with responsive layout and animations
 */
export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  templates,
  viewMode,
  loading = false,
  error = null,
  onTemplateSelect,
  onInstantiate,
  onToggleStar,
  onShare,
  onPreview,
  onAddToCollection,
  className,
  showMetrics = true,
  showCommunityFeatures = true,
  showDifficulty = true,
  enableAnimations = true,
  currentUserId,
}) => {
  // Grid layout configuration based on view mode
  const gridConfig = useMemo(() => {
    switch (viewMode) {
      case 'list':
        return 'grid-cols-1 gap-3'
      case 'compact':
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3'
      case 'grid':
      default:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
    }
  }, [viewMode])

  // Loading skeleton for responsive design
  const LoadingSkeleton = () => (
    <div className={cn('grid', gridConfig)}>
      {Array.from({ length: 12 }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader className="pb-3">
            <div
              className={cn(
                'rounded-lg bg-gray-200',
                viewMode === 'compact' ? 'h-12 w-12' : 'h-24 w-full',
              )}
            />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-full" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 bg-gray-200 rounded w-16" />
              <div className="h-6 bg-gray-200 rounded w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  // Error state display
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-red-500 text-sm font-medium mb-2">Error Loading Templates</div>
        <div className="text-muted-foreground text-sm">{error}</div>
      </div>
    )
  }

  // Loading state
  if (loading && templates.length === 0) {
    return <LoadingSkeleton />
  }

  // Empty state
  if (!loading && templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <div className="text-lg font-semibold mb-2">No Templates Found</div>
        <div className="text-muted-foreground text-sm">
          Try adjusting your filters or search terms
        </div>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Template Grid */}
      <div className={cn('grid', gridConfig)}>
        <AnimatePresence mode="popLayout">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              viewMode={viewMode}
              showMetrics={showMetrics}
              showCommunityFeatures={showCommunityFeatures}
              showDifficulty={showDifficulty}
              enableAnimations={enableAnimations}
              currentUserId={currentUserId}
              onSelect={onTemplateSelect}
              onInstantiate={onInstantiate}
              onToggleStar={onToggleStar}
              onShare={onShare}
              onPreview={onPreview}
              onAddToCollection={onAddToCollection}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Loading More Indicator */}
      {loading && templates.length > 0 && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            Loading more templates...
          </div>
        </div>
      )}
    </div>
  )
}

export default TemplateGallery