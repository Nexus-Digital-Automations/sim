# 🧪 API Test Migration Checklist

## Overview

This checklist ensures systematic and successful migration of API tests to bun/vitest 3.x compatible patterns with 90%+ pass rates. Follow each step carefully to achieve reliable test migration.

## Pre-Migration Assessment

### ✅ Phase 1: Analysis and Preparation

**Current Test Analysis:**
- [ ] **Identify test file location and endpoints tested**
- [ ] **Catalog authentication patterns used** (session, API key, JWT, permissions)
- [ ] **Document database operations needed** (CRUD operations, transactions, queries)
- [ ] **List external dependencies to mock** (file system, uploads, external APIs)
- [ ] **Note special test scenarios** (error handling, edge cases, performance tests)
- [ ] **Review current test pass rate** and identify failing tests

**Migration Planning:**
- [ ] **Estimate migration complexity** (Low/Medium/High based on patterns used)
- [ ] **Identify migration dependencies** (other tests, shared utilities)
- [ ] **Plan test execution strategy** (individual files vs. batch migration)
- [ ] **Set up backup of current test file** for rollback if needed

### ✅ Phase 2: Environment Setup

**Infrastructure Verification:**
- [ ] **Verify bun is installed** and working (`bun --version`)
- [ ] **Confirm vitest 3.x compatibility** (`bun run test --version`)
- [ ] **Check test utilities are available** (module-mocks.ts, enhanced-utils.ts)
- [ ] **Verify development/reports directory exists** for documentation
- [ ] **Confirm TaskManager API is functional** (if using task management)

## Migration Execution

### ✅ Phase 3: Template Application

**File Setup:**
- [ ] **Copy migration template** to test file location
- [ ] **Rename template file** to match original test file name
- [ ] **Update file header documentation** with specific endpoint details
- [ ] **Replace placeholder [ENDPOINT_NAME]** with actual endpoint name

**Import Configuration:**
- [ ] **Import module mocks FIRST** (`import '@/app/api/__test-utils__/module-mocks'`)
- [ ] **Import test utilities** (`enhanced-utils`, `mockControls`)
- [ ] **Import route handlers AFTER mocks** (`GET`, `POST`, etc.)
- [ ] **Verify import order is correct** (mocks → utils → handlers)

### ✅ Phase 4: Mock Configuration

**Authentication Setup:**
- [ ] **Configure session authentication** if used (`mockControls.setAuthUser()`)
- [ ] **Set up API key authentication** if used (headers + database lookup)
- [ ] **Configure JWT token validation** if used (`setInternalTokenValid()`)
- [ ] **Implement permission controls** if used (`setPermissionLevel()`)
- [ ] **Test unauthenticated access** returns 401

**Database Mock Setup:**
- [ ] **Configure select operations** with expected result sets
- [ ] **Set up insert operations** with return values
- [ ] **Configure update operations** with success responses
- [ ] **Set up delete operations** with confirmation responses
- [ ] **Configure transaction support** if used
- [ ] **Add error simulation** for error handling tests
- [ ] **Verify callback compatibility** for legacy `.then()` patterns

**Additional Mocks:**
- [ ] **Configure file system mocks** if file operations are tested
- [ ] **Set up upload/storage mocks** if file uploads are tested
- [ ] **Mock external API calls** if external services are used
- [ ] **Configure logging mocks** to prevent log spam during tests

### ✅ Phase 5: Test Adaptation

**Test Data Configuration:**
- [ ] **Replace sample data** with data matching your endpoint
- [ ] **Configure user data** for authentication tests
- [ ] **Set up list data** for GET endpoint tests
- [ ] **Add validation data** for input validation tests
- [ ] **Create error scenario data** for error handling tests

**Test Case Migration:**
- [ ] **Migrate authentication tests** (401, session, API key, JWT)
- [ ] **Migrate input validation tests** (required fields, formats, invalid JSON)
- [ ] **Migrate business logic tests** (CRUD operations, query parameters)
- [ ] **Migrate error handling tests** (database errors, not found scenarios)
- [ ] **Migrate performance tests** if applicable
- [ ] **Add new test cases** for patterns discovered during migration

**Request/Response Handling:**
- [ ] **Update request creation** to use `createMockRequest()` helper
- [ ] **Configure headers properly** (Content-Type, Authorization, x-api-key)
- [ ] **Set up URL parameters** and query strings correctly
- [ ] **Update response validation** to use `validateApiResponse()` helper

### ✅ Phase 6: Debugging and Logging

**Comprehensive Logging:**
- [ ] **Add test setup logging** for each test section
- [ ] **Include request/response logging** for debugging
- [ ] **Log mock state changes** for troubleshooting
- [ ] **Add performance timing logs** for performance tests
- [ ] **Include error scenario logging** for error handling validation

**Debugging Support:**
- [ ] **Add console.log statements** for critical test points
- [ ] **Include mock state debugging** when tests fail
- [ ] **Log database operation details** for database-related tests
- [ ] **Add authentication flow debugging** for auth tests

## Validation and Testing

### ✅ Phase 7: Test Execution Validation

