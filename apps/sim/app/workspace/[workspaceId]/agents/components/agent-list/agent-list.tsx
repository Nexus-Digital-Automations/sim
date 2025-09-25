/**
 * Agent List Component
 *
 * Displays a list of agents in the workspace with filtering, sorting,
 * and quick actions. Integrates with the Parlant agent service.
 */

'use client'

import { useState } from 'react'
import { Filter, Grid3X3, List, Search } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import type { AgentListQuery } from '@/services/parlant/types'
import { useAgents } from '../../hooks/use-agents'
import { AgentCard } from './agent-card'
import { AgentFilters } from './agent-filters'
import { AgentListSkeleton } from './agent-list-skeleton'

interface AgentListProps {
  workspaceId: string
  variant?: 'grid' | 'list'
  compact?: boolean
}

export function AgentList({ workspaceId, variant = 'grid', compact = false }: AgentListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(variant)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Partial<AgentListQuery>>({})

  const {
    data: agentsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useAgents(workspaceId, {
    search: searchQuery,
    ...filters,
  })

  const agents = agentsResponse?.data || []
  const pagination = agentsResponse?.pagination

  if (isError) {
    return (
      <Alert variant='destructive'>
        <AlertDescription>
          Failed to load agents: {(error as Error)?.message}
          <Button variant='outline' size='sm' onClick={() => refetch()} className='ml-2'>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return <AgentListSkeleton />
  }

  if (agents.length === 0 && !searchQuery && !Object.keys(filters).length) {
    return (
      <EmptyState
        icon={<div className='text-4xl'>🤖</div>}
        title='No agents yet'
        description='Create your first AI agent to get started with automation'
        action={
          <Link href={`/workspace/${workspaceId}/agents/new`}>
            <Button>Create Agent</Button>
          </Link>
        }
      />
    )
  }

  const hasActiveFilters = searchQuery || Object.keys(filters).length > 0

  return (
    <div className='space-y-6'>
      {/* Search and Controls */}
      <div className='flex flex-col gap-4 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground' />
          <Input
            placeholder='Search agents...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-10'
          />
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setShowFilters(!showFilters)}
            className='flex items-center gap-2'
          >
            <Filter className='h-4 w-4' />
            Filters
            {hasActiveFilters && (
              <Badge variant='secondary' className='ml-1'>
                {(searchQuery ? 1 : 0) + Object.keys(filters).length}
              </Badge>
            )}
          </Button>

          {!compact && (
            <div className='flex items-center rounded-md border'>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size='sm'
                onClick={() => setViewMode('grid')}
                className='rounded-r-none'
              >
                <Grid3X3 className='h-4 w-4' />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size='sm'
                onClick={() => setViewMode('list')}
                className='rounded-l-none'
              >
                <List className='h-4 w-4' />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <AgentFilters
          filters={filters}
          onFiltersChange={setFilters}
          onReset={() => {
            setFilters({})
            setSearchQuery('')
          }}
        />
      )}

      {/* Results Info */}
      {(hasActiveFilters || pagination) && (
        <div className='flex items-center justify-between text-muted-foreground text-sm'>
          <div>
            {hasActiveFilters ? (
              <>
                Found {agents.length} agent{agents.length !== 1 ? 's' : ''}
                {searchQuery && ` matching "${searchQuery}"`}
              </>
            ) : (
              <>
                Showing {agents.length} of {pagination?.total || 0} agents
              </>
            )}
          </div>

          {hasActiveFilters && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => {
                setFilters({})
                setSearchQuery('')
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Agent Grid/List */}
      {agents.length === 0 ? (
        <EmptyState
          icon={<Search className='h-8 w-8 text-muted-foreground' />}
          title='No agents found'
          description='Try adjusting your search or filters'
          action={
            <Button
              variant='outline'
              onClick={() => {
                setFilters({})
                setSearchQuery('')
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'
              : 'space-y-3'
          }
        >
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              workspaceId={workspaceId}
              variant={viewMode}
              onUpdate={() => refetch()}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className='flex items-center justify-center space-x-2 pt-4'>
          <Button
            variant='outline'
            size='sm'
            disabled={!pagination.hasPrevious}
            onClick={() => {
              // TODO: Implement pagination
            }}
          >
            Previous
          </Button>

          <span className='text-muted-foreground text-sm'>
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <Button
            variant='outline'
            size='sm'
            disabled={!pagination.hasNext}
            onClick={() => {
              // TODO: Implement pagination
            }}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
