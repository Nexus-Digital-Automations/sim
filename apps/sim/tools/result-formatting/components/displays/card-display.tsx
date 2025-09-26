/**
 * Universal Tool Adapter System - Card Display Component
 *
 * Rich card layout component with responsive design, interactive elements,
 * and flexible layouts for displaying structured object data.
 */

'use client'

import { useState } from 'react'
import { Columns, ExternalLink, Eye, Grid, List, Mail, MoreVertical } from 'lucide-react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { CardContent as CardContentType } from '../../types'

interface CardDisplayProps {
  content: CardContentType
  onAction?: (action: string, params?: any) => void
  compact?: boolean
  className?: string
}

export function CardDisplay({ content, onAction, compact = false, className }: CardDisplayProps) {
  const [layout, setLayout] = useState<CardContentType['layout']>(content.layout)
  const [visibleCards, setVisibleCards] = useState(compact ? 4 : 12)

  const handleCardAction = (action: string, parameters?: Record<string, any>) => {
    onAction?.(action, parameters)
  }

  const handleLayoutChange = (newLayout: string) => {
    setLayout(newLayout as CardContentType['layout'])
    onAction?.('layout_changed', { previousLayout: layout, newLayout })
  }

  const showMoreCards = () => {
    setVisibleCards((prev) => Math.min(prev + (compact ? 4 : 8), content.cards.length))
    onAction?.('cards_expanded', { newTotal: visibleCards })
  }

  const layoutIcons = {
    grid: Grid,
    list: List,
    masonry: Columns,
  }

  const LayoutIcon = layoutIcons[layout] || Grid

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Header */}
      <div className='flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
        <div>
          {content.title && (
            <h3 className='font-semibold text-gray-900 text-lg dark:text-gray-100'>
              {content.title}
            </h3>
          )}
          {content.description && (
            <p className='mt-1 text-gray-600 text-sm dark:text-gray-400'>{content.description}</p>
          )}
          <p className='mt-1 text-gray-500 text-xs dark:text-gray-500'>
            Showing {Math.min(visibleCards, content.cards.length)} of {content.cards.length} items
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <Select value={layout} onValueChange={handleLayoutChange}>
            <SelectTrigger className='w-32'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='grid'>
                <div className='flex items-center gap-2'>
                  <Grid className='h-4 w-4' />
                  Grid
                </div>
              </SelectItem>
              <SelectItem value='list'>
                <div className='flex items-center gap-2'>
                  <List className='h-4 w-4' />
                  List
                </div>
              </SelectItem>
              <SelectItem value='masonry'>
                <div className='flex items-center gap-2'>
                  <Columns className='h-4 w-4' />
                  Masonry
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button variant='outline' size='sm'>
            <LayoutIcon className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Cards Container */}
      <div
        className={cn(
          'gap-4',
          layout === 'grid' && 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          layout === 'list' && 'space-y-4',
          layout === 'masonry' && 'columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4'
        )}
        style={{
          gridTemplateColumns:
            layout === 'grid' && content.columns
              ? `repeat(${Math.min(content.columns, 4)}, minmax(0, 1fr))`
              : undefined,
        }}
      >
        {content.cards.slice(0, visibleCards).map((card, index) => (
          <Card
            key={card.id}
            className={cn(
              'transition-all duration-200 hover:scale-[1.02] hover:shadow-md',
              layout === 'list' && 'flex flex-row',
              layout === 'masonry' && 'mb-4 break-inside-avoid'
            )}
          >
            {/* Card Image */}
            {card.image && (
              <div
                className={cn(
                  'relative overflow-hidden',
                  layout === 'list' ? 'h-24 w-32 flex-shrink-0' : 'h-48 w-full'
                )}
              >
                <Image
                  src={card.image.url || `data:${card.image.mimeType};base64,${card.image.base64}`}
                  alt={card.image.alt}
                  fill
                  className='object-cover'
                  loading='lazy'
                />
              </div>
            )}

            <div className='flex flex-1 flex-col'>
              <CardHeader className={cn('pb-3', layout === 'list' && card.image && 'pt-4')}>
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0 flex-1'>
                    <CardTitle className='truncate font-semibold text-base text-gray-900 dark:text-gray-100'>
                      {card.title}
                    </CardTitle>
                    {card.subtitle && (
                      <CardDescription className='mt-1 text-gray-600 text-sm dark:text-gray-400'>
                        {card.subtitle}
                      </CardDescription>
                    )}
                  </div>

                  {card.actions && card.actions.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                          <MoreVertical className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        {card.actions.map((action, actionIndex) => (
                          <DropdownMenuItem
                            key={actionIndex}
                            onClick={() => handleCardAction(action.action, action.parameters)}
                            className={cn(
                              action.style === 'danger' && 'text-red-600 focus:text-red-600'
                            )}
                          >
                            {action.action === 'open_url' && (
                              <ExternalLink className='mr-2 h-4 w-4' />
                            )}
                            {action.action === 'compose_email' && <Mail className='mr-2 h-4 w-4' />}
                            {action.action === 'view_details' && <Eye className='mr-2 h-4 w-4' />}
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {card.description && (
                  <p className='mt-2 line-clamp-3 text-gray-600 text-sm dark:text-gray-400'>
                    {card.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className='flex-1 pt-0'>
                {/* Fields */}
                {card.fields && card.fields.length > 0 && (
                  <div
                    className={cn(
                      'space-y-2',
                      layout === 'list' && 'grid grid-cols-2 gap-2 space-y-0'
                    )}
                  >
                    {card.fields.slice(0, layout === 'list' ? 4 : 6).map((field, fieldIndex) => (
                      <div
                        key={fieldIndex}
                        className='flex flex-col gap-1 sm:flex-row sm:items-center'
                      >
                        <span className='flex-shrink-0 font-medium text-gray-500 text-xs dark:text-gray-400'>
                          {field.label}:
                        </span>
                        <div className='min-w-0 flex-1'>
                          {field.type === 'url' ? (
                            <a
                              href={field.value}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='block truncate text-blue-600 text-xs hover:underline dark:text-blue-400'
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCardAction('field_url_clicked', {
                                  url: field.value,
                                  field: field.label,
                                })
                              }}
                            >
                              {field.value}
                            </a>
                          ) : field.type === 'email' ? (
                            <a
                              href={`mailto:${field.value}`}
                              className='text-blue-600 text-xs hover:underline dark:text-blue-400'
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCardAction('field_email_clicked', {
                                  email: field.value,
                                  field: field.label,
                                })
                              }}
                            >
                              {field.value}
                            </a>
                          ) : field.type === 'tag' ? (
                            <Badge variant='secondary' className='text-xs'>
                              {field.value}
                            </Badge>
                          ) : (
                            <span className='block truncate text-gray-700 text-xs dark:text-gray-300'>
                              {field.value}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {card.fields.length > (layout === 'list' ? 4 : 6) && (
                      <div className='text-gray-500 text-xs dark:text-gray-400'>
                        +{card.fields.length - (layout === 'list' ? 4 : 6)} more fields
                      </div>
                    )}
                  </div>
                )}

                {/* Primary Actions */}
                {card.actions && card.actions.length > 0 && (
                  <div className='mt-4 flex flex-wrap gap-2'>
                    {card.actions.slice(0, 2).map((action, actionIndex) => (
                      <Button
                        key={actionIndex}
                        variant={action.style === 'primary' ? 'default' : 'outline'}
                        size='sm'
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCardAction(action.action, action.parameters)
                        }}
                        className={cn(
                          'text-xs',
                          action.style === 'danger' && 'bg-red-600 text-white hover:bg-red-700'
                        )}
                      >
                        {action.action === 'open_url' && <ExternalLink className='mr-1 h-3 w-3' />}
                        {action.action === 'compose_email' && <Mail className='mr-1 h-3 w-3' />}
                        {action.action === 'view_details' && <Eye className='mr-1 h-3 w-3' />}
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        ))}
      </div>

      {/* Load More Button */}
      {visibleCards < content.cards.length && (
        <div className='flex justify-center pt-4'>
          <Button variant='outline' onClick={showMoreCards}>
            Show {Math.min(content.cards.length - visibleCards, compact ? 4 : 8)} More (
            {content.cards.length - visibleCards} remaining)
          </Button>
        </div>
      )}

      {/* Empty State */}
      {content.cards.length === 0 && (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <div className='text-center text-gray-400'>
              <Grid className='mx-auto mb-4 h-12 w-12' />
              <h3 className='mb-2 font-medium text-gray-900 text-lg dark:text-gray-100'>
                No cards to display
              </h3>
              <p className='text-gray-500 text-sm dark:text-gray-400'>
                No card data was found in the result
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
