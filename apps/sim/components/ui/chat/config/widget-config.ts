/**
 * Parlant Chat Widget Configuration Management
 *
 * This module provides utilities for managing Parlant widget configuration,
 * including default settings, validation, and theme integration.
 */

import { SimChatWidgetConfig, SimChatTheme, ParlantClassNames } from '../types/parlant-widget.types'

// Default configuration values
export const DEFAULT_WIDGET_CONFIG: SimChatWidgetConfig = {
  workspaceId: '',
  agentId: '',
  parlantServerUrl: process.env.NEXT_PUBLIC_PARLANT_SERVER_URL || 'http://localhost:8000',
  theme: {
    primary: 'hsl(var(--primary))',
    secondary: 'hsl(var(--secondary))',
    background: 'hsl(var(--background))',
    foreground: 'hsl(var(--foreground))',
    accent: 'hsl(var(--accent))',
    muted: 'hsl(var(--muted))',
    border: 'hsl(var(--border))',
    userMessageBg: 'hsl(var(--primary))',
    agentMessageBg: 'hsl(var(--muted))',
    userMessageText: 'hsl(var(--primary-foreground))',
    agentMessageText: 'hsl(var(--foreground))',
    fontFamily: 'var(--font-geist-sans)',
    fontSize: 'md',
    borderRadius: 'var(--radius)',
    spacing: 'comfortable',
    enableAnimations: true,
    animationDuration: 200,
  },
  position: 'bottom-right',
  size: 'medium',
  enableVoice: false,
  enableFileUpload: true,
  enableScreenshot: false,
  showTypingIndicator: true,
  showTimestamps: true,
  branding: {
    welcomeMessage: 'Hello! How can I help you today?',
    placeholderText: 'Type your message...',
    poweredBy: false,
  },
}

// Size configurations
export const WIDGET_SIZES = {
  small: {
    width: '320px',
    height: '400px',
    maxWidth: '90vw',
    maxHeight: '70vh',
  },
  medium: {
    width: '400px',
    height: '600px',
    maxWidth: '90vw',
    maxHeight: '80vh',
  },
  large: {
    width: '500px',
    height: '700px',
    maxWidth: '95vw',
    maxHeight: '90vh',
  },
} as const

// Position configurations
export const WIDGET_POSITIONS = {
  'bottom-right': {
    bottom: '20px',
    right: '20px',
  },
  'bottom-left': {
    bottom: '20px',
    left: '20px',
  },
  'top-right': {
    top: '20px',
    right: '20px',
  },
  'top-left': {
    top: '20px',
    left: '20px',
  },
} as const

/**
 * Generate CSS custom properties from theme configuration
 */
export function generateThemeCSSProperties(theme: SimChatTheme): Record<string, string> {
  const cssProps: Record<string, string> = {}

  // Color properties
  if (theme.primary) cssProps['--parlant-primary'] = theme.primary
  if (theme.secondary) cssProps['--parlant-secondary'] = theme.secondary
  if (theme.background) cssProps['--parlant-background'] = theme.background
  if (theme.foreground) cssProps['--parlant-foreground'] = theme.foreground
  if (theme.accent) cssProps['--parlant-accent'] = theme.accent
  if (theme.muted) cssProps['--parlant-muted'] = theme.muted
  if (theme.border) cssProps['--parlant-border'] = theme.border

  // Chat-specific colors
  if (theme.userMessageBg) cssProps['--parlant-user-message-bg'] = theme.userMessageBg
  if (theme.agentMessageBg) cssProps['--parlant-agent-message-bg'] = theme.agentMessageBg
  if (theme.userMessageText) cssProps['--parlant-user-message-text'] = theme.userMessageText
  if (theme.agentMessageText) cssProps['--parlant-agent-message-text'] = theme.agentMessageText

  // Typography
  if (theme.fontFamily) cssProps['--parlant-font-family'] = theme.fontFamily
  if (theme.fontSize) {
    const fontSizeMap = {
      sm: '14px',
      md: '16px',
      lg: '18px',
    }
    cssProps['--parlant-font-size'] = fontSizeMap[theme.fontSize]
  }

  // Layout
  if (theme.borderRadius) cssProps['--parlant-border-radius'] = theme.borderRadius
  if (theme.spacing) {
    const spacingMap = {
      compact: '8px',
      comfortable: '12px',
      spacious: '16px',
    }
    cssProps['--parlant-spacing'] = spacingMap[theme.spacing]
  }

  // Animation
  if (theme.animationDuration) {
    cssProps['--parlant-animation-duration'] = `${theme.animationDuration}ms`
  }

  return cssProps
}

/**
 * Generate Tailwind CSS classes for the widget
 */
