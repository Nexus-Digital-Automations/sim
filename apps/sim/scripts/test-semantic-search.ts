#!/usr/bin/env bun

/**
 * Test semantic search functionality with help content
 * This script tests the integrated semantic search API and database queries
 */

import { semanticHelpSearch } from '@/lib/help/semantic-help-search'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('TestSemanticSearch')

/**
 * Test semantic search with various queries
 */
async function testSemanticSearch() {
  logger.info('🧪 Starting semantic search tests...')

  const testQueries = [
    {
      query: 'how to create workflows',
      description: 'Basic workflow creation query',
    },
    {
      query: 'troubleshooting errors',
      description: 'Troubleshooting query',
    },
    {
      query: 'getting started with automation',
      description: 'Getting started query',
    },
  ]

  for (const { query, description } of testQueries) {
    try {
      logger.info(`\n📋 Testing: ${description}`)
      logger.info(`Query: "${query}"`)

      const startTime = Date.now()

      // Test semantic search
      const semanticResults = await semanticHelpSearch.searchContent(query, {}, 1, 5, {
        useSemanticSearch: true,
        useHybridSearch: false,
        minSimilarityScore: 0.3,
      })

      const semanticTime = Date.now() - startTime

      logger.info(`✅ Semantic Search Results (${semanticTime}ms):`)
      logger.info(`   📊 Total: ${semanticResults.total}`)
      logger.info(`   📄 Documents: ${semanticResults.documents.length}`)
      logger.info(`   🔍 Search Method: ${semanticResults.searchMethod}`)

      semanticResults.documents.forEach((doc, index) => {
        const score = semanticResults.semanticScores?.[index]?.semanticScore
        logger.info(
          `   ${index + 1}. [${score?.toFixed(3) || 'N/A'}] ${doc.title} (${doc.metadata.category})`
        )
      })

      // Test hybrid search
      const hybridStartTime = Date.now()

      const hybridResults = await semanticHelpSearch.searchContent(query, {}, 1, 5, {
        useSemanticSearch: true,
        useHybridSearch: true,
        semanticWeight: 0.7,
        keywordWeight: 0.3,
        minSimilarityScore: 0.3,
      })

      const hybridTime = Date.now() - hybridStartTime

      logger.info(`✅ Hybrid Search Results (${hybridTime}ms):`)
      logger.info(`   📊 Total: ${hybridResults.total}`)
      logger.info(`   📄 Documents: ${hybridResults.documents.length}`)
      logger.info(`   🔍 Search Method: ${hybridResults.searchMethod}`)

      hybridResults.documents.forEach((doc, index) => {
        const scores = hybridResults.semanticScores?.[index]
        const semanticScore = scores?.semanticScore?.toFixed(3) || 'N/A'
        const keywordScore = scores?.keywordScore?.toFixed(3) || 'N/A'
        const hybridScore = scores?.hybridScore?.toFixed(3) || 'N/A'
        logger.info(
          `   ${index + 1}. [S:${semanticScore} K:${keywordScore} H:${hybridScore}] ${doc.title} (${doc.metadata.category})`
        )
      })

      // Test keyword search
      const keywordStartTime = Date.now()

      const keywordResults = await semanticHelpSearch.searchContent(query, {}, 1, 5, {
        useSemanticSearch: false,
      })

      const keywordTime = Date.now() - keywordStartTime

      logger.info(`✅ Keyword Search Results (${keywordTime}ms):`)
      logger.info(`   📊 Total: ${keywordResults.total}`)
      logger.info(`   📄 Documents: ${keywordResults.documents.length}`)
      logger.info(`   🔍 Search Method: ${keywordResults.searchMethod}`)

      keywordResults.documents.forEach((doc, index) => {
        logger.info(`   ${index + 1}. ${doc.title} (${doc.metadata.category})`)
      })

      logger.info(`\n⏱️  Performance Comparison:`)
      logger.info(`   🔍 Semantic: ${semanticTime}ms`)
      logger.info(`   🔀 Hybrid: ${hybridTime}ms`)
      logger.info(`   📝 Keyword: ${keywordTime}ms`)
    } catch (error) {
      logger.error(`❌ Test failed for query: "${query}"`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
    }
  }
}

/**
 * Test search with filters
 */
async function testSearchWithFilters() {
  logger.info('\n🔧 Testing search with filters...')

  try {
    const query = 'workflow automation'
    const filters = {
      categories: ['getting-started'],
      tags: ['tutorial', 'basics'],
    }

    const results = await semanticHelpSearch.searchContent(query, filters, 1, 10, {
      useSemanticSearch: true,
      useHybridSearch: true,
    })

    logger.info(`✅ Filtered Search Results:`)
    logger.info(`   📊 Total: ${results.total}`)
    logger.info(`   📄 Documents: ${results.documents.length}`)
    logger.info(`   🔍 Search Method: ${results.searchMethod}`)

    results.documents.forEach((doc, index) => {
      logger.info(`   ${index + 1}. ${doc.title} (${doc.metadata.category})`)
      logger.info(`      Tags: ${doc.tags.join(', ')}`)
    })
  } catch (error) {
    logger.error('❌ Filtered search test failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Test search performance under load
 */
async function testSearchPerformance() {
  logger.info('\n⚡ Testing search performance...')

  const queries = [
    'create workflow',
    'troubleshoot error',
    'api integration',
    'data processing',
    'automation best practices',
  ]

  const performanceResults = []

  for (let i = 0; i < 3; i++) {
    logger.info(`\n🔄 Performance test round ${i + 1}/3`)

    for (const query of queries) {
      const startTime = Date.now()

      try {
        await semanticHelpSearch.searchContent(query, {}, 1, 5, {
          useSemanticSearch: true,
          useHybridSearch: true,
        })

        const duration = Date.now() - startTime
        performanceResults.push({ query, duration, success: true })
        logger.info(`   ✅ "${query}": ${duration}ms`)
      } catch (error) {
        const duration = Date.now() - startTime
        performanceResults.push({ query, duration, success: false })
        logger.error(`   ❌ "${query}": ${duration}ms (failed)`)
      }
    }
  }

  // Calculate performance statistics
  const successfulResults = performanceResults.filter((r) => r.success)
  const avgDuration =
    successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length
  const minDuration = Math.min(...successfulResults.map((r) => r.duration))
  const maxDuration = Math.max(...successfulResults.map((r) => r.duration))
  const successRate = (successfulResults.length / performanceResults.length) * 100

  logger.info(`\n📊 Performance Summary:`)
  logger.info(`   ✅ Success Rate: ${successRate.toFixed(1)}%`)
  logger.info(`   ⏱️  Average Duration: ${avgDuration.toFixed(1)}ms`)
  logger.info(`   🚀 Fastest Query: ${minDuration}ms`)
  logger.info(`   🐌 Slowest Query: ${maxDuration}ms`)
  logger.info(`   📈 Total Tests: ${performanceResults.length}`)
}

/**
 * Main test function
 */
async function main() {
  try {
    logger.info('🚀 Starting comprehensive semantic search tests...')

    await testSemanticSearch()
    await testSearchWithFilters()
    await testSearchPerformance()

    logger.info('\n🎉 All semantic search tests completed successfully!')
  } catch (error) {
    logger.error('💥 Test suite failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    process.exit(1)
  }
}

if (import.meta.url.includes('test-semantic-search.ts')) {
  main().catch((error) => {
    logger.error('Test runner failed:', error)
    process.exit(1)
  })
}

export { testSemanticSearch, testSearchWithFilters, testSearchPerformance }
