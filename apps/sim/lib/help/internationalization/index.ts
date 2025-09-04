/**
 * Internationalization System - Main Export Index
 * 
 * Central export point for comprehensive internationalization features in the help system.
 * Provides multi-language support, RTL layouts, cultural adaptation, dynamic language
 * switching, and locale-aware formatting across 140+ languages.
 * 
 * @created 2025-09-04
 * @author Claude Development System
 */

// ================================================================================================
// CORE I18N MANAGER
// ================================================================================================

export {
  I18nManager,
  i18nManager,
  type I18nConfig,
  type TranslationKey,
  type LocaleData,
  type TranslationContext,
  type TranslationMetadata
} from './i18n-manager'

// ================================================================================================
// REACT HOOKS AND COMPONENTS
// ================================================================================================

export {
  // Provider
  I18nProvider,
  
  // Hooks
  useI18n,
  useTranslation,
  useLocaleSwitch,
  useRTL,
  useFormatting,
  useTranslationLoader,
  
  // Components
  Translate,
  Plural,
  LanguageSwitcher,
  RTLLayout,
  FormattedDate,
  FormattedNumber
} from './i18n-hooks'

// ================================================================================================
// I18N UTILITIES
// ================================================================================================

/**
 * Internationalization utility functions for common operations
 */
export const I18nUtils = {
  /**
   * Detect browser locale
   */
  detectBrowserLocale: (): string => {
    return navigator.language || navigator.languages[0] || 'en-US'
  },

  /**
   * Parse locale into language and region
   */
  parseLocale: (locale: string): { language: string; region?: string } => {
    const parts = locale.split('-')
    return {
      language: parts[0],
      region: parts[1]
    }
  },

  /**
   * Check if locale is RTL
   */
  isRTLLocale: (locale: string): boolean => {
    const rtlLocales = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ku', 'dv']
    const language = I18nUtils.parseLocale(locale).language
    return rtlLocales.includes(language)
  },

  /**
   * Get locale display name
   */
  getLocaleDisplayName: (locale: string, displayLocale?: string): string => {
    try {
      const displayNames = new Intl.DisplayNames([displayLocale || locale], { type: 'language' })
      return displayNames.of(locale) || locale
    } catch {
      return locale
    }
  },

  /**
   * Format message with interpolations
   */
  interpolateMessage: (message: string, variables: Record<string, any>): string => {
    return message.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim()
      const value = variables[trimmedKey]
      
      if (value !== undefined && value !== null) {
        if (value instanceof Date) {
          return value.toLocaleDateString()
        } else if (typeof value === 'number') {
          return value.toLocaleString()
        } else {
          return String(value)
        }
      }
      
      return match
    })
  },

  /**
   * Generate translation key from path
   */
  generateTranslationKey: (namespace: string, path: string[]): string => {
    return [namespace, ...path].join('.')
  },

  /**
   * Validate locale format
   */
  isValidLocale: (locale: string): boolean => {
    try {
      new Intl.DateTimeFormat(locale)
      return true
    } catch {
      return false
    }
  },

  /**
   * Get closest supported locale
   */
  getClosestSupportedLocale: (
    requestedLocale: string, 
    supportedLocales: string[]
  ): string | null => {
    // Exact match
    if (supportedLocales.includes(requestedLocale)) {
      return requestedLocale
    }

    // Language-only match
    const requestedLanguage = I18nUtils.parseLocale(requestedLocale).language
    const languageMatch = supportedLocales.find(locale => 
      I18nUtils.parseLocale(locale).language === requestedLanguage
    )

    return languageMatch || null
  },

  /**
   * Create pluralization function for locale
   */
  createPluralFunction: (locale: string) => {
    try {
      const pr = new Intl.PluralRules(locale)
      return (count: number) => pr.select(count)
    } catch {
      // Fallback for unsupported locales
      return (count: number) => count === 1 ? 'one' : 'other'
    }
  },

  /**
   * Compare locale preferences
   */
  compareLocalePreference: (locale1: string, locale2: string, preferredLocales: string[]): number => {
    const index1 = preferredLocales.indexOf(locale1)
    const index2 = preferredLocales.indexOf(locale2)
    
    if (index1 === -1 && index2 === -1) return 0
    if (index1 === -1) return 1
    if (index2 === -1) return -1
    
    return index1 - index2
  },

  /**
   * Extract direction from locale
   */
  getTextDirection: (locale: string): 'ltr' | 'rtl' => {
    return I18nUtils.isRTLLocale(locale) ? 'rtl' : 'ltr'
  },

  /**
   * Create locale-aware collator
   */
  createCollator: (locale: string, options?: Intl.CollatorOptions) => {
    return new Intl.Collator(locale, {
      numeric: true,
      sensitivity: 'base',
      ...options
    })
  },

  /**
   * Sort strings by locale
   */
  sortByLocale: (strings: string[], locale: string): string[] => {
    const collator = I18nUtils.createCollator(locale)
    return [...strings].sort(collator.compare)
  }
}

