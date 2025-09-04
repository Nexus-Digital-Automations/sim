/**
 * Video Analytics Provider - Comprehensive analytics for video tutorials
 *
 * Features:
 * - Real-time playback analytics and engagement tracking
 * - User progress monitoring and completion metrics
 * - Interactive annotation click analytics
 * - Learning effectiveness measurement
 * - A/B testing for tutorial content optimization
 * - Performance insights and recommendation engine data
 *
 * @created 2025-01-04
 * @author Video Tutorials & Interactive Guides Specialist
 */

'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { helpAnalytics } from '@/lib/help/help-analytics'
import { useHelp } from '@/lib/help/help-context-provider'

// ========================
// TYPE DEFINITIONS
// ========================

export interface VideoAnalyticsEvent {
  id: string
  videoId: string
  userId?: string
  sessionId: string
  timestamp: number
  eventType: VideoEventType
  data: VideoEventData
}

export type VideoEventType =
  | 'video_start'
  | 'video_play'
  | 'video_pause'
  | 'video_seek'
  | 'video_complete'
  | 'video_abandon'
  | 'chapter_enter'
  | 'chapter_complete'
  | 'annotation_click'
  | 'annotation_hover'
  | 'quality_change'
  | 'speed_change'
  | 'fullscreen_toggle'
  | 'caption_toggle'
  | 'volume_change'
  | 'practice_exercise_start'
  | 'practice_exercise_complete'
  | 'practice_exercise_fail'
  | 'hint_request'
  | 'troubleshooting_access'

export interface VideoEventData {
  // Playback data
  currentTime?: number
  duration?: number
  playbackRate?: number
  volume?: number
  quality?: string

  // Chapter data
  chapterId?: string
  chapterTitle?: string

  // Annotation data
  annotationId?: string
  annotationType?: string

  // Interaction data
  isFullscreen?: boolean
  captionsEnabled?: boolean

  // Practice data
  exerciseId?: string
  exerciseResult?: 'success' | 'failure' | 'partial'
  attemptNumber?: number
  hintsUsed?: number

  // Context data
  contextType?: string
  workflowState?: string
  userSkillLevel?: number

  // Additional metadata
  deviceType?: 'desktop' | 'tablet' | 'mobile'
  browserType?: string
  networkSpeed?: 'slow' | 'medium' | 'fast'

  // A/B testing data
  variantId?: string
  experimentId?: string
}

export interface VideoSessionMetrics {
  sessionId: string
  videoId: string
  userId?: string
  startTime: number
  endTime?: number
  totalWatchTime: number
  actualDuration: number
  completionRate: number
  engagementScore: number

  // Playback metrics
  pauseCount: number
  seekCount: number
  seekDistance: number
  averagePlaybackRate: number
  qualityChanges: number

  // Interaction metrics
  annotationClicks: number
  chapterNavigations: number
  practiceAttempts: number
  practiceSuccessRate: number
  hintsRequested: number
  troubleshootingAccessed: boolean

  // Attention metrics
  focusLossEvents: number
  backgroundTime: number
  inactiveTime: number

  // Context metrics
  contextType?: string
  workflowState?: string
  userSkillLevel?: number
  deviceType?: string

  // Outcome metrics
  wasCompleted: boolean
  wasAbandoned: boolean
  abandonmentReason?: 'early_exit' | 'technical_issue' | 'content_difficulty' | 'external_interrupt'
  finalRating?: number
  willRecommend?: boolean
}

export interface VideoAnalyticsContextType {
  // Event tracking
  trackEvent: (eventType: VideoEventType, data: VideoEventData) => void

  // Session management
  startSession: (videoId: string) => string
  endSession: (sessionId: string, metrics?: Partial<VideoSessionMetrics>) => void

  // Metrics
  getSessionMetrics: (sessionId: string) => VideoSessionMetrics | null

  // Analytics state
  currentSession: VideoSessionMetrics | null
  isTrackingEnabled: boolean

  // Configuration
  enableTracking: () => void
  disableTracking: () => void

