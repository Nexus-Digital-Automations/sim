import { ImageIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { ToolResponse } from '@/tools/types'

/**
 * RPA Desktop Screenshot Block Response Interface
 * Defines the structure of responses from desktop screenshot operations
 */
interface RPADesktopScreenshotResponse extends ToolResponse {
  output: {
    success: boolean
    screenshot: string // Base64 encoded screenshot
    screenshotPath?: string // File path if saved to disk
    captureMode: 'fullscreen' | 'region' | 'window' | 'element'
    dimensions: {
      width: number
      height: number
    }
    region?: {
      x: number
      y: number
      width: number
      height: number
    }
    format: 'png' | 'jpeg' | 'bmp' | 'webp'
    quality?: number
    fileSize: number
    metadata: {
      timestamp: Date
      displayInfo: {
        screenCount: number
        primaryScreen: { width: number; height: number }
        scaleFactor: number
      }
    }
    executionTime: number
    error?: string
  }
}

/**
 * RPA Desktop Screenshot Block Configuration
 * 
 * Comprehensive desktop screenshot capture block that supports:
 * - Full screen and region-based capture
 * - Multiple image formats (PNG, JPEG, BMP, WebP)
 * - Quality settings and compression options
 * - Multi-monitor support
 * - Window and element-specific capture
 * - Automated file saving with custom naming
 * - Screenshot annotation and watermarking
 */
export const RPADesktopScreenshotBlock: BlockConfig<RPADesktopScreenshotResponse> = {
  type: 'rpa-desktop-screenshot',
  name: 'RPA Desktop Screenshot',
  description: 'Capture screenshots of desktop, regions, or specific windows',
  longDescription: 
    'Capture high-quality screenshots with precise control over capture region, format, and quality. ' +
    'Supports multi-monitor setups, specific window capture, and automated file management with custom naming.',
  docsLink: 'https://docs.sim.ai/blocks/rpa-desktop-screenshot',
  category: 'blocks',
  bgColor: '#9B59B6', // Purple theme for capture operations
  icon: ImageIcon,
  subBlocks: [
    // Capture Mode Selection
    {
      id: 'captureMode',
      title: 'Capture Mode',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        { label: 'Full Screen', id: 'fullscreen' },
        { label: 'Custom Region', id: 'region' },
        { label: 'Active Window', id: 'window' },
        { label: 'All Screens', id: 'all_screens' },
        { label: 'Specific Monitor', id: 'monitor' },
      ],
      value: () => 'fullscreen',
      description: 'Area of screen to capture',
    },

    // Monitor Selection (for multi-monitor setups)
    {
      id: 'monitorIndex',
      title: 'Monitor Index',
      type: 'short-input',
      layout: 'half',
      placeholder: '0',
      condition: {
        field: 'captureMode',
        value: 'monitor',
      },
      description: 'Monitor number to capture (0 = primary monitor)',
    },

    // Region Configuration
    {
      id: 'regionX',
      title: 'Region X',
      type: 'short-input',
      layout: 'half',
      placeholder: '0',
      required: true,
      condition: {
        field: 'captureMode',
        value: 'region',
      },
      description: 'X coordinate of capture region',
    },

    {
      id: 'regionY',
      title: 'Region Y',
      type: 'short-input',
      layout: 'half',
      placeholder: '0',
      required: true,
      condition: {
        field: 'captureMode',
        value: 'region',
      },
      description: 'Y coordinate of capture region',
    },

    {
      id: 'regionWidth',
      title: 'Region Width',
      type: 'short-input',
      layout: 'half',
      placeholder: '800',
      required: true,
      condition: {
        field: 'captureMode',
        value: 'region',
      },
      description: 'Width of capture region in pixels',
    },

    {
      id: 'regionHeight',
      title: 'Region Height',
      type: 'short-input',
      layout: 'half',
      placeholder: '600',
      required: true,
      condition: {
        field: 'captureMode',
        value: 'region',
      },
      description: 'Height of capture region in pixels',
    },

    // Window Selection
    {
      id: 'windowTitle',
      title: 'Window Title',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Partial window title...',
      condition: {
        field: 'captureMode',
        value: 'window',
      },
      description: 'Title or partial title of window to capture',
    },

    // Output Format Configuration
    {
      id: 'imageFormat',
      title: 'Image Format',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'PNG (Lossless)', id: 'png' },
        { label: 'JPEG (Compressed)', id: 'jpeg' },
        { label: 'BMP (Uncompressed)', id: 'bmp' },
        { label: 'WebP (Modern)', id: 'webp' },
      ],
      value: () => 'png',
      description: 'Output image format',
    },

    {
      id: 'imageQuality',
      title: 'Image Quality',
      type: 'slider',
      layout: 'half',
      min: 10,
      max: 100,
      step: 5,
      condition: {
        field: 'imageFormat',
        value: ['jpeg', 'webp'],
      },
      value: () => 85,
      description: 'Image quality for lossy formats (10-100)',
    },

    // File Saving Options
    {
      id: 'saveToFile',
      title: 'Save to File',
      type: 'switch',
      layout: 'half',
      description: 'Save screenshot to local file system',
    },

    {
      id: 'outputPath',
      title: 'Output Directory',
      type: 'short-input',
      layout: 'full',
      placeholder: 'C:\\Screenshots\\ or /Users/username/Screenshots/',
      condition: {
        field: 'saveToFile',
        value: true,
      },
      description: 'Directory path to save screenshots',
    },

    {
      id: 'fileName',
      title: 'File Name',
      type: 'short-input',
      layout: 'half',
      placeholder: 'screenshot_{timestamp}',
      condition: {
        field: 'saveToFile',
        value: true,
      },
      description: 'File name (use {timestamp}, {date}, {time} placeholders)',
    },

    {
      id: 'overwriteExisting',
      title: 'Overwrite Existing',
      type: 'switch',
      layout: 'half',
      condition: {
        field: 'saveToFile',
        value: true,
      },
      description: 'Overwrite existing files with same name',
    },

    // Advanced Capture Options
    {
      id: 'includeMouseCursor',
      title: 'Include Mouse Cursor',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Include mouse cursor in screenshot',
    },

    {
      id: 'captureDelay',
      title: 'Capture Delay (ms)',
      type: 'short-input',
      layout: 'half',
      placeholder: '0',
      mode: 'advanced',
      description: 'Delay before taking screenshot (allows UI to settle)',
    },

    {
      id: 'hideTaskbar',
      title: 'Hide Taskbar',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      condition: {
        field: 'captureMode',
        value: 'fullscreen',
      },
      description: 'Temporarily hide taskbar during capture (Windows)',
    },

    // Image Processing Options
    {
      id: 'applyProcessing',
      title: 'Apply Image Processing',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Enable post-capture image processing',
    },

    {
      id: 'processingOptions',
      title: 'Processing Options',
      type: 'checkbox-list',
      layout: 'full',
      multiSelect: true,
      options: [
        { label: 'Auto Enhance', id: 'auto_enhance' },
        { label: 'Adjust Brightness', id: 'brightness' },
        { label: 'Adjust Contrast', id: 'contrast' },
        { label: 'Apply Blur', id: 'blur' },
        { label: 'Add Border', id: 'border' },
        { label: 'Resize Image', id: 'resize' },
        { label: 'Convert to Grayscale', id: 'grayscale' },
      ],
      condition: {
        field: 'applyProcessing',
        value: true,
      },
      mode: 'advanced',
      description: 'Image processing options to apply',
    },

    // Annotation Options
    {
      id: 'addAnnotations',
      title: 'Add Annotations',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Add text or graphical annotations to screenshot',
    },

    {
      id: 'annotationText',
      title: 'Annotation Text',
      type: 'short-input',
      layout: 'half',
      placeholder: 'Captured on {timestamp}',
      condition: {
        field: 'addAnnotations',
        value: true,
      },
      mode: 'advanced',
      description: 'Text to overlay on screenshot',
    },

    {
      id: 'annotationPosition',
      title: 'Annotation Position',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Top Left', id: 'top_left' },
        { label: 'Top Right', id: 'top_right' },
        { label: 'Bottom Left', id: 'bottom_left' },
        { label: 'Bottom Right', id: 'bottom_right' },
        { label: 'Center', id: 'center' },
      ],
      value: () => 'bottom_right',
      condition: {
        field: 'addAnnotations',
        value: true,
      },
      mode: 'advanced',
      description: 'Position for annotation text',
    },

    // Multiple Screenshots
    {
      id: 'captureMultiple',
      title: 'Capture Multiple',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Take multiple screenshots in sequence',
    },

    {
      id: 'captureCount',
      title: 'Capture Count',
      type: 'short-input',
      layout: 'half',
      placeholder: '3',
      condition: {
        field: 'captureMultiple',
        value: true,
      },
      mode: 'advanced',
      description: 'Number of screenshots to capture',
    },

    {
      id: 'captureInterval',
      title: 'Capture Interval (ms)',
      type: 'short-input',
      layout: 'half',
      placeholder: '1000',
      condition: {
        field: 'captureMultiple',
        value: true,
      },
      mode: 'advanced',
      description: 'Time between captures in milliseconds',
    },

    // Thumbnail Generation
    {
      id: 'generateThumbnail',
      title: 'Generate Thumbnail',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Create a small thumbnail version',
    },

    {
      id: 'thumbnailSize',
      title: 'Thumbnail Size',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: '128x128', id: '128' },
        { label: '256x256', id: '256' },
        { label: '512x512', id: '512' },
      ],
      value: () => '256',
      condition: {
        field: 'generateThumbnail',
        value: true,
      },
      mode: 'advanced',
      description: 'Size of generated thumbnail',
    },

    // Privacy and Security
    {
      id: 'blurSensitiveAreas',
      title: 'Blur Sensitive Areas',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Automatically blur potentially sensitive content',
    },

    {
      id: 'excludeWindows',
      title: 'Exclude Windows',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Password Manager,Bank',
      mode: 'advanced',
      description: 'Comma-separated list of window titles to exclude from capture',
    },
  ],

  // Tool configuration for RPA engine access
  tools: {
    access: ['desktop-screenshot', 'image-processing', 'file-operations'],
    config: {
      tool: () => 'desktop-screenshot',
      params: (params: Record<string, any>) => {
        const baseParams = {
          captureMode: params.captureMode || 'fullscreen',
          imageFormat: params.imageFormat || 'png',
          saveToFile: params.saveToFile || false,
          includeMouseCursor: params.includeMouseCursor || false,
          captureDelay: parseInt(params.captureDelay) || 0,
          hideTaskbar: params.hideTaskbar || false,
        }

        // Add quality settings for lossy formats
        if (['jpeg', 'webp'].includes(params.imageFormat)) {
          baseParams.imageQuality = parseInt(params.imageQuality) || 85
        }

        // Add region configuration
        if (params.captureMode === 'region') {
          baseParams.region = {
            x: parseInt(params.regionX) || 0,
            y: parseInt(params.regionY) || 0,
            width: parseInt(params.regionWidth) || 800,
            height: parseInt(params.regionHeight) || 600,
          }
        }

        // Add monitor selection
        if (params.captureMode === 'monitor') {
          baseParams.monitorIndex = parseInt(params.monitorIndex) || 0
        }

        // Add window selection
        if (params.captureMode === 'window') {
          baseParams.windowTitle = params.windowTitle || ''
        }

        // Add file saving configuration
        if (params.saveToFile) {
          baseParams.fileConfig = {
            outputPath: params.outputPath || '',
            fileName: params.fileName || 'screenshot_{timestamp}',
            overwriteExisting: params.overwriteExisting || false,
          }
        }

        // Add image processing options
        if (params.applyProcessing) {
          baseParams.processing = {
            options: params.processingOptions || [],
          }
        }

        // Add annotation configuration
        if (params.addAnnotations) {
          baseParams.annotations = {
            text: params.annotationText || '',
            position: params.annotationPosition || 'bottom_right',
          }
        }

        // Add multiple capture configuration
        if (params.captureMultiple) {
          baseParams.multipleCapture = {
            count: parseInt(params.captureCount) || 1,
            interval: parseInt(params.captureInterval) || 1000,
          }
        }

        // Add thumbnail configuration
        if (params.generateThumbnail) {
          baseParams.thumbnail = {
            size: parseInt(params.thumbnailSize) || 256,
          }
        }

        // Add privacy options
        if (params.blurSensitiveAreas || params.excludeWindows) {
          baseParams.privacy = {
            blurSensitive: params.blurSensitiveAreas || false,
            excludeWindows: params.excludeWindows ? 
              params.excludeWindows.split(',').map((w: string) => w.trim()) : [],
          }
        }

        return baseParams
      },
    },
  },

  // Input parameter definitions
  inputs: {
    captureMode: { type: 'string', description: 'Screen capture mode (fullscreen, region, window, etc.)' },
    monitorIndex: { type: 'number', description: 'Monitor index for multi-monitor setups' },
    regionX: { type: 'number', description: 'X coordinate of capture region' },
    regionY: { type: 'number', description: 'Y coordinate of capture region' },
    regionWidth: { type: 'number', description: 'Width of capture region' },
    regionHeight: { type: 'number', description: 'Height of capture region' },
    windowTitle: { type: 'string', description: 'Title of window to capture' },
    imageFormat: { type: 'string', description: 'Output image format' },
    imageQuality: { type: 'number', description: 'Image quality for lossy formats' },
    saveToFile: { type: 'boolean', description: 'Whether to save screenshot to file' },
    outputPath: { type: 'string', description: 'Directory path for saved screenshots' },
    fileName: { type: 'string', description: 'File name pattern for saved screenshots' },
    overwriteExisting: { type: 'boolean', description: 'Whether to overwrite existing files' },
    includeMouseCursor: { type: 'boolean', description: 'Include mouse cursor in screenshot' },
    captureDelay: { type: 'number', description: 'Delay before capture in milliseconds' },
    hideTaskbar: { type: 'boolean', description: 'Hide taskbar during capture' },
    applyProcessing: { type: 'boolean', description: 'Apply image processing options' },
    processingOptions: { type: 'array', description: 'Image processing options to apply' },
    addAnnotations: { type: 'boolean', description: 'Add text annotations to screenshot' },
    annotationText: { type: 'string', description: 'Text to overlay on screenshot' },
    annotationPosition: { type: 'string', description: 'Position for annotation text' },
    captureMultiple: { type: 'boolean', description: 'Capture multiple screenshots' },
    captureCount: { type: 'number', description: 'Number of screenshots to capture' },
    captureInterval: { type: 'number', description: 'Interval between captures' },
    generateThumbnail: { type: 'boolean', description: 'Generate thumbnail version' },
    thumbnailSize: { type: 'number', description: 'Size of generated thumbnail' },
    blurSensitiveAreas: { type: 'boolean', description: 'Blur potentially sensitive content' },
    excludeWindows: { type: 'string', description: 'Window titles to exclude from capture' },
  },

  // Output definitions
  outputs: {
    success: { type: 'boolean', description: 'Whether screenshot capture succeeded' },
    screenshot: { type: 'string', description: 'Base64 encoded screenshot image' },
    screenshotPath: { type: 'string', description: 'File path if saved to disk' },
    captureMode: { type: 'string', description: 'Capture mode used' },
    dimensions: { type: 'json', description: 'Image width and height' },
    region: { type: 'json', description: 'Capture region coordinates (if applicable)' },
    format: { type: 'string', description: 'Image format used' },
    quality: { type: 'number', description: 'Image quality setting (if applicable)' },
    fileSize: { type: 'number', description: 'Size of captured image in bytes' },
    metadata: { type: 'json', description: 'Capture metadata and display information' },
    executionTime: { type: 'number', description: 'Time taken for capture in milliseconds' },
    error: { type: 'string', description: 'Error message if capture failed' },
  },
}