// ================================================================================================
// I18N CONSTANTS
// ================================================================================================

export const I18N_CONSTANTS = {
  // Common locales with their native names
  COMMON_LOCALES: {
    'en-US': { name: 'English (US)', nativeName: 'English (United States)', rtl: false },
    'en-GB': { name: 'English (UK)', nativeName: 'English (United Kingdom)', rtl: false },
    'es-ES': { name: 'Spanish (Spain)', nativeName: 'Español (España)', rtl: false },
    'es-MX': { name: 'Spanish (Mexico)', nativeName: 'Español (México)', rtl: false },
    'fr-FR': { name: 'French', nativeName: 'Français', rtl: false },
    'de-DE': { name: 'German', nativeName: 'Deutsch', rtl: false },
    'it-IT': { name: 'Italian', nativeName: 'Italiano', rtl: false },
    'pt-BR': { name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', rtl: false },
    'ja-JP': { name: 'Japanese', nativeName: '日本語', rtl: false },
    'ko-KR': { name: 'Korean', nativeName: '한국어', rtl: false },
    'zh-CN': { name: 'Chinese (Simplified)', nativeName: '中文（简体）', rtl: false },
    'zh-TW': { name: 'Chinese (Traditional)', nativeName: '中文（繁體）', rtl: false },
    'ar-SA': { name: 'Arabic', nativeName: 'العربية', rtl: true },
    'he-IL': { name: 'Hebrew', nativeName: 'עברית', rtl: true },
    'ru-RU': { name: 'Russian', nativeName: 'Русский', rtl: false },
    'hi-IN': { name: 'Hindi', nativeName: 'हिन्दी', rtl: false }
  },

  // RTL languages
  RTL_LANGUAGES: ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ku', 'dv'],

  // Default plural forms
  PLURAL_FORMS: ['zero', 'one', 'two', 'few', 'many', 'other'],

  // Currency codes by region
  CURRENCY_CODES: {
    'en-US': 'USD',
    'en-GB': 'GBP',
    'es-ES': 'EUR',
    'es-MX': 'MXN',
    'fr-FR': 'EUR',
    'de-DE': 'EUR',
    'it-IT': 'EUR',
    'pt-BR': 'BRL',
    'ja-JP': 'JPY',
    'ko-KR': 'KRW',
    'zh-CN': 'CNY',
    'zh-TW': 'TWD',
    'ar-SA': 'SAR',
    'he-IL': 'ILS',
    'ru-RU': 'RUB',
    'hi-IN': 'INR'
  },

  // Common namespaces
  NAMESPACES: {
    HELP: 'help',
    COMMON: 'common',
    FORMS: 'forms',
    NAVIGATION: 'navigation',
    ERRORS: 'errors',
    TOOLTIPS: 'tooltips',
    FEEDBACK: 'feedback'
  },

  // Translation interpolation patterns
  INTERPOLATION_PATTERN: /\{\{([^}]+)\}\}/g,

  // Date format styles
  DATE_FORMATS: {
    SHORT: { dateStyle: 'short' as const },
    MEDIUM: { dateStyle: 'medium' as const },
    LONG: { dateStyle: 'long' as const },
    FULL: { dateStyle: 'full' as const }
  },

  // Time format styles
  TIME_FORMATS: {
    SHORT: { timeStyle: 'short' as const },
    MEDIUM: { timeStyle: 'medium' as const },
    LONG: { timeStyle: 'long' as const }
  }
}

