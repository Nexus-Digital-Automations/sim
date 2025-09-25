/**
 * Tools Settings Form Step
 *
 * Fourth step of agent creation form for selecting and configuring
 * tools and integrations using the Universal Tool Adapter system.
 */

'use client'

import { useEffect, useState } from 'react'
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Code,
  Database,
  FileText,
  Info,
  Mail,
  MessageSquare,
  Search,
  Settings,
  Zap,
} from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ToolsSettingsProps {
  form: UseFormReturn<any>
  workspaceId: string
}

// Mock tool data - in real implementation, this would come from the tool adapter registry
const AVAILABLE_TOOLS = [
  {
    id: 'openai-completion',
    name: 'OpenAI Text Generation',
    description: 'Generate text using OpenAI models for various tasks',
    category: 'ai-services',
    icon: Code,
    permission_level: 'workspace',
    usage_guidelines: 'Use for content generation, text analysis, and creative writing tasks',
  },
  {
    id: 'github-integration',
    name: 'GitHub Operations',
    description: 'Create issues, manage repositories, and track development',
    category: 'development',
    icon: Code,
    permission_level: 'workspace',
    usage_guidelines: 'Use for development workflows and code management',
  },
  {
    id: 'slack-messaging',
    name: 'Slack Integration',
    description: 'Send messages and interact with Slack workspaces',
    category: 'communication',
    icon: MessageSquare,
    permission_level: 'workspace',
    usage_guidelines: 'Use for team notifications and communication workflows',
  },
  {
    id: 'postgresql-query',
    name: 'PostgreSQL Database',
    description: 'Query and analyze data from PostgreSQL databases',
    category: 'data-retrieval',
    icon: Database,
    permission_level: 'admin',
    usage_guidelines: 'Use for data analysis and reporting tasks',
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Read and write data to Google Sheets',
    category: 'data-management',
    icon: BarChart3,
    permission_level: 'workspace',
    usage_guidelines: 'Use for data collection and simple reporting',
  },
  {
    id: 'email-sender',
    name: 'Email Notifications',
    description: 'Send email notifications and updates',
    category: 'communication',
    icon: Mail,
    permission_level: 'workspace',
    usage_guidelines: 'Use for automated notifications and updates',
  },
  {
    id: 'calendar-integration',
    name: 'Calendar Management',
    description: 'Schedule meetings and manage calendar events',
    category: 'productivity',
    icon: Calendar,
    permission_level: 'workspace',
    usage_guidelines: 'Use for scheduling and time management tasks',
  },
  {
    id: 'file-operations',
    name: 'File Management',
    description: 'Read, write, and manage files and documents',
    category: 'file-operations',
    icon: FileText,
    permission_level: 'workspace',
    usage_guidelines: 'Use for document processing and file management',
  },
]

const TOOL_CATEGORIES = [
  { id: 'all', name: 'All Tools', icon: Settings },
  { id: 'ai-services', name: 'AI Services', icon: Zap },
  { id: 'communication', name: 'Communication', icon: MessageSquare },
  { id: 'data-retrieval', name: 'Data & Analytics', icon: Database },
  { id: 'development', name: 'Development', icon: Code },
  { id: 'productivity', name: 'Productivity', icon: Calendar },
  { id: 'file-operations', name: 'File Operations', icon: FileText },
]

