/**
 * RPA Desktop Automation Blocks
 * 
 * Comprehensive collection of RPA blocks for desktop automation workflows.
 * These blocks integrate with the Sim Desktop Agent to provide powerful
 * desktop automation capabilities.
 */

// Import all RPA desktop blocks
export { RPADesktopClickBlock } from './rpa-desktop-click'
export { RPADesktopTypeBlock } from './rpa-desktop-type'
export { RPADesktopExtractBlock } from './rpa-desktop-extract'
export { RPADesktopScreenshotBlock } from './rpa-desktop-screenshot'
export { RPADesktopWaitBlock } from './rpa-desktop-wait'
export { RPADesktopFindBlock } from './rpa-desktop-find'

// Export types for external use
export type {
  RPADesktopClickResponse,
  RPADesktopTypeResponse,
  RPADesktopExtractResponse,
  RPADesktopScreenshotResponse,
  RPADesktopWaitResponse,
  RPADesktopFindResponse,
} from './rpa-desktop-click'

// RPA Block Categories and Documentation
export const RPA_BLOCK_CATEGORIES = {
  INPUT: 'input',
  EXTRACTION: 'extraction',
  VISUAL: 'visual',
  TIMING: 'timing',
  SEARCH: 'search',
} as const

export const RPA_BLOCKS_METADATA = {
  'rpa-desktop-click': {
    category: RPA_BLOCK_CATEGORIES.INPUT,
    description: 'Click on desktop elements using coordinates, image recognition, or OCR',
    complexity: 'medium',
    requiredCapabilities: ['desktop-automation', 'image-recognition', 'ocr-processing'],
    platforms: ['windows', 'macos', 'linux'],
  },
  'rpa-desktop-type': {
    category: RPA_BLOCK_CATEGORIES.INPUT,
    description: 'Type text and key combinations with realistic timing',
    complexity: 'low',
    requiredCapabilities: ['desktop-automation'],
    platforms: ['windows', 'macos', 'linux'],
  },
  'rpa-desktop-extract': {
    category: RPA_BLOCK_CATEGORIES.EXTRACTION,
    description: 'Extract text from screen regions using OCR or accessibility APIs',
    complexity: 'medium',
    requiredCapabilities: ['desktop-automation', 'ocr-processing'],
    platforms: ['windows', 'macos', 'linux'],
  },
  'rpa-desktop-screenshot': {
    category: RPA_BLOCK_CATEGORIES.VISUAL,
    description: 'Capture screenshots with advanced options and processing',
    complexity: 'low',
    requiredCapabilities: ['desktop-automation'],
    platforms: ['windows', 'macos', 'linux'],
  },
  'rpa-desktop-wait': {
    category: RPA_BLOCK_CATEGORIES.TIMING,
    description: 'Wait for conditions or time durations with intelligent monitoring',
    complexity: 'high',
    requiredCapabilities: ['desktop-automation', 'image-recognition', 'ocr-processing'],
    platforms: ['windows', 'macos', 'linux'],
  },
  'rpa-desktop-find': {
    category: RPA_BLOCK_CATEGORIES.SEARCH,
    description: 'Find and locate desktop elements using multiple detection methods',
    complexity: 'high',
    requiredCapabilities: ['desktop-automation', 'image-recognition', 'ocr-processing'],
    platforms: ['windows', 'macos', 'linux'],
  },
} as const

// Helper function to get all RPA blocks
export function getAllRPABlocks() {
  return [
    RPADesktopClickBlock,
    RPADesktopTypeBlock,
    RPADesktopExtractBlock,
    RPADesktopScreenshotBlock,
    RPADesktopWaitBlock,
    RPADesktopFindBlock,
  ]
}

// Helper function to get RPA blocks by category
export function getRPABlocksByCategory(category: string) {
  return getAllRPABlocks().filter(block => 
    RPA_BLOCKS_METADATA[block.type as keyof typeof RPA_BLOCKS_METADATA]?.category === category
  )
}

// Installation guide constants
export const RPA_INSTALLATION_REQUIREMENTS = {
  desktopAgent: {
    name: 'Sim Desktop Agent',
    minVersion: '1.0.0',
    downloadUrl: 'https://github.com/sim-platform/desktop-agent/releases',
    platforms: ['windows', 'macos', 'linux'],
  },
  engines: [
    {
      name: 'nut.js',
      description: 'Cross-platform desktop automation engine',
      required: true,
      capabilities: ['mouse', 'keyboard', 'screen'],
    },
    {
      name: 'Playwright',
      description: 'Web browser automation (optional for hybrid workflows)',
      required: false,
      capabilities: ['browser-automation'],
    },
    {
      name: 'PyAutoGUI',
      description: 'Python-based automation engine (optional)',
      required: false,
      capabilities: ['legacy-support'],
    },
  ],
  dependencies: [
    {
      name: 'Tesseract OCR',
      description: 'OCR engine for text extraction',
      required: true,
      platforms: ['windows', 'macos', 'linux'],
    },
    {
      name: 'OpenCV',
      description: 'Computer vision library for image processing',
      required: true,
      platforms: ['windows', 'macos', 'linux'],
    },
  ],
} as const

// Usage examples
export const RPA_USAGE_EXAMPLES = {
  basicClicking: {
    title: 'Basic Desktop Clicking',
    description: 'Click on a button using coordinates',
    workflow: [
      {
        block: 'rpa-desktop-click',
        config: {
          clickType: 'left_click',
          targetingMethod: 'coordinates',
          coordinateX: 500,
          coordinateY: 300,
        },
      },
    ],
  },
  imageBasedAutomation: {
    title: 'Image-Based Automation',
    description: 'Find and click on UI elements using image recognition',
    workflow: [
      {
        block: 'rpa-desktop-find',
        config: {
          searchMethod: 'image_recognition',
          templateImage: 'data:image/png;base64,...',
          returnStrategy: 'best',
        },
      },
      {
        block: 'rpa-desktop-click',
        config: {
          clickType: 'left_click',
          targetingMethod: 'image_recognition',
          templateImage: 'data:image/png;base64,...',
        },
      },
    ],
  },
  dataExtraction: {
    title: 'OCR Data Extraction',
    description: 'Extract text from specific screen regions',
    workflow: [
      {
        block: 'rpa-desktop-extract',
        config: {
          extractionMethod: 'ocr',
          regionMode: 'custom',
          regionX: 100,
          regionY: 100,
          regionWidth: 400,
          regionHeight: 200,
          ocrLanguage: 'eng',
        },
      },
    ],
  },
} as const