'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Bot,
  Edit,
  FileText,
  Info,
  Loader2,
  MapPin,
  Plus,
  Save,
  Settings,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { createLogger } from '@/lib/logs/console/logger'
import { useAgentManagementStore } from '@/stores/agents'
import type { Guideline, Journey, ParlantAgent, UpdateAgentRequest } from '@/stores/agents/types'

const logger = createLogger('AgentConfigurationPanel')

interface AgentConfigurationPanelProps {
  agent: ParlantAgent
  open: boolean
  onOpenChange: (open: boolean) => void
}

const AVAILABLE_MODELS = [
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
]

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'formal', label: 'Formal' },
]

const VERBOSITY_OPTIONS = [
  { value: 'concise', label: 'Concise' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'comprehensive', label: 'Comprehensive' },
]

function GuidelineCard({
  guideline,
  onEdit,
  onDelete,
}: {
  guideline: Guideline
  onEdit: (guideline: Guideline) => void
  onDelete: (guideline: Guideline) => void
}) {
  const priorityColors = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  }

  return (
    <Card className='group'>
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <CardTitle className='truncate text-sm'>{guideline.title}</CardTitle>
              <Badge variant='outline' className={`text-xs ${priorityColors[guideline.priority]}`}>
                {guideline.priority}
              </Badge>
              {!guideline.enabled && (
                <Badge variant='outline' className='text-xs'>
                  Disabled
                </Badge>
              )}
            </div>
            <CardDescription className='mt-1 text-xs'>{guideline.description}</CardDescription>
          </div>
          <div className='ml-2 flex opacity-0 transition-opacity group-hover:opacity-100'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onEdit(guideline)}
              className='h-8 w-8 p-0'
            >
              <Edit className='h-4 w-4' />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onDelete(guideline)}
              className='h-8 w-8 p-0 text-red-600 hover:bg-red-50 dark:text-red-400'
            >
              <Trash2 className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className='pt-0'>
        <p className='line-clamp-3 text-muted-foreground text-xs'>{guideline.content}</p>
      </CardContent>
    </Card>
  )
}

