'use client'

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { motion, PanInfo } from 'framer-motion'
import { useModeContext } from '@/contexts/mode-context'
import { HybridLayout, ViewMode } from '@/types/mode-switching'
import { createLogger } from '@/lib/logs/console/logger'
import { cn } from '@/lib/utils'

const logger = createLogger('HybridMode')

interface HybridModeProps {
  visualComponent: React.ReactNode
  chatComponent: React.ReactNode
  className?: string
}

interface ResizablePanel {
  id: string
  component: React.ReactNode
  minSize: number
  maxSize: number
  defaultSize: number
}

/**
 * Resizable splitter component
 */
function ResizableSplitter({
  direction,
  onResize,
  className
}: {
  direction: 'horizontal' | 'vertical'
  onResize: (delta: number) => void
  className?: string
}) {
  const [isDragging, setIsDragging] = useState(false)
  const startPositionRef = useRef<number>(0)

  const handleDragStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true)
    const clientPos = 'touches' in event ? event.touches[0] : event
    startPositionRef.current = direction === 'horizontal' ? clientPos.clientX : clientPos.clientY

    // Prevent text selection during drag
    document.body.style.userSelect = 'none'
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
  }, [direction])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  }, [])

  const handleDrag = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDragging) return

    const clientPos = 'touches' in event ? event.touches[0] : event
    const currentPos = direction === 'horizontal' ? clientPos.clientX : clientPos.clientY
    const delta = currentPos - startPositionRef.current

    onResize(delta)
    startPositionRef.current = currentPos
  }, [isDragging, direction, onResize])

  // Global event listeners for smooth dragging
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => handleDrag(e)
      const handleMouseUp = () => handleDragEnd()
      const handleTouchMove = (e: TouchEvent) => handleDrag(e)
      const handleTouchEnd = () => handleDragEnd()

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleTouchEnd)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, handleDrag, handleDragEnd])

  const isHorizontal = direction === 'horizontal'

  return (
    <motion.div
      className={cn(
        'group relative flex items-center justify-center bg-border transition-colors',
        isHorizontal ? 'h-full w-1 cursor-col-resize' : 'h-1 w-full cursor-row-resize',
        isDragging ? 'bg-primary' : 'hover:bg-primary/60',
        className
      )}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      whileHover={{ scale: isHorizontal ? 1.5 : 1 }}
      transition={{ duration: 0.1 }}
    >
      {/* Drag handle indicator */}
      <div
        className={cn(
          'absolute rounded-full bg-background ring-1 ring-border transition-all group-hover:ring-primary',
          isHorizontal ? 'h-6 w-2' : 'h-2 w-6',
          isDragging && 'ring-primary shadow-sm'
        )}
      />

      {/* Extended hit area for better UX */}
      <div
        className={cn(
          'absolute',
          isHorizontal ? '-left-2 -right-2 top-0 bottom-0' : '-top-2 -bottom-2 left-0 right-0'
        )}
      />
    </motion.div>
  )
}

/**
 * Panel collapse button
 */
