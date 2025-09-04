# Development Documentation

Comprehensive developer guide for contributing to and extending the Sim workflow automation platform.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Code Organization](#code-organization)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Contributing Process](#contributing-process)
- [Architecture Patterns](#architecture-patterns)
- [Debugging & Troubleshooting](#debugging--troubleshooting)

## 🚀 Getting Started

### Prerequisites

**Required Tools:**
- Node.js 18+ with npm/yarn/pnpm
- Docker and Docker Compose
- Git for version control
- VS Code (recommended) with extensions

**Recommended VS Code Extensions:**
- TypeScript and JavaScript Language Features
- ESLint for code linting
- Prettier for code formatting
- Tailwind CSS IntelliSense
- Docker extension
- GitLens for Git integration

### Quick Setup

1. **Clone and Setup**
```bash
# Clone repository
git clone https://github.com/your-org/sim.git
cd sim

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env.local

# Start development services
docker-compose -f docker-compose.local.yml up -d

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

2. **Verify Installation**
- Web UI: http://localhost:3000
- API Documentation: http://localhost:3000/api/docs
- Database: PostgreSQL at localhost:5432
- Cache: Redis at localhost:6379

## 🏗️ Development Environment

### Project Structure

```
sim/
├── apps/
│   ├── docs/                 # Documentation site (Nextra)
│   └── sim/                  # Main application
│       ├── app/              # Next.js app directory
│       ├── components/       # React components
│       ├── lib/              # Utility libraries
│       ├── hooks/            # Custom React hooks
│       ├── stores/           # State management
│       ├── blocks/           # Workflow block definitions
│       ├── executor/         # Workflow execution engine
│       └── db/              # Database schema and migrations
├── packages/                 # Shared packages (future)
├── docs/                    # Comprehensive documentation
├── scripts/                 # Build and deployment scripts
└── tools/                   # Development tools and utilities
```

### Development Scripts

**Primary Commands:**
```bash
npm run dev           # Start development server
npm run build         # Build production bundle
npm run start         # Start production server
npm run test          # Run test suites
npm run test:watch    # Run tests in watch mode
npm run lint          # Lint code with ESLint
npm run lint:fix      # Fix linting issues
npm run type-check    # TypeScript type checking
npm run db:migrate    # Run database migrations
npm run db:reset      # Reset database (development only)
```

**Advanced Commands:**
```bash
npm run test:coverage # Run tests with coverage
npm run test:e2e      # Run end-to-end tests
npm run build:analyze # Analyze bundle size
npm run db:studio     # Open Drizzle Studio (database GUI)
npm run docker:build  # Build Docker images
npm run docker:up     # Start Docker services
npm run format        # Format code with Prettier
```

### Environment Configuration

**Development (.env.local)**
```bash
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sim_dev
DATABASE_POOL_MAX=10

# Cache
REDIS_URL=redis://localhost:6379/0

# Authentication (development)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=development-secret-change-in-production

# Development Features
NEXT_PUBLIC_ENABLE_DEVTOOLS=true
ENABLE_MOCK_AUTH=true
LOG_LEVEL=debug
DISABLE_RATE_LIMITING=true

# Testing
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sim_test

# Optional: OAuth (for testing)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## 📁 Code Organization

### Frontend Architecture

**Component Structure:**
```
components/
├── ui/                    # Base design system components
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   └── index.ts          # Barrel exports
├── workflow-wizard/       # Feature-specific components
│   ├── block-configuration.tsx
│   ├── connection-wizard.tsx
│   └── index.ts
├── templates/            # Template-related components
├── help/                # Context-sensitive help
└── icons/               # Icon components
```

**React Component Template:**
```typescript
// components/example/example-component.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface ExampleComponentProps {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Example component demonstrating best practices
 * 
 * @param title - The main heading text
 * @param description - Optional description text
 * @param className - Additional CSS classes
 * @param children - Child React nodes
 */
export function ExampleComponent({
  title,
  description,
  className,
  children
}: ExampleComponentProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex-1">{children}</div>}
    </div>
  );
}

ExampleComponent.displayName = 'ExampleComponent';
```

### Backend Architecture

**API Route Structure:**
```
app/api/
├── auth/                 # Authentication endpoints
├── workflows/           # Workflow CRUD operations
├── templates/           # Template management
├── blocks/              # Block registry
├── executions/          # Execution management
└── health/             # Health check endpoints
```

**API Route Template:**
```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logs/logger';
import { requireAuth } from '@/lib/auth';
import { ratelimit } from '@/lib/ratelimit';

// Request/Response schemas
const CreateExampleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

const ExampleResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.date(),
});

/**
 * Create a new example resource
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await ratelimit.limit(request.ip ?? 'anonymous');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    // Authentication
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Request validation
    const body = await request.json();
    const validatedData = CreateExampleSchema.parse(body);

    logger.info('Creating example resource', {
      userId: user.id,
      data: validatedData
    });

    // Business logic
    const example = await createExample(user.id, validatedData);

    // Response
    return NextResponse.json(
      ExampleResponseSchema.parse(example),
      { status: 201 }
    );

  } catch (error) {
    logger.error('Failed to create example', { error });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function createExample(userId: string, data: z.infer<typeof CreateExampleSchema>) {
  // Implementation details
  return {
    id: 'example-id',
    name: data.name,
    description: data.description || null,
    createdAt: new Date(),
  };
}
```

### Database Schema Patterns

**Drizzle Schema Example:**
```typescript
// db/schema/examples.ts
import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const examples = pgTable('examples', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('examples_user_id_idx').on(table.userId),
  nameIdx: index('examples_name_idx').on(table.name),
}));

// Relations
export const examplesRelations = relations(examples, ({ one }) => ({
  user: one(users, {
    fields: [examples.userId],
    references: [users.id],
  }),
}));

// TypeScript types
export type Example = typeof examples.$inferSelect;
export type NewExample = typeof examples.$inferInsert;
```

## 📏 Coding Standards

### TypeScript Configuration

**Strict TypeScript Setup:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", ".next", "dist"]
}
```

### ESLint Configuration

**Comprehensive Linting Setup:**
```javascript
// eslint.config.mjs
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import next from '@next/eslint-plugin-next';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    plugins: {
      react,
      'react-hooks': reactHooks,
      '@next/next': next,
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      
      // React rules
      'react/jsx-key': 'error',
      'react/no-unescaped-entities': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // Import rules
      'import/order': ['error', {
        'groups': ['builtin', 'external', 'internal'],
        'alphabetize': { 'order': 'asc' }
      }],
      
      // General rules
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'warn',
    }
  }
);
```

### Code Style Guidelines

**Naming Conventions:**
- **Variables/Functions**: camelCase (`getUserData`, `isValidEmail`)
- **Components**: PascalCase (`WorkflowWizard`, `TemplateCard`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`, `API_ENDPOINTS`)
- **Types/Interfaces**: PascalCase (`UserProfile`, `WorkflowConfig`)
- **Files**: kebab-case (`workflow-wizard.tsx`, `user-service.ts`)

