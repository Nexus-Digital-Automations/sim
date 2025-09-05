# RPA Desktop Automation Blocks

Comprehensive collection of ReactFlow blocks for desktop automation within the Sim platform. These blocks integrate seamlessly with the Sim Desktop Agent to provide powerful, reliable desktop automation capabilities.

## 🚀 Overview

The RPA Desktop Automation Blocks enable users to build sophisticated desktop workflows through a visual drag-and-drop interface. Each block is designed following Sim's conventions and provides extensive configuration options for maximum flexibility.

## 📦 Available Blocks

### 1. RPA Desktop Click Block (`rpa-desktop-click`)
**Purpose**: Perform precise mouse clicks on desktop elements

**Key Features**:
- **Multiple Targeting Methods**: Coordinates, image recognition, OCR text
- **Click Types**: Left, right, double, middle click
- **Advanced Configuration**: Retry logic, confidence thresholds, modifier keys
- **Region Limiting**: Restrict search areas for better performance

**Use Cases**:
- Clicking buttons in applications
- Selecting menu items
- Interacting with UI elements
- Form submission

**Configuration Options**:
```typescript
{
  clickType: 'left_click' | 'right_click' | 'double_click' | 'middle_click',
  targetingMethod: 'coordinates' | 'image_recognition' | 'ocr_text',
  coordinateX: number,
  coordinateY: number,
  templateImage: string, // Base64 encoded
  imageConfidenceThreshold: number, // 0.1-1.0
  ocrText: string,
  timeout: number,
  maxRetries: number
}
```

### 2. RPA Desktop Type Block (`rpa-desktop-type`)
**Purpose**: Simulate realistic keyboard input with precise control

**Key Features**:
- **Input Types**: Plain text, key combinations, special keys
- **Typing Speeds**: Configurable from slow to instant with humanization
- **Key Combinations**: Support for Ctrl+A, Alt+Tab, etc.
- **Text Processing**: Escape sequence handling, case sensitivity

**Use Cases**:
- Filling forms and input fields
- Keyboard shortcuts execution
- Text replacement and editing
- Navigation key usage

**Configuration Options**:
```typescript
{
  inputType: 'type_text' | 'key_combination' | 'special_key',
  textContent: string,
  typingSpeed: 'very_slow' | 'slow' | 'normal' | 'fast' | 'very_fast' | 'instant',
  keyModifiers: string[], // ['ctrl', 'alt', 'shift', 'meta']
  clearBefore: 'none' | 'select_all' | 'clear_field' | 'backspace_all'
}
```

### 3. RPA Desktop Extract Block (`rpa-desktop-extract`)
**Purpose**: Extract text and data from desktop elements

**Key Features**:
- **Extraction Methods**: OCR, clipboard capture, accessibility APIs
- **Multi-Language OCR**: Support for 14+ languages with auto-detection
- **Text Processing**: Whitespace cleanup, format conversion, filtering
- **Region-Based**: Full screen or custom region extraction

**Use Cases**:
- Data scraping from applications
- Reading text from images/PDFs
- Capturing form data
- Document processing

**Configuration Options**:
```typescript
{
  extractionMethod: 'ocr' | 'clipboard' | 'accessibility',
  regionMode: 'fullscreen' | 'custom' | 'active_window',
  ocrLanguage: string,
  confidenceThreshold: number,
  outputFormat: 'plain' | 'json' | 'csv' | 'markdown' | 'html',
  textFilters: string[]
}
```

### 4. RPA Desktop Screenshot Block (`rpa-desktop-screenshot`)
**Purpose**: Capture high-quality screenshots with advanced options

**Key Features**:
- **Capture Modes**: Full screen, regions, active window, multi-monitor
- **Image Formats**: PNG, JPEG, BMP, WebP with quality control
- **Processing Options**: Enhancement, annotation, thumbnail generation
- **File Management**: Custom naming, automatic saving, path organization

**Use Cases**:
- Visual verification and logging
- Documentation generation
- Error reporting with screenshots
- Process monitoring

