/**
 * Universal Tool Adapter System for Sim-Parlant Integration
 *
 * This system provides a bridge between Sim's existing tool infrastructure
 * and Parlant's AI agent system, enabling natural language interactions
 * with all of Sim's 20+ tools.
 *
 * Key Features:
 * - Automatic tool discovery and registration
 * - Natural language descriptions and usage guidelines
 * - Context-aware tool recommendations
 * - Error handling with user-friendly explanations
 * - Performance optimization and resource management
 * - Configuration-driven customization
 */

export * from './adapter-registry'
export * from './adapters'
export * from './base-adapter'
export * from './configuration'
export * from './error-handling'
export { createToolAdapter, registerToolAdapter } from './factory'
export * from './performance'
// Main entry points
export { ParlantToolAdapterService } from './service'
export * from './types'