**Function Documentation:**
```typescript
/**
 * Processes user workflow data through validation and transformation pipeline
 * 
 * @param userId - Unique identifier for the user
 * @param workflowData - Raw workflow configuration object
 * @param options - Processing options and flags
 * @returns Promise resolving to processed workflow with validation results
 * 
 * @throws {ValidationError} When workflow data is invalid
 * @throws {AuthorizationError} When user lacks permissions
 * 
 * @example
 * ```typescript
 * const result = await processWorkflow('user-123', {
 *   name: 'My Workflow',
 *   blocks: [...]
 * });
 * ```
 */
async function processWorkflow(
  userId: string,
  workflowData: WorkflowInput,
  options: ProcessingOptions = {}
): Promise<ProcessedWorkflow> {
  // Implementation
}
```

## 🧪 Testing Guidelines

### Testing Stack

**Testing Framework:**
- **Unit Tests**: Vitest for fast unit testing
- **Integration Tests**: Vitest with database setup
- **E2E Tests**: Playwright for browser automation
- **Visual Tests**: Storybook with Chromatic
- **API Tests**: Supertest for API endpoint testing

### Test Structure

**Unit Test Template:**
```typescript
// components/__tests__/example-component.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ExampleComponent } from '../example-component';

describe('ExampleComponent', () => {
  it('renders with required props', () => {
    render(<ExampleComponent title="Test Title" />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('displays optional description when provided', () => {
    render(
      <ExampleComponent 
        title="Test Title" 
        description="Test description" 
      />
    );
    
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('handles user interactions correctly', async () => {
    const user = userEvent.setup();
    const mockOnClick = vi.fn();
    
    render(
      <ExampleComponent title="Test Title" onClick={mockOnClick} />
    );
    
    await user.click(screen.getByText('Test Title'));
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    const { container } = render(
      <ExampleComponent title="Test" className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
```