function JourneyCard({
  journey,
  onEdit,
  onDelete,
}: {
  journey: Journey
  onEdit: (journey: Journey) => void
  onDelete: (journey: Journey) => void
}) {
  return (
    <Card className='group'>
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <CardTitle className='truncate text-sm'>{journey.name}</CardTitle>
              {!journey.enabled && (
                <Badge variant='outline' className='text-xs'>
                  Disabled
                </Badge>
              )}
            </div>
            <CardDescription className='mt-1 text-xs'>{journey.description}</CardDescription>
          </div>
          <div className='ml-2 flex opacity-0 transition-opacity group-hover:opacity-100'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onEdit(journey)}
              className='h-8 w-8 p-0'
            >
              <Edit className='h-4 w-4' />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onDelete(journey)}
              className='h-8 w-8 p-0 text-red-600 hover:bg-red-50 dark:text-red-400'
            >
              <Trash2 className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className='pt-0'>
        <div className='flex items-center gap-4 text-muted-foreground text-xs'>
          <div className='flex items-center gap-1'>
            <span className='font-medium'>{journey.states.length}</span>
            <span>states</span>
          </div>
          <div className='flex items-center gap-1'>
            <span className='font-medium'>{journey.triggers.length}</span>
            <span>triggers</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AgentConfigurationPanel({
  agent,
  open,
  onOpenChange,
}: AgentConfigurationPanelProps) {
  const {
    updateAgent,
    addGuideline,
    deleteGuideline,
    addJourney,
    deleteJourney,
    agentStats,
    loadAgentStats,
    isUpdatingAgent,
    isLoadingStats,
    error,
    clearError,
  } = useAgentManagementStore()

  // Form state
  const [formData, setFormData] = useState<UpdateAgentRequest>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [activeTab, setActiveTab] = useState('configuration')

  // Initialize form data when agent changes
  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        description: agent.description,
        configuration: agent.configuration,
      })
      setHasChanges(false)

      // Load stats if not already loaded
      if (!agentStats[agent.id]) {
        loadAgentStats(agent.id).catch((error) => {
          logger.error('Failed to load agent stats:', error)
        })
      }
    }
  }, [agent, loadAgentStats, agentStats])

  const handleSave = async () => {
    if (!hasChanges) return

    try {
      await updateAgent(agent.id, formData)
      setHasChanges(false)
      logger.info('Agent configuration updated successfully')
    } catch (error) {
      logger.error('Failed to update agent configuration:', error)
    }
  }

  const updateFormData = (updates: Partial<UpdateAgentRequest>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
    setHasChanges(true)
  }

  const updateConfiguration = (updates: any) => {
    setFormData((prev) => ({
      ...prev,
      configuration: { ...prev.configuration, ...updates },
    }))
    setHasChanges(true)
  }

  const stats = agentStats[agent.id]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-hidden rounded-[10px] sm:max-w-4xl'>
        <DialogHeader className='border-b pb-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10'>
                <Bot className='h-5 w-5 text-primary' />
              </div>
              <div>
                <DialogTitle className='text-lg'>{agent.name}</DialogTitle>
                <p className='text-muted-foreground text-sm'>{agent.description}</p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              {hasChanges && (
                <Button
                  onClick={handleSave}
                  disabled={isUpdatingAgent}
                  className='h-9 rounded-[8px] bg-primary text-white hover:bg-primary/90'
                >
                  {isUpdatingAgent && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  <Save className='mr-2 h-4 w-4' />
                  Save Changes
                </Button>
              )}
              <Button
                variant='ghost'
                size='sm'
                onClick={() => onOpenChange(false)}
                className='h-9 w-9 p-0'
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className='flex h-[600px] overflow-hidden'>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='flex h-full w-full'
            orientation='horizontal'
          >
            <div className='flex h-full w-full flex-col'>
              {/* Tab Navigation */}
              <TabsList className='w-full justify-start border-b bg-transparent p-0'>
                <TabsTrigger value='configuration' className='flex items-center gap-2'>
                  <Settings className='h-4 w-4' />
                  Configuration
                </TabsTrigger>
                <TabsTrigger value='guidelines' className='flex items-center gap-2'>
                  <FileText className='h-4 w-4' />
                  Guidelines ({agent.guidelines.length})
                </TabsTrigger>
                <TabsTrigger value='journeys' className='flex items-center gap-2'>
                  <MapPin className='h-4 w-4' />
                  Journeys ({agent.journeys.length})
                </TabsTrigger>
                <TabsTrigger value='analytics' className='flex items-center gap-2'>
                  <TrendingUp className='h-4 w-4' />
                  Analytics
                </TabsTrigger>
              </TabsList>

              {/* Error Display */}
              {error && (
                <div className='flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'>
                  <div className='flex items-center gap-2'>
                    <AlertCircle className='h-4 w-4' />
                    <span className='text-sm'>{error}</span>
                  </div>
                  <Button variant='ghost' size='sm' onClick={clearError} className='h-8'>
                    <X className='h-4 w-4' />
                  </Button>
                </div>
              )}

              {/* Tab Content */}
              <div className='min-h-0 flex-1 overflow-y-auto'>
                {/* Configuration Tab */}
                <TabsContent value='configuration' className='mt-0 h-full p-6'>
                  <div className='space-y-6'>
                    {/* Basic Settings */}
                    <div className='space-y-4'>
                      <h3 className='font-medium text-sm'>Basic Information</h3>

                      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <div className='space-y-2'>
                          <Label htmlFor='agent-name'>Name</Label>
                          <Input
                            id='agent-name'
                            value={formData.name || ''}
                            onChange={(e) => updateFormData({ name: e.target.value })}
                            className='h-9 rounded-[8px]'
                          />
                        </div>

                        <div className='space-y-2'>
                          <Label htmlFor='agent-status'>Status</Label>
                          <Select
                            value={agent.status}
                            onValueChange={(value: any) => updateFormData({ status: value })}
                          >
                            <SelectTrigger className='h-9 rounded-[8px]'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='active'>Active</SelectItem>
                              <SelectItem value='inactive'>Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className='space-y-2'>
                        <Label htmlFor='agent-description'>Description</Label>
                        <Textarea
                          id='agent-description'
                          value={formData.description || ''}
                          onChange={(e) => updateFormData({ description: e.target.value })}
                          className='min-h-[80px] rounded-[8px]'
                          maxLength={500}
                        />
                      </div>
                    </div>

                    {/* Model Configuration */}
                    <div className='space-y-4'>
                      <h3 className='font-medium text-sm'>Model Settings</h3>

                      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <div className='space-y-2'>
                          <Label>Language Model</Label>
                          <Select
                            value={formData.configuration?.model}
                            onValueChange={(value) => updateConfiguration({ model: value })}
                          >
                            <SelectTrigger className='h-9 rounded-[8px]'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AVAILABLE_MODELS.map((model) => (
                                <SelectItem key={model.value} value={model.value}>
                                  {model.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className='space-y-2'>
                          <Label>Max Tokens</Label>
                          <Select
                            value={formData.configuration?.maxTokens?.toString()}
                            onValueChange={(value) =>
                              updateConfiguration({ maxTokens: Number.parseInt(value, 10) })
                            }
                          >
                            <SelectTrigger className='h-9 rounded-[8px]'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='1024'>1,024 tokens</SelectItem>
                              <SelectItem value='2048'>2,048 tokens</SelectItem>
                              <SelectItem value='4096'>4,096 tokens</SelectItem>
                              <SelectItem value='8192'>8,192 tokens</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className='space-y-2'>
                        <div className='flex items-center gap-2'>
                          <Label>Temperature: {formData.configuration?.temperature}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant='ghost' size='sm' className='h-7 p-1'>
                                <Info className='h-4 w-4' />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className='text-sm'>Controls randomness in responses</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Slider
                          min={0}
                          max={1}
                          step={0.1}
                          value={[formData.configuration?.temperature || 0.7]}
                          onValueChange={([value]) => updateConfiguration({ temperature: value })}
                        />
                      </div>
                    </div>

                    {/* System Prompt */}
                    <div className='space-y-4'>
                      <h3 className='font-medium text-sm'>Behavior</h3>

                      <div className='space-y-2'>
                        <Label htmlFor='system-prompt'>System Prompt</Label>
                        <Textarea
                          id='system-prompt'
                          value={formData.configuration?.systemPrompt || ''}
                          onChange={(e) => updateConfiguration({ systemPrompt: e.target.value })}
                          className='min-h-[120px] rounded-[8px]'
                          maxLength={2000}
                        />
                        <p className='text-muted-foreground text-xs'>
                          {formData.configuration?.systemPrompt?.length || 0}/2000 characters
                        </p>
                      </div>
                    </div>

                    {/* Tools Toggle */}
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Label>Enable Tools</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant='ghost' size='sm' className='h-7 p-1'>
                              <Info className='h-4 w-4' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className='text-sm'>Allow agent to use available tools</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        checked={formData.configuration?.toolsEnabled}
                        onCheckedChange={(checked) =>
                          updateConfiguration({ toolsEnabled: checked })
                        }
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Guidelines Tab */}
                <TabsContent value='guidelines' className='mt-0 h-full p-6'>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <h3 className='font-medium text-sm'>Guidelines</h3>
                      <Button
                        onClick={() => {
                          // TODO: Open add guideline modal
                        }}
                        variant='outline'
                        size='sm'
                        className='h-8'
                      >
                        <Plus className='mr-2 h-4 w-4' />
                        Add Guideline
                      </Button>
                    </div>

                    {agent.guidelines.length === 0 ? (
                      <div className='flex h-32 items-center justify-center text-center'>
                        <div>
                          <FileText className='mx-auto h-8 w-8 text-muted-foreground' />
                          <p className='mt-2 text-muted-foreground text-sm'>
                            No guidelines configured yet.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className='grid grid-cols-1 gap-4'>
                        {agent.guidelines.map((guideline) => (
                          <GuidelineCard
                            key={guideline.id}
                            guideline={guideline}
                            onEdit={() => {
                              // TODO: Open edit guideline modal
                            }}
                            onDelete={() => {
                              // TODO: Confirm and delete guideline
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Journeys Tab */}
                <TabsContent value='journeys' className='mt-0 h-full p-6'>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <h3 className='font-medium text-sm'>Journeys</h3>
                      <Button
                        onClick={() => {
                          // TODO: Open add journey modal
                        }}
                        variant='outline'
                        size='sm'
                        className='h-8'
                      >
                        <Plus className='mr-2 h-4 w-4' />
                        Add Journey
                      </Button>
                    </div>

                    {agent.journeys.length === 0 ? (
                      <div className='flex h-32 items-center justify-center text-center'>
                        <div>
                          <MapPin className='mx-auto h-8 w-8 text-muted-foreground' />
                          <p className='mt-2 text-muted-foreground text-sm'>
                            No journeys configured yet.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className='grid grid-cols-1 gap-4'>
                        {agent.journeys.map((journey) => (
                          <JourneyCard
                            key={journey.id}
                            journey={journey}
                            onEdit={() => {
                              // TODO: Open edit journey modal
                            }}
                            onDelete={() => {
                              // TODO: Confirm and delete journey
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value='analytics' className='mt-0 h-full p-6'>
                  <div className='space-y-6'>
                    {isLoadingStats ? (
                      <div className='flex h-32 items-center justify-center'>
                        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
                      </div>
                    ) : stats ? (
                      <>
                        {/* Key Metrics */}
                        <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                          <Card>
                            <CardHeader className='pb-3'>
                              <CardDescription>Total Conversations</CardDescription>
                              <CardTitle className='text-2xl'>{stats.totalConversations}</CardTitle>
                            </CardHeader>
                          </Card>

                          <Card>
                            <CardHeader className='pb-3'>
                              <CardDescription>Active Conversations</CardDescription>
                              <CardTitle className='text-2xl'>
                                {stats.activeConversations}
                              </CardTitle>
                            </CardHeader>
                          </Card>

                          <Card>
                            <CardHeader className='pb-3'>
                              <CardDescription>Avg Response Time</CardDescription>
                              <CardTitle className='text-2xl'>
                                {stats.averageResponseTime}ms
                              </CardTitle>
                            </CardHeader>
                          </Card>

                          <Card>
                            <CardHeader className='pb-3'>
                              <CardDescription>Success Rate</CardDescription>
                              <CardTitle className='text-2xl'>{stats.successRate}%</CardTitle>
                            </CardHeader>
                          </Card>
                        </div>

                        {/* Additional Analytics */}
                        <div className='space-y-4'>
                          <h4 className='font-medium text-sm'>Tool Usage</h4>
                          <div className='space-y-2'>
                            {Object.entries(stats.toolUsageStats).map(([tool, count]) => (
                              <div key={tool} className='flex items-center justify-between'>
                                <span className='text-sm'>{tool}</span>
                                <Badge variant='outline'>{count} uses</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className='flex h-32 items-center justify-center text-center'>
                        <div>
                          <TrendingUp className='mx-auto h-8 w-8 text-muted-foreground' />
                          <p className='mt-2 text-muted-foreground text-sm'>
                            No analytics data available yet.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
