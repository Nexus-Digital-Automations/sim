#!/usr/bin/env ts-node

/**
 * Block Documentation Generator
 *
 * Automatically generates comprehensive documentation for Sim platform blocks and tools.
 * This script scans block definitions, extracts configuration metadata, and creates
 * MDX documentation files for the Sim documentation website.
 *
 * Features:
 * - Automatic block configuration extraction from TypeScript files
 * - Tool parameter and output documentation generation
 * - Icon extraction and processing from React components
 * - Manual content preservation during regeneration
 * - Structured output format compatible with Next.js documentation
 *
 * Dependencies:
 * - fs: File system operations for reading/writing files
 * - path: Cross-platform path utilities
 * - glob: Pattern matching for file discovery
 * - TypeScript: Block definition parsing
 *
 * Usage:
 *   npm run generate-docs
 *   ts-node scripts/generate-block-docs.ts
 *
 * Output:
 *   Creates MDX files in apps/docs/content/docs/tools/
 *   Updates meta.json for navigation structure
 *
 * @author Sim Platform Team
 * @version 2.0.0
 * @since 1.0.0
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { glob } from 'glob'

console.log('🚀 Starting Sim Block Documentation Generator...')

// ES module compatibility - Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

/**
 * Configuration paths for the documentation generator
 * These paths define where to find source files and where to output documentation
 */
const BLOCKS_PATH = path.join(rootDir, 'apps/sim/blocks/blocks')
const DOCS_OUTPUT_PATH = path.join(rootDir, 'apps/docs/content/docs/tools')
const ICONS_PATH = path.join(rootDir, 'apps/sim/components/icons.tsx')

// Ensure output directory exists before proceeding with documentation generation
if (!fs.existsSync(DOCS_OUTPUT_PATH)) {
  fs.mkdirSync(DOCS_OUTPUT_PATH, { recursive: true })
  console.log(`📁 Created output directory: ${DOCS_OUTPUT_PATH}`)
}

/**
 * BlockConfig interface representing the structure of a Sim block configuration
 * This interface mirrors the actual BlockConfig type but avoids import dependencies
 * that could cause issues in the documentation generation process.
 */
interface BlockConfig {
  /** Unique identifier for the block type (e.g., 'api_call', 'text_input') */
  type: string
  /** Human-readable name displayed in the UI */
  name: string
  /** Brief description of the block's purpose */
  description: string
  /** Detailed usage instructions and implementation notes */
  longDescription?: string
  /** Category for organizing blocks in the UI (e.g., 'input', 'logic', 'output') */
  category: string
  /** Hex color code for block styling in the visual editor */
  bgColor?: string
  /** Icon component name from icons.tsx for visual representation */
  iconName?: string
  /** Output data structure that the block produces */
  outputs?: Record<string, any>
  /** Configuration for tools that the block can access */
  tools?: {
    /** Array of tool names that this block has permission to use */
    access?: string[]
  }
  /** Additional properties that may be present in specific block types */
  [key: string]: any
}

/**
 * Extract SVG icons from the icons.tsx component file
 *
 * This function parses the icons.tsx file to extract SVG content for each icon component.
 * It supports both function declaration and arrow function export patterns commonly
 * used in React icon components.
 *
 * The extracted SVG content is cleaned of React-specific props and standardized
 * for use in documentation generation.
 *
 * @returns {Record<string, string>} Object mapping icon names to cleaned SVG strings
 * @throws {Error} If the icons file cannot be read or parsed
 *
 * @example
 * const icons = extractIcons()
 * // Returns: { "DatabaseIcon": "<svg>...</svg>", "APIIcon": "<svg>...</svg>" }
 */
function extractIcons(): Record<string, string> {
  try {
    console.log('🎨 Extracting icons from icons.tsx...')
    const iconsContent = fs.readFileSync(ICONS_PATH, 'utf-8')
    const icons: Record<string, string> = {}

    // Regex patterns to match different icon export styles
    // Pattern 1: Function declarations - export function IconName() { return (<svg>...</svg>) }
    const functionDeclarationRegex =
      /export\s+function\s+(\w+Icon)\s*\([^)]*\)\s*{[\s\S]*?return\s*\(\s*<svg[\s\S]*?<\/svg>\s*\)/g

    // Pattern 2: Arrow functions - export const IconName = () => (<svg>...</svg>)
    const arrowFunctionRegex =
      /export\s+const\s+(\w+Icon)\s*=\s*\([^)]*\)\s*=>\s*(\(?\s*<svg[\s\S]*?<\/svg>\s*\)?)/g

    // Process function declaration style icons (export function IconName() {...})
    const functionMatches = Array.from(iconsContent.matchAll(functionDeclarationRegex))
    for (const match of functionMatches) {
      const iconName = match[1]
      const svgMatch = match[0].match(/<svg[\s\S]*?<\/svg>/)

      if (iconName && svgMatch) {
        // Clean and standardize the SVG content for documentation use
        let svgContent = svgMatch[0]

        // Remove React props spread operators that would break in documentation
        svgContent = svgContent.replace(/{\.\.\.props}/g, '')
        svgContent = svgContent.replace(/{\.\.\.(props|rest)}/g, '')

        // Remove explicit width/height attributes to allow CSS control
        svgContent = svgContent.replace(/width=["'][^"']*["']/g, '')
        svgContent = svgContent.replace(/height=["'][^"']*["']/g, '')

        // Add consistent CSS class for styling in documentation
        svgContent = svgContent.replace(/<svg/, '<svg className="block-icon"')

        icons[iconName] = svgContent
      }
    }

    // Process arrow function style icons (export const IconName = () => ...)
    const arrowMatches = Array.from(iconsContent.matchAll(arrowFunctionRegex))
    for (const match of arrowMatches) {
      const iconName = match[1]
      const svgContent = match[2]
      const svgMatch = svgContent.match(/<svg[\s\S]*?<\/svg>/)

      if (iconName && svgMatch) {
        // Apply the same cleaning process as function declarations
        let cleanedSvg = svgMatch[0]

        // Remove React-specific syntax that doesn't work in static documentation
        cleanedSvg = cleanedSvg.replace(/{\.\.\.props}/g, '')
        cleanedSvg = cleanedSvg.replace(/{\.\.\.(props|rest)}/g, '')

        // Standardize sizing approach for documentation consistency
        cleanedSvg = cleanedSvg.replace(/width=["'][^"']*["']/g, '')
        cleanedSvg = cleanedSvg.replace(/height=["'][^"']*["']/g, '')

        // Ensure consistent CSS class application
        cleanedSvg = cleanedSvg.replace(/<svg/, '<svg className="block-icon"')

        icons[iconName] = cleanedSvg
      }
    }

    console.log(`✅ Extracted ${Object.keys(icons).length} icons from components`)
    return icons
  } catch (error) {
    console.error('❌ Error extracting icons:', error)
    return {}
  }
}

