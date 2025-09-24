/**
 * Communication Adapters
 */

import { createCustomToolAdapter } from '../factory'
import type { ToolAdapter } from '../types'

export class CommunicationAdapters {
  createAdapters(): ToolAdapter[] {
    return [
      createCustomToolAdapter(
        'notification_sender',
        'Send notifications through various channels',
        'Send email, SMS, or push notifications to users.',
        { type: 'object', properties: { channel: { type: 'string' }, message: { type: 'string' } } },
        async () => ({ success: true, data: {} }),
        { category: 'communication' }
      ),
    ]
  }
}