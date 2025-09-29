import path, { resolve } from 'path'
/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { configDefaults, defineConfig } from 'vitest/config'

const nextEnv = require('@next/env')
const { loadEnvConfig } = nextEnv.default || nextEnv

const projectDir = process.cwd()
loadEnvConfig(projectDir)

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.{ts,tsx}'],
    exclude: [...configDefaults.exclude, '**/node_modules/**', '**/dist/**'],
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@sim/db': resolve(DIRNAME, '../../packages/db'),
    },
  },
  resolve: {
    alias: [
      {
        find: '@sim/db',
        replacement: path.resolve(DIRNAME, '../../packages/db'),
      },
      {
        find: '@/lib/logs/console/logger',
        replacement: path.resolve(DIRNAME, 'lib/logs/console/logger.ts'),
      },
      {
        find: '@/stores/console/store',
        replacement: path.resolve(DIRNAME, 'stores/console/store.ts'),
      },
      {
        find: '@/stores/execution/store',
        replacement: path.resolve(DIRNAME, 'stores/execution/store.ts'),
      },
      {
        find: '@/blocks/types',
        replacement: path.resolve(DIRNAME, 'blocks/types.ts'),
      },
      {
        find: '@/serializer/types',
        replacement: path.resolve(DIRNAME, 'serializer/types.ts'),
      },
      { find: '@/lib', replacement: path.resolve(DIRNAME, 'lib') },
      { find: '@/stores', replacement: path.resolve(DIRNAME, 'stores') },
      {
        find: '@/components',
        replacement: path.resolve(DIRNAME, 'components'),
      },
      { find: '@/app', replacement: path.resolve(DIRNAME, 'app') },
      { find: '@/api', replacement: path.resolve(DIRNAME, 'app/api') },
      {
        find: '@/executor',
        replacement: path.resolve(DIRNAME, 'executor'),
      },
      {
        find: '@/providers',
        replacement: path.resolve(DIRNAME, 'providers'),
      },
      { find: '@/tools', replacement: path.resolve(DIRNAME, 'tools') },
      { find: '@/blocks', replacement: path.resolve(DIRNAME, 'blocks') },
      {
        find: '@/serializer',
        replacement: path.resolve(DIRNAME, 'serializer'),
      },
      { find: '@', replacement: path.resolve(DIRNAME) },
    ],
  },
})
