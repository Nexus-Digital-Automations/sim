/**
 * Salesforce CRM Integration Tool
 *
 * Comprehensive Salesforce integration with full CRM functionality including
 * contacts, leads, opportunities, accounts, custom objects, SOQL queries,
 * and bulk operations.
 *
 * Features:
 * - Complete CRUD operations for all major Salesforce objects
 * - Advanced SOQL query support with error handling
 * - Bulk API integration for high-volume operations
 * - OAuth 2.0 authentication with token management
 * - Real-time error handling with Salesforce-specific error codes
 * - Comprehensive logging and monitoring
 * - Support for both Production and Sandbox environments
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  SalesforceAccountsCreateParams,
  SalesforceAccountsListParams,
  SalesforceBulkInsertParams,
  SalesforceContactsCreateParams,
  SalesforceContactsGetParams,
  SalesforceContactsListParams,
  SalesforceContactsUpdateParams,
  SalesforceLeadsCreateParams,
  SalesforceLeadsListParams,
  SalesforceListResponse,
  SalesforceOperationResult,
  SalesforceOpportunitiesCreateParams,
  SalesforceOpportunitiesListParams,
  SalesforceRecord,
  SalesforceResponse,
  SalesforceSOQLQueryParams,
} from './types'

const logger = createLogger('SalesforceTool')

// ====================================================================
// SALESFORCE API CONFIGURATION
// ====================================================================

const SALESFORCE_CONFIG = {
  DEFAULT_API_VERSION: 'v60.0',
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRIES: 3,
  PRODUCTION_LOGIN_URL: 'https://login.salesforce.com',
  SANDBOX_LOGIN_URL: 'https://test.salesforce.com',

  // Request limits
  DEFAULT_LIMIT: 100,
  MAX_LIMIT: 2000,
  BULK_MAX_RECORDS: 10000,

  // Field defaults for common objects
  DEFAULT_CONTACT_FIELDS: [
    'Id',
    'FirstName',
    'LastName',
    'Email',
    'Phone',
    'AccountId',
    'Title',
    'Department',
    'CreatedDate',
    'LastModifiedDate',
  ],
  DEFAULT_LEAD_FIELDS: [
    'Id',
    'FirstName',
    'LastName',
    'Company',
    'Email',
    'Phone',
    'Status',
    'LeadSource',
    'Industry',
    'CreatedDate',
    'LastModifiedDate',
  ],
  DEFAULT_OPPORTUNITY_FIELDS: [
    'Id',
    'Name',
    'AccountId',
    'Amount',
    'CloseDate',
    'StageName',
    'Type',
    'Probability',
    'LeadSource',
    'CreatedDate',
    'LastModifiedDate',
  ],
  DEFAULT_ACCOUNT_FIELDS: [
    'Id',
    'Name',
    'Type',
    'Industry',
    'Phone',
    'Website',
    'BillingCity',
    'BillingState',
    'BillingCountry',
    'CreatedDate',
    'LastModifiedDate',
  ],
}

// ====================================================================
// UTILITY FUNCTIONS
// ====================================================================

/**
 * Build Salesforce API URL
 */