export function generateTailwindClasses(config: SimChatWidgetConfig): ParlantClassNames {
  const { theme, size = 'medium' } = config

  return {
    chatboxWrapper: [
      'fixed z-50 transition-all duration-300',
      'shadow-lg border border-border/50',
      'bg-background/95 backdrop-blur-sm',
      size === 'small' && 'w-80 h-96',
      size === 'medium' && 'w-96 h-[600px]',
      size === 'large' && 'w-[500px] h-[700px]',
      'max-w-[90vw] max-h-[80vh]',
      'rounded-lg overflow-hidden',
    ].filter(Boolean).join(' '),

    chatbox: [
      'flex flex-col h-full',
      'bg-background text-foreground',
    ].join(' '),

    messagesArea: [
      'flex-1 overflow-y-auto p-4 space-y-3',
      'scroll-smooth scrollbar-thin',
      'scrollbar-thumb-muted scrollbar-track-transparent',
    ].join(' '),

    agentMessage: [
      'flex items-start space-x-2 max-w-[85%]',
      'animate-fade-up',
    ].join(' '),

    customerMessage: [
      'flex items-end space-x-2 max-w-[85%] ml-auto',
      'animate-fade-up',
    ].join(' '),

    textarea: [
      'flex-1 resize-none border-0 bg-transparent',
      'focus:outline-none focus:ring-0',
      'placeholder:text-muted-foreground',
      'text-sm leading-relaxed',
    ].join(' '),

    popupButton: [
      'fixed z-50 w-14 h-14',
      'bg-primary hover:bg-primary/90',
      'text-primary-foreground',
      'rounded-full shadow-lg',
      'transition-all duration-200',
      'hover:scale-105 active:scale-95',
      'flex items-center justify-center',
      'border border-border/20',
    ].join(' '),

    popupButtonIcon: [
      'w-6 h-6 transition-transform duration-200',
    ].join(' '),

    chatDescription: [
      'text-sm text-muted-foreground',
      'px-4 py-2 bg-muted/50',
      'border-b border-border/50',
    ].join(' '),

    bottomLine: [
      'flex items-center space-x-2 p-3',
      'bg-background border-t border-border/50',
    ].join(' '),
  }
}

/**
 * Validate widget configuration
 */
export function validateWidgetConfig(config: Partial<SimChatWidgetConfig>): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Required fields
  if (!config.workspaceId) {
    errors.push('workspaceId is required')
  }

  if (!config.agentId) {
    errors.push('agentId is required')
  }

  if (!config.parlantServerUrl) {
    errors.push('parlantServerUrl is required')
  }

  // URL validation
  if (config.parlantServerUrl && !isValidUrl(config.parlantServerUrl)) {
    errors.push('parlantServerUrl must be a valid URL')
  }

  // Size validation
  if (config.size && !['small', 'medium', 'large'].includes(config.size)) {
    errors.push('size must be one of: small, medium, large')
  }

  // Position validation
  if (config.position && !['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(config.position)) {
    errors.push('position must be one of: bottom-right, bottom-left, top-right, top-left')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Merge user configuration with defaults
 */
export function mergeWithDefaults(userConfig: Partial<SimChatWidgetConfig>): SimChatWidgetConfig {
  return {
    ...DEFAULT_WIDGET_CONFIG,
    ...userConfig,
    theme: {
      ...DEFAULT_WIDGET_CONFIG.theme,
      ...userConfig.theme,
    },
    branding: {
      ...DEFAULT_WIDGET_CONFIG.branding,
      ...userConfig.branding,
    },
  }
}

/**
 * Get configuration for specific environment
 */
export function getEnvironmentConfig(): Partial<SimChatWidgetConfig> {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isProduction = process.env.NODE_ENV === 'production'

  const config: Partial<SimChatWidgetConfig> = {
    parlantServerUrl: process.env.NEXT_PUBLIC_PARLANT_SERVER_URL || 'http://localhost:8000',
  }

  if (isDevelopment) {
    config.branding = {
      ...config.branding,
      poweredBy: true,
    }
  }

  if (isProduction) {
    config.branding = {
      ...config.branding,
      poweredBy: false,
    }
  }

  return config
}

/**
 * Generate position styles based on configuration
 */
export function getPositionStyles(position: SimChatWidgetConfig['position'] = 'bottom-right'): React.CSSProperties {
  return WIDGET_POSITIONS[position] || WIDGET_POSITIONS['bottom-right']
}

/**
 * Generate size styles based on configuration
 */
export function getSizeStyles(size: SimChatWidgetConfig['size'] = 'medium'): React.CSSProperties {
  return WIDGET_SIZES[size] || WIDGET_SIZES.medium
}

// Helper functions
function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

/**
 * Create CSS injection for custom theming
 */
export function createThemeCSS(config: SimChatWidgetConfig): string {
  if (!config.theme && !config.customCSS) return ''

  const cssProperties = config.theme ? generateThemeCSSProperties(config.theme) : {}

  let css = ''

  // CSS Custom Properties
  if (Object.keys(cssProperties).length > 0) {
    css += '.parlant-chat-widget {\n'
    Object.entries(cssProperties).forEach(([property, value]) => {
      css += `  ${property}: ${value};\n`
    })
    css += '}\n'
  }

  // Animation preferences
  if (config.theme?.enableAnimations === false) {
    css += `
      .parlant-chat-widget * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    `
  }

  // Custom CSS
  if (config.customCSS) {
    css += `\n/* Custom CSS */\n${config.customCSS}\n`
  }

  return css
}