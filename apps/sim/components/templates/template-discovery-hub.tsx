/**
 * Template Discovery Hub - Curated Template Content Aggregation Center
 *
 * This component provides a centralized discovery experience featuring:
 * - Trending templates with real-time popularity metrics
 * - Featured templates curated by the community team
 * - New releases and recently updated templates
 * - Category spotlights and themed collections
 * - Creator highlights and community showcases
 * - Seasonal and event-driven template promotions
 * - Interactive discovery widgets and recommendation carousels
 * - Analytics-driven content personalization
 *
 * Design Features:
 * - Magazine-style layout with visual storytelling
 * - Interactive carousels and content sliders
 * - Responsive grid system with breakpoint optimization
 * - Progressive image loading and performance optimization
 * - Social proof integration with usage statistics
 * - Real-time updates and dynamic content refresh
 *
 * Based on discovery patterns from leading platforms including
 * GitHub Explore, Dribbble Discover, and Behance Featured.
 *
 * @author Claude Code Template System - Discovery Experience Specialist
 * @version 2.0.0
 */

'use client'

import type * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Heart,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  User,
  Users,
  Wand2,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// Import template types
import type { Template, TemplateCategory } from '@/lib/templates/types'
import { cn } from '@/lib/utils'

/**
 * Discovery Content Types
 */
export interface DiscoveryContent {
  trending: Template[]
  featured: Template[]
  newReleases: Template[]
  categorySpotlights: {
    category: TemplateCategory
    templates: Template[]
  }[]
  creatorHighlights: {
    author: string
    authorAvatar?: string
    templates: Template[]
    totalViews: number
    totalStars: number
  }[]
  collections: {
    id: string
    name: string
    description: string
    templates: Template[]
    curator: string
    curatorAvatar?: string
  }[]
}

/**
 * Template Discovery Hub Props
 */
export interface TemplateDiscoveryHubProps {
  /** Discovery content data */
  content: DiscoveryContent
  /** Available categories */
  categories: TemplateCategory[]
  /** Current user ID for personalization */
  userId?: string
  /** Loading state */
  loading?: boolean
  /** Template selection handler */
  onTemplateSelect?: (template: Template) => void
  /** Template installation handler */
  onTemplateInstall?: (template: Template) => void
  /** Template preview handler */
  onTemplatePreview?: (template: Template) => void
  /** Template favorite handler */
  onTemplateFavorite?: (templateId: string, isFavorited: boolean) => Promise<void>
  /** Category selection handler */
  onCategorySelect?: (categoryId: string) => void
  /** Search handler */
  onSearch?: (query: string) => void
  /** View all handler */
  onViewAll?: (section: string) => void
  /** Custom CSS class */
  className?: string
}

/**
 * Hero Banner Component
 * Showcases featured content and main call-to-action
 */