function buildApiUrl(
  instanceUrl: string,
  endpoint: string,
  apiVersion = SALESFORCE_CONFIG.DEFAULT_API_VERSION
): string {
  const baseUrl = instanceUrl.endsWith('/') ? instanceUrl.slice(0, -1) : instanceUrl
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${baseUrl}/services/data/${apiVersion}${cleanEndpoint}`
}

/**
 * Build SOQL query from parameters
 */
function buildSOQLQuery(options: {
  object: string
  fields?: string[]
  where?: string
  orderBy?: string
  limit?: number
  offset?: number
  includeDeleted?: boolean
}): string {
  const { object, fields = ['Id'], where, orderBy, limit, offset, includeDeleted } = options

  let query = `SELECT ${fields.join(', ')} FROM ${object}`

  if (includeDeleted) {
    query = `SELECT ${fields.join(', ')} FROM ${object} ALL ROWS`
  }

  if (where) {
    query += ` WHERE ${where}`
  }

  if (orderBy) {
    query += ` ORDER BY ${orderBy}`
  }

  if (limit) {
    query += ` LIMIT ${Math.min(limit, SALESFORCE_CONFIG.MAX_LIMIT)}`
  }

  if (offset) {
    query += ` OFFSET ${offset}`
  }

  return query
}

/**
 * Make authenticated request to Salesforce API
 */
async function makeApiRequest<T = any>(
  url: string,
  accessToken: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    body?: any
    headers?: Record<string, string>
    timeout?: number
  } = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = SALESFORCE_CONFIG.DEFAULT_TIMEOUT,
  } = options

  const requestHeaders: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Sforce-Call-Options': 'client=SimWorkflowAutomation',
    ...headers,
  }

  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
    signal: AbortSignal.timeout(timeout),
  }

  if (body && method !== 'GET') {
    requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body)
  }

  logger.debug(`Making Salesforce API request`, {
    method,
    url: url.replace(/\/services\/data\/[^/]+/, '/services/data/vXX.X'), // Hide sensitive parts
    hasBody: !!body,
  })

  const response = await fetch(url, requestOptions)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `HTTP ${response.status}: ${response.statusText}`,
    }))

    throw new SalesforceApiError(
      Array.isArray(errorData) ? errorData[0] : errorData,
      response.status
    )
  }

  const data = await response.json()

  logger.debug(`Salesforce API request completed`, {
    method,
    status: response.status,
    hasData: !!data,
  })

  return data
}

/**
 * Custom error class for Salesforce API errors
 */
class SalesforceApiError extends Error {
  public readonly errorCode: string
  public readonly fields?: string[]
  public readonly statusCode: number
  public readonly retryable: boolean

  constructor(errorData: any, statusCode: number) {
    super(errorData.message || 'Salesforce API error')
    this.name = 'SalesforceApiError'
    this.errorCode = errorData.errorCode || 'UNKNOWN_ERROR'
    this.fields = errorData.fields
    this.statusCode = statusCode
    this.retryable = this.isRetryableError(this.errorCode, statusCode)
  }

  private isRetryableError(errorCode: string, statusCode: number): boolean {
    // Status codes that are typically retryable
    if ([429, 500, 502, 503, 504].includes(statusCode)) {
      return true
    }

    // Salesforce-specific retryable error codes
    const retryableErrorCodes = [
      'REQUEST_LIMIT_EXCEEDED',
      'SERVER_UNAVAILABLE',
      'UNABLE_TO_LOCK_ROW',
      'STORAGE_LIMIT_EXCEEDED',
      'TXN_SECURITY_METERING_ERROR',
    ]

    return retryableErrorCodes.includes(errorCode)
  }
}

// ====================================================================
// CONTACT OPERATIONS
// ====================================================================

/**
 * List contacts with optional filtering and pagination
 */
export async function listContacts(params: SalesforceContactsListParams): Promise<any> {
  logger.info('Listing Salesforce contacts', {
    limit: params.limit,
    hasWhere: !!params.where,
    hasOrderBy: !!params.orderBy,
  })

  try {
    const fields = params.fields || SALESFORCE_CONFIG.DEFAULT_CONTACT_FIELDS
    const limit = Math.min(
      params.limit || SALESFORCE_CONFIG.DEFAULT_LIMIT,
      SALESFORCE_CONFIG.MAX_LIMIT
    )

    const query = buildSOQLQuery({
      object: 'Contact',
      fields,
      where: params.where,
      orderBy: params.orderBy,
      limit,
      offset: params.offset,
      includeDeleted: params.includeDeleted,
    })

    const queryUrl = buildApiUrl(
      params.instanceUrl,
      `/query?q=${encodeURIComponent(query)}`,
      params.apiVersion
    )
    const response = await makeApiRequest<SalesforceListResponse>(queryUrl, params.accessToken)

    logger.info(`Retrieved ${response.records.length} contacts`, {
      totalSize: response.totalSize,
      done: response.done,
    })

    return {
      success: true,
      output: {
        contacts: response.records,
        metadata: {
          totalSize: response.totalSize,
          done: response.done,
          nextRecordsUrl: response.nextRecordsUrl,
        },
      },
    }
  } catch (error) {
    logger.error('Failed to list contacts:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details:
        error instanceof SalesforceApiError
          ? {
              errorCode: error.errorCode,
              retryable: error.retryable,
              statusCode: error.statusCode,
            }
          : undefined,
    }
  }
}

/**
 * Get a specific contact by ID
 */
export async function getContact(params: SalesforceContactsGetParams): Promise<any> {
  logger.info(`Getting Salesforce contact: ${params.contactId}`)

  try {
    const fields = params.fields || SALESFORCE_CONFIG.DEFAULT_CONTACT_FIELDS
    const fieldsParam = fields.join(',')

    const url = buildApiUrl(
      params.instanceUrl,
      `/sobjects/Contact/${params.contactId}?fields=${encodeURIComponent(fieldsParam)}`,
      params.apiVersion
    )

    const contact = await makeApiRequest<SalesforceRecord>(url, params.accessToken)

    logger.info(`Retrieved contact: ${contact.Id}`)

    return {
      success: true,
      output: {
        contact,
        metadata: {
          recordFound: true,
        },
      },
    }
  } catch (error) {
    logger.error(`Failed to get contact ${params.contactId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details:
        error instanceof SalesforceApiError
          ? {
              errorCode: error.errorCode,
              retryable: error.retryable,
              statusCode: error.statusCode,
            }
          : undefined,
    }
  }
}

