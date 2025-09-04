/**
 * React Internationalization Hooks and Components
 *
 * React integration for the internationalization system providing hooks and components
 * for multi-language support, RTL layout, cultural adaptation, and dynamic language
 * switching in the help system.
 *
 * Features:
 * - Translation hooks with interpolation support
 * - Language switching components
 * - RTL layout management
 * - Cultural context providers
 * - Locale-aware formatting
 * - Dynamic translation loading
 * - Pluralization support
 * - Translation key management
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createLogger } from '@/lib/logs/console/logger'
import { i18nManager, type LocaleData, type TranslationKey } from './i18n-manager'

const logger = createLogger('I18nHooks')

// ================================================================================================
// CONTEXT SETUP
// ================================================================================================

interface I18nContextValue {
  currentLocale: string
  supportedLocales: LocaleData[]
  isRTL: boolean
  isLoading: boolean
  changeLocale: (locale: string) => Promise<void>
  t: (key: string | TranslationKey, defaultValue?: string) => string
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string
  formatTime: (date: Date, options?: Intl.DateTimeFormatOptions) => string
  formatNumber: (number: number, options?: Intl.NumberFormatOptions) => string
  formatCurrency: (amount: number, currency?: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

// ================================================================================================
// I18N PROVIDER
// ================================================================================================

interface I18nProviderProps {
  children: React.ReactNode
  defaultLocale?: string
  supportedLocales?: string[]
  onLocaleChange?: (locale: string) => void
}

export function I18nProvider({
  children,
  defaultLocale,
  supportedLocales,
  onLocaleChange,
}: I18nProviderProps) {
  const [currentLocale, setCurrentLocale] = useState(
    defaultLocale || i18nManager.getCurrentLocale()
  )
  const [isLoading, setIsLoading] = useState(false)
  const [availableLocales, setAvailableLocales] = useState<LocaleData[]>([])

  // Initialize i18n manager with custom settings if provided
  useEffect(() => {
    const initI18n = async () => {
      setIsLoading(true)

      try {
        // Configure i18n manager if custom settings provided
        if (defaultLocale || supportedLocales) {
          // Note: Would need to reinitialize i18nManager with new config
          // For now, we'll work with the existing instance
        }

        // Load supported locales
        const locales = i18nManager.getSupportedLocales()
        setAvailableLocales(locales)

        // Set current locale
        const current = i18nManager.getCurrentLocale()
        setCurrentLocale(current)
      } catch (error) {
        logger.error('Failed to initialize I18n provider', {
          error: error instanceof Error ? error.message : String(error),
        })
      } finally {
        setIsLoading(false)
      }
    }

    initI18n()
  }, [defaultLocale, supportedLocales])

  // Set up locale change observer
  useEffect(() => {
    const unsubscribe = i18nManager.onLocaleChange((newLocale) => {
      setCurrentLocale(newLocale)
      onLocaleChange?.(newLocale)

      logger.info('Locale changed in provider', {
        from: currentLocale,
        to: newLocale,
      })
    })

    return unsubscribe
  }, [currentLocale, onLocaleChange])

  const changeLocale = useCallback(
    async (locale: string) => {
      if (locale === currentLocale) return

      setIsLoading(true)

      try {
        await i18nManager.changeLocale(locale)
        // State will be updated via the observer
      } catch (error) {
        logger.error('Failed to change locale', {
          locale,
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [currentLocale]
  )

  const t = useCallback((key: string | TranslationKey, defaultValue?: string) => {
    return i18nManager.t(key, defaultValue)
  }, [])

  const formatDate = useCallback((date: Date, options?: Intl.DateTimeFormatOptions) => {
    return i18nManager.formatDate(date, options)
  }, [])

  const formatTime = useCallback((date: Date, options?: Intl.DateTimeFormatOptions) => {
    return i18nManager.formatTime(date, options)
  }, [])

  const formatNumber = useCallback((number: number, options?: Intl.NumberFormatOptions) => {
    return i18nManager.formatNumber(number, options)
  }, [])

  const formatCurrency = useCallback((amount: number, currency?: string) => {
    return i18nManager.formatCurrency(amount, currency)
  }, [])

  const isRTL = useMemo(() => i18nManager.isRTL(currentLocale), [currentLocale])

  const contextValue: I18nContextValue = {
    currentLocale,
    supportedLocales: availableLocales,
    isRTL,
    isLoading,
    changeLocale,
    t,
    formatDate,
    formatTime,
    formatNumber,
    formatCurrency,
  }

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
}

// ================================================================================================
// HOOKS
// ================================================================================================

/**
 * Main internationalization hook
 */
