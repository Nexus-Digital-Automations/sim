# Research Report: Migrate files/parse route test from vi.doMock() to bun-compatible enhanced infrastructure

**Task ID:** task_1756944642899_qrhyjzth8  
**Implementation Task ID:** task_1756944642899_4anlen4k7  
**Research Date:** 2025-09-04  
**Researcher:** Claude Development Agent  

## Executive Summary

This research provides comprehensive analysis and implementation guidance for migrating the files/parse API test from vi.doMock() patterns to bun-compatible enhanced infrastructure while preserving all existing comprehensive security tests and file parsing functionality.

## Current State Analysis

### Test File Structure
**File:** `/Users/jeremyparker/Desktop/Claude Coding Projects/sim/apps/sim/app/api/files/parse/route.test.ts`

**Current Issues:**
- Uses `vi.doMock()` pattern (lines 24-45) - not bun-compatible
- Module mocks applied within beforeEach() hook - timing issues
- Direct module mocking without factory functions

**Current Test Coverage:**
✅ **Comprehensive Coverage (195 lines of tests):**
- File parsing functionality tests (missing file path, local files, S3 files, multiple files)
- Error handling (S3 access errors, file access errors)  
- **Extensive Path Traversal Security Tests (lines 197-377):**
  - Path traversal with .. segments
  - Tilde character rejection
  - Absolute path outside upload directory rejection
  - Valid path allowance within upload directory
  - Encoded path traversal attempts
  - Null byte injection attempts
  - Edge cases (empty paths, missing parameters)

### Current Mocking Pattern (Problematic)
```typescript
vi.doMock('@/lib/file-parsers', () => ({
  isSupportedFileType: vi.fn().mockReturnValue(true),
  parseFile: vi.fn().mockResolvedValue({
    content: 'parsed content',
    metadata: { pageCount: 1 },
  }),
  parseBuffer: vi.fn().mockResolvedValue({
    content: 'parsed buffer content', 
    metadata: { pageCount: 1 },
  }),
}))

vi.doMock('path', () => ({
  ...path,
  join: mockJoin,
  basename: path.basename,
  extname: path.extname,
}))
```

## Migration Template Analysis

### Enhanced Infrastructure Pattern
**Template:** `/Users/jeremyparker/Desktop/Claude Coding Projects/sim/apps/sim/app/api/__test-utils__/migration-template.test.ts`

**Key Pattern Elements:**
1. **Module mocks imported first** (lines 31-32)
2. **Runtime mock controls** via `mockControls` 
3. **vi.mock() with factory functions** instead of vi.doMock()
4. **Comprehensive authentication patterns**
5. **Enhanced logging and debugging**
6. **Proper test isolation**

### Available Enhanced Infrastructure
**Module Mocks:** `/Users/jeremyparker/Desktop/Claude Coding Projects/sim/apps/sim/app/api/__test-utils__/module-mocks.ts`
**Test Utils:** `/Users/jeremyparker/Desktop/Claude Coding Projects/sim/apps/sim/app/api/__test-utils__/utils.ts`

**Available Mock Controls:**
- `mockControls.setAuthUser(user)` - Authentication control
- `mockControls.setStorageProvider(provider)` - Storage provider control
- `mockControls.setUploadSuccess(result)` - Upload result control
- `mockControls.setUploadError(error)` - Upload error simulation
- `mockControls.reset()` - Reset all mocks

**Available Utilities:**
- `setupFileApiMocks()` - File API specific setup
- `createMockRequest()` - Request creation helper
- `mockFileSystem()` - File system operations
- `createStorageProviderMocks()` - Storage provider mocking

## Required Module Mocks for File Parsing

### 1. File Parser Mocks
**Module:** `@/lib/file-parsers`
**Functions to Mock:**
- `isSupportedFileType(extension: string): boolean`
- `parseFile(filePath: string): Promise<FileParseResult>`  
- `parseBuffer(buffer: Buffer, extension: string): Promise<FileParseResult>`

### 2. Path Module Mocks
**Module:** `path`
**Functions to Mock:**
- `join(...paths: string[]): string` - Custom logic for upload paths
- `basename(path: string): string` - File name extraction
- `extname(path: string): string` - Extension extraction

### 3. File System Mocks
**Module:** `fs/promises`
**Functions to Mock:**
- `access(path: string): Promise<void>` - File existence checks
- `stat(path: string): Promise<Stats>` - File statistics
- `readFile(path: string): Promise<Buffer>` - File reading
- `writeFile(path: string, data: any): Promise<void>` - File writing

### 4. Upload System Mocks  
**Module:** `@/lib/uploads`
**Functions to Mock:**
- `downloadFile(path: string): Promise<Buffer>` - Cloud storage download
- `isUsingCloudStorage(): boolean` - Storage provider detection
- `uploadFile(...): Promise<UploadResult>` - File upload operations

### 5. Setup Server Mocks
**Module:** `@/lib/uploads/setup.server` - Empty mock (line 45)

## Implementation Strategy

### Phase 1: Infrastructure Setup
1. **Import module mocks first** - Ensure proper mock timing
2. **Add runtime mock controls** - Enable test-specific configurations
3. **Implement vi.mock() factory functions** - Replace vi.doMock() patterns
4. **Setup proper cleanup hooks** - Ensure test isolation

