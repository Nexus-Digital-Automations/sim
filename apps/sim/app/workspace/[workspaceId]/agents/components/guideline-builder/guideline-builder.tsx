/**
 * Guideline Builder Component
 *
 * Main guideline builder interface that combines visual editing
 * with intelligent suggestions and tool integration.
 */

'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, BarChart3, Brain, CheckCircle2, Settings, Zap } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GuidelineAnalyzer } from './guideline-analyzer'
import { ToolIntegrationPanel } from './tool-integration-panel'
import { VisualGuidelineBuilder } from './visual-guideline-builder'

interface GuidelineBuilderProps {
  agentId: string
  workspaceId: string
  onGuidelinesChange?: (guidelines: any[]) => void
}

interface Guideline {
  id: string
  condition: string
  action: string
  priority: number
  category?: string
  tools?: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function GuidelineBuilder({
  agentId,
  workspaceId,
  onGuidelinesChange,
}: GuidelineBuilderProps) {
  const [guidelines, setGuidelines] = useState<Guideline[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<any>(null)

  // Load existing guidelines
  useEffect(() => {
    loadGuidelines()
  }, [agentId])

  const loadGuidelines = async () => {
    setIsLoading(true)
    try {
      // TODO: Load from API
      // const response = await getAgentGuidelines(agentId, { user_id: 'current-user', workspace_id: workspaceId })
      // setGuidelines(response)
      setGuidelines([]) // Mock empty state
    } catch (error) {
      console.error('Failed to load guidelines:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGuidelinesChange = (updatedGuidelines: Guideline[]) => {
    setGuidelines(updatedGuidelines)
    onGuidelinesChange?.(updatedGuidelines)

    // Trigger analysis when guidelines change
    analyzeGuidelines(updatedGuidelines)
  }

  const analyzeGuidelines = async (guidelines: Guideline[]) => {
    if (guidelines.length === 0) {
      setAnalysisResults(null)
      return
    }

    // Mock analysis - in real implementation, this would call an analysis service
    const analysis = {
      coverage: calculateCoverage(guidelines),
      conflicts: findConflicts(guidelines),
      suggestions: generateSuggestions(guidelines),
      completeness: assessCompleteness(guidelines),
    }

    setAnalysisResults(analysis)
  }

  const calculateCoverage = (guidelines: Guideline[]) => {
    const categories = ['conversation', 'data', 'support', 'priority', 'general']
    const covered = [...new Set(guidelines.map((g) => g.category).filter(Boolean))]
    return {
      score: Math.round((covered.length / categories.length) * 100),
      missing: categories.filter((cat) => !covered.includes(cat)),
      covered,
    }
  }

  const findConflicts = (guidelines: Guideline[]) => {
    const conflicts: Array<{
      type: string
      guidelines: string[]
      severity: 'high' | 'medium' | 'low'
    }> = []

    // Find priority conflicts
    const highPriorityCount = guidelines.filter((g) => g.priority >= 8).length
    if (highPriorityCount > 3) {
      conflicts.push({
        type: 'Too many high priority guidelines',
        guidelines: guidelines.filter((g) => g.priority >= 8).map((g) => g.id),
        severity: 'medium',
      })
    }

    // Find overlapping conditions (simplified)
    const conditions = guidelines.map((g) => g.condition.toLowerCase())
    const duplicates = conditions.filter(
      (condition, index) => conditions.indexOf(condition) !== index
    )

    if (duplicates.length > 0) {
      conflicts.push({
        type: 'Similar or overlapping conditions',
        guidelines: guidelines
          .filter((g) => duplicates.includes(g.condition.toLowerCase()))
          .map((g) => g.id),
        severity: 'high',
      })
    }

    return conflicts
  }

  const generateSuggestions = (guidelines: Guideline[]) => {
    const suggestions: Array<{
      type: string
      description: string
      priority: 'high' | 'medium' | 'low'
    }> = []

    if (guidelines.length === 0) {
      suggestions.push({
        type: 'Getting Started',
        description: 'Add a greeting guideline to handle user introductions',
        priority: 'high',
      })
    }

    if (!guidelines.some((g) => g.category === 'conversation')) {
      suggestions.push({
        type: 'Conversation Handling',
        description:
          'Add guidelines for common conversation patterns like greetings and clarifications',
        priority: 'high',
      })
    }

    if (guidelines.filter((g) => g.tools && g.tools.length > 0).length === 0) {
      suggestions.push({
        type: 'Tool Integration',
        description: 'Consider adding guidelines that specify when to use available tools',
        priority: 'medium',
      })
    }

    return suggestions
  }

  const assessCompleteness = (guidelines: Guideline[]) => {
    let score = 0
    const maxScore = 100

    // Basic coverage
    if (guidelines.length > 0) score += 20
    if (guidelines.length >= 3) score += 20

    // Category coverage
    const categories = [...new Set(guidelines.map((g) => g.category).filter(Boolean))]
    score += Math.min(categories.length * 10, 30)

    // Tool integration
    const withTools = guidelines.filter((g) => g.tools && g.tools.length > 0)
    if (withTools.length > 0) score += 15

    // Priority distribution
    const priorities = guidelines.map((g) => g.priority)
    const hasVariedPriorities = Math.max(...priorities) - Math.min(...priorities) >= 3
    if (hasVariedPriorities) score += 15

    return Math.min(score, maxScore)
  }

  const getHealthStatus = () => {
    if (!analysisResults) return 'unknown'

    const { coverage, conflicts, completeness } = analysisResults

    if (conflicts.some((c: any) => c.severity === 'high')) return 'error'
    if (completeness < 60 || coverage.score < 50) return 'warning'
    if (completeness >= 80 && coverage.score >= 70) return 'good'
    return 'ok'
  }

  const healthStatus = getHealthStatus()

  return (
    <div className='space-y-6'>
      {/* Header with Health Status */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <Brain className='h-5 w-5' />
                Guideline Management
              </CardTitle>
              <p className='mt-1 text-muted-foreground text-sm'>
                Define and manage your agent's behavior rules
              </p>
            </div>

            <div className='flex items-center gap-3'>
              {analysisResults && (
                <div className='text-right'>
                  <div className='font-medium text-sm'>Health Score</div>
                  <div className='flex items-center gap-2'>
                    <span className='font-bold text-lg'>{analysisResults.completeness}%</span>
                    {healthStatus === 'good' && <CheckCircle2 className='h-4 w-4 text-green-500' />}
                    {healthStatus === 'warning' && (
                      <AlertTriangle className='h-4 w-4 text-yellow-500' />
                    )}
                    {healthStatus === 'error' && <AlertTriangle className='h-4 w-4 text-red-500' />}
                  </div>
                </div>
              )}

              <Badge variant='outline'>
                {guidelines.length} guideline{guidelines.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </CardHeader>

        {/* Health Alerts */}
        {analysisResults?.conflicts?.length > 0 && (
          <CardContent className='pt-0'>
            <Alert
              variant={
                analysisResults.conflicts.some((c: any) => c.severity === 'high')
                  ? 'destructive'
                  : 'default'
              }
            >
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription>
                {analysisResults.conflicts.length} potential issue
                {analysisResults.conflicts.length !== 1 ? 's' : ''} detected. Review guidelines for
                conflicts or overlaps.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Main Interface */}
      <Tabs defaultValue='builder' className='space-y-4'>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='builder' className='flex items-center gap-2'>
            <Settings className='h-4 w-4' />
            Builder
          </TabsTrigger>
          <TabsTrigger value='analysis' className='flex items-center gap-2'>
            <BarChart3 className='h-4 w-4' />
            Analysis
          </TabsTrigger>
          <TabsTrigger value='tools' className='flex items-center gap-2'>
            <Zap className='h-4 w-4' />
            Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value='builder'>
          <VisualGuidelineBuilder
            agentId={agentId}
            workspaceId={workspaceId}
            guidelines={guidelines}
            onGuidelinesChange={handleGuidelinesChange}
          />
        </TabsContent>

        <TabsContent value='analysis'>
          <GuidelineAnalyzer
            guidelines={guidelines}
            analysisResults={analysisResults}
            onOptimize={handleGuidelinesChange}
          />
        </TabsContent>

        <TabsContent value='tools'>
          <ToolIntegrationPanel
            workspaceId={workspaceId}
            guidelines={guidelines}
            onGuidelinesChange={handleGuidelinesChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
