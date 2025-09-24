# Workflow to Journey Mapping System

A comprehensive ReactFlow → Parlant Journey conversion engine that transforms visual workflow designs into executable conversational journey state machines.

## Overview

This conversion system bridges the gap between visual workflow design (ReactFlow) and conversational AI execution (Parlant journeys). It provides:

- **Intelligent Node Analysis**: Deep analysis of ReactFlow nodes to determine optimal conversion strategies
- **State-Aware Conversion**: Transforms nodes into appropriate Parlant states (chat, tool, condition, etc.)
- **Data Preservation**: Maintains workflow data integrity and enables potential reverse conversion
- **Comprehensive Error Handling**: Robust error recovery with fallback strategies
- **Validation Framework**: Pre and post-conversion validation with detailed feedback

## Architecture

```
workflow-converter/
├── core-engine.ts           # Main conversion orchestrator
├── types.ts                 # Type definitions
├── analyzers/
│   └── node-analyzer.ts     # ReactFlow node analysis
├── converters/
│   ├── base-converter.ts    # Abstract converter base
│   ├── starter-converter.ts # Starter/trigger nodes
│   ├── agent-converter.ts   # AI agent nodes
│   └── api-converter.ts     # API/function nodes
├── generators/
│   └── state-generator.ts   # Parlant state generation
├── builders/
│   └── transition-builder.ts # State transition creation
├── error-handling/
│   └── error-recovery.ts    # Conversion error recovery
├── validation/
│   └── validation-engine.ts # Input/output validation
└── __tests__/               # Comprehensive test suite
```

## Usage

### Basic Conversion

```typescript
import { convertWorkflowToJourney } from '@/services/parlant/workflow-converter'

// Convert a ReactFlow workflow to Parlant journey
const result = await convertWorkflowToJourney(workflow, {
  preserveLayout: true,
  validateOutput: true
})

if (result.success) {
  console.log('Journey created:', result.journey)
} else {
  console.error('Conversion failed:', result.errors)
}
```

### Advanced Usage with Custom Options

```typescript
import { WorkflowConversionEngine } from '@/services/parlant/workflow-converter'

const engine = new WorkflowConversionEngine()

// Register custom node converter
engine.registerNodeConverter('custom-type', new CustomNodeConverter())

// Convert with progress tracking
const result = await engine.convert(
  workflow,
  {
    preserveLayout: true,
    includeDebugInfo: true,
    validateOutput: true
  },
  (progress) => {
    console.log(`${progress.step}: ${progress.completed}/${progress.total}`)
  }
)
```

### Validation Before Conversion

```typescript
import { validateWorkflowForConversion } from '@/services/parlant/workflow-converter'

const validation = await validateWorkflowForConversion(workflow)

if (!validation.valid) {
  console.error('Workflow validation failed:', validation.errors)
  return
}

// Proceed with conversion...
```

## Supported Node Types

| ReactFlow Node Type | Parlant State Type | Converter | Status |
|---------------------|-------------------|-----------|---------|
| `starter`, `trigger`, `webhook` | `initial` | StarterNodeConverter | ✅ Complete |
| `agent`, `ai`, `chat`, `llm` | `chat` | AgentNodeConverter | ✅ Complete |
| `api`, `http`, `function` | `tool` | ApiNodeConverter | ✅ Complete |
| `condition` | `condition` | ConditionNodeConverter | 🚧 Planned |
| `loop` | `loop_start` + `loop_end` | LoopNodeConverter | 🚧 Planned |
| `parallel` | `parallel_start` + `parallel_end` | ParallelNodeConverter | 🚧 Planned |
| `response` | `final` | ResponseNodeConverter | 🚧 Planned |
| `router` | `condition` | RouterNodeConverter | 🚧 Planned |

## Conversion Process

### 1. Analysis Phase
- **Node Analysis**: Analyze each ReactFlow node for complexity, dependencies, and conversion strategy
- **Edge Analysis**: Map connections, conditional flows, and container relationships
- **Workflow Validation**: Validate input structure and identify potential issues

### 2. Conversion Phase
- **State Generation**: Convert nodes to appropriate Parlant states with preserved data
- **Transition Building**: Create state transitions from ReactFlow edges
- **Variable Extraction**: Extract and map workflow variables to journey variables

### 3. Validation Phase
- **Structure Validation**: Ensure converted journey has valid structure
- **Flow Validation**: Verify state transitions and reachability
- **Semantic Validation**: Check state/transition semantic correctness

### 4. Finalization Phase
- **Metadata Preservation**: Store original workflow data for potential reverse conversion
- **Error Compilation**: Collect and categorize all conversion issues
- **Result Assembly**: Package final journey with comprehensive metadata

## Error Handling

The system provides multiple levels of error recovery:

### 1. Node-Level Recovery
- **Fallback States**: Create generic states when specific converters fail
- **Data Preservation**: Maintain original node data even in fallback scenarios
- **Warning Generation**: Provide actionable feedback for manual review

### 2. Transition-Level Recovery
- **Generic Transitions**: Create basic connections when edge conversion fails
- **Handle Mapping**: Preserve connection semantics where possible
- **Flow Continuity**: Ensure journey flow remains functional

### 3. Critical Error Recovery
- **Partial Journeys**: Create functional journeys from successfully converted parts
- **Context Repair**: Fix corrupted conversion context during processing
- **Graceful Degradation**: Provide best-possible output even with significant failures

