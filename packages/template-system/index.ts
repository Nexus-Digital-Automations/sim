/**
 * Template System for Dynamic Journey Generation
 * ==============================================
 *
 * This module provides a comprehensive template system that enables dynamic journey
 * creation from workflow templates. It supports parameterization, inheritance,
 * composition patterns, and custom workflow-to-journey transformations.
 *
 * Key Features:
 * - Template framework with parameter injection
 * - Template inheritance and composition
 * - Dynamic journey generation from workflows
 * - Template versioning and migration support
 * - Comprehensive template library with common patterns
 * - Template analytics and usage tracking
 */

export * from './core/template-engine'
export * from './core/template-registry'
export * from './core/parameter-system'
export * from './core/inheritance-system'

export * from './generators/journey-generator'
export * from './generators/workflow-converter'
export * from './generators/optimization-engine'

export * from './library/template-library'
export * from './library/pattern-matcher'
export * from './library/template-discovery'

export * from './api/template-api'
export * from './api/generation-api'
export * from './api/management-api'

export * from './types/template-types'
export * from './types/journey-types'
export * from './types/workflow-types'

export * from './utils/template-validator'
export * from './utils/cache-manager'
export * from './utils/analytics-tracker'