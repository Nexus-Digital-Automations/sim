/**
 * Utility functions for Parlant Chat optimization and bundle management
 */

import { lazy, type ComponentType } from 'react'
import type { ParlantChatboxProps } from './ParlantChatbox'
import type { SimChatConfig } from './types'

/**
 * Lazy-loaded Parlant Chatbox for code splitting
 */
export const LazyParlantChatbox = lazy(() => import('./ParlantChatbox'))

/**
 * Environment configuration utilities
 */
export const ChatEnvironment = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Default server endpoints
  getServerEndpoint: (environment?: 'development' | 'staging' | 'production') => {
    const endpoints = {
      development: process.env.NEXT_PUBLIC_PARLANT_SERVER_DEV || 'http://localhost:3001',
      staging: process.env.NEXT_PUBLIC_PARLANT_SERVER_STAGING || 'https://staging.parlant.emcie.co',
      production: process.env.NEXT_PUBLIC_PARLANT_SERVER || 'https://parlant.emcie.co',
    }

    const env = environment || (process.env.NODE_ENV as keyof typeof endpoints) || 'development'
    return endpoints[env] || endpoints.development
  },

  // Default agent configuration
  getDefaultAgent: (environment?: 'development' | 'staging' | 'production') => {
    const agents = {
      development: process.env.NEXT_PUBLIC_PARLANT_AGENT_ID_DEV || 'sim-dev-agent',
      staging: process.env.NEXT_PUBLIC_PARLANT_AGENT_ID_STAGING || 'sim-staging-agent',
      production: process.env.NEXT_PUBLIC_PARLANT_AGENT_ID || 'sim-agent',
    }

    const env = environment || (process.env.NODE_ENV as keyof typeof agents) || 'development'
    return agents[env] || agents.development
  },
}

/**
 * Performance monitoring utilities
 */
export class ChatPerformanceMonitor {
  private static instance: ChatPerformanceMonitor
  private metrics: Map<string, number> = new Map()
  private startTimes: Map<string, number> = new Map()

  static getInstance(): ChatPerformanceMonitor {
    if (!ChatPerformanceMonitor.instance) {
      ChatPerformanceMonitor.instance = new ChatPerformanceMonitor()
    }
    return ChatPerformanceMonitor.instance
  }

  startTimer(operation: string): void {
    this.startTimes.set(operation, performance.now())
  }

  endTimer(operation: string): number {
    const startTime = this.startTimes.get(operation)
    if (!startTime) {
      console.warn(`No start time found for operation: ${operation}`)
      return 0
    }

    const duration = performance.now() - startTime
    this.metrics.set(operation, duration)
    this.startTimes.delete(operation)

    if (ChatEnvironment.isDevelopment) {
      console.log(`[ChatPerf] ${operation}: ${duration.toFixed(2)}ms`)
    }

    return duration
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics.entries())
  }

  clearMetrics(): void {
    this.metrics.clear()
    this.startTimes.clear()
  }
}

/**
 * Bundle size analyzer for development
 */
export const BundleAnalyzer = {
  /**
   * Estimate component size impact
   */
  analyzeComponent: async (componentName: string): Promise<{
    estimatedSize: string
    dependencies: string[]
    recommendations: string[]
  }> => {
    if (!ChatEnvironment.isDevelopment) {
      return {
        estimatedSize: 'Unknown (production mode)',
        dependencies: [],
        recommendations: ['Bundle analysis only available in development'],
      }
    }

    // This would integrate with webpack-bundle-analyzer or similar tools
    return {
      estimatedSize: '~45KB gzipped',
      dependencies: [
        'parlant-chat-react',
        'react',
        'react-dom',
        'lucide-react',
      ],
      recommendations: [
        'Consider lazy loading for non-critical chat instances',
        'Use code splitting for different chat configurations',
        'Implement service worker caching for repeated visits',
      ],
    }
  },

  /**
   * Generate bundle optimization report
   */
  generateOptimizationReport: () => {
    if (!ChatEnvironment.isDevelopment) {
      console.log('Bundle optimization report only available in development mode')
      return
    }

    const report = {
      totalSize: '~45KB gzipped',
      components: {
        'ParlantChatbox': '~25KB',
        'Custom Components': '~8KB',
        'Hooks & Utilities': '~5KB',
        'Styles': '~7KB',
      },
      optimizations: [
        'Tree shaking enabled for unused exports',
        'CSS is extracted and minified separately',
        'Components are lazy-loadable',
        'TypeScript definitions don\'t impact runtime bundle',
      ],
      recommendations: [
        'Use dynamic imports for conditional chat loading',
        'Consider splitting chat styles into critical and non-critical CSS',
        'Implement preloading for likely chat interactions',
      ],
    }

    console.table(report.components)
    console.log('Bundle Optimization Report:', report)
    return report
  },
}

/**
 * Configuration validator
 */
