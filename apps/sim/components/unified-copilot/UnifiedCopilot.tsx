/**
 * Unified Copilot Component
 *
 * Provides a seamless interface that can switch between external copilot
 * (Claude API) and local copilot (Parlant agents) modes. Maintains consistent
 * UI/UX while providing access to both systems based on user preference
 * and workspace configuration.
 */

'use client'

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { AlertCircle, Bot, Cloud, Loader2, Settings } from 'lucide-react'
import { LocalCopilot, type LocalCopilotRef } from '@/components/local-copilot/LocalCopilot'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { createLogger } from '@/lib/logs/console/logger'
import { cn } from '@/lib/utils'
import { Copilot as ExternalCopilot } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/panel/components/copilot/copilot'
import type { Agent } from '@/services/parlant/types'
import { useLocalCopilotStore } from '@/stores/local-copilot'

const logger = createLogger('UnifiedCopilot')

interface UnifiedCopilotProps {
  panelWidth: number
  workspaceId: string
  userId: string
  className?: string
  defaultMode?: 'local' | 'external'
  allowModeSwitch?: boolean
}

export interface UnifiedCopilotRef {
  switchToLocal: () => void
  switchToExternal: () => void
  getCurrentMode: () => 'local' | 'external'
  createNewChat: () => void
  selectAgent?: (agent: Agent) => void
  setInputValueAndFocus?: (value: string) => void
}

interface ModeOptionProps {
  mode: 'local' | 'external'
  isActive: boolean
  isAvailable: boolean
  onClick: () => void
  title: string
  description: string
  icon: React.ReactNode
  agentCount?: number
  status?: string
}

