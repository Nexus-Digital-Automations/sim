'use client'

import { useEffect, useState } from 'react'
import { Bot, Info, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { createLogger } from '@/lib/logs/console/logger'
import { useAgentManagementStore } from '@/stores/agents'
import type { AgentConfiguration, CreateAgentRequest } from '@/stores/agents/types'

const logger = createLogger('CreateAgentModal')

interface CreateAgentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAgentCreated?: (agent: any) => void
}

const DEFAULT_CONFIGURATION: Partial<AgentConfiguration> = {
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt:
    'You are a helpful AI assistant. Be concise, accurate, and friendly in your responses.',
  toolsEnabled: true,
  availableTools: [],
  knowledgeBaseIds: [],
  responseFormat: 'text',
  personality: {
    tone: 'professional',
    verbosity: 'detailed',
    style: 'Clear and direct communication style with helpful explanations.',
  },
}

const AVAILABLE_MODELS = [
  {
    value: 'claude-3-5-sonnet-20241022',
    label: 'Claude 3.5 Sonnet',
    description: 'Most capable model for complex tasks',
  },
  {
    value: 'claude-3-5-haiku-20241022',
    label: 'Claude 3.5 Haiku',
    description: 'Fast and efficient for simpler tasks',
  },
  { value: 'gpt-4o', label: 'GPT-4o', description: "OpenAI's most advanced model" },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Faster and more cost-effective' },
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

const TOOLTIPS = {
  temperature:
    'Controls randomness in responses. Higher values (0.8-1.0) are more creative, lower values (0.1-0.3) are more focused.',
  maxTokens: 'Maximum number of tokens the agent can use in a single response.',
  systemPrompt: 'The core instructions that define how your agent behaves and responds.',
  toolsEnabled: 'Allow the agent to use tools like web search, calculations, and file operations.',
  personality: 'Define the communication style and approach of your agent.',
}

export function CreateAgentModal({ open, onOpenChange, onAgentCreated }: CreateAgentModalProps) {
  const { createAgent, isCreatingAgent, error, clearError } = useAgentManagementStore()

  // Form state
  const [formData, setFormData] = useState<CreateAgentRequest>({
    name: '',
    description: '',
    configuration: DEFAULT_CONFIGURATION,
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        description: '',
        configuration: DEFAULT_CONFIGURATION,
      })
      setFormErrors({})
      clearError()
    }
  }, [open, clearError])

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = 'Agent name is required'
    } else if (formData.name.length < 2) {
      errors.name = 'Agent name must be at least 2 characters'
    } else if (formData.name.length > 100) {
      errors.name = 'Agent name must be less than 100 characters'
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required'
    } else if (formData.description.length > 500) {
      errors.description = 'Description must be less than 500 characters'
    }

    if (!formData.configuration.systemPrompt?.trim()) {
      errors.systemPrompt = 'System prompt is required'
    } else if (formData.configuration.systemPrompt.length > 2000) {
      errors.systemPrompt = 'System prompt must be less than 2000 characters'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      const agent = await createAgent(formData)

      logger.info('Agent created successfully:', { agentId: agent.id, name: agent.name })
      onAgentCreated?.(agent)
      onOpenChange(false)
    } catch (error) {
      logger.error('Failed to create agent:', error)
      // Error is handled by the store
    }
  }

  const updateConfiguration = (updates: Partial<AgentConfiguration>) => {
    setFormData((prev) => ({
      ...prev,
      configuration: { ...prev.configuration, ...updates },
    }))
  }

  const updatePersonality = (updates: Partial<AgentConfiguration['personality']>) => {
    setFormData((prev) => ({
      ...prev,
      configuration: {
        ...prev.configuration,
        personality: { ...prev.configuration.personality!, ...updates },
      },
    }))
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className='max-h-[80vh] overflow-y-auto rounded-[10px] sm:max-w-2xl'>
        <AlertDialogHeader>
          <AlertDialogTitle className='flex items-center gap-2'>
            <Bot className='h-5 w-5' />
            Create New Agent
          </AlertDialogTitle>
          <AlertDialogDescription>
            Create a conversational AI agent that can interact with users and execute workflows.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className='space-y-6 py-4'>
          {/* Basic Information */}
          <div className='space-y-4'>
            <h3 className='font-medium text-sm'>Basic Information</h3>

            <div className='space-y-2'>
              <Label htmlFor='agent-name' className='font-normal'>
                Agent Name
              </Label>
              <Input
                id='agent-name'
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder='e.g., Customer Support Assistant'
                className={`h-9 rounded-[8px] ${formErrors.name ? 'border-red-500' : ''}`}
                maxLength={100}
              />
              {formErrors.name && <p className='text-red-600 text-sm'>{formErrors.name}</p>}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='agent-description' className='font-normal'>
                Description
              </Label>
              <Textarea
                id='agent-description'
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder='Describe what this agent does and how it helps users...'
                className={`min-h-[80px] rounded-[8px] ${formErrors.description ? 'border-red-500' : ''}`}
                maxLength={500}
              />
              {formErrors.description && (
                <p className='text-red-600 text-sm'>{formErrors.description}</p>
              )}
              <p className='text-muted-foreground text-xs'>
                {formData.description.length}/500 characters
              </p>
            </div>
          </div>

          {/* Model Configuration */}
          <div className='space-y-4'>
            <h3 className='font-medium text-sm'>Model Configuration</h3>

            <div className='space-y-2'>
              <Label htmlFor='model-select' className='font-normal'>
                Language Model
              </Label>
              <Select
                value={formData.configuration.model}
                onValueChange={(value) => updateConfiguration({ model: value })}
              >
                <SelectTrigger id='model-select' className='h-9 rounded-[8px]'>
                  <SelectValue placeholder='Select a model' />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      <div>
                        <div className='font-medium'>{model.label}</div>
                        <div className='text-muted-foreground text-xs'>{model.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center gap-2'>
                <Label htmlFor='temperature-slider' className='font-normal'>
                  Temperature: {formData.configuration.temperature}
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant='ghost' size='sm' className='h-7 p-1 text-gray-500'>
                      <Info className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side='top' className='max-w-[300px] p-3'>
                    <p className='text-sm'>{TOOLTIPS.temperature}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Slider
                id='temperature-slider'
                min={0}
                max={1}
                step={0.1}
                value={[formData.configuration.temperature!]}
                onValueChange={([value]) => updateConfiguration({ temperature: value })}
                className='w-full'
              />
            </div>

            <div className='space-y-2'>
              <div className='flex items-center gap-2'>
                <Label htmlFor='max-tokens' className='font-normal'>
                  Max Tokens
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant='ghost' size='sm' className='h-7 p-1 text-gray-500'>
                      <Info className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side='top' className='max-w-[300px] p-3'>
                    <p className='text-sm'>{TOOLTIPS.maxTokens}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select
                value={formData.configuration.maxTokens?.toString()}
                onValueChange={(value) =>
                  updateConfiguration({ maxTokens: Number.parseInt(value) })
                }
              >
                <SelectTrigger id='max-tokens' className='h-9 rounded-[8px]'>
                  <SelectValue placeholder='Select token limit' />
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

          {/* System Prompt */}
          <div className='space-y-4'>
            <h3 className='font-medium text-sm'>Behavior</h3>

            <div className='space-y-2'>
              <div className='flex items-center gap-2'>
                <Label htmlFor='system-prompt' className='font-normal'>
                  System Prompt
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant='ghost' size='sm' className='h-7 p-1 text-gray-500'>
                      <Info className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side='top' className='max-w-[300px] p-3'>
                    <p className='text-sm'>{TOOLTIPS.systemPrompt}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                id='system-prompt'
                value={formData.configuration.systemPrompt}
                onChange={(e) => updateConfiguration({ systemPrompt: e.target.value })}
                placeholder='Define how your agent should behave, its role, and any specific instructions...'
                className={`min-h-[100px] rounded-[8px] ${formErrors.systemPrompt ? 'border-red-500' : ''}`}
                maxLength={2000}
              />
              {formErrors.systemPrompt && (
                <p className='text-red-600 text-sm'>{formErrors.systemPrompt}</p>
              )}
              <p className='text-muted-foreground text-xs'>
                {formData.configuration.systemPrompt?.length || 0}/2000 characters
              </p>
            </div>

            <div className='space-y-2'>
              <Label className='font-normal'>Personality</Label>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='tone-select' className='text-muted-foreground text-xs'>
                    Tone
                  </Label>
                  <Select
                    value={formData.configuration.personality?.tone}
                    onValueChange={(value: any) => updatePersonality({ tone: value })}
                  >
                    <SelectTrigger id='tone-select' className='h-9 rounded-[8px]'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='verbosity-select' className='text-muted-foreground text-xs'>
                    Verbosity
                  </Label>
                  <Select
                    value={formData.configuration.personality?.verbosity}
                    onValueChange={(value: any) => updatePersonality({ verbosity: value })}
                  >
                    <SelectTrigger id='verbosity-select' className='h-9 rounded-[8px]'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VERBOSITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='style-input' className='text-muted-foreground text-xs'>
                  Communication Style
                </Label>
                <Input
                  id='style-input'
                  value={formData.configuration.personality?.style}
                  onChange={(e) => updatePersonality({ style: e.target.value })}
                  placeholder='e.g., Clear and direct communication with helpful examples'
                  className='h-9 rounded-[8px]'
                />
              </div>
            </div>
          </div>

          {/* Tools & Capabilities */}
          <div className='space-y-4'>
            <h3 className='font-medium text-sm'>Capabilities</h3>

            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Label htmlFor='tools-enabled' className='font-normal'>
                  Enable Tools
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant='ghost' size='sm' className='h-7 p-1 text-gray-500'>
                      <Info className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side='top' className='max-w-[300px] p-3'>
                    <p className='text-sm'>{TOOLTIPS.toolsEnabled}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                id='tools-enabled'
                checked={formData.configuration.toolsEnabled}
                onCheckedChange={(checked) => updateConfiguration({ toolsEnabled: checked })}
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'>
              {error}
            </div>
          )}
        </div>

        <AlertDialogFooter className='flex gap-2'>
          <AlertDialogCancel
            className='h-9 rounded-[8px]'
            onClick={() => onOpenChange(false)}
            disabled={isCreatingAgent}
          >
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={handleSubmit}
            className='h-9 rounded-[8px] bg-primary text-white hover:bg-primary/90'
            disabled={isCreatingAgent || !formData.name.trim() || !formData.description.trim()}
          >
            {isCreatingAgent && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Create Agent
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
