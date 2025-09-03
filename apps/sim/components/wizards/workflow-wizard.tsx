'use client'

/**
 * Workflow Wizard Component - Goal-oriented workflow creation system
 * 
 * Provides intelligent workflow creation through:
 * - Business goal analysis and template recommendations
 * - Step-by-step guided configuration
 * - Automatic workflow generation with best practices
 * - Integration validation and testing
 * - Accessibility-first design
 * 
 * @created 2025-09-03
 * @author Claude Development System
 */

import React, { useCallback, useEffect, useState } from 'react'
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  ChevronDown, 
  Lightbulb, 
  Play, 
  Settings, 
  Sparkles, 
  Target,
  Wand2,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logs/console/logger'
import type { Workflow } from '@/stores/workflows/workflow/types'

const logger = createLogger('WorkflowWizard')

export interface BusinessGoal {
  id: string
  title: string
  description: string
  category: 'automation' | 'integration' | 'data-processing' | 'communication' | 'monitoring'
  complexity: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: number // minutes to set up
  requiredIntegrations: string[]
  templates: WorkflowTemplate[]
  examples: string[]
  benefits: string[]
}

export interface WorkflowTemplate {
  id: string
  title: string
  description: string
  blocks: TemplateBlock[]
  connections: TemplateConnection[]
  configuration: Record<string, any>
  difficulty: 1 | 2 | 3 | 4 | 5
  popularity: number
  successRate: number
}

export interface TemplateBlock {
  id: string
  type: string
  name: string
  position: { x: number; y: number }
  config: Record<string, any>
  description: string
  required: boolean
}