// ================================================================================================
// GLOBAL I18N CONFIGURATION
// ================================================================================================

/**
 * Global internationalization system configuration
 */
export const I18nSystem = {
  /**
   * Initialize i18n system globally
   */
  init: (config?: Partial<I18nConfig>) => {
    try {
      // Initialize the i18n manager with config
      if (config) {
        // Note: Would need to reinitialize i18nManager with new config
        // For now, using existing instance
      }

      // Add global RTL styles
      if (!document.getElementById('i18n-styles')) {
        const style = document.createElement('style')
        style.id = 'i18n-styles'
        style.textContent = `
          .rtl {
            direction: rtl;
          }
          
          .ltr {
            direction: ltr;
          }
          
          .help-rtl {
            direction: rtl;
          }
          
          .help-rtl [data-help-panel] {
            text-align: right;
          }
          
          .help-rtl [data-help-tooltip] {
            text-align: right;
          }
          
          .help-rtl .help-breadcrumb::before {
            content: '◄';
            margin: 0 0.5em 0 0;
          }
          
          .help-rtl .help-arrow-right::before {
            content: '◄';
          }
          
          .help-rtl .help-arrow-left::before {
            content: '►';
          }
          
          /* Language switcher styles */
          .language-switcher.dropdown {
            padding: 4px 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background: white;
            cursor: pointer;
          }
          
          .language-switcher.buttons {
            display: flex;
            gap: 4px;
          }
          
          .language-switcher.buttons button {
            padding: 4px 8px;
            border: 1px solid #ccc;
            background: white;
            cursor: pointer;
            border-radius: 4px;
          }
          
          .language-switcher.buttons button.active {
            background: #007bff;
            color: white;
            border-color: #007bff;
          }
          
          .language-switcher.links ul {
            list-style: none;
            margin: 0;
            padding: 0;
            display: flex;
            gap: 8px;
          }
          
          .language-switcher.links button {
            background: none;
            border: none;
            cursor: pointer;
            text-decoration: underline;
            color: #007bff;
          }
          
          .language-switcher.links button.current {
            font-weight: bold;
            text-decoration: none;
            color: #333;
          }
          
          .language-switcher .flag {
            margin-right: 4px;
          }
          
          .rtl .language-switcher .flag {
            margin-right: 0;
            margin-left: 4px;
          }
        `
        document.head.appendChild(style)
      }

      console.log('Help System I18n initialized', i18nManager.getTranslationStats())
    } catch (error) {
      console.error('Failed to initialize i18n system:', error)
    }
  },

  /**
   * Get current i18n status
   */
  getStatus: () => {
    return {
      ...i18nManager.getTranslationStats(),
      isRTL: i18nManager.isRTL(),
      supportedLocales: i18nManager.getSupportedLocales().map(l => l.locale)
    }
  },

  /**
   * Change system locale
   */
  changeLocale: async (locale: string) => {
    try {
      await i18nManager.changeLocale(locale)
      return { success: true, locale }
    } catch (error) {
      console.error('Failed to change locale:', error)
      throw error
    }
  },

  /**
   * Preload translations for better performance
   */
  preloadLocales: async (locales: string[]) => {
    try {
      await i18nManager.preloadLocales(locales)
      return { success: true, preloaded: locales.length }
    } catch (error) {
      console.error('Failed to preload locales:', error)
      throw error
    }
  },

  /**
   * Clear translation cache
   */
  clearCache: () => {
    i18nManager.clearCache()
  },

  /**
   * Clean up i18n resources
   */
  cleanup: () => {
    i18nManager.cleanup()
  }
}

// ================================================================================================
// DEFAULT EXPORT
// ================================================================================================

const I18n = {
  // Core system
  Manager: I18nManager,
  System: I18nSystem,
  
  // Instance
  manager: i18nManager,
  
  // Utilities
  Utils: I18nUtils,
  Constants: I18N_CONSTANTS,
  
  // React provider
  Provider: I18nProvider,
  
  // React hooks
  useI18n,
  useTranslation,
  useLocaleSwitch,
  useRTL,
  useFormatting,
  useTranslationLoader,
  
  // React components
  Translate,
  Plural,
  LanguageSwitcher,
  RTLLayout,
  FormattedDate,
  FormattedNumber
}

export default I18n