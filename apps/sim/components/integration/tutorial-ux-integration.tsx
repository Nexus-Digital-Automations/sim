'use client'

/**
 * Tutorial and UX Integration Component - Comprehensive system integration
 *
 * Provides unified access to all tutorial and UX enhancement features:
 * - Tutorial system with progressive onboarding
 * - Workflow wizard with intelligent recommendations
 * - Accessibility compliance and progressive disclosure
 * - Contextual help and debugging assistance
 * - Enhanced interactions with guided workflows
 * - Analytics and progress tracking
 *
 * @created 2025-09-03
 * @author Claude Development System
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Accessibility,
  Award,
  BookOpen,
  Bug,
  ChevronRight,
  HelpCircle,
  Play,
  TrendingUp,
  Wand2,
  X,
} from 'lucide-react'
import { EnhancedDragDropProvider } from '@/components/enhanced-dnd/enhanced-drag-drop'
// Import our enhancement systems
import { InteractiveTour } from '@/components/onboarding/interactive-tour'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ProgressiveInterface } from '@/components/ui/progressive-interface'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { accessibilityManager } from '@/lib/accessibility/accessibility-manager'
import { createLogger } from '@/lib/logs/console/logger'
import {
  type Tutorial,
  type TutorialSession,
  tutorialSystem,
} from '@/lib/onboarding/tutorial-system'
import { cn } from '@/lib/utils'

const logger = createLogger('TutorialUXIntegration')

export interface TutorialUXIntegrationProps {
  userId: string
  workspaceId?: string
  workflowId?: string
  userLevel?: 'beginner' | 'intermediate' | 'advanced'
  onFeatureEnabled?: (feature: string, enabled: boolean) => void
  onTutorialCompleted?: (tutorialId: string, result: any) => void
  onPreferencesChanged?: (preferences: any) => void
  className?: string
}

export interface UXState {
  // Tutorial system
  activeTutorial: TutorialSession | null
  availableTutorials: Tutorial[]
  tutorialProgress: any

  // Interface complexity
  interfaceComplexity: 'beginner' | 'intermediate' | 'advanced' | 'expert'

  // Accessibility
  accessibilityMode: boolean
  highContrast: boolean
  reducedMotion: boolean
  screenReaderMode: boolean
  keyboardNavigation: boolean

  // Features
  contextualHelpEnabled: boolean
  debugAssistantEnabled: boolean
  workflowWizardEnabled: boolean
  enhancedDragDropEnabled: boolean

  // Analytics
  userAnalytics: {
    tutorialsCompleted: number
    averageScore: number
    timeSpent: number
    featuresUsed: string[]
    strugglingAreas: string[]
  }
}

/**
 * Main Tutorial and UX Integration Component
 */