**API Test Template:**
```typescript
// app/api/__tests__/workflows.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { POST } from '../workflows/route';
import { resetDatabase, createTestUser } from '@/test-utils';

describe('/api/workflows', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  describe('POST /api/workflows', () => {
    it('creates workflow with valid data', async () => {
      const user = await createTestUser();
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: {
          name: 'Test Workflow',
          blocks: [
            { type: 'starter', id: 'start' },
            { type: 'response', id: 'end' }
          ]
        }
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        name: 'Test Workflow',
        blocks: expect.arrayContaining([
          expect.objectContaining({ type: 'starter' })
        ])
      });
    });

    it('returns 401 for unauthenticated requests', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: { name: 'Test Workflow' }
      });

      const response = await POST(req);

      expect(response.status).toBe(401);
    });
  });
});
```

**E2E Test Template:**
```typescript
// tests/e2e/workflow-creation.test.ts
import { test, expect } from '@playwright/test';

test.describe('Workflow Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test user and login
    await page.goto('/auth/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    await expect(page).toHaveURL('/workspace');
  });

  test('creates a simple workflow', async ({ page }) => {
    // Navigate to workflow creation
    await page.click('[data-testid=new-workflow-button]');
    await expect(page).toHaveURL('/workflows/new');

    // Fill workflow details
    await page.fill('[data-testid=workflow-name]', 'Test Workflow');
    await page.fill('[data-testid=workflow-description]', 'Test description');

    // Add blocks
    await page.click('[data-testid=add-starter-block]');
    await page.click('[data-testid=add-response-block]');

    // Connect blocks
    await page.dragAndDrop(
      '[data-testid=starter-output]',
      '[data-testid=response-input]'
    );

    // Save workflow
    await page.click('[data-testid=save-workflow]');

    // Verify success
    await expect(page.locator('[data-testid=success-message]')).toBeVisible();
    await expect(page).toHaveURL(/\/workflows\/[a-zA-Z0-9-]+$/);
  });

  test('validates required fields', async ({ page }) => {
    await page.goto('/workflows/new');
    
    // Try to save without required fields
    await page.click('[data-testid=save-workflow]');
    
    // Verify validation errors
    await expect(page.locator('[data-testid=name-error]')).toBeVisible();
    await expect(page.locator('[data-testid=name-error]'))
      .toHaveText('Workflow name is required');
  });
});
```

### Testing Best Practices

**Test Organization:**
- Group related tests in describe blocks
- Use descriptive test names that explain behavior
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies appropriately
- Test both happy paths and error cases

**Coverage Goals:**
- Unit Tests: 80%+ coverage for critical business logic
- Integration Tests: Cover API endpoints and database interactions
- E2E Tests: Cover critical user journeys
- Component Tests: Test UI components in isolation

## 🔄 Contributing Process

### Git Workflow

**Branch Naming:**
- `feature/description` - New features
- `fix/description` - Bug fixes  
- `docs/description` - Documentation changes
- `refactor/description` - Code refactoring
- `test/description` - Testing improvements

**Commit Messages:**
```bash
# Format: type(scope): description
feat(workflows): add workflow templates import functionality
fix(auth): resolve OAuth redirect issue in production
docs(api): update authentication endpoint documentation
test(components): add tests for workflow wizard component
```

### Pull Request Process

1. **Create Feature Branch**
```bash
git checkout -b feature/workflow-templates
```

2. **Make Changes with Tests**
```bash
# Implement feature
# Add/update tests
# Update documentation if needed
```

3. **Run Quality Checks**
```bash
npm run lint          # Fix linting issues
npm run type-check    # Verify TypeScript
npm run test          # Run all tests
npm run build         # Verify build
```

4. **Create Pull Request**
- Descriptive title and detailed description
- Link to related issues
- Include screenshots for UI changes
- Request appropriate reviewers

5. **Code Review Process**
- Address reviewer feedback
- Ensure CI passes
- Squash commits if requested
- Merge when approved

### Code Review Guidelines

**For Authors:**
- Keep PRs small and focused
- Write clear commit messages
- Include tests for new functionality
- Update documentation
- Respond to feedback promptly

**For Reviewers:**
- Review for correctness and clarity
- Check test coverage
- Verify security implications
- Suggest improvements constructively
- Approve when satisfied

## 🏗️ Architecture Patterns

