'use client'

import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createLogger } from '@/lib/logs/console/logger'
import { cn } from '@/lib/utils'
import { useModeContext } from '@/contexts/mode-context'
import type { ViewMode } from '@/types/mode-switching'
import { useTransitionTrigger } from './mode-transition'

const logger = createLogger('ModeShortcuts')

interface ShortcutConfig {
  key: string
  modifiers: string[]
  description: string
  action: () => void
  category: 'navigation' | 'layout' | 'utility'
}

/**
 * Keyboard shortcuts provider for mode switching
 */
export function ModeShortcutsProvider({ children }: { children: React.ReactNode }) {
  const { state, switchMode } = useModeContext()
  const { triggerTransition } = useTransitionTrigger()
  const [showHelp, setShowHelp] = useState(false)

  // Define all keyboard shortcuts
  const shortcuts: ShortcutConfig[] = [
    // Mode switching shortcuts
    {
      key: 'v',
      modifiers: ['alt'],
      description: 'Switch to Visual Mode',
      action: () => triggerTransition('visual'),
      category: 'navigation',
    },
    {
      key: 'c',
      modifiers: ['alt'],
      description: 'Switch to Chat Mode',
      action: () => triggerTransition('chat'),
      category: 'navigation',
    },
    {
      key: 'h',
      modifiers: ['alt'],
      description: 'Switch to Hybrid Mode',
      action: () => triggerTransition('hybrid'),
      category: 'navigation',
    },

    // Layout shortcuts (for hybrid mode)
    {
      key: '1',
      modifiers: ['ctrl', 'shift'],
      description: 'Horizontal Split Layout',
      action: () => {
        if (state.currentMode === 'hybrid') {
          // Update hybrid layout to horizontal split
          switchMode('hybrid', {
            hybridLayout: { ...state.preferences.hybridDefaults, type: 'split-horizontal' },
          })
        }
      },
      category: 'layout',
    },
    {
      key: '2',
      modifiers: ['ctrl', 'shift'],
      description: 'Vertical Split Layout',
      action: () => {
        if (state.currentMode === 'hybrid') {
          switchMode('hybrid', {
            hybridLayout: { ...state.preferences.hybridDefaults, type: 'split-vertical' },
          })
        }
      },
      category: 'layout',
    },
    {
      key: '3',
      modifiers: ['ctrl', 'shift'],
      description: 'Left Sidebar Layout',
      action: () => {
        if (state.currentMode === 'hybrid') {
          switchMode('hybrid', {
            hybridLayout: { ...state.preferences.hybridDefaults, type: 'sidebar-left' },
          })
        }
      },
      category: 'layout',
    },
    {
      key: '4',
      modifiers: ['ctrl', 'shift'],
      description: 'Right Sidebar Layout',
      action: () => {
        if (state.currentMode === 'hybrid') {
          switchMode('hybrid', {
            hybridLayout: { ...state.preferences.hybridDefaults, type: 'sidebar-right' },
          })
        }
      },
      category: 'layout',
    },

    // Utility shortcuts
    {
      key: '?',
      modifiers: ['shift'],
      description: 'Show/Hide Keyboard Shortcuts',
      action: () => setShowHelp((prev) => !prev),
      category: 'utility',
    },
    {
      key: 'Escape',
      modifiers: [],
      description: 'Hide Keyboard Shortcuts',
      action: () => setShowHelp(false),
      category: 'utility',
    },
  ]

  // Check if key combination matches a shortcut
  const matchesShortcut = useCallback((event: KeyboardEvent, shortcut: ShortcutConfig): boolean => {
    // Check main key
    if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
      return false
    }

    // Check modifiers
    const requiredModifiers = new Set(shortcut.modifiers)
    const pressedModifiers = new Set()

    if (event.ctrlKey || event.metaKey) pressedModifiers.add('ctrl')
    if (event.altKey) pressedModifiers.add('alt')
    if (event.shiftKey) pressedModifiers.add('shift')

    // Must have all required modifiers and no extra ones (except for special cases)
    const hasRequiredModifiers = [...requiredModifiers].every((mod) => pressedModifiers.has(mod))
    const hasExtraModifiers = [...pressedModifiers].some((mod) => !requiredModifiers.has(mod))

    // Special handling for keys that naturally require shift (like ?)
    if (shortcut.key === '?' && event.shiftKey) {
      return true
    }

    return hasRequiredModifiers && !hasExtraModifiers
  }, [])

  // Global keyboard event handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.hasAttribute('data-chat-input')

      if (isInput && !['Escape'].includes(event.key)) {
        return
      }

      // Find matching shortcut
      const matchedShortcut = shortcuts.find((shortcut) => matchesShortcut(event, shortcut))

      if (matchedShortcut) {
        event.preventDefault()
        event.stopPropagation()

        logger.debug('Keyboard shortcut triggered', {
          key: matchedShortcut.key,
          modifiers: matchedShortcut.modifiers,
          description: matchedShortcut.description,
        })

        matchedShortcut.action()
      }
    },
    [matchesShortcut, shortcuts]
  )

  // Register global keyboard listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [handleKeyDown])

  // Log available shortcuts on mount
  useEffect(() => {
    logger.info('Mode switching shortcuts registered', {
      shortcuts: shortcuts.map((s) => ({
        combination: `${s.modifiers.join('+')}${s.modifiers.length ? '+' : ''}${s.key}`,
        description: s.description,
        category: s.category,
      })),
    })
  }, [shortcuts])

  return (
    <>
      {children}
      <ShortcutHelpOverlay
        show={showHelp}
        shortcuts={shortcuts}
        currentMode={state.currentMode}
        onClose={() => setShowHelp(false)}
      />
    </>
  )
}

