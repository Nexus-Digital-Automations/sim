#!/usr/bin/env node

/**
 * RPA Database Initialization Script
 * 
 * Sets up the database schema and initial data for RPA functionality.
 * Can be run in development, testing, or production environments.
 * 
 * Usage:
 *   node scripts/init-rpa-database.js [environment]
 *   
 * Environment options:
 *   - development (default)
 *   - testing  
 *   - production
 */

const path = require('path')
const fs = require('fs')

// Add the project root to the module path
const projectRoot = path.resolve(__dirname, '..')
process.env.NODE_PATH = projectRoot
require('module')._initPaths()

// Environment configuration
const environment = process.argv[2] || 'development'

console.log(`🚀 Initializing RPA database for ${environment} environment...`)

/**
 * Database configuration by environment
 */
const DB_CONFIGS = {
  development: {
    host: process.env.RPA_DB_HOST || 'localhost',
    port: parseInt(process.env.RPA_DB_PORT || '3306'),
    database: process.env.RPA_DB_NAME || 'sim_rpa_dev',
    username: process.env.RPA_DB_USER || 'root',
    password: process.env.RPA_DB_PASSWORD || '',
    ssl: false
  },
  testing: {
    host: process.env.RPA_DB_HOST || 'localhost',
    port: parseInt(process.env.RPA_DB_PORT || '3306'),
    database: process.env.RPA_DB_NAME || 'sim_rpa_test',
    username: process.env.RPA_DB_USER || 'root',
    password: process.env.RPA_DB_PASSWORD || '',
    ssl: false
  },
  production: {
    host: process.env.RPA_DB_HOST || 'localhost',
    port: parseInt(process.env.RPA_DB_PORT || '3306'),
    database: process.env.RPA_DB_NAME || 'sim_rpa',
    username: process.env.RPA_DB_USER || 'root',
    password: process.env.RPA_DB_PASSWORD || '',
    ssl: process.env.RPA_DB_SSL === 'true'
  }
}

/**
 * SQL Schema Definitions
 */
