'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Search, SlidersHorizontal, Star, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { Agent } from '@/apps/sim/services/parlant/types'

interface AgentSearchProps {
  agents: Agent[]
  onFilter: (filteredAgents: Agent[]) => void
  onSearch: (searchTerm: string) => void
  className?: string
}

interface FilterState {
  searchTerm: string
  status: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  hasGuidelines: boolean | null
  hasJourneys: boolean | null
  minRating: number
  categories: string[]
  dateRange: string
}

const defaultFilters: FilterState = {
  searchTerm: '',
  status: 'all',
  sortBy: 'name',
  sortOrder: 'asc',
  hasGuidelines: null,
  hasJourneys: null,
  minRating: 0,
  categories: [],
  dateRange: 'all',
}

/**
 * AgentSearch Component
 *
 * Provides comprehensive search and filtering capabilities for agents.
 * Includes text search, status filtering, sorting, and advanced filters.
 */
export function AgentSearch({ agents, onFilter, onSearch, className = '' }: AgentSearchProps) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  // Debounced search
  const debouncedSearch = useCallback(
    (term: string) => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer)
      }

      const timer = setTimeout(() => {
        onSearch(term)
      }, 300)

      setSearchDebounceTimer(timer)
    },
    [onSearch, searchDebounceTimer]
  )

  // Update search term and trigger debounced search
  const handleSearchChange = (term: string) => {
    setFilters((prev) => ({ ...prev, searchTerm: term }))
    debouncedSearch(term)
  }

  // Filter and sort agents
  const filteredAgents = useMemo(() => {
    let filtered = [...agents]

    // Text search
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(
        (agent) =>
          agent.name.toLowerCase().includes(searchLower) ||
          agent.description?.toLowerCase().includes(searchLower)
      )
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((agent) => agent.status === filters.status)
    }

    // Guidelines filter
    if (filters.hasGuidelines !== null) {
      filtered = filtered.filter((agent) => {
        const hasGuidelines = agent.guidelines && agent.guidelines.length > 0
        return filters.hasGuidelines ? hasGuidelines : !hasGuidelines
      })
    }

    // Journeys filter
    if (filters.hasJourneys !== null) {
      filtered = filtered.filter((agent) => {
        const hasJourneys = agent.journeys && agent.journeys.length > 0
        return filters.hasJourneys ? hasJourneys : !hasJourneys
      })
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date()
      const cutoffDate = new Date()

      switch (filters.dateRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          cutoffDate.setDate(now.getDate() - 7)
          break
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1)
          break
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1)
          break
      }

      filtered = filtered.filter((agent) => {
        const updatedAt = new Date(agent.updated_at)
        return updatedAt >= cutoffDate
      })
    }

    // Sort agents
    filtered.sort((a, b) => {
      let comparison = 0

      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'updated':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
          break
        case 'guidelines':
          comparison = (a.guidelines?.length || 0) - (b.guidelines?.length || 0)
          break
        case 'journeys':
          comparison = (a.journeys?.length || 0) - (b.journeys?.length || 0)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        default:
          comparison = 0
      }

      return filters.sortOrder === 'desc' ? -comparison : comparison
    })

    return filtered
  }, [agents, filters])

  // Update filtered results when filters change
  useEffect(() => {
    onFilter(filteredAgents)
  }, [filteredAgents, onFilter])

  // Clear all filters
  const clearFilters = () => {
    setFilters(defaultFilters)
    onSearch('')
  }

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchTerm !== '' ||
      filters.status !== 'all' ||
      filters.sortBy !== 'name' ||
      filters.sortOrder !== 'asc' ||
      filters.hasGuidelines !== null ||
      filters.hasJourneys !== null ||
      filters.minRating > 0 ||
      filters.categories.length > 0 ||
      filters.dateRange !== 'all'
    )
  }, [filters])

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.searchTerm !== '') count++
    if (filters.status !== 'all') count++
    if (filters.hasGuidelines !== null) count++
    if (filters.hasJourneys !== null) count++
    if (filters.minRating > 0) count++
    if (filters.categories.length > 0) count++
    if (filters.dateRange !== 'all') count++
    return count
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search Bar */}
      <div className='flex items-center space-x-2'>
        <div className='relative flex-1'>
          <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground' />
          <Input
            placeholder='Search agents by name or description...'
            value={filters.searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className='pl-10'
          />
          {filters.searchTerm && (
            <Button
              variant='ghost'
              size='sm'
              className='-translate-y-1/2 absolute top-1/2 right-1 h-6 w-6 transform p-0'
              onClick={() => handleSearchChange('')}
            >
              <X className='h-3 w-3' />
            </Button>
          )}
        </div>

        {/* Quick Filters */}
        <div className='flex items-center space-x-2'>
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
          >
            <SelectTrigger className='w-32'>
              <SelectValue placeholder='Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Status</SelectItem>
              <SelectItem value='active'>
                <div className='flex items-center space-x-2'>
                  <div className='h-2 w-2 rounded-full bg-green-500' />
                  <span>Active</span>
                </div>
              </SelectItem>
              <SelectItem value='training'>
                <div className='flex items-center space-x-2'>
                  <div className='h-2 w-2 rounded-full bg-yellow-500' />
                  <span>Training</span>
                </div>
              </SelectItem>
              <SelectItem value='inactive'>
                <div className='flex items-center space-x-2'>
                  <div className='h-2 w-2 rounded-full bg-gray-500' />
                  <span>Inactive</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onValueChange={(value) => {
              const [sortBy, sortOrder] = value.split('-') as [string, 'asc' | 'desc']
              setFilters((prev) => ({ ...prev, sortBy, sortOrder }))
            }}
          >
            <SelectTrigger className='w-40'>
              <SelectValue placeholder='Sort by' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='name-asc'>Name A-Z</SelectItem>
              <SelectItem value='name-desc'>Name Z-A</SelectItem>
              <SelectItem value='created-desc'>Newest First</SelectItem>
              <SelectItem value='created-asc'>Oldest First</SelectItem>
              <SelectItem value='updated-desc'>Recently Updated</SelectItem>
              <SelectItem value='guidelines-desc'>Most Guidelines</SelectItem>
              <SelectItem value='journeys-desc'>Most Journeys</SelectItem>
            </SelectContent>
          </Select>

          {/* Advanced Filters Toggle */}
          <Button
            variant='outline'
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className='relative'
          >
            <SlidersHorizontal className='mr-2 h-4 w-4' />
            Filters
            {hasActiveFilters && (
              <Badge variant='secondary' className='ml-2 h-5 w-5 p-0 text-xs'>
                {getActiveFilterCount()}
              </Badge>
            )}
            <ChevronDown
              className={`ml-2 h-3 w-3 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`}
            />
          </Button>
        </div>
      </div>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <div className='flex flex-wrap items-center space-x-2'>
          <span className='text-muted-foreground text-sm'>Active filters:</span>

          {filters.searchTerm && (
            <Badge
              variant='secondary'
              className='cursor-pointer'
              onClick={() => handleSearchChange('')}
            >
              Search: "{filters.searchTerm}"
              <X className='ml-1 h-3 w-3' />
            </Badge>
          )}

          {filters.status !== 'all' && (
            <Badge
              variant='secondary'
              className='cursor-pointer'
              onClick={() => setFilters((prev) => ({ ...prev, status: 'all' }))}
            >
              Status: {filters.status}
              <X className='ml-1 h-3 w-3' />
            </Badge>
          )}

          {filters.hasGuidelines !== null && (
            <Badge
              variant='secondary'
              className='cursor-pointer'
              onClick={() => setFilters((prev) => ({ ...prev, hasGuidelines: null }))}
            >
              {filters.hasGuidelines ? 'Has Guidelines' : 'No Guidelines'}
              <X className='ml-1 h-3 w-3' />
            </Badge>
          )}

          {filters.hasJourneys !== null && (
            <Badge
              variant='secondary'
              className='cursor-pointer'
              onClick={() => setFilters((prev) => ({ ...prev, hasJourneys: null }))}
            >
              {filters.hasJourneys ? 'Has Journeys' : 'No Journeys'}
              <X className='ml-1 h-3 w-3' />
            </Badge>
          )}

          <Button
            variant='ghost'
            size='sm'
            onClick={clearFilters}
            className='text-muted-foreground hover:text-foreground'
          >
            Clear all
            <X className='ml-1 h-3 w-3' />
          </Button>
        </div>
      )}

      {/* Advanced Filters */}
      <Collapsible open={isAdvancedOpen}>
        <CollapsibleContent className='space-y-4'>
          <Separator />

          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            {/* Capability Filters */}
            <div className='space-y-3'>
              <Label className='font-medium text-sm'>Capabilities</Label>

              <div className='space-y-2'>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='has-guidelines'
                    checked={filters.hasGuidelines === true}
                    onCheckedChange={(checked) =>
                      setFilters((prev) => ({
                        ...prev,
                        hasGuidelines: checked
                          ? true
                          : filters.hasGuidelines === true
                            ? null
                            : false,
                      }))
                    }
                  />
                  <Label htmlFor='has-guidelines' className='cursor-pointer text-sm'>
                    Has Guidelines
                  </Label>
                </div>

                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='has-journeys'
                    checked={filters.hasJourneys === true}
                    onCheckedChange={(checked) =>
                      setFilters((prev) => ({
                        ...prev,
                        hasJourneys: checked ? true : filters.hasJourneys === true ? null : false,
                      }))
                    }
                  />
                  <Label htmlFor='has-journeys' className='cursor-pointer text-sm'>
                    Has Journeys
                  </Label>
                </div>
              </div>
            </div>

            {/* Rating Filter */}
            <div className='space-y-3'>
              <Label className='font-medium text-sm'>Minimum Rating</Label>
              <Select
                value={filters.minRating.toString()}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, minRating: Number.parseInt(value, 10) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='0'>Any Rating</SelectItem>
                  <SelectItem value='1'>
                    <div className='flex items-center space-x-1'>
                      <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                      <span>1+ stars</span>
                    </div>
                  </SelectItem>
                  <SelectItem value='2'>
                    <div className='flex items-center space-x-1'>
                      <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                      <span>2+ stars</span>
                    </div>
                  </SelectItem>
                  <SelectItem value='3'>
                    <div className='flex items-center space-x-1'>
                      <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                      <span>3+ stars</span>
                    </div>
                  </SelectItem>
                  <SelectItem value='4'>
                    <div className='flex items-center space-x-1'>
                      <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                      <span>4+ stars</span>
                    </div>
                  </SelectItem>
                  <SelectItem value='5'>
                    <div className='flex items-center space-x-1'>
                      <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                      <span>5 stars</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className='space-y-3'>
              <Label className='font-medium text-sm'>Last Updated</Label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, dateRange: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Any Time</SelectItem>
                  <SelectItem value='today'>Today</SelectItem>
                  <SelectItem value='week'>This Week</SelectItem>
                  <SelectItem value='month'>This Month</SelectItem>
                  <SelectItem value='year'>This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='flex justify-end'>
            <Button variant='outline' onClick={clearFilters} className='text-sm'>
              Reset All Filters
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Results Summary */}
      <div className='text-muted-foreground text-sm'>
        Showing {filteredAgents.length} of {agents.length} agents
      </div>
    </div>
  )
}

export default AgentSearch
