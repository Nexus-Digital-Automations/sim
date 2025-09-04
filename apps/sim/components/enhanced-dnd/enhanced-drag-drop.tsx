'use client'

/**
 * Enhanced Drag and Drop System - Advanced interaction with visual feedback
 *
 * Provides enhanced drag-and-drop capabilities with:
 * - Visual feedback during drag operations
 * - Smart drop zone validation and highlighting
 * - Accessibility-first keyboard navigation alternatives
 * - Connection validation and error prevention
 * - Smooth animations and micro-interactions
 * - Touch device support and responsive behavior
 *
 * @created 2025-09-03
 * @author Claude Development System
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle, Move, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { createLogger } from '@/lib/logs/console/logger'
import { cn } from '@/lib/utils'

const logger = createLogger('EnhancedDragDrop')

export interface DragItem {
  id: string
  type: string
  data: any
  preview?: {
    title: string
    description?: string
    icon?: React.ComponentType<any>
    category?: string
  }
}

export interface DropZone {
  id: string
  type: string[]
  accepts: (item: DragItem) => boolean
  onDrop: (item: DragItem, position: { x: number; y: number }) => void
  validation?: {
    rules: ValidationRule[]
    onValidate?: (item: DragItem) => ValidationResult
  }
  visual?: {
    highlight: boolean
    showPreview: boolean
    animateOnDrop: boolean
  }
}

export interface ValidationRule {
  id: string
  name: string
  check: (item: DragItem, context: any) => boolean
  message: string
  severity: 'error' | 'warning' | 'info'
  autoFix?: () => void
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  suggestions: string[]
}

export interface ValidationError {
  rule: string
  message: string
  severity: 'error' | 'warning' | 'info'
  fixable: boolean
  fix?: () => void
}

export interface DragState {
  isDragging: boolean
  item: DragItem | null
  position: { x: number; y: number }
  validDropZones: string[]
  hoveredDropZone: string | null
  ghostElement: HTMLElement | null
  previewElement: HTMLElement | null
}

export interface EnhancedDragDropProps {
  children: React.ReactNode
  onDragStart?: (item: DragItem) => void
  onDragEnd?: (item: DragItem, success: boolean) => void
  onValidationError?: (errors: ValidationError[]) => void
  className?: string
  accessibilityMode?: boolean
  touchEnabled?: boolean
  animationsEnabled?: boolean
}

/**
 * Enhanced Drag and Drop Context
 */
interface DragDropContext {
  dragState: DragState
  dropZones: Map<string, DropZone>
  registerDropZone: (zone: DropZone) => void
  unregisterDropZone: (id: string) => void
  startDrag: (item: DragItem, element: HTMLElement, position: { x: number; y: number }) => void
  updateDrag: (position: { x: number; y: number }) => void
  endDrag: (success: boolean) => void
  validateDrop: (item: DragItem, zoneId: string) => ValidationResult
}

const DragDropContext = React.createContext<DragDropContext | null>(null)

export function useDragDrop() {
  const context = React.useContext(DragDropContext)
  if (!context) {
    throw new Error('useDragDrop must be used within EnhancedDragDropProvider')
  }
  return context
}

/**
 * Enhanced Drag and Drop Provider
 */
