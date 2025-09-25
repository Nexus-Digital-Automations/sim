/**
 * Agent Filters Component
 *
 * Provides filtering controls for the agent list including status,
 * creation date, and other agent properties.
 */

'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AgentListQuery } from '@/services/parlant/types'

interface AgentFiltersProps {
  filters: Partial<AgentListQuery>
  onFiltersChange: (filters: Partial<AgentListQuery>) => void
  onReset: () => void
}

export function AgentFilters({ filters, onFiltersChange, onReset }: AgentFiltersProps) {
  const updateFilter = (key: keyof AgentListQuery, value: any) => {
    if (value === 'all' || value === '') {
      const newFilters = { ...filters }
      delete newFilters[key]
      onFiltersChange(newFilters)
    } else {
      onFiltersChange({
        ...filters,
        [key]: value,
      })
    }
  }

  const activeFiltersCount = Object.keys(filters).length

  return (
    <Card>
      <CardContent className='p-4'>
        <div className='mb-4 flex items-center justify-between'>
          <h3 className='font-semibold text-sm'>Filters</h3>
          {activeFiltersCount > 0 && (
            <div className='flex items-center gap-2'>
              <Badge variant='secondary'>{activeFiltersCount} active</Badge>
              <Button variant='ghost' size='sm' onClick={onReset} className='h-6 text-xs'>
                <X className='mr-1 h-3 w-3' />
                Clear all
              </Button>
            </div>
          )}
        </div>

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {/* Status Filter */}
          <div className='space-y-2'>
            <Label htmlFor='status-filter' className='font-medium text-xs'>
              Status
            </Label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => updateFilter('status', value)}
            >
              <SelectTrigger id='status-filter' className='h-8'>
                <SelectValue placeholder='Any status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Any status</SelectItem>
                <SelectItem value='active'>
                  <div className='flex items-center gap-2'>
                    <div className='h-2 w-2 rounded-full bg-green-500' />
                    Active
                  </div>
                </SelectItem>
                <SelectItem value='inactive'>
                  <div className='flex items-center gap-2'>
                    <div className='h-2 w-2 rounded-full bg-gray-500' />
                    Inactive
                  </div>
                </SelectItem>
                <SelectItem value='training'>
                  <div className='flex items-center gap-2'>
                    <div className='h-2 w-2 rounded-full bg-yellow-500' />
                    Training
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div className='space-y-2'>
            <Label htmlFor='sort-filter' className='font-medium text-xs'>
              Sort by
            </Label>
            <Select
              value={filters.sort_by || 'updated_at'}
              onValueChange={(value) => updateFilter('sort_by', value)}
            >
              <SelectTrigger id='sort-filter' className='h-8'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='updated_at'>Recently updated</SelectItem>
                <SelectItem value='created_at'>Recently created</SelectItem>
                <SelectItem value='name'>Name (A-Z)</SelectItem>
                <SelectItem value='status'>Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Order */}
          <div className='space-y-2'>
            <Label htmlFor='order-filter' className='font-medium text-xs'>
              Order
            </Label>
            <Select
              value={filters.sort_order || 'desc'}
              onValueChange={(value) => updateFilter('sort_order', value)}
            >
              <SelectTrigger id='order-filter' className='h-8'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='desc'>Descending</SelectItem>
                <SelectItem value='asc'>Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Created By Filter (if applicable) */}
          <div className='space-y-2'>
            <Label htmlFor='created-by-filter' className='font-medium text-xs'>
              Created by
            </Label>
            <Select
              value={filters.created_by || 'all'}
              onValueChange={(value) => updateFilter('created_by', value)}
            >
              <SelectTrigger id='created-by-filter' className='h-8'>
                <SelectValue placeholder='Anyone' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Anyone</SelectItem>
                <SelectItem value='me'>Me</SelectItem>
                <SelectItem value='others'>Others</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className='mt-4 flex flex-wrap gap-2 border-t pt-4'>
            {filters.status && (
              <Badge variant='outline' className='text-xs'>
                Status: {filters.status}
                <Button
                  variant='ghost'
                  size='sm'
                  className='ml-1 h-auto p-0'
                  onClick={() => updateFilter('status', null)}
                >
                  <X className='h-3 w-3' />
                </Button>
              </Badge>
            )}

            {filters.created_by && filters.created_by !== 'all' && (
              <Badge variant='outline' className='text-xs'>
                Created by: {filters.created_by}
                <Button
                  variant='ghost'
                  size='sm'
                  className='ml-1 h-auto p-0'
                  onClick={() => updateFilter('created_by', null)}
                >
                  <X className='h-3 w-3' />
                </Button>
              </Badge>
            )}

            {filters.sort_by && filters.sort_by !== 'updated_at' && (
              <Badge variant='outline' className='text-xs'>
                Sort: {filters.sort_by}
                <Button
                  variant='ghost'
                  size='sm'
                  className='ml-1 h-auto p-0'
                  onClick={() => updateFilter('sort_by', null)}
                >
                  <X className='h-3 w-3' />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
