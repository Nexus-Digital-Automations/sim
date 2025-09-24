# Universal Tool Adapter System - Result Formatting

A comprehensive result formatting system that transforms tool outputs into conversational, user-friendly formats with interactive elements and multi-modal support.

## Overview

The Result Formatting System provides:

- **Universal Formatters**: Handle any tool output type with intelligent format detection
- **Interactive Components**: Rich, responsive UI components for optimal user experience
- **Multi-Modal Support**: Text, tables, charts, cards, images, and more
- **Context-Aware**: Adapts formatting based on conversation context and user preferences
- **Progressive Disclosure**: Smart summarization with expandable details
- **Mobile-Optimized**: Fully responsive design for all screen sizes

## Quick Start

```typescript
import { defaultFormatterService, FormattedResultDisplay } from '@/tools/result-formatting'

// Format a tool result
const formatted = await defaultFormatterService.formatResult(
  toolResponse,
  toolConfig,
  {
    displayMode: 'detailed',
    targetAudience: 'general',
  }
)

// Display in React
<FormattedResultDisplay
  result={formatted}
  onAction={(action, params) => console.log(action, params)}
/>
```

## Architecture

### Core Components

#### 1. **ResultFormatterService**
Central orchestration service that manages formatting pipeline:
- Formatter selection and execution
- Caching and performance optimization
- Quality validation and analytics
- Multi-formatter coordination

#### 2. **Formatters**
Specialized formatters for different content types:

- **TextFormatter**: Natural language text with rich formatting
- **TableFormatter**: Interactive tables with sorting, filtering, pagination
- **ChartFormatter**: Data visualizations with multiple chart types
- **CardFormatter**: Rich card layouts for structured data
- **ImageFormatter**: Advanced image display with zoom, metadata

#### 3. **Display Components**
React components for interactive presentation:

- **FormattedResultDisplay**: Main container with multi-view support
- **TextDisplay**: Rich text with reading time, word count
- **TableDisplay**: Full-featured data tables
- **ChartDisplay**: Interactive charts with export capabilities
- **CardDisplay**: Flexible card layouts (grid, list, masonry)
- **ImageDisplay**: Advanced image viewer with controls

### Key Features

#### Smart Format Detection
```typescript
// Automatically selects best formatter based on data structure
const formatter = await service.selectFormatter(result, context)
```

#### Multi-Representation
```typescript
// Each result provides multiple viewing formats
const result = {
  format: 'table',
  content: tableData,
  representations: [
    { format: 'chart', content: chartData, priority: 80 },
    { format: 'text', content: textSummary, priority: 60 }
  ]
}
```

#### Context-Aware Formatting
```typescript
const context = {
  displayMode: 'compact' | 'detailed' | 'summary',
  targetAudience: 'technical' | 'business' | 'general',
  locale: 'en-US',
  previousResults: [...],
}
```

#### Natural Language Summaries
```typescript
const summary = {
  headline: "Found 150 results for your search",
  description: "Data contains customer records with contact information...",
  highlights: ["150 total records", "95% data completeness"],
  suggestions: ["Filter by date range", "Export to CSV"]
}
```

## Configuration

### Service Configuration
```typescript
const service = new ResultFormatterService({
  defaultFormat: 'text',
  defaultDisplayMode: 'detailed',

  cache: {
    enabled: true,
    ttl: 3600, // 1 hour
    maxEntries: 1000,
  },

  analytics: {
    enabled: true,
    trackUserInteractions: true,
    retentionPeriod: 30, // days
  },

  features: {
    aiSummaries: true,
    smartFormatDetection: true,
    adaptiveDisplayMode: true,
  }
})
```

### Custom Formatters
```typescript
class CustomFormatter implements ResultFormatter {
  id = 'custom_formatter'
  name = 'Custom Formatter'
  supportedFormats = ['custom']
  priority = 70

  canFormat(result: ToolResponse, context: FormatContext): boolean {
    // Custom detection logic
    return result.output?.customType === true
  }

  async format(result: ToolResponse, context: FormatContext): Promise<FormattedResult> {
    // Custom formatting logic
    return {
      format: 'custom',
      content: processCustomData(result.output),
      summary: generateSummary(result),
      // ...
    }
  }
}

// Register custom formatter
service.registerFormatter(new CustomFormatter())
```

