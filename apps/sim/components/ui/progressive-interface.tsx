'use client'

/**
 * Progressive Interface Component - Adaptive complexity management system
 *
 * Provides progressive disclosure of interface complexity based on user experience:
 * - Beginner mode with simplified interface and guided workflows
 * - Intermediate mode with progressive feature exposure
 * - Advanced mode with full feature access (current interface)
 * - Customizable interface based on user preferences and competence
 * - Intelligent feature recommendations and skill progression
 *
 * @created 2025-09-03
 * @author Claude Development System
 */

import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  Eye,
  EyeOff,
  GraduationCap,
  HelpCircle,
  Settings,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { createLogger } from '@/lib/logs/console/logger'
import { cn } from '@/lib/utils'

const logger = createLogger('ProgressiveInterface')

export type UserLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'custom'

export interface UserCompetence {
  overall: UserLevel
  areas: {
    workflow_creation: number // 0-100
    api_integration: number
    conditional_logic: number
    data_processing: number
    debugging: number
    advanced_features: number
  }
  completedTutorials: string[]
  workflowsCreated: number
  timeSpent: number // minutes
  lastActivity: Date
}

export interface FeatureConfig {
  id: string
  name: string
  description: string
  category: 'basic' | 'intermediate' | 'advanced' | 'expert'
  requiredLevel: UserLevel
  requiredCompetence?: {
    area: keyof UserCompetence['areas']
    threshold: number
  }
  dependencies?: string[]
  tutorialId?: string
  component: React.ComponentType<any>
  defaultVisible: boolean
  canToggle: boolean
  position: 'toolbar' | 'sidebar' | 'contextual' | 'modal'
  helpText?: string
  learnMoreUrl?: string
}

export interface InterfacePreferences {
  level: UserLevel
  customizations: {
    showAdvancedFeatures: boolean
    showTooltips: boolean
    enableSmartSuggestions: boolean
    autoUpgrade: boolean
    compactMode: boolean
  }
  hiddenFeatures: string[]
  pinnedFeatures: string[]
  notifications: {
    newFeatures: boolean
    skillProgression: boolean
    recommendations: boolean
  }
}

export interface ProgressiveInterfaceProps {
  level?: UserLevel
  competence?: UserCompetence
  preferences?: Partial<InterfacePreferences>
  onLevelChange?: (level: UserLevel) => void
  onPreferencesChange?: (preferences: InterfacePreferences) => void
  className?: string
  children: React.ReactNode
}

// Context for progressive interface state
interface ProgressiveInterfaceContext {
  level: UserLevel
  competence: UserCompetence
  preferences: InterfacePreferences
  features: Map<string, FeatureConfig>
  visibleFeatures: string[]
  availableFeatures: string[]
  suggestedFeatures: string[]
  updateLevel: (level: UserLevel) => void
  updatePreferences: (preferences: Partial<InterfacePreferences>) => void
  toggleFeature: (featureId: string, visible: boolean) => void
  shouldShowFeature: (featureId: string) => boolean
  getFeatureHelp: (featureId: string) => string | undefined
  trackFeatureUsage: (featureId: string) => void
}

const ProgressiveInterfaceContext = createContext<ProgressiveInterfaceContext | null>(null)

/**
 * Hook to access progressive interface context
 */
export function useProgressiveInterface() {
  const context = useContext(ProgressiveInterfaceContext)
  if (!context) {
    throw new Error('useProgressiveInterface must be used within ProgressiveInterface')
  }
  return context
}

/**
 * Default feature configurations
 */
