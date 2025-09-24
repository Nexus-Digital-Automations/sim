/**
 * Google Sheets Tool Adapter
 * ===========================
 *
 * Adapter for Google Sheets operations
 * Converts Sim's Google Sheets block to Parlant-compatible format
 */

import type { BlockConfig } from '@/blocks/types'
import type { ToolResponse } from '@/tools/types'
import {
  type ParlantTool,
  type ToolExecutionContext,
  UniversalToolAdapter,
} from '../adapter-framework'

export class GoogleSheetsAdapter extends UniversalToolAdapter {
  protected transformToParlant(blockConfig: BlockConfig): ParlantTool {
    return {
      id: 'google_sheets',
      name: 'Google Sheets',
      description: 'Read, write, and manage Google Sheets data',
      longDescription:
        'Comprehensive Google Sheets integration for reading spreadsheet data, writing new content, updating cells, and managing worksheets with full spreadsheet automation.',
      category: 'productivity',
      parameters: [
        {
          name: 'operation',
          description: 'The Google Sheets operation to perform',
          type: 'string',
          required: true,
          constraints: {
            enum: [
              'read_sheet',
              'write_data',
              'append_data',
              'update_cells',
              'create_sheet',
              'get_sheet_info',
            ],
          },
        },
        {
          name: 'spreadsheet_id',
          description: 'The Google Sheets spreadsheet ID from the URL',
          type: 'string',
          required: true,
          examples: ['1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'],
        },
        {
          name: 'range',
          description: 'Cell range in A1 notation (e.g., A1:C10, Sheet1!A:Z)',
          type: 'string',
          required: true,
          examples: ['A1:C10', 'Sheet1!A:Z', 'Data!B2:D100'],
        },
        {
          name: 'data',
          description: 'Data to write (2D array for multiple rows/columns)',
          type: 'array',
          required: false,
          examples: [
            [
              ['Name', 'Age', 'Email'],
              ['John', 25, 'john@example.com'],
            ],
            [
              ['Product', 'Price'],
              ['Laptop', 999.99],
            ],
          ],
        },
        {
          name: 'oauth_credentials',
          description: 'OAuth credentials for Google Sheets access',
          type: 'object',
          required: true,
        },
      ],
      outputs: [
        {
          name: 'data',
          description: 'The spreadsheet data (for read operations)',
          type: 'array',
          optional: true,
        },
        {
          name: 'updated_range',
          description: 'The range that was updated (for write operations)',
          type: 'string',
          optional: true,
        },
        {
          name: 'rows_affected',
          description: 'Number of rows affected by the operation',
          type: 'number',
        },
        {
          name: 'sheet_info',
          description: 'Information about the spreadsheet',
          type: 'object',
        },
      ],
      examples: [
        {
          scenario: 'Read data from a specific range',
          input: {
            operation: 'read_sheet',
            spreadsheet_id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
            range: 'Sheet1!A1:C10',
            oauth_credentials: {},
          },
          expectedOutput: 'Returns 2D array of cell values from the specified range',
        },
      ],
      usageHints: [
        'Spreadsheet ID can be found in the Google Sheets URL',
        'Use A1 notation for ranges (A1:C10)',
        'OAuth authentication required with appropriate Google Sheets scopes',
      ],
      requiresAuth: {
        type: 'oauth',
        provider: 'google',
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      },
    }
  }

  protected async transformParameters(
    parlantParams: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<Record<string, any>> {
    return {
      operation: parlantParams.operation,
      spreadsheetId: parlantParams.spreadsheet_id,
      range: parlantParams.range,
      data: parlantParams.data,
      credentials: parlantParams.oauth_credentials,
    }
  }

  protected async executeSimTool(
    simParams: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResponse> {
    // Mock implementation - would integrate with actual Google Sheets API
    return {
      success: true,
      output: {
        data: [
          ['Name', 'Age'],
          ['John', 25],
          ['Jane', 30],
        ],
        rowsAffected: 3,
        sheetInfo: { title: 'Sample Sheet', id: simParams.spreadsheetId },
      },
      timing: {
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: 100,
      },
    }
  }

  protected async transformResult(
    simResult: ToolResponse,
    context: ToolExecutionContext
  ): Promise<any> {
    return {
      data: simResult.output.data,
      rows_affected: simResult.output.rowsAffected,
      sheet_info: simResult.output.sheetInfo,
    }
  }
}