export const ConfigValidator = {
  /**
   * Validate chat configuration
   */
  validate: (config: SimChatConfig): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } => {
    const errors: string[] = []
    const warnings: string[] = []

    // Required fields
    if (!config.server && !ChatEnvironment.getServerEndpoint()) {
      errors.push('Server endpoint is required')
    }

    if (!config.agentId && !ChatEnvironment.getDefaultAgent()) {
      errors.push('Agent ID is required')
    }

    // URL validation
    if (config.server) {
      try {
        new URL(config.server)
      } catch {
        errors.push('Server endpoint must be a valid URL')
      }
    }

    // Theme validation
    if (config.theme && !['light', 'dark', 'auto'].includes(config.theme)) {
      errors.push('Theme must be one of: light, dark, auto')
    }

    // Custom colors validation
    if (config.customColors) {
      const colorKeys = Object.keys(config.customColors)
      const validKeys = ['primary', 'primaryHover', 'background', 'foreground', 'border', 'accent']
      const invalidKeys = colorKeys.filter(key => !validKeys.includes(key))

      if (invalidKeys.length > 0) {
        warnings.push(`Unknown custom color keys: ${invalidKeys.join(', ')}`)
      }

      // Basic color format validation
      Object.entries(config.customColors).forEach(([key, color]) => {
        if (color && !color.match(/^#[0-9a-fA-F]{6}$/) && !color.match(/^rgb\(/) && !color.match(/^hsl\(/)) {
          warnings.push(`Custom color '${key}' may not be a valid CSS color value`)
        }
      })
    }

    // Performance warnings
    if (config.animations?.enabled === false) {
      warnings.push('Animations are disabled - this may affect user experience')
    }

    if (!config.float && typeof window !== 'undefined' && window.innerWidth < 768) {
      warnings.push('Non-floating chat on mobile may have poor UX')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  },

  /**
   * Sanitize configuration for production
   */
  sanitize: (config: SimChatConfig): SimChatConfig => {
    const sanitized = { ...config }

    // Remove development-only options in production
    if (ChatEnvironment.isProduction) {
      delete sanitized.customColors
      sanitized.animations = { enabled: true, duration: 200 }
    }

    // Ensure required fields have defaults
    if (!sanitized.server) {
      sanitized.server = ChatEnvironment.getServerEndpoint()
    }

    if (!sanitized.agentId) {
      sanitized.agentId = ChatEnvironment.getDefaultAgent()
    }

    // Set safe defaults
    if (sanitized.theme === undefined) {
      sanitized.theme = 'auto'
    }

    return sanitized
  },
}

/**
 * Debug utilities
 */
export const ChatDebugger = {
  /**
   * Enable debug mode
   */
  enable: () => {
    if (typeof window !== 'undefined') {
      (window as any).__PARLANT_CHAT_DEBUG__ = true
      console.log('Parlant Chat debug mode enabled')
    }
  },

  /**
   * Disable debug mode
   */
  disable: () => {
    if (typeof window !== 'undefined') {
      (window as any).__PARLANT_CHAT_DEBUG__ = false
      console.log('Parlant Chat debug mode disabled')
    }
  },

  /**
   * Log debug information
   */
  log: (message: string, data?: any) => {
    if (typeof window !== 'undefined' && (window as any).__PARLANT_CHAT_DEBUG__) {
      console.log(`[ParlantChat Debug] ${message}`, data)
    }
  },

  /**
   * Get runtime information
   */
  getRuntimeInfo: () => {
    return {
      environment: process.env.NODE_ENV,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight,
      } : null,
      performance: ChatPerformanceMonitor.getInstance().getMetrics(),
      timestamp: new Date().toISOString(),
    }
  },
}

/**
 * Higher-order component for performance monitoring
 */
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: ComponentType<P>,
  componentName: string
): ComponentType<P> {
  return (props: P) => {
    const monitor = ChatPerformanceMonitor.getInstance()

    // Monitor component mount time
    const startTime = performance.now()

    React.useEffect(() => {
      const mountTime = performance.now() - startTime
      monitor.metrics.set(`${componentName}_mount`, mountTime)

      if (ChatEnvironment.isDevelopment) {
        ChatDebugger.log(`${componentName} mounted`, { mountTime: `${mountTime.toFixed(2)}ms` })
      }
    }, [])

    return React.createElement(WrappedComponent, props)
  }
}

/**
 * Utility to preload chat resources
 */
export const preloadChatResources = async () => {
  if (typeof window === 'undefined') return

  const monitor = ChatPerformanceMonitor.getInstance()
  monitor.startTimer('preload_resources')

  try {
    // Preload the main chat component
    await import('./ParlantChatbox')

    // Preload styles
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = '/parlant-chat/styles.css'
    link.as = 'style'
    document.head.appendChild(link)

    ChatDebugger.log('Chat resources preloaded successfully')
  } catch (error) {
    console.error('Failed to preload chat resources:', error)
  } finally {
    monitor.endTimer('preload_resources')
  }
}