### Phase 2: Mock Implementation
1. **File Parser Mock Factory:**
```typescript
vi.mock('@/lib/file-parsers', () => ({
  isSupportedFileType: vi.fn(() => mockControls.getFileParserConfig().isSupported),
  parseFile: vi.fn(() => Promise.resolve(mockControls.getFileParserConfig().parseResult)),
  parseBuffer: vi.fn(() => Promise.resolve(mockControls.getFileParserConfig().bufferResult))
}))
```

2. **Path Module Mock Factory:**
```typescript  
vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    join: vi.fn((...args: string[]) => mockControls.getPathConfig().joinResult(args))
  }
})
```

3. **File System Mock Factory:**
```typescript
vi.mock('fs/promises', () => ({
  access: vi.fn(() => mockControls.getFileSystemConfig().accessResult()),
  stat: vi.fn(() => Promise.resolve({ isFile: () => true })),
  readFile: vi.fn(() => Promise.resolve(Buffer.from('test content'))),
  writeFile: vi.fn(() => Promise.resolve())
}))
```

### Phase 3: Test Migration
1. **Preserve ALL existing test cases** - Ensure no functionality loss
2. **Migrate test structure** - Apply template patterns  
3. **Enhance with new infrastructure** - Use mockControls and utilities
4. **Maintain security test comprehensiveness** - Critical requirement

## Risk Assessment & Mitigation

### High Risk Items
1. **Security Test Preservation** - Path traversal tests are critical
   - **Mitigation:** Careful line-by-line preservation of all security tests
   
2. **Complex File Parsing Logic** - Multiple parser types and error scenarios
   - **Mitigation:** Comprehensive mock configuration for all parser scenarios
   
3. **Storage Provider Complexity** - S3, local, and error handling
   - **Mitigation:** Use existing `createStorageProviderMocks()` utility

### Medium Risk Items  
1. **Path Manipulation Logic** - Custom join function for upload paths
   - **Mitigation:** Preserve existing mockJoin logic in new mock factory
   
2. **Test Timing Issues** - Module mock ordering
   - **Mitigation:** Follow proven template pattern with mocks-first import

## Implementation Checklist

### ✅ Pre-Implementation
- [x] Research current test structure and coverage
- [x] Analyze migration template patterns
- [x] Identify required mock modules and functions
- [x] Assess risks and mitigation strategies

### 📋 Implementation Tasks
- [ ] Import module-mocks.ts at top of test file
- [ ] Replace vi.doMock() with vi.mock() factory functions  
- [ ] Add mock controls for file parser configuration
- [ ] Add mock controls for storage provider configuration
- [ ] Add mock controls for file system operations
- [ ] Implement proper beforeEach/afterEach cleanup
- [ ] Preserve ALL existing test cases without modification
- [ ] Add enhanced logging and debugging
- [ ] Update test structure to follow template pattern

### 🧪 Validation Requirements
- [ ] All existing tests pass without modification
- [ ] Path traversal security tests remain comprehensive  
- [ ] File parsing functionality tests maintain coverage
- [ ] Error handling tests preserve edge cases
- [ ] Test isolation verified between test runs
- [ ] Mock cleanup verified in afterEach
- [ ] 90%+ test pass rate achieved

## Expected Outcomes

### Technical Benefits
- ✅ **Bun compatibility** - Remove vi.doMock() incompatibility
- ✅ **Enhanced test reliability** - Better mock timing and isolation
- ✅ **Runtime configurability** - Test-specific mock configurations
- ✅ **Improved debugging** - Enhanced logging and error reporting
- ✅ **Pattern consistency** - Align with proven migration template

### Security Benefits  
- ✅ **Maintain security coverage** - Preserve all path traversal tests
- ✅ **Enhanced security testing** - Better mock control for edge cases
- ✅ **Comprehensive validation** - Maintain existing security validation

### Maintainability Benefits
- ✅ **Standardized patterns** - Follow established migration template
- ✅ **Better documentation** - Enhanced test descriptions and logging
- ✅ **Easier debugging** - Improved mock controls and error reporting

## Recommendations

### Immediate Actions
1. **Follow proven template exactly** - Use migration-template.test.ts as foundation
2. **Preserve security tests completely** - No modifications to path traversal tests  
3. **Use existing infrastructure** - Leverage setupFileApiMocks() and mockControls
4. **Implement comprehensive logging** - Add detailed debug information

### Long-term Considerations
1. **Create file parser mock utilities** - Reusable for other file parsing tests
2. **Document patterns** - Update migration template with file parsing patterns
3. **Consider test performance** - Monitor for any performance impacts
4. **Establish validation standards** - Define success criteria for future migrations

## Success Criteria

### ✅ Primary Success Criteria
- All existing test cases pass without functional changes
- Path traversal security tests remain fully comprehensive
- File parsing functionality tests maintain complete coverage
- Test suite achieves 90%+ pass rate
- Bun compatibility confirmed through test execution

### ✅ Secondary Success Criteria  
- Enhanced debugging and logging implemented
- Mock controls provide runtime test configuration
- Test isolation and cleanup verified
- Pattern consistency with migration template achieved
- Documentation and migration notes comprehensive

---

**Research completed:** 2025-09-04  
**Implementation ready:** ✅ All requirements analyzed and implementation plan established  
**Next phase:** Begin implementation following this research guidance