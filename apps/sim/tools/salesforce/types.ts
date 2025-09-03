import type { ToolResponse } from '@/tools/types'

// ====================================================================
// SALESFORCE CORE TYPES
// ====================================================================

/**
 * Salesforce record with standard fields and attributes
 */
export interface SalesforceRecord {
  Id: string
  attributes: {
    type: string
    url: string
  }
  [field: string]: any // Allow dynamic fields
}

/**
 * Standard Salesforce Contact record
 */
export interface SalesforceContact extends SalesforceRecord {
  FirstName?: string
  LastName: string
  Email?: string
  Phone?: string
  AccountId?: string
  Title?: string
  Department?: string
  LeadSource?: string
  CreatedDate: string
  LastModifiedDate: string
}

/**
 * Standard Salesforce Lead record
 */
export interface SalesforceLead extends SalesforceRecord {
  FirstName?: string
  LastName: string
  Company: string
  Email?: string
  Phone?: string
  Status: string
  LeadSource?: string
  Industry?: string
  Rating?: string
  ConvertedAccountId?: string
  ConvertedContactId?: string
  ConvertedOpportunityId?: string
  IsConverted: boolean
  CreatedDate: string
  LastModifiedDate: string
}

/**
 * Standard Salesforce Opportunity record
 */
export interface SalesforceOpportunity extends SalesforceRecord {
  Name: string
  AccountId: string
  Amount?: number
  CloseDate: string
  StageName: string
  Type?: string
  Probability?: number
  LeadSource?: string
  Description?: string
  CreatedDate: string
  LastModifiedDate: string
}

/**
 * Standard Salesforce Account record
 */
export interface SalesforceAccount extends SalesforceRecord {
  Name: string
  Type?: string
  Industry?: string
  AnnualRevenue?: number
  NumberOfEmployees?: number
  Phone?: string
  Website?: string
  BillingStreet?: string
  BillingCity?: string
  BillingState?: string
  BillingPostalCode?: string
  BillingCountry?: string
  ShippingStreet?: string
  ShippingCity?: string
  ShippingState?: string
  ShippingPostalCode?: string
  ShippingCountry?: string
  CreatedDate: string
  LastModifiedDate: string
}

// ====================================================================
// API RESPONSE TYPES
// ====================================================================

/**
 * Standard Salesforce API list response
 */
export interface SalesforceListResponse<T = SalesforceRecord> {
  totalSize: number
  done: boolean
  records: T[]
  nextRecordsUrl?: string
}

/**
 * Salesforce API error structure
 */
export interface SalesforceError {
  message: string
  errorCode: string
  fields?: string[]
}

/**
 * Salesforce create/update operation result
 */
export interface SalesforceOperationResult {
  id?: string
  success: boolean
  errors: SalesforceError[]
  created?: boolean
}

/**
 * Salesforce bulk operation job status
 */
export interface SalesforceBulkJob {
  id: string
  state: 'Open' | 'InProgress' | 'Aborted' | 'Completed' | 'Failed'
  createdDate: string
  systemModstamp: string
  numberBatchesQueued: number
  numberBatchesInProgress: number
  numberBatchesCompleted: number
  numberBatchesFailed: number
  numberBatchesTotal: number
  numberRequestsCompleted: number
  numberRequestsFailed: number
  numberRetries: number
  apiVersion: string
  jobType: string
  lineEnding: string
  object: string
  operation: string
  createdById: string
}

// ====================================================================
// OPERATION PARAMETER TYPES
// ====================================================================

/**
 * Base parameters for all Salesforce operations
 */
interface SalesforceBaseParams {
  accessToken: string
  instanceUrl: string
  apiVersion?: string
}

// Contact Operations
export interface SalesforceContactsListParams extends SalesforceBaseParams {
  fields?: string[]
  where?: string
  orderBy?: string
  limit?: number
  offset?: number
  includeDeleted?: boolean
}

export interface SalesforceContactsGetParams extends SalesforceBaseParams {
  contactId: string
  fields?: string[]
}

export interface SalesforceContactsCreateParams extends SalesforceBaseParams {
  contactData: Partial<SalesforceContact>
}

export interface SalesforceContactsUpdateParams extends SalesforceBaseParams {
  contactId: string
  contactData: Partial<SalesforceContact>
}

// Lead Operations
export interface SalesforceLeadsListParams extends SalesforceBaseParams {
  fields?: string[]
  where?: string
  orderBy?: string
  limit?: number
  offset?: number
  includeDeleted?: boolean
}

