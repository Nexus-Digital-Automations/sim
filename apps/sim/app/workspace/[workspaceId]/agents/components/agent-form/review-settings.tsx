/**
 * Review Settings Form Step
 *
 * Final step of agent creation form for reviewing all configuration
 * before creating the agent.
 */

'use client'

import { AlertTriangle, Bot, Brain, CheckCircle2, Info, Lightbulb, Zap } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface ReviewSettingsProps {
  form: UseFormReturn<any>
}

// Mock tool data for display - in real implementation, this would come from the registry
const TOOL_NAMES: Record<string, string> = {
  'openai-completion': 'OpenAI Text Generation',
  'github-integration': 'GitHub Operations',
  'slack-messaging': 'Slack Integration',
  'postgresql-query': 'PostgreSQL Database',
  'google-sheets': 'Google Sheets',
  'email-sender': 'Email Notifications',
  'calendar-integration': 'Calendar Management',
  'file-operations': 'File Management',
}

export function ReviewSettings({ form }: ReviewSettingsProps) {
  const formData = form.getValues()

  const getModelDescription = (provider: string, model: string) => {
    const descriptions: Record<string, Record<string, string>> = {
      openai: {
        'gpt-4': 'Most capable OpenAI model, best for complex tasks',
        'gpt-4-turbo': 'Fast and efficient GPT-4 variant',
        'gpt-3.5-turbo': 'Fast and cost-effective model',
      },
      anthropic: {
        'claude-3-opus': 'Most powerful Claude model',
        'claude-3-sonnet': 'Balanced performance and speed',
        'claude-3-haiku': 'Fast and efficient Claude model',
      },
      local: {
        'llama-2-7b': 'Local 7B parameter model',
        'llama-2-13b': 'Local 13B parameter model',
      },
    }
    return descriptions[provider]?.[model] || 'Custom model configuration'
  }

  const getTemperatureDescription = (temp: number) => {
    if (temp <= 20) return 'Very focused'
    if (temp <= 40) return 'Focused'
    if (temp <= 60) return 'Balanced'
    if (temp <= 80) return 'Creative'
    return 'Highly creative'
  }

  const getConversationStyleDescription = (style: string) => {
    const styles: Record<string, string> = {
      professional: 'Formal, business-appropriate tone',
      friendly: 'Warm and approachable',
      casual: 'Relaxed and conversational',
      technical: 'Precise, technical language',
    }
    return styles[style] || style
  }

  const getReadinessScore = () => {
    let score = 0
    let maxScore = 0

    // Required fields
    maxScore += 20
    if (formData.name?.trim()) score += 20

    maxScore += 20
    if (formData.systemPrompt?.trim()) score += 20

    maxScore += 20
    if (formData.modelName) score += 20

    // Optional but recommended
    maxScore += 15
    if (formData.description?.trim()) score += 15

    maxScore += 15
    if (formData.guidelines?.length > 0) score += 15

    maxScore += 10
    if (formData.tools?.length > 0) score += 10

    return Math.round((score / maxScore) * 100)
  }

  const readinessScore = getReadinessScore()
  const isReady = readinessScore >= 80

  return (
    <div className='space-y-6'>
      {/* Readiness Check */}
      <Card
        className={
          isReady ? 'border-green-200 bg-green-50/50' : 'border-yellow-200 bg-yellow-50/50'
        }
      >
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            {isReady ? (
              <CheckCircle2 className='h-5 w-5 text-green-500' />
            ) : (
              <AlertTriangle className='h-5 w-5 text-yellow-500' />
            )}
            Agent Readiness: {readinessScore}%
          </CardTitle>
          <CardDescription>
            {isReady
              ? 'Your agent is ready to be created and will function well.'
              : 'Your agent can be created but may benefit from additional configuration.'}
          </CardDescription>
        </CardHeader>
        {!isReady && (
          <CardContent>
            <Alert>
              <Info className='h-4 w-4' />
              <AlertDescription>
                Consider adding guidelines and tools to make your agent more capable and useful.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Agent Identity */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Bot className='h-5 w-5' />
            Agent Identity
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div>
            <div className='mb-1 font-medium text-muted-foreground text-sm'>Name</div>
            <div className='font-semibold'>{formData.name || 'Unnamed Agent'}</div>
          </div>

          {formData.description && (
            <div>
              <div className='mb-1 font-medium text-muted-foreground text-sm'>Description</div>
              <div className='text-sm'>{formData.description}</div>
            </div>
          )}

          <div className='flex items-center gap-4'>
            <div>
              <div className='mb-1 font-medium text-muted-foreground text-sm'>Style</div>
              <Badge variant='secondary' className='capitalize'>
                {formData.conversationStyle}
              </Badge>
            </div>

            <div>
              <div className='mb-1 font-medium text-muted-foreground text-sm'>Proactive</div>
              <Badge variant={formData.allowProactiveMessages ? 'default' : 'secondary'}>
                {formData.allowProactiveMessages ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Brain className='h-5 w-5' />
            AI Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div>
              <div className='mb-1 font-medium text-muted-foreground text-sm'>Model</div>
              <div className='font-semibold'>{formData.modelName}</div>
              <div className='text-muted-foreground text-xs'>
                {getModelDescription(formData.modelProvider, formData.modelName)}
              </div>
            </div>

            <div>
              <div className='mb-1 font-medium text-muted-foreground text-sm'>Provider</div>
              <Badge variant='outline' className='capitalize'>
                {formData.modelProvider}
              </Badge>
            </div>

            <div>
              <div className='mb-1 font-medium text-muted-foreground text-sm'>Creativity</div>
              <div className='flex items-center gap-2'>
                <span className='font-semibold'>{formData.temperature}%</span>
                <span className='text-muted-foreground text-sm'>
                  ({getTemperatureDescription(formData.temperature)})
                </span>
              </div>
            </div>

            <div>
              <div className='mb-1 font-medium text-muted-foreground text-sm'>Max Response</div>
              <div className='flex items-center gap-2'>
                <span className='font-semibold'>{formData.maxTokens} tokens</span>
                <span className='text-muted-foreground text-sm'>
                  (~{Math.round(formData.maxTokens * 0.75)} words)
                </span>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <div className='mb-2 font-medium text-muted-foreground text-sm'>System Prompt</div>
            <div className='max-h-32 overflow-y-auto rounded-md bg-muted p-3 text-sm'>
              {formData.systemPrompt || 'No system prompt defined'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Lightbulb className='h-5 w-5' />
            Guidelines ({formData.guidelines?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formData.guidelines?.length > 0 ? (
            <div className='space-y-3'>
              {formData.guidelines.map((guideline: any, index: number) => (
                <div key={index} className='rounded-lg border bg-muted/30 p-3'>
                  <div className='mb-2 flex items-center gap-2'>
                    <Badge variant='outline' className='text-xs'>
                      #{index + 1}
                    </Badge>
                    <Badge variant='secondary' className='text-xs'>
                      Priority {guideline.priority}
                    </Badge>
                  </div>
                  <div className='space-y-1 text-sm'>
                    <div>
                      <span className='font-medium text-muted-foreground'>When:</span>{' '}
                      {guideline.condition}
                    </div>
                    <div>
                      <span className='font-medium text-muted-foreground'>Then:</span>{' '}
                      {guideline.action}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='py-4 text-center text-muted-foreground'>
              <Lightbulb className='mx-auto mb-2 h-8 w-8 opacity-50' />
              <div className='text-sm'>No guidelines defined</div>
              <div className='text-xs'>Your agent will use default behavior</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tools */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Zap className='h-5 w-5' />
            Tools & Integrations ({formData.tools?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formData.tools?.length > 0 ? (
            <div className='flex flex-wrap gap-2'>
              {formData.tools.map((toolId: string) => (
                <Badge key={toolId} variant='secondary'>
                  {TOOL_NAMES[toolId] || toolId}
                </Badge>
              ))}
            </div>
          ) : (
            <div className='py-4 text-center text-muted-foreground'>
              <Zap className='mx-auto mb-2 h-8 w-8 opacity-50' />
              <div className='text-sm'>No tools selected</div>
              <div className='text-xs'>Your agent will work with conversation only</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className='pt-6'>
          <div className='flex gap-3'>
            <CheckCircle2 className='mt-0.5 h-5 w-5 flex-shrink-0 text-green-500' />
            <div className='space-y-2 text-sm'>
              <div className='font-medium'>Ready to create your agent</div>
              <div className='text-muted-foreground'>
                Your agent "{formData.name}" will be created with the configuration above. You can
                modify these settings anytime after creation from the agent's configuration page.
              </div>
              {!isReady && (
                <div className='text-xs text-yellow-700'>
                  Note: Consider adding guidelines and tools to improve your agent's capabilities.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
