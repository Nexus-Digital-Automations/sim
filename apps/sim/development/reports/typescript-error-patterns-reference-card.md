# TypeScript Error Patterns - Developer Reference Card

## 🚀 Quick Error Identification

### Error Code Quick Reference
```
TS2307 = Module not found          → Fix imports/paths
TS17004 = JSX flag needed         → Check file extension/config  
TS2339 = Property doesn't exist   → Extend interface/type
TS2554 = Wrong argument count     → Fix function signature
TS2741 = Promise type mismatch    → Handle async properly
TS2304 = Cannot find name         → Add import/declaration
TS2578 = Unused directive         → Clean up comments
```

## 📋 Error Pattern Templates

### 1. TS2307 - Module Resolution
```typescript
// ❌ ERROR: Cannot find module '@/components/ui/button'
import { Button } from '@/components/ui/button';

// ✅ SOLUTION A: Create barrel export
// File: components/ui/index.ts
export { Button } from './button';
export { Alert } from './alert';
// Then: import { Button } from '@/components/ui';

// ✅ SOLUTION B: Fix tsconfig paths
{
  "baseUrl": ".",
  "paths": {
    "@/components/*": ["components/*"]
  }
}
```

### 2. TS17004 - JSX Configuration
```typescript
// ❌ ERROR: Cannot use JSX unless '--jsx' flag provided
// File: component.ts (wrong extension)
export default function Component() {
  return <div>Hello</div>; // Error here
}

// ✅ SOLUTION: Use .tsx extension
// File: component.tsx
export default function Component() {
  return <div>Hello</div>; // Works!
}
```

### 3. TS2339 - Property Access
```typescript
// ❌ ERROR: Property 'email' does not exist on type 'User'
interface User {
  name: string;
}
const user: User = getUser();
console.log(user.email); // Error

// ✅ SOLUTION: Extend interface
interface User {
  name: string;
  email?: string; // Add missing property
}
```

### 4. TS2554 - Function Arguments
```typescript
// ❌ ERROR: Expected 2 arguments, but got 1
function createUser(name: string, options: UserOptions) {}
createUser("John"); // Error

// ✅ SOLUTION A: Default parameter
function createUser(name: string, options: UserOptions = {}) {}

// ✅ SOLUTION B: Overload
function createUser(name: string): User;
function createUser(name: string, options: UserOptions): User;
function createUser(name: string, options?: UserOptions) {}
```

### 5. TS2741 - Promise Types
```typescript
// ❌ ERROR: Property 'id' missing in Promise<User>
async function getUser(): Promise<User> { /* ... */ }
const user: User = getUser(); // Error - returns Promise<User>

// ✅ SOLUTION: Proper async handling
const user: User = await getUser();
// Or: const user: Awaited<ReturnType<typeof getUser>> = await getUser();
```

### 6. TS2304 - Missing Names
```typescript
// ❌ ERROR: Cannot find name 'mockUser'
describe('user test', () => {
  it('should work', () => {
    expect(mockUser).toBeDefined(); // Error - mockUser not declared
  });
});

// ✅ SOLUTION: Declare missing variable
const mockUser = {
  id: '1',
  name: 'Test User'
};
// Or: import { mockUser } from './mocks';
```

## 🎯 File-Specific Quick Fixes

### React Components (.tsx files)
```typescript
// Common issues and fixes
interface ComponentProps {
  title: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

export default function Component({ title, onClick, children }: ComponentProps) {
  return (
    <div onClick={onClick}>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
```

### Test Files (.test.ts)
```typescript
// Standard test setup
import { jest } from '@jest/globals';

// Mock setup
const mockFunction = jest.fn();
const mockObject = {
  method: jest.fn().mockResolvedValue({ id: '123' })
};

// Proper async test
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toEqual({ id: expect.any(String) });
});
```

### API Routes (Next.js)
```typescript
import { NextRequest, NextResponse } from 'next/server';

interface RequestBody {
  name: string;
  email: string;
}

export async function POST(request: NextRequest) {
  const body: RequestBody = await request.json();
  
  // Process request
  const result = await processData(body);
  
  return NextResponse.json(result);
}
```