function CollapseButton({
  collapsed,
  direction,
  onToggle,
  className
}: {
  collapsed: boolean
  direction: 'left' | 'right' | 'top' | 'bottom'
  onToggle: () => void
  className?: string
}) {
  const getIcon = () => {
    const baseClasses = 'h-4 w-4 transition-transform'

    switch (direction) {
      case 'left':
        return (
          <svg className={cn(baseClasses, collapsed && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        )
      case 'right':
        return (
          <svg className={cn(baseClasses, collapsed && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )
      case 'top':
        return (
          <svg className={cn(baseClasses, collapsed && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )
      case 'bottom':
        return (
          <svg className={cn(baseClasses, collapsed && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )
    }
  }

  return (
    <motion.button
      className={cn(
        'absolute z-10 rounded-md bg-background p-1 shadow-sm ring-1 ring-border transition-all hover:ring-primary',
        direction === 'left' && 'right-2 top-2',
        direction === 'right' && 'left-2 top-2',
        direction === 'top' && 'bottom-2 right-2',
        direction === 'bottom' && 'right-2 top-2',
        className
      )}
      onClick={onToggle}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={collapsed ? `Expand ${direction} panel` : `Collapse ${direction} panel`}
    >
      {getIcon()}
    </motion.button>
  )
}

/**
 * Layout configuration component
 */
function LayoutSelector({
  currentLayout,
  onLayoutChange
}: {
  currentLayout: HybridLayout
  onLayoutChange: (layout: HybridLayout) => void
}) {
  const layouts: Array<{ key: HybridLayout['type'], label: string, icon: React.ReactNode }> = [
    {
      key: 'split-horizontal',
      label: 'Horizontal Split',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <rect x="3" y="4" width="18" height="7" rx="1" />
          <rect x="3" y="13" width="18" height="7" rx="1" />
        </svg>
      )
    },
    {
      key: 'split-vertical',
      label: 'Vertical Split',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <rect x="3" y="4" width="7" height="16" rx="1" />
          <rect x="14" y="4" width="7" height="16" rx="1" />
        </svg>
      )
    },
    {
      key: 'sidebar-left',
      label: 'Left Sidebar',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <rect x="3" y="4" width="6" height="16" rx="1" />
          <rect x="11" y="4" width="10" height="16" rx="1" />
        </svg>
      )
    },
    {
      key: 'sidebar-right',
      label: 'Right Sidebar',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <rect x="3" y="4" width="10" height="16" rx="1" />
          <rect x="15" y="4" width="6" height="16" rx="1" />
        </svg>
      )
    }
  ]

  return (
    <div className="absolute right-4 top-4 z-20 flex rounded-lg bg-background p-1 shadow-sm ring-1 ring-border">
      {layouts.map((layout) => (
        <motion.button
          key={layout.key}
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors',
            currentLayout.type === layout.key
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          )}
          onClick={() => onLayoutChange({ ...currentLayout, type: layout.key })}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          title={layout.label}
        >
          {layout.icon}
          <span className="sr-only">{layout.label}</span>
        </motion.button>
      ))}
    </div>
  )
}

/**
 * Main hybrid mode component
 */
export function HybridMode({ visualComponent, chatComponent, className }: HybridModeProps) {
  const { state, preserveContext } = useModeContext()
  const containerRef = useRef<HTMLDivElement>(null)

  // State for panel sizes and collapse status
  const [leftPanelSize, setLeftPanelSize] = useState(50) // Percentage
  const [topPanelSize, setTopPanelSize] = useState(50) // Percentage
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [topCollapsed, setTopCollapsed] = useState(false)
  const [bottomCollapsed, setBottomCollapsed] = useState(false)

  // Get current layout from preferences
  const currentLayout = state.preferences.hybridDefaults

  // Update layout configuration
  const updateLayout = useCallback((newLayout: HybridLayout) => {
    preserveContext({
      uiContext: {
        ...state.context.uiContext,
        // Store layout preferences in context
      }
    })

    // Reset panel sizes based on new layout
    if (newLayout.type.includes('split-horizontal')) {
      setTopPanelSize(newLayout.ratio * 100)
    } else {
      setLeftPanelSize(newLayout.ratio * 100)
    }

    logger.info('Hybrid layout updated', { layout: newLayout })
  }, [preserveContext, state.context.uiContext])

  // Panel resize handlers
  const handleHorizontalResize = useCallback((delta: number) => {
    if (!containerRef.current) return

    const containerWidth = containerRef.current.clientWidth
    const deltaPercent = (delta / containerWidth) * 100

    setLeftPanelSize(prev => {
      const newSize = Math.max(10, Math.min(90, prev + deltaPercent))
      return newSize
    })
  }, [])

  const handleVerticalResize = useCallback((delta: number) => {
    if (!containerRef.current) return

    const containerHeight = containerRef.current.clientHeight
    const deltaPercent = (delta / containerHeight) * 100

    setTopPanelSize(prev => {
      const newSize = Math.max(10, Math.min(90, prev + deltaPercent))
      return newSize
    })
  }, [])

  // Panel collapse handlers
  const toggleLeftPanel = useCallback(() => {
    setLeftCollapsed(prev => !prev)
  }, [])

  const toggleRightPanel = useCallback(() => {
    setRightCollapsed(prev => !prev)
  }, [])

  const toggleTopPanel = useCallback(() => {
    setTopCollapsed(prev => !prev)
  }, [])

  const toggleBottomPanel = useCallback(() => {
    setBottomCollapsed(prev => !prev)
  }, [])

  // Determine which components go where based on layout
  const { primaryComponent, secondaryComponent } = useMemo(() => {
    switch (currentLayout.type) {
      case 'sidebar-left':
        return { primaryComponent: chatComponent, secondaryComponent: visualComponent }
      case 'sidebar-right':
        return { primaryComponent: visualComponent, secondaryComponent: chatComponent }
      default:
        return { primaryComponent: visualComponent, secondaryComponent: chatComponent }
    }
  }, [currentLayout.type, visualComponent, chatComponent])

  // Keyboard shortcuts for layout switching
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '1':
            event.preventDefault()
            updateLayout({ ...currentLayout, type: 'split-horizontal' })
            break
          case '2':
            event.preventDefault()
            updateLayout({ ...currentLayout, type: 'split-vertical' })
            break
          case '3':
            event.preventDefault()
            updateLayout({ ...currentLayout, type: 'sidebar-left' })
            break
          case '4':
            event.preventDefault()
            updateLayout({ ...currentLayout, type: 'sidebar-right' })
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentLayout, updateLayout])

  // Render based on layout type
  const renderLayout = () => {
    switch (currentLayout.type) {
      case 'split-horizontal':
        return (
          <>
            <motion.div
              className="relative overflow-hidden"
              style={{ height: topCollapsed ? '0%' : `${topPanelSize}%` }}
              animate={{ height: topCollapsed ? '0%' : `${topPanelSize}%` }}
              transition={{ duration: 0.2 }}
            >
              {primaryComponent}
              {currentLayout.collapsible && (
                <CollapseButton
                  collapsed={topCollapsed}
                  direction="top"
                  onToggle={toggleTopPanel}
                />
              )}
            </motion.div>

            <ResizableSplitter
              direction="vertical"
              onResize={handleVerticalResize}
            />

            <motion.div
              className="relative overflow-hidden"
              style={{ height: bottomCollapsed ? '0%' : `${100 - topPanelSize}%` }}
              animate={{ height: bottomCollapsed ? '0%' : `${100 - topPanelSize}%` }}
              transition={{ duration: 0.2 }}
            >
              {secondaryComponent}
              {currentLayout.collapsible && (
                <CollapseButton
                  collapsed={bottomCollapsed}
                  direction="bottom"
                  onToggle={toggleBottomPanel}
                />
              )}
            </motion.div>
          </>
        )

      case 'split-vertical':
      case 'sidebar-left':
      case 'sidebar-right':
        return (
          <>
            <motion.div
              className="relative overflow-hidden"
              style={{ width: leftCollapsed ? '0%' : `${leftPanelSize}%` }}
              animate={{ width: leftCollapsed ? '0%' : `${leftPanelSize}%` }}
              transition={{ duration: 0.2 }}
            >
              {primaryComponent}
              {currentLayout.collapsible && (
                <CollapseButton
                  collapsed={leftCollapsed}
                  direction="left"
                  onToggle={toggleLeftPanel}
                />
              )}
            </motion.div>

            <ResizableSplitter
              direction="horizontal"
              onResize={handleHorizontalResize}
            />

            <motion.div
              className="relative overflow-hidden"
              style={{ width: rightCollapsed ? '0%' : `${100 - leftPanelSize}%` }}
              animate={{ width: rightCollapsed ? '0%' : `${100 - leftPanelSize}%` }}
              transition={{ duration: 0.2 }}
            >
              {secondaryComponent}
              {currentLayout.collapsible && (
                <CollapseButton
                  collapsed={rightCollapsed}
                  direction="right"
                  onToggle={toggleRightPanel}
                />
              )}
            </motion.div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative h-full w-full',
        currentLayout.type.includes('horizontal') ? 'flex flex-col' : 'flex flex-row',
        className
      )}
    >
      {/* Layout selector */}
      <LayoutSelector
        currentLayout={currentLayout}
        onLayoutChange={updateLayout}
      />

      {/* Main content area */}
      {renderLayout()}

      {/* Sync indicator */}
      <motion.div
        className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span>Synced</span>
      </motion.div>
    </div>
  )
}

/**
 * Hook for hybrid mode utilities
 */
export function useHybridMode() {
  const { state, switchMode, preserveContext } = useModeContext()

  const isHybridMode = state.currentMode === 'hybrid'

  const switchToHybrid = useCallback((layout?: HybridLayout) => {
    switchMode('hybrid', {
      hybridLayout: layout ?? state.preferences.hybridDefaults
    })
  }, [switchMode, state.preferences.hybridDefaults])

  const updateHybridLayout = useCallback((layout: HybridLayout) => {
    preserveContext({
      uiContext: {
        ...state.context.uiContext,
        // Store hybrid layout preferences
      }
    })
  }, [preserveContext, state.context.uiContext])

  return {
    isHybridMode,
    switchToHybrid,
    updateHybridLayout,
    currentLayout: state.preferences.hybridDefaults
  }
}