/**
 * Guidelines Settings Form Step
 *
 * Third step of agent creation form for defining agent guidelines -
 * the core behavior rules that govern how the agent responds.
 */

'use client'

import { useState } from 'react'
import { AlertCircle, ChevronDown, ChevronUp, Copy, Lightbulb, Plus, Trash2 } from 'lucide-react'
import { type UseFormReturn, useFieldArray } from 'react-hook-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'

interface GuidelinesSettingsProps {
  form: UseFormReturn<any>
  workspaceId: string
}

const GUIDELINE_TEMPLATES = [
  {
    id: 'greeting',
    name: 'Greeting Response',
    condition: 'the user greets you or says hello',
    action: 'respond with a friendly greeting and ask how you can help them today',
    priority: 8,
  },
  {
    id: 'unclear',
    name: 'Handle Unclear Requests',
    condition: "the user's request is unclear or ambiguous",
    action: 'ask clarifying questions to better understand what they need',
    priority: 7,
  },
  {
    id: 'expertise',
    name: 'Stay in Expertise',
    condition: 'the user asks about something outside your expertise',
    action: 'politely explain your limitations and suggest alternative resources if possible',
    priority: 6,
  },
  {
    id: 'urgent',
    name: 'Urgent Issues',
    condition: 'the user indicates their request is urgent or time-sensitive',
    action: 'prioritize their request and provide the most direct and efficient help possible',
    priority: 9,
  },
  {
    id: 'goodbye',
    name: 'Farewell',
    condition: 'the user is ending the conversation or saying goodbye',
    action:
      'provide a helpful summary if appropriate and invite them to return if they need more help',
    priority: 5,
  },
]

export function GuidelinesSettings({ form, workspaceId }: GuidelinesSettingsProps) {
  const [showTemplates, setShowTemplates] = useState(false)

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'guidelines',
  })

  const addGuideline = (template?: (typeof GUIDELINE_TEMPLATES)[0]) => {
    append({
      condition: template?.condition || '',
      action: template?.action || '',
      priority: template?.priority || 5,
    })
  }

  const duplicateGuideline = (index: number) => {
    const guideline = form.getValues(`guidelines.${index}`)
    append({
      ...guideline,
      condition: `${guideline.condition} (copy)`,
    })
  }

  const moveGuideline = (fromIndex: number, toIndex: number) => {
    if (toIndex >= 0 && toIndex < fields.length) {
      move(fromIndex, toIndex)
    }
  }

  return (
    <div className='space-y-6'>
      {/* Guidelines Introduction */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Lightbulb className='h-5 w-5' />
            Agent Guidelines
          </CardTitle>
          <CardDescription>
            Guidelines are condition-action pairs that define how your agent should behave in
            specific situations. They're the core of your agent's intelligence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>
              <strong>How guidelines work:</strong> When a condition is met during a conversation,
              the corresponding action tells the agent what to do. Higher priority guidelines take
              precedence when multiple conditions match.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Add Guidelines */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Define Behavior Rules</CardTitle>
              <CardDescription>
                Create specific guidelines for how your agent should respond to different
                situations.
              </CardDescription>
            </div>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setShowTemplates(!showTemplates)}
              >
                <Plus className='mr-2 h-4 w-4' />
                Templates
              </Button>
              <Button type='button' size='sm' onClick={() => addGuideline()}>
                <Plus className='mr-2 h-4 w-4' />
                Add Guideline
              </Button>
            </div>
          </div>
        </CardHeader>

        {showTemplates && (
          <CardContent className='border-t'>
            <div className='space-y-3'>
              <h4 className='font-medium text-sm'>Common Templates</h4>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                {GUIDELINE_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className='cursor-pointer rounded-lg border p-3 transition-colors hover:bg-muted/50'
                    onClick={() => {
                      addGuideline(template)
                      setShowTemplates(false)
                    }}
                  >
                    <div className='mb-2 flex items-center justify-between'>
                      <h5 className='font-medium text-sm'>{template.name}</h5>
                      <Badge variant='secondary'>Priority {template.priority}</Badge>
                    </div>
                    <div className='space-y-1 text-muted-foreground text-xs'>
                      <div>
                        <strong>When:</strong> {template.condition}
                      </div>
                      <div>
                        <strong>Do:</strong> {template.action}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}

        <CardContent className={showTemplates ? 'border-t pt-6' : ''}>
          <div className='space-y-4'>
            {fields.length === 0 ? (
              <div className='py-8 text-center text-muted-foreground'>
                <Lightbulb className='mx-auto mb-4 h-12 w-12 text-muted-foreground/50' />
                <h3 className='mb-2 font-medium'>No guidelines yet</h3>
                <p className='mb-4 text-sm'>
                  Add your first guideline to start defining your agent's behavior.
                </p>
                <Button type='button' variant='outline' onClick={() => setShowTemplates(true)}>
                  Browse Templates
                </Button>
              </div>
            ) : (
              <div className='space-y-4'>
                {fields.map((field, index) => (
                  <Card key={field.id} className='border-l-4 border-l-primary/20'>
                    <CardHeader className='pb-3'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <Badge variant='outline'>#{index + 1}</Badge>
                          <FormField
                            control={form.control}
                            name={`guidelines.${index}.priority`}
                            render={({ field }) => (
                              <Select
                                value={field.value.toString()}
                                onValueChange={(value) => field.onChange(Number.parseInt(value))}
                              >
                                <SelectTrigger className='w-32'>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[...Array(10)].map((_, i) => (
                                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                                      Priority {i + 1}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                        <div className='flex items-center gap-1'>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => moveGuideline(index, index - 1)}
                            disabled={index === 0}
                          >
                            <ChevronUp className='h-4 w-4' />
                          </Button>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => moveGuideline(index, index + 1)}
                            disabled={index === fields.length - 1}
                          >
                            <ChevronDown className='h-4 w-4' />
                          </Button>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => duplicateGuideline(index)}
                          >
                            <Copy className='h-4 w-4' />
                          </Button>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => remove(index)}
                            className='text-destructive hover:text-destructive'
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className='space-y-4'>
                      <FormField
                        control={form.control}
                        name={`guidelines.${index}.condition`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>When (Condition) *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder='e.g., the user asks for help with technical support'
                                rows={2}
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Describe the situation or user behavior that should trigger this
                              guideline.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`guidelines.${index}.action`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Then (Action) *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder='e.g., ask clarifying questions about their specific issue and provide step-by-step troubleshooting guidance'
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Specify exactly how the agent should respond when this condition is
                              met.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Guidelines Tips */}
      {fields.length > 0 && (
        <Card>
          <CardContent className='pt-6'>
            <div className='flex gap-3'>
              <Lightbulb className='mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500' />
              <div className='space-y-2 text-sm'>
                <div className='font-medium'>Tips for effective guidelines:</div>
                <ul className='list-inside list-disc space-y-1 text-muted-foreground'>
                  <li>
                    Be specific about conditions - vague conditions lead to inconsistent behavior
                  </li>
                  <li>Write clear, actionable instructions in the action field</li>
                  <li>
                    Use higher priorities (8-10) for critical behaviors like safety or compliance
                  </li>
                  <li>Test your guidelines by thinking through different conversation scenarios</li>
                  <li>Start with a few key guidelines and add more as needed</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