const DEFAULT_FEATURES: FeatureConfig[] = [
  // Basic features - always visible for beginners
  {
    id: 'workflow-canvas',
    name: 'Workflow Canvas',
    description: 'Main area for building workflows',
    category: 'basic',
    requiredLevel: 'beginner',
    component: () => null, // Placeholder
    defaultVisible: true,
    canToggle: false,
    position: 'contextual',
  },
  {
    id: 'basic-blocks',
    name: 'Basic Blocks',
    description: 'Essential blocks like Starter, Response, and API',
    category: 'basic',
    requiredLevel: 'beginner',
    component: () => null,
    defaultVisible: true,
    canToggle: false,
    position: 'sidebar',
    helpText: 'These blocks cover 80% of common automation needs',
  },
  {
    id: 'run-workflow',
    name: 'Run Workflow',
    description: 'Execute your workflow to test it',
    category: 'basic',
    requiredLevel: 'beginner',
    component: () => null,
    defaultVisible: true,
    canToggle: false,
    position: 'toolbar',
    helpText: 'Click to run your workflow and see the results',
  },

  // Intermediate features
  {
    id: 'condition-blocks',
    name: 'Conditional Logic',
    description: 'IF/THEN logic and decision making blocks',
    category: 'intermediate',
    requiredLevel: 'intermediate',
    requiredCompetence: { area: 'conditional_logic', threshold: 30 },
    tutorialId: 'conditional-workflow',
    component: () => null,
    defaultVisible: false,
    canToggle: true,
    position: 'sidebar',
    helpText: 'Add smart decision-making to your workflows',
    learnMoreUrl: '/tutorials/conditional-logic',
  },
  {
    id: 'loop-blocks',
    name: 'Loops & Iteration',
    description: 'Process multiple items automatically',
    category: 'intermediate',
    requiredLevel: 'intermediate',
    requiredCompetence: { area: 'workflow_creation', threshold: 50 },
    tutorialId: 'loop-processing',
    component: () => null,
    defaultVisible: false,
    canToggle: true,
    position: 'sidebar',
    helpText: 'Automate repetitive tasks with loops',
  },
  {
    id: 'variable-manager',
    name: 'Variable Manager',
    description: 'Manage workflow variables and data',
    category: 'intermediate',
    requiredLevel: 'intermediate',
    requiredCompetence: { area: 'data_processing', threshold: 40 },
    component: () => null,
    defaultVisible: false,
    canToggle: true,
    position: 'sidebar',
    helpText: 'Store and manipulate data across workflow steps',
  },
  {
    id: 'workflow-versioning',
    name: 'Version Control',
    description: 'Track and manage workflow versions',
    category: 'intermediate',
    requiredLevel: 'intermediate',
    component: () => null,
    defaultVisible: false,
    canToggle: true,
    position: 'toolbar',
    helpText: 'Keep track of workflow changes and revert when needed',
  },

  // Advanced features
  {
    id: 'advanced-debugging',
    name: 'Advanced Debugging',
    description: 'Detailed execution analysis and breakpoints',
    category: 'advanced',
    requiredLevel: 'advanced',
    requiredCompetence: { area: 'debugging', threshold: 60 },
    component: () => null,
    defaultVisible: false,
    canToggle: true,
    position: 'toolbar',
    helpText: 'Deep dive into workflow execution with advanced debugging tools',
  },
  {
    id: 'custom-blocks',
    name: 'Custom Block Development',
    description: 'Create your own custom workflow blocks',
    category: 'advanced',
    requiredLevel: 'advanced',
    requiredCompetence: { area: 'advanced_features', threshold: 70 },
    component: () => null,
    defaultVisible: false,
    canToggle: true,
    position: 'sidebar',
    helpText: 'Build custom blocks with JavaScript or Python',
  },
  {
    id: 'webhook-designer',
    name: 'Webhook Designer',
    description: 'Advanced webhook configuration and testing',
    category: 'advanced',
    requiredLevel: 'advanced',
    requiredCompetence: { area: 'api_integration', threshold: 80 },
    component: () => null,
    defaultVisible: false,
    canToggle: true,
    position: 'contextual',
    helpText: 'Design and test complex webhook integrations',
  },
  {
    id: 'performance-analytics',
    name: 'Performance Analytics',
    description: 'Detailed workflow performance metrics',
    category: 'advanced',
    requiredLevel: 'advanced',
    component: () => null,
    defaultVisible: false,
    canToggle: true,
    position: 'modal',
    helpText: 'Analyze workflow performance and optimize execution',
  },

  // Expert features
  {
    id: 'workflow-marketplace',
    name: 'Workflow Marketplace',
    description: 'Share and discover community workflows',
    category: 'expert',
    requiredLevel: 'expert',
    component: () => null,
    defaultVisible: false,
    canToggle: true,
    position: 'sidebar',
    helpText: 'Connect with the community to share and discover workflows',
  },
  {
    id: 'enterprise-features',
    name: 'Enterprise Controls',
    description: 'Team management and enterprise features',
    category: 'expert',
    requiredLevel: 'expert',
    component: () => null,
    defaultVisible: false,
    canToggle: true,
    position: 'toolbar',
    helpText: 'Advanced team and enterprise management features',
  },
]

