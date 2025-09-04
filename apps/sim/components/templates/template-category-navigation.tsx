/**
 * Template Category Navigation - Intuitive Category Browsing Interface
 *
 * This component provides comprehensive category-based navigation including:
 * - Hierarchical category tree with expandable subcategories
 * - Visual category cards with icons, colors, and template counts
 * - Breadcrumb navigation for current category path
 * - Category search and filtering capabilities
 * - Popular categories and trending sections
 * - Responsive design for mobile and desktop
 * - Smooth animations and hover effects
 * - Accessibility-compliant navigation patterns
 *
 * Design Features:
 * - Clean, modern category card design with brand colors
 * - Intuitive navigation with clear visual hierarchy
 * - Quick access to popular and trending categories
 * - Mobile-first responsive layout with collapsible sections
 * - Keyboard navigation and screen reader support
 * - Smooth transitions and micro-animations
 * - Template count indicators and progress visualization
 *
 * @author Claude Code Template System - UI/UX Specialist
 * @version 2.0.0
 */

'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Grid,
  Home,
  List,
  Search,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { TemplateCategory } from '@/lib/templates/types'
import { cn } from '@/lib/utils'

/**
 * Template Category Navigation Props Interface
 */
export interface TemplateCategoryNavigationProps {
  /** Available categories for navigation */
  categories: TemplateCategory[]
  /** Currently selected category */
  selectedCategory: string | null
  /** Category selection handler */
  onCategorySelect: (categoryId: string | null) => void
  /** Category search handler */
  onCategorySearch?: (query: string) => void
  /** Show template counts for each category */
  showTemplateCounts?: boolean
  /** Show trending indicators */
  showTrending?: boolean
  /** Show popular categories section */
  showPopularCategories?: boolean
  /** Navigation view mode */
  viewMode: 'tree' | 'grid' | 'list'
  /** Loading state */
  loading?: boolean
  /** Compact mode for sidebar usage */
  compact?: boolean
  /** Custom CSS class name */
  className?: string
}

/**
 * Category Card Props Interface
 */
interface CategoryCardProps {
  category: TemplateCategory
  selected: boolean
  viewMode: 'tree' | 'grid' | 'list'
  compact: boolean
  showCount: boolean
  showTrending: boolean
  onClick: () => void
  onSubcategoryClick?: (subcategoryId: string) => void
}

/**
 * Individual Category Card Component
 */
