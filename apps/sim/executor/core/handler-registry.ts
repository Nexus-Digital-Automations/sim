import { createLogger } from '@/lib/logs/console/logger'
import { BlockType } from '@/executor/consts'
import {
  AgentBlockHandler,
  ApiBlockHandler,
  ConditionBlockHandler,
  EvaluatorBlockHandler,
  FunctionBlockHandler,
  GenericBlockHandler,
  LoopBlockHandler,
  ParallelBlockHandler,
  ResponseBlockHandler,
  RouterBlockHandler,
  TriggerBlockHandler,
  WorkflowBlockHandler,
} from '@/executor/handlers'
import type { BlockHandler } from '@/executor/types'

const logger = createLogger('HandlerRegistry')

/**
 * Registry for managing block handlers with lazy loading and dependency injection
 */
export class HandlerRegistry {
  private handlers: Map<BlockType, BlockHandler> = new Map()
  private handlerFactories: Map<BlockType, () => BlockHandler> = new Map()
  private initialized = false

  constructor() {
    this.registerHandlerFactories()
  }

  /**
   * Register handler factories for lazy loading
   */
  private registerHandlerFactories(): void {
    // Core handlers
    this.handlerFactories.set(BlockType.AGENT, () => new AgentBlockHandler())
    this.handlerFactories.set(BlockType.API, () => new ApiBlockHandler())
    this.handlerFactories.set(BlockType.CONDITION, () => new ConditionBlockHandler())
    this.handlerFactories.set(BlockType.EVALUATOR, () => new EvaluatorBlockHandler())
    this.handlerFactories.set(BlockType.FUNCTION, () => new FunctionBlockHandler())
    this.handlerFactories.set(BlockType.GENERIC, () => new GenericBlockHandler())
    this.handlerFactories.set(BlockType.LOOP, () => new LoopBlockHandler())
    this.handlerFactories.set(BlockType.PARALLEL, () => new ParallelBlockHandler())
    this.handlerFactories.set(BlockType.RESPONSE, () => new ResponseBlockHandler())
    this.handlerFactories.set(BlockType.ROUTER, () => new RouterBlockHandler())
    this.handlerFactories.set(BlockType.TRIGGER, () => new TriggerBlockHandler())
    this.handlerFactories.set(BlockType.WORKFLOW, () => new WorkflowBlockHandler())

    logger.info(`Registered ${this.handlerFactories.size} handler factories`)
  }

  /**
   * Initialize all handlers (lazy loading)
   */
  initialize(): void {
    if (this.initialized) return

    logger.info('Initializing handler registry')

    for (const [blockType, factory] of this.handlerFactories) {
      try {
        const handler = factory()
        this.handlers.set(blockType, handler)
        logger.debug(`Initialized handler for ${blockType}`)
      } catch (error) {
        logger.error(`Failed to initialize handler for ${blockType}`, error)
      }
    }

    this.initialized = true
    logger.info(`Handler registry initialized with ${this.handlers.size} handlers`)
  }

  /**
   * Get handler for a specific block type
   */
  getHandler(blockType: BlockType): BlockHandler | undefined {
    // Lazy initialize if not done yet
    if (!this.initialized) {
      this.initialize()
    }

    const handler = this.handlers.get(blockType)
    if (!handler) {
      logger.warn(`No handler found for block type: ${blockType}`)
    }

    return handler
  }

  /**
   * Get all handlers as a Map
   */
  getAllHandlers(): Map<BlockType, BlockHandler> {
    if (!this.initialized) {
      this.initialize()
    }
    return new Map(this.handlers)
  }

  /**
   * Register a custom handler
   */
  registerHandler(blockType: BlockType, handler: BlockHandler): void {
    this.handlers.set(blockType, handler)
    logger.info(`Registered custom handler for ${blockType}`)
  }

  /**
   * Register a custom handler factory
   */
  registerHandlerFactory(blockType: BlockType, factory: () => BlockHandler): void {
    this.handlerFactories.set(blockType, factory)
    // If already initialized, create the handler immediately
    if (this.initialized) {
      try {
        const handler = factory()
        this.handlers.set(blockType, handler)
        logger.info(`Registered and initialized custom handler for ${blockType}`)
      } catch (error) {
        logger.error(`Failed to initialize custom handler for ${blockType}`, error)
      }
    }
  }

  /**
   * Check if handler exists for block type
   */
  hasHandler(blockType: BlockType): boolean {
    return this.handlerFactories.has(blockType) || this.handlers.has(blockType)
  }

  /**
   * Get list of supported block types
   */
  getSupportedBlockTypes(): BlockType[] {
    return Array.from(this.handlerFactories.keys())
  }

  /**
   * Reset registry (for testing)
   */
  reset(): void {
    this.handlers.clear()
    this.initialized = false
    this.registerHandlerFactories()
    logger.info('Handler registry reset')
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalFactories: number
    initializedHandlers: number
    supportedTypes: BlockType[]
  } {
    return {
      totalFactories: this.handlerFactories.size,
      initializedHandlers: this.handlers.size,
      supportedTypes: this.getSupportedBlockTypes(),
    }
  }
}
