import { SalesforceIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { SalesforceResponse } from '@/tools/salesforce/types'

export const SalesforceBlock: BlockConfig<SalesforceResponse> = {
  type: 'salesforce',
  name: 'Salesforce',
  description: 'Complete Salesforce CRM integration with advanced features',
  longDescription:
    'Comprehensive Salesforce CRM integration with OAuth authentication. Manage contacts, leads, opportunities, accounts, and custom objects. Execute SOQL queries for advanced data retrieval and use Bulk API for high-volume operations.',
  docsLink: 'https://docs.sim.ai/tools/salesforce',
  category: 'tools',
  bgColor: '#00A1E0',
  icon: SalesforceIcon,
  subBlocks: [
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      layout: 'full',
      options: [
        { label: 'List Contacts', id: 'contacts_list' },
        { label: 'Get Contact', id: 'contacts_get' },
        { label: 'Create Contact', id: 'contacts_create' },
        { label: 'Update Contact', id: 'contacts_update' },
        { label: 'List Leads', id: 'leads_list' },
        { label: 'Create Lead', id: 'leads_create' },
        { label: 'Convert Lead', id: 'leads_convert' },
        { label: 'List Opportunities', id: 'opportunities_list' },
        { label: 'Create Opportunity', id: 'opportunities_create' },
        { label: 'Update Opportunity', id: 'opportunities_update' },
        { label: 'List Accounts', id: 'accounts_list' },
        { label: 'Create Account', id: 'accounts_create' },
        { label: 'Execute SOQL Query', id: 'soql_query' },
        { label: 'Bulk Insert Records', id: 'bulk_insert' },
        { label: 'Bulk Update Records', id: 'bulk_update' },
      ],
      value: () => 'contacts_list',
    },
    {
      id: 'credential',
      title: 'Salesforce Account',
      type: 'oauth-input',
      layout: 'full',
      provider: 'salesforce',
      serviceId: 'salesforce',
      requiredScopes: ['api', 'refresh_token', 'offline_access', 'openid', 'profile', 'email'],
      placeholder: 'Select Salesforce organization',
      required: true,
    },

    // Environment Selection
    {
      id: 'environment',
      title: 'Environment',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Production', id: 'production' },
        { label: 'Sandbox', id: 'sandbox' },
      ],
      value: () => 'production',
      required: true,
    },

    // Contact Operations
    {
      id: 'contactId',
      title: 'Contact ID',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Salesforce Contact ID (e.g., 003XX000004TmiQ)',
      condition: { field: 'operation', value: ['contacts_get', 'contacts_update'] },
      required: true,
    },

    {
      id: 'contactFields',
      title: 'Fields to Retrieve',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Comma-separated fields (e.g., Id,FirstName,LastName,Email)',
      condition: {
        field: 'operation',
        value: ['contacts_list', 'contacts_get'],
      },
      defaultValue: 'Id,FirstName,LastName,Email,Phone,AccountId,CreatedDate',
    },

    {
      id: 'contactData',
      title: 'Contact Data (JSON)',
      type: 'code',
      layout: 'full',
      placeholder: `{
  "FirstName": "John",
  "LastName": "Doe",
  "Email": "john.doe@example.com",
  "Phone": "+1-555-123-4567",
  "Title": "Sales Manager",
  "Department": "Sales"
}`,
      condition: {
        field: 'operation',
        value: ['contacts_create', 'contacts_update'],
      },
      required: true,
    },

    // Lead Operations
    {
      id: 'leadId',
      title: 'Lead ID',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Salesforce Lead ID (e.g., 00QXX0000000000)',
      condition: { field: 'operation', value: ['leads_get', 'leads_convert'] },
      required: true,
    },

    {
      id: 'leadData',
      title: 'Lead Data (JSON)',
      type: 'code',
      layout: 'full',
      placeholder: `{
  "FirstName": "Jane",
  "LastName": "Smith",
  "Company": "Acme Corporation",
  "Email": "jane.smith@acme.com",
  "Phone": "+1-555-987-6543",
  "Status": "Open - Not Contacted",
  "LeadSource": "Web"
}`,
      condition: { field: 'operation', value: ['leads_create'] },
      required: true,
    },

    // Opportunity Operations
    {
      id: 'opportunityId',
      title: 'Opportunity ID',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Salesforce Opportunity ID (e.g., 006XX000000000)',
      condition: {
        field: 'operation',
        value: ['opportunities_get', 'opportunities_update'],
      },
      required: true,
    },

    {
      id: 'opportunityData',
      title: 'Opportunity Data (JSON)',
      type: 'code',
      layout: 'full',
      placeholder: `{
  "Name": "New Business Opportunity",
  "AccountId": "001XX000003DHP0",
  "Amount": 50000,
  "CloseDate": "2024-12-31",
  "StageName": "Prospecting",
  "Type": "New Customer"
}`,
      condition: {
        field: 'operation',
        value: ['opportunities_create', 'opportunities_update'],
      },
      required: true,
    },

    // Account Operations
    {
      id: 'accountData',
      title: 'Account Data (JSON)',
      type: 'code',
      layout: 'full',
      placeholder: `{
  "Name": "Acme Corporation",
  "Type": "Customer - Direct",
  "Industry": "Technology",
  "Phone": "+1-555-123-4567",
  "Website": "https://www.acme.com",
  "BillingStreet": "123 Main St",
  "BillingCity": "San Francisco",
  "BillingState": "CA",
  "BillingPostalCode": "94105",
  "BillingCountry": "USA"
}`,
      condition: { field: 'operation', value: ['accounts_create'] },
      required: true,
    },

    // SOQL Query
    {
      id: 'soqlQuery',
      title: 'SOQL Query',
      type: 'code',
      layout: 'full',
      placeholder: `SELECT Id, FirstName, LastName, Email, Phone 
FROM Contact 
WHERE CreatedDate = TODAY 
ORDER BY LastName 
LIMIT 100`,
      condition: { field: 'operation', value: 'soql_query' },
      required: true,
    },

    // Bulk Operations
    {
      id: 'sobjectType',
      title: 'Salesforce Object Type',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Contact', id: 'Contact' },
        { label: 'Lead', id: 'Lead' },
        { label: 'Account', id: 'Account' },
        { label: 'Opportunity', id: 'Opportunity' },
        { label: 'Case', id: 'Case' },
        { label: 'Campaign', id: 'Campaign' },
        { label: 'Task', id: 'Task' },
        { label: 'Event', id: 'Event' },
      ],
      condition: {
        field: 'operation',
        value: ['bulk_insert', 'bulk_update'],
      },
      required: true,
    },

    {
      id: 'bulkRecords',
      title: 'Records (JSON Array)',
      type: 'code',
      layout: 'full',
      placeholder: `[
  {
    "FirstName": "John",
    "LastName": "Doe",
    "Email": "john.doe@example.com"
  },
  {
    "FirstName": "Jane",
    "LastName": "Smith", 
    "Email": "jane.smith@example.com"
  }
]`,
      condition: {
        field: 'operation',
        value: ['bulk_insert', 'bulk_update'],
      },
      required: true,
    },

    // Common Parameters
    {
      id: 'whereClause',
      title: 'WHERE Clause (Optional)',
      type: 'long-input',
      layout: 'full',
      placeholder: 'Email != null AND CreatedDate = TODAY',
      condition: {
        field: 'operation',
        value: ['contacts_list', 'leads_list', 'opportunities_list', 'accounts_list'],
      },
    },

    {
      id: 'orderBy',
      title: 'ORDER BY (Optional)',
      type: 'short-input',
      layout: 'half',
      placeholder: 'LastName ASC, FirstName ASC',
      condition: {
        field: 'operation',
        value: ['contacts_list', 'leads_list', 'opportunities_list', 'accounts_list'],
      },
    },

    {
      id: 'limit',
      title: 'Limit',
      type: 'short-input',
      layout: 'quarter',
      placeholder: '100',
      condition: {
        field: 'operation',
        value: ['contacts_list', 'leads_list', 'opportunities_list', 'accounts_list'],
      },
    },

    {
      id: 'offset',
      title: 'Offset',
      type: 'short-input',
      layout: 'quarter',
      placeholder: '0',
      condition: {
        field: 'operation',
        value: ['contacts_list', 'leads_list', 'opportunities_list', 'accounts_list'],
      },
    },

    // Advanced Options
    {
      id: 'includeDeleted',
      title: 'Include Deleted Records',
      type: 'checkbox',
      layout: 'half',
      condition: {
        field: 'operation',
        value: ['contacts_list', 'leads_list', 'opportunities_list', 'accounts_list'],
      },
      defaultValue: false,
    },

    {
      id: 'allOrNone',
      title: 'All or None (Bulk Operations)',
      type: 'checkbox',
      layout: 'half',
      condition: {
        field: 'operation',
        value: ['bulk_insert', 'bulk_update'],
      },
      defaultValue: false,
      description: 'If true, the entire operation fails if any record fails',
    },
  ],

  // Output configuration for different operations
  outputTemplate: (operation: string) => {
    switch (operation) {
      case 'contacts_list':
      case 'leads_list':
      case 'opportunities_list':
      case 'accounts_list':
        return {
          records: 'array',
          totalSize: 'number',
          done: 'boolean',
          nextRecordsUrl: 'string?',
        }
      case 'contacts_get':
      case 'leads_get':
      case 'opportunities_get':
      case 'accounts_get':
        return {
          Id: 'string',
          attributes: 'object',
          // Dynamic fields based on query
        }
      case 'contacts_create':
      case 'leads_create':
      case 'opportunities_create':
      case 'accounts_create':
        return {
          id: 'string',
          success: 'boolean',
          errors: 'array?',
        }
      case 'soql_query':
        return {
          records: 'array',
          totalSize: 'number',
          done: 'boolean',
          nextRecordsUrl: 'string?',
        }
      case 'bulk_insert':
      case 'bulk_update':
        return {
          jobId: 'string',
          state: 'string',
          createdDate: 'string',
          numberBatchesQueued: 'number',
          numberBatchesInProgress: 'number',
          numberBatchesCompleted: 'number',
        }
      default:
        return {
          success: 'boolean',
          data: 'object',
          errors: 'array?',
        }
    }
  },
}
