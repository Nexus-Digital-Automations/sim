/**
 * Toast Hook - Notification System Integration
 *
 * This hook provides a unified interface for displaying toast notifications
 * throughout the application, integrating with the Sonner toast library
 * for consistent user feedback and notification management.
 *
 * FEATURES:
 * - Success, error, warning, and info toast types
 * - Promise-based toast handling for async operations
 * - Custom styling and positioning support
 * - Dismissible notifications with timeout control
 * - Action buttons and interactive toast content
 * - Queue management for multiple notifications
 *
 * INTEGRATION:
 * - Sonner toast library for rendering
 * - Consistent styling with application theme
 * - Accessibility features and screen reader support
 * - Mobile-responsive notification positioning
 *
 * @author Claude Code Template System
 * @version 1.0.0
 */

'use client'

import { toast as sonnerToast } from 'sonner'
import { createLogger } from '@/lib/logs/console/logger'

// Initialize logger for toast operations
const logger = createLogger('ToastHook')

export interface ToastOptions {
  id?: string | number
  duration?: number
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  dismissible?: boolean
  className?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  cancel?: {
    label: string
    onClick?: () => void
  }
  onDismiss?: () => void
  onAutoClose?: () => void
}

export interface PromiseToastOptions<T> extends Omit<ToastOptions, 'action' | 'cancel'> {
  loading?: string
  success?: string | ((data: T) => string)
  error?: string | ((error: any) => string)
  finally?: () => void
}

/**
 * Toast notification interface
 */
export interface Toast {
  success: (message: string, options?: ToastOptions) => string | number
  error: (message: string, options?: ToastOptions) => string | number
  warning: (message: string, options?: ToastOptions) => string | number
  info: (message: string, options?: ToastOptions) => string | number
  loading: (message: string, options?: ToastOptions) => string | number
  promise: <T>(
    promise: Promise<T>,
    options: PromiseToastOptions<T>
  ) => Promise<T>
  dismiss: (id?: string | number) => void
  custom: (jsx: React.ReactNode, options?: ToastOptions) => string | number
}

/**
 * Custom hook for toast notifications
 * Provides a unified interface for displaying notifications across the application
 */
export function useToast(): { toast: Toast } {
  /**
   * Display a success toast notification
   */
  const success = (message: string, options: ToastOptions = {}): string | number => {
    logger.info('Displaying success toast', { message, options })

    return sonnerToast.success(message, {
      id: options.id,
      duration: options.duration ?? 4000,
      position: options.position,
      dismissible: options.dismissible ?? true,
      className: options.className,
      description: options.description,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      cancel: options.cancel ? {
        label: options.cancel.label,
        onClick: options.cancel.onClick,
      } : undefined,
      onDismiss: options.onDismiss,
      onAutoClose: options.onAutoClose,
    })
  }

  /**
   * Display an error toast notification
   */
  const error = (message: string, options: ToastOptions = {}): string | number => {
    logger.error('Displaying error toast', { message, options })

    return sonnerToast.error(message, {
      id: options.id,
      duration: options.duration ?? 6000, // Longer duration for errors
      position: options.position,
      dismissible: options.dismissible ?? true,
      className: options.className,
      description: options.description,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      cancel: options.cancel ? {
        label: options.cancel.label,
        onClick: options.cancel.onClick,
      } : undefined,
      onDismiss: options.onDismiss,
      onAutoClose: options.onAutoClose,
    })
  }

  /**
   * Display a warning toast notification
   */
  const warning = (message: string, options: ToastOptions = {}): string | number => {
    logger.warn('Displaying warning toast', { message, options })

    return sonnerToast.warning(message, {
      id: options.id,
      duration: options.duration ?? 5000,
      position: options.position,
      dismissible: options.dismissible ?? true,
      className: options.className,
      description: options.description,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      cancel: options.cancel ? {
        label: options.cancel.label,
        onClick: options.cancel.onClick,
      } : undefined,
      onDismiss: options.onDismiss,
      onAutoClose: options.onAutoClose,
    })
  }

  /**
   * Display an info toast notification
   */
  const info = (message: string, options: ToastOptions = {}): string | number => {
    logger.info('Displaying info toast', { message, options })

    return sonnerToast.info(message, {
      id: options.id,
      duration: options.duration ?? 4000,
      position: options.position,
      dismissible: options.dismissible ?? true,
      className: options.className,
      description: options.description,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      cancel: options.cancel ? {
        label: options.cancel.label,
        onClick: options.cancel.onClick,
      } : undefined,
      onDismiss: options.onDismiss,
      onAutoClose: options.onAutoClose,
    })
  }

  /**
   * Display a loading toast notification
   */
  const loading = (message: string, options: ToastOptions = {}): string | number => {
    logger.info('Displaying loading toast', { message, options })

    return sonnerToast.loading(message, {
      id: options.id,
      duration: options.duration ?? Infinity, // Loading toasts don't auto-dismiss
      position: options.position,
      dismissible: options.dismissible ?? true,
      className: options.className,
      description: options.description,
      onDismiss: options.onDismiss,
      onAutoClose: options.onAutoClose,
    })
  }

  /**
   * Handle promise-based toast notifications
   */
  const promise = async <T>(
    promiseToHandle: Promise<T>,
    options: PromiseToastOptions<T>
  ): Promise<T> => {
    logger.info('Handling promise toast', { options })

    return sonnerToast.promise(promiseToHandle, {
      loading: options.loading ?? 'Loading...',
      success: (data) => {
        const successMessage = typeof options.success === 'function' 
          ? options.success(data) 
          : options.success ?? 'Success!'
        
        logger.info('Promise toast succeeded', { successMessage, data })
        return successMessage
      },
      error: (err) => {
        const errorMessage = typeof options.error === 'function'
          ? options.error(err)
          : options.error ?? 'Something went wrong'
        
        logger.error('Promise toast failed', { errorMessage, error: err })
        return errorMessage
      },
      id: options.id,
      duration: options.duration,
      position: options.position,
      dismissible: options.dismissible ?? true,
      className: options.className,
      description: options.description,
      onDismiss: options.onDismiss,
      onAutoClose: options.onAutoClose,
      finally: options.finally,
    })
  }

  /**
   * Dismiss a specific toast or all toasts
   */
  const dismiss = (id?: string | number): void => {
    logger.info('Dismissing toast', { id })
    
    if (id) {
      sonnerToast.dismiss(id)
    } else {
      sonnerToast.dismiss()
    }
  }

  /**
   * Display a custom toast with JSX content
   */
  const custom = (jsx: React.ReactNode, options: ToastOptions = {}): string | number => {
    logger.info('Displaying custom toast', { options })

    return sonnerToast.custom(jsx, {
      id: options.id,
      duration: options.duration ?? 4000,
      position: options.position,
      dismissible: options.dismissible ?? true,
      className: options.className,
      onDismiss: options.onDismiss,
      onAutoClose: options.onAutoClose,
    })
  }

  const toast: Toast = {
    success,
    error,
    warning,
    info,
    loading,
    promise,
    dismiss,
    custom,
  }

  return { toast }
}

