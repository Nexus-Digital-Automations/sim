const { betterAuth } = require('better-auth');
const { drizzleAdapter } = require('better-auth/adapters/drizzle');
require('dotenv').config({ path: './apps/sim/.env' });

async function testBetterAuth() {
  console.log('🔍 Testing Better Auth Configuration...');
  
  console.log('Environment variables:');
  console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  console.log('- BETTER_AUTH_SECRET:', process.env.BETTER_AUTH_SECRET ? 'SET' : 'NOT SET');
  console.log('- BETTER_AUTH_URL:', process.env.BETTER_AUTH_URL ? 'SET' : 'NOT SET');
  console.log('- INTERNAL_API_SECRET:', process.env.INTERNAL_API_SECRET ? 'SET' : 'NOT SET');
  console.log('- ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? 'SET' : 'NOT SET');

  try {
    // Test database connection first
    const { drizzle } = require('drizzle-orm/postgres-js');
    const postgres = require('postgres');
    
    console.log('\n📊 Testing database connection...');
    const sql = postgres(process.env.DATABASE_URL);
    const db = drizzle(sql);
    
    // Test a simple query
    await sql`SELECT 1 as test`;
    console.log('✅ Database connection successful');
    
    // Try to create a minimal Better Auth instance
    console.log('\n🔐 Testing Better Auth initialization...');
    
    const auth = betterAuth({
      database: drizzleAdapter(db, {
        provider: 'pg',
      }),
      secret: process.env.BETTER_AUTH_SECRET,
      baseURL: process.env.BETTER_AUTH_URL,
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
      },
    });
    
    console.log('✅ Better Auth initialized successfully');
    
    // Test the signup endpoint directly
    console.log('\n📝 Testing signup function...');
    
    const mockRequest = {
      method: 'POST',
      url: '/sign-up/email',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPassword123!',
        name: 'Test User'
      })
    };
    
    // Mock Response object
    const mockResponse = {
      status: 200,
      headers: {},
      setHeader: function(key, value) { this.headers[key] = value; },
      json: function(data) { 
        console.log('📄 Response:', data); 
        return data; 
      },
      end: function(data) {
        console.log('📄 Response end:', data);
        return data;
      }
    };
    
    const result = await auth.handler(mockRequest, mockResponse);
    console.log('✅ Auth handler executed, result:', result);
    
    await sql.end();
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Error occurred:', error);
    console.error('❌ Stack:', error.stack);
    
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('\n💡 This looks like a database schema issue. Please run database migrations.');
    }
  }
}

testBetterAuth();