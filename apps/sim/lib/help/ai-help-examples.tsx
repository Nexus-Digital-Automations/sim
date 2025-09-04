/**
 * AI Help Engine - Comprehensive Usage Examples
 *
 * This file demonstrates how to use the AI-powered smart help suggestions engine
 * with practical examples showing integration with React components.
 *
 * Features demonstrated:
 * - AI-powered semantic search for help content
 * - Intelligent chatbot with contextual awareness
 * - Predictive help suggestions based on user behavior
 * - Integration with existing help system components
 * - Real-time assistance and proactive help
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

'use client'

import { useEffect, useState } from 'react'
import { createLogger } from '@/lib/logs/console/logger'
import { useHelpSystem } from './index'

const logger = createLogger('AIHelpExamples')

// ================================================================================================
// EXAMPLE 1: WORKFLOW EDITOR WITH AI HELP
// ================================================================================================

/**
 * Workflow Editor component with full AI help integration
 * Demonstrates real-world usage of AI help features
 */
export function WorkflowEditorWithAIHelp({
  userId,
  workflowId,
}: {
  userId: string
  workflowId: string
}) {
  const helpSystem = useHelpSystem({
    component: 'workflow-editor',
    enableAI: true,
    autoStart: true,
    enableAnalytics: true,
  })

  const [chatMessages, setChatMessages] = useState<
    Array<{
      id: string
      type: 'user' | 'ai'
      message: string
      timestamp: Date
      relatedContent?: any[]
    }>
  >([])

  const [smartSuggestions, setSmartSuggestions] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')

  // Load smart suggestions on component mount
  useEffect(() => {
    async function loadInitialSuggestions() {
      if (helpSystem.isAIEnabled() && helpSystem.getSmartSuggestions) {
        try {
          const response = await helpSystem.getSmartSuggestions({
            workflowId,
            workflowState: 'editing',
            userExperience: 'intermediate',
            strugglesDetected: ['block-configuration', 'data-mapping'],
          })

          if (response.suggestions) {
            setSmartSuggestions(response.suggestions)
            logger.info('Loaded smart suggestions', { count: response.suggestions.length })
          }
        } catch (error) {
          logger.warn('Failed to load smart suggestions', { error })
        }
      }
    }

    loadInitialSuggestions()
  }, [helpSystem, workflowId])

  // Handle AI chat interactions
  const handleChatMessage = async (message: string) => {
    if (!helpSystem.aiChat) return

    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'user' as const,
      message,
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await helpSystem.aiChat(message, {
        workflowId,
        component: 'workflow-editor',
        workflowContext: {
          currentStep: 'block-configuration',
          blockTypes: ['trigger', 'action', 'condition'],
          recentErrors: [],
          userExperience: 'intermediate',
        },
      })

      const aiMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai' as const,
        message: response.message || 'I can help you with that workflow question.',
        timestamp: new Date(),
        relatedContent: response.relatedContent,
      }

      setChatMessages((prev) => [...prev, aiMessage])
      logger.info('AI chat response received', { messageLength: response.message?.length })
    } catch (error) {
      logger.error('AI chat failed', { error, message })

      const errorMessage = {
        id: `error-${Date.now()}`,
        type: 'ai' as const,
        message:
          'I apologize, but I encountered an issue processing your request. Please try again.',
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle AI search queries
  const handleSearch = async (query: string) => {
    if (!helpSystem.aiSearch) return

    setIsLoading(true)
    try {
      const response = await helpSystem.aiSearch(query, {
        workflowId,
        component: 'workflow-editor',
        searchContext: 'help-documentation',
      })

      if (response.searchResults) {
        setSearchResults(response.searchResults)
        logger.info('AI search completed', { resultsCount: response.searchResults.length })
      }
    } catch (error) {
      logger.error('AI search failed', { error, query })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle suggestion clicks
  const handleSuggestionClick = (suggestion: any) => {
    helpSystem.trackAction('suggestion-clicked', {
      suggestionId: suggestion.id,
      suggestionType: suggestion.type,
      confidence: suggestion.confidence,
    })

    // Trigger search based on suggestion
    if (suggestion.searchQuery) {
      handleSearch(suggestion.searchQuery)
    }
  }

  return (
    <div className='workflow-editor-with-ai-help'>
      <h2>Workflow Editor</h2>

      {/* Smart Suggestions Panel */}
      {smartSuggestions.length > 0 && (
        <div className='smart-suggestions-panel'>
          <h3>AI Suggestions</h3>
          <div className='suggestions-grid'>
            {smartSuggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                className='suggestion-card'
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className='suggestion-content'>
                  <strong>{suggestion.title}</strong>
                  <p>{suggestion.content}</p>
                  <span className='confidence'>
                    Confidence: {Math.round((suggestion.confidence || 0.8) * 100)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Chat Interface */}
      <div className='ai-chat-panel'>
        <h3>AI Assistant</h3>
        <div className='chat-messages'>
          {chatMessages.map((msg) => (
            <div key={msg.id} className={`message ${msg.type}`}>
              <div className='message-content'>
                <strong>{msg.type === 'user' ? 'You' : 'AI Assistant'}:</strong>
                <p>{msg.message}</p>

                {msg.relatedContent && msg.relatedContent.length > 0 && (
                  <div className='related-content'>
                    <h4>Related Help Articles:</h4>
                    <ul>
                      {msg.relatedContent.map((content, index) => (
                        <li key={index}>
                          <a href={content.url} target='_blank' rel='noopener noreferrer'>
                            {content.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <span className='timestamp'>{msg.timestamp.toLocaleTimeString()}</span>
            </div>
          ))}

          {isLoading && (
            <div className='message ai'>
              <div className='message-content'>
                <em>AI is thinking...</em>
              </div>
            </div>
          )}
        </div>

        <div className='chat-input'>
          <input
            type='text'
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder='Ask me anything about workflows...'
            onKeyPress={(e) => {
              if (e.key === 'Enter' && chatInput.trim()) {
                handleChatMessage(chatInput.trim())
                setChatInput('')
              }
            }}
            disabled={isLoading}
          />
          <button
            onClick={() => {
              if (chatInput.trim()) {
                handleChatMessage(chatInput.trim())
                setChatInput('')
              }
            }}
            disabled={isLoading || !chatInput.trim()}
          >
            Send
          </button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className='search-results'>
          <h3>Search Results</h3>
          <ul>
            {searchResults.map((result, index) => (
              <li key={index} className='search-result'>
                <h4>{result.title}</h4>
                <p>{result.excerpt}</p>
                <div className='result-meta'>
                  <span>Relevance: {Math.round((result.score || 0.8) * 100)}%</span>
                  {result.url && (
                    <a href={result.url} target='_blank' rel='noopener noreferrer'>
                      Read More
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Traditional Help Integration */}
      <div className='traditional-help'>
        <button onClick={() => helpSystem.showHelp('workflow-editor')}>
          Show Traditional Help
        </button>
        <button onClick={() => helpSystem.openHelpPanel()}>Open Help Panel</button>
      </div>
    </div>
  )
}

// ================================================================================================
// EXAMPLE 2: SIMPLE AI SEARCH COMPONENT
// ================================================================================================

/**
 * Simple component demonstrating AI search functionality
 */
export function AIHelpSearch({ component = 'general' }: { component?: string }) {
  const helpSystem = useHelpSystem({ component, enableAI: true })
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const performSearch = async () => {
    if (!query.trim() || !helpSystem.aiSearch) return

    setIsSearching(true)
    try {
      const response = await helpSystem.aiSearch(query.trim(), { component })
      setResults(response.searchResults || [])
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className='ai-help-search'>
      <div className='search-input'>
        <input
          type='text'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search help documentation...'
          onKeyPress={(e) => e.key === 'Enter' && performSearch()}
        />
        <button onClick={performSearch} disabled={isSearching || !query.trim()}>
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {results.length > 0 && (
        <div className='search-results'>
          {results.map((result, index) => (
            <div key={index} className='result-item'>
              <h4>{result.title}</h4>
              <p>{result.excerpt}</p>
              {result.url && (
                <a href={result.url} target='_blank' rel='noopener noreferrer'>
                  View Article
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ================================================================================================
// EXAMPLE 3: PROACTIVE HELP COMPONENT
// ================================================================================================

/**
 * Component that shows proactive AI help suggestions
 */
export function ProactiveHelpAssistant({
  userId,
  context,
}: {
  userId: string
  context: {
    component: string
    currentTask?: string
    timeSpentOnTask?: number
    strugglesDetected?: string[]
  }
}) {
  const helpSystem = useHelpSystem({ component: context.component, enableAI: true })
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout

    // Show proactive help after user spends time on a task
    if (context.timeSpentOnTask && context.timeSpentOnTask > 120000) {
      // 2 minutes
      timer = setTimeout(async () => {
        if (helpSystem.getSmartSuggestions) {
          try {
            const response = await helpSystem.getSmartSuggestions({
              ...context,
              userId,
              triggerType: 'time-based',
              proactiveHelp: true,
            })

            if (response.suggestions && response.suggestions.length > 0) {
              setSuggestions(response.suggestions)
              setIsVisible(true)
            }
          } catch (error) {
            console.error('Failed to get proactive suggestions:', error)
          }
        }
      }, 1000)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [context, userId, helpSystem])

  if (!isVisible || suggestions.length === 0) {
    return null
  }

  return (
    <div className='proactive-help-assistant'>
      <div className='assistant-popup'>
        <div className='popup-header'>
          <h4>💡 Need help?</h4>
          <button onClick={() => setIsVisible(false)}>×</button>
        </div>

        <div className='popup-content'>
          <p>
            I noticed you might need assistance with {context.currentTask || 'your current task'}:
          </p>

          <div className='suggestions'>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                className='suggestion-button'
                onClick={() => {
                  helpSystem.trackAction('proactive-suggestion-accepted', {
                    suggestionId: suggestion.id,
                  })
                  // Handle suggestion click - could open help panel, start chat, etc.
                  if (suggestion.action === 'chat') {
                    helpSystem.aiChat?.(suggestion.content, context)
                  } else if (suggestion.action === 'search') {
                    helpSystem.aiSearch?.(suggestion.content, context)
                  }
                  setIsVisible(false)
                }}
              >
                {suggestion.content}
              </button>
            ))}
          </div>

          <div className='popup-actions'>
            <button onClick={() => setIsVisible(false)}>No thanks</button>
            <button
              onClick={() => {
                helpSystem.trackAction('proactive-help-dismissed')
                setIsVisible(false)
              }}
            >
              Don't show again
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ================================================================================================
// EXAMPLE 4: AI HELP SYSTEM STATUS COMPONENT
// ================================================================================================

/**
 * Component showing AI help system status and capabilities
 */
export function AIHelpSystemStatus() {
  const helpSystem = useHelpSystem({ enableAI: true })
  const [status, setStatus] = useState<{
    aiEnabled: boolean
    features: {
      search: boolean
      chat: boolean
      suggestions: boolean
    }
    lastUpdate: Date
  }>({
    aiEnabled: false,
    features: { search: false, chat: false, suggestions: false },
    lastUpdate: new Date(),
  })

  useEffect(() => {
    const checkStatus = () => {
      setStatus({
        aiEnabled: helpSystem.isAIEnabled(),
        features: {
          search: !!helpSystem.aiSearch,
          chat: !!helpSystem.aiChat,
          suggestions: !!helpSystem.getSmartSuggestions,
        },
        lastUpdate: new Date(),
      })
    }

    checkStatus()
    const interval = setInterval(checkStatus, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [helpSystem])

  return (
    <div className='ai-help-status'>
      <h4>AI Help System Status</h4>
      <div className='status-grid'>
        <div className={`status-item ${status.aiEnabled ? 'enabled' : 'disabled'}`}>
          <span className='status-label'>AI Engine:</span>
          <span className='status-value'>{status.aiEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>

        <div className={`status-item ${status.features.search ? 'enabled' : 'disabled'}`}>
          <span className='status-label'>Semantic Search:</span>
          <span className='status-value'>
            {status.features.search ? 'Available' : 'Unavailable'}
          </span>
        </div>

        <div className={`status-item ${status.features.chat ? 'enabled' : 'disabled'}`}>
          <span className='status-label'>AI Chat:</span>
          <span className='status-value'>{status.features.chat ? 'Available' : 'Unavailable'}</span>
        </div>

        <div className={`status-item ${status.features.suggestions ? 'enabled' : 'disabled'}`}>
          <span className='status-label'>Smart Suggestions:</span>
          <span className='status-value'>
            {status.features.suggestions ? 'Available' : 'Unavailable'}
          </span>
        </div>
      </div>

      <div className='last-updated'>Last updated: {status.lastUpdate.toLocaleTimeString()}</div>

      {!status.aiEnabled && (
        <div className='enable-ai'>
          <button onClick={() => helpSystem.enableAI(true)}>Enable AI Help Features</button>
        </div>
      )}
    </div>
  )
}

export default {
  WorkflowEditorWithAIHelp,
  AIHelpSearch,
  ProactiveHelpAssistant,
  AIHelpSystemStatus,
}