export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }

  return context
}

/**
 * Translation hook with enhanced features
 */
export function useTranslation(namespace?: string) {
  const { t: baseT, currentLocale } = useI18n()

  const t = useCallback(
    (
      key: string,
      options?: {
        defaultValue?: string
        interpolations?: Record<string, any>
        count?: number
        context?: string
      }
    ) => {
      const fullKey = namespace ? `${namespace}.${key}` : key

      const translationKey: TranslationKey = {
        key: fullKey,
        namespace,
        context: options?.context,
        count: options?.count,
        interpolations: options?.interpolations,
      }

      return baseT(translationKey, options?.defaultValue)
    },
    [baseT, namespace]
  )

  // Pluralization helper
  const plural = useCallback(
    (
      key: string,
      count: number,
      options?: {
        defaultValue?: string
        interpolations?: Record<string, any>
      }
    ) => {
      return t(key, {
        ...options,
        count,
        interpolations: {
          count,
          ...options?.interpolations,
        },
      })
    },
    [t]
  )

  // Contextual translation helper
  const contextual = useCallback(
    (
      key: string,
      context: string,
      options?: {
        defaultValue?: string
        interpolations?: Record<string, any>
      }
    ) => {
      return t(key, {
        ...options,
        context,
      })
    },
    [t]
  )

  return {
    t,
    plural,
    contextual,
    currentLocale,
  }
}

/**
 * Locale switching hook
 */
