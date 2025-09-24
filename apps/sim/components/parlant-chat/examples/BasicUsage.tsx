/**
 * Basic usage example for Parlant Chat integration
 */

'use client'

import { ParlantChatbox, ParlantChatProvider } from '../'
import type { SimChatConfig } from '../types'

/**
 * Example 1: Basic floating chat widget
 */
export function BasicChatWidget() {
  const config: SimChatConfig = {
    agentName: 'Sim Assistant',
    chatDescription: 'Ask me anything about Sim!',
    float: true,
    theme: 'auto',
    showSimBranding: true,
  }

  return (
    <ParlantChatProvider config={config}>
      <ParlantChatbox {...config} />
    </ParlantChatProvider>
  )
}

/**
 * Example 2: Embedded chat interface
 */
export function EmbeddedChat() {
  const config: SimChatConfig = {
    agentName: 'Support Agent',
    chatDescription: 'How can I help you today?',
    float: false,
    theme: 'light',
    headerConfig: {
      title: 'Customer Support',
      showCloseButton: false,
    },
  }

  return (
    <div className="w-full h-96 border rounded-lg overflow-hidden">
      <ParlantChatProvider config={config}>
        <ParlantChatbox {...config} />
      </ParlantChatProvider>
    </div>
  )
}

/**
 * Example 3: Dark theme chat
 */
export function DarkThemeChat() {
  const config: SimChatConfig = {
    agentName: 'Night Assistant',
    chatDescription: 'Dark mode chat interface',
    theme: 'dark',
    customColors: {
      primary: '#6f3dfa',
      primaryHover: '#6338d9',
      background: '#0c0c0c',
      foreground: '#ffffff',
    },
  }

  return (
    <ParlantChatProvider config={config}>
      <ParlantChatbox {...config} />
    </ParlantChatProvider>
  )
}

/**
 * Example 4: Custom branded chat
 */
export function CustomBrandedChat() {
  const config: SimChatConfig = {
    agentName: 'Custom Brand Bot',
    chatDescription: 'Chat with our custom branded assistant',
    showSimBranding: false,
    customColors: {
      primary: '#ff6b6b',
      primaryHover: '#ee5a52',
      accent: '#4ecdc4',
      background: '#f8f9fa',
      foreground: '#343a40',
    },
    headerConfig: {
      title: 'Brand Support',
      showMinimizeButton: true,
    },
  }

  return (
    <ParlantChatProvider config={config}>
      <ParlantChatbox {...config} />
    </ParlantChatProvider>
  )
}

/**
 * Example 5: Performance optimized chat with lazy loading
 */
export function LazyLoadedChat() {
  const [showChat, setShowChat] = React.useState(false)

  const config: SimChatConfig = {
    agentName: 'Lazy Bot',
    chatDescription: 'Performance optimized chat',
    animations: { enabled: true, duration: 150 },
  }

  return (
    <div>
      {!showChat ? (
        <button
          onClick={() => setShowChat(true)}
          className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary-hover"
        >
          Load Chat
        </button>
      ) : (
        <ParlantChatProvider config={config}>
          <React.Suspense fallback={<div>Loading chat...</div>}>
            <LazyParlantChatbox {...config} />
          </React.Suspense>
        </ParlantChatProvider>
      )}
    </div>
  )
}

// Don't forget the imports at the top of the file
import React from 'react'
import { LazyParlantChatbox } from '../utils'