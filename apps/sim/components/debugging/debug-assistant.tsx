'use client'

/**
 * Debug Assistant Component - User-friendly debugging interface
 *
 * Provides visual debugging assistance with:
 * - User-friendly error explanations with visual aids
 * - Step-by-step guided resolution workflows
 * - Interactive debugging tools and helpers
 * - Performance analysis and optimization suggestions
 * - Accessibility-compliant debugging assistance
 * - Real-time help and contextual guidance
 *
 * @created 2025-09-03
 * @author Claude Development System
 */

import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Clock,
  Code,
  ExternalLink,
  FileText,
  HelpCircle,
  Lightbulb,
  Play,
  RefreshCw,
  Settings,
  Shield,
  Video,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  type DebugSession,
  type ErrorDiagnosis,
  type ErrorSolution,
  type OptimizationRecommendation,
  type PerformanceIssue,
  type SolutionStep,
  userFriendlyDebugger,
} from '@/lib/debugging/user-friendly-debugger'
import { createLogger } from '@/lib/logs/console/logger'
import { cn } from '@/lib/utils'

const logger = createLogger('DebugAssistant')

export interface DebugAssistantProps {
  workflowId: string
  userId: string
  errorData?: any
  executionData?: any
  onSolutionApplied?: (solutionId: string) => void
  onFeedbackProvided?: (feedback: any) => void
  className?: string
  accessibilityMode?: boolean
}

/**
 * Main Debug Assistant Component
 */
