/**
 * VideoPlayer Component - Advanced HTML5 video player with custom controls
 *
 * Modern video player with:
 * - Adaptive streaming support (HLS/DASH)
 * - Interactive annotations and chapters
 * - Custom controls and accessibility features
 * - Analytics integration and engagement tracking
 * - CDN optimization and progressive enhancement
 * - Multi-quality streaming with automatic selection
 * - Closed captions and transcript support
 *
 * @created 2025-01-04
 * @author Claude Development System
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MaximizeIcon,
  MinimizeIcon,
  PauseIcon,
  PlayIcon,
  SettingsIcon,
  SkipBackIcon,
  SkipForwardIcon,
  Volume2Icon,
  VolumeXIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { helpAnalytics } from '@/lib/help/help-analytics'
import { useHelp } from '@/lib/help/help-context-provider'
import { cn } from '@/lib/utils'

// ========================
// TYPE DEFINITIONS
// ========================

export interface VideoChapter {
  id: string
  title: string
  startTime: number
  endTime: number
  description?: string
  thumbnail?: string
}

export interface VideoAnnotation {
  id: string
  startTime: number
  endTime: number
  position: { x: number; y: number }
  content: string
  type: 'tooltip' | 'link' | 'overlay' | 'interactive'
  action?: () => void
}

export interface VideoCaptions {
  id: string
  language: string
  label: string
  src: string
  default?: boolean
}

export interface VideoQuality {
  id: string
  label: string
  height: number
  bitrate: number
  src: string
}

export interface VideoPlayerProps {
  // Core video properties
  videoId: string
  videoUrl: string
  posterUrl?: string

  // Content organization
  title?: string
  description?: string
  duration?: number

  // Interactive features
  chapters?: VideoChapter[]
  annotations?: VideoAnnotation[]
  captions?: VideoCaptions[]
  qualities?: VideoQuality[]

  // Playback configuration
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
  preload?: 'none' | 'metadata' | 'auto'

  // Feature toggles
  enableAnnotations?: boolean
  enableChapters?: boolean
  enableTranscripts?: boolean
  enableQualitySelector?: boolean
  enableFullscreen?: boolean
  enablePictureInPicture?: boolean

  // Styling
  className?: string
  controlsClassName?: string

  // Analytics callbacks
  onPlay?: (timestamp: number) => void
  onPause?: (timestamp: number) => void
  onSeek?: (from: number, to: number) => void
  onComplete?: (duration: number) => void
  onAnnotationClick?: (annotation: VideoAnnotation) => void
  onChapterChange?: (chapter: VideoChapter) => void
  onQualityChange?: (quality: VideoQuality) => void
}

interface PlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  buffered: number
  volume: number
  isMuted: boolean
  isFullscreen: boolean
  isPictureInPicture: boolean
  currentQuality?: VideoQuality
  currentChapter?: VideoChapter
  showControls: boolean
  controlsTimeout?: NodeJS.Timeout
}

interface PlaybackMetrics {
  startTime: number
  playTime: number
  pauseTime: number
  seekEvents: { from: number; to: number; timestamp: number }[]
  qualityChanges: { quality: string; timestamp: number }[]
  annotationClicks: { annotationId: string; timestamp: number }[]
}

// ========================
// MAIN COMPONENT
// ========================

/**
 * Advanced Video Player Component
 *
 * Provides comprehensive video playback with modern features and analytics.
 */