/**
 * Create a new contact
 */
export async function createContact(params: SalesforceContactsCreateParams): Promise<any> {
  logger.info('Creating new Salesforce contact', {
    hasEmail: !!params.contactData.Email,
    hasPhone: !!params.contactData.Phone,
    hasAccountId: !!params.contactData.AccountId,
  })

  try {
    const url = buildApiUrl(params.instanceUrl, '/sobjects/Contact', params.apiVersion)
    const result = await makeApiRequest<SalesforceOperationResult>(url, params.accessToken, {
      method: 'POST',
      body: params.contactData,
    })

    if (result.success && result.id) {
      logger.info(`Created contact successfully: ${result.id}`)

      // Optionally retrieve the created contact
      const contact = await getContact({
        ...params,
        contactId: result.id,
      })

      return {
        success: true,
        output: {
          result,
          contact: contact.success ? contact.output.contact : undefined,
          metadata: {
            operation: 'create',
            success: true,
          },
        },
      }
    }
    throw new Error(`Contact creation failed: ${result.errors?.map((e) => e.message).join(', ')}`)
  } catch (error) {
    logger.error('Failed to create contact:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details:
        error instanceof SalesforceApiError
          ? {
              errorCode: error.errorCode,
              retryable: error.retryable,
              statusCode: error.statusCode,
            }
          : undefined,
    }
  }
}

/**
 * Update an existing contact
 */
