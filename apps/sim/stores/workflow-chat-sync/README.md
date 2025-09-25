# Workflow Chat Synchronization System

A comprehensive bidirectional synchronization system that ensures the visual workflow interface and chat interface always represent the same underlying state. This system enables users to modify workflows through natural language commands and provides real-time workflow state representation in conversational format.

## Features

### 🔄 Bidirectional Synchronization
- Real-time state synchronization between visual and chat interfaces
- Automatic propagation of changes in either direction
- Conflict detection and resolution for simultaneous modifications

### 💬 Natural Language Commands
- Comprehensive command parsing with flexible syntax
- Support for workflow structure modifications via chat
- Intelligent parameter extraction from natural language

### 🎯 Real-time State Representation
- Live workflow state display in chat-friendly format
- Block and connection summaries with execution status
- Automatic state change notifications

### ⚡ Conflict Resolution
- Automatic detection of conflicting changes
- User-friendly resolution interface
- Multiple resolution strategies (visual, chat, merge)

### 🛡️ Error Handling
- Graceful degradation when sync is disabled
- Comprehensive error reporting and recovery
- Validation of all state changes

## Installation

The synchronization system is built into the existing architecture. No additional installation is required.

## Quick Start

### 1. Basic Setup

```tsx
import { SynchronizedChatInterface } from '@/components/workflow-chat-sync'
import { useInitializeWorkflowChatSync } from '@/stores/workflow-chat-sync/store'

function MyApp() {
  // Initialize synchronization
  const sync = useInitializeWorkflowChatSync()

  return (
    <div>
      <SynchronizedChatInterface />
    </div>
  )
}
```

### 2. Integration with Existing Chat

```tsx
import { useChatSyncIntegration } from '@/stores/workflow-chat-sync/integration'

function ExistingChatComponent() {
  const sync = useChatSyncIntegration({
    enableOnMount: true,
    autoResolveConflicts: false,
    notifyOnSync: true
  })

  const handleMessage = (message: string) => {
    // Try to process as command first
    const wasCommand = sync.processCommand(message)

    if (!wasCommand) {
      // Handle as regular workflow input
      // ... existing logic
    }
  }

  return (
    <div>
      {/* Your existing chat UI */}
      {sync.conflicts.length > 0 && (
        <div>Conflicts detected: {sync.conflicts.length}</div>
      )}
    </div>
  )
}
```

### 3. Standalone Components

```tsx
import {
  WorkflowStateDisplay,
  ChatCommandSuggestions,
  ConflictResolutionDialog
} from '@/components/workflow-chat-sync'

function CustomLayout() {
  return (
    <div className="layout">
      <aside>
        <WorkflowStateDisplay compact={true} />
        <ChatCommandSuggestions onCommandSelect={handleCommand} />
      </aside>

      <main>
        {/* Your main content */}
      </main>

      <ConflictResolutionDialog
        open={showConflicts}
        onOpenChange={setShowConflicts}
      />
    </div>
  )
}
```

## Chat Commands

The system supports natural language commands with flexible syntax:

### Structure Commands

| Command Pattern | Description | Example |
|----------------|-------------|---------|
| `add [type] block` | Add a new block | `add llm block` |
| `delete [name]` | Remove a block | `delete start block` |
| `connect [A] to [B]` | Connect two blocks | `connect start to llm` |
| `disconnect [A] from [B]` | Remove connection | `disconnect start from llm` |
| `move [block] to [position]` | Change position | `move llm block to top` |

### Configuration Commands

| Command Pattern | Description | Example |
|----------------|-------------|---------|
| `set [property] of [block] to [value]` | Modify block property | `set name of llm to OpenAI` |
| `enable [block]` | Enable a block | `enable llm block` |
| `disable [block]` | Disable a block | `disable debug block` |

### Execution Commands

| Command Pattern | Description | Example |
|----------------|-------------|---------|
| `run workflow` | Start execution | `run workflow` |
| `pause workflow` | Pause execution | `pause workflow` |
| `stop workflow` | Stop execution | `stop workflow` |

### Information Commands

| Command Pattern | Description | Example |
|----------------|-------------|---------|
| `status` | Get workflow status | `what is the status?` |
| `describe workflow` | Get structure info | `describe this workflow` |
| `explain [block]` | Get block details | `explain llm block` |

## API Reference

### Core Store

```tsx
import { useWorkflowChatSyncStore } from '@/stores/workflow-chat-sync/store'

const {
  // State
  isEnabled,
  syncState,
  conflicts,
  workflowStateRepresentation,

  // Actions
  enableSync,
  disableSync,
  parseChatCommand,
  executeWorkflowCommand,
  resolveConflict
} = useWorkflowChatSyncStore()
```