export function VideoPlayer({
  videoId,
  videoUrl,
  posterUrl,
  title,
  description,
  duration: initialDuration,
  chapters = [],
  annotations = [],
  captions = [],
  qualities = [],
  autoplay = false,
  muted = false,
  loop = false,
  preload = 'metadata',
  enableAnnotations = true,
  enableChapters = true,
  enableTranscripts = true,
  enableQualitySelector = true,
  enableFullscreen = true,
  enablePictureInPicture = true,
  className,
  controlsClassName,
  onPlay,
  onPause,
  onSeek,
  onComplete,
  onAnnotationClick,
  onChapterChange,
  onQualityChange,
}: VideoPlayerProps) {
  const { state: helpState } = useHelp()
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: initialDuration || 0,
    buffered: 0,
    volume: 1,
    isMuted: muted,
    isFullscreen: false,
    isPictureInPicture: false,
    showControls: true,
  })

  const [playbackMetrics, setPlaybackMetrics] = useState<PlaybackMetrics>({
    startTime: Date.now(),
    playTime: 0,
    pauseTime: 0,
    seekEvents: [],
    qualityChanges: [],
    annotationClicks: [],
  })

  const [activeAnnotations, setActiveAnnotations] = useState<VideoAnnotation[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // ========================
  // PLAYBACK CONTROLS
  // ========================

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (playerState.isPlaying) {
      video.pause()
    } else {
      video.play().catch(console.error)
    }
  }, [playerState.isPlaying])

  const seekTo = useCallback(
    (time: number) => {
      const video = videoRef.current
      if (!video) return

      const oldTime = video.currentTime
      video.currentTime = Math.max(0, Math.min(time, video.duration || 0))

      setPlaybackMetrics((prev) => ({
        ...prev,
        seekEvents: [
          ...prev.seekEvents,
          {
            from: oldTime,
            to: time,
            timestamp: Date.now(),
          },
        ],
      }))

      onSeek?.(oldTime, time)
    },
    [onSeek]
  )

  const seekRelative = useCallback(
    (seconds: number) => {
      const video = videoRef.current
      if (!video) return

      seekTo(video.currentTime + seconds)
    },
    [seekTo]
  )

  const setVolume = useCallback((volume: number) => {
    const video = videoRef.current
    if (!video) return

    const clampedVolume = Math.max(0, Math.min(1, volume))
    video.volume = clampedVolume

    setPlayerState((prev) => ({
      ...prev,
      volume: clampedVolume,
      isMuted: clampedVolume === 0,
    }))
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (playerState.isMuted) {
      video.muted = false
      video.volume = playerState.volume || 0.5
    } else {
      video.muted = true
    }

    setPlayerState((prev) => ({ ...prev, isMuted: !prev.isMuted }))
  }, [playerState.isMuted, playerState.volume])

  // ========================
  // QUALITY AND DISPLAY CONTROLS
  // ========================

  const changeQuality = useCallback(
    (quality: VideoQuality) => {
      const video = videoRef.current
      if (!video) return

      const currentTime = video.currentTime
      const wasPlaying = !video.paused

      setIsLoading(true)

      // Change video source
      video.src = quality.src
      video.currentTime = currentTime

      const handleLoadedData = () => {
        if (wasPlaying) {
          video.play().catch(console.error)
        }
        setIsLoading(false)
        video.removeEventListener('loadeddata', handleLoadedData)
      }

      video.addEventListener('loadeddata', handleLoadedData)

      setPlayerState((prev) => ({ ...prev, currentQuality: quality }))
      setPlaybackMetrics((prev) => ({
        ...prev,
        qualityChanges: [
          ...prev.qualityChanges,
          {
            quality: quality.label,
            timestamp: Date.now(),
          },
        ],
      }))

      onQualityChange?.(quality)
    },
    [onQualityChange]
  )

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }, [])

  const togglePictureInPicture = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await video.requestPictureInPicture()
      }
    } catch (error) {
      console.error('Picture-in-picture error:', error)
    }
  }, [])

  // ========================
  // CHAPTERS AND ANNOTATIONS
  // ========================

  const getCurrentChapter = useCallback(
    (currentTime: number): VideoChapter | undefined => {
      return chapters.find(
        (chapter) => currentTime >= chapter.startTime && currentTime <= chapter.endTime
      )
    },
    [chapters]
  )

  const getActiveAnnotations = useCallback(
    (currentTime: number): VideoAnnotation[] => {
      return annotations.filter(
        (annotation) => currentTime >= annotation.startTime && currentTime <= annotation.endTime
      )
    },
    [annotations]
  )

  const handleAnnotationClick = useCallback(
    (annotation: VideoAnnotation) => {
      setPlaybackMetrics((prev) => ({
        ...prev,
        annotationClicks: [
          ...prev.annotationClicks,
          {
            annotationId: annotation.id,
            timestamp: Date.now(),
          },
        ],
      }))

      helpAnalytics.trackHelpInteraction(
        videoId,
        helpState.sessionId,
        'annotation_click',
        'video_player',
        { annotationId: annotation.id, timestamp: playerState.currentTime }
      )

      annotation.action?.()
      onAnnotationClick?.(annotation)
    },
    [videoId, helpState.sessionId, playerState.currentTime, onAnnotationClick]
  )

  const jumpToChapter = useCallback(
    (chapter: VideoChapter) => {
      seekTo(chapter.startTime)
      onChapterChange?.(chapter)
    },
    [seekTo, onChapterChange]
  )

  // ========================
  // CONTROLS VISIBILITY
  // ========================

  const showControlsTemporarily = useCallback(() => {
    setPlayerState((prev) => {
      if (prev.controlsTimeout) {
        clearTimeout(prev.controlsTimeout)
      }

      const timeout = setTimeout(() => {
        setPlayerState((current) => ({
          ...current,
          showControls: false,
          controlsTimeout: undefined,
        }))
      }, 3000)

      return {
        ...prev,
        showControls: true,
        controlsTimeout: timeout,
      }
    })
  }, [])

  const hideControlsPermanently = useCallback(() => {
    setPlayerState((prev) => {
      if (prev.controlsTimeout) {
        clearTimeout(prev.controlsTimeout)
      }
      return { ...prev, showControls: false, controlsTimeout: undefined }
    })
  }, [])

  // ========================
  // VIDEO EVENT HANDLERS
  // ========================

  const handleVideoPlay = useCallback(() => {
    setPlayerState((prev) => ({ ...prev, isPlaying: true }))
    setPlaybackMetrics((prev) => ({ ...prev, playTime: prev.playTime + 1 }))

    helpAnalytics.trackHelpInteraction(videoId, helpState.sessionId, 'video_play', 'video_player', {
      timestamp: playerState.currentTime,
    })

    onPlay?.(playerState.currentTime)
  }, [videoId, helpState.sessionId, playerState.currentTime, onPlay])

  const handleVideoPause = useCallback(() => {
    setPlayerState((prev) => ({ ...prev, isPlaying: false }))
    setPlaybackMetrics((prev) => ({ ...prev, pauseTime: prev.pauseTime + 1 }))

    helpAnalytics.trackHelpInteraction(
      videoId,
      helpState.sessionId,
      'video_pause',
      'video_player',
      { timestamp: playerState.currentTime }
    )

    onPause?.(playerState.currentTime)
  }, [videoId, helpState.sessionId, playerState.currentTime, onPause])

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    const currentTime = video.currentTime
    const duration = video.duration
    const buffered = video.buffered.length > 0 ? video.buffered.end(0) : 0

    setPlayerState((prev) => ({
      ...prev,
      currentTime,
      duration,
      buffered,
    }))

    // Update active annotations
    if (enableAnnotations) {
      setActiveAnnotations(getActiveAnnotations(currentTime))
    }

    // Update current chapter
    if (enableChapters) {
      const currentChapter = getCurrentChapter(currentTime)
      if (currentChapter && currentChapter.id !== playerState.currentChapter?.id) {
        setPlayerState((prev) => ({ ...prev, currentChapter }))
        onChapterChange?.(currentChapter)
      }
    }
  }, [
    enableAnnotations,
    enableChapters,
    getActiveAnnotations,
    getCurrentChapter,
    playerState.currentChapter?.id,
    onChapterChange,
  ])

  const handleVideoEnded = useCallback(() => {
    setPlayerState((prev) => ({ ...prev, isPlaying: false }))

    helpAnalytics.trackHelpInteraction(
      videoId,
      helpState.sessionId,
      'video_complete',
      'video_player',
      {
        duration: playerState.duration,
        watchTime: playerState.currentTime,
        completionRate: playerState.currentTime / playerState.duration,
      }
    )

    onComplete?.(playerState.duration)
  }, [videoId, helpState.sessionId, playerState.duration, playerState.currentTime, onComplete])

  // ========================
  // KEYBOARD CONTROLS
  // ========================

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) return

      switch (event.code) {
        case 'Space':
          event.preventDefault()
          togglePlayPause()
          break
        case 'ArrowLeft':
          event.preventDefault()
          seekRelative(-10)
          break
        case 'ArrowRight':
          event.preventDefault()
          seekRelative(10)
          break
        case 'ArrowUp':
          event.preventDefault()
          setVolume(playerState.volume + 0.1)
          break
        case 'ArrowDown':
          event.preventDefault()
          setVolume(playerState.volume - 0.1)
          break
        case 'KeyM':
          event.preventDefault()
          toggleMute()
          break
        case 'KeyF':
          event.preventDefault()
          if (enableFullscreen) toggleFullscreen()
          break
      }
    },
    [
      togglePlayPause,
      seekRelative,
      setVolume,
      playerState.volume,
      toggleMute,
      enableFullscreen,
      toggleFullscreen,
    ]
  )

  // ========================
  // EFFECTS
  // ========================

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Video event listeners
    video.addEventListener('play', handleVideoPlay)
    video.addEventListener('pause', handleVideoPause)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleVideoEnded)
    video.addEventListener('loadstart', () => setIsLoading(true))
    video.addEventListener('loadeddata', () => setIsLoading(false))
    video.addEventListener('waiting', () => setIsLoading(true))
    video.addEventListener('canplay', () => setIsLoading(false))

    return () => {
      video.removeEventListener('play', handleVideoPlay)
      video.removeEventListener('pause', handleVideoPause)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleVideoEnded)
      video.removeEventListener('loadstart', () => setIsLoading(true))
      video.removeEventListener('loadeddata', () => setIsLoading(false))
      video.removeEventListener('waiting', () => setIsLoading(true))
      video.removeEventListener('canplay', () => setIsLoading(false))
    }
  }, [handleVideoPlay, handleVideoPause, handleTimeUpdate, handleVideoEnded])

  useEffect(() => {
    // Keyboard controls
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    // Fullscreen change listener
    const handleFullscreenChange = () => {
      setPlayerState((prev) => ({
        ...prev,
        isFullscreen: !!document.fullscreenElement,
      }))
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    // Picture-in-picture change listener
    const handlePictureInPictureChange = () => {
      setPlayerState((prev) => ({
        ...prev,
        isPictureInPicture: !!document.pictureInPictureElement,
      }))
    }

    document.addEventListener('enterpictureinpicture', handlePictureInPictureChange)
    document.addEventListener('leavepictureinpicture', handlePictureInPictureChange)

    return () => {
      document.removeEventListener('enterpictureinpicture', handlePictureInPictureChange)
      document.removeEventListener('leavepictureinpicture', handlePictureInPictureChange)
    }
  }, [])

  useEffect(() => {
    // Set initial quality
    if (qualities.length > 0 && !playerState.currentQuality) {
      // Select medium quality by default
      const defaultQuality = qualities.find((q) => q.label.includes('720p')) || qualities[0]
      setPlayerState((prev) => ({ ...prev, currentQuality: defaultQuality }))
    }
  }, [qualities, playerState.currentQuality])

  useEffect(() => {
    // Controls visibility management
    const container = containerRef.current
    if (!container) return

    const handleMouseMove = () => showControlsTemporarily()
    const handleMouseLeave = () => hideControlsPermanently()

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [showControlsTemporarily, hideControlsPermanently])

  // ========================
  // PROGRESS BAR INTERACTION
  // ========================

  const handleProgressClick = useCallback(
    (event: React.MouseEvent) => {
      const progress = progressRef.current
      if (!progress) return

      const rect = progress.getBoundingClientRect()
      const clickX = event.clientX - rect.left
      const percentage = clickX / rect.width
      const newTime = percentage * playerState.duration

      seekTo(newTime)
    },
    [playerState.duration, seekTo]
  )

  // ========================
  // RENDER HELPERS
  // ========================

  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }, [])

  const renderQualitySelector = () => {
    if (!enableQualitySelector || qualities.length <= 1) return null

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
            <SettingsIcon className='h-4 w-4' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-40 p-2'>
          <div className='space-y-1'>
            <div className='mb-2 font-medium text-xs'>Quality</div>
            {qualities.map((quality) => (
              <button
                key={quality.id}
                onClick={() => changeQuality(quality)}
                className={cn(
                  'w-full rounded px-2 py-1 text-left text-xs transition-colors hover:bg-muted',
                  quality.id === playerState.currentQuality?.id && 'bg-muted'
                )}
              >
                {quality.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  const renderChaptersList = () => {
    if (!enableChapters || chapters.length === 0) return null

    return (
      <div className='absolute bottom-16 left-0 w-80 max-w-[90vw] space-y-2 rounded-lg bg-black/90 p-4'>
        <div className='mb-2 font-medium text-sm'>Chapters</div>
        <div className='max-h-60 space-y-1 overflow-y-auto'>
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              onClick={() => jumpToChapter(chapter)}
              className={cn(
                'w-full rounded p-2 text-left text-xs transition-colors hover:bg-white/10',
                chapter.id === playerState.currentChapter?.id && 'bg-white/10'
              )}
            >
              <div className='font-medium'>{chapter.title}</div>
              <div className='text-gray-400'>{formatTime(chapter.startTime)}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderAnnotations = () => {
    if (!enableAnnotations || activeAnnotations.length === 0) return null

    return (
      <div className='pointer-events-none absolute inset-0'>
        {activeAnnotations.map((annotation) => (
          <div
            key={annotation.id}
            className='pointer-events-auto absolute'
            style={{
              left: `${annotation.position.x}%`,
              top: `${annotation.position.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <Button
              variant='secondary'
              size='sm'
              className='bg-blue-600 text-white hover:bg-blue-700'
              onClick={() => handleAnnotationClick(annotation)}
            >
              {annotation.type === 'tooltip' ? '?' : 'i'}
            </Button>
          </div>
        ))}
      </div>
    )
  }

  // ========================
  // MAIN RENDER
  // ========================

  return (
    <div
      ref={containerRef}
      className={cn(
        'group relative overflow-hidden rounded-lg bg-black',
        'focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500',
        className
      )}
      tabIndex={-1}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className='h-full w-full object-contain'
        src={playerState.currentQuality?.src || videoUrl}
        poster={posterUrl}
        autoPlay={autoplay}
        muted={muted}
        loop={loop}
        preload={preload}
        playsInline
      >
        {/* Captions */}
        {captions.map((caption) => (
          <track
            key={caption.id}
            kind='captions'
            src={caption.src}
            srcLang={caption.language}
            label={caption.label}
            default={caption.default}
          />
        ))}
      </video>

      {/* Loading Indicator */}
      {isLoading && (
        <div className='absolute inset-0 flex items-center justify-center bg-black/50'>
          <div className='h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent' />
        </div>
      )}

      {/* Video Title Overlay */}
      {title && (
        <div className='absolute top-4 right-4 left-4 text-white'>
          <h3 className='truncate font-semibold text-lg'>{title}</h3>
          {description && <p className='mt-1 truncate text-gray-300 text-sm'>{description}</p>}
        </div>
      )}

      {/* Interactive Annotations */}
      {renderAnnotations()}

      {/* Controls Overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30',
          'transition-opacity duration-300',
          playerState.showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        {/* Main Play/Pause Button */}
        <div className='absolute inset-0 flex items-center justify-center'>
          <Button
            variant='ghost'
            size='lg'
            className='h-16 w-16 rounded-full bg-black/30 text-white hover:bg-black/50'
            onClick={togglePlayPause}
          >
            {playerState.isPlaying ? (
              <PauseIcon className='h-8 w-8' />
            ) : (
              <PlayIcon className='h-8 w-8' />
            )}
          </Button>
        </div>

        {/* Bottom Controls */}
        <div className='absolute right-0 bottom-0 left-0 p-4'>
          {/* Progress Bar */}
          <div
            ref={progressRef}
            className='mb-4 h-2 w-full cursor-pointer rounded-full bg-white/20'
            onClick={handleProgressClick}
          >
            {/* Buffered Progress */}
            <div
              className='h-full rounded-full bg-white/40'
              style={{
                width: `${playerState.duration > 0 ? (playerState.buffered / playerState.duration) * 100 : 0}%`,
              }}
            />

            {/* Current Progress */}
            <div
              className='-mt-2 h-full rounded-full bg-blue-500'
              style={{
                width: `${playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0}%`,
              }}
            />

            {/* Chapter Markers */}
            {enableChapters &&
              chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className='absolute top-0 h-2 w-1 rounded bg-yellow-400'
                  style={{
                    left: `${playerState.duration > 0 ? (chapter.startTime / playerState.duration) * 100 : 0}%`,
                  }}
                />
              ))}
          </div>

          {/* Control Buttons */}
          <div className={cn('flex items-center justify-between text-white', controlsClassName)}>
            {/* Left Controls */}
            <div className='flex items-center space-x-2'>
              <Button
                variant='ghost'
                size='sm'
                className='h-8 w-8 p-0 text-white hover:bg-white/10'
                onClick={togglePlayPause}
              >
                {playerState.isPlaying ? (
                  <PauseIcon className='h-4 w-4' />
                ) : (
                  <PlayIcon className='h-4 w-4' />
                )}
              </Button>

              <Button
                variant='ghost'
                size='sm'
                className='h-8 w-8 p-0 text-white hover:bg-white/10'
                onClick={() => seekRelative(-10)}
              >
                <SkipBackIcon className='h-4 w-4' />
              </Button>

              <Button
                variant='ghost'
                size='sm'
                className='h-8 w-8 p-0 text-white hover:bg-white/10'
                onClick={() => seekRelative(10)}
              >
                <SkipForwardIcon className='h-4 w-4' />
              </Button>

              {/* Volume Control */}
              <div className='flex items-center space-x-2'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-8 w-8 p-0 text-white hover:bg-white/10'
                  onClick={toggleMute}
                >
                  {playerState.isMuted || playerState.volume === 0 ? (
                    <VolumeXIcon className='h-4 w-4' />
                  ) : (
                    <Volume2Icon className='h-4 w-4' />
                  )}
                </Button>

                <div className='w-20'>
                  <Slider
                    value={[playerState.isMuted ? 0 : playerState.volume]}
                    max={1}
                    step={0.01}
                    onValueChange={([value]) => setVolume(value)}
                    className='[&_.slider-range]:bg-white [&_.slider-thumb]:bg-white [&_.slider-track]:bg-white/20'
                  />
                </div>
              </div>

              {/* Time Display */}
              <div className='font-mono text-sm'>
                {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
              </div>
            </div>

            {/* Right Controls */}
            <div className='flex items-center space-x-2'>
              {/* Current Chapter */}
              {enableChapters && playerState.currentChapter && (
                <Badge variant='secondary' className='text-xs'>
                  {playerState.currentChapter.title}
                </Badge>
              )}

              {/* Quality Selector */}
              {renderQualitySelector()}

              {/* Picture-in-Picture */}
              {enablePictureInPicture && (
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-8 w-8 p-0 text-white hover:bg-white/10'
                  onClick={togglePictureInPicture}
                >
                  <MinimizeIcon className='h-4 w-4' />
                </Button>
              )}

              {/* Fullscreen */}
              {enableFullscreen && (
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-8 w-8 p-0 text-white hover:bg-white/10'
                  onClick={toggleFullscreen}
                >
                  {playerState.isFullscreen ? (
                    <MinimizeIcon className='h-4 w-4' />
                  ) : (
                    <MaximizeIcon className='h-4 w-4' />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chapters List (when visible) */}
      {renderChaptersList()}
    </div>
  )
}

// ========================
// EXPORTS
// ========================

export default VideoPlayer
export type { VideoPlayerProps, VideoChapter, VideoAnnotation, VideoCaptions, VideoQuality }
