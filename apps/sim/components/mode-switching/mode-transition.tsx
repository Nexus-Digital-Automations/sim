'use client'

import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useModeContext } from '@/contexts/mode-context'
import { ViewMode } from '@/types/mode-switching'
import { createLogger } from '@/lib/logs/console/logger'
import { cn } from '@/lib/utils'

const logger = createLogger('ModeTransition')

interface ModeTransitionProps {
  children: React.ReactNode
  className?: string
}

/**
 * Animation variants for different transition types
 */
const transitionVariants = {
  // Slide transitions
  slideLeft: {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 0 }
  },
  slideRight: {
    initial: { x: '-100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '100%', opacity: 0 }
  },
  slideUp: {
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '-100%', opacity: 0 }
  },
  slideDown: {
    initial: { y: '-100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 0 }
  },

  // Fade transitions
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },

  // Scale transitions
  scale: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.2, opacity: 0 }
  },

  // Split screen transitions
  splitHorizontal: {
    initial: { scaleX: 0, opacity: 0 },
    animate: { scaleX: 1, opacity: 1 },
    exit: { scaleX: 0, opacity: 0 }
  },
  splitVertical: {
    initial: { scaleY: 0, opacity: 0 },
    animate: { scaleY: 1, opacity: 1 },
    exit: { scaleY: 0, opacity: 0 }
  }
}

/**
 * Transition configuration based on mode changes
 */
const modeTransitionConfig: Record<string, keyof typeof transitionVariants> = {
  'visual-chat': 'slideLeft',
  'chat-visual': 'slideRight',
  'visual-hybrid': 'splitHorizontal',
  'chat-hybrid': 'splitVertical',
  'hybrid-visual': 'fade',
  'hybrid-chat': 'fade'
}

/**
 * Loading overlay component for transitions
 */
function TransitionOverlay({ progress, mode }: { progress: number; mode: ViewMode }) {
  const modeLabels = {
    visual: 'Visual Editor',
    chat: 'Chat Interface',
    hybrid: 'Hybrid Mode'
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-center">
        <div className="mb-4">
          <motion.div
            className="mx-auto h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <motion.h3
          className="text-lg font-semibold text-foreground"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Switching to {modeLabels[mode]}
        </motion.h3>

        <div className="mt-4 w-64 rounded-full bg-muted">
          <motion.div
            className="h-2 rounded-full bg-primary"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        <motion.p
          className="mt-2 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {progress < 50 ? 'Preparing interface...' : 'Almost ready...'}
        </motion.p>
      </div>
    </motion.div>
  )
}

/**
 * Mode indicator component
 */
function ModeIndicator({ mode, isTransitioning }: { mode: ViewMode; isTransitioning: boolean }) {
  const modeIcons = {
    visual: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    chat: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    hybrid: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    )
  }

  const modeLabels = {
    visual: 'Visual',
    chat: 'Chat',
    hybrid: 'Hybrid'
  }

  return (
    <motion.div
      className={cn(
        'fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-background/95 px-3 py-2 text-sm font-medium shadow-lg ring-1 ring-border backdrop-blur-sm',
        isTransitioning && 'animate-pulse'
      )}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      transition={{ duration: 0.2 }}
    >
      <span className="text-muted-foreground">
        {modeIcons[mode]}
      </span>
      <span>
        {modeLabels[mode]}
      </span>
      {isTransitioning && (
        <motion.div
          className="h-2 w-2 rounded-full bg-primary"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </motion.div>
  )
}

/**
 * Main transition wrapper component
 */
export function ModeTransition({ children, className }: ModeTransitionProps) {
  const { state } = useModeContext()
  const [previousMode, setPreviousMode] = useState<ViewMode>(state.currentMode)
  const [showOverlay, setShowOverlay] = useState(false)
  const transitionRef = useRef<HTMLDivElement>(null)

  // Track mode changes for transition animations
  useEffect(() => {
    if (state.currentMode !== previousMode) {
      logger.debug('Mode changed', { from: previousMode, to: state.currentMode })
      setPreviousMode(state.currentMode)
    }
  }, [state.currentMode, previousMode])

  // Show/hide overlay based on transition state
  useEffect(() => {
    if (state.isTransitioning) {
      setShowOverlay(true)
    } else {
      // Delay hiding overlay to allow smooth completion
      const timeout = setTimeout(() => {
        setShowOverlay(false)
      }, 100)
      return () => clearTimeout(timeout)
    }
  }, [state.isTransitioning])

  // Determine transition variant based on mode change
  const getTransitionVariant = (from: ViewMode, to: ViewMode): keyof typeof transitionVariants => {
    const key = `${from}-${to}`
    return modeTransitionConfig[key] || 'fade'
  }

  const currentVariant = getTransitionVariant(previousMode, state.currentMode)
  const variant = transitionVariants[currentVariant]

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)} ref={transitionRef}>
      <AnimatePresence mode="wait">
        {showOverlay && (
          <TransitionOverlay
            key="overlay"
            progress={state.transitionProgress}
            mode={state.currentMode}
          />
        )}
      </AnimatePresence>

      <motion.div
        key={`mode-${state.currentMode}`}
        className="h-full w-full"
        variants={variant}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration: state.preferences.enableAnimations ? 0.3 : 0,
          ease: 'easeInOut'
        }}
        onAnimationStart={() => {
          logger.debug('Transition animation started', { mode: state.currentMode })
        }}
        onAnimationComplete={() => {
          logger.debug('Transition animation completed', { mode: state.currentMode })
        }}
      >
        {children}
      </motion.div>

      {/* Mode indicator */}
      <AnimatePresence>
        <ModeIndicator
          key="mode-indicator"
          mode={state.currentMode}
          isTransitioning={state.isTransitioning}
        />
      </AnimatePresence>
    </div>
  )
}

/**
 * Visual feedback component for mode switches
 */
export function ModeTransitionFeedback() {
  const { state } = useModeContext()
  const [recentTransitions, setRecentTransitions] = useState<string[]>([])

  // Track recent transitions for feedback
  useEffect(() => {
    if (state.history.length > 0) {
      const latestTransition = state.history[state.history.length - 1]
      const feedbackText = `${latestTransition.fromMode} → ${latestTransition.toMode}`

      setRecentTransitions(prev => [...prev.slice(-2), feedbackText])

      // Auto-remove after 3 seconds
      const timeout = setTimeout(() => {
        setRecentTransitions(prev => prev.slice(1))
      }, 3000)

      return () => clearTimeout(timeout)
    }
  }, [state.history])

  return (
    <AnimatePresence>
      {recentTransitions.map((transition, index) => (
        <motion.div
          key={`${transition}-${index}`}
          className="fixed top-4 right-4 z-50 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-lg"
          initial={{ opacity: 0, x: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          Mode switched: {transition}
        </motion.div>
      ))}
    </AnimatePresence>
  )
}

/**
 * Hook for triggering custom transition animations
 */
export function useTransitionTrigger() {
  const { state, switchMode } = useModeContext()

  const triggerTransition = React.useCallback(
    (targetMode: ViewMode, options?: { withFeedback?: boolean; duration?: number }) => {
      const { withFeedback = true, duration } = options || {}

      switchMode(targetMode, {
        transitionDuration: duration,
        preserveState: true
      })

      if (withFeedback) {
        // Trigger haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate(50)
        }
      }
    },
    [switchMode]
  )

  return {
    triggerTransition,
    isTransitioning: state.isTransitioning,
    progress: state.transitionProgress
  }
}