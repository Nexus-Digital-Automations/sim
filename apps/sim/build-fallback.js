#!/usr/bin/env node

/**
 * Fallback build script for Next.js timeout issues
 * This script implements multiple build strategies with timeout handling
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const MAX_BUILD_TIME = 10 * 60 * 1000 // 10 minutes max
const STRATEGIES = [
  {
    Name: 'Standard Build',
    cmd: 'next',
    args: ['build'],
    env: { NODE_OPTIONS: '--max-old-space-size=8192' },
  },
  {
    Name: 'Classic Webpack Build',
    cmd: 'next',
    args: ['build'],
    env: {
      NODE_OPTIONS: '--max-old-space-size=8192',
      TURBOPACK: '0',
    },
  },
  {
    Name: 'Minimal Build',
    cmd: 'next',
    args: ['build'],
    env: {
      NODE_OPTIONS: '--max-old-space-size=8192',
      NEXT_TELEMETRY_DISABLED: '1',
      NODE_ENV: 'production',
    },
  },
]

function validateStrategy(strategy) {
  // Security: Only allow predefined safe commands
  const ALLOWED_COMMANDS = ['next']
  const ALLOWED_ARGS = ['build']

  if (!ALLOWED_COMMANDS.includes(strategy.cmd)) {
    throw new Error(`Security: Command '${strategy.cmd}' not in allowlist`)
  }

  for (const arg of strategy.args) {
    if (!ALLOWED_ARGS.includes(arg)) {
      throw new Error(`Security: Argument '${arg}' not in allowlist`)
    }
  }

  return true
}

async function tryBuildStrategy(strategy, timeout = MAX_BUILD_TIME) {
  return new Promise((resolve) => {
    // Security validation before execution
    try {
      validateStrategy(strategy)
    } catch (err) {
      console.error(`❌ Security validation failed: ${err.message}`)
      resolve({ success: false, reason: 'security_validation_failed' })
      return
    }

    console.log(`\n🚀 Attempting: ${strategy.Name}`)
    console.log(`Command: ${strategy.cmd} ${strategy.args.join(' ')}`)

    // SECURITY: Safe command execution with predefined strategies
    // strategy.cmd and strategy.args are from internal predefined build strategies
    // No user input is accepted - only safe build commands are used
    // semgrep-ignore: javascript.lang.security.detect-child-process.detect-child-process
    const child = spawn(strategy.cmd, strategy.args, {
      cwd: process.cwd(),
      env: { ...process.env, ...strategy.env },
      stdio: 'inherit',
    })

    const timer = setTimeout(() => {
      console.log(`⏰ ${strategy.Name} timed out after ${timeout / 1000}s`)
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 5000)
      resolve({ success: false, reason: 'timeout' })
    }, timeout)

    child.on('exit', (code) => {
      clearTimeout(timer)
      if (code === 0) {
        console.log(`✅ ${strategy.Name} completed successfully!`)
        resolve({ success: true, code })
      } else {
        console.log(`❌ ${strategy.Name} failed with code ${code}`)
        resolve({ success: false, code, reason: 'exit_code' })
      }
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      console.log(`💥 ${strategy.Name} errored:`, err.message)
      resolve({ success: false, error: err, reason: 'error' })
    })
  })
}

async function checkBuildOutput() {
  const buildPath = path.join(process.cwd(), '.next')
  try {
    const stats = fs.statSync(buildPath)
    return stats.isDirectory()
  } catch {
    return false
  }
}

async function main() {
  console.log('🏗️ Next.js Build Fallback System')
  console.log('================================')

  // Check if we're in the right directory
  if (!fs.existsSync('next.config.ts') && !fs.existsSync('next.config.js')) {
    console.error('❌ No Next.js config found. Run this from the Next.js app directory.')
    process.exit(1)
  }

  // Clean previous build
  const buildPath = path.join(process.cwd(), '.next')
  if (fs.existsSync(buildPath)) {
    console.log('🧹 Cleaning previous build...')
    fs.rmSync(buildPath, { recursive: true, force: true })
  }

  let buildSucceeded = false

  for (const strategy of STRATEGIES) {
    if (buildSucceeded) break

    const result = await tryBuildStrategy(strategy, MAX_BUILD_TIME)

    if (result.success) {
      buildSucceeded = true
      console.log('✅ Build completed successfully!')

      // Verify build output
      if (await checkBuildOutput()) {
        console.log('✅ Build output verified')
      } else {
        console.log('⚠️  Build succeeded but output verification failed')
      }
      break
    }
    console.log(`Strategy failed: ${result.reason}`)

    // Clean up failed build artifacts
    if (fs.existsSync(buildPath)) {
      try {
        fs.rmSync(buildPath, { recursive: true, force: true })
      } catch (e) {
        console.log('Warning: Could not clean failed build artifacts')
      }
    }
  }

  if (!buildSucceeded) {
    console.log('\n❌ All build strategies failed')
    console.log('\n🔧 Troubleshooting suggestions:')
    console.log('1. Check for circular dependencies in your code')
    console.log('2. Reduce bundle size by code splitting')
    console.log('3. Disable experimental features in next.config')
    console.log('4. Check for infinite loops in React components')
    console.log('5. Consider using static export for problematic pages')
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}
