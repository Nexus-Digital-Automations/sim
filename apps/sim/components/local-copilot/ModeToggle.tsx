/**
 * Mode Toggle Component
 *
 * Provides a toggle switch to switch between local Parlant copilot mode
 * and external copilot mode. Shows clear visual indicators for the current
 * mode and handles disabled states during streaming operations.
 */

'use client'

import { useState } from 'react'
import { Bot, Cloud, Zap, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('ModeToggle')

interface ModeToggleProps {
  mode: 'local' | 'external'
  onModeChange: (mode: 'local' | 'external') => void
  disabled?: boolean
  className?: string
  showLabels?: boolean
  variant?: 'switch' | 'buttons'
}

interface ModeInfo {
  label: string
  description: string
  icon: React.ReactNode
  color: string
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'
  features: string[]
}

const getModeInfo = (mode: 'local' | 'external'): ModeInfo => {
  switch (mode) {
    case 'local':
      return {
        label: 'Local Agent',
        description: 'Using Parlant agents running locally with full tool access',
        icon: <Bot className="h-3 w-3" />,
        color: 'text-green-600',
        badgeVariant: 'default',
        features: [
          'Full tool integration',
          'Local processing',
          'Workspace context',
          'Agent specialization',
        ],
      }
    case 'external':
      return {
        label: 'External API',
        description: 'Using external API services for chat functionality',
        icon: <Cloud className="h-3 w-3" />,
        color: 'text-blue-600',
        badgeVariant: 'secondary',
        features: [
          'Cloud processing',
          'High performance',
          'Scalable infrastructure',
          'Remote capabilities',
        ],
      }
    default:
      throw new Error(`Unknown mode: ${mode}`)
  }
}

const SwitchVariant: React.FC<ModeToggleProps> = ({
  mode,
  onModeChange,
  disabled = false,
  className = '',
  showLabels = true,
}) => {
  const localInfo = getModeInfo('local')
  const externalInfo = getModeInfo('external')
  const currentInfo = getModeInfo(mode)

  const handleToggle = () => {
    if (disabled) return

    const newMode = mode === 'local' ? 'external' : 'local'
    logger.info('Mode toggle', { from: mode, to: newMode })
    onModeChange(newMode)
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <div className={cn('flex items-center gap-1', currentInfo.color)}>
                {currentInfo.icon}
                {showLabels && (
                  <span className="text-xs font-medium">{currentInfo.label}</span>
                )}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="space-y-2 p-1">
              <p className="font-medium">{currentInfo.label}</p>
              <p className="text-xs text-muted-foreground max-w-48">
                {currentInfo.description}
              </p>
              <div className="space-y-1">
                {currentInfo.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-1 text-xs">
                    <Zap className="h-2 w-2" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        <Switch
          checked={mode === 'local'}
          onCheckedChange={handleToggle}
          disabled={disabled}
          className="scale-75"
        />
      </div>
    </div>
  )
}

const ButtonVariant: React.FC<ModeToggleProps> = ({
  mode,
  onModeChange,
  disabled = false,
  className = '',
}) => {
  const [isChanging, setIsChanging] = useState(false)

  const handleModeChange = async (newMode: 'local' | 'external') => {
    if (disabled || newMode === mode) return

    setIsChanging(true)
    logger.info('Mode change initiated', { from: mode, to: newMode })

    try {
      onModeChange(newMode)
    } finally {
      // Small delay to show loading state
      setTimeout(() => setIsChanging(false), 200)
    }
  }

  const localInfo = getModeInfo('local')
  const externalInfo = getModeInfo('external')

  return (
    <div className={cn('flex items-center gap-1 rounded-md border p-1', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={mode === 'local' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleModeChange('local')}
            disabled={disabled || isChanging}
            className="h-7 px-2 text-xs"
          >
            {isChanging && mode !== 'local' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                {localInfo.icon}
                <span className="ml-1">Local</span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="space-y-2 p-1">
            <p className="font-medium">{localInfo.label}</p>
            <p className="text-xs text-muted-foreground max-w-48">
              {localInfo.description}
            </p>
            <div className="space-y-1">
              {localInfo.features.map((feature) => (
                <div key={feature} className="flex items-center gap-1 text-xs">
                  <Zap className="h-2 w-2" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={mode === 'external' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleModeChange('external')}
            disabled={disabled || isChanging}
            className="h-7 px-2 text-xs"
          >
            {isChanging && mode !== 'external' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                {externalInfo.icon}
                <span className="ml-1">External</span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="space-y-2 p-1">
            <p className="font-medium">{externalInfo.label}</p>
            <p className="text-xs text-muted-foreground max-w-48">
              {externalInfo.description}
            </p>
            <div className="space-y-1">
              {externalInfo.features.map((feature) => (
                <div key={feature} className="flex items-center gap-1 text-xs">
                  <Zap className="h-2 w-2" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

export const ModeToggle: React.FC<ModeToggleProps> = ({
  variant = 'switch',
  ...props
}) => {
  return (
    <TooltipProvider>
      {variant === 'switch' ? <SwitchVariant {...props} /> : <ButtonVariant {...props} />}
    </TooltipProvider>
  )
}

// Enhanced mode toggle with status indicator
interface ModeToggleWithStatusProps extends ModeToggleProps {
  isConnected?: boolean
  connectionStatus?: string
  showStatus?: boolean
}

export const ModeToggleWithStatus: React.FC<ModeToggleWithStatusProps> = ({
  mode,
  onModeChange,
  disabled = false,
  isConnected = true,
  connectionStatus = 'Connected',
  showStatus = false,
  className = '',
  ...props
}) => {
  const currentInfo = getModeInfo(mode)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <ModeToggle
        mode={mode}
        onModeChange={onModeChange}
        disabled={disabled}
        {...props}
      />

      {showStatus && (
        <>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1">
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                isConnected ? 'bg-green-500' : 'bg-red-500'
              )}
            />
            <span className="text-xs text-muted-foreground">
              {connectionStatus}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

// Compact mode indicator (for limited space)
export const CompactModeIndicator: React.FC<{
  mode: 'local' | 'external'
  className?: string
}> = ({ mode, className = '' }) => {
  const info = getModeInfo(mode)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={info.badgeVariant} className={cn('text-xs', className)}>
          {info.icon}
          <span className="ml-1">{info.label}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{info.description}</p>
      </TooltipContent>
    </Tooltip>
  )
}