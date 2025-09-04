'use client'

/**
 * Guided Block Configuration Component - Smart Step-by-Step Configuration
 *
 * This component provides intelligent workflow block configuration with:
 * - Progressive disclosure with context-sensitive field presentation
 * - Smart auto-fill based on template data and user context
 * - Real-time validation with inline error prevention
 * - Accessibility-first design with full screen reader support
 * - Interactive help system with contextual tooltips
 * - Advanced form controls with conditional display logic
 *
 * Key Features:
 * - Wizard-style configuration with step validation
 * - Smart field suggestions based on template analysis
 * - Dynamic form generation with conditional fields
 * - Real-time configuration preview and testing
 * - Integration with configuration assistant for optimization
 * - Comprehensive error handling and user guidance
 *
 * @author Claude Code Wizard System
 * @version 2.0.0
 * @created 2025-09-04
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Circle,
  Code,
  Eye,
  EyeOff,
  FileText,
  Globe,
  HelpCircle,
  Info,
  Key,
  Lightbulb,
  Mail,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Shield,
  Target,
  Wand2,
  Zap,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { createLogger } from '@/lib/logs/console/logger'
import { cn } from '@/lib/utils'
import type {
  ConfigurationField,
  ConfigurationSuggestion,
  ConfigurationValidationResult,
  OptimizationRecommendation,
} from '@/lib/workflow-wizard/configuration-assistant'
import { configurationAssistant } from '@/lib/workflow-wizard/configuration-assistant'
import type {
  BusinessGoal,
  UserContext,
  WorkflowTemplate,
} from '@/lib/workflow-wizard/wizard-engine'

// Initialize structured logger
const logger = createLogger('GuidedBlockConfiguration')

/**
 * Guided Block Configuration Props
 */
export interface GuidedBlockConfigurationProps {
  selectedTemplate: WorkflowTemplate
  selectedGoal: BusinessGoal
  userContext: UserContext
  onConfigurationComplete: (configuration: Record<string, any>) => void
  onConfigurationChange?: (configuration: Record<string, any>, isValid: boolean) => void
  className?: string
  accessibilityMode?: boolean
  showAdvancedOptions?: boolean
  enablePreview?: boolean
  autoSave?: boolean
}

/**
 * Configuration Step State
 */