export function ToolsSettings({ form, workspaceId }: ToolsSettingsProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [filteredTools, setFilteredTools] = useState(AVAILABLE_TOOLS)

  const selectedTools = form.watch('tools') || []

  useEffect(() => {
    let filtered = AVAILABLE_TOOLS

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((tool) => tool.category === selectedCategory)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (tool) =>
          tool.name.toLowerCase().includes(query) ||
          tool.description.toLowerCase().includes(query) ||
          tool.usage_guidelines.toLowerCase().includes(query)
      )
    }

    setFilteredTools(filtered)
  }, [searchQuery, selectedCategory])

  const toggleTool = (toolId: string) => {
    const currentTools = form.getValues('tools') || []
    const isSelected = currentTools.includes(toolId)

    if (isSelected) {
      form.setValue(
        'tools',
        currentTools.filter((id: string) => id !== toolId)
      )
    } else {
      form.setValue('tools', [...currentTools, toolId])
    }
  }

  const getToolIcon = (category: string) => {
    const categoryData = TOOL_CATEGORIES.find((cat) => cat.id === category)
    return categoryData?.icon || Settings
  }

  return (
    <div className='space-y-6'>
      {/* Tools Introduction */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Zap className='h-5 w-5' />
            Tools & Integrations
          </CardTitle>
          <CardDescription>
            Select the tools and services your agent can use to complete tasks. These integrations
            extend your agent's capabilities beyond conversation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className='h-4 w-4' />
            <AlertDescription>
              Tools are automatically made available to your agent when relevant to the
              conversation. The agent will use its guidelines to determine when and how to use each
              tool appropriately.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className='pt-6'>
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
                {TOOL_CATEGORIES.map((category) => {
                  const IconComponent = category.icon
                  return (
                    <SelectItem key={category.id} value={category.id}>
                      <div className='flex items-center gap-2'>
                        <IconComponent className='h-4 w-4' />
                        {category.name}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Selected Tools Summary */}
      {selectedTools.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <CheckCircle2 className='h-5 w-5 text-green-500' />
              Selected Tools ({selectedTools.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex flex-wrap gap-2'>
              {selectedTools.map((toolId: string) => {
                const tool = AVAILABLE_TOOLS.find((t) => t.id === toolId)
                if (!tool) return null

                const IconComponent = getToolIcon(tool.category)
                return (
                  <Badge
                    key={toolId}
                    variant='secondary'
                    className='flex items-center gap-1 px-3 py-1'
                  >
                    <IconComponent className='h-3 w-3' />
                    {tool.name}
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='ml-1 h-4 w-4 p-0'
                      onClick={() => toggleTool(toolId)}
                    >
                      ×
                    </Button>
                  </Badge>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Available Tools</CardTitle>
          <CardDescription>
            Choose from {filteredTools.length} available tools and integrations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            {filteredTools.map((tool) => {
              const IconComponent = getToolIcon(tool.category)
              const isSelected = selectedTools.includes(tool.id)

              return (
                <Card
                  key={tool.id}
                  className={`cursor-pointer transition-all ${
                    isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => toggleTool(tool.id)}
                >
                  <CardContent className='p-4'>
                    <div className='flex items-start gap-3'>
                      <div
                        className={`rounded-lg p-2 ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}
                      >
                        <IconComponent className='h-4 w-4' />
                      </div>

                      <div className='min-w-0 flex-1'>
                        <div className='mb-1 flex items-center gap-2'>
                          <h3 className='font-medium text-sm'>{tool.name}</h3>
                          {isSelected && <CheckCircle2 className='h-4 w-4 text-green-500' />}
                        </div>

                        <p className='mb-2 text-muted-foreground text-xs'>{tool.description}</p>

                        <div className='mb-2 flex items-center gap-2'>
                          <Badge variant='outline' className='text-xs'>
                            {TOOL_CATEGORIES.find((cat) => cat.id === tool.category)?.name}
                          </Badge>
                          <Badge
                            variant={
                              tool.permission_level === 'admin' ? 'destructive' : 'secondary'
                            }
                            className='text-xs'
                          >
                            {tool.permission_level}
                          </Badge>
                        </div>

                        <p className='text-muted-foreground text-xs'>
                          <strong>Usage:</strong> {tool.usage_guidelines}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredTools.length === 0 && (
            <div className='py-8 text-center text-muted-foreground'>
              <Search className='mx-auto mb-4 h-12 w-12 text-muted-foreground/50' />
              <h3 className='mb-2 font-medium'>No tools found</h3>
              <p className='text-sm'>
                Try adjusting your search or selecting a different category.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tools Configuration Tips */}
      <Card>
        <CardContent className='pt-6'>
          <div className='flex gap-3'>
            <Info className='mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500' />
            <div className='space-y-2 text-sm'>
              <div className='font-medium'>Tool Integration Tips:</div>
              <ul className='list-inside list-disc space-y-1 text-muted-foreground'>
                <li>Start with essential tools - you can always add more later</li>
                <li>Consider your agent's primary use cases when selecting tools</li>
                <li>Tools marked as "admin" require additional permissions</li>
                <li>
                  Your agent will automatically choose appropriate tools based on the conversation
                  context
                </li>
                <li>
                  Each tool comes with usage guidelines that help the agent use it effectively
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