export function useLocaleSwitch() {
  const { currentLocale, supportedLocales, changeLocale, isLoading } = useI18n()

  const switchToLocale = useCallback(
    async (locale: string) => {
      try {
        await changeLocale(locale)

        logger.info('Locale switched successfully', {
          from: currentLocale,
          to: locale,
        })
      } catch (error) {
        logger.error('Failed to switch locale', {
          locale,
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
    },
    [changeLocale, currentLocale]
  )

  return {
    currentLocale,
    supportedLocales,
    switchToLocale,
    isLoading,
  }
}

/**
 * RTL layout hook
 */
export function useRTL() {
  const { isRTL, currentLocale } = useI18n()

  // CSS-in-JS RTL helpers
  const rtlStyles = useMemo(
    () => ({
      textAlign: isRTL ? ('right' as const) : ('left' as const),
      direction: isRTL ? ('rtl' as const) : ('ltr' as const),
      marginLeft: (value: string) => (isRTL ? undefined : value),
      marginRight: (value: string) => (isRTL ? value : undefined),
      paddingLeft: (value: string) => (isRTL ? undefined : value),
      paddingRight: (value: string) => (isRTL ? value : undefined),
      left: (value: string) => (isRTL ? undefined : value),
      right: (value: string) => (isRTL ? value : undefined),
      borderLeft: (value: string) => (isRTL ? undefined : value),
      borderRight: (value: string) => (isRTL ? value : undefined),
    }),
    [isRTL]
  )

  // Directional class names
  const directionClass = isRTL ? 'rtl' : 'ltr'
  const localeClass = `locale-${currentLocale.toLowerCase().replace('_', '-')}`

  return {
    isRTL,
    direction: isRTL ? 'rtl' : 'ltr',
    rtlStyles,
    directionClass,
    localeClass,
  }
}

/**
 * Formatting hook for numbers, dates, and currencies
 */
export function useFormatting() {
  const { formatDate, formatTime, formatNumber, formatCurrency, currentLocale } = useI18n()

  // Memoized formatters for common use cases
  const formatters = useMemo(
    () => ({
      // Date formatters
      shortDate: (date: Date) => formatDate(date, { dateStyle: 'short' }),
      mediumDate: (date: Date) => formatDate(date, { dateStyle: 'medium' }),
      longDate: (date: Date) => formatDate(date, { dateStyle: 'long' }),
      fullDate: (date: Date) => formatDate(date, { dateStyle: 'full' }),

      // Time formatters
      shortTime: (date: Date) => formatTime(date, { timeStyle: 'short' }),
      mediumTime: (date: Date) => formatTime(date, { timeStyle: 'medium' }),

      // Date + time formatters
      dateTime: (date: Date) =>
        formatDate(date, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),

      // Number formatters
      integer: (num: number) => formatNumber(num, { maximumFractionDigits: 0 }),
      decimal: (num: number, digits = 2) =>
        formatNumber(num, {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        }),
      percent: (num: number) => formatNumber(num, { style: 'percent' }),

      // File size formatter
      fileSize: (bytes: number) => {
        const units = ['B', 'KB', 'MB', 'GB', 'TB']
        let size = bytes
        let unitIndex = 0

        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024
          unitIndex++
        }

        return `${formatNumber(size, { maximumFractionDigits: 1 })} ${units[unitIndex]}`
      },

      // Relative time formatter
      relativeTime: (date: Date) => {
        try {
          const rtf = new Intl.RelativeTimeFormat(currentLocale, { numeric: 'auto' })
          const diffInSeconds = (date.getTime() - Date.now()) / 1000

          if (Math.abs(diffInSeconds) < 60) return rtf.format(Math.round(diffInSeconds), 'second')
          if (Math.abs(diffInSeconds) < 3600)
            return rtf.format(Math.round(diffInSeconds / 60), 'minute')
          if (Math.abs(diffInSeconds) < 86400)
            return rtf.format(Math.round(diffInSeconds / 3600), 'hour')
          return rtf.format(Math.round(diffInSeconds / 86400), 'day')
        } catch {
          return formatDate(date, { dateStyle: 'short' })
        }
      },
    }),
    [formatDate, formatTime, formatNumber, formatCurrency, currentLocale]
  )

  return {
    formatDate,
    formatTime,
    formatNumber,
    formatCurrency,
    ...formatters,
  }
}

/**
 * Translation loading hook for dynamic content
 */
export function useTranslationLoader() {
  const [loadingStates, setLoadingStates] = useState<Map<string, boolean>>(new Map())
  const { currentLocale } = useI18n()

  const loadTranslations = useCallback(
    async (namespaces: string[]) => {
      const loadingUpdates = new Map<string, boolean>()

      // Mark namespaces as loading
      namespaces.forEach((ns) => {
        loadingUpdates.set(ns, true)
      })
      setLoadingStates((prev) => new Map([...prev, ...loadingUpdates]))

      try {
        // Load translations for each namespace
        await Promise.all(
          namespaces.map(async (namespace) => {
            try {
              const response = await fetch(`/api/help/translations/${currentLocale}/${namespace}`)
              if (response.ok) {
                const translations = await response.json()
                // Note: Would need to update i18nManager with new translations
                logger.info('Translations loaded for namespace', {
                  namespace,
                  locale: currentLocale,
                  count: Object.keys(translations).length,
                })
              }
            } catch (error) {
              logger.error('Failed to load translations for namespace', {
                namespace,
                locale: currentLocale,
                error: error instanceof Error ? error.message : String(error),
              })
            }
          })
        )
      } finally {
        // Mark all namespaces as finished loading
        setLoadingStates((prev) => {
          const updated = new Map(prev)
          namespaces.forEach((ns) => {
            updated.set(ns, false)
          })
          return updated
        })
      }
    },
    [currentLocale]
  )

  const isLoading = useCallback(
    (namespace: string) => {
      return loadingStates.get(namespace) || false
    },
    [loadingStates]
  )

  const isAnyLoading = useMemo(() => {
    return Array.from(loadingStates.values()).some(Boolean)
  }, [loadingStates])

  return {
    loadTranslations,
    isLoading,
    isAnyLoading,
  }
}

// ================================================================================================
// COMPONENTS
// ================================================================================================

/**
 * Translation component for declarative translations
 */
interface TranslateProps {
  i18nKey: string
  defaultValue?: string
  interpolations?: Record<string, any>
  count?: number
  context?: string
  namespace?: string
  as?: React.ElementType
  className?: string
  children?: (translatedText: string) => React.ReactNode
}

export function Translate({
  i18nKey,
  defaultValue,
  interpolations,
  count,
  context,
  namespace,
  as: Component = 'span',
  className,
  children,
  ...props
}: TranslateProps) {
  const { t } = useI18n()

  const translationKey: TranslationKey = {
    key: namespace ? `${namespace}.${i18nKey}` : i18nKey,
    namespace,
    context,
    count,
    interpolations,
  }

  const translatedText = t(translationKey, defaultValue)

  if (children) {
    return <>{children(translatedText)}</>
  }

  return (
    <Component className={className} {...props}>
      {translatedText}
    </Component>
  )
}

/**
 * Plural component for handling pluralization
 */
interface PluralProps {
  i18nKey: string
  count: number
  defaultValue?: string
  interpolations?: Record<string, any>
  namespace?: string
  as?: React.ElementType
  className?: string
}

export function Plural({
  i18nKey,
  count,
  defaultValue,
  interpolations,
  namespace,
  as: Component = 'span',
  className,
  ...props
}: PluralProps) {
  return (
    <Translate
      i18nKey={i18nKey}
      defaultValue={defaultValue}
      interpolations={{ count, ...interpolations }}
      count={count}
      namespace={namespace}
      as={Component}
      className={className}
      {...props}
    />
  )
}

/**
 * Language switcher component
 */
interface LanguageSwitcherProps {
  showNativeNames?: boolean
  showFlags?: boolean
  variant?: 'dropdown' | 'buttons' | 'links'
  className?: string
  onLocaleChange?: (locale: string) => void
}

export function LanguageSwitcher({
  showNativeNames = true,
  showFlags = false,
  variant = 'dropdown',
  className = '',
  onLocaleChange,
}: LanguageSwitcherProps) {
  const { currentLocale, supportedLocales, switchToLocale, isLoading } = useLocaleSwitch()

  const handleLocaleChange = useCallback(
    async (locale: string) => {
      try {
        await switchToLocale(locale)
        onLocaleChange?.(locale)
      } catch (error) {
        logger.error('Language switcher failed to change locale', {
          locale,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    },
    [switchToLocale, onLocaleChange]
  )

  if (variant === 'dropdown') {
    return (
      <select
        value={currentLocale}
        onChange={(e) => handleLocaleChange(e.target.value)}
        disabled={isLoading}
        className={`language-switcher dropdown ${className}`}
        aria-label='Select language'
      >
        {supportedLocales.map((locale) => (
          <option key={locale.locale} value={locale.locale}>
            {showNativeNames ? locale.nativeName : locale.name}
            {showFlags && ` ${getLocaleFlag(locale.locale)}`}
          </option>
        ))}
      </select>
    )
  }

  if (variant === 'buttons') {
    return (
      <div
        className={`language-switcher buttons ${className}`}
        role='group'
        aria-label='Language selection'
      >
        {supportedLocales.map((locale) => (
          <button
            key={locale.locale}
            onClick={() => handleLocaleChange(locale.locale)}
            disabled={isLoading}
            className={currentLocale === locale.locale ? 'active' : ''}
            aria-pressed={currentLocale === locale.locale}
          >
            {showFlags && <span className='flag'>{getLocaleFlag(locale.locale)}</span>}
            <span className='label'>{showNativeNames ? locale.nativeName : locale.name}</span>
          </button>
        ))}
      </div>
    )
  }

  // Links variant
  return (
    <nav className={`language-switcher links ${className}`} aria-label='Language selection'>
      <ul>
        {supportedLocales.map((locale) => (
          <li key={locale.locale}>
            <button
              onClick={() => handleLocaleChange(locale.locale)}
              disabled={isLoading}
              className={currentLocale === locale.locale ? 'current' : ''}
              aria-current={currentLocale === locale.locale ? 'true' : 'false'}
            >
              {showFlags && <span className='flag'>{getLocaleFlag(locale.locale)}</span>}
              <span className='label'>{showNativeNames ? locale.nativeName : locale.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * RTL layout wrapper component
 */
interface RTLLayoutProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function RTLLayout({ children, className = '', style = {} }: RTLLayoutProps) {
  const { isRTL, direction, directionClass, localeClass } = useRTL()

  const layoutStyle: React.CSSProperties = {
    direction,
    ...style,
  }

  return (
    <div
      className={`rtl-layout ${directionClass} ${localeClass} ${className}`}
      style={layoutStyle}
      dir={direction}
    >
      {children}
    </div>
  )
}

/**
 * Formatted date component
 */
interface FormattedDateProps {
  date: Date
  format?: 'short' | 'medium' | 'long' | 'full' | 'relative'
  options?: Intl.DateTimeFormatOptions
  className?: string
  title?: boolean
}

export function FormattedDate({
  date,
  format = 'medium',
  options,
  className,
  title = true,
}: FormattedDateProps) {
  const { formatDate } = useFormatting()

  const formattedDate = useMemo(() => {
    if (options) return formatDate(date, options)

    const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
      short: { dateStyle: 'short' },
      medium: { dateStyle: 'medium' },
      long: { dateStyle: 'long' },
      full: { dateStyle: 'full' },
      relative: {}, // Will be handled by relativeTime formatter
    }

    if (format === 'relative') {
      const { relativeTime } = useFormatting()
      return relativeTime(date)
    }

    return formatDate(date, formatOptions[format])
  }, [date, format, options, formatDate])

  const isoDate = date.toISOString()

  return (
    <time dateTime={isoDate} title={title ? isoDate : undefined} className={className}>
      {formattedDate}
    </time>
  )
}

/**
 * Formatted number component
 */
interface FormattedNumberProps {
  value: number
  format?: 'integer' | 'decimal' | 'percent' | 'currency' | 'fileSize'
  currency?: string
  options?: Intl.NumberFormatOptions
  className?: string
}

export function FormattedNumber({
  value,
  format = 'decimal',
  currency,
  options,
  className,
}: FormattedNumberProps) {
  const { formatNumber, formatCurrency, fileSize } = useFormatting()

  const formattedValue = useMemo(() => {
    if (options) return formatNumber(value, options)

    switch (format) {
      case 'integer':
        return formatNumber(value, { maximumFractionDigits: 0 })
      case 'decimal':
        return formatNumber(value)
      case 'percent':
        return formatNumber(value, { style: 'percent' })
      case 'currency':
        return formatCurrency(value, currency)
      case 'fileSize':
        return fileSize(value)
      default:
        return formatNumber(value)
    }
  }, [value, format, currency, options, formatNumber, formatCurrency, fileSize])

  return <span className={className}>{formattedValue}</span>
}

// ================================================================================================
// UTILITIES
// ================================================================================================

/**
 * Get flag emoji for locale (simplified implementation)
 */
function getLocaleFlag(locale: string): string {
  const flagMap: Record<string, string> = {
    'en-US': '🇺🇸',
    'en-GB': '🇬🇧',
    'es-ES': '🇪🇸',
    'es-MX': '🇲🇽',
    'fr-FR': '🇫🇷',
    'de-DE': '🇩🇪',
    'it-IT': '🇮🇹',
    'pt-BR': '🇧🇷',
    'ja-JP': '🇯🇵',
    'ko-KR': '🇰🇷',
    'zh-CN': '🇨🇳',
    'zh-TW': '🇹🇼',
    'ar-SA': '🇸🇦',
    'he-IL': '🇮🇱',
    'ru-RU': '🇷🇺',
    'hi-IN': '🇮🇳',
  }

  return flagMap[locale] || '🌍'
}

export default {
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
  FormattedNumber,
}
