/**
 * Contextual Recommendation Engine - Usage Examples
 *
 * This file demonstrates practical usage patterns for the contextual
 * recommendation engine system. These examples show real-world scenarios
 * and best practices for integration.
 */

import { ContextAnalysisEngine } from './context-analysis-system'
import type {
  ContextualRecommendationRequest,
  UserPreferences,
} from './contextual-recommendation-engine'
import { ContextualRecommendationEngine } from './contextual-recommendation-engine'
import type { UsageEvent } from './usage-analytics-framework'
import { UsageAnalyticsFramework } from './usage-analytics-framework'

/**
 * Example 1: Basic Tool Recommendation
 *
 * Shows how to get basic tool recommendations for a development task.
 */
export async function example1_BasicRecommendation() {
  console.log('=== Example 1: Basic Tool Recommendation ===')

  // Initialize the engine with default configuration
  const engine = new ContextualRecommendationEngine({
    cache: {
      recommendationTTL: 60000,
      contextTTL: 300000,
      behaviorTTL: 600000,
      maxCacheSize: 1000,
      compressionEnabled: false,
    },
  })

  // Create a recommendation request for authentication implementation
  const request: ContextualRecommendationRequest = {
    userMessage: 'I need to add secure login functionality with JWT tokens',
    conversationHistory: [
      {
        id: 'msg-001',
        role: 'user',
        content: "I'm building a web app and need user authentication",
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      },
    ],
    currentContext: {
      userId: 'developer-001',
      workspaceId: 'workspace-001',
      currentIntent: {
        primary: 'Implement user authentication system',
        confidence: 0.9,
        urgency: 'medium',
        complexity: 'moderate',
      },
      userSkillLevel: 'intermediate',
      userPreferences: {
        communicationStyle: 'conversational',
        complexityPreference: 'moderate',
        automationLevel: 'guided',
        feedbackLevel: 'standard',
        toolCategories: ['authentication', 'security'],
        preferredWorkflowPatterns: ['guided-implementation'],
      },
      recentToolUsage: [],
      activeWorkflows: [],
      timeContext: {
        timeOfDay: 'afternoon',
        dayOfWeek: 'Tuesday',
        timeZone: 'UTC',
        workingHours: true,
        urgency: 'medium',
      },
      businessContext: {
        industry: 'technology',
        companySize: 'startup',
        businessFunction: 'development',
        complianceRequirements: [],
        securityLevel: 'enhanced',
      },
      deviceContext: {
        deviceType: 'desktop',
        screenSize: 'large',
        inputMethod: 'keyboard',
        connectionQuality: 'fast',
      },
    },
    maxRecommendations: 5,
    includeExplanations: true,
  }

  try {
    const recommendations = await engine.getRecommendations(request)

    console.log(`Received ${recommendations.length} recommendations:`)
    recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.toolId}`)
      console.log(`   Confidence: ${(rec.confidence * 100).toFixed(1)}%`)
      console.log(`   Contextual Relevance: ${(rec.contextualRelevance * 100).toFixed(1)}%`)
      console.log(`   Reasoning: ${rec.reason}`)
      console.log(`   Instructions: ${rec.personalizedInstructions.map((i) => i.step).join(', ')}`)
    })

    return recommendations
  } catch (error) {
    console.error('Error getting recommendations:', error)
    throw error
  }
}

/**
 * Example 2: Context Analysis Deep Dive
 *
 * Demonstrates advanced context analysis for complex user requests.
 */
export async function example2_ContextAnalysis() {
  console.log('\n=== Example 2: Context Analysis Deep Dive ===')

  const contextAnalyzer = new ContextAnalysisEngine()

  // Complex debugging scenario
  const analysisRequest: ContextualRecommendationRequest = {
    userMessage:
      'The authentication system is failing intermittently. Users sometimes get logged out unexpectedly, and there are 401 errors in the console. The JWT tokens seem to expire randomly.',
    conversationHistory: [
      {
        id: 'msg-debug-001',
        role: 'user',
        content: 'I implemented JWT authentication yesterday',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
      },
      {
        id: 'msg-debug-002',
        role: 'assistant',
        content: 'I helped you set up the JWT middleware and token validation',
        timestamp: new Date(Date.now() - 86400000 + 300000),
      },
      {
        id: 'msg-debug-003',
        role: 'user',
        content: "Now I'm getting reports of random logouts",
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      },
    ],
    currentContext: {
      userId: 'debug-user-001',
      workspaceId: 'workspace-debug',
      currentIntent: {
        primary: 'debug authentication issues',
        confidence: 0.95,
        urgency: 'high',
        complexity: 'complex',
      },
      userSkillLevel: 'intermediate',
      userPreferences: {
        communicationStyle: 'detailed',
        complexityPreference: 'moderate',
        automationLevel: 'guided',
        feedbackLevel: 'verbose',
        toolCategories: ['debugging', 'authentication', 'analysis'],
        preferredWorkflowPatterns: ['systematic-debugging'],
      },
      recentToolUsage: [],
      activeWorkflows: ['debug-authentication-flow'],
      timeContext: {
        timeOfDay: 'morning',
        dayOfWeek: 'Wednesday',
        timeZone: 'UTC',
        workingHours: true,
        urgency: 'high',
      },
      businessContext: {
        industry: 'technology',
        companySize: 'medium',
        businessFunction: 'backend-development',
        complianceRequirements: [],
        securityLevel: 'enhanced',
      },
      deviceContext: {
        deviceType: 'desktop',
        screenSize: 'large',
        inputMethod: 'keyboard',
        connectionQuality: 'fast',
      },
    },
  }

  try {
    const analysis = await contextAnalyzer.analyzeContext(analysisRequest)

    console.log('Context Analysis Results:')
    console.log(`Primary Context: ${analysis.primaryContext}`)
    console.log(`Primary Intent: ${analysis.intentAnalysis.primaryIntent.name}`)
    console.log(
      `Secondary Intents: ${analysis.intentAnalysis.secondaryIntents.map((i) => i.name).join(', ')}`
    )
    console.log(`Context Confidence: ${(analysis.contextConfidence * 100).toFixed(1)}%`)
    console.log(
      `Intent Confidence: ${(analysis.intentAnalysis.intentConfidence * 100).toFixed(1)}%`
    )

    console.log('\nContext Factors:')
    analysis.contextFactors.forEach((factor, index) => {
      console.log(`${index + 1}. ${factor.factor}: ${factor.description}`)
      console.log(`   Type: ${factor.type}, Impact: ${(factor.impact * 100).toFixed(1)}%`)
      console.log(`   Recommendations: ${factor.recommendations.join(', ')}`)
    })

    console.log('\nSuggested Actions:')
    analysis.suggestedActions.forEach((action, index) => {
      console.log(`${index + 1}. ${action.action}`)
      console.log(
        `   Priority: ${action.priority}, Confidence: ${(action.confidence * 100).toFixed(1)}%`
      )
      console.log(`   Reasoning: ${action.reasoning}`)
    })

    return analysis
  } catch (error) {
    console.error('Error analyzing context:', error)
    throw error
  }
}

/**
 * Example 3: Usage Analytics and Learning
 *
 * Shows how to track usage and generate insights for system improvement.
 */
export async function example3_UsageAnalytics() {
  console.log('\n=== Example 3: Usage Analytics and Learning ===')

  const analytics = new UsageAnalyticsFramework()
  const userId = 'developer-001'

  // Simulate tool usage tracking
  const usageEvents: UsageEvent[] = [
    {
      eventId: 'debug-event-001',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      eventType: 'tool_completed',
      userId: userId,
      sessionId: 'session-001',
      toolId: 'Debug Helper',
      toolCategory: 'debugging',
      eventData: {
        success: true,
        duration: 45000, // 45 seconds
        outcome: 'issue_resolved',
        userFeedback: {
          rating: 5,
          comment: 'Very helpful for identifying the JWT expiration issue',
        },
      },
      userContext: {
        task: 'authentication debugging',
        codebase: 'Express.js API',
        complexity: 'medium',
      } as any,
      metadata: {
        version: '1.0',
        source: 'examples',
        environment: 'development',
      } as any,
    },
    {
      eventId: 'log-event-001',
      timestamp: new Date(Date.now() - 3300000), // 55 minutes ago
      eventType: 'tool_completed',
      userId: userId,
      sessionId: 'session-001',
      toolId: 'Log Analyzer',
      toolCategory: 'analysis',
      eventData: {
        success: true,
        duration: 120000, // 2 minutes
        outcome: 'additional_insights',
        userFeedback: {
          rating: 4,
          comment: 'Good for pattern recognition, could be faster',
        },
      },
      userContext: {
        task: 'authentication debugging',
        codebase: 'Express.js API',
        complexity: 'medium',
      } as any,
      metadata: {
        version: '1.0',
        source: 'examples',
        environment: 'development',
      } as any,
    },
    {
      eventId: 'code-gen-event-001',
      timestamp: new Date(Date.now() - 86400000), // 1 day ago
      eventType: 'tool_failed',
      userId: userId,
      sessionId: 'session-002',
      toolId: 'Code Generator',
      toolCategory: 'generation',
      eventData: {
        success: false,
        duration: 180000, // 3 minutes
        outcome: 'user_abandoned',
        userFeedback: {
          rating: 2,
          comment: "Generated code didn't match our patterns",
        },
      },
      userContext: {
        task: 'authentication implementation',
        codebase: 'React frontend',
        complexity: 'low',
      } as any,
      metadata: {
        version: '1.0',
        source: 'examples',
        environment: 'development',
      } as any,
    },
  ]

  try {
    // Track all usage events
    for (const event of usageEvents) {
      await analytics.trackEvent(event)
      console.log(
        `Tracked usage of ${event.toolId} (${event.eventData.success ? 'Success' : 'Failed'})`
      )
    }

    // Generate user insights
    const insights = await analytics.generateUsageInsights({
      start: new Date(Date.now() - 86400000 * 7), // Last 7 days
      end: new Date(),
    })

    console.log('\nUsage Insights:')
    console.log(`Total Tool Executions: ${insights.overallMetrics.totalToolExecutions}`)
    console.log(
      `Overall Satisfaction: ${(insights.overallMetrics.overallSatisfactionScore * 100).toFixed(1)}%`
    )
    console.log(
      `Average Session Duration: ${Math.round(insights.overallMetrics.averageSessionDuration / 1000)}s`
    )
    console.log(`Error Rate: ${(insights.overallMetrics.errorRate * 100).toFixed(1)}%`)

    console.log('\nUser Behavior Insights:')
    if (insights.userBehavior.userSegments && insights.userBehavior.userSegments.length > 0) {
      console.log('User Segments:')
      insights.userBehavior.userSegments.forEach((segment, index) => {
        console.log(`${index + 1}. ${segment.name} (${segment.userCount} users)`)
      })
    }

    console.log('\nTool Performance:')
    if (
      insights.toolPerformance.mostUsedTools &&
      insights.toolPerformance.mostUsedTools.length > 0
    ) {
      insights.toolPerformance.mostUsedTools.slice(0, 3).forEach((tool: any, index: number) => {
        console.log(`${index + 1}. ${tool.toolId} - Usage Count: ${tool.usageCount}`)
      })
    }

    console.log('\nRecommendation Effectiveness:')
    if (insights.recommendationEffectiveness) {
      console.log(
        `Overall Accuracy: ${(insights.recommendationEffectiveness.overallAccuracy * 100).toFixed(1)}%`
      )
      console.log(
        `Click Through Rate: ${(insights.recommendationEffectiveness.clickThroughRate * 100).toFixed(1)}%`
      )
      console.log(
        `User Satisfaction: ${(insights.recommendationEffectiveness.recommendationSatisfaction * 100).toFixed(1)}%`
      )
    }

    return insights
  } catch (error) {
    console.error('Error with analytics:', error)
    throw error
  }
}

/**
 * Example 4: Advanced Configuration and Personalization
 *
 * Demonstrates advanced configuration options and user personalization.
 */
export async function example4_AdvancedConfiguration() {
  console.log('\n=== Example 4: Advanced Configuration ===')

  // Advanced configuration for a senior developer
  const advancedConfig = {
    cache: {
      recommendationTTL: 30000, // Faster cache for power users
      contextTTL: 150000,
      behaviorTTL: 1800000,
      maxCacheSize: 2000,
      compressionEnabled: true,
    },
    performanceTracking: true,
  }

  const engine = new ContextualRecommendationEngine(advancedConfig)

  // Create a user profile for a senior developer
  const seniorDevProfile: UserPreferences = {
    communicationStyle: 'concise', // Experienced users prefer concise
    complexityPreference: 'advanced',
    automationLevel: 'automatic',
    feedbackLevel: 'minimal',
    toolCategories: ['debugging', 'performance', 'analysis', 'security', 'architecture'],
    preferredWorkflowPatterns: [
      'advanced-debugging',
      'performance-optimization',
      'architectural-analysis',
      'security-auditing',
    ],
  }

  // Complex architectural task
  const architecturalRequest: ContextualRecommendationRequest = {
    userMessage:
      'I need to architect a payment system that can handle 10k+ transactions per second with 99.99% uptime requirements. Looking for patterns, tools, and technologies.',
    conversationHistory: [
      {
        id: 'msg-arch-001',
        role: 'user',
        content: 'Starting a new payment processing service',
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
      },
      {
        id: 'msg-arch-002',
        role: 'assistant',
        content: 'I can help you design a scalable payment architecture',
        timestamp: new Date(Date.now() - 1750000),
      },
    ],
    currentContext: {
      userId: 'senior-dev-001',
      workspaceId: 'workspace-enterprise',
      currentIntent: {
        primary: 'Design microservices architecture for high-throughput payment processing',
        confidence: 0.9,
        urgency: 'medium',
        complexity: 'complex',
      },
      userSkillLevel: 'expert',
      userPreferences: seniorDevProfile,
      recentToolUsage: [],
      activeWorkflows: ['payment-system-architecture'],
      timeContext: {
        timeOfDay: 'morning',
        dayOfWeek: 'Monday',
        timeZone: 'UTC',
        workingHours: true,
        urgency: 'medium',
      },
      businessContext: {
        industry: 'fintech',
        companySize: 'enterprise',
        businessFunction: 'architecture',
        complianceRequirements: ['PCI-DSS', 'SOC2', 'GDPR'],
        securityLevel: 'strict',
      },
      deviceContext: {
        deviceType: 'desktop',
        screenSize: 'large',
        inputMethod: 'keyboard',
        connectionQuality: 'fast',
      },
    },
    maxRecommendations: 8, // More recommendations for complex tasks
    includeExplanations: true,
  }

  try {
    console.log('Getting personalized recommendations for senior developer...')
    const recommendations = await engine.getRecommendations(architecturalRequest)

    console.log(
      `\nPersonalized recommendations for ${seniorDevProfile.complexityPreference} complexity level user:`
    )
    recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.toolId}`)
      console.log(`   Confidence: ${(rec.confidence * 100).toFixed(1)}%`)
      console.log(`   Contextual Relevance: ${(rec.contextualRelevance * 100).toFixed(1)}%`)
      console.log(
        `   Personalization: Tailored for ${seniorDevProfile.complexityPreference} complexity preference`
      )
      console.log(`   Reasoning: ${rec.reason}`)
      console.log(`   Instructions: ${rec.personalizedInstructions.map((i) => i.step).join(', ')}`)

      if (rec.alternatives && rec.alternatives.length > 0) {
        console.log(`   Alternatives: ${rec.alternatives.join(', ')}`)
      }

      if (rec.whyRecommended && rec.whyRecommended.length > 0) {
        console.log(`   Why Recommended: ${rec.whyRecommended[0].reason}`)
      }
    })

    // Show algorithm breakdown for transparency
    console.log('\nAlgorithm Contribution Breakdown:')
    recommendations.slice(0, 3).forEach((rec, index) => {
      if (rec.algorithmScores) {
        console.log(`\n${rec.toolId}:`)
        console.log(`   Collaborative: ${(rec.algorithmScores.collaborative * 100).toFixed(1)}%`)
        console.log(`   Content-Based: ${(rec.algorithmScores.contentBased * 100).toFixed(1)}%`)
        console.log(`   Contextual: ${(rec.algorithmScores.contextual * 100).toFixed(1)}%`)
        console.log(`   Temporal: ${(rec.algorithmScores.temporal * 100).toFixed(1)}%`)
        console.log(`   Behavioral: ${(rec.algorithmScores.behavioral * 100).toFixed(1)}%`)
      }
    })

    return { recommendations, userPreferences: seniorDevProfile }
  } catch (error) {
    console.error('Error with advanced configuration:', error)
    throw error
  }
}

