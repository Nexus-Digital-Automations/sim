/**
 * Universal Tool Adapter System - Image Formatter
 *
 * Specialized image formatter that handles visual content with metadata,
 * thumbnails, and interactive viewing capabilities.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { ToolResponse } from '@/tools/types'
import type {
  FormatContext,
  FormattedResult,
  ImageContent,
  ResultFormat,
  ResultFormatter,
} from '../types'

const logger = createLogger('ImageFormatter')

/**
 * Smart image formatter for visual content presentation
 */
export class ImageFormatter implements ResultFormatter {
  id = 'image_formatter'
  name = 'Image Formatter'
  description = 'Handles image content with metadata, thumbnails, and interactive viewing'
  supportedFormats: ResultFormat[] = ['image']
  priority = 90 // Very high priority for image content

  toolCompatibility = {
    preferredTools: [
      'image_generator',
      'screenshot',
      'vision',
      'image_analysis',
      'browser_capture',
      'photo_search',
    ],
    outputTypes: ['string', 'object'],
  }

  /**
   * Check if this formatter can handle the result
   */
  canFormat(result: ToolResponse, context: FormatContext): boolean {
    if (!result.success || !result.output) return false

    const output = result.output

    // Direct URL case
    if (typeof output === 'string' && this.isImageUrl(output)) {
      return true
    }

    // Object with image data
    if (typeof output === 'object' && output !== null) {
      // Check for common image fields
      const imageFields = ['url', 'image_url', 'src', 'href', 'path', 'base64', 'data']
      const hasImageField = imageFields.some(
        (field) =>
          Object.hasOwn(output, field) &&
          (this.isImageUrl(String(output[field])) || this.isBase64Image(String(output[field])))
      )

      if (hasImageField) return true

      // Check for image generator output patterns
      if (
        Object.hasOwn(output, 'generated_image') ||
        Object.hasOwn(output, 'image_data') ||
        Object.hasOwn(output, 'screenshot_data')
      ) {
        return true
      }

      // Check for array of images
      if (Array.isArray(output.images) || Array.isArray(output.results)) {
        const images = output.images || output.results
        return images.some((item: any) =>
          typeof item === 'string'
            ? this.isImageUrl(item)
            : typeof item === 'object' && item && this.hasImageData(item)
        )
      }
    }

    return false
  }

  /**
   * Format the tool result into image presentation
   */
  async format(result: ToolResponse, context: FormatContext): Promise<FormattedResult> {
    const startTime = Date.now()

    try {
      logger.debug(`Formatting result as image for tool: ${context.toolId}`)

      // Extract image data
      const imageData = this.extractImageData(result.output)
      if (!imageData) {
        throw new Error('No image data found in result')
      }

      // Generate image content
      const imageContent = await this.generateImageContent(imageData, context)

      // Generate summary
      const summary = await this.generateSummary(result, context)

      // Create additional representations
      const representations = [
        {
          format: 'text' as ResultFormat,
          content: {
            type: 'text' as const,
            text: this.generateImageDescription(imageData, context),
            title: 'Image Description',
            description: 'Textual description of the image content',
          },
          label: 'Description',
          priority: 60,
        },
      ]

      // Add metadata representation if available
      if (imageData.metadata && Object.keys(imageData.metadata).length > 0) {
        representations.push({
          format: 'json' as ResultFormat,
          content: {
            type: 'json' as const,
            data: imageData.metadata,
            title: 'Image Metadata',
            description: 'Technical details about the image',
          },
          label: 'Metadata',
          priority: 40,
        })
      }

      const processingTime = Date.now() - startTime

      return {
        originalResult: result,
        format: 'image',
        content: imageContent,
        summary,
        representations,
        metadata: {
          formattedAt: new Date().toISOString(),
          processingTime,
          version: '1.0.0',
          qualityScore: await this.calculateQualityScore(imageContent, imageData),
        },
      }
    } catch (error) {
      logger.error('Image formatting failed:', error)
      throw new Error(`Image formatting failed: ${(error as Error).message}`)
    }
  }

