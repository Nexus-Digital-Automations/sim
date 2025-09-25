/**
 * Guideline Analyzer Component
 *
 * Provides analysis and insights about agent guidelines including
 * coverage, conflicts, performance suggestions, and optimization recommendations.
 */

'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle2,
  Lightbulb,
  Minus,
  RefreshCw,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface GuidelineAnalyzerProps {
  guidelines: any[]
  analysisResults: any
  onOptimize?: (optimizedGuidelines: any[]) => void
}

export function GuidelineAnalyzer({
  guidelines,
  analysisResults,
  onOptimize,
}: GuidelineAnalyzerProps) {
  const [isOptimizing, setIsOptimizing] = useState(false)

  const runOptimization = async () => {
    setIsOptimizing(true)

    // Mock optimization process
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Generate optimized guidelines
    const optimized = guidelines.map((guideline, index) => ({
      ...guideline,
      priority: Math.max(1, Math.min(10, guideline.priority + (Math.random() - 0.5) * 2)),
      condition: guideline.condition, // Could suggest improvements
      action: guideline.action, // Could suggest improvements
    }))

    onOptimize?.(optimized)
    setIsOptimizing(false)
  }

  if (!analysisResults) {
    return (
      <Card>
        <CardContent className='py-12 text-center'>
          <BarChart3 className='mx-auto mb-4 h-12 w-12 text-muted-foreground/50' />
          <h3 className='mb-2 font-medium'>No analysis available</h3>
          <p className='text-muted-foreground text-sm'>
            Create some guidelines to see analysis and insights
          </p>
        </CardContent>
      </Card>
    )
  }

  const { coverage, conflicts, suggestions, completeness } = analysisResults

  return (
    <div className='space-y-6'>
      {/* Overview Cards */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 font-medium text-sm'>
              <Target className='h-4 w-4' />
              Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='font-bold text-2xl'>{coverage.score}%</span>
                <Badge variant={coverage.score >= 70 ? 'default' : 'secondary'}>
                  {coverage.covered.length}/{coverage.covered.length + coverage.missing.length}
                </Badge>
              </div>
              <Progress value={coverage.score} className='h-2' />
              <p className='text-muted-foreground text-xs'>
                Covering {coverage.covered.length} of{' '}
                {coverage.covered.length + coverage.missing.length} categories
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 font-medium text-sm'>
              <Brain className='h-4 w-4' />
              Completeness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='font-bold text-2xl'>{completeness}%</span>
                <Badge
                  variant={
                    completeness >= 80
                      ? 'default'
                      : completeness >= 60
                        ? 'secondary'
                        : 'destructive'
                  }
                >
                  {completeness >= 80 ? 'Good' : completeness >= 60 ? 'Fair' : 'Poor'}
                </Badge>
              </div>
              <Progress value={completeness} className='h-2' />
              <p className='text-muted-foreground text-xs'>
                Overall guideline quality and coverage
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 font-medium text-sm'>
              <AlertTriangle className='h-4 w-4' />
              Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='font-bold text-2xl'>{conflicts.length}</span>
                <Badge variant={conflicts.length === 0 ? 'default' : 'destructive'}>
                  {conflicts.length === 0 ? 'Clean' : 'Issues'}
                </Badge>
              </div>
              <div className='h-2 rounded-full bg-muted'>
                <div
                  className={`h-2 rounded-full ${conflicts.length === 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{
                    width:
                      conflicts.length === 0 ? '100%' : `${Math.min(conflicts.length * 20, 100)}%`,
                  }}
                />
              </div>
              <p className='text-muted-foreground text-xs'>
                {conflicts.length === 0
                  ? 'No conflicts detected'
                  : `${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue='coverage' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='coverage'>Coverage Analysis</TabsTrigger>
          <TabsTrigger value='conflicts'>Conflicts & Issues</TabsTrigger>
          <TabsTrigger value='suggestions'>Suggestions</TabsTrigger>
          <TabsTrigger value='performance'>Performance</TabsTrigger>
        </TabsList>

        <TabsContent value='coverage' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Target className='h-5 w-5' />
                Category Coverage
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div>
                  <h4 className='mb-3 font-medium text-green-600 text-sm'>Covered Categories</h4>
                  <div className='space-y-2'>
                    {coverage.covered.map((category: string) => (
                      <div key={category} className='flex items-center gap-2'>
                        <CheckCircle2 className='h-4 w-4 text-green-500' />
                        <span className='capitalize'>{category}</span>
                        <Badge variant='secondary' className='text-xs'>
                          {guidelines.filter((g) => g.category === category).length}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className='mb-3 font-medium text-orange-600 text-sm'>Missing Categories</h4>
                  <div className='space-y-2'>
                    {coverage.missing.map((category: string) => (
                      <div key={category} className='flex items-center gap-2'>
                        <Minus className='h-4 w-4 text-orange-500' />
                        <span className='text-muted-foreground capitalize'>{category}</span>
                        <Badge variant='outline' className='text-xs'>
                          Recommended
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {coverage.missing.length > 0 && (
                <Alert>
                  <Lightbulb className='h-4 w-4' />
                  <AlertDescription>
                    Consider adding guidelines for {coverage.missing.join(', ')} to improve your
                    agent's coverage of common interaction patterns.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='conflicts' className='space-y-4'>
          {conflicts.length === 0 ? (
            <Card>
              <CardContent className='py-12 text-center'>
                <CheckCircle2 className='mx-auto mb-4 h-12 w-12 text-green-500' />
                <h3 className='mb-2 font-medium text-green-600'>No conflicts detected</h3>
                <p className='text-muted-foreground text-sm'>
                  Your guidelines appear to be well-structured without overlaps or conflicts.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className='space-y-4'>
              {conflicts.map((conflict: any, index: number) => (
                <Card key={index} className='border-l-4 border-l-red-200'>
                  <CardHeader className='pb-3'>
                    <div className='flex items-center justify-between'>
                      <CardTitle className='flex items-center gap-2 text-base'>
                        <AlertTriangle
                          className={`h-4 w-4 ${
                            conflict.severity === 'high'
                              ? 'text-red-500'
                              : conflict.severity === 'medium'
                                ? 'text-yellow-500'
                                : 'text-blue-500'
                          }`}
                        />
                        {conflict.type}
                      </CardTitle>
                      <Badge
                        variant={
                          conflict.severity === 'high'
                            ? 'destructive'
                            : conflict.severity === 'medium'
                              ? 'default'
                              : 'secondary'
                        }
                      >
                        {conflict.severity} priority
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className='mb-3 text-muted-foreground text-sm'>
                      Affects {conflict.guidelines.length} guideline
                      {conflict.guidelines.length !== 1 ? 's' : ''}
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      {conflict.guidelines.map((guidelineId: string) => {
                        const guideline = guidelines.find((g) => g.id === guidelineId)
                        return (
                          <Badge key={guidelineId} variant='outline' className='text-xs'>
                            {guideline ? `${guideline.condition.slice(0, 30)}...` : guidelineId}
                          </Badge>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value='suggestions' className='space-y-4'>
          {suggestions.length === 0 ? (
            <Card>
              <CardContent className='py-12 text-center'>
                <Lightbulb className='mx-auto mb-4 h-12 w-12 text-muted-foreground/50' />
                <h3 className='mb-2 font-medium'>No suggestions</h3>
                <p className='text-muted-foreground text-sm'>
                  Your guidelines setup looks good! Check back after making changes.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className='space-y-4'>
              {suggestions.map((suggestion: any, index: number) => (
                <Card key={index}>
                  <CardContent className='p-4'>
                    <div className='flex items-start gap-3'>
                      <Lightbulb
                        className={`mt-0.5 h-5 w-5 ${
                          suggestion.priority === 'high'
                            ? 'text-red-500'
                            : suggestion.priority === 'medium'
                              ? 'text-yellow-500'
                              : 'text-blue-500'
                        }`}
                      />
                      <div className='flex-1'>
                        <div className='mb-1 flex items-center gap-2'>
                          <h4 className='font-medium'>{suggestion.type}</h4>
                          <Badge
                            variant={
                              suggestion.priority === 'high'
                                ? 'destructive'
                                : suggestion.priority === 'medium'
                                  ? 'default'
                                  : 'secondary'
                            }
                            className='text-xs'
                          >
                            {suggestion.priority}
                          </Badge>
                        </div>
                        <p className='text-muted-foreground text-sm'>{suggestion.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value='performance' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <TrendingUp className='h-5 w-5' />
                Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* Priority Distribution */}
              <div>
                <h4 className='mb-3 font-medium text-sm'>Priority Distribution</h4>
                <div className='space-y-2'>
                  {[
                    {
                      range: 'High (8-10)',
                      count: guidelines.filter((g) => g.priority >= 8).length,
                      color: 'bg-red-500',
                    },
                    {
                      range: 'Medium (4-7)',
                      count: guidelines.filter((g) => g.priority >= 4 && g.priority < 8).length,
                      color: 'bg-yellow-500',
                    },
                    {
                      range: 'Low (1-3)',
                      count: guidelines.filter((g) => g.priority < 4).length,
                      color: 'bg-blue-500',
                    },
                  ].map(({ range, count, color }) => (
                    <div key={range} className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <div className={`h-3 w-3 rounded ${color}`} />
                        <span className='text-sm'>{range}</span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium text-sm'>{count}</span>
                        <div className='h-2 w-20 rounded bg-muted'>
                          <div
                            className={`h-2 rounded ${color}`}
                            style={{
                              width: `${guidelines.length > 0 ? (count / guidelines.length) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optimization Button */}
              <div className='border-t pt-4'>
                <Button
                  onClick={runOptimization}
                  disabled={isOptimizing || guidelines.length === 0}
                  className='w-full'
                >
                  {isOptimizing ? (
                    <>
                      <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                      Optimizing Guidelines...
                    </>
                  ) : (
                    <>
                      <Zap className='mr-2 h-4 w-4' />
                      Optimize Guidelines
                    </>
                  )}
                </Button>
                <p className='mt-2 text-center text-muted-foreground text-xs'>
                  AI-powered optimization based on best practices and performance data
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