/**
 * Direct toast functions for convenience (alternative to hook)
 */
export const toast = {
  success: (message: string, options?: ToastOptions) => 
    sonnerToast.success(message, options),
  error: (message: string, options?: ToastOptions) => 
    sonnerToast.error(message, options),
  warning: (message: string, options?: ToastOptions) => 
    sonnerToast.warning(message, options),
  info: (message: string, options?: ToastOptions) => 
    sonnerToast.info(message, options),
  loading: (message: string, options?: ToastOptions) => 
    sonnerToast.loading(message, options),
  promise: <T>(promise: Promise<T>, options: PromiseToastOptions<T>) => 
    sonnerToast.promise(promise, options),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
  custom: (jsx: React.ReactNode, options?: ToastOptions) => 
    sonnerToast.custom(jsx, options),
}

/**
 * Toast context for application-wide configuration
 */
export interface ToastConfig {
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  theme?: 'light' | 'dark' | 'system'
  richColors?: boolean
  closeButton?: boolean
  duration?: number
  visibleToasts?: number
  expand?: boolean
}

/**
 * Default toast configuration
 */
export const defaultToastConfig: ToastConfig = {
  position: 'top-right',
  theme: 'system',
  richColors: true,
  closeButton: true,
  duration: 4000,
  visibleToasts: 5,
  expand: true,
}

/**
 * Toast utility functions
 */
export const ToastUtils = {
  /**
   * Format error message for toast display
   */
  formatError: (error: any): string => {
    if (typeof error === 'string') return error
    if (error?.message) return error.message
    if (error?.error) return error.error
    return 'An unexpected error occurred'
  },

  /**
   * Create a promise toast for async operations
   */
  promiseToast: <T>(
    promise: Promise<T>,
    messages: {
      loading?: string
      success?: string | ((data: T) => string)
      error?: string | ((error: any) => string)
    }
  ): Promise<T> => {
    return toast.promise(promise, {
      loading: messages.loading ?? 'Loading...',
      success: messages.success ?? 'Success!',
      error: messages.error ?? ToastUtils.formatError,
    })
  },

  /**
   * Show operation result toast
   */
  operationResult: (
    success: boolean,
    successMessage: string,
    errorMessage?: string
  ): void => {
    if (success) {
      toast.success(successMessage)
    } else {
      toast.error(errorMessage ?? 'Operation failed')
    }
  },

  /**
   * Show confirmation toast with action
   */
  confirmation: (
    message: string,
    onConfirm: () => void,
    options?: {
      confirmLabel?: string
      cancelLabel?: string
      duration?: number
    }
  ): void => {
    toast.warning(message, {
      duration: options?.duration ?? 10000, // Longer duration for confirmations
      action: {
        label: options?.confirmLabel ?? 'Confirm',
        onClick: onConfirm,
      },
      cancel: {
        label: options?.cancelLabel ?? 'Cancel',
      },
    })
  },
}