  /**
   * Generate natural language summary
   */
  async generateSummary(
    result: ToolResponse,
    context: FormatContext
  ): Promise<{
    headline: string
    description: string
    highlights: string[]
    suggestions: string[]
  }> {
    try {
      const imageData = this.extractImageData(result.output)
      const toolName = context.toolConfig.name || context.toolId

      if (!imageData) {
        return {
          headline: `${toolName} failed to generate image`,
          description: 'No image data was found in the result.',
          highlights: [],
          suggestions: ['Check the tool configuration', 'Verify input parameters'],
        }
      }

      const dimensions = imageData.dimensions
      const sizeInfo = dimensions ? `${dimensions.width}×${dimensions.height}` : 'unknown size'

      return {
        headline: `${toolName} generated image (${sizeInfo})`,
        description: `Image successfully created and ready for viewing. ${this.generateImageInsights(imageData, context)}`,
        highlights: this.extractImageHighlights(imageData),
        suggestions: this.generateImageSuggestions(imageData, context),
      }
    } catch (error) {
      logger.error('Image summary generation failed:', error)

      return {
        headline: `${context.toolConfig.name || context.toolId} image result`,
        description: 'Image content has been processed and is ready for viewing.',
        highlights: [],
        suggestions: ['View the image below', 'Download if needed'],
      }
    }
  }

  // Private methods

  private extractImageData(output: any): {
    url?: string
    base64?: string
    mimeType: string
    dimensions?: { width: number; height: number }
    alt: string
    caption?: string
    metadata?: Record<string, any>
  } | null {
    // Direct string URL
    if (typeof output === 'string' && this.isImageUrl(output)) {
      return {
        url: output,
        mimeType: this.inferMimeType(output),
        alt: 'Generated image',
      }
    }

    // Object with image data
    if (typeof output === 'object' && output !== null) {
      let imageUrl: string | undefined
      let base64Data: string | undefined
      let metadata: Record<string, any> = {}

      // Extract URL
      const urlFields = ['url', 'image_url', 'src', 'href', 'path']
      for (const field of urlFields) {
        if (output[field] && this.isImageUrl(String(output[field]))) {
          imageUrl = String(output[field])
          break
        }
      }

      // Extract base64 data
      const base64Fields = ['base64', 'data', 'image_data', 'screenshot_data']
      for (const field of base64Fields) {
        if (output[field] && this.isBase64Image(String(output[field]))) {
          base64Data = String(output[field])
          break
        }
      }

      if (!imageUrl && !base64Data) {
        // Check nested structures
        if (output.generated_image && typeof output.generated_image === 'object') {
          return this.extractImageData(output.generated_image)
        }

        // Check arrays
        if (Array.isArray(output.images) && output.images.length > 0) {
          return this.extractImageData(output.images[0])
        }

        if (Array.isArray(output.results) && output.results.length > 0) {
          return this.extractImageData(output.results[0])
        }

        return null
      }

      // Extract metadata
      const excludeFields = new Set([
        'url',
        'image_url',
        'src',
        'href',
        'path',
        'base64',
        'data',
        'image_data',
      ])
      metadata = Object.fromEntries(
        Object.entries(output).filter(([key]) => !excludeFields.has(key))
      )

      return {
        url: imageUrl,
        base64: base64Data,
        mimeType: this.extractMimeType(output) || this.inferMimeType(imageUrl || base64Data || ''),
        dimensions: this.extractDimensions(output),
        alt: this.extractAltText(output),
        caption: this.extractCaption(output),
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      }
    }

    return null
  }

  private async generateImageContent(
    imageData: any,
    context: FormatContext
  ): Promise<ImageContent> {
    return {
      type: 'image',
      title: `${context.toolConfig.name || context.toolId} Image`,
      description: imageData.caption || 'Generated image content',
      url: imageData.url,
      base64: imageData.base64,
      mimeType: imageData.mimeType,
      dimensions: imageData.dimensions,
      alt: imageData.alt,
      caption: imageData.caption,
      thumbnailUrl: imageData.url && this.generateThumbnailUrl(imageData.url),
    }
  }

