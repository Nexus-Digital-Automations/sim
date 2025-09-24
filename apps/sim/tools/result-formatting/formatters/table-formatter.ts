/**
 * Universal Tool Adapter System - Table Formatter
 *
 * Advanced table formatter that converts structured data into interactive tables
 * with sorting, filtering, pagination, and intelligent column detection.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type { ToolResponse } from '@/tools/types'
import type {
  FormatContext,
  FormattedResult,
  ResultFormat,
  ResultFormatter,
  TableContent,
} from '../types'

const logger = createLogger('TableFormatter')

/**
 * Advanced table formatter for structured data presentation
 */
export class TableFormatter implements ResultFormatter {
  id = 'table_formatter'
  name = 'Table Formatter'
  description = 'Converts structured data into interactive tables with sorting and filtering'
  supportedFormats: ResultFormat[] = ['table']
  priority = 200 // High priority for tabular data

  toolCompatibility = {
    preferredTools: [
      'postgresql_query',
      'mysql_query',
      'mongodb_query',
      'airtable_list_records',
      'google_sheets_read',
      'microsoft_excel_read',
      'notion_query_database',
      'supabase_query',
    ],
    outputTypes: ['array', 'object'],
    excludedTools: ['thinking', 'vision', 'mail_send', 'sms_send'],
  }

  /**
   * Check if this formatter can handle the result
   */
  canFormat(result: ToolResponse, context: FormatContext): boolean {
    if (!result.success || !result.output) {
      return false
    }

    const output = result.output

    // Check if data is suitable for table format
    if (Array.isArray(output)) {
      // Array of objects is perfect for tables
      if (output.length > 0 && typeof output[0] === 'object' && output[0] !== null) {
        return true
      }
      // Array of primitives can also be formatted as single-column table
      if (output.length > 0) {
        return true
      }
    }

    // Object with array properties (like search results)
    if (typeof output === 'object' && output !== null) {
      const arrayFields = Object.values(output).filter(Array.isArray)
      if (arrayFields.length > 0) {
        return true
      }

      // Object with tabular structure
      if (
        Object.hasOwn(output, 'rows') ||
        Object.hasOwn(output, 'data') ||
        Object.hasOwn(output, 'results')
      ) {
        return true
      }
    }

    return false
  }

  /**
   * Format the tool result into table presentation
   */
  async format(result: ToolResponse, context: FormatContext): Promise<FormattedResult> {
    const startTime = Date.now()

    try {
      logger.debug(`Formatting result as table for tool: ${context.toolId}`)

      // Extract tabular data
      const tableData = this.extractTableData(result.output)

      // Generate table content
      const tableContent = await this.generateTableContent(tableData, context)

      // Generate summary
      const summary = await this.generateSummary(result, context, tableContent)

      // Create additional representations
      const representations = await this.createRepresentations(tableContent, result)

      const processingTime = Date.now() - startTime

      return {
        originalResult: result,
        format: 'table',
        content: tableContent,
        summary,
        representations,
        metadata: {
          formattedAt: new Date().toISOString(),
          processingTime,
          version: '1.0.0',
          qualityScore: await this.calculateQualityScore(tableContent, tableData),
        },
      }
    } catch (error) {
      logger.error('Table formatting failed:', error)
      throw new Error(`Table formatting failed: ${(error as Error).message}`)
    }
  }