## Usage Examples

### Basic Tool Result Formatting
```typescript
import { formatToolResult } from '@/tools/result-formatting'

// Format any tool result
const formatted = await formatToolResult(
  { success: true, output: data },
  { id: 'my-tool', name: 'My Tool' }
)
```

### React Component Usage
```tsx
import { FormattedResultDisplay } from '@/tools/result-formatting'

function ToolResultView({ result }) {
  const handleAction = (action, params) => {
    switch (action) {
      case 'download':
        downloadResult(params)
        break
      case 'share':
        shareResult(params)
        break
      // Handle other actions...
    }
  }

  return (
    <FormattedResultDisplay
      result={result}
      compact={false}
      showMetadata={true}
      onAction={handleAction}
    />
  )
}
```

### Table Data Formatting
```typescript
// Automatically detected and formatted as interactive table
const tableResult = {
  success: true,
  output: [
    { id: 1, name: 'John Doe', email: 'john@example.com', score: 95 },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', score: 87 },
    // ...
  ]
}

const formatted = await formatToolResult(tableResult, toolConfig)
// Results in interactive table with sorting, filtering, pagination
```

### Chart Data Formatting
```typescript
// Automatically creates visualizations from numerical data
const chartResult = {
  success: true,
  output: {
    data: [
      { month: 'Jan', sales: 1200, expenses: 800 },
      { month: 'Feb', sales: 1400, expenses: 900 },
      // ...
    ]
  }
}

const formatted = await formatToolResult(chartResult, toolConfig)
// Results in interactive charts with multiple view types
```

### Image Result Formatting
```typescript
const imageResult = {
  success: true,
  output: {
    url: 'https://example.com/image.jpg',
    width: 800,
    height: 600,
    caption: 'Generated visualization'
  }
}

const formatted = await formatToolResult(imageResult, toolConfig)
// Results in advanced image viewer with zoom, metadata, download
```

## Performance & Caching

The system includes sophisticated caching and performance optimization:

- **Result Caching**: Formatted results cached with intelligent invalidation
- **Lazy Loading**: Components and data loaded on-demand
- **Virtual Scrolling**: Efficient handling of large datasets
- **Progressive Enhancement**: Core functionality works, enhancements add value

## Analytics & Quality

Built-in analytics and quality monitoring:

- **Usage Tracking**: Monitor formatter usage and performance
- **Quality Scores**: Automatic quality assessment of formatted results
- **User Interactions**: Track user engagement with different formats
- **Performance Metrics**: Cache hit rates, formatting times, error rates

## Mobile Optimization

Full mobile support with responsive design:

- **Adaptive Layouts**: Components adjust to screen size
- **Touch Interactions**: Optimized for mobile touch interfaces
- **Performance**: Efficient rendering on mobile devices
- **Offline Support**: Core functionality works offline

## Integration with Sim

This system integrates seamlessly with the Sim platform:

- **Tool Ecosystem**: Works with all Sim tools automatically
- **Chat Interface**: Embedded in conversational flows
- **Workflow Integration**: Part of workflow execution results
- **Theme Support**: Follows Sim's design system and theming

## Extending the System

The system is designed for extensibility:

### Custom Formatters
Create specialized formatters for domain-specific data types.

### Custom Components
Build custom React components for unique display needs.

### Processors
Add result processors for additional data transformation.

### Analytics
Extend analytics with custom metrics and reporting.

## Best Practices

1. **Format Selection**: Let the system auto-select formatters, override only when needed
2. **Context Provision**: Provide rich context for better formatting decisions
3. **Action Handling**: Implement comprehensive action handlers for user interactions
4. **Performance**: Use caching and lazy loading for large datasets
5. **Accessibility**: Ensure formatted results are accessible to all users

## Contributing

When adding new formatters or components:

1. Follow the established patterns and interfaces
2. Include comprehensive TypeScript types
3. Add proper error handling and validation
4. Include analytics and quality scoring
5. Ensure mobile responsiveness
6. Add comprehensive documentation

---

This result formatting system provides a powerful, flexible foundation for presenting tool results in conversational interfaces, with rich interactivity and optimal user experience across all devices.