import { SearchIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { ToolResponse } from '@/tools/types'

/**
 * RPA Desktop Extract Block Response Interface
 * Defines the structure of responses from desktop text/data extraction operations
 */
interface RPADesktopExtractResponse extends ToolResponse {
  output: {
    success: boolean
    extractedText: string
    confidence: number
    extractionMethod: 'ocr' | 'clipboard' | 'accessibility'
    region?: {
      x: number
      y: number
      width: number
      height: number
    }
    ocrDetails?: {
      language: string
      wordsFound: number
      blocks: Array<{
        text: string
        confidence: number
        bbox: { x: number; y: number; width: number; height: number }
      }>
    }
    formatting?: {
      preserveLineBreaks: boolean
      cleanWhitespace: boolean
      originalStructure?: string
    }
    screenshot?: string // Base64 encoded screenshot of extraction region
    executionTime: number
    timestamp: Date
    error?: string
  }
}

/**
 * RPA Desktop Extract Block Configuration
 * 
 * Comprehensive desktop text and data extraction block that supports:
 * - OCR text extraction from screen regions
 * - Clipboard content capture
 * - Accessibility-based text extraction
 * - Multi-language OCR support
 * - Configurable confidence thresholds
 * - Text formatting and cleanup options
 * - Region-based and full-screen extraction
 */
export const RPADesktopExtractBlock: BlockConfig<RPADesktopExtractResponse> = {
  type: 'rpa-desktop-extract',
  name: 'RPA Desktop Extract',
  description: 'Extract text and data from desktop elements',
  longDescription: 
    'Extract text from the desktop using OCR, clipboard capture, or accessibility APIs. ' +
    'Supports multiple languages, region selection, and advanced text processing with configurable confidence thresholds.',
  docsLink: 'https://docs.sim.ai/blocks/rpa-desktop-extract',
  category: 'blocks',
  bgColor: '#F39C12', // Orange theme for extraction operations
  icon: SearchIcon,
  subBlocks: [
    // Extraction Method Selection
    {
      id: 'extractionMethod',
      title: 'Extraction Method',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        { label: 'OCR (Optical Character Recognition)', id: 'ocr' },
        { label: 'Clipboard Content', id: 'clipboard' },
        { label: 'Accessibility API', id: 'accessibility' },
      ],
      value: () => 'ocr',
      description: 'Method to extract text from the desktop',
    },

    // Region Selection Mode
    {
      id: 'regionMode',
      title: 'Region Mode',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Full Screen', id: 'fullscreen' },
        { label: 'Custom Region', id: 'custom' },
        { label: 'Active Window', id: 'active_window' },
        { label: 'Mouse Selection', id: 'mouse_selection' },
      ],
      value: () => 'fullscreen',
      condition: {
        field: 'extractionMethod',
        value: ['ocr', 'accessibility'],
      },
      description: 'Area of screen to extract text from',
    },

    // Custom Region Configuration
    {
      id: 'regionX',
      title: 'Region X',
      type: 'short-input',
      layout: 'half',
      placeholder: '0',
      required: true,
      condition: {
        field: 'regionMode',
        value: 'custom',
      },
      description: 'X coordinate of extraction region',
    },

    {
      id: 'regionY',
      title: 'Region Y',
      type: 'short-input',
      layout: 'half',
      placeholder: '0',
      required: true,
      condition: {
        field: 'regionMode',
        value: 'custom',
      },
      description: 'Y coordinate of extraction region',
    },

    {
      id: 'regionWidth',
      title: 'Region Width',
      type: 'short-input',
      layout: 'half',
      placeholder: '800',
      required: true,
      condition: {
        field: 'regionMode',
        value: 'custom',
      },
      description: 'Width of extraction region in pixels',
    },

    {
      id: 'regionHeight',
      title: 'Region Height',
      type: 'short-input',
      layout: 'half',
      placeholder: '600',
      required: true,
      condition: {
        field: 'regionMode',
        value: 'custom',
      },
      description: 'Height of extraction region in pixels',
    },

    // OCR Configuration
    {
      id: 'ocrLanguage',
      title: 'OCR Language',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Auto-detect', id: 'auto' },
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
        { label: 'Hindi', id: 'hin' },
      ],
      value: () => 'eng',
      condition: {
        field: 'extractionMethod',
        value: 'ocr',
      },
      description: 'Language for OCR text recognition',
    },

    {
      id: 'ocrMode',
      title: 'OCR Mode',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Standard', id: 'standard' },
        { label: 'High Accuracy', id: 'high_accuracy' },
        { label: 'Fast', id: 'fast' },
        { label: 'Numbers Only', id: 'numbers' },
        { label: 'Single Line', id: 'single_line' },
        { label: 'Single Word', id: 'single_word' },
      ],
      value: () => 'standard',
      condition: {
        field: 'extractionMethod',
        value: 'ocr',
      },
      description: 'OCR processing mode',
    },

    {
      id: 'confidenceThreshold',
      title: 'Confidence Threshold',
      type: 'slider',
      layout: 'half',
      min: 0.1,
      max: 1.0,
      step: 0.01,
      condition: {
        field: 'extractionMethod',
        value: 'ocr',
      },
      value: () => 0.6,
      description: 'Minimum confidence required for text extraction (0.1-1.0)',
    },

    // Text Processing Options
    {
      id: 'preserveLineBreaks',
      title: 'Preserve Line Breaks',
      type: 'switch',
      layout: 'half',
      condition: {
        field: 'extractionMethod',
        value: ['ocr', 'accessibility'],
      },
      description: 'Keep original line breaks in extracted text',
    },

    {
      id: 'cleanWhitespace',
      title: 'Clean Whitespace',
      type: 'switch',
      layout: 'half',
      description: 'Remove extra spaces and normalize whitespace',
    },

    {
      id: 'removeEmptyLines',
      title: 'Remove Empty Lines',
      type: 'switch',
      layout: 'half',
      description: 'Filter out empty lines from extracted text',
    },

    // Output Format Options
    {
      id: 'outputFormat',
      title: 'Output Format',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Plain Text', id: 'plain' },
        { label: 'JSON Structure', id: 'json' },
        { label: 'CSV Format', id: 'csv' },
        { label: 'Markdown', id: 'markdown' },
        { label: 'HTML', id: 'html' },
      ],
      value: () => 'plain',
      mode: 'advanced',
      description: 'Format for extracted text output',
    },

    // Clipboard Options
    {
      id: 'clipboardTimeout',
      title: 'Clipboard Timeout (seconds)',
      type: 'short-input',
      layout: 'half',
      placeholder: '5',
      condition: {
        field: 'extractionMethod',
        value: 'clipboard',
      },
      mode: 'advanced',
      description: 'Maximum time to wait for clipboard content',
    },

    {
      id: 'clearClipboard',
      title: 'Clear Clipboard After',
      type: 'switch',
      layout: 'half',
      condition: {
        field: 'extractionMethod',
        value: 'clipboard',
      },
      mode: 'advanced',
      description: 'Clear clipboard after extraction for security',
    },

    // Pre-processing Options
    {
      id: 'preprocessImage',
      title: 'Image Preprocessing',
      type: 'checkbox-list',
      layout: 'full',
      multiSelect: true,
      options: [
        { label: 'Enhance Contrast', id: 'enhance_contrast' },
        { label: 'Remove Noise', id: 'denoise' },
        { label: 'Sharpen Text', id: 'sharpen' },
        { label: 'Grayscale Conversion', id: 'grayscale' },
        { label: 'Auto-rotate', id: 'auto_rotate' },
      ],
      condition: {
        field: 'extractionMethod',
        value: 'ocr',
      },
      mode: 'advanced',
      description: 'Image preprocessing steps to improve OCR accuracy',
    },

    // Text Filtering
    {
      id: 'textFilters',
      title: 'Text Filters',
      type: 'checkbox-list',
      layout: 'full',
      multiSelect: true,
      options: [
        { label: 'Numbers Only', id: 'numbers_only' },
        { label: 'Letters Only', id: 'letters_only' },
        { label: 'Remove Special Characters', id: 'no_special' },
        { label: 'Remove Punctuation', id: 'no_punctuation' },
        { label: 'Title Case', id: 'title_case' },
        { label: 'Uppercase', id: 'uppercase' },
        { label: 'Lowercase', id: 'lowercase' },
      ],
      mode: 'advanced',
      description: 'Filters to apply to extracted text',
    },

    // Validation Options
    {
      id: 'validateExtraction',
      title: 'Validate Extraction',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Perform validation checks on extracted text',
    },

    {
      id: 'minTextLength',
      title: 'Minimum Text Length',
      type: 'short-input',
      layout: 'half',
      placeholder: '1',
      condition: {
        field: 'validateExtraction',
        value: true,
      },
      mode: 'advanced',
      description: 'Minimum number of characters required',
    },

    {
      id: 'expectedPattern',
      title: 'Expected Pattern (Regex)',
      type: 'short-input',
      layout: 'full',
      placeholder: '^[A-Z0-9]+$',
      condition: {
        field: 'validateExtraction',
        value: true,
      },
      mode: 'advanced',
      description: 'Regular expression pattern the extracted text should match',
    },

    // Screenshot Options
    {
      id: 'captureScreenshot',
      title: 'Capture Screenshot',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Take screenshot of extraction region',
    },

    // Retry Configuration
    {
      id: 'maxRetries',
      title: 'Max Retries',
      type: 'short-input',
      layout: 'half',
      placeholder: '3',
      mode: 'advanced',
      description: 'Maximum number of extraction attempts',
    },

    {
      id: 'retryDelay',
      title: 'Retry Delay (ms)',
      type: 'short-input',
      layout: 'half',
      placeholder: '1000',
      mode: 'advanced',
      description: 'Delay between retry attempts',
    },
  ],

  // Tool configuration for RPA engine access
  tools: {
    access: ['desktop-ocr', 'desktop-screenshot', 'desktop-clipboard', 'desktop-accessibility'],
    config: {
      tool: (params: Record<string, any>) => {
        // Select appropriate tool based on extraction method
        switch (params.extractionMethod) {
          case 'ocr':
            return 'desktop-ocr'
          case 'clipboard':
            return 'desktop-clipboard'
          case 'accessibility':
            return 'desktop-accessibility'
          default:
            return 'desktop-ocr'
        }
      },
      params: (params: Record<string, any>) => {
        const baseParams = {
          extractionMethod: params.extractionMethod || 'ocr',
          cleanWhitespace: params.cleanWhitespace || false,
          removeEmptyLines: params.removeEmptyLines || false,
          outputFormat: params.outputFormat || 'plain',
          validateExtraction: params.validateExtraction || false,
          minTextLength: parseInt(params.minTextLength) || 1,
          expectedPattern: params.expectedPattern || null,
          captureScreenshot: params.captureScreenshot || false,
          maxRetries: parseInt(params.maxRetries) || 3,
          retryDelay: parseInt(params.retryDelay) || 1000,
          textFilters: params.textFilters || [],
        }

        // Add region configuration
        if (params.regionMode === 'custom') {
          baseParams.region = {
            x: parseInt(params.regionX) || 0,
            y: parseInt(params.regionY) || 0,
            width: parseInt(params.regionWidth) || 800,
            height: parseInt(params.regionHeight) || 600,
          }
        } else {
          baseParams.regionMode = params.regionMode || 'fullscreen'
        }

        // Add method-specific parameters
        switch (params.extractionMethod) {
          case 'ocr':
            return {
              ...baseParams,
              ocrLanguage: params.ocrLanguage || 'eng',
              ocrMode: params.ocrMode || 'standard',
              confidenceThreshold: parseFloat(params.confidenceThreshold) || 0.6,
              preserveLineBreaks: params.preserveLineBreaks || false,
              preprocessImage: params.preprocessImage || [],
            }

          case 'clipboard':
            return {
              ...baseParams,
              clipboardTimeout: parseInt(params.clipboardTimeout) * 1000 || 5000, // Convert to ms
              clearClipboard: params.clearClipboard || false,
            }

          case 'accessibility':
            return {
              ...baseParams,
              preserveLineBreaks: params.preserveLineBreaks || false,
            }

          default:
            return baseParams
        }
      },
    },
  },

  // Input parameter definitions
  inputs: {
    extractionMethod: { type: 'string', description: 'Method to extract text from desktop' },
    regionMode: { type: 'string', description: 'Screen region selection mode' },
    regionX: { type: 'number', description: 'X coordinate of extraction region' },
    regionY: { type: 'number', description: 'Y coordinate of extraction region' },
    regionWidth: { type: 'number', description: 'Width of extraction region' },
    regionHeight: { type: 'number', description: 'Height of extraction region' },
    ocrLanguage: { type: 'string', description: 'Language for OCR processing' },
    ocrMode: { type: 'string', description: 'OCR processing mode' },
    confidenceThreshold: { type: 'number', description: 'Minimum confidence for text extraction' },
    preserveLineBreaks: { type: 'boolean', description: 'Keep original line breaks' },
    cleanWhitespace: { type: 'boolean', description: 'Normalize whitespace in output' },
    removeEmptyLines: { type: 'boolean', description: 'Filter out empty lines' },
    outputFormat: { type: 'string', description: 'Format for extracted text output' },
    clipboardTimeout: { type: 'number', description: 'Timeout for clipboard operations' },
    clearClipboard: { type: 'boolean', description: 'Clear clipboard after extraction' },
    preprocessImage: { type: 'array', description: 'Image preprocessing options for OCR' },
    textFilters: { type: 'array', description: 'Text filtering and transformation options' },
    validateExtraction: { type: 'boolean', description: 'Enable extraction validation' },
    minTextLength: { type: 'number', description: 'Minimum required text length' },
    expectedPattern: { type: 'string', description: 'Regular expression for text validation' },
    captureScreenshot: { type: 'boolean', description: 'Whether to capture region screenshot' },
    maxRetries: { type: 'number', description: 'Maximum extraction retry attempts' },
    retryDelay: { type: 'number', description: 'Delay between retry attempts' },
  },

  // Output definitions
  outputs: {
    success: { type: 'boolean', description: 'Whether text extraction succeeded' },
    extractedText: { type: 'string', description: 'Extracted text content' },
    confidence: { type: 'number', description: 'Overall confidence score for extraction' },
    extractionMethod: { type: 'string', description: 'Method used for extraction' },
    region: { type: 'json', description: 'Region coordinates used for extraction' },
    ocrDetails: { type: 'json', description: 'Detailed OCR analysis results' },
    formatting: { type: 'json', description: 'Text formatting and processing details' },
    screenshot: { type: 'string', description: 'Base64 encoded screenshot (if captured)' },
    executionTime: { type: 'number', description: 'Time taken for extraction in milliseconds' },
    timestamp: { type: 'string', description: 'ISO timestamp of extraction' },
    error: { type: 'string', description: 'Error message if extraction failed' },
  },
}