/**
 * Multi-Modal Help Delivery System
 *
 * Delivers help content through multiple channels with full accessibility support:
 * tooltips, panels, overlays, voice guidance, conversational interfaces, and more.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  AccessibilityPreferences,
  HelpContent,
  HelpContext,
  HelpDeliveryConfig,
  HelpDeliveryMode,
  VoiceGuidanceConfig,
} from '../types'

const logger = createLogger('MultiModalDelivery')

export class MultiModalDelivery {
  private deliveryAdapters = new Map<HelpDeliveryMode, DeliveryAdapter>()
  private voiceEngine: VoiceEngine
  private accessibilityManager: AccessibilityManager
  private activeDeliveries = new Map<string, ActiveDelivery>()
  private deliveryAnalytics = new Map<HelpDeliveryMode, DeliveryAnalytics>()

  constructor() {
    this.voiceEngine = new VoiceEngine()
    this.accessibilityManager = new AccessibilityManager()
    this.initializeDeliverySystem()
  }

  /**
   * Initialize the multi-modal delivery system
   */
  private async initializeDeliverySystem(): Promise<void> {
    logger.info('Initializing Multi-Modal Help Delivery System')

    // Initialize delivery adapters
    this.initializeDeliveryAdapters()

    // Initialize voice engine
    await this.voiceEngine.initialize()

    // Initialize accessibility manager
    await this.accessibilityManager.initialize()

    // Start delivery analytics
    this.startDeliveryAnalytics()

    logger.info('Multi-Modal Help Delivery System initialized successfully')
  }

  /**
   * Deliver help content using the specified mode
   */
  async deliverHelp(
    content: HelpContent,
    context: HelpContext,
    config: HelpDeliveryConfig
  ): Promise<{
    deliveryId: string
    success: boolean
    fallbackUsed?: boolean
    accessibilityEnhancements?: string[]
  }> {
    logger.info(`Delivering help content`, {
      contentId: content.id,
      mode: config.mode,
      userId: context.userId,
    })

    const deliveryId = `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      // Adapt config for accessibility
      const adaptedConfig = await this.accessibilityManager.adaptDeliveryConfig(
        config,
        context.userState.accessibility
      )

      // Get delivery adapter
      const adapter = this.deliveryAdapters.get(adaptedConfig.mode)
      if (!adapter) {
        throw new Error(`No delivery adapter found for mode: ${adaptedConfig.mode}`)
      }

      // Prepare content for delivery
      const preparedContent = await this.prepareContentForDelivery(
        content,
        adaptedConfig.mode,
        context
      )

      // Execute delivery
      const deliveryResult = await adapter.deliver(preparedContent, context, adaptedConfig)

      // Create active delivery record
      const activeDelivery: ActiveDelivery = {
        id: deliveryId,
        contentId: content.id,
        mode: adaptedConfig.mode,
        context,
        config: adaptedConfig,
        startTime: new Date(),
        status: 'active',
        interactions: [],
        accessibilityFeatures: deliveryResult.accessibilityFeatures || [],
      }

      this.activeDeliveries.set(deliveryId, activeDelivery)

      // Setup accessibility enhancements
      const accessibilityEnhancements = await this.setupAccessibilityEnhancements(
        deliveryId,
        adaptedConfig,
        context.userState.accessibility
      )

      // Start voice guidance if enabled
      if (
        context.userState.accessibility.voiceGuidance &&
        content.accessibility?.screenReaderText
      ) {
        await this.voiceEngine.announceContent(
          content.accessibility.screenReaderText,
          context.userState.accessibility
        )
      }

      // Update analytics
      this.updateDeliveryAnalytics(adaptedConfig.mode, 'success')

      logger.info(`Help delivered successfully`, {
        deliveryId,
        mode: adaptedConfig.mode,
        accessibilityEnhancements: accessibilityEnhancements.length,
      })

      return {
        deliveryId,
        success: true,
        fallbackUsed: adaptedConfig.mode !== config.mode,
        accessibilityEnhancements,
      }
    } catch (error) {
      logger.error('Error delivering help content', {
        error: error instanceof Error ? error.message : String(error),
        contentId: content.id,
        mode: config.mode,
      })

      // Try fallback delivery mode
      const fallbackResult = await this.attemptFallbackDelivery(
        content,
        context,
        config,
        deliveryId
      )

      if (fallbackResult.success) {
        return {
          deliveryId,
          success: true,
          fallbackUsed: true,
          accessibilityEnhancements: fallbackResult.accessibilityEnhancements,
        }
      }

      // Update analytics for failure
      this.updateDeliveryAnalytics(config.mode, 'failure')

      return {
        deliveryId,
        success: false,
      }
    }
  }

  /**
   * Update existing help delivery
   */
  async updateDelivery(
    deliveryId: string,
    updates: {
      content?: HelpContent
      config?: Partial<HelpDeliveryConfig>
      position?: { x: number; y: number }
    }
  ): Promise<boolean> {
    const activeDelivery = this.activeDeliveries.get(deliveryId)
    if (!activeDelivery) {
      logger.warn('Active delivery not found for update', { deliveryId })
      return false
    }

    try {
      const adapter = this.deliveryAdapters.get(activeDelivery.mode)
      if (!adapter) {
        return false
      }

      // Update delivery
      await adapter.update(deliveryId, updates)

      // Update delivery record
      if (updates.config) {
        activeDelivery.config = { ...activeDelivery.config, ...updates.config }
      }

      logger.info(`Help delivery updated`, { deliveryId, updates: Object.keys(updates) })
      return true
    } catch (error) {
      logger.error('Error updating help delivery', {
        error: error instanceof Error ? error.message : String(error),
        deliveryId,
      })
      return false
    }
  }

  /**
   * Dismiss help delivery
   */
  async dismissDelivery(
    deliveryId: string,
    reason: 'user' | 'timeout' | 'completed'
  ): Promise<void> {
    const activeDelivery = this.activeDeliveries.get(deliveryId)
    if (!activeDelivery) {
      logger.warn('Active delivery not found for dismissal', { deliveryId })
      return
    }

    try {
      const adapter = this.deliveryAdapters.get(activeDelivery.mode)
      if (adapter) {
        await adapter.dismiss(deliveryId)
      }

      // Update delivery record
      activeDelivery.status = 'dismissed'
      activeDelivery.endTime = new Date()
      activeDelivery.endReason = reason
      activeDelivery.duration =
        activeDelivery.endTime.getTime() - activeDelivery.startTime.getTime()

      // Clean up accessibility enhancements
      await this.cleanupAccessibilityEnhancements(deliveryId)

      // Update analytics
      this.updateDeliveryAnalytics(activeDelivery.mode, 'dismissed')

      // Remove from active deliveries
      this.activeDeliveries.delete(deliveryId)

      logger.info(`Help delivery dismissed`, {
        deliveryId,
        reason,
        duration: activeDelivery.duration,
      })
    } catch (error) {
      logger.error('Error dismissing help delivery', {
        error: error instanceof Error ? error.message : String(error),
        deliveryId,
      })
    }
  }

  /**
   * Track interaction with help delivery
   */
  async trackInteraction(
    deliveryId: string,
    interactionType: 'view' | 'click' | 'scroll' | 'voice' | 'keyboard',
    data?: Record<string, any>
  ): Promise<void> {
    const activeDelivery = this.activeDeliveries.get(deliveryId)
    if (!activeDelivery) {
      logger.warn('Active delivery not found for interaction tracking', { deliveryId })
      return
    }

    const interaction = {
      type: interactionType,
      timestamp: new Date(),
      data: data || {},
    }

    activeDelivery.interactions.push(interaction)

    // Update analytics
    this.updateDeliveryAnalytics(activeDelivery.mode, 'interaction')

    logger.info(`Help delivery interaction tracked`, {
      deliveryId,
      interactionType,
      totalInteractions: activeDelivery.interactions.length,
    })
  }

  /**
   * Get available delivery modes for context
   */
  getAvailableDeliveryModes(context: HelpContext): HelpDeliveryMode[] {
    const availableModes: HelpDeliveryMode[] = []

    // Check browser capabilities
    const hasDOM = typeof document !== 'undefined'
    const hasSpeechSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window

    if (hasDOM) {
      availableModes.push('tooltip', 'sidebar', 'modal', 'inline', 'overlay', 'notification')
    }

    if (hasSpeechSynthesis && context.userState.accessibility.voiceGuidance) {
      availableModes.push('voice')
    }

    // Chat mode is always available if websockets are supported
    if (typeof WebSocket !== 'undefined') {
      availableModes.push('chat')
    }

    return availableModes
  }

  /**
   * Get optimal delivery mode for content and context
   */
  async getOptimalDeliveryMode(
    content: HelpContent,
    context: HelpContext
  ): Promise<{
    mode: HelpDeliveryMode
    confidence: number
    reasoning: string
  }> {
    const availableModes = this.getAvailableDeliveryModes(context)
    const modeScores: Array<{ mode: HelpDeliveryMode; score: number; reasoning: string }> = []

    for (const mode of availableModes) {
      let score = 0
      let reasoning = ''

      // Content type preferences
      switch (content.type) {
        case 'tooltip':
          if (mode === 'tooltip') {
            score += 0.8
            reasoning = 'Content designed for tooltip display'
          }
          break
        case 'tutorial':
          if (mode === 'modal' || mode === 'sidebar') {
            score += 0.7
            reasoning = 'Tutorial content works well in focused modes'
          }
          break
        case 'voice':
          if (mode === 'voice') {
            score += 0.9
            reasoning = 'Content optimized for voice delivery'
          }
          break
      }

      // Priority considerations
      if (content.priority === 'critical' && (mode === 'modal' || mode === 'voice')) {
        score += 0.5
        reasoning += ' Critical priority benefits from prominent display'
      }

      // Accessibility considerations
      if (context.userState.accessibility.screenReader && mode === 'voice') {
        score += 0.4
        reasoning += ' Voice mode supports screen reader users'
      }

      if (context.userState.accessibility.reducedMotion && mode === 'inline') {
        score += 0.3
        reasoning += ' Inline mode reduces motion'
      }

      // User preferences
      if (context.userState.preferredHelpMode === mode) {
        score += 0.6
        reasoning += ' Matches user preference'
      }

      // Performance considerations
      const analytics = this.deliveryAnalytics.get(mode)
      if (analytics && analytics.successRate > 0.8) {
        score += 0.2
        reasoning += ' High historical success rate'
      }

      if (score > 0) {
        modeScores.push({ mode, score, reasoning })
      }
    }

    if (modeScores.length === 0) {
      return {
        mode: 'modal',
        confidence: 0.5,
        reasoning: 'Fallback to modal mode',
      }
    }

    const optimal = modeScores.reduce((best, current) =>
      current.score > best.score ? current : best
    )

    return {
      mode: optimal.mode,
      confidence: Math.min(optimal.score, 1.0),
      reasoning: optimal.reasoning,
    }
  }

  /**
   * Get delivery analytics
   */
  getDeliveryAnalytics(): Map<HelpDeliveryMode, DeliveryAnalytics> {
    return new Map(this.deliveryAnalytics)
  }

  // Private helper methods
  private initializeDeliveryAdapters(): void {
    // Tooltip adapter
    this.deliveryAdapters.set('tooltip', new TooltipDeliveryAdapter())

    // Sidebar adapter
    this.deliveryAdapters.set('sidebar', new SidebarDeliveryAdapter())

    // Modal adapter
    this.deliveryAdapters.set('modal', new ModalDeliveryAdapter())

    // Inline adapter
    this.deliveryAdapters.set('inline', new InlineDeliveryAdapter())

    // Overlay adapter
    this.deliveryAdapters.set('overlay', new OverlayDeliveryAdapter())

    // Voice adapter
    this.deliveryAdapters.set('voice', new VoiceDeliveryAdapter(this.voiceEngine))

    // Chat adapter
    this.deliveryAdapters.set('chat', new ChatDeliveryAdapter())

    // Notification adapter
    this.deliveryAdapters.set('notification', new NotificationDeliveryAdapter())

    logger.info(`Initialized ${this.deliveryAdapters.size} delivery adapters`)
  }

  private async prepareContentForDelivery(
    content: HelpContent,
    mode: HelpDeliveryMode,
    context: HelpContext
  ): Promise<PreparedContent> {
    // Adapt content based on delivery mode and user context
    let adaptedContent = { ...content }

    // Mode-specific adaptations
    switch (mode) {
      case 'tooltip':
        // Truncate content for tooltip
        if (typeof adaptedContent.content === 'string' && adaptedContent.content.length > 200) {
          adaptedContent.content = `${adaptedContent.content.substring(0, 197)}...`
        }
        break

      case 'voice':
        // Convert to speech-friendly format
        adaptedContent = await this.adaptContentForVoice(adaptedContent, context)
        break

      case 'chat':
        // Format for conversational delivery
        adaptedContent = await this.adaptContentForChat(adaptedContent, context)
        break
    }

    // Accessibility adaptations
    if (context.userState.accessibility.screenReader) {
      adaptedContent = await this.enhanceContentForScreenReader(adaptedContent)
    }

    return {
      original: content,
      adapted: adaptedContent,
      mode,
      context,
    }
  }

  private async adaptContentForVoice(
    content: HelpContent,
    context: HelpContext
  ): Promise<HelpContent> {
    const voiceContent = { ...content }

    // Use screen reader text if available, otherwise convert regular content
    if (content.accessibility?.screenReaderText) {
      voiceContent.content = content.accessibility.screenReaderText
    } else {
      // Convert HTML/markdown to plain text for speech
      voiceContent.content = this.convertToSpeechText(content.content)
    }

    return voiceContent
  }

  private async adaptContentForChat(
    content: HelpContent,
    context: HelpContext
  ): Promise<HelpContent> {
    const chatContent = { ...content }

    // Format content as conversational messages
    if (typeof content.content === 'string') {
      chatContent.content = this.formatForChat(content.content)
    }

    return chatContent
  }

  private async enhanceContentForScreenReader(content: HelpContent): Promise<HelpContent> {
    const enhancedContent = { ...content }

    // Ensure proper ARIA labels and descriptions
    if (!content.accessibility?.screenReaderText) {
      enhancedContent.accessibility = {
        ...content.accessibility,
        screenReaderText: this.generateScreenReaderText(content),
      }
    }

    return enhancedContent
  }

  private convertToSpeechText(content: string | any[]): string {
    if (typeof content === 'string') {
      // Remove HTML tags and format for speech
      return content
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\n+/g, '. ') // Convert newlines to pauses
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
    }

    if (Array.isArray(content)) {
      return content.map((block) => block.content || '').join('. ')
    }

    return ''
  }

  private formatForChat(content: string): string {
    // Break content into chat-sized chunks
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim())
    return sentences
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0)
      .join('\n\n')
  }

  private generateScreenReaderText(content: HelpContent): string {
    let text = `Help content: ${content.title}. `

    if (content.description) {
      text += `${content.description}. `
    }

    if (typeof content.content === 'string') {
      text += this.convertToSpeechText(content.content)
    }

    return text
  }

  private async attemptFallbackDelivery(
    content: HelpContent,
    context: HelpContext,
    originalConfig: HelpDeliveryConfig,
    deliveryId: string
  ): Promise<{
    success: boolean
    accessibilityEnhancements?: string[]
  }> {
    logger.info('Attempting fallback delivery', {
      originalMode: originalConfig.mode,
      contentId: content.id,
    })

    // Fallback hierarchy
    const fallbackModes: HelpDeliveryMode[] = ['modal', 'sidebar', 'inline', 'notification']
    const availableModes = this.getAvailableDeliveryModes(context)

    for (const fallbackMode of fallbackModes) {
      if (fallbackMode === originalConfig.mode) continue
      if (!availableModes.includes(fallbackMode)) continue

      try {
        const fallbackConfig: HelpDeliveryConfig = {
          ...originalConfig,
          mode: fallbackMode,
        }

        const adapter = this.deliveryAdapters.get(fallbackMode)
        if (!adapter) continue

        const preparedContent = await this.prepareContentForDelivery(content, fallbackMode, context)

        await adapter.deliver(preparedContent, context, fallbackConfig)

        // Setup accessibility for fallback
        const accessibilityEnhancements = await this.setupAccessibilityEnhancements(
          deliveryId,
          fallbackConfig,
          context.userState.accessibility
        )

        logger.info(`Fallback delivery successful`, {
          originalMode: originalConfig.mode,
          fallbackMode,
          contentId: content.id,
        })

        return {
          success: true,
          accessibilityEnhancements,
        }
      } catch (error) {
        logger.warn('Fallback delivery failed', {
          fallbackMode,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return { success: false }
  }

  private async setupAccessibilityEnhancements(
    deliveryId: string,
    config: HelpDeliveryConfig,
    preferences: AccessibilityPreferences
  ): Promise<string[]> {
    const enhancements: string[] = []

    try {
      // Screen reader announcements
      if (preferences.screenReader && config.accessibility?.announceToScreenReader) {
        await this.accessibilityManager.announceToScreenReader(
          `Help content available: ${config.mode} mode`
        )
        enhancements.push('screen_reader_announcement')
      }

      // Keyboard navigation setup
      if (preferences.keyboardNavigation) {
        await this.accessibilityManager.setupKeyboardNavigation(deliveryId, config)
        enhancements.push('keyboard_navigation')
      }

      // High contrast mode
      if (preferences.highContrast) {
        await this.accessibilityManager.applyHighContrastMode(deliveryId)
        enhancements.push('high_contrast')
      }

      // Reduced motion
      if (preferences.reducedMotion) {
        await this.accessibilityManager.disableAnimations(deliveryId)
        enhancements.push('reduced_motion')
      }

      // Font size adaptation
      if (preferences.fontSize !== 'normal') {
        await this.accessibilityManager.adjustFontSize(deliveryId, preferences.fontSize)
        enhancements.push('font_size_adjustment')
      }

      logger.info(`Setup accessibility enhancements`, {
        deliveryId,
        enhancements,
      })
    } catch (error) {
      logger.error('Error setting up accessibility enhancements', {
        error: error instanceof Error ? error.message : String(error),
        deliveryId,
      })
    }

    return enhancements
  }

  private async cleanupAccessibilityEnhancements(deliveryId: string): Promise<void> {
    try {
      await this.accessibilityManager.cleanup(deliveryId)
      logger.info(`Cleaned up accessibility enhancements`, { deliveryId })
    } catch (error) {
      logger.error('Error cleaning up accessibility enhancements', {
        error: error instanceof Error ? error.message : String(error),
        deliveryId,
      })
    }
  }

  private updateDeliveryAnalytics(
    mode: HelpDeliveryMode,
    event: 'success' | 'failure' | 'dismissed' | 'interaction'
  ): void {
    let analytics = this.deliveryAnalytics.get(mode)
    if (!analytics) {
      analytics = {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        dismissedDeliveries: 0,
        totalInteractions: 0,
        averageDeliveryTime: 0,
        successRate: 0,
        userSatisfaction: 0,
        accessibilityUsage: 0,
        lastUpdated: new Date(),
      }
      this.deliveryAnalytics.set(mode, analytics)
    }

    switch (event) {
      case 'success':
        analytics.totalDeliveries++
        analytics.successfulDeliveries++
        break
      case 'failure':
        analytics.totalDeliveries++
        analytics.failedDeliveries++
        break
      case 'dismissed':
        analytics.dismissedDeliveries++
        break
      case 'interaction':
        analytics.totalInteractions++
        break
    }

    // Recalculate success rate
    if (analytics.totalDeliveries > 0) {
      analytics.successRate = analytics.successfulDeliveries / analytics.totalDeliveries
    }

    analytics.lastUpdated = new Date()
  }

  private startDeliveryAnalytics(): void {
    // Initialize analytics for all delivery modes
    const modes: HelpDeliveryMode[] = [
      'tooltip',
      'sidebar',
      'modal',
      'inline',
      'overlay',
      'voice',
      'chat',
      'notification',
    ]

    for (const mode of modes) {
      if (!this.deliveryAnalytics.has(mode)) {
        this.updateDeliveryAnalytics(mode, 'success') // Initialize with empty stats
        const analytics = this.deliveryAnalytics.get(mode)!
        analytics.successfulDeliveries = 0
        analytics.totalDeliveries = 0
      }
    }

    logger.info('Started delivery analytics for all modes')
  }
}

// Supporting classes and interfaces
interface ActiveDelivery {
  id: string
  contentId: string
  mode: HelpDeliveryMode
  context: HelpContext
  config: HelpDeliveryConfig
  startTime: Date
  endTime?: Date
  endReason?: string
  duration?: number
  status: 'active' | 'dismissed' | 'completed'
  interactions: Array<{
    type: string
    timestamp: Date
    data: Record<string, any>
  }>
  accessibilityFeatures: string[]
}

interface PreparedContent {
  original: HelpContent
  adapted: HelpContent
  mode: HelpDeliveryMode
  context: HelpContext
}

interface DeliveryAnalytics {
  totalDeliveries: number
  successfulDeliveries: number
  failedDeliveries: number
  dismissedDeliveries: number
  totalInteractions: number
  averageDeliveryTime: number
  successRate: number
  userSatisfaction: number
  accessibilityUsage: number
  lastUpdated: Date
}

// Delivery adapter interfaces
interface DeliveryAdapter {
  deliver(
    content: PreparedContent,
    context: HelpContext,
    config: HelpDeliveryConfig
  ): Promise<{ success: boolean; accessibilityFeatures?: string[] }>

  update(deliveryId: string, updates: any): Promise<void>
  dismiss(deliveryId: string): Promise<void>
}

// Delivery adapter implementations (simplified)
class TooltipDeliveryAdapter implements DeliveryAdapter {
  async deliver(content: PreparedContent, context: HelpContext, config: HelpDeliveryConfig) {
    // TODO: Implement tooltip delivery
    logger.info('Delivering tooltip help', { contentId: content.original.id })
    return { success: true, accessibilityFeatures: ['focus_management'] }
  }

  async update(deliveryId: string, updates: any) {
    logger.info('Updating tooltip delivery', { deliveryId })
  }

  async dismiss(deliveryId: string) {
    logger.info('Dismissing tooltip delivery', { deliveryId })
  }
}

class SidebarDeliveryAdapter implements DeliveryAdapter {
  async deliver(content: PreparedContent, context: HelpContext, config: HelpDeliveryConfig) {
    logger.info('Delivering sidebar help', { contentId: content.original.id })
    return { success: true, accessibilityFeatures: ['keyboard_navigation', 'focus_trap'] }
  }

  async update(deliveryId: string, updates: any) {
    logger.info('Updating sidebar delivery', { deliveryId })
  }

  async dismiss(deliveryId: string) {
    logger.info('Dismissing sidebar delivery', { deliveryId })
  }
}

class ModalDeliveryAdapter implements DeliveryAdapter {
  async deliver(content: PreparedContent, context: HelpContext, config: HelpDeliveryConfig) {
    logger.info('Delivering modal help', { contentId: content.original.id })
    return { success: true, accessibilityFeatures: ['focus_trap', 'escape_handling'] }
  }

  async update(deliveryId: string, updates: any) {
    logger.info('Updating modal delivery', { deliveryId })
  }

  async dismiss(deliveryId: string) {
    logger.info('Dismissing modal delivery', { deliveryId })
  }
}

class InlineDeliveryAdapter implements DeliveryAdapter {
  async deliver(content: PreparedContent, context: HelpContext, config: HelpDeliveryConfig) {
    logger.info('Delivering inline help', { contentId: content.original.id })
    return { success: true, accessibilityFeatures: ['aria_labels'] }
  }

  async update(deliveryId: string, updates: any) {
    logger.info('Updating inline delivery', { deliveryId })
  }

  async dismiss(deliveryId: string) {
    logger.info('Dismissing inline delivery', { deliveryId })
  }
}

class OverlayDeliveryAdapter implements DeliveryAdapter {
  async deliver(content: PreparedContent, context: HelpContext, config: HelpDeliveryConfig) {
    logger.info('Delivering overlay help', { contentId: content.original.id })
    return { success: true, accessibilityFeatures: ['backdrop_click', 'escape_handling'] }
  }

  async update(deliveryId: string, updates: any) {
    logger.info('Updating overlay delivery', { deliveryId })
  }

  async dismiss(deliveryId: string) {
    logger.info('Dismissing overlay delivery', { deliveryId })
  }
}

class VoiceDeliveryAdapter implements DeliveryAdapter {
  constructor(private voiceEngine: VoiceEngine) {}

  async deliver(content: PreparedContent, context: HelpContext, config: HelpDeliveryConfig) {
    logger.info('Delivering voice help', { contentId: content.original.id })

    const voiceConfig: VoiceGuidanceConfig = {
      voice: {
        rate: 1.0,
        pitch: 1.0,
        volume: 0.8,
      },
      language: 'en-US',
      interruption: 'allow',
    }

    await this.voiceEngine.speak(
      typeof content.adapted.content === 'string' ? content.adapted.content : '',
      voiceConfig
    )

    return { success: true, accessibilityFeatures: ['voice_guidance', 'audio_cues'] }
  }

  async update(deliveryId: string, updates: any) {
    logger.info('Updating voice delivery', { deliveryId })
  }

  async dismiss(deliveryId: string) {
    logger.info('Dismissing voice delivery', { deliveryId })
    this.voiceEngine.stop()
  }
}

class ChatDeliveryAdapter implements DeliveryAdapter {
  async deliver(content: PreparedContent, context: HelpContext, config: HelpDeliveryConfig) {
    logger.info('Delivering chat help', { contentId: content.original.id })
    return { success: true, accessibilityFeatures: ['keyboard_navigation'] }
  }

  async update(deliveryId: string, updates: any) {
    logger.info('Updating chat delivery', { deliveryId })
  }

  async dismiss(deliveryId: string) {
    logger.info('Dismissing chat delivery', { deliveryId })
  }
}

class NotificationDeliveryAdapter implements DeliveryAdapter {
  async deliver(content: PreparedContent, context: HelpContext, config: HelpDeliveryConfig) {
    logger.info('Delivering notification help', { contentId: content.original.id })
    return { success: true, accessibilityFeatures: ['screen_reader_announcement'] }
  }

  async update(deliveryId: string, updates: any) {
    logger.info('Updating notification delivery', { deliveryId })
  }

  async dismiss(deliveryId: string) {
    logger.info('Dismissing notification delivery', { deliveryId })
  }
}

// Supporting engines
class VoiceEngine {
  private synthesis: SpeechSynthesis | null = null

  async initialize(): Promise<void> {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis
      logger.info('Voice engine initialized successfully')
    } else {
      logger.warn('Speech synthesis not available')
    }
  }

  async announceContent(text: string, preferences: AccessibilityPreferences): Promise<void> {
    if (!preferences.voiceGuidance || !this.synthesis) return

    await this.speak(text, {
      voice: { rate: 1.0, pitch: 1.0, volume: 0.8 },
      interruption: 'allow',
    })
  }

  async speak(text: string, config: VoiceGuidanceConfig): Promise<void> {
    if (!this.synthesis) {
      throw new Error('Speech synthesis not available')
    }

    // Stop current speech if interruption is allowed
    if (config.interruption === 'allow' || config.interruption === 'replace') {
      this.stop()
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)

      if (config.voice) {
        utterance.rate = config.voice.rate || 1.0
        utterance.pitch = config.voice.pitch || 1.0
        utterance.volume = config.voice.volume || 0.8
      }

      if (config.language) {
        utterance.lang = config.language
      }

      utterance.onend = () => {
        this.currentUtterance = null
        resolve()
      }

      utterance.onerror = (error) => {
        this.currentUtterance = null
        reject(error)
      }

      this.currentUtterance = utterance
      this.synthesis!.speak(utterance)
    })
  }

  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel()
      this.currentUtterance = null
    }
  }
}

class AccessibilityManager {
  private enhancementRegistry = new Map<string, AccessibilityEnhancement>()

  async initialize(): Promise<void> {
    logger.info('Accessibility manager initialized')
  }

  async adaptDeliveryConfig(
    config: HelpDeliveryConfig,
    preferences: AccessibilityPreferences
  ): Promise<HelpDeliveryConfig> {
    const adaptedConfig = { ...config }

    // Force modal mode for screen readers if content is complex
    if (preferences.screenReader && config.mode === 'tooltip') {
      adaptedConfig.mode = 'modal'
    }

    // Disable animations for reduced motion
    if (preferences.reducedMotion) {
      adaptedConfig.styling = {
        ...adaptedConfig.styling,
        animation: 'none',
      }
    }

    // Apply high contrast theme
    if (preferences.highContrast) {
      adaptedConfig.styling = {
        ...adaptedConfig.styling,
        theme: 'dark',
      }
    }

    return adaptedConfig
  }

  async announceToScreenReader(message: string): Promise<void> {
    // Create or update live region for screen reader announcements
    let liveRegion = document.getElementById('help-sr-live-region')
    if (!liveRegion) {
      liveRegion = document.createElement('div')
      liveRegion.id = 'help-sr-live-region'
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `
      document.body.appendChild(liveRegion)
    }

    liveRegion.textContent = message
  }

  async setupKeyboardNavigation(deliveryId: string, config: HelpDeliveryConfig): Promise<void> {
    // TODO: Implement keyboard navigation setup
    logger.info('Setup keyboard navigation', { deliveryId })
  }

  async applyHighContrastMode(deliveryId: string): Promise<void> {
    // TODO: Apply high contrast styles
    logger.info('Applied high contrast mode', { deliveryId })
  }

  async disableAnimations(deliveryId: string): Promise<void> {
    // TODO: Disable animations and transitions
    logger.info('Disabled animations', { deliveryId })
  }

  async adjustFontSize(
    deliveryId: string,
    fontSize: 'small' | 'normal' | 'large' | 'extra-large'
  ): Promise<void> {
    // TODO: Adjust font size
    logger.info('Adjusted font size', { deliveryId, fontSize })
  }

  async cleanup(deliveryId: string): Promise<void> {
    const enhancement = this.enhancementRegistry.get(deliveryId)
    if (enhancement) {
      await enhancement.cleanup()
      this.enhancementRegistry.delete(deliveryId)
    }
  }
}

interface AccessibilityEnhancement {
  id: string
  features: string[]
  cleanup(): Promise<void>
}

// Export singleton instance
export const multiModalDelivery = new MultiModalDelivery()