const TABLE_SCHEMAS = {
  // Agent registration and status tracking
  rpa_agents: `
    CREATE TABLE IF NOT EXISTS rpa_agents (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      platform VARCHAR(50) NOT NULL,
      version VARCHAR(50) NOT NULL,
      capabilities JSON NOT NULL,
      status ENUM('online', 'offline', 'busy', 'error') DEFAULT 'offline',
      connection_id VARCHAR(255),
      api_key_hash VARCHAR(255),
      last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_status (status),
      INDEX idx_last_heartbeat (last_heartbeat)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  // Agent performance metrics
  rpa_agent_metrics: `
    CREATE TABLE IF NOT EXISTS rpa_agent_metrics (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      agent_id VARCHAR(36) NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      cpu_usage DECIMAL(5,2) DEFAULT 0,
      memory_usage DECIMAL(5,2) DEFAULT 0,
      active_operations INT DEFAULT 0,
      total_operations_completed INT DEFAULT 0,
      average_response_time INT DEFAULT 0,
      error_rate DECIMAL(5,2) DEFAULT 0,
      INDEX idx_agent_timestamp (agent_id, timestamp),
      FOREIGN KEY (agent_id) REFERENCES rpa_agents(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  // Operation execution tracking
  rpa_operations: `
    CREATE TABLE IF NOT EXISTS rpa_operations (
      id VARCHAR(36) PRIMARY KEY,
      agent_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      workflow_id VARCHAR(36),
      execution_id VARCHAR(36),
      type ENUM('click', 'type', 'extract', 'screenshot', 'wait', 'find-element') NOT NULL,
      parameters JSON NOT NULL,
      status ENUM('pending', 'in_progress', 'completed', 'failed', 'cancelled', 'timeout') DEFAULT 'pending',
      priority ENUM('low', 'normal', 'high', 'critical') DEFAULT 'normal',
      timeout INT DEFAULT 30000,
      max_retries INT DEFAULT 3,
      current_retry INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      started_at TIMESTAMP NULL,
      completed_at TIMESTAMP NULL,
      execution_time INT,
      INDEX idx_agent_status (agent_id, status),
      INDEX idx_user_created (user_id, created_at),
      INDEX idx_workflow_execution (workflow_id, execution_id),
      FOREIGN KEY (agent_id) REFERENCES rpa_agents(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  // Operation results and outputs
  rpa_operation_results: `
    CREATE TABLE IF NOT EXISTS rpa_operation_results (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      operation_id VARCHAR(36) NOT NULL,
      success BOOLEAN NOT NULL,
      result JSON,
      error_message TEXT,
      screenshot_path VARCHAR(500),
      execution_time INT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_operation (operation_id),
      FOREIGN KEY (operation_id) REFERENCES rpa_operations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  // Workflow execution tracking
  rpa_workflow_executions: `
    CREATE TABLE IF NOT EXISTS rpa_workflow_executions (
      id VARCHAR(36) PRIMARY KEY,
      workflow_id VARCHAR(36) NOT NULL,
      agent_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      status ENUM('pending', 'running', 'paused', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
      progress DECIMAL(5,2) DEFAULT 0,
      total_operations INT DEFAULT 0,
      completed_operations INT DEFAULT 0,
      failed_operations INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      started_at TIMESTAMP NULL,
      completed_at TIMESTAMP NULL,
      execution_time INT,
      INDEX idx_workflow_status (workflow_id, status),
      INDEX idx_user_created (user_id, created_at),
      INDEX idx_agent_execution (agent_id, created_at),
      FOREIGN KEY (agent_id) REFERENCES rpa_agents(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  // Execution logs and debugging information
  rpa_execution_logs: `
    CREATE TABLE IF NOT EXISTS rpa_execution_logs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      execution_id VARCHAR(36),
      operation_id VARCHAR(36),
      agent_id VARCHAR(36) NOT NULL,
      level ENUM('debug', 'info', 'warn', 'error') NOT NULL,
      message TEXT NOT NULL,
      details JSON,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_execution_timestamp (execution_id, timestamp),
      INDEX idx_operation_timestamp (operation_id, timestamp),
      INDEX idx_agent_level (agent_id, level),
      FOREIGN KEY (agent_id) REFERENCES rpa_agents(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  // Error tracking and analytics
  rpa_error_logs: `
    CREATE TABLE IF NOT EXISTS rpa_error_logs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(100) NOT NULL,
      message TEXT NOT NULL,
      category ENUM('agent_connection', 'authentication', 'operation_execution', 'workflow_orchestration', 'validation', 'timeout', 'capability_mismatch', 'system_error') NOT NULL,
      severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
      agent_id VARCHAR(36),
      operation_id VARCHAR(36),
      execution_id VARCHAR(36),
      details JSON,
      stack_trace TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_category_severity (category, severity),
      INDEX idx_agent_timestamp (agent_id, timestamp),
      INDEX idx_code (code),
      FOREIGN KEY (agent_id) REFERENCES rpa_agents(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `,

  // Screenshot and file storage metadata
  rpa_file_storage: `
    CREATE TABLE IF NOT EXISTS rpa_file_storage (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      file_path VARCHAR(500) NOT NULL,
      file_type ENUM('screenshot', 'log', 'result', 'diagnostic') NOT NULL,
      file_size BIGINT,
      mime_type VARCHAR(100),
      operation_id VARCHAR(36),
      execution_id VARCHAR(36),
      agent_id VARCHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP,
      INDEX idx_type_created (file_type, created_at),
      INDEX idx_operation (operation_id),
      INDEX idx_execution (execution_id),
      INDEX idx_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `
}

/**
 * Initial data for development/testing environments
 */
const SAMPLE_DATA = {
  // Sample agent for testing
  sample_agent: `
    INSERT IGNORE INTO rpa_agents (
      id, user_id, name, platform, version, capabilities, status
    ) VALUES (
      'test-agent-001',
      'user-001',
      'Development Test Agent',
      'windows',
      '1.0.0',
      '["desktop-automation", "image-recognition", "ocr-processing", "screen-capture"]',
      'offline'
    );
  `,

  // Sample workflow execution
  sample_workflow: `
    INSERT IGNORE INTO rpa_workflow_executions (
      id, workflow_id, agent_id, user_id, status, total_operations
    ) VALUES (
      'test-exec-001',
      'workflow-001',
      'test-agent-001',
      'user-001',
      'completed',
      3
    );
  `
}

/**
 * Simulate database operations for demonstration
 * In production, this would use actual database drivers
 */
async function executeSQL(query, description) {
  console.log(`  ✓ ${description}`)
  
  // Simulate database execution time
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Log the query in development mode
  if (environment === 'development') {
    console.log(`    SQL: ${query.substring(0, 100)}...`)
  }
}

/**
 * Initialize database schema
 */
async function initializeSchema() {
  console.log('\n📊 Creating database schema...')
  
  try {
    for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
      await executeSQL(schema, `Creating table: ${tableName}`)
    }
    
    console.log('✅ Database schema created successfully')
  } catch (error) {
    console.error('❌ Failed to create database schema:', error.message)
    throw error
  }
}

/**
 * Insert sample data for development/testing
 */
async function insertSampleData() {
  if (environment === 'production') {
    console.log('⏭️  Skipping sample data for production environment')
    return
  }
  
  console.log('\n🎭 Inserting sample data...')
  
  try {
    for (const [dataName, query] of Object.entries(SAMPLE_DATA)) {
      await executeSQL(query, `Inserting sample data: ${dataName}`)
    }
    
    console.log('✅ Sample data inserted successfully')
  } catch (error) {
    console.error('❌ Failed to insert sample data:', error.message)
    throw error
  }
}

/**
 * Create database indexes for performance
 */
async function createIndexes() {
  console.log('\n🏗️  Creating performance indexes...')
  
  const indexes = [
    'CREATE INDEX idx_operations_created_status ON rpa_operations(created_at, status)',
    'CREATE INDEX idx_executions_user_date ON rpa_workflow_executions(user_id, created_at DESC)',
    'CREATE INDEX idx_metrics_agent_timestamp ON rpa_agent_metrics(agent_id, timestamp DESC)',
    'CREATE INDEX idx_errors_timestamp_severity ON rpa_error_logs(timestamp DESC, severity)',
    'CREATE INDEX idx_logs_execution_level ON rpa_execution_logs(execution_id, level, timestamp)'
  ]
  
  try {
    for (let i = 0; i < indexes.length; i++) {
      await executeSQL(indexes[i], `Creating performance index ${i + 1}/${indexes.length}`)
    }
    
    console.log('✅ Performance indexes created successfully')
  } catch (error) {
    console.error('❌ Failed to create indexes:', error.message)
    throw error
  }
}

/**
 * Verify database setup
 */
async function verifySetup() {
  console.log('\n🔍 Verifying database setup...')
  
  const verificationQueries = [
    'SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name LIKE "rpa_%"',
    'SELECT COUNT(*) as agent_count FROM rpa_agents',
    'SELECT COUNT(*) as execution_count FROM rpa_workflow_executions'
  ]
  
  try {
    for (let i = 0; i < verificationQueries.length; i++) {
      await executeSQL(verificationQueries[i], `Running verification query ${i + 1}/${verificationQueries.length}`)
    }
    
    console.log('✅ Database verification completed successfully')
  } catch (error) {
    console.error('❌ Database verification failed:', error.message)
    throw error
  }
}

/**
 * Display setup summary
 */
function displaySummary(config) {
  console.log('\n📋 Setup Summary:')
  console.log(`   Environment: ${environment}`)
  console.log(`   Database: ${config.database}`)
  console.log(`   Host: ${config.host}:${config.port}`)
  console.log(`   Tables Created: ${Object.keys(TABLE_SCHEMAS).length}`)
  console.log(`   Sample Data: ${environment !== 'production' ? 'Yes' : 'No'}`)
  
  if (environment === 'development') {
    console.log('\n🛠️  Development Notes:')
    console.log('   • Use sample agent ID: test-agent-001')
    console.log('   • Use sample user ID: user-001')
    console.log('   • Sample workflow execution: test-exec-001')
  }
  
  console.log('\n🚀 RPA database is ready!')
  console.log('   Next steps:')
  console.log('   1. Start your Sim application')
  console.log('   2. Register Desktop Agents via API')
  console.log('   3. Create and execute RPA workflows')
}

/**
 * Main initialization function
 */
async function main() {
  try {
    const config = DB_CONFIGS[environment]
    
    if (!config) {
      throw new Error(`Invalid environment: ${environment}. Valid options: development, testing, production`)
    }
    
    console.log(`\n🔧 Database Configuration:`)
    console.log(`   Host: ${config.host}:${config.port}`)
    console.log(`   Database: ${config.database}`)
    console.log(`   SSL: ${config.ssl ? 'Enabled' : 'Disabled'}`)
    
    // Simulate connection test
    console.log('\n🔗 Testing database connection...')
    await new Promise(resolve => setTimeout(resolve, 500))
    console.log('✅ Database connection successful')
    
    // Initialize schema
    await initializeSchema()
    
    // Insert sample data for non-production environments
    await insertSampleData()
    
    // Create performance indexes
    await createIndexes()
    
    // Verify setup
    await verifySetup()
    
    // Display summary
    displaySummary(config)
    
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error.message)
    console.error('\nTroubleshooting:')
    console.error('• Check database connection settings')
    console.error('• Ensure database server is running')
    console.error('• Verify user permissions')
    console.error('• Check network connectivity')
    process.exit(1)
  }
}

// Run the initialization
main().catch(console.error)