export interface SalesforceLeadsCreateParams extends SalesforceBaseParams {
  leadData: Partial<SalesforceLead>
}

export interface SalesforceLeadsConvertParams extends SalesforceBaseParams {
  leadId: string
  convertedStatus: string
  accountId?: string
  contactId?: string
  createOpportunity?: boolean
  opportunityName?: string
  doNotCreateOpportunity?: boolean
}

// Opportunity Operations
export interface SalesforceOpportunitiesListParams extends SalesforceBaseParams {
  fields?: string[]
  where?: string
  orderBy?: string
  limit?: number
  offset?: number
}

export interface SalesforceOpportunitiesCreateParams extends SalesforceBaseParams {
  opportunityData: Partial<SalesforceOpportunity>
}

export interface SalesforceOpportunitiesUpdateParams extends SalesforceBaseParams {
  opportunityId: string
  opportunityData: Partial<SalesforceOpportunity>
}

// Account Operations
export interface SalesforceAccountsListParams extends SalesforceBaseParams {
  fields?: string[]
  where?: string
  orderBy?: string
  limit?: number
  offset?: number
}

export interface SalesforceAccountsCreateParams extends SalesforceBaseParams {
  accountData: Partial<SalesforceAccount>
}

// SOQL Query Operations
export interface SalesforceSOQLQueryParams extends SalesforceBaseParams {
  query: string
}

// Bulk Operations
export interface SalesforceBulkInsertParams extends SalesforceBaseParams {
  sobjectType: string
  records: Record<string, any>[]
  allOrNone?: boolean
}

export interface SalesforceBulkUpdateParams extends SalesforceBaseParams {
  sobjectType: string
  records: (Record<string, any> & { Id: string })[]
  allOrNone?: boolean
}

// ====================================================================
// RESPONSE TYPES FOR SIM TOOL SYSTEM
// ====================================================================

// Contact Responses
export interface SalesforceContactsListResponse extends ToolResponse {
  output: {
    contacts: SalesforceContact[]
    metadata: {
      totalSize: number
      done: boolean
      nextRecordsUrl?: string
    }
  }
}

export interface SalesforceContactsGetResponse extends ToolResponse {
  output: {
    contact: SalesforceContact
    metadata: {
      recordFound: boolean
    }
  }
}

export interface SalesforceContactsCreateResponse extends ToolResponse {
  output: {
    result: SalesforceOperationResult
    contact?: SalesforceContact
    metadata: {
      operation: 'create'
      success: boolean
    }
  }
}

export interface SalesforceContactsUpdateResponse extends ToolResponse {
  output: {
    result: SalesforceOperationResult
    metadata: {
      operation: 'update'
      success: boolean
      recordId: string
    }
  }
}

// Lead Responses
export interface SalesforceLeadsListResponse extends ToolResponse {
  output: {
    leads: SalesforceLead[]
    metadata: {
      totalSize: number
      done: boolean
      nextRecordsUrl?: string
    }
  }
}

export interface SalesforceLeadsCreateResponse extends ToolResponse {
  output: {
    result: SalesforceOperationResult
    lead?: SalesforceLead
    metadata: {
      operation: 'create'
      success: boolean
    }
  }
}

export interface SalesforceLeadsConvertResponse extends ToolResponse {
  output: {
    leadId: string
    accountId?: string
    contactId?: string
    opportunityId?: string
    success: boolean
    errors: SalesforceError[]
    metadata: {
      operation: 'convert'
      success: boolean
    }
  }
}

// Opportunity Responses
export interface SalesforceOpportunitiesListResponse extends ToolResponse {
  output: {
    opportunities: SalesforceOpportunity[]
    metadata: {
      totalSize: number
      done: boolean
      nextRecordsUrl?: string
    }
  }
}

export interface SalesforceOpportunitiesCreateResponse extends ToolResponse {
  output: {
    result: SalesforceOperationResult
    opportunity?: SalesforceOpportunity
    metadata: {
      operation: 'create'
      success: boolean
    }
  }
}

// Account Responses
export interface SalesforceAccountsListResponse extends ToolResponse {
  output: {
    accounts: SalesforceAccount[]
    metadata: {
      totalSize: number
      done: boolean
      nextRecordsUrl?: string
    }
  }
}

