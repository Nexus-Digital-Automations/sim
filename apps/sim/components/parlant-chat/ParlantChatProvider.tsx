/**
 * Provider component for Parlant Chat context
 */

'use client'

import { createContext, type ReactNode, useContext } from 'react'
import { useChatConnection, useChatWidget } from './hooks'
import type { SimChatConfig, SimChatContextType } from './types'

const SimChatContext = createContext<SimChatContextType | null>(null)

export interface ParlantChatProviderProps {
  children: ReactNode
  config: SimChatConfig
}

/**
 * Provider component that manages chat state and connection
 */
export default function ParlantChatProvider({ children, config }: ParlantChatProviderProps) {
  const connection = useChatConnection(config)
  const widget = useChatWidget(config)

  const contextValue: SimChatContextType = {
    config: widget.config,
    ...connection,
  }

  return <SimChatContext.Provider value={contextValue}>{children}</SimChatContext.Provider>
}

/**
 * Hook to access the chat context
 */
export function useSimChat() {
  const context = useContext(SimChatContext)

  if (!context) {
    throw new Error('useSimChat must be used within a ParlantChatProvider')
  }

  return context
}
