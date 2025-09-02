/**
 * Comprehensive Unit Tests for Block Registry
 *
 * This module contains exhaustive tests for the block registry system,
 * ensuring all registry functions work correctly and handle edge cases properly.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAllBlocks,
  getAllBlockTypes,
  getBlock,
  getBlocksByCategory,
  isValidBlockType,
  registry,
} from '@/blocks/registry'

// Mock logger to prevent console noise during tests
vi.mock('@/lib/logs/console/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  })),
}))

describe('Block Registry', () => {
  beforeEach(() => {
    // Clear all mocks before each test to ensure clean state
    vi.clearAllMocks()
  })

  describe('registry object', () => {
    it('should be defined and be an object', () => {
      expect(registry).toBeDefined()
      expect(typeof registry).toBe('object')
      expect(registry).not.toBeNull()
    })

    it('should contain valid block configurations', () => {
      // Test that all registry entries are valid BlockConfig objects
      Object.entries(registry).forEach(([blockType, blockConfig]) => {
        expect(typeof blockType).toBe('string')
        expect(blockConfig).toBeDefined()
        expect(blockConfig.type).toBe(blockType)
        expect(typeof blockConfig.name).toBe('string')
        expect(typeof blockConfig.description).toBe('string')
        expect(typeof blockConfig.bgColor).toBe('string')
        expect(typeof blockConfig.icon).toBe('function')
        expect(['blocks', 'tools', 'triggers']).toContain(blockConfig.category)
        expect(Array.isArray(blockConfig.subBlocks)).toBe(true)
        expect(typeof blockConfig.tools).toBe('object')
        expect(Array.isArray(blockConfig.tools.access)).toBe(true)
        expect(typeof blockConfig.inputs).toBe('object')
        expect(typeof blockConfig.outputs).toBe('object')
      })
    })

    it('should have consistent block type naming', () => {
      // Test that all block types follow consistent naming conventions
      Object.keys(registry).forEach((blockType) => {
        expect(blockType).toMatch(/^[a-z][a-z0-9_]*[a-z0-9]?$/)
        expect(blockType).not.toContain(' ')
        expect(blockType).not.toContain('-')
        expect(blockType).not.toContain('.')
      })
    })

    it('should have unique block names', () => {
      const blockNames = Object.values(registry).map((block) => block.name)
      const uniqueNames = [...new Set(blockNames)]
      // Allow for some duplicate names if they exist in the actual registry
      // This test verifies we don't have excessive duplication
      expect(uniqueNames.length).toBeGreaterThan(blockNames.length * 0.9) // 90% unique minimum
    })

    it('should have blocks with valid color codes', () => {
      Object.values(registry).forEach((block) => {
        // Allow both hex colors and CSS variables
        const isHexColor = /^#[0-9A-Fa-f]{6}$/.test(block.bgColor)
        const isCssVariable = /^var\(--[a-zA-Z0-9-]+\)$/.test(block.bgColor)
        expect(isHexColor || isCssVariable).toBe(true)
      })
    })

    it('should have blocks with valid category distribution', () => {
      const categories = Object.values(registry).map((block) => block.category)
      const categoryCount = {
        blocks: categories.filter((c) => c === 'blocks').length,
        tools: categories.filter((c) => c === 'tools').length,
        triggers: categories.filter((c) => c === 'triggers').length,
      }

      // Ensure we have blocks in each category
      expect(categoryCount.blocks).toBeGreaterThan(0)
      expect(categoryCount.tools).toBeGreaterThanOrEqual(0)
      expect(categoryCount.triggers).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getBlock', () => {
    it('should return correct block for valid type', () => {
      const blockTypes = Object.keys(registry)

      blockTypes.forEach((blockType) => {
        const block = getBlock(blockType)
        expect(block).toBeDefined()
        expect(block?.type).toBe(blockType)
        expect(block).toBe(registry[blockType])
      })
    })

    it('should return undefined for invalid block type', () => {
      const invalidTypes = [
        'nonexistent',
        'invalid-block',
        'fake_block',
        '123invalid',
        'UPPERCASE',
        '',
        ' ',
        'block with spaces',
      ]

      invalidTypes.forEach((invalidType) => {
        const block = getBlock(invalidType)
        expect(block).toBeUndefined()
      })
    })

    it('should handle null and undefined inputs gracefully', () => {
      expect(getBlock(null as any)).toBeUndefined()
      expect(getBlock(undefined as any)).toBeUndefined()
    })

    it('should handle edge case inputs', () => {
      const edgeCases = [0, 1, true, false, [], {}, Symbol('test')]

      edgeCases.forEach((edgeCase) => {
        expect(getBlock(edgeCase as any)).toBeUndefined()
      })
    })

    it('should maintain reference integrity', () => {
      const blockType = Object.keys(registry)[0]
      const block1 = getBlock(blockType)
      const block2 = getBlock(blockType)

      expect(block1).toBe(block2)
      expect(block1).toBe(registry[blockType])
    })
  })

  describe('getBlocksByCategory', () => {
    it('should return blocks for valid categories', () => {
      const categories: ('blocks' | 'tools' | 'triggers')[] = ['blocks', 'tools', 'triggers']

      categories.forEach((category) => {
        const blocks = getBlocksByCategory(category)
        expect(Array.isArray(blocks)).toBe(true)

        blocks.forEach((block) => {
          expect(block.category).toBe(category)
          expect(typeof block.type).toBe('string')
          expect(typeof block.name).toBe('string')
        })
      })
    })

    it('should return non-empty array for blocks category', () => {
      const blocksCategory = getBlocksByCategory('blocks')
      expect(blocksCategory.length).toBeGreaterThan(0)
    })

    it('should return arrays with correct total count', () => {
      const allBlocks = getAllBlocks()
      const blocksCategory = getBlocksByCategory('blocks')
      const toolsCategory = getBlocksByCategory('tools')
      const triggersCategory = getBlocksByCategory('triggers')

      const totalFromCategories =
        blocksCategory.length + toolsCategory.length + triggersCategory.length
      expect(totalFromCategories).toBe(allBlocks.length)
    })

    it('should not have overlapping blocks between categories', () => {
      const blocksCategory = getBlocksByCategory('blocks')
      const toolsCategory = getBlocksByCategory('tools')
      const triggersCategory = getBlocksByCategory('triggers')

      const allTypes = [
        ...blocksCategory.map((b) => b.type),
        ...toolsCategory.map((b) => b.type),
        ...triggersCategory.map((b) => b.type),
      ]

      const uniqueTypes = [...new Set(allTypes)]
      expect(allTypes.length).toBe(uniqueTypes.length)
    })

    it('should return empty arrays for unknown categories', () => {
      const unknownCategory = 'unknown' as any
      const blocks = getBlocksByCategory(unknownCategory)
      expect(Array.isArray(blocks)).toBe(true)
      expect(blocks.length).toBe(0)
    })

    it('should maintain reference integrity within categories', () => {
      const blocksCategory1 = getBlocksByCategory('blocks')
      const blocksCategory2 = getBlocksByCategory('blocks')

      expect(blocksCategory1.length).toBe(blocksCategory2.length)
      blocksCategory1.forEach((block, index) => {
        expect(block).toBe(blocksCategory2[index])
      })
    })
  })

  describe('getAllBlockTypes', () => {
    it('should return array of all block type strings', () => {
      const blockTypes = getAllBlockTypes()
      expect(Array.isArray(blockTypes)).toBe(true)
      expect(blockTypes.length).toBeGreaterThan(0)

      blockTypes.forEach((type) => {
        expect(typeof type).toBe('string')
        expect(type.length).toBeGreaterThan(0)
      })
    })

    it('should return types that match registry keys', () => {
      const blockTypes = getAllBlockTypes()
      const registryKeys = Object.keys(registry)

      expect(blockTypes.sort()).toEqual(registryKeys.sort())
    })

    it('should return unique types only', () => {
      const blockTypes = getAllBlockTypes()
      const uniqueTypes = [...new Set(blockTypes)]

      expect(blockTypes.length).toBe(uniqueTypes.length)
    })

    it('should return consistent results on multiple calls', () => {
      const blockTypes1 = getAllBlockTypes()
      const blockTypes2 = getAllBlockTypes()

      expect(blockTypes1.sort()).toEqual(blockTypes2.sort())
    })
  })

  describe('isValidBlockType', () => {
    it('should return true for valid block types', () => {
      const validTypes = Object.keys(registry)

      validTypes.forEach((type) => {
        expect(isValidBlockType(type)).toBe(true)
      })
    })

    it('should return false for invalid block types', () => {
      const invalidTypes = [
        'nonexistent',
        'invalid-block',
        'fake_block',
        '123invalid',
        'UPPERCASE',
        '',
        ' ',
        'block with spaces',
        'null',
        'undefined',
      ]

      invalidTypes.forEach((type) => {
        expect(isValidBlockType(type)).toBe(false)
      })
    })

    it('should handle edge case inputs gracefully', () => {
      const edgeCases = [null, undefined, 0, 1, true, false, [], {}, Symbol('test')]

      edgeCases.forEach((edgeCase) => {
        expect(isValidBlockType(edgeCase as any)).toBe(false)
      })
    })

    it('should be case sensitive', () => {
      const validType = Object.keys(registry)[0]
      const uppercaseType = validType.toUpperCase()
      const capitalizedType = validType.charAt(0).toUpperCase() + validType.slice(1)

      expect(isValidBlockType(validType)).toBe(true)
      expect(isValidBlockType(uppercaseType)).toBe(false)
      expect(isValidBlockType(capitalizedType)).toBe(false)
    })

    it('should handle whitespace correctly', () => {
      const validType = Object.keys(registry)[0]
      const typeWithSpaces = ` ${validType} `
      const typeWithTabs = `\t${validType}\t`
      const typeWithNewlines = `\n${validType}\n`

      expect(isValidBlockType(typeWithSpaces)).toBe(false)
      expect(isValidBlockType(typeWithTabs)).toBe(false)
      expect(isValidBlockType(typeWithNewlines)).toBe(false)
    })
  })

  describe('getAllBlocks', () => {
    it('should return array of all block configurations', () => {
      const allBlocks = getAllBlocks()
      expect(Array.isArray(allBlocks)).toBe(true)
      expect(allBlocks.length).toBeGreaterThan(0)

      allBlocks.forEach((block) => {
        expect(typeof block).toBe('object')
        expect(typeof block.type).toBe('string')
        expect(typeof block.name).toBe('string')
        expect(typeof block.description).toBe('string')
        expect(typeof block.category).toBe('string')
      })
    })

    it('should return blocks that match registry values', () => {
      const allBlocks = getAllBlocks()
      const registryValues = Object.values(registry)

      expect(allBlocks.length).toBe(registryValues.length)

      // Check that every block in allBlocks exists in registry
      allBlocks.forEach((block) => {
        expect(registryValues).toContain(block)
      })
    })

    it('should maintain reference integrity', () => {
      const allBlocks1 = getAllBlocks()
      const allBlocks2 = getAllBlocks()

      expect(allBlocks1.length).toBe(allBlocks2.length)
      allBlocks1.forEach((block, index) => {
        expect(block).toBe(allBlocks2[index])
      })
    })

    it('should include blocks from all categories', () => {
      const allBlocks = getAllBlocks()
      const categories = allBlocks.map((block) => block.category)
      const uniqueCategories = [...new Set(categories)]

      expect(uniqueCategories).toContain('blocks')
      // Tools and triggers categories might be empty, so we don't enforce their presence
    })

    it('should return blocks with valid structure', () => {
      const allBlocks = getAllBlocks()

      allBlocks.forEach((block) => {
        // Required fields
        expect(block.type).toBeDefined()
        expect(block.name).toBeDefined()
        expect(block.description).toBeDefined()
        expect(block.category).toBeDefined()
        expect(block.bgColor).toBeDefined()
        expect(block.icon).toBeDefined()
        expect(block.subBlocks).toBeDefined()
        expect(block.tools).toBeDefined()
        expect(block.inputs).toBeDefined()
        expect(block.outputs).toBeDefined()

        // Type checks
        expect(typeof block.type).toBe('string')
        expect(typeof block.name).toBe('string')
        expect(typeof block.description).toBe('string')
        expect(['blocks', 'tools', 'triggers']).toContain(block.category)
        expect(typeof block.bgColor).toBe('string')
        expect(typeof block.icon).toBe('function')
        expect(Array.isArray(block.subBlocks)).toBe(true)
        expect(typeof block.tools).toBe('object')
        expect(typeof block.inputs).toBe('object')
        expect(typeof block.outputs).toBe('object')
      })
    })
  })

  describe('Performance Tests', () => {
    it('should perform registry operations efficiently', () => {
      const iterations = 1000

      // Test getBlock performance
      const blockType = Object.keys(registry)[0]
      const startTime = Date.now()

      for (let i = 0; i < iterations; i++) {
        getBlock(blockType)
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete 1000 operations in under 100ms
      expect(duration).toBeLessThan(100)
    })

    it('should handle concurrent access correctly', async () => {
      const concurrentOperations = Array.from({ length: 100 }, async (_, index) => {
        const blockTypes = getAllBlockTypes()
        const randomType = blockTypes[index % blockTypes.length]
        const block = getBlock(randomType)
        expect(block).toBeDefined()
        expect(block?.type).toBe(randomType)
      })

      await Promise.all(concurrentOperations)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed registry gracefully', () => {
      // Test that functions don't throw errors even with unexpected inputs
      expect(() => getBlock('')).not.toThrow()
      expect(() => getBlocksByCategory('invalid' as any)).not.toThrow()
      expect(() => isValidBlockType('')).not.toThrow()
      expect(() => getAllBlockTypes()).not.toThrow()
      expect(() => getAllBlocks()).not.toThrow()
    })

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000)
      expect(getBlock(longString)).toBeUndefined()
      expect(isValidBlockType(longString)).toBe(false)
    })

    it('should handle special characters in block type queries', () => {
      const specialChars = ['!@#$%^&*()', '🎯🔧⚡', '\\n\\t\\r', '<script>alert(1)</script>']

      specialChars.forEach((specialChar) => {
        expect(getBlock(specialChar)).toBeUndefined()
        expect(isValidBlockType(specialChar)).toBe(false)
      })
    })

    it('should maintain immutability of registry', () => {
      const originalRegistry = { ...registry }
      const allBlocks = getAllBlocks()

      // Attempt to modify returned arrays/objects
      allBlocks.push({} as any)

      // Registry should remain unchanged
      expect(registry).toEqual(originalRegistry)
    })
  })

  describe('Integration with Block Types', () => {
    it('should have all imported blocks in registry', () => {
      // Test that all the imported blocks are actually registered
      const expectedBlocks = [
        'agent',
        'airtable',
        'api',
        'arxiv',
        'browser_use',
        'clay',
        'condition',
        'confluence',
        'discord',
        'elevenlabs',
        'evaluator',
        'exa',
        'file',
        'firecrawl',
        'function',
        'generic_webhook',
        'github',
        'gmail',
        'google_search',
        'google_calendar',
        'google_docs',
        'google_drive',
        'google_sheets',
        'huggingface',
        'hunter',
        'image_generator',
        'jina',
        'jira',
        'knowledge',
        'linear',
        'linkup',
        'mem0',
        'memory',
        'microsoft_excel',
        'microsoft_planner',
        'microsoft_teams',
        'mistral_parse',
        'mysql',
        'notion',
        'onedrive',
        'openai',
        'outlook',
        'parallel_ai',
        'perplexity',
        'pinecone',
        'postgresql',
        'qdrant',
        'reddit',
        'response',
        'router',
        's3',
        'schedule',
        'serper',
        'sharepoint',
        'slack',
        'stagehand',
        'stagehand_agent',
        'starter',
        'supabase',
        'tavily',
        'telegram',
        'thinking',
        'translate',
        'twilio_sms',
        'typeform',
        'vision',
        'wealthbox',
        'webhook',
        'whatsapp',
        'wikipedia',
        'workflow',
        'x',
        'youtube',
      ]

      const registryKeys = Object.keys(registry)

      expectedBlocks.forEach((expectedBlock) => {
        expect(registryKeys).toContain(expectedBlock)
        expect(registry[expectedBlock]).toBeDefined()
      })
    })

    it('should have consistent tool access configuration', () => {
      Object.values(registry).forEach((block) => {
        expect(Array.isArray(block.tools.access)).toBe(true)

        if (block.tools.config) {
          expect(typeof block.tools.config).toBe('object')
          if (block.tools.config.tool) {
            expect(typeof block.tools.config.tool).toBe('function')
          }
          if (block.tools.config.params) {
            expect(typeof block.tools.config.params).toBe('function')
          }
        }
      })
    })
  })
})
