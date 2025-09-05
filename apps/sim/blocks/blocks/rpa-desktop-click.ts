import { ClickIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { ToolResponse } from '@/tools/types'

/**
 * RPA Desktop Click Block Response Interface
 * Defines the structure of responses from desktop click operations
 */
interface RPADesktopClickResponse extends ToolResponse {
  output: {
    success: boolean
    action: 'left_click' | 'right_click' | 'double_click' | 'middle_click'
    target: {
      method: 'coordinates' | 'image_recognition' | 'ocr_text'
      coordinates?: { x: number; y: number }
      imageMatch?: {
        confidence: number
        region: { x: number; y: number; width: number; height: number }
      }
      ocrMatch?: {
        text: string
        confidence: number
        region: { x: number; y: number; width: number; height: number }
      }
    }
    screenshot?: string // Base64 encoded screenshot after action
    executionTime: number
    timestamp: Date
    error?: string
  }
}

/**
 * RPA Desktop Click Block Configuration
 * 
 * Comprehensive desktop click automation block that supports multiple targeting methods:
 * - Coordinate-based clicking for precise positioning
 * - Image recognition for visual element identification
 * - OCR text matching for text-based targeting
 * - Multiple click types (left, right, double, middle)
 * - Advanced configuration options for retries, timeouts, and confidence thresholds
 */
export const RPADesktopClickBlock: BlockConfig<RPADesktopClickResponse> = {
  type: 'rpa-desktop-click',
  name: 'RPA Desktop Click',
  description: 'Click on desktop elements using multiple targeting methods',
  longDescription: 
    'Perform precise desktop clicks using coordinates, image recognition, or OCR text matching. ' +
    'Supports all standard click types with advanced retry logic and confidence thresholds for reliable automation.',
  docsLink: 'https://docs.sim.ai/blocks/rpa-desktop-click',
  category: 'blocks',
  bgColor: '#E74C3C', // Red theme for RPA actions
  icon: ClickIcon,
  subBlocks: [
    // Click Type Configuration
    {
      id: 'clickType',
      title: 'Click Type',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        { label: 'Left Click', id: 'left_click' },
        { label: 'Right Click', id: 'right_click' },
        { label: 'Double Click', id: 'double_click' },
        { label: 'Middle Click', id: 'middle_click' },
      ],
      value: () => 'left_click',
      description: 'Type of mouse click to perform',
    },

    // Target Method Selection
    {
      id: 'targetingMethod',
      title: 'Targeting Method',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        { label: 'Coordinates', id: 'coordinates' },
        { label: 'Image Recognition', id: 'image_recognition' },
        { label: 'OCR Text', id: 'ocr_text' },
      ],
      value: () => 'coordinates',
      description: 'Method to locate the target element',
    },

    // Coordinate Input Fields (visible when coordinates method selected)
    {
      id: 'coordinateX',
      title: 'X Coordinate',
      type: 'short-input',
      layout: 'half',
      placeholder: 'Enter X position (pixels)',
      required: true,
      condition: {
        field: 'targetingMethod',
        value: 'coordinates',
      },
      description: 'Horizontal position in pixels from top-left corner',
    },

    {
      id: 'coordinateY',
      title: 'Y Coordinate',
      type: 'short-input',
      layout: 'half',
      placeholder: 'Enter Y position (pixels)',
      required: true,
      condition: {
        field: 'targetingMethod',
        value: 'coordinates',
      },
      description: 'Vertical position in pixels from top-left corner',
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
        field: 'targetingMethod',
        value: 'image_recognition',
      },
      description: 'Upload reference image to match on screen',
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
        field: 'targetingMethod',
        value: 'image_recognition',
      },
      value: () => 0.8,
      description: 'Minimum confidence required for image match (0.1-1.0)',
    },

    // OCR Text Configuration
    {
      id: 'ocrText',
      title: 'Target Text',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Enter text to find and click',
      required: true,
      condition: {
        field: 'targetingMethod',
        value: 'ocr_text',
      },
      description: 'Text content to locate and click using OCR',
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
        { label: 'Chinese (Simplified)', id: 'chi_sim' },
        { label: 'Japanese', id: 'jpn' },
        { label: 'Korean', id: 'kor' },
        { label: 'Auto-detect', id: 'auto' },
      ],
      value: () => 'eng',
      condition: {
        field: 'targetingMethod',
        value: 'ocr_text',
      },
      description: 'Language for OCR text recognition',
    },

    {
      id: 'ocrConfidenceThreshold',
      title: 'OCR Confidence Threshold',
      type: 'slider',
      layout: 'half',
      min: 0.1,
      max: 1.0,
      step: 0.01,
      condition: {
        field: 'targetingMethod',
        value: 'ocr_text',
      },
      value: () => 0.7,
      description: 'Minimum confidence required for OCR text match',
    },

    // Advanced Options
    {
      id: 'timeout',
      title: 'Timeout (seconds)',
      type: 'short-input',
      layout: 'half',
      placeholder: '30',
      mode: 'advanced',
      description: 'Maximum time to wait for target element (default: 30s)',
    },

    {
      id: 'maxRetries',
      title: 'Max Retries',
      type: 'short-input',
      layout: 'half',
      placeholder: '3',
      mode: 'advanced',
      description: 'Maximum number of retry attempts (default: 3)',
    },

    {
      id: 'retryDelay',
      title: 'Retry Delay (ms)',
      type: 'short-input',
      layout: 'half',
      placeholder: '1000',
      mode: 'advanced',
      description: 'Delay between retry attempts in milliseconds (default: 1000ms)',
    },

    // Search Region Limitation (Advanced)
    {
      id: 'searchRegion',
      title: 'Limit Search Region',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Restrict search to a specific screen region',
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
      placeholder: '1920',
      mode: 'advanced',
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
      placeholder: '1080',
      mode: 'advanced',
      condition: {
        field: 'searchRegion',
        value: true,
      },
      description: 'Search region height in pixels',
    },

    // Screenshot Options
    {
      id: 'captureScreenshot',
      title: 'Capture Screenshot',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Take screenshot after click action for verification',
    },

    // Click Modifiers
    {
      id: 'holdModifiers',
      title: 'Hold Modifier Keys',
      type: 'checkbox-list',
      layout: 'full',
      mode: 'advanced',
      options: [
        { label: 'Ctrl', id: 'ctrl' },
        { label: 'Alt', id: 'alt' },
        { label: 'Shift', id: 'shift' },
        { label: 'Meta/Cmd', id: 'meta' },
      ],
      description: 'Modifier keys to hold while clicking',
    },

    // Post-Click Delay
    {
      id: 'postClickDelay',
      title: 'Post-Click Delay (ms)',
      type: 'short-input',
      layout: 'half',
      placeholder: '100',
      mode: 'advanced',
      description: 'Delay after click before continuing (default: 100ms)',
    },
  ],

  // Tool configuration for RPA engine access
  tools: {
    access: ['desktop-click', 'desktop-screenshot', 'desktop-ocr', 'desktop-image-recognition'],
    config: {
      tool: (params: Record<string, any>) => {
        // Select appropriate tool based on targeting method
        switch (params.targetingMethod) {
          case 'coordinates':
            return 'desktop-click'
          case 'image_recognition':
            return 'desktop-image-recognition'
          case 'ocr_text':
            return 'desktop-ocr'
          default:
            return 'desktop-click'
        }
      },
      params: (params: Record<string, any>) => {
        const baseParams = {
          clickType: params.clickType || 'left_click',
          timeout: parseInt(params.timeout) || 30,
          maxRetries: parseInt(params.maxRetries) || 3,
          retryDelay: parseInt(params.retryDelay) || 1000,
          captureScreenshot: params.captureScreenshot || false,
          postClickDelay: parseInt(params.postClickDelay) || 100,
          holdModifiers: params.holdModifiers || [],
        }

        // Add targeting-specific parameters
        switch (params.targetingMethod) {
          case 'coordinates':
            return {
              ...baseParams,
              targetMethod: 'coordinates',
              x: parseInt(params.coordinateX),
              y: parseInt(params.coordinateY),
            }

          case 'image_recognition':
            return {
              ...baseParams,
              targetMethod: 'image_recognition',
              templateImage: params.templateImage,
              confidenceThreshold: parseFloat(params.imageConfidenceThreshold) || 0.8,
              searchRegion: params.searchRegion ? {
                x: parseInt(params.regionX) || 0,
                y: parseInt(params.regionY) || 0,
                width: parseInt(params.regionWidth) || 1920,
                height: parseInt(params.regionHeight) || 1080,
              } : undefined,
            }

          case 'ocr_text':
            return {
              ...baseParams,
              targetMethod: 'ocr_text',
              text: params.ocrText,
              language: params.ocrLanguage || 'eng',
              confidenceThreshold: parseFloat(params.ocrConfidenceThreshold) || 0.7,
              searchRegion: params.searchRegion ? {
                x: parseInt(params.regionX) || 0,
                y: parseInt(params.regionY) || 0,
                width: parseInt(params.regionWidth) || 1920,
                height: parseInt(params.regionHeight) || 1080,
              } : undefined,
            }

          default:
            return baseParams
        }
      },
    },
  },

  // Input parameter definitions
  inputs: {
    clickType: { type: 'string', description: 'Type of mouse click to perform' },
    targetingMethod: { type: 'string', description: 'Method to locate target element' },
    coordinateX: { type: 'number', description: 'X coordinate for click position' },
    coordinateY: { type: 'number', description: 'Y coordinate for click position' },
    templateImage: { type: 'string', description: 'Base64 encoded template image for recognition' },
    imageConfidenceThreshold: { type: 'number', description: 'Minimum confidence for image match' },
    ocrText: { type: 'string', description: 'Text to locate using OCR' },
    ocrLanguage: { type: 'string', description: 'Language for OCR processing' },
    ocrConfidenceThreshold: { type: 'number', description: 'Minimum confidence for OCR match' },
    timeout: { type: 'number', description: 'Maximum wait time in seconds' },
    maxRetries: { type: 'number', description: 'Maximum retry attempts' },
    retryDelay: { type: 'number', description: 'Delay between retries in milliseconds' },
    searchRegion: { type: 'boolean', description: 'Whether to limit search to specific region' },
    regionX: { type: 'number', description: 'Search region X coordinate' },
    regionY: { type: 'number', description: 'Search region Y coordinate' },
    regionWidth: { type: 'number', description: 'Search region width' },
    regionHeight: { type: 'number', description: 'Search region height' },
    captureScreenshot: { type: 'boolean', description: 'Whether to capture post-action screenshot' },
    holdModifiers: { type: 'array', description: 'Modifier keys to hold during click' },
    postClickDelay: { type: 'number', description: 'Delay after click in milliseconds' },
  },

  // Output definitions
  outputs: {
    success: { type: 'boolean', description: 'Whether the click operation succeeded' },
    action: { type: 'string', description: 'Type of click action performed' },
    target: { type: 'json', description: 'Details about the target location and method used' },
    screenshot: { type: 'string', description: 'Base64 encoded screenshot (if captured)' },
    executionTime: { type: 'number', description: 'Time taken to execute the action in milliseconds' },
    timestamp: { type: 'string', description: 'ISO timestamp of action execution' },
    error: { type: 'string', description: 'Error message if operation failed' },
  },
}