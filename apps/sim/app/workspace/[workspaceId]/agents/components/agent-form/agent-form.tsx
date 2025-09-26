/**
 * Agent Form Component
 *
 * Comprehensive form for creating and editing agents with multi-step wizard,
 * real-time validation, and integration with Parlant services.
 */

'use client'

import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { Progress } from '@/components/ui/progress'
import { useAgent, useCreateAgent } from '../../hooks/use-agents'
import { BasicSettings } from './basic-settings'
import { GuidelinesSettings } from './guidelines-settings'
import { ModelConfiguration } from './model-configuration'
import { ReviewSettings } from './review-settings'
import { ToolsSettings } from './tools-settings'

// Form validation schema
const agentFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Agent name is required')
    .max(100, 'Name must be less than 100 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  systemPrompt: z
    .string()
    .min(1, 'System prompt is required')
    .max(5000, 'System prompt must be less than 5000 characters'),
  modelProvider: z.enum(['openai', 'anthropic', 'local']),
  modelName: z.string().min(1, 'Model name is required'),
  temperature: z.number().min(0).max(100),
  maxTokens: z.number().min(100).max(8000),
  guidelines: z
    .array(
      z.object({
        condition: z.string().min(1, 'Condition is required'),
        action: z.string().min(1, 'Action is required'),
        priority: z.number().min(1).max(10).default(5),
      })
    )
    .default([]),
  tools: z.array(z.string()).default([]),
  allowProactiveMessages: z.boolean().default(false),
  conversationStyle: z
    .enum(['professional', 'friendly', 'casual', 'technical'])
    .default('professional'),
})

type AgentFormData = z.infer<typeof agentFormSchema>

interface AgentFormProps {
  workspaceId: string
  agentId?: string
  duplicateFromId?: string
  templateId?: string
}

const STEPS = [
  { id: 'basic', title: 'Basic Information', description: 'Name, description, and basic settings' },
  { id: 'model', title: 'Model Configuration', description: 'AI model and behavior settings' },
  { id: 'guidelines', title: 'Guidelines', description: 'Define agent behavior and rules' },
  { id: 'tools', title: 'Tools & Integrations', description: 'Connect tools and services' },
  { id: 'review', title: 'Review & Create', description: 'Review settings and create agent' },
]

export function AgentForm({ workspaceId, agentId, duplicateFromId, templateId }: AgentFormProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createAgent = useCreateAgent(workspaceId)
  const { data: duplicateAgent } = useAgent(workspaceId, duplicateFromId || '')

  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: '',
      description: '',
      systemPrompt:
        'You are a helpful AI assistant. Follow the guidelines provided and use available tools to assist users effectively.',
      modelProvider: 'openai',
      modelName: 'gpt-4',
      temperature: 70,
      maxTokens: 2000,
      guidelines: [],
      tools: [],
      allowProactiveMessages: false,
      conversationStyle: 'professional',
    },
  })

  // Load data for duplication
  useEffect(() => {
    if (duplicateAgent) {
      form.reset({
        name: `${duplicateAgent.name} (Copy)`,
        description: duplicateAgent.description,
        systemPrompt: duplicateAgent.config?.system_prompt || form.getValues('systemPrompt'),
        modelProvider: 'openai', // Default since we don't have this in the Agent type
        modelName: duplicateAgent.config?.model || 'gpt-4',
        temperature: duplicateAgent.config?.temperature || 70,
        maxTokens: duplicateAgent.config?.max_turns || 2000,
        guidelines:
          duplicateAgent.guidelines?.map((g) => ({
            condition: g.condition,
            action: g.action,
            priority: g.priority || 5,
          })) || [],
        tools: duplicateAgent.tools?.map((t) => t.toolId) || [],
        allowProactiveMessages: false,
        conversationStyle: 'professional',
      })
    }
  }, [duplicateAgent, form])

  const onSubmit = async (data: AgentFormData) => {
    setIsSubmitting(true)
    try {
      const agentData = {
        name: data.name,
        description: data.description,
        workspace_id: workspaceId,
        guidelines: data.guidelines,
        config: {
          system_prompt: data.systemPrompt,
          model: data.modelName,
          temperature: data.temperature / 100, // Convert percentage to decimal
          max_turns: data.maxTokens,
        },
      }

      const newAgent = await createAgent.mutateAsync(agentData)
      router.push(`/workspace/${workspaceId}/agents/${newAgent.id}`)
    } catch (error) {
      console.error('Error creating agent:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = async () => {
    const currentStepId = STEPS[currentStep].id
    let fieldsToValidate: (keyof AgentFormData)[] = []

    switch (currentStepId) {
      case 'basic':
        fieldsToValidate = ['name', 'description']
        break
      case 'model':
        fieldsToValidate = [
          'systemPrompt',
          'modelProvider',
          'modelName',
          'temperature',
          'maxTokens',
        ]
        break
      case 'guidelines':
        fieldsToValidate = ['guidelines']
        break
      case 'tools':
        fieldsToValidate = ['tools']
        break
    }

    const isValid = await form.trigger(fieldsToValidate)
    if (isValid && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const progress = ((currentStep + 1) / STEPS.length) * 100

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'basic':
        return <BasicSettings form={form} />
      case 'model':
        return <ModelConfiguration form={form} />
      case 'guidelines':
        return <GuidelinesSettings form={form} workspaceId={workspaceId} />
      case 'tools':
        return <ToolsSettings form={form} workspaceId={workspaceId} />
      case 'review':
        return <ReviewSettings form={form} />
      default:
        return null
    }
  }

  return (
    <div className='space-y-6'>
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className='mb-4 flex items-center justify-between'>
            <div>
              <CardTitle className='text-lg'>{STEPS[currentStep].title}</CardTitle>
              <p className='text-muted-foreground text-sm'>{STEPS[currentStep].description}</p>
            </div>
            <Badge variant='outline'>
              Step {currentStep + 1} of {STEPS.length}
            </Badge>
          </div>
          <Progress value={progress} className='w-full' />
        </CardHeader>
      </Card>

      {/* Step Navigation */}
      <div className='flex justify-center'>
        <div className='flex items-center space-x-2'>
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${index < STEPS.length - 1 ? 'mr-4' : ''}`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full font-medium text-sm ${
                  index === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : index < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {index + 1}
              </div>
              <span
                className={`ml-2 text-sm ${
                  index === currentStep ? 'font-medium' : 'text-muted-foreground'
                }`}
              >
                {step.title}
              </span>
              {index < STEPS.length - 1 && (
                <ChevronRight className='ml-4 h-4 w-4 text-muted-foreground' />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <Card>
            <CardContent className='p-6'>{renderStepContent()}</CardContent>

            <CardFooter className='flex justify-between'>
              <Button
                type='button'
                variant='outline'
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                <ChevronLeft className='mr-2 h-4 w-4' />
                Previous
              </Button>

              <div className='flex space-x-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => router.push(`/workspace/${workspaceId}/agents`)}
                >
                  Cancel
                </Button>

                {currentStep === STEPS.length - 1 ? (
                  <Button type='submit' disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className='mr-2 h-4 w-4' />
                        Create Agent
                      </>
                    )}
                  </Button>
                ) : (
                  <Button type='button' onClick={nextStep}>
                    Next
                    <ChevronRight className='ml-2 h-4 w-4' />
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </form>
      </Form>

      {/* Form Validation Errors */}
      {Object.keys(form.formState.errors).length > 0 && (
        <Alert variant='destructive'>
          <AlertDescription>Please fix the errors above before continuing.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