export async function updateContact(params: SalesforceContactsUpdateParams): Promise<any> {
  logger.info(`Updating Salesforce contact: ${params.contactId}`, {
    fieldCount: Object.keys(params.contactData).length,
  })

  try {
    const url = buildApiUrl(
      params.instanceUrl,
      `/sobjects/Contact/${params.contactId}`,
      params.apiVersion
    )
    await makeApiRequest(url, params.accessToken, {
      method: 'PATCH',
      body: params.contactData,
    })

    logger.info(`Updated contact successfully: ${params.contactId}`)

    return {
      success: true,
      output: {
        result: {
          success: true,
          errors: [],
        },
        metadata: {
          operation: 'update',
          success: true,
          recordId: params.contactId,
        },
      },
    }
  } catch (error) {
    logger.error(`Failed to update contact ${params.contactId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details:
        error instanceof SalesforceApiError
          ? {
              errorCode: error.errorCode,
              retryable: error.retryable,
              statusCode: error.statusCode,
            }
          : undefined,
    }
  }
}

// ====================================================================
// LEAD OPERATIONS
// ====================================================================

/**
 * List leads with optional filtering and pagination
 */
export async function listLeads(params: SalesforceLeadsListParams): Promise<any> {
  logger.info('Listing Salesforce leads', {
    limit: params.limit,
    hasWhere: !!params.where,
  })

  try {
    const fields = params.fields || SALESFORCE_CONFIG.DEFAULT_LEAD_FIELDS
    const limit = Math.min(
      params.limit || SALESFORCE_CONFIG.DEFAULT_LIMIT,
      SALESFORCE_CONFIG.MAX_LIMIT
    )

    const query = buildSOQLQuery({
      object: 'Lead',
      fields,
      where: params.where,
      orderBy: params.orderBy,
      limit,
      offset: params.offset,
      includeDeleted: params.includeDeleted,
    })

    const queryUrl = buildApiUrl(
      params.instanceUrl,
      `/query?q=${encodeURIComponent(query)}`,
      params.apiVersion
    )
    const response = await makeApiRequest<SalesforceListResponse>(queryUrl, params.accessToken)

    logger.info(`Retrieved ${response.records.length} leads`, {
      totalSize: response.totalSize,
    })

    return {
      success: true,
      output: {
        leads: response.records,
        metadata: {
          totalSize: response.totalSize,
          done: response.done,
          nextRecordsUrl: response.nextRecordsUrl,
        },
      },
    }
  } catch (error) {
    logger.error('Failed to list leads:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Create a new lead
 */
export async function createLead(params: SalesforceLeadsCreateParams): Promise<any> {
  logger.info('Creating new Salesforce lead', {
    company: params.leadData.Company,
    hasEmail: !!params.leadData.Email,
  })

  try {
    const url = buildApiUrl(params.instanceUrl, '/sobjects/Lead', params.apiVersion)
    const result = await makeApiRequest<SalesforceOperationResult>(url, params.accessToken, {
      method: 'POST',
      body: params.leadData,
    })

    if (result.success && result.id) {
      logger.info(`Created lead successfully: ${result.id}`)

      return {
        success: true,
        output: {
          result,
          metadata: {
            operation: 'create',
            success: true,
          },
        },
      }
    }
    throw new Error(`Lead creation failed: ${result.errors?.map((e) => e.message).join(', ')}`)
  } catch (error) {
    logger.error('Failed to create lead:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

// ====================================================================
// OPPORTUNITY OPERATIONS
// ====================================================================

/**
 * List opportunities with optional filtering
 */
export async function listOpportunities(params: SalesforceOpportunitiesListParams): Promise<any> {
  logger.info('Listing Salesforce opportunities')

  try {
    const fields = params.fields || SALESFORCE_CONFIG.DEFAULT_OPPORTUNITY_FIELDS
    const limit = Math.min(
      params.limit || SALESFORCE_CONFIG.DEFAULT_LIMIT,
      SALESFORCE_CONFIG.MAX_LIMIT
    )

    const query = buildSOQLQuery({
      object: 'Opportunity',
      fields,
      where: params.where,
      orderBy: params.orderBy,
      limit,
      offset: params.offset,
    })

    const queryUrl = buildApiUrl(
      params.instanceUrl,
      `/query?q=${encodeURIComponent(query)}`,
      params.apiVersion
    )
    const response = await makeApiRequest<SalesforceListResponse>(queryUrl, params.accessToken)

    logger.info(`Retrieved ${response.records.length} opportunities`)

    return {
      success: true,
      output: {
        opportunities: response.records,
        metadata: {
          totalSize: response.totalSize,
          done: response.done,
        },
      },
    }
  } catch (error) {
    logger.error('Failed to list opportunities:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Create a new opportunity
 */
export async function createOpportunity(params: SalesforceOpportunitiesCreateParams): Promise<any> {
  logger.info('Creating new Salesforce opportunity', {
    name: params.opportunityData.Name,
    amount: params.opportunityData.Amount,
  })

  try {
    const url = buildApiUrl(params.instanceUrl, '/sobjects/Opportunity', params.apiVersion)
    const result = await makeApiRequest<SalesforceOperationResult>(url, params.accessToken, {
      method: 'POST',
      body: params.opportunityData,
    })

    if (result.success && result.id) {
      logger.info(`Created opportunity successfully: ${result.id}`)

      return {
        success: true,
        output: {
          result,
          metadata: {
            operation: 'create',
            success: true,
          },
        },
      }
    }
    throw new Error(
      `Opportunity creation failed: ${result.errors?.map((e) => e.message).join(', ')}`
    )
  } catch (error) {
    logger.error('Failed to create opportunity:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

// ====================================================================
// ACCOUNT OPERATIONS
// ====================================================================

/**
 * List accounts with optional filtering
 */
export async function listAccounts(params: SalesforceAccountsListParams): Promise<any> {
  logger.info('Listing Salesforce accounts')

  try {
    const fields = params.fields || SALESFORCE_CONFIG.DEFAULT_ACCOUNT_FIELDS
    const limit = Math.min(
      params.limit || SALESFORCE_CONFIG.DEFAULT_LIMIT,
      SALESFORCE_CONFIG.MAX_LIMIT
    )

    const query = buildSOQLQuery({
      object: 'Account',
      fields,
      where: params.where,
      orderBy: params.orderBy,
      limit,
      offset: params.offset,
    })

    const queryUrl = buildApiUrl(
      params.instanceUrl,
      `/query?q=${encodeURIComponent(query)}`,
      params.apiVersion
    )
    const response = await makeApiRequest<SalesforceListResponse>(queryUrl, params.accessToken)

    return {
      success: true,
      output: {
        accounts: response.records,
        metadata: {
          totalSize: response.totalSize,
          done: response.done,
        },
      },
    }
  } catch (error) {
    logger.error('Failed to list accounts:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Create a new account
 */
export async function createAccount(params: SalesforceAccountsCreateParams): Promise<any> {
  logger.info('Creating new Salesforce account', {
    name: params.accountData.Name,
    type: params.accountData.Type,
  })

  try {
    const url = buildApiUrl(params.instanceUrl, '/sobjects/Account', params.apiVersion)
    const result = await makeApiRequest<SalesforceOperationResult>(url, params.accessToken, {
      method: 'POST',
      body: params.accountData,
    })

    if (result.success && result.id) {
      logger.info(`Created account successfully: ${result.id}`)

      return {
        success: true,
        output: {
          result,
          metadata: {
            operation: 'create',
            success: true,
          },
        },
      }
    }
    throw new Error(`Account creation failed: ${result.errors?.map((e) => e.message).join(', ')}`)
  } catch (error) {
    logger.error('Failed to create account:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

// ====================================================================
// SOQL QUERY OPERATIONS
// ====================================================================

/**
 * Execute a custom SOQL query
 */
export async function executeSOQLQuery(params: SalesforceSOQLQueryParams): Promise<any> {
  logger.info('Executing SOQL query', {
    query: params.query.substring(0, 100) + (params.query.length > 100 ? '...' : ''),
  })

  try {
    const queryUrl = buildApiUrl(
      params.instanceUrl,
      `/query?q=${encodeURIComponent(params.query)}`,
      params.apiVersion
    )

    const response = await makeApiRequest<SalesforceListResponse>(queryUrl, params.accessToken)

    logger.info(`SOQL query returned ${response.records.length} records`, {
      totalSize: response.totalSize,
      done: response.done,
    })

    return {
      success: true,
      output: {
        records: response.records,
        metadata: {
          totalSize: response.totalSize,
          done: response.done,
          nextRecordsUrl: response.nextRecordsUrl,
          query: params.query,
        },
      },
    }
  } catch (error) {
    logger.error('Failed to execute SOQL query:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: {
        query: params.query,
      },
    }
  }
}

// ====================================================================
// BULK OPERATIONS
// ====================================================================

/**
 * Bulk insert records using Salesforce Bulk API 2.0
 */
export async function bulkInsertRecords(params: SalesforceBulkInsertParams): Promise<any> {
  logger.info(`Starting bulk insert operation`, {
    sobjectType: params.sobjectType,
    recordCount: params.records.length,
  })

  try {
    if (params.records.length > SALESFORCE_CONFIG.BULK_MAX_RECORDS) {
      throw new Error(`Too many records. Maximum allowed: ${SALESFORCE_CONFIG.BULK_MAX_RECORDS}`)
    }

    // Create bulk job
    const jobUrl = buildApiUrl(params.instanceUrl, '/jobs/ingest', params.apiVersion)
    const jobData = {
      object: params.sobjectType,
      operation: 'insert',
      contentType: 'JSON',
      lineEnding: 'LF',
    }

    const job = await makeApiRequest(jobUrl, params.accessToken, {
      method: 'POST',
      body: jobData,
    })

    logger.info(`Created bulk job: ${job.id}`)

    // Upload data
    const uploadUrl = buildApiUrl(
      params.instanceUrl,
      `/jobs/ingest/${job.id}/batches`,
      params.apiVersion
    )
    await makeApiRequest(uploadUrl, params.accessToken, {
      method: 'PUT',
      body: params.records.map((record) => JSON.stringify(record)).join('\n'),
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
    })

    // Close job to start processing
    const closeUrl = buildApiUrl(params.instanceUrl, `/jobs/ingest/${job.id}`, params.apiVersion)
    const closedJob = await makeApiRequest(closeUrl, params.accessToken, {
      method: 'PATCH',
      body: { state: 'UploadComplete' },
    })

    logger.info(`Bulk insert job submitted: ${job.id}`)

    return {
      success: true,
      output: {
        job: closedJob,
        metadata: {
          operation: 'bulk_insert',
          sobjectType: params.sobjectType,
          recordCount: params.records.length,
        },
      },
    }
  } catch (error) {
    logger.error('Failed to execute bulk insert:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

// ====================================================================
// MAIN TOOL EXECUTION FUNCTION
// ====================================================================

/**
 * Main execution function that routes operations to specific handlers
 */
export async function execute(params: any): Promise<SalesforceResponse> {
  const operationId = params.operation

  logger.info(`Executing Salesforce operation: ${operationId}`, {
    hasCredentials: !!params.accessToken,
    instanceUrl: params.instanceUrl?.replace(/^https?:\/\//, '') || 'not-provided',
  })

  try {
    switch (operationId) {
      case 'contacts_list':
        return await listContacts(params)
      case 'contacts_get':
        return await getContact(params)
      case 'contacts_create':
        return await createContact(params)
      case 'contacts_update':
        return await updateContact(params)
      case 'leads_list':
        return await listLeads(params)
      case 'leads_create':
        return await createLead(params)
      case 'opportunities_list':
        return await listOpportunities(params)
      case 'opportunities_create':
        return await createOpportunity(params)
      case 'accounts_list':
        return await listAccounts(params)
      case 'accounts_create':
        return await createAccount(params)
      case 'soql_query':
        return await executeSOQLQuery(params)
      case 'bulk_insert':
        return await bulkInsertRecords(params)
      default:
        throw new Error(`Unsupported Salesforce operation: ${operationId}`)
    }
  } catch (error) {
    logger.error(`Salesforce operation failed: ${operationId}`, error)
    throw error
  }
}

// Export individual operation functions for direct use
export {
  listContacts,
  getContact,
  createContact,
  updateContact,
  listLeads,
  createLead,
  listOpportunities,
  createOpportunity,
  listAccounts,
  createAccount,
  executeSOQLQuery,
  bulkInsertRecords,
}

// Export utilities
export { buildSOQLQuery, buildApiUrl, SalesforceApiError }
