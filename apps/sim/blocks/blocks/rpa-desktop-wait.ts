import { ScheduleIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { ToolResponse } from '@/tools/types'

/**
 * RPA Desktop Wait Block Response Interface
 * Defines the structure of responses from desktop wait operations
 */
interface RPADesktopWaitResponse extends ToolResponse {
  output: {
    success: boolean
    waitType: 'duration' | 'element_appears' | 'element_disappears' | 'text_appears' | 'text_disappears' | 'image_appears' | 'image_disappears' | 'condition'
    waitDuration: number // Actual time waited in milliseconds
    conditionMet: boolean
    condition?: {
      type: string
      target: string
      result: boolean
      confidence?: number
    }
    timeout: boolean
    screenshot?: string // Base64 encoded screenshot when condition was met or timeout occurred
    executionTime: number
    timestamp: Date
    error?: string
  }
}

/**
 * RPA Desktop Wait Block Configuration
 * 
 * Comprehensive desktop wait automation block that supports:
 * - Duration-based waiting with precise timing
 * - Element appearance/disappearance detection
 * - Text appearance/disappearance monitoring
 * - Image-based condition waiting
 * - Custom condition evaluation
 * - Polling intervals and timeout handling
 * - Screenshot capture on condition changes
 */
export const RPADesktopWaitBlock: BlockConfig<RPADesktopWaitResponse> = {
  type: 'rpa-desktop-wait',
  name: 'RPA Desktop Wait',
  description: 'Wait for specific conditions or time durations',
  longDescription: 
    'Intelligently wait for various desktop conditions including element visibility, text appearance, image matching, ' +
    'or custom conditions. Provides precise timing control with configurable polling intervals and timeout handling.',
  docsLink: 'https://docs.sim.ai/blocks/rpa-desktop-wait',
  category: 'blocks',
  bgColor: '#16A085', // Teal theme for wait operations
  icon: ScheduleIcon,
  subBlocks: [
    // Wait Type Selection
    {
      id: 'waitType',
      title: 'Wait Type',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        { label: 'Fixed Duration', id: 'duration' },
        { label: 'Element Appears', id: 'element_appears' },
        { label: 'Element Disappears', id: 'element_disappears' },
        { label: 'Text Appears', id: 'text_appears' },
        { label: 'Text Disappears', id: 'text_disappears' },
        { label: 'Image Appears', id: 'image_appears' },
        { label: 'Image Disappears', id: 'image_disappears' },
        { label: 'Custom Condition', id: 'condition' },
      ],
      value: () => 'duration',
      description: 'Type of wait condition to monitor',
    },

    // Duration Configuration
    {
      id: 'waitDuration',
      title: 'Wait Duration',
      type: 'short-input',
      layout: 'half',
      placeholder: '5000',
      required: true,
      condition: {
        field: 'waitType',
        value: 'duration',
      },
      description: 'Duration to wait in milliseconds',
    },

    // Timeout Configuration (for conditional waits)
    {
      id: 'timeout',
      title: 'Timeout (seconds)',
      type: 'short-input',
      layout: 'half',
      placeholder: '30',
      condition: {
        field: 'waitType',
        value: ['element_appears', 'element_disappears', 'text_appears', 'text_disappears', 'image_appears', 'image_disappears', 'condition'],
      },
      description: 'Maximum time to wait for condition (default: 30s)',
    },

    // Polling Interval
    {
      id: 'pollingInterval',
      title: 'Check Interval (ms)',
      type: 'short-input',
      layout: 'half',
      placeholder: '500',
      condition: {
        field: 'waitType',
        value: ['element_appears', 'element_disappears', 'text_appears', 'text_disappears', 'image_appears', 'image_disappears', 'condition'],
      },
      description: 'How often to check the condition (default: 500ms)',
    },

    // Element Detection Configuration
    {
      id: 'elementSelector',
      title: 'Element Selector',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Image Template', id: 'image' },
        { label: 'OCR Text', id: 'text' },
        { label: 'Color Match', id: 'color' },
        { label: 'Pixel Pattern', id: 'pixel' },
      ],
      condition: {
        field: 'waitType',
        value: ['element_appears', 'element_disappears'],
      },
      description: 'Method to identify the element',
    },

    // Image Template Configuration
    {
      id: 'templateImage',
      title: 'Template Image',
      type: 'file-upload',
      layout: 'full',
      acceptedTypes: 'image/png,image/jpeg,image/bmp',
      maxSize: 10, // 10MB max
      condition: {
        field: 'waitType',
        value: ['image_appears', 'image_disappears'],
      },
      description: 'Upload template image to detect',
    },

    {
      id: 'imageConfidenceThreshold',
      title: 'Image Confidence',
      type: 'slider',
      layout: 'half',
      min: 0.1,
      max: 1.0,
      step: 0.01,
      condition: {
        field: 'waitType',
        value: ['image_appears', 'image_disappears'],
      },
      value: () => 0.8,
      description: 'Minimum confidence for image match',
    },

    // Text Detection Configuration
    {
      id: 'targetText',
      title: 'Target Text',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Text to wait for...',
      condition: {
        field: 'waitType',
        value: ['text_appears', 'text_disappears'],
      },
      description: 'Text content to detect',
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
      ],
      value: () => 'contains',
      condition: {
        field: 'waitType',
        value: ['text_appears', 'text_disappears'],
      },
      description: 'How to match the target text',
    },

    {
      id: 'textCaseSensitive',
      title: 'Case Sensitive',
      type: 'switch',
      layout: 'half',
      condition: {
        field: 'waitType',
        value: ['text_appears', 'text_disappears'],
      },
      description: 'Whether text matching is case sensitive',
    },

    // OCR Configuration for Text Detection
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
        { label: 'Chinese (Simplified)', id: 'chi_sim' },
        { label: 'Japanese', id: 'jpn' },
        { label: 'Korean', id: 'kor' },
        { label: 'Auto-detect', id: 'auto' },
      ],
      value: () => 'eng',
      condition: {
        field: 'waitType',
        value: ['text_appears', 'text_disappears'],
      },
      description: 'Language for OCR text detection',
    },

    // Color Detection Configuration
    {
      id: 'targetColor',
      title: 'Target Color',
      type: 'short-input',
      layout: 'half',
      placeholder: '#FF0000 or rgb(255,0,0)',
      condition: {
        field: 'elementSelector',
        value: 'color',
      },
      description: 'Color to detect (hex or rgb format)',
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
        field: 'elementSelector',
        value: 'color',
      },
      value: () => 10,
      description: 'Color matching tolerance (0-100)',
    },

    // Search Region Configuration
    {
      id: 'searchRegion',
      title: 'Limit Search Region',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Restrict monitoring to specific screen region',
    },

    {
      id: 'regionX',
      title: 'Region X',
      type: 'short-input',
      layout: 'half',
      placeholder: '0',
      mode: 'advanced',
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
      mode: 'advanced',
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
      mode: 'advanced',
      condition: {
        field: 'searchRegion',
        value: true,
      },
      description: 'Search region width',
    },

    {
      id: 'regionHeight',
      title: 'Region Height',
      type: 'short-input',
      layout: 'half',
      placeholder: '600',
      mode: 'advanced',
      condition: {
        field: 'searchRegion',
        value: true,
      },
      description: 'Search region height',
    },

    // Custom Condition Configuration
    {
      id: 'conditionExpression',
      title: 'Condition Expression',
      type: 'long-input',
      layout: 'full',
      rows: 3,
      placeholder: 'pixel(100, 100) == "red" && window("Notepad").exists',
      condition: {
        field: 'waitType',
        value: 'condition',
      },
      description: 'Custom condition expression to evaluate',
    },

    // Screenshot Options
    {
      id: 'captureScreenshot',
      title: 'Capture Screenshots',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'None', id: 'none' },
        { label: 'On Condition Met', id: 'on_success' },
        { label: 'On Timeout', id: 'on_timeout' },
        { label: 'Both', id: 'both' },
      ],
      value: () => 'none',
      mode: 'advanced',
      description: 'When to capture screenshots',
    },

    // Performance Options
    {
      id: 'optimizePerformance',
      title: 'Optimize Performance',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Enable performance optimizations for long waits',
    },

    {
      id: 'adaptivePolling',
      title: 'Adaptive Polling',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      condition: {
        field: 'optimizePerformance',
        value: true,
      },
      description: 'Automatically adjust polling frequency',
    },

    // Error Handling
    {
      id: 'continueOnTimeout',
      title: 'Continue on Timeout',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Continue workflow execution if wait times out',
    },

    {
      id: 'logProgress',
      title: 'Log Progress',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Log wait progress and condition checks',
    },

    // Multiple Condition Support
    {
      id: 'multipleConditions',
      title: 'Multiple Conditions',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Wait for multiple conditions simultaneously',
    },

    {
      id: 'conditionLogic',
      title: 'Condition Logic',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'All Conditions (AND)', id: 'and' },
        { label: 'Any Condition (OR)', id: 'or' },
      ],
      value: () => 'and',
      condition: {
        field: 'multipleConditions',
        value: true,
      },
      mode: 'advanced',
      description: 'Logic for evaluating multiple conditions',
    },
  ],

  // Tool configuration for RPA engine access
  tools: {
    access: ['desktop-wait', 'desktop-monitor', 'desktop-screenshot', 'desktop-ocr', 'desktop-image-recognition'],
    config: {
      tool: (params: Record<string, any>) => {
        // Select appropriate tool based on wait type
        switch (params.waitType) {
          case 'duration':
            return 'desktop-wait'
          case 'text_appears':
          case 'text_disappears':
            return 'desktop-ocr'
          case 'image_appears':
          case 'image_disappears':
            return 'desktop-image-recognition'
          case 'element_appears':
          case 'element_disappears':
            return 'desktop-monitor'
          case 'condition':
            return 'desktop-monitor'
          default:
            return 'desktop-wait'
        }
      },
      params: (params: Record<string, any>) => {
        const baseParams = {
          waitType: params.waitType || 'duration',
          timeout: (parseInt(params.timeout) || 30) * 1000, // Convert to milliseconds
          pollingInterval: parseInt(params.pollingInterval) || 500,
          captureScreenshot: params.captureScreenshot || 'none',
          continueOnTimeout: params.continueOnTimeout || false,
          logProgress: params.logProgress || false,
          optimizePerformance: params.optimizePerformance || false,
          adaptivePolling: params.adaptivePolling || false,
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

        // Add wait-specific parameters
        switch (params.waitType) {
          case 'duration':
            return {
              ...baseParams,
              duration: parseInt(params.waitDuration) || 5000,
            }

          case 'element_appears':
          case 'element_disappears':
            const elementParams = {
              ...baseParams,
              elementSelector: params.elementSelector || 'image',
              expectVisible: params.waitType === 'element_appears',
            }

            if (params.elementSelector === 'image') {
              return {
                ...elementParams,
                templateImage: params.templateImage,
                confidenceThreshold: parseFloat(params.imageConfidenceThreshold) || 0.8,
              }
            } else if (params.elementSelector === 'text') {
              return {
                ...elementParams,
                targetText: params.targetText,
                textMatchMode: params.textMatchMode || 'contains',
                caseSensitive: params.textCaseSensitive || false,
                ocrLanguage: params.ocrLanguage || 'eng',
              }
            } else if (params.elementSelector === 'color') {
              return {
                ...elementParams,
                targetColor: params.targetColor,
                colorTolerance: parseInt(params.colorTolerance) || 10,
              }
            }
            return elementParams

          case 'text_appears':
          case 'text_disappears':
            return {
              ...baseParams,
              targetText: params.targetText,
              textMatchMode: params.textMatchMode || 'contains',
              caseSensitive: params.textCaseSensitive || false,
              ocrLanguage: params.ocrLanguage || 'eng',
              expectPresent: params.waitType === 'text_appears',
            }

          case 'image_appears':
          case 'image_disappears':
            return {
              ...baseParams,
              templateImage: params.templateImage,
              confidenceThreshold: parseFloat(params.imageConfidenceThreshold) || 0.8,
              expectPresent: params.waitType === 'image_appears',
            }

          case 'condition':
            return {
              ...baseParams,
              conditionExpression: params.conditionExpression,
              multipleConditions: params.multipleConditions || false,
              conditionLogic: params.conditionLogic || 'and',
            }

          default:
            return baseParams
        }
      },
    },
  },

  // Input parameter definitions
  inputs: {
    waitType: { type: 'string', description: 'Type of wait condition to monitor' },
    waitDuration: { type: 'number', description: 'Duration to wait in milliseconds' },
    timeout: { type: 'number', description: 'Maximum wait time in seconds' },
    pollingInterval: { type: 'number', description: 'Condition check interval in milliseconds' },
    elementSelector: { type: 'string', description: 'Method to identify target element' },
    templateImage: { type: 'string', description: 'Base64 encoded template image' },
    imageConfidenceThreshold: { type: 'number', description: 'Minimum confidence for image matching' },
    targetText: { type: 'string', description: 'Text content to detect' },
    textMatchMode: { type: 'string', description: 'Text matching mode' },
    textCaseSensitive: { type: 'boolean', description: 'Whether text matching is case sensitive' },
    ocrLanguage: { type: 'string', description: 'Language for OCR processing' },
    targetColor: { type: 'string', description: 'Color to detect' },
    colorTolerance: { type: 'number', description: 'Color matching tolerance' },
    searchRegion: { type: 'boolean', description: 'Whether to limit search to specific region' },
    regionX: { type: 'number', description: 'Search region X coordinate' },
    regionY: { type: 'number', description: 'Search region Y coordinate' },
    regionWidth: { type: 'number', description: 'Search region width' },
    regionHeight: { type: 'number', description: 'Search region height' },
    conditionExpression: { type: 'string', description: 'Custom condition expression' },
    captureScreenshot: { type: 'string', description: 'When to capture screenshots' },
    optimizePerformance: { type: 'boolean', description: 'Enable performance optimizations' },
    adaptivePolling: { type: 'boolean', description: 'Use adaptive polling frequency' },
    continueOnTimeout: { type: 'boolean', description: 'Continue on timeout instead of failing' },
    logProgress: { type: 'boolean', description: 'Log wait progress and checks' },
    multipleConditions: { type: 'boolean', description: 'Enable multiple condition monitoring' },
    conditionLogic: { type: 'string', description: 'Logic for multiple conditions (and/or)' },
  },

  // Output definitions
  outputs: {
    success: { type: 'boolean', description: 'Whether wait completed successfully' },
    waitType: { type: 'string', description: 'Type of wait that was performed' },
    waitDuration: { type: 'number', description: 'Actual time waited in milliseconds' },
    conditionMet: { type: 'boolean', description: 'Whether the wait condition was satisfied' },
    condition: { type: 'json', description: 'Details about the condition that was monitored' },
    timeout: { type: 'boolean', description: 'Whether the wait timed out' },
    screenshot: { type: 'string', description: 'Base64 encoded screenshot (if captured)' },
    executionTime: { type: 'number', description: 'Total execution time in milliseconds' },
    timestamp: { type: 'string', description: 'ISO timestamp when wait completed' },
    error: { type: 'string', description: 'Error message if wait failed' },
  },
}