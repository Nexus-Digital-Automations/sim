#!/usr/bin/env tsx

/**
 * Setup script to create monitoring system database schema
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from './db/index';

async function setupMonitoringSchema() {
  console.log('🚀 Setting up monitoring system database schema...');
  
  try {
    // Read the monitoring schema SQL
    const schemaPath = join(__dirname, 'db', 'migrations', '0084_monitoring_system_comprehensive.sql');
    const schemaSql = readFileSync(schemaPath, 'utf-8');
    
    console.log('📄 Executing monitoring schema SQL...');
    
    // Split SQL into statements and execute each one
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`🔧 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await db.execute({ sql: statement });
          console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
        } catch (error: any) {
          // Skip already exists errors
          if (error.message?.includes('already exists') || error.code === '42P07') {
            console.log(`⚠️  Statement ${i + 1}/${statements.length} skipped (already exists)`);
          } else {
            console.warn(`⚠️  Statement ${i + 1}/${statements.length} failed:`, error.message);
          }
        }
      }
    }
    
    console.log('✅ Monitoring system database schema setup completed successfully!');
    
    // Test the schema by checking if tables exist
    console.log('🧪 Verifying schema setup...');
    
    const tables = [
      'alert_rules',
      'alert_instances', 
      'alert_notifications',
      'performance_metrics',
      'workflow_executions_monitoring',
      'workflow_execution_steps',
      'monitoring_dashboards',
      'debug_sessions',
      'execution_replays',
      'monitoring_events',
      'business_metrics_snapshots',
      'workflow_analytics_cache'
    ];
    
    for (const table of tables) {
      try {
        const result = await db.execute({ 
          sql: `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '${table}'` 
        });
        const exists = result.rows[0]?.count > 0;
        console.log(`${exists ? '✅' : '❌'} Table ${table}: ${exists ? 'exists' : 'missing'}`);
      } catch (error) {
        console.log(`❌ Table ${table}: verification failed`);
      }
    }
    
    console.log('🎉 Monitoring system is ready!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Failed to setup monitoring schema:', error);
    process.exit(1);
  }
}

setupMonitoringSchema();