### Integration Hook

```tsx
import { useChatSyncIntegration } from '@/stores/workflow-chat-sync/integration'

const {
  isEnabled,
  syncState,
  conflicts,
  processCommand,
  notifyUser,
  workflowState
} = useChatSyncIntegration({
  enableOnMount: true,
  autoResolveConflicts: false,
  notifyOnSync: true
})
```

### State Awareness Hook

```tsx
import { useWorkflowStateAwareness } from '@/stores/workflow-chat-sync/integration'

const {
  summary,
  findBlock,
  connections,
  isEnabled,
  representation
} = useWorkflowStateAwareness()
```

## Components

### SynchronizedChatInterface

Complete chat interface with synchronization capabilities.

```tsx
<SynchronizedChatInterface
  className="custom-class"
  showSidebar={true}
  compactMode={false}
/>
```

Props:
- `className?: string` - Additional CSS classes
- `showSidebar?: boolean` - Show/hide the sidebar (default: true)
- `compactMode?: boolean` - Enable compact display (default: false)

### WorkflowStateDisplay

Real-time workflow state visualization.

```tsx
<WorkflowStateDisplay
  compact={false}
  showControls={true}
  className="custom-class"
/>
```

Props:
- `compact?: boolean` - Compact display mode (default: false)
- `showControls?: boolean` - Show sync controls (default: true)
- `className?: string` - Additional CSS classes

### ChatCommandSuggestions

Interactive command reference and suggestions.

```tsx
<ChatCommandSuggestions
  onCommandSelect={(cmd) => console.log(cmd)}
  compact={false}
  className="custom-class"
/>
```

Props:
- `onCommandSelect?: (command: string) => void` - Command selection handler
- `compact?: boolean` - Compact display mode (default: false)
- `className?: string` - Additional CSS classes

### ConflictResolutionDialog

Modal dialog for resolving synchronization conflicts.

```tsx
<ConflictResolutionDialog
  open={showDialog}
  onOpenChange={setShowDialog}
/>
```

Props:
- `open: boolean` - Dialog visibility state
- `onOpenChange: (open: boolean) => void` - Visibility change handler

## Advanced Usage

### Custom Command Processing

```tsx
import { useWorkflowChatSyncStore } from '@/stores/workflow-chat-sync/store'

function CustomCommandProcessor() {
  const store = useWorkflowChatSyncStore()

  const processCustomCommand = (message: string) => {
    // Try built-in commands first
    const builtinCommand = store.parseChatCommand(message)
    if (builtinCommand) {
      return store.executeWorkflowCommand(builtinCommand)
    }

    // Handle custom commands
    if (message.includes('save workflow')) {
      // Custom save logic
      return true
    }

    return false
  }

  return { processCustomCommand }
}
```

### Batch Operations

```tsx
import { WorkflowBatchOperations } from '@/stores/workflow-chat-sync/integration'

function performComplexWorkflowSetup() {
  const batch = new WorkflowBatchOperations()

  batch
    .addBlock('llm', 'OpenAI', { x: 200, y: 100 })
    .addBlock('database', 'Storage', { x: 400, y: 100 })
    .connectBlocks('OpenAI', 'Storage')
    .execute()
}
```

### State Snapshots

```tsx
import { createWorkflowSnapshot } from '@/stores/workflow-chat-sync/integration'

function debugWorkflowState() {
  const snapshot = createWorkflowSnapshot()
  console.log('Workflow snapshot:', snapshot)

  return {
    timestamp: snapshot.timestamp,
    blockCount: snapshot.workflow.blockCount,
    isExecuting: snapshot.execution.isExecuting,
    syncEnabled: snapshot.sync.enabled
  }
}
```

## Event System

The synchronization system broadcasts events for state changes:

```tsx
// Listen for state changes
window.addEventListener('active-workflow-changed', (event) => {
  console.log('Active workflow changed:', event.detail.workflowId)
})
```

## Conflict Resolution

When conflicts occur, the system provides several resolution strategies:

### Automatic Resolution
```tsx
const sync = useChatSyncIntegration({
  autoResolveConflicts: true // Automatically resolve with suggested strategy
})
```

### Manual Resolution
```tsx
const { conflicts, resolveConflict } = useWorkflowChatSyncStore()

conflicts.forEach(conflict => {
  // Examine the conflict
  console.log(conflict.description)
  console.log('Chat change:', conflict.chatChange)
  console.log('Visual change:', conflict.visualChange)

  // Resolve manually
  resolveConflict(conflict.id, 'visual') // or 'chat' or 'merge'
})
```