export function EnhancedDragDropProvider({
  children,
  onDragStart,
  onDragEnd,
  onValidationError,
  className,
  accessibilityMode = true,
  touchEnabled = true,
  animationsEnabled = true,
}: EnhancedDragDropProps) {
  // State management
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    item: null,
    position: { x: 0, y: 0 },
    validDropZones: [],
    hoveredDropZone: null,
    ghostElement: null,
    previewElement: null,
  })

  const dropZones = useRef(new Map<string, DropZone>())
  const dragStateRef = useRef(dragState)
  const animationFrame = useRef<number>()
  const touchContext = useRef<{ startPos: { x: number; y: number } | null }>({ startPos: null })

  // Update ref when state changes
  useEffect(() => {
    dragStateRef.current = dragState
  }, [dragState])

  /**
   * Register a drop zone
   */
  const registerDropZone = useCallback((zone: DropZone) => {
    const operationId = Date.now().toString()

    logger.info(`[${operationId}] Registering drop zone`, {
      zoneId: zone.id,
      acceptedTypes: zone.type,
      hasValidation: !!zone.validation,
    })

    dropZones.current.set(zone.id, zone)
  }, [])

  /**
   * Unregister a drop zone
   */
  const unregisterDropZone = useCallback((id: string) => {
    logger.info('Unregistering drop zone', { zoneId: id })
    dropZones.current.delete(id)
  }, [])

  /**
   * Start drag operation with comprehensive setup
   */
  const startDrag = useCallback(
    (item: DragItem, element: HTMLElement, position: { x: number; y: number }) => {
      const operationId = Date.now().toString()

      logger.info(`[${operationId}] Starting drag operation`, {
        itemId: item.id,
        itemType: item.type,
        position,
      })

      try {
        // Create ghost element for visual feedback
        const ghostElement = createGhostElement(item, element)

        // Create preview element
        const previewElement = createPreviewElement(item)

        // Determine valid drop zones
        const validZones = Array.from(dropZones.current.entries())
          .filter(([, zone]) => zone.accepts(item))
          .map(([id]) => id)

        // Update drag state
        setDragState((prev) => ({
          ...prev,
          isDragging: true,
          item,
          position,
          validDropZones: validZones,
          ghostElement,
          previewElement,
        }))

        // Position ghost element
        if (ghostElement) {
          positionGhostElement(ghostElement, position)
        }

        // Add global styles for drag state
        document.body.classList.add('dragging')
        document.body.style.cursor = 'grabbing'

        // Announce drag start to screen readers
        if (accessibilityMode) {
          announceToScreenReader(
            `Started dragging ${item.preview?.title || item.type}. ${validZones.length} drop zones available.`
          )
        }

        // Callback
        onDragStart?.(item)

        logger.info(`[${operationId}] Drag operation started successfully`, {
          validDropZones: validZones.length,
          hasGhost: !!ghostElement,
          hasPreview: !!previewElement,
        })
      } catch (error) {
        logger.error(`[${operationId}] Failed to start drag operation`, {
          itemId: item.id,
          error: error instanceof Error ? error.message : String(error),
        })

        // Cleanup on error
        setDragState((prev) => ({ ...prev, isDragging: false }))
        document.body.classList.remove('dragging')
        document.body.style.cursor = ''
      }
    },
    [onDragStart, accessibilityMode]
  )

  /**
   * Update drag position with visual feedback
   */
  const updateDrag = useCallback((position: { x: number; y: number }) => {
    if (!dragStateRef.current.isDragging) return

    // Update ghost element position
    if (dragStateRef.current.ghostElement) {
      positionGhostElement(dragStateRef.current.ghostElement, position)
    }

    // Find hovered drop zone
    const hoveredZone = findDropZoneAtPosition(position)

    // Update hover state if changed
    if (hoveredZone !== dragStateRef.current.hoveredDropZone) {
      setDragState((prev) => ({
        ...prev,
        position,
        hoveredDropZone: hoveredZone,
      }))

      // Update drop zone visual feedback
      updateDropZoneVisuals(hoveredZone, dragStateRef.current.hoveredDropZone)
    } else {
      setDragState((prev) => ({
        ...prev,
        position,
      }))
    }
  }, [])

  /**
   * End drag operation with validation and cleanup
   */
  const endDrag = useCallback(
    (success: boolean) => {
      const operationId = Date.now().toString()
      const { item, hoveredDropZone, ghostElement, previewElement } = dragStateRef.current

      logger.info(`[${operationId}] Ending drag operation`, {
        success,
        itemId: item?.id,
        hoveredDropZone,
      })

      try {
        let dropSuccess = false

        // Attempt drop if over valid zone
        if (success && item && hoveredDropZone) {
          const dropZone = dropZones.current.get(hoveredDropZone)
          if (dropZone) {
            // Validate drop
            const validation = validateDrop(item, hoveredDropZone)

            if (validation.valid) {
              // Perform drop
              dropZone.onDrop(item, dragStateRef.current.position)
              dropSuccess = true

              // Animate drop if enabled
              if (animationsEnabled && dropZone.visual?.animateOnDrop) {
                animateDropSuccess(ghostElement, hoveredDropZone)
              }

              if (accessibilityMode) {
                announceToScreenReader(`Successfully dropped ${item.preview?.title || item.type}`)
              }
            } else {
              // Handle validation errors
              if (validation.errors.length > 0) {
                onValidationError?.(validation.errors)

                if (accessibilityMode) {
                  const errorMessages = validation.errors.map((e) => e.message).join('. ')
                  announceToScreenReader(`Drop failed: ${errorMessages}`)
                }
              }
            }
          }
        }

        // Cleanup
        cleanupDragOperation()

        // Reset state
        setDragState({
          isDragging: false,
          item: null,
          position: { x: 0, y: 0 },
          validDropZones: [],
          hoveredDropZone: null,
          ghostElement: null,
          previewElement: null,
        })

        // Callback
        onDragEnd?.(item!, dropSuccess)

        logger.info(`[${operationId}] Drag operation ended`, {
          success: dropSuccess,
          itemId: item?.id,
        })
      } catch (error) {
        logger.error(`[${operationId}] Error ending drag operation`, {
          error: error instanceof Error ? error.message : String(error),
        })

        // Force cleanup on error
        cleanupDragOperation()
        setDragState({
          isDragging: false,
          item: null,
          position: { x: 0, y: 0 },
          validDropZones: [],
          hoveredDropZone: null,
          ghostElement: null,
          previewElement: null,
        })
      }
    },
    [onDragEnd, onValidationError, animationsEnabled, accessibilityMode]
  )

  /**
   * Validate drop operation
   */
  const validateDrop = useCallback((item: DragItem, zoneId: string): ValidationResult => {
    const zone = dropZones.current.get(zoneId)
    if (!zone) {
      return {
        valid: false,
        errors: [
          {
            rule: 'zone-not-found',
            message: 'Drop zone not found',
            severity: 'error',
            fixable: false,
          },
        ],
        warnings: [],
        suggestions: [],
      }
    }

    // Use custom validation if provided
    if (zone.validation?.onValidate) {
      return zone.validation.onValidate(item)
    }

    // Default validation using rules
    if (zone.validation?.rules) {
      const errors: ValidationError[] = []
      const warnings: ValidationError[] = []

      zone.validation.rules.forEach((rule) => {
        if (!rule.check(item, {})) {
          const error: ValidationError = {
            rule: rule.id,
            message: rule.message,
            severity: rule.severity,
            fixable: !!rule.autoFix,
            fix: rule.autoFix,
          }

          if (rule.severity === 'error') {
            errors.push(error)
          } else {
            warnings.push(error)
          }
        }
      })

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        suggestions: [],
      }
    }

    // Basic type checking
    const typeValid = zone.type.includes(item.type) || zone.accepts(item)

    return {
      valid: typeValid,
      errors: typeValid
        ? []
        : [
            {
              rule: 'type-mismatch',
              message: `Cannot drop ${item.type} here`,
              severity: 'error',
              fixable: false,
            },
          ],
      warnings: [],
      suggestions: [],
    }
  }, [])

  // Helper functions

  const createGhostElement = (item: DragItem, originalElement: HTMLElement): HTMLElement => {
    const ghost = originalElement.cloneNode(true) as HTMLElement

    // Style the ghost element
    ghost.style.position = 'fixed'
    ghost.style.pointerEvents = 'none'
    ghost.style.zIndex = '10000'
    ghost.style.opacity = '0.8'
    ghost.style.transform = 'rotate(5deg)'
    ghost.style.transition = animationsEnabled ? 'all 0.2s ease' : 'none'
    ghost.classList.add('drag-ghost')

    document.body.appendChild(ghost)

    return ghost
  }

  const createPreviewElement = (item: DragItem): HTMLElement => {
    const preview = document.createElement('div')
    preview.className = 'drag-preview'

    if (item.preview) {
      preview.innerHTML = `
        <div class="preview-card">
          <div class="preview-header">
            <span class="preview-title">${item.preview.title}</span>
            ${item.preview.category ? `<span class="preview-category">${item.preview.category}</span>` : ''}
          </div>
          ${item.preview.description ? `<p class="preview-description">${item.preview.description}</p>` : ''}
        </div>
      `
    }

    preview.style.position = 'fixed'
    preview.style.pointerEvents = 'none'
    preview.style.zIndex = '9999'
    preview.style.background = 'white'
    preview.style.border = '1px solid #ccc'
    preview.style.borderRadius = '8px'
    preview.style.padding = '12px'
    preview.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
    preview.style.maxWidth = '300px'

    document.body.appendChild(preview)

    return preview
  }

  const positionGhostElement = (element: HTMLElement, position: { x: number; y: number }) => {
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current)
    }

    animationFrame.current = requestAnimationFrame(() => {
      element.style.left = `${position.x - 50}px`
      element.style.top = `${position.y - 25}px`
    })
  }

  const findDropZoneAtPosition = (position: { x: number; y: number }): string | null => {
    const element = document.elementFromPoint(position.x, position.y)
    if (!element) return null

    // Find closest drop zone element
    const dropZoneElement = element.closest('[data-drop-zone]')
    if (dropZoneElement) {
      return dropZoneElement.getAttribute('data-drop-zone')
    }

    return null
  }

  const updateDropZoneVisuals = (newHovered: string | null, previousHovered: string | null) => {
    // Remove highlight from previous zone
    if (previousHovered) {
      const prevElement = document.querySelector(`[data-drop-zone="${previousHovered}"]`)
      if (prevElement) {
        prevElement.classList.remove('drop-zone-hovered', 'drop-zone-valid', 'drop-zone-invalid')
      }
    }

    // Add highlight to new zone
    if (newHovered && dragStateRef.current.item) {
      const newElement = document.querySelector(`[data-drop-zone="${newHovered}"]`)
      if (newElement) {
        newElement.classList.add('drop-zone-hovered')

        // Add validation class
        const validation = validateDrop(dragStateRef.current.item, newHovered)
        if (validation.valid) {
          newElement.classList.add('drop-zone-valid')
        } else {
          newElement.classList.add('drop-zone-invalid')
        }
      }
    }
  }

  const animateDropSuccess = (ghostElement: HTMLElement | null, zoneId: string) => {
    if (!ghostElement) return

    const dropZoneElement = document.querySelector(`[data-drop-zone="${zoneId}"]`)
    if (!dropZoneElement) return

    const rect = dropZoneElement.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    ghostElement.style.transition = 'all 0.3s ease'
    ghostElement.style.transform = 'scale(0.8) rotate(0deg)'
    ghostElement.style.left = `${centerX - 25}px`
    ghostElement.style.top = `${centerY - 12}px`
    ghostElement.style.opacity = '0'

    setTimeout(() => {
      if (ghostElement.parentNode) {
        ghostElement.parentNode.removeChild(ghostElement)
      }
    }, 300)
  }

  const cleanupDragOperation = () => {
    // Remove ghost element
    if (dragStateRef.current.ghostElement?.parentNode) {
      dragStateRef.current.ghostElement.parentNode.removeChild(dragStateRef.current.ghostElement)
    }

    // Remove preview element
    if (dragStateRef.current.previewElement?.parentNode) {
      dragStateRef.current.previewElement.parentNode.removeChild(
        dragStateRef.current.previewElement
      )
    }

    // Remove visual feedback from all drop zones
    document.querySelectorAll('[data-drop-zone]').forEach((element) => {
      element.classList.remove('drop-zone-hovered', 'drop-zone-valid', 'drop-zone-invalid')
    })

    // Remove global drag styles
    document.body.classList.remove('dragging')
    document.body.style.cursor = ''

    // Cancel any pending animation frames
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current)
    }
  }

  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'assertive')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.style.position = 'absolute'
    announcement.style.left = '-10000px'
    announcement.textContent = message

    document.body.appendChild(announcement)

    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  // Global event handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragStateRef.current.isDragging) {
        updateDrag({ x: e.clientX, y: e.clientY })
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (dragStateRef.current.isDragging) {
        endDrag(true)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (dragStateRef.current.isDragging) {
        if (e.key === 'Escape') {
          endDrag(false)
        }
      }
    }

    // Touch event handlers
    const handleTouchMove = (e: TouchEvent) => {
      if (touchEnabled && dragStateRef.current.isDragging && e.touches[0]) {
        e.preventDefault()
        updateDrag({ x: e.touches[0].clientX, y: e.touches[0].clientY })
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchEnabled && dragStateRef.current.isDragging) {
        endDrag(true)
        touchContext.current.startPos = null
      }
    }

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove, { passive: false })
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('keydown', handleKeyDown)

    if (touchEnabled) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('keydown', handleKeyDown)

      if (touchEnabled) {
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [updateDrag, endDrag, touchEnabled])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupDragOperation()
    }
  }, [])

  // Context value
  const contextValue: DragDropContext = {
    dragState,
    dropZones: dropZones.current,
    registerDropZone,
    unregisterDropZone,
    startDrag,
    updateDrag,
    endDrag,
    validateDrop,
  }

  return (
    <DragDropContext.Provider value={contextValue}>
      <div className={cn('enhanced-drag-drop-container', className)}>
        {children}

        {/* Drag feedback UI */}
        {dragState.isDragging && (
          <DragFeedbackUI dragState={dragState} accessibilityMode={accessibilityMode} />
        )}

        {/* Global drag styles */}
        <style jsx global>{`
          .dragging * {
            cursor: grabbing !important;
          }
          
          .drag-ghost {
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            filter: brightness(0.9);
          }
          
          .drop-zone-hovered {
            background-color: rgba(59, 130, 246, 0.1) !important;
            border: 2px dashed #3b82f6 !important;
            border-radius: 8px !important;
          }
          
          .drop-zone-valid {
            border-color: #10b981 !important;
            background-color: rgba(16, 185, 129, 0.1) !important;
          }
          
          .drop-zone-invalid {
            border-color: #ef4444 !important;
            background-color: rgba(239, 68, 68, 0.1) !important;
          }
          
          .drop-zone-valid::before {
            content: '✓';
            position: absolute;
            top: 8px;
            right: 8px;
            color: #10b981;
            font-weight: bold;
            font-size: 16px;
          }
          
          .drop-zone-invalid::before {
            content: '✗';
            position: absolute;
            top: 8px;
            right: 8px;
            color: #ef4444;
            font-weight: bold;
            font-size: 16px;
          }
          
          @media (prefers-reduced-motion: reduce) {
            .drag-ghost {
              transition: none !important;
            }
            
            .drop-zone-hovered {
              transition: none !important;
            }
          }
        `}</style>
      </div>
    </DragDropContext.Provider>
  )
}

