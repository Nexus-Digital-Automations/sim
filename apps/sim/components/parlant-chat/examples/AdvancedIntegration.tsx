/**
 * Advanced integration examples for Parlant Chat
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ParlantChatbox, ParlantChatProvider, useSimChat } from '../'
import { useChatAnalytics, useChatKeyboardShortcuts, useChatWidget } from '../hooks'
import { ChatDebugger, ConfigValidator, preloadChatResources } from '../utils'
import type { SimChatConfig, SimChatEventHandlers } from '../types'

/**
 * Example 1: Chat with analytics and monitoring
 */
export function AnalyticsChatExample() {
  const [sessionId] = useState(() => crypto.randomUUID())
  const analytics = useChatAnalytics(sessionId)

  const config: SimChatConfig = {
    sessionId,
    agentName: 'Analytics Bot',
    chatDescription: 'Chat with built-in analytics tracking',
    onSessionCreated: (id: string) => {
      console.log('Session created:', id)
      ChatDebugger.log('Analytics session started', { sessionId: id })
    },
  }

  const eventHandlers: SimChatEventHandlers = {
    onMessageSent: (message) => {
      analytics.incrementMessageCount()
      ChatDebugger.log('Message sent', { message })
    },
    onMessageReceived: (message) => {
      analytics.incrementMessageCount()
      if (message.metadata?.intent) {
        analytics.addIntent(message.metadata.intent)
      }
      ChatDebugger.log('Message received', { message })
    },
    onError: (error) => {
      console.error('Chat error:', error)
      ChatDebugger.log('Chat error occurred', { error: error.message })
    },
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Analytics Dashboard</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>Messages: {analytics.analytics.messageCount}</div>
          <div>Intents: {analytics.analytics.commonIntents.length}</div>
        </div>
        <button
          onClick={() => analytics.setUserSatisfaction(5)}
          className="mt-2 px-3 py-1 bg-green-500 text-white rounded text-xs"
        >
          Mark Satisfied
        </button>
      </div>

      <ParlantChatProvider config={config}>
        <ParlantChatbox {...config} />
      </ParlantChatProvider>
    </div>
  )
}

/**
 * Example 2: Controlled chat with custom state management
 */
