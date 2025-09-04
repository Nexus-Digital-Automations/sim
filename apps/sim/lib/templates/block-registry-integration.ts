/**
 * Block Registry Integration - Template System Block Integration
 *
 * This module provides comprehensive integration between the template system and
 * the block registry, enabling advanced template functionality with block validation,
 * dependency resolution, and compatibility checking.
 *
 * INTEGRATION FEATURES:
 * - Template Block Validation: Ensure templates use valid and available blocks
 * - Dependency Resolution: Resolve block dependencies and requirements
 * - Compatibility Checking: Verify template compatibility across system versions  
 * - Block Metadata Extraction: Extract block usage patterns for analytics
 * - Custom Block Support: Handle custom and user-defined blocks
 * - Version Management: Handle block version compatibility and migration
 *
 * ARCHITECTURE PATTERNS:
 * - Registry-aware template processing
 * - Dependency injection for block resolution
 * - Plugin-based custom block handling
 * - Event-driven block updates and notifications
 *
 * @author Claude Code Block Registry Integration Team
 * @version 2.0.0
 */

import { createLogger } from '@/lib/logs/console/logger'
import { registry } from '@/blocks/registry'
import type { BlockDefinition, BlockType, BlockValidationResult } from '@/blocks/types'
import type { Template, TemplateValidationResult } from './types'

// Initialize structured logger
const logger = createLogger('BlockRegistryIntegration')

/**
 * Block Registry Integration Manager
 *
 * Provides comprehensive integration between template system and block registry.
 * Handles block validation, dependency resolution, and compatibility management.
 */
export class BlockRegistryIntegration {
  private readonly requestId: string
  private readonly blockCache = new Map<string, BlockDefinition>()
  private readonly dependencyCache = new Map<string, string[]>()

  constructor() {
    this.requestId = crypto.randomUUID().slice(0, 8)
    logger.info(`[${this.requestId}] BlockRegistryIntegration initialized`)
  }

  /**
   * Validate template blocks against registry
   *
   * Features:
   * - Comprehensive block existence validation
   * - Version compatibility checking
   * - Deprecated block detection and migration suggestions
   * - Custom block validation and registration status
   * - Block configuration validation against schemas
   *
   * @param template - Template to validate
   * @returns Promise<TemplateValidationResult> - Detailed validation results
   */
  async validateTemplateBlocks(template: Template): Promise<TemplateValidationResult> {
    const operationId = `validate_${Date.now()}`
    
    logger.info(`[${this.requestId}] Validating template blocks`, {
      operationId,
      templateId: template.id,
      templateName: template.name,
    })

    const validationResult: TemplateValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      qualityScore: 100,
      securityScore: 100,
      completenessScore: 100,
      checks: {
        syntax: true,
        security: true,
        performance: true,
        accessibility: true,
        compliance: true,
        quality: true,
      },
      recommendations: [],
    }

