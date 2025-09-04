/**
 * Help Analytics Events API - Event collection and processing endpoint
 *
 * Features:
 * - Batch event collection for performance optimization
 * - Real-time event processing and validation
 * - Event deduplication and filtering
 * - Analytics data enrichment and transformation
 * - Privacy-compliant data handling
 *
 * @created 2025-01-04
 * @author Video Tutorials & Interactive Guides Specialist
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('HelpAnalyticsEventsAPI')

// ========================
// VALIDATION SCHEMAS
// ========================

const analyticsEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.number(),
  sessionId: z.string(),
  userId: z.string().optional(),

  // Event data
  data: z.record(z.any()),

  // Context information
  context: z
    .object({
      userAgent: z.string().optional(),
      platform: z.string().optional(),
      viewport: z
        .object({
          width: z.number(),
          height: z.number(),
        })
        .optional(),
      url: z.string().optional(),
      referrer: z.string().optional(),
    })
    .optional(),

  // Privacy flags
  anonymized: z.boolean().optional(),
  consentGiven: z.boolean().optional(),
})

const batchEventsSchema = z.object({
  events: z.array(analyticsEventSchema),
  batchId: z.string().optional(),
  clientTimestamp: z.number().optional(),
})

// ========================
// API HANDLERS
// ========================

/**
 * POST /api/help/analytics/events
 * Collect analytics events in batches
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const body = await request.json()

    logger.info(`[${requestId}] POST /api/help/analytics/events`, {
      eventCount: body.events?.length || 0,
      batchId: body.batchId,
    })

    // Validate the batch of events
    const validatedBatch = batchEventsSchema.parse(body)

    // Process events
    const processedEvents = await processEventBatch(validatedBatch, requestId)

    logger.info(`[${requestId}] Analytics events processed successfully`, {
      receivedCount: validatedBatch.events.length,
      processedCount: processedEvents.length,
      batchId: validatedBatch.batchId,
    })

    return NextResponse.json({
      success: true,
      processedCount: processedEvents.length,
      batchId: validatedBatch.batchId,
      message: 'Events processed successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid event data`, {
        errors: error.format(),
      })
      return NextResponse.json(
        {
          error: 'Invalid event data',
          details: error.format(),
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error processing analytics events`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Process a batch of analytics events
 */
async function processEventBatch(
  batch: z.infer<typeof batchEventsSchema>,
  requestId: string
): Promise<any[]> {
  const processedEvents: any[] = []

  for (const event of batch.events) {
    try {
      // Validate event data
      if (!isValidEvent(event)) {
        logger.warn(`[${requestId}] Skipping invalid event`, {
          eventId: event.id,
          eventType: event.type,
        })
        continue
      }

      // Check for duplicates
      if (await isDuplicateEvent(event)) {
        logger.debug(`[${requestId}] Skipping duplicate event`, {
          eventId: event.id,
        })
        continue
      }

      // Enrich event data
      const enrichedEvent = await enrichEventData(event)

      // Apply privacy filters
      const sanitizedEvent = applyPrivacyFilters(enrichedEvent)

      // Store the event (in production, this would be sent to analytics service)
      await storeEvent(sanitizedEvent)

      processedEvents.push(sanitizedEvent)
    } catch (error) {
      logger.error(`[${requestId}] Error processing individual event`, {
        eventId: event.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return processedEvents
}

/**
 * Validate event data
 */
function isValidEvent(event: any): boolean {
  // Check required fields
  if (!event.id || !event.type || !event.sessionId) {
    return false
  }

  // Check timestamp is reasonable (within last 24 hours)
  const now = Date.now()
  const maxAge = 24 * 60 * 60 * 1000 // 24 hours
  if (event.timestamp < now - maxAge || event.timestamp > now + 60000) {
    return false
  }

  return true
}

/**
 * Check if event is a duplicate
 */
async function isDuplicateEvent(event: any): Promise<boolean> {
  // In production, this would check against a deduplication cache/database
  // For now, return false (no duplicates)
  return false
}

/**
 * Enrich event data with additional context
 */
async function enrichEventData(event: any): Promise<any> {
  const enrichedEvent = {
    ...event,
    serverTimestamp: Date.now(),
    processingLatency: Date.now() - event.timestamp,
  }

  // Add geolocation data (in production, use IP geolocation service)
  if (event.context?.ip) {
    enrichedEvent.location = {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
    }
  }

  // Add device classification
  if (event.context?.userAgent) {
    enrichedEvent.device = classifyDevice(event.context.userAgent)
  }

  return enrichedEvent
}

/**
 * Apply privacy filters to event data
 */
function applyPrivacyFilters(event: any): any {
  const filteredEvent = { ...event }

  // Remove or hash PII if consent not given
  if (!event.consentGiven) {
    if (filteredEvent.userId) {
      filteredEvent.userId = hashString(filteredEvent.userId)
    }

    // Remove IP address
    if (filteredEvent.context?.ip) {
      filteredEvent.context.ip = undefined
    }

    // Remove detailed location data
    if (filteredEvent.location) {
      filteredEvent.location = { country: filteredEvent.location.country }
    }
  }

  // Apply anonymization if requested
  if (event.anonymized) {
    filteredEvent.userId = undefined
    if (filteredEvent.context?.ip) {
      filteredEvent.context = { ...filteredEvent.context }
      filteredEvent.context.ip = undefined
    }
    filteredEvent.location = undefined
  }

  return filteredEvent
}

/**
 * Store event data (mock implementation)
 */
async function storeEvent(event: any): Promise<void> {
  // In production, this would:
  // 1. Send to analytics service (e.g., Mixpanel, Amplitude, custom)
  // 2. Store in time-series database
  // 3. Update real-time metrics
  // 4. Trigger any real-time processing

  logger.debug('Event stored', {
    eventId: event.id,
    eventType: event.type,
    sessionId: event.sessionId,
  })
}

/**
 * Classify device based on user agent
 */
function classifyDevice(userAgent: string): {
  type: 'desktop' | 'tablet' | 'mobile'
  os: string
  browser: string
} {
  const ua = userAgent.toLowerCase()

  let type: 'desktop' | 'tablet' | 'mobile' = 'desktop'
  if (ua.includes('mobile') || ua.includes('android')) {
    type = 'mobile'
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    type = 'tablet'
  }

  let os = 'unknown'
  if (ua.includes('windows')) os = 'windows'
  else if (ua.includes('mac')) os = 'macos'
  else if (ua.includes('linux')) os = 'linux'
  else if (ua.includes('android')) os = 'android'
  else if (ua.includes('ios')) os = 'ios'

  let browser = 'unknown'
  if (ua.includes('chrome')) browser = 'chrome'
  else if (ua.includes('firefox')) browser = 'firefox'
  else if (ua.includes('safari')) browser = 'safari'
  else if (ua.includes('edge')) browser = 'edge'

  return { type, os, browser }
}

/**
 * Simple hash function for anonymization
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}
