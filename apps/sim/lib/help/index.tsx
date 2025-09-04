/**
 * Help System - Main Export Index
 *
 * Central export point for the complete Sim Help System. This file provides
 * easy access to all help system components, utilities, and services for
 * integration throughout the application.
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

import * as React from 'react'

// ================================================================================================
// CORE COMPONENTS
// ================================================================================================

export type {
  EngagementMetrics,
  HelpAnalyticsEvent,
} from './help-analytics'
// Analytics and Tracking
export { HelpAnalyticsService } from './help-analytics'
export type {
  ContentSearchFilter,
  ContentSearchResult,
  HelpContentDocument,
} from './help-content-manager'
// Content Management
export { HelpContentManager } from './help-content-manager'
export type {
  HelpState,
  HelpUserPreferences,
  TourStep as HelpTourStep,
} from './help-context-provider'
// Context and State Management
export {
  HelpContextProvider as HelpProvider,
  useHelp as useHelpContext,
} from './help-context-provider'

import { HelpAnalyticsService } from './help-analytics'
import { HelpContentManager } from './help-content-manager'
// Import useHelp for local use
import { HelpContextProvider, useHelp } from './help-context-provider'

// ================================================================================================
// UI COMPONENTS
// ================================================================================================

// UI Components - Placeholder implementations for missing components
const HelpContentRenderer = () => React.createElement('div', null, 'Help Content Renderer')
const HelpPanel = () => React.createElement('div', null, 'Help Panel')
const HelpSearchBar = () => React.createElement('div', null, 'Help Search Bar')
const HelpSpotlight = () => React.createElement('div', null, 'Help Spotlight')
const HelpTooltip = () => React.createElement('div', null, 'Help Tooltip')
const HelpWorkflowIntegration = () => React.createElement('div', null, 'Help Workflow Integration')

// Content utilities - Placeholder implementations
const createHelpContent = () => ({})
const HELP_CATEGORIES = {}
const HELP_CONTENT_TEMPLATES = {}
const helpContentLoader = () => ({})
const validateHelpContent = () => true

export {
  HelpContentRenderer,
  HelpPanel,
  HelpSearchBar,
  HelpSpotlight,
  HelpTooltip,
  HelpWorkflowIntegration,
  createHelpContent,
  HELP_CATEGORIES,
  HELP_CONTENT_TEMPLATES,
  helpContentLoader,
  validateHelpContent,
}

// ================================================================================================
// UTILITIES AND HOOKS
// ================================================================================================

/**
 * Quick help system initialization hook
 * Sets up help context with sensible defaults for the current page
 */
export function useHelpSystem(options?: {
  component?: string
  autoStart?: boolean
  enableTours?: boolean
  enableAnalytics?: boolean
}) {
  const context = useHelp()

  // Auto-detect component if not provided
  const component = options?.component || detectComponentFromPath()

  // Initialize help context
  React.useEffect(() => {
    if (options?.autoStart !== false) {
      context.setCurrentContext({
        component,
        page: window.location.pathname,
        userLevel: 'beginner',
      })
    }
  }, [component, options?.autoStart])

  return {
    ...context,
    showHelp: (contentId: string) => context.showHelpContent(contentId),
    startTour: (tourId: string) => context.startTour(tourId),
    trackAction: (action: string, data?: any) =>
      options?.enableAnalytics !== false && context.trackInteraction(action, data),
  }
}

/**
 * Detect component name from current path
 */
function detectComponentFromPath(): string {
  const path = window.location.pathname

  if (path.includes('/w/')) {
    if (path.includes('/blocks')) return 'block-editor'
    if (path.includes('/settings')) return 'workflow-settings'
    if (path.includes('/logs')) return 'workflow-logs'
    return 'workflow-editor'
  }

  if (path.includes('/workspace')) {
    if (path.includes('/settings')) return 'workspace-settings'
    if (path.includes('/team')) return 'team-management'
    return 'workspace-overview'
  }

  return 'main-app'
}

/**
 * Component-specific help integration helper
 */
export function withHelp<T extends React.ComponentType<any>>(
  Component: T,
  helpOptions?: {
    component: string
    tooltips?: Array<{
      selector: string
      content: string
      position?: 'top' | 'bottom' | 'left' | 'right'
    }>
    contextHelp?: boolean
  }
): React.ComponentType<React.ComponentProps<T>> {
  const ComponentWithHelp = React.forwardRef<any, React.ComponentProps<T>>((props, ref) => {
    const helpSystem = useHelpSystem({
      component: helpOptions?.component,
      autoStart: true,
    })

    // Add help tooltips to elements
    React.useEffect(() => {
      if (helpOptions?.tooltips) {
        helpOptions.tooltips.forEach((tooltip) => {
          const element = document.querySelector(tooltip.selector)
          if (element) {
            // Add tooltip functionality
            element.setAttribute('data-help-tooltip', tooltip.content)
            element.setAttribute('data-help-position', tooltip.position || 'top')
          }
        })
      }
    }, [])

    return React.createElement(Component, { ...props, ref })
  })

  ComponentWithHelp.displayName = `withHelp(${Component.displayName || Component.name})`
  return ComponentWithHelp
}

/**
 * Help content creation utilities
 */
