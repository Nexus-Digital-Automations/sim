/**
 * Contextual Recommendation Engine - Usage Examples
 *
 * This file demonstrates practical usage patterns for the contextual
 * recommendation engine system. These examples show real-world scenarios
 * and best practices for integration.
 */

import { ContextAnalysisSystem } from './context-analysis-system'
import { ContextualRecommendationEngine } from './contextual-recommendation-engine'
import type {
  ContextAnalysisRequest,
  ContextualRecommendationRequest,
  ToolUsageEvent,
  UserProfile,
} from './types'
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
    algorithmWeights: {
      collaborative: 0.4,
      contentBased: 0.4,
      contextual: 0.2,
    },
    caching: {
      l1: { maxSize: 100, ttl: 60000 },
      l2: { maxSize: 1000, ttl: 300000 },
    },
  })

  // Create a recommendation request for authentication implementation
  const request: ContextualRecommendationRequest = {
    context: {
      currentTask: 'Implement user authentication system',
      codebase: 'TypeScript/React application with Node.js backend',
      userMessage: 'I need to add secure login functionality with JWT tokens',
      conversationHistory: [
        {
          role: 'user',
          content: "I'm building a web app and need user authentication",
          timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        },
      ],
      workspaceContext: {
        framework: 'React',
        language: 'TypeScript',
        backend: 'Node.js',
        database: 'PostgreSQL',
      },
    },
    userId: 'developer-001',
    maxRecommendations: 5,
    includeReasoning: true,
  }

  try {
    const recommendations = await engine.getRecommendations(request)

    console.log(`Received ${recommendations.length} recommendations:`)
    recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.toolName}`)
      console.log(`   Confidence: ${(rec.confidence * 100).toFixed(1)}%`)
      console.log(`   Category: ${rec.category}`)
      console.log(`   Reasoning: ${rec.reasoning}`)
      console.log(`   Instructions: ${rec.personalizedInstructions}`)
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

  const contextAnalyzer = new ContextAnalysisSystem()

  // Complex debugging scenario
  const analysisRequest: ContextAnalysisRequest = {
    userMessage:
      'The authentication system is failing intermittently. Users sometimes get logged out unexpectedly, and there are 401 errors in the console. The JWT tokens seem to expire randomly.',
    conversationHistory: [
      {
        role: 'user',
        content: 'I implemented JWT authentication yesterday',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
      },
      {
        role: 'assistant',
        content: 'I helped you set up the JWT middleware and token validation',
        timestamp: new Date(Date.now() - 86400000 + 300000),
      },
      {
        role: 'user',
        content: "Now I'm getting reports of random logouts",
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      },
    ],
    codebaseContext: {
      framework: 'Express.js',
      language: 'JavaScript',
      database: 'MongoDB',
      authentication: 'JWT',
      currentFiles: ['middleware/auth.js', 'routes/auth.js', 'models/User.js', 'utils/jwt.js'],
    },
    workspaceInfo: {
      projectType: 'web-api',
      deploymentEnv: 'staging',
      hasTests: true,
      hasLogging: false, // This will be important for the analysis
    },
  }

  try {
    const analysis = await contextAnalyzer.analyzeContext(analysisRequest)

    console.log('Context Analysis Results:')
    console.log(`Primary Intent: ${analysis.primaryIntent}`)
    console.log(`Secondary Intents: ${analysis.secondaryIntents.join(', ')}`)
    console.log(`Context Categories: ${analysis.contextCategories.join(', ')}`)
    console.log(`Complexity Level: ${analysis.complexityLevel}`)
    console.log(`Confidence: ${(analysis.confidence * 100).toFixed(1)}%`)

    console.log('\nDetected Issues:')
    analysis.identifiedIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.type}: ${issue.description}`)
      console.log(`   Severity: ${issue.severity}`)
      console.log(`   Suggested Actions: ${issue.suggestedActions.join(', ')}`)
    })

    console.log('\nRecommended Tool Categories:')
    analysis.recommendedToolCategories.forEach((category, index) => {
      console.log(`${index + 1}. ${category.name} (Priority: ${category.priority})`)
      console.log(`   Reasoning: ${category.reasoning}`)
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
  const usageEvents: ToolUsageEvent[] = [
    {
      toolName: 'Debug Helper',
      userId: userId,
      context: {
        task: 'authentication debugging',
        codebase: 'Express.js API',
        complexity: 'medium',
      },
      success: true,
      duration: 45000, // 45 seconds
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      outcome: 'issue_resolved',
      userFeedback: {
        rating: 5,
        comment: 'Very helpful for identifying the JWT expiration issue',
      },
    },
    {
      toolName: 'Log Analyzer',
      userId: userId,
      context: {
        task: 'authentication debugging',
        codebase: 'Express.js API',
        complexity: 'medium',
      },
      success: true,
      duration: 120000, // 2 minutes
      timestamp: new Date(Date.now() - 3300000), // 55 minutes ago
      outcome: 'additional_insights',
      userFeedback: {
        rating: 4,
        comment: 'Good for pattern recognition, could be faster',
      },
    },
    {
      toolName: 'Code Generator',
      userId: userId,
      context: {
        task: 'authentication implementation',
        codebase: 'React frontend',
        complexity: 'low',
      },
      success: false,
      duration: 180000, // 3 minutes
      timestamp: new Date(Date.now() - 86400000), // 1 day ago
      outcome: 'user_abandoned',
      userFeedback: {
        rating: 2,
        comment: "Generated code didn't match our patterns",
      },
    },
  ]

  try {
    // Track all usage events
    for (const event of usageEvents) {
      await analytics.trackToolUsage(event)
      console.log(`Tracked usage of ${event.toolName} (${event.success ? 'Success' : 'Failed'})`)
    }

    // Generate user insights
    const insights = await analytics.generateInsights(userId, {
      timeRange: {
        start: new Date(Date.now() - 86400000 * 7), // Last 7 days
        end: new Date(),
      },
      includeRecommendations: true,
      includePredictions: true,
    })

    console.log('\nUser Insights:')
    console.log(`Total Tool Uses: ${insights.totalUsage}`)
    console.log(`Success Rate: ${(insights.successRate * 100).toFixed(1)}%`)
    console.log(`Average Session Duration: ${Math.round(insights.avgSessionDuration / 1000)}s`)

    console.log('\nMost Used Tools:')
    insights.mostUsedTools.forEach((tool, index) => {
      console.log(
        `${index + 1}. ${tool.name} (${tool.count} uses, ${(tool.successRate * 100).toFixed(1)}% success)`
      )
    })

    console.log('\nBehavioral Patterns:')
    insights.behavioralPatterns.forEach((pattern, index) => {
      console.log(`${index + 1}. ${pattern.pattern}`)
      console.log(`   Confidence: ${(pattern.confidence * 100).toFixed(1)}%`)
      console.log(`   Frequency: ${pattern.frequency}`)
    })

    console.log('\nRecommendation Metrics:')
    if (insights.recommendationMetrics) {
      console.log(`Accuracy: ${(insights.recommendationMetrics.accuracy * 100).toFixed(1)}%`)
      console.log(
        `Click-through Rate: ${(insights.recommendationMetrics.clickThroughRate * 100).toFixed(1)}%`
      )
      console.log(
        `User Satisfaction: ${(insights.recommendationMetrics.userSatisfaction * 100).toFixed(1)}%`
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
    algorithmWeights: {
      collaborative: 0.3, // Reduced for experienced users
      contentBased: 0.5, // Increased for technical matching
      contextual: 0.2, // Standard context analysis
    },
    performance: {
      maxProcessingTime: 50, // Faster for experienced users
      minConfidenceThreshold: 0.4, // Higher threshold for quality
      enableCircuitBreaker: true,
      timeoutMs: 5000,
    },
    personalization: {
      adaptToUserLevel: true,
      learningRate: 0.1,
      feedbackWeight: 0.3,
    },
    caching: {
      l1: { maxSize: 200, ttl: 30000 }, // Faster cache for power users
      l2: { maxSize: 2000, ttl: 150000 },
      l3: { maxSize: 20000, ttl: 1800000 },
    },
    analytics: {
      enabled: true,
      samplingRate: 0.2, // Higher sampling for detailed analysis
      includeDetailedMetrics: true,
      privacyMode: false, // User opted for detailed tracking
    },
  }

  const engine = new ContextualRecommendationEngine(advancedConfig)

  // Create a user profile for a senior developer
  const seniorDevProfile: UserProfile = {
    userId: 'senior-dev-001',
    skillLevel: 'expert',
    preferredTools: [
      'Advanced Debugger',
      'Performance Profiler',
      'Code Analyzer',
      'Security Scanner',
    ],
    domains: [
      'full-stack-development',
      'system-architecture',
      'performance-optimization',
      'security',
    ],
    experienceYears: 8,
    programmingLanguages: ['TypeScript', 'Python', 'Go', 'Rust'],
    frameworks: ['React', 'Node.js', 'FastAPI', 'Kubernetes'],
    workPatterns: {
      averageSessionDuration: 7200000, // 2 hours
      peakUsageHours: [9, 10, 11, 14, 15, 16], // 9-11am, 2-4pm
      preferredComplexity: 'high',
      collaborationStyle: 'independent',
    },
    preferences: {
      verboseExplanations: false, // Experienced users prefer concise
      showAdvancedOptions: true,
      autoExecute: true,
      notificationLevel: 'minimal',
    },
  }

  // Complex architectural task
  const architecturalRequest: ContextualRecommendationRequest = {
    context: {
      currentTask: 'Design microservices architecture for high-throughput payment processing',
      codebase: 'Multi-service architecture with Go, TypeScript, and Python services',
      userMessage:
        'I need to architect a payment system that can handle 10k+ transactions per second with 99.99% uptime requirements. Looking for patterns, tools, and technologies.',
      conversationHistory: [
        {
          role: 'user',
          content: 'Starting a new payment processing service',
          timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        },
        {
          role: 'assistant',
          content: 'I can help you design a scalable payment architecture',
          timestamp: new Date(Date.now() - 1750000),
        },
      ],
      workspaceContext: {
        projectSize: 'enterprise',
        teamSize: 12,
        timeline: '6-months',
        budget: 'high',
        complianceRequirements: ['PCI-DSS', 'SOC2', 'GDPR'],
        performanceRequirements: {
          throughput: '10000+ TPS',
          latency: '<100ms p99',
          availability: '99.99%',
        },
      },
    },
    userId: seniorDevProfile.userId,
    userProfile: seniorDevProfile,
    maxRecommendations: 8, // More recommendations for complex tasks
    includeReasoning: true,
    includeAlternatives: true,
  }

  try {
    console.log('Getting personalized recommendations for senior developer...')
    const recommendations = await engine.getRecommendations(architecturalRequest)

    console.log(`\nPersonalized recommendations for ${seniorDevProfile.skillLevel} level user:`)
    recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.toolName}`)
      console.log(`   Confidence: ${(rec.confidence * 100).toFixed(1)}%`)
      console.log(`   Category: ${rec.category}`)
      console.log(`   Personalization: Tailored for ${seniorDevProfile.skillLevel} level`)
      console.log(`   Reasoning: ${rec.reasoning}`)
      console.log(`   Instructions: ${rec.personalizedInstructions}`)

      if (rec.alternatives && rec.alternatives.length > 0) {
        console.log(`   Alternatives: ${rec.alternatives.map((alt) => alt.name).join(', ')}`)
      }

      if (rec.metadata) {
        console.log(
          `   Metadata: Complexity=${rec.metadata.complexity}, Domain=${rec.metadata.domain}`
        )
      }
    })

    // Show algorithm breakdown for transparency
    console.log('\nAlgorithm Contribution Breakdown:')
    recommendations.slice(0, 3).forEach((rec, index) => {
      if (rec.algorithmBreakdown) {
        console.log(`\n${rec.toolName}:`)
        console.log(`   Collaborative: ${(rec.algorithmBreakdown.collaborative * 100).toFixed(1)}%`)
        console.log(`   Content-Based: ${(rec.algorithmBreakdown.contentBased * 100).toFixed(1)}%`)
        console.log(`   Contextual: ${(rec.algorithmBreakdown.contextual * 100).toFixed(1)}%`)
      }
    })

    return { recommendations, userProfile: seniorDevProfile }
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
    algorithmWeights: {
      collaborative: 0.3,
      contentBased: 0.4,
      contextual: 0.3,
    },
    externalIntegrations: {
      toolDescriptionAgent: {
        enabled: true,
        endpoint: 'http://localhost:3001/api/tools',
        apiKey: process.env.TOOL_DESCRIPTION_API_KEY,
        timeout: 5000,
        metadataFields: [
          'description',
          'category',
          'complexity',
          'dependencies',
          'performance',
          'security',
        ],
        cacheDuration: 3600000, // 1 hour cache
      },
      knowledgeBase: {
        enabled: true,
        endpoint: 'http://localhost:3002/api/knowledge',
        searchDepth: 5,
        includeExamples: true,
      },
      userProfileService: {
        enabled: true,
        endpoint: 'http://localhost:3003/api/profiles',
        syncInterval: 300000, // 5 minutes
      },
    },
  }

  const engine = new ContextualRecommendationEngine(integrationConfig)

  // Request with external tool metadata integration
  const integrationRequest: ContextualRecommendationRequest = {
    context: {
      currentTask: 'Optimize database queries for better performance',
      codebase: 'Python Django application with PostgreSQL',
      userMessage:
        'Our database queries are slow and affecting user experience. Need tools to identify bottlenecks and optimize performance.',
      workspaceContext: {
        technology_stack: {
          backend: 'Django',
          database: 'PostgreSQL',
          caching: 'Redis',
          monitoring: 'New Relic',
        },
        performance_issues: {
          query_time: 'avg 2.5s',
          page_load: 'avg 4.2s',
          database_load: '85% CPU usage',
        },
      },
    },
    userId: 'developer-performance-001',
    maxRecommendations: 6,
    includeExternalMetadata: true,
    includeUsageExamples: true,
  }

  try {
    console.log('Getting recommendations with external system integration...')

    // This would integrate with external systems if they were available
    const recommendations = await engine.getRecommendations(integrationRequest)

    console.log(`\nIntegrated recommendations with external metadata:`)
    recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.toolName}`)
      console.log(`   Confidence: ${(rec.confidence * 100).toFixed(1)}%`)
      console.log(`   Category: ${rec.category}`)
      console.log(`   Reasoning: ${rec.reasoning}`)

      // Show external metadata if available
      if (rec.externalMetadata) {
        console.log(`   External Metadata:`)
        console.log(`     Source: ${rec.externalMetadata.source}`)
        console.log(`     Last Updated: ${rec.externalMetadata.lastUpdated}`)
        console.log(`     Dependencies: ${rec.externalMetadata.dependencies?.join(', ') || 'None'}`)
        console.log(`     Performance Rating: ${rec.externalMetadata.performanceRating}/5`)
      }

      // Show usage examples if available
      if (rec.usageExamples) {
        console.log(`   Usage Examples:`)
        rec.usageExamples.forEach((example, idx) => {
          console.log(`     ${idx + 1}. ${example.scenario}: ${example.command}`)
        })
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
      includeExternalMetadata: false,
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
    algorithmWeights: {
      collaborative: 0.4,
      contentBased: 0.4,
      contextual: 0.2,
    },
    performance: {
      enableProfiling: true,
      enableMetrics: true,
      maxProcessingTime: 100,
      warningThreshold: 50,
      enableCircuitBreaker: true,
    },
  })

  const analytics = new UsageAnalyticsFramework()

  // Performance test request
  const perfRequest: ContextualRecommendationRequest = {
    context: {
      currentTask: 'Performance monitoring test',
      codebase: 'Test application',
      userMessage: 'Testing recommendation engine performance',
    },
    userId: 'perf-test-001',
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
        userId: `perf-test-${i.toString().padStart(3, '0')}`,
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
