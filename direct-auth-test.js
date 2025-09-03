const { auth } = require('./apps/sim/lib/auth');
require('dotenv').config({ path: './apps/sim/.env' });

async function testDirectAuth() {
  console.log('🔧 Testing Direct Better Auth Handler...');
  
  try {
    // Create a properly formatted request
    const mockRequest = {
      method: 'POST',
      url: 'http://localhost:3000/api/auth/sign-up/email',
      headers: {
        'content-type': 'application/json',
        'host': 'localhost:3000',
        'user-agent': 'test-client'
      }
    };
    
    // Create request body as a readable stream
    const requestBody = JSON.stringify({
      email: 'direct-test@example.com',
      password: 'TestPassword123!',
      name: 'Direct Test User'
    });
    
    // Add body property
    mockRequest.body = requestBody;
    
    console.log('📝 Making request:', {
      method: mockRequest.method,
      url: mockRequest.url,
      headers: mockRequest.headers,
      body: requestBody
    });
    
    // Create mock response
    let responseStatus = 200;
    let responseHeaders = {};
    let responseData = '';
    
    const mockResponse = {
      status: (code) => {
        responseStatus = code;
        return mockResponse;
      },
      setHeader: (key, value) => {
        responseHeaders[key] = value;
        return mockResponse;
      },
      json: (data) => {
        responseData = JSON.stringify(data);
        console.log('📄 JSON Response:', data);
        return mockResponse;
      },
      send: (data) => {
        responseData = data;
        console.log('📄 Send Response:', data);
        return mockResponse;
      },
      end: (data) => {
        if (data) responseData = data;
        console.log('📄 Final Response Status:', responseStatus);
        console.log('📄 Final Response Headers:', responseHeaders);
        console.log('📄 Final Response Data:', responseData);
        return mockResponse;
      }
    };
    
    // Call the Better Auth handler directly
    console.log('🚀 Calling auth handler...');
    const result = await auth.handler(mockRequest, mockResponse);
    
    console.log('✅ Handler completed, result:', result);
    console.log('📊 Final Status Code:', responseStatus);
    
  } catch (error) {
    console.error('❌ Direct auth test failed:', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    });
    
    // Check for specific error patterns
    if (error.message?.includes('column') && error.message?.includes('does not exist')) {
      console.log('\n💡 Database column error - check if schema matches Better Auth requirements');
    } else if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      console.log('\n💡 Database table error - run migrations: npm run db:migrate');
    } else if (error.message?.includes('validation') || error.message?.includes('required')) {
      console.log('\n💡 Validation error - check request body format');
    } else if (error.message?.includes('environment') || error.message?.includes('config')) {
      console.log('\n💡 Configuration error - check environment variables');
    }
  }
}

testDirectAuth();