export interface TemplateConnection {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface WizardStep {
  id: string
  title: string
  description: string
  component: React.ComponentType<any>
  validation?: () => boolean
  canSkip?: boolean
}

export interface WorkflowWizardProps {
  onComplete: (workflow: Partial<Workflow>) => void
  onCancel: () => void
  className?: string
  initialGoal?: string
  accessibilityMode?: boolean
}

/**
 * Predefined business goals with templates and recommendations
 */
const BUSINESS_GOALS: Record<string, BusinessGoal> = {
  'lead-management': {
    id: 'lead-management',
    title: 'Lead Management Automation',
    description: 'Automate lead capture, qualification, and nurturing processes',
    category: 'automation',
    complexity: 'intermediate',
    estimatedTime: 25,
    requiredIntegrations: ['CRM', 'Email Marketing'],
    templates: [
      {
        id: 'basic-lead-capture',
        title: 'Basic Lead Capture',
        description: 'Capture leads from forms and add to CRM',
        blocks: [
          {
            id: 'starter-1',
            type: 'starter',
            name: 'Form Submission',
            position: { x: 100, y: 100 },
            config: {},
            description: 'Triggers when someone submits a contact form',
            required: true
          },
          {
            id: 'webhook-1',
            type: 'webhook',
            name: 'Form Data',
            position: { x: 300, y: 100 },
            config: { method: 'POST' },
            description: 'Receives form submission data',
            required: true
          },
          {
            id: 'condition-1',
            type: 'condition',
            name: 'Valid Email?',
            position: { x: 500, y: 100 },
            config: { field: 'email', operator: 'contains', value: '@' },
            description: 'Check if email address is valid',
            required: true
          },
          {
            id: 'crm-add',
            type: 'api',
            name: 'Add to CRM',
            position: { x: 700, y: 50 },
            config: { method: 'POST', url: '{{crm_api_url}}/contacts' },
            description: 'Add valid lead to CRM system',
            required: true
          },
          {
            id: 'email-welcome',
            type: 'email',
            name: 'Welcome Email',
            position: { x: 900, y: 50 },
            config: { 
              template: 'welcome',
              subject: 'Welcome! Thanks for your interest'
            },
            description: 'Send welcome email to new lead',
            required: false
          },
          {
            id: 'response-error',
            type: 'response',
            name: 'Invalid Email',
            position: { x: 700, y: 150 },
            config: { message: 'Please provide a valid email address' },
            description: 'Handle invalid email submissions',
            required: true
          }
        ],
        connections: [
          { id: 'c1', source: 'starter-1', target: 'webhook-1' },
          { id: 'c2', source: 'webhook-1', target: 'condition-1' },
          { id: 'c3', source: 'condition-1', target: 'crm-add', sourceHandle: 'true' },
          { id: 'c4', source: 'condition-1', target: 'response-error', sourceHandle: 'false' },
          { id: 'c5', source: 'crm-add', target: 'email-welcome' }
        ],
        configuration: {
          requiresCRM: true,
          requiresEmail: true,
          testable: true
        },
        difficulty: 2,
        popularity: 89,
        successRate: 92
      }
    ],
    examples: [
      'Automatically add website visitors to your CRM when they fill out contact forms',
      'Send personalized welcome emails to new leads with relevant content',
      'Score leads based on their behavior and route high-value prospects to sales'
    ],
    benefits: [
      'Never miss a potential customer',
      'Respond to leads instantly, even outside business hours',
      'Consistently nurture prospects with personalized content',
      'Free up sales team time for closing deals'
    ]
  },
  'email-automation': {
    id: 'email-automation',
    title: 'Email Marketing Automation',
    description: 'Create automated email sequences and campaigns',
    category: 'communication',
    complexity: 'beginner',
    estimatedTime: 15,
    requiredIntegrations: ['Email Service'],
    templates: [
      {
        id: 'drip-campaign',
        title: 'Drip Email Campaign',
        description: 'Send a series of timed emails to nurture leads',
        blocks: [
          {
            id: 'starter-1',
            type: 'starter',
            name: 'New Subscriber',
            position: { x: 100, y: 100 },
            config: {},
            description: 'Starts when someone subscribes',
            required: true
          },
          {
            id: 'email-day1',
            type: 'email',
            name: 'Day 1: Welcome',
            position: { x: 300, y: 100 },
            config: { 
              delay: '0 days',
              subject: 'Welcome to our community!',
              template: 'welcome-series-1'
            },
            description: 'Immediate welcome email',
            required: true
          },
          {
            id: 'email-day3',
            type: 'email',
            name: 'Day 3: Getting Started',
            position: { x: 500, y: 100 },
            config: { 
              delay: '3 days',
              subject: 'Getting started guide',
              template: 'welcome-series-2'
            },
            description: 'Getting started guidance',
            required: true
          },
          {
            id: 'email-day7',
            type: 'email',
            name: 'Day 7: Success Stories',
            position: { x: 700, y: 100 },
            config: { 
              delay: '7 days',
              subject: 'Customer success stories',
              template: 'welcome-series-3'
            },
            description: 'Social proof and inspiration',
            required: true
          }
        ],
        connections: [
          { id: 'c1', source: 'starter-1', target: 'email-day1' },
          { id: 'c2', source: 'email-day1', target: 'email-day3' },
          { id: 'c3', source: 'email-day3', target: 'email-day7' }
        ],
        configuration: {
          requiresEmail: true,
          timing: 'sequential',
          testable: true
        },
        difficulty: 1,
        popularity: 95,
        successRate: 88
      }
    ],
    examples: [
      'Welcome new subscribers with a 7-part email series',
      'Send product recommendations based on purchase history',
      'Re-engage inactive customers with special offers'
    ],
    benefits: [
      'Nurture relationships automatically',
      'Increase customer lifetime value',
      'Save hours of manual email management',
      'Improve email engagement rates'
    ]
  },
  'data-sync': {
    id: 'data-sync',
    title: 'Data Synchronization',
    description: 'Keep data synchronized between different systems',
    category: 'data-processing',
    complexity: 'advanced',
    estimatedTime: 35,
    requiredIntegrations: ['Database', 'API'],
    templates: [
      {
        id: 'crm-database-sync',
        title: 'CRM to Database Sync',
        description: 'Sync customer data between CRM and database',
        blocks: [
          {
            id: 'schedule-1',
            type: 'schedule',
            name: 'Hourly Sync',
            position: { x: 100, y: 100 },
            config: { interval: 'hourly' },
            description: 'Runs sync every hour',
            required: true
          },
          {
            id: 'crm-get',
            type: 'api',
            name: 'Get CRM Data',
            position: { x: 300, y: 100 },
            config: { method: 'GET', url: '{{crm_api}}/contacts/updated' },
            description: 'Fetch recently updated contacts',
            required: true
          },
          {
            id: 'transform',
            type: 'javascript',
            name: 'Transform Data',
            position: { x: 500, y: 100 },
            config: { 
              code: `// Transform CRM data to database format
return data.map(contact => ({
  id: contact.id,
  name: contact.full_name,
  email: contact.email_address,
  updated_at: new Date().toISOString()
}));`
            },
            description: 'Convert data format',
            required: true
          },
          {
            id: 'db-upsert',
            type: 'database',
            name: 'Update Database',
            position: { x: 700, y: 100 },
            config: { 
              operation: 'upsert',
              table: 'contacts',
              conflictFields: ['id']
            },
            description: 'Update or insert records',
            required: true
          }
        ],
        connections: [
          { id: 'c1', source: 'schedule-1', target: 'crm-get' },
          { id: 'c2', source: 'crm-get', target: 'transform' },
          { id: 'c3', source: 'transform', target: 'db-upsert' }
        ],
        configuration: {
          requiresDatabase: true,
          requiresCRM: true,
          scheduling: true
        },
        difficulty: 4,
        popularity: 67,
        successRate: 78
      }
    ],
    examples: [
      'Sync customer data between Salesforce and your database',
      'Keep product information updated across multiple platforms',
      'Synchronize user accounts between different services'
    ],
    benefits: [
      'Eliminate manual data entry',
      'Ensure data consistency across systems',
      'Real-time synchronization of critical information',
      'Reduce errors from manual processes'
    ]
  }
}

/**
 * Workflow Wizard Main Component
 */
export function WorkflowWizard({
  onComplete,
  onCancel,
  className,
  initialGoal,
  accessibilityMode = true
}: WorkflowWizardProps) {
  // State management
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [wizardData, setWizardData] = useState<Record<string, any>>({})
  const [selectedGoal, setSelectedGoal] = useState<BusinessGoal | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null)
  const [generatedWorkflow, setGeneratedWorkflow] = useState<Partial<Workflow> | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Wizard steps configuration
  const steps: WizardStep[] = [
    {
      id: 'goal-selection',
      title: 'What do you want to automate?',
      description: 'Choose your business goal to get personalized recommendations',
      component: GoalSelectionStep,
      validation: () => selectedGoal !== null
    },
    {
      id: 'template-selection',
      title: 'Choose your approach',
      description: 'Select a template that matches your needs',
      component: TemplateSelectionStep,
      validation: () => selectedTemplate !== null
    },
    {
      id: 'configuration',
      title: 'Configure your workflow',
      description: 'Customize the template for your specific requirements',
      component: ConfigurationStep,
      validation: () => Object.keys(wizardData.configuration || {}).length > 0
    },
    {
      id: 'review',
      title: 'Review and create',
      description: 'Review your workflow before creating it',
      component: ReviewStep,
      canSkip: false
    }
  ]

