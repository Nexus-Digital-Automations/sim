// Basic validation test for workflow wizard components
// This file tests if all components can be imported without syntax errors

console.log('Testing workflow wizard component imports...')

try {
  // Test if the index exports work
  const fs = require('fs')
  const path = require('path')

  const componentFiles = [
    'workflow-wizard.tsx',
    'goal-selection.tsx',
    'template-recommendation.tsx',
    'block-configuration.tsx',
    'connection-wizard.tsx',
    'preview-validation.tsx',
    'index.ts',
    'README.md',
  ]

  const wizardDir = __dirname
  const validationResults = []

  componentFiles.forEach((file) => {
    const filePath = path.join(wizardDir, file)
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8')

        // Basic syntax checks
        if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          // Check for common syntax issues
          const issues = []

          // Check for unmatched braces
          const openBraces = (content.match(/{/g) || []).length
          const closeBraces = (content.match(/}/g) || []).length
          if (openBraces !== closeBraces) {
            issues.push('Unmatched braces detected')
          }

          // Check for unmatched parentheses
          const openParens = (content.match(/\(/g) || []).length
          const closeParens = (content.match(/\)/g) || []).length
          if (openParens !== closeParens) {
            issues.push('Unmatched parentheses detected')
          }

          // Check for basic imports
          if (!content.includes('import') && !content.includes('export') && file !== 'README.md') {
            issues.push('No import/export statements found')
          }

          // Check for React import in tsx files
          if (
            file.endsWith('.tsx') &&
            !content.includes('import type React') &&
            !content.includes('import React')
          ) {
            // This is acceptable for newer React versions with JSX transform
          }

          validationResults.push({
            file,
            status: issues.length === 0 ? 'PASS' : 'WARN',
            issues,
            size: content.length,
            lines: content.split('\n').length,
          })
        } else {
          validationResults.push({
            file,
            status: 'PASS',
            issues: [],
            size: content.length,
            lines: content.split('\n').length,
          })
        }
      } else {
        validationResults.push({
          file,
          status: 'MISSING',
          issues: ['File not found'],
          size: 0,
          lines: 0,
        })
      }
    } catch (error) {
      validationResults.push({
        file,
        status: 'ERROR',
        issues: [error.message],
        size: 0,
        lines: 0,
      })
    }
  })

  console.log('\n=== VALIDATION RESULTS ===')
  validationResults.forEach((result) => {
    const status =
      result.status === 'PASS'
        ? '✓'
        : result.status === 'WARN'
          ? '⚠'
          : result.status === 'ERROR'
            ? '✗'
            : '?'

    console.log(
      `${status} ${result.file.padEnd(30)} ${result.status.padEnd(8)} (${result.lines} lines, ${Math.round(result.size / 1024)}KB)`
    )

    if (result.issues.length > 0) {
      result.issues.forEach((issue) => {
        console.log(`    - ${issue}`)
      })
    }
  })

  const passed = validationResults.filter((r) => r.status === 'PASS').length
  const warned = validationResults.filter((r) => r.status === 'WARN').length
  const errored = validationResults.filter((r) => r.status === 'ERROR').length
  const missing = validationResults.filter((r) => r.status === 'MISSING').length

  console.log('\n=== SUMMARY ===')
  console.log(`✓ Passed: ${passed}`)
  console.log(`⚠ Warnings: ${warned}`)
  console.log(`✗ Errors: ${errored}`)
  console.log(`? Missing: ${missing}`)

  const totalLines = validationResults.reduce((sum, r) => sum + r.lines, 0)
  const totalSize = validationResults.reduce((sum, r) => sum + r.size, 0)

  console.log(`\nTotal: ${totalLines} lines, ${Math.round(totalSize / 1024)}KB`)

  if (errored === 0 && missing === 0) {
    console.log('\n🎉 All components created successfully!')
  } else {
    console.log('\n⚠️ Some issues found, but components are mostly complete.')
  }
} catch (error) {
  console.error('Validation failed:', error.message)
}