## Data Preservation

The converter maintains data integrity through multiple preservation strategies:

### Layout Preservation
```typescript
const options: ConversionOptions = {
  preserveLayout: true  // Maintains node positions and visual hierarchy
}
```

### Original Data Storage
- Node data stored as journey variables with `_preserved_` prefix
- Edge information maintained in transition metadata
- Custom properties preserved for potential reverse conversion

### Metadata Integrity
- Original workflow ID and version tracking
- Conversion timestamp and version information
- Preserved data structure for reconstruction capabilities

## Validation

### Pre-Conversion Validation
- **Structure Check**: Validates workflow has required fields and structure
- **Node Validation**: Ensures all nodes have valid configuration
- **Flow Validation**: Checks for disconnected nodes, cycles, and flow issues
- **Converter Availability**: Verifies converters exist for all node types

### Post-Conversion Validation
- **Journey Structure**: Validates generated journey has proper Parlant structure
- **State Validation**: Ensures all states have required fields and valid configuration
- **Transition Validation**: Verifies all transitions reference existing states
- **Semantic Validation**: Checks for logical consistency (e.g., tool states have tools)

### Conversion Integrity Validation
- **Data Preservation**: Verifies essential data was maintained during conversion
- **Flow Preservation**: Ensures workflow logic was properly translated
- **Metadata Integrity**: Confirms conversion metadata is complete and accurate

## Testing

Comprehensive test suite covers:

### Unit Tests
- Individual converter functionality
- Error handling scenarios
- Data preservation accuracy
- Validation logic correctness

### Integration Tests
- End-to-end conversion workflows
- Multi-converter coordination
- Error recovery scenarios
- Performance under load

### Edge Case Tests
- Circular workflow handling
- Large workflow scalability
- Malformed input handling
- Resource constraint scenarios

## Performance Considerations

### Scalability
- **Streaming Processing**: Large workflows processed in chunks
- **Memory Management**: Efficient data structures for large node/edge counts
- **Parallel Processing**: Independent node conversion where possible

### Optimization
- **Caching**: Reuse analysis results for similar nodes
- **Lazy Loading**: Load converters only when needed
- **Progress Tracking**: Non-blocking progress updates

## Extensibility

### Custom Node Converters

```typescript
import { BaseNodeConverter } from '@/services/parlant/workflow-converter'

class CustomNodeConverter extends BaseNodeConverter {
  constructor() {
    super('custom-node-type', ['custom-variant-1', 'custom-variant-2'])
  }

  async convert(node: ReactFlowNode, context: ConversionContext): Promise<NodeConversionResult> {
    // Custom conversion logic
    return {
      states: [customState],
      transitions: [],
      variables: []
    }
  }

  protected validateNodeSpecific(node: ReactFlowNode): ValidationResult {
    // Custom validation logic
    return { valid: true, errors: [], warnings: [] }
  }

  protected getPrimaryStateType(): ParlantStateType {
    return 'chat' // or appropriate type
  }
}

// Register the converter
engine.registerNodeConverter('custom-node-type', new CustomNodeConverter())
```

### Custom Validation Rules

Extend the validation engine with domain-specific rules:

```typescript
const customValidation = async (workflow: ReactFlowWorkflow): Promise<ValidationResult> => {
  // Custom validation logic
  return { valid: true, errors: [], warnings: [] }
}
```

## Future Enhancements

### Planned Features
- **Reverse Conversion**: Parlant journey → ReactFlow workflow conversion
- **Visual Diff**: Side-by-side comparison of workflow vs journey
- **Interactive Migration**: Step-by-step conversion with user input
- **Batch Processing**: Convert multiple workflows efficiently
- **Version Migration**: Handle schema changes between versions

### Advanced Capabilities
- **AI-Assisted Conversion**: Use LLMs to handle complex conversion scenarios
- **Template System**: Pre-built conversion patterns for common workflows
- **Plugin Architecture**: Third-party converter extensions
- **Real-time Sync**: Live workflow-to-journey synchronization

## Contributing

### Adding New Node Converters

1. **Create Converter Class**: Extend `BaseNodeConverter`
2. **Implement Required Methods**: `convert()`, `validateNodeSpecific()`, `getPrimaryStateType()`
3. **Add Tests**: Unit tests for converter functionality
4. **Register Converter**: Add to factory function
5. **Update Documentation**: Add to supported types table

### Development Guidelines

1. **Type Safety**: Use TypeScript throughout, avoid `any` types
2. **Error Handling**: Always provide meaningful error messages and suggestions
3. **Logging**: Use structured logging with context information
4. **Testing**: Maintain >90% test coverage
5. **Documentation**: Document complex logic and edge cases

## Troubleshooting

### Common Issues

**Q: Conversion fails with "No converter found" error**
A: Register a converter for the node type or use a generic converter

**Q: Generated states missing expected data**
A: Check if original node data structure matches converter expectations

**Q: Transitions not created between states**
A: Verify edge source/target references exist and are valid

**Q: Validation errors after conversion**
A: Enable debug output to see detailed conversion process

### Debug Mode

```typescript
const result = await engine.convert(workflow, {
  includeDebugInfo: true
}, (progress) => {
  console.log('Debug:', progress)
})
```

## License

Part of the Sim platform - see main project license.