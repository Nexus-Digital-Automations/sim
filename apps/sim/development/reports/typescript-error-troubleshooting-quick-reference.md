# TypeScript Error Troubleshooting - Quick Reference Guide

## 🚨 Emergency Error Resolution

### Quick Commands
```bash
# Check specific file errors
npx tsc --noEmit [filename]

# Count total errors  
npx tsc --noEmit 2>&1 | grep -E "error TS[0-9]+" | wc -l

# Error pattern analysis
npx tsc --noEmit 2>&1 | grep -E "TS[0-9]+" | sort | uniq -c | sort -nr

# Wave 3 targeted validation
bash targeted-validation.sh
```

## 🔧 Common Error Patterns & Instant Fixes

### TS2307: Cannot find module '@/path'
```bash
# 1. Check if file exists
ls -la path/to/module

# 2. Verify tsconfig paths
grep -A 10 '"paths"' tsconfig.json

# 3. Create barrel export
echo "export { ComponentName } from './component';" > components/index.ts

# 4. Fix import
# Change: import { Component } from '@/components/ui/component';
# To: import { Component } from '@/components/ui';
```

### TS17004: Cannot use JSX
```typescript
// ❌ Problem: File has .ts extension with JSX
// ✅ Solution: Rename to .tsx
mv component.ts component.tsx

// Or use Next.js type checking instead of direct tsc
npm run type-check
```

### TS2339: Property doesn't exist
```typescript
// ❌ Problem
interface User {
  name: string;
}
user.email // Property 'email' does not exist

// ✅ Solution: Extend interface
interface User {
  name: string;
  email?: string; // Add missing property
}
```

### TS2554: Expected X arguments, got Y
```typescript
// ❌ Problem
function process(data: string, options: Options) { }
process(data); // Expected 2 arguments, but got 1

// ✅ Solution: Add default parameter
function process(data: string, options: Options = {}) { }
```

### TS2741: Property missing in Promise<Type>
```typescript
// ❌ Problem
const result: { id: string } = await asyncFunction(); // Returns Promise<{id: string}>

// ✅ Solution: Proper async handling
const result = await asyncFunction(); // TypeScript infers correctly
// Or: const result: Awaited<ReturnType<typeof asyncFunction>> = await asyncFunction();
```

### TS2304: Cannot find name 'variable'
```typescript
// ❌ Problem: Missing mock in test
describe('test', () => {
  it('should work', () => {
    mockControls.setup(); // Cannot find name 'mockControls'
  });
});

// ✅ Solution: Add mock declaration
const mockControls = {
  setup: jest.fn(),
  teardown: jest.fn()
};
```

## 📂 High-Priority File Quick Fixes

### components/monitoring/workflow-monitoring-panel.tsx (186 errors)
```typescript
// 1. Fix UI component imports
// Create: components/ui/index.ts
export { Alert } from './alert';
export { Badge } from './badge';
export { Button } from './button';
export { Card, CardContent, CardHeader, CardTitle } from './card';

// 2. Update component imports
import { Alert, Badge, Button, Card } from '@/components/ui';

// 3. Fix monitoring types import
// Create: lib/monitoring/types.ts with proper exports
```

### app/api/workflows/[id]/dry-run/route.test.ts (151 errors)
```typescript
// 1. Fix test utils import
// Check: app/api/__test-utils__/utils.ts exists
// Create if missing with proper exports

// 2. Fix mock controls
const mockControls = {
  setup: jest.fn(),
  teardown: jest.fn(),
  reset: jest.fn()
};

const createEnhancedMockRequest = jest.fn().mockImplementation((config) => ({
  ...config,
  // Add mock implementation
}));

// 3. Fix Promise types in tests
// Change: const result: { id: string } = await createMockData();
// To: const result = await createMockData();
```

### lib/nexus/tools/list-workflows.test.ts (135 errors)
```typescript
// 1. Fix auth import  
// Verify: lib/auth/index.ts exists with proper exports
// Or create barrel export: export * from './auth-main';

// 2. Fix function arguments
// Change: someFunction(param1);
// To: someFunction(param1, defaultParam2);

// 3. Fix database import
// Verify: db/index.ts exists
// Create: export { db } from './connection';
```

## 🎯 Priority Resolution Order

### Immediate Priority (Complete in 30 minutes)
1. **TS2307 Module Resolution**: Fix import paths and create barrel exports
2. **TS17004 JSX Issues**: Use proper TypeScript checking with Next.js
3. **TS2304 Missing Variables**: Add missing mock declarations in tests

### Secondary Priority (Complete in 1 hour)  
1. **TS2554 Function Arguments**: Fix function signatures and add defaults
2. **TS2741 Promise Types**: Resolve async/await type handling
3. **TS2339 Property Missing**: Extend interfaces and add missing properties

### Maintenance Priority (Ongoing)
1. **TS2578 Unused Directives**: Clean up unused TypeScript comments
2. **Interface Optimization**: Improve type definitions for better maintainability
3. **Pattern Implementation**: Apply consistent patterns across codebase

## 🔍 Debugging Workflow

### 1. Error Assessment (2 minutes)
```bash
# Get error count and patterns
npx tsc --noEmit [filename] 2>&1 | head -10
```

### 2. Pattern Recognition (3 minutes)
```bash
# Identify most common errors
npx tsc --noEmit [filename] 2>&1 | grep -E "TS[0-9]+" | sort | uniq -c
```

### 3. Systematic Resolution (15-30 minutes)
- Fix all TS2307 (module resolution) errors first
- Fix all TS17004 (JSX) errors second  
- Fix remaining errors by frequency

### 4. Validation (2 minutes)
```bash
# Verify fixes
npx tsc --noEmit [filename]
echo "Errors remaining: $(npx tsc --noEmit [filename] 2>&1 | grep -E "error TS[0-9]+" | wc -l)"
```

## 📊 Success Metrics Dashboard

### Quick Status Check
```bash
# High-impact file status
for file in "components/monitoring/workflow-monitoring-panel.tsx" "app/templates/page.tsx" "lib/nexus/tools/list-workflows.test.ts"; do
  errors=$(timeout 15s npx tsc --noEmit "$file" 2>&1 | grep -E "error TS[0-9]+" | wc -l)
  echo "$file: $errors errors"
done
```

### Progress Tracking Template
```
File: [filename]
Baseline: [X errors]
Current: [Y errors] 
Reduction: [Z% / X-Y errors eliminated]
Status: [Complete/In Progress/Blocked]
```

## 🚀 Rapid Resolution Templates

### Component Fix Template
```typescript
// 1. Check file extension (.tsx for JSX)
// 2. Create UI barrel export
// 3. Update imports to use barrel
// 4. Add missing type definitions
// 5. Verify compilation
```

### Test Fix Template  
```typescript
// 1. Add missing imports
// 2. Create missing mocks
// 3. Fix Promise handling
// 4. Add variable declarations
// 5. Run test to verify
```

### API Route Fix Template
```typescript
// 1. Verify Next.js API structure
// 2. Add parameter types
// 3. Fix response types
// 4. Add error handling
// 5. Test route functionality
```

---

## 📞 Emergency Escalation

### Critical Issues (Stop & Escalate)
- **Authentication system broken**: Halt all work
- **Build completely fails**: Revert recent changes
- **>50 new errors introduced**: Analyze root cause

### Warning Signs
- Error count increasing instead of decreasing
- Core functionality tests failing
- Build time significantly increased
- New error categories appearing

---

*Quick Reference v1.0 | September 4, 2025*