export function DebugAssistant({
  workflowId,
  userId,
  errorData,
  executionData,
  onSolutionApplied,
  onFeedbackProvided,
  className,
  accessibilityMode = true,
}: DebugAssistantProps) {
  // State management
  const [debugSession, setDebugSession] = useState<DebugSession | null>(null)
  const [currentDiagnosis, setCurrentDiagnosis] = useState<ErrorDiagnosis | null>(null)
  const [selectedSolution, setSelectedSolution] = useState<ErrorSolution | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [performanceData, setPerformanceData] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['diagnosis']))

  // Initialize debug session
  useEffect(() => {
    if (errorData && !debugSession) {
      initializeDebugSession()
    }
  }, [errorData, debugSession])

  // Analyze performance data
  useEffect(() => {
    if (executionData && !performanceData) {
      analyzePerformance()
    }
  }, [executionData, performanceData])

  /**
   * Initialize debugging session with error analysis
   */
  const initializeDebugSession = useCallback(async () => {
    const operationId = Date.now().toString()

    logger.info(`[${operationId}] Initializing debug session`, {
      workflowId,
      userId,
      hasErrorData: !!errorData,
    })

    try {
      setIsAnalyzing(true)

      // Start debug session
      const session = await userFriendlyDebugger.startDebugSession(userId, workflowId, errorData)
      setDebugSession(session)

      // Get primary diagnosis
      if (session.diagnoses.length > 0) {
        const primaryDiagnosis = session.diagnoses[0]
        setCurrentDiagnosis(primaryDiagnosis)

        // Set first solution as selected
        if (primaryDiagnosis.solutions.length > 0) {
          setSelectedSolution(primaryDiagnosis.solutions[0])
        }
      }

      logger.info(`[${operationId}] Debug session initialized`, {
        sessionId: session.id,
        diagnosesCount: session.diagnoses.length,
      })
    } catch (error) {
      logger.error(`[${operationId}] Failed to initialize debug session`, {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsAnalyzing(false)
    }
  }, [workflowId, userId, errorData])

  /**
   * Analyze workflow performance
   */
  const analyzePerformance = useCallback(async () => {
    const operationId = Date.now().toString()

    logger.info(`[${operationId}] Analyzing workflow performance`, { workflowId })

    try {
      const analysis = await userFriendlyDebugger.analyzePerformance(workflowId, executionData)
      setPerformanceData(analysis)

      logger.info(`[${operationId}] Performance analysis completed`, {
        overallScore: analysis.overallScore,
        issuesCount: analysis.issues.length,
        recommendationsCount: analysis.recommendations.length,
      })
    } catch (error) {
      logger.error(`[${operationId}] Performance analysis failed`, {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [workflowId, executionData])

  /**
   * Apply a solution step
   */
  const applySolutionStep = useCallback(
    async (step: SolutionStep) => {
      const operationId = Date.now().toString()

      logger.info(`[${operationId}] Applying solution step`, {
        stepId: step.id,
        stepTitle: step.title,
        action: step.action,
      })

      try {
        // Perform step action based on type
        switch (step.action) {
          case 'click':
            if (step.target) {
              const element = document.querySelector(step.target)
              if (element) {
                ;(element as HTMLElement).click()
              }
            }
            break
          case 'input':
            if (step.target && step.value) {
              const element = document.querySelector(step.target) as HTMLInputElement
              if (element) {
                element.value = step.value
                element.dispatchEvent(new Event('input', { bubbles: true }))
              }
            }
            break
          case 'verify':
            // Verification steps are typically manual
            break
        }

        // Move to next step
        setCurrentStepIndex((prev) => prev + 1)

        // Announce to screen reader
        if (accessibilityMode) {
          announceToScreenReader(`Step completed: ${step.title}`)
        }

        logger.info(`[${operationId}] Solution step applied successfully`, {
          stepId: step.id,
          nextStepIndex: currentStepIndex + 1,
        })
      } catch (error) {
        logger.error(`[${operationId}] Failed to apply solution step`, {
          stepId: step.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    },
    [currentStepIndex, accessibilityMode]
  )

  /**
   * Toggle section expansion
   */
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }, [])

  /**
   * Get severity color
   */
  const getSeverityColor = useCallback((severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }, [])

  /**
   * Get difficulty icon
   */
  const getDifficultyIcon = useCallback((difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return <CheckCircle className='h-4 w-4 text-green-500' />
      case 'moderate':
        return <Clock className='h-4 w-4 text-yellow-500' />
      case 'advanced':
        return <Settings className='h-4 w-4 text-red-500' />
      default:
        return <HelpCircle className='h-4 w-4 text-gray-500' />
    }
  }, [])

  /**
   * Announce to screen reader
   */
  const announceToScreenReader = useCallback((message: string) => {
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
  }, [])

  if (isAnalyzing) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className='p-6'>
          <div className='flex items-center space-x-3'>
            <RefreshCw className='h-5 w-5 animate-spin text-blue-500' />
            <div>
              <h3 className='font-medium text-lg'>Analyzing Issue</h3>
              <p className='text-muted-foreground text-sm'>
                Running diagnostic analysis to identify the problem and generate solutions...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('debug-assistant w-full space-y-4', className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='solutions'>Solutions</TabsTrigger>
          <TabsTrigger value='performance'>Performance</TabsTrigger>
          <TabsTrigger value='help'>Help</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value='overview' className='space-y-4'>
          {currentDiagnosis && (
            <ErrorOverview
              diagnosis={currentDiagnosis}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
              getSeverityColor={getSeverityColor}
              accessibilityMode={accessibilityMode}
            />
          )}
        </TabsContent>

        {/* Solutions Tab */}
        <TabsContent value='solutions' className='space-y-4'>
          {currentDiagnosis && (
            <SolutionsPanel
              solutions={currentDiagnosis.solutions}
              selectedSolution={selectedSolution}
              onSolutionSelect={setSelectedSolution}
              currentStepIndex={currentStepIndex}
              onApplyStep={applySolutionStep}
              onSolutionApplied={onSolutionApplied}
              getDifficultyIcon={getDifficultyIcon}
              accessibilityMode={accessibilityMode}
            />
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value='performance' className='space-y-4'>
          {performanceData && (
            <PerformancePanel
              performanceData={performanceData}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
              accessibilityMode={accessibilityMode}
            />
          )}
        </TabsContent>

        {/* Help Tab */}
        <TabsContent value='help' className='space-y-4'>
          {currentDiagnosis && (
            <HelpPanel diagnosis={currentDiagnosis} accessibilityMode={accessibilityMode} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Error Overview Component
 */
interface ErrorOverviewProps {
  diagnosis: ErrorDiagnosis
  expandedSections: Set<string>
  onToggleSection: (sectionId: string) => void
  getSeverityColor: (severity: string) => string
  accessibilityMode: boolean
}

function ErrorOverview({
  diagnosis,
  expandedSections,
  onToggleSection,
  getSeverityColor,
  accessibilityMode,
}: ErrorOverviewProps) {
  return (
    <div className='space-y-4'>
      {/* Error Summary */}
      <Card>
        <CardHeader>
          <div className='flex items-start justify-between'>
            <div className='flex items-center space-x-3'>
              <AlertTriangle className='h-6 w-6 text-red-500' />
              <div>
                <CardTitle className='text-xl'>Error Detected</CardTitle>
                <CardDescription>
                  Analysis completed with {diagnosis.confidence}% confidence
                </CardDescription>
              </div>
            </div>
            <Badge className={getSeverityColor(diagnosis.severity)}>
              {diagnosis.severity.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div>
            <h4 className='mb-2 font-medium'>What happened?</h4>
            <p className='text-muted-foreground'>{diagnosis.plainEnglishExplanation}</p>
          </div>

          <div className='flex flex-wrap gap-2'>
            {diagnosis.tags.map((tag) => (
              <Badge key={tag} variant='secondary' className='text-xs'>
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Fix */}
      {diagnosis.quickFix?.available && (
        <Card className='border-green-200 bg-green-50'>
          <CardHeader>
            <div className='flex items-center space-x-2'>
              <Zap className='h-5 w-5 text-green-600' />
              <CardTitle className='text-green-800'>Quick Fix Available</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className='mb-4 text-green-700'>{diagnosis.quickFix.description}</p>
            <Button
              onClick={() => diagnosis.quickFix?.action()}
              className='bg-green-600 hover:bg-green-700'
            >
              <Play className='mr-2 h-4 w-4' />
              Apply Quick Fix ({diagnosis.quickFix.confidence}% confidence)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analysis */}
      <Collapsible
        open={expandedSections.has('analysis')}
        onOpenChange={() => onToggleSection('analysis')}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className='cursor-pointer hover:bg-muted/50'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-lg'>Detailed Analysis</CardTitle>
                {expandedSections.has('analysis') ? (
                  <ChevronDown className='h-5 w-5' />
                ) : (
                  <ChevronRight className='h-5 w-5' />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className='space-y-4'>
              <div>
                <h4 className='mb-2 font-medium'>Root Cause</h4>
                <p className='text-muted-foreground'>{diagnosis.rootCause}</p>
              </div>

              <div>
                <h4 className='mb-2 font-medium'>Impact Assessment</h4>
                <p className='text-muted-foreground'>{diagnosis.impactAssessment}</p>
              </div>

              {diagnosis.affectedComponents.length > 0 && (
                <div>
                  <h4 className='mb-2 font-medium'>Affected Components</h4>
                  <ul className='list-inside list-disc space-y-1 text-muted-foreground'>
                    {diagnosis.affectedComponents.map((component, index) => (
                      <li key={index}>{component}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 className='mb-2 font-medium'>Technical Details</h4>
                <code className='block rounded bg-muted p-2 text-sm'>
                  {diagnosis.technicalSummary}
                </code>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Prevention Tips */}
      {diagnosis.preventionTips.length > 0 && (
        <Card className='border-blue-200 bg-blue-50'>
          <CardHeader>
            <div className='flex items-center space-x-2'>
              <Shield className='h-5 w-5 text-blue-600' />
              <CardTitle className='text-blue-800'>Prevention Tips</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className='space-y-2 text-blue-700'>
              {diagnosis.preventionTips.map((tip, index) => (
                <li key={index} className='flex items-start space-x-2'>
                  <Lightbulb className='mt-0.5 h-4 w-4 flex-shrink-0' />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/**
 * Solutions Panel Component
 */
interface SolutionsPanelProps {
  solutions: ErrorSolution[]
  selectedSolution: ErrorSolution | null
  onSolutionSelect: (solution: ErrorSolution) => void
  currentStepIndex: number
  onApplyStep: (step: SolutionStep) => void
  onSolutionApplied?: (solutionId: string) => void
  getDifficultyIcon: (difficulty: string) => React.ReactNode
  accessibilityMode: boolean
}

function SolutionsPanel({
  solutions,
  selectedSolution,
  onSolutionSelect,
  currentStepIndex,
  onApplyStep,
  onSolutionApplied,
  getDifficultyIcon,
  accessibilityMode,
}: SolutionsPanelProps) {
  return (
    <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
      {/* Solutions List */}
      <div className='space-y-3'>
        <h3 className='font-medium text-lg'>Available Solutions</h3>
        {solutions.map((solution) => (
          <Card
            key={solution.id}
            className={cn(
              'cursor-pointer transition-all duration-200',
              selectedSolution?.id === solution.id
                ? 'border-primary bg-primary/5'
                : 'hover:shadow-md'
            )}
            onClick={() => onSolutionSelect(solution)}
          >
            <CardHeader className='pb-3'>
              <div className='flex items-start justify-between'>
                <div className='flex items-center space-x-2'>
                  {getDifficultyIcon(solution.difficulty)}
                  <div>
                    <CardTitle className='text-base'>{solution.title}</CardTitle>
                    <CardDescription className='text-sm'>
                      {solution.estimatedTime} • {solution.successRate}% success rate
                    </CardDescription>
                  </div>
                </div>
                <Badge variant='outline' className='text-xs'>
                  {solution.difficulty}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className='mb-2 text-muted-foreground text-sm'>{solution.description}</p>
              <div className='flex items-center text-muted-foreground text-xs'>
                <Code className='mr-1 h-3 w-3' />
                {solution.steps.length} steps
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Solution Details */}
      {selectedSolution && (
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='font-medium text-lg'>Solution Steps</h3>
            <Badge className='bg-green-100 text-green-800'>
              Step {currentStepIndex + 1} of {selectedSolution.steps.length}
            </Badge>
          </div>

          <Progress
            value={((currentStepIndex + 1) / selectedSolution.steps.length) * 100}
            className='w-full'
          />

          <ScrollArea className='h-96'>
            <div className='space-y-3'>
              {selectedSolution.steps.map((step, index) => (
                <Card
                  key={step.id}
                  className={cn(
                    'transition-all duration-200',
                    index === currentStepIndex
                      ? 'border-primary bg-primary/5'
                      : index < currentStepIndex
                        ? 'border-green-200 bg-green-50'
                        : 'opacity-60'
                  )}
                >
                  <CardContent className='p-4'>
                    <div className='flex items-start space-x-3'>
                      <div
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full font-medium text-xs',
                          index < currentStepIndex
                            ? 'bg-green-500 text-white'
                            : index === currentStepIndex
                              ? 'bg-primary text-white'
                              : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {index < currentStepIndex ? (
                          <CheckCircle className='h-4 w-4' />
                        ) : (
                          step.order
                        )}
                      </div>

                      <div className='flex-1'>
                        <h4 className='mb-1 font-medium'>{step.title}</h4>
                        <p className='mb-2 text-muted-foreground text-sm'>{step.description}</p>

                        {step.keyboardShortcut && (
                          <div className='mb-2 flex items-center space-x-2 text-muted-foreground text-xs'>
                            <kbd className='rounded bg-muted px-2 py-1 text-xs'>
                              {step.keyboardShortcut}
                            </kbd>
                            <span>Keyboard shortcut</span>
                          </div>
                        )}

                        {index === currentStepIndex && (
                          <Button size='sm' onClick={() => onApplyStep(step)} className='mt-2'>
                            {step.action === 'verify' ? 'Mark Complete' : 'Apply Step'}
                            <ArrowRight className='ml-2 h-4 w-4' />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {/* Solution Requirements */}
          {selectedSolution.requirements.length > 0 && (
            <Card className='border-yellow-200 bg-yellow-50'>
              <CardHeader>
                <CardTitle className='text-sm text-yellow-800'>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className='space-y-1 text-sm text-yellow-700'>
                  {selectedSolution.requirements.map((req, index) => (
                    <li key={index} className='flex items-start space-x-2'>
                      <span className='mt-1'>•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Performance Panel Component
 */
interface PerformancePanelProps {
  performanceData: {
    overallScore: number
    issues: PerformanceIssue[]
    recommendations: OptimizationRecommendation[]
    benchmark: { current: number; baseline: number; improvement: number }
  }
  expandedSections: Set<string>
  onToggleSection: (sectionId: string) => void
  accessibilityMode: boolean
}

function PerformancePanel({
  performanceData,
  expandedSections,
  onToggleSection,
  accessibilityMode,
}: PerformancePanelProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className='space-y-4'>
      {/* Performance Score */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>Performance Score</CardTitle>
            <div className={cn('font-bold text-2xl', getScoreColor(performanceData.overallScore))}>
              {performanceData.overallScore}/100
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-3 gap-4 text-center'>
            <div>
              <div className='font-semibold text-2xl'>{performanceData.benchmark.current}ms</div>
              <div className='text-muted-foreground text-sm'>Current Runtime</div>
            </div>
            <div>
              <div className='font-semibold text-2xl'>{performanceData.benchmark.baseline}ms</div>
              <div className='text-muted-foreground text-sm'>Baseline</div>
            </div>
            <div>
              <div
                className={cn(
                  'font-semibold text-2xl',
                  performanceData.benchmark.improvement > 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {performanceData.benchmark.improvement > 0 ? '+' : ''}
                {Math.round(performanceData.benchmark.improvement)}%
              </div>
              <div className='text-muted-foreground text-sm'>vs Baseline</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues */}
      {performanceData.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Issues ({performanceData.issues.length})</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {performanceData.issues.map((issue) => (
              <div key={issue.id} className='rounded-lg border p-3'>
                <div className='mb-2 flex items-start justify-between'>
                  <h4 className='font-medium'>{issue.type.replace('-', ' ').toUpperCase()}</h4>
                  <Badge variant={issue.severity === 'high' ? 'destructive' : 'secondary'}>
                    {issue.severity}
                  </Badge>
                </div>
                <p className='text-muted-foreground text-sm'>{issue.description}</p>
                <div className='mt-2 text-muted-foreground text-sm'>{issue.impact}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {performanceData.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization Recommendations</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {performanceData.recommendations.map((rec) => (
              <div key={rec.id} className='rounded-lg border p-4'>
                <div className='mb-2 flex items-start justify-between'>
                  <h4 className='font-medium'>{rec.title}</h4>
                  <div className='flex space-x-2'>
                    <Badge variant='outline'>{rec.impact} impact</Badge>
                    <Badge variant='outline'>{rec.effort} effort</Badge>
                  </div>
                </div>
                <p className='mb-3 text-muted-foreground text-sm'>{rec.description}</p>
                <div className='space-y-2'>
                  <h5 className='font-medium text-sm'>Benefits:</h5>
                  <ul className='space-y-1 text-muted-foreground text-sm'>
                    {rec.benefits.map((benefit, index) => (
                      <li key={index} className='flex items-start space-x-2'>
                        <CheckCircle className='mt-1 h-3 w-3 flex-shrink-0 text-green-500' />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/**
 * Help Panel Component
 */
interface HelpPanelProps {
  diagnosis: ErrorDiagnosis
  accessibilityMode: boolean
}

function HelpPanel({ diagnosis, accessibilityMode }: HelpPanelProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className='space-y-4'>
      {/* Documentation Links */}
      {diagnosis.relatedDocumentation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Related Documentation</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {diagnosis.relatedDocumentation.map((doc, index) => (
              <div key={index} className='flex items-center justify-between rounded-lg border p-3'>
                <div className='flex items-center space-x-3'>
                  {doc.type === 'video' ? (
                    <Video className='h-5 w-5 text-blue-500' />
                  ) : doc.type === 'tutorial' ? (
                    <BookOpen className='h-5 w-5 text-green-500' />
                  ) : (
                    <FileText className='h-5 w-5 text-gray-500' />
                  )}
                  <div>
                    <h4 className='font-medium'>{doc.title}</h4>
                    <div className='flex space-x-2 text-muted-foreground text-xs'>
                      <span>{doc.type}</span>
                      <span>•</span>
                      <span>{doc.difficulty}</span>
                      <span>•</span>
                      <span>{doc.relevance}% relevant</span>
                    </div>
                  </div>
                </div>
                <Button size='sm' variant='outline' asChild>
                  <a href={doc.url} target='_blank' rel='noopener noreferrer'>
                    <ExternalLink className='h-4 w-4' />
                  </a>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Information</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div>
            <div className='mb-2 flex items-center justify-between'>
              <h4 className='font-medium'>Error Details</h4>
              <Button
                size='sm'
                variant='outline'
                onClick={() => copyToClipboard(diagnosis.technicalSummary)}
              >
                <Clipboard className='mr-2 h-4 w-4' />
                Copy
              </Button>
            </div>
            <code className='block overflow-x-auto rounded bg-muted p-3 text-sm'>
              {diagnosis.technicalSummary}
            </code>
          </div>

          <Separator />

          <div>
            <h4 className='mb-2 font-medium'>Diagnosis Metadata</h4>
            <dl className='grid grid-cols-2 gap-3 text-sm'>
              <div>
                <dt className='font-medium'>Confidence</dt>
                <dd className='text-muted-foreground'>{diagnosis.confidence}%</dd>
              </div>
              <div>
                <dt className='font-medium'>Analysis Method</dt>
                <dd className='text-muted-foreground'>{diagnosis.analysisMethod}</dd>
              </div>
              <div>
                <dt className='font-medium'>Category</dt>
                <dd className='text-muted-foreground'>{diagnosis.category}</dd>
              </div>
              <div>
                <dt className='font-medium'>Timestamp</dt>
                <dd className='text-muted-foreground'>{diagnosis.timestamp.toLocaleString()}</dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card className='border-blue-200 bg-blue-50'>
        <CardHeader>
          <CardTitle className='text-blue-800'>Need More Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='mb-4 text-blue-700'>
            If you're still having trouble, our support team is here to help. Include the technical
            details above in your message.
          </p>
          <Button className='bg-blue-600 hover:bg-blue-700'>
            <HelpCircle className='mr-2 h-4 w-4' />
            Contact Support
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default DebugAssistant