**Individual Test Validation:**
- [ ] **Run test file in isolation** (`bun test path/to/test.test.ts`)
- [ ] **Verify all tests pass** (target: 90%+ pass rate)
- [ ] **Check test execution time** (should be < 5 seconds per test file)
- [ ] **Validate test isolation** (tests don't affect each other)
- [ ] **Confirm proper cleanup** (no mock state leakage)

**Integration Testing:**
- [ ] **Run with other API tests** to ensure no conflicts
- [ ] **Test in CI/CD environment** if applicable
- [ ] **Verify parallel test execution** works correctly
- [ ] **Check memory usage** for large test suites
- [ ] **Validate test stability** (consistent results across multiple runs)

**Error Scenario Validation:**
- [ ] **Test database connection failures**
- [ ] **Validate authentication failures**
- [ ] **Test input validation errors**
- [ ] **Verify error message consistency**
- [ ] **Check error status codes**

### ✅ Phase 8: Quality Assurance

**Test Quality Metrics:**
- [ ] **Achieve 90%+ test pass rate** (required for successful migration)
- [ ] **Maintain or improve test coverage** compared to original tests
- [ ] **Verify all edge cases are covered**
- [ ] **Ensure error scenarios are tested**
- [ ] **Validate performance requirements are met**

**Code Quality:**
- [ ] **Follow consistent naming conventions**
- [ ] **Add comprehensive comments and documentation**
- [ ] **Remove unused code and imports**
- [ ] **Ensure proper TypeScript typing**
- [ ] **Validate ESLint/Prettier compliance**

## Post-Migration Cleanup

### ✅ Phase 9: Documentation and Cleanup

**Documentation Updates:**
- [ ] **Update test file header** with migration date and details
- [ ] **Document any discovered patterns** for future migrations
- [ ] **Update migration template** if new patterns were found
- [ ] **Add migration notes** to development/reports directory
- [ ] **Update team documentation** with lessons learned

**File Management:**
- [ ] **Archive original test file** (rename with `.legacy` extension)
- [ ] **Clean up temporary files** and backups
- [ ] **Update import statements** in other files that reference the test
- [ ] **Remove unused mock utilities** if no longer needed

**Validation Documentation:**
- [ ] **Record final test pass rate**
- [ ] **Document any remaining issues** and workarounds
- [ ] **Note performance improvements** or regressions
- [ ] **Create issue tracking** for any unresolved problems

## Troubleshooting Guide

### Common Issues and Solutions

**❌ Tests fail with "module not found" errors:**
- ✅ Verify import order (mocks first, then handlers)
- ✅ Check file paths are correct and absolute
- ✅ Ensure module-mocks.ts is imported before other imports

**❌ Database mocks not working properly:**
- ✅ Check `mockControls.setDatabaseResults()` is called with correct data structure
- ✅ Verify database operations match expected chain pattern
- ✅ Ensure mock reset is called in beforeEach hooks

**❌ Authentication tests failing:**
- ✅ Verify `mockControls.setAuthUser()` is called with correct user data
- ✅ Check header configuration for API key and JWT tests
- ✅ Ensure permission levels are set correctly

**❌ Tests are slow or timeout:**
- ✅ Check for infinite loops in mock configurations
- ✅ Verify async operations are properly awaited
- ✅ Reduce mock data size for performance tests

**❌ Mock state leaking between tests:**
- ✅ Ensure `mockControls.reset()` is called in beforeEach
- ✅ Verify `vi.clearAllMocks()` is called in afterEach
- ✅ Check for global state modifications that aren't reset

### Performance Optimization

**Test Speed Improvements:**
- [ ] **Minimize mock data size** for tests that don't need large datasets
- [ ] **Use focused test runs** during development (`test.only`)
- [ ] **Optimize database mock responses** to avoid unnecessary data processing
- [ ] **Reduce logging verbosity** for production test runs

**Memory Management:**
- [ ] **Clean up large mock objects** in afterEach hooks
- [ ] **Avoid creating unnecessary mock instances**
- [ ] **Use shared mock data** where appropriate
- [ ] **Monitor memory usage** for large test suites

## Success Criteria

### Migration Completion Requirements

**✅ All tests pass with 90%+ success rate**
**✅ Tests run reliably in bun environment**
**✅ Test execution time is acceptable (< 5s per file)**
**✅ Tests are properly isolated (no interdependencies)**
**✅ Comprehensive logging and debugging is in place**
**✅ Documentation is complete and accurate**
**✅ Code follows project standards and conventions**

### Quality Gates

**Before marking migration complete:**
- [ ] **Run full test suite 3 times** to ensure stability
- [ ] **Test in clean environment** (fresh git clone)
- [ ] **Verify CI/CD compatibility** if applicable
- [ ] **Get peer review** of migration changes
- [ ] **Update project documentation** with new patterns

## Migration Template Usage

### Quick Start Commands

```bash
# 1. Copy template to your test file location
cp app/api/__test-utils__/migration-template.test.ts app/api/your-endpoint/route.test.ts

# 2. Run individual test file
bun test app/api/your-endpoint/route.test.ts

# 3. Run with debug logging
DEBUG=true bun test app/api/your-endpoint/route.test.ts

# 4. Run all API tests
bun test app/api/**/*.test.ts
```

### Template Customization

**Required Replacements:**
1. Replace `[ENDPOINT_NAME]` with actual endpoint name
2. Import actual route handlers (`GET`, `POST`, etc.)
3. Update test data to match your data structures
4. Configure authentication patterns for your endpoint
5. Set up database mock responses for your queries

**Optional Enhancements:**
- Add endpoint-specific helper functions
- Include specialized validation logic
- Add performance benchmarking
- Include integration test patterns

---

**📋 Migration Checklist Version:** 1.0  
**🗓️ Last Updated:** 2025-09-03  
**✨ Target Success Rate:** 90%+ test pass rate  
**⚡ Performance Target:** < 5 seconds per test file