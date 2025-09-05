import { SearchIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { ToolResponse } from '@/tools/types'

/**
 * RPA Desktop Find Element Block Response Interface
 * Defines the structure of responses from desktop element finding operations
 */
interface RPADesktopFindResponse extends ToolResponse {
  output: {
    success: boolean
    elementsFound: number
    elements: Array<{
      id: string
      position: { x: number; y: number }
      region: { x: number; y: number; width: number; height: number }
      confidence: number
      method: string
      selector: string
      text?: string
      attributes?: Record<string, any>
    }>
    searchMethod: 'image_recognition' | 'ocr_text' | 'color_detection' | 'multiple_methods'
    searchRegion?: {
      x: number
      y: number
      width: number
      height: number
    }
    screenshot?: string // Base64 encoded screenshot with elements highlighted
    executionTime: number
    timestamp: Date
    error?: string
  }
}

/**
 * RPA Desktop Find Element Block Configuration
 * 
 * Comprehensive desktop element finding block that supports:
 * - Image recognition with template matching
 * - OCR-based text detection and location
 * - Color-based element detection
 * - Multiple search methods simultaneously
 * - Element highlighting and screenshot annotation
 * - Export of element selectors for reuse
 * - Confidence-based filtering
 * - Region-based searching for performance
 */
export const RPADesktopFindBlock: BlockConfig<RPADesktopFindResponse> = {
  type: 'rpa-desktop-find',
  name: 'RPA Desktop Find Element',
  description: 'Find and locate desktop elements using multiple detection methods',
  longDescription: 
    'Intelligently locate desktop elements using image recognition, OCR text detection, color matching, or combination methods. ' +
    'Provides precise coordinates, confidence scores, and exportable selectors for reliable automation.',
  docsLink: 'https://docs.sim.ai/blocks/rpa-desktop-find',
  category: 'blocks',
  bgColor: '#E67E22', // Orange theme for find operations
  icon: SearchIcon,
  subBlocks: [
    // Search Method Selection
    {
      id: 'searchMethod',
      title: 'Search Method',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        { label: 'Image Recognition', id: 'image_recognition' },
        { label: 'OCR Text Detection', id: 'ocr_text' },
        { label: 'Color Detection', id: 'color_detection' },
        { label: 'Multiple Methods', id: 'multiple_methods' },
      ],
      value: () => 'image_recognition',
      description: 'Method to locate elements on screen',
    },

    // Return Strategy
    {
      id: 'returnStrategy',
      title: 'Return Strategy',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'All Elements', id: 'all' },
        { label: 'First Element', id: 'first' },
        { label: 'Best Match', id: 'best' },
        { label: 'Largest Element', id: 'largest' },
        { label: 'Center-most', id: 'center' },
      ],
      value: () => 'all',
      description: 'Which elements to return when multiple are found',
    },

    // Image Recognition Configuration
    {
      id: 'templateImage',
      title: 'Template Image',
      type: 'file-upload',
      layout: 'full',
      acceptedTypes: 'image/png,image/jpeg,image/bmp',
      maxSize: 10, // 10MB max
      required: true,
      condition: {
        field: 'searchMethod',
        value: ['image_recognition', 'multiple_methods'],
      },
      description: 'Upload template image to find on screen',
    },

    {
      id: 'imageConfidenceThreshold',
      title: 'Image Confidence Threshold',
      type: 'slider',
      layout: 'half',
      min: 0.1,
      max: 1.0,
      step: 0.01,
      condition: {
        field: 'searchMethod',
        value: ['image_recognition', 'multiple_methods'],
      },
      value: () => 0.8,
      description: 'Minimum confidence required for image match',
    },

    {
      id: 'imageMatchMode',
      title: 'Image Match Mode',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Exact Match', id: 'exact' },
        { label: 'Scale Invariant', id: 'scale_invariant' },
        { label: 'Template Matching', id: 'template_matching' },
        { label: 'Feature Based', id: 'feature_based' },
      ],
      value: () => 'template_matching',
      condition: {
        field: 'searchMethod',
        value: ['image_recognition', 'multiple_methods'],
      },
      mode: 'advanced',
      description: 'Image matching algorithm to use',
    },

    // OCR Text Configuration
    {
      id: 'targetText',
      title: 'Target Text',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Text to find on screen...',
      required: true,
      condition: {
        field: 'searchMethod',
        value: ['ocr_text', 'multiple_methods'],
      },
      description: 'Text content to locate on screen',
    },

    {
      id: 'textMatchMode',
      title: 'Text Match Mode',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Exact Match', id: 'exact' },
        { label: 'Contains', id: 'contains' },
        { label: 'Starts With', id: 'starts_with' },
        { label: 'Ends With', id: 'ends_with' },
        { label: 'Regular Expression', id: 'regex' },
        { label: 'Fuzzy Match', id: 'fuzzy' },
      ],
      value: () => 'contains',
      condition: {
        field: 'searchMethod',
        value: ['ocr_text', 'multiple_methods'],
      },
      description: 'How to match the target text',
    },

    {
      id: 'ocrLanguage',
      title: 'OCR Language',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'English', id: 'eng' },
        { label: 'Spanish', id: 'spa' },
        { label: 'French', id: 'fra' },
        { label: 'German', id: 'deu' },
        { label: 'Italian', id: 'ita' },
        { label: 'Portuguese', id: 'por' },
        { label: 'Russian', id: 'rus' },
        { label: 'Chinese (Simplified)', id: 'chi_sim' },
        { label: 'Chinese (Traditional)', id: 'chi_tra' },
        { label: 'Japanese', id: 'jpn' },
        { label: 'Korean', id: 'kor' },
        { label: 'Arabic', id: 'ara' },
        { label: 'Auto-detect', id: 'auto' },
      ],
      value: () => 'eng',
      condition: {
        field: 'searchMethod',
        value: ['ocr_text', 'multiple_methods'],
      },
      description: 'Language for OCR text recognition',
    },

    {
      id: 'textCaseSensitive',
      title: 'Case Sensitive',
      type: 'switch',
      layout: 'half',
      condition: {
        field: 'searchMethod',
        value: ['ocr_text', 'multiple_methods'],
      },
      description: 'Whether text matching is case sensitive',
    },

    // Color Detection Configuration
    {
      id: 'targetColor',
      title: 'Target Color',
      type: 'short-input',
      layout: 'half',
      placeholder: '#FF0000 or rgb(255,0,0)',
      required: true,
      condition: {
        field: 'searchMethod',
        value: ['color_detection', 'multiple_methods'],
      },
      description: 'Color to detect (hex, rgb, or color name)',
    },

    {
      id: 'colorTolerance',
      title: 'Color Tolerance',
      type: 'slider',
      layout: 'half',
      min: 0,
      max: 100,
      step: 1,
      condition: {
        field: 'searchMethod',
        value: ['color_detection', 'multiple_methods'],
      },
      value: () => 10,
      description: 'Color matching tolerance (0-100)',
    },

    {
      id: 'minColorArea',
      title: 'Minimum Color Area',
      type: 'short-input',
      layout: 'half',
      placeholder: '10',
      condition: {
        field: 'searchMethod',
        value: ['color_detection', 'multiple_methods'],
      },
      mode: 'advanced',
      description: 'Minimum area in pixels for color detection',
    },

    // Search Region Configuration
    {
      id: 'searchRegion',
      title: 'Limit Search Region',
      type: 'switch',
      layout: 'half',
      description: 'Restrict search to specific screen region for better performance',
    },

    {
      id: 'regionX',
      title: 'Region X',
      type: 'short-input',
      layout: 'half',
      placeholder: '0',
      condition: {
        field: 'searchRegion',
        value: true,
      },
      description: 'Search region X coordinate',
    },

    {
      id: 'regionY',
      title: 'Region Y',
      type: 'short-input',
      layout: 'half',
      placeholder: '0',
      condition: {
        field: 'searchRegion',
        value: true,
      },
      description: 'Search region Y coordinate',
    },

    {
      id: 'regionWidth',
      title: 'Region Width',
      type: 'short-input',
      layout: 'half',
      placeholder: '800',
      condition: {
        field: 'searchRegion',
        value: true,
      },
      description: 'Search region width in pixels',
    },

    {
      id: 'regionHeight',
      title: 'Region Height',
      type: 'short-input',
      layout: 'half',
      placeholder: '600',
      condition: {
        field: 'searchRegion',
        value: true,
      },
      description: 'Search region height in pixels',
    },

    // Advanced Search Options
    {
      id: 'maxElements',
      title: 'Max Elements',
      type: 'short-input',
      layout: 'half',
      placeholder: '10',
      mode: 'advanced',
      description: 'Maximum number of elements to find (0 = unlimited)',
    },

    {
      id: 'sortBy',
      title: 'Sort Results By',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Confidence (High to Low)', id: 'confidence_desc' },
        { label: 'Confidence (Low to High)', id: 'confidence_asc' },
        { label: 'Position (Top to Bottom)', id: 'position_vertical' },
        { label: 'Position (Left to Right)', id: 'position_horizontal' },
        { label: 'Size (Large to Small)', id: 'size_desc' },
        { label: 'Size (Small to Large)', id: 'size_asc' },
      ],
      value: () => 'confidence_desc',
      mode: 'advanced',
      description: 'How to sort found elements',
    },

    // Filtering Options
    {
      id: 'minConfidence',
      title: 'Minimum Overall Confidence',
      type: 'slider',
      layout: 'half',
      min: 0.1,
      max: 1.0,
      step: 0.01,
      value: () => 0.6,
      mode: 'advanced',
      description: 'Minimum confidence threshold for all methods',
    },

    {
      id: 'filterOverlapping',
      title: 'Filter Overlapping Elements',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Remove elements that significantly overlap',
    },

    {
      id: 'overlapThreshold',
      title: 'Overlap Threshold',
      type: 'slider',
      layout: 'half',
      min: 0.1,
      max: 0.9,
      step: 0.1,
      condition: {
        field: 'filterOverlapping',
        value: true,
      },
      value: () => 0.5,
      mode: 'advanced',
      description: 'Overlap percentage threshold for filtering',
    },

    // Output Options
    {
      id: 'highlightElements',
      title: 'Highlight Elements',
      type: 'switch',
      layout: 'half',
      description: 'Draw bounding boxes around found elements',
    },

    {
      id: 'captureScreenshot',
      title: 'Capture Screenshot',
      type: 'switch',
      layout: 'half',
      description: 'Take screenshot with highlighted elements',
    },

    {
      id: 'exportSelectors',
      title: 'Export Selectors',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Generate reusable selectors for found elements',
    },

    {
      id: 'includeElementText',
      title: 'Include Element Text',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Extract text content from found elements (requires OCR)',
    },

    // Performance Options
    {
      id: 'optimizePerformance',
      title: 'Optimize Performance',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Enable performance optimizations for faster searching',
    },

    {
      id: 'useCache',
      title: 'Use Caching',
      type: 'switch',
      layout: 'half',
      condition: {
        field: 'optimizePerformance',
        value: true,
      },
      mode: 'advanced',
      description: 'Cache processed images for repeated searches',
    },

    {
      id: 'parallelProcessing',
      title: 'Parallel Processing',
      type: 'switch',
      layout: 'half',
      condition: {
        field: 'optimizePerformance',
        value: true,
      },
      mode: 'advanced',
      description: 'Use multiple CPU cores for faster processing',
    },

    // Debug Options
    {
      id: 'debugMode',
      title: 'Debug Mode',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Enable detailed debug output and intermediate results',
    },

    {
      id: 'saveIntermediateImages',
      title: 'Save Debug Images',
      type: 'switch',
      layout: 'half',
      condition: {
        field: 'debugMode',
        value: true,
      },
      mode: 'advanced',
      description: 'Save intermediate processing images for debugging',
    },
  ],

  // Tool configuration for RPA engine access
  tools: {
    access: ['desktop-find', 'desktop-screenshot', 'desktop-ocr', 'desktop-image-recognition', 'desktop-color-detection'],
    config: {
      tool: (params: Record<string, any>) => {
        // Select appropriate tool based on search method
        switch (params.searchMethod) {
          case 'image_recognition':
            return 'desktop-image-recognition'
          case 'ocr_text':
            return 'desktop-ocr'
          case 'color_detection':
            return 'desktop-color-detection'
          case 'multiple_methods':
            return 'desktop-find' // Multi-method tool
          default:
            return 'desktop-find'
        }
      },
      params: (params: Record<string, any>) => {
        const baseParams = {
          searchMethod: params.searchMethod || 'image_recognition',
          returnStrategy: params.returnStrategy || 'all',
          maxElements: parseInt(params.maxElements) || 0,
          sortBy: params.sortBy || 'confidence_desc',
          minConfidence: parseFloat(params.minConfidence) || 0.6,
          filterOverlapping: params.filterOverlapping || false,
          overlapThreshold: parseFloat(params.overlapThreshold) || 0.5,
          highlightElements: params.highlightElements || false,
          captureScreenshot: params.captureScreenshot || false,
          exportSelectors: params.exportSelectors || false,
          includeElementText: params.includeElementText || false,
          optimizePerformance: params.optimizePerformance || false,
          debugMode: params.debugMode || false,
        }

        // Add search region if specified
        if (params.searchRegion) {
          baseParams.region = {
            x: parseInt(params.regionX) || 0,
            y: parseInt(params.regionY) || 0,
            width: parseInt(params.regionWidth) || 800,
            height: parseInt(params.regionHeight) || 600,
          }
        }

        // Add performance options
        if (params.optimizePerformance) {
          baseParams.performanceOptions = {
            useCache: params.useCache || false,
            parallelProcessing: params.parallelProcessing || false,
          }
        }

        // Add debug options
        if (params.debugMode) {
          baseParams.debugOptions = {
            saveIntermediateImages: params.saveIntermediateImages || false,
          }
        }

        // Add search method-specific parameters
        const methodParams = {}

        // Image recognition parameters
        if (['image_recognition', 'multiple_methods'].includes(params.searchMethod)) {
          methodParams.imageRecognition = {
            templateImage: params.templateImage,
            confidenceThreshold: parseFloat(params.imageConfidenceThreshold) || 0.8,
            matchMode: params.imageMatchMode || 'template_matching',
          }
        }

        // OCR text parameters
        if (['ocr_text', 'multiple_methods'].includes(params.searchMethod)) {
          methodParams.ocrText = {
            targetText: params.targetText,
            matchMode: params.textMatchMode || 'contains',
            language: params.ocrLanguage || 'eng',
            caseSensitive: params.textCaseSensitive || false,
          }
        }

        // Color detection parameters
        if (['color_detection', 'multiple_methods'].includes(params.searchMethod)) {
          methodParams.colorDetection = {
            targetColor: params.targetColor,
            tolerance: parseInt(params.colorTolerance) || 10,
            minArea: parseInt(params.minColorArea) || 10,
          }
        }

        return { ...baseParams, ...methodParams }
      },
    },
  },

  // Input parameter definitions
  inputs: {
    searchMethod: { type: 'string', description: 'Method to locate elements on screen' },
    returnStrategy: { type: 'string', description: 'Which elements to return when multiple found' },
    templateImage: { type: 'string', description: 'Base64 encoded template image for recognition' },
    imageConfidenceThreshold: { type: 'number', description: 'Minimum confidence for image matching' },
    imageMatchMode: { type: 'string', description: 'Image matching algorithm to use' },
    targetText: { type: 'string', description: 'Text content to locate on screen' },
    textMatchMode: { type: 'string', description: 'Text matching mode' },
    ocrLanguage: { type: 'string', description: 'Language for OCR processing' },
    textCaseSensitive: { type: 'boolean', description: 'Whether text matching is case sensitive' },
    targetColor: { type: 'string', description: 'Color to detect' },
    colorTolerance: { type: 'number', description: 'Color matching tolerance' },
    minColorArea: { type: 'number', description: 'Minimum area for color detection' },
    searchRegion: { type: 'boolean', description: 'Whether to limit search to specific region' },
    regionX: { type: 'number', description: 'Search region X coordinate' },
    regionY: { type: 'number', description: 'Search region Y coordinate' },
    regionWidth: { type: 'number', description: 'Search region width' },
    regionHeight: { type: 'number', description: 'Search region height' },
    maxElements: { type: 'number', description: 'Maximum number of elements to find' },
    sortBy: { type: 'string', description: 'How to sort found elements' },
    minConfidence: { type: 'number', description: 'Minimum confidence threshold for all methods' },
    filterOverlapping: { type: 'boolean', description: 'Remove overlapping elements' },
    overlapThreshold: { type: 'number', description: 'Overlap threshold for filtering' },
    highlightElements: { type: 'boolean', description: 'Draw bounding boxes around found elements' },
    captureScreenshot: { type: 'boolean', description: 'Take screenshot with highlighted elements' },
    exportSelectors: { type: 'boolean', description: 'Generate reusable selectors' },
    includeElementText: { type: 'boolean', description: 'Extract text content from elements' },
    optimizePerformance: { type: 'boolean', description: 'Enable performance optimizations' },
    useCache: { type: 'boolean', description: 'Cache processed images for repeated searches' },
    parallelProcessing: { type: 'boolean', description: 'Use multiple CPU cores' },
    debugMode: { type: 'boolean', description: 'Enable detailed debug output' },
    saveIntermediateImages: { type: 'boolean', description: 'Save intermediate processing images' },
  },

  // Output definitions
  outputs: {
    success: { type: 'boolean', description: 'Whether element search succeeded' },
    elementsFound: { type: 'number', description: 'Number of elements found' },
    elements: { 
      type: 'array', 
      description: 'Array of found elements with position, confidence, and details',
    },
    searchMethod: { type: 'string', description: 'Search method used' },
    searchRegion: { type: 'json', description: 'Search region coordinates (if used)' },
    screenshot: { type: 'string', description: 'Base64 encoded screenshot (if captured)' },
    executionTime: { type: 'number', description: 'Time taken for search in milliseconds' },
    timestamp: { type: 'string', description: 'ISO timestamp of search execution' },
    error: { type: 'string', description: 'Error message if search failed' },
  },
}