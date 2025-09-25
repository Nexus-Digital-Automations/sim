# Agent Management UI Architecture Design

## Overview
This document outlines the architecture for the comprehensive Agent Management User Interface that will be integrated into Sim's workspace settings.

## Integration Points

### 1. Workspace Navigation Structure
```
/workspace/[workspaceId]/
├── w/ (workflows)
├── knowledge/
├── templates/
├── logs/
└── agents/ (NEW - Agent Management Section)
    ├── page.tsx (Agent List & Overview)
    ├── new/ (Create New Agent)
    ├── [agentId]/ (Agent Details & Configuration)
    │   ├── guidelines/ (Guideline Management)
    │   ├── journeys/ (Journey Creator)
    │   └── analytics/ (Performance Analytics)
    └── components/
        ├── agent-list/
        ├── agent-form/
        ├── guideline-builder/
        ├── journey-creator/
        └── analytics-dashboard/
```

### 2. API Integration Strategy
Leverage existing Parlant infrastructure:
- **Agent Operations**: Use `apps/sim/services/parlant/agents.ts`
- **Tool Registry**: Integrate with `apps/sim/services/parlant/tool-adapter/adapter-registry.ts`
- **Database**: Utilize existing Parlant schema and queries
- **Authentication**: Use existing workspace permission system

## Component Architecture

### Core Components

#### 1. AgentList Component
**Location**: `/workspace/[workspaceId]/agents/components/agent-list/`
**Purpose**: Display, filter, and manage agents in workspace
**Features**:
- Paginated agent list with search/filtering
- Quick actions (edit, delete, duplicate)
- Status indicators (active/inactive/training)
- Bulk operations support

#### 2. AgentForm Component
**Location**: `/workspace/[workspaceId]/agents/components/agent-form/`
**Purpose**: Create/edit agent configuration
**Features**:
- Multi-step form wizard
- Real-time validation
- Model configuration (GPT-4, Claude, etc.)
- System prompt editor with AI assistance
- Permission settings per workspace

#### 3. GuidelineBuilder Component
**Location**: `/workspace/[workspaceId]/agents/components/guideline-builder/`
**Purpose**: Visual interface for creating agent guidelines
**Features**:
- Condition/Action builder with autocomplete
- Tool integration dropdown (from registry)
- Priority setting and ordering
- Testing interface for guidelines
- Import/export functionality

#### 4. JourneyCreator Component
**Location**: `/workspace/[workspaceId]/agents/components/journey-creator/`
**Purpose**: Visual journey designer integrated with workflows
**Features**:
- Drag-and-drop state machine builder
- Integration with existing ReactFlow patterns
- State transition condition editor
- Tool/action assignment per state
- Journey testing and simulation

#### 5. AnalyticsDashboard Component
**Location**: `/workspace/[workspaceId]/agents/components/analytics-dashboard/`
**Purpose**: Agent performance and conversation insights
**Features**:
- Conversation volume and success metrics
- Guideline effectiveness analysis
- Tool usage statistics
- Journey completion rates
- Real-time performance monitoring

## Data Flow Architecture

### State Management Strategy
Use a combination of:
1. **React Query** for server state management
2. **Zustand** for local UI state
3. **React Hook Form** for form state
4. **Context API** for workspace-level configuration

### API Data Flow
```typescript
Client Component -> React Query -> Parlant Service -> Database
                                ↓
Tool Registry <- Agent Operations -> Workspace Validation
```

## Technical Specifications

### Technology Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **State Management**: React Query + Zustand
- **Forms**: React Hook Form + Zod validation
- **UI Components**: Sim's design system components
- **Data Visualization**: Recharts for analytics
- **Testing**: Jest + React Testing Library

### Performance Considerations
1. **Lazy Loading**: Code split each major component
2. **Virtualization**: For large agent/guideline lists
3. **Caching**: Aggressive caching of tool registry data
4. **Optimistic Updates**: For better UX on CRUD operations
5. **WebSocket Integration**: Real-time updates for multi-user editing

### Security & Permissions
1. **Workspace Isolation**: All operations scoped to workspace
2. **Role-Based Access**: Admin/Editor/Viewer permissions
3. **API Validation**: Server-side validation for all operations
4. **Audit Logging**: Track all agent configuration changes

## UI/UX Design Patterns

### Navigation Integration
- Add "Agents" tab to workspace navigation sidebar
- Breadcrumb navigation for nested sections
- Consistent with existing Sim design patterns

### Component Consistency
- Reuse existing Sim design system components
- Follow established loading states and error handling
- Maintain consistent spacing and typography

### Accessibility
- Full keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus management for complex interactions

## Integration Strategy

### Phase 1: Core Infrastructure
1. Set up routing and navigation
2. Create basic CRUD operations for agents
3. Integrate with existing Parlant API
4. Basic agent list and form components

### Phase 2: Advanced Features
1. Implement guideline builder
2. Add tool registry integration
3. Create journey designer
4. Basic analytics dashboard

### Phase 3: Polish & Optimization
1. Advanced analytics features
2. Performance optimizations
3. Enhanced UX features
4. Comprehensive testing coverage

## File Structure
```
apps/sim/app/workspace/[workspaceId]/agents/
├── page.tsx
├── new/
│   └── page.tsx
├── [agentId]/
│   ├── page.tsx
│   ├── guidelines/
│   │   └── page.tsx
│   ├── journeys/
│   │   └── page.tsx
│   └── analytics/
│       └── page.tsx
├── components/
│   ├── agent-list/
│   │   ├── agent-list.tsx
│   │   ├── agent-card.tsx
│   │   └── agent-filters.tsx
│   ├── agent-form/
│   │   ├── agent-form.tsx
│   │   ├── basic-settings.tsx
│   │   ├── model-configuration.tsx
│   │   └── permissions-settings.tsx
│   ├── guideline-builder/
│   │   ├── guideline-builder.tsx
│   │   ├── condition-editor.tsx
│   │   ├── action-editor.tsx
│   │   └── tool-selector.tsx
│   ├── journey-creator/
│   │   ├── journey-creator.tsx
│   │   ├── state-editor.tsx
│   │   ├── transition-builder.tsx
│   │   └── journey-simulator.tsx
│   └── analytics-dashboard/
│       ├── analytics-dashboard.tsx
│       ├── conversation-metrics.tsx
│       ├── guideline-analytics.tsx
│       └── performance-charts.tsx
├── hooks/
│   ├── use-agents.ts
│   ├── use-guidelines.ts
│   ├── use-journeys.ts
│   └── use-agent-analytics.ts
└── types/
    └── agent-ui.types.ts
```

## Success Metrics
1. **User Adoption**: 80%+ of workspaces create at least one agent
2. **Feature Usage**: All core features used by 60%+ of agent creators
3. **Performance**: < 2s load time for all major views
4. **User Satisfaction**: > 4.5/5 rating in user feedback
5. **Error Rate**: < 1% error rate on all operations

This architecture provides a scalable, maintainable foundation for the Agent Management UI while seamlessly integrating with Sim's existing infrastructure.