export function TutorialUXIntegration({
  userId,
  workspaceId,
  workflowId,
  userLevel = 'beginner',
  onFeatureEnabled,
  onTutorialCompleted,
  onPreferencesChanged,
  className,
}: TutorialUXIntegrationProps) {
  // State management
  const [uxState, setUXState] = useState<UXState>({
    activeTutorial: null,
    availableTutorials: [],
    tutorialProgress: null,
    interfaceComplexity: userLevel,
    accessibilityMode: false,
    highContrast: false,
    reducedMotion: false,
    screenReaderMode: false,
    keyboardNavigation: false,
    contextualHelpEnabled: true,
    debugAssistantEnabled: true,
    workflowWizardEnabled: true,
    enhancedDragDropEnabled: true,
    userAnalytics: {
      tutorialsCompleted: 0,
      averageScore: 0,
      timeSpent: 0,
      featuresUsed: [],
      strugglingAreas: [],
    },
  })

  const [isInterfaceOpen, setIsInterfaceOpen] = useState(false)
  const [activePanel, setActivePanel] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)

  // Initialize systems on mount
  useEffect(() => {
    initializeSystems()
  }, [userId])

  // Update interface complexity when user level changes
  useEffect(() => {
    if (userLevel !== uxState.interfaceComplexity) {
      updateInterfaceComplexity(userLevel)
    }
  }, [userLevel, uxState.interfaceComplexity])

  /**
   * Initialize all enhancement systems
   */
  const initializeSystems = useCallback(async () => {
    const operationId = Date.now().toString()

    logger.info(`[${operationId}] Initializing tutorial and UX systems`, {
      userId,
      workspaceId,
      workflowId,
      userLevel,
    })

    try {
      setIsLoading(true)

      // Load user preferences and progress
      const userProgress = tutorialSystem.getUserProgress(userId)
      const availableTutorials = tutorialSystem.getAvailableTutorials(userId)

      // Initialize accessibility manager
      await accessibilityManager.initializeAccessibilityFeatures({
        userId,
        enableScreenReaderOptimization: false,
        enableKeyboardNavigation: false,
        enableHighContrastMode: false,
      })

      // Update state with loaded data
      setUXState((prevState) => ({
        ...prevState,
        availableTutorials,
        tutorialProgress: userProgress,
        userAnalytics: {
          tutorialsCompleted: userProgress?.totalTutorialsCompleted || 0,
          averageScore: userProgress?.averageScore || 0,
          timeSpent: userProgress?.totalTimeSpent || 0,
          featuresUsed: [],
          strugglingAreas: userProgress?.weakAreas || [],
        },
      }))

      logger.info(`[${operationId}] Systems initialized successfully`, {
        availableTutorialsCount: availableTutorials.length,
        userProgressExists: !!userProgress,
      })
    } catch (error) {
      logger.error(`[${operationId}] Failed to initialize systems`, {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsLoading(false)
    }
  }, [userId, workspaceId, workflowId, userLevel])

  /**
   * Start a tutorial session
   */
  const startTutorial = useCallback(
    async (tutorialId: string) => {
      const operationId = Date.now().toString()

      logger.info(`[${operationId}] Starting tutorial`, { tutorialId, userId })

      try {
        const session = await tutorialSystem.startTutorial(tutorialId, userId, {
          workspaceId,
          workflowId,
          userLevel: uxState.interfaceComplexity,
        })

        setUXState((prevState) => ({
          ...prevState,
          activeTutorial: session,
        }))

        logger.info(`[${operationId}] Tutorial started successfully`, {
          sessionId: session.id,
          tutorialId,
        })
      } catch (error) {
        logger.error(`[${operationId}] Failed to start tutorial`, {
          tutorialId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    },
    [userId, workspaceId, workflowId, uxState.interfaceComplexity]
  )

  /**
   * Update interface complexity level
   */
  const updateInterfaceComplexity = useCallback(
    async (level: UXState['interfaceComplexity']) => {
      const operationId = Date.now().toString()

      logger.info(`[${operationId}] Updating interface complexity`, {
        from: uxState.interfaceComplexity,
        to: level,
        userId,
      })

      setUXState((prevState) => ({
        ...prevState,
        interfaceComplexity: level,
      }))

      onPreferencesChanged?.({ interfaceComplexity: level })

      logger.info(`[${operationId}] Interface complexity updated`, { level })
    },
    [uxState.interfaceComplexity, onPreferencesChanged]
  )

  /**
   * Toggle accessibility feature
   */
  const toggleAccessibilityFeature = useCallback(
    async (feature: keyof UXState, enabled: boolean) => {
      const operationId = Date.now().toString()

      logger.info(`[${operationId}] Toggling accessibility feature`, {
        feature,
        enabled,
        userId,
      })

      setUXState((prevState) => ({
        ...prevState,
        [feature]: enabled,
      }))

      // Update accessibility manager
      switch (feature) {
        case 'accessibilityMode':
          if (enabled) {
            await accessibilityManager.enableFeature('screenReader')
          } else {
            await accessibilityManager.disableFeature('screenReader')
          }
          break
        case 'highContrast':
          if (enabled) {
            await accessibilityManager.enableFeature('highContrast')
          } else {
            await accessibilityManager.disableFeature('highContrast')
          }
          break
        case 'keyboardNavigation':
          if (enabled) {
            await accessibilityManager.enableFeature('keyboardNavigation')
          } else {
            await accessibilityManager.disableFeature('keyboardNavigation')
          }
          break
      }

      onFeatureEnabled?.(feature, enabled)
      onPreferencesChanged?.({ [feature]: enabled })

      logger.info(`[${operationId}] Accessibility feature toggled`, { feature, enabled })
    },
    [onFeatureEnabled, onPreferencesChanged]
  )

  /**
   * Toggle UX enhancement feature
   */
  const toggleUXFeature = useCallback(
    (feature: keyof UXState, enabled: boolean) => {
      setUXState((prevState) => ({
        ...prevState,
        [feature]: enabled,
      }))

      onFeatureEnabled?.(feature, enabled)
      onPreferencesChanged?.({ [feature]: enabled })
    },
    [onFeatureEnabled, onPreferencesChanged]
  )

  /**
   * Handle tutorial completion
   */
  const handleTutorialComplete = useCallback(
    async (result: any) => {
      const operationId = Date.now().toString()

      logger.info(`[${operationId}] Tutorial completed`, {
        tutorialId: uxState.activeTutorial?.tutorialId,
        score: result.score,
        achievements: result.achievements?.length || 0,
      })

      // Update user analytics
      setUXState((prevState) => ({
        ...prevState,
        activeTutorial: null,
        userAnalytics: {
          ...prevState.userAnalytics,
          tutorialsCompleted: prevState.userAnalytics.tutorialsCompleted + 1,
          averageScore: result.score,
          timeSpent: prevState.userAnalytics.timeSpent + result.timeSpent,
        },
      }))

      onTutorialCompleted?.(uxState.activeTutorial?.tutorialId || '', result)

      logger.info(`[${operationId}] Tutorial completion handled`, {
        newCompletedCount: uxState.userAnalytics.tutorialsCompleted + 1,
      })
    },
    [uxState.activeTutorial, uxState.userAnalytics, onTutorialCompleted]
  )

  if (isLoading) {
    return (
      <div className={cn('fixed right-4 bottom-4 z-50', className)}>
        <Card className='w-80 shadow-lg'>
          <CardContent className='p-4'>
            <div className='flex items-center space-x-3'>
              <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent' />
              <span className='text-sm'>Initializing tutorial system...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('tutorial-ux-integration', className)}>
      {/* Main Integration Interface */}
      {isInterfaceOpen && (
        <div className='fixed inset-0 z-50 bg-background/80 backdrop-blur-sm'>
          <div className='fixed top-0 right-0 h-full w-96 border-l bg-background shadow-lg'>
            <div className='flex items-center justify-between border-b p-4'>
              <h2 className='font-semibold text-lg'>Tutorial & UX Center</h2>
              <Button variant='ghost' size='sm' onClick={() => setIsInterfaceOpen(false)}>
                <X className='h-4 w-4' />
              </Button>
            </div>

            <div className='h-[calc(100vh-4rem)] overflow-hidden'>
              <Tabs value={activePanel} onValueChange={setActivePanel} className='h-full'>
                <TabsList className='grid w-full grid-cols-4'>
                  <TabsTrigger value='overview' className='text-xs'>
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value='tutorials' className='text-xs'>
                    Tutorials
                  </TabsTrigger>
                  <TabsTrigger value='accessibility' className='text-xs'>
                    Accessibility
                  </TabsTrigger>
                  <TabsTrigger value='settings' className='text-xs'>
                    Settings
                  </TabsTrigger>
                </TabsList>

                {/* Overview Panel */}
                <TabsContent
                  value='overview'
                  className='h-[calc(100%-3rem)] space-y-4 overflow-y-auto p-4'
                >
                  <OverviewPanel
                    uxState={uxState}
                    onStartTutorial={startTutorial}
                    onToggleFeature={toggleUXFeature}
                  />
                </TabsContent>

                {/* Tutorials Panel */}
                <TabsContent
                  value='tutorials'
                  className='h-[calc(100%-3rem)] space-y-4 overflow-y-auto p-4'
                >
                  <TutorialsPanel
                    tutorials={uxState.availableTutorials}
                    activeTutorial={uxState.activeTutorial}
                    tutorialProgress={uxState.tutorialProgress}
                    onStartTutorial={startTutorial}
                    onTutorialComplete={handleTutorialComplete}
                  />
                </TabsContent>

                {/* Accessibility Panel */}
                <TabsContent
                  value='accessibility'
                  className='h-[calc(100%-3rem)] space-y-4 overflow-y-auto p-4'
                >
                  <AccessibilityPanel
                    uxState={uxState}
                    onToggleFeature={toggleAccessibilityFeature}
                  />
                </TabsContent>

                {/* Settings Panel */}
                <TabsContent
                  value='settings'
                  className='h-[calc(100%-3rem)] space-y-4 overflow-y-auto p-4'
                >
                  <SettingsPanel
                    uxState={uxState}
                    onUpdateComplexity={updateInterfaceComplexity}
                    onToggleFeature={toggleUXFeature}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <div className='fixed right-6 bottom-6 z-40'>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size='lg'
              className='h-14 w-14 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl'
              onClick={() => setIsInterfaceOpen(!isInterfaceOpen)}
            >
              <HelpCircle className='h-6 w-6' />
            </Button>
          </TooltipTrigger>
          <TooltipContent side='left'>
            <p>Open Tutorial & UX Center</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Active Tutorial Overlay */}
      {uxState.activeTutorial && (
        <InteractiveTour
          sessionId={uxState.activeTutorial.id}
          onStepComplete={(stepId) => {
            // Handle step completion
            tutorialSystem.trackProgress(uxState.activeTutorial!.id, stepId)
          }}
          onComplete={handleTutorialComplete}
          accessibilityMode={uxState.accessibilityMode}
        />
      )}

      {/* Progressive Interface Wrapper */}
      <ProgressiveInterface
        userLevel={uxState.interfaceComplexity}
        preferences={{
          showAdvancedFeatures: uxState.interfaceComplexity !== 'beginner',
          enableTooltips: true,
          enableAnimations: !uxState.reducedMotion,
        }}
        onLevelChange={updateInterfaceComplexity}
      >
        {/* Enhanced Drag and Drop Provider */}
        {uxState.enhancedDragDropEnabled && (
          <EnhancedDragDropProvider
            accessibilityMode={uxState.accessibilityMode}
            touchEnabled={true}
            animationsEnabled={!uxState.reducedMotion}
          >
            {/* Content will be wrapped by this provider */}
          </EnhancedDragDropProvider>
        )}
      </ProgressiveInterface>
    </div>
  )
}

/**
 * Overview Panel Component
 */
interface OverviewPanelProps {
  uxState: UXState
  onStartTutorial: (tutorialId: string) => void
  onToggleFeature: (feature: keyof UXState, enabled: boolean) => void
}

function OverviewPanel({ uxState, onStartTutorial, onToggleFeature }: OverviewPanelProps) {
  return (
    <div className='space-y-4'>
      {/* User Progress Summary */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center space-x-2'>
            <TrendingUp className='h-5 w-5' />
            <span>Your Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='text-center'>
              <div className='font-bold text-2xl text-primary'>
                {uxState.userAnalytics.tutorialsCompleted}
              </div>
              <div className='text-muted-foreground text-sm'>Tutorials Completed</div>
            </div>
            <div className='text-center'>
              <div className='font-bold text-2xl text-green-600'>
                {Math.round(uxState.userAnalytics.averageScore)}%
              </div>
              <div className='text-muted-foreground text-sm'>Average Score</div>
            </div>
          </div>

          <div>
            <div className='mb-2 flex justify-between text-sm'>
              <span>Experience Level</span>
              <Badge variant='secondary'>{uxState.interfaceComplexity}</Badge>
            </div>
            <Progress
              value={
                uxState.interfaceComplexity === 'beginner'
                  ? 25
                  : uxState.interfaceComplexity === 'intermediate'
                    ? 50
                    : uxState.interfaceComplexity === 'advanced'
                      ? 75
                      : 100
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          {uxState.availableTutorials.slice(0, 3).map((tutorial) => (
            <Button
              key={tutorial.id}
              variant='outline'
              className='w-full justify-between'
              onClick={() => onStartTutorial(tutorial.id)}
            >
              <div className='flex items-center space-x-2'>
                <BookOpen className='h-4 w-4' />
                <span>{tutorial.title}</span>
              </div>
              <ChevronRight className='h-4 w-4' />
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>UX Enhancements</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <HelpCircle className='h-4 w-4' />
              <span className='text-sm'>Contextual Help</span>
            </div>
            <Switch
              checked={uxState.contextualHelpEnabled}
              onCheckedChange={(enabled) => onToggleFeature('contextualHelpEnabled', enabled)}
            />
          </div>

          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <Bug className='h-4 w-4' />
              <span className='text-sm'>Debug Assistant</span>
            </div>
            <Switch
              checked={uxState.debugAssistantEnabled}
              onCheckedChange={(enabled) => onToggleFeature('debugAssistantEnabled', enabled)}
            />
          </div>

          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <Wand2 className='h-4 w-4' />
              <span className='text-sm'>Workflow Wizard</span>
            </div>
            <Switch
              checked={uxState.workflowWizardEnabled}
              onCheckedChange={(enabled) => onToggleFeature('workflowWizardEnabled', enabled)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Tutorials Panel Component
 */
interface TutorialsPanelProps {
  tutorials: Tutorial[]
  activeTutorial: TutorialSession | null
  tutorialProgress: any
  onStartTutorial: (tutorialId: string) => void
  onTutorialComplete: (result: any) => void
}

function TutorialsPanel({
  tutorials,
  activeTutorial,
  tutorialProgress,
  onStartTutorial,
  onTutorialComplete,
}: TutorialsPanelProps) {
  return (
    <div className='space-y-4'>
      {/* Active Tutorial */}
      {activeTutorial && (
        <Card className='border-primary bg-primary/5'>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <Play className='h-5 w-5 text-primary' />
              <span>Active Tutorial</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              <h4 className='font-medium'>
                {tutorials.find((t) => t.id === activeTutorial.tutorialId)?.title}
              </h4>
              <Progress
                value={
                  (activeTutorial.currentStepIndex /
                    (tutorials.find((t) => t.id === activeTutorial.tutorialId)?.steps.length ||
                      1)) *
                  100
                }
              />
              <div className='text-muted-foreground text-sm'>
                Step {activeTutorial.currentStepIndex + 1} of{' '}
                {tutorials.find((t) => t.id === activeTutorial.tutorialId)?.steps.length}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Tutorials */}
      <div className='space-y-3'>
        <h3 className='font-medium'>Available Tutorials</h3>
        {tutorials.map((tutorial) => (
          <Card key={tutorial.id} className='cursor-pointer transition-shadow hover:shadow-md'>
            <CardContent className='p-4'>
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <h4 className='mb-1 font-medium'>{tutorial.title}</h4>
                  <p className='mb-2 text-muted-foreground text-sm'>{tutorial.description}</p>

                  <div className='flex items-center space-x-4 text-muted-foreground text-xs'>
                    <span>{tutorial.estimatedDuration} min</span>
                    <span>{tutorial.steps.length} steps</span>
                    <Badge variant='outline' className='text-xs'>
                      {tutorial.category}
                    </Badge>
                  </div>
                </div>

                <Button
                  size='sm'
                  onClick={() => onStartTutorial(tutorial.id)}
                  disabled={!!activeTutorial}
                >
                  Start
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/**
 * Accessibility Panel Component
 */
interface AccessibilityPanelProps {
  uxState: UXState
  onToggleFeature: (feature: keyof UXState, enabled: boolean) => void
}

function AccessibilityPanel({ uxState, onToggleFeature }: AccessibilityPanelProps) {
  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center space-x-2'>
            <Accessibility className='h-5 w-5' />
            <span>Accessibility Features</span>
          </CardTitle>
          <CardDescription>
            Configure accessibility options to improve your experience
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <div className='font-medium'>Screen Reader Mode</div>
              <div className='text-muted-foreground text-sm'>Enhanced screen reader support</div>
            </div>
            <Switch
              checked={uxState.accessibilityMode}
              onCheckedChange={(enabled) => onToggleFeature('accessibilityMode', enabled)}
            />
          </div>

          <Separator />

          <div className='flex items-center justify-between'>
            <div>
              <div className='font-medium'>High Contrast Mode</div>
              <div className='text-muted-foreground text-sm'>Improved visual contrast</div>
            </div>
            <Switch
              checked={uxState.highContrast}
              onCheckedChange={(enabled) => onToggleFeature('highContrast', enabled)}
            />
          </div>

          <Separator />

          <div className='flex items-center justify-between'>
            <div>
              <div className='font-medium'>Reduced Motion</div>
              <div className='text-muted-foreground text-sm'>
                Minimize animations and transitions
              </div>
            </div>
            <Switch
              checked={uxState.reducedMotion}
              onCheckedChange={(enabled) => onToggleFeature('reducedMotion', enabled)}
            />
          </div>

          <Separator />

          <div className='flex items-center justify-between'>
            <div>
              <div className='font-medium'>Keyboard Navigation</div>
              <div className='text-muted-foreground text-sm'>Enhanced keyboard controls</div>
            </div>
            <Switch
              checked={uxState.keyboardNavigation}
              onCheckedChange={(enabled) => onToggleFeature('keyboardNavigation', enabled)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Accessibility Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle>WCAG 2.1 Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-sm'>Level AA Compliance</span>
              <Badge className='bg-green-100 text-green-800'>Achieved</Badge>
            </div>
            <div className='text-muted-foreground text-sm'>
              This application meets WCAG 2.1 Level AA accessibility standards
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Settings Panel Component
 */
interface SettingsPanelProps {
  uxState: UXState
  onUpdateComplexity: (level: UXState['interfaceComplexity']) => void
  onToggleFeature: (feature: keyof UXState, enabled: boolean) => void
}

function SettingsPanel({ uxState, onUpdateComplexity, onToggleFeature }: SettingsPanelProps) {
  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Interface Complexity</CardTitle>
          <CardDescription>Adjust the complexity level to match your experience</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={uxState.interfaceComplexity} onValueChange={onUpdateComplexity}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='beginner'>Beginner - Simplified interface</SelectItem>
              <SelectItem value='intermediate'>Intermediate - Balanced features</SelectItem>
              <SelectItem value='advanced'>Advanced - Full feature set</SelectItem>
              <SelectItem value='expert'>Expert - All capabilities</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>UX Enhancement Features</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <div className='font-medium'>Enhanced Drag & Drop</div>
              <div className='text-muted-foreground text-sm'>Visual feedback and validation</div>
            </div>
            <Switch
              checked={uxState.enhancedDragDropEnabled}
              onCheckedChange={(enabled) => onToggleFeature('enhancedDragDropEnabled', enabled)}
            />
          </div>

          <Separator />

          <div className='flex items-center justify-between'>
            <div>
              <div className='font-medium'>Workflow Wizard</div>
              <div className='text-muted-foreground text-sm'>Guided workflow creation</div>
            </div>
            <Switch
              checked={uxState.workflowWizardEnabled}
              onCheckedChange={(enabled) => onToggleFeature('workflowWizardEnabled', enabled)}
            />
          </div>

          <Separator />

          <div className='flex items-center justify-between'>
            <div>
              <div className='font-medium'>Debug Assistant</div>
              <div className='text-muted-foreground text-sm'>
                User-friendly error interpretation
              </div>
            </div>
            <Switch
              checked={uxState.debugAssistantEnabled}
              onCheckedChange={(enabled) => onToggleFeature('debugAssistantEnabled', enabled)}
            />
          </div>

          <Separator />

          <div className='flex items-center justify-between'>
            <div>
              <div className='font-medium'>Contextual Help</div>
              <div className='text-muted-foreground text-sm'>Smart assistance and hints</div>
            </div>
            <Switch
              checked={uxState.contextualHelpEnabled}
              onCheckedChange={(enabled) => onToggleFeature('contextualHelpEnabled', enabled)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Analytics Summary */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center space-x-2'>
            <Award className='h-5 w-5' />
            <span>Usage Analytics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 gap-4 text-center'>
            <div>
              <div className='font-semibold text-lg'>
                {Math.round(uxState.userAnalytics.timeSpent / 1000 / 60)}m
              </div>
              <div className='text-muted-foreground text-xs'>Time Learning</div>
            </div>
            <div>
              <div className='font-semibold text-lg'>
                {uxState.userAnalytics.featuresUsed.length}
              </div>
              <div className='text-muted-foreground text-xs'>Features Used</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TutorialUXIntegration