### Component Design Patterns

**Compound Components:**
```typescript
// Flexible component composition
<Dialog>
  <Dialog.Trigger>Open Dialog</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Dialog Title</Dialog.Title>
    </Dialog.Header>
    <Dialog.Body>Dialog content here</Dialog.Body>
    <Dialog.Footer>
      <Dialog.Close>Close</Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog>
```

**Custom Hooks for State Logic:**
```typescript
// hooks/use-workflow-builder.ts
export function useWorkflowBuilder(initialWorkflow?: Workflow) {
  const [workflow, setWorkflow] = useState(initialWorkflow);
  const [isDirty, setIsDirty] = useState(false);
  
  const addBlock = useCallback((block: Block) => {
    setWorkflow(prev => ({
      ...prev,
      blocks: [...prev.blocks, block]
    }));
    setIsDirty(true);
  }, []);

  const removeBlock = useCallback((blockId: string) => {
    setWorkflow(prev => ({
      ...prev,
      blocks: prev.blocks.filter(b => b.id !== blockId)
    }));
    setIsDirty(true);
  }, []);

  return {
    workflow,
    isDirty,
    addBlock,
    removeBlock,
    // ... other methods
  };
}
```

### API Design Patterns

**Repository Pattern:**
```typescript
// lib/repositories/workflow-repository.ts
export class WorkflowRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<Workflow | null> {
    const result = await this.db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id))
      .limit(1);
    
    return result[0] ?? null;
  }

  async create(data: NewWorkflow): Promise<Workflow> {
    const result = await this.db
      .insert(workflows)
      .values(data)
      .returning();
    
    return result[0];
  }

  async update(id: string, data: Partial<Workflow>): Promise<Workflow> {
    const result = await this.db
      .update(workflows)
      .set(data)
      .where(eq(workflows.id, id))
      .returning();
    
    return result[0];
  }
}
```

**Service Layer Pattern:**
```typescript
// lib/services/workflow-service.ts
export class WorkflowService {
  constructor(
    private workflowRepo: WorkflowRepository,
    private executionService: ExecutionService
  ) {}

  async createWorkflow(
    userId: string,
    data: CreateWorkflowRequest
  ): Promise<Workflow> {
    // Validation
    await this.validateWorkflowData(data);
    
    // Authorization
    await this.checkUserPermissions(userId, 'CREATE_WORKFLOW');
    
    // Business logic
    const workflow = await this.workflowRepo.create({
      ...data,
      userId,
      status: 'draft'
    });
    
    // Side effects
    await this.auditService.logWorkflowCreation(userId, workflow.id);
    
    return workflow;
  }
}
```

## 🐛 Debugging & Troubleshooting

### Development Tools

**VS Code Debug Configuration:**
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Next.js",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/next",
      "args": ["dev"],
      "console": "integratedTerminal",
      "env": {
        "NODE_OPTIONS": "--inspect"
      }
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/vitest",
      "args": ["run", "--reporter=verbose"],
      "console": "integratedTerminal"
    }
  ]
}
```

**Browser DevTools Integration:**
```typescript
// lib/dev-tools.ts
export function setupDevTools() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // React DevTools
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || {};
    
    // Custom debugging utilities
    window.debugSim = {
      getWorkflowState: () => useWorkflowStore.getState(),
      clearCache: () => queryClient.clear(),
      logPerformance: () => console.table(performance.getEntriesByType('measure'))
    };
  }
}
```

### Common Issues & Solutions

**Database Connection Issues:**
```bash
# Check database connection
npm run db:check

# Reset database (development)
npm run db:reset

# View database in GUI
npm run db:studio
```

**Build/Type Issues:**
```bash
# Clean build cache
rm -rf .next
npm run build

# Check types in isolation
npm run type-check

# Analyze bundle size
npm run build:analyze
```

**Performance Debugging:**
```typescript
// Performance monitoring
export function withPerformanceMonitoring<T extends Record<string, any>>(
  Component: React.ComponentType<T>
) {
  return function PerformanceMonitoredComponent(props: T) {
    useEffect(() => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'measure') {
            console.log(`${entry.name}: ${entry.duration}ms`);
          }
        });
      });
      
      observer.observe({ entryTypes: ['measure'] });
      
      return () => observer.disconnect();
    }, []);

    return <Component {...props} />;
  };
}
```

---

**Last Updated**: 2025-09-04 | **Version**: 1.0 | **Maintained by**: Development Team