export function ControlledChatExample() {
  const widget = useChatWidget({
    agentName: 'Controlled Bot',
    chatDescription: 'Externally controlled chat interface',
    float: false,
  })

  const [chatPosition, setChatPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right')

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={widget.toggleOpen}
          className="px-4 py-2 bg-brand-primary text-white rounded-md"
        >
          {widget.isOpen ? 'Close' : 'Open'} Chat
        </button>
        <button
          onClick={widget.minimize}
          disabled={!widget.isOpen}
          className="px-4 py-2 bg-gray-500 text-white rounded-md disabled:opacity-50"
        >
          Minimize
        </button>
        <select
          value={chatPosition}
          onChange={(e) => setChatPosition(e.target.value as any)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="bottom-right">Bottom Right</option>
          <option value="bottom-left">Bottom Left</option>
        </select>
      </div>

      {widget.isOpen && !widget.isMinimized && (
        <div className={`fixed ${chatPosition === 'bottom-right' ? 'bottom-4 right-4' : 'bottom-4 left-4'} z-50`}>
          <ParlantChatProvider config={widget.config}>
            <ParlantChatbox
              {...widget.config}
              isOpen={widget.isOpen}
              onOpenChange={widget.toggleOpen}
            />
          </ParlantChatProvider>
        </div>
      )}
    </div>
  )
}

/**
 * Example 3: Multi-agent chat switcher
 */
export function MultiAgentChatExample() {
  const [activeAgent, setActiveAgent] = useState('support')

  const agents = {
    support: {
      agentId: 'support-agent',
      agentName: 'Support Agent',
      chatDescription: 'Get help with technical issues',
      customColors: { primary: '#3b82f6' },
    },
    sales: {
      agentId: 'sales-agent',
      agentName: 'Sales Agent',
      chatDescription: 'Learn about our products and pricing',
      customColors: { primary: '#10b981' },
    },
    feedback: {
      agentId: 'feedback-agent',
      agentName: 'Feedback Agent',
      chatDescription: 'Share your thoughts and suggestions',
      customColors: { primary: '#f59e0b' },
    },
  }

  const config: SimChatConfig = {
    ...agents[activeAgent as keyof typeof agents],
    headerConfig: {
      title: `${agents[activeAgent as keyof typeof agents].agentName}`,
      showMinimizeButton: true,
    },
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {Object.entries(agents).map(([key, agent]) => (
          <button
            key={key}
            onClick={() => setActiveAgent(key)}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              activeAgent === key
                ? 'bg-brand-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {agent.agentName}
          </button>
        ))}
      </div>

      <ParlantChatProvider config={config}>
        <ParlantChatbox {...config} />
      </ParlantChatProvider>
    </div>
  )
}

/**
 * Example 4: Chat with keyboard shortcuts and accessibility
 */
export function AccessibleChatExample() {
  const [isOpen, setIsOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  useChatKeyboardShortcuts({
    onToggle: () => {
      setIsOpen(!isOpen)
      setAnnouncement(isOpen ? 'Chat closed' : 'Chat opened')
    },
    onFocus: () => {
      if (!isOpen) {
        setIsOpen(true)
        setAnnouncement('Chat opened and focused')
      }
    },
    onEscape: () => {
      if (isOpen) {
        setIsOpen(false)
        setAnnouncement('Chat closed')
      }
    },
  })

  const config: SimChatConfig = {
    agentName: 'Accessible Bot',
    chatDescription: 'Keyboard-friendly chat interface',
    headerConfig: {
      title: 'Accessible Chat',
      showCloseButton: true,
    },
  }

  return (
    <div className="space-y-4">
      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
        <h3 className="font-semibold text-blue-800 mb-2">Keyboard Shortcuts</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li><kbd className="px-2 py-1 bg-blue-100 rounded">Ctrl+K</kbd> - Toggle chat</li>
          <li><kbd className="px-2 py-1 bg-blue-100 rounded">Ctrl+/</kbd> - Focus chat input</li>
          <li><kbd className="px-2 py-1 bg-blue-100 rounded">Escape</kbd> - Close chat</li>
        </ul>
      </div>

      <ParlantChatProvider config={config}>
        <ParlantChatbox
          {...config}
          isOpen={isOpen}
          onOpenChange={setIsOpen}
        />
      </ParlantChatProvider>
    </div>
  )
}

/**
 * Example 5: Chat with validation and error handling
 */
export function ValidatedChatExample() {
  const [config, setConfig] = useState<SimChatConfig>({
    server: 'https://invalid-server.com',
    agentId: '',
    agentName: 'Validation Bot',
  })

  const [validation, setValidation] = useState(ConfigValidator.validate(config))

  useEffect(() => {
    setValidation(ConfigValidator.validate(config))
  }, [config])

  const handleFixConfiguration = () => {
    const sanitizedConfig = ConfigValidator.sanitize(config)
    setConfig(sanitizedConfig)
  }

  if (!validation.isValid) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-semibold text-red-800 mb-2">Configuration Errors</h3>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
          <button
            onClick={handleFixConfiguration}
            className="mt-3 px-3 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
          >
            Fix Configuration
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {validation.warnings.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">Configuration Warnings</h3>
          <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
            {validation.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-700">✅ Configuration is valid!</p>
      </div>

      <ParlantChatProvider config={config}>
        <ParlantChatbox {...config} />
      </ParlantChatProvider>
    </div>
  )
}

/**
 * Example 6: Performance-optimized chat with preloading
 */
export function PerformanceOptimizedChatExample() {
  const [isPreloaded, setIsPreloaded] = useState(false)
  const [showChat, setShowChat] = useState(false)

  const handlePreloadResources = async () => {
    await preloadChatResources()
    setIsPreloaded(true)
  }

  const config: SimChatConfig = {
    agentName: 'Performance Bot',
    chatDescription: 'Optimized for speed and efficiency',
    animations: { enabled: true, duration: 150 },
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={handlePreloadResources}
          disabled={isPreloaded}
          className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
        >
          {isPreloaded ? 'Resources Preloaded ✅' : 'Preload Resources'}
        </button>
        <button
          onClick={() => setShowChat(!showChat)}
          className="px-4 py-2 bg-brand-primary text-white rounded-md"
        >
          {showChat ? 'Hide Chat' : 'Show Chat'}
        </button>
      </div>

      {showChat && (
        <ParlantChatProvider config={config}>
          <React.Suspense
            fallback={
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading optimized chat...</p>
              </div>
            }
          >
            <LazyParlantChatbox {...config} />
          </React.Suspense>
        </ParlantChatProvider>
      )}
    </div>
  )
}

// Import the lazy component
import { LazyParlantChatbox } from '../utils'