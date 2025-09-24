/**
 * Universal Tool Adapter System - Card Formatter
 *
 * Rich card formatter that converts object data into visually appealing card layouts
 * with structured information display and interactive elements.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { ToolResponse } from '@/tools/types'
import type {
  ResultFormatter,
  FormatContext,
  FormattedResult,
  CardContent,
  ImageContent,
  ResultFormat,
} from '../types'

const logger = createLogger('CardFormatter')

/**
 * Smart card formatter for rich object presentation
 */
export class CardFormatter implements ResultFormatter {
  id = 'card_formatter'
  name = 'Card Formatter'
  description = 'Converts object data into rich card layouts with interactive elements'
  supportedFormats: ResultFormat[] = ['card']
  priority = 75 // High priority for structured object data

  toolCompatibility = {
    preferredTools: [
      'contact_info',
      'product_info',
      'user_profile',
      'article_summary',
      'search_results',
      'social_media',
      'marketplace',
    ],
    outputTypes: ['object', 'array'],
  }

  /**
   * Check if this formatter can handle the result
   */
  canFormat(result: ToolResponse, context: FormatContext): boolean {
    if (!result.success || !result.output) return false

    const output = result.output

    // Check for card-suitable data
    if (Array.isArray(output)) {
      return output.length > 0 && output.every(item => this.isCardSuitable(item))
    }

    if (typeof output === 'object' && output !== null) {
      // Check for array-like data containers
      const dataKeys = ['results', 'items', 'data', 'entries', 'records']
      for (const key of dataKeys) {
        if (Array.isArray(output[key]) && output[key].length > 0) {
          return output[key].every((item: any) => this.isCardSuitable(item))
        }
      }

      // Check if single object is card-suitable
      return this.isCardSuitable(output)
    }

    return false
  }

  /**
   * Format the tool result into card presentation
   */
  async format(result: ToolResponse, context: FormatContext): Promise<FormattedResult> {
    const startTime = Date.now()

    try {
      logger.debug(`Formatting result as cards for tool: ${context.toolId}`)

      // Extract card data
      const cardData = this.extractCardData(result.output)
      if (!cardData || cardData.length === 0) {
        throw new Error('No card-suitable data found in result')
      }

      // Generate card content
      const cardContent = await this.generateCardContent(cardData, context)

      // Generate summary
      const summary = await this.generateSummary(result, context)

      // Create additional representations
      const representations = [
        {
          format: 'list' as ResultFormat,
          content: {
            type: 'list' as const,
            items: this.convertToListItems(cardData),
            listType: 'unordered' as const,
            title: 'List View',
            description: 'Card data in simple list format',
          },
          label: 'List View',
          priority: 60,
        },
        {
          format: 'table' as ResultFormat,
          content: {
            type: 'table' as const,
            columns: this.generateTableColumns(cardData),
            rows: cardData,
            title: 'Table View',
            description: 'Card data in tabular format',
          },
          label: 'Table View',
          priority: 50,
        },
      ]

      const processingTime = Date.now() - startTime

      return {
        originalResult: result,
        format: 'card',
        content: cardContent,
        summary,
        representations,
        metadata: {
          formattedAt: new Date().toISOString(),
          processingTime,
          version: '1.0.0',
          qualityScore: await this.calculateQualityScore(cardContent, cardData),
        },
      }

    } catch (error) {
      logger.error('Card formatting failed:', error)
      throw new Error(`Card formatting failed: ${(error as Error).message}`)
    }
  }

  /**
   * Generate natural language summary
   */
  async generateSummary(result: ToolResponse, context: FormatContext): Promise<{
    headline: string
    description: string
    highlights: string[]
    suggestions: string[]
  }> {
    try {
      const cardData = this.extractCardData(result.output)
      const cardCount = cardData?.length || 0

      const toolName = context.toolConfig.name || context.toolId

      return {
        headline: `${toolName} returned ${cardCount} item${cardCount === 1 ? '' : 's'}`,
        description: `Cards display structured information with ${this.getFieldSummary(cardData || [])}. ${this.generateDataInsights(cardData || [])}`,
        highlights: this.extractCardHighlights(cardData || []),
        suggestions: this.generateCardSuggestions(cardData || [], context),
      }

    } catch (error) {
      logger.error('Card summary generation failed:', error)

      return {
        headline: `${context.toolConfig.name || context.toolId} returned structured data`,
        description: 'The tool returned object data that has been formatted as interactive cards.',
        highlights: [],
        suggestions: ['Review each card for detailed information', 'Use actions if available'],
      }
    }
  }