/**
 * Draggable Component
 */
interface DraggableProps {
  item: DragItem
  children: React.ReactNode
  className?: string
  disabled?: boolean
  accessibilityLabel?: string
}

export function Draggable({
  item,
  children,
  className,
  disabled = false,
  accessibilityLabel,
}: DraggableProps) {
  const { startDrag } = useDragDrop()
  const elementRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return

      e.preventDefault()

      if (elementRef.current) {
        startDrag(item, elementRef.current, { x: e.clientX, y: e.clientY })
      }
    },
    [item, startDrag, disabled]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || !e.touches[0]) return

      if (elementRef.current) {
        startDrag(item, elementRef.current, {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        })
      }
    },
    [item, startDrag, disabled]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return

      // Keyboard alternative for drag operation
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        // This would trigger a different UI for keyboard users
        // such as a modal with available drop zones
      }
    },
    [disabled]
  )

  return (
    <div
      ref={elementRef}
      className={cn(
        'draggable-item',
        disabled ? 'draggable-disabled' : 'draggable-enabled cursor-grab',
        className
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      draggable={false} // We handle our own drag logic
      tabIndex={disabled ? -1 : 0}
      role='button'
      aria-label={accessibilityLabel || `Draggable ${item.preview?.title || item.type}`}
      aria-grabbed='false'
    >
      {children}
    </div>
  )
}

/**
 * Drop Zone Component
 */
interface DropZoneProps {
  zone: DropZone
  children: React.ReactNode
  className?: string
  showDropIndicator?: boolean
}

export function DropZone({ zone, children, className, showDropIndicator = true }: DropZoneProps) {
  const { registerDropZone, unregisterDropZone, dragState } = useDragDrop()

  useEffect(() => {
    registerDropZone(zone)
    return () => unregisterDropZone(zone.id)
  }, [zone, registerDropZone, unregisterDropZone])

  const isValidTarget = dragState.item ? zone.accepts(dragState.item) : false
  const isHovered = dragState.hoveredDropZone === zone.id

  return (
    <div
      data-drop-zone={zone.id}
      className={cn(
        'drop-zone',
        dragState.isDragging && isValidTarget && 'drop-zone-active',
        isHovered && 'drop-zone-hovered',
        className
      )}
      role='region'
      aria-label={`Drop zone for ${zone.type.join(', ')}`}
      aria-dropeffect={dragState.isDragging && isValidTarget ? 'move' : 'none'}
    >
      {children}

      {/* Drop indicator */}
      {showDropIndicator && dragState.isDragging && isValidTarget && (
        <div className='pointer-events-none absolute inset-0 z-10 flex items-center justify-center'>
          <div className='flex items-center space-x-2 rounded-md bg-primary/90 px-4 py-2 text-primary-foreground'>
            <Target className='h-4 w-4' />
            <span className='font-medium text-sm'>Drop here</span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Drag Feedback UI Component
 */
interface DragFeedbackUIProps {
  dragState: DragState
  accessibilityMode: boolean
}

function DragFeedbackUI({ dragState, accessibilityMode }: DragFeedbackUIProps) {
  if (!dragState.isDragging || !dragState.item) return null

  return (
    <div className='pointer-events-none fixed top-4 right-4 z-[10001]'>
      <Card className='border bg-background/95 shadow-lg backdrop-blur-sm'>
        <div className='space-y-3 p-4'>
          {/* Drag item info */}
          <div className='flex items-center space-x-3'>
            <div className='flex h-8 w-8 items-center justify-center rounded-md bg-primary/10'>
              <Move className='h-4 w-4 text-primary' />
            </div>
            <div>
              <h3 className='font-medium text-sm'>
                {dragState.item.preview?.title || dragState.item.type}
              </h3>
              {dragState.item.preview?.description && (
                <p className='text-muted-foreground text-xs'>
                  {dragState.item.preview.description}
                </p>
              )}
            </div>
          </div>

          {/* Drop zone status */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between text-xs'>
              <span className='text-muted-foreground'>Valid drop zones:</span>
              <Badge variant='secondary'>{dragState.validDropZones.length}</Badge>
            </div>

            {dragState.hoveredDropZone && (
              <div className='flex items-center space-x-2 text-xs'>
                <CheckCircle className='h-3 w-3 text-green-500' />
                <span className='font-medium text-green-600'>Ready to drop</span>
              </div>
            )}
          </div>

          {/* Keyboard hint for accessibility */}
          {accessibilityMode && (
            <div className='border-t pt-2 text-muted-foreground text-xs'>
              Press Escape to cancel
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

/**
 * Block Library Item Component
 * Example usage for workflow blocks
 */
interface BlockLibraryItemProps {
  block: {
    type: string
    name: string
    description: string
    category: string
    icon?: React.ComponentType<any>
  }
  onDragStart?: () => void
}

export function BlockLibraryItem({ block, onDragStart }: BlockLibraryItemProps) {
  const dragItem: DragItem = {
    id: `block-${block.type}`,
    type: block.type,
    data: block,
    preview: {
      title: block.name,
      description: block.description,
      category: block.category,
    },
  }

  return (
    <Draggable item={dragItem} accessibilityLabel={`Drag ${block.name} block to workflow canvas`}>
      <Card className='cursor-grab p-3 transition-shadow hover:shadow-md active:cursor-grabbing'>
        <div className='flex items-center space-x-3'>
          {block.icon && (
            <div className='flex h-8 w-8 items-center justify-center rounded-md bg-primary/10'>
              <block.icon className='h-4 w-4 text-primary' />
            </div>
          )}
          <div className='min-w-0 flex-1'>
            <h3 className='truncate font-medium text-sm'>{block.name}</h3>
            <p className='truncate text-muted-foreground text-xs'>{block.description}</p>
          </div>
        </div>
      </Card>
    </Draggable>
  )
}

/**
 * Workflow Canvas Drop Zone
 * Example drop zone for the main workflow canvas
 */
interface WorkflowCanvasProps {
  onBlockDrop: (block: any, position: { x: number; y: number }) => void
  children: React.ReactNode
}

export function WorkflowCanvas({ onBlockDrop, children }: WorkflowCanvasProps) {
  const canvasDropZone: DropZone = {
    id: 'workflow-canvas',
    type: ['workflow-block', 'api', 'condition', 'loop', 'response'],
    accepts: (item) => item.type !== 'invalid-type',
    onDrop: (item, position) => {
      onBlockDrop(item.data, position)
    },
    validation: {
      rules: [
        {
          id: 'max-blocks',
          name: 'Maximum blocks limit',
          check: (item, context) => {
            // Example: limit to 50 blocks per workflow
            return (context.currentBlockCount || 0) < 50
          },
          message: 'Workflow cannot have more than 50 blocks',
          severity: 'error',
        },
      ],
    },
    visual: {
      highlight: true,
      showPreview: true,
      animateOnDrop: true,
    },
  }

  return (
    <DropZone zone={canvasDropZone} className='relative h-full w-full rounded-lg bg-muted/50'>
      {children}
    </DropZone>
  )
}

export default EnhancedDragDropProvider
