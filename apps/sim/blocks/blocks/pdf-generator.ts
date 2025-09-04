import { ComponentIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { DocumentResponse } from '@/tools/document/types'

export const PdfGeneratorBlock: BlockConfig<DocumentResponse> = {
  type: 'pdf_generator',
  name: 'PDF Generator',
  description: 'Generate PDF documents from templates with dynamic content',
  longDescription:
    'Create professional PDF documents using templates, HTML/CSS, or direct content. Support for charts, images, tables, headers/footers, and digital signatures with advanced formatting options.',
  docsLink: 'https://docs.sim.ai/blocks/pdf-generator',
  category: 'blocks',
  bgColor: '#DC2626',
  icon: ComponentIcon,
  subBlocks: [
    {
      id: 'generationMode',
      title: 'Generation Mode',
      type: 'dropdown',
      layout: 'full',
      required: true,
      options: [
        { label: 'Template-based', id: 'template' },
        { label: 'HTML to PDF', id: 'html' },
        { label: 'Markdown to PDF', id: 'markdown' },
        { label: 'Form-based', id: 'form' },
        { label: 'Report Builder', id: 'report' },
      ],
      value: () => 'template',
    },
    {
      id: 'templateId',
      title: 'Template',
      type: 'dropdown',
      layout: 'half',
      condition: { field: 'generationMode', value: 'template' },
      options: [
        { label: 'Invoice Template', id: 'invoice' },
        { label: 'Report Template', id: 'report' },
        { label: 'Certificate Template', id: 'certificate' },
        { label: 'Contract Template', id: 'contract' },
        { label: 'Letter Template', id: 'letter' },
        { label: 'Custom Template', id: 'custom' },
      ],
      required: true,
    },
    {
      id: 'customTemplate',
      title: 'Upload Custom Template',
      type: 'file-upload',
      layout: 'half',
      condition: {
        field: 'generationMode',
        value: 'template',
        and: { field: 'templateId', value: 'custom' },
      },
      acceptedTypes: '.docx,.pdf,.html',
      description: 'Upload Word, PDF, or HTML template',
    },
    {
      id: 'templateData',
      title: 'Template Data',
      type: 'code',
      layout: 'full',
      language: 'json',
      placeholder: `{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "invoiceNumber": "INV-2024-001",
  "invoiceDate": "2024-01-15",
  "dueDate": "2024-02-15",
  "items": [
    {
      "description": "Professional Services",
      "quantity": 10,
      "unitPrice": 150,
      "total": 1500
    }
  ],
  "subtotal": 1500,
  "tax": 150,
  "total": 1650
}`,
      condition: { field: 'generationMode', value: 'template' },
      required: true,
      rows: 15,
      description: 'Data to populate the template',
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `Generate sample data for a PDF template based on the user's requirements.

Current context: {context}
Template type: {templateId}

Create ONLY a valid JSON object with realistic sample data that would be used to populate a PDF template.

Example structures:

Invoice:
{
  "company": {...},
  "customer": {...},
  "items": [...],
  "totals": {...}
}

Report:
{
  "title": "...",
  "data": [...],
  "charts": [...],
  "summary": {...}
}

Return only the JSON object:`,
        placeholder: 'Describe what data should populate the template...',
        generationType: 'json-object',
      },
    },
    {
      id: 'htmlContent',
      title: 'HTML Content',
      type: 'code',
      layout: 'full',
      language: 'html',
      placeholder: `<!DOCTYPE html
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .content { line-height: 1.6; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .table th { background-color: #f2f2f2; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{title}}</h1>
    <p>Generated on {{date}}</p>
  </div>
  
  <div class="content">
    <h2>Summary</h2>
    <p>{{summary}}</p>
    
    <table class="table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Quantity</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {{#each items}}
        <tr>
          <td>{{this.name}}</td>
          <td>{{this.quantity}}</td>
          <td>{{this.price}} USD</td>
          <td>{{this.total}} USD</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
  </div>
  
  <div class="footer">
    <p>This document was automatically generated.</p>
  </div>
</body>
</html>`,
      condition: { field: 'generationMode', value: 'html' },
      required: true,
      rows: 20,
      description: 'HTML content with template variables',
    },
    {
      id: 'markdownContent',
      title: 'Markdown Content',
      type: 'code',
      layout: 'full',
      language: 'markdown',
      placeholder: `# {{title}}

Generated on {{date}}

## Summary

{{summary}}

## Details

| Item | Quantity | Price | Total |
|------|----------|-------|-------|
{{#each items}}
| {{this.name}} | {{this.quantity}} | {{this.price}} USD | {{this.total}} USD |
{{/each}}

### Total: {{grandTotal}} USD

---

*This document was automatically generated.*`,
      condition: { field: 'generationMode', value: 'markdown' },
      required: true,
      rows: 15,
      description: 'Markdown content with template variables',
    },
    {
      id: 'formFields',
      title: 'Form Fields',
      type: 'table',
      layout: 'full',
      columns: ['Field Name', 'Field Type', 'Label', 'Required', 'Default Value'],
      condition: { field: 'generationMode', value: 'form' },
      description: 'Define form fields for PDF generation',
    },
    {
      id: 'reportConfig',
      title: 'Report Configuration',
      type: 'code',
      layout: 'full',
      language: 'json',
      placeholder: `{
  "title": "Sales Report",
  "sections": [
    {
      "type": "chart",
      "chartType": "bar",
      "data": "{{salesData}}",
      "title": "Monthly Sales"
    },
    {
      "type": "table",
      "data": "{{detailedData}}",
      "columns": ["Date", "Product", "Amount", "Customer"]
    },
    {
      "type": "summary",
      "metrics": {
        "totalSales": "{{totalSales}}",
        "avgSale": "{{avgSale}}",
        "topProduct": "{{topProduct}}"
      }
    }
  ]
}`,
      condition: { field: 'generationMode', value: 'report' },
      required: true,
      rows: 12,
      description: 'Report structure and data configuration',
    },
    {
      id: 'pageSettings',
      title: 'Page Settings',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'A4 Portrait', id: 'a4_portrait' },
        { label: 'A4 Landscape', id: 'a4_landscape' },
        { label: 'Letter Portrait', id: 'letter_portrait' },
        { label: 'Letter Landscape', id: 'letter_landscape' },
        { label: 'Legal', id: 'legal' },
        { label: 'Custom', id: 'custom' },
      ],
      value: () => 'a4_portrait',
    },
    {
      id: 'customPageSize',
      title: 'Custom Page Size (width x height mm)',
      type: 'short-input',
      layout: 'half',
      placeholder: '210x297',
      condition: { field: 'pageSettings', value: 'custom' },
      description: 'Custom page dimensions in millimeters',
    },
    {
      id: 'margins',
      title: 'Page Margins (mm)',
      type: 'short-input',
      layout: 'full',
      placeholder: '20,20,20,20',
      description: 'Top, Right, Bottom, Left margins in millimeters',
      value: () => '20,20,20,20',
    },
    {
      id: 'headerFooter',
      title: 'Enable Header/Footer',
      type: 'switch',
      layout: 'half',
      description: 'Add header and footer to pages',
    },
    {
      id: 'headerContent',
      title: 'Header Content',
      type: 'long-input',
      layout: 'full',
      placeholder: 'Company Name - {{documentTitle}} - Page {{pageNumber}}',
      condition: { field: 'headerFooter', value: true },
      rows: 2,
      description: 'Header text with template variables',
    },
    {
      id: 'footerContent',
      title: 'Footer Content',
      type: 'long-input',
      layout: 'full',
      placeholder: 'Generated on {{date}} - Page {{pageNumber}} of {{totalPages}}',
      condition: { field: 'headerFooter', value: true },
      rows: 2,
      description: 'Footer text with template variables',
    },
    {
      id: 'watermark',
      title: 'Enable Watermark',
      type: 'switch',
      layout: 'half',
      description: 'Add watermark to document',
    },
    {
      id: 'watermarkText',
      title: 'Watermark Text',
      type: 'short-input',
      layout: 'half',
      placeholder: 'CONFIDENTIAL',
      condition: { field: 'watermark', value: true },
    },
    {
      id: 'watermarkOpacity',
      title: 'Watermark Opacity',
      type: 'slider',
      layout: 'full',
      min: 10,
      max: 100,
      step: 5,
      value: () => '30',
      condition: { field: 'watermark', value: true },
      description: 'Watermark transparency (10-100%)',
    },
    {
      id: 'security',
      title: 'Enable Security Features',
      type: 'switch',
      layout: 'half',
      description: 'Add password protection and restrictions',
    },
    {
      id: 'userPassword',
      title: 'User Password',
      type: 'short-input',
      layout: 'half',
      placeholder: 'user-password',
      password: true,
      condition: { field: 'security', value: true },
      description: 'Password to open the PDF',
    },
    {
      id: 'ownerPassword',
      title: 'Owner Password',
      type: 'short-input',
      layout: 'half',
      placeholder: 'owner-password',
      password: true,
      condition: { field: 'security', value: true },
      description: 'Password for editing permissions',
    },
    {
      id: 'permissions',
      title: 'Document Permissions',
      type: 'checkbox-list',
      layout: 'full',
      condition: { field: 'security', value: true },
      options: [
        { label: 'Allow Printing', id: 'print' },
        { label: 'Allow Content Copy', id: 'copy' },
        { label: 'Allow Editing', id: 'edit' },
        { label: 'Allow Annotations', id: 'annotate' },
        { label: 'Allow Form Filling', id: 'form_fill' },
      ],
      description: 'Permitted actions for the PDF',
    },
    {
      id: 'digitalSignature',
      title: 'Add Digital Signature',
      type: 'switch',
      layout: 'half',
      description: 'Add digital signature to PDF',
    },
    {
      id: 'signaturePosition',
      title: 'Signature Position',
      type: 'dropdown',
      layout: 'half',
      condition: { field: 'digitalSignature', value: true },
      options: [
        { label: 'Bottom Right', id: 'bottom_right' },
        { label: 'Bottom Left', id: 'bottom_left' },
        { label: 'Top Right', id: 'top_right' },
        { label: 'Top Left', id: 'top_left' },
        { label: 'Custom', id: 'custom' },
      ],
      value: () => 'bottom_right',
    },
    {
      id: 'compressionLevel',
      title: 'Compression Level',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'None', id: 'none' },
        { label: 'Low', id: 'low' },
        { label: 'Medium', id: 'medium' },
        { label: 'High', id: 'high' },
      ],
      value: () => 'medium',
      description: 'PDF file size compression',
    },
    {
      id: 'outputFilename',
      title: 'Output Filename',
      type: 'short-input',
      layout: 'half',
      placeholder: 'document-{{timestamp}}.pdf',
      description: 'Filename for generated PDF (supports template variables)',
    },
  ],
  tools: {
    access: ['pdf_generator'],
  },
  inputs: {
    generationMode: { type: 'string', description: 'PDF generation method' },
    templateId: { type: 'string', description: 'Template identifier' },
    customTemplate: { type: 'string', description: 'Custom template file' },
    templateData: { type: 'json', description: 'Data for template population' },
    htmlContent: { type: 'string', description: 'HTML content for conversion' },
    markdownContent: { type: 'string', description: 'Markdown content for conversion' },
    formFields: { type: 'json', description: 'Form field configuration' },
    reportConfig: { type: 'json', description: 'Report structure configuration' },
    pageSettings: { type: 'string', description: 'Page size and orientation' },
    customPageSize: { type: 'string', description: 'Custom page dimensions' },
    margins: { type: 'string', description: 'Page margins' },
    headerFooter: { type: 'boolean', description: 'Enable header and footer' },
    headerContent: { type: 'string', description: 'Header template content' },
    footerContent: { type: 'string', description: 'Footer template content' },
    watermark: { type: 'boolean', description: 'Enable watermark' },
    watermarkText: { type: 'string', description: 'Watermark text' },
    watermarkOpacity: { type: 'number', description: 'Watermark opacity percentage' },
    security: { type: 'boolean', description: 'Enable security features' },
    userPassword: { type: 'string', description: 'User access password' },
    ownerPassword: { type: 'string', description: 'Owner permissions password' },
    permissions: { type: 'json', description: 'Document permissions' },
    digitalSignature: { type: 'boolean', description: 'Add digital signature' },
    signaturePosition: { type: 'string', description: 'Signature placement' },
    compressionLevel: { type: 'string', description: 'File compression level' },
    outputFilename: { type: 'string', description: 'Output filename template' },
  },
  outputs: {
    pdfUrl: { type: 'string', description: 'URL to generated PDF file' },
    filename: { type: 'string', description: 'Generated filename' },
    fileSize: { type: 'number', description: 'PDF file size in bytes' },
    pageCount: { type: 'number', description: 'Number of pages in PDF' },
    generationTime: { type: 'number', description: 'Generation time in milliseconds' },
    compressionRatio: { type: 'number', description: 'Compression ratio achieved' },
    metadata: { type: 'json', description: 'PDF metadata and properties' },
    securityInfo: { type: 'json', description: 'Security features applied' },
    downloadUrl: { type: 'string', description: 'Direct download URL' },
    previewUrl: { type: 'string', description: 'PDF preview URL' },
    error: { type: 'string', description: 'Error message if generation failed' },
  },
}