  // Private methods

  private isCardSuitable(item: any): boolean {
    if (typeof item !== 'object' || item === null) return false

    const keys = Object.keys(item)
    if (keys.length < 2) return false

    // Look for card-friendly patterns
    const cardPatterns = {
      title: ['title', 'name', 'subject', 'headline', 'label'],
      description: ['description', 'summary', 'content', 'body', 'text'],
      image: ['image', 'photo', 'picture', 'thumbnail', 'avatar'],
      metadata: ['id', 'date', 'created', 'updated', 'author', 'category'],
    }

    // Check if item has at least a title-like field
    const hasTitleField = cardPatterns.title.some(pattern =>
      keys.some(key => key.toLowerCase().includes(pattern.toLowerCase()))
    )

    // Check if item has structured fields (not all primitive values)
    const structuredFieldCount = keys.filter(key => {
      const value = item[key]
      return value !== null && value !== undefined && String(value).length > 0
    }).length

    return hasTitleField && structuredFieldCount >= 2
  }

  private extractCardData(output: any): Record<string, any>[] | null {
    if (Array.isArray(output)) {
      return output.filter(item => this.isCardSuitable(item))
    }

    if (typeof output === 'object' && output !== null) {
      // Check for array-like data containers
      const dataKeys = ['results', 'items', 'data', 'entries', 'records']
      for (const key of dataKeys) {
        if (Array.isArray(output[key])) {
          const items = output[key].filter((item: any) => this.isCardSuitable(item))
          if (items.length > 0) return items
        }
      }

      // Single object case
      if (this.isCardSuitable(output)) {
        return [output]
      }
    }

    return null
  }

  private async generateCardContent(data: Record<string, any>[], context: FormatContext): Promise<CardContent> {
    const cards = data.map((item, index) => this.createCard(item, index, context))
    const layout = this.selectOptimalLayout(cards.length, context)

    return {
      type: 'card',
      title: `${context.toolConfig.name || context.toolId} Results`,
      description: `${cards.length} items displayed as interactive cards`,
      cards,
      layout,
      columns: this.calculateOptimalColumns(cards.length, layout),
    }
  }

  private createCard(item: Record<string, any>, index: number, context: FormatContext) {
    const cardId = item.id || item.uuid || `card-${index}`

    // Extract card elements
    const title = this.extractTitle(item)
    const subtitle = this.extractSubtitle(item)
    const description = this.extractDescription(item)
    const image = this.extractImage(item)
    const fields = this.extractFields(item)
    const actions = this.extractActions(item, context)

    return {
      id: String(cardId),
      title,
      subtitle,
      description,
      image,
      fields,
      actions,
    }
  }

  private extractTitle(item: Record<string, any>): string {
    const titleFields = ['title', 'name', 'subject', 'headline', 'label', 'summary']

    for (const field of titleFields) {
      const value = this.findFieldValue(item, field)
      if (value && String(value).trim().length > 0) {
        return String(value).substring(0, 100) // Limit title length
      }
    }

    // Fallback to first string field
    for (const [key, value] of Object.entries(item)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.substring(0, 100)
      }
    }