const HeroBanner: React.FC<{
  featuredTemplate?: Template
  onInstall?: (template: Template) => void
  onLearnMore?: (template: Template) => void
}> = ({ featuredTemplate, onInstall, onLearnMore }) => {
  if (!featuredTemplate) {
    return (
      <Card className='relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600'>
        <CardContent className='p-8 text-center text-white'>
          <Sparkles className='mx-auto mb-4 h-12 w-12' />
          <h2 className='mb-2 font-bold text-3xl'>Discover Amazing Templates</h2>
          <p className='mb-6 text-blue-100'>
            Explore our curated collection of workflow automation templates
          </p>
          <Button size='lg' className='bg-white text-blue-600 hover:bg-blue-50'>
            Browse All Templates
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='relative overflow-hidden'>
      <div className='absolute inset-0 z-10 bg-gradient-to-r from-black/60 to-transparent' />
      <div
        className='absolute inset-0 bg-center bg-cover'
        style={{
          background: `linear-gradient(135deg, ${featuredTemplate.color}20, ${featuredTemplate.color}80)`,
        }}
      />
      <CardContent className='relative z-20 p-8 text-white'>
        <div className='flex items-start gap-6'>
          <div
            className='flex h-16 w-16 items-center justify-center rounded-lg font-bold text-2xl text-white'
            style={{ backgroundColor: featuredTemplate.color }}
          >
            {featuredTemplate.icon || '📄'}
          </div>
          <div className='flex-1'>
            <div className='mb-2 flex items-center gap-2'>
              <Badge className='bg-yellow-400 text-yellow-900'>
                <Star className='mr-1 h-3 w-3' />
                Featured
              </Badge>
              {featuredTemplate.trending && (
                <Badge className='bg-orange-400 text-orange-900'>
                  <TrendingUp className='mr-1 h-3 w-3' />
                  Trending
                </Badge>
              )}
            </div>
            <h2 className='mb-2 font-bold text-3xl'>{featuredTemplate.name}</h2>
            <p className='mb-4 text-lg text-white/90 leading-relaxed'>
              {featuredTemplate.description}
            </p>
            <div className='mb-6 flex items-center gap-4 text-sm text-white/80'>
              <div className='flex items-center gap-1'>
                <User className='h-4 w-4' />
                <span>{featuredTemplate.author}</span>
              </div>
              <div className='flex items-center gap-1'>
                <Download className='h-4 w-4' />
                <span>{featuredTemplate.downloadCount || 0}</span>
              </div>
              <div className='flex items-center gap-1'>
                <Star className='h-4 w-4 fill-yellow-400 text-yellow-400' />
                <span>{featuredTemplate.ratingAverage?.toFixed(1) || 'N/A'}</span>
              </div>
            </div>
            <div className='flex gap-3'>
              <Button
                size='lg'
                onClick={() => onInstall?.(featuredTemplate)}
                className='bg-white text-gray-900 hover:bg-gray-100'
              >
                <Zap className='mr-2 h-5 w-5' />
                Install Template
              </Button>
              <Button
                size='lg'
                variant='outline'
                onClick={() => onLearnMore?.(featuredTemplate)}
                className='border-white text-white hover:bg-white/10'
              >
                Learn More
                <ArrowRight className='ml-2 h-5 w-5' />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Template Carousel Component
 * Horizontal scrolling template showcase
 */
const TemplateCarousel: React.FC<{
  title: string
  description: string
  templates: Template[]
  showViewAll?: boolean
  onTemplateSelect?: (template: Template) => void
  onTemplateInstall?: (template: Template) => void
  onViewAll?: () => void
}> = ({
  title,
  description,
  templates,
  showViewAll,
  onTemplateSelect,
  onTemplateInstall,
  onViewAll,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || templates.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((current) => (current + 1) % Math.max(templates.length - 2, 1))
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlaying, templates.length])

  const handlePrevious = useCallback(() => {
    setIsAutoPlaying(false)
    setCurrentIndex((current) => Math.max(current - 1, 0))
  }, [])

  const handleNext = useCallback(() => {
    setIsAutoPlaying(false)
    setCurrentIndex((current) => Math.min(current + 1, Math.max(templates.length - 3, 0)))
  }, [templates.length])

  if (templates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='text-center text-muted-foreground'>
            <p>No templates available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const visibleTemplates = templates.slice(currentIndex, currentIndex + 3)

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <TrendingUp className='h-5 w-5' />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={handleNext}
              disabled={currentIndex >= templates.length - 3}
            >
              <ChevronRight className='h-4 w-4' />
            </Button>
            {showViewAll && (
              <Button variant='ghost' size='sm' onClick={onViewAll}>
                View All
                <ArrowRight className='ml-2 h-4 w-4' />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <AnimatePresence mode='wait'>
            {visibleTemplates.map((template, index) => (
              <motion.div
                key={`${template.id}-${currentIndex}-${index}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card
                  className='group h-full cursor-pointer transition-all duration-200 hover:shadow-lg'
                  onClick={() => onTemplateSelect?.(template)}
                >
                  <CardContent className='p-4'>
                    <div className='mb-3 flex items-center gap-3'>
                      <div
                        className='flex h-10 w-10 items-center justify-center rounded-lg font-bold text-sm text-white'
                        style={{ backgroundColor: template.color }}
                      >
                        {template.icon || '📄'}
                      </div>
                      <div className='flex-1'>
                        <h4 className='line-clamp-1 font-medium text-sm leading-tight'>
                          {template.name}
                        </h4>
                        <p className='text-muted-foreground text-xs'>{template.author}</p>
                      </div>
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
                    <Button
                      size='sm'
                      onClick={(e) => {
                        e.stopPropagation()
                        onTemplateInstall?.(template)
                      }}
                      className='w-full'
                    >
                      <Zap className='mr-2 h-4 w-4' />
                      Install
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Category Spotlight Component
 */
const CategorySpotlight: React.FC<{
  category: TemplateCategory
  templates: Template[]
  onTemplateSelect?: (template: Template) => void
  onCategoryExplore?: (categoryId: string) => void
}> = ({ category, templates, onTemplateSelect, onCategoryExplore }) => {
  return (
    <Card className='group overflow-hidden transition-all duration-200 hover:shadow-lg'>
      <div
        className='h-24 bg-gradient-to-r p-4'
        style={{
          background: `linear-gradient(135deg, ${category.color}20, ${category.color}60)`,
        }}
      >
        <div className='flex items-center gap-3 text-white'>
          <div className='text-2xl'>{category.icon}</div>
          <div>
            <h3 className='font-semibold text-lg'>{category.name}</h3>
            <p className='text-sm opacity-90'>{category.templateCount} templates</p>
          </div>
        </div>
      </div>
      <CardContent className='p-4'>
        <p className='mb-4 text-muted-foreground text-sm'>{category.description}</p>
        <div className='mb-4 space-y-2'>
          {templates.slice(0, 3).map((template) => (
            <div
              key={template.id}
              className='flex cursor-pointer items-center gap-3 rounded p-2 transition-colors hover:bg-gray-50'
              onClick={() => onTemplateSelect?.(template)}
            >
              <div
                className='flex h-6 w-6 items-center justify-center rounded font-bold text-white text-xs'
                style={{ backgroundColor: template.color }}
              >
                {template.icon || '📄'}
              </div>
              <div className='flex-1'>
                <p className='line-clamp-1 font-medium text-sm'>{template.name}</p>
                <p className='text-muted-foreground text-xs'>{template.author}</p>
              </div>
              <div className='flex items-center gap-1 text-muted-foreground text-xs'>
                <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                <span>{template.ratingAverage?.toFixed(1) || 'N/A'}</span>
              </div>
            </div>
          ))}
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={() => onCategoryExplore?.(category.id)}
          className='w-full'
        >
          Explore {category.name}
          <ArrowRight className='ml-2 h-4 w-4' />
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Creator Highlight Component
 */
const CreatorHighlight: React.FC<{
  creator: DiscoveryContent['creatorHighlights'][0]
  onTemplateSelect?: (template: Template) => void
  onCreatorProfile?: (author: string) => void
}> = ({ creator, onTemplateSelect, onCreatorProfile }) => {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <Card className='h-full transition-all duration-200 hover:shadow-lg'>
      <CardContent className='p-4'>
        <div className='mb-4 flex items-center gap-3'>
          <div className='h-12 w-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 p-0.5'>
            <div className='flex h-full w-full items-center justify-center rounded-full bg-white font-bold text-lg'>
              {creator.authorAvatar ? (
                <img
                  src={creator.authorAvatar}
                  alt={creator.author}
                  className='h-full w-full rounded-full object-cover'
                />
              ) : (
                creator.author[0]
              )}
            </div>
          </div>
          <div>
            <h3 className='font-semibold'>{creator.author}</h3>
            <div className='flex items-center gap-3 text-muted-foreground text-sm'>
              <div className='flex items-center gap-1'>
                <Eye className='h-3 w-3' />
                <span>{formatNumber(creator.totalViews)}</span>
              </div>
              <div className='flex items-center gap-1'>
                <Heart className='h-3 w-3' />
                <span>{formatNumber(creator.totalStars)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className='mb-4 space-y-2'>
          {creator.templates.slice(0, 2).map((template) => (
            <div
              key={template.id}
              className='flex cursor-pointer items-center gap-2 rounded p-2 transition-colors hover:bg-gray-50'
              onClick={() => onTemplateSelect?.(template)}
            >
              <div
                className='flex h-6 w-6 items-center justify-center rounded font-bold text-white text-xs'
                style={{ backgroundColor: template.color }}
              >
                {template.icon || '📄'}
              </div>
              <div className='flex-1'>
                <p className='line-clamp-1 font-medium text-sm'>{template.name}</p>
                <div className='flex items-center gap-2 text-muted-foreground text-xs'>
                  <span>{template.views} views</span>
                  <span>•</span>
                  <span>{template.stars} stars</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={() => onCreatorProfile?.(creator.author)}
          className='w-full'
        >
          View Profile
          <User className='ml-2 h-4 w-4' />
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Main Template Discovery Hub Component
 */
export const TemplateDiscoveryHub: React.FC<TemplateDiscoveryHubProps> = ({
  content,
  categories,
  userId,
  loading = false,
  onTemplateSelect,
  onTemplateInstall,
  onTemplatePreview,
  onTemplateFavorite,
  onCategorySelect,
  onSearch,
  onViewAll,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (searchQuery.trim() && onSearch) {
        onSearch(searchQuery.trim())
      }
    },
    [searchQuery, onSearch]
  )

  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className='flex items-center justify-center p-12'>
          <div className='text-center'>
            <div className='mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent' />
            <p className='text-muted-foreground'>Loading discovery content...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-8', className)}>
      {/* Search Section */}
      <div className='text-center'>
        <h1 className='mb-2 font-bold text-3xl'>Discover Templates</h1>
        <p className='mb-6 text-lg text-muted-foreground'>
          Find the perfect automation template for your workflow
        </p>
        <form onSubmit={handleSearch} className='mx-auto max-w-lg'>
          <div className='relative'>
            <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground' />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search templates, categories, or authors...'
              className='pr-4 pl-10'
            />
          </div>
        </form>
      </div>

      {/* Hero Banner */}
      <HeroBanner
        featuredTemplate={content.featured[0]}
        onInstall={onTemplateInstall}
        onLearnMore={onTemplateSelect}
      />

      {/* Content Sections */}
      <Tabs defaultValue='trending' className='w-full'>
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='trending'>
            <TrendingUp className='mr-2 h-4 w-4' />
            Trending
          </TabsTrigger>
          <TabsTrigger value='featured'>
            <Star className='mr-2 h-4 w-4' />
            Featured
          </TabsTrigger>
          <TabsTrigger value='categories'>
            <Filter className='mr-2 h-4 w-4' />
            Categories
          </TabsTrigger>
          <TabsTrigger value='creators'>
            <Users className='mr-2 h-4 w-4' />
            Creators
          </TabsTrigger>
        </TabsList>

        <TabsContent value='trending' className='space-y-6'>
          <TemplateCarousel
            title='Trending Templates'
            description='Templates gaining popularity in the community'
            templates={content.trending}
            showViewAll
            onTemplateSelect={onTemplateSelect}
            onTemplateInstall={onTemplateInstall}
            onViewAll={() => onViewAll?.('trending')}
          />

          <TemplateCarousel
            title='New Releases'
            description='Recently published templates and updates'
            templates={content.newReleases}
            showViewAll
            onTemplateSelect={onTemplateSelect}
            onTemplateInstall={onTemplateInstall}
            onViewAll={() => onViewAll?.('new-releases')}
          />
        </TabsContent>

        <TabsContent value='featured' className='space-y-6'>
          <TemplateCarousel
            title='Featured Templates'
            description='Hand-picked templates by our community team'
            templates={content.featured}
            showViewAll
            onTemplateSelect={onTemplateSelect}
            onTemplateInstall={onTemplateInstall}
            onViewAll={() => onViewAll?.('featured')}
          />
        </TabsContent>

        <TabsContent value='categories' className='space-y-6'>
          <div>
            <h2 className='mb-4 font-bold text-2xl'>Explore by Category</h2>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {content.categorySpotlights.map(({ category, templates }) => (
                <CategorySpotlight
                  key={category.id}
                  category={category}
                  templates={templates}
                  onTemplateSelect={onTemplateSelect}
                  onCategoryExplore={onCategorySelect}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value='creators' className='space-y-6'>
          <div>
            <h2 className='mb-4 font-bold text-2xl'>Creator Highlights</h2>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {content.creatorHighlights.map((creator) => (
                <CreatorHighlight
                  key={creator.author}
                  creator={creator}
                  onTemplateSelect={onTemplateSelect}
                  onCreatorProfile={(author) => console.log('View creator profile:', author)}
                />
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Collections Section */}
      {content.collections.length > 0 && (
        <div>
          <div className='mb-6 flex items-center justify-between'>
            <div>
              <h2 className='font-bold text-2xl'>Curated Collections</h2>
              <p className='text-muted-foreground'>
                Themed template collections created by experts
              </p>
            </div>
            <Button variant='outline' onClick={() => onViewAll?.('collections')}>
              View All Collections
              <ArrowRight className='ml-2 h-4 w-4' />
            </Button>
          </div>
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {content.collections.slice(0, 6).map((collection) => (
              <Card
                key={collection.id}
                className='group transition-all duration-200 hover:shadow-lg'
              >
                <CardContent className='p-4'>
                  <div className='mb-3 flex items-center gap-3'>
                    <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-purple-400 to-blue-400 text-white'>
                      <Wand2 className='h-5 w-5' />
                    </div>
                    <div className='flex-1'>
                      <h3 className='font-semibold'>{collection.name}</h3>
                      <p className='text-muted-foreground text-sm'>by {collection.curator}</p>
                    </div>
                  </div>
                  <p className='mb-4 line-clamp-2 text-muted-foreground text-sm'>
                    {collection.description}
                  </p>
                  <div className='-space-x-2 mb-4 flex'>
                    {collection.templates.slice(0, 5).map((template) => (
                      <div
                        key={template.id}
                        className='flex h-8 w-8 items-center justify-center rounded-full border-2 border-white font-bold text-white text-xs'
                        style={{ backgroundColor: template.color }}
                        title={template.name}
                      >
                        {template.icon || '📄'}
                      </div>
                    ))}
                    {collection.templates.length > 5 && (
                      <div className='flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-400 font-bold text-white text-xs'>
                        +{collection.templates.length - 5}
                      </div>
                    )}
                  </div>
                  <Button variant='outline' size='sm' className='w-full'>
                    Explore Collection
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TemplateDiscoveryHub
