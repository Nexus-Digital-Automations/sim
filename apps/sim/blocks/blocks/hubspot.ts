import { HubSpotIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { HubSpotResponse } from '@/tools/hubspot/types'

export const HubSpotBlock: BlockConfig<HubSpotResponse> = {
  type: 'hubspot',
  name: 'HubSpot',
  description: 'Complete HubSpot CRM and marketing automation integration',
  longDescription:
    'Comprehensive HubSpot CRM integration with OAuth authentication. Manage contacts, companies, deals, tickets, and marketing campaigns. Execute advanced searches, batch operations, and leverage HubSpot\'s powerful automation tools.',
  docsLink: 'https://docs.sim.ai/tools/hubspot',
  category: 'tools',
  bgColor: '#FF7A59',
  icon: HubSpotIcon,
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
        { label: 'Search Contacts', id: 'contacts_search' },
        { label: 'List Companies', id: 'companies_list' },
        { label: 'Create Company', id: 'companies_create' },
        { label: 'List Deals', id: 'deals_list' },
        { label: 'Create Deal', id: 'deals_create' },
        { label: 'Batch Read Contacts', id: 'contacts_batch_read' },
        { label: 'Batch Create Contacts', id: 'contacts_batch_create' },
      ],
      value: () => 'contacts_list',
    },
    {
      id: 'credential',
      title: 'HubSpot Account',
      type: 'oauth-input',
      layout: 'full',
      provider: 'hubspot',
      serviceId: 'hubspot',
      requiredScopes: [
        'crm.objects.contacts.read',
        'crm.objects.contacts.write',
        'crm.objects.companies.read',
        'crm.objects.companies.write',
        'crm.objects.deals.read',
        'crm.objects.deals.write',
      ],
      placeholder: 'Select HubSpot account',
      required: true,
    },

    // Contact Operations
    {
      id: 'contactId',
      title: 'Contact ID',
      type: 'short-input',
      layout: 'full',
      placeholder: 'HubSpot Contact ID (e.g., 12345678901)',
      condition: { field: 'operation', value: ['contacts_get', 'contacts_update'] },
      required: true,
    },
    
    {
      id: 'contactProperties',
      title: 'Properties to Retrieve',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Comma-separated properties (e.g., firstname,lastname,email,phone)',
      condition: { 
        field: 'operation', 
        value: ['contacts_list', 'contacts_get', 'contacts_search', 'contacts_batch_read'] 
      },
      defaultValue: 'firstname,lastname,email,phone,company,jobtitle,lifecyclestage',
    },
    
    {
      id: 'contactData',
      title: 'Contact Properties (JSON)',
      type: 'code',
      layout: 'full',
      placeholder: `{
  "firstname": "John",
  "lastname": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-123-4567",
  "company": "Acme Corporation",
  "jobtitle": "Marketing Manager",
  "website": "https://www.acme.com",
  "city": "San Francisco",
  "state": "CA",
  "country": "United States",
  "lifecyclestage": "lead"
}`,
      condition: { 
        field: 'operation', 
        value: ['contacts_create', 'contacts_update'] 
      },
      required: true,
    },

    // Company Operations
    {
      id: 'companyData',
      title: 'Company Properties (JSON)',
      type: 'code',
      layout: 'full',
      placeholder: `{
  "name": "Acme Corporation",
  "domain": "acme.com",
  "industry": "Technology",
  "phone": "+1-555-123-4567",
  "city": "San Francisco",
  "state": "California",
  "country": "United States",
  "website": "https://www.acme.com",
  "numberofemployees": "100",
  "annualrevenue": "5000000",
  "type": "PROSPECT"
}`,
      condition: { field: 'operation', value: ['companies_create'] },
      required: true,
    },

    // Deal Operations
    {
      id: 'dealData',
      title: 'Deal Properties (JSON)',
      type: 'code',
      layout: 'full',
      placeholder: `{
  "dealname": "New Business Opportunity",
  "amount": "50000",
  "pipeline": "default",
  "dealstage": "appointmentscheduled",
  "closedate": "2024-12-31",
  "dealtype": "newbusiness",
  "hubspot_owner_id": "123456"
}`,
      condition: { field: 'operation', value: ['deals_create'] },
      required: true,
    },

    // Search Operations
    {
      id: 'searchQuery',
      title: 'Search Query',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Search term (e.g., company name, email domain)',
      condition: { field: 'operation', value: 'contacts_search' },
    },
    
    {
      id: 'searchFilters',
      title: 'Search Filters (JSON)',
      type: 'code',
      layout: 'full',
      placeholder: `[
  {
    "filters": [
      {
        "propertyName": "lifecyclestage",
        "operator": "EQ",
        "value": "lead"
      },
      {
        "propertyName": "createdate",
        "operator": "GTE",
        "value": "2024-01-01"
      }
    ]
  }
]`,
      condition: { field: 'operation', value: 'contacts_search' },
    },

    // Batch Operations
    {
      id: 'batchContactIds',
      title: 'Contact IDs (JSON Array)',
      type: 'code',
      layout: 'full',
      placeholder: `[
  {"id": "12345678901"},
  {"id": "12345678902"},
  {"id": "12345678903"}
]`,
      condition: { field: 'operation', value: 'contacts_batch_read' },
      required: true,
    },
    
    {
      id: 'batchContacts',
      title: 'Contacts Data (JSON Array)',
      type: 'code',
      layout: 'full',
      placeholder: `[
  {
    "properties": {
      "firstname": "John",
      "lastname": "Doe",
      "email": "john.doe@example.com",
      "company": "Acme Corp"
    }
  },
  {
    "properties": {
      "firstname": "Jane",
      "lastname": "Smith",
      "email": "jane.smith@example.com",
      "company": "Tech Inc"
    }
  }
]`,
      condition: { field: 'operation', value: 'contacts_batch_create' },
      required: true,
    },

    // Common Parameters
    {
      id: 'limit',
      title: 'Limit',
      type: 'short-input',
      layout: 'quarter',
      placeholder: '100',
      condition: { 
        field: 'operation', 
        value: ['contacts_list', 'companies_list', 'deals_list', 'contacts_search'] 
      },
    },
    
    {
      id: 'after',
      title: 'After (Pagination Cursor)',
      type: 'short-input',
      layout: 'half',
      placeholder: 'Cursor from previous response',
      condition: { 
        field: 'operation', 
        value: ['contacts_list', 'companies_list', 'deals_list', 'contacts_search'] 
      },
    },
    
    {
      id: 'associations',
      title: 'Include Associations',
      type: 'short-input',
      layout: 'half',
      placeholder: 'companies,deals (comma-separated)',
      condition: { 
        field: 'operation', 
        value: ['contacts_list', 'contacts_get', 'companies_list', 'deals_list'] 
      },
    },

    // Advanced Options
    {
      id: 'archived',
      title: 'Include Archived Records',
      type: 'checkbox',
      layout: 'half',
      condition: { 
        field: 'operation', 
        value: ['contacts_list', 'companies_list', 'deals_list'] 
      },
      defaultValue: false,
    },
    
    {
      id: 'propertiesWithHistory',
      title: 'Properties with History',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Properties to retrieve with historical values',
      condition: { 
        field: 'operation', 
        value: ['contacts_get', 'contacts_batch_read'] 
      },
    },
    
    {
      id: 'sortBy',
      title: 'Sort By',
      type: 'short-input',
      layout: 'half',
      placeholder: 'Property name to sort by',
      condition: { field: 'operation', value: 'contacts_search' },
    },
    
    {
      id: 'sortDirection',
      title: 'Sort Direction',
      type: 'dropdown',
      layout: 'quarter',
      options: [
        { label: 'Ascending', id: 'ASCENDING' },
        { label: 'Descending', id: 'DESCENDING' },
      ],
      condition: { field: 'operation', value: 'contacts_search' },
      defaultValue: 'ASCENDING',
    },
  ],
  
  // Output configuration for different operations
  outputTemplate: (operation: string) => {
    switch (operation) {
      case 'contacts_list':
      case 'companies_list':
      case 'deals_list':
      case 'contacts_search':
        return {
          results: 'array',
          paging: 'object?',
          total: 'number?',
        }
      case 'contacts_get':
        return {
          id: 'string',
          properties: 'object',
          associations: 'object?',
          createdAt: 'string',
          updatedAt: 'string',
        }
      case 'contacts_create':
      case 'companies_create':
      case 'deals_create':
        return {
          id: 'string',
          properties: 'object',
          createdAt: 'string',
          updatedAt: 'string',
        }
      case 'contacts_update':
        return {
          id: 'string',
          properties: 'object',
          updatedAt: 'string',
        }
      case 'contacts_batch_read':
      case 'contacts_batch_create':
        return {
          results: 'array',
          status: 'string',
          numErrors: 'number?',
          errors: 'array?',
        }
      default:
        return {
          success: 'boolean',
          data: 'object',
          message: 'string?',
        }
    }
  },
}