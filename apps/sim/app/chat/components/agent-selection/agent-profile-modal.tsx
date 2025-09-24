'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Activity, Brain, Info, Route, Settings, Star, Target, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Agent, Guideline, Journey } from '@/apps/sim/services/parlant/types'

interface AgentProfileModalProps {
  agent: Agent | null
  isOpen: boolean
  onClose: () => void
  onSelect?: (agent: Agent) => void
  metrics?: AgentMetrics
  className?: string
}

interface AgentMetrics {
  totalSessions: number
  avgResponseTime: number
  successRate: number
  rating: number
  popularity: number
  lastUsed?: string
  totalMessages: number
  averageSessionLength: number
  topTopics: string[]
  userFeedback: {
    positive: number
    neutral: number
    negative: number
  }
}

/**
 * AgentProfileModal Component
 *
 * Displays comprehensive agent information including:
 * - Basic details and description
 * - Performance metrics and statistics
 * - Guidelines and capabilities
 * - Journey configurations
 * - Usage history and feedback
 */
export function AgentProfileModal({
  agent,
  isOpen,
  onClose,
  onSelect,
  metrics,
  className = '',
}: AgentProfileModalProps) {
  const [selectedTab, setSelectedTab] = useState('overview')

  if (!agent) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20'
      case 'training':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20'
      case 'inactive':
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const renderStarRating = (rating: number) => {
    return (
      <div className='flex items-center space-x-1'>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
        <span className='ml-2 text-muted-foreground text-sm'>{rating.toFixed(1)} / 5.0</span>
      </div>
    )
  }

  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return 'Unknown'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-h-[90vh] max-w-4xl overflow-hidden ${className}`}>
        <DialogHeader className='pb-4'>
          <div className='flex items-start justify-between'>
            <div className='flex-1'>
              <DialogTitle className='flex items-center space-x-3 font-bold text-2xl'>
                <span>{agent.name}</span>
                <Badge
                  variant='outline'
                  className={`${getStatusColor(agent.status)} border-transparent`}
                >
                  {agent.status === 'active'
                    ? 'Ready'
                    : agent.status === 'training'
                      ? 'Learning'
                      : 'Offline'}
                </Badge>
              </DialogTitle>
              <DialogDescription className='mt-2 text-base'>
                {agent.description || 'No description available'}
              </DialogDescription>
            </div>

            {metrics && (
              <div className='ml-4 text-right'>
                {renderStarRating(metrics.rating)}
                <div className='mt-1 text-muted-foreground text-sm'>
                  {metrics.totalSessions} conversations
                </div>
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className='flex-1 overflow-hidden'>
          <TabsList className='grid w-full grid-cols-4'>
            <TabsTrigger value='overview' className='flex items-center space-x-2'>
              <Info className='h-4 w-4' />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value='performance' className='flex items-center space-x-2'>
              <TrendingUp className='h-4 w-4' />
              <span>Performance</span>
            </TabsTrigger>
            <TabsTrigger value='capabilities' className='flex items-center space-x-2'>
              <Brain className='h-4 w-4' />
              <span>Capabilities</span>
            </TabsTrigger>
            <TabsTrigger value='journeys' className='flex items-center space-x-2'>
              <Route className='h-4 w-4' />
              <span>Journeys</span>
            </TabsTrigger>
          </TabsList>

          <div className='mt-4 flex-1 overflow-y-auto'>
            <TabsContent value='overview' className='m-0 space-y-6'>
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center space-x-2'>
                    <Settings className='h-5 w-5' />
                    <span>Agent Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                    <div>
                      <div className='font-medium text-muted-foreground text-sm'>Created</div>
                      <div className='text-sm'>{formatRelativeTime(agent.created_at)}</div>
                    </div>
                    <div>
                      <div className='font-medium text-muted-foreground text-sm'>Last Updated</div>
                      <div className='text-sm'>{formatRelativeTime(agent.updated_at)}</div>
                    </div>
                    <div>
                      <div className='font-medium text-muted-foreground text-sm'>Guidelines</div>
                      <div className='text-sm'>{agent.guidelines?.length || 0}</div>
                    </div>
                    <div>
                      <div className='font-medium text-muted-foreground text-sm'>Journeys</div>
                      <div className='text-sm'>{agent.journeys?.length || 0}</div>
                    </div>
                  </div>

                  {agent.config && (
                    <>
                      <Separator />
                      <div>
                        <div className='mb-2 font-medium text-muted-foreground text-sm'>
                          Configuration
                        </div>
                        <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                          {agent.config.model && (
                            <div>
                              <div className='text-muted-foreground text-xs'>Model</div>
                              <div className='font-mono text-sm'>{agent.config.model}</div>
                            </div>
                          )}
                          {agent.config.temperature !== undefined && (
                            <div>
                              <div className='text-muted-foreground text-xs'>Temperature</div>
                              <div className='text-sm'>{agent.config.temperature}</div>
                            </div>
                          )}
                          {agent.config.max_turns && (
                            <div>
                              <div className='text-muted-foreground text-xs'>Max Turns</div>
                              <div className='text-sm'>{agent.config.max_turns}</div>
                            </div>
                          )}
                          {agent.config.tool_choice && (
                            <div>
                              <div className='text-muted-foreground text-xs'>Tool Choice</div>
                              <div className='text-sm'>{agent.config.tool_choice}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {agent.config?.system_prompt && (
                    <>
                      <Separator />
                      <div>
                        <div className='mb-2 font-medium text-muted-foreground text-sm'>
                          System Prompt
                        </div>
                        <div className='rounded-md bg-muted p-3 font-mono text-sm'>
                          {agent.config.system_prompt}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              {metrics && (
                <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center space-x-2'>
                      <Activity className='h-5 w-5' />
                      <span>Quick Stats</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                      <div className='text-center'>
                        <div className='font-bold text-2xl'>{metrics.totalSessions}</div>
                        <div className='text-muted-foreground text-sm'>Total Sessions</div>
                      </div>
                      <div className='text-center'>
                        <div className='font-bold text-2xl'>{metrics.totalMessages}</div>
                        <div className='text-muted-foreground text-sm'>Messages</div>
                      </div>
                      <div className='text-center'>
                        <div className='font-bold text-2xl'>{metrics.successRate}%</div>
                        <div className='text-muted-foreground text-sm'>Success Rate</div>
                      </div>
                      <div className='text-center'>
                        <div className='font-bold text-2xl'>{metrics.avgResponseTime}ms</div>
                        <div className='text-muted-foreground text-sm'>Avg Response</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value='performance' className='m-0 space-y-6'>
              {metrics && (
                <>
                  {/* Performance Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center space-x-2'>
                        <TrendingUp className='h-5 w-5' />
                        <span>Performance Overview</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-6'>
                      <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
                        <div className='text-center'>
                          <div className='font-bold text-3xl text-green-600'>
                            {metrics.successRate}%
                          </div>
                          <div className='text-muted-foreground text-sm'>Success Rate</div>
                        </div>
                        <div className='text-center'>
                          <div className='font-bold text-3xl'>{metrics.avgResponseTime}ms</div>
                          <div className='text-muted-foreground text-sm'>Avg Response Time</div>
                        </div>
                        <div className='text-center'>
                          <div className='font-bold text-3xl'>
                            {metrics.averageSessionLength}min
                          </div>
                          <div className='text-muted-foreground text-sm'>Avg Session Length</div>
                        </div>
                      </div>

                      <Separator />

                      {/* Rating Breakdown */}
                      <div>
                        <h4 className='mb-3 font-medium'>Rating Breakdown</h4>
                        {renderStarRating(metrics.rating)}
                      </div>

                      <Separator />

                      {/* User Feedback */}
                      <div>
                        <h4 className='mb-3 font-medium'>User Feedback</h4>
                        <div className='space-y-2'>
                          <div className='flex items-center justify-between'>
                            <span className='text-sm'>Positive</span>
                            <div className='flex items-center space-x-2'>
                              <div className='h-2 w-24 overflow-hidden rounded-full bg-muted'>
                                <div
                                  className='h-full bg-green-500'
                                  style={{
                                    width: `${
                                      (metrics.userFeedback.positive /
                                        (metrics.userFeedback.positive +
                                          metrics.userFeedback.neutral +
                                          metrics.userFeedback.negative)) *
                                      100
                                    }%`,
                                  }}
                                />
                              </div>
                              <span className='font-medium text-sm'>
                                {metrics.userFeedback.positive}
                              </span>
                            </div>
                          </div>
                          <div className='flex items-center justify-between'>
                            <span className='text-sm'>Neutral</span>
                            <div className='flex items-center space-x-2'>
                              <div className='h-2 w-24 overflow-hidden rounded-full bg-muted'>
                                <div
                                  className='h-full bg-yellow-500'
                                  style={{
                                    width: `${
                                      (metrics.userFeedback.neutral /
                                        (metrics.userFeedback.positive +
                                          metrics.userFeedback.neutral +
                                          metrics.userFeedback.negative)) *
                                      100
                                    }%`,
                                  }}
                                />
                              </div>
                              <span className='font-medium text-sm'>
                                {metrics.userFeedback.neutral}
                              </span>
                            </div>
                          </div>
                          <div className='flex items-center justify-between'>
                            <span className='text-sm'>Negative</span>
                            <div className='flex items-center space-x-2'>
                              <div className='h-2 w-24 overflow-hidden rounded-full bg-muted'>
                                <div
                                  className='h-full bg-red-500'
                                  style={{
                                    width: `${
                                      (metrics.userFeedback.negative /
                                        (metrics.userFeedback.positive +
                                          metrics.userFeedback.neutral +
                                          metrics.userFeedback.negative)) *
                                      100
                                    }%`,
                                  }}
                                />
                              </div>
                              <span className='font-medium text-sm'>
                                {metrics.userFeedback.negative}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Top Topics */}
                      {metrics.topTopics.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h4 className='mb-3 font-medium'>Top Topics</h4>
                            <div className='flex flex-wrap gap-2'>
                              {metrics.topTopics.map((topic, index) => (
                                <Badge key={index} variant='secondary'>
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value='capabilities' className='m-0 space-y-6'>
              {/* Guidelines */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center space-x-2'>
                    <Target className='h-5 w-5' />
                    <span>Guidelines ({agent.guidelines?.length || 0})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {agent.guidelines && agent.guidelines.length > 0 ? (
                    <div className='space-y-4'>
                      {agent.guidelines.map((guideline: Guideline, index) => (
                        <div key={guideline.id} className='rounded-lg border p-4'>
                          <div className='mb-2 flex items-start justify-between'>
                            <div className='flex items-center space-x-2'>
                              <Badge variant='outline'>#{index + 1}</Badge>
                              {guideline.priority && (
                                <Badge variant='secondary'>Priority: {guideline.priority}</Badge>
                              )}
                            </div>
                            <div className='text-muted-foreground text-xs'>
                              {formatRelativeTime(guideline.created_at)}
                            </div>
                          </div>
                          <div className='space-y-2'>
                            <div>
                              <div className='font-medium text-muted-foreground text-sm'>
                                Condition
                              </div>
                              <div className='text-sm'>{guideline.condition}</div>
                            </div>
                            <div>
                              <div className='font-medium text-muted-foreground text-sm'>
                                Action
                              </div>
                              <div className='text-sm'>{guideline.action}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='py-8 text-center text-muted-foreground'>
                      <Target className='mx-auto mb-4 h-12 w-12 opacity-50' />
                      <p>No guidelines configured for this agent</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='journeys' className='m-0 space-y-6'>
              {/* Journeys */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center space-x-2'>
                    <Route className='h-5 w-5' />
                    <span>Journeys ({agent.journeys?.length || 0})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {agent.journeys && agent.journeys.length > 0 ? (
                    <div className='space-y-4'>
                      {agent.journeys.map((journey: Journey) => (
                        <div key={journey.id} className='rounded-lg border p-4'>
                          <div className='mb-2 flex items-start justify-between'>
                            <h4 className='font-medium'>{journey.title}</h4>
                            <div className='text-muted-foreground text-xs'>
                              {formatRelativeTime(journey.created_at)}
                            </div>
                          </div>

                          {journey.description && (
                            <p className='mb-3 text-muted-foreground text-sm'>
                              {journey.description}
                            </p>
                          )}

                          {journey.conditions.length > 0 && (
                            <div className='mb-3'>
                              <div className='mb-1 font-medium text-muted-foreground text-sm'>
                                Conditions
                              </div>
                              <div className='flex flex-wrap gap-1'>
                                {journey.conditions.map((condition, index) => (
                                  <Badge key={index} variant='outline' className='text-xs'>
                                    {condition}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {journey.steps && journey.steps.length > 0 && (
                            <div>
                              <div className='mb-2 font-medium text-muted-foreground text-sm'>
                                Steps ({journey.steps.length})
                              </div>
                              <div className='space-y-2'>
                                {journey.steps.map((step, index) => (
                                  <div key={step.id} className='flex items-start space-x-2 text-sm'>
                                    <Badge variant='outline' className='px-1 text-xs'>
                                      {step.order}
                                    </Badge>
                                    <div className='flex-1'>
                                      <div className='font-medium'>{step.title}</div>
                                      {step.description && (
                                        <div className='text-muted-foreground'>
                                          {step.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='py-8 text-center text-muted-foreground'>
                      <Route className='mx-auto mb-4 h-12 w-12 opacity-50' />
                      <p>No journeys configured for this agent</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className='pt-4'>
          <Button variant='outline' onClick={onClose}>
            Close
          </Button>
          {onSelect && <Button onClick={() => onSelect(agent)}>Select Agent</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AgentProfileModal