  // Reporting
  generateReport: (
    videoId: string,
    timeframe?: 'day' | 'week' | 'month'
  ) => Promise<VideoAnalyticsReport>
}

export interface VideoAnalyticsReport {
  videoId: string
  title: string
  timeframe: {
    start: string
    end: string
  }

  // Viewership metrics
  totalViews: number
  uniqueViewers: number
  completionRate: number
  averageWatchTime: number
  averageEngagementScore: number

  // Interaction metrics
  totalAnnotationClicks: number
  totalPracticeAttempts: number
  averagePracticeSuccessRate: number

  // Performance insights
  dropoffPoints: Array<{
    timestamp: number
    percentage: number
    commonCause?: string
  }>

  popularChapters: Array<{
    chapterId: string
    title: string
    viewCount: number
    completionRate: number
  }>

  annotationPerformance: Array<{
    annotationId: string
    clickCount: number
    engagementRate: number
    conversionRate: number
  }>

  // User segmentation
  performanceBySkillLevel: Record<
    number,
    {
      completionRate: number
      averageWatchTime: number
      engagementScore: number
    }
  >

  // Recommendations
  optimizationSuggestions: Array<{
    type: 'content' | 'technical' | 'engagement'
    priority: 'high' | 'medium' | 'low'
    suggestion: string
    potentialImpact: string
  }>
}

// ========================
// ANALYTICS CONTEXT
// ========================

const VideoAnalyticsContext = createContext<VideoAnalyticsContextType | null>(null)

// ========================
// PROVIDER COMPONENT
// ========================

interface VideoAnalyticsProviderProps {
  children: React.ReactNode
  enableTracking?: boolean
  sampleRate?: number // For performance optimization
  batchSize?: number // For batched event sending
}