### Resolution Strategies

- **`visual`**: Keep changes made in the visual interface
- **`chat`**: Keep changes made through chat commands
- **`merge`**: Attempt to merge both changes (when possible)

## Performance Considerations

### Optimization
- State updates are batched to minimize re-renders
- Large workflows (100+ blocks) are handled efficiently
- Command parsing is cached for repeated patterns
- Sync operations are debounced to prevent excessive updates

### Memory Management
- Command history is limited to recent entries
- State representations are generated on-demand
- Conflict data is cleaned up after resolution

## Troubleshooting

### Common Issues

**Sync not working**
- Ensure `enableSync()` has been called
- Check that there's an active workflow
- Verify the workflow store is properly initialized

**Commands not recognized**
- Check command syntax in the suggestions panel
- Ensure sync is enabled
- Look for typos in block names

**Conflicts not resolving**
- Check that the conflict resolution dialog is implemented
- Verify conflict resolution handlers are working
- Look for console errors during resolution

**Performance issues**
- Reduce sync frequency for large workflows
- Use compact mode for better performance
- Consider disabling sync during bulk operations

### Debug Mode

Enable debug logging:

```tsx
// In your app initialization
localStorage.setItem('debug', 'WorkflowChatSync*')
```

### Health Check

```tsx
import { createWorkflowSnapshot } from '@/stores/workflow-chat-sync/integration'

function healthCheck() {
  const snapshot = createWorkflowSnapshot()
  const store = useWorkflowChatSyncStore.getState()

  return {
    syncEnabled: store.isEnabled,
    syncState: store.syncState,
    conflictCount: store.conflicts.length,
    lastSync: store.lastSyncTimestamp,
    workflowLoaded: !!snapshot.workflowId,
    blockCount: snapshot.workflow.blockCount
  }
}
```

## Migration Guide

### From Existing Chat Interface

1. **Replace existing chat component**:
   ```tsx
   // Before
   <ExistingChatComponent />

   // After
   <SynchronizedChatInterface />
   ```

2. **Add sync initialization**:
   ```tsx
   import { useInitializeWorkflowChatSync } from '@/stores/workflow-chat-sync/store'

   function App() {
     const sync = useInitializeWorkflowChatSync()
     // ... rest of component
   }
   ```

3. **Update message handlers**:
   ```tsx
   // Before
   const handleMessage = (message) => {
     executeWorkflow(message)
   }

   // After
   const { processCommand } = useChatSyncIntegration()
   const handleMessage = (message) => {
     const wasCommand = processCommand(message)
     if (!wasCommand) {
       executeWorkflow(message)
     }
   }
   ```

### Gradual Integration

For gradual migration, you can integrate components one at a time:

```tsx
// Step 1: Add state display
<ExistingChatComponent />
<WorkflowStateDisplay />

// Step 2: Add command suggestions
<ExistingChatComponent />
<WorkflowStateDisplay />
<ChatCommandSuggestions />

// Step 3: Full replacement
<SynchronizedChatInterface />
```

## Contributing

### Adding New Commands

1. **Add command type to types.ts**:
   ```tsx
   export type ChatCommandType =
     | 'existing_command'
     | 'your_new_command'
   ```

2. **Update CHAT_COMMANDS constant**:
   ```tsx
   export const CHAT_COMMANDS = {
     // ... existing commands
     your_new_command: {
       command: 'your pattern',
       description: 'What it does',
       example: 'your command example',
       category: 'structure' // or other category
     }
   }
   ```

3. **Add parsing logic in store**:
   ```tsx
   parseChatCommand: (message: string): ChatCommand | null => {
     // ... existing parsing

     if (message.includes('your trigger')) {
       return {
         type: 'your_new_command',
         description: 'your description',
         parameters: { /* extracted params */ }
       }
     }
   }
   ```

4. **Add execution logic**:
   ```tsx
   executeWorkflowCommand: (command: ChatCommand) => {
     // ... existing cases

     case 'your_new_command':
       yourCommandImplementation(command.parameters)
       break
   }
   ```

5. **Add tests**:
   ```tsx
   it('should parse your new command', () => {
     const command = store.parseChatCommand('your test input')
     expect(command?.type).toBe('your_new_command')
   })
   ```

### Testing

Run the test suites:

```bash
# Unit tests
npm test workflow-chat-sync/store.test.ts

# Integration tests
npm test workflow-chat-sync/integration.test.tsx

# All sync tests
npm test -- --testPathPattern=workflow-chat-sync
```

## License

This synchronization system is part of the larger workflow application and follows the same licensing terms.