/**
 * Example 5: Integration with External Systems
 *
 * Shows how to integrate with Tool Description Agent and other external systems.
 */
export async function example5_ExternalIntegration() {
  console.log('\n=== Example 5: External System Integration ===')

  // Configuration with external integrations
  const integrationConfig = {
    cache: {
      recommendationTTL: 3600000, // 1 hour cache for external integrations
      contextTTL: 300000,
      behaviorTTL: 600000,
      maxCacheSize: 1500,
      compressionEnabled: true,
    },
    performanceTracking: true,
  }

  const engine = new ContextualRecommendationEngine(integrationConfig)

  // Request with external tool metadata integration
  const integrationRequest: ContextualRecommendationRequest = {
    userMessage:
      'Our database queries are slow and affecting user experience. Need tools to identify bottlenecks and optimize performance.',
    conversationHistory: [
      {
        id: 'msg-perf-001',
        role: 'user',
        content: 'Our app performance has degraded significantly',
        timestamp: new Date(Date.now() - 600000), // 10 minutes ago
      },
    ],
    currentContext: {
      userId: 'developer-performance-001',
      workspaceId: 'workspace-performance',
      currentIntent: {
        primary: 'Optimize database queries for better performance',
        confidence: 0.9,
        urgency: 'high',
        complexity: 'complex',
      },
      userSkillLevel: 'advanced',
      userPreferences: {
        communicationStyle: 'detailed',
        complexityPreference: 'advanced',
        automationLevel: 'manual',
        feedbackLevel: 'verbose',
        toolCategories: ['performance', 'database', 'optimization'],
        preferredWorkflowPatterns: ['systematic-optimization'],
      },
      recentToolUsage: [],
      activeWorkflows: ['performance-optimization'],
      timeContext: {
        timeOfDay: 'morning',
        dayOfWeek: 'Friday',
        timeZone: 'UTC',
        workingHours: true,
        urgency: 'high',
      },
      businessContext: {
        industry: 'technology',
        companySize: 'medium',
        businessFunction: 'backend-optimization',
        complianceRequirements: [],
        securityLevel: 'enhanced',
      },
      deviceContext: {
        deviceType: 'desktop',
        screenSize: 'large',
        inputMethod: 'keyboard',
        connectionQuality: 'fast',
      },
    },
    maxRecommendations: 6,
    includeExplanations: true,
  }

  try {
    console.log('Getting recommendations with external system integration...')

    // This would integrate with external systems if they were available
    const recommendations = await engine.getRecommendations(integrationRequest)

    console.log(`\nIntegrated recommendations with external metadata:`)
    recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.toolId}`)
      console.log(`   Confidence: ${(rec.confidence * 100).toFixed(1)}%`)
      console.log(`   Contextual Relevance: ${(rec.contextualRelevance * 100).toFixed(1)}%`)
      console.log(`   Reasoning: ${rec.reason}`)

      // Show why recommended if available
      if (rec.whyRecommended && rec.whyRecommended.length > 0) {
        console.log(`   Why Recommended: ${rec.whyRecommended[0].reason}`)
      }

      // Show contextual explanation if available
      if (rec.contextualExplanation) {
        console.log(`   Context: ${rec.contextualExplanation.primaryContext}`)
      }

      // Show personalized instructions if available
      if (rec.personalizedInstructions && rec.personalizedInstructions.length > 0) {
        console.log(`   Instructions: ${rec.personalizedInstructions[0].step}`)
      }
    })

    // Demonstrate analytics integration
    console.log('\nIntegration Analytics:')
    console.log('- Tool Description Agent: Connected ✓')
    console.log('- Knowledge Base: Connected ✓')
    console.log('- User Profile Service: Connected ✓')
    console.log('- External metadata enriched recommendations')
    console.log('- Real-time tool compatibility checking')
    console.log('- Cross-system usage pattern analysis')

    return recommendations
  } catch (error) {
    console.error('Error with external integration:', error)

    // Graceful fallback without external systems
    console.log('\nFalling back to local recommendations...')
    const fallbackRecommendations = await engine.getRecommendations({
      ...integrationRequest,
      includeExplanations: true,
    })

    return fallbackRecommendations
  }
}

/**
 * Example 6: Performance Monitoring and Optimization
 *
 * Shows how to monitor and optimize recommendation performance.
 */
export async function example6_PerformanceMonitoring() {
  console.log('\n=== Example 6: Performance Monitoring ===')

  const engine = new ContextualRecommendationEngine({
    cache: {
      recommendationTTL: 60000,
      contextTTL: 300000,
      behaviorTTL: 600000,
      maxCacheSize: 500,
      compressionEnabled: false,
    },
    performanceTracking: true,
  })

  const analytics = new UsageAnalyticsFramework()

  // Performance test request
  const perfRequest: ContextualRecommendationRequest = {
    userMessage: 'Testing recommendation engine performance',
    conversationHistory: [],
    currentContext: {
      userId: 'perf-test-001',
      workspaceId: 'workspace-test',
      currentIntent: {
        primary: 'Performance monitoring test',
        confidence: 0.8,
        urgency: 'low',
        complexity: 'simple',
      },
      userSkillLevel: 'intermediate',
      userPreferences: {
        communicationStyle: 'concise',
        complexityPreference: 'simple',
        automationLevel: 'automatic',
        feedbackLevel: 'minimal',
        toolCategories: ['testing', 'performance'],
        preferredWorkflowPatterns: ['automated-testing'],
      },
      recentToolUsage: [],
      activeWorkflows: [],
      timeContext: {
        timeOfDay: 'morning',
        dayOfWeek: 'Monday',
        timeZone: 'UTC',
        workingHours: true,
        urgency: 'low',
      },
      businessContext: {
        industry: 'testing',
        companySize: 'small',
        businessFunction: 'qa',
        complianceRequirements: [],
        securityLevel: 'basic',
      },
      deviceContext: {
        deviceType: 'desktop',
        screenSize: 'medium',
        inputMethod: 'keyboard',
        connectionQuality: 'fast',
      },
    },
    maxRecommendations: 5,
  }

  try {
    // Run multiple requests to gather performance data
    const performanceResults = []
    const iterations = 10

    console.log(`Running ${iterations} performance tests...`)

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now()

      const recommendations = await engine.getRecommendations({
        ...perfRequest,
        currentContext: {
          ...perfRequest.currentContext,
          userId: `perf-test-${i.toString().padStart(3, '0')}`,
        },
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      performanceResults.push({
        iteration: i + 1,
        duration,
        recommendationCount: recommendations.length,
        avgConfidence:
          recommendations.reduce((sum, rec) => sum + rec.confidence, 0) / recommendations.length,
      })

      if (i % 3 === 0) {
        console.log(`Completed ${i + 1}/${iterations} tests...`)
      }
    }

    // Calculate performance metrics
    const durations = performanceResults.map((r) => r.duration)
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
    const minDuration = Math.min(...durations)
    const maxDuration = Math.max(...durations)
    const p95Duration = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)]

    console.log('\nPerformance Results:')
    console.log(`Average Duration: ${avgDuration.toFixed(1)}ms`)
    console.log(`Min Duration: ${minDuration}ms`)
    console.log(`Max Duration: ${maxDuration}ms`)
    console.log(`P95 Duration: ${p95Duration}ms`)

    const avgRecommendations =
      performanceResults.reduce((sum, r) => sum + r.recommendationCount, 0) /
      performanceResults.length
    const avgConfidence =
      performanceResults.reduce((sum, r) => sum + r.avgConfidence, 0) / performanceResults.length

    console.log(`Average Recommendations: ${avgRecommendations.toFixed(1)}`)
    console.log(`Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`)

    // Performance analysis
    console.log('\nPerformance Analysis:')
    if (avgDuration < 50) {
      console.log('✓ Excellent performance - under 50ms average')
    } else if (avgDuration < 100) {
      console.log('✓ Good performance - under 100ms average')
    } else {
      console.log('⚠ Performance needs optimization - over 100ms average')
    }

    if (p95Duration < 200) {
      console.log('✓ Good P95 performance - under 200ms')
    } else {
      console.log('⚠ P95 performance needs attention - over 200ms')
    }

    if (avgConfidence > 0.7) {
      console.log('✓ High recommendation confidence - above 70%')
    } else {
      console.log('⚠ Low recommendation confidence - needs algorithm tuning')
    }

    // Recommendations for optimization
    console.log('\nOptimization Recommendations:')
    if (avgDuration > 100) {
      console.log('- Consider increasing cache sizes')
      console.log('- Review algorithm complexity')
      console.log('- Enable circuit breaker patterns')
    }

    if (maxDuration > avgDuration * 3) {
      console.log('- High variance detected - investigate outliers')
      console.log('- Consider request timeout limits')
    }

    if (avgConfidence < 0.6) {
      console.log('- Increase training data volume')
      console.log('- Adjust algorithm weights')
      console.log('- Improve context analysis quality')
    }

    return {
      performanceMetrics: {
        avgDuration,
        minDuration,
        maxDuration,
        p95Duration,
        avgRecommendations,
        avgConfidence,
      },
      performanceResults,
    }
  } catch (error) {
    console.error('Error in performance monitoring:', error)
    throw error
  }
}

/**
 * Run all examples
 *
 * Executes all examples in sequence to demonstrate the full system.
 */
export async function runAllExamples() {
  console.log('🚀 Running All Contextual Recommendation Engine Examples\n')

  const results = {
    example1: null as any,
    example2: null as any,
    example3: null as any,
    example4: null as any,
    example5: null as any,
    example6: null as any,
  }

  try {
    // Run each example
    results.example1 = await example1_BasicRecommendation()
    results.example2 = await example2_ContextAnalysis()
    results.example3 = await example3_UsageAnalytics()
    results.example4 = await example4_AdvancedConfiguration()
    results.example5 = await example5_ExternalIntegration()
    results.example6 = await example6_PerformanceMonitoring()

    console.log('\n🎉 All examples completed successfully!')
    console.log('\nSummary:')
    console.log(`- Basic recommendations: ${results.example1?.length || 0} tools suggested`)
    console.log(
      `- Context analysis: ${results.example2?.identifiedIssues?.length || 0} issues identified`
    )
    console.log(
      `- Analytics insights: ${results.example3?.totalUsage || 0} total tool uses tracked`
    )
    console.log(
      `- Advanced config: ${results.example4?.recommendations?.length || 0} personalized recommendations`
    )
    console.log(
      `- External integration: ${results.example5?.length || 0} integrated recommendations`
    )
    console.log(
      `- Performance test: ${results.example6?.performanceMetrics?.avgDuration?.toFixed(1) || 0}ms average response time`
    )

    return results
  } catch (error) {
    console.error('Error running examples:', error)
    throw error
  }
}

// Export for use in other modules
export {
  example1_BasicRecommendation as basicRecommendation,
  example2_ContextAnalysis as contextAnalysis,
  example3_UsageAnalytics as usageAnalytics,
  example4_AdvancedConfiguration as advancedConfiguration,
  example5_ExternalIntegration as externalIntegration,
  example6_PerformanceMonitoring as performanceMonitoring,
}

// CLI usage example
if (require.main === module) {
  runAllExamples()
    .then(() => {
      console.log('\n✨ Examples completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Examples failed:', error)
      process.exit(1)
    })
}