/**
 * Shortcut help overlay component
 */
function ShortcutHelpOverlay({
  show,
  shortcuts,
  currentMode,
  onClose,
}: {
  show: boolean
  shortcuts: ShortcutConfig[]
  currentMode: ViewMode
  onClose: () => void
}) {
  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce(
    (groups, shortcut) => {
      if (!groups[shortcut.category]) {
        groups[shortcut.category] = []
      }
      groups[shortcut.category].push(shortcut)
      return groups
    },
    {} as Record<string, ShortcutConfig[]>
  )

  const formatShortcut = (shortcut: ShortcutConfig) => {
    const parts = [...shortcut.modifiers, shortcut.key]
    return parts.join(' + ').toUpperCase()
  }

  const categoryIcons = {
    navigation: (
      <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
        />
      </svg>
    ),
    layout: (
      <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z'
        />
      </svg>
    ),
    utility: (
      <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
        />
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
        />
      </svg>
    ),
  }

  const categoryTitles = {
    navigation: 'Mode Navigation',
    layout: 'Layout Control',
    utility: 'Utilities',
  }

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            className='fixed inset-0 z-50 bg-black/50 backdrop-blur-sm'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Help Panel */}
          <motion.div
            className='fixed inset-4 z-50 mx-auto max-w-4xl rounded-lg bg-background shadow-2xl ring-1 ring-border md:inset-8 lg:inset-16'
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className='flex items-center justify-between border-border border-b p-6'>
              <div className='flex items-center gap-3'>
                <div className='rounded-lg bg-primary/10 p-2'>
                  <svg
                    className='h-6 w-6 text-primary'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z'
                    />
                  </svg>
                </div>
                <div>
                  <h2 className='font-semibold text-xl'>Keyboard Shortcuts</h2>
                  <p className='text-muted-foreground text-sm'>
                    Currently in <span className='font-medium text-primary'>{currentMode}</span>{' '}
                    mode
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className='rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
              >
                <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className='max-h-[60vh] overflow-y-auto p-6'>
              <div className='grid gap-8 md:grid-cols-2 lg:grid-cols-3'>
                {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                  <motion.div
                    key={category}
                    className='space-y-4'
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className='flex items-center gap-2'>
                      <div className='text-primary'>
                        {categoryIcons[category as keyof typeof categoryIcons]}
                      </div>
                      <h3 className='font-semibold'>
                        {categoryTitles[category as keyof typeof categoryTitles] || category}
                      </h3>
                    </div>

                    <div className='space-y-3'>
                      {categoryShortcuts.map((shortcut, index) => (
                        <div
                          key={`${category}-${index}`}
                          className='flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3'
                        >
                          <span className='text-muted-foreground text-sm'>
                            {shortcut.description}
                          </span>
                          <kbd className='inline-flex items-center rounded bg-background px-2 py-1 font-medium text-foreground text-xs ring-1 ring-border'>
                            {formatShortcut(shortcut)}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className='border-border border-t px-6 py-4'>
              <div className='flex items-center justify-between text-muted-foreground text-xs'>
                <span>
                  Press <kbd className='rounded bg-muted px-1 py-0.5'>?</kbd> to toggle this help
                </span>
                <span>
                  Press <kbd className='rounded bg-muted px-1 py-0.5'>Esc</kbd> to close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * Quick shortcut hint component
 */
export function QuickShortcutHints({ className }: { className?: string }) {
  const { state } = useModeContext()
  const [showHints, setShowHints] = useState(false)

  const quickHints = [
    { key: 'Alt + V', description: 'Visual' },
    { key: 'Alt + C', description: 'Chat' },
    { key: 'Alt + H', description: 'Hybrid' },
    { key: '?', description: 'Help' },
  ]

  return (
    <motion.div
      className={cn(
        'fixed bottom-6 left-6 z-30 rounded-lg bg-background/95 ring-1 ring-border backdrop-blur-sm',
        className
      )}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      onMouseEnter={() => setShowHints(true)}
      onMouseLeave={() => setShowHints(false)}
    >
      <div className='p-2'>
        <button className='text-muted-foreground text-xs hover:text-foreground'>⌨️ Shortcuts</button>
      </div>

      <AnimatePresence>
        {showHints && (
          <motion.div
            className='absolute bottom-full left-0 mb-2 min-w-48 rounded-lg bg-background p-3 shadow-lg ring-1 ring-border'
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className='space-y-2'>
              {quickHints.map((hint, index) => (
                <div key={index} className='flex items-center justify-between text-xs'>
                  <span className='text-muted-foreground'>{hint.description}</span>
                  <kbd className='rounded bg-muted px-1 py-0.5 font-mono'>{hint.key}</kbd>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
