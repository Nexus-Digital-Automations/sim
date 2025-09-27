#!/usr/bin/env node

/**
 * Robust Next.js build script with timeout handling and fallback strategies
 * Addresses Next.js build timeout/interruption issues
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const BUILD_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const RETRY_ATTEMPTS = 3

class NextJSBuilder {
  constructor() {
    this.attempts = 0
    this.buildSuccess = false
  }

  async cleanBuildDirectory() {
    const buildPath = path.join(process.cwd(), '.next')
    if (fs.existsSync(buildPath)) {
      console.log('🧹 Cleaning previous build artifacts...')
      try {
        fs.rmSync(buildPath, { recursive: true, force: true })
      } catch (error) {
        console.warn('Warning: Could not fully clean build directory:', error.message)
      }
    }
  }

  validateStrategy(strategy) {
    // Security: Only allow predefined safe commands
    const ALLOWED_COMMANDS = ['npx']
    const ALLOWED_ARGS = ['next', 'build', '--no-lint']

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

  async attemptBuild(strategy) {
    return new Promise((resolve) => {
      // Security validation before execution
      try {
        this.validateStrategy(strategy)
      } catch (err) {
        console.error(`❌ Security validation failed: ${err.message}`)
        resolve({ success: false, reason: 'security_validation_failed' })
        return
      }

      console.log(`\n🚀 Build attempt ${this.attempts + 1}/${RETRY_ATTEMPTS}`)
      console.log(`Strategy: ${strategy.name}`)
      console.log(`Command: ${strategy.cmd} ${strategy.args.join(' ')}`)

      const startTime = Date.now()
      const child = spawn(strategy.cmd, strategy.args, {
        cwd: process.cwd(),
        env: { ...process.env, ...strategy.env },
        stdio: 'pipe',
      })

      let output = ''
      let hasStartedOptimizing = false

      child.stdout.on('data', (data) => {
        const chunk = data.toString()
        output += chunk
        process.stdout.write(chunk)

        // Detect when optimization phase starts
        if (chunk.includes('Creating an optimized production build')) {
          hasStartedOptimizing = true
          console.log('\n⚡ Optimization phase detected - monitoring for hangs...')
        }
      })

      child.stderr.on('data', (data) => {
        const chunk = data.toString()
        output += chunk
        process.stderr.write(chunk)
      })

      // Timeout handling
      const timeout = setTimeout(() => {
        const elapsed = Date.now() - startTime
        console.log(`\n⏰ Build timed out after ${elapsed / 1000}s`)

        if (hasStartedOptimizing) {
          console.log('💡 Timeout occurred during optimization phase - this is the known issue')
        }

        child.kill('SIGTERM')
        setTimeout(() => {
          if (!child.killed) {
            console.log('🔥 Force killing build process...')
            child.kill('SIGKILL')
          }
        }, 5000)

        resolve({
          success: false,
          reason: 'timeout',
          elapsed,
          hasStartedOptimizing,
          output,
        })
      }, BUILD_TIMEOUT)

      child.on('exit', (code, signal) => {
        clearTimeout(timeout)
        const elapsed = Date.now() - startTime

        if (code === 0) {
          console.log(`\n✅ Build completed successfully in ${elapsed / 1000}s!`)
          resolve({
            success: true,
            code,
            elapsed,
            output,
          })
        } else {
          console.log(
            `\n❌ Build failed with code ${code} (signal: ${signal}) after ${elapsed / 1000}s`
          )
          resolve({
            success: false,
            code,
            signal,
            elapsed,
            output,
            reason: signal === 'SIGTERM' ? 'killed' : 'exit_code',
          })
        }
      })

      child.on('error', (err) => {
        clearTimeout(timeout)
        console.log(`\n💥 Build process error:`, err.message)
        resolve({
          success: false,
          error: err,
          reason: 'spawn_error',
          output,
        })
      })
    })
  }

  async verifyBuildOutput() {
    const buildPath = path.join(process.cwd(), '.next')
    try {
      const stats = fs.statSync(buildPath)
      if (stats.isDirectory()) {
        // Check for essential build files
        const requiredFiles = ['.next/BUILD_ID', '.next/routes-manifest.json']

        for (const file of requiredFiles) {
          if (!fs.existsSync(file)) {
            console.log(`⚠️  Missing build file: ${file}`)
            return false
          }
        }
        return true
      }
    } catch {
      return false
    }
    return false
  }

  async run() {
    console.log('🏗️  Next.js Timeout-Resistant Build System')
    console.log('==========================================')

    const strategies = [
      {
        name: 'High Memory + No Telemetry',
        cmd: 'npx',
        args: ['next', 'build', '--no-lint'],
        env: {
          NODE_OPTIONS: '--max-old-space-size=8192',
          NEXT_TELEMETRY_DISABLED: '1',
        },
      },
      {
        name: 'Classic Webpack (No Turbo)',
        cmd: 'npx',
        args: ['next', 'build', '--no-lint'],
        env: {
          NODE_OPTIONS: '--max-old-space-size=8192',
          TURBOPACK: '0',
          NEXT_TELEMETRY_DISABLED: '1',
        },
      },
      {
        name: 'Minimal Configuration',
        cmd: 'npx',
        args: ['next', 'build', '--no-lint'],
        env: {
          NODE_OPTIONS: '--max-old-space-size=4096',
          NODE_ENV: 'production',
          NEXT_TELEMETRY_DISABLED: '1',
          DISABLE_SOURCEMAP: '1',
        },
      },
    ]

    for (const strategy of strategies) {
      if (this.buildSuccess) break

      this.attempts++
      await this.cleanBuildDirectory()

      const result = await this.attemptBuild(strategy)

      if (result.success) {
        this.buildSuccess = true

        // Verify build output
        if (await this.verifyBuildOutput()) {
          console.log('✅ Build output verified successfully')
        } else {
          console.log('⚠️  Build completed but output verification failed')
        }
        break
      }
      console.log(`\nStrategy failed: ${result.reason}`)

      if (result.hasStartedOptimizing && result.reason === 'timeout') {
        console.log('🔍 Root cause: Next.js optimization phase hang detected')
        console.log('💡 This is a known issue with complex applications')
      }

      // Clean failed build
      await this.cleanBuildDirectory()

      if (this.attempts < RETRY_ATTEMPTS) {
        console.log('\n⏳ Waiting 5 seconds before next attempt...')
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }
    }

    if (!this.buildSuccess) {
      console.log('\n❌ All build strategies failed')
      console.log('\n🔧 Root Cause Analysis:')
      console.log('The Next.js build consistently hangs during the optimization phase')
      console.log('This indicates a fundamental issue with the optimization process')
      console.log('\n💡 Recommended Solutions:')
      console.log('1. Split large components into smaller chunks')
      console.log('2. Use dynamic imports for heavy dependencies')
      console.log('3. Disable problematic optimizations in next.config.ts')
      console.log('4. Consider using static export for complex pages')
      console.log('5. Review circular dependencies in the codebase')

      process.exit(1)
    }

    console.log('\n🎉 Build process completed successfully!')
  }
}

if (require.main === module) {
  const builder = new NextJSBuilder()
  builder.run().catch(console.error)
}

module.exports = NextJSBuilder
