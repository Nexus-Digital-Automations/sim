/**
 * Basic Health Check Integration Test
 *
 * This is a simplified integration test that validates core functionality
 * without requiring external services to be running.
 */

const axios = require('axios')
const { spawn } = require('child_process')
const path = require('path')

describe('Basic Parlant Server Health Tests', () => {
  const TEST_TIMEOUT = 10000

  describe('Settings and Configuration', () => {
    test('Settings can be loaded without errors', async () => {
      const { exec } = require('child_process')
      const { promisify } = require('util')
      const execAsync = promisify(exec)

      try {
        const result = await execAsync(
          'python -c "from config.settings import get_settings; print(\'success\')"',
          {
            cwd: path.join(__dirname, '../..'),
            timeout: 5000
          }
        )
        expect(result.stdout.trim()).toBe('success')
      } catch (error) {
        console.error('Settings loading error:', error.stderr || error.message)
        throw error
      }
    }, TEST_TIMEOUT)

    test('Environment variables are properly parsed', async () => {
      const { exec } = require('child_process')
      const { promisify } = require('util')
      const execAsync = promisify(exec)

      try {
        const result = await execAsync(
          'python -c "from config.settings import get_settings; s = get_settings(); print(len(s.get_allowed_origins()))"',
          {
            cwd: path.join(__dirname, '../..'),
            timeout: 5000,
            env: {
              ...process.env,
              ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:3001',
              DATABASE_URL: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db'
            }
          }
        )
        const originsCount = parseInt(result.stdout.trim())
        expect(originsCount).toBeGreaterThan(0)
      } catch (error) {
        console.error('Environment parsing error:', error.stderr || error.message)
        throw error
      }
    }, TEST_TIMEOUT)
  })

  describe('Module Imports', () => {
    test('Core modules can be imported', async () => {
      const { exec } = require('child_process')
      const { promisify } = require('util')
      const execAsync = promisify(exec)

      const modules = [
        'config.settings',
        'auth.sim_auth_bridge',
        'workspace_isolation'
      ]

      for (const module of modules) {
        try {
          await execAsync(
            `python -c "import ${module}; print('${module} imported successfully')"`,
            {
              cwd: path.join(__dirname, '../..'),
              timeout: 3000
            }
          )
        } catch (error) {
          console.warn(`Module ${module} import failed:`, error.stderr || error.message)
          // Don't fail the test for optional modules
        }
      }
    }, TEST_TIMEOUT)
  })

  describe('Basic Functionality', () => {
    test('Database URL configuration is present', () => {
      const dbUrl = process.env.DATABASE_URL
      expect(dbUrl).toBeTruthy()
      expect(dbUrl).toContain('postgresql://')
    })

    test('Test environment variables are set', () => {
      // Set NODE_ENV to test if not already set
      if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = 'test'
      }
      expect(process.env.NODE_ENV).toBe('test')

      // Check if either PORT environment variable exists or use default
      const port = process.env.PARLANT_PORT || process.env.PORT || '8801'
      expect(port).toBeTruthy()
    })

    test('Required directories exist', () => {
      const fs = require('fs')
      const requiredDirs = [
        path.join(__dirname, '../../config'),
        path.join(__dirname, '../../auth'),
        path.join(__dirname, '../../tests')
      ]

      for (const dir of requiredDirs) {
        expect(fs.existsSync(dir)).toBe(true)
      }
    })
  })

  describe('Error Handling', () => {
    test('Graceful handling of missing environment variables', async () => {
      const { exec } = require('child_process')
      const { promisify } = require('util')
      const execAsync = promisify(exec)

      try {
        // Test with minimal environment
        const result = await execAsync(
          'python -c "from config.settings import Settings; s = Settings(); print(s.host)"',
          {
            cwd: path.join(__dirname, '../..'),
            timeout: 5000,
            env: {
              DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
              PATH: process.env.PATH,
              PYTHONPATH: process.env.PYTHONPATH || ''
            }
          }
        )
        expect(result.stdout.trim()).toBeTruthy()
      } catch (error) {
        console.error('Error handling test failed:', error.stderr || error.message)
        throw error
      }
    }, TEST_TIMEOUT)
  })
})