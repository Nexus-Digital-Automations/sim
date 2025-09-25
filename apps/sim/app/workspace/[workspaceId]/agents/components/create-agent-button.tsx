/**
 * Create Agent Button Component
 *
 * Quick action button for creating new agents with optional template selection.
 */

'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface CreateAgentButtonProps {
  workspaceId: string
  variant?: 'button' | 'link'
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export function CreateAgentButton({
  workspaceId,
  variant = 'button',
  size = 'default',
  className,
}: CreateAgentButtonProps) {
  if (variant === 'link') {
    return (
      <Link
        href={`/workspace/${workspaceId}/agents/new`}
        className={`flex items-center font-medium text-primary text-sm transition-colors hover:text-primary/90 ${className}`}
      >
        <Plus className='mr-2 h-4 w-4' />
        Create Agent
      </Link>
    )
  }

  return (
    <Link href={`/workspace/${workspaceId}/agents/new`}>
      <Button size={size} className={className}>
        <Plus className='mr-2 h-4 w-4' />
        Create Agent
      </Button>
    </Link>
  )
}
