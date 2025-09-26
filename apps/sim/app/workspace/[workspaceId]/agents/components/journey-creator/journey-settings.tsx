/**
 * Journey Settings Component
 *
 * Provides configuration options for journey creation including
 * validation rules, execution settings, and integration preferences.
 */

'use client'

import { useEffect, useId, useState } from 'react'
import {
  AlertTriangle,
  Brain,
  Database,
  RotateCcw,
  Save,
  Settings,
  Shield,
  Webhook,
  Zap,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

interface JourneySettingsProps {
  journeyId?: string
  onSettingsChange?: (settings: JourneySettings) => void
  onSave?: (settings: JourneySettings) => void
  className?: string
}

interface JourneySettings {
  general: {
    name: string
    description: string
    version: string
    tags: string[]
    isActive: boolean
  }
  execution: {
    timeoutMs: number
    maxSteps: number
    retryAttempts: number
    parallelExecution: boolean
    debugMode: boolean
    logLevel: 'error' | 'warn' | 'info' | 'debug'
  }
  validation: {
    strictMode: boolean
    validateTransitions: boolean
    validateConditions: boolean
    allowEmptyStates: boolean
    requireStartEnd: boolean
    maxDepth: number
  }
  integration: {
    enableWebhooks: boolean
    webhookUrl: string
    enableAnalytics: boolean
    analyticsLevel: 'basic' | 'detailed' | 'comprehensive'
    enableCache: boolean
    cacheTtl: number
  }
  ai: {
    provider: 'parlant' | 'openai' | 'anthropic' | 'custom'
    model: string
    temperature: number
    maxTokens: number
    systemPrompt: string
    enableFallback: boolean
    fallbackModel: string
  }
  security: {
    enableAuth: boolean
    allowedOrigins: string[]
    rateLimit: number
    encryptData: boolean
    auditLog: boolean
  }
}

const DEFAULT_SETTINGS: JourneySettings = {
  general: {
    name: 'New Journey',
    description: '',
    version: '1.0.0',
    tags: [],
    isActive: true,
  },
  execution: {
    timeoutMs: 30000,
    maxSteps: 100,
    retryAttempts: 3,
    parallelExecution: false,
    debugMode: false,
    logLevel: 'info',
  },
  validation: {
    strictMode: true,
    validateTransitions: true,
    validateConditions: true,
    allowEmptyStates: false,
    requireStartEnd: true,
    maxDepth: 10,
  },
  integration: {
    enableWebhooks: false,
    webhookUrl: '',
    enableAnalytics: true,
    analyticsLevel: 'basic',
    enableCache: true,
    cacheTtl: 300,
  },
  ai: {
    provider: 'parlant',
    model: 'claude-3-sonnet',
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: 'You are a helpful AI assistant in a conversational journey.',
    enableFallback: true,
    fallbackModel: 'claude-3-haiku',
  },
  security: {
    enableAuth: true,
    allowedOrigins: [],
    rateLimit: 100,
    encryptData: true,
    auditLog: true,
  },
}

export function JourneySettings({
  journeyId,
  onSettingsChange,
  onSave,
  className = '',
}: JourneySettingsProps) {
  const [settings, setSettings] = useState<JourneySettings>(DEFAULT_SETTINGS)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  // Generate unique IDs for form elements
  const journeyNameId = useId()
  const journeyVersionId = useId()
  const journeyDescriptionId = useId()
  const journeyTagsId = useId()
  const webhookUrlId = useId()

  useEffect(() => {
    // Load settings for existing journey
    if (journeyId) {
      // TODO: Load from API
      // loadJourneySettings(journeyId)
    }
  }, [journeyId])

  const updateSettings = (
    section: keyof JourneySettings,
    updates: Partial<JourneySettings[keyof JourneySettings]>
  ) => {
    const newSettings = {
      ...settings,
      [section]: {
        ...settings[section],
        ...updates,
      },
    }

    setSettings(newSettings)
    setHasUnsavedChanges(true)
    onSettingsChange?.(newSettings)
  }

  const handleSave = () => {
    onSave?.(settings)
    setHasUnsavedChanges(false)
  }

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS)
    setHasUnsavedChanges(true)
  }

  const validateSettings = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!settings.general.name.trim()) {
      errors.push('Journey name is required')
    }

    if (settings.execution.timeoutMs < 1000) {
      errors.push('Timeout must be at least 1 second')
    }

    if (settings.execution.maxSteps < 1) {
      errors.push('Max steps must be at least 1')
    }

    if (settings.integration.enableWebhooks && !settings.integration.webhookUrl.trim()) {
      errors.push('Webhook URL is required when webhooks are enabled')
    }

    if (settings.ai.maxTokens < 1) {
      errors.push('Max tokens must be at least 1')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  const validation = validateSettings()

  return (
    <Card className={`h-full ${className}`}>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <Settings className='h-5 w-5' />
            Journey Settings
          </CardTitle>

          <div className='flex items-center gap-2'>
            {hasUnsavedChanges && (
              <Badge variant='outline' className='text-orange-600'>
                Unsaved Changes
              </Badge>
            )}

            {!validation.isValid && (
              <Badge variant='destructive'>
                {validation.errors.length} Error{validation.errors.length !== 1 ? 's' : ''}
              </Badge>
            )}

            <div className='flex gap-2'>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant='outline' size='sm'>
                    <RotateCcw className='mr-1 h-3 w-3' />
                    Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Settings</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset all settings to their default values. This action cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                size='sm'
                onClick={handleSave}
                disabled={!hasUnsavedChanges || !validation.isValid}
              >
                <Save className='mr-1 h-3 w-3' />
                Save
              </Button>
            </div>
          </div>
        </div>

        {!validation.isValid && (
          <div className='mt-3'>
            {validation.errors.map((error, index) => (
              <div key={index} className='mb-1 flex items-center gap-2 text-red-600 text-sm'>
                <AlertTriangle className='h-3 w-3' />
                {error}
              </div>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className='p-0'>
        <Tabs value={activeTab} onValueChange={setActiveTab} className='h-full'>
          <TabsList className='mx-4 my-2 grid w-full grid-cols-6'>
            <TabsTrigger value='general'>General</TabsTrigger>
            <TabsTrigger value='execution'>Execution</TabsTrigger>
            <TabsTrigger value='validation'>Validation</TabsTrigger>
            <TabsTrigger value='integration'>Integration</TabsTrigger>
            <TabsTrigger value='ai'>AI</TabsTrigger>
            <TabsTrigger value='security'>Security</TabsTrigger>
          </TabsList>

          <div className='h-[500px] overflow-y-auto px-4 pb-4'>
            <TabsContent value='general' className='mt-4 space-y-6'>
              <div className='space-y-4'>
                <h3 className='font-medium text-sm'>Basic Information</h3>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor={journeyNameId}>Journey Name *</Label>
                    <Input
                      id={journeyNameId}
                      value={settings.general.name}
                      onChange={(e) => updateSettings('general', { name: e.target.value })}
                      placeholder='Enter journey name'
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor={journeyVersionId}>Version</Label>
                    <Input
                      id={journeyVersionId}
                      value={settings.general.version}
                      onChange={(e) => updateSettings('general', { version: e.target.value })}
                      placeholder='e.g., 1.0.0'
                    />
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor={journeyDescriptionId}>Description</Label>
                  <Textarea
                    id={journeyDescriptionId}
                    value={settings.general.description}
                    onChange={(e) => updateSettings('general', { description: e.target.value })}
                    placeholder='Describe what this journey does...'
                    rows={3}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor={journeyTagsId}>Tags (comma-separated)</Label>
                  <Input
                    id={journeyTagsId}
                    value={settings.general.tags.join(', ')}
                    onChange={(e) =>
                      updateSettings('general', {
                        tags: e.target.value
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder='e.g., customer-service, onboarding'
                  />
                </div>

                <div className='flex items-center justify-between'>
                  <div className='space-y-0.5'>
                    <Label>Journey Active</Label>
                    <div className='text-muted-foreground text-sm'>
                      Enable or disable this journey for execution
                    </div>
                  </div>
                  <Switch
                    checked={settings.general.isActive}
                    onCheckedChange={(checked) => updateSettings('general', { isActive: checked })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value='execution' className='mt-4 space-y-6'>
              <div className='space-y-4'>
                <h3 className='flex items-center gap-2 font-medium text-sm'>
                  <Zap className='h-4 w-4' />
                  Execution Settings
                </h3>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label>Timeout (milliseconds)</Label>
                    <Input
                      type='number'
                      value={settings.execution.timeoutMs}
                      onChange={(e) =>
                        updateSettings('execution', {
                          timeoutMs: Number.parseInt(e.target.value, 10) || 30000,
                        })
                      }
                      min='1000'
                      step='1000'
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>Max Steps</Label>
                    <Input
                      type='number'
                      value={settings.execution.maxSteps}
                      onChange={(e) =>
                        updateSettings('execution', {
                          maxSteps: Number.parseInt(e.target.value, 10) || 100,
                        })
                      }
                      min='1'
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>Retry Attempts</Label>
                    <Input
                      type='number'
                      value={settings.execution.retryAttempts}
                      onChange={(e) =>
                        updateSettings('execution', {
                          retryAttempts: Number.parseInt(e.target.value, 10) || 3,
                        })
                      }
                      min='0'
                      max='10'
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>Log Level</Label>
                    <Select
                      value={settings.execution.logLevel}
                      onValueChange={(value) =>
                        updateSettings('execution', {
                          logLevel: value as JourneySettings['execution']['logLevel'],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='error'>Error</SelectItem>
                        <SelectItem value='warn'>Warning</SelectItem>
                        <SelectItem value='info'>Info</SelectItem>
                        <SelectItem value='debug'>Debug</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Parallel Execution</Label>
                      <div className='text-muted-foreground text-sm'>
                        Allow multiple states to execute simultaneously
                      </div>
                    </div>
                    <Switch
                      checked={settings.execution.parallelExecution}
                      onCheckedChange={(checked) =>
                        updateSettings('execution', {
                          parallelExecution: checked,
                        })
                      }
                    />
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Debug Mode</Label>
                      <div className='text-muted-foreground text-sm'>
                        Enable detailed logging and debugging features
                      </div>
                    </div>
                    <Switch
                      checked={settings.execution.debugMode}
                      onCheckedChange={(checked) =>
                        updateSettings('execution', {
                          debugMode: checked,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value='validation' className='mt-4 space-y-6'>
              <div className='space-y-4'>
                <h3 className='flex items-center gap-2 font-medium text-sm'>
                  <Shield className='h-4 w-4' />
                  Validation Rules
                </h3>

                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Strict Mode</Label>
                      <div className='text-muted-foreground text-sm'>
                        Enable strict validation rules and error handling
                      </div>
                    </div>
                    <Switch
                      checked={settings.validation.strictMode}
                      onCheckedChange={(checked) =>
                        updateSettings('validation', {
                          strictMode: checked,
                        })
                      }
                    />
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Validate Transitions</Label>
                      <div className='text-muted-foreground text-sm'>
                        Check that all transitions have valid targets
                      </div>
                    </div>
                    <Switch
                      checked={settings.validation.validateTransitions}
                      onCheckedChange={(checked) =>
                        updateSettings('validation', {
                          validateTransitions: checked,
                        })
                      }
                    />
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Validate Conditions</Label>
                      <div className='text-muted-foreground text-sm'>
                        Verify that all conditions are syntactically valid
                      </div>
                    </div>
                    <Switch
                      checked={settings.validation.validateConditions}
                      onCheckedChange={(checked) =>
                        updateSettings('validation', {
                          validateConditions: checked,
                        })
                      }
                    />
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Allow Empty States</Label>
                      <div className='text-muted-foreground text-sm'>
                        Permit states without content or actions
                      </div>
                    </div>
                    <Switch
                      checked={settings.validation.allowEmptyStates}
                      onCheckedChange={(checked) =>
                        updateSettings('validation', {
                          allowEmptyStates: checked,
                        })
                      }
                    />
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Require Start/End States</Label>
                      <div className='text-muted-foreground text-sm'>
                        Ensure journey has proper start and end states
                      </div>
                    </div>
                    <Switch
                      checked={settings.validation.requireStartEnd}
                      onCheckedChange={(checked) =>
                        updateSettings('validation', {
                          requireStartEnd: checked,
                        })
                      }
                    />
                  </div>

                  <div className='space-y-3'>
                    <Label>Maximum Depth: {settings.validation.maxDepth}</Label>
                    <Slider
                      value={[settings.validation.maxDepth]}
                      onValueChange={([value]) =>
                        updateSettings('validation', {
                          maxDepth: value,
                        })
                      }
                      max={50}
                      min={1}
                      step={1}
                      className='w-full'
                    />
                    <div className='text-muted-foreground text-sm'>
                      Maximum nested states allowed in the journey
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value='integration' className='mt-4 space-y-6'>
              <div className='space-y-4'>
                <h3 className='flex items-center gap-2 font-medium text-sm'>
                  <Webhook className='h-4 w-4' />
                  Integration Settings
                </h3>

                <Accordion type='single' collapsible className='w-full'>
                  <AccordionItem value='webhooks'>
                    <AccordionTrigger>
                      <div className='flex items-center gap-2'>
                        <Webhook className='h-4 w-4' />
                        Webhooks
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className='space-y-4'>
                      <div className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                          <Label>Enable Webhooks</Label>
                          <div className='text-muted-foreground text-sm'>
                            Send HTTP callbacks for journey events
                          </div>
                        </div>
                        <Switch
                          checked={settings.integration.enableWebhooks}
                          onCheckedChange={(checked) =>
                            updateSettings('integration', {
                              enableWebhooks: checked,
                            })
                          }
                        />
                      </div>

                      {settings.integration.enableWebhooks && (
                        <div className='space-y-2'>
                          <Label htmlFor={webhookUrlId}>Webhook URL</Label>
                          <Input
                            id={webhookUrlId}
                            value={settings.integration.webhookUrl}
                            onChange={(e) =>
                              updateSettings('integration', {
                                webhookUrl: e.target.value,
                              })
                            }
                            placeholder='https://your-api.com/webhooks/journey'
                          />
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value='analytics'>
                    <AccordionTrigger>
                      <div className='flex items-center gap-2'>
                        <BarChart3 className='h-4 w-4' />
                        Analytics
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className='space-y-4'>
                      <div className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                          <Label>Enable Analytics</Label>
                          <div className='text-muted-foreground text-sm'>
                            Collect journey execution analytics
                          </div>
                        </div>
                        <Switch
                          checked={settings.integration.enableAnalytics}
                          onCheckedChange={(checked) =>
                            updateSettings('integration', {
                              enableAnalytics: checked,
                            })
                          }
                        />
                      </div>

                      {settings.integration.enableAnalytics && (
                        <div className='space-y-2'>
                          <Label>Analytics Level</Label>
                          <Select
                            value={settings.integration.analyticsLevel}
                            onValueChange={(value) =>
                              updateSettings('integration', {
                                analyticsLevel:
                                  value as JourneySettings['integration']['analyticsLevel'],
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='basic'>Basic</SelectItem>
                              <SelectItem value='detailed'>Detailed</SelectItem>
                              <SelectItem value='comprehensive'>Comprehensive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value='caching'>
                    <AccordionTrigger>
                      <div className='flex items-center gap-2'>
                        <Database className='h-4 w-4' />
                        Caching
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className='space-y-4'>
                      <div className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                          <Label>Enable Cache</Label>
                          <div className='text-muted-foreground text-sm'>
                            Cache journey states and responses
                          </div>
                        </div>
                        <Switch
                          checked={settings.integration.enableCache}
                          onCheckedChange={(checked) =>
                            updateSettings('integration', {
                              enableCache: checked,
                            })
                          }
                        />
                      </div>

                      {settings.integration.enableCache && (
                        <div className='space-y-2'>
                          <Label>Cache TTL (seconds)</Label>
                          <Input
                            type='number'
                            value={settings.integration.cacheTtl}
                            onChange={(e) =>
                              updateSettings('integration', {
                                cacheTtl: Number.parseInt(e.target.value, 10) || 300,
                              })
                            }
                            min='60'
                            step='60'
                          />
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </TabsContent>

            <TabsContent value='ai' className='mt-4 space-y-6'>
              <div className='space-y-4'>
                <h3 className='flex items-center gap-2 font-medium text-sm'>
                  <Brain className='h-4 w-4' />
                  AI Configuration
                </h3>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label>AI Provider</Label>
                    <Select
                      value={settings.ai.provider}
                      onValueChange={(value) =>
                        updateSettings('ai', {
                          provider: value as JourneySettings['ai']['provider'],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='parlant'>Parlant</SelectItem>
                        <SelectItem value='openai'>OpenAI</SelectItem>
                        <SelectItem value='anthropic'>Anthropic</SelectItem>
                        <SelectItem value='custom'>Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-2'>
                    <Label>Model</Label>
                    <Input
                      value={settings.ai.model}
                      onChange={(e) => updateSettings('ai', { model: e.target.value })}
                      placeholder='e.g., claude-3-sonnet'
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>Max Tokens</Label>
                    <Input
                      type='number'
                      value={settings.ai.maxTokens}
                      onChange={(e) =>
                        updateSettings('ai', {
                          maxTokens: Number.parseInt(e.target.value, 10) || 1000,
                        })
                      }
                      min='1'
                    />
                  </div>

                  <div className='space-y-3'>
                    <Label>Temperature: {settings.ai.temperature}</Label>
                    <Slider
                      value={[settings.ai.temperature]}
                      onValueChange={([value]) => updateSettings('ai', { temperature: value })}
                      max={2}
                      min={0}
                      step={0.1}
                      className='w-full'
                    />
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label>System Prompt</Label>
                  <Textarea
                    value={settings.ai.systemPrompt}
                    onChange={(e) => updateSettings('ai', { systemPrompt: e.target.value })}
                    placeholder='System prompt for AI model...'
                    rows={4}
                  />
                </div>

                <div className='flex items-center justify-between'>
                  <div className='space-y-0.5'>
                    <Label>Enable Fallback Model</Label>
                    <div className='text-muted-foreground text-sm'>
                      Use fallback model if primary model fails
                    </div>
                  </div>
                  <Switch
                    checked={settings.ai.enableFallback}
                    onCheckedChange={(checked) => updateSettings('ai', { enableFallback: checked })}
                  />
                </div>

                {settings.ai.enableFallback && (
                  <div className='space-y-2'>
                    <Label>Fallback Model</Label>
                    <Input
                      value={settings.ai.fallbackModel}
                      onChange={(e) => updateSettings('ai', { fallbackModel: e.target.value })}
                      placeholder='e.g., claude-3-haiku'
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value='security' className='mt-4 space-y-6'>
              <div className='space-y-4'>
                <h3 className='flex items-center gap-2 font-medium text-sm'>
                  <Shield className='h-4 w-4' />
                  Security Settings
                </h3>

                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Enable Authentication</Label>
                      <div className='text-muted-foreground text-sm'>
                        Require authentication for journey execution
                      </div>
                    </div>
                    <Switch
                      checked={settings.security.enableAuth}
                      onCheckedChange={(checked) =>
                        updateSettings('security', { enableAuth: checked })
                      }
                    />
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Encrypt Data</Label>
                      <div className='text-muted-foreground text-sm'>
                        Encrypt sensitive data in journey state
                      </div>
                    </div>
                    <Switch
                      checked={settings.security.encryptData}
                      onCheckedChange={(checked) =>
                        updateSettings('security', { encryptData: checked })
                      }
                    />
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Audit Logging</Label>
                      <div className='text-muted-foreground text-sm'>
                        Log all journey activities for auditing
                      </div>
                    </div>
                    <Switch
                      checked={settings.security.auditLog}
                      onCheckedChange={(checked) =>
                        updateSettings('security', { auditLog: checked })
                      }
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>Rate Limit (requests/minute)</Label>
                    <Input
                      type='number'
                      value={settings.security.rateLimit}
                      onChange={(e) =>
                        updateSettings('security', {
                          rateLimit: Number.parseInt(e.target.value, 10) || 100,
                        })
                      }
                      min='1'
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>Allowed Origins (comma-separated)</Label>
                    <Input
                      value={settings.security.allowedOrigins.join(', ')}
                      onChange={(e) =>
                        updateSettings('security', {
                          allowedOrigins: e.target.value
                            .split(',')
                            .map((o) => o.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder='https://example.com, https://app.example.com'
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