  private generateImageDescription(imageData: any, context: FormatContext): string {
    let description = `Image generated by ${context.toolConfig.name || context.toolId}\n\n`

    if (imageData.dimensions) {
      description += `Dimensions: ${imageData.dimensions.width} × ${imageData.dimensions.height} pixels\n`
    }

    description += `Format: ${this.getMimeTypeDisplayName(imageData.mimeType)}\n`

    if (imageData.caption) {
      description += `Caption: ${imageData.caption}\n`
    }

    if (imageData.metadata) {
      description += '\nMetadata:\n'
      Object.entries(imageData.metadata).forEach(([key, value]) => {
        description += `  ${this.humanizeKey(key)}: ${this.formatMetadataValue(value)}\n`
      })
    }

    return description
  }

  private generateImageInsights(imageData: any, context: FormatContext): string {
    const insights: string[] = []

    if (imageData.dimensions) {
      const { width, height } = imageData.dimensions
      const aspectRatio = (width / height).toFixed(2)
      insights.push(`aspect ratio ${aspectRatio}:1`)
    }

    const format = this.getMimeTypeDisplayName(imageData.mimeType)
    if (format !== 'Unknown') {
      insights.push(`${format} format`)
    }

    if (context.toolId.includes('screenshot')) {
      insights.push('captured from browser')
    }

    if (context.toolId.includes('generate')) {
      insights.push('AI-generated content')
    }

    return insights.length > 0 ? `${insights.join(', ')}.` : ''
  }

  private extractImageHighlights(imageData: any): string[] {
    const highlights: string[] = []

    if (imageData.dimensions) {
      const { width, height } = imageData.dimensions
      const megapixels = ((width * height) / 1000000).toFixed(1)
      highlights.push(`${megapixels}MP image`)
    }

    const format = this.getMimeTypeDisplayName(imageData.mimeType)
    if (format !== 'Unknown') {
      highlights.push(`${format} format`)
    }

    if (imageData.metadata?.fileSize) {
      highlights.push(`${this.formatFileSize(imageData.metadata.fileSize)}`)
    }

    return highlights.slice(0, 3)
  }

  private generateImageSuggestions(imageData: any, context: FormatContext): string[] {
    const suggestions: string[] = []

    // Standard image actions
    suggestions.push('Click to view in full size')

    if (imageData.url) {
      suggestions.push('Right-click to save image')
    }

    // Context-specific suggestions
    if (context.toolId.includes('generate')) {
      suggestions.push('Generate variations with different parameters')
    }

    if (context.toolId.includes('screenshot')) {
      suggestions.push('Take another screenshot for comparison')
    }

    if (context.toolId.includes('vision') || context.toolId.includes('analysis')) {
      suggestions.push('Analyze different aspects of the image')
    }

    return suggestions.slice(0, 3)
  }

  // Utility methods

  private isImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false

    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname.toLowerCase()

