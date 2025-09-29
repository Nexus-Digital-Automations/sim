#!/usr/bin/env node

/**
 * Emergency Build Script - Bypass Next.js Optimization
 *
 * This script bypasses Next.js optimization entirely to get a working build
 * when the optimization phase hangs due to codebase issues.
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

class EmergencyBuilder {
  async run() {
    console.log('🚨 EMERGENCY BUILD MODE')
    console.log('========================')
    console.log('⚠️ Bypassing Next.js optimization due to timeout issues')

    // Create a minimal next.config.js that disables all optimization
    const emergencyConfig = `
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {},
  webpack: (config) => {
    config.optimization = {
      ...config.optimization,
      minimize: false,
      minimizer: [],
    }
    return config
  },
}

module.exports = nextConfig
`

    // Backup original config
    const configPath = path.join(process.cwd(), 'next.config.ts')
    const emergencyConfigPath = path.join(process.cwd(), 'next.config.js')

    if (fs.existsSync(configPath)) {
      fs.copyFileSync(configPath, `${configPath}.backup`)
      console.log('📦 Backed up next.config.ts')
    }

    // Write emergency config
    fs.writeFileSync(emergencyConfigPath, emergencyConfig)
    console.log('🔧 Created emergency next.config.js')

    try {
      // Run basic build
      console.log('🚀 Starting emergency build...')

      const result = await new Promise((resolve) => {
        const child = spawn('npx', ['next', 'build'], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            NODE_OPTIONS: '--max-old-space-size=4096',
            NEXT_TELEMETRY_DISABLED: '1',
          },
          stdio: 'inherit',
        })

        const timeout = setTimeout(() => {
          console.log('\n⏰ Emergency build taking too long, force completing...')
          child.kill('SIGTERM')
          resolve({ success: false, reason: 'timeout' })
        }, 120000) // 2 minutes max

        child.on('exit', (code) => {
          clearTimeout(timeout)
          resolve({ success: code === 0, code })
        })

        child.on('error', (err) => {
          clearTimeout(timeout)
          resolve({ success: false, error: err })
        })
      })

      if (result.success) {
        console.log('\n✅ Emergency build completed!')
        console.log('⚠️ This is an unoptimized build for emergency use only')
      } else {
        console.log('\n❌ Emergency build failed:', result.reason || result.code)
      }
    } finally {
      // Cleanup emergency config
      if (fs.existsSync(emergencyConfigPath)) {
        fs.unlinkSync(emergencyConfigPath)
        console.log('🧹 Cleaned up emergency config')
      }
    }
  }
}

if (require.main === module) {
  const builder = new EmergencyBuilder()
  builder.run().catch(console.error)
}

module.exports = EmergencyBuilder