  /**
   * Generate natural language summary for table
   */
  async generateSummary(
    result: ToolResponse,
    context: FormatContext,
    tableContent?: TableContent
  ): Promise<{
    headline: string
    description: string
    highlights: string[]
    suggestions: string[]
  }> {
    try {
      const toolName = context.toolConfig.name || context.toolId
      const rowCount = tableContent?.rows.length || 0
      const columnCount = tableContent?.columns.length || 0

      // Generate headline
      const headline = `${toolName} returned ${rowCount} record${rowCount === 1 ? '' : 's'}`

      // Generate description
      let description = `The query returned ${rowCount} row${rowCount === 1 ? '' : 's'} with ${columnCount} column${columnCount === 1 ? '' : 's'}. `

      if (rowCount === 0) {
        description += 'No matching records were found.'
      } else if (rowCount === 1) {
        description += 'A single matching record was found.'
      } else {
        description +=
          'Multiple matching records were found and can be explored using the table below.'
      }

      // Generate highlights
      const highlights = this.generateTableHighlights(tableContent, result)

      // Generate suggestions
      const suggestions = this.generateTableSuggestions(tableContent, context, rowCount)

      return {
        headline,
        description,
        highlights,
        suggestions,
      }
    } catch (error) {
      logger.error('Table summary generation failed:', error)

      // Fallback summary
      return {
        headline: `${context.toolConfig.name || context.toolId} returned tabular data`,
        description: 'The tool returned structured data that has been formatted as a table.',
        highlights: [],
        suggestions: ['Use the table controls to sort and filter the data'],
      }
    }
  }

  // Private methods

  private extractTableData(output: any): any[] {
    if (Array.isArray(output)) {
      return output
    }

    if (typeof output === 'object' && output !== null) {
      // Common patterns for nested arrays
      const arrayFields = ['data', 'results', 'items', 'rows', 'records', 'list', 'entries']

      for (const field of arrayFields) {
        if (output[field] && Array.isArray(output[field])) {
          return output[field]
        }
      }

      // If object has many similar keys, convert to array
      const entries = Object.entries(output)
      if (entries.length > 3 && this.isHomogeneousObject(output)) {
        return entries.map(([key, value]) => ({ key, value }))
      }
    }

    // Fallback: wrap single item in array
    return [output]
  }

  private async generateTableContent(
    tableData: any[],
    context: FormatContext
  ): Promise<TableContent> {
    if (tableData.length === 0) {
      return {
        type: 'table',
        title: `${context.toolConfig.name || context.toolId} - Results`,
        description: 'No data to display',
        columns: [],
        rows: [],
      }
    }

    // Detect columns
    const columns = this.detectColumns(tableData)

    // Process rows
    const rows = this.processRows(tableData, columns)

    // Add pagination if needed
    const pagination = this.createPagination(rows, context)

    // Add sorting configuration
    const sorting = this.createDefaultSorting(columns)

    return {
      type: 'table',
      title: `${context.toolConfig.name || context.toolId} - Results`,
      description: `Table showing ${rows.length} record${rows.length === 1 ? '' : 's'}`,
      columns,
      rows,
      pagination,
      sorting,
    }
  }

  private detectColumns(data: any[]): TableContent['columns'] {
    if (data.length === 0) {
      return []
    }

    // If all items are primitives, create a single column
    if (this.allPrimitives(data)) {
      return [
        {
          key: 'value',
          label: 'Value',
          type: this.detectColumnType(data),
          sortable: true,
          filterable: true,
        },
      ]
    }

    // Extract all unique keys from objects
    const allKeys = new Set<string>()
    const keyTypes: Record<string, Set<string>> = {}

    for (const item of data.slice(0, 100)) {
      // Sample first 100 items
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach((key) => {
          allKeys.add(key)
          if (!keyTypes[key]) keyTypes[key] = new Set()
          keyTypes[key].add(this.getValueType(item[key]))
        })
      }
    }

    // Create columns with appropriate types
    const columns = Array.from(allKeys).map((key) => {
      const types = Array.from(keyTypes[key] || new Set())
      const primaryType = this.determinePrimaryType(types)

      return {
        key,
        label: this.humanizeColumnName(key),
        type: primaryType,
        sortable: this.isSortableType(primaryType),
        filterable: this.isFilterableType(primaryType),
        width: this.calculateColumnWidth(key, primaryType),
      }
    })

