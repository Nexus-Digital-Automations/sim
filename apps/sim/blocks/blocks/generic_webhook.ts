import { webhookIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'

export const GenericWebhookBlock: BlockConfig = {
  type: 'generic_webhook',
  Name: 'Webhook',
  description: 'Receive webhooks from any service by configuring a custom webhook.',
  category: 'triggers',
  icon: webhookIcon,
  bgColor: '#10B981', // Green color for triggers

  subBlocks: [
    // Generic webhook configuration - always visible
    {
      id: 'triggerConfig',
      title: 'Webhook Configuration',
      type: 'trigger-config',
      layout: 'full',
      triggerProvider: 'generic',
      availableTriggers: ['generic_webhook'],
    },
  ],

  tools: {
    access: [], // No external tools needed for triggers
  },

  inputs: {}, // No inputs - webhook triggers receive data externally

  outputs: {},

  triggers: {
    enabled: true,
    available: ['generic_webhook'],
  },
}
