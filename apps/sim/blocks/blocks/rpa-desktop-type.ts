import { InputIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { ToolResponse } from '@/tools/types'

/**
 * RPA Desktop Type Block Response Interface
 * Defines the structure of responses from desktop typing operations
 */
interface RPADesktopTypeResponse extends ToolResponse {
  output: {
    success: boolean
    action: 'type_text' | 'key_combination' | 'special_key'
    content: {
      text?: string
      keys?: string[]
      combination?: string
    }
    typingStats: {
      charactersTyped: number
      wordsPerMinute: number
      actualSpeed: number // chars per second
    }
    executionTime: number
    timestamp: Date
    screenshot?: string // Base64 encoded screenshot after typing
    error?: string
  }
}

/**
 * RPA Desktop Type Block Configuration
 * 
 * Comprehensive desktop text input automation block that supports:
 * - Plain text typing with configurable speed
 * - Special key combinations (Ctrl+A, Alt+Tab, etc.)
 * - Individual special keys (Enter, Tab, Escape, etc.)
 * - Text replacement and insertion modes
 * - Pre-action clearing options
 * - Configurable typing speed and delays
 */
export const RPADesktopTypeBlock: BlockConfig<RPADesktopTypeResponse> = {
  type: 'rpa-desktop-type',
  name: 'RPA Desktop Type',
  description: 'Type text and key combinations on the desktop',
  longDescription: 
    'Simulate keyboard input with precise control over typing speed, special key combinations, and text handling. ' +
    'Supports all standard keys, modifier combinations, and advanced typing behaviors for realistic automation.',
  docsLink: 'https://docs.sim.ai/blocks/rpa-desktop-type',
  category: 'blocks',
  bgColor: '#3498DB', // Blue theme for input actions
  icon: InputIcon,
  subBlocks: [
    // Input Type Selection
    {
      id: 'inputType',
      title: 'Input Type',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        { label: 'Type Text', id: 'type_text' },
        { label: 'Key Combination', id: 'key_combination' },
        { label: 'Special Key', id: 'special_key' },
      ],
      value: () => 'type_text',
      description: 'Type of keyboard input to perform',
    },

    // Pre-action Clearing
    {
      id: 'clearBefore',
      title: 'Clear Before Typing',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'None', id: 'none' },
        { label: 'Select All (Ctrl+A)', id: 'select_all' },
        { label: 'Clear Field', id: 'clear_field' },
        { label: 'Backspace All', id: 'backspace_all' },
      ],
      value: () => 'none',
      description: 'Action to perform before typing',
    },

    // Text Input (for type_text mode)
    {
      id: 'textContent',
      title: 'Text Content',
      type: 'long-input',
      layout: 'full',
      placeholder: 'Enter text to type...',
      rows: 4,
      required: true,
      condition: {
        field: 'inputType',
        value: 'type_text',
      },
      description: 'Text content to type (supports multi-line)',
    },

    // Key Combination Configuration
    {
      id: 'keyModifiers',
      title: 'Modifier Keys',
      type: 'checkbox-list',
      layout: 'half',
      multiSelect: true,
      options: [
        { label: 'Ctrl', id: 'ctrl' },
        { label: 'Alt', id: 'alt' },
        { label: 'Shift', id: 'shift' },
        { label: 'Meta/Cmd', id: 'meta' },
      ],
      condition: {
        field: 'inputType',
        value: 'key_combination',
      },
      description: 'Modifier keys to hold',
    },

    {
      id: 'combinationKey',
      title: 'Key',
      type: 'dropdown',
      layout: 'half',
      required: true,
      options: [
        // Letters
        { label: 'A', id: 'a' },
        { label: 'B', id: 'b' },
        { label: 'C', id: 'c' },
        { label: 'D', id: 'd' },
        { label: 'E', id: 'e' },
        { label: 'F', id: 'f' },
        { label: 'G', id: 'g' },
        { label: 'H', id: 'h' },
        { label: 'I', id: 'i' },
        { label: 'J', id: 'j' },
        { label: 'K', id: 'k' },
        { label: 'L', id: 'l' },
        { label: 'M', id: 'm' },
        { label: 'N', id: 'n' },
        { label: 'O', id: 'o' },
        { label: 'P', id: 'p' },
        { label: 'Q', id: 'q' },
        { label: 'R', id: 'r' },
        { label: 'S', id: 's' },
        { label: 'T', id: 't' },
        { label: 'U', id: 'u' },
        { label: 'V', id: 'v' },
        { label: 'W', id: 'w' },
        { label: 'X', id: 'x' },
        { label: 'Y', id: 'y' },
        { label: 'Z', id: 'z' },
        // Numbers
        { label: '0', id: '0' },
        { label: '1', id: '1' },
        { label: '2', id: '2' },
        { label: '3', id: '3' },
        { label: '4', id: '4' },
        { label: '5', id: '5' },
        { label: '6', id: '6' },
        { label: '7', id: '7' },
        { label: '8', id: '8' },
        { label: '9', id: '9' },
        // Special Keys
        { label: 'Enter', id: 'enter' },
        { label: 'Tab', id: 'tab' },
        { label: 'Escape', id: 'escape' },
        { label: 'Space', id: 'space' },
        { label: 'Backspace', id: 'backspace' },
        { label: 'Delete', id: 'delete' },
        { label: 'Home', id: 'home' },
        { label: 'End', id: 'end' },
        { label: 'Page Up', id: 'pageup' },
        { label: 'Page Down', id: 'pagedown' },
        // Arrow Keys
        { label: 'Arrow Up', id: 'up' },
        { label: 'Arrow Down', id: 'down' },
        { label: 'Arrow Left', id: 'left' },
        { label: 'Arrow Right', id: 'right' },
        // Function Keys
        { label: 'F1', id: 'f1' },
        { label: 'F2', id: 'f2' },
        { label: 'F3', id: 'f3' },
        { label: 'F4', id: 'f4' },
        { label: 'F5', id: 'f5' },
        { label: 'F6', id: 'f6' },
        { label: 'F7', id: 'f7' },
        { label: 'F8', id: 'f8' },
        { label: 'F9', id: 'f9' },
        { label: 'F10', id: 'f10' },
        { label: 'F11', id: 'f11' },
        { label: 'F12', id: 'f12' },
      ],
      condition: {
        field: 'inputType',
        value: 'key_combination',
      },
      description: 'Key to combine with modifiers',
    },

    // Special Key Selection
    {
      id: 'specialKey',
      title: 'Special Key',
      type: 'dropdown',
      layout: 'full',
      required: true,
      options: [
        { label: 'Enter', id: 'enter' },
        { label: 'Tab', id: 'tab' },
        { label: 'Escape', id: 'escape' },
        { label: 'Space', id: 'space' },
        { label: 'Backspace', id: 'backspace' },
        { label: 'Delete', id: 'delete' },
        { label: 'Home', id: 'home' },
        { label: 'End', id: 'end' },
        { label: 'Page Up', id: 'pageup' },
        { label: 'Page Down', id: 'pagedown' },
        { label: 'Arrow Up', id: 'up' },
        { label: 'Arrow Down', id: 'down' },
        { label: 'Arrow Left', id: 'left' },
        { label: 'Arrow Right', id: 'right' },
        { label: 'Insert', id: 'insert' },
        { label: 'Print Screen', id: 'printscreen' },
        { label: 'Scroll Lock', id: 'scrolllock' },
        { label: 'Pause', id: 'pause' },
        { label: 'Caps Lock', id: 'capslock' },
        { label: 'Num Lock', id: 'numlock' },
        { label: 'F1', id: 'f1' },
        { label: 'F2', id: 'f2' },
        { label: 'F3', id: 'f3' },
        { label: 'F4', id: 'f4' },
        { label: 'F5', id: 'f5' },
        { label: 'F6', id: 'f6' },
        { label: 'F7', id: 'f7' },
        { label: 'F8', id: 'f8' },
        { label: 'F9', id: 'f9' },
        { label: 'F10', id: 'f10' },
        { label: 'F11', id: 'f11' },
        { label: 'F12', id: 'f12' },
      ],
      condition: {
        field: 'inputType',
        value: 'special_key',
      },
      description: 'Special key to press',
    },

    // Typing Speed Configuration
    {
      id: 'typingSpeed',
      title: 'Typing Speed',
      type: 'dropdown',
      layout: 'half',
      options: [
        { label: 'Very Slow (100 WPM)', id: 'very_slow' },
        { label: 'Slow (200 WPM)', id: 'slow' },
        { label: 'Normal (400 WPM)', id: 'normal' },
        { label: 'Fast (800 WPM)', id: 'fast' },
        { label: 'Very Fast (1600 WPM)', id: 'very_fast' },
        { label: 'Instant', id: 'instant' },
        { label: 'Custom', id: 'custom' },
      ],
      value: () => 'normal',
      condition: {
        field: 'inputType',
        value: 'type_text',
      },
      description: 'Speed of text typing simulation',
    },

    {
      id: 'customSpeed',
      title: 'Custom Speed (chars/sec)',
      type: 'short-input',
      layout: 'half',
      placeholder: '10',
      condition: {
        field: 'typingSpeed',
        value: 'custom',
      },
      description: 'Characters per second for custom typing speed',
    },

    // Repeat Options
    {
      id: 'repeatCount',
      title: 'Repeat Count',
      type: 'short-input',
      layout: 'half',
      placeholder: '1',
      mode: 'advanced',
      description: 'Number of times to repeat the input (default: 1)',
    },

    {
      id: 'repeatDelay',
      title: 'Repeat Delay (ms)',
      type: 'short-input',
      layout: 'half',
      placeholder: '100',
      mode: 'advanced',
      condition: {
        field: 'repeatCount',
        value: ['2', '3', '4', '5', '6', '7', '8', '9', '10'],
      },
      description: 'Delay between repetitions in milliseconds',
    },

    // Advanced Options
    {
      id: 'humanizeTyping',
      title: 'Humanize Typing',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      condition: {
        field: 'inputType',
        value: 'type_text',
      },
      description: 'Add random variations to typing rhythm for human-like behavior',
    },

    {
      id: 'respectCaps',
      title: 'Respect Caps Lock',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      condition: {
        field: 'inputType',
        value: 'type_text',
      },
      description: 'Take current Caps Lock state into account',
    },

    // Delay Options
    {
      id: 'preInputDelay',
      title: 'Pre-Input Delay (ms)',
      type: 'short-input',
      layout: 'half',
      placeholder: '100',
      mode: 'advanced',
      description: 'Delay before starting input (default: 100ms)',
    },

    {
      id: 'postInputDelay',
      title: 'Post-Input Delay (ms)',
      type: 'short-input',
      layout: 'half',
      placeholder: '100',
      mode: 'advanced',
      description: 'Delay after completing input (default: 100ms)',
    },

    // Screenshot Options
    {
      id: 'captureScreenshot',
      title: 'Capture Screenshot',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Take screenshot after typing operation',
    },

    // Error Handling
    {
      id: 'ignoreIfNotFocused',
      title: 'Ignore if Not Focused',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Continue even if no input field is focused',
    },

    // Text Processing Options
    {
      id: 'processEscapeSequences',
      title: 'Process Escape Sequences',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      condition: {
        field: 'inputType',
        value: 'type_text',
      },
      description: 'Process \\n, \\t, \\r escape sequences in text',
    },

    // Input Validation
    {
      id: 'validateInput',
      title: 'Validate After Input',
      type: 'switch',
      layout: 'half',
      mode: 'advanced',
      description: 'Verify text was typed correctly (OCR validation)',
    },
  ],

  // Tool configuration for RPA engine access
  tools: {
    access: ['desktop-type', 'desktop-key', 'desktop-screenshot', 'desktop-validate'],
    config: {
      tool: (params: Record<string, any>) => {
        // Select appropriate tool based on input type
        switch (params.inputType) {
          case 'type_text':
            return 'desktop-type'
          case 'key_combination':
          case 'special_key':
            return 'desktop-key'
          default:
            return 'desktop-type'
        }
      },
      params: (params: Record<string, any>) => {
        const baseParams = {
          preInputDelay: parseInt(params.preInputDelay) || 100,
          postInputDelay: parseInt(params.postInputDelay) || 100,
          repeatCount: parseInt(params.repeatCount) || 1,
          repeatDelay: parseInt(params.repeatDelay) || 100,
          captureScreenshot: params.captureScreenshot || false,
          clearBefore: params.clearBefore || 'none',
          ignoreIfNotFocused: params.ignoreIfNotFocused || false,
        }

        // Add input-specific parameters
        switch (params.inputType) {
          case 'type_text':
            return {
              ...baseParams,
              inputType: 'type_text',
              text: params.textContent,
              typingSpeed: params.typingSpeed || 'normal',
              customSpeed: params.typingSpeed === 'custom' ? parseFloat(params.customSpeed) || 10 : undefined,
              humanizeTyping: params.humanizeTyping || false,
              respectCaps: params.respectCaps || false,
              processEscapeSequences: params.processEscapeSequences || false,
              validateInput: params.validateInput || false,
            }

          case 'key_combination':
            return {
              ...baseParams,
              inputType: 'key_combination',
              modifiers: params.keyModifiers || [],
              key: params.combinationKey,
            }

          case 'special_key':
            return {
              ...baseParams,
              inputType: 'special_key',
              key: params.specialKey,
            }

          default:
            return baseParams
        }
      },
    },
  },

  // Input parameter definitions
  inputs: {
    inputType: { type: 'string', description: 'Type of keyboard input to perform' },
    clearBefore: { type: 'string', description: 'Pre-typing clear action' },
    textContent: { type: 'string', description: 'Text content to type' },
    keyModifiers: { type: 'array', description: 'Modifier keys for combination' },
    combinationKey: { type: 'string', description: 'Key to combine with modifiers' },
    specialKey: { type: 'string', description: 'Special key to press' },
    typingSpeed: { type: 'string', description: 'Typing speed preset' },
    customSpeed: { type: 'number', description: 'Custom typing speed in chars/sec' },
    repeatCount: { type: 'number', description: 'Number of repetitions' },
    repeatDelay: { type: 'number', description: 'Delay between repetitions' },
    humanizeTyping: { type: 'boolean', description: 'Add human-like typing variations' },
    respectCaps: { type: 'boolean', description: 'Consider Caps Lock state' },
    preInputDelay: { type: 'number', description: 'Delay before input in milliseconds' },
    postInputDelay: { type: 'number', description: 'Delay after input in milliseconds' },
    captureScreenshot: { type: 'boolean', description: 'Whether to capture post-action screenshot' },
    ignoreIfNotFocused: { type: 'boolean', description: 'Continue if no field is focused' },
    processEscapeSequences: { type: 'boolean', description: 'Process escape sequences in text' },
    validateInput: { type: 'boolean', description: 'Validate input after typing' },
  },

  // Output definitions
  outputs: {
    success: { type: 'boolean', description: 'Whether the typing operation succeeded' },
    action: { type: 'string', description: 'Type of input action performed' },
    content: { type: 'json', description: 'Details about the content typed or keys pressed' },
    typingStats: { type: 'json', description: 'Statistics about typing performance' },
    executionTime: { type: 'number', description: 'Time taken to execute the action in milliseconds' },
    timestamp: { type: 'string', description: 'ISO timestamp of action execution' },
    screenshot: { type: 'string', description: 'Base64 encoded screenshot (if captured)' },
    error: { type: 'string', description: 'Error message if operation failed' },
  },
}

// Helper function to map typing speeds to characters per second
export const getTypingSpeed = (speedPreset: string): number => {
  const speedMap = {
    very_slow: 100 / 60 / 5,  // 100 WPM ≈ 1.67 chars/sec (assuming 5 chars per word)
    slow: 200 / 60 / 5,       // 200 WPM ≈ 3.33 chars/sec
    normal: 400 / 60 / 5,     // 400 WPM ≈ 6.67 chars/sec
    fast: 800 / 60 / 5,       // 800 WPM ≈ 13.33 chars/sec
    very_fast: 1600 / 60 / 5, // 1600 WPM ≈ 26.67 chars/sec
    instant: -1,              // Special case for instant typing
  }
  return speedMap[speedPreset as keyof typeof speedMap] || speedMap.normal
}