/**
 * Progressive Interface Provider Component
 */
export function ProgressiveInterface({
  level = 'beginner',
  competence,
  preferences,
  onLevelChange,
  onPreferencesChange,
  className,
  children,
}: ProgressiveInterfaceProps) {
  // Initialize state
  const [currentLevel, setCurrentLevel] = useState<UserLevel>(level)
  const [currentCompetence, setCurrentCompetence] = useState<UserCompetence>(
    competence || {
      overall: 'beginner',
      areas: {
        workflow_creation: 10,
        api_integration: 5,
        conditional_logic: 0,
        data_processing: 5,
        debugging: 0,
        advanced_features: 0,
      },
      completedTutorials: [],
      workflowsCreated: 0,
      timeSpent: 0,
      lastActivity: new Date(),
    }
  )
  const [currentPreferences, setCurrentPreferences] = useState<InterfacePreferences>({
    level: currentLevel,
    customizations: {
      showAdvancedFeatures: false,
      showTooltips: true,
      enableSmartSuggestions: true,
      autoUpgrade: true,
      compactMode: false,
    },
    hiddenFeatures: [],
    pinnedFeatures: [],
    notifications: {
      newFeatures: true,
      skillProgression: true,
      recommendations: true,
    },
    ...preferences,
  })

  // Feature management
  const features = useMemo(() => {
    const featuresMap = new Map<string, FeatureConfig>()
    DEFAULT_FEATURES.forEach((feature) => featuresMap.set(feature.id, feature))
    return featuresMap
  }, [])

  /**
   * Determine which features should be visible based on user level and competence
   */
  const getVisibleFeatures = useCallback((): string[] => {
    const operationId = Date.now().toString()

    logger.info(`[${operationId}] Calculating visible features`, {
      currentLevel,
      competenceAreas: currentCompetence.areas,
    })

    const visible: string[] = []

    features.forEach((feature, featureId) => {
      let shouldShow = false

      // Always show basic features
      if (feature.category === 'basic') {
        shouldShow = true
      }
      // Check level requirements
      else if (isLevelSufficient(currentLevel, feature.requiredLevel)) {
        // Check competence requirements if specified
        if (feature.requiredCompetence) {
          const { area, threshold } = feature.requiredCompetence
          const userCompetence = currentCompetence.areas[area]
          shouldShow = userCompetence >= threshold
        } else {
          shouldShow = true
        }
      }
      // Show if explicitly enabled by user (custom level)
      else if (
        currentLevel === 'custom' &&
        !currentPreferences.hiddenFeatures.includes(featureId)
      ) {
        shouldShow = true
      }

      // Override for manually hidden features
      if (currentPreferences.hiddenFeatures.includes(featureId)) {
        shouldShow = false
      }

      // Force show pinned features
      if (currentPreferences.pinnedFeatures.includes(featureId)) {
        shouldShow = true
      }

      if (shouldShow) {
        visible.push(featureId)
      }
    })

    logger.info(`[${operationId}] Visible features calculated`, {
      total: features.size,
      visible: visible.length,
      visibleFeatures: visible,
    })

    return visible
  }, [currentLevel, currentCompetence, currentPreferences, features])

  /**
   * Get suggested features based on user progress
   */
  const getSuggestedFeatures = useCallback((): string[] => {
    const suggestions: string[] = []
    const visibleFeatures = getVisibleFeatures()

    features.forEach((feature, featureId) => {
      // Skip if already visible
      if (visibleFeatures.includes(featureId)) return

      // Skip basic features (should already be visible)
      if (feature.category === 'basic') return

      // Check if user is close to meeting requirements
      if (feature.requiredCompetence) {
        const { area, threshold } = feature.requiredCompetence
        const userCompetence = currentCompetence.areas[area]
        const progress = userCompetence / threshold

        // Suggest if user is 70% of the way there
        if (progress >= 0.7 && progress < 1.0) {
          suggestions.push(featureId)
        }
      }
      // Suggest next level features
      else if (getNextLevel(currentLevel) === feature.requiredLevel) {
        suggestions.push(featureId)
      }
    })

    return suggestions.slice(0, 3) // Limit to 3 suggestions
  }, [currentLevel, currentCompetence, features, getVisibleFeatures])

  /**
   * Check if current level meets required level
   */
  const isLevelSufficient = (current: UserLevel, required: UserLevel): boolean => {
    const levels: UserLevel[] = ['beginner', 'intermediate', 'advanced', 'expert']
    const currentIndex = levels.indexOf(current)
    const requiredIndex = levels.indexOf(required)

    return currentIndex >= requiredIndex || current === 'custom'
  }

  /**
   * Get next level for progression
   */
  const getNextLevel = (current: UserLevel): UserLevel | null => {
    const levels: UserLevel[] = ['beginner', 'intermediate', 'advanced', 'expert']
    const currentIndex = levels.indexOf(current)

    if (currentIndex >= 0 && currentIndex < levels.length - 1) {
      return levels[currentIndex + 1]
    }

    return null
  }

  /**
   * Update user level and notify parent
   */
  const updateLevel = useCallback(
    (newLevel: UserLevel) => {
      logger.info('Updating user level', {
        from: currentLevel,
        to: newLevel,
      })

      setCurrentLevel(newLevel)
      setCurrentPreferences((prev) => ({ ...prev, level: newLevel }))
      onLevelChange?.(newLevel)
    },
    [currentLevel, onLevelChange]
  )

  /**
   * Update interface preferences
   */
  const updatePreferences = useCallback(
    (newPreferences: Partial<InterfacePreferences>) => {
      const updated = { ...currentPreferences, ...newPreferences }
      setCurrentPreferences(updated)
      onPreferencesChange?.(updated)
    },
    [currentPreferences, onPreferencesChange]
  )

  /**
   * Toggle feature visibility
   */
  const toggleFeature = useCallback(
    (featureId: string, visible: boolean) => {
      const feature = features.get(featureId)
      if (!feature || !feature.canToggle) return

      setCurrentPreferences((prev) => ({
        ...prev,
        hiddenFeatures: visible
          ? prev.hiddenFeatures.filter((id) => id !== featureId)
          : [...prev.hiddenFeatures, featureId],
        pinnedFeatures:
          visible && feature.category !== 'basic'
            ? [...prev.pinnedFeatures, featureId]
            : prev.pinnedFeatures.filter((id) => id !== featureId),
      }))

      logger.info('Toggled feature visibility', {
        featureId,
        visible,
        featureName: feature.name,
      })
    },
    [features]
  )

  /**
   * Check if feature should be shown
   */
  const shouldShowFeature = useCallback(
    (featureId: string): boolean => {
      return getVisibleFeatures().includes(featureId)
    },
    [getVisibleFeatures]
  )

  /**
   * Get help text for feature
   */
  const getFeatureHelp = useCallback(
    (featureId: string): string | undefined => {
      return features.get(featureId)?.helpText
    },
    [features]
  )

  /**
   * Track feature usage for competence calculation
   */
  const trackFeatureUsage = useCallback(
    (featureId: string) => {
      const feature = features.get(featureId)
      if (!feature) return

      // Update competence based on feature usage
      setCurrentCompetence((prev) => {
        const updated = { ...prev }

        // Increase relevant competence areas
        if (feature.requiredCompetence) {
          const { area } = feature.requiredCompetence
          updated.areas[area] = Math.min(100, updated.areas[area] + 2)
        }

        // General workflow creation competence
        updated.areas.workflow_creation = Math.min(100, updated.areas.workflow_creation + 1)

        updated.lastActivity = new Date()

        return updated
      })

      logger.info('Tracked feature usage', {
        featureId,
        featureName: feature.name,
        category: feature.category,
      })
    },
    [features]
  )

  // Auto-level progression based on competence
  useEffect(() => {
    if (!currentPreferences.customizations.autoUpgrade) return

    const overallCompetence =
      Object.values(currentCompetence.areas).reduce((sum, value) => sum + value, 0) /
      Object.keys(currentCompetence.areas).length

    let recommendedLevel: UserLevel = 'beginner'

    if (overallCompetence >= 70) {
      recommendedLevel = 'expert'
    } else if (overallCompetence >= 50) {
      recommendedLevel = 'advanced'
    } else if (overallCompetence >= 25) {
      recommendedLevel = 'intermediate'
    }

    if (recommendedLevel !== currentLevel && isLevelSufficient(recommendedLevel, currentLevel)) {
      logger.info('Auto-upgrading user level', {
        from: currentLevel,
        to: recommendedLevel,
        overallCompetence: Math.round(overallCompetence),
      })

      updateLevel(recommendedLevel)
    }
  }, [currentCompetence, currentLevel, currentPreferences.customizations.autoUpgrade, updateLevel])

  // Context value
  const contextValue: ProgressiveInterfaceContext = useMemo(
    () => ({
      level: currentLevel,
      competence: currentCompetence,
      preferences: currentPreferences,
      features,
      visibleFeatures: getVisibleFeatures(),
      availableFeatures: Array.from(features.keys()),
      suggestedFeatures: getSuggestedFeatures(),
      updateLevel,
      updatePreferences,
      toggleFeature,
      shouldShowFeature,
      getFeatureHelp,
      trackFeatureUsage,
    }),
    [
      currentLevel,
      currentCompetence,
      currentPreferences,
      features,
      getVisibleFeatures,
      getSuggestedFeatures,
      updateLevel,
      updatePreferences,
      toggleFeature,
      shouldShowFeature,
      getFeatureHelp,
      trackFeatureUsage,
    ]
  )

  return (
    <ProgressiveInterfaceContext.Provider value={contextValue}>
      <div className={cn('progressive-interface', `level-${currentLevel}`, className)}>
        {children}
      </div>
    </ProgressiveInterfaceContext.Provider>
  )
}

