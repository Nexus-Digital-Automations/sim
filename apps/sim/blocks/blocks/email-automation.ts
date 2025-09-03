import { MailIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { EmailResponse } from '@/tools/email/types'

export const EmailAutomationBlock: BlockConfig<EmailResponse> = {
  type: 'email_automation',
  name: 'Email Automation',
  description: 'Advanced email automation with templates and campaign management',
  longDescription:
    'Send automated emails with advanced templating, personalization, scheduling, tracking, and campaign management. Support for bulk sending, A/B testing, and comprehensive analytics.',
  docsLink: 'https://docs.sim.ai/blocks/email-automation',
  category: 'blocks',
  bgColor: '#3B82F6',
  icon: MailIcon,
  subBlocks: [
    {
      id: 'emailProvider',
      title: 'Email Provider',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        { label: 'SMTP Server', id: 'smtp' },
        { label: 'SendGrid', id: 'sendgrid' },
        { label: 'Mailgun', id: 'mailgun' },
        { label: 'Amazon SES', id: 'ses' },
        { label: 'Postmark', id: 'postmark' },
        { label: 'Gmail API', id: 'gmail' },
        { label: 'Outlook API', id: 'outlook' },
      ],
    },
    {
      id: 'campaignType',
      title: 'Campaign Type',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        { label: 'Single Email', id: 'single' },
        { label: 'Bulk Campaign', id: 'bulk' },
        { label: 'Drip Campaign', id: 'drip' },
        { label: 'Transactional', id: 'transactional' },
        { label: 'Newsletter', id: 'newsletter' },
        { label: 'A/B Test', id: 'ab_test' },
      ],
      value: () => 'single',
    },
    // SMTP Configuration
    {
      id: 'smtpHost',
      title: 'SMTP Host',
      type: 'short-input',
      layout: 'half',
      placeholder: 'smtp.gmail.com',
      condition: { field: 'emailProvider', value: 'smtp' },
      required: true,
    },
    {
      id: 'smtpPort',
      title: 'SMTP Port',
      type: 'short-input',
      layout: 'half',
      placeholder: '587',
      condition: { field: 'emailProvider', value: 'smtp' },
      required: true,
    },
    {
      id: 'smtpUsername',
      title: 'SMTP Username',
      type: 'short-input',
      layout: 'half',
      placeholder: 'your-email@gmail.com',
      condition: { field: 'emailProvider', value: 'smtp' },
      required: true,
    },
    {
      id: 'smtpPassword',
      title: 'SMTP Password',
      type: 'short-input',
      layout: 'half',
      placeholder: 'app-password',
      password: true,
      condition: { field: 'emailProvider', value: 'smtp' },
      required: true,
    },
    {
      id: 'smtpSecurity',
      title: 'Security',
      type: 'dropdown',
      layout: 'full',
      condition: { field: 'emailProvider', value: 'smtp' },
      options: [
        { label: 'TLS (STARTTLS)', id: 'tls' },
        { label: 'SSL', id: 'ssl' },
        { label: 'None', id: 'none' },
      ],
      value: () => 'tls',
    },
    // API Key Configuration for other providers
    {
      id: 'apiKey',
      title: 'API Key',
      type: 'short-input',
      layout: 'full',
      placeholder: 'your-api-key',
      password: true,
      condition: {
        field: 'emailProvider',
        value: ['sendgrid', 'mailgun', 'ses', 'postmark'],
      },
      required: true,
    },
    {
      id: 'fromEmail',
      title: 'From Email',
      type: 'short-input',
      layout: 'half',
      placeholder: 'noreply@company.com',
      required: true,
      description: 'Sender email address',
    },
    {
      id: 'fromName',
      title: 'From Name',
      type: 'short-input',
      layout: 'half',
      placeholder: 'Company Name',
      description: 'Sender display name',
    },
    {
      id: 'replyTo',
      title: 'Reply To',
      type: 'short-input',
      layout: 'full',
      placeholder: 'support@company.com',
      description: 'Reply-to email address',
    },
    // Single Email Recipients
    {
      id: 'toEmail',
      title: 'To Email',
      type: 'short-input',
      layout: 'half',
      placeholder: 'recipient@example.com',
      condition: { field: 'campaignType', value: 'single' },
      required: true,
    },
    {
      id: 'ccEmail',
      title: 'CC Email',
      type: 'short-input',
      layout: 'half',
      placeholder: 'cc@example.com',
      condition: { field: 'campaignType', value: 'single' },
      description: 'Carbon copy recipients (comma-separated)',
    },
    {
      id: 'bccEmail',
      title: 'BCC Email',
      type: 'short-input',
      layout: 'full',
      placeholder: 'bcc@example.com',
      condition: { field: 'campaignType', value: 'single' },
      description: 'Blind carbon copy recipients (comma-separated)',
    },
    // Bulk Campaign Recipients
    {
      id: 'recipientList',
      title: 'Recipient List',
      type: 'code',
      layout: 'full',
      language: 'json',
      placeholder: `[
  {
    "email": "john@example.com",
    "name": "John Doe",
    "customFields": {
      "firstName": "John",
      "company": "Tech Corp",
      "segment": "premium"
    }
  },
  {
    "email": "jane@example.com",
    "name": "Jane Smith",
    "customFields": {
      "firstName": "Jane",
      "company": "Design Studio",
      "segment": "standard"
    }
  }
]`,
      condition: {
        field: 'campaignType',
        value: ['bulk', 'newsletter', 'ab_test'],
      },
      required: true,
      rows: 15,
      description: 'List of recipients with personalization data',
    },
    // Drip Campaign Configuration
    {
      id: 'dripSequence',
      title: 'Drip Sequence',
      type: 'table',
      layout: 'full',
      columns: ['Email Template', 'Delay (days)', 'Trigger Condition', 'Stop Condition'],
      condition: { field: 'campaignType', value: 'drip' },
      description: 'Configure email sequence with timing and conditions',
    },
    {
      id: 'subject',
      title: 'Email Subject',
      type: 'long-input',
      layout: 'full',
      placeholder: 'Welcome {{firstName}}! Your account is ready',
      required: true,
      rows: 2,
      description: 'Email subject with personalization variables',
    },
    // A/B Test Configuration
    {
      id: 'abTestConfig',
      title: 'A/B Test Configuration',
      type: 'code',
      layout: 'full',
      language: 'json',
      placeholder: `{
  "testName": "Subject Line Test",
  "variants": [
    {
      "name": "Variant A",
      "percentage": 50,
      "subject": "Welcome to our platform!",
      "content": "template_a.html"
    },
    {
      "name": "Variant B",
      "percentage": 50,
      "subject": "Your account is ready!",
      "content": "template_b.html"
    }
  ],
  "winningCriteria": "open_rate",
  "testDuration": 24,
  "autoSelectWinner": true
}`,
      condition: { field: 'campaignType', value: 'ab_test' },
      required: true,
      rows: 12,
      description: 'A/B test configuration with variants and criteria',
    },
    {
      id: 'emailTemplate',
      title: 'Email Template',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Rich HTML Template', id: 'html' },
        { label: 'Plain Text', id: 'text' },
        { label: 'Markdown', id: 'markdown' },
        { label: 'Saved Template', id: 'saved' },
        { label: 'External Template URL', id: 'url' },
      ],
      value: () => 'html',
    },
    {
      id: 'templatePriority',
      title: 'Template Priority',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'High', id: 'high' },
        { label: 'Normal', id: 'normal' },
        { label: 'Low', id: 'low' },
      ],
      value: () => 'normal',
      description: 'Email delivery priority',
    },
    {
      id: 'htmlContent',
      title: 'HTML Content',
      type: 'code',
      layout: 'full',
      language: 'html',
      placeholder: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .content { margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    .button { display: inline-block; padding: 12px 24px; background: #007cba; color: white; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome {{firstName}}!</h1>
    </div>
    
    <div class="content">
      <p>Thank you for joining {{companyName}}. We're excited to have you on board!</p>
      
      <p>Here's what you can do next:</p>
      <ul>
        <li>Complete your profile setup</li>
        <li>Explore our features</li>
        <li>Connect with your team</li>
      </ul>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="{{activationLink}}" class="button">Get Started</a>
      </p>
    </div>
    
    <div class="footer">
      <p>If you have any questions, reply to this email or contact our support team.</p>
      <p><a href="{{unsubscribeLink}}">Unsubscribe</a> | <a href="{{preferencesLink}}">Email Preferences</a></p>
    </div>
  </div>
</body>
</html>`,
      condition: { field: 'emailTemplate', value: 'html' },
      required: true,
      rows: 25,
      wandConfig: {
        enabled: true,
        maintainHistory: true,
        prompt: `Create a professional HTML email template based on the user's requirements.

Current context: {context}

Generate a complete HTML email template that includes:
1. Responsive design for mobile and desktop
2. Professional styling with inline CSS
3. Personalization variables using {{variable}} syntax
4. Call-to-action buttons
5. Footer with unsubscribe and preferences links
6. Accessibility features

Return only the HTML code:`,
        placeholder: 'Describe the email template you need...',
        generationType: 'custom-tool-schema',
      },
    },
    {
      id: 'textContent',
      title: 'Plain Text Content',
      type: 'code',
      layout: 'full',
      language: 'text',
      placeholder: `Welcome {{firstName}}!

Thank you for joining {{companyName}}. We're excited to have you on board!

Here's what you can do next:
- Complete your profile setup
- Explore our features  
- Connect with your team

Get started here: {{activationLink}}

If you have any questions, reply to this email or contact our support team.

To unsubscribe: {{unsubscribeLink}}
Email preferences: {{preferencesLink}}`,
      condition: { field: 'emailTemplate', value: 'text' },
      required: true,
      rows: 15,
      description: 'Plain text version of the email',
    },
    {
      id: 'savedTemplateId',
      title: 'Saved Template ID',
      type: 'dropdown',
      layout: 'full',
      condition: { field: 'emailTemplate', value: 'saved' },
      options: [
        { label: 'Welcome Email', id: 'welcome' },
        { label: 'Password Reset', id: 'password_reset' },
        { label: 'Invoice Notification', id: 'invoice' },
        { label: 'Newsletter Template', id: 'newsletter' },
        { label: 'Promotional Email', id: 'promo' },
      ],
      required: true,
    },
    {
      id: 'templateUrl',
      title: 'Template URL',
      type: 'long-input',
      layout: 'full',
      placeholder: 'https://example.com/templates/email-template.html',
      condition: { field: 'emailTemplate', value: 'url' },
      required: true,
      rows: 2,
      description: 'URL to fetch email template',
    },
    {
      id: 'personalizationData',
      title: 'Personalization Data',
      type: 'code',
      layout: 'full',
      language: 'json',
      placeholder: `{
  "firstName": "John",
  "lastName": "Doe",
  "companyName": "Tech Solutions",
  "activationLink": "https://app.example.com/activate/abc123",
  "unsubscribeLink": "https://example.com/unsubscribe/token",
  "preferencesLink": "https://example.com/preferences/token"
}`,
      description: 'Data for template personalization',
      rows: 8,
    },
    {
      id: 'attachments',
      title: 'Attachments',
      type: 'table',
      layout: 'full',
      columns: ['File Name', 'File URL/Path', 'Content Type'],
      description: 'Files to attach to the email',
    },
    {
      id: 'scheduling',
      title: 'Email Scheduling',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Send Immediately', id: 'immediate' },
        { label: 'Schedule for Later', id: 'scheduled' },
        { label: 'Optimal Time', id: 'optimal' },
        { label: 'Trigger Based', id: 'trigger' },
      ],
      value: () => 'immediate',
    },
    {
      id: 'scheduledTime',
      title: 'Scheduled Time',
      type: 'time-input',
      layout: 'half',
      condition: { field: 'scheduling', value: 'scheduled' },
      required: true,
      description: 'When to send the email',
    },
    {
      id: 'timezone',
      title: 'Timezone',
      type: 'dropdown',
      layout: 'full',
      condition: {
        field: 'scheduling',
        value: ['scheduled', 'optimal'],
      },
      options: [
        { label: 'UTC', id: 'UTC' },
        { label: 'Eastern Time', id: 'America/New_York' },
        { label: 'Pacific Time', id: 'America/Los_Angeles' },
        { label: 'Central European Time', id: 'Europe/Berlin' },
      ],
      value: () => 'UTC',
    },
    {
      id: 'trackingEnabled',
      title: 'Enable Email Tracking',
      type: 'switch',
      layout: 'half',
      description: 'Track opens, clicks, and engagement',
      value: () => true,
    },
    {
      id: 'trackingOptions',
      title: 'Tracking Options',
      type: 'checkbox-list',
      layout: 'full',
      condition: { field: 'trackingEnabled', value: true },
      options: [
        { label: 'Open Tracking', id: 'opens' },
        { label: 'Click Tracking', id: 'clicks' },
        { label: 'Bounce Tracking', id: 'bounces' },
        { label: 'Unsubscribe Tracking', id: 'unsubscribes' },
        { label: 'Spam Report Tracking', id: 'spam' },
      ],
      value: () => ['opens', 'clicks', 'bounces'],
      description: 'Types of email engagement to track',
    },
    {
      id: 'rateLimiting',
      title: 'Enable Rate Limiting',
      type: 'switch',
      layout: 'half',
      condition: {
        field: 'campaignType',
        value: ['bulk', 'newsletter'],
      },
      description: 'Control email sending rate',
    },
    {
      id: 'emailsPerHour',
      title: 'Emails per Hour',
      type: 'slider',
      layout: 'full',
      min: 10,
      max: 1000,
      step: 10,
      value: () => '100',
      condition: { field: 'rateLimiting', value: true },
      description: 'Maximum emails to send per hour',
    },
    {
      id: 'bounceHandling',
      title: 'Bounce Handling',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Automatic', id: 'automatic' },
        { label: 'Manual Review', id: 'manual' },
        { label: 'Ignore', id: 'ignore' },
      ],
      value: () => 'automatic',
      description: 'How to handle bounced emails',
    },
    {
      id: 'suppressionList',
      title: 'Use Suppression List',
      type: 'switch',
      layout: 'half',
      description: 'Exclude unsubscribed and bounced emails',
      value: () => true,
    },
  ],
  tools: {
    access: ['email_automation'],
  },
  inputs: {
    emailProvider: { type: 'string', description: 'Email service provider' },
    campaignType: { type: 'string', description: 'Type of email campaign' },
    smtpHost: { type: 'string', description: 'SMTP server host' },
    smtpPort: { type: 'string', description: 'SMTP server port' },
    smtpUsername: { type: 'string', description: 'SMTP username' },
    smtpPassword: { type: 'string', description: 'SMTP password' },
    smtpSecurity: { type: 'string', description: 'SMTP security protocol' },
    apiKey: { type: 'string', description: 'Email provider API key' },
    fromEmail: { type: 'string', description: 'Sender email address' },
    fromName: { type: 'string', description: 'Sender display name' },
    replyTo: { type: 'string', description: 'Reply-to email address' },
    toEmail: { type: 'string', description: 'Recipient email address' },
    ccEmail: { type: 'string', description: 'CC email addresses' },
    bccEmail: { type: 'string', description: 'BCC email addresses' },
    recipientList: { type: 'json', description: 'List of bulk recipients' },
    dripSequence: { type: 'json', description: 'Drip campaign sequence configuration' },
    subject: { type: 'string', description: 'Email subject line' },
    abTestConfig: { type: 'json', description: 'A/B test configuration' },
    emailTemplate: { type: 'string', description: 'Email template type' },
    templatePriority: { type: 'string', description: 'Email delivery priority' },
    htmlContent: { type: 'string', description: 'HTML email content' },
    textContent: { type: 'string', description: 'Plain text email content' },
    savedTemplateId: { type: 'string', description: 'Saved template identifier' },
    templateUrl: { type: 'string', description: 'External template URL' },
    personalizationData: { type: 'json', description: 'Template personalization data' },
    attachments: { type: 'json', description: 'Email attachments' },
    scheduling: { type: 'string', description: 'Email scheduling option' },
    scheduledTime: { type: 'string', description: 'Scheduled send time' },
    timezone: { type: 'string', description: 'Timezone for scheduling' },
    trackingEnabled: { type: 'boolean', description: 'Enable email tracking' },
    trackingOptions: { type: 'json', description: 'Email tracking options' },
    rateLimiting: { type: 'boolean', description: 'Enable rate limiting' },
    emailsPerHour: { type: 'number', description: 'Emails per hour limit' },
    bounceHandling: { type: 'string', description: 'Bounce handling strategy' },
    suppressionList: { type: 'boolean', description: 'Use suppression list' },
  },
  outputs: {
    campaignId: { type: 'string', description: 'Unique campaign identifier' },
    messageIds: { type: 'array', description: 'Individual message IDs' },
    status: { type: 'string', description: 'Campaign status' },
    totalSent: { type: 'number', description: 'Total emails sent' },
    totalFailed: { type: 'number', description: 'Total emails failed' },
    scheduledCount: { type: 'number', description: 'Emails scheduled for later' },
    sendingRate: { type: 'number', description: 'Current sending rate per hour' },
    estimatedCompletion: { type: 'string', description: 'Estimated completion time' },
    trackingUrls: { type: 'json', description: 'Email tracking URLs' },
    deliveryStats: { type: 'json', description: 'Initial delivery statistics' },
    bounces: { type: 'array', description: 'Bounced email addresses' },
    unsubscribes: { type: 'array', description: 'Unsubscribed email addresses' },
    errors: { type: 'array', description: 'Send errors and failures' },
    abTestResults: { type: 'json', description: 'A/B test preliminary results' },
    cost: { type: 'number', description: 'Campaign cost estimate' },
    error: { type: 'string', description: 'Error message if campaign failed' },
  },
}