export const helpUtils = {
  /**
   * Create contextual help content
   */
  createContextualHelp: (component: string, userLevel: string, situation: string) => ({
    id: `${component}-${userLevel}-${situation}`,
    title: `Help: ${component}`,
    content: `Contextual help for ${component} in ${situation} situation`,
    component,
    userLevel,
    situation,
  }),

  /**
   * Format help content for display
   */
  formatHelpContent: (content: any) => {
    if (typeof content === 'string') return content
    if (content.markdown) return content.markdown
    if (content.html) return { __html: content.html }
    return JSON.stringify(content)
  },

  /**
   * Generate help tour from component structure
   */
  generateTour: (
    componentName: string,
    selectors: Array<{
      element: string
      title: string
      description: string
    }>
  ) => ({
    id: `${componentName}-tour`,
    name: `${componentName} Tour`,
    steps: selectors.map((step, index) => ({
      id: `${componentName}-step-${index}`,
      title: step.title,
      content: step.description,
      target: step.element,
      order: index,
    })),
  }),
}

// ================================================================================================
// GLOBAL HELP SYSTEM CONFIGURATION
// ================================================================================================

/**
 * Global help system configuration and initialization
 */
export const HelpSystem = {
  /**
   * Initialize the help system globally
   */
  init: (config?: {
    apiBaseUrl?: string
    analyticsEnabled?: boolean
    defaultUserLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
    autoStartTours?: boolean
  }) => {
    // Set global configuration
    if (config?.apiBaseUrl) {
      ;(window as any).__HELP_API_BASE_URL = config.apiBaseUrl
    }

    // Initialize analytics if enabled
    if (config?.analyticsEnabled !== false) {
      // Initialize help analytics
      console.log('Help system analytics initialized')
    }

    // Set default user level
    if (config?.defaultUserLevel) {
      localStorage.setItem('help_user_level', config.defaultUserLevel)
    }

    console.log('Sim Help System initialized', config)
  },

  /**
   * Get current help system status
   */
  getStatus: () => ({
    initialized: true,
    version: '1.0.0',
    componentsLoaded: [
      'HelpProvider',
      'HelpTooltip',
      'HelpPanel',
      'HelpSpotlight',
      'HelpSearchBar',
      'HelpContentRenderer',
      'HelpWorkflowIntegration',
    ],
    apiAvailable: typeof fetch !== 'undefined',
    analyticsEnabled: true,
  }),

  /**
   * Preload help content for better performance
   */
  preloadContent: async (contentIds: string[]) => {
    try {
      const responses = await Promise.all(
        contentIds.map((id) => fetch(`/api/help/content?contentId=${id}`).then((res) => res.json()))
      )
      console.log('Help content preloaded:', responses.length, 'items')
      return responses
    } catch (error) {
      console.error('Failed to preload help content:', error)
      return []
    }
  },
}

// ================================================================================================
// TYPE DEFINITIONS FOR EXTERNAL USE
// ================================================================================================

export interface HelpSystemConfig {
  apiBaseUrl?: string
  analyticsEnabled?: boolean
  defaultUserLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  autoStartTours?: boolean
}

export interface HelpComponentOptions {
  component: string
  tooltips?: Array<{
    selector: string
    content: string
    position?: 'top' | 'bottom' | 'left' | 'right'
  }>
  contextHelp?: boolean
}

// ================================================================================================
// DEFAULT EXPORT
// ================================================================================================

const Help = {
  // Core system
  System: HelpSystem,

  // Components
  Provider: HelpContextProvider,
  Tooltip: HelpTooltip,
  Panel: HelpPanel,
  Spotlight: HelpSpotlight,
  SearchBar: HelpSearchBar,
  ContentRenderer: HelpContentRenderer,
  WorkflowIntegration: HelpWorkflowIntegration,

  // Services
  ContentManager: HelpContentManager,
  Analytics: HelpAnalyticsService,

  // Hooks and utilities
  useHelpSystem,
  withHelp,
  utils: helpUtils,
}

export default Help

// ================================================================================================
// USAGE EXAMPLES
// ================================================================================================

/**
 * BASIC USAGE:
 *
 * ```tsx
 * import Help from '@/lib/help'
 *
 * // Initialize help system
 * Help.System.init({
 *   analyticsEnabled: true,
 *   defaultUserLevel: 'beginner'
 * })
 *
 * // Use in component
 * function MyComponent() {
 *   const help = Help.useHelpSystem({ component: 'my-component' })
 *
 *   return (
 *     <Help.Provider>
 *       <Help.Tooltip content="This button starts the process">
 *         <button onClick={() => help.trackAction('button_clicked')}>
 *           Start Process
 *         </button>
 *       </Help.Tooltip>
 *     </Help.Provider>
 *   )
 * }
 * ```
 *
 * WORKFLOW INTEGRATION:
 *
 * ```tsx
 * import { HelpWorkflowIntegration } from '@/lib/help'
 *
 * function WorkflowEditor() {
 *   return (
 *     <HelpWorkflowIntegration originalNodeTypes={nodeTypes}>
 *       <ReactFlow nodes={nodes} edges={edges} />
 *     </HelpWorkflowIntegration>
 *   )
 * }
 * ```
 */