/**
 * Feature Visibility Control Component
 *
 * Allows users to control which features are visible in their interface
 */
export function FeatureVisibilityControl() {
  const {
    level,
    competence,
    features,
    visibleFeatures,
    suggestedFeatures,
    updateLevel,
    updatePreferences,
    toggleFeature,
    preferences,
  } = useProgressiveInterface()

  const [isOpen, setIsOpen] = useState(false)

  const levelOptions = [
    { value: 'beginner', label: 'Beginner', description: 'Simple interface with guided workflows' },
    {
      value: 'intermediate',
      label: 'Intermediate',
      description: 'More features with progressive complexity',
    },
    { value: 'advanced', label: 'Advanced', description: 'Full feature access for power users' },
    { value: 'expert', label: 'Expert', description: 'All features including experimental ones' },
    { value: 'custom', label: 'Custom', description: 'Manually control which features to show' },
  ]

  const featuresByCategory = useMemo(() => {
    const categories: Record<string, FeatureConfig[]> = {
      basic: [],
      intermediate: [],
      advanced: [],
      expert: [],
    }

    features.forEach((feature) => {
      categories[feature.category].push(feature)
    })

    return categories
  }, [features])

  const overallProgress = useMemo(() => {
    const scores = Object.values(competence.areas)
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  }, [competence.areas])

  return (
    <Card className='w-full max-w-2xl'>
      <CardHeader>
        <CardTitle className='flex items-center space-x-2'>
          <Settings className='h-5 w-5' />
          <span>Interface Settings</span>
        </CardTitle>
        <CardDescription>
          Customize your interface complexity and available features
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Current Level and Progress */}
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div className='space-y-1'>
              <h3 className='font-medium text-sm'>Current Level</h3>
              <Badge variant='secondary' className='capitalize'>
                {level}
              </Badge>
            </div>
            <div className='space-y-1 text-right'>
              <p className='text-muted-foreground text-sm'>Overall Progress</p>
              <div className='flex items-center space-x-2'>
                <Progress value={overallProgress} className='w-20' />
                <span className='font-medium text-sm'>{overallProgress}%</span>
              </div>
            </div>
          </div>

          {/* Competence Areas */}
          <div className='grid grid-cols-2 gap-4'>
            {Object.entries(competence.areas).map(([area, score]) => (
              <div key={area} className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground text-xs capitalize'>
                    {area.replace('_', ' ')}
                  </span>
                  <span className='font-medium text-xs'>{score}%</span>
                </div>
                <Progress value={score} className='h-1' />
              </div>
            ))}
          </div>
        </div>

        {/* Level Selection */}
        <div className='space-y-3'>
          <h3 className='font-medium text-sm'>Interface Level</h3>
          <Select value={level} onValueChange={(value: UserLevel) => updateLevel(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {levelOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className='space-y-1'>
                    <div className='font-medium'>{option.label}</div>
                    <div className='text-muted-foreground text-xs'>{option.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Suggested Features */}
        {suggestedFeatures.length > 0 && (
          <div className='space-y-3'>
            <h3 className='flex items-center space-x-2 font-medium text-sm'>
              <Sparkles className='h-4 w-4' />
              <span>Suggested Features</span>
            </h3>
            <div className='space-y-2'>
              {suggestedFeatures.map((featureId) => {
                const feature = features.get(featureId)
                if (!feature) return null

                return (
                  <Alert
                    key={featureId}
                    className='border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                  >
                    <Target className='h-4 w-4' />
                    <AlertDescription>
                      <div className='flex items-center justify-between'>
                        <div>
                          <strong>{feature.name}</strong> - {feature.description}
                          {feature.helpText && (
                            <p className='mt-1 text-muted-foreground text-xs'>{feature.helpText}</p>
                          )}
                        </div>
                        <Button size='sm' onClick={() => toggleFeature(featureId, true)}>
                          Enable
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )
              })}
            </div>
          </div>
        )}

        {/* Feature Categories */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant='outline' className='w-full justify-between'>
              <span>Advanced Feature Control</span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className='mt-4 space-y-4'>
            {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
              <div key={category} className='space-y-2'>
                <h4 className='flex items-center space-x-2 font-medium text-sm capitalize'>
                  {category === 'basic' && <Zap className='h-4 w-4' />}
                  {category === 'intermediate' && <Target className='h-4 w-4' />}
                  {category === 'advanced' && <Settings className='h-4 w-4' />}
                  {category === 'expert' && <GraduationCap className='h-4 w-4' />}
                  <span>{category} Features</span>
                </h4>
                <div className='space-y-1'>
                  {categoryFeatures.map((feature) => {
                    const isVisible = visibleFeatures.includes(feature.id)
                    const canToggle =
                      feature.canToggle && (level === 'custom' || feature.category !== 'basic')

                    return (
                      <div
                        key={feature.id}
                        className='flex items-center justify-between rounded-md border px-3 py-2'
                      >
                        <div className='flex-1'>
                          <div className='flex items-center space-x-2'>
                            <span className='font-medium text-sm'>{feature.name}</span>
                            {feature.helpText && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className='h-3 w-3 text-muted-foreground' />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className='max-w-xs'>{feature.helpText}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <p className='text-muted-foreground text-xs'>{feature.description}</p>
                        </div>
                        <div className='flex items-center space-x-2'>
                          {isVisible ? (
                            <Eye className='h-4 w-4 text-green-500' />
                          ) : (
                            <EyeOff className='h-4 w-4 text-muted-foreground' />
                          )}
                          {canToggle && (
                            <Switch
                              checked={isVisible}
                              onCheckedChange={(checked) => toggleFeature(feature.id, checked)}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Additional Preferences */}
        <div className='space-y-3'>
          <h3 className='font-medium text-sm'>Interface Preferences</h3>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <div className='space-y-1'>
                <p className='text-sm'>Show tooltips</p>
                <p className='text-muted-foreground text-xs'>
                  Display helpful tooltips throughout the interface
                </p>
              </div>
              <Switch
                checked={preferences.customizations.showTooltips}
                onCheckedChange={(checked) =>
                  updatePreferences({
                    customizations: {
                      ...preferences.customizations,
                      showTooltips: checked,
                    },
                  })
                }
              />
            </div>

            <div className='flex items-center justify-between'>
              <div className='space-y-1'>
                <p className='text-sm'>Smart suggestions</p>
                <p className='text-muted-foreground text-xs'>
                  Get intelligent feature and workflow recommendations
                </p>
              </div>
              <Switch
                checked={preferences.customizations.enableSmartSuggestions}
                onCheckedChange={(checked) =>
                  updatePreferences({
                    customizations: {
                      ...preferences.customizations,
                      enableSmartSuggestions: checked,
                    },
                  })
                }
              />
            </div>

            <div className='flex items-center justify-between'>
              <div className='space-y-1'>
                <p className='text-sm'>Auto-upgrade level</p>
                <p className='text-muted-foreground text-xs'>
                  Automatically progress to higher levels as you gain expertise
                </p>
              </div>
              <Switch
                checked={preferences.customizations.autoUpgrade}
                onCheckedChange={(checked) =>
                  updatePreferences({
                    customizations: {
                      ...preferences.customizations,
                      autoUpgrade: checked,
                    },
                  })
                }
              />
            </div>

            <div className='flex items-center justify-between'>
              <div className='space-y-1'>
                <p className='text-sm'>Compact mode</p>
                <p className='text-muted-foreground text-xs'>Use a more compact interface layout</p>
              </div>
              <Switch
                checked={preferences.customizations.compactMode}
                onCheckedChange={(checked) =>
                  updatePreferences({
                    customizations: {
                      ...preferences.customizations,
                      compactMode: checked,
                    },
                  })
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Feature Gate Component
 *
 * Conditionally renders children based on feature visibility
 */
interface FeatureGateProps {
  featureId: string
  fallback?: React.ReactNode
  children: React.ReactNode
  onFeatureRequest?: (featureId: string) => void
}

export function FeatureGate({ featureId, fallback, children, onFeatureRequest }: FeatureGateProps) {
  const { shouldShowFeature, features, getFeatureHelp } = useProgressiveInterface()

  const isVisible = shouldShowFeature(featureId)
  const feature = features.get(featureId)
  const helpText = getFeatureHelp(featureId)

  if (isVisible) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  // Show feature request prompt for advanced features
  if (feature && feature.category !== 'basic' && onFeatureRequest) {
    return (
      <div className='rounded-lg border-2 border-muted-foreground/30 border-dashed p-4 text-center'>
        <div className='space-y-2'>
          <BookOpen className='mx-auto h-8 w-8 text-muted-foreground' />
          <h3 className='font-medium text-muted-foreground text-sm'>{feature.name} Available</h3>
          <p className='text-muted-foreground text-xs'>{helpText || feature.description}</p>
          <Button size='sm' variant='outline' onClick={() => onFeatureRequest(featureId)}>
            Enable Feature
          </Button>
        </div>
      </div>
    )
  }

  return null
}

export default ProgressiveInterface