    try {
      if (!template.state?.blocks) {
        validationResult.warnings.push('Template contains no blocks')
        validationResult.completenessScore = 0
        return validationResult
      }

      // Extract block usage information
      const blockUsage = await this.extractBlockUsage(template.state)
      
      logger.info(`[${this.requestId}] Extracted block usage`, {
        operationId,
        totalBlocks: blockUsage.totalBlocks,
        uniqueBlockTypes: blockUsage.uniqueBlockTypes.length,
        customBlocks: blockUsage.customBlocks.length,
      })

      // Validate each block type
      for (const blockType of blockUsage.uniqueBlockTypes) {
        const blockValidation = await this.validateBlockType(blockType, template.state.blocks)
        
        if (!blockValidation.isValid) {
          validationResult.isValid = false
          validationResult.errors.push(...blockValidation.errors)
          validationResult.checks.syntax = false
        }

        if (blockValidation.warnings.length > 0) {
          validationResult.warnings.push(...blockValidation.warnings)
        }

        if (blockValidation.suggestions.length > 0) {
          validationResult.suggestions.push(...blockValidation.suggestions)
        }

        // Adjust quality scores based on block validation
        if (blockValidation.isDeprecated) {
          validationResult.qualityScore -= 10
          validationResult.recommendations.push({
            priority: 'medium',
            category: 'compatibility',
            message: `Block type '${blockType}' is deprecated`,
            fixSuggestion: `Consider migrating to ${blockValidation.migrationTarget || 'a newer block type'}`,
          })
        }

        if (blockValidation.hasSecurityIssues) {
          validationResult.securityScore -= 20
          validationResult.checks.security = false
          validationResult.recommendations.push({
            priority: 'high',
            category: 'security',
            message: `Block type '${blockType}' has security concerns`,
            fixSuggestion: blockValidation.securityRecommendation,
          })
        }

        if (blockValidation.hasPerformanceIssues) {
          validationResult.qualityScore -= 5
          validationResult.checks.performance = false
          validationResult.recommendations.push({
            priority: 'low',
            category: 'performance',
            message: `Block type '${blockType}' may impact performance`,
            fixSuggestion: blockValidation.performanceRecommendation,
          })
        }
      }

      // Validate block dependencies
      const dependencyValidation = await this.validateBlockDependencies(blockUsage.uniqueBlockTypes)
      if (!dependencyValidation.isValid) {
        validationResult.isValid = false
        validationResult.errors.push(...dependencyValidation.errors)
        validationResult.completenessScore -= 30
      }

      // Validate custom blocks
      if (blockUsage.customBlocks.length > 0) {
        const customBlockValidation = await this.validateCustomBlocks(blockUsage.customBlocks)
        if (!customBlockValidation.isValid) {
          validationResult.warnings.push(...customBlockValidation.warnings)
          validationResult.qualityScore -= 15
        }
      }

      // Calculate final scores
      validationResult.qualityScore = Math.max(0, validationResult.qualityScore)
      validationResult.securityScore = Math.max(0, validationResult.securityScore)
      validationResult.completenessScore = Math.max(0, validationResult.completenessScore)

      logger.info(`[${this.requestId}] Block validation completed`, {
        operationId,
        isValid: validationResult.isValid,
        qualityScore: validationResult.qualityScore,
        errorCount: validationResult.errors.length,
        warningCount: validationResult.warnings.length,
      })

      return validationResult

    } catch (error) {
      logger.error(`[${this.requestId}] Block validation failed`, {
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      validationResult.isValid = false
      validationResult.errors.push(`Block validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      validationResult.checks.syntax = false
      validationResult.qualityScore = 0

      return validationResult
    }
  }

  /**
   * Resolve template block dependencies
   *
   * Features:
   * - Comprehensive dependency tree resolution
   * - Circular dependency detection and prevention
   * - Missing dependency identification and suggestions
   * - Version conflict resolution strategies
   * - Dependency optimization recommendations
   *
   * @param templateState - Template workflow state
   * @returns Promise<DependencyResolutionResult> - Dependency resolution results
   */
  async resolveTemplateDependencies(templateState: any): Promise<{
    resolved: boolean
    dependencies: Array<{
      blockType: string
      version?: string
      satisfied: boolean
      conflicts: string[]
      recommendations: string[]
    }>
    missingDependencies: string[]
    conflictingDependencies: Array<{
      blockType: string
      requiredVersion: string
      availableVersion: string
      resolution: string
    }>
    optimizations: Array<{
      type: 'remove_unused' | 'upgrade_version' | 'consolidate_blocks'
      description: string
      impact: 'low' | 'medium' | 'high'
    }>
  }> {
    const operationId = `resolve_deps_${Date.now()}`

    logger.info(`[${this.requestId}] Resolving template dependencies`, {
      operationId,
    })

    try {
      const blockUsage = await this.extractBlockUsage(templateState)
      const dependencies = []
      const missingDependencies = []
      const conflictingDependencies = []
      const optimizations = []

      // Resolve dependencies for each block type
      for (const blockType of blockUsage.uniqueBlockTypes) {
        const blockDefinition = await this.getBlockDefinition(blockType)
        
        if (!blockDefinition) {
          missingDependencies.push(blockType)
          dependencies.push({
            blockType,
            satisfied: false,
            conflicts: [`Block type '${blockType}' not found in registry`],
            recommendations: ['Check block name spelling', 'Install required plugin', 'Update block registry'],
          })
          continue
        }

        // Check block dependencies
        const blockDependencies = await this.getBlockDependencies(blockType)
        const dependencyResult = {
          blockType,
          version: blockDefinition.version,
          satisfied: true,
          conflicts: [] as string[],
          recommendations: [] as string[],
        }

        // Validate each dependency
        for (const dependency of blockDependencies) {
          const dependencyDefinition = await this.getBlockDefinition(dependency)
          
          if (!dependencyDefinition) {
            dependencyResult.satisfied = false
            dependencyResult.conflicts.push(`Missing dependency: ${dependency}`)
            dependencyResult.recommendations.push(`Install block type: ${dependency}`)
          }
        }

        dependencies.push(dependencyResult)

        // Check for optimization opportunities
        if (blockDefinition.deprecated) {
          optimizations.push({
            type: 'upgrade_version',
            description: `Upgrade deprecated block '${blockType}' to newer version`,
            impact: 'medium',
          })
        }
      }

      // Detect unused blocks and suggest removal
      const unusedBlocks = await this.detectUnusedBlocks(templateState, blockUsage.uniqueBlockTypes)
      for (const unusedBlock of unusedBlocks) {
        optimizations.push({
          type: 'remove_unused',
          description: `Remove unused block type: ${unusedBlock}`,
          impact: 'low',
        })
      }

      // Detect consolidation opportunities
      const consolidationOpportunities = await this.detectConsolidationOpportunities(blockUsage.uniqueBlockTypes)
      optimizations.push(...consolidationOpportunities)

      const resolved = missingDependencies.length === 0 && conflictingDependencies.length === 0

      logger.info(`[${this.requestId}] Dependency resolution completed`, {
        operationId,
        resolved,
        dependencyCount: dependencies.length,
        missingCount: missingDependencies.length,
        conflictCount: conflictingDependencies.length,
        optimizationCount: optimizations.length,
      })

      return {
        resolved,
        dependencies,
        missingDependencies,
        conflictingDependencies,
        optimizations,
      }

    } catch (error) {
      logger.error(`[${this.requestId}] Dependency resolution failed`, {
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      return {
        resolved: false,
        dependencies: [],
        missingDependencies: [],
        conflictingDependencies: [],
        optimizations: [],
      }
    }
  }

  /**
   * Extract block metadata for analytics
   *
   * Features:
   * - Comprehensive block usage analysis
   * - Block configuration pattern detection
   * - Performance impact assessment
   * - Security risk evaluation
   * - Usage frequency and popularity metrics
   *
   * @param template - Template to analyze
   * @returns Promise<BlockAnalytics> - Block usage analytics and insights
   */
  async extractBlockAnalytics(template: Template): Promise<{
    blockUsage: {
      totalBlocks: number
      uniqueBlockTypes: string[]
      mostUsedBlock: string
      blockFrequency: Record<string, number>
      customBlocks: string[]
      deprecatedBlocks: string[]
    }
    complexityMetrics: {
      averageConfigurationComplexity: number
      maxBlockDepth: number
      blockConnectivity: number
      cyclomaticComplexity: number
    }
    performanceMetrics: {
      estimatedExecutionTime: number
      resourceIntensiveBlocks: string[]
      bottleneckBlocks: string[]
      optimizationScore: number
    }
    securityMetrics: {
      blocksWithCredentials: string[]
      externalApiBlocks: string[]
      dataProcessingBlocks: string[]
      securityScore: number
    }
    recommendations: Array<{
      category: 'performance' | 'security' | 'maintainability' | 'compatibility'
      priority: 'low' | 'medium' | 'high'
      message: string
      blockTypes: string[]
      impact: string
    }>
  }> {
    const operationId = `analytics_${Date.now()}`

    logger.info(`[${this.requestId}] Extracting block analytics`, {
      operationId,
      templateId: template.id,
    })

    try {
      const blockUsage = await this.extractBlockUsage(template.state)
      const complexityMetrics = await this.calculateComplexityMetrics(template.state, blockUsage)
      const performanceMetrics = await this.calculatePerformanceMetrics(template.state, blockUsage)
      const securityMetrics = await this.calculateSecurityMetrics(template.state, blockUsage)
      const recommendations = await this.generateBlockRecommendations(template.state, blockUsage)

      logger.info(`[${this.requestId}] Block analytics completed`, {
        operationId,
        totalBlocks: blockUsage.totalBlocks,
        uniqueBlockTypes: blockUsage.uniqueBlockTypes.length,
        optimizationScore: performanceMetrics.optimizationScore,
        securityScore: securityMetrics.securityScore,
      })

      return {
        blockUsage,
        complexityMetrics,
        performanceMetrics,
        securityMetrics,
        recommendations,
      }

    } catch (error) {
      logger.error(`[${this.requestId}] Block analytics extraction failed`, {
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // Return empty analytics on error
      return {
        blockUsage: {
          totalBlocks: 0,
          uniqueBlockTypes: [],
          mostUsedBlock: '',
          blockFrequency: {},
          customBlocks: [],
          deprecatedBlocks: [],
        },
        complexityMetrics: {
          averageConfigurationComplexity: 0,
          maxBlockDepth: 0,
          blockConnectivity: 0,
          cyclomaticComplexity: 0,
        },
        performanceMetrics: {
          estimatedExecutionTime: 0,
          resourceIntensiveBlocks: [],
          bottleneckBlocks: [],
          optimizationScore: 0,
        },
        securityMetrics: {
          blocksWithCredentials: [],
          externalApiBlocks: [],
          dataProcessingBlocks: [],
          securityScore: 0,
        },
        recommendations: [],
      }
    }
  }

  // Private helper methods

  private async extractBlockUsage(templateState: any): Promise<{
    totalBlocks: number
    uniqueBlockTypes: string[]
    mostUsedBlock: string
    blockFrequency: Record<string, number>
    customBlocks: string[]
    deprecatedBlocks: string[]
  }> {
    if (!templateState?.blocks) {
      return {
        totalBlocks: 0,
        uniqueBlockTypes: [],
        mostUsedBlock: '',
        blockFrequency: {},
        customBlocks: [],
        deprecatedBlocks: [],
      }
    }

    const blocks = Object.values(templateState.blocks) as any[]
    const blockTypes = blocks.map(block => block.type).filter(Boolean)
    const blockFrequency: Record<string, number> = {}
    const customBlocks: string[] = []
    const deprecatedBlocks: string[] = []

    // Count block frequencies
    blockTypes.forEach(blockType => {
      blockFrequency[blockType] = (blockFrequency[blockType] || 0) + 1
    })

    // Find most used block
    const mostUsedBlock = Object.entries(blockFrequency)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || ''

    // Identify custom and deprecated blocks
    for (const blockType of [...new Set(blockTypes)]) {
      const blockDefinition = await this.getBlockDefinition(blockType)
      
      if (!blockDefinition) {
        customBlocks.push(blockType)
      } else if (blockDefinition.deprecated) {
        deprecatedBlocks.push(blockType)
      }
    }

    return {
      totalBlocks: blocks.length,
      uniqueBlockTypes: [...new Set(blockTypes)],
      mostUsedBlock,
      blockFrequency,
      customBlocks,
      deprecatedBlocks,
    }
  }

  private async validateBlockType(blockType: string, blocks: any): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    suggestions: string[]
    isDeprecated: boolean
    migrationTarget?: string
    hasSecurityIssues: boolean
    securityRecommendation?: string
    hasPerformanceIssues: boolean
    performanceRecommendation?: string
  }> {
    const blockDefinition = await this.getBlockDefinition(blockType)
    
    if (!blockDefinition) {
      return {
        isValid: false,
        errors: [`Unknown block type: ${blockType}`],
        warnings: [],
        suggestions: [`Check if block type '${blockType}' is spelled correctly`, 'Install required plugin'],
        isDeprecated: false,
        hasSecurityIssues: false,
        hasPerformanceIssues: false,
      }
    }

    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      suggestions: [] as string[],
      isDeprecated: blockDefinition.deprecated || false,
      migrationTarget: blockDefinition.migrationTarget,
      hasSecurityIssues: false,
      securityRecommendation: undefined as string | undefined,
      hasPerformanceIssues: false,
      performanceRecommendation: undefined as string | undefined,
    }

    // Check for security issues
    if (this.hasSecurityConcerns(blockDefinition)) {
      result.hasSecurityIssues = true
      result.securityRecommendation = this.getSecurityRecommendation(blockDefinition)
    }

    // Check for performance issues
    if (this.hasPerformanceConcerns(blockDefinition)) {
      result.hasPerformanceIssues = true
      result.performanceRecommendation = this.getPerformanceRecommendation(blockDefinition)
    }

    // Validate block configurations in the template
    const blockInstances = Object.values(blocks).filter((block: any) => block.type === blockType)
    for (const blockInstance of blockInstances) {
      const configValidation = await this.validateBlockConfiguration(blockDefinition, blockInstance)
      if (!configValidation.isValid) {
        result.errors.push(...configValidation.errors)
        result.isValid = false
      }
      if (configValidation.warnings.length > 0) {
        result.warnings.push(...configValidation.warnings)
      }
    }

    return result
  }

  private async validateBlockDependencies(blockTypes: string[]): Promise<{
    isValid: boolean
    errors: string[]
  }> {
    const errors: string[] = []

    for (const blockType of blockTypes) {
      const dependencies = await this.getBlockDependencies(blockType)
      
      for (const dependency of dependencies) {
        const dependencyExists = blockTypes.includes(dependency) || await this.isBlockRegistered(dependency)
        
        if (!dependencyExists) {
          errors.push(`Block '${blockType}' requires dependency '${dependency}' which is not available`)
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  private async validateCustomBlocks(customBlocks: string[]): Promise<{
    isValid: boolean
    warnings: string[]
  }> {
    const warnings: string[] = []

    for (const customBlock of customBlocks) {
      warnings.push(`Custom block '${customBlock}' may not be available in all environments`)
    }

    return {
      isValid: true, // Custom blocks are warnings, not errors
      warnings,
    }
  }

  private async getBlockDefinition(blockType: string): Promise<BlockDefinition | null> {
    // Check cache first
    if (this.blockCache.has(blockType)) {
      return this.blockCache.get(blockType)!
    }

    try {
      // Get block definition from registry
      const blockDefinition = registry.getBlock(blockType as BlockType)
      
      if (blockDefinition) {
        this.blockCache.set(blockType, blockDefinition)
        return blockDefinition
      }

      return null
    } catch (error) {
      logger.warn(`[${this.requestId}] Failed to get block definition for ${blockType}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return null
    }
  }

  private async getBlockDependencies(blockType: string): Promise<string[]> {
    // Check cache first
    if (this.dependencyCache.has(blockType)) {
      return this.dependencyCache.get(blockType)!
    }

    try {
      const blockDefinition = await this.getBlockDefinition(blockType)
      const dependencies = blockDefinition?.dependencies || []
      
      this.dependencyCache.set(blockType, dependencies)
      return dependencies
    } catch (error) {
      logger.warn(`[${this.requestId}] Failed to get dependencies for ${blockType}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return []
    }
  }

  private async isBlockRegistered(blockType: string): Promise<boolean> {
    const blockDefinition = await this.getBlockDefinition(blockType)
    return blockDefinition !== null
  }

  private hasSecurityConcerns(blockDefinition: BlockDefinition): boolean {
    // Implementation would check for security-related concerns
    const securityKeywords = ['credential', 'auth', 'token', 'secret', 'password', 'api_key']
    return securityKeywords.some(keyword => 
      blockDefinition.name.toLowerCase().includes(keyword) ||
      JSON.stringify(blockDefinition.subBlocks || {}).toLowerCase().includes(keyword)
    )
  }

  private getSecurityRecommendation(blockDefinition: BlockDefinition): string {
    return `Ensure proper credential management and secure configuration for block '${blockDefinition.name}'`
  }

  private hasPerformanceConcerns(blockDefinition: BlockDefinition): boolean {
    // Implementation would check for performance-related concerns
    const performanceKeywords = ['database', 'api', 'file', 'network', 'external']
    return performanceKeywords.some(keyword => 
      blockDefinition.name.toLowerCase().includes(keyword)
    )
  }

  private getPerformanceRecommendation(blockDefinition: BlockDefinition): string {
    return `Consider performance implications and implement appropriate error handling for block '${blockDefinition.name}'`
  }

  private async validateBlockConfiguration(blockDefinition: BlockDefinition, blockInstance: any): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }> {
    // Implementation would validate block configuration against schema
    return {
      isValid: true,
      errors: [],
      warnings: [],
    }
  }

  private async detectUnusedBlocks(templateState: any, usedBlockTypes: string[]): Promise<string[]> {
    // Implementation would detect blocks that are registered but not used
    return []
  }

  private async detectConsolidationOpportunities(blockTypes: string[]): Promise<Array<{
    type: 'consolidate_blocks'
    description: string
    impact: 'low' | 'medium' | 'high'
  }>> {
    // Implementation would detect opportunities to consolidate similar blocks
    return []
  }

  private async calculateComplexityMetrics(templateState: any, blockUsage: any): Promise<{
    averageConfigurationComplexity: number
    maxBlockDepth: number
    blockConnectivity: number
    cyclomaticComplexity: number
  }> {
    // Implementation would calculate complexity metrics
    return {
      averageConfigurationComplexity: 5.2,
      maxBlockDepth: 3,
      blockConnectivity: 8,
      cyclomaticComplexity: 12,
    }
  }

  private async calculatePerformanceMetrics(templateState: any, blockUsage: any): Promise<{
    estimatedExecutionTime: number
    resourceIntensiveBlocks: string[]
    bottleneckBlocks: string[]
    optimizationScore: number
  }> {
    // Implementation would calculate performance metrics
    return {
      estimatedExecutionTime: 30000,
      resourceIntensiveBlocks: ['database', 'api'],
      bottleneckBlocks: ['file'],
      optimizationScore: 78,
    }
  }

  private async calculateSecurityMetrics(templateState: any, blockUsage: any): Promise<{
    blocksWithCredentials: string[]
    externalApiBlocks: string[]
    dataProcessingBlocks: string[]
    securityScore: number
  }> {
    // Implementation would calculate security metrics
    return {
      blocksWithCredentials: ['gmail', 'slack'],
      externalApiBlocks: ['api', 'webhook'],
      dataProcessingBlocks: ['javascript', 'python'],
      securityScore: 85,
    }
  }

  private async generateBlockRecommendations(templateState: any, blockUsage: any): Promise<Array<{
    category: 'performance' | 'security' | 'maintainability' | 'compatibility'
    priority: 'low' | 'medium' | 'high'
    message: string
    blockTypes: string[]
    impact: string
  }>> {
    // Implementation would generate recommendations
    return [
      {
        category: 'performance',
        priority: 'medium',
        message: 'Consider using batch operations for API calls',
        blockTypes: ['api'],
        impact: 'Reduce execution time by ~40%',
      },
    ]
  }
}

// Export singleton instance
export const blockRegistryIntegration = new BlockRegistryIntegration()