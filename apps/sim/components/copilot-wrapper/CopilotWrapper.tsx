/**
 * Copilot Wrapper Component
 *
 * Drop-in replacement for existing copilot components that provides
 * unified access to both external and local copilot systems. Maintains
 * backward compatibility while adding mode switching capabilities.
 */

'use client'

import React, { forwardRef, useImperativeHandle } from 'react'
import { UnifiedCopilot, type UnifiedCopilotRef } from '@/components/unified-copilot'
import { useUnifiedCopilot, useWorkspaceCopilotConfig } from '@/hooks/use-unified-copilot'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('CopilotWrapper')

interface CopilotWrapperProps {
  panelWidth: number
  workspaceId: string
  userId: string
  className?: string
}

// Legacy interface for backward compatibility
interface LegacyCopilotRef {
  createNewChat: () => void
  setInputValueAndFocus: (value: string) => void
}

export const CopilotWrapper = forwardRef<LegacyCopilotRef, CopilotWrapperProps>(({
  panelWidth,
  workspaceId,
  userId,
  className = '',
}, ref) => {
  const unifiedCopilotRef = React.useRef<UnifiedCopilotRef>(null)

  // Get unified copilot state and actions
  const {
    currentMode,
    getRecommendedMode,
  } = useUnifiedCopilot(workspaceId)

  // Get workspace configuration
  const workspaceConfig = useWorkspaceCopilotConfig(workspaceId)

  // Expose legacy interface for backward compatibility
  useImperativeHandle(ref, () => ({
    createNewChat: () => {
      logger.info('Legacy createNewChat called', { currentMode })
      unifiedCopilotRef.current?.createNewChat()
    },
    setInputValueAndFocus: (value: string) => {
      logger.info('Legacy setInputValueAndFocus called', { value, currentMode })
      unifiedCopilotRef.current?.setInputValueAndFocus(value)
    },
  }), [currentMode])

  return (
    <UnifiedCopilot
      ref={unifiedCopilotRef}
      panelWidth={panelWidth}
      workspaceId={workspaceId}
      userId={userId}
      className={className}
      defaultMode={getRecommendedMode()}
      allowModeSwitch={workspaceConfig.allowModeSwitch}
    />
  )
})

CopilotWrapper.displayName = 'CopilotWrapper'

// Enhanced wrapper with more features
interface EnhancedCopilotWrapperProps extends CopilotWrapperProps {
  onModeChange?: (mode: 'local' | 'external') => void
  enableAnalytics?: boolean
  enableKeyboardShortcuts?: boolean
}

export const EnhancedCopilotWrapper = forwardRef<UnifiedCopilotRef, EnhancedCopilotWrapperProps>(({
  panelWidth,
  workspaceId,
  userId,
  className = '',
  onModeChange,
  enableAnalytics = false,
  enableKeyboardShortcuts = true,
}, ref) => {
  const unifiedCopilotRef = React.useRef<UnifiedCopilotRef>(null)

  const {
    currentMode,
    getRecommendedMode,
    switchToLocal,
    switchToExternal,
  } = useUnifiedCopilot(workspaceId)

  const workspaceConfig = useWorkspaceCopilotConfig(workspaceId)

  // Handle mode changes
  React.useEffect(() => {
    if (onModeChange) {
      onModeChange(currentMode)
    }
  }, [currentMode, onModeChange])

  // Keyboard shortcuts
  React.useEffect(() => {
    if (!enableKeyboardShortcuts) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + L: Switch to local
      if (event.ctrlKey && event.shiftKey && event.key === 'L') {
        event.preventDefault()
        switchToLocal()
        logger.info('Switched to local mode via keyboard shortcut')
      }

      // Ctrl/Cmd + Shift + E: Switch to external
      if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        event.preventDefault()
        switchToExternal()
        logger.info('Switched to external mode via keyboard shortcut')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enableKeyboardShortcuts, switchToLocal, switchToExternal])

  // Analytics
  React.useEffect(() => {
    if (enableAnalytics) {
      logger.info('Copilot analytics event', {
        event: 'mode_active',
        mode: currentMode,
        workspaceId,
        userId,
        timestamp: new Date().toISOString(),
      })
    }
  }, [currentMode, enableAnalytics, workspaceId, userId])

  // Forward ref to unified copilot
  useImperativeHandle(ref, () => ({
    switchToLocal,
    switchToExternal,
    getCurrentMode: () => currentMode,
    createNewChat: () => unifiedCopilotRef.current?.createNewChat() || (() => {}),
    selectAgent: (agent) => unifiedCopilotRef.current?.selectAgent?.(agent),
    setInputValueAndFocus: (value) => unifiedCopilotRef.current?.setInputValueAndFocus?.(value),
  }), [switchToLocal, switchToExternal, currentMode])

  return (
    <UnifiedCopilot
      ref={unifiedCopilotRef}
      panelWidth={panelWidth}
      workspaceId={workspaceId}
      userId={userId}
      className={className}
      defaultMode={getRecommendedMode()}
      allowModeSwitch={workspaceConfig.allowModeSwitch}
    />
  )
})

EnhancedCopilotWrapper.displayName = 'EnhancedCopilotWrapper'