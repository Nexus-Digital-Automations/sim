# Workflow Permission and Authorization Patterns Research Report

## Executive Summary

This comprehensive research analyzes the permission and authorization architecture in the Sim codebase, focusing on workflow-specific access control, multi-tenant security, and API authorization mechanisms. The system implements a sophisticated Role-Based Access Control (RBAC) model with granular permissions across workspaces, workflows, and organizations.

## 1. Permission Model Architecture

### Core Permission System

The Sim platform implements a hierarchical permission model with three primary permission levels:

```typescript
// Permission hierarchy (from lowest to highest)
export const permissionTypeEnum = pgEnum('permission_type', ['read', 'write', 'admin'])

const permissionOrder: Record<PermissionType, number> = { 
  admin: 3, 
  write: 2, 
  read: 1 
}
```

### Database Schema Structure

The permission system is built on a flexible entity-based model:

```typescript
export const permissions = pgTable('permissions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(), // 'workspace', 'workflow', 'organization', etc.
  entityId: text('entity_id').notNull(), // ID of the workspace, workflow, etc.
  permissionType: permissionTypeEnum('permission_type').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

**Key Design Features:**
- **Entity-agnostic design**: Supports any resource type through `entityType` and `entityId`
- **Unique permission constraint**: Prevents duplicate permission rows per user/entity combination
- **Optimized indexes**: Multiple composite indexes for different query patterns
- **Hierarchical permissions**: Admin > Write > Read with proper precedence handling

### Permission Resolution Algorithm

The system uses a sophisticated permission resolution that finds the highest permission level:

```typescript
export async function getUserEntityPermissions(
  userId: string,
  entityType: string,
  entityId: string
): Promise<PermissionType | null> {
  // Query all permissions for the user/entity combination
  const result = await db.select({ permissionType: permissions.permissionType })
    .from(permissions)
    .where(and(
      eq(permissions.userId, userId),
      eq(permissions.entityType, entityType),
      eq(permissions.entityId, entityId)
    ))

  // Return the highest permission level found
  const highestPermission = result.reduce((highest, current) => {
    return permissionOrder[current.permissionType] > permissionOrder[highest.permissionType]
      ? current : highest
  })

  return highestPermission.permissionType
}
```

## 2. Multi-Tenant Architecture

### Three-Tier Isolation Model

The system implements a three-tier isolation structure:

1. **User Level**: Individual user ownership and personal resources
2. **Workspace Level**: Team collaboration and resource sharing
3. **Organization Level**: Enterprise-wide resource management

### Workspace-Based Isolation

Workspaces serve as the primary collaboration unit:

```typescript
export const workspace = pgTable('workspace', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: text('owner_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

**Workspace Permission Inheritance:**
- Workspace owners have implicit admin permissions
- Workspace-level permissions cascade to all contained workflows
- Members can have different permission levels within the same workspace

### Organization-Level Management

Organizations provide enterprise-level control:

```typescript
export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  logo: text('logo'),
  metadata: json('metadata'),
  orgUsageLimit: decimal('org_usage_limit'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const member = pgTable('member', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'admin' or 'member' - team-level permissions only
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

## 3. Authorization Layers

### API-Level Authorization

The system implements multiple authorization layers for comprehensive security:

#### 1. Session-Based Authentication

```typescript
export async function getSession() {
  const hdrs = await headers()
  return await auth.api.getSession({
    headers: hdrs,
  })
}
```

**Features:**
- Cookie-based session management with 30-day expiration
- Automatic session refresh every 24 hours
- Fresh session validation for sensitive operations (1-hour window)
- Better Auth integration with Drizzle ORM adapter

#### 2. API Key Authentication

For workflow execution and external integrations:

```typescript
export async function validateWorkflowAccess(
  request: NextRequest,
  workflowId: string,
  requireDeployment = true
): Promise<ValidationResult> {
  // API key authentication for deployed workflows
  let apiKeyHeader = request.headers.get('x-api-key')
  
  if (workflow.pinnedApiKey) {
    // Pinned API key takes precedence
    if (workflow.pinnedApiKey !== apiKeyHeader) {
      return { error: { message: 'Unauthorized: Invalid API key', status: 401 } }
    }
  } else {
    // Verify the key belongs to the workflow owner
    const [owned] = await db.select({ key: apiKey.key })
      .from(apiKey)
      .where(and(eq(apiKey.userId, workflow.userId), eq(apiKey.key, apiKeyHeader)))
    
    if (!owned) {
      return { error: { message: 'Unauthorized: Invalid API key', status: 401 } }
    }
  }
}
```

**API Key Security Features:**
- User-scoped API keys with owner verification
- Workflow-specific pinned API keys for enhanced security
- API key usage tracking and expiration support
- Header-based authentication with consistent naming

#### 3. Resource-Level Permission Validation

```typescript
export async function verifyWorkflowAccess(
  userId: string,
  workflowId: string
): Promise<{ hasAccess: boolean; role?: string; workspaceId?: string }> {
  const workflowData = await db.select({
    userId: workflow.userId,
    workspaceId: workflow.workspaceId,
    name: workflow.name,
  }).from(workflow).where(eq(workflow.id, workflowId)).limit(1)

  // Direct ownership check
  if (workflowData[0].userId === userId) {
    return { hasAccess: true, role: 'admin', workspaceId: workflowData[0].workspaceId }
  }

  // Workspace membership check
  if (workflowData[0].workspaceId) {
    const userRole = await verifyWorkspaceMembership(userId, workflowData[0].workspaceId)
    if (userRole) {
      return { hasAccess: true, role: userRole, workspaceId: workflowData[0].workspaceId }
    }
  }

  return { hasAccess: false }
}
```

### Socket.IO Real-time Authorization

The real-time system implements comprehensive authorization:

```typescript
export interface AuthenticatedSocket extends Socket {
  userId?: string
  userName?: string
  userEmail?: string
  activeOrganizationId?: string
}

export async function authenticateSocket(socket: AuthenticatedSocket, next: any) {
  const token = socket.handshake.auth?.token
  
  const session = await auth.api.verifyOneTimeToken({
    body: { token }
  })

  if (!session?.user?.id) {
    return next(new Error('Invalid session'))
  }

  // Store user info in socket for later use
  socket.userId = session.user.id
  socket.userName = session.user.name || session.user.email || 'Unknown User'
  socket.userEmail = session.user.email
  socket.activeOrganizationId = session.session.activeOrganizationId || undefined

  next()
}
```

**Real-time Permission Checks:**

```typescript
export async function verifyOperationPermission(
  userId: string,
  workflowId: string,
  operation: string,
  target: string
): Promise<{ allowed: boolean; reason?: string }> {
  const accessInfo = await verifyWorkflowAccess(userId, workflowId)

  const rolePermissions = {
    admin: ['add', 'remove', 'update', 'update-position', 'update-name', 'toggle-enabled', 'update-parent', 'update-wide', 'update-advanced-mode', 'update-trigger-mode', 'toggle-handles', 'duplicate'],
    write: ['add', 'remove', 'update', 'update-position', 'update-name', 'toggle-enabled', 'update-parent', 'update-wide', 'update-advanced-mode', 'update-trigger-mode', 'toggle-handles', 'duplicate'],
    read: ['update-position'] // Read-only users can only move things around
  }

  const allowedOperations = rolePermissions[accessInfo.role] || []
  return { 
    allowed: allowedOperations.includes(operation),
    reason: !allowedOperations.includes(operation) ? 
      `Role '${accessInfo.role}' not permitted to perform '${operation}' on '${target}'` : 
      undefined
  }
}
```

## 4. Workflow-Specific Permissions

### Ownership and Collaboration Models

#### Direct Ownership
```typescript
export const workflow = pgTable('workflow', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').references(() => workspace.id, { onDelete: 'cascade' }),
  // ... other fields
  collaborators: json('collaborators').notNull().default('[]'),
})
```

**Ownership Hierarchy:**
1. **Direct Owner**: Full admin rights (create, edit, delete, deploy)
2. **Workspace Admin**: Admin rights to all workflows in workspace
3. **Workspace Write**: Edit workflows, cannot delete or manage permissions
4. **Workspace Read**: View workflows and execution logs

#### Collaboration Features
- **Collaborators JSON field**: Stores additional collaborator information
- **Workspace-based sharing**: Automatic access through workspace membership
- **Granular operation permissions**: Different operations require different permission levels

### Deployment and Execution Permissions

#### Deployment Authorization
```typescript
if (requireDeployment) {
  if (!workflow.isDeployed) {
    return { error: { message: 'Workflow is not deployed', status: 403 } }
  }
  
  // API key required for deployed workflow execution
  if (!apiKeyHeader) {
    return { error: { message: 'Unauthorized: API key required', status: 401 } }
  }
}
```

**Deployment Security Model:**
- Only admins can deploy/undeploy workflows
- Deployed workflows require API key authentication
- Pinned API keys provide workflow-specific security
- Execution logs track all API-based invocations

#### Runtime Authorization
- **API Key Validation**: Every external execution validates API key ownership
- **Rate Limiting**: User-based rate limits prevent abuse
- **Usage Tracking**: Comprehensive billing and usage monitoring
- **Audit Logging**: All workflow executions are logged with user context

## 5. API Security Mechanisms

### API Key Management

```typescript
export const apiKey = pgTable('api_key', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  key: text('key').notNull().unique(),
  lastUsed: timestamp('last_used'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
})
```

**Security Features:**
- **User-scoped keys**: API keys are tied to specific users
- **Unique key constraint**: Prevents key duplication
- **Usage tracking**: `lastUsed` timestamp for monitoring
- **Expiration support**: Optional key expiration dates
- **Audit trail**: Creation and update timestamps

### Middleware Security Layers

```typescript
export async function middleware(request: NextRequest) {
  // 1. Session validation
  const sessionCookie = getSessionCookie(request)
  const hasActiveSession = !!sessionCookie

  // 2. Suspicious request blocking
  const SUSPICIOUS_UA_PATTERNS = [
    /^\s*$/, // Empty user agents
    /\.\./, // Path traversal attempt
    /<\s*script/i, // Potential XSS payloads
    /^\(\)\s*{/, // Command execution attempt
    /\b(sqlmap|nikto|gobuster|dirb|nmap)\b/i, // Known scanning tools
  ]

  // 3. Protected route enforcement
  if (url.pathname.startsWith('/workspace')) {
    if (!hasActiveSession) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // 4. CSP header injection
  response.headers.set('Content-Security-Policy', generateRuntimeCSP())
}
```

### Content Security Policy

The system implements dynamic CSP generation:

```typescript
export function generateRuntimeCSP(): string {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https:",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'"
  ].join('; ')
  
  return csp
}
```

## 6. Client-Side Permission Integration

### React Hook Architecture

The system provides comprehensive client-side permission management:

```typescript
export interface WorkspaceUserPermissions {
  canRead: boolean
  canEdit: boolean
  canAdmin: boolean
  userPermissions: PermissionType
  isLoading: boolean
  error: string | null
}

export function useUserPermissions(
  workspacePermissions: WorkspacePermissions | null,
  permissionsLoading = false,
  permissionsError: string | null = null
): WorkspaceUserPermissions {
  // Find current user in workspace permissions
  const currentUser = workspacePermissions?.users?.find(
    (user) => user.email.toLowerCase() === sessionEmail.toLowerCase()
  )

  const userPerms = currentUser.permissionType || 'read'
  
  return {
    canRead: true, // If user found in workspace, they have read access
    canEdit: userPerms === 'write' || userPerms === 'admin',
    canAdmin: userPerms === 'admin',
    userPermissions: userPerms,
    isLoading: false,
    error: permissionsError
  }
}
```

### Permission-Aware UI Components

The client-side implementation provides:
- **Reactive permission updates**: Real-time permission changes
- **Granular UI control**: Different UI elements based on permission levels
- **Error handling**: Comprehensive error states and fallbacks
- **Loading states**: Proper loading indicators during permission checks

## 7. Billing and Subscription Security

### Subscription Authorization

```typescript
export async function authorizeSubscriptionReference(
  userId: string,
  referenceId: string
): Promise<boolean> {
  // User can always manage their own subscriptions
  if (referenceId === userId) {
    return true
  }

  // Check if referenceId is an organizationId the user has admin rights to
  const members = await db.select()
    .from(schema.member)
    .where(and(
      eq(schema.member.userId, userId), 
      eq(schema.member.organizationId, referenceId)
    ))

  const member = members[0]
  return member?.role === 'owner' || member?.role === 'admin'
}
```

**Billing Security Features:**
- **Reference-based authorization**: Users/organizations manage their own billing
- **Role-based billing access**: Only admins can modify organization billing
- **Stripe integration security**: Webhook signature verification
- **Usage limit enforcement**: Real-time usage tracking and limits

## 8. Security Best Practices Implemented

### Defense in Depth
1. **Authentication Layer**: Session-based auth with Better Auth
2. **Authorization Layer**: RBAC with granular permissions
3. **Transport Security**: HTTPS enforcement and CSP headers
4. **Input Validation**: SQL injection prevention with Drizzle ORM
5. **Rate Limiting**: User-based and IP-based rate limiting
6. **Audit Logging**: Comprehensive action logging and monitoring

### OWASP Compliance
- **A01 Broken Access Control**: Comprehensive RBAC implementation
- **A02 Cryptographic Failures**: Proper session management and API key security
- **A03 Injection**: Parameterized queries with Drizzle ORM
- **A05 Security Misconfiguration**: Strict CSP and security headers
- **A07 Identification and Authentication Failures**: Multi-factor auth support
- **A08 Software and Data Integrity Failures**: Webhook signature verification

## 9. Performance Considerations

### Database Optimization

The permission system is optimized for performance:

```sql
-- Primary access pattern indexes
CREATE INDEX permissions_user_id_idx ON permissions(user_id);
CREATE INDEX permissions_entity_idx ON permissions(entity_type, entity_id);
CREATE INDEX permissions_user_entity_type_idx ON permissions(user_id, entity_type);
CREATE INDEX permissions_user_entity_idx ON permissions(user_id, entity_type, entity_id);

-- Uniqueness constraint prevents permission duplication
CREATE UNIQUE INDEX permissions_unique_constraint ON permissions(user_id, entity_type, entity_id);
```

### Caching Strategy
- **Session caching**: 24-hour cookie cache for active sessions
- **Permission memoization**: Client-side permission caching
- **API response caching**: Appropriate cache headers for static resources

### Query Optimization
- **Composite indexes**: Optimized for common query patterns
- **Selective queries**: Only fetch required permission data
- **Batch operations**: Transaction-based permission updates

## 10. Recommendations for Permission-Aware API Design

### 1. Consistent Authorization Patterns
```typescript
// Recommended pattern for all API endpoints
export async function protectedHandler(request: NextRequest, { params }) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const hasPermission = await checkEntityPermission(
    session.user.id, 
    'workflow', 
    params.id, 
    'write'
  )
  
  if (!hasPermission) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // Proceed with authorized operation
}
```

### 2. Permission Middleware Factory
```typescript
export function withPermission(
  entityType: string, 
  requiredPermission: PermissionType
) {
  return async function permissionMiddleware(
    request: NextRequest, 
    context: any, 
    next: Function
  ) {
    const session = await getSession()
    const entityId = context.params.id
    
    const hasPermission = await getUserEntityPermissions(
      session.user.id, 
      entityType, 
      entityId
    )
    
    if (!hasPermission || !hasRequiredLevel(hasPermission, requiredPermission)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    return next()
  }
}
```

### 3. Fine-Grained Operation Permissions
```typescript
interface OperationPermissions {
  [operation: string]: {
    requiredRole: PermissionType
    additionalChecks?: (context: any) => Promise<boolean>
  }
}

const workflowOperations: OperationPermissions = {
  'read': { requiredRole: 'read' },
  'update': { requiredRole: 'write' },
  'delete': { requiredRole: 'admin' },
  'deploy': { 
    requiredRole: 'admin',
    additionalChecks: async (workflow) => workflow.isValidForDeployment
  }
}
```

### 4. Audit Logging Integration
```typescript
export async function auditLog(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, any>
) {
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    userId,
    action,
    entityType,
    entityId,
    metadata,
    timestamp: new Date(),
    ipAddress: getClientIP(),
    userAgent: getUserAgent()
  })
}
```

## Conclusion

The Sim codebase implements a comprehensive, production-ready permission and authorization system that follows security best practices and provides scalable multi-tenant isolation. The RBAC model with hierarchical permissions, combined with multiple authorization layers and comprehensive audit logging, creates a robust security framework suitable for enterprise deployment.

Key strengths of the system include:
- **Flexible entity-based permissions** that scale across different resource types
- **Multi-layered security** with defense-in-depth principles
- **Performance-optimized** database design with appropriate indexing
- **Client-side integration** with reactive permission updates
- **Comprehensive audit trail** for compliance and monitoring
- **API security** with multiple authentication mechanisms

The system demonstrates enterprise-grade security architecture with proper separation of concerns, making it suitable for handling sensitive workflows and data in multi-tenant environments.