const ModeOption: React.FC<ModeOptionProps> = ({
  mode,
  isActive,
  isAvailable,
  onClick,
  title,
  description,
  icon,
  agentCount,
  status,
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isActive ? 'default' : 'outline'}
          onClick={onClick}
          disabled={!isAvailable}
          className={cn(
            'h-auto justify-start p-3',
            isActive && 'bg-primary text-primary-foreground'
          )}
        >
          <div className='flex items-start gap-3'>
            <div className='flex h-6 w-6 items-center justify-center'>{icon}</div>
            <div className='flex-1 text-left'>
              <div className='font-medium text-sm'>{title}</div>
              <div className='text-xs opacity-80'>{description}</div>
              <div className='mt-1 flex items-center gap-2'>
                {agentCount !== undefined && (
                  <Badge variant='secondary' className='text-xs'>
                    {agentCount} {agentCount === 1 ? 'agent' : 'agents'}
                  </Badge>
                )}
                {status && (
                  <Badge
                    variant={status === 'Connected' ? 'default' : 'destructive'}
                    className='text-xs'
                  >
                    {status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Button>
      </TooltipTrigger>
      <TooltipContent side='left'>
        <div className='space-y-1'>
          <p className='font-medium'>{title}</p>
          <p className='max-w-48 text-xs'>{description}</p>
          {!isAvailable && <p className='text-destructive text-xs'>Currently unavailable</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export const UnifiedCopilot = forwardRef<UnifiedCopilotRef, UnifiedCopilotProps>(
  (
    {
      panelWidth,
      workspaceId,
      userId,
      className = '',
      defaultMode = 'external',
      allowModeSwitch = true,
    },
    ref
  ) => {
    const localCopilotRef = React.useRef<LocalCopilotRef>(null)
    const externalCopilotRef = React.useRef<any>(null)

    const [currentMode, setCurrentMode] = useState<'local' | 'external'>(defaultMode)
    const [isInitializing, setIsInitializing] = useState(true)
    const [showModeSelector, setShowModeSelector] = useState(false)
    const [initializationError, setInitializationError] = useState<string | null>(null)

    // Local copilot store
    const {
      availableAgents,
      isLoadingAgents,
      selectedAgent,
      isInitialized: localInitialized,
      lastError: localError,
      initialize: initializeLocal,
    } = useLocalCopilotStore()

    // Initialize both systems
    useEffect(() => {
      const initialize = async () => {
        setIsInitializing(true)
        setInitializationError(null)

        try {
          logger.info('Initializing unified copilot', {
            workspaceId,
            userId,
            defaultMode,
          })

          // Initialize local copilot if not already initialized
          if (!localInitialized) {
            await initializeLocal(workspaceId, userId)
          }

          logger.info('Unified copilot initialized successfully')
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown initialization error'
          logger.error('Failed to initialize unified copilot', { error: errorMessage })
          setInitializationError(errorMessage)
        } finally {
          setIsInitializing(false)
        }
      }

      if (workspaceId && userId) {
        initialize()
      }
    }, [workspaceId, userId, localInitialized, initializeLocal])

    // Mode switching handlers
    const switchToLocal = useCallback(() => {
      logger.info('Switching to local copilot mode')
      setCurrentMode('local')
      setShowModeSelector(false)
    }, [])

    const switchToExternal = useCallback(() => {
      logger.info('Switching to external copilot mode')
      setCurrentMode('external')
      setShowModeSelector(false)
    }, [])

    const getCurrentMode = useCallback(() => currentMode, [currentMode])

    const createNewChat = useCallback(() => {
      if (currentMode === 'local') {
        // TODO: Implement new chat for local copilot
        logger.info('Creating new chat in local mode')
      } else if (externalCopilotRef.current) {
        externalCopilotRef.current.createNewChat()
      }
    }, [currentMode])

    const selectAgent = useCallback(
      (agent: Agent) => {
        if (currentMode === 'local' && localCopilotRef.current) {
          localCopilotRef.current.selectAgent(agent)
        }
      },
      [currentMode]
    )

    const setInputValueAndFocus = useCallback(
      (value: string) => {
        if (currentMode === 'external' && externalCopilotRef.current) {
          externalCopilotRef.current.setInputValueAndFocus(value)
        }
        // TODO: Implement for local copilot if needed
      },
      [currentMode]
    )

    // Expose ref methods
    useImperativeHandle(
      ref,
      () => ({
        switchToLocal,
        switchToExternal,
        getCurrentMode,
        createNewChat,
        selectAgent,
        setInputValueAndFocus,
      }),
      [
        switchToLocal,
        switchToExternal,
        getCurrentMode,
        createNewChat,
        selectAgent,
        setInputValueAndFocus,
      ]
    )

    // Mode availability checks
    const isLocalAvailable = availableAgents.length > 0 && !isLoadingAgents
    const isExternalAvailable = true // External is always available

    if (isInitializing) {
      return (
        <div className={cn('flex h-full w-full items-center justify-center', className)}>
          <div className='flex flex-col items-center gap-3'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <p className='text-muted-foreground text-sm'>Initializing copilot systems...</p>
          </div>
        </div>
      )
    }

    if (initializationError) {
      return (
        <div className={cn('p-4', className)}>
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>
              Failed to initialize copilot: {initializationError}
              <Button
                variant='outline'
                size='sm'
                className='mt-2'
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return (
      <TooltipProvider>
        <div className={cn('flex h-full flex-col', className)}>
          {/* Mode Selector */}
          {allowModeSwitch && showModeSelector && (
            <Card className='m-4 mb-0'>
              <CardContent className='p-4'>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <h3 className='font-medium text-sm'>Choose Copilot Mode</h3>
                    <Button variant='ghost' size='sm' onClick={() => setShowModeSelector(false)}>
                      ✕
                    </Button>
                  </div>

                  <div className='grid gap-2'>
                    <ModeOption
                      mode='local'
                      isActive={currentMode === 'local'}
                      isAvailable={isLocalAvailable}
                      onClick={switchToLocal}
                      title='Local Agents'
                      description='Use Parlant agents running locally with full tool access'
                      icon={<Bot className='h-4 w-4' />}
                      agentCount={availableAgents.length}
                      status={isLocalAvailable ? 'Ready' : 'No agents'}
                    />

                    <ModeOption
                      mode='external'
                      isActive={currentMode === 'external'}
                      isAvailable={isExternalAvailable}
                      onClick={switchToExternal}
                      title='External API'
                      description='Use cloud-based AI with high performance and scalability'
                      icon={<Cloud className='h-4 w-4' />}
                      status='Connected'
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mode Toggle Button */}
          {allowModeSwitch && !showModeSelector && (
            <div className='flex items-center justify-between border-b px-4 py-2'>
              <div className='flex items-center gap-2'>
                <div className='flex items-center gap-1'>
                  {currentMode === 'local' ? (
                    <Bot className='h-4 w-4 text-green-600' />
                  ) : (
                    <Cloud className='h-4 w-4 text-blue-600' />
                  )}
                  <span className='font-medium text-sm'>
                    {currentMode === 'local' ? 'Local Agents' : 'External API'}
                  </span>
                </div>
                {currentMode === 'local' && selectedAgent && (
                  <>
                    <span className='text-muted-foreground text-sm'>•</span>
                    <Badge variant='secondary' className='text-xs'>
                      {selectedAgent.Name}
                    </Badge>
                  </>
                )}
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setShowModeSelector(true)}
                    className='h-8 w-8 p-0'
                  >
                    <Settings className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Switch copilot mode</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Error Display */}
          {localError && currentMode === 'local' && (
            <Alert variant='destructive' className='m-4 mb-0'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{localError}</AlertDescription>
            </Alert>
          )}

          {/* Copilot Content */}
          <div className='flex-1 overflow-hidden'>
            {currentMode === 'local' ? (
              <LocalCopilot
                ref={localCopilotRef}
                panelWidth={panelWidth}
                workspaceId={workspaceId}
                userId={userId}
                showModeToggle={false} // We handle mode switching at this level
              />
            ) : (
              <ExternalCopilot ref={externalCopilotRef} panelWidth={panelWidth} />
            )}
          </div>
        </div>
      </TooltipProvider>
    )
  }
)

UnifiedCopilot.displayName = 'UnifiedCopilot'