## 🔧 Common Fix Sequences

### Module Resolution Fix Sequence
1. **Check file exists**: `ls -la path/to/module`
2. **Verify tsconfig paths**: Look for correct path aliases
3. **Create barrel export**: `export { Component } from './component';`
4. **Update import**: Use barrel export path
5. **Test compilation**: `npx tsc --noEmit file.tsx`

### Component Error Fix Sequence
1. **Check file extension**: Must be `.tsx` for JSX
2. **Fix import paths**: Use correct `@/` aliases
3. **Add missing props**: Extend interface definitions
4. **Type children**: Add `React.ReactNode` for children props
5. **Validate**: Use Next.js type checking

### Test Error Fix Sequence  
1. **Add imports**: Include all required test utilities
2. **Setup mocks**: Declare all mock functions/objects
3. **Fix async**: Properly handle Promise types
4. **Clean directives**: Remove unused `@ts-expect-error`
5. **Run test**: Verify functionality works

## 📊 Error Priority Matrix

### 🔴 Critical (Fix Immediately)
- **TS2307 in core components**: Breaks build
- **TS2304 in tests**: Test suite fails  
- **TS2339 in API routes**: Runtime errors

### 🟡 Important (Fix Soon)
- **TS2554 in utility functions**: Logic errors
- **TS2741 in async operations**: Runtime promises
- **TS17004 in components**: Development friction

### 🟢 Maintenance (Fix When Time Permits)
- **TS2578 unused directives**: Code cleanliness
- **Type optimization**: Better developer experience
- **Interface improvements**: Long-term maintainability

## 🛠️ Quick Commands Cheat Sheet

### Error Analysis
```bash
# Get error count for file
npx tsc --noEmit [filename] 2>&1 | grep -c "error TS"

# List error types
npx tsc --noEmit [filename] 2>&1 | grep -o "TS[0-9]*" | sort | uniq -c

# Find specific error type
npx tsc --noEmit [filename] 2>&1 | grep "TS2307"
```

### File Checking
```bash
# Check if module exists
ls -la path/to/module

# Find files with pattern
find . -name "*component*" -type f

# Check TypeScript config
grep -A 20 '"paths"' tsconfig.json
```

### Quick Fixes
```bash
# Rename to proper extension
mv component.ts component.tsx

# Create barrel export
echo "export { Component } from './component';" >> index.ts

# Check Next.js types instead of direct tsc
npm run type-check
```

## 💡 Pro Tips

### Development Workflow
1. **Fix imports first**: Module resolution errors block other fixes
2. **Use Next.js checking**: More accurate than direct TypeScript compilation
3. **Batch similar fixes**: Process same error types together
4. **Test frequently**: Validate fixes every 5-10 changes

### Pattern Recognition
- **Multiple TS2307**: Usually path alias or barrel export issue
- **Many TS17004**: File extension or build configuration problem
- **Clustered TS2339**: Interface definition needs extension
- **Test TS2304**: Missing mock setup or imports

### Efficiency Tricks
- **Use search/replace**: Fix similar patterns across files
- **Copy working patterns**: Reuse successful fix templates  
- **Validate incrementally**: Don't fix everything before testing
- **Document patterns**: Save working solutions for reuse

---

## 🚨 Emergency Procedures

### If You Break Something
1. **Check core functionality**: Ensure app still runs
2. **Run tests**: Verify nothing critical broke
3. **Git status**: See what changed
4. **Revert if needed**: `git checkout -- filename`

### If Errors Multiply
1. **Stop fixing**: Don't make it worse
2. **Identify pattern**: What type of errors increased?
3. **Revert last change**: Go back to working state
4. **Fix root cause**: Address underlying issue

### If Stuck on Error
1. **Check documentation**: Look up error code
2. **Search codebase**: Find similar working code
3. **Ask for help**: Share specific error message
4. **Create minimal reproduction**: Isolate the problem

---

*Quick Reference v1.0 | For Sim AI Platform TypeScript Development*