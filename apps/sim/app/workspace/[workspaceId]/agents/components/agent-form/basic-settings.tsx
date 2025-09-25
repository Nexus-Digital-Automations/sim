/**
 * Basic Settings Form Step
 *
 * First step of agent creation form covering basic information
 * like name, description, and conversation style.
 */

'use client'

import { Bot, MessageSquare, Settings } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

interface BasicSettingsProps {
  form: UseFormReturn<any>
}

export function BasicSettings({ form }: BasicSettingsProps) {
  return (
    <div className='space-y-6'>
      {/* Agent Identity */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Bot className='h-5 w-5' />
            Agent Identity
          </CardTitle>
          <CardDescription>
            Basic information that defines your agent's identity and purpose.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agent Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder='e.g., Customer Support Bot, Data Analyst, Code Reviewer'
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Choose a clear, descriptive name that reflects the agent's purpose.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='description'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='Describe what this agent does, its main responsibilities, and how it should interact with users...'
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Provide a detailed description of the agent's role and capabilities. This helps
                  team members understand when and how to use this agent.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Conversation Style */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <MessageSquare className='h-5 w-5' />
            Conversation Style
          </CardTitle>
          <CardDescription>
            Configure how the agent communicates and interacts with users.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <FormField
            control={form.control}
            name='conversationStyle'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Communication Style</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select communication style' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='professional'>
                      <div>
                        <div className='font-medium'>Professional</div>
                        <div className='text-muted-foreground text-sm'>
                          Formal, business-appropriate tone
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value='friendly'>
                      <div>
                        <div className='font-medium'>Friendly</div>
                        <div className='text-muted-foreground text-sm'>
                          Warm and approachable, but still professional
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value='casual'>
                      <div>
                        <div className='font-medium'>Casual</div>
                        <div className='text-muted-foreground text-sm'>
                          Relaxed and conversational tone
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value='technical'>
                      <div>
                        <div className='font-medium'>Technical</div>
                        <div className='text-muted-foreground text-sm'>
                          Precise, technical language for expert users
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose the tone and style that best fits your agent's role and audience.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Behavior Settings */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Settings className='h-5 w-5' />
            Behavior Settings
          </CardTitle>
          <CardDescription>
            Advanced settings that control how the agent behaves in conversations.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <FormField
            control={form.control}
            name='allowProactiveMessages'
            render={({ field }) => (
              <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                <div className='space-y-0.5'>
                  <FormLabel className='text-base'>Proactive Messages</FormLabel>
                  <FormDescription>
                    Allow the agent to send follow-up messages and proactive suggestions without
                    being directly asked.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <div className='rounded-lg border bg-muted/50 p-4'>
            <div className='mb-2 flex items-center gap-2'>
              <div className='h-2 w-2 rounded-full bg-blue-500' />
              <span className='font-medium text-sm'>Preview</span>
            </div>
            <div className='text-muted-foreground text-sm'>
              Based on your settings, this agent will communicate in a{' '}
              <span className='font-medium'>{form.watch('conversationStyle')}</span> style
              {form.watch('allowProactiveMessages')
                ? ' and may send proactive messages.'
                : ' and will only respond when directly addressed.'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
