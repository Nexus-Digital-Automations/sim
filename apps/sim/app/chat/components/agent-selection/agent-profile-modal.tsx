'use client'

import { useState } from 'react'
import { Agent, Guideline, Journey } from '@/apps/sim/services/parlant/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Brain,
  Calendar,
  Clock,
  GitBranch,
  MessageCircle,
  Settings,
  Star,
  TrendingUp,
  Users,
  Zap,
  Activity,
  Target,
  Route,
  Info
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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
  className = ''
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
      <div className="flex items-center space-x-1">
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
        <span className="text-sm text-muted-foreground ml-2">
          {rating.toFixed(1)} / 5.0
        </span>
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
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-hidden ${className}`}>
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold flex items-center space-x-3">
                <span>{agent.name}</span>
                <Badge
                  variant="outline"
                  className={`${getStatusColor(agent.status)} border-transparent`}
                >
                  {agent.status === 'active' ? 'Ready' :
                   agent.status === 'training' ? 'Learning' : 'Offline'}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                {agent.description || 'No description available'}
              </DialogDescription>
            </div>

            {metrics && (
              <div className="ml-4 text-right">
                {renderStarRating(metrics.rating)}
                <div className="text-sm text-muted-foreground mt-1">
                  {metrics.totalSessions} conversations
                </div>
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <Info className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Performance</span>
            </TabsTrigger>
            <TabsTrigger value="capabilities" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>Capabilities</span>
            </TabsTrigger>
            <TabsTrigger value="journeys" className="flex items-center space-x-2">
              <Route className="h-4 w-4" />
              <span>Journeys</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="overview" className="space-y-6 m-0">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Agent Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Created</div>
                      <div className="text-sm">{formatRelativeTime(agent.created_at)}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Last Updated</div>
                      <div className="text-sm">{formatRelativeTime(agent.updated_at)}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Guidelines</div>
                      <div className="text-sm">{agent.guidelines?.length || 0}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Journeys</div>
                      <div className="text-sm">{agent.journeys?.length || 0}</div>
                    </div>
                  </div>

                  {agent.config && (
                    <>
                      <Separator />
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">Configuration</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {agent.config.model && (
                            <div>
                              <div className="text-xs text-muted-foreground">Model</div>
                              <div className="text-sm font-mono">{agent.config.model}</div>
                            </div>
                          )}
                          {agent.config.temperature !== undefined && (
                            <div>
                              <div className="text-xs text-muted-foreground">Temperature</div>
                              <div className="text-sm">{agent.config.temperature}</div>
                            </div>
                          )}
                          {agent.config.max_turns && (
                            <div>
                              <div className="text-xs text-muted-foreground">Max Turns</div>
                              <div className="text-sm">{agent.config.max_turns}</div>
                            </div>
                          )}
                          {agent.config.tool_choice && (
                            <div>
                              <div className="text-xs text-muted-foreground">Tool Choice</div>
                              <div className="text-sm">{agent.config.tool_choice}</div>
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
                        <div className="text-sm font-medium text-muted-foreground mb-2">System Prompt</div>
                        <div className="text-sm p-3 bg-muted rounded-md font-mono">
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
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5" />
                      <span>Quick Stats</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{metrics.totalSessions}</div>
                        <div className="text-sm text-muted-foreground">Total Sessions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{metrics.totalMessages}</div>
                        <div className="text-sm text-muted-foreground">Messages</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{metrics.successRate}%</div>
                        <div className="text-sm text-muted-foreground">Success Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{metrics.avgResponseTime}ms</div>
                        <div className="text-sm text-muted-foreground">Avg Response</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="performance" className="space-y-6 m-0">
              {metrics && (
                <>
                  {/* Performance Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5" />
                        <span>Performance Overview</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600">{metrics.successRate}%</div>
                          <div className="text-sm text-muted-foreground">Success Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold">{metrics.avgResponseTime}ms</div>
                          <div className="text-sm text-muted-foreground">Avg Response Time</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold">{metrics.averageSessionLength}min</div>
                          <div className="text-sm text-muted-foreground">Avg Session Length</div>
                        </div>
                      </div>

                      <Separator />

                      {/* Rating Breakdown */}
                      <div>
                        <h4 className="font-medium mb-3">Rating Breakdown</h4>
                        {renderStarRating(metrics.rating)}
                      </div>

                      <Separator />

                      {/* User Feedback */}
                      <div>
                        <h4 className="font-medium mb-3">User Feedback</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Positive</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500"
                                  style={{
                                    width: `${(metrics.userFeedback.positive /
                                      (metrics.userFeedback.positive + metrics.userFeedback.neutral + metrics.userFeedback.negative)) * 100}%`
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium">{metrics.userFeedback.positive}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Neutral</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-yellow-500"
                                  style={{
                                    width: `${(metrics.userFeedback.neutral /
                                      (metrics.userFeedback.positive + metrics.userFeedback.neutral + metrics.userFeedback.negative)) * 100}%`
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium">{metrics.userFeedback.neutral}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Negative</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-red-500"
                                  style={{
                                    width: `${(metrics.userFeedback.negative /
                                      (metrics.userFeedback.positive + metrics.userFeedback.neutral + metrics.userFeedback.negative)) * 100}%`
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium">{metrics.userFeedback.negative}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Top Topics */}
                      {metrics.topTopics.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="font-medium mb-3">Top Topics</h4>
                            <div className="flex flex-wrap gap-2">
                              {metrics.topTopics.map((topic, index) => (
                                <Badge key={index} variant="secondary">
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

            <TabsContent value="capabilities" className="space-y-6 m-0">
              {/* Guidelines */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Guidelines ({agent.guidelines?.length || 0})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {agent.guidelines && agent.guidelines.length > 0 ? (
                    <div className="space-y-4">
                      {agent.guidelines.map((guideline: Guideline, index) => (
                        <div key={guideline.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">#{index + 1}</Badge>
                              {guideline.priority && (
                                <Badge variant="secondary">
                                  Priority: {guideline.priority}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatRelativeTime(guideline.created_at)}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">Condition</div>
                              <div className="text-sm">{guideline.condition}</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">Action</div>
                              <div className="text-sm">{guideline.action}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No guidelines configured for this agent</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="journeys" className="space-y-6 m-0">
              {/* Journeys */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Route className="h-5 w-5" />
                    <span>Journeys ({agent.journeys?.length || 0})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {agent.journeys && agent.journeys.length > 0 ? (
                    <div className="space-y-4">
                      {agent.journeys.map((journey: Journey) => (
                        <div key={journey.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">{journey.title}</h4>
                            <div className="text-xs text-muted-foreground">
                              {formatRelativeTime(journey.created_at)}
                            </div>
                          </div>

                          {journey.description && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {journey.description}
                            </p>
                          )}

                          {journey.conditions.length > 0 && (
                            <div className="mb-3">
                              <div className="text-sm font-medium text-muted-foreground mb-1">
                                Conditions
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {journey.conditions.map((condition, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {condition}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {journey.steps && journey.steps.length > 0 && (
                            <div>
                              <div className="text-sm font-medium text-muted-foreground mb-2">
                                Steps ({journey.steps.length})
                              </div>
                              <div className="space-y-2">
                                {journey.steps.map((step, index) => (
                                  <div key={step.id} className="flex items-start space-x-2 text-sm">
                                    <Badge variant="outline" className="text-xs px-1">
                                      {step.order}
                                    </Badge>
                                    <div className="flex-1">
                                      <div className="font-medium">{step.title}</div>
                                      {step.description && (
                                        <div className="text-muted-foreground">
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
                    <div className="text-center py-8 text-muted-foreground">
                      <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No journeys configured for this agent</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {onSelect && (
            <Button onClick={() => onSelect(agent)}>
              Select Agent
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AgentProfileModal