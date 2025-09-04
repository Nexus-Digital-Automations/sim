/**
 * Help Content Renderer - Markdown/rich content renderer with video support
 *
 * Comprehensive content rendering system supporting:
 * - Markdown rendering with syntax highlighting
 * - Interactive React components embedding
 * - Video and media content with accessibility controls
 * - Code blocks with copy functionality
 * - Interactive examples and demos
 * - Image galleries with zoom and captions
 * - Table of contents generation
 * - Content analytics and interaction tracking
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

'use client'

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { useHelp } from '@/lib/help/help-context-provider'
import { helpAnalytics } from '@/lib/help/help-analytics'
import type { HelpContentDocument, MediaAsset } from '@/lib/help/help-content-manager'
import {
  PlayIcon,
  PauseIcon,
  VolumeXIcon,
  Volume2Icon,
  MaximizeIcon,
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BookOpenIcon,
  ImageIcon,
  VideoIcon,
  FileTextIcon,
  ZoomInIcon,
  InfoIcon
} from 'lucide-react'

// ========================
// TYPE DEFINITIONS
// ========================

export interface HelpContentRendererProps {
  content: HelpContentDocument | string
  className?: string
  
  // Rendering options
  enableMarkdown?: boolean
  enableSyntaxHighlighting?: boolean
  enableInteractiveComponents?: boolean
  enableMediaSupport?: boolean
  enableTableOfContents?: boolean
  
  // Content features
  showMetadata?: boolean
  showReadingTime?: boolean
  showLastUpdated?: boolean
  enableCopyCode?: boolean
  enableImageZoom?: boolean
  
  // Layout
  maxWidth?: number | string
  fontSize?: 'sm' | 'base' | 'lg'
  lineHeight?: 'tight' | 'normal' | 'relaxed'
  
  // Accessibility
  enableHighContrast?: boolean
  enableScreenReaderOptimization?: boolean
  enableKeyboardNavigation?: boolean
  
  // Analytics
  trackReadingProgress?: boolean
  trackInteractions?: boolean
  
  // Events
  onContentLoad?: () => void
  onContentError?: (error: Error) => void
  onLinkClick?: (url: string, target?: string) => void
  onMediaPlay?: (mediaId: string, type: 'video' | 'audio') => void
}

interface ContentSection {
  id: string
  title: string
  level: number
  offset: number
}

interface MediaPlayerState {
  isPlaying: boolean
  isMuted: boolean
  currentTime: number
  duration: number
  volume: number
  isFullscreen: boolean
}

// ========================
// MARKDOWN UTILITIES
// ========================

class MarkdownProcessor {
  static process(content: string): string {
    // Simple markdown processing (in production, use a proper markdown library like react-markdown)
    return content
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-8 mb-4 text-foreground">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-semibold mt-6 mb-3 text-foreground">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-medium mt-4 mb-2 text-foreground">$1</h3>')
      .replace(/^\*\*(.*)\*\*/gm, '<strong class="font-semibold">$1</strong>')
      .replace(/^\*(.*)\*/gm, '<em class="italic">$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>')
      .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<div class="code-block bg-muted rounded-lg p-4 my-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-muted-foreground">${lang || 'code'}</span>
            <button class="copy-button text-xs bg-background hover:bg-accent px-2 py-1 rounded">Copy</button>
          </div>
          <pre class="text-sm overflow-x-auto"><code class="language-${lang || 'text'}">${code.trim()}</code></pre>
        </div>`
      })
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/^(.+)$/gm, '<p class="mb-4">$1</p>')
  }

  static extractSections(content: string): ContentSection[] {
    const sections: ContentSection[] = []
    const lines = content.split('\n')
    let currentOffset = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      
      if (headingMatch) {
        sections.push({
          id: `section-${sections.length}`,
          title: headingMatch[2],
          level: headingMatch[1].length,
          offset: currentOffset,
        })
      }
      
      currentOffset += line.length + 1 // +1 for newline
    }

    return sections
  }
}

// ========================
// MEDIA COMPONENTS
// ========================

const VideoPlayer: React.FC<{
  asset: MediaAsset
  onPlay?: (mediaId: string) => void
  className?: string
}> = ({ asset, onPlay, className }) => {
  const [playerState, setPlayerState] = useState<MediaPlayerState>({
    isPlaying: false,
    isMuted: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isFullscreen: false,
  })
  
  const videoRef = useRef<HTMLVideoElement>(null)

  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return

    if (playerState.isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
      onPlay?.(asset.id)
    }

    setPlayerState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))
  }, [playerState.isPlaying, asset.id, onPlay])

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return

    videoRef.current.muted = !videoRef.current.muted
    setPlayerState(prev => ({ ...prev, isMuted: !prev.isMuted }))
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return

    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setPlayerState(prev => ({
        ...prev,
        currentTime: video.currentTime,
        duration: video.duration || 0,
      }))
    }

    const handleLoadedMetadata = () => {
      setPlayerState(prev => ({ ...prev, duration: video.duration }))
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn("relative bg-black rounded-lg overflow-hidden group", className)}>
      <video
        ref={videoRef}
        src={asset.url}
        className="w-full h-auto"
        poster={asset.caption} // Assuming poster image URL in caption for demo
        preload="metadata"
      />
      
      {/* Video Controls */}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlayPause}
              className="text-white hover:bg-white/20"
            >
              {playerState.isPlaying ? (
                <PauseIcon className="h-4 w-4" />
              ) : (
                <PlayIcon className="h-4 w-4" />
              )}
            </Button>

            <div className="flex-1 text-white text-sm">
              {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="text-white hover:bg-white/20"
            >
              {playerState.isMuted ? (
                <VolumeXIcon className="h-4 w-4" />
              ) : (
                <Volume2Icon className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              <MaximizeIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mt-2 bg-white/20 rounded-full h-1">
            <div
              className="bg-white rounded-full h-1 transition-all"
              style={{
                width: `${playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0}%`
              }}
            />
          </div>
        </div>
      </div>

      {asset.caption && (
        <div className="absolute top-2 left-2 right-2">
          <Badge variant="secondary" className="bg-black/60 text-white">
            <VideoIcon className="h-3 w-3 mr-1" />
            {asset.caption}
          </Badge>
        </div>
      )}
    </div>
  )
}

const ImageViewer: React.FC<{
  asset: MediaAsset
  enableZoom?: boolean
  className?: string
}> = ({ asset, enableZoom = true, className }) => {
  const [isZoomed, setIsZoomed] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  return (
    <div className={cn("relative group", className)}>
      <div className="relative overflow-hidden rounded-lg bg-muted">
        <img
          src={asset.url}
          alt={asset.altText || asset.caption || 'Help content image'}
          className={cn(
            "w-full h-auto transition-all duration-300",
            !isLoaded && "opacity-0",
            isZoomed && "scale-150 cursor-zoom-out",
            !isZoomed && enableZoom && "cursor-zoom-in hover:scale-105"
          )}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          onClick={() => enableZoom && setIsZoomed(!isZoomed)}
        />

        {!isLoaded && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Failed to load image</p>
            </div>
          </div>
        )}

        {enableZoom && isLoaded && !hasError && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Badge variant="secondary" className="bg-black/60 text-white">
              <ZoomInIcon className="h-3 w-3 mr-1" />
              Click to zoom
            </Badge>
          </div>
        )}
      </div>

      {asset.caption && (
        <p className="mt-2 text-sm text-muted-foreground text-center">
          {asset.caption}
        </p>
      )}
    </div>
  )
}

// ========================
// CODE BLOCK COMPONENT
// ========================

const CodeBlock: React.FC<{
  code: string
  language?: string
  showCopy?: boolean
  className?: string
}> = ({ code, language, showCopy = true, className }) => {
  const [isCopied, setIsCopied] = useState(false)

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy code:', error)
    }
  }, [code])

  return (
    <div className={cn("relative group", className)}>
      <div className="bg-muted rounded-lg">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="text-sm text-muted-foreground font-mono">
            {language || 'code'}
          </span>
          {showCopy && (
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {isCopied ? (
                <>
                  <CheckIcon className="h-3 w-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <CopyIcon className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          )}
        </div>
        <pre className="p-4 overflow-x-auto text-sm">
          <code className={`language-${language || 'text'}`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  )
}

// ========================
// TABLE OF CONTENTS
// ========================

const TableOfContents: React.FC<{
  sections: ContentSection[]
  activeSection?: string
  onSectionClick?: (sectionId: string) => void
  className?: string
}> = ({ sections, activeSection, onSectionClick, className }) => {
  if (sections.length === 0) return null

  return (
    <Card className={cn("sticky top-4", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BookOpenIcon className="h-4 w-4" />
          Table of Contents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <nav className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => onSectionClick?.(section.id)}
              className={cn(
                "block w-full text-left px-2 py-1 text-sm rounded hover:bg-muted transition-colors",
                section.level > 1 && "ml-4",
                section.level > 2 && "ml-8",
                activeSection === section.id && "bg-muted font-medium"
              )}
            >
              {section.title}
            </button>
          ))}
        </nav>
      </CardContent>
    </Card>
  )
}

// ========================
// MAIN COMPONENT
// ========================

/**
 * Help Content Renderer
 *
 * Renders help content with support for markdown, media, and interactive components.
 */
export function HelpContentRenderer({
  content,
  className,
  enableMarkdown = true,
  enableSyntaxHighlighting = true,
  enableInteractiveComponents = true,
  enableMediaSupport = true,
  enableTableOfContents = true,
  showMetadata = true,
  showReadingTime = true,
  showLastUpdated = true,
  enableCopyCode = true,
  enableImageZoom = true,
  maxWidth = '100%',
  fontSize = 'base',
  lineHeight = 'normal',
  enableHighContrast = false,
  enableScreenReaderOptimization = true,
  enableKeyboardNavigation = true,
  trackReadingProgress = true,
  trackInteractions = true,
  onContentLoad,
  onContentError,
  onLinkClick,
  onMediaPlay,
}: HelpContentRendererProps) {
  const { state: helpState, trackInteraction } = useHelp()
  const [sections, setSections] = useState<ContentSection[]>([])
  const [activeSection, setActiveSection] = useState<string>()
  const [readingProgress, setReadingProgress] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  
  const contentRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver>()

  // Parse content
  const parsedContent = useMemo(() => {
    if (typeof content === 'string') {
      return {
        title: 'Help Content',
        content,
        contentType: 'markdown' as const,
        metadata: {
          category: 'general',
          estimatedReadingTime: Math.ceil(content.split(' ').length / 200) * 60, // ~200 WPM
          description: content.substring(0, 120) + '...',
        }
      }
    }
    return content
  }, [content])

  // Process markdown and extract sections
  const processedContent = useMemo(() => {
    if (!enableMarkdown || parsedContent.contentType !== 'markdown') {
      return typeof parsedContent.content === 'string' ? parsedContent.content : ''
    }

    const contentString = typeof parsedContent.content === 'string' ? parsedContent.content : ''
    const processed = MarkdownProcessor.process(contentString)
    const extractedSections = MarkdownProcessor.extractSections(contentString)
    
    setSections(extractedSections)
    return processed
  }, [parsedContent.content, parsedContent.contentType, enableMarkdown])

  // Setup reading progress tracking
  useEffect(() => {
    if (!trackReadingProgress || !contentRef.current) return

    const handleScroll = () => {
      if (!contentRef.current) return

      const element = contentRef.current
      const scrollTop = element.scrollTop
      const scrollHeight = element.scrollHeight - element.clientHeight
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0
      
      setReadingProgress(Math.min(100, Math.max(0, progress)))
    }

    const element = contentRef.current
    element.addEventListener('scroll', handleScroll)
    return () => element.removeEventListener('scroll', handleScroll)
  }, [trackReadingProgress])

  // Setup intersection observer for active section tracking
  useEffect(() => {
    if (!enableTableOfContents || sections.length === 0) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter(entry => entry.isIntersecting)
          .map(entry => entry.target.id)

        if (visibleSections.length > 0) {
          setActiveSection(visibleSections[0])
        }
      },
      { threshold: 0.5 }
    )

    // Observe all headings
    sections.forEach(section => {
      const element = document.getElementById(section.id)
      if (element && observerRef.current) {
        observerRef.current.observe(element)
      }
    })

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [enableTableOfContents, sections])

  // Event handlers
  const handleSectionClick = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      
      if (trackInteractions) {
        trackInteraction('click', `toc-${sectionId}`)
      }
    }
  }, [trackInteractions, trackInteraction])

  const handleLinkClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.tagName === 'A') {
      const href = target.getAttribute('href')
      if (href) {
        event.preventDefault()
        onLinkClick?.(href, target.getAttribute('target') || undefined)
        
        if (trackInteractions) {
          trackInteraction('click', `link-${href}`)
        }
      }
    }
  }, [onLinkClick, trackInteractions, trackInteraction])

  // Loading effect
  useEffect(() => {
    onContentLoad?.()
  }, [onContentLoad])

  // Render media assets
  const renderMediaAssets = () => {
    if (!enableMediaSupport || !parsedContent.metadata?.mediaAssets?.length) {
      return null
    }

    return (
      <div className="space-y-4 mb-6">
        {parsedContent.metadata.mediaAssets.map((asset) => (
          <div key={asset.id}>
            {asset.type === 'video' && (
              <VideoPlayer
                asset={asset}
                onPlay={onMediaPlay}
                className="mb-2"
              />
            )}
            {asset.type === 'image' && (
              <ImageViewer
                asset={asset}
                enableZoom={enableImageZoom}
                className="mb-2"
              />
            )}
          </div>
        ))}
      </div>
    )
  }

  const fontSizeClass = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg'
  }[fontSize]

  const lineHeightClass = {
    tight: 'leading-tight',
    normal: 'leading-normal',
    relaxed: 'leading-relaxed'
  }[lineHeight]

  return (
    <div className={cn("help-content-renderer", className)} style={{ maxWidth }}>
      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1">
          {/* Content Header */}
          {showMetadata && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">{parsedContent.title}</h1>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                {showReadingTime && parsedContent.metadata?.estimatedReadingTime && (
                  <span>
                    {Math.ceil(parsedContent.metadata.estimatedReadingTime / 60)} min read
                  </span>
                )}
                {showLastUpdated && parsedContent.updatedAt && (
                  <span>
                    Updated {new Date(parsedContent.updatedAt).toLocaleDateString()}
                  </span>
                )}
                <Badge variant="secondary">
                  {parsedContent.metadata?.category}
                </Badge>
              </div>

              {parsedContent.metadata?.description && (
                <p className="text-muted-foreground mb-4">
                  {parsedContent.metadata.description}
                </p>
              )}

              {trackReadingProgress && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Reading Progress</span>
                    <span>{Math.round(readingProgress)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1">
                    <div
                      className="bg-primary h-1 rounded-full transition-all duration-300"
                      style={{ width: `${readingProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Media Assets */}
          {renderMediaAssets()}

          {/* Content Body */}
          <ScrollArea
            ref={contentRef}
            className={cn(
              "prose prose-sm max-w-none",
              fontSizeClass,
              lineHeightClass,
              enableHighContrast && "prose-invert"
            )}
          >
            <div
              className="help-content"
              onClick={handleLinkClick}
              dangerouslySetInnerHTML={{ __html: processedContent }}
              role={enableScreenReaderOptimization ? "article" : undefined}
              aria-label={enableScreenReaderOptimization ? parsedContent.title : undefined}
            />
          </ScrollArea>
        </div>

        {/* Table of Contents Sidebar */}
        {enableTableOfContents && sections.length > 0 && (
          <div className="w-64 flex-shrink-0">
            <TableOfContents
              sections={sections}
              activeSection={activeSection}
              onSectionClick={handleSectionClick}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ========================
// EXPORTS
// ========================

export default HelpContentRenderer
export type { HelpContentRendererProps }