interface ConfigurationStep {
  id: string
  title: string
  description: string
  fields: ConfigurationField[]
  isCompleted: boolean
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Preview State
 */
interface PreviewState {
  isOpen: boolean
  isPlaying: boolean
  currentBlock: number
  totalBlocks: number
}

/**
 * Help System State
 */
interface HelpState {
  activeFieldId: string | null
  showTutorial: boolean
  completedTutorialSteps: Set<string>
}

/**
 * Field Icons Mapping
 */
const FIELD_TYPE_ICONS = {
  text: FileText,
  email: Mail,
  url: Globe,
  number: FileText,
  password: Key,
  select: Settings,
  multiselect: Settings,
  textarea: FileText,
  boolean: Settings,
  json: Code,
  credential: Shield,
}

/**
 * Category Icons Mapping
 */
const CATEGORY_ICONS = {
  basic: Target,
  integration: Globe,
  advanced: Settings,
  security: Shield,
  performance: Zap,
}

/**
 * Guided Block Configuration Component
 */
export function GuidedBlockConfiguration({
  selectedTemplate,
  selectedGoal,
  userContext,
  onConfigurationComplete,
  onConfigurationChange,
  className,
  accessibilityMode = true,
  showAdvancedOptions = false,
  enablePreview = true,
  autoSave = true,
}: GuidedBlockConfigurationProps) {
  // State management
  const [configurationFields, setConfigurationFields] = useState<ConfigurationField[]>([])
  const [currentConfiguration, setCurrentConfiguration] = useState<Record<string, any>>({})
  const [configurationSteps, setConfigurationSteps] = useState<ConfigurationStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [validationResult, setValidationResult] = useState<ConfigurationValidationResult | null>(
    null
  )
  const [suggestions, setSuggestions] = useState<ConfigurationSuggestion[]>([])
  const [optimizations, setOptimizations] = useState<OptimizationRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [previewState, setPreviewState] = useState<PreviewState>({
    isOpen: false,
    isPlaying: false,
    currentBlock: 0,
    totalBlocks: selectedTemplate.blocks.length,
  })
  const [helpState, setHelpState] = useState<HelpState>({
    activeFieldId: null,
    showTutorial: false,
    completedTutorialSteps: new Set(),
  })

  const operationId = useMemo(() => `guided_config_${Date.now()}`, [])

  /**
   * Initialize configuration fields and steps
   */
  const initializeConfiguration = useCallback(async () => {
    setLoading(true)

    logger.info(`[${operationId}] Initializing guided configuration`, {
      templateId: selectedTemplate.id,
      goalId: selectedGoal.id,
      userId: userContext.userId,
    })

    try {
      // Generate configuration fields
      const fields = await configurationAssistant.generateConfigurationFields(
        selectedTemplate,
        selectedGoal,
        userContext
      )

      setConfigurationFields(fields)

      // Organize fields into steps by category
      const stepsByCategory = fields.reduce(
        (acc, field) => {
          if (!acc[field.category]) {
            acc[field.category] = []
          }
          acc[field.category].push(field)
          return acc
        },
        {} as Record<string, ConfigurationField[]>
      )

      // Create configuration steps
      const steps: ConfigurationStep[] = Object.entries(stepsByCategory).map(
        ([category, categoryFields]) => ({
          id: category,
          title: getCategoryTitle(category),
          description: getCategoryDescription(category),
          fields: categoryFields,
          isCompleted: false,
          isValid: false,
          errors: [],
          warnings: [],
        })
      )

      setConfigurationSteps(steps)

      // Initialize configuration with default values
      const initialConfig: Record<string, any> = {}
      fields.forEach((field) => {
        if (field.suggestedValue !== undefined) {
          initialConfig[field.id] = field.suggestedValue
        } else if (field.defaultValue !== undefined) {
          initialConfig[field.id] = field.defaultValue
        }
      })

      setCurrentConfiguration(initialConfig)

      // Get initial suggestions
      const initialSuggestions = await configurationAssistant.getConfigurationSuggestions(fields, {
        template: selectedTemplate,
        goal: selectedGoal,
        userContext,
        existingConfiguration: initialConfig,
        integrationStates: {},
        environmentVariables: {},
        securityProfile: {
          level: 'standard',
          requirements: [],
          restrictions: [],
          complianceFrameworks: [],
          dataClassifications: [],
          encryptionRequirements: [],
        },
      })

      setSuggestions(initialSuggestions)

      logger.info(`[${operationId}] Configuration initialized successfully`, {
        fieldCount: fields.length,
        stepCount: steps.length,
        suggestionCount: initialSuggestions.length,
      })
    } catch (error) {
      logger.error(`[${operationId}] Failed to initialize configuration`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }, [operationId, selectedTemplate, selectedGoal, userContext])

  /**
   * Validate current configuration
   */
  const validateConfiguration = useCallback(async () => {
    if (configurationFields.length === 0) return

    try {
      const result = await configurationAssistant.validateConfiguration(
        configurationFields,
        currentConfiguration,
        {
          template: selectedTemplate,
          goal: selectedGoal,
          userContext,
          existingConfiguration: currentConfiguration,
          integrationStates: {},
          environmentVariables: {},
          securityProfile: {
            level: 'standard',
            requirements: [],
            restrictions: [],
            complianceFrameworks: [],
            dataClassifications: [],
            encryptionRequirements: [],
          },
        }
      )

      setValidationResult(result)
      setOptimizations(result.optimizations)

      // Update step validation status
      setConfigurationSteps((prev) =>
        prev.map((step) => {
          const stepFields = step.fields
          const stepErrors = result.errors.filter((error) =>
            stepFields.some((field) => field.id === error.field)
          )
          const stepWarnings = result.warnings.filter((warning) =>
            stepFields.some((field) => field.id === warning.field)
          )

          const requiredFields = stepFields.filter((field) => field.required)
          const completedRequiredFields = requiredFields.filter(
            (field) =>
              currentConfiguration[field.id] !== undefined &&
              currentConfiguration[field.id] !== null &&
              currentConfiguration[field.id] !== ''
          )

          return {
            ...step,
            isCompleted: completedRequiredFields.length === requiredFields.length,
            isValid: stepErrors.length === 0,
            errors: stepErrors.map((e) => e.message),
            warnings: stepWarnings.map((w) => w.message),
          }
        })
      )

      // Notify parent component
      if (onConfigurationChange) {
        onConfigurationChange(currentConfiguration, result.isValid)
      }
    } catch (error) {
      logger.error(`[${operationId}] Configuration validation failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [
    operationId,
    configurationFields,
    currentConfiguration,
    selectedTemplate,
    selectedGoal,
    userContext,
    onConfigurationChange,
  ])

  /**
   * Handle field value change
   */
  const handleFieldChange = useCallback(
    (fieldId: string, value: any) => {
      setCurrentConfiguration((prev) => ({
        ...prev,
        [fieldId]: value,
      }))

      logger.debug(`[${operationId}] Field value changed`, { fieldId, value })

      // Auto-save if enabled
      if (autoSave) {
        // Debounced auto-save would be implemented here
      }
    },
    [operationId, autoSave]
  )

  /**
   * Apply suggestion to configuration
   */
  const applySuggestion = useCallback(
    (suggestion: ConfigurationSuggestion) => {
      handleFieldChange(suggestion.fieldId, suggestion.suggestedValue)

      logger.info(`[${operationId}] Applied configuration suggestion`, {
        fieldId: suggestion.fieldId,
        suggestedValue: suggestion.suggestedValue,
        confidence: suggestion.confidence,
      })
    },
    [operationId, handleFieldChange]
  )

  /**
   * Navigate to next step
   */
  const nextStep = useCallback(() => {
    if (currentStepIndex < configurationSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)

      logger.debug(`[${operationId}] Advanced to next configuration step`, {
        newStepIndex: currentStepIndex + 1,
        stepId: configurationSteps[currentStepIndex + 1]?.id,
      })
    }
  }, [operationId, currentStepIndex, configurationSteps])

  /**
   * Navigate to previous step
   */
  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)

      logger.debug(`[${operationId}] Returned to previous configuration step`, {
        newStepIndex: currentStepIndex - 1,
        stepId: configurationSteps[currentStepIndex - 1]?.id,
      })
    }
  }, [operationId, currentStepIndex, configurationSteps])

  /**
   * Complete configuration
   */
  const completeConfiguration = useCallback(async () => {
    if (!validationResult?.isValid) {
      logger.warn(`[${operationId}] Attempted to complete invalid configuration`)
      return
    }

    logger.info(`[${operationId}] Completing configuration`, {
      configurationKeys: Object.keys(currentConfiguration),
    })

    onConfigurationComplete(currentConfiguration)
  }, [operationId, validationResult, currentConfiguration, onConfigurationComplete])

  /**
   * Toggle preview
   */
  const togglePreview = useCallback(() => {
    setPreviewState((prev) => ({
      ...prev,
      isOpen: !prev.isOpen,
    }))
  }, [])

  /**
   * Start preview playback
   */
  const startPreviewPlayback = useCallback(() => {
    setPreviewState((prev) => ({
      ...prev,
      isPlaying: true,
    }))
  }, [])

  /**
   * Stop preview playback
   */
  const stopPreviewPlayback = useCallback(() => {
    setPreviewState((prev) => ({
      ...prev,
      isPlaying: false,
    }))
  }, [])

  /**
   * Reset preview
   */
  const resetPreview = useCallback(() => {
    setPreviewState((prev) => ({
      ...prev,
      isPlaying: false,
      currentBlock: 0,
    }))
  }, [])

  /**
   * Get category title
   */
  const getCategoryTitle = useCallback((category: string): string => {
    const titles = {
      basic: 'Basic Settings',
      integration: 'Integrations',
      advanced: 'Advanced Options',
      security: 'Security & Privacy',
      performance: 'Performance Tuning',
    }
    return (
      titles[category as keyof typeof titles] ||
      category.charAt(0).toUpperCase() + category.slice(1)
    )
  }, [])

  /**
   * Get category description
   */
  const getCategoryDescription = useCallback((category: string): string => {
    const descriptions = {
      basic: 'Configure essential workflow settings and parameters',
      integration: 'Set up connections to external services and APIs',
      advanced: 'Fine-tune workflow behavior and advanced features',
      security: 'Configure security settings and access controls',
      performance: 'Optimize workflow performance and resource usage',
    }
    return descriptions[category as keyof typeof descriptions] || `Configure ${category} settings`
  }, [])

  /**
   * Get field icon
   */
  const getFieldIcon = useCallback((field: ConfigurationField) => {
    const IconComponent = FIELD_TYPE_ICONS[field.type] || Settings
    return IconComponent
  }, [])

  /**
   * Get category icon
   */
  const getCategoryIcon = useCallback((category: string) => {
    const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Settings
    return IconComponent
  }, [])

  // Initialize configuration on mount
  useEffect(() => {
    initializeConfiguration()
  }, [initializeConfiguration])

  // Validate configuration when it changes
  useEffect(() => {
    validateConfiguration()
  }, [validateConfiguration])

  // Auto-advance preview playback
  useEffect(() => {
    if (previewState.isPlaying && previewState.isOpen) {
      const interval = setInterval(() => {
        setPreviewState((prev) => {
          if (prev.currentBlock < prev.totalBlocks - 1) {
            return { ...prev, currentBlock: prev.currentBlock + 1 }
          }
          return { ...prev, isPlaying: false, currentBlock: 0 }
        })
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [previewState.isPlaying, previewState.isOpen])

  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className='space-y-2 text-center'>
          <div className='mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent' />
          <h2 className='font-semibold text-2xl'>Preparing Configuration</h2>
          <p className='text-muted-foreground'>
            Analyzing your template and generating smart configuration options...
          </p>
        </div>
      </div>
    )
  }

  const currentStep = configurationSteps[currentStepIndex]
  const progress =
    configurationSteps.length > 0 ? ((currentStepIndex + 1) / configurationSteps.length) * 100 : 0
  const completedSteps = configurationSteps.filter((step) => step.isCompleted).length

  return (
    <TooltipProvider>
      <div className={cn('space-y-6', className)}>
        {/* Header */}
        <div className='space-y-2 text-center'>
          <Settings className='mx-auto h-12 w-12 text-primary' />
          <h2 className='font-semibold text-2xl'>Configure Your Workflow</h2>
          <p className='mx-auto max-w-2xl text-muted-foreground'>
            We'll guide you through setting up &quot;{selectedTemplate.title}&quot; with smart
            suggestions based on your goal and previous workflows.
          </p>
        </div>

        {/* Progress */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='font-medium text-sm'>
              Step {currentStepIndex + 1} of {configurationSteps.length}
            </span>
            <span className='text-muted-foreground text-sm'>
              {completedSteps} of {configurationSteps.length} completed
            </span>
          </div>
          <Progress value={progress} className='w-full' />
        </div>

        {/* Step Navigation */}
        <div className='flex justify-center'>
          <div className='flex items-center gap-2'>
            {configurationSteps.map((step, index) => {
              const CategoryIcon = getCategoryIcon(step.id)
              const isActive = index === currentStepIndex
              const isCompleted = step.isCompleted
              const hasErrors = step.errors.length > 0

              return (
                <Tooltip key={step.id}>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                        isActive && 'border-primary bg-primary text-primary-foreground',
                        isCompleted && !isActive && 'border-green-500 bg-green-50 text-green-600',
                        hasErrors && !isActive && 'border-red-500 bg-red-50 text-red-600',
                        !isActive &&
                          !isCompleted &&
                          !hasErrors &&
                          'border-muted-foreground/30 text-muted-foreground'
                      )}
                      onClick={() => setCurrentStepIndex(index)}
                      disabled={index > currentStepIndex && !step.isCompleted}
                    >
                      {isCompleted ? (
                        <Check className='h-5 w-5' />
                      ) : hasErrors ? (
                        <AlertTriangle className='h-5 w-5' />
                      ) : (
                        <CategoryIcon className='h-5 w-5' />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className='space-y-1'>
                      <p className='font-medium'>{step.title}</p>
                      <p className='text-muted-foreground text-xs'>{step.description}</p>
                      {step.errors.length > 0 && (
                        <p className='text-red-600 text-xs'>{step.errors.length} error(s)</p>
                      )}
                      {step.warnings.length > 0 && (
                        <p className='text-xs text-yellow-600'>{step.warnings.length} warning(s)</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </div>

        {/* Current Step */}
        {currentStep && (
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='rounded-lg bg-primary/10 p-2'>
                    {React.createElement(getCategoryIcon(currentStep.id), {
                      className: 'h-6 w-6 text-primary',
                    })}
                  </div>
                  <div>
                    <CardTitle>{currentStep.title}</CardTitle>
                    <CardDescription>{currentStep.description}</CardDescription>
                  </div>
                </div>

                {enablePreview && (
                  <Button variant='outline' size='sm' onClick={togglePreview} className='gap-2'>
                    <Eye className='h-4 w-4' />
                    {previewState.isOpen ? 'Hide' : 'Show'} Preview
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className='space-y-6'>
              {/* Step Errors/Warnings */}
              {currentStep.errors.length > 0 && (
                <Alert variant='destructive'>
                  <AlertTriangle className='h-4 w-4' />
                  <AlertTitle>Please fix the following errors:</AlertTitle>
                  <AlertDescription>
                    <ul className='list-disc space-y-1 pl-4'>
                      {currentStep.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {currentStep.warnings.length > 0 && (
                <Alert>
                  <Info className='h-4 w-4' />
                  <AlertTitle>Recommendations:</AlertTitle>
                  <AlertDescription>
                    <ul className='list-disc space-y-1 pl-4'>
                      {currentStep.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Configuration Fields */}
              <div className='space-y-4'>
                {currentStep.fields.map((field) => (
                  <ConfigurationFieldComponent
                    key={field.id}
                    field={field}
                    value={currentConfiguration[field.id]}
                    onChange={(value) => handleFieldChange(field.id, value)}
                    suggestions={suggestions.filter((s) => s.fieldId === field.id)}
                    onApplySuggestion={applySuggestion}
                    validationErrors={
                      validationResult?.errors.filter((e) => e.field === field.id) || []
                    }
                    accessibilityMode={accessibilityMode}
                  />
                ))}
              </div>

              {/* Smart Suggestions */}
              {suggestions.filter((s) => currentStep.fields.some((f) => f.id === s.fieldId))
                .length > 0 && (
                <Card className='border-blue-200 bg-blue-50'>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-sm'>
                      <Wand2 className='h-4 w-4 text-blue-600' />
                      Smart Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-2'>
                    {suggestions
                      .filter((s) => currentStep.fields.some((f) => f.id === s.fieldId))
                      .slice(0, 3)
                      .map((suggestion, index) => (
                        <div
                          key={index}
                          className='flex items-center justify-between rounded border bg-white p-2'
                        >
                          <div className='flex-1'>
                            <p className='font-medium text-sm'>{suggestion.reasoning}</p>
                            <p className='text-muted-foreground text-xs'>
                              Confidence: {Math.round(suggestion.confidence * 100)}%
                            </p>
                          </div>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => applySuggestion(suggestion)}
                          >
                            Apply
                          </Button>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}

              {/* Navigation */}
              <div className='flex items-center justify-between pt-4'>
                <Button
                  variant='outline'
                  onClick={previousStep}
                  disabled={currentStepIndex === 0}
                  className='gap-2'
                >
                  <ChevronLeft className='h-4 w-4' />
                  Previous
                </Button>

                <div className='text-center'>
                  {currentStep.isCompleted ? (
                    <div className='flex items-center gap-2 text-green-600'>
                      <CheckCircle className='h-5 w-5' />
                      <span className='font-medium text-sm'>Step Complete</span>
                    </div>
                  ) : (
                    <div className='flex items-center gap-2 text-muted-foreground'>
                      <Circle className='h-5 w-5' />
                      <span className='text-sm'>In Progress</span>
                    </div>
                  )}
                </div>

                {currentStepIndex === configurationSteps.length - 1 ? (
                  <Button
                    onClick={completeConfiguration}
                    disabled={!validationResult?.isValid}
                    className='gap-2'
                  >
                    Complete Setup
                    <Check className='h-4 w-4' />
                  </Button>
                ) : (
                  <Button onClick={nextStep} disabled={!currentStep.isValid} className='gap-2'>
                    Next
                    <ChevronRight className='h-4 w-4' />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview Panel */}
        {enablePreview && previewState.isOpen && (
          <Card className='border-purple-200 bg-purple-50'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='flex items-center gap-2'>
                  <Eye className='h-5 w-5 text-purple-600' />
                  Workflow Preview
                </CardTitle>

                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={previewState.isPlaying ? stopPreviewPlayback : startPreviewPlayback}
                  >
                    {previewState.isPlaying ? (
                      <Pause className='h-4 w-4' />
                    ) : (
                      <Play className='h-4 w-4' />
                    )}
                  </Button>
                  <Button variant='outline' size='sm' onClick={resetPreview}>
                    <RotateCcw className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <span className='font-medium text-sm'>
                    Block {previewState.currentBlock + 1} of {previewState.totalBlocks}
                  </span>
                  <Progress
                    value={((previewState.currentBlock + 1) / previewState.totalBlocks) * 100}
                    className='mx-4 flex-1'
                  />
                </div>

                <div className='rounded border bg-white p-4'>
                  <div className='flex items-center gap-3'>
                    <div className='rounded bg-purple-100 p-2'>
                      <Settings className='h-5 w-5 text-purple-600' />
                    </div>
                    <div>
                      <h4 className='font-medium'>
                        {selectedTemplate.blocks[previewState.currentBlock]?.name ||
                          `Block ${previewState.currentBlock + 1}`}
                      </h4>
                      <p className='text-muted-foreground text-sm'>
                        {selectedTemplate.blocks[previewState.currentBlock]?.description ||
                          'Processing step in your workflow'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Optimization Recommendations */}
        {optimizations.length > 0 && showAdvancedOptions && (
          <Card className='border-yellow-200 bg-yellow-50'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Lightbulb className='h-5 w-5 text-yellow-600' />
                Optimization Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              {optimizations.slice(0, 3).map((optimization, index) => (
                <div key={index} className='flex items-start gap-3 rounded border bg-white p-3'>
                  <div className='rounded bg-yellow-100 p-1'>
                    <Zap className='h-4 w-4 text-yellow-600' />
                  </div>
                  <div className='flex-1'>
                    <h4 className='font-medium text-sm'>{optimization.title}</h4>
                    <p className='mb-2 text-muted-foreground text-sm'>{optimization.description}</p>
                    <div className='flex gap-2 text-xs'>
                      <Badge variant='outline'>{optimization.impact} impact</Badge>
                      <Badge variant='outline'>{optimization.effort} effort</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Configuration Summary */}
        {validationResult && (
          <Card className='border-gray-200 bg-gray-50'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-sm'>
                <Target className='h-4 w-4' />
                Configuration Summary
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                <div className='text-center'>
                  <div className='font-bold text-2xl text-primary'>
                    {Math.round(validationResult.completeness * 100)}%
                  </div>
                  <div className='text-muted-foreground text-xs'>Complete</div>
                </div>

                <div className='text-center'>
                  <div className='font-bold text-2xl text-green-600'>{completedSteps}</div>
                  <div className='text-muted-foreground text-xs'>Steps Done</div>
                </div>

                <div className='text-center'>
                  <div className='font-bold text-2xl text-red-600'>
                    {validationResult.errors.length}
                  </div>
                  <div className='text-muted-foreground text-xs'>Errors</div>
                </div>

                <div className='text-center'>
                  <div className='font-bold text-2xl text-yellow-600'>
                    {validationResult.warnings.length}
                  </div>
                  <div className='text-muted-foreground text-xs'>Warnings</div>
                </div>
              </div>

              {validationResult.readiness && (
                <div className='border-t pt-2 text-center'>
                  <div className='text-sm'>
                    Estimated setup time: ~{validationResult.readiness.estimatedSetupTime} minutes
                  </div>
                  <div
                    className={cn(
                      'mt-1 text-xs',
                      validationResult.readiness.canDeploy ? 'text-green-600' : 'text-orange-600'
                    )}
                  >
                    {validationResult.readiness.canDeploy
                      ? 'Ready to deploy'
                      : 'Configuration needed'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
}

/**
 * Individual Configuration Field Component
 */
interface ConfigurationFieldComponentProps {
  field: ConfigurationField
  value: any
  onChange: (value: any) => void
  suggestions: ConfigurationSuggestion[]
  onApplySuggestion: (suggestion: ConfigurationSuggestion) => void
  validationErrors: Array<{ message: string; severity: string }>
  accessibilityMode?: boolean
}

function ConfigurationFieldComponent({
  field,
  value,
  onChange,
  suggestions,
  onApplySuggestion,
  validationErrors,
  accessibilityMode,
}: ConfigurationFieldComponentProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const FieldIcon = FIELD_TYPE_ICONS[field.type] || Settings
  const hasErrors = validationErrors.filter((e) => e.severity === 'error').length > 0
  const hasWarnings = validationErrors.filter((e) => e.severity === 'warning').length > 0

  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
      case 'number':
        return (
          <Input
            type={field.type === 'number' ? 'number' : field.type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={cn(hasErrors && 'border-red-500')}
            aria-describedby={field.helpText ? `${field.id}-help` : undefined}
          />
        )

      case 'password':
        return (
          <div className='relative'>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              className={cn(hasErrors && 'border-red-500')}
              aria-describedby={field.helpText ? `${field.id}-help` : undefined}
            />
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent'
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
            </Button>
          </div>
        )

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className={cn(hasErrors && 'border-red-500')}
            aria-describedby={field.helpText ? `${field.id}-help` : undefined}
          />
        )

      case 'select':
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger className={cn(hasErrors && 'border-red-500')}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.examples?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'boolean':
        return (
          <div className='flex items-center space-x-2'>
            <Switch
              checked={value || false}
              onCheckedChange={onChange}
              aria-describedby={field.helpText ? `${field.id}-help` : undefined}
            />
            <Label htmlFor={field.id} className='text-sm'>
              {value ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
        )

      case 'json':
        return (
          <Textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                onChange(parsed)
              } catch {
                onChange(e.target.value)
              }
            }}
            placeholder={field.placeholder || '{}'}
            rows={4}
            className={cn('font-mono text-sm', hasErrors && 'border-red-500')}
            aria-describedby={field.helpText ? `${field.id}-help` : undefined}
          />
        )

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={cn(hasErrors && 'border-red-500')}
            aria-describedby={field.helpText ? `${field.id}-help` : undefined}
          />
        )
    }
  }

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <Label htmlFor={field.id} className='flex items-center gap-2 font-medium'>
          <FieldIcon className='h-4 w-4 text-muted-foreground' />
          {field.label}
          {field.required && <span className='text-red-500'>*</span>}
        </Label>

        <div className='flex items-center gap-1'>
          {field.sensitive && (
            <Tooltip>
              <TooltipTrigger>
                <Shield className='h-4 w-4 text-yellow-600' />
              </TooltipTrigger>
              <TooltipContent>
                <p>This field contains sensitive information</p>
              </TooltipContent>
            </Tooltip>
          )}

          {field.helpText && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-6 w-6 p-0'
                  onClick={() => setShowHelp(!showHelp)}
                >
                  <HelpCircle className='h-4 w-4 text-muted-foreground' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click for help</p>
              </TooltipContent>
            </Tooltip>
          )}

          {suggestions.length > 0 && (
            <Tooltip>
              <TooltipTrigger>
                <Wand2 className='h-4 w-4 text-blue-600' />
              </TooltipTrigger>
              <TooltipContent>
                <p>Smart suggestions available</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {field.description && <p className='text-muted-foreground text-sm'>{field.description}</p>}

      {renderField()}

      {/* Field Help */}
      <Collapsible open={showHelp} onOpenChange={setShowHelp}>
        <CollapsibleContent>
          {field.helpText && (
            <div id={`${field.id}-help`} className='rounded border bg-blue-50 p-3'>
              <p className='text-sm'>{field.helpText}</p>

              {field.examples && field.examples.length > 0 && (
                <div className='mt-2'>
                  <p className='mb-1 font-medium text-muted-foreground text-xs'>Examples:</p>
                  <div className='flex flex-wrap gap-1'>
                    {field.examples.slice(0, 3).map((example) => (
                      <Badge key={example} variant='secondary' className='text-xs'>
                        {example}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className='space-y-1'>
          {validationErrors.map((error, index) => (
            <Alert
              key={index}
              variant={error.severity === 'error' ? 'destructive' : 'default'}
              className='py-2'
            >
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription className='text-sm'>{error.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <div className='space-y-1'>
          {suggestions.slice(0, 2).map((suggestion, index) => (
            <div
              key={index}
              className='flex items-center justify-between rounded border bg-blue-50 p-2 text-sm'
            >
              <span className='flex-1'>{suggestion.reasoning}</span>
              <Button
                size='sm'
                variant='outline'
                className='ml-2'
                onClick={() => onApplySuggestion(suggestion)}
              >
                Apply
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default GuidedBlockConfiguration