/**
 * Extract block configuration from TypeScript file content
 *
 * Parses a block definition file to extract all configuration properties including
 * metadata, styling, outputs, and tool permissions. This function uses regex patterns
 * to extract structured data from TypeScript object definitions.
 *
 * @param {string} fileContent - Complete content of the block definition file
 * @returns {BlockConfig | null} Parsed block configuration or null if invalid
 *
 * @example
 * const config = extractBlockConfig(fileContent)
 * // Returns: { type: 'api_call', name: 'API Call', description: '...', ... }
 */
function extractBlockConfig(fileContent: string): BlockConfig | null {
  try {
    // First, locate the main block export to identify the block name
    // Pattern: export const SomeNameBlock: BlockConfig = { ... }
    const exportMatch = fileContent.match(/export\s+const\s+(\w+)Block\s*:/)

    if (!exportMatch) {
      console.warn('⚠️  No valid block export found in file - skipping')
      return null
    }

    const blockName = exportMatch[1]
    console.log(`📦 Processing block: ${blockName}`)

    // Extract the block type using specialized parsing logic
    const blockType = findBlockType(fileContent, blockName)

    // Extract all string properties using robust regex patterns that handle various quote styles
    const name = extractStringProperty(fileContent, 'name') || `${blockName} Block`
    const description = extractStringProperty(fileContent, 'description') || ''
    const longDescription = extractStringProperty(fileContent, 'longDescription') || ''
    const category = extractStringProperty(fileContent, 'category') || 'misc'
    const bgColor = extractStringProperty(fileContent, 'bgColor') || '#F5F5F5'
    const iconName = extractIconName(fileContent) || ''

    // Extract complex object structures
    const outputs = extractOutputs(fileContent)
    const toolsAccess = extractToolsAccess(fileContent)

    // Return the complete block configuration object
    return {
      type: blockType || blockName.toLowerCase(),
      name,
      description,
      longDescription,
      category,
      bgColor,
      iconName,
      outputs,
      tools: {
        access: toolsAccess,
      },
    }
  } catch (error) {
    console.error('❌ Error extracting block configuration:', error)
    return null
  }
}

/**
 * Find the block type identifier within the block configuration
 *
 * This function uses multiple strategies to locate the 'type' property within
 * a block definition, handling various code formatting styles and export patterns.
 *
 * @param {string} content - File content containing the block definition
 * @param {string} blockName - Name of the block being processed
 * @returns {string} The block type identifier or a fallback based on block name
 */
function findBlockType(content: string, blockName: string): string {
  // Strategy 1: Direct pattern matching within the block export
  // Matches: export const BlockNameBlock: BlockConfig = { ... type: 'value' ... }
  const blockExportRegex = new RegExp(
    `export\\s+const\\s+${blockName}Block\\s*:[^{]*{[\\s\\S]*?type\\s*:\\s*['"]([^'"]+)['"][\\s\\S]*?}`,
    'i'
  )
  const blockExportMatch = content.match(blockExportRegex)
  if (blockExportMatch) {
    console.log(`  ✓ Found type via direct export pattern: ${blockExportMatch[1]}`)
    return blockExportMatch[1]
  }

  // Strategy 2: Parse block content after export statement using balanced brace counting
  const exportMatch = content.match(new RegExp(`export\\s+const\\s+${blockName}Block\\s*:`))
  if (exportMatch) {
    // Extract everything after the export declaration
    const afterExport = content.substring(exportMatch.index! + exportMatch[0].length)

    // Find the opening brace of the configuration object
    const blockStartMatch = afterExport.match(/{/)
    if (blockStartMatch) {
      const blockStart = blockStartMatch.index!

      // Use balanced brace counting to find the complete configuration object
      let braceCount = 1
      let blockEnd = blockStart + 1

      while (blockEnd < afterExport.length && braceCount > 0) {
        if (afterExport[blockEnd] === '{') braceCount++
        else if (afterExport[blockEnd] === '}') braceCount--
        blockEnd++
      }

      // Search for the type property within the extracted block content
      const blockContent = afterExport.substring(blockStart, blockEnd)
      const typeMatch = blockContent.match(/type\s*:\s*['"]([^'"]+)['"]/)
      if (typeMatch) {
        console.log(`  ✓ Found type via block parsing: ${typeMatch[1]}`)
        return typeMatch[1]
      }
    }
  }

  // Strategy 3: Fallback to converting CamelCase block name to snake_case
  const fallbackType = blockName
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')

  console.log(`  ⚠️  Using fallback type conversion: ${fallbackType}`)
  return fallbackType
}

/**
 * Extract a string property value from TypeScript object content
 *
 * This function handles multiple string literal formats commonly used in TypeScript:
 * single quotes, double quotes, and template literals. It also processes template
 * literal expressions to provide meaningful static content for documentation.
 *
 * @param {string} content - TypeScript content containing object properties
 * @param {string} propName - Name of the property to extract
 * @returns {string | null} The extracted string value or null if not found
 */
function extractStringProperty(content: string, propName: string): string | null {
  // Strategy 1: Single quoted strings - most common format
  const singleQuoteMatch = content.match(new RegExp(`${propName}\\s*:\\s*'(.*?)'`, 'm'))
  if (singleQuoteMatch) return singleQuoteMatch[1]

  // Strategy 2: Double quoted strings - alternative format
  const doubleQuoteMatch = content.match(new RegExp(`${propName}\\s*:\\s*"(.*?)"`, 'm'))
  if (doubleQuoteMatch) return doubleQuoteMatch[1]

  // Strategy 3: Template literals - handles multiline and dynamic content
  const templateMatch = content.match(new RegExp(`${propName}\\s*:\\s*\`([^\`]+)\``, 's'))
  if (templateMatch) {
    let templateContent = templateMatch[1]

    // Process template literal expressions for documentation-friendly output
    // Replace specific known patterns with static equivalents
    templateContent = templateContent.replace(
      /\$\{[^}]*shouldEnableURLInput[^}]*\?[^:]*:[^}]*\}/g,
      'Upload files directly. '
    )
    templateContent = templateContent.replace(/\$\{[^}]*shouldEnableURLInput[^}]*\}/g, 'false')

    // Remove any remaining template expressions that can't be statically evaluated
    templateContent = templateContent.replace(/\$\{[^}]+\}/g, '')

    // Normalize whitespace for clean documentation output
    templateContent = templateContent.replace(/\s+/g, ' ').trim()

    return templateContent
  }

  return null
}

