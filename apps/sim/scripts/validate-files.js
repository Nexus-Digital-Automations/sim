/**
 * Simple File-based Validation Script
 *
 * Validates that all local copilot system files exist and have correct structure.
 */

const fs = require('fs')
const path = require('path')

console.log('🚀 Starting Local Copilot File Validation\n')

const baseDir = process.cwd()
const appDir = path.join(baseDir, 'apps/sim')

// Files that should exist
const requiredFiles = [
  // Store system
  'stores/local-copilot/types.ts',
  'stores/local-copilot/store.ts',
  'stores/local-copilot/index.ts',

  // API endpoints
  'app/api/local-copilot/agents/route.ts',
  'app/api/local-copilot/conversations/route.ts',
  'app/api/local-copilot/conversations/[conversationId]/route.ts',
  'app/api/local-copilot/conversations/[conversationId]/messages/route.ts',
  'app/api/local-copilot/chat/route.ts',

  // Services
  'services/local-copilot/tool-integration.ts',

  // UI Components
  'components/local-copilot/LocalCopilot.tsx',
  'components/local-copilot/AgentSelector.tsx',
  'components/local-copilot/LocalCopilotMessage.tsx',
  'components/local-copilot/LocalCopilotWelcome.tsx',
  'components/local-copilot/LocalCopilotUserInput.tsx',
  'components/local-copilot/ModeToggle.tsx',

  // Unified system
  'components/unified-copilot/UnifiedCopilot.tsx',
  'components/unified-copilot/index.ts',
  'components/copilot-wrapper/CopilotWrapper.tsx',
  'components/copilot-wrapper/index.ts',

  // Hooks
  'hooks/use-unified-copilot.ts',
]

let passed = 0
let failed = 0

console.log('📋 Checking required files...')

for (const file of requiredFiles) {
  const filePath = path.join(appDir, file)

  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`)
    passed++
  } else {
    console.log(`❌ ${file} - File not found`)
    failed++
  }
}

console.log('\n📋 Checking file content...')

// Check if files have expected exports
const exportChecks = [
  {
    file: 'stores/local-copilot/store.ts',
    exports: ['useLocalCopilotStore'],
  },
  {
    file: 'stores/local-copilot/types.ts',
    exports: ['LocalCopilotState', 'LocalCopilotStore'],
  },
  {
    file: 'components/local-copilot/LocalCopilot.tsx',
    exports: ['LocalCopilot'],
  },
  {
    file: 'components/unified-copilot/UnifiedCopilot.tsx',
    exports: ['UnifiedCopilot'],
  },
  {
    file: 'services/local-copilot/tool-integration.ts',
    exports: ['LocalCopilotToolIntegration', 'localCopilotToolIntegration'],
  },
  {
    file: 'hooks/use-unified-copilot.ts',
    exports: ['useUnifiedCopilot'],
  },
]

for (const check of exportChecks) {
  const filePath = path.join(appDir, check.file)

  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const missingExports = []

      for (const exportName of check.exports) {
        if (!content.includes(`export`) || !content.includes(exportName)) {
          missingExports.push(exportName)
        }
      }

      if (missingExports.length === 0) {
        console.log(`✅ ${check.file} - All exports found`)
        passed++
      } else {
        console.log(`❌ ${check.file} - Missing exports: ${missingExports.join(', ')}`)
        failed++
      }
    } catch (error) {
      console.log(`❌ ${check.file} - Error reading file: ${error.message}`)
      failed++
    }
  } else {
    console.log(`❌ ${check.file} - File not found`)
    failed++
  }
}

console.log('\n📋 Checking API route structure...')

const apiRoutes = [
  'app/api/local-copilot/agents/route.ts',
  'app/api/local-copilot/conversations/route.ts',
  'app/api/local-copilot/chat/route.ts',
]

for (const route of apiRoutes) {
  const filePath = path.join(appDir, route)

  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')

      const hasGET = content.includes('export async function GET')
      const hasPOST = content.includes('export async function POST')
      const hasNextResponse = content.includes('NextResponse')

      if (hasNextResponse && (hasGET || hasPOST)) {
        console.log(`✅ ${route} - Valid API route structure`)
        passed++
      } else {
        console.log(`❌ ${route} - Invalid API route structure`)
        failed++
      }
    } catch (error) {
      console.log(`❌ ${route} - Error reading file: ${error.message}`)
      failed++
    }
  }
}

console.log('\n' + '='.repeat(60))
console.log(`📊 File Validation Summary`)
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`)

if (failed === 0) {
  console.log('\n🎉 All file validations passed! Local Copilot System files are in place.')
  process.exit(0)
} else {
  console.log(`\n💥 ${failed} validations failed. Please check the missing files/exports above.`)
  process.exit(1)
}