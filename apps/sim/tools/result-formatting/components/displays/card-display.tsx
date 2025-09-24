/**
 * Universal Tool Adapter System - Card Display Component
 *
 * Rich card layout component with responsive design, interactive elements,
 * and flexible layouts for displaying structured object data.
 */

'use client'

import React, { useState } from 'react'
import { ExternalLink, Mail, Eye, MoreVertical, Grid, List, Columns } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
    setVisibleCards(prev => Math.min(prev + (compact ? 4 : 8), content.cards.length))
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
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          {content.title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {content.title}
            </h3>
          )}
          {content.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {content.description}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Showing {Math.min(visibleCards, content.cards.length)} of {content.cards.length} items
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={layout} onValueChange={handleLayoutChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">
                <div className="flex items-center gap-2">
                  <Grid className="h-4 w-4" />
                  Grid
                </div>
              </SelectItem>
              <SelectItem value="list">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  List
                </div>
              </SelectItem>
              <SelectItem value="masonry">
                <div className="flex items-center gap-2">
                  <Columns className="h-4 w-4" />
                  Masonry
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm">
            <LayoutIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cards Container */}
      <div
        className={cn(
          'gap-4',
          layout === 'grid' && 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          layout === 'list' && 'space-y-4',
          layout === 'masonry' && 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4'
        )}
        style={{
          gridTemplateColumns: layout === 'grid' && content.columns
            ? `repeat(${Math.min(content.columns, 4)}, minmax(0, 1fr))`
            : undefined
        }}
      >
        {content.cards.slice(0, visibleCards).map((card, index) => (
          <Card
            key={card.id}
            className={cn(
              'transition-all duration-200 hover:shadow-md hover:scale-[1.02]',
              layout === 'list' && 'flex flex-row',
              layout === 'masonry' && 'break-inside-avoid mb-4'
            )}
          >
            {/* Card Image */}
            {card.image && (
              <div className={cn(
                'overflow-hidden',
                layout === 'list' ? 'w-32 h-24 flex-shrink-0' : 'w-full h-48'
              )}>
                <img
                  src={card.image.url || `data:${card.image.mimeType};base64,${card.image.base64}`}
                  alt={card.image.alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}

            <div className="flex-1 flex flex-col">
              <CardHeader className={cn(
                'pb-3',
                layout === 'list' && card.image && 'pt-4'
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {card.title}
                    </CardTitle>
                    {card.subtitle && (
                      <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {card.subtitle}
                      </CardDescription>
                    )}
                  </div>

                  {card.actions && card.actions.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {card.actions.map((action, actionIndex) => (
                          <DropdownMenuItem
                            key={actionIndex}
                            onClick={() => handleCardAction(action.action, action.parameters)}
                            className={cn(
                              action.style === 'danger' && 'text-red-600 focus:text-red-600'
                            )}
                          >
                            {action.action === 'open_url' && <ExternalLink className="h-4 w-4 mr-2" />}
                            {action.action === 'compose_email' && <Mail className="h-4 w-4 mr-2" />}
                            {action.action === 'view_details' && <Eye className="h-4 w-4 mr-2" />}
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {card.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">
                    {card.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="flex-1 pt-0">
                {/* Fields */}
                {card.fields && card.fields.length > 0 && (
                  <div className={cn(
                    'space-y-2',
                    layout === 'list' && 'grid grid-cols-2 gap-2 space-y-0'
                  )}>
                    {card.fields.slice(0, layout === 'list' ? 4 : 6).map((field, fieldIndex) => (
                      <div key={fieldIndex} className="flex flex-col sm:flex-row sm:items-center gap-1">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {field.label}:
                        </span>
                        <div className="flex-1 min-w-0">
                          {field.type === 'url' ? (
                            <a
                              href={field.value}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline dark:text-blue-400 text-xs truncate block"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCardAction('field_url_clicked', { url: field.value, field: field.label })
                              }}
                            >
                              {field.value}
                            </a>
                          ) : field.type === 'email' ? (
                            <a
                              href={`mailto:${field.value}`}
                              className="text-blue-600 hover:underline dark:text-blue-400 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCardAction('field_email_clicked', { email: field.value, field: field.label })
                              }}
                            >
                              {field.value}
                            </a>
                          ) : field.type === 'tag' ? (
                            <Badge variant="secondary" className="text-xs">
                              {field.value}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate block">
                              {field.value}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {card.fields.length > (layout === 'list' ? 4 : 6) && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        +{card.fields.length - (layout === 'list' ? 4 : 6)} more fields
                      </div>
                    )}
                  </div>
                )}

                {/* Primary Actions */}
                {card.actions && card.actions.length > 0 && (
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {card.actions.slice(0, 2).map((action, actionIndex) => (
                      <Button
                        key={actionIndex}
                        variant={action.style === 'primary' ? 'default' : 'outline'}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCardAction(action.action, action.parameters)
                        }}
                        className={cn(
                          'text-xs',
                          action.style === 'danger' && 'bg-red-600 hover:bg-red-700 text-white'
                        )}
                      >
                        {action.action === 'open_url' && <ExternalLink className="h-3 w-3 mr-1" />}
                        {action.action === 'compose_email' && <Mail className="h-3 w-3 mr-1" />}
                        {action.action === 'view_details' && <Eye className="h-3 w-3 mr-1" />}
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
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={showMoreCards}>
            Show {Math.min(content.cards.length - visibleCards, compact ? 4 : 8)} More
            ({content.cards.length - visibleCards} remaining)
          </Button>
        </div>
      )}

      {/* Empty State */}
      {content.cards.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-gray-400 text-center">
              <Grid className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No cards to display
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No card data was found in the result
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}