  const currentStep = steps[currentStepIndex]
  const progress = Math.round(((currentStepIndex + 1) / steps.length) * 100)

  /**
   * Move to next step with validation
   */
  const handleNext = useCallback(async () => {
    const operationId = Date.now().toString()
    
    logger.info(`[${operationId}] Advancing to next wizard step`, {
      currentStep: currentStep.id,
      nextStep: currentStepIndex + 1,
      hasValidation: !!currentStep.validation
    })

    // Validate current step if validation exists
    if (currentStep.validation && !currentStep.validation()) {
      logger.warn(`[${operationId}] Step validation failed`, {
        stepId: currentStep.id,
        stepIndex: currentStepIndex
      })
      return
    }

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
      
      // Announce step change to screen readers
      if (accessibilityMode) {
        const nextStep = steps[currentStepIndex + 1]
        announceToScreenReader(`Moving to step ${currentStepIndex + 2}: ${nextStep.title}`)
      }
    } else {
      // Final step - generate and complete workflow
      await handleComplete()
    }
  }, [currentStep, currentStepIndex, accessibilityMode])

  /**
   * Move to previous step
   */
  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
      
      if (accessibilityMode) {
        const prevStep = steps[currentStepIndex - 1]
        announceToScreenReader(`Returning to step ${currentStepIndex}: ${prevStep.title}`)
      }
    }
  }, [currentStepIndex, accessibilityMode])

  /**
   * Complete wizard and generate workflow
   */
  const handleComplete = useCallback(async () => {
    const operationId = Date.now().toString()
    
    logger.info(`[${operationId}] Completing workflow wizard`, {
      selectedGoal: selectedGoal?.id,
      selectedTemplate: selectedTemplate?.id,
      configurationKeys: Object.keys(wizardData.configuration || {})
    })

    if (!selectedTemplate) {
      logger.error(`[${operationId}] Cannot complete wizard without template`)
      return
    }

    setIsGenerating(true)
    
    try {
      // Generate workflow from template and configuration
      const workflow = await generateWorkflowFromTemplate(
        selectedTemplate,
        wizardData.configuration || {},
        selectedGoal
      )
      
      setGeneratedWorkflow(workflow)
      
      logger.info(`[${operationId}] Workflow generated successfully`, {
        workflowBlocks: Object.keys(workflow.blocks || {}).length,
        workflowEdges: (workflow.edges || []).length
      })

      // Announce completion
      if (accessibilityMode) {
        announceToScreenReader(`Workflow generated successfully with ${Object.keys(workflow.blocks || {}).length} blocks`)
      }

      onComplete(workflow)
      
    } catch (error) {
      logger.error(`[${operationId}] Failed to generate workflow`, {
        error: error instanceof Error ? error.message : String(error),
        selectedTemplate: selectedTemplate.id
      })
      
      if (accessibilityMode) {
        announceToScreenReader('Error generating workflow. Please try again.')
      }
    } finally {
      setIsGenerating(false)
    }
  }, [selectedTemplate, wizardData.configuration, selectedGoal, accessibilityMode, onComplete])

  /**
   * Update wizard data
   */
  const updateWizardData = useCallback((key: string, value: any) => {
    setWizardData(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  /**
   * Announce to screen readers
   */
  const announceToScreenReader = useCallback((message: string) => {
    if (!accessibilityMode) return
    
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.style.position = 'absolute'
    announcement.style.left = '-10000px'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }, [accessibilityMode])

  /**
   * Initialize with goal if provided
   */
  useEffect(() => {
    if (initialGoal && BUSINESS_GOALS[initialGoal]) {
      setSelectedGoal(BUSINESS_GOALS[initialGoal])
    }
  }, [initialGoal])

  /**
   * Render current step component
   */
  const renderStepComponent = () => {
    const StepComponent = currentStep.component
    
    return (
      <StepComponent
        goal={selectedGoal}
        template={selectedTemplate}
        wizardData={wizardData}
        onGoalSelect={setSelectedGoal}
        onTemplateSelect={setSelectedTemplate}
        onDataUpdate={updateWizardData}
        accessibilityMode={accessibilityMode}
      />
    )
  }

  return (
    <div className={cn('max-w-4xl mx-auto p-6 space-y-6', className)}>
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Wand2 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Workflow Wizard</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Create powerful automation workflows in minutes with our intelligent wizard. 
          Just tell us your goal, and we'll guide you through the process.
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{currentStep.title}</span>
          <span className="text-muted-foreground">Step {currentStepIndex + 1} of {steps.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground">{currentStep.description}</p>
      </div>

      {/* Main content */}
      <Card className="min-h-[600px]">
        <CardContent className="p-8">
          {renderStepComponent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={currentStepIndex === 0 ? onCancel : handlePrevious}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{currentStepIndex === 0 ? 'Cancel' : 'Previous'}</span>
        </Button>

        <div className="flex items-center space-x-2">
          {currentStep.canSkip !== false && currentStepIndex < steps.length - 1 && (
            <Button
              variant="ghost"
              onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
              className="text-muted-foreground"
            >
              Skip this step
            </Button>
          )}
          
          <Button
            onClick={handleNext}
            disabled={isGenerating || (currentStep.validation && !currentStep.validation())}
            className="flex items-center space-x-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating...</span>
              </>
            ) : currentStepIndex === steps.length - 1 ? (
              <>
                <span>Create Workflow</span>
                <Sparkles className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Goal Selection Step Component
 */
function GoalSelectionStep({
  goal,
  onGoalSelect,
  accessibilityMode
}: {
  goal: BusinessGoal | null
  onGoalSelect: (goal: BusinessGoal) => void
  accessibilityMode?: boolean
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = ['all', 'automation', 'integration', 'data-processing', 'communication', 'monitoring']
  
  const filteredGoals = Object.values(BUSINESS_GOALS).filter(businessGoal => {
    const matchesSearch = businessGoal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         businessGoal.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || businessGoal.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Target className="w-12 h-12 text-primary mx-auto" />
        <h2 className="text-2xl font-semibold">What's your automation goal?</h2>
        <p className="text-muted-foreground">
          Choose the business process you want to automate. We'll recommend the best approach for your needs.
        </p>
      </div>

      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Label htmlFor="goal-search">Search goals</Label>
          <Input
            id="goal-search"
            placeholder="Search automation goals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="sm:w-48">
          <Label htmlFor="category-filter">Category</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger id="category-filter" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="automation">Automation</SelectItem>
              <SelectItem value="integration">Integration</SelectItem>
              <SelectItem value="data-processing">Data Processing</SelectItem>
              <SelectItem value="communication">Communication</SelectItem>
              <SelectItem value="monitoring">Monitoring</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Goal cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredGoals.map((businessGoal) => (
          <GoalCard
            key={businessGoal.id}
            goal={businessGoal}
            isSelected={goal?.id === businessGoal.id}
            onSelect={() => onGoalSelect(businessGoal)}
            accessibilityMode={accessibilityMode}
          />
        ))}
      </div>

      {filteredGoals.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No goals found matching your search criteria.</p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('')
              setSelectedCategory('all')
            }}
            className="mt-4"
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * Goal Card Component
 */
function GoalCard({
  goal,
  isSelected,
  onSelect,
  accessibilityMode
}: {
  goal: BusinessGoal
  isSelected: boolean
  onSelect: () => void
  accessibilityMode?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const complexityColor = {
    beginner: 'bg-green-500',
    intermediate: 'bg-yellow-500',
    advanced: 'bg-red-500'
  }

  const categoryIcon = {
    automation: <Zap className="w-5 h-5" />,
    integration: <Settings className="w-5 h-5" />,
    'data-processing': <Target className="w-5 h-5" />,
    communication: <Lightbulb className="w-5 h-5" />,
    monitoring: <CheckCircle className="w-5 h-5" />
  }

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-lg',
        isSelected && 'ring-2 ring-primary bg-primary/5'
      )}
      onClick={onSelect}
      role={accessibilityMode ? 'button' : undefined}
      tabIndex={accessibilityMode ? 0 : undefined}
      onKeyDown={accessibilityMode ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      } : undefined}
      aria-selected={accessibilityMode ? isSelected : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {categoryIcon[goal.category]}
            <div>
              <CardTitle className="text-lg">{goal.title}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {goal.category}
                </Badge>
                <div className="flex items-center space-x-1">
                  <div 
                    className={cn('w-2 h-2 rounded-full', complexityColor[goal.complexity])}
                    aria-label={`${goal.complexity} complexity`}
                  />
                  <span className="text-xs text-muted-foreground capitalize">
                    {goal.complexity}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  ~{goal.estimatedTime}min
                </span>
              </div>
            </div>
          </div>
          {isSelected && <CheckCircle className="w-6 h-6 text-primary" />}
        </div>
        <CardDescription className="mt-2">
          {goal.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-between p-0 h-auto text-sm"
            >
              <span>View details</span>
              <ChevronDown className={cn(
                'w-4 h-4 transition-transform duration-200',
                isExpanded && 'transform rotate-180'
              )} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-3 space-y-3">
            {/* Examples */}
            <div>
              <h4 className="text-sm font-medium mb-2">Examples:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {goal.examples.slice(0, 2).map((example, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Benefits */}
            <div>
              <h4 className="text-sm font-medium mb-2">Benefits:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {goal.benefits.slice(0, 2).map((benefit, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="w-3 h-3 text-green-500 mt-1" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Required integrations */}
            {goal.requiredIntegrations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Required integrations:</h4>
                <div className="flex flex-wrap gap-1">
                  {goal.requiredIntegrations.map((integration) => (
                    <Badge key={integration} variant="outline" className="text-xs">
                      {integration}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

/**
 * Template Selection Step Component
 */
function TemplateSelectionStep({
  goal,
  template,
  onTemplateSelect
}: {
  goal: BusinessGoal | null
  template: WorkflowTemplate | null
  onTemplateSelect: (template: WorkflowTemplate) => void
}) {
  if (!goal) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please select a goal first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Sparkles className="w-12 h-12 text-primary mx-auto" />
        <h2 className="text-2xl font-semibold">Choose your template</h2>
        <p className="text-muted-foreground">
          We've found {goal.templates.length} template{goal.templates.length !== 1 ? 's' : ''} perfect for "{goal.title}"
        </p>
      </div>

      <div className="grid gap-4">
        {goal.templates.map((temp) => (
          <TemplateCard
            key={temp.id}
            template={temp}
            isSelected={template?.id === temp.id}
            onSelect={() => onTemplateSelect(temp)}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Template Card Component
 */
function TemplateCard({
  template,
  isSelected,
  onSelect
}: {
  template: WorkflowTemplate
  isSelected: boolean
  onSelect: () => void
}) {
  const difficultyStars = Array.from({ length: 5 }, (_, i) => i < template.difficulty)

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-lg',
        isSelected && 'ring-2 ring-primary bg-primary/5'
      )}
      onClick={onSelect}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center space-x-2">
              <span>{template.title}</span>
              {isSelected && <CheckCircle className="w-5 h-5 text-primary" />}
            </CardTitle>
            <CardDescription className="mt-1">{template.description}</CardDescription>
            
            <div className="flex items-center space-x-4 mt-3">
              <div className="flex items-center space-x-1">
                <span className="text-sm text-muted-foreground">Difficulty:</span>
                <div className="flex">
                  {difficultyStars.map((filled, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-3 h-3 rounded-full',
                        filled ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                <span className="text-sm text-muted-foreground">Success rate:</span>
                <span className="text-sm font-medium">{template.successRate}%</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <span className="text-sm text-muted-foreground">Popular:</span>
                <span className="text-sm font-medium">{template.popularity}%</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium">
              {template.blocks.length} blocks, {template.connections.length} connections
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {template.blocks.slice(0, 4).map((block) => (
              <Badge key={block.id} variant="secondary" className="text-xs">
                {block.type}
              </Badge>
            ))}
            {template.blocks.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{template.blocks.length - 4} more
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Configuration Step Component
 */
function ConfigurationStep({
  template,
  wizardData,
  onDataUpdate
}: {
  template: WorkflowTemplate | null
  wizardData: Record<string, any>
  onDataUpdate: (key: string, value: any) => void
}) {
  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please select a template first.</p>
      </div>
    )
  }

  const configuration = wizardData.configuration || {}

  const handleConfigChange = (key: string, value: any) => {
    onDataUpdate('configuration', {
      ...configuration,
      [key]: value
    })
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Settings className="w-12 h-12 text-primary mx-auto" />
        <h2 className="text-2xl font-semibold">Configure your workflow</h2>
        <p className="text-muted-foreground">
          Customize "{template.title}" for your specific needs
        </p>
      </div>

      <div className="space-y-6">
        {/* Basic Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Settings</CardTitle>
            <CardDescription>
              Set up the fundamental configuration for your workflow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="workflow-name">Workflow Name</Label>
              <Input
                id="workflow-name"
                placeholder="Enter a name for your workflow"
                value={configuration.name || ''}
                onChange={(e) => handleConfigChange('name', e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="workflow-description">Description</Label>
              <Textarea
                id="workflow-description"
                placeholder="Describe what this workflow does"
                value={configuration.description || ''}
                onChange={(e) => handleConfigChange('description', e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Template-specific configuration */}
        {template.configuration.requiresEmail && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Configuration</CardTitle>
              <CardDescription>
                Set up email settings for your automation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sender-email">Sender Email</Label>
                <Input
                  id="sender-email"
                  type="email"
                  placeholder="your-email@company.com"
                  value={configuration.senderEmail || ''}
                  onChange={(e) => handleConfigChange('senderEmail', e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="email-template">Email Template Style</Label>
                <Select 
                  value={configuration.emailTemplate || 'modern'} 
                  onValueChange={(value) => handleConfigChange('emailTemplate', value)}
                >
                  <SelectTrigger id="email-template" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="classic">Classic</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {template.configuration.requiresCRM && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">CRM Integration</CardTitle>
              <CardDescription>
                Connect to your customer relationship management system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="crm-provider">CRM Provider</Label>
                <Select 
                  value={configuration.crmProvider || ''} 
                  onValueChange={(value) => handleConfigChange('crmProvider', value)}
                >
                  <SelectTrigger id="crm-provider" className="mt-1">
                    <SelectValue placeholder="Select your CRM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salesforce">Salesforce</SelectItem>
                    <SelectItem value="hubspot">HubSpot</SelectItem>
                    <SelectItem value="pipedrive">Pipedrive</SelectItem>
                    <SelectItem value="custom">Custom CRM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="crm-api-url">API Endpoint</Label>
                <Input
                  id="crm-api-url"
                  placeholder="https://api.your-crm.com/v1"
                  value={configuration.crmApiUrl || ''}
                  onChange={(e) => handleConfigChange('crmApiUrl', e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advanced Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Advanced Options</CardTitle>
            <CardDescription>
              Fine-tune your workflow behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="execution-timeout">Execution Timeout (minutes)</Label>
              <Input
                id="execution-timeout"
                type="number"
                min="1"
                max="60"
                value={configuration.timeout || 10}
                onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="error-handling">Error Handling</Label>
              <RadioGroup 
                value={configuration.errorHandling || 'retry'} 
                onValueChange={(value) => handleConfigChange('errorHandling', value)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="retry" id="error-retry" />
                  <Label htmlFor="error-retry">Retry failed steps automatically</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="stop" id="error-stop" />
                  <Label htmlFor="error-stop">Stop workflow on first error</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="continue" id="error-continue" />
                  <Label htmlFor="error-continue">Continue despite errors</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Review Step Component
 */
function ReviewStep({
  goal,
  template,
  wizardData
}: {
  goal: BusinessGoal | null
  template: WorkflowTemplate | null
  wizardData: Record<string, any>
}) {
  if (!goal || !template) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Missing required information.</p>
      </div>
    )
  }

  const configuration = wizardData.configuration || {}

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <CheckCircle className="w-12 h-12 text-primary mx-auto" />
        <h2 className="text-2xl font-semibold">Review your workflow</h2>
        <p className="text-muted-foreground">
          Double-check everything looks good before we create your automation
        </p>
      </div>

      <div className="grid gap-6">
        {/* Goal Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>Business Goal</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{goal.title}</span>
                <Badge variant="secondary">{goal.complexity}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{goal.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Template Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5" />
              <span>Selected Template</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{template.title}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Success rate:</span>
                  <span className="text-sm font-medium">{template.successRate}%</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{template.description}</p>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>{template.blocks.length} blocks</span>
                <span>{template.connections.length} connections</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {configuration.name && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Name:</span>
                  <span className="text-sm">{configuration.name}</span>
                </div>
              )}
              
              {configuration.description && (
                <div>
                  <span className="text-sm font-medium">Description:</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {configuration.description}
                  </p>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                {configuration.timeout && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Timeout:</span>
                    <span>{configuration.timeout} minutes</span>
                  </div>
                )}
                
                {configuration.errorHandling && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Error handling:</span>
                    <span className="capitalize">{configuration.errorHandling}</span>
                  </div>
                )}
                
                {configuration.crmProvider && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CRM:</span>
                    <span>{configuration.crmProvider}</span>
                  </div>
                )}
                
                {configuration.emailTemplate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email style:</span>
                    <span className="capitalize">{configuration.emailTemplate}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Alert>
          <Lightbulb className="w-4 h-4" />
          <AlertDescription>
            <strong>What happens next:</strong> We'll create your workflow with all the configured settings. 
            You can then test it, make adjustments, and deploy it when you're ready.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}

/**
 * Generate workflow from template and configuration
 */
async function generateWorkflowFromTemplate(
  template: WorkflowTemplate,
  configuration: Record<string, any>,
  goal?: BusinessGoal | null
): Promise<Partial<Workflow>> {
  const operationId = Date.now().toString()
  
  logger.info(`[${operationId}] Generating workflow from template`, {
    templateId: template.id,
    configurationKeys: Object.keys(configuration),
    goalId: goal?.id
  })

  try {
    // Transform template blocks to workflow blocks
    const blocks: Record<string, any> = {}
    
    template.blocks.forEach(templateBlock => {
      const block = {
        id: templateBlock.id,
        type: templateBlock.type,
        name: templateBlock.name,
        position: templateBlock.position,
        enabled: true,
        data: {
          ...templateBlock.config,
          // Apply configuration overrides
          ...(configuration.crmApiUrl && templateBlock.type === 'api' && {
            url: templateBlock.config.url?.replace('{{crm_api_url}}', configuration.crmApiUrl)
          }),
          ...(configuration.senderEmail && templateBlock.type === 'email' && {
            from: configuration.senderEmail
          }),
          ...(configuration.timeout && {
            timeout: configuration.timeout * 60 * 1000 // Convert minutes to milliseconds
          })
        },
        subblocks: generateSubblocksForType(templateBlock.type, templateBlock.config, configuration),
        height: 100,
        isWide: ['condition', 'javascript', 'python'].includes(templateBlock.type)
      }
      
      blocks[templateBlock.id] = block
    })

    // Transform template connections to workflow edges
    const edges = template.connections.map(conn => ({
      id: conn.id,
      source: conn.source,
      target: conn.target,
      sourceHandle: conn.sourceHandle || 'source',
      targetHandle: conn.targetHandle || 'target',
      type: 'workflowEdge'
    }))

    // Generate workflow metadata
    const workflow: Partial<Workflow> = {
      id: `workflow-${Date.now()}`,
      name: configuration.name || template.title,
      description: configuration.description || template.description,
      blocks,
      edges,
      loops: {},
      parallels: {},
      variables: {},
      // Add template metadata
      metadata: {
        templateId: template.id,
        templateTitle: template.title,
        goalId: goal?.id,
        goalTitle: goal?.title,
        generatedAt: new Date().toISOString(),
        configuration
      }
    }

    logger.info(`[${operationId}] Workflow generated successfully`, {
      workflowId: workflow.id,
      blocksCount: Object.keys(blocks).length,
      edgesCount: edges.length,
      templateId: template.id
    })

    return workflow

  } catch (error) {
    logger.error(`[${operationId}] Failed to generate workflow from template`, {
      templateId: template.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}

/**
 * Generate subblocks for different block types
 */
function generateSubblocksForType(
  blockType: string, 
  config: Record<string, any>, 
  userConfig: Record<string, any>
): Record<string, any> {
  const subblocks: Record<string, any> = {}

  switch (blockType) {
    case 'api':
      subblocks.url = config.url || ''
      subblocks.method = config.method || 'GET'
      subblocks.headers = config.headers || {}
      subblocks.body = config.body || ''
      break
      
    case 'email':
      subblocks.to = config.to || ''
      subblocks.subject = config.subject || ''
      subblocks.body = config.body || ''
      subblocks.template = config.template || userConfig.emailTemplate || 'modern'
      break
      
    case 'condition':
      subblocks.field = config.field || ''
      subblocks.operator = config.operator || 'equals'
      subblocks.value = config.value || ''
      break
      
    case 'javascript':
      subblocks.code = config.code || '// Your code here\nreturn {};'
      break
      
    case 'response':
      subblocks.message = config.message || ''
      subblocks.statusCode = config.statusCode || 200
      break
      
    default:
      // Copy all config as subblocks for unknown types
      Object.assign(subblocks, config)
  }

  return subblocks
}

export default WorkflowWizard