    // Sort columns by importance
    return this.sortColumnsByImportance(columns)
  }

  private processRows(data: any[], columns: TableContent['columns']): any[] {
    return data.map((item, index) => {
      const row: Record<string, any> = {}

      if (this.allPrimitives(data)) {
        row.value = item
        row._index = index
      } else if (typeof item === 'object' && item !== null) {
        // Copy all column values
        for (const column of columns) {
          const value = item[column.key]
          row[column.key] = this.formatCellValue(value, column.type)
        }
        row._index = index
      } else {
        // Fallback for mixed types
        row.value = item
        row._index = index
      }

      return row
    })
  }

  private createPagination(
    rows: any[],
    context: FormatContext
  ): TableContent['pagination'] | undefined {
    const maxRowsPerPage = context.displayMode === 'compact' ? 10 : 25

    if (rows.length <= maxRowsPerPage) {
      return undefined
    }

    return {
      page: 1,
      pageSize: maxRowsPerPage,
      totalRows: rows.length,
      totalPages: Math.ceil(rows.length / maxRowsPerPage),
    }
  }

  private createDefaultSorting(
    columns: TableContent['columns']
  ): TableContent['sorting'] | undefined {
    // Find a good column to sort by default
    const sortableColumns = columns.filter((col) => col.sortable)

    if (sortableColumns.length === 0) {
      return undefined
    }

    // Prefer date columns, then numeric, then string
    const dateColumn = sortableColumns.find((col) => col.type === 'date')
    if (dateColumn) {
      return { column: dateColumn.key, direction: 'desc' }
    }

    const numericColumn = sortableColumns.find((col) => col.type === 'number')
    if (numericColumn) {
      return { column: numericColumn.key, direction: 'desc' }
    }

    // Default to first sortable column
    return { column: sortableColumns[0].key, direction: 'asc' }
  }

  private async createRepresentations(
    tableContent: TableContent,
    result: ToolResponse
  ): Promise<FormattedResult['representations']> {
    const representations = []

    // Add chart representation if numeric data is available
    const numericColumns = tableContent.columns.filter((col) => col.type === 'number')
    if (numericColumns.length > 0 && tableContent.rows.length > 1) {
      representations.push({
        format: 'chart' as ResultFormat,
        content: this.convertToChart(tableContent),
        label: 'Chart View',
        priority: 150,
      })
    }

    // Add JSON representation
    representations.push({
      format: 'json' as ResultFormat,
      content: {
        type: 'json' as const,
        data: result.output,
        title: 'Raw Data',
        description: 'Original data in JSON format',
        displayHints: {
          expandable: true,
          maxDepth: 3,
          highlightFields: tableContent.columns.slice(0, 3).map((col) => col.key),
        },
      },
      label: 'JSON View',
      priority: 75,
    })

    // Add card representation for small datasets
    if (tableContent.rows.length <= 20) {
      representations.push({
        format: 'card' as ResultFormat,
        content: this.convertToCards(tableContent),
        label: 'Card View',
        priority: 125,
      })
    }

    return representations
  }

  private generateTableHighlights(tableContent?: TableContent, result?: ToolResponse): string[] {
    const highlights: string[] = []

    if (!tableContent) return highlights

    const rowCount = tableContent.rows.length
    const columnCount = tableContent.columns.length

    // Basic statistics
    if (rowCount > 0) {
      highlights.push(`${rowCount} row${rowCount === 1 ? '' : 's'} of data`)
    }

    if (columnCount > 0) {
      highlights.push(`${columnCount} column${columnCount === 1 ? '' : 's'} available`)
    }

    // Column types
    const columnTypes = new Set(tableContent.columns.map((col) => col.type))
    if (columnTypes.has('date')) {
      highlights.push('Includes date/time information')
    }
    if (columnTypes.has('number')) {
      highlights.push('Contains numeric data for analysis')
    }
    if (columnTypes.has('url')) {
      highlights.push('Includes clickable links')
    }

    // Performance
    if (result?.timing && result.timing.duration < 1000) {
      highlights.push(`Retrieved in ${result.timing.duration}ms`)
    }

    return highlights.slice(0, 3)
  }

  private generateTableSuggestions(
    tableContent?: TableContent,
    context?: FormatContext,
    rowCount?: number
  ): string[] {
    const suggestions: string[] = []

    if (!tableContent || rowCount === undefined) {
      return ['Explore the data using table controls']
    }

    // Row-based suggestions
    if (rowCount === 0) {
      suggestions.push('Modify your query parameters to get results')
      suggestions.push('Check if the data source contains matching records')
    } else if (rowCount > 25) {
      suggestions.push('Use filters to narrow down the results')
      suggestions.push('Sort by relevant columns to find key information')
    } else {
      suggestions.push('Click column headers to sort the data')
      suggestions.push('Use the search function to find specific entries')
    }

    // Tool-specific suggestions
    if (context?.toolId.includes('query') || context?.toolId.includes('search')) {
      suggestions.push('Refine your search criteria for more targeted results')
    }

    if (context?.toolId.includes('database') || context?.toolId.includes('sql')) {
      suggestions.push('Export this data for further analysis')
    }

    return suggestions.slice(0, 3)
  }

  private allPrimitives(data: any[]): boolean {
    return data.every((item) => typeof item !== 'object' || item === null)
  }

  private detectColumnType(
    data: any[]
  ): 'string' | 'number' | 'boolean' | 'date' | 'url' | 'email' {
    // Sample the data to determine type
    const sample = data.slice(0, 10).filter((item) => item !== null && item !== undefined)

    if (sample.length === 0) return 'string'

    // Check for numbers
    if (sample.every((item) => typeof item === 'number' || !Number.isNaN(Number(item)))) {
      return 'number'
    }

    // Check for booleans
    if (sample.every((item) => typeof item === 'boolean' || item === 'true' || item === 'false')) {
      return 'boolean'
    }

    // Check for dates
    if (sample.every((item) => !Number.isNaN(Date.parse(item)))) {
      return 'date'
    }

    // Check for URLs
    if (sample.every((item) => typeof item === 'string' && this.isUrl(item))) {
      return 'url'
    }

    // Check for emails
    if (sample.every((item) => typeof item === 'string' && this.isEmail(item))) {
      return 'email'
    }

    return 'string'
  }

  private getValueType(value: any): string {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'
    if (typeof value === 'string') {
      if (!Number.isNaN(Date.parse(value))) return 'date'
      if (this.isUrl(value)) return 'url'
      if (this.isEmail(value)) return 'email'
      return 'string'
    }
    if (Array.isArray(value)) return 'array'
    return 'object'
  }

  private determinePrimaryType(
    types: string[]
  ): 'string' | 'number' | 'boolean' | 'date' | 'url' | 'email' {
    if (types.length === 1) return types[0] as any

    // Priority order for mixed types
    if (types.includes('date')) return 'date'
    if (types.includes('number')) return 'number'
    if (types.includes('url')) return 'url'
    if (types.includes('email')) return 'email'
    if (types.includes('boolean')) return 'boolean'

    return 'string' // Default fallback
  }

  private humanizeColumnName(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/[_-]/g, ' ') // Replace underscores and dashes
      .replace(/\b\w/g, (l) => l.toUpperCase()) // Capitalize words
      .trim()
  }

  private isSortableType(type: string): boolean {
    return ['string', 'number', 'date', 'boolean'].includes(type)
  }

  private isFilterableType(type: string): boolean {
    return true // All types can be filtered
  }

  private calculateColumnWidth(key: string, type: string): number {
    // Base width on key name and type
    const baseWidth = Math.max(80, key.length * 8)

    switch (type) {
      case 'boolean':
        return Math.min(baseWidth, 100)
      case 'number':
        return Math.min(baseWidth, 120)
      case 'date':
        return Math.min(baseWidth, 180)
      case 'url':
        return Math.min(baseWidth, 200)
      case 'email':
        return Math.min(baseWidth, 200)
      default:
        return Math.min(baseWidth, 250)
    }
  }

  private sortColumnsByImportance(columns: TableContent['columns']): TableContent['columns'] {
    return columns.sort((a, b) => {
      // Priority order for column importance
      const priorities = {
        id: 10,
        name: 9,
        title: 8,
        email: 7,
        date: 6,
        created: 5,
        updated: 4,
        status: 3,
        type: 2,
      }

      const aPriority = priorities[a.key.toLowerCase()] || 0
      const bPriority = priorities[b.key.toLowerCase()] || 0

      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }

      // Secondary sort: type importance
      const typePriorities = {
        date: 5,
        number: 4,
        boolean: 3,
        email: 2,
        url: 1,
        string: 0,
      }

      const aTypePriority = typePriorities[a.type] || 0
      const bTypePriority = typePriorities[b.type] || 0

      return bTypePriority - aTypePriority
    })
  }

  private formatCellValue(value: any, type: string): any {
    if (value === null || value === undefined) return null

    switch (type) {
      case 'date':
        return new Date(value).toISOString()
      case 'number':
        return typeof value === 'number' ? value : Number.parseFloat(value)
      case 'boolean':
        return typeof value === 'boolean' ? value : value === 'true'
      case 'url':
      case 'email':
      case 'string':
        return String(value)
      default:
        return value
    }
  }

  private convertToChart(tableContent: TableContent): any {
    const numericColumns = tableContent.columns.filter((col) => col.type === 'number')
    if (numericColumns.length === 0) return null

    const chartData = tableContent.rows.slice(0, 50) // Limit for performance

    return {
      type: 'chart',
      chartType: 'bar',
      title: 'Data Visualization',
      data: chartData,
      config: {
        xAxis: tableContent.columns.find((col) => col.type === 'string')?.key || '_index',
        yAxis: numericColumns[0].key,
        responsive: true,
        tooltips: true,
      },
    }
  }

  private convertToCards(tableContent: TableContent): any {
    const cards = tableContent.rows.slice(0, 20).map((row, index) => ({
      id: row._index || index,
      title: this.extractCardTitle(row, tableContent.columns),
      subtitle: this.extractCardSubtitle(row, tableContent.columns),
      fields: this.extractCardFields(row, tableContent.columns),
    }))

    return {
      type: 'card',
      cards,
      layout: 'grid',
      columns: 3,
    }
  }

  private extractCardTitle(row: any, columns: TableContent['columns']): string {
    // Find best column for title
    const titleColumns = ['name', 'title', 'subject', 'email', 'id']

    for (const titleCol of titleColumns) {
      const column = columns.find((col) => col.key.toLowerCase().includes(titleCol))
      if (column && row[column.key]) {
        return String(row[column.key])
      }
    }

    // Fallback to first string column
    const firstStringColumn = columns.find((col) => col.type === 'string')
    return firstStringColumn ? String(row[firstStringColumn.key]) : 'Record'
  }

  private extractCardSubtitle(row: any, columns: TableContent['columns']): string | undefined {
    // Find good subtitle column
    const subtitleColumns = ['description', 'summary', 'status', 'type']

    for (const subtitleCol of subtitleColumns) {
      const column = columns.find((col) => col.key.toLowerCase().includes(subtitleCol))
      if (column && row[column.key]) {
        return String(row[column.key])
      }
    }

    return undefined
  }

  private extractCardFields(
    row: any,
    columns: TableContent['columns']
  ): Array<{
    label: string
    value: string
    type?: string
  }> {
    return columns
      .filter((col) => col.key !== '_index')
      .slice(0, 5) // Limit fields
      .map((col) => ({
        label: col.label,
        value: String(row[col.key] || ''),
        type: col.type,
      }))
  }

  private isHomogeneousObject(obj: Record<string, any>): boolean {
    const values = Object.values(obj)
    if (values.length < 3) return false

    const firstType = typeof values[0]
    return values.every((value) => typeof value === firstType)
  }

  private isUrl(str: string): boolean {
    try {
      new URL(str)
      return true
    } catch {
      return false
    }
  }

  private isEmail(str: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)
  }

  private async calculateQualityScore(
    tableContent: TableContent,
    originalData: any[]
  ): Promise<number> {
    let score = 0.7 // Base score

    // Adjust based on table quality
    if (tableContent.columns.length > 0) score += 0.1
    if (tableContent.rows.length > 0) score += 0.1
    if (tableContent.columns.some((col) => col.sortable)) score += 0.05
    if (tableContent.pagination) score += 0.05

    return Math.min(1.0, score)
  }
}