const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  selected,
  viewMode,
  compact,
  showCount,
  showTrending,
  onClick,
  onSubcategoryClick,
}) => {
  const [expanded, setExpanded] = useState(selected)

  const hasSubcategories = category.subcategories && category.subcategories.length > 0

  const formatCount = useCallback((count: number): string => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }, [])

  // Animation variants for smooth transitions
  const cardVariants = {
    hover: {
      scale: viewMode === 'grid' ? 1.02 : 1,
      y: viewMode === 'grid' ? -2 : 0,
      transition: { duration: 0.2 },
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1 },
    },
  }

  const contentVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: 'auto', transition: { duration: 0.3 } },
  }

  return (
    <motion.div
      variants={cardVariants}
      whileHover='hover'
      whileTap='tap'
      className={cn(
        'group relative',
        viewMode === 'tree' && 'w-full',
        viewMode === 'grid' && 'aspect-square',
        viewMode === 'list' && 'w-full'
      )}
    >
      <Card
        className={cn(
          'h-full cursor-pointer border-2 transition-all duration-200 hover:shadow-md',
          selected
            ? 'border-blue-500 bg-blue-50/50 shadow-sm'
            : 'border-gray-200 hover:border-gray-300',
          compact && 'border-0 shadow-none hover:bg-muted/50'
        )}
        onClick={onClick}
      >
        <CardContent
          className={cn(
            'flex h-full p-4',
            viewMode === 'grid' && 'flex-col items-center justify-center text-center',
            viewMode === 'list' && 'flex-row items-center',
            viewMode === 'tree' && 'flex-row items-center',
            compact && 'p-3'
          )}
        >
          {/* Category Icon */}
          <div
            className={cn(
              'flex flex-shrink-0 items-center justify-center rounded-lg font-bold text-white',
              viewMode === 'grid' ? 'mb-3 h-12 w-12 text-2xl' : 'h-10 w-10 text-lg',
              viewMode === 'list' && 'mr-3',
              viewMode === 'tree' && 'mr-3',
              compact && 'mr-2 h-8 w-8 text-base'
            )}
            style={{ backgroundColor: category.color }}
          >
            {category.icon && (
              <span role='img' aria-label={category.name}>
                {category.icon === 'briefcase' && '💼'}
                {category.icon === 'database' && '🗄️'}
                {category.icon === 'server' && '🖥️'}
                {category.icon === 'share-2' && '📱'}
                {category.icon === 'shopping-cart' && '🛒'}
                {category.icon === 'dollar-sign' && '💰'}
                {category.icon === 'users' && '👥'}
                {category.icon === 'graduation-cap' && '🎓'}
                {![
                  'briefcase',
                  'database',
                  'server',
                  'share-2',
                  'shopping-cart',
                  'dollar-sign',
                  'users',
                  'graduation-cap',
                ].includes(category.icon) && '📁'}
              </span>
            )}
          </div>

          {/* Category Content */}
          <div
            className={cn(
              'min-w-0 flex-1',
              viewMode === 'grid' && 'text-center',
              viewMode === 'list' && 'flex items-center justify-between',
              viewMode === 'tree' && 'flex items-center justify-between'
            )}
          >
            <div
              className={cn(
                'min-w-0 flex-1',
                viewMode === 'list' && 'mr-3',
                viewMode === 'tree' && 'mr-3'
              )}
            >
              <h3
                className={cn(
                  'line-clamp-1 font-semibold text-gray-900',
                  viewMode === 'grid' ? 'mb-1 text-sm' : 'text-sm',
                  compact && 'text-xs'
                )}
              >
                {category.name}
              </h3>
              {!compact && category.description && (
                <p
                  className={cn(
                    'line-clamp-2 text-muted-foreground text-xs leading-relaxed',
                    viewMode === 'grid' && 'mb-2'
                  )}
                >
                  {category.description}
                </p>
              )}
            </div>

            {/* Category Metadata */}
            <div
              className={cn(
                'flex flex-shrink-0 items-center gap-2',
                viewMode === 'grid' && 'mt-auto justify-center',
                viewMode === 'list' && 'flex-col items-end',
                viewMode === 'tree' && 'flex-col items-end'
              )}
            >
              {/* Template Count */}
              {showCount && (
                <Badge
                  variant='secondary'
                  className={cn('font-medium text-xs', compact && 'px-1.5 py-0.5 text-xs')}
                >
                  {formatCount(category.templateCount)}
                </Badge>
              )}

              {/* Trending Indicator */}
              {showTrending && category.templateCount > 50 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant='outline' className='border-orange-600 text-orange-600'>
                        <TrendingUp className='h-3 w-3' />
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Trending Category</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Featured Indicator */}
              {category.templateCount > 100 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant='outline' className='border-yellow-600 text-yellow-600'>
                        <Star className='h-3 w-3' />
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Popular Category</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Subcategory Indicator */}
              {viewMode === 'tree' && hasSubcategories && (
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-6 w-6 p-0'
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpanded(!expanded)
                  }}
                >
                  {expanded ? (
                    <ChevronDown className='h-3 w-3' />
                  ) : (
                    <ChevronRight className='h-3 w-3' />
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subcategories (Tree View Only) */}
      {viewMode === 'tree' && hasSubcategories && (
        <AnimatePresence>
          {expanded && (
            <motion.div
              variants={contentVariants}
              initial='hidden'
              animate='visible'
              exit='hidden'
              className='mt-2 ml-6 space-y-2 overflow-hidden'
            >
              {category.subcategories?.map((subcategory) => (
                <CategoryCard
                  key={subcategory.id}
                  category={subcategory}
                  selected={false}
                  viewMode='tree'
                  compact={true}
                  showCount={showCount}
                  showTrending={false}
                  onClick={() => onSubcategoryClick?.(subcategory.id)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  )
}

/**
 * Breadcrumb Navigation Component
 */
interface BreadcrumbNavigationProps {
  selectedCategory: string | null
  categories: TemplateCategory[]
  onCategorySelect: (categoryId: string | null) => void
}

const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  selectedCategory,
  categories,
  onCategorySelect,
}) => {
  const breadcrumbPath = useMemo(() => {
    if (!selectedCategory) return []

    // Find category and build path
    const path: Array<{ id: string; name: string }> = []

    // Check main categories
    for (const category of categories) {
      if (category.id === selectedCategory) {
        path.push({ id: category.id, name: category.name })
        break
      }

      // Check subcategories
      if (category.subcategories) {
        for (const subcategory of category.subcategories) {
          if (subcategory.id === selectedCategory) {
            path.push({ id: category.id, name: category.name })
            path.push({ id: subcategory.id, name: subcategory.name })
            break
          }
        }
      }
    }

    return path
  }, [selectedCategory, categories])

  if (breadcrumbPath.length === 0) return null

  return (
    <div className='mb-4 flex items-center gap-2 text-muted-foreground text-sm'>
      <Button
        variant='ghost'
        size='sm'
        className='h-8 px-2 text-muted-foreground hover:text-foreground'
        onClick={() => onCategorySelect(null)}
      >
        <Home className='mr-1 h-3 w-3' />
        All Categories
      </Button>
      {breadcrumbPath.map((item, index) => (
        <React.Fragment key={item.id}>
          <ChevronRight className='h-3 w-3' />
          <Button
            variant='ghost'
            size='sm'
            className={cn(
              'h-8 px-2',
              index === breadcrumbPath.length - 1
                ? 'font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onCategorySelect(item.id)}
          >
            {item.name}
          </Button>
        </React.Fragment>
      ))}
    </div>
  )
}

/**
 * Popular Categories Section Component
 */
interface PopularCategoriesSectionProps {
  categories: TemplateCategory[]
  onCategorySelect: (categoryId: string) => void
  compact: boolean
}

const PopularCategoriesSection: React.FC<PopularCategoriesSectionProps> = ({
  categories,
  onCategorySelect,
  compact,
}) => {
  const popularCategories = useMemo(() => {
    return categories
      .filter((cat) => cat.templateCount > 0)
      .sort((a, b) => b.templateCount - a.templateCount)
      .slice(0, compact ? 3 : 6)
  }, [categories, compact])

  if (popularCategories.length === 0) return null

  return (
    <div className='space-y-3'>
      <div className='flex items-center gap-2'>
        <Sparkles className='h-4 w-4 text-yellow-500' />
        <h3 className='font-medium text-sm'>Popular Categories</h3>
      </div>
      <div className='space-y-2'>
        {popularCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategorySelect(category.id)}
            className='flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted/50'
          >
            <div
              className='flex h-6 w-6 items-center justify-center rounded text-white text-xs'
              style={{ backgroundColor: category.color }}
            >
              {category.icon && (
                <span role='img' aria-label={category.name}>
                  {category.icon === 'briefcase' && '💼'}
                  {category.icon === 'database' && '🗄️'}
                  {category.icon === 'server' && '🖥️'}
                  {category.icon === 'share-2' && '📱'}
                  {category.icon === 'shopping-cart' && '🛒'}
                  {category.icon === 'dollar-sign' && '💰'}
                  {category.icon === 'users' && '👥'}
                  {category.icon === 'graduation-cap' && '🎓'}
                  {![
                    'briefcase',
                    'database',
                    'server',
                    'share-2',
                    'shopping-cart',
                    'dollar-sign',
                    'users',
                    'graduation-cap',
                  ].includes(category.icon) && '📁'}
                </span>
              )}
            </div>
            <div className='min-w-0 flex-1'>
              <div className='truncate font-medium text-sm'>{category.name}</div>
              <div className='text-muted-foreground text-xs'>
                {category.templateCount} templates
              </div>
            </div>
            <ArrowRight className='h-3 w-3 text-muted-foreground' />
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Main Template Category Navigation Component
 */
export const TemplateCategoryNavigation: React.FC<TemplateCategoryNavigationProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  onCategorySearch,
  showTemplateCounts = true,
  showTrending = true,
  showPopularCategories = true,
  viewMode,
  loading = false,
  compact = false,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewModeState, setViewModeState] = useState(viewMode)

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories

    return categories.filter(
      (category) =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.popularTags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }, [categories, searchQuery])

  // Handle search input changes
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value)
      onCategorySearch?.(value)
    },
    [onCategorySearch]
  )

  // Handle category selection
  const handleCategorySelect = useCallback(
    (categoryId: string | null) => {
      onCategorySelect(categoryId)
    },
    [onCategorySelect]
  )

  // Handle subcategory selection
  const handleSubcategorySelect = useCallback(
    (subcategoryId: string) => {
      onCategorySelect(subcategoryId)
    },
    [onCategorySelect]
  )

  // Grid layout configuration
  const gridConfig = useMemo(() => {
    switch (viewModeState) {
      case 'grid':
        return compact
          ? 'grid-cols-2 gap-3'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
      case 'list':
        return 'grid-cols-1 gap-2'
      case 'tree':
        return 'space-y-2'
      default:
        return 'grid-cols-1 gap-2'
    }
  }, [viewModeState, compact])

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className='animate-pulse space-y-2'>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className='h-16 rounded-lg bg-muted' />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and View Controls */}
      {!compact && (
        <div className='space-y-4'>
          <div className='relative'>
            <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search categories...'
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className='pl-9'
            />
          </div>

          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-1 rounded-md bg-muted p-1'>
              <Button
                variant={viewModeState === 'tree' ? 'default' : 'ghost'}
                size='sm'
                onClick={() => setViewModeState('tree')}
                className='h-8 px-3'
              >
                <List className='h-4 w-4' />
              </Button>
              <Button
                variant={viewModeState === 'grid' ? 'default' : 'ghost'}
                size='sm'
                onClick={() => setViewModeState('grid')}
                className='h-8 px-3'
              >
                <Grid className='h-4 w-4' />
              </Button>
            </div>
            <div className='text-muted-foreground text-sm'>
              {filteredCategories.length} categor{filteredCategories.length !== 1 ? 'ies' : 'y'}
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <BreadcrumbNavigation
        selectedCategory={selectedCategory}
        categories={categories}
        onCategorySelect={handleCategorySelect}
      />

      {/* Popular Categories (Compact Mode) */}
      {compact && showPopularCategories && (
        <>
          <PopularCategoriesSection
            categories={categories}
            onCategorySelect={handleCategorySelect}
            compact={compact}
          />
          <Separator />
        </>
      )}

      {/* Category Navigation */}
      <ScrollArea className={compact ? 'h-96' : 'h-full'}>
        <div className={cn(viewModeState === 'tree' ? 'space-y-2' : `grid ${gridConfig}`, 'pb-4')}>
          {filteredCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              selected={selectedCategory === category.id}
              viewMode={viewModeState}
              compact={compact}
              showCount={showTemplateCounts}
              showTrending={showTrending}
              onClick={() => handleCategorySelect(category.id)}
              onSubcategoryClick={handleSubcategorySelect}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredCategories.length === 0 && (
          <div className='flex items-center justify-center py-12 text-center'>
            <div>
              <Search className='mx-auto mb-4 h-8 w-8 text-muted-foreground' />
              <h3 className='mb-2 font-semibold'>No categories found</h3>
              <p className='text-muted-foreground text-sm'>Try adjusting your search terms</p>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Popular Categories (Full Mode) */}
      {!compact && showPopularCategories && searchQuery === '' && (
        <>
          <Separator />
          <PopularCategoriesSection
            categories={categories}
            onCategorySelect={handleCategorySelect}
            compact={false}
          />
        </>
      )}
    </div>
  )
}

export default TemplateCategoryNavigation