**Configuration Options**:
```typescript
{
  captureMode: 'fullscreen' | 'region' | 'window' | 'all_screens' | 'monitor',
  imageFormat: 'png' | 'jpeg' | 'bmp' | 'webp',
  imageQuality: number, // 10-100 for lossy formats
  saveToFile: boolean,
  fileName: string, // Supports {timestamp}, {date}, {time} placeholders
  addAnnotations: boolean
}
```

### 5. RPA Desktop Wait Block (`rpa-desktop-wait`)
**Purpose**: Intelligent waiting with condition monitoring

**Key Features**:
- **Wait Types**: Duration, element appearance/disappearance, text detection, image matching
- **Condition Monitoring**: Custom expressions, multiple conditions with AND/OR logic
- **Performance**: Adaptive polling, optimization for long waits
- **Timeout Handling**: Configurable timeouts with continue-on-timeout option

**Use Cases**:
- Waiting for applications to load
- Monitoring for UI changes
- Synchronizing workflow steps
- Handling variable timing

**Configuration Options**:
```typescript
{
  waitType: 'duration' | 'element_appears' | 'text_appears' | 'image_appears' | 'condition',
  waitDuration: number, // milliseconds
  timeout: number, // seconds
  pollingInterval: number, // milliseconds
  conditionExpression: string, // Custom condition logic
  multipleConditions: boolean
}
```

### 6. RPA Desktop Find Element Block (`rpa-desktop-find`)
**Purpose**: Locate and analyze desktop elements using multiple detection methods

**Key Features**:
- **Search Methods**: Image recognition, OCR text, color detection, multi-method
- **Element Analysis**: Position, confidence, text content, attributes
- **Filtering**: Overlap removal, confidence thresholds, result sorting
- **Export**: Reusable selectors, highlighted screenshots

**Use Cases**:
- Element discovery and analysis
- Dynamic UI interaction
- Quality assurance testing
- UI element documentation

**Configuration Options**:
```typescript
{
  searchMethod: 'image_recognition' | 'ocr_text' | 'color_detection' | 'multiple_methods',
  returnStrategy: 'all' | 'first' | 'best' | 'largest' | 'center',
  maxElements: number,
  minConfidence: number,
  highlightElements: boolean,
  exportSelectors: boolean
}
```

## 🔧 Installation & Setup

### Prerequisites

1. **Sim Desktop Agent**: Download and install from [GitHub Releases](https://github.com/sim-platform/desktop-agent/releases)
2. **System Requirements**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)
3. **Dependencies**: Automatically installed with Desktop Agent
   - Tesseract OCR
   - OpenCV
   - nut.js runtime

### Integration Steps

1. **Install Desktop Agent**: Follow the installation guide for your platform
2. **Configure Connection**: Set up secure connection between Sim and Desktop Agent
3. **Import Blocks**: Add RPA blocks to your Sim workspace
4. **Test Connection**: Verify agent connectivity and capabilities

## 🎯 Usage Patterns

### Basic Workflow Example
```typescript
// 1. Take screenshot for reference
const screenshot = await RPADesktopScreenshotBlock.execute({
  captureMode: 'fullscreen',
  saveToFile: true
})

// 2. Find target element
const elements = await RPADesktopFindBlock.execute({
  searchMethod: 'image_recognition',
  templateImage: buttonImage,
  returnStrategy: 'best'
})

// 3. Click on found element
const clickResult = await RPADesktopClickBlock.execute({
  clickType: 'left_click',
  targetingMethod: 'coordinates',
  coordinateX: elements.elements[0].position.x,
  coordinateY: elements.elements[0].position.y
})

// 4. Type into activated field
await RPADesktopTypeBlock.execute({
  inputType: 'type_text',
  textContent: 'Hello, World!',
  typingSpeed: 'normal'
})

// 5. Wait for completion
await RPADesktopWaitBlock.execute({
  waitType: 'text_appears',
  targetText: 'Success',
  timeout: 10
})
```

