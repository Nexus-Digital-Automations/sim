# 🚀 Quick API Test Migration Guide

## TL;DR - 5 Minute Migration

### Step 1: Copy Template
```bash
cp app/api/__test-utils__/migration-template.test.ts app/api/[your-endpoint]/route.test.ts
```

### Step 2: Essential Replacements
1. **Replace** `[ENDPOINT_NAME]` → your actual endpoint name
2. **Import** your route handlers: `import { GET, POST } from './route'`
3. **Update** test data to match your endpoint's data structure
4. **Configure** authentication (see patterns below)

### Step 3: Run Tests
```bash
bun test app/api/[your-endpoint]/route.test.ts
```

Target: **90%+ pass rate** ✅

---

## 📋 Quick Checklist

**Required Changes:**
- [ ] Copy template file
- [ ] Replace `[ENDPOINT_NAME]` placeholder
- [ ] Import actual route handlers
- [ ] Update test data structure
- [ ] Configure authentication pattern
- [ ] Run and validate tests

**Success Criteria:**
- [ ] Tests pass with 90%+ success rate
- [ ] No module import errors
- [ ] Authentication tests work correctly
- [ ] Database mocks return expected data

---

## 🔧 Common Patterns

### Authentication Patterns

```typescript
// Session Authentication (most common)
mockControls.setAuthUser({ id: 'user-123', email: 'test@example.com' })

// API Key Authentication
mockControls.setUnauthenticated()
mockControls.setDatabaseResults([
  [{ userId: 'user-123' }], // API key lookup
  [sampleData],             // Your data
])
const request = createMockRequest('GET', undefined, {
  'x-api-key': 'test-key-123'
})

// Internal JWT Authentication
mockControls.setUnauthenticated()
mockControls.setInternalTokenValid(true)
const request = createMockRequest('GET', undefined, {
  'authorization': 'Bearer internal-token-123'
})
```

### Database Patterns

```typescript
// Simple GET endpoint
mockControls.setDatabaseResults([
  [sampleData],        // Main query result
  [{ count: 1 }]      // Count query (if used)
])

// POST endpoint (creation)
mockControls.setDatabaseResults([
  [{ ...newData, id: 'new-id-123' }] // Created record with ID
])

// Error scenario
mockControls.setDatabaseError('Connection failed')
```

### Request Patterns

```typescript
// GET request
const request = createMockRequest('GET')

// POST request with data
const request = createMockRequest('POST', { name: 'Test Item' })

// With custom headers
const request = createMockRequest('GET', undefined, {
  'x-custom-header': 'value'
})

// With URL parameters
const request = new NextRequest(
  'http://localhost:3000/api/endpoint?param=value'
)
```

---

## 🚨 Critical Import Order

```typescript
// 1. FIRST: Import module mocks
import '@/app/api/__test-utils__/module-mocks'
import { mockControls } from '@/app/api/__test-utils__/module-mocks'

// 2. THEN: Import utilities
import { createEnhancedMockRequest } from '@/app/api/__test-utils__/enhanced-utils'

// 3. LAST: Import route handlers
import { GET, POST } from './route'
```

**⚠️ Wrong import order = test failures!**

---

## 🔍 Debugging Quick Fixes

### Tests Fail with Module Errors
```typescript
// ✅ Fix: Check import order (mocks first)
import '@/app/api/__test-utils__/module-mocks' // MUST BE FIRST
```

### Authentication Not Working
```typescript
// ✅ Fix: Verify user setup in beforeEach
beforeEach(() => {
  mockControls.reset()
  mockControls.setAuthUser(testUser) // Add this
})
```

### Database Mocks Not Returning Data
```typescript
// ✅ Fix: Set results before making request
mockControls.setDatabaseResults([
  [yourExpectedData] // Your data here
])
const response = await GET(request)
```

### Mock State Bleeding Between Tests
```typescript
// ✅ Fix: Add proper cleanup
beforeEach(() => {
  mockControls.reset()     // Reset mock state
  vi.clearAllMocks()       // Clear all vi.fn() calls
})
```

---

## 📊 Validation Commands

```bash
# Run single test file
bun test app/api/your-endpoint/route.test.ts

# Run with verbose output
bun test --verbose app/api/your-endpoint/route.test.ts

# Run all API tests
bun test app/api/**/*.test.ts

# Check test coverage
bun test --coverage app/api/your-endpoint/route.test.ts
```

---

## 🎯 Success Metrics

**✅ Migration Successful When:**
- Test pass rate ≥ 90%
- Test execution time < 5 seconds
- No import/module errors
- All authentication patterns work
- Database mocks return expected data
- Tests run consistently

**❌ Migration Needs Work If:**
- Test pass rate < 90%
- Tests timeout or hang
- Module import errors
- Authentication always fails
- Database mocks return undefined/null
- Tests produce different results on re-run

---

## 🛠️ Template Customization

### Your Endpoint Data Structure
```typescript
// Replace this sample data structure
const sampleData = {
  id: 'test-id-123',
  name: 'Test Item',              // ← Your field names
  description: 'A test item',     // ← Your field names
  userId: 'user-123',
  createdAt: new Date(),
  updatedAt: new Date(),
}

// With your actual data structure
const sampleYourData = {
  id: 'test-id-123',
  title: 'Test Title',            // ← Your actual fields
  content: 'Test content',        // ← Your actual fields
  authorId: 'user-123',           // ← Your actual fields
  // ... your other fields
}
```

### Your Authentication Requirements
```typescript
// Customize based on your needs
describe('Authentication and Authorization', () => {
  // Keep tests that apply to your endpoint
  // Remove tests that don't apply
  // Add endpoint-specific auth tests
})
```

---

## 🔗 Related Files

- **Full Migration Checklist**: `migration-checklist.md`
- **Template File**: `migration-template.test.ts`
- **Enhanced Utilities**: `enhanced-utils.ts`
- **Module Mocks**: `module-mocks.ts`

---

## 📞 Need Help?

**Common Issues:**
1. **Import errors** → Check import order (mocks first)
2. **Auth failures** → Verify `mockControls.setAuthUser()` called
3. **Database empty** → Check `setDatabaseResults()` configuration
4. **Tests unstable** → Add proper cleanup in beforeEach/afterEach

**Quick Test:**
```bash
# Copy template and run immediately to verify setup
cp app/api/__test-utils__/migration-template.test.ts /tmp/test.ts
bun test /tmp/test.ts
# Should have some passing tests and some TODOs
```

---

**🕒 Average Migration Time:** 15-30 minutes per endpoint  
**🎯 Success Rate:** 90%+ when following this guide  
**⚡ Performance:** < 5 seconds per test file