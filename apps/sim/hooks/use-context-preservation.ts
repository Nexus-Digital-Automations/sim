'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useReactFlow } from 'reactflow'
import { createLogger } from '@/lib/logs/console/logger'
import { useModeContext } from '@/contexts/mode-context'
import { useExecutionStore } from '@/stores/execution/store'
import type { ModeContext, ViewMode } from '@/types/mode-switching'

const logger = createLogger('ContextPreservation')

/**
 * Hook for preserving and restoring context across mode switches
 */
export function useContextPreservation() {
  const { state, preserveContext, restoreContext } = useModeContext()
  const reactFlowInstance = useReactFlow()
  const previousModeRef = useRef<ViewMode>(state.currentMode)

  // Store references for context capture
  const contextCaptureRef = useRef<{
    visual?: () => ModeContext['visualContext']
    chat?: () => ModeContext['chatContext']
    execution?: () => ModeContext['executionContext']
  }>({})

  /**
   * Capture visual editor context
   */
  const captureVisualContext = useCallback((): ModeContext['visualContext'] => {
    try {
      if (!reactFlowInstance) return undefined

      const viewport = reactFlowInstance.getViewport()
      const nodes = reactFlowInstance.getNodes()
      const edges = reactFlowInstance.getEdges()

      // Get selected elements
      const selectedNodes = nodes.filter((node) => node.selected).map((node) => node.id)
      const selectedEdges = edges.filter((edge) => edge.selected).map((edge) => edge.id)

      // Capture sidebar and panel states
      const sidebarState =
        (document.querySelector('[data-sidebar]')?.getAttribute('data-state') as
          | 'open'
          | 'closed') || 'open'
      const activePanel =
        document.querySelector('[data-panel-active]')?.getAttribute('data-panel-active') ||
        undefined

      const context = {
        viewport: {
          x: viewport.x,
          y: viewport.y,
          zoom: viewport.zoom,
        },
        selectedNodes,
        selectedEdges,
        cameraPosition: {
          x: viewport.x,
          y: viewport.y,
        },
        sidebarState,
        activePanel,
      }

      logger.debug('Visual context captured', context)
      return context
    } catch (error) {
      logger.error('Failed to capture visual context', { error })
      return undefined
    }
  }, [reactFlowInstance])

  /**
   * Capture chat interface context
   */
  const captureChatContext = useCallback((): ModeContext['chatContext'] => {
    try {
      // Find chat container
      const chatContainer = document.querySelector('[data-chat-container]')
      if (!chatContainer) return undefined

      // Get scroll position
      const scrollPosition = chatContainer.scrollTop || 0

      // Get input value
      const inputElement = document.querySelector('[data-chat-input]') as HTMLInputElement
      const inputValue = inputElement?.value || ''

      // Get typing indicator state
      const isTyping = document.querySelector('[data-typing-indicator]') !== null

      // Get active conversation from URL or data attributes
      const activeConversation =
        new URLSearchParams(window.location.search).get('conversation') ||
        document.querySelector('[data-conversation-id]')?.getAttribute('data-conversation-id') ||
        undefined

      // Get agent ID
      const agentId =
        new URLSearchParams(window.location.pathname).get('agentId') ||
        document.querySelector('[data-agent-id]')?.getAttribute('data-agent-id') ||
        undefined

      // Capture message history (limited for performance)
      const messageElements = Array.from(document.querySelectorAll('[data-message]'))
      const messageHistory = messageElements.slice(-50).map((el, index) => ({
        id: el.getAttribute('data-message-id') || `msg-${index}`,
        content: el.textContent || '',
        role: el.getAttribute('data-message-role') || 'user',
        timestamp: el.getAttribute('data-message-timestamp') || new Date().toISOString(),
      }))

      const context = {
        activeConversation,
        agentId,
        scrollPosition,
        messageHistory,
        inputValue,
        isTyping,
      }

      logger.debug('Chat context captured', context)
      return context
    } catch (error) {
      logger.error('Failed to capture chat context', { error })
      return undefined
    }
  }, [])

  /**
   * Capture workflow execution context
   */
  const captureExecutionContext = useCallback((): ModeContext['executionContext'] => {
    try {
      const executionState = useExecutionStore.getState()

      const context = {
        isRunning: executionState.isRunning || false,
        activeBlocks: Array.from(executionState.activeBlockIds || []),
        pendingBlocks: executionState.pendingBlocks || [],
        debugMode: executionState.debugMode || false,
        breakpoints: executionState.breakpoints || [],
      }

      logger.debug('Execution context captured', context)
      return context
    } catch (error) {
      logger.error('Failed to capture execution context', { error })
      return undefined
    }
  }, [])

  /**
   * Capture UI context
   */
  const captureUIContext = useCallback((): ModeContext['uiContext'] => {
    try {
      // Get theme from document or localStorage
      const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'

      // Get sidebar state
      const sidebarElement = document.querySelector('[data-sidebar]')
      const sidebarExpanded = sidebarElement?.getAttribute('data-expanded') === 'true'

      // Get open modals
      const modalElements = Array.from(document.querySelectorAll('[data-modal-open]'))
      const modalsOpen = modalElements
        .map((el) => el.getAttribute('data-modal-id'))
        .filter(Boolean) as string[]

      // Get notifications (from notification system if implemented)
      const notificationElements = Array.from(document.querySelectorAll('[data-notification]'))
      const notifications = notificationElements.map((el, index) => ({
        id: el.getAttribute('data-notification-id') || `notif-${index}`,
        type: el.getAttribute('data-notification-type') || 'info',
        message: el.textContent || '',
        timestamp: Date.now(),
      }))

      const context = {
        theme,
        sidebarExpanded,
        notifications,
        modalsOpen,
      }

      logger.debug('UI context captured', context)
      return context
    } catch (error) {
      logger.error('Failed to capture UI context', { error })
      return undefined
    }
  }, [])

  /**
   * Capture all relevant context for current mode
   */
  const captureCurrentContext = useCallback(() => {
    const currentMode = state.currentMode

    const context: Partial<ModeContext> = {}

    // Always capture UI context
    context.uiContext = captureUIContext()

    // Always capture execution context if available
    context.executionContext = captureExecutionContext()

    // Mode-specific context capture
    switch (currentMode) {
      case 'visual':
        if (state.preferences.contextPreservation.visual) {
          context.visualContext = captureVisualContext()
        }
        break

      case 'chat':
        if (state.preferences.contextPreservation.chat) {
          context.chatContext = captureChatContext()
        }
        break

      case 'hybrid':
        // Capture both visual and chat context in hybrid mode
        if (state.preferences.contextPreservation.visual) {
          context.visualContext = captureVisualContext()
        }
        if (state.preferences.contextPreservation.chat) {
          context.chatContext = captureChatContext()
        }
        break
    }

    preserveContext(context)
    logger.info('Context captured for mode', {
      mode: currentMode,
      contextKeys: Object.keys(context),
    })
  }, [
    state.currentMode,
    state.preferences.contextPreservation,
    captureVisualContext,
    captureChatContext,
    captureExecutionContext,
    captureUIContext,
    preserveContext,
  ])

  /**
   * Restore visual context
   */
  const restoreVisualContext = useCallback(
    (context: ModeContext['visualContext']) => {
      if (!context || !reactFlowInstance) return

      try {
        // Restore viewport
        if (context.viewport) {
          reactFlowInstance.setViewport(context.viewport, { duration: 300 })
        }

        // Restore selections (with delay to ensure nodes are rendered)
        setTimeout(() => {
          const nodes = reactFlowInstance.getNodes()
          const edges = reactFlowInstance.getEdges()

          // Clear current selections
          reactFlowInstance.setNodes(nodes.map((node) => ({ ...node, selected: false })))
          reactFlowInstance.setEdges(edges.map((edge) => ({ ...edge, selected: false })))

          // Restore selected nodes
          if (context.selectedNodes?.length) {
            reactFlowInstance.setNodes(
              nodes.map((node) => ({
                ...node,
                selected: context.selectedNodes!.includes(node.id),
              }))
            )
          }

          // Restore selected edges
          if (context.selectedEdges?.length) {
            reactFlowInstance.setEdges(
              edges.map((edge) => ({
                ...edge,
                selected: context.selectedEdges!.includes(edge.id),
              }))
            )
          }
        }, 100)

        // Restore sidebar state
        if (context.sidebarState) {
          const sidebarElement = document.querySelector('[data-sidebar]')
          if (sidebarElement) {
            sidebarElement.setAttribute('data-state', context.sidebarState)
          }
        }

        // Restore active panel
        if (context.activePanel) {
          const panelElement = document.querySelector(`[data-panel="${context.activePanel}"]`)
          if (panelElement) {
            panelElement.setAttribute('data-panel-active', context.activePanel)
          }
        }

        logger.debug('Visual context restored', context)
      } catch (error) {
        logger.error('Failed to restore visual context', { error })
      }
    },
    [reactFlowInstance]
  )

  /**
   * Restore chat context
   */
  const restoreChatContext = useCallback((context: ModeContext['chatContext']) => {
    if (!context) return

    try {
      // Restore scroll position
      if (typeof context.scrollPosition === 'number') {
        const chatContainer = document.querySelector('[data-chat-container]')
        if (chatContainer) {
          chatContainer.scrollTop = context.scrollPosition
        }
      }

      // Restore input value
      if (context.inputValue) {
        const inputElement = document.querySelector('[data-chat-input]') as HTMLInputElement
        if (inputElement) {
          inputElement.value = context.inputValue
        }
      }

      // Navigate to active conversation if needed
      if (context.activeConversation && context.agentId) {
        const currentUrl = window.location.pathname
        const expectedUrl = `/chat/workspace/${context.agentId}/agent/${context.agentId}/conversation/${context.activeConversation}`

        if (!currentUrl.includes(context.activeConversation)) {
          // Only navigate if we're not already on the right conversation
          window.history.pushState({}, '', expectedUrl)
        }
      }

      logger.debug('Chat context restored', context)
    } catch (error) {
      logger.error('Failed to restore chat context', { error })
    }
  }, [])

  /**
   * Restore execution context
   */
  const restoreExecutionContext = useCallback((context: ModeContext['executionContext']) => {
    if (!context) return

    try {
      const executionStore = useExecutionStore.getState()

      // Restore debug mode
      if (typeof context.debugMode === 'boolean') {
        // Update debug mode in store
        executionStore.setDebugMode?.(context.debugMode)
      }

      // Restore breakpoints
      if (context.breakpoints?.length) {
        executionStore.setBreakpoints?.(context.breakpoints)
      }

      // Note: We don't restore running state or active/pending blocks
      // as these should be determined by current execution status

      logger.debug('Execution context restored', context)
    } catch (error) {
      logger.error('Failed to restore execution context', { error })
    }
  }, [])

  /**
   * Restore UI context
   */
  const restoreUIContext = useCallback((context: ModeContext['uiContext']) => {
    if (!context) return

    try {
      // Restore theme
      if (context.theme) {
        if (context.theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }

      // Restore sidebar state
      if (typeof context.sidebarExpanded === 'boolean') {
        const sidebarElement = document.querySelector('[data-sidebar]')
        if (sidebarElement) {
          sidebarElement.setAttribute('data-expanded', context.sidebarExpanded.toString())
        }
      }

      logger.debug('UI context restored', context)
    } catch (error) {
      logger.error('Failed to restore UI context', { error })
    }
  }, [])

  /**
   * Restore context for target mode
   */
  const restoreContextForMode = useCallback(
    (mode: ViewMode) => {
      const savedContext = restoreContext(mode)
      if (!savedContext) {
        logger.debug('No saved context found for mode', { mode })
        return
      }

      // Always restore UI and execution context
      if (savedContext.uiContext) {
        restoreUIContext(savedContext.uiContext)
      }

      if (savedContext.executionContext) {
        restoreExecutionContext(savedContext.executionContext)
      }

      // Mode-specific context restoration
      switch (mode) {
        case 'visual':
          if (savedContext.visualContext) {
            restoreVisualContext(savedContext.visualContext)
          }
          break

        case 'chat':
          if (savedContext.chatContext) {
            restoreChatContext(savedContext.chatContext)
          }
          break

        case 'hybrid':
          // Restore both contexts in hybrid mode
          if (savedContext.visualContext) {
            restoreVisualContext(savedContext.visualContext)
          }
          if (savedContext.chatContext) {
            restoreChatContext(savedContext.chatContext)
          }
          break
      }

      logger.info('Context restored for mode', { mode, contextKeys: Object.keys(savedContext) })
    },
    [
      restoreContext,
      restoreVisualContext,
      restoreChatContext,
      restoreExecutionContext,
      restoreUIContext,
    ]
  )

  // Set up context capture functions
  useEffect(() => {
    contextCaptureRef.current = {
      visual: captureVisualContext,
      chat: captureChatContext,
      execution: captureExecutionContext,
    }
  }, [captureVisualContext, captureChatContext, captureExecutionContext])

  // Auto-capture context when mode changes
  useEffect(() => {
    const previousMode = previousModeRef.current
    const currentMode = state.currentMode

    if (previousMode !== currentMode) {
      // Capture context for the mode we're leaving
      if (
        (previousMode && state.preferences.contextPreservation.visual) ||
        state.preferences.contextPreservation.chat
      ) {
        captureCurrentContext()
      }

      // Restore context for the mode we're entering
      setTimeout(() => {
        restoreContextForMode(currentMode)
      }, 100) // Small delay to ensure UI is rendered

      previousModeRef.current = currentMode
    }
  }, [
    state.currentMode,
    state.preferences.contextPreservation,
    captureCurrentContext,
    restoreContextForMode,
  ])

  // Periodic context capture (every 30 seconds when active)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        captureCurrentContext()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [captureCurrentContext])

  // Capture context before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      captureCurrentContext()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [captureCurrentContext])

  return {
    captureCurrentContext,
    restoreContextForMode,
    captureVisualContext,
    captureChatContext,
    captureExecutionContext,
    captureUIContext,
  }
}
