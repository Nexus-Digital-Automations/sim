/**
 * Universal Tool Adapter System - Image Display Component
 *
 * Advanced image display component with zoom, download, metadata,
 * and responsive viewing capabilities.
 */

'use client'

import { useRef, useState } from 'react'
import { Copy, Download, Info, Maximize, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { ImageContent } from '../../types'

interface ImageDisplayProps {
  content: ImageContent
  onAction?: (action: string, params?: any) => void
  compact?: boolean
  className?: string
}

export function ImageDisplay({ content, onAction, compact = false, className }: ImageDisplayProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [showMetadata, setShowMetadata] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)

  const imageUrl =
    content.url || (content.base64 ? `data:${content.mimeType};base64,${content.base64}` : null)

  const handleImageLoad = () => {
    setIsLoading(false)
    setHasError(false)
    onAction?.('image_loaded', {
      url: imageUrl,
      dimensions: content.dimensions,
    })
  }

  const handleImageError = () => {
    setIsLoading(false)
    setHasError(true)
    onAction?.('image_error', { url: imageUrl })
  }

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.5, 5)
    setZoom(newZoom)
    onAction?.('image_zoomed', { zoom: newZoom, direction: 'in' })
  }

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.5, 0.1)
    setZoom(newZoom)
    onAction?.('image_zoomed', { zoom: newZoom, direction: 'out' })
  }

  const handleRotate = () => {
    const newRotation = (rotation + 90) % 360
    setRotation(newRotation)
    onAction?.('image_rotated', { rotation: newRotation })
  }

  const resetTransform = () => {
    setZoom(1)
    setRotation(0)
    onAction?.('image_reset')
  }

  const downloadImage = async () => {
    if (!imageUrl) return

    try {
      if (content.url) {
        // External URL - open in new tab
        window.open(content.url, '_blank')
      } else if (content.base64) {
        // Base64 data - create download link
        const link = document.createElement('a')
        link.href = `data:${content.mimeType};base64,${content.base64}`
        link.download = `image.${content.mimeType.split('/')[1]}`
        link.click()
      }
      onAction?.('image_downloaded', { url: imageUrl })
    } catch (error) {
      onAction?.('image_download_error', { error })
    }
  }

  const copyImageUrl = async () => {
    if (!content.url) return

    try {
      await navigator.clipboard.writeText(content.url)
      onAction?.('image_url_copied', { url: content.url })
    } catch (error) {
      onAction?.('image_copy_error', { error })
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  if (!imageUrl) {
    return (
      <Card className='border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'>
        <CardContent className='flex items-center justify-center py-12'>
          <div className='text-center text-red-600 dark:text-red-400'>
            <div className='font-medium text-lg'>No Image Data</div>
            <div className='mt-1 text-sm'>Neither URL nor base64 data provided</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Header */}
      <div className='flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
        <div className='min-w-0 flex-1'>
          {content.title && (
            <h3 className='font-semibold text-gray-900 text-lg dark:text-gray-100'>
              {content.title}
            </h3>
          )}
          {content.description && (
            <p className='mt-1 text-gray-600 text-sm dark:text-gray-400'>{content.description}</p>
          )}
          {content.caption && (
            <p className='mt-2 text-gray-700 text-sm italic dark:text-gray-300'>
              {content.caption}
            </p>
          )}
        </div>

        <div className='flex flex-shrink-0 items-center gap-2'>
          {/* Image Info */}
          <div className='flex gap-1'>
            <Badge variant='secondary' className='text-xs'>
              {content.mimeType.split('/')[1]?.toUpperCase()}
            </Badge>
            {content.dimensions && (
              <Badge variant='secondary' className='text-xs'>
                {content.dimensions.width}×{content.dimensions.height}
              </Badge>
            )}
          </div>

          {/* Action buttons */}
          <Button variant='outline' size='sm' onClick={downloadImage}>
            <Download className='h-4 w-4' />
          </Button>

          {content.url && (
            <Button variant='outline' size='sm' onClick={copyImageUrl}>
              <Copy className='h-4 w-4' />
            </Button>
          )}

          <Button variant='outline' size='sm' onClick={() => setShowMetadata(!showMetadata)}>
            <Info className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Image Container */}
      <Card>
        <CardContent className='p-0'>
          <div className='relative bg-gray-50 dark:bg-gray-900'>
            {/* Image Controls */}
            <div className='absolute top-4 left-4 z-10 flex gap-2'>
              <div className='flex gap-1 rounded-md bg-white/90 p-1 dark:bg-gray-900/90'>
                <Button variant='ghost' size='sm' onClick={handleZoomOut} disabled={zoom <= 0.1}>
                  <ZoomOut className='h-4 w-4' />
                </Button>

                <div className='flex items-center px-2'>
                  <span className='font-medium text-xs'>{Math.round(zoom * 100)}%</span>
                </div>

                <Button variant='ghost' size='sm' onClick={handleZoomIn} disabled={zoom >= 5}>
                  <ZoomIn className='h-4 w-4' />
                </Button>

                <Button variant='ghost' size='sm' onClick={handleRotate}>
                  <RotateCw className='h-4 w-4' />
                </Button>

                <Button
                  variant='ghost'
                  size='sm'
                  onClick={resetTransform}
                  disabled={zoom === 1 && rotation === 0}
                >
                  Reset
                </Button>
              </div>

              {/* Full Screen Button */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant='ghost' size='sm' className='bg-white/90 dark:bg-gray-900/90'>
                    <Maximize className='h-4 w-4' />
                  </Button>
                </DialogTrigger>
                <DialogContent className='max-h-[90vh] max-w-4xl'>
                  <DialogHeader>
                    <DialogTitle>{content.alt}</DialogTitle>
                  </DialogHeader>
                  <div className='flex items-center justify-center'>
                    <Image
                      src={imageUrl}
                      alt={content.alt}
                      width={800}
                      height={600}
                      className='max-h-[70vh] max-w-full object-contain'
                      style={{ width: 'auto', height: 'auto' }}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Main Image */}
            <div
              className='flex max-h-[600px] min-h-[300px] items-center justify-center overflow-auto'
              style={{ height: compact ? '300px' : '500px' }}
            >
              {isLoading && (
                <div className='absolute inset-0 flex items-center justify-center'>
                  <div className='text-gray-500 dark:text-gray-400'>Loading...</div>
                </div>
              )}

              {hasError ? (
                <div className='p-8 text-center text-red-600 dark:text-red-400'>
                  <div className='font-medium text-lg'>Failed to load image</div>
                  <div className='mt-1 text-sm'>The image could not be displayed</div>
                  {content.url && (
                    <Button variant='link' asChild className='mt-2'>
                      <a href={content.url} target='_blank' rel='noopener noreferrer'>
                        Open in new tab
                      </a>
                    </Button>
                  )}
                </div>
              ) : (
                <div
                  ref={imageRef}
                  className={cn(
                    'max-h-full max-w-full transition-transform duration-200',
                    isLoading && 'opacity-0'
                  )}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  }}
                >
                  <Image
                    src={imageUrl}
                    alt={content.alt}
                    fill
                    className='object-contain'
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    draggable={false}
                    style={{ width: 'auto', height: 'auto' }}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      {showMetadata && (
        <Collapsible open={showMetadata} onOpenChange={setShowMetadata}>
          <CollapsibleContent>
            <Card className='bg-gray-50 dark:bg-gray-900'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-base'>Image Metadata</CardTitle>
              </CardHeader>
              <CardContent className='pt-0'>
                <div className='grid grid-cols-1 gap-4 text-sm sm:grid-cols-2'>
                  <div>
                    <span className='font-medium text-gray-700 dark:text-gray-300'>Format:</span>
                    <span className='ml-2'>{content.mimeType}</span>
                  </div>

                  {content.dimensions && (
                    <div>
                      <span className='font-medium text-gray-700 dark:text-gray-300'>
                        Dimensions:
                      </span>
                      <span className='ml-2'>
                        {content.dimensions.width} × {content.dimensions.height} pixels
                      </span>
                    </div>
                  )}

                  {content.url && (
                    <div className='sm:col-span-2'>
                      <span className='font-medium text-gray-700 dark:text-gray-300'>URL:</span>
                      <div className='mt-1'>
                        <a
                          href={content.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='break-all text-blue-600 text-xs hover:underline dark:text-blue-400'
                        >
                          {content.url}
                        </a>
                      </div>
                    </div>
                  )}

                  {content.base64 && (
                    <div>
                      <span className='font-medium text-gray-700 dark:text-gray-300'>Data:</span>
                      <span className='ml-2'>
                        Base64 encoded ({formatFileSize(content.base64.length * 0.75)})
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
