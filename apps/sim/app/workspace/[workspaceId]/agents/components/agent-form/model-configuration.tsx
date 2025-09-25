/**
 * Model Configuration Form Step
 *
 * Second step of agent creation form covering AI model selection,
 * system prompts, and behavior parameters.
 */

'use client'

import { Brain, Info, MessageSquareText, Settings, Zap } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'

interface ModelConfigurationProps {
  form: UseFormReturn<any>
}

export function ModelConfiguration({ form }: ModelConfigurationProps) {
  const temperature = form.watch('temperature')
  const maxTokens = form.watch('maxTokens')
  const modelProvider = form.watch('modelProvider')

  const getModelOptions = (provider: string) => {
    switch (provider) {
      case 'openai':
        return [
          { value: 'gpt-4', label: 'GPT-4', description: 'Most capable, best for complex tasks' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Fast and efficient GPT-4' },
          {
            value: 'gpt-3.5-turbo',
            label: 'GPT-3.5 Turbo',
            description: 'Fast and cost-effective',
          },
        ]
      case 'anthropic':
        return [
          {
            value: 'claude-3-opus',
            label: 'Claude 3 Opus',
            description: 'Most powerful Claude model',
          },
          {
            value: 'claude-3-sonnet',
            label: 'Claude 3 Sonnet',
            description: 'Balanced performance and speed',
          },
          { value: 'claude-3-haiku', label: 'Claude 3 Haiku', description: 'Fast and efficient' },
        ]
      case 'local':
        return [
          { value: 'llama-2-7b', label: 'Llama 2 7B', description: 'Local open-source model' },
          { value: 'llama-2-13b', label: 'Llama 2 13B', description: 'Larger local model' },
        ]
      default:
        return []
    }
  }

  const getTemperatureDescription = (temp: number) => {
    if (temp <= 20) return 'Very focused and deterministic responses'
    if (temp <= 40) return 'Focused with some variation'
    if (temp <= 60) return 'Balanced creativity and consistency'
    if (temp <= 80) return 'More creative and varied responses'
    return 'Highly creative and unpredictable'
  }

  return (
    <div className='space-y-6'>
      {/* Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Brain className='h-5 w-5' />
            AI Model Selection
          </CardTitle>
          <CardDescription>
            Choose the AI model that will power your agent's intelligence and responses.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <FormField
            control={form.control}
            name='modelProvider'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model Provider</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select AI provider' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='openai'>
                      <div className='flex items-center gap-2'>
                        <div>OpenAI</div>
                        <Badge variant='secondary'>Recommended</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value='anthropic'>Anthropic Claude</SelectItem>
                    <SelectItem value='local'>Local Models</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  OpenAI models are recommended for most use cases due to their reliability and
                  extensive capabilities.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='modelName'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Specific Model</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select model' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {getModelOptions(modelProvider).map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        <div>
                          <div className='font-medium'>{model.label}</div>
                          <div className='text-muted-foreground text-sm'>{model.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <MessageSquareText className='h-5 w-5' />
            System Prompt
          </CardTitle>
          <CardDescription>
            Define your agent's core personality, expertise, and behavioral instructions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name='systemPrompt'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instructions *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='You are a helpful AI assistant specializing in... Your role is to... Always remember to...'
                    rows={8}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Write clear, specific instructions that define how your agent should behave, what
                  expertise it has, and how it should respond to different situations. Be specific
                  about tone, approach, and any constraints.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Alert>
            <Info className='h-4 w-4' />
            <AlertDescription>
              <strong>Tip:</strong> Include specific examples of good responses, mention any tools
              the agent should prefer, and specify how to handle situations where the agent doesn't
              know something.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Behavior Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Settings className='h-5 w-5' />
            Behavior Parameters
          </CardTitle>
          <CardDescription>
            Fine-tune how creative, focused, and verbose your agent's responses should be.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <FormField
            control={form.control}
            name='temperature'
            render={({ field }) => (
              <FormItem>
                <div className='flex items-center justify-between'>
                  <FormLabel>Creativity (Temperature)</FormLabel>
                  <Badge variant='outline'>{temperature}%</Badge>
                </div>
                <FormControl>
                  <Slider
                    value={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                    max={100}
                    min={0}
                    step={5}
                    className='w-full'
                  />
                </FormControl>
                <FormDescription>{getTemperatureDescription(temperature)}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='maxTokens'
            render={({ field }) => (
              <FormItem>
                <div className='flex items-center justify-between'>
                  <FormLabel>Max Response Length</FormLabel>
                  <Badge variant='outline'>{maxTokens} tokens</Badge>
                </div>
                <FormControl>
                  <Slider
                    value={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                    max={4000}
                    min={100}
                    step={100}
                    className='w-full'
                  />
                </FormControl>
                <FormDescription>
                  Controls the maximum length of the agent's responses. Higher values allow for more
                  detailed answers but use more resources.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='rounded-lg border bg-muted/50 p-4'>
            <div className='mb-2 flex items-center gap-2'>
              <Zap className='h-4 w-4 text-blue-500' />
              <span className='font-medium text-sm'>Configuration Preview</span>
            </div>
            <div className='space-y-1 text-muted-foreground text-sm'>
              <div>Model: {form.watch('modelName') || 'Not selected'}</div>
              <div>Creativity: {getTemperatureDescription(temperature)}</div>
              <div>Max length: ~{Math.round(maxTokens * 0.75)} words</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