    return 'Untitled'
  }

  private extractSubtitle(item: Record<string, any>): string | undefined {
    const subtitleFields = ['subtitle', 'category', 'type', 'author', 'source', 'tag']

    for (const field of subtitleFields) {
      const value = this.findFieldValue(item, field)
      if (value && String(value).trim().length > 0) {
        return String(value).substring(0, 80)
      }
    }

    return undefined
  }

  private extractDescription(item: Record<string, any>): string | undefined {
    const descriptionFields = ['description', 'content', 'body', 'text', 'summary', 'excerpt']

    for (const field of descriptionFields) {
      const value = this.findFieldValue(item, field)
      if (value && String(value).trim().length > 0) {
        const desc = String(value)
        return desc.length > 300 ? desc.substring(0, 300) + '...' : desc
      }
    }

    return undefined
  }

  private extractImage(item: Record<string, any>): ImageContent | undefined {
    const imageFields = ['image', 'photo', 'picture', 'thumbnail', 'avatar', 'icon']

    for (const field of imageFields) {
      const value = this.findFieldValue(item, field)
      if (value && typeof value === 'string' && this.isImageUrl(value)) {
        return {
          type: 'image',
          url: value,
          mimeType: this.inferMimeType(value),
          alt: this.extractTitle(item),
          caption: this.extractSubtitle(item),
        }
      }
    }

    return undefined
  }

  private extractFields(item: Record<string, any>) {
    const excludedFields = new Set([
      'title', 'name', 'subject', 'headline', 'label',
      'subtitle', 'category', 'type', 'author', 'source',
      'description', 'content', 'body', 'text', 'summary',
      'image', 'photo', 'picture', 'thumbnail', 'avatar',
    ])

    const fields = Object.entries(item)
      .filter(([key, value]) =>
        !excludedFields.has(key.toLowerCase()) &&
        value !== null &&
        value !== undefined &&
        String(value).trim().length > 0
      )
      .map(([key, value]) => ({
        label: this.humanizeKey(key),
        value: this.formatFieldValue(value),
        type: this.determineFieldType(value) as 'text' | 'number' | 'date' | 'url' | 'email' | 'tag',
      }))
      .slice(0, 8) // Limit to 8 fields for readability

    return fields
  }

  private extractActions(item: Record<string, any>, context: FormatContext) {
    const actions: Array<{
      label: string
      action: string
      parameters?: Record<string, any>
      style?: 'primary' | 'secondary' | 'danger'
    }> = []

    // Look for URL fields that could be actions
    const urlFields = ['url', 'link', 'website', 'homepage']
    for (const field of urlFields) {
      const value = this.findFieldValue(item, field)
      if (value && typeof value === 'string' && this.isUrl(value)) {
        actions.push({
          label: 'Visit Link',
          action: 'open_url',
          parameters: { url: value },
          style: 'primary',
        })
        break
      }
    }

    // Look for email fields
    const emailFields = ['email', 'contact', 'mail']
    for (const field of emailFields) {
      const value = this.findFieldValue(item, field)
      if (value && typeof value === 'string' && this.isEmail(value)) {
        actions.push({
          label: 'Send Email',
          action: 'compose_email',
          parameters: { to: value },
          style: 'secondary',
        })
        break
      }
    }

    // Context-specific actions
    if (context.toolId.includes('search')) {
      if (item.id) {
        actions.push({
          label: 'View Details',
          action: 'view_details',
          parameters: { id: item.id },
          style: 'secondary',
        })
      }
    }

    return actions.slice(0, 3) // Limit to 3 actions
  }

  private findFieldValue(item: Record<string, any>, fieldName: string): any {
    // Exact match
    if (item.hasOwnProperty(fieldName)) return item[fieldName]

    // Case-insensitive match
    const keys = Object.keys(item)
    const matchingKey = keys.find(key => key.toLowerCase() === fieldName.toLowerCase())
    if (matchingKey) return item[matchingKey]

    // Partial match
    const partialMatchKey = keys.find(key =>
      key.toLowerCase().includes(fieldName.toLowerCase()) ||
      fieldName.toLowerCase().includes(key.toLowerCase())
    )
    if (partialMatchKey) return item[partialMatchKey]

    return null
  }

  private selectOptimalLayout(itemCount: number, context: FormatContext): CardContent['layout'] {
    if (context.displayMode === 'compact') return 'grid'
    if (itemCount === 1) return 'list'
    if (itemCount <= 4) return 'grid'

    return 'masonry' // Best for many items with varying content
  }

  private calculateOptimalColumns(itemCount: number, layout: CardContent['layout']): number {
    if (layout === 'list') return 1

    if (itemCount <= 2) return itemCount
    if (itemCount <= 6) return 2
    if (itemCount <= 12) return 3

    return 4 // Maximum columns for readability
  }

  private generateTableColumns(data: Record<string, any>[]) {
    if (data.length === 0) return []

    const allKeys = new Set<string>()
    data.forEach(item => Object.keys(item).forEach(key => allKeys.add(key)))

    return Array.from(allKeys).slice(0, 6).map(key => ({
      key,
      label: this.humanizeKey(key),
      type: this.determineFieldType(data[0][key]),
      sortable: true,
      filterable: true,
    }))
  }

  private convertToListItems(data: Record<string, any>[]) {
    return data.map((item, index) => ({
      id: String(item.id || `item-${index}`),
      title: this.extractTitle(item),
      description: this.extractDescription(item),
      metadata: {
        index,
        fieldCount: Object.keys(item).length,
      },
    }))
  }

  private getFieldSummary(data: Record<string, any>[]): string {
    if (data.length === 0) return 'no fields'

    const allKeys = new Set<string>()
    data.forEach(item => Object.keys(item).forEach(key => allKeys.add(key)))

    const avgFields = Math.round(data.reduce((sum, item) => sum + Object.keys(item).length, 0) / data.length)

    return `${allKeys.size} unique fields (avg ${avgFields} per item)`
  }

  private generateDataInsights(data: Record<string, any>[]): string {
    const insights: string[] = []

    // Check for images
    const itemsWithImages = data.filter(item => this.extractImage(item)).length
    if (itemsWithImages > 0) {
      insights.push(`${itemsWithImages} items have images`)
    }

    // Check for URLs
    const itemsWithUrls = data.filter(item =>
      Object.values(item).some(value =>
        typeof value === 'string' && this.isUrl(value)
      )
    ).length
    if (itemsWithUrls > 0) {
      insights.push(`${itemsWithUrls} items have actionable links`)
    }

    return insights.join(', ') + (insights.length > 0 ? '.' : '')
  }

  private extractCardHighlights(data: Record<string, any>[]): string[] {
    const highlights: string[] = []

    highlights.push(`${data.length} card${data.length === 1 ? '' : 's'}`)

    const itemsWithImages = data.filter(item => this.extractImage(item)).length
    if (itemsWithImages > 0) {
      highlights.push(`${itemsWithImages} with images`)
    }

    const itemsWithActions = data.filter(item => this.extractActions(item, {} as FormatContext).length > 0).length
    if (itemsWithActions > 0) {
      highlights.push(`${itemsWithActions} with actions`)
    }

    return highlights.slice(0, 3)
  }

  private generateCardSuggestions(data: Record<string, any>[], context: FormatContext): string[] {
    const suggestions: string[] = []

    // Standard card interactions
    suggestions.push('Click on cards to expand details')

    const hasActions = data.some(item => this.extractActions(item, context).length > 0)
    if (hasActions) {
      suggestions.push('Use action buttons for quick interactions')
    }

    // Layout suggestions
    if (data.length > 6) {
      suggestions.push('Switch to list view for easier scanning')
    }

    return suggestions.slice(0, 3)
  }

  // Utility methods

  private humanizeKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim()
  }

  private formatFieldValue(value: any): string {
    if (value === null || value === undefined) return 'N/A'

    if (typeof value === 'boolean') return value ? 'Yes' : 'No'

    if (typeof value === 'number') {
      return value % 1 === 0 ? value.toLocaleString() : value.toFixed(2)
    }

    if (Array.isArray(value)) {
      return value.length <= 3 ? value.join(', ') : `${value.slice(0, 3).join(', ')} +${value.length - 3} more`
    }

    if (typeof value === 'object') {
      return `{${Object.keys(value).length} fields}`
    }

    const stringValue = String(value)
    return stringValue.length > 50 ? stringValue.substring(0, 50) + '...' : stringValue
  }

  private determineFieldType(value: any): string {
    if (value === null || value === undefined) return 'text'
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'text'

    if (typeof value === 'string') {
      if (this.isEmail(value)) return 'email'
      if (this.isUrl(value)) return 'url'
      if (!isNaN(Date.parse(value))) return 'date'
    }

    return 'text'
  }

  private isImageUrl(url: string): boolean {
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)$/i
    return this.isUrl(url) && imageExtensions.test(url)
  }

  private isUrl(value: string): boolean {
    try {
      new URL(value)
      return value.startsWith('http')
    } catch {
      return false
    }
  }

  private isEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  private inferMimeType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    }
    return mimeTypes[extension || ''] || 'image/jpeg'
  }

  private async calculateQualityScore(content: CardContent, data: Record<string, any>[]): Promise<number> {
    let score = 0.7 // Base score for card formatting

    // Content richness
    const avgFieldsPerCard = data.reduce((sum, item) => sum + Object.keys(item).length, 0) / data.length
    if (avgFieldsPerCard > 3) score += 0.1

    // Visual elements
    const cardsWithImages = content.cards.filter(card => card.image).length
    if (cardsWithImages > 0) score += 0.1

    // Interactivity
    const cardsWithActions = content.cards.filter(card => card.actions && card.actions.length > 0).length
    if (cardsWithActions > 0) score += 0.1

    return Math.min(1.0, score)
  }
}