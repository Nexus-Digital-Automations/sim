/**
 * Universal Tool Adapter System - Text Display Component
 *
 * Specialized component for displaying formatted text content with
 * rich formatting, word count, and reading time estimation.
 */

'use client'

import React, { useState } from 'react'
import { Copy, Type, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import type { TextContent } from '../../types'

interface TextDisplayProps {
  content: TextContent
  onAction?: (action: string, params?: any) => void
  compact?: boolean
  className?: string
}

export function TextDisplay({ content, onAction, compact = false, className }: TextDisplayProps) {
  const [showFullText, setShowFullText] = useState(compact ? false : true)

  const estimatedReadingTime = Math.ceil((content.wordCount || 0) / 200) // 200 words per minute

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content.text)
      onAction?.('copy_success')
    } catch (error) {
      onAction?.('copy_error', { error })
    }
  }

  const displayText = showFullText || content.text.length <= 500
    ? content.text
    : `${content.text.substring(0, 500)}...`

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      {(content.title || content.wordCount) && (
        <div className="flex items-center justify-between mb-4">
          {content.title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {content.title}
            </h3>
          )}

          <div className="flex items-center gap-2">
            {content.wordCount && (
              <Badge variant="secondary" className="text-xs">
                <Type className="h-3 w-3 mr-1" />
                {content.wordCount} words
              </Badge>
            )}

            {estimatedReadingTime > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                {estimatedReadingTime} min read
              </Badge>
            )}

            <Button variant="ghost" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <Card className="border-0 shadow-none">
        <CardContent className="p-0">
          <div className={cn(
            'prose prose-sm dark:prose-invert max-w-none',
            content.format === 'rich' && 'prose-headings:text-gray-900 dark:prose-headings:text-gray-100'
          )}>
            {content.format === 'html' ? (
              <div dangerouslySetInnerHTML={{ __html: displayText }} />
            ) : (
              <div className="whitespace-pre-wrap font-geist-sans leading-relaxed text-gray-800 dark:text-gray-200">
                {displayText}
              </div>
            )}
          </div>

          {/* Show More/Less Button */}
          {content.text.length > 500 && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowFullText(!showFullText)
                  onAction?.(showFullText ? 'text_collapsed' : 'text_expanded')
                }}
              >
                {showFullText ? 'Show Less' : 'Show More'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      {content.description && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {content.description}
        </p>
      )}
    </div>
  )
}