export interface SalesforceAccountsCreateResponse extends ToolResponse {
  output: {
    result: SalesforceOperationResult
    account?: SalesforceAccount
    metadata: {
      operation: 'create'
      success: boolean
    }
  }
}

// SOQL Query Response
export interface SalesforceSOQLQueryResponse extends ToolResponse {
  output: {
    records: SalesforceRecord[]
    metadata: {
      totalSize: number
      done: boolean
      nextRecordsUrl?: string
      query: string
    }
  }
}

// Bulk Operation Responses
export interface SalesforceBulkInsertResponse extends ToolResponse {
  output: {
    job: SalesforceBulkJob
    metadata: {
      operation: 'bulk_insert'
      sobjectType: string
      recordCount: number
    }
  }
}

export interface SalesforceBulkUpdateResponse extends ToolResponse {
  output: {
    job: SalesforceBulkJob
    metadata: {
      operation: 'bulk_update'
      sobjectType: string
      recordCount: number
    }
  }
}

// ====================================================================
// UNION RESPONSE TYPE
// ====================================================================

/**
 * Union type for all possible Salesforce operation responses
 */
export type SalesforceResponse =
  | SalesforceContactsListResponse
  | SalesforceContactsGetResponse
  | SalesforceContactsCreateResponse
  | SalesforceContactsUpdateResponse
  | SalesforceLeadsListResponse
  | SalesforceLeadsCreateResponse
  | SalesforceLeadsConvertResponse
  | SalesforceOpportunitiesListResponse
  | SalesforceOpportunitiesCreateResponse
  | SalesforceAccountsListResponse
  | SalesforceAccountsCreateResponse
  | SalesforceSOQLQueryResponse
  | SalesforceBulkInsertResponse
  | SalesforceBulkUpdateResponse

// ====================================================================
// UTILITY TYPES
// ====================================================================

/**
 * Salesforce field types for validation
 */
export type SalesforceFieldType =
  | 'string'
  | 'email'
  | 'phone'
  | 'url'
  | 'textarea'
  | 'picklist'
  | 'multipicklist'
  | 'boolean'
  | 'currency'
  | 'number'
  | 'percent'
  | 'date'
  | 'datetime'
  | 'time'
  | 'reference'
  | 'id'

/**
 * Salesforce object metadata
 */
export interface SalesforceObjectMetadata {
  name: string
  label: string
  labelPlural: string
  keyPrefix: string
  custom: boolean
  queryable: boolean
  createable: boolean
  updateable: boolean
  deletable: boolean
  mergeable: boolean
  replicateable: boolean
  retrieveable: boolean
  searchable: boolean
  triggerable: boolean
  undeletable: boolean
  fields: SalesforceFieldMetadata[]
}

/**
 * Salesforce field metadata
 */
export interface SalesforceFieldMetadata {
  name: string
  label: string
  type: SalesforceFieldType
  length?: number
  byteLength?: number
  digits?: number
  precision?: number
  scale?: number
  custom: boolean
  calculated: boolean
  createable: boolean
  updateable: boolean
  filterable: boolean
  groupable: boolean
  nillable: boolean
  sortable: boolean
  unique: boolean
  externalId: boolean
  idLookup: boolean
  picklistValues?: Array<{
    active: boolean
    defaultValue: boolean
    label: string
    validFor?: string
    value: string
  }>
  referenceTo?: string[]
  relationshipName?: string
  relationshipOrder?: number
  defaultValue?: any
  inlineHelpText?: string
  mask?: string
  maskType?: string
}

/**
 * Salesforce environment configuration
 */
export interface SalesforceEnvironment {
  type: 'production' | 'sandbox' | 'custom'
  loginUrl: string
  apiVersion: string
  instanceUrl?: string
  organizationId?: string
  organizationName?: string
}

/**
 * Salesforce connection status
 */
export interface SalesforceConnectionStatus {
  connected: boolean
  instanceUrl?: string
  organizationId?: string
  organizationName?: string
  userInfo?: {
    id: string
    username: string
    email: string
    displayName: string
    profileId: string
    roleId?: string
    userType: string
    language: string
    locale: string
    timeZone: string
  }
  limits?: {
    dailyApiRequests: {
      max: number
      remaining: number
    }
    dataStorageMB: {
      max: number
      remaining: number
    }
    fileStorageMB: {
      max: number
      remaining: number
    }
  }
  lastSync?: string
  errors?: SalesforceError[]
}
