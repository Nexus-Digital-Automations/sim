import path, { resolve } from 'path'
/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

const nextEnv = require('@next/env')
const { loadEnvConfig } = nextEnv.default || nextEnv

const projectDir = process.cwd()
loadEnvConfig(projectDir)

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['**/blocks/**/*.test.{ts,tsx}'],
    exclude: [...configDefaults.exclude, '**/node_modules/**', '**/dist/**'],
    setupFiles: ['./vitest.blocks.setup.ts'],
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
  resolve: {
    alias: [
      {
        find: '@/lib/logs/console/logger',
        replacement: path.resolve(__dirname, 'lib/logs/console/logger.ts'),
      },
      {
        find: '@/blocks/types',
        replacement: path.resolve(__dirname, 'blocks/types.ts'),
      },
      { find: '@/lib', replacement: path.resolve(__dirname, 'lib') },
      {
        find: '@/executor',
        replacement: path.resolve(__dirname, 'executor'),
      },
      { find: '@/blocks', replacement: path.resolve(__dirname, 'blocks') },
      { find: '@', replacement: path.resolve(__dirname) },
    ],
  },
})
