/**
 * Universal Tool Adapter System - Table Display Component
 *
 * Interactive table component with sorting, filtering, pagination,
 * and mobile-responsive design for optimal data exploration.
 */

'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Download, Filter, MoreHorizontal, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { TableContent } from '../../types'

interface TableDisplayProps {
  content: TableContent
  onAction?: (action: string, params?: any) => void
  compact?: boolean
  className?: string
}

type SortDirection = 'asc' | 'desc' | null

interface FilterState {
  column: string
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'gt' | 'lt'
  value: string
}

export function TableDisplay({ content, onAction, compact = false, className }: TableDisplayProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(content.pagination?.pageSize || 10)
  const [sortColumn, setSortColumn] = useState<string>(content.sorting?.column || '')
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    content.sorting?.direction === 'asc'
      ? 'asc'
      : content.sorting?.direction === 'desc'
        ? 'desc'
        : null
  )
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<FilterState[]>(content.filters || [])
  const [showFilters, setShowFilters] = useState(false)

  // Process and filter data
  const processedData = useMemo(() => {
    let filtered = [...content.rows]

    // Apply global filter
    if (globalFilter) {
      const searchTerm = globalFilter.toLowerCase()
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) => String(value).toLowerCase().includes(searchTerm))
      )
    }

    // Apply column filters
    columnFilters.forEach((filter) => {
      filtered = filtered.filter((row) => {
        const value = String(row[filter.column] || '').toLowerCase()
        const filterValue = filter.value.toLowerCase()

        switch (filter.operator) {
          case 'contains':
            return value.includes(filterValue)
          case 'equals':
            return value === filterValue
          case 'startsWith':
            return value.startsWith(filterValue)
          case 'endsWith':
            return value.endsWith(filterValue)
          case 'gt':
            return Number.parseFloat(value) > Number.parseFloat(filterValue)
          case 'lt':
            return Number.parseFloat(value) < Number.parseFloat(filterValue)
          default:
            return true
        }
      })
    })

    // Apply sorting
    if (sortColumn && sortDirection) {
      filtered.sort((a, b) => {
        const aValue = a[sortColumn]
        const bValue = b[sortColumn]

        let comparison = 0
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue
        } else {
          comparison = String(aValue).localeCompare(String(bValue))
        }

        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    return filtered
  }, [content.rows, globalFilter, columnFilters, sortColumn, sortDirection])

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedData = processedData.slice(startIndex, endIndex)

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      // Cycle through: asc -> desc -> none
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortColumn('')
        setSortDirection(null)
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }

    onAction?.('table_sorted', { column: columnKey, direction: sortDirection })
  }

  const handleColumnFilter = (column: string, operator: string, value: string) => {
    const newFilters = columnFilters.filter((f) => f.column !== column)
    if (value.trim()) {
      newFilters.push({ column, operator: operator as FilterState['operator'], value })
    }
    setColumnFilters(newFilters)
    setCurrentPage(1)

    onAction?.('table_filtered', { filters: newFilters })
  }

  const formatCellValue = (value: any, column: any) => {
    if (value === null || value === undefined) return '-'

    switch (column.type) {
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value)

      case 'boolean':
        return (
          <Badge variant={value ? 'default' : 'secondary'} className='text-xs'>
            {value ? 'Yes' : 'No'}
          </Badge>
        )

      case 'date':
        try {
          return new Date(value).toLocaleDateString()
        } catch {
          return String(value)
        }

      case 'url':
        return (
          <a
            href={String(value)}
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-600 hover:underline dark:text-blue-400'
            onClick={(e) => {
              e.stopPropagation()
              onAction?.('url_clicked', { url: value })
            }}
          >
            {String(value).length > 40 ? `${String(value).substring(0, 40)}...` : String(value)}
          </a>
        )

      case 'email':
        return (
          <a
            href={`mailto:${value}`}
            className='text-blue-600 hover:underline dark:text-blue-400'
            onClick={(e) => {
              e.stopPropagation()
              onAction?.('email_clicked', { email: value })
            }}
          >
            {String(value)}
          </a>
        )

      default: {
        const stringValue = String(value)
        return stringValue.length > 50 ? (
          <span title={stringValue}>{stringValue.substring(0, 50)}...</span>
        ) : (
          stringValue
        )
      }
    }
  }

  const exportData = () => {
    const csv = [
      content.columns.map((col) => col.label).join(','),
      ...processedData.map((row) =>
        content.columns
          .map((col) => {
            const value = row[col.key]
            // Escape CSV values
            const stringValue = String(value || '')
            return stringValue.includes(',') ? `"${stringValue.replace(/"/g, '""')}"` : stringValue
          })
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'table-data.csv'
    a.click()
    URL.revokeObjectURL(url)

    onAction?.('table_exported', { format: 'csv', rowCount: processedData.length })
  }

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Header */}
      <div className='flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
        <div>
          {content.title && (
            <h3 className='font-semibold text-gray-900 text-lg dark:text-gray-100'>
              {content.title}
            </h3>
          )}
          <p className='text-gray-600 text-sm dark:text-gray-400'>
            Showing {startIndex + 1}-{Math.min(endIndex, processedData.length)} of{' '}
            {processedData.length} rows
            {processedData.length !== content.rows.length &&
              ` (filtered from ${content.rows.length})`}
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <div className='relative'>
            <Search className='absolute top-2.5 left-2 h-4 w-4 text-gray-400' />
            <Input
              placeholder='Search all columns...'
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value)
                setCurrentPage(1)
              }}
              className='w-64 pl-8'
            />
          </div>

          <Button variant='outline' size='sm' onClick={() => setShowFilters(!showFilters)}>
            <Filter className='mr-1 h-4 w-4' />
            Filters
            {columnFilters.length > 0 && (
              <Badge variant='secondary' className='ml-1 text-xs'>
                {columnFilters.length}
              </Badge>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='sm'>
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={exportData}>
                <Download className='mr-2 h-4 w-4' />
                Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Column Filters */}
      {showFilters && (
        <Card className='border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm'>Column Filters</CardTitle>
          </CardHeader>
          <CardContent className='pt-0'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {content.columns
                .filter((col) => col.filterable)
                .map((column) => (
                  <div key={column.key} className='space-y-2'>
                    <label className='font-medium text-gray-700 text-xs dark:text-gray-300'>
                      {column.label}
                    </label>
                    <div className='flex gap-2'>
                      <Select
                        defaultValue='contains'
                        onValueChange={(operator) => {
                          const filter = columnFilters.find((f) => f.column === column.key)
                          if (filter) {
                            handleColumnFilter(column.key, operator, filter.value)
                          }
                        }}
                      >
                        <SelectTrigger className='w-24'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='contains'>Contains</SelectItem>
                          <SelectItem value='equals'>Equals</SelectItem>
                          <SelectItem value='startsWith'>Starts</SelectItem>
                          <SelectItem value='endsWith'>Ends</SelectItem>
                          {column.type === 'number' && (
                            <>
                              <SelectItem value='gt'>Greater</SelectItem>
                              <SelectItem value='lt'>Less</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder='Filter value...'
                        value={columnFilters.find((f) => f.column === column.key)?.value || ''}
                        onChange={(e) => {
                          handleColumnFilter(column.key, 'contains', e.target.value)
                        }}
                        className='flex-1'
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-gray-50 dark:bg-gray-800'>
              <tr>
                {content.columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      'px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400',
                      column.sortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                    style={{ width: column.width ? `${column.width}px` : undefined }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className='flex items-center gap-2'>
                      {column.label}
                      {column.sortable &&
                        sortColumn === column.key &&
                        (sortDirection === 'asc' ? (
                          <ChevronUp className='h-3 w-3' />
                        ) : sortDirection === 'desc' ? (
                          <ChevronDown className='h-3 w-3' />
                        ) : null)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900'>
              {paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className='transition-colors hover:bg-gray-50 dark:hover:bg-gray-800'
                  onClick={() => onAction?.('row_clicked', { row, index: startIndex + rowIndex })}
                >
                  {content.columns.map((column) => (
                    <td
                      key={column.key}
                      className='whitespace-nowrap px-4 py-3 text-gray-900 text-sm dark:text-gray-100'
                    >
                      {formatCellValue(row[column.key], column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {paginatedData.length === 0 && (
          <div className='py-8 text-center text-gray-500 dark:text-gray-400'>
            {processedData.length === 0 ? 'No data to display' : 'No results match your filters'}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='flex flex-col items-center justify-between gap-4 sm:flex-row'>
          <div className='flex items-center gap-2 text-gray-600 text-sm dark:text-gray-400'>
            <span>Rows per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className='w-20'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='10'>10</SelectItem>
                <SelectItem value='25'>25</SelectItem>
                <SelectItem value='50'>50</SelectItem>
                <SelectItem value='100'>100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </Button>

            <div className='flex items-center gap-1'>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setCurrentPage(pageNum)}
                    className='h-8 w-10'
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Button
              variant='outline'
              size='sm'
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Description */}
      {content.description && (
        <p className='text-gray-600 text-sm dark:text-gray-400'>{content.description}</p>
      )}
    </div>
  )
}
