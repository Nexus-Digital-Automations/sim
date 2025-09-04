#!/usr/bin/env node

/**
 * 🚀 QUICK START MIGRATION SCRIPT
 *
 * Interactive script to help developers choose the right migration template
 * and set up their API tests with proper patterns and configurations.
 *
 * Usage:
 *   node quick-start.js
 *   node quick-start.js --endpoint=/api/users --type=crud
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  header: (msg) => console.log(`${colors.bright}${colors.blue}🚀 ${msg}${colors.reset}`),
}

// Template configurations
const templates = {
  general: {
    file: 'migration-template.test.ts',
    name: 'General Purpose API',
    description: 'Standard REST API endpoints with basic CRUD operations',
    placeholders: ['ENDPOINT_NAME'],
    features: ['Authentication', 'Database mocking', 'Basic validation', 'Error handling'],
  },
  auth: {
    file: 'templates/auth-api-template.test.ts', 
    name: 'Authentication API',
    description: 'Login, registration, password management, session handling',
    placeholders: ['AUTH_ENDPOINT'],
    features: ['Session management', 'OAuth flows', 'Password validation', 'Security testing'],
  },
  crud: {
    file: 'templates/crud-api-template.test.ts',
    name: 'CRUD Operations API',
    description: 'Create, Read, Update, Delete operations with advanced database patterns',
    placeholders: ['RESOURCE_NAME'],
    features: ['Complete CRUD', 'Pagination', 'Filtering', 'Bulk operations', 'Sorting'],
  },
  file: {
    file: 'templates/file-upload-api-template.test.ts',
    name: 'File Upload/Management API',
    description: 'File uploads, downloads, media processing, storage operations',
    placeholders: ['FILE_ENDPOINT'],
    features: ['Multipart handling', 'File validation', 'Storage mocking', 'Image processing'],
  },
  integration: {
    file: 'templates/external-integration-template.test.ts',
    name: 'External Integration API', 
    description: 'Third-party services, webhooks, external API integrations',
    placeholders: ['INTEGRATION_NAME'],
    features: ['API mocking', 'Webhook validation', 'OAuth', 'Rate limiting', 'Retry logic'],
  },
}

// Command line argument parsing
function parseArgs() {
  const args = process.argv.slice(2)
  const parsed = {}
  
  args.forEach(arg => {
    if (arg.startsWith('--endpoint=')) {
      parsed.endpoint = arg.split('=')[1]
    } else if (arg.startsWith('--type=')) {
      parsed.type = arg.split('=')[1]
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true
    }
  })
  
  return parsed
}

// Display help information
function showHelp() {
  log.header('API Test Migration Quick Start')
  console.log()
  console.log('Usage:')
  console.log('  node quick-start.js                    # Interactive mode')
  console.log('  node quick-start.js --endpoint=/api/users --type=crud')
  console.log()
  console.log('Options:')
  console.log('  --endpoint=<path>   Target API endpoint path')
  console.log('  --type=<template>   Template type (general, auth, crud, file, integration)')
  console.log('  --help, -h          Show this help message')
  console.log()
  console.log('Available template types:')
  Object.entries(templates).forEach(([key, template]) => {
    console.log(`  ${key.padEnd(12)} ${template.name}`)
  })
  console.log()
}

// Create readline interface for interactive input
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

// Ask user a question and return promise with answer
function ask(rl, question) {
  return new Promise(resolve => {
    rl.question(`${colors.cyan}?${colors.reset} ${question} `, resolve)
  })
}

// Display template options
function displayTemplateOptions() {
  console.log()
  log.info('Available migration templates:')
  console.log()
  
  Object.entries(templates).forEach(([key, template], index) => {
    console.log(`  ${colors.bright}${index + 1}.${colors.reset} ${colors.green}${template.name}${colors.reset}`)
    console.log(`     ${template.description}`)
    console.log(`     Features: ${template.features.join(', ')}`)
    console.log()
  })
}

// Get template choice from user
async function getTemplateChoice(rl, args) {
  if (args.type && templates[args.type]) {
    return args.type
  }

  displayTemplateOptions()
  
  while (true) {
    const choice = await ask(rl, 'Select a template (1-5 or type name):')
    
    // Handle numeric choice
    if (/^[1-5]$/.test(choice)) {
      const templateKeys = Object.keys(templates)
      return templateKeys[parseInt(choice) - 1]
    }
    
    // Handle template name
    if (templates[choice]) {
      return choice
    }
    
    log.error('Invalid choice. Please select 1-5 or a valid template name.')
  }
}

// Get endpoint information
async function getEndpointInfo(rl, args) {
  const endpoint = args.endpoint || await ask(rl, 'Enter the API endpoint path (e.g., /api/users):')
  
  if (!endpoint.startsWith('/api/')) {
    log.warning('Endpoint should typically start with /api/')
  }
  
  // Extract endpoint name for file naming
  const pathParts = endpoint.split('/').filter(Boolean)
  const endpointName = pathParts[pathParts.length - 1] || 'endpoint'
  
  return { endpoint, endpointName }
}

// Get destination path for the test file
async function getDestinationPath(rl, endpointInfo) {
  // Suggest path based on endpoint
  const suggestedPath = `app${endpointInfo.endpoint}/route.test.ts`
  const destinationPath = await ask(rl, `Test file path (${suggestedPath}):`) || suggestedPath
  
  return path.resolve(process.cwd(), destinationPath)
}

// Read and process template file
function processTemplate(templatePath, replacements) {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`)
  }
  
  let content = fs.readFileSync(templatePath, 'utf8')
  
  // Apply replacements
  Object.entries(replacements).forEach(([placeholder, value]) => {
    const regex = new RegExp(`\\[${placeholder}\\]`, 'g')
    content = content.replace(regex, value)
  })
  
  return content
}

// Create directory if it doesn't exist
function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    log.info(`Created directory: ${dir}`)
  }
}

// Generate replacement values based on template and input
function generateReplacements(templateKey, endpointInfo) {
  const template = templates[templateKey]
  const replacements = {}
  
  template.placeholders.forEach(placeholder => {
    switch (placeholder) {
      case 'ENDPOINT_NAME':
      case 'AUTH_ENDPOINT':
      case 'RESOURCE_NAME':
      case 'FILE_ENDPOINT':
      case 'INTEGRATION_NAME':
        replacements[placeholder] = endpointInfo.endpointName
        break
      default:
        replacements[placeholder] = endpointInfo.endpointName
    }
  })
  
  return replacements
}

// Display final summary and next steps
function displaySummary(templateKey, destinationPath, endpointInfo) {
  const template = templates[templateKey]
  
  console.log()
  log.success('Migration template created successfully!')
  console.log()
  log.info(`Template: ${template.name}`)
  log.info(`File: ${destinationPath}`)
  log.info(`Endpoint: ${endpointInfo.endpoint}`)
  console.log()
  
  console.log(`${colors.bright}Next Steps:${colors.reset}`)
  console.log('1. Review and customize the generated test file')
  console.log('2. Import your actual route handlers')
  console.log('3. Update test data to match your domain model')
  console.log('4. Run the tests: bun test ' + path.relative(process.cwd(), destinationPath))
  console.log('5. Follow the migration checklist for validation')
  console.log()
  
  console.log(`${colors.bright}Resources:${colors.reset}`)
  console.log('• Migration Guide: app/api/__test-utils__/comprehensive-migration-guide.md')
  console.log('• Migration Checklist: app/api/__test-utils__/migration-checklist.md')
  console.log('• Helper Utilities: app/api/__test-utils__/migration-helpers.ts')
  console.log()
}

// Main execution function
async function main() {
  const args = parseArgs()
  
  if (args.help) {
    showHelp()
    return
  }
  
  log.header('API Test Migration Quick Start')
  console.log()
  
  const rl = createReadlineInterface()
  
  try {
    // Get template choice
    const templateKey = await getTemplateChoice(rl, args)
    const template = templates[templateKey]
    
    log.info(`Selected template: ${template.name}`)
    
    // Get endpoint information
    const endpointInfo = await getEndpointInfo(rl, args)
    
    // Get destination path
    const destinationPath = await getDestinationPath(rl, endpointInfo)
    
    // Check if destination already exists
    if (fs.existsSync(destinationPath)) {
      const overwrite = await ask(rl, 'File already exists. Overwrite? (y/N):')
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        log.info('Migration cancelled.')
        return
      }
    }
    
    // Process template
    const templatePath = path.resolve(__dirname, template.file)
    const replacements = generateReplacements(templateKey, endpointInfo)
    
    log.info('Processing template...')
    const processedContent = processTemplate(templatePath, replacements)
    
    // Create destination file
    ensureDirectoryExists(destinationPath)
    fs.writeFileSync(destinationPath, processedContent, 'utf8')
    
    // Display summary
    displaySummary(templateKey, destinationPath, endpointInfo)
    
  } catch (error) {
    log.error(`Migration failed: ${error.message}`)
    process.exit(1)
  } finally {
    rl.close()
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log()
  log.info('Migration cancelled by user.')
  process.exit(0)
})

// Run the script
if (require.main === module) {
  main().catch(error => {
    log.error(`Unexpected error: ${error.message}`)
    process.exit(1)
  })
}

module.exports = {
  templates,
  parseArgs,
  processTemplate,
  generateReplacements,
}