      // Check file extension
      const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|tiff?)$/i
      if (imageExtensions.test(pathname)) return true

      // Check for data URLs
      if (url.startsWith('data:image/')) return true

      // Check for common image hosting patterns
      const imageHostPatterns = [
        /imgur\.com/i,
        /cloudinary\.com/i,
        /amazonaws\.com.*\.(jpg|jpeg|png|gif|webp)/i,
        /googleusercontent\.com/i,
        /unsplash\.com/i,
      ]

      return imageHostPatterns.some((pattern) => pattern.test(url))
    } catch {
      return false
    }
  }

  private isBase64Image(data: string): boolean {
    if (!data || typeof data !== 'string') return false

    // Check for data URL format
    if (data.startsWith('data:image/')) return true

    // Check for raw base64 that might be image data (heuristic)
    if (data.length > 100 && /^[A-Za-z0-9+/=]+$/.test(data)) {
      return true
    }

    return false
  }

  private hasImageData(obj: any): boolean {
    if (typeof obj !== 'object' || !obj) return false

    const imageFields = ['url', 'image_url', 'src', 'href', 'base64', 'data']
    return imageFields.some(
      (field) =>
        obj[field] &&
        (this.isImageUrl(String(obj[field])) || this.isBase64Image(String(obj[field])))
    )
  }

  private extractMimeType(obj: any): string | null {
    const mimeFields = ['mimeType', 'mime_type', 'contentType', 'content_type', 'type']

    for (const field of mimeFields) {
      if (obj[field] && typeof obj[field] === 'string' && obj[field].startsWith('image/')) {
        return obj[field]
      }
    }

    return null
  }

  private inferMimeType(urlOrData: string): string {
    if (urlOrData.startsWith('data:image/')) {
      const match = urlOrData.match(/^data:image\/([^;]+)/)
      return match ? `image/${match[1]}` : 'image/png'
    }

    const extension = urlOrData.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      bmp: 'image/bmp',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
      tiff: 'image/tiff',
      tif: 'image/tiff',
    }

    return mimeTypes[extension || ''] || 'image/png'
  }

  private extractDimensions(obj: any): { width: number; height: number } | undefined {
    // Direct fields
    if (typeof obj.width === 'number' && typeof obj.height === 'number') {
      return { width: obj.width, height: obj.height }
    }

    // Nested in size/dimensions object
    if (obj.size && typeof obj.size === 'object') {
      if (typeof obj.size.width === 'number' && typeof obj.size.height === 'number') {
        return { width: obj.size.width, height: obj.size.height }
      }
    }

    if (obj.dimensions && typeof obj.dimensions === 'object') {
      if (typeof obj.dimensions.width === 'number' && typeof obj.dimensions.height === 'number') {
        return { width: obj.dimensions.width, height: obj.dimensions.height }
      }
    }

    // Parse from string format like "800x600"
    const dimensionFields = ['size', 'resolution', 'dimensions']
    for (const field of dimensionFields) {
      if (typeof obj[field] === 'string') {
        const match = obj[field].match(/(\d+)x(\d+)/i)
        if (match) {
          return { width: Number.parseInt(match[1], 10), height: Number.parseInt(match[2], 10) }
        }
      }
    }

    return undefined
  }

  private extractAltText(obj: any): string {
    const altFields = ['alt', 'alt_text', 'description', 'title', 'name']

    for (const field of altFields) {
      if (obj[field] && typeof obj[field] === 'string' && obj[field].trim()) {
        return obj[field].trim()
      }
    }

    return 'Generated image'
  }

  private extractCaption(obj: any): string | undefined {
    const captionFields = ['caption', 'description', 'title', 'prompt']

    for (const field of captionFields) {
      if (obj[field] && typeof obj[field] === 'string' && obj[field].trim()) {
        const caption = obj[field].trim()
        return caption.length > 200 ? `${caption.substring(0, 200)}...` : caption
      }
    }

    return undefined
  }

  private generateThumbnailUrl(originalUrl: string): string | undefined {
    // For now, return the original URL
    // In a real implementation, this could generate actual thumbnails
    return originalUrl
  }

  private getMimeTypeDisplayName(mimeType: string): string {
    const displayNames: Record<string, string> = {
      'image/jpeg': 'JPEG',
      'image/jpg': 'JPEG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'image/bmp': 'BMP',
      'image/webp': 'WebP',
      'image/svg+xml': 'SVG',
      'image/x-icon': 'ICO',
      'image/tiff': 'TIFF',
    }

    return displayNames[mimeType.toLowerCase()] || 'Unknown'
  }

  private humanizeKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim()
  }

  private formatMetadataValue(value: any): string {
    if (value === null || value === undefined) return 'N/A'
    if (typeof value === 'object') return JSON.stringify(value)

    const str = String(value)
    return str.length > 50 ? `${str.substring(0, 50)}...` : str
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)}${units[unitIndex]}`
  }

  private async calculateQualityScore(content: ImageContent, imageData: any): Promise<number> {
    let score = 0.8 // Base score for image formatting

    // Image accessibility
    if (content.alt && content.alt.length > 5) score += 0.1

    // Image metadata
    if (content.dimensions) score += 0.05
    if (content.caption) score += 0.05

    return Math.min(1.0, score)
  }
}