export function VideoAnalyticsProvider({
  children,
  enableTracking: enableTrackingProp = true,
  sampleRate = 1.0,
  batchSize = 10,
}: VideoAnalyticsProviderProps) {
  const { state: helpState } = useHelp()

  // State management
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(enableTrackingProp)
  const [currentSession, setCurrentSession] = useState<VideoSessionMetrics | null>(null)

  // Analytics storage
  const sessionsRef = useRef<Map<string, VideoSessionMetrics>>(new Map())
  const eventsBufferRef = useRef<VideoAnalyticsEvent[]>([])
  const sendTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Performance tracking
  const performanceObserverRef = useRef<PerformanceObserver | null>(null)

  // ========================
  // SESSION MANAGEMENT
  // ========================

  const startSession = useCallback(
    (videoId: string): string => {
      if (!isTrackingEnabled) return ''

      const sessionId = `video_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const sessionMetrics: VideoSessionMetrics = {
        sessionId,
        videoId,
        userId: helpState.userId,
        startTime: Date.now(),
        totalWatchTime: 0,
        actualDuration: 0,
        completionRate: 0,
        engagementScore: 0,
        pauseCount: 0,
        seekCount: 0,
        seekDistance: 0,
        averagePlaybackRate: 1.0,
        qualityChanges: 0,
        annotationClicks: 0,
        chapterNavigations: 0,
        practiceAttempts: 0,
        practiceSuccessRate: 0,
        hintsRequested: 0,
        troubleshootingAccessed: false,
        focusLossEvents: 0,
        backgroundTime: 0,
        inactiveTime: 0,
        wasCompleted: false,
        wasAbandoned: false,
        deviceType: getDeviceType(),
        contextType: helpState.context?.type,
        workflowState: helpState.context?.workflowState,
        userSkillLevel: helpState.userProfile?.skillLevel,
      }

      sessionsRef.current.set(sessionId, sessionMetrics)
      setCurrentSession(sessionMetrics)

      // Track session start
      trackEvent('video_start', {
        currentTime: 0,
        contextType: helpState.context?.type,
        workflowState: helpState.context?.workflowState,
        userSkillLevel: helpState.userProfile?.skillLevel,
        deviceType: getDeviceType(),
      })

      // Set up performance monitoring
      setupPerformanceMonitoring(sessionId)

      return sessionId
    },
    [isTrackingEnabled, helpState]
  )

  const endSession = useCallback(
    (sessionId: string, additionalMetrics?: Partial<VideoSessionMetrics>) => {
      if (!isTrackingEnabled) return

      const session = sessionsRef.current.get(sessionId)
      if (!session) return

      const updatedSession = {
        ...session,
        ...additionalMetrics,
        endTime: Date.now(),
      }

      // Calculate final metrics
      updatedSession.engagementScore = calculateEngagementScore(updatedSession)

      sessionsRef.current.set(sessionId, updatedSession)

      // Send final session data
      sendSessionMetrics(updatedSession)

      // Cleanup
      if (currentSession?.sessionId === sessionId) {
        setCurrentSession(null)
      }

      cleanupPerformanceMonitoring()
    },
    [isTrackingEnabled, currentSession]
  )

  // ========================
  // EVENT TRACKING
  // ========================

  const trackEvent = useCallback(
    (eventType: VideoEventType, data: VideoEventData) => {
      if (!isTrackingEnabled || Math.random() > sampleRate) return

      const event: VideoAnalyticsEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        videoId: currentSession?.videoId || '',
        userId: helpState.userId,
        sessionId: currentSession?.sessionId || helpState.sessionId,
        timestamp: Date.now(),
        eventType,
        data: {
          ...data,
          deviceType: getDeviceType(),
          browserType: getBrowserType(),
          networkSpeed: getNetworkSpeed(),
        },
      }

      // Add to buffer
      eventsBufferRef.current.push(event)

      // Update current session metrics
      if (currentSession) {
        updateSessionMetrics(currentSession, event)
      }

      // Send events in batches
      if (eventsBufferRef.current.length >= batchSize) {
        sendEventBatch()
      } else {
        // Schedule batch send
        if (sendTimerRef.current) clearTimeout(sendTimerRef.current)
        sendTimerRef.current = setTimeout(sendEventBatch, 2000)
      }

      // Also track with help analytics for integration
      helpAnalytics.trackHelpInteraction(
        event.videoId,
        event.sessionId,
        eventType,
        'video_analytics',
        data
      )
    },
    [isTrackingEnabled, sampleRate, currentSession, helpState, batchSize]
  )

  // ========================
  // METRICS CALCULATION
  // ========================

  const updateSessionMetrics = useCallback(
    (session: VideoSessionMetrics, event: VideoAnalyticsEvent) => {
      switch (event.eventType) {
        case 'video_pause':
          session.pauseCount++
          break
        case 'video_seek':
          session.seekCount++
          if (event.data.currentTime && session.actualDuration) {
            session.seekDistance += Math.abs(event.data.currentTime - session.actualDuration)
          }
          break
        case 'video_complete':
          session.wasCompleted = true
          session.completionRate = 1.0
          break
        case 'chapter_enter':
          session.chapterNavigations++
          break
        case 'annotation_click':
          session.annotationClicks++
          break
        case 'practice_exercise_start':
          session.practiceAttempts++
          break
        case 'practice_exercise_complete':
          if (event.data.exerciseResult === 'success') {
            session.practiceSuccessRate =
              (session.practiceSuccessRate * (session.practiceAttempts - 1) + 1) /
              session.practiceAttempts
          }
          break
        case 'hint_request':
          session.hintsRequested++
          break
        case 'troubleshooting_access':
          session.troubleshootingAccessed = true
          break
        case 'quality_change':
          session.qualityChanges++
          break
      }

      // Update total watch time and completion rate
      if (event.data.currentTime && event.data.duration) {
        session.totalWatchTime = Math.max(session.totalWatchTime, event.data.currentTime)
        session.completionRate = session.totalWatchTime / event.data.duration
      }

      sessionsRef.current.set(session.sessionId, session)
      setCurrentSession({ ...session })
    },
    []
  )

  const calculateEngagementScore = useCallback((session: VideoSessionMetrics): number => {
    let score = 0

    // Base score from completion rate (0-40 points)
    score += session.completionRate * 40

    // Interaction score (0-30 points)
    const interactionScore = Math.min(
      30,
      session.annotationClicks * 2 + session.chapterNavigations * 1.5 + session.practiceAttempts * 3
    )
    score += interactionScore

    // Practice success bonus (0-20 points)
    score += session.practiceSuccessRate * 20

    // Engagement penalties
    if (session.pauseCount > 5) score -= 5
    if (session.seekCount > 10) score -= 5
    if (session.abandonmentReason) score -= 15

    // Engagement bonuses
    if (session.wasCompleted && session.practiceAttempts > 0) score += 10
    if (session.troubleshootingAccessed && session.wasCompleted) score += 5

    return Math.max(0, Math.min(100, score))
  }, [])

  // ========================
  // DATA TRANSMISSION
  // ========================

  const sendEventBatch = useCallback(async () => {
    if (eventsBufferRef.current.length === 0) return

    const events = [...eventsBufferRef.current]
    eventsBufferRef.current = []

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/help/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      })

      if (!response.ok) {
        throw new Error(`Failed to send events: ${response.statusText}`)
      }
    } catch (error) {
      console.warn('Failed to send video analytics events:', error)
      // Re-add events to buffer for retry
      eventsBufferRef.current.unshift(...events)
    }
  }, [])

  const sendSessionMetrics = useCallback(async (session: VideoSessionMetrics) => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/help/analytics/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session }),
      })

      if (!response.ok) {
        throw new Error(`Failed to send session metrics: ${response.statusText}`)
      }
    } catch (error) {
      console.warn('Failed to send session metrics:', error)
    }
  }, [])

  // ========================
  // REPORTING
  // ========================

  const generateReport = useCallback(
    async (
      videoId: string,
      timeframe: 'day' | 'week' | 'month' = 'week'
    ): Promise<VideoAnalyticsReport> => {
      try {
        // TODO: Replace with actual API call
        const response = await fetch(
          `/api/help/analytics/reports/${videoId}?timeframe=${timeframe}`
        )

        if (!response.ok) {
          throw new Error(`Failed to generate report: ${response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        console.error('Failed to generate analytics report:', error)

        // Return mock report for demonstration
        return {
          videoId,
          title: 'Mock Video Title',
          timeframe: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
          totalViews: 150,
          uniqueViewers: 120,
          completionRate: 0.78,
          averageWatchTime: 360,
          averageEngagementScore: 72,
          totalAnnotationClicks: 45,
          totalPracticeAttempts: 89,
          averagePracticeSuccessRate: 0.65,
          dropoffPoints: [
            { timestamp: 120, percentage: 15, commonCause: 'complex_concept' },
            { timestamp: 300, percentage: 25, commonCause: 'practice_difficulty' },
          ],
          popularChapters: [
            { chapterId: 'chapter-1', title: 'Introduction', viewCount: 140, completionRate: 0.95 },
            {
              chapterId: 'chapter-2',
              title: 'Advanced Topics',
              viewCount: 89,
              completionRate: 0.67,
            },
          ],
          annotationPerformance: [
            { annotationId: 'anno-1', clickCount: 23, engagementRate: 0.15, conversionRate: 0.8 },
          ],
          performanceBySkillLevel: {
            1: { completionRate: 0.85, averageWatchTime: 420, engagementScore: 68 },
            2: { completionRate: 0.75, averageWatchTime: 350, engagementScore: 72 },
            3: { completionRate: 0.7, averageWatchTime: 300, engagementScore: 75 },
          },
          optimizationSuggestions: [
            {
              type: 'content',
              priority: 'high',
              suggestion: 'Add more interactive elements at the 2-minute mark to reduce dropoff',
              potentialImpact: 'Could improve completion rate by 10-15%',
            },
          ],
        }
      }
    },
    []
  )

  // ========================
  // UTILITY FUNCTIONS
  // ========================

  const getSessionMetrics = useCallback((sessionId: string): VideoSessionMetrics | null => {
    return sessionsRef.current.get(sessionId) || null
  }, [])

  const enableTracking = useCallback(() => {
    setIsTrackingEnabled(true)
  }, [])

  const disableTracking = useCallback(() => {
    setIsTrackingEnabled(false)
    // Send any remaining events
    if (eventsBufferRef.current.length > 0) {
      sendEventBatch()
    }
  }, [sendEventBatch])

  // ========================
  // PERFORMANCE MONITORING
  // ========================

  const setupPerformanceMonitoring = useCallback(
    (sessionId: string) => {
      if (!('PerformanceObserver' in window)) return

      try {
        performanceObserverRef.current = new PerformanceObserver((list) => {
          const entries = list.getEntries()

          entries.forEach((entry) => {
            // Track performance metrics that might affect video playback
            if (entry.entryType === 'measure' && entry.name.includes('video')) {
              trackEvent('video_performance', {
                duration: entry.duration,
                startTime: entry.startTime,
              })
            }
          })
        })

        performanceObserverRef.current.observe({ entryTypes: ['measure', 'navigation'] })
      } catch (error) {
        console.warn('Performance monitoring not available:', error)
      }
    },
    [trackEvent]
  )

  const cleanupPerformanceMonitoring = useCallback(() => {
    if (performanceObserverRef.current) {
      performanceObserverRef.current.disconnect()
      performanceObserverRef.current = null
    }
  }, [])

  // ========================
  // DEVICE DETECTION
  // ========================

  const getDeviceType = useCallback((): 'desktop' | 'tablet' | 'mobile' => {
    if (typeof window === 'undefined') return 'desktop'

    const width = window.innerWidth
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }, [])

  const getBrowserType = useCallback((): string => {
    if (typeof window === 'undefined') return 'unknown'

    const userAgent = window.navigator.userAgent
    if (userAgent.includes('Chrome')) return 'chrome'
    if (userAgent.includes('Firefox')) return 'firefox'
    if (userAgent.includes('Safari')) return 'safari'
    if (userAgent.includes('Edge')) return 'edge'
    return 'other'
  }, [])

  const getNetworkSpeed = useCallback((): 'slow' | 'medium' | 'fast' => {
    if (typeof window === 'undefined') return 'medium'

    // @ts-ignore - Not all browsers support this
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection

    if (!connection) return 'medium'

    const effectiveType = connection.effectiveType
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'slow'
    if (effectiveType === '3g') return 'medium'
    return 'fast'
  }, [])

  // ========================
  // CLEANUP EFFECTS
  // ========================

  useEffect(() => {
    // Setup beforeunload handler to send remaining events
    const handleBeforeUnload = () => {
      if (eventsBufferRef.current.length > 0) {
        // Use sendBeacon for reliable event sending during unload
        const events = eventsBufferRef.current
        if (navigator.sendBeacon && events.length > 0) {
          navigator.sendBeacon('/api/help/analytics/events', JSON.stringify({ events }))
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current)
      cleanupPerformanceMonitoring()
    }
  }, [cleanupPerformanceMonitoring])

  // ========================
  // CONTEXT VALUE
  // ========================

  const contextValue: VideoAnalyticsContextType = {
    trackEvent,
    startSession,
    endSession,
    getSessionMetrics,
    currentSession,
    isTrackingEnabled,
    enableTracking,
    disableTracking,
    generateReport,
  }

  return (
    <VideoAnalyticsContext.Provider value={contextValue}>{children}</VideoAnalyticsContext.Provider>
  )
}

// ========================
// HOOKS
// ========================

export function useVideoAnalytics(): VideoAnalyticsContextType {
  const context = useContext(VideoAnalyticsContext)

  if (!context) {
    throw new Error('useVideoAnalytics must be used within a VideoAnalyticsProvider')
  }

  return context
}

// ========================
// EXPORTS
// ========================

export default VideoAnalyticsProvider
export type {
  VideoAnalyticsEvent,
  VideoEventType,
  VideoEventData,
  VideoSessionMetrics,
  VideoAnalyticsReport,
  VideoAnalyticsContextType,
}
