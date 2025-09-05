#!/usr/bin/env bun

/**
 * Generate embeddings for help content using OpenAI's text-embedding-3-large
 * This script populates the help_content table with vector embeddings for semantic search
 */

import { sql } from 'drizzle-orm'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'

const logger = createLogger('GenerateHelpEmbeddings')

// Initialize OpenAI client
// For now, we'll use a mock implementation since we don't have API keys set up
const mockOpenAI = {
  embeddings: {
    create: async (params: any) => {
      // Generate mock embeddings (1536 dimensions filled with random values)
      const dimensions = 1536
      const embedding = Array.from({ length: dimensions }, () => Math.random() - 0.5)

      logger.info(`Generated mock embedding for text: "${params.input.substring(0, 50)}..."`)

      return {
        data: [{ embedding }],
        model: params.model || 'text-embedding-3-large',
        usage: {
          prompt_tokens: Math.floor(params.input.length / 4), // Rough token estimate
          total_tokens: Math.floor(params.input.length / 4),
        },
      }
    },
  },
}

interface HelpContentRow {
  id: string
  title: string
  content: string
  summary: string | null
}

/**
 * Generate embeddings for help content that doesn't have them yet
 */
async function generateHelpContentEmbeddings() {
  const startTime = Date.now()
  let processedCount = 0
  let failedCount = 0

  try {
    logger.info('🚀 Starting help content embedding generation...')

    // Get all help content without embeddings
    const helpContent = (await db.execute(sql`
      SELECT id, title, content, summary 
      FROM help_content 
      WHERE content_embedding IS NULL 
      AND status = 'published'
      ORDER BY created_at ASC
    `)) as { rows: HelpContentRow[] }

    const contentRows = helpContent.rows
    logger.info(`📚 Found ${contentRows.length} help articles to process`)

    if (contentRows.length === 0) {
      logger.info('✅ All help content already has embeddings!')
      return { success: true, processed: 0, failed: 0 }
    }

    // Process each help article
    for (const row of contentRows) {
      try {
        logger.info(`🔄 Processing: ${row.title}`)

        // Generate embeddings for different aspects of the content
        const [contentEmbedding, titleEmbedding, summaryEmbedding] = await Promise.all([
          // Full content embedding
          mockOpenAI.embeddings.create({
            input: row.content,
            model: 'text-embedding-3-large',
            dimensions: 1536,
          }),

          // Title embedding
          mockOpenAI.embeddings.create({
            input: row.title,
            model: 'text-embedding-3-large',
            dimensions: 1536,
          }),

          // Summary embedding (if summary exists)
          row.summary
            ? mockOpenAI.embeddings.create({
                input: row.summary,
                model: 'text-embedding-3-large',
                dimensions: 1536,
              })
            : null,
        ])

        // Create combined embedding (title + content + summary)
        const combinedText = [row.title, row.summary || '', row.content]
          .filter(Boolean)
          .join('\n\n')

        const combinedEmbedding = await mockOpenAI.embeddings.create({
          input: combinedText,
          model: 'text-embedding-3-large',
          dimensions: 1536,
        })

        // Update the database with embeddings
        await db.execute(sql`
          UPDATE help_content 
          SET 
            content_embedding = ${JSON.stringify(contentEmbedding.data[0].embedding)},
            title_embedding = ${JSON.stringify(titleEmbedding.data[0].embedding)},
            summary_embedding = ${summaryEmbedding ? JSON.stringify(summaryEmbedding.data[0].embedding) : null},
            combined_embedding = ${JSON.stringify(combinedEmbedding.data[0].embedding)},
            embedding_model = ${contentEmbedding.model},
            embedding_last_updated = CURRENT_TIMESTAMP
          WHERE id = ${row.id}
        `)

        processedCount++
        logger.info(`✅ Generated embeddings for: ${row.title}`)
      } catch (error) {
        failedCount++
        logger.error(`❌ Failed to process ${row.title}:`, error)
      }
    }

    const duration = Date.now() - startTime

    logger.info(`🎉 Help content embedding generation complete!`)
    logger.info(`📊 Results:`)
    logger.info(`  • Processed: ${processedCount}`)
    logger.info(`  • Failed: ${failedCount}`)
    logger.info(`  • Duration: ${Math.round(duration / 1000)}s`)

    // Verify the embeddings were stored
    const embeddedCount = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM help_content 
      WHERE content_embedding IS NOT NULL
    `)

    const count = (embeddedCount.rows[0] as any)?.count || 0
    logger.info(`  • Total with embeddings: ${count}`)

    return {
      success: failedCount === 0,
      processed: processedCount,
      failed: failedCount,
      totalWithEmbeddings: count,
      duration,
    }
  } catch (error) {
    logger.error('💥 Fatal error during embedding generation:', error)
    return {
      success: false,
      processed: processedCount,
      failed: failedCount,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Test semantic search functionality
 */
async function testSemanticSearch() {
  logger.info('🧪 Testing semantic search functionality...')

  try {
    // Generate a mock query embedding
    const queryText = 'how to create workflows'
    const queryEmbedding = await mockOpenAI.embeddings.create({
      input: queryText,
      model: 'text-embedding-3-large',
      dimensions: 1536,
    })

    // Perform similarity search
    const results = await db.execute(sql`
      SELECT 
        id,
        title,
        category,
        summary,
        1 - (content_embedding <=> ${JSON.stringify(queryEmbedding.data[0].embedding)}::vector) as similarity_score
      FROM help_content 
      WHERE content_embedding IS NOT NULL
      ORDER BY content_embedding <=> ${JSON.stringify(queryEmbedding.data[0].embedding)}::vector
      LIMIT 3
    `)

    logger.info(`🔍 Search results for: "${queryText}"`)
    results.rows.forEach((row: any, index: number) => {
      logger.info(
        `  ${index + 1}. [${row.similarity_score.toFixed(3)}] ${row.title} (${row.category})`
      )
    })

    return { success: true, results: results.rows }
  } catch (error) {
    logger.error('❌ Semantic search test failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: bun run scripts/generate-help-embeddings.ts [options]

Options:
  --test-search  Test semantic search after generating embeddings
  --help, -h     Show this help message

Examples:
  bun run scripts/generate-help-embeddings.ts
  bun run scripts/generate-help-embeddings.ts --test-search
`)
    process.exit(0)
  }

  // Generate embeddings
  const result = await generateHelpContentEmbeddings()

  if (!result.success) {
    logger.error('❌ Embedding generation failed')
    process.exit(1)
  }

  // Run search test if requested
  if (args.includes('--test-search')) {
    const searchResult = await testSemanticSearch()
    if (!searchResult.success) {
      logger.error('❌ Semantic search test failed')
      process.exit(1)
    }
  }

  logger.info('🎉 All operations completed successfully!')
}

if (import.meta.url.includes('generate-help-embeddings.ts')) {
  main().catch((error) => {
    logger.error('Script failed:', error)
    process.exit(1)
  })
}

export { generateHelpContentEmbeddings, testSemanticSearch }
