/**
 * Journey Toolbox Component
 *
 * Provides tools and templates for creating journey states, managing layouts,
 * and accessing journey creation utilities.
 */

'use client'

import { useId, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Grid3x3,
  Info,
  Layers,
  MessageSquare,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Upload,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { JourneyStateData } from './journey-state-node'

interface JourneyToolboxProps {
  onAddNode?: (nodeData: Partial<JourneyStateData>) => void
  onLayoutChange?: (layout: 'horizontal' | 'vertical' | 'hierarchical' | 'force') => void
  onImportJourney?: (file: File) => void
  onExportJourney?: () => void
  onTemplateSelect?: (template: JourneyTemplate) => void
  className?: string
}

interface StateTemplate {
  id: string
  type: JourneyStateData['type']
  name: string
  description: string
  icon: React.ReactNode
  defaultData: Partial<JourneyStateData>
  category: 'basic' | 'advanced' | 'integration'
}

interface JourneyTemplate {
  id: string
  name: string
  description: string
  category: 'customer-service' | 'onboarding' | 'support' | 'sales' | 'custom'
  nodes: Partial<JourneyStateData>[]
  connections: Array<{
    source: string
    target: string
    condition?: string
  }>
  tags: string[]
}

const STATE_TEMPLATES: StateTemplate[] = [
  {
    id: 'start',
    type: 'start',
    name: 'Start',
    description: 'Beginning of the journey',
    icon: <Play className='h-4 w-4' />,
    defaultData: {
      name: 'Start',
      type: 'start',
      content: 'Journey begins here',
    },
    category: 'basic',
  },
  {
    id: 'message',
    type: 'message',
    name: 'Message',
    description: 'Send a message to user',
    icon: <MessageSquare className='h-4 w-4' />,
    defaultData: {
      name: 'Send Message',
      type: 'message',
      content: 'Hello! How can I help you today?',
    },
    category: 'basic',
  },
  {
    id: 'condition',
    type: 'condition',
    name: 'Condition',
    description: 'Branch based on conditions',
    icon: <AlertTriangle className='h-4 w-4' />,
    defaultData: {
      name: 'Check Condition',
      type: 'condition',
      conditions: [
        {
          id: 'default',
          condition: 'user.intent === "help"',
          nextState: '',
        },
      ],
    },
    category: 'basic',
  },
  {
    id: 'action',
    type: 'action',
    name: 'Action',
    description: 'Perform an action',
    icon: <CheckCircle2 className='h-4 w-4' />,
    defaultData: {
      name: 'Perform Action',
      type: 'action',
      actions: [
        {
          id: 'default',
          type: 'send_message',
          parameters: { message: 'Action completed' },
        },
      ],
    },
    category: 'basic',
  },
  {
    id: 'end',
    type: 'end',
    name: 'End',
    description: 'End of the journey',
    icon: <Pause className='h-4 w-4' />,
    defaultData: {
      name: 'End',
      type: 'end',
      content: 'Journey completed',
    },
    category: 'basic',
  },
]

const JOURNEY_TEMPLATES: JourneyTemplate[] = [
  {
    id: 'customer-support',
    name: 'Customer Support',
    description: 'Basic customer support flow with greeting, issue identification, and resolution',
    category: 'customer-service',
    tags: ['support', 'help', 'customer-service'],
    nodes: [
      {
        id: 'start',
        name: 'Greeting',
        type: 'start',
        content: 'Hello! Welcome to our support chat.',
      },
      {
        id: 'ask-issue',
        name: 'Ask Issue',
        type: 'message',
        content: 'What can I help you with today?',
      },
      {
        id: 'classify-issue',
        name: 'Classify Issue',
        type: 'condition',
        conditions: [
          { id: '1', condition: 'user.intent === "technical"', nextState: 'technical-help' },
          { id: '2', condition: 'user.intent === "billing"', nextState: 'billing-help' },
          { id: '3', condition: 'user.intent === "general"', nextState: 'general-help' },
        ],
      },
      {
        id: 'technical-help',
        name: 'Technical Support',
        type: 'message',
        content: 'I can help you with technical issues. Please describe the problem.',
      },
      {
        id: 'billing-help',
        name: 'Billing Support',
        type: 'message',
        content: 'I can help you with billing questions. What specifically do you need help with?',
      },
      {
        id: 'general-help',
        name: 'General Help',
        type: 'message',
        content: 'I can help you with general inquiries. Please let me know what you need.',
      },
    ],
    connections: [
      { source: 'start', target: 'ask-issue' },
      { source: 'ask-issue', target: 'classify-issue' },
      { source: 'classify-issue', target: 'technical-help' },
      { source: 'classify-issue', target: 'billing-help' },
      { source: 'classify-issue', target: 'general-help' },
    ],
  },
  {
    id: 'user-onboarding',
    name: 'User Onboarding',
    description: 'Welcome new users and guide them through initial setup',
    category: 'onboarding',
    tags: ['welcome', 'onboarding', 'setup'],
    nodes: [
      {
        id: 'start',
        name: 'Welcome',
        type: 'start',
        content: 'Welcome! Let me help you get started.',
      },
      {
        id: 'collect-info',
        name: 'Collect Info',
        type: 'message',
        content: 'First, could you tell me your name?',
      },
      {
        id: 'personalize',
        name: 'Personalize',
        type: 'action',
        actions: [
          {
            id: '1',
            type: 'set_variable',
            parameters: { name: 'user.name', value: '{{user.input}}' },
          },
        ],
      },
      {
        id: 'setup-preferences',
        name: 'Setup Preferences',
        type: 'message',
        content: 'Great to meet you, {{user.name}}! Let me help you set up your preferences.',
      },
    ],
    connections: [
      { source: 'start', target: 'collect-info' },
      { source: 'collect-info', target: 'personalize' },
      { source: 'personalize', target: 'setup-preferences' },
    ],
  },
]

export function JourneyToolbox({
  onAddNode,
  onLayoutChange,
  onImportJourney,
  onExportJourney,
  onTemplateSelect,
  className = '',
}: JourneyToolboxProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState<'states' | 'templates' | 'tools'>('states')

  // Generate unique ID for file input
  const journeyImportId = useId()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    advanced: false,
    integration: false,
    templates: false,
  })

  const filteredStateTemplates = STATE_TEMPLATES.filter(
    (template) =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredJourneyTemplates = JOURNEY_TEMPLATES.filter(
    (template) =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleAddNode = (template: StateTemplate) => {
    const nodeData: Partial<JourneyStateData> = {
      ...template.defaultData,
      id: `${template.type}_${Date.now()}`,
      metadata: {
        tags: [template.category],
        description: template.description,
      },
    }
    onAddNode?.(nodeData)
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onImportJourney?.(file)
    }
  }

  return (
    <Card className={`h-full w-80 ${className}`}>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <Layers className='h-5 w-5' />
          Journey Toolbox
        </CardTitle>
      </CardHeader>

      <CardContent className='p-0'>
        <div className='px-4 pb-3'>
          <div className='relative'>
            <Search className='absolute top-2.5 left-2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search tools...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-8'
            />
          </div>
        </div>

        <div className='px-4 pb-3'>
          <div className='flex gap-1'>
            <Button
              variant={activeCategory === 'states' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setActiveCategory('states')}
            >
              States
            </Button>
            <Button
              variant={activeCategory === 'templates' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setActiveCategory('templates')}
            >
              Templates
            </Button>
            <Button
              variant={activeCategory === 'tools' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setActiveCategory('tools')}
            >
              Tools
            </Button>
          </div>
        </div>

        <ScrollArea className='h-[calc(100vh-280px)]'>
          <div className='space-y-4 px-4'>
            {activeCategory === 'states' && (
              <div className='space-y-3'>
                <h3 className='font-medium text-sm'>State Templates</h3>

                {/* Basic States */}
                <Collapsible
                  open={expandedSections.basic}
                  onOpenChange={() => toggleSection('basic')}
                >
                  <CollapsibleTrigger className='flex w-full items-center justify-between rounded-lg px-2 py-1 font-medium text-sm hover:bg-muted/50'>
                    <span>Basic States</span>
                    {expandedSections.basic ? (
                      <ChevronDown className='h-4 w-4' />
                    ) : (
                      <ChevronRight className='h-4 w-4' />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className='space-y-2 pt-2'>
                    {filteredStateTemplates
                      .filter((template) => template.category === 'basic')
                      .map((template) => (
                        <TooltipProvider key={template.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-auto w-full justify-start gap-2 p-2'
                                onClick={() => handleAddNode(template)}
                              >
                                <div className='text-muted-foreground'>{template.icon}</div>
                                <div className='flex-1 text-left'>
                                  <div className='font-medium text-sm'>{template.name}</div>
                                  <div className='line-clamp-1 text-muted-foreground text-xs'>
                                    {template.description}
                                  </div>
                                </div>
                                <Plus className='h-3 w-3 text-muted-foreground' />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side='left' className='max-w-xs'>
                              <p>{template.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                  </CollapsibleContent>
                </Collapsible>

                {/* Advanced States */}
                <Collapsible
                  open={expandedSections.advanced}
                  onOpenChange={() => toggleSection('advanced')}
                >
                  <CollapsibleTrigger className='flex w-full items-center justify-between rounded-lg px-2 py-1 font-medium text-sm hover:bg-muted/50'>
                    <span>Advanced States</span>
                    {expandedSections.advanced ? (
                      <ChevronDown className='h-4 w-4' />
                    ) : (
                      <ChevronRight className='h-4 w-4' />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className='space-y-2 pt-2'>
                    <div className='px-2 py-1 text-muted-foreground text-xs'>
                      Advanced state templates coming soon
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {activeCategory === 'templates' && (
              <div className='space-y-3'>
                <h3 className='font-medium text-sm'>Journey Templates</h3>

                <div className='space-y-2'>
                  {filteredJourneyTemplates.map((template) => (
                    <Card key={template.id} className='cursor-pointer hover:bg-muted/50'>
                      <CardContent className='p-3'>
                        <div className='space-y-2'>
                          <div className='flex items-start justify-between'>
                            <div className='flex-1'>
                              <h4 className='font-medium text-sm'>{template.name}</h4>
                              <p className='line-clamp-2 text-muted-foreground text-xs'>
                                {template.description}
                              </p>
                            </div>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-6 w-6 p-0'
                              onClick={() => onTemplateSelect?.(template)}
                            >
                              <Plus className='h-3 w-3' />
                            </Button>
                          </div>

                          <div className='flex flex-wrap gap-1'>
                            {template.tags.map((tag) => (
                              <Badge key={tag} variant='secondary' className='text-xs'>
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          <div className='text-muted-foreground text-xs'>
                            {template.nodes.length} states • {template.connections.length}{' '}
                            connections
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeCategory === 'tools' && (
              <div className='space-y-4'>
                <h3 className='font-medium text-sm'>Layout Tools</h3>

                <div className='grid grid-cols-2 gap-2'>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => onLayoutChange?.('horizontal')}
                        >
                          <Grid3x3 className='mr-1 h-3 w-3' />
                          Horizontal
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Arrange nodes horizontally</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => onLayoutChange?.('vertical')}
                        >
                          <Grid3x3 className='mr-1 h-3 w-3 rotate-90' />
                          Vertical
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Arrange nodes vertically</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => onLayoutChange?.('hierarchical')}
                        >
                          <Layers className='mr-1 h-3 w-3' />
                          Hierarchy
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Hierarchical layout</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => onLayoutChange?.('force')}
                        >
                          <RefreshCw className='mr-1 h-3 w-3' />
                          Force
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Force-directed layout</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <Separator />

                <h3 className='font-medium text-sm'>Import/Export</h3>

                <div className='space-y-2'>
                  <div className='grid grid-cols-2 gap-2'>
                    <Button variant='outline' size='sm' onClick={onExportJourney}>
                      <Download className='mr-1 h-3 w-3' />
                      Export
                    </Button>

                    <div className='relative'>
                      <Button
                        variant='outline'
                        size='sm'
                        className='w-full'
                        onClick={() => document.getElementById('journey-import')?.click()}
                      >
                        <Upload className='mr-1 h-3 w-3' />
                        Import
                      </Button>
                      <input
                        id={journeyImportId}
                        type='file'
                        accept='.json'
                        className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
                        onChange={handleFileImport}
                      />
                    </div>
                  </div>

                  <Button variant='outline' size='sm' className='w-full'>
                    <Copy className='mr-1 h-3 w-3' />
                    Duplicate Journey
                  </Button>
                </div>

                <Separator />

                <div className='space-y-2'>
                  <h3 className='font-medium text-sm'>Actions</h3>

                  <Button variant='outline' size='sm' className='w-full justify-start'>
                    <Zap className='mr-2 h-3 w-3' />
                    Validate Journey
                  </Button>

                  <Button variant='outline' size='sm' className='w-full justify-start'>
                    <Settings className='mr-2 h-3 w-3' />
                    Journey Settings
                  </Button>

                  <Button variant='outline' size='sm' className='w-full justify-start'>
                    <Info className='mr-2 h-3 w-3' />
                    Journey Info
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
