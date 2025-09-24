'use client'

import { useState } from 'react'
import { Brain, Clock, MessageCircle, Settings, Star, TrendingUp, Users, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Agent } from '@/apps/sim/services/parlant/types'

interface AgentCardProps {
  agent: Agent
  isSelected?: boolean
  isRecommended?: boolean
  onSelect: (agent: Agent) => void
  onViewProfile: (agent: Agent) => void
  className?: string
  metrics?: AgentMetrics
}

interface AgentMetrics {
  totalSessions: number
  avgResponseTime: number
  successRate: number
  rating: number
  popularity: number
  lastUsed?: string
}

/**
 * AgentCard Component
 *
 * Displays an agent with key information, capabilities, and selection functionality.
 * Includes visual indicators for recommendations, status, and performance metrics.
 */
export function AgentCard({
  agent,
  isSelected = false,
  isRecommended = false,
  onSelect,
  onViewProfile,
  className = '',
  metrics,
}: AgentCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'training':
        return 'bg-yellow-500'
      case 'inactive':
        return 'bg-gray-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ready'
      case 'training':
        return 'Learning'
      case 'inactive':
        return 'Offline'
      default:
        return 'Unknown'
    }
  }

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const renderStarRating = (rating: number) => {
    return (
      <div className='flex items-center space-x-1'>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className='ml-1 text-muted-foreground text-xs'>{rating.toFixed(1)}</span>
      </div>
    )
  }

  return (
    <Card
      className={`relative cursor-pointer border-2 transition-all duration-200 ${
        isSelected
          ? 'border-primary shadow-lg ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50 hover:shadow-md'
      } ${
        isRecommended
          ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30'
          : 'bg-card'
      } ${className} `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(agent)}
    >
      {/* Recommended Badge */}
      {isRecommended && (
        <div className='-top-2 -right-2 absolute z-10'>
          <Badge
            variant='secondary'
            className='bg-blue-500 px-2 py-1 font-medium text-white text-xs shadow-sm'
          >
            <Zap className='mr-1 h-3 w-3' />
            Recommended
          </Badge>
        </div>
      )}

      {/* Selected Indicator */}
      {isSelected && (
        <div className='absolute top-3 right-3 z-10'>
          <div className='h-3 w-3 rounded-full bg-primary shadow-sm' />
        </div>
      )}

      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <div className='mb-1 flex items-center space-x-2'>
              <h3 className='truncate font-semibold text-base'>{agent.name}</h3>
              <Tooltip>
                <TooltipTrigger>
                  <div className={`h-2 w-2 rounded-full ${getStatusColor(agent.status)}`} />
                </TooltipTrigger>
                <TooltipContent side='top'>
                  <p>{getStatusLabel(agent.status)}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <p className='mb-2 line-clamp-2 text-muted-foreground text-sm'>
              {agent.description || 'No description available'}
            </p>

            {/* Metrics Row */}
            {metrics && (
              <div className='flex items-center space-x-4 text-muted-foreground text-xs'>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className='flex items-center space-x-1'>
                      <MessageCircle className='h-3 w-3' />
                      <span>{metrics.totalSessions}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total conversations</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className='flex items-center space-x-1'>
                      <Clock className='h-3 w-3' />
                      <span>{metrics.avgResponseTime}ms</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Average response time</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className='flex items-center space-x-1'>
                      <TrendingUp className='h-3 w-3' />
                      <span>{metrics.successRate}%</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Success rate</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className='py-0'>
        {/* Agent Capabilities */}
        <div className='space-y-2'>
          {/* Guidelines Count */}
          {agent.guidelines && agent.guidelines.length > 0 && (
            <div className='flex items-center space-x-1 text-muted-foreground text-xs'>
              <Brain className='h-3 w-3' />
              <span>{agent.guidelines.length} guidelines</span>
            </div>
          )}

          {/* Journeys Count */}
          {agent.journeys && agent.journeys.length > 0 && (
            <div className='flex items-center space-x-1 text-muted-foreground text-xs'>
              <Settings className='h-3 w-3' />
              <span>{agent.journeys.length} journeys</span>
            </div>
          )}

          {/* Rating */}
          {metrics && metrics.rating > 0 && (
            <div className='flex items-center justify-between'>
              {renderStarRating(metrics.rating)}
              <div className='flex items-center space-x-1 text-muted-foreground text-xs'>
                <Users className='h-3 w-3' />
                <span>{metrics.popularity}</span>
              </div>
            </div>
          )}

          {/* Last Used */}
          {metrics?.lastUsed && (
            <div className='text-muted-foreground text-xs'>
              Last used: {formatTimeAgo(metrics.lastUsed)}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className='flex justify-between pt-3'>
        <Button
          variant='outline'
          size='sm'
          onClick={(e) => {
            e.stopPropagation()
            onViewProfile(agent)
          }}
          className='h-8 text-xs'
        >
          View Profile
        </Button>

        <Button
          size='sm'
          onClick={(e) => {
            e.stopPropagation()
            onSelect(agent)
          }}
          className={`h-8 text-xs transition-all ${
            isSelected
              ? 'bg-primary text-primary-foreground'
              : isHovered
                ? 'bg-primary/90 text-primary-foreground'
                : ''
          }`}
          variant={isSelected ? 'default' : 'secondary'}
        >
          {isSelected ? 'Selected' : 'Select Agent'}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default AgentCard