### Advanced Pattern: Data Extraction Pipeline
```typescript
// 1. Navigate to data region
await RPADesktopClickBlock.execute({
  clickType: 'left_click',
  targetingMethod: 'ocr_text',
  ocrText: 'Data Table'
})

// 2. Wait for data to load
await RPADesktopWaitBlock.execute({
  waitType: 'element_appears',
  elementSelector: 'image',
  templateImage: tableHeaderImage,
  timeout: 15
})

// 3. Extract table data
const extractedData = await RPADesktopExtractBlock.execute({
  extractionMethod: 'ocr',
  regionMode: 'custom',
  regionX: 100,
  regionY: 200,
  regionWidth: 800,
  regionHeight: 600,
  outputFormat: 'csv',
  ocrLanguage: 'eng'
})

// 4. Process and validate data
// ... additional processing blocks ...
```

## 🛡️ Security & Performance

### Security Features
- **Sandboxed Execution**: All operations run in controlled environment
- **Credential Protection**: Secure handling of sensitive data
- **Activity Logging**: Comprehensive audit trail
- **Permission Controls**: Granular access control

### Performance Optimization
- **Region Limiting**: Restrict search areas for faster processing
- **Caching**: Reuse processed images and data
- **Parallel Processing**: Multi-core utilization for complex operations
- **Adaptive Polling**: Dynamic adjustment of check intervals

## 🔍 Troubleshooting

### Common Issues

1. **Element Not Found**
   - Verify image templates are captured at correct resolution
   - Adjust confidence thresholds (try 0.7-0.9 range)
   - Use region limiting to focus search area
   - Check for UI scaling/DPI differences

2. **Timing Issues**
   - Increase timeout values for slow applications
   - Use wait blocks before critical operations
   - Implement retry logic with delays
   - Consider adaptive polling for variable timing

3. **OCR Accuracy**
   - Ensure high contrast between text and background
   - Use appropriate language settings
   - Consider image preprocessing options
   - Validate extraction with confidence thresholds

4. **Performance Problems**
   - Enable performance optimizations
   - Use region limiting extensively
   - Implement caching for repeated operations
   - Monitor resource usage and adjust accordingly

### Debug Mode
All blocks support debug mode for troubleshooting:
```typescript
{
  debugMode: true,
  saveIntermediateImages: true,
  logProgress: true
}
```

## 📚 API Reference

### Block Configuration Interface
All RPA blocks follow the Sim `BlockConfig` interface:
```typescript
interface BlockConfig<T extends ToolResponse = ToolResponse> {
  type: string
  name: string
  description: string
  category: 'blocks'
  bgColor: string
  icon: BlockIcon
  subBlocks: SubBlockConfig[]
  tools: {
    access: string[]
    config?: {
      tool: (params: Record<string, any>) => string
      params?: (params: Record<string, any>) => Record<string, any>
    }
  }
  inputs: Record<string, ParamConfig>
  outputs: Record<string, OutputFieldDefinition>
}
```

### Response Interface
All blocks return responses implementing `ToolResponse`:
```typescript
interface RPAToolResponse extends ToolResponse {
  output: {
    success: boolean
    executionTime: number
    timestamp: Date
    screenshot?: string
    error?: string
    // ... block-specific fields
  }
}
```

## 🤝 Contributing

### Block Development Guidelines
1. Follow Sim's TypeScript conventions
2. Implement comprehensive error handling
3. Provide extensive configuration options
4. Include proper documentation and examples
5. Ensure cross-platform compatibility

### Testing Requirements
- Unit tests for all configuration combinations
- Integration tests with Desktop Agent
- Performance benchmarks
- Cross-platform validation

## 📄 License

These RPA blocks are part of the Sim platform and follow the same licensing terms. See the main Sim license for details.

## 🔗 Related Resources

- [Sim Platform Documentation](https://docs.sim.ai)
- [Desktop Agent Repository](https://github.com/sim-platform/desktop-agent)
- [Block Development Guide](https://docs.sim.ai/blocks/development)
- [Community Examples](https://github.com/sim-platform/examples/rpa)

---

**Made with ❤️ for the Sim Platform**

*Empowering visual automation workflows through intelligent desktop integration*