/**
 * Extract icon component name from block configuration
 *
 * Searches for icon property assignments in the format: icon: IconNameIcon
 *
 * @param {string} content - Block configuration content
 * @returns {string | null} Icon component name or null if not found
 */
function extractIconName(content: string): string | null {
  const iconMatch = content.match(/icon\s*:\s*(\w+Icon)/)
  return iconMatch ? iconMatch[1] : null
}

/**
 * Extract outputs configuration from block definition
 *
 * This function parses the outputs object from a block configuration, handling
 * both simple field definitions and complex nested structures with proper
 * balanced brace counting for accurate extraction.
 *
 * @param {string} content - Block configuration content containing outputs definition
 * @returns {Record<string, any>} Parsed outputs object or empty object if none found
 *
 * @example
 * // Handles both formats:
 * // outputs: { result: 'string', data: { type: 'object', description: '...' } }
 * // outputs: { field: { type: 'array', items: { properties: {...} } } }
 */
function extractOutputs(content: string): Record<string, any> {
  // Locate the outputs property within the block configuration
  const outputsStart = content.search(/outputs\s*:\s*{/)
  if (outputsStart === -1) {
    console.log('  ℹ️  No outputs section found')
    return {}
  }

  // Find the opening brace position
  const openBracePos = content.indexOf('{', outputsStart)
  if (openBracePos === -1) return {}

  // Use balanced brace counting to find the complete outputs section
  let braceCount = 1
  let pos = openBracePos + 1

  while (pos < content.length && braceCount > 0) {
    if (content[pos] === '{') {
      braceCount++
    } else if (content[pos] === '}') {
      braceCount--
    }
    pos++
  }

  if (braceCount === 0) {
    const outputsContent = content.substring(openBracePos + 1, pos - 1).trim()
    const outputs: Record<string, any> = {}

    // First try to handle the new object format: fieldName: { type: 'type', description: 'desc' }
    // Use a more robust approach to extract field definitions
    const fieldRegex = /(\w+)\s*:\s*{/g
    let match
    const fieldPositions: Array<{ name: string; start: number }> = []

    // Find all field starting positions
    while ((match = fieldRegex.exec(outputsContent)) !== null) {
      fieldPositions.push({
        name: match[1],
        start: match.index + match[0].length - 1, // Position of the opening brace
      })
    }

    // Extract each field's content by finding balanced braces
    fieldPositions.forEach((field) => {
      const startPos = field.start
      let braceCount = 1
      let endPos = startPos + 1

      // Find the matching closing brace
      while (endPos < outputsContent.length && braceCount > 0) {
        if (outputsContent[endPos] === '{') {
          braceCount++
        } else if (outputsContent[endPos] === '}') {
          braceCount--
        }
        endPos++
      }

      if (braceCount === 0) {
        // Extract the content between braces
        const fieldContent = outputsContent.substring(startPos + 1, endPos - 1).trim()

        // Extract type and description from the object
        const typeMatch = fieldContent.match(/type\s*:\s*['"](.*?)['"]/)
        const descriptionMatch = fieldContent.match(/description\s*:\s*['"](.*?)['"]/)

        if (typeMatch) {
          outputs[field.name] = {
            type: typeMatch[1],
            description: descriptionMatch
              ? descriptionMatch[1]
              : `${field.name} output from the block`,
          }
        }
      }
    })

    // If we found object fields, return them
    if (Object.keys(outputs).length > 0) {
      return outputs
    }

    // Fallback: try to handle the old flat format: fieldName: 'type'
    const flatFieldMatches = outputsContent.match(/(\w+)\s*:\s*['"](.*?)['"]/g)

    if (flatFieldMatches && flatFieldMatches.length > 0) {
      flatFieldMatches.forEach((fieldMatch) => {
        const fieldParts = fieldMatch.match(/(\w+)\s*:\s*['"](.*?)['"]/)
        if (fieldParts) {
          const fieldName = fieldParts[1]
          const fieldType = fieldParts[2]

          outputs[fieldName] = {
            type: fieldType,
            description: `${fieldName} output from the block`,
          }
        }
      })

      // If we found flat fields, return them
      if (Object.keys(outputs).length > 0) {
        return outputs
      }
    }
  }

  return {}
}

// Helper to extract tools access array
function extractToolsAccess(content: string): string[] {
  const accessMatch = content.match(/access\s*:\s*\[\s*((?:['"][^'"]+['"](?:\s*,\s*)?)+)\s*\]/)
  if (!accessMatch) return []

  const accessContent = accessMatch[1]
  const tools: string[] = []

  const toolMatches = accessContent.match(/['"]([^'"]+)['"]/g)
  if (toolMatches) {
    toolMatches.forEach((toolText) => {
      const match = toolText.match(/['"]([^'"]+)['"]/)
      if (match) {
        tools.push(match[1])
      }
    })
  }

  return tools
}

// Function to extract tool information from file content
function extractToolInfo(
  toolName: string,
  fileContent: string
): {
  description: string
  params: Array<{ name: string; type: string; required: boolean; description: string }>
  outputs: Record<string, any>
} | null {
  try {
    // Extract tool config section - Match params until the next top-level property
    const toolConfigRegex =
      /params\s*:\s*{([\s\S]*?)},?\s*(?:outputs|oauth|request|directExecution|postProcess|transformResponse)/
    const toolConfigMatch = fileContent.match(toolConfigRegex)

    // Extract description
    const descriptionRegex = /description\s*:\s*['"](.*?)['"].*/
    const descriptionMatch = fileContent.match(descriptionRegex)
    const description = descriptionMatch ? descriptionMatch[1] : 'No description available'

    // Parse parameters
    const params: Array<{ name: string; type: string; required: boolean; description: string }> = []

    if (toolConfigMatch) {
      const paramsContent = toolConfigMatch[1]

      // More robust approach to extract parameters with balanced brace matching
      // Extract each parameter block completely
      const paramBlocksRegex = /(\w+)\s*:\s*{/g
      let paramMatch
      const paramPositions: Array<{ name: string; start: number; content: string }> = []

      while ((paramMatch = paramBlocksRegex.exec(paramsContent)) !== null) {
        const paramName = paramMatch[1]
        const startPos = paramMatch.index + paramMatch[0].length - 1 // Position of opening brace

        // Find matching closing brace using balanced counting
        let braceCount = 1
        let endPos = startPos + 1

        while (endPos < paramsContent.length && braceCount > 0) {
          if (paramsContent[endPos] === '{') {
            braceCount++
          } else if (paramsContent[endPos] === '}') {
            braceCount--
          }
          endPos++
        }

        if (braceCount === 0) {
          const paramBlock = paramsContent.substring(startPos + 1, endPos - 1).trim()
          paramPositions.push({ name: paramName, start: startPos, content: paramBlock })
        }
      }

      for (const param of paramPositions) {
        const paramName = param.name
        const paramBlock = param.content

        // Skip the accessToken parameter as it's handled automatically by the OAuth flow
        // Also skip any params parameter which isn't a real input
        if (paramName === 'accessToken' || paramName === 'params' || paramName === 'tools') {
          continue
        }

        // Extract param details with more robust patterns
        const typeMatch = paramBlock.match(/type\s*:\s*['"]([^'"]+)['"]/)
        const requiredMatch = paramBlock.match(/required\s*:\s*(true|false)/)

        // More careful extraction of description with handling for multiline descriptions
        let descriptionMatch = paramBlock.match(/description\s*:\s*'(.*?)'(?=\s*[,}])/s)
        if (!descriptionMatch) {
          descriptionMatch = paramBlock.match(/description\s*:\s*"(.*?)"(?=\s*[,}])/s)
        }
        if (!descriptionMatch) {
          // Try for template literals if the description uses backticks
          descriptionMatch = paramBlock.match(/description\s*:\s*`([^`]+)`/s)
        }
        if (!descriptionMatch) {
          // Handle multi-line descriptions without ending quote on same line
          descriptionMatch = paramBlock.match(
            /description\s*:\s*['"]([^'"]*(?:\n[^'"]*)*?)['"](?=\s*[,}])/s
          )
        }

        params.push({
          name: paramName,
          type: typeMatch ? typeMatch[1] : 'string',
          required: requiredMatch ? requiredMatch[1] === 'true' : false,
          description: descriptionMatch ? descriptionMatch[1] : 'No description',
        })
      }
    }

    // First priority: Extract outputs from the new outputs field in ToolConfig
    let outputs: Record<string, any> = {}
    const outputsFieldRegex =
      /outputs\s*:\s*{([\s\S]*?)}\s*,?\s*(?:oauth|params|request|directExecution|postProcess|transformResponse|$|\})/
    const outputsFieldMatch = fileContent.match(outputsFieldRegex)

    if (outputsFieldMatch) {
      const outputsContent = outputsFieldMatch[1]
      outputs = parseToolOutputsField(outputsContent)
      console.log(`Found tool outputs field for ${toolName}:`, Object.keys(outputs))
    }

    return {
      description,
      params,
      outputs,
    }
  } catch (error) {
    console.error(`Error extracting info for tool ${toolName}:`, error)
    return null
  }
}

// Helper function to recursively format output structure for documentation
function formatOutputStructure(outputs: Record<string, any>, indentLevel = 0): string {
  let result = ''

  for (const [key, output] of Object.entries(outputs)) {
    let type = 'unknown'
    let description = `${key} output from the tool`

    if (typeof output === 'object' && output !== null) {
      if (output.type) {
        type = output.type
      }

      if (output.description) {
        description = output.description
      }
    }

    // Escape special characters in the description
    const escapedDescription = description
      .replace(/\|/g, '\\|')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Create prefix based on nesting level with visual hierarchy
    let prefix = ''
    if (indentLevel === 1) {
      prefix = '↳ '
    } else if (indentLevel >= 2) {
      // For deeper nesting (like array items), use indented arrows
      prefix = '  ↳ '
    }

    // For arrays, expand nested items
    if (typeof output === 'object' && output !== null && output.type === 'array') {
      result += `| ${prefix}\`${key}\` | ${type} | ${escapedDescription} |\n`

      // Handle array items with properties (nested TWO more levels to show it's inside the array)
      if (output.items?.properties) {
        // Create a visual separator to show these are array item properties
        const arrayItemsResult = formatOutputStructure(output.items.properties, indentLevel + 2)
        result += arrayItemsResult
      }
    }
    // For objects, expand properties
    else if (
      typeof output === 'object' &&
      output !== null &&
      output.properties &&
      (output.type === 'object' || output.type === 'json')
    ) {
      result += `| ${prefix}\`${key}\` | ${type} | ${escapedDescription} |\n`

      const nestedResult = formatOutputStructure(output.properties, indentLevel + 1)
      result += nestedResult
    }
    // For simple types, show with prefix if nested
    else {
      result += `| ${prefix}\`${key}\` | ${type} | ${escapedDescription} |\n`
    }
  }

  return result
}

// New function to parse the structured outputs field from ToolConfig
function parseToolOutputsField(outputsContent: string): Record<string, any> {
  const outputs: Record<string, any> = {}

  // Calculate nesting levels for all braces first
  const braces: Array<{ type: 'open' | 'close'; pos: number; level: number }> = []
  for (let i = 0; i < outputsContent.length; i++) {
    if (outputsContent[i] === '{') {
      braces.push({ type: 'open', pos: i, level: 0 })
    } else if (outputsContent[i] === '}') {
      braces.push({ type: 'close', pos: i, level: 0 })
    }
  }

  // Calculate actual nesting levels
  let currentLevel = 0
  for (const brace of braces) {
    if (brace.type === 'open') {
      brace.level = currentLevel
      currentLevel++
    } else {
      currentLevel--
      brace.level = currentLevel
    }
  }

  // Find field definitions and their nesting levels
  const fieldStartRegex = /(\w+)\s*:\s*{/g
  let match
  const fieldPositions: Array<{ name: string; start: number; end: number; level: number }> = []

  while ((match = fieldStartRegex.exec(outputsContent)) !== null) {
    const fieldName = match[1]
    const bracePos = match.index + match[0].length - 1

    // Find the corresponding opening brace to determine nesting level
    const openBrace = braces.find((b) => b.type === 'open' && b.pos === bracePos)
    if (openBrace) {
      // Find the matching closing brace
      let braceCount = 1
      let endPos = bracePos + 1

      while (endPos < outputsContent.length && braceCount > 0) {
        if (outputsContent[endPos] === '{') {
          braceCount++
        } else if (outputsContent[endPos] === '}') {
          braceCount--
        }
        endPos++
      }

      fieldPositions.push({
        name: fieldName,
        start: bracePos,
        end: endPos,
        level: openBrace.level,
      })
    }
  }

  // Only process level 0 fields (top-level outputs)
  const topLevelFields = fieldPositions.filter((f) => f.level === 0)

  topLevelFields.forEach((field) => {
    const fieldContent = outputsContent.substring(field.start + 1, field.end - 1).trim()

    // Parse the field content
    const parsedField = parseFieldContent(fieldContent)
    if (parsedField) {
      outputs[field.name] = parsedField
    }
  })

  return outputs
}

// Helper function to parse individual field content with support for nested structures
function parseFieldContent(fieldContent: string): any {
  // Extract type and description
  const typeMatch = fieldContent.match(/type\s*:\s*['"]([^'"]+)['"]/)
  const descMatch = fieldContent.match(/description\s*:\s*['"`]([^'"`\n]+)['"`]/)

  if (!typeMatch) return null

  const fieldType = typeMatch[1]
  const description = descMatch ? descMatch[1] : ''

  const result: any = {
    type: fieldType,
    description: description,
  }

  // Check for properties (nested objects) - only for object types, not arrays
  if (fieldType === 'object' || fieldType === 'json') {
    const propertiesRegex = /properties\s*:\s*{/
    const propertiesStart = fieldContent.search(propertiesRegex)

    if (propertiesStart !== -1) {
      const braceStart = fieldContent.indexOf('{', propertiesStart)
      let braceCount = 1
      let braceEnd = braceStart + 1

      // Find matching closing brace
      while (braceEnd < fieldContent.length && braceCount > 0) {
        if (fieldContent[braceEnd] === '{') braceCount++
        else if (fieldContent[braceEnd] === '}') braceCount--
        braceEnd++
      }

      if (braceCount === 0) {
        const propertiesContent = fieldContent.substring(braceStart + 1, braceEnd - 1).trim()
        result.properties = parsePropertiesContent(propertiesContent)
      }
    }
  }

  // Check for items (array items) - ensure balanced brace matching
  const itemsRegex = /items\s*:\s*{/
  const itemsStart = fieldContent.search(itemsRegex)

  if (itemsStart !== -1) {
    const braceStart = fieldContent.indexOf('{', itemsStart)
    let braceCount = 1
    let braceEnd = braceStart + 1

    // Find matching closing brace
    while (braceEnd < fieldContent.length && braceCount > 0) {
      if (fieldContent[braceEnd] === '{') braceCount++
      else if (fieldContent[braceEnd] === '}') braceCount--
      braceEnd++
    }

    if (braceCount === 0) {
      const itemsContent = fieldContent.substring(braceStart + 1, braceEnd - 1).trim()
      const itemsType = itemsContent.match(/type\s*:\s*['"]([^'"]+)['"]/)

      // Only look for description before any properties block to avoid picking up nested property descriptions
      const propertiesStart = itemsContent.search(/properties\s*:\s*{/)
      const searchContent =
        propertiesStart >= 0 ? itemsContent.substring(0, propertiesStart) : itemsContent
      const itemsDesc = searchContent.match(/description\s*:\s*['"`]([^'"`\n]+)['"`]/)

      result.items = {
        type: itemsType ? itemsType[1] : 'object',
        description: itemsDesc ? itemsDesc[1] : '',
      }

      // Check if items have properties
      const itemsPropertiesRegex = /properties\s*:\s*{/
      const itemsPropsStart = itemsContent.search(itemsPropertiesRegex)

      if (itemsPropsStart !== -1) {
        const propsBraceStart = itemsContent.indexOf('{', itemsPropsStart)
        let propsBraceCount = 1
        let propsBraceEnd = propsBraceStart + 1

        while (propsBraceEnd < itemsContent.length && propsBraceCount > 0) {
          if (itemsContent[propsBraceEnd] === '{') propsBraceCount++
          else if (itemsContent[propsBraceEnd] === '}') propsBraceCount--
          propsBraceEnd++
        }

        if (propsBraceCount === 0) {
          const itemsPropsContent = itemsContent
            .substring(propsBraceStart + 1, propsBraceEnd - 1)
            .trim()
          result.items.properties = parsePropertiesContent(itemsPropsContent)
        }
      }
    }
  }

  return result
}

// Helper function to parse properties content recursively
function parsePropertiesContent(propertiesContent: string): Record<string, any> {
  const properties: Record<string, any> = {}

  // Find property definitions using balanced brace matching, but exclude type-only definitions
  const propStartRegex = /(\w+)\s*:\s*{/g
  let match
  const propPositions: Array<{ name: string; start: number; content: string }> = []

  while ((match = propStartRegex.exec(propertiesContent)) !== null) {
    const propName = match[1]

    // Skip structural keywords that should never be treated as property names
    if (propName === 'items' || propName === 'properties') {
      continue
    }

    const startPos = match.index + match[0].length - 1 // Position of opening brace

    // Find the matching closing brace
    let braceCount = 1
    let endPos = startPos + 1

    while (endPos < propertiesContent.length && braceCount > 0) {
      if (propertiesContent[endPos] === '{') {
        braceCount++
      } else if (propertiesContent[endPos] === '}') {
        braceCount--
      }
      endPos++
    }

    if (braceCount === 0) {
      const propContent = propertiesContent.substring(startPos + 1, endPos - 1).trim()

      // Skip if this is just a type definition (contains only 'type' field) rather than a real property
      // This happens with array items definitions like: items: { type: 'string' }
      // More precise check: only skip if it ONLY has 'type' and nothing else meaningful
      const hasDescription = /description\s*:\s*/.test(propContent)
      const hasProperties = /properties\s*:\s*{/.test(propContent)
      const hasItems = /items\s*:\s*{/.test(propContent)
      const isTypeOnly =
        !hasDescription &&
        !hasProperties &&
        !hasItems &&
        /^type\s*:\s*['"].*?['"]\s*,?\s*$/.test(propContent)

      if (!isTypeOnly) {
        propPositions.push({
          name: propName,
          start: startPos,
          content: propContent,
        })
      }
    }
  }

  // Process the actual property definitions
  propPositions.forEach((prop) => {
    const parsedProp = parseFieldContent(prop.content)
    if (parsedProp) {
      properties[prop.name] = parsedProp
    }
  })

  return properties
}

// Find and extract information about a tool
async function getToolInfo(toolName: string): Promise<{
  description: string
  params: Array<{ name: string; type: string; required: boolean; description: string }>
  outputs: Record<string, any>
} | null> {
  try {
    // Split the tool name into parts
    const parts = toolName.split('_')

    // Try to find the correct split point by checking if directories exist
    let toolPrefix = ''
    let toolSuffix = ''

    // Start from the longest possible prefix and work backwards
    for (let i = parts.length - 1; i >= 1; i--) {
      const possiblePrefix = parts.slice(0, i).join('_')
      const possibleSuffix = parts.slice(i).join('_')

      // Check if a directory exists for this prefix
      const toolDirPath = path.join(rootDir, `apps/sim/tools/${possiblePrefix}`)

      if (fs.existsSync(toolDirPath) && fs.statSync(toolDirPath).isDirectory()) {
        toolPrefix = possiblePrefix
        toolSuffix = possibleSuffix
        break
      }
    }

    // If no directory was found, fall back to single-part prefix
    if (!toolPrefix) {
      toolPrefix = parts[0]
      toolSuffix = parts.slice(1).join('_')
    }

    // Simplify the file search strategy
    const possibleLocations = []

    // Most common pattern: suffix.ts file in the prefix directory
    possibleLocations.push(path.join(rootDir, `apps/sim/tools/${toolPrefix}/${toolSuffix}.ts`))

    // Try camelCase version of suffix
    const camelCaseSuffix = toolSuffix
      .split('_')
      .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
      .join('')
    possibleLocations.push(path.join(rootDir, `apps/sim/tools/${toolPrefix}/${camelCaseSuffix}.ts`))

    // Also check the index.ts file in the tool directory
    possibleLocations.push(path.join(rootDir, `apps/sim/tools/${toolPrefix}/index.ts`))

    // Try to find the tool definition file
    let toolFileContent = ''

    for (const location of possibleLocations) {
      if (fs.existsSync(location)) {
        toolFileContent = fs.readFileSync(location, 'utf-8')
        break
      }
    }

    if (!toolFileContent) {
      console.warn(`Could not find definition for tool: ${toolName}`)
      return null
    }

    // Extract tool information from the file
    return extractToolInfo(toolName, toolFileContent)
  } catch (error) {
    console.error(`Error getting info for tool ${toolName}:`, error)
    return null
  }
}

// Function to extract content between manual content markers
function extractManualContent(existingContent: string): Record<string, string> {
  const manualSections: Record<string, string> = {}
  // Improved regex to better handle MDX comments
  const manualContentRegex =
    /\{\/\*\s*MANUAL-CONTENT-START:(\w+)\s*\*\/\}([\s\S]*?)\{\/\*\s*MANUAL-CONTENT-END\s*\*\/\}/g

  let match
  while ((match = manualContentRegex.exec(existingContent)) !== null) {
    const sectionName = match[1]
    const content = match[2].trim()
    manualSections[sectionName] = content
    console.log(`Found manual content for section: ${sectionName}`)
  }

  return manualSections
}

// Function to merge generated markdown with manual content
function mergeWithManualContent(
  generatedMarkdown: string,
  existingContent: string | null,
  manualSections: Record<string, string>
): string {
  if (!existingContent || Object.keys(manualSections).length === 0) {
    return generatedMarkdown
  }

  console.log('Merging manual content with generated markdown')

  // Log what we found for debugging
  console.log(`Found ${Object.keys(manualSections).length} manual sections`)
  Object.keys(manualSections).forEach((section) => {
    console.log(`  - ${section}: ${manualSections[section].substring(0, 20)}...`)
  })

  // Replace placeholders in generated markdown with manual content
  let mergedContent = generatedMarkdown

  // Add manual content for each section we found
  Object.entries(manualSections).forEach(([sectionName, content]) => {
    // Define insertion points for different section types with improved patterns
    const insertionPoints: Record<string, { regex: RegExp }> = {
      intro: {
        regex: /<BlockInfoCard[\s\S]*?<\/svg>`}\s*\/>/,
      },
      usage: {
        regex: /## Usage Instructions/,
      },
      outputs: {
        regex: /## Outputs/,
      },
      notes: {
        regex: /## Notes/,
      },
    }

    // Find the appropriate insertion point
    const insertionPoint = insertionPoints[sectionName]

    if (insertionPoint) {
      // Use regex to find the insertion point
      const match = mergedContent.match(insertionPoint.regex)

      if (match && match.index !== undefined) {
        // Insert after the matched content
        const insertPosition = match.index + match[0].length
        console.log(`Inserting ${sectionName} content after position ${insertPosition}`)
        mergedContent = `${mergedContent.slice(0, insertPosition)}\n\n{/* MANUAL-CONTENT-START:${sectionName} */}\n${content}\n{/* MANUAL-CONTENT-END */}\n${mergedContent.slice(insertPosition)}`
      } else {
        console.log(
          `Could not find insertion point for ${sectionName}, regex pattern: ${insertionPoint.regex}`
        )
      }
    } else {
      console.log(`No insertion point defined for section ${sectionName}`)
    }
  })

  return mergedContent
}

// Function to generate documentation for a block
async function generateBlockDoc(blockPath: string, icons: Record<string, string>) {
  try {
    // Extract the block name from the file path
    const blockFileName = path.basename(blockPath, '.ts')
    if (blockFileName.endsWith('.test')) {
      return // Skip test files
    }

    // Read the file content
    const fileContent = fs.readFileSync(blockPath, 'utf-8')

    // Extract block configuration from the file content
    const blockConfig = extractBlockConfig(fileContent)

    if (!blockConfig || !blockConfig.type) {
      console.warn(`Skipping ${blockFileName} - not a valid block config`)
      return
    }

    // Skip blocks with category 'blocks' (except memory type), and skip specific blocks
    if (
      (blockConfig.category === 'blocks' &&
        blockConfig.type !== 'memory' &&
        blockConfig.type !== 'knowledge') ||
      blockConfig.type === 'evaluator' ||
      blockConfig.type === 'number'
    ) {
      return
    }

    // Output file path
    const outputFilePath = path.join(DOCS_OUTPUT_PATH, `${blockConfig.type}.mdx`)

    // IMPORTANT: Check if file already exists and read its content FIRST
    let existingContent: string | null = null
    if (fs.existsSync(outputFilePath)) {
      existingContent = fs.readFileSync(outputFilePath, 'utf-8')
      console.log(`Existing file found for ${blockConfig.type}.mdx, checking for manual content...`)
    }

    // Extract manual content from existing file before generating new content
    const manualSections = existingContent ? extractManualContent(existingContent) : {}

    // Create the markdown content - now async
    const markdown = await generateMarkdownForBlock(blockConfig, icons)

    // Merge with manual content if we found any
    let finalContent = markdown
    if (Object.keys(manualSections).length > 0) {
      console.log(`Found manual content in ${blockConfig.type}.mdx, merging...`)
      finalContent = mergeWithManualContent(markdown, existingContent, manualSections)
    } else {
      console.log(`No manual content found in ${blockConfig.type}.mdx`)
    }

    // Write the markdown file
    fs.writeFileSync(outputFilePath, finalContent)
    console.log(`Generated documentation for ${blockConfig.type}`)
  } catch (error) {
    console.error(`Error processing ${blockPath}:`, error)
  }
}

// Update generateMarkdownForBlock to remove placeholders
async function generateMarkdownForBlock(
  blockConfig: BlockConfig,
  icons: Record<string, string>
): Promise<string> {
  const {
    type,
    name,
    description,
    longDescription,
    category,
    bgColor,
    iconName,
    outputs = {},
    tools = { access: [] },
  } = blockConfig

  // Get SVG icon if available
  const iconSvg = iconName && icons[iconName] ? icons[iconName] : null

  // Generate the outputs section
  let outputsSection = ''

  if (outputs && Object.keys(outputs).length > 0) {
    outputsSection = '## Outputs\n\n'

    // Create the base outputs table
    outputsSection += '| Output | Type | Description |\n'
    outputsSection += '| ------ | ---- | ----------- |\n'

    // Process each output field
    for (const outputKey in outputs) {
      const output = outputs[outputKey]

      // Escape special characters in the description that could break markdown tables
      const escapedDescription = output.description
        ? output.description
            .replace(/\|/g, '\\|') // Escape pipe characters
            .replace(/\{/g, '\\{') // Escape curly braces
            .replace(/\}/g, '\\}') // Escape curly braces
            .replace(/\(/g, '\\(') // Escape opening parentheses
            .replace(/\)/g, '\\)') // Escape closing parentheses
            .replace(/\[/g, '\\[') // Escape opening brackets
            .replace(/\]/g, '\\]') // Escape closing brackets
            .replace(/</g, '&lt;') // Convert less than to HTML entity
            .replace(/>/g, '&gt;') // Convert greater than to HTML entity
        : `Output from ${outputKey}`

      if (typeof output.type === 'string') {
        // Simple output with explicit type
        outputsSection += `| \`${outputKey}\` | ${output.type} | ${escapedDescription} |\n`
      } else if (output.type && typeof output.type === 'object') {
        // For cases where output.type is an object containing field types
        outputsSection += `| \`${outputKey}\` | object | ${escapedDescription} |\n`

        // Add properties directly to the main table with indentation
        for (const propName in output.type) {
          const propType = output.type[propName]
          // Get description from comments if available
          const commentMatch =
            propName && output.type[propName]._comment
              ? output.type[propName]._comment
              : `${propName} of the ${outputKey}`

          outputsSection += `| ↳ \`${propName}\` | ${propType} | ${commentMatch} |\n`
        }
      } else if (output.properties) {
        // Complex output with properties
        outputsSection += `| \`${outputKey}\` | object | ${escapedDescription} |\n`

        // Add properties directly to the main table with indentation
        for (const propName in output.properties) {
          const prop = output.properties[propName]
          // Escape special characters in the description
          const escapedPropertyDescription = prop.description
            ? prop.description
                .replace(/\|/g, '\\|') // Escape pipe characters
                .replace(/\{/g, '\\{') // Escape curly braces
                .replace(/\}/g, '\\}') // Escape curly braces
                .replace(/\(/g, '\\(') // Escape opening parentheses
                .replace(/\)/g, '\\)') // Escape closing parentheses
                .replace(/\[/g, '\\[') // Escape opening brackets
                .replace(/\]/g, '\\]') // Escape closing brackets
                .replace(/</g, '&lt;') // Convert less than to HTML entity
                .replace(/>/g, '&gt;') // Convert greater than to HTML entity
            : `The ${propName} of the ${outputKey}`

          outputsSection += `| ↳ \`${propName}\` | ${prop.type} | ${escapedPropertyDescription} |\n`
        }
      }
    }
  } else {
    outputsSection = 'This block does not produce any outputs.'
  }

  // Create tools section with more details
  let toolsSection = ''
  if (tools.access?.length) {
    toolsSection = '## Tools\n\n'

    // For each tool, try to find its definition and extract parameter information
    for (const tool of tools.access) {
      toolsSection += `### \`${tool}\`\n\n`

      // Get dynamic tool information
      const toolInfo = await getToolInfo(tool)

      if (toolInfo) {
        if (toolInfo.description && toolInfo.description !== 'No description available') {
          toolsSection += `${toolInfo.description}\n\n`
        }

        // Add Input Parameters section for the tool
        toolsSection += '#### Input\n\n'
        toolsSection += '| Parameter | Type | Required | Description |\n'
        toolsSection += '| --------- | ---- | -------- | ----------- |\n'

        if (toolInfo.params.length > 0) {
          // Use dynamically extracted parameters
          for (const param of toolInfo.params) {
            // Escape special characters in the description that could break markdown tables
            const escapedDescription = param.description
              ? param.description
                  .replace(/\|/g, '\\|') // Escape pipe characters
                  .replace(/\{/g, '\\{') // Escape curly braces
                  .replace(/\}/g, '\\}') // Escape curly braces
                  .replace(/\(/g, '\\(') // Escape opening parentheses
                  .replace(/\)/g, '\\)') // Escape closing parentheses
                  .replace(/\[/g, '\\[') // Escape opening brackets
                  .replace(/\]/g, '\\]') // Escape closing brackets
                  .replace(/</g, '&lt;') // Convert less than to HTML entity
                  .replace(/>/g, '&gt;') // Convert greater than to HTML entity
              : 'No description'

            toolsSection += `| \`${param.name}\` | ${param.type} | ${param.required ? 'Yes' : 'No'} | ${escapedDescription} |\n`
          }
        }

        // Add Output Parameters section for the tool
        toolsSection += '\n#### Output\n\n'

        // Always prefer tool-specific outputs over block outputs for accuracy
        if (Object.keys(toolInfo.outputs).length > 0) {
          // Use tool-specific outputs (most accurate)
          toolsSection += '| Parameter | Type | Description |\n'
          toolsSection += '| --------- | ---- | ----------- |\n'

          // Use the enhanced formatOutputStructure function to handle nested structures
          toolsSection += formatOutputStructure(toolInfo.outputs)
        } else if (Object.keys(outputs).length > 0) {
          // Fallback to block outputs only if no tool outputs are available
          toolsSection += '| Parameter | Type | Description |\n'
          toolsSection += '| --------- | ---- | ----------- |\n'

          for (const [key, output] of Object.entries(outputs)) {
            let type = 'string'
            let description = `${key} output from the tool`

            if (typeof output === 'string') {
              type = output
            } else if (typeof output === 'object' && output !== null) {
              if ('type' in output && typeof output.type === 'string') {
                type = output.type
              }
              if ('description' in output && typeof output.description === 'string') {
                description = output.description
              }
            }

            // Escape special characters in the description
            const escapedDescription = description
              .replace(/\|/g, '\\|')
              .replace(/\{/g, '\\{')
              .replace(/\}/g, '\\}')
              .replace(/\(/g, '\\(')
              .replace(/\)/g, '\\)')
              .replace(/\[/g, '\\[')
              .replace(/\]/g, '\\]')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')

            toolsSection += `| \`${key}\` | ${type} | ${escapedDescription} |\n`
          }
        } else {
          toolsSection += 'This tool does not produce any outputs.\n'
        }
      }

      toolsSection += '\n'
    }
  }

  // Add usage instructions if available in block config
  let usageInstructions = ''
  if (longDescription) {
    usageInstructions = `## Usage Instructions\n\n${longDescription}\n\n`
  }

  // Generate the markdown content without any placeholders
  return `---
title: ${name}
description: ${description}
---

import { BlockInfoCard } from "@/components/ui/block-info-card"

<BlockInfoCard 
  type="${type}"
  color="${bgColor || '#F5F5F5'}"
  icon={${iconSvg ? 'true' : 'false'}}
  iconSvg={\`${iconSvg || ''}\`}
/>

${usageInstructions}

${toolsSection}

## Notes

- Category: \`${category}\`
- Type: \`${type}\`
`
}

/**
 * Main orchestrator function for generating all block documentation
 *
 * This function coordinates the entire documentation generation process:
 * 1. Extracts icons from the icon component file
 * 2. Discovers all block definition files
 * 3. Generates documentation for each valid block
 * 4. Updates the navigation metadata
 *
 * @returns {Promise<boolean>} Success status of the documentation generation process
 */
async function generateAllBlockDocs(): Promise<boolean> {
  try {
    console.log('📚 Starting comprehensive block documentation generation...')

    // Step 1: Extract icon components for use in documentation
    console.log('🎨 Extracting icon definitions...')
    const icons = extractIcons()

    // Step 2: Discover all TypeScript block definition files
    console.log('🔍 Discovering block definition files...')
    const blockFiles = await glob(`${BLOCKS_PATH}/*.ts`)
    console.log(`📁 Found ${blockFiles.length} potential block files`)

    // Step 3: Process each block file and generate documentation
    console.log('🏗️  Processing blocks and generating documentation...')
    for (const blockFile of blockFiles) {
      await generateBlockDoc(blockFile, icons)
    }

    // Step 4: Update navigation metadata for the documentation site
    console.log('📋 Updating documentation navigation metadata...')
    updateMetaJson()

    console.log('✅ Documentation generation completed successfully!')
    return true
  } catch (error) {
    console.error('❌ Critical error during documentation generation:', error)
    return false
  }
}

/**
 * Update the meta.json navigation file for the documentation site
 *
 * This function creates or updates the meta.json file used by Next.js for
 * documentation navigation. It ensures proper ordering with index pages
 * first, followed by alphabetically sorted block documentation.
 *
 * The meta.json file structure is required by the documentation framework
 * to automatically generate navigation menus and breadcrumbs.
 */
function updateMetaJson(): void {
  const metaJsonPath = path.join(DOCS_OUTPUT_PATH, 'meta.json')

  // Discover all generated MDX documentation files
  const blockFiles = fs
    .readdirSync(DOCS_OUTPUT_PATH)
    .filter((file: string) => file.endsWith('.mdx'))
    .map((file: string) => path.basename(file, '.mdx'))

  // Create navigation structure with proper ordering
  // Priority: index page first, then alphabetically sorted block docs
  const items = [
    ...(blockFiles.includes('index') ? ['index'] : []),
    ...blockFiles.filter((file: string) => file !== 'index').sort(),
  ]

  const metaJson = {
    items,
  }

  // Write the updated meta.json file for documentation navigation
  fs.writeFileSync(metaJsonPath, JSON.stringify(metaJson, null, 2))
  console.log(`📋 Updated meta.json with ${items.length} documentation pages`)
}

/**
 * Script execution and error handling
 *
 * This section handles the main script execution with proper error handling
 * and exit codes for CI/CD integration. The script will exit with code 0 on
 * success and code 1 on failure, making it suitable for automated builds.
 */
console.log('🚀 Initializing Sim Block Documentation Generator...')

generateAllBlockDocs()
  .then((success) => {
    if (success) {
      console.log('🎉 Documentation generation completed successfully!')
      console.log('📖 Generated documentation files are ready for deployment')
      process.exit(0)
    } else {
      console.error('💥 Documentation generation failed - check logs for details')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('💀 Fatal error during documentation generation:', error)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  })
