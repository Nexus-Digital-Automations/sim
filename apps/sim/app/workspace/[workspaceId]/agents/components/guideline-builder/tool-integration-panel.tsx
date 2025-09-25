/**
 * Tool Integration Panel Component
 *
 * Interface for integrating Universal Tool Adapter registry with guidelines,
 * showing tool recommendations, usage patterns, and guideline-tool mapping.
 */

'use client'

import { useEffect, useState } from 'react'
import {
  BarChart3,
  Calendar,
  Code,
  Database,
  FileText,
  Lightbulb,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ToolIntegrationPanelProps {
  workspaceId: string
  guidelines: any[]
  onGuidelinesChange?: (guidelines: any[]) => void
}

// Mock tool registry data - would come from Universal Tool Adapter
const AVAILABLE_TOOLS = [
  {
    id: 'openai-completion',
    name: 'OpenAI Text Generation',
    description: 'Generate text using OpenAI models for various tasks',
    category: 'ai-services',
    icon: Code,
    usage_guidelines: 'Use for content generation, text analysis, and creative writing tasks',
    common_conditions: [
      'the user asks for content creation',
      'the user needs text analysis',
      'the user requests writing assistance',
    ],
    recommended_actions: [
      'generate the requested content using appropriate parameters',
      'analyze the text and provide insights',
      'assist with writing and editing tasks',
    ],
  },
  {
    id: 'github-integration',
    name: 'GitHub Operations',
    description: 'Create issues, manage repositories, and track development',
    category: 'development',
    icon: Code,
    usage_guidelines: 'Use for development workflows and code management',
    common_conditions: [
      'the user reports a bug or issue',
      'the user needs to track development progress',
      'the user wants to manage code repositories',
    ],
    recommended_actions: [
      'create a GitHub issue with proper labels and description',
      'check repository status and provide updates',
      'help manage development workflow',
    ],
  },
  {
    id: 'slack-messaging',
    name: 'Slack Integration',
    description: 'Send messages and interact with Slack workspaces',
    category: 'communication',
    icon: MessageSquare,
    usage_guidelines: 'Use for team notifications and communication workflows',
    common_conditions: [
      'the user needs to notify team members',
      'the user wants to escalate an issue',
      'the user requests team coordination',
    ],
    recommended_actions: [
      'send appropriate notifications to relevant channels',
      'escalate issues to the right team members',
      'coordinate team activities and updates',
    ],
  },
  {
    id: 'postgresql-query',
    name: 'PostgreSQL Database',
    description: 'Query and analyze data from PostgreSQL databases',
    category: 'data-retrieval',
    icon: Database,
    usage_guidelines: 'Use for data analysis and reporting tasks',
    common_conditions: [
      'the user asks for data analysis',
      'the user needs database information',
      'the user requests reports or metrics',
    ],
    recommended_actions: [
      'query the database for requested information',
      'analyze data and provide insights',
      'generate reports and visualizations',
    ],
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Read and write data to Google Sheets',
    category: 'data-management',
    icon: BarChart3,
    usage_guidelines: 'Use for data collection and simple reporting',
    common_conditions: [
      'the user needs to update spreadsheet data',
      'the user requests data from sheets',
      'the user wants to track information',
    ],
    recommended_actions: [
      'update or retrieve data from the specified sheet',
      'help organize and format spreadsheet data',
      'provide data summaries and analysis',
    ],
  },
]

export function ToolIntegrationPanel({
  workspaceId,
  guidelines,
  onGuidelinesChange,
}: ToolIntegrationPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [toolRecommendations, setToolRecommendations] = useState<any[]>([])
  const [toolUsageStats, setToolUsageStats] = useState<any>({})

  useEffect(() => {
    generateRecommendations()
    calculateUsageStats()
  }, [guidelines])

  const generateRecommendations = () => {
    const recommendations = []

    // Analyze guidelines for missing tool opportunities
    const guidelinesWithoutTools = guidelines.filter((g) => !g.tools || g.tools.length === 0)
    const dataRelatedGuidelines = guidelines.filter(
      (g) =>
        g.condition.toLowerCase().includes('data') ||
        g.condition.toLowerCase().includes('report') ||
        g.action.toLowerCase().includes('analyze')
    )

    if (dataRelatedGuidelines.length > 0) {
      const hasDataTools = guidelines.some(
        (g) => g.tools?.includes('postgresql-query') || g.tools?.includes('google-sheets')
      )

      if (!hasDataTools) {
        recommendations.push({
          type: 'missing-data-tools',
          title: 'Add Data Tools',
          description: "Your guidelines mention data tasks but don't specify data tools",
          affected_guidelines: dataRelatedGuidelines.length,
          suggested_tools: ['postgresql-query', 'google-sheets'],
          priority: 'high',
        })
      }
    }

    // Check for communication needs
    const communicationGuidelines = guidelines.filter(
      (g) =>
        g.action.toLowerCase().includes('notify') ||
        g.action.toLowerCase().includes('escalate') ||
        g.action.toLowerCase().includes('inform')
    )

    if (communicationGuidelines.length > 0) {
      const hasCommunicationTools = guidelines.some(
        (g) => g.tools?.includes('slack-messaging') || g.tools?.includes('email-sender')
      )

      if (!hasCommunicationTools) {
        recommendations.push({
          type: 'missing-communication-tools',
          title: 'Add Communication Tools',
          description: 'Guidelines mention notifications but lack communication tools',
          affected_guidelines: communicationGuidelines.length,
          suggested_tools: ['slack-messaging', 'email-sender'],
          priority: 'medium',
        })
      }
    }

    setToolRecommendations(recommendations)
  }

  const calculateUsageStats = () => {
    const stats: any = {}

    AVAILABLE_TOOLS.forEach((tool) => {
      const usageCount = guidelines.filter((g) => g.tools?.includes(tool.id)).length
      stats[tool.id] = {
        usage_count: usageCount,
        usage_percentage: guidelines.length > 0 ? (usageCount / guidelines.length) * 100 : 0,
        category: tool.category,
      }
    })

    setToolUsageStats(stats)
  }

  const addToolToGuideline = (guidelineId: string, toolId: string) => {
    const updatedGuidelines = guidelines.map((guideline) => {
      if (guideline.id === guidelineId) {
        const existingTools = guideline.tools || []
        if (!existingTools.includes(toolId)) {
          return {
            ...guideline,
            tools: [...existingTools, toolId],
            updatedAt: new Date().toISOString(),
          }
        }
      }
      return guideline
    })

    onGuidelinesChange?.(updatedGuidelines)
  }

  const createGuidelineFromTool = (tool: any, condition: string, action: string) => {
    const newGuideline = {
      id: `guideline-${Date.now()}`,
      condition,
      action,
      priority: 5,
      category: tool.category,
      tools: [tool.id],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    onGuidelinesChange?.([...guidelines, newGuideline])
  }

  const filteredTools = AVAILABLE_TOOLS.filter((tool) => {
    const matchesSearch =
      !searchQuery ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const getToolIcon = (category: string) => {
    switch (category) {
      case 'ai-services':
        return Code
      case 'communication':
        return MessageSquare
      case 'data-retrieval':
        return Database
      case 'data-management':
        return BarChart3
      case 'development':
        return Code
      case 'productivity':
        return Calendar
      case 'file-operations':
        return FileText
      default:
        return Settings
    }
  }

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'ai-services', label: 'AI Services' },
    { value: 'communication', label: 'Communication' },
    { value: 'data-retrieval', label: 'Data Retrieval' },
    { value: 'data-management', label: 'Data Management' },
    { value: 'development', label: 'Development' },
    { value: 'productivity', label: 'Productivity' },
    { value: 'file-operations', label: 'File Operations' },
  ]

  return (
    <div className='space-y-6'>
      {/* Tool Integration Overview */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Zap className='h-5 w-5' />
            Tool Integration
          </CardTitle>
          <p className='text-muted-foreground text-sm'>
            Connect your guidelines with available tools and services
          </p>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            <div className='text-center'>
              <div className='font-bold text-2xl'>{AVAILABLE_TOOLS.length}</div>
              <div className='text-muted-foreground text-sm'>Available Tools</div>
            </div>
            <div className='text-center'>
              <div className='font-bold text-2xl'>
                {guidelines.filter((g) => g.tools && g.tools.length > 0).length}
              </div>
              <div className='text-muted-foreground text-sm'>Guidelines with Tools</div>
            </div>
            <div className='text-center'>
              <div className='font-bold text-2xl'>{toolRecommendations.length}</div>
              <div className='text-muted-foreground text-sm'>Recommendations</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {toolRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Lightbulb className='h-5 w-5' />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {toolRecommendations.map((rec, index) => (
              <Alert key={index}>
                <Target className='h-4 w-4' />
                <AlertDescription>
                  <div className='flex items-start justify-between'>
                    <div>
                      <div className='font-medium'>{rec.title}</div>
                      <div className='mt-1 text-muted-foreground text-sm'>
                        {rec.description} ({rec.affected_guidelines} guidelines affected)
                      </div>
                      <div className='mt-2 flex flex-wrap gap-1'>
                        {rec.suggested_tools.map((toolId: string) => {
                          const tool = AVAILABLE_TOOLS.find((t) => t.id === toolId)
                          return (
                            <Badge key={toolId} variant='secondary' className='text-xs'>
                              {tool?.name || toolId}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                    <Badge variant={rec.priority === 'high' ? 'destructive' : 'default'}>
                      {rec.priority}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Interface */}
      <Tabs defaultValue='tools' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='tools'>Available Tools</TabsTrigger>
          <TabsTrigger value='usage'>Usage Analysis</TabsTrigger>
          <TabsTrigger value='suggestions'>Smart Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value='tools' className='space-y-4'>
          {/* Search and Filters */}
          <Card>
            <CardContent className='pt-4'>
              <div className='flex flex-col gap-4 sm:flex-row'>
                <div className='relative flex-1'>
                  <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground' />
                  <Input
                    placeholder='Search tools...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='pl-10'
                  />
                </div>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className='w-48'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tools Grid */}
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            {filteredTools.map((tool) => {
              const IconComponent = getToolIcon(tool.category)
              const usageStats = toolUsageStats[tool.id] || { usage_count: 0, usage_percentage: 0 }

              return (
                <Card key={tool.id}>
                  <CardContent className='p-4'>
                    <div className='flex items-start gap-3'>
                      <div className='rounded-lg bg-muted p-2'>
                        <IconComponent className='h-4 w-4' />
                      </div>

                      <div className='flex-1 space-y-2'>
                        <div className='flex items-center justify-between'>
                          <h4 className='font-medium'>{tool.name}</h4>
                          <div className='flex items-center gap-2'>
                            {usageStats.usage_count > 0 && (
                              <Badge variant='secondary' className='text-xs'>
                                {usageStats.usage_count} guideline
                                {usageStats.usage_count !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <p className='text-muted-foreground text-sm'>{tool.description}</p>

                        <div className='text-muted-foreground text-xs'>
                          <strong>Usage:</strong> {tool.usage_guidelines}
                        </div>

                        {/* Quick Actions */}
                        <div className='space-y-2 pt-2'>
                          {tool.common_conditions.slice(0, 2).map((condition, index) => (
                            <div
                              key={index}
                              className='flex items-center justify-between rounded bg-muted/50 p-2 text-xs'
                            >
                              <div>
                                <div className='font-medium'>When: {condition}</div>
                                <div className='text-muted-foreground'>
                                  Then: {tool.recommended_actions[index]}
                                </div>
                              </div>
                              <Button
                                size='sm'
                                variant='ghost'
                                onClick={() =>
                                  createGuidelineFromTool(
                                    tool,
                                    condition,
                                    tool.recommended_actions[index]
                                  )
                                }
                                className='h-6 text-xs'
                              >
                                <Plus className='h-3 w-3' />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value='usage' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <TrendingUp className='h-5 w-5' />
                Tool Usage Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {AVAILABLE_TOOLS.map((tool) => {
                const stats = toolUsageStats[tool.id] || { usage_count: 0, usage_percentage: 0 }
                const IconComponent = getToolIcon(tool.category)

                return (
                  <div
                    key={tool.id}
                    className='flex items-center justify-between rounded border p-3'
                  >
                    <div className='flex items-center gap-3'>
                      <IconComponent className='h-4 w-4' />
                      <div>
                        <div className='font-medium'>{tool.name}</div>
                        <div className='text-muted-foreground text-sm capitalize'>
                          {tool.category}
                        </div>
                      </div>
                    </div>

                    <div className='flex items-center gap-4'>
                      <div className='text-right'>
                        <div className='font-medium'>{stats.usage_count}</div>
                        <div className='text-muted-foreground text-xs'>guidelines</div>
                      </div>
                      <div className='w-20'>
                        <div className='h-2 rounded bg-muted'>
                          <div
                            className='h-2 rounded bg-primary'
                            style={{ width: `${Math.min(stats.usage_percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className='w-12 text-right font-medium text-sm'>
                        {Math.round(stats.usage_percentage)}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='suggestions' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Lightbulb className='h-5 w-5' />
                Smart Suggestions
              </CardTitle>
              <p className='text-muted-foreground text-sm'>
                AI-powered suggestions for improving your tool integration
              </p>
            </CardHeader>
            <CardContent>
              {guidelines.length === 0 ? (
                <div className='py-8 text-center'>
                  <Target className='mx-auto mb-4 h-12 w-12 text-muted-foreground/50' />
                  <h3 className='mb-2 font-medium'>No guidelines to analyze</h3>
                  <p className='text-muted-foreground text-sm'>
                    Create some guidelines first to get intelligent tool suggestions
                  </p>
                </div>
              ) : (
                <div className='space-y-4'>
                  <Alert>
                    <Lightbulb className='h-4 w-4' />
                    <AlertDescription>
                      <div className='space-y-2'>
                        <div className='font-medium'>Optimization Opportunities</div>
                        <ul className='space-y-1 text-sm'>
                          <li>• Consider adding data retrieval tools for analysis guidelines</li>
                          <li>• Communication tools can improve escalation workflows</li>
                          <li>• File operation tools enable document processing capabilities</li>
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    {toolRecommendations.slice(0, 4).map((suggestion, index) => (
                      <div key={index} className='rounded border p-3'>
                        <div className='mb-1 font-medium text-sm'>{suggestion.title}</div>
                        <div className='mb-2 text-muted-foreground text-xs'>
                          {suggestion.description}
                        </div>
                        <div className='flex flex-wrap gap-1'>
                          {suggestion.suggested_tools.map((toolId: string) => {
                            const tool = AVAILABLE_TOOLS.find((t) => t.id === toolId)
                            return (
                              <Badge key={toolId} variant='outline' className='text-xs'>
                                {tool?.name}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
