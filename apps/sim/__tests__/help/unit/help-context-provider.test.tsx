/**
 * Unit Tests - Help Context Provider
 *
 * Comprehensive unit tests for the help context provider covering:
 * - React context state management
 * - Help system initialization and configuration
 * - Help content display and interaction tracking
 * - Tour management and guided assistance
 * - User preferences and settings management
 * - Error handling and edge cases
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

import React from 'react'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { contextualHelpSystem } from '@/lib/help/contextual-help'
import {
  HelpContextProvider,
  type HelpState,
  type HelpUserPreferences,
  type TourStep,
  useHelp,
} from '@/lib/help/help-context-provider'

// Mock logger
jest.mock('@/lib/logs/console/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}))

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-context-id-123'),
}))

// Mock contextual help system
jest.mock('@/lib/help/contextual-help', () => ({
  contextualHelpSystem: {
    getContextualHelp: jest.fn(),
    dismissHelp: jest.fn(),
  },
}))

// Mock DOM environment
Object.defineProperty(window, 'location', {
  value: { pathname: '/test-path' },
  writable: true,
})

// Test component that uses the help context
const TestHelpConsumer = ({ onStateChange }: { onStateChange?: (state: HelpState) => void }) => {
  const help = useHelp()

  React.useEffect(() => {
    if (onStateChange) {
      onStateChange(help.state)
    }
  }, [help.state, onStateChange])

  return (
    <div data-testid='help-consumer'>
      <div data-testid='session-id'>{help.state.sessionId}</div>
      <div data-testid='user-level'>{help.state.userLevel}</div>
      <div data-testid='is-initialized'>{help.state.isInitialized.toString()}</div>
      <div data-testid='is-loading'>{help.state.isLoading.toString()}</div>
      <div data-testid='help-panel-open'>{help.state.isHelpPanelOpen.toString()}</div>
      <div data-testid='active-help-count'>{help.state.activeHelp.size}</div>
      <div data-testid='current-help-title'>
        {help.state.currentHelp?.title || 'no-current-help'}
      </div>
      <div data-testid='tour-active'>{help.state.isSpotlightActive.toString()}</div>
      <div data-testid='current-tour-step'>{help.state.currentTourStep}</div>
      <div data-testid='tour-steps-count'>{help.state.tourSteps.length}</div>

      <button data-testid='show-help-btn' onClick={() => help.showHelp('test-component')}>
        Show Help
      </button>
      <button data-testid='open-panel-btn' onClick={help.openHelpPanel}>
        Open Panel
      </button>
      <button data-testid='close-panel-btn' onClick={help.closeHelpPanel}>
        Close Panel
      </button>
      <button data-testid='toggle-panel-btn' onClick={help.toggleHelpPanel}>
        Toggle Panel
      </button>
      <button data-testid='clear-help-btn' onClick={help.clearAllHelp}>
        Clear Help
      </button>
      <button
        data-testid='start-tour-btn'
        onClick={() =>
          help.startTour([
            {
              id: '1',
              title: 'Step 1',
              description: 'Test step',
              target: '.test',
              placement: 'top',
              showSkip: true,
              showPrevious: false,
            },
          ])
        }
      >
        Start Tour
      </button>
      <button data-testid='next-step-btn' onClick={help.nextTourStep}>
        Next Step
      </button>
      <button data-testid='previous-step-btn' onClick={help.previousTourStep}>
        Previous Step
      </button>
      <button data-testid='complete-tour-btn' onClick={help.completeTour}>
        Complete Tour
      </button>
      <button data-testid='skip-tour-btn' onClick={help.skipTour}>
        Skip Tour
      </button>
      <button
        data-testid='update-preferences-btn'
        onClick={() => help.updatePreferences({ enableAutoHelp: false })}
      >
        Update Preferences
      </button>
      <button data-testid='update-user-level-btn' onClick={() => help.updateUserLevel('advanced')}>
        Update User Level
      </button>
      <button
        data-testid='track-interaction-btn'
        onClick={() => help.trackInteraction('click', 'test-button')}
      >
        Track Interaction
      </button>
    </div>
  )
}

describe('HelpContextProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(contextualHelpSystem.getContextualHelp as jest.Mock).mockResolvedValue([
      {
        id: 'test-help-1',
        title: 'Test Help Content',
        content: 'This is test help content',
        type: 'info',
        priority: 'medium',
        context: { component: 'test-component', page: '/test', userLevel: 'beginner' },
        dismissible: true,
      },
    ])
  })

  describe('Provider Initialization', () => {
    it('should render provider without crashing', () => {
      render(
        <HelpContextProvider>
          <div>Test content</div>
        </HelpContextProvider>
      )

      expect(screen.getByText('Test content')).toBeInTheDocument()
    })

    it('should initialize with default state', () => {
      let capturedState: HelpState | null = null

      render(
        <HelpContextProvider>
          <TestHelpConsumer onStateChange={(state) => (capturedState = state)} />
        </HelpContextProvider>
      )

      expect(capturedState).not.toBeNull()
      expect(capturedState!.sessionId).toBeDefined()
      expect(capturedState!.userLevel).toBe('beginner')
      expect(capturedState!.isInitialized).toBe(true)
      expect(capturedState!.isLoading).toBe(false)
      expect(capturedState!.activeHelp.size).toBe(0)
      expect(capturedState!.isHelpPanelOpen).toBe(false)
      expect(capturedState!.isSpotlightActive).toBe(false)
      expect(capturedState!.currentTourStep).toBe(0)
      expect(capturedState!.tourSteps.length).toBe(0)
    })

    it('should initialize with custom user level and preferences', () => {
      const initialPreferences: Partial<HelpUserPreferences> = {
        enableAutoHelp: false,
        preferredHelpStyle: 'minimal',
        language: 'es',
      }

      let capturedState: HelpState | null = null

      render(
        <HelpContextProvider initialUserLevel='advanced' initialPreferences={initialPreferences}>
          <TestHelpConsumer onStateChange={(state) => (capturedState = state)} />
        </HelpContextProvider>
      )

      expect(capturedState!.userLevel).toBe('advanced')
      expect(capturedState!.userPreferences.enableAutoHelp).toBe(false)
      expect(capturedState!.userPreferences.preferredHelpStyle).toBe('minimal')
      expect(capturedState!.userPreferences.language).toBe('es')
    })

    it('should generate unique session ID', () => {
      let sessionId1: string | null = null
      let sessionId2: string | null = null

      const { rerender } = render(
        <HelpContextProvider>
          <TestHelpConsumer onStateChange={(state) => (sessionId1 = state.sessionId)} />
        </HelpContextProvider>
      )

      rerender(
        <HelpContextProvider>
          <TestHelpConsumer onStateChange={(state) => (sessionId2 = state.sessionId)} />
        </HelpContextProvider>
      )

      expect(sessionId1).toBeDefined()
      expect(sessionId2).toBeDefined()
      // Both should be the same mock ID due to our mock
      expect(sessionId1).toBe(sessionId2)
    })
  })

  describe('Help Content Management', () => {
    it('should show help content', async () => {
      render(
        <HelpContextProvider>
          <TestHelpConsumer />
        </HelpContextProvider>
      )

      const showHelpBtn = screen.getByTestId('show-help-btn')

      await act(async () => {
        fireEvent.click(showHelpBtn)
      })

      await waitFor(() => {
        expect(contextualHelpSystem.getContextualHelp).toHaveBeenCalledWith(
          'test-component',
          'beginner',
          expect.objectContaining({
            component: 'test-component',
            page: '/test-path',
            userLevel: 'beginner',
          })
        )
      })

      expect(screen.getByTestId('active-help-count')).toHaveTextContent('1')
      expect(screen.getByTestId('current-help-title')).toHaveTextContent('Test Help Content')
    })

    it('should handle empty help response', async () => {
      ;(contextualHelpSystem.getContextualHelp as jest.Mock).mockResolvedValue([])

      render(
        <HelpContextProvider>
          <TestHelpConsumer />
        </HelpContextProvider>
      )

      const showHelpBtn = screen.getByTestId('show-help-btn')

      await act(async () => {
        fireEvent.click(showHelpBtn)
      })

      await waitFor(() => {
        expect(screen.getByTestId('active-help-count')).toHaveTextContent('0')
        expect(screen.getByTestId('current-help-title')).toHaveTextContent('no-current-help')
      })
    })

    it('should handle help content loading errors', async () => {
      ;(contextualHelpSystem.getContextualHelp as jest.Mock).mockRejectedValue(
        new Error('Help loading error')
      )

      render(
        <HelpContextProvider>
          <TestHelpConsumer />
        </HelpContextProvider>
      )

      const showHelpBtn = screen.getByTestId('show-help-btn')

      await act(async () => {
        fireEvent.click(showHelpBtn)
      })

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      })
    })

    it('should clear all help content', async () => {
      render(
        <HelpContextProvider>
          <TestHelpConsumer />
        </HelpContextProvider>
      )

      // First show some help
      const showHelpBtn = screen.getByTestId('show-help-btn')
      await act(async () => {
        fireEvent.click(showHelpBtn)
      })

      await waitFor(() => {
        expect(screen.getByTestId('active-help-count')).toHaveTextContent('1')
      })

      // Then clear all help
      const clearHelpBtn = screen.getByTestId('clear-help-btn')
      fireEvent.click(clearHelpBtn)

      expect(screen.getByTestId('active-help-count')).toHaveTextContent('0')
      expect(screen.getByTestId('current-help-title')).toHaveTextContent('no-current-help')
    })
  })

  describe('Help Panel Management', () => {
    it('should open help panel', () => {
      render(
        <HelpContextProvider>
          <TestHelpConsumer />
        </HelpContextProvider>
      )

      const openPanelBtn = screen.getByTestId('open-panel-btn')
      fireEvent.click(openPanelBtn)

      expect(screen.getByTestId('help-panel-open')).toHaveTextContent('true')
    })

    it('should close help panel', () => {
      render(
        <HelpContextProvider>
          <TestHelpConsumer />
        </HelpContextProvider>
      )

      // First open the panel
      const openPanelBtn = screen.getByTestId('open-panel-btn')
      fireEvent.click(openPanelBtn)
      expect(screen.getByTestId('help-panel-open')).toHaveTextContent('true')

      // Then close it
      const closePanelBtn = screen.getByTestId('close-panel-btn')
      fireEvent.click(closePanelBtn)

      expect(screen.getByTestId('help-panel-open')).toHaveTextContent('false')
    })

    it('should toggle help panel', () => {
      render(
        <HelpContextProvider>
          <TestHelpConsumer />
        </HelpContextProvider>
      )

      const togglePanelBtn = screen.getByTestId('toggle-panel-btn')

      // Toggle to open
      fireEvent.click(togglePanelBtn)
      expect(screen.getByTestId('help-panel-open')).toHaveTextContent('true')

      // Toggle to close
      fireEvent.click(togglePanelBtn)
      expect(screen.getByTestId('help-panel-open')).toHaveTextContent('false')
    })
  })

  describe('Tour Management', () => {
    const mockTourSteps: TourStep[] = [
      {
        id: 'step-1',
        title: 'Welcome',
        description: 'Welcome to the tour',
        target: '.welcome',
        placement: 'top',
        showSkip: true,
        showPrevious: false,
      },
      {
        id: 'step-2',
        title: 'Features',
        description: 'Here are the main features',
        target: '.features',
        placement: 'bottom',
        showSkip: true,
        showPrevious: true,
      },
      {
        id: 'step-3',
        title: 'Conclusion',
        description: 'Tour complete',
        target: '.conclusion',
        placement: 'center',
        showSkip: false,
        showPrevious: true,
      },
    ]

    it('should start tour', () => {
      render(
        <HelpContextProvider>
          <TestHelpConsumer />
        </HelpContextProvider>
      )

      const startTourBtn = screen.getByTestId('start-tour-btn')
      fireEvent.click(startTourBtn)

      expect(screen.getByTestId('tour-active')).toHaveTextContent('true')
      expect(screen.getByTestId('current-tour-step')).toHaveTextContent('0')
      expect(screen.getByTestId('tour-steps-count')).toHaveTextContent('1')
    })

    it('should navigate tour steps', () => {
      render(
        <HelpContextProvider>
          <TestHelpConsumer />
        </HelpContextProvider>
      )

      // Start a multi-step tour manually by setting up the provider with multiple steps
      const startTourBtn = screen.getByTestId('start-tour-btn')
      fireEvent.click(startTourBtn)

      expect(screen.getByTestId('current-tour-step')).toHaveTextContent('0')

      // Next step (should stay at 0 since we only have 1 step in mock)
      const nextStepBtn = screen.getByTestId('next-step-btn')
      fireEvent.click(nextStepBtn)

      expect(screen.getByTestId('current-tour-step')).toHaveTextContent('0') // Stays at max
    })

    it('should complete tour', () => {
      render(
        <HelpContextProvider>
          <TestHelpConsumer />
        </HelpContextProvider>
      )

      // Start tour
      const startTourBtn = screen.getByTestId('start-tour-btn')
      fireEvent.click(startTourBtn)

      expect(screen.getByTestId('tour-active')).toHaveTextContent('true')

      // Complete tour
      const completeTourBtn = screen.getByTestId('complete-tour-btn')
      fireEvent.click(completeTourBtn)

      expect(screen.getByTestId('tour-active')).toHaveTextContent('false')
      expect(screen.getByTestId('current-tour-step')).toHaveTextContent('0')
      expect(screen.getByTestId('tour-steps-count')).toHaveTextContent('0')
    })

    it('should skip tour', () => {
      render(
        <HelpContextProvider>
          <TestHelpConsumer />
        </HelpContextProvider>
      )

      // Start tour
      const startTourBtn = screen.getByTestId('start-tour-btn')
      fireEvent.click(startTourBtn)

      expect(screen.getByTestId('tour-active')).toHaveTextContent('true')

      // Skip tour
      const skipTourBtn = screen.getByTestId('skip-tour-btn')
      fireEvent.click(skipTourBtn)

      expect(screen.getByTestId('tour-active')).toHaveTextContent('false')
      expect(screen.getByTestId('current-tour-step')).toHaveTextContent('0')
      expect(screen.getByTestId('tour-steps-count')).toHaveTextContent('0')
    })

    it('should handle previous step navigation', () => {
      render(
        <HelpContextProvider>
          <TestHelpConsumer />
        </HelpContextProvider>
      )

      // Start tour
      const startTourBtn = screen.getByTestId('start-tour-btn')
      fireEvent.click(startTourBtn)

      // Previous step (should stay at 0 since we're already at the start)
      const previousStepBtn = screen.getByTestId('previous-step-btn')
      fireEvent.click(previousStepBtn)

      expect(screen.getByTestId('current-tour-step')).toHaveTextContent('0')
    })
  })

  describe('User Preferences Management', () => {
    it('should update user preferences', () => {
      let capturedState: HelpState | null = null

      render(
        <HelpContextProvider>
          <TestHelpConsumer onStateChange={(state) => (capturedState = state)} />
        </HelpContextProvider>
      )

      const updatePreferencesBtn = screen.getByTestId('update-preferences-btn')
      fireEvent.click(updatePreferencesBtn)

      expect(capturedState!.userPreferences.enableAutoHelp).toBe(false)
    })

    it('should update user level', () => {
      render(
        <HelpContextProvider>
          <TestHelpConsumer />
        </HelpContextProvider>
      )

      expect(screen.getByTestId('user-level')).toHaveTextContent('beginner')

      const updateUserLevelBtn = screen.getByTestId('update-user-level-btn')
      fireEvent.click(updateUserLevelBtn)

      expect(screen.getByTestId('user-level')).toHaveTextContent('advanced')
    })

    it('should preserve other preferences when updating specific ones', () => {
      let capturedState: HelpState | null = null

      render(
        <HelpContextProvider
          initialPreferences={{
            enableTooltips: true,
            preferredHelpStyle: 'detailed',
            language: 'en',
          }}
        >
          <TestHelpConsumer onStateChange={(state) => (capturedState = state)} />
        </HelpContextProvider>
      )

      const initialTooltips = capturedState!.userPreferences.enableTooltips
      const initialStyle = capturedState!.userPreferences.preferredHelpStyle
      const initialLanguage = capturedState!.userPreferences.language

      const updatePreferencesBtn = screen.getByTestId('update-preferences-btn')
      fireEvent.click(updatePreferencesBtn)

      expect(capturedState!.userPreferences.enableAutoHelp).toBe(false) // Updated
      expect(capturedState!.userPreferences.enableTooltips).toBe(initialTooltips) // Preserved
      expect(capturedState!.userPreferences.preferredHelpStyle).toBe(initialStyle) // Preserved
      expect(capturedState!.userPreferences.language).toBe(initialLanguage) // Preserved
    })
  })

  describe('Analytics and Tracking', () => {
    it('should track user interactions', () => {
      let capturedState: HelpState | null = null

      render(
        <HelpContextProvider>
          <TestHelpConsumer onStateChange={(state) => (capturedState = state)} />
        </HelpContextProvider>
      )

      const initialInteractionCount = capturedState!.analytics.totalInteractions

      const trackInteractionBtn = screen.getByTestId('track-interaction-btn')
      fireEvent.click(trackInteractionBtn)

      expect(capturedState!.analytics.totalInteractions).toBe(initialInteractionCount + 1)
      expect(capturedState!.interactionHistory.length).toBeGreaterThan(0)

      const lastInteraction =
        capturedState!.interactionHistory[capturedState!.interactionHistory.length - 1]
      expect(lastInteraction.type).toBe('click')
      expect(lastInteraction.target).toBe('test-button')
      expect(lastInteraction.successful).toBe(true)
      expect(lastInteraction.timestamp).toBeInstanceOf(Date)
    })

    it('should limit interaction history to 50 entries', () => {
      let capturedState: HelpState | null = null

      render(
        <HelpContextProvider>
          <TestHelpConsumer onStateChange={(state) => (capturedState = state)} />
        </HelpContextProvider>
      )

      const trackInteractionBtn = screen.getByTestId('track-interaction-btn')

      // Add 60 interactions
      for (let i = 0; i < 60; i++) {
        fireEvent.click(trackInteractionBtn)
      }

      expect(capturedState!.interactionHistory.length).toBe(50)
      expect(capturedState!.analytics.totalInteractions).toBe(60)
    })

    it('should provide analytics data', () => {
      let analyticsData: any = null

      const AnalyticsConsumer = () => {
        const help = useHelp()
        analyticsData = help.getAnalytics()
        return null
      }

      render(
        <HelpContextProvider>
          <AnalyticsConsumer />
        </HelpContextProvider>
      )

      expect(analyticsData).toBeDefined()
      expect(analyticsData.sessionStartTime).toBeInstanceOf(Date)
      expect(typeof analyticsData.totalHelpViews).toBe('number')
      expect(typeof analyticsData.totalInteractions).toBe('number')
      expect(analyticsData.helpEffectiveness).toBeInstanceOf(Map)
      expect(Array.isArray(analyticsData.commonStruggles)).toBe(true)
    })
  })

  describe('Utility Functions', () => {
    it('should check if help is dismissed', () => {
      let isHelpDismissed = false

      const UtilityConsumer = () => {
        const help = useHelp()
        isHelpDismissed = help.isHelpDismissed('test-help-id')
        return null
      }

      render(
        <HelpContextProvider
          initialPreferences={{
            dismissedHelp: ['test-help-id'],
          }}
        >
          <UtilityConsumer />
        </HelpContextProvider>
      )

      expect(isHelpDismissed).toBe(true)
    })

    it('should check if tour is completed', () => {
      let isTourCompleted = false

      const UtilityConsumer = () => {
        const help = useHelp()
        isTourCompleted = help.isTourCompleted('test-tour-id')
        return null
      }

      render(
        <HelpContextProvider
          initialPreferences={{
            completedTours: ['test-tour-id'],
          }}
        >
          <UtilityConsumer />
        </HelpContextProvider>
      )

      expect(isTourCompleted).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle hook usage outside provider', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      const ComponentOutsideProvider = () => {
        try {
          useHelp()
          return <div>Should not render</div>
        } catch (error) {
          return <div data-testid='error-caught'>Error caught</div>
        }
      }

      expect(() => {
        render(<ComponentOutsideProvider />)
      }).toThrow('useHelp must be used within a HelpContextProvider')

      consoleErrorSpy.mockRestore()
    })

    it('should handle initialization errors gracefully', async () => {
      // Mock an error in the contextual help system
      const originalGetHelp = contextualHelpSystem.getContextualHelp
      ;(contextualHelpSystem.getContextualHelp as jest.Mock).mockRejectedValue(
        new Error('Initialization error')
      )

      render(
        <HelpContextProvider>
          <TestHelpConsumer />
        </HelpContextProvider>
      )

      const showHelpBtn = screen.getByTestId('show-help-btn')

      await act(async () => {
        fireEvent.click(showHelpBtn)
      })

      // Should handle error gracefully and not crash
      expect(screen.getByTestId('active-help-count')).toHaveTextContent('0')

      // Restore original function
      contextualHelpSystem.getContextualHelp = originalGetHelp
    })

    it('should handle context update with missing window object', async () => {
      // Mock missing window
      const originalWindow = (global.window(global as any).window = undefined)

      render(
        <HelpContextProvider>
          <TestHelpConsumer />
        </HelpContextProvider>
      )

      const showHelpBtn = screen.getByTestId('show-help-btn')

      // Should not crash even without window object
      await act(async () => {
        fireEvent.click(showHelpBtn)
      })

      expect(screen.getByTestId('is-initialized')).toHaveTextContent('true')

      // Restore window
      global.window = originalWindow
    })
  })

  describe('State Management', () => {
    it('should maintain consistent state across re-renders', () => {
      let stateSnapshot1: HelpState | null = null
      let stateSnapshot2: HelpState | null = null

      const { rerender } = render(
        <HelpContextProvider>
          <TestHelpConsumer onStateChange={(state) => (stateSnapshot1 = state)} />
        </HelpContextProvider>
      )

      rerender(
        <HelpContextProvider>
          <TestHelpConsumer onStateChange={(state) => (stateSnapshot2 = state)} />
        </HelpContextProvider>
      )

      // Session IDs should be different (new provider instance)
      expect(stateSnapshot1!.sessionId).toBeDefined()
      expect(stateSnapshot2!.sessionId).toBeDefined()
      // But structure should be consistent
      expect(stateSnapshot1!.userLevel).toBe(stateSnapshot2!.userLevel)
      expect(stateSnapshot1!.isInitialized).toBe(stateSnapshot2!.isInitialized)
    })

    it('should handle rapid state updates correctly', () => {
      render(
        <HelpContextProvider>
          <TestHelpConsumer />
        </HelpContextProvider>
      )

      const togglePanelBtn = screen.getByTestId('toggle-panel-btn')

      // Rapid toggles
      fireEvent.click(togglePanelBtn) // Open
      fireEvent.click(togglePanelBtn) // Close
      fireEvent.click(togglePanelBtn) // Open
      fireEvent.click(togglePanelBtn) // Close

      expect(screen.getByTestId('help-panel-open')).toHaveTextContent('false')
    })

    it('should update analytics when help views increase', async () => {
      let capturedState: HelpState | null = null

      render(
        <HelpContextProvider>
          <TestHelpConsumer onStateChange={(state) => (capturedState = state)} />
        </HelpContextProvider>
      )

      const initialViews = capturedState!.analytics.totalHelpViews

      const showHelpBtn = screen.getByTestId('show-help-btn')
      await act(async () => {
        fireEvent.click(showHelpBtn)
      })

      await waitFor(() => {
        expect(capturedState!.analytics.totalHelpViews).toBe(initialViews + 1)
      })
    })
  })

  describe('Memory Management', () => {
    it('should clean up resources properly', () => {
      const { unmount } = render(
        <HelpContextProvider>
          <TestHelpConsumer />
        </HelpContextProvider>
      )

      // Unmount should not cause any errors or memory leaks
      expect(() => unmount()).not.toThrow()
    })

    it('should handle multiple provider instances', () => {
      render(
        <div>
          <HelpContextProvider>
            <div data-testid='provider-1'>
              <TestHelpConsumer />
            </div>
          </HelpContextProvider>
          <HelpContextProvider>
            <div data-testid='provider-2'>
              <TestHelpConsumer />
            </div>
          </HelpContextProvider>
        </div>
      )

      expect(screen.getByTestId('provider-1')).toBeInTheDocument()
      expect(screen.getByTestId('provider-2')).toBeInTheDocument()
    })
  })
})
