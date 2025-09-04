/**
 * Help Content Index - Central registry for help content organization
 *
 * Provides structured organization and management of help content:
 * - Content categorization and taxonomy
 * - Version control and content lifecycle management
 * - Multi-language support and localization
 * - Content dependency tracking
 * - Dynamic content loading and routing
 * - Search indexing and metadata management
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

import type { HelpContentDocument } from '@/lib/help/help-content-manager'

// ========================
// CONTENT CATEGORIES
// ========================

export const HELP_CATEGORIES = {
  GETTING_STARTED: 'getting-started',
  WORKFLOW_BASICS: 'workflow-basics',
  BLOCKS: 'blocks',
  AUTOMATION: 'automation',
  INTEGRATIONS: 'integrations',
  DEBUGGING: 'debugging',
  BEST_PRACTICES: 'best-practices',
  TROUBLESHOOTING: 'troubleshooting',
  API_REFERENCE: 'api-reference',
  ADVANCED: 'advanced',
} as const

export const HELP_TAGS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  QUICK_START: 'quick-start',
  TUTORIAL: 'tutorial',
  REFERENCE: 'reference',
  EXAMPLES: 'examples',
  TIPS: 'tips',
  TROUBLESHOOTING: 'troubleshooting',
  VIDEO: 'video',
  INTERACTIVE: 'interactive',
} as const

// ========================
// CONTENT STRUCTURE
// ========================

export interface HelpContentIndex {
  id: string
  path: string
  category: keyof typeof HELP_CATEGORIES
  priority: number
  dependencies?: string[]
  languages?: string[]
  lastReviewed?: string
}

export const HELP_CONTENT_INDEX: HelpContentIndex[] = [
  // Getting Started
  {
    id: 'welcome',
    path: '/getting-started/welcome',
    category: 'GETTING_STARTED',
    priority: 100,
    languages: ['en'],
  },
  {
    id: 'quick-start-guide',
    path: '/getting-started/quick-start',
    category: 'GETTING_STARTED',
    priority: 90,
    languages: ['en'],
  },
  {
    id: 'interface-overview',
    path: '/getting-started/interface-overview',
    category: 'GETTING_STARTED',
    priority: 80,
    dependencies: ['welcome'],
    languages: ['en'],
  },

  // Workflow Basics
  {
    id: 'creating-workflows',
    path: '/workflow-basics/creating-workflows',
    category: 'WORKFLOW_BASICS',
    priority: 90,
    dependencies: ['interface-overview'],
    languages: ['en'],
  },
  {
    id: 'connecting-blocks',
    path: '/workflow-basics/connecting-blocks',
    category: 'WORKFLOW_BASICS',
    priority: 85,
    dependencies: ['creating-workflows'],
    languages: ['en'],
  },
  {
    id: 'running-workflows',
    path: '/workflow-basics/running-workflows',
    category: 'WORKFLOW_BASICS',
    priority: 80,
    dependencies: ['connecting-blocks'],
    languages: ['en'],
  },
  {
    id: 'workflow-variables',
    path: '/workflow-basics/variables',
    category: 'WORKFLOW_BASICS',
    priority: 75,
    dependencies: ['running-workflows'],
    languages: ['en'],
  },

  // Blocks
  {
    id: 'block-overview',
    path: '/blocks/overview',
    category: 'BLOCKS',
    priority: 90,
    languages: ['en'],
  },
  {
    id: 'starter-block',
    path: '/blocks/starter-block',
    category: 'BLOCKS',
    priority: 85,
    dependencies: ['block-overview'],
    languages: ['en'],
  },
  {
    id: 'api-blocks',
    path: '/blocks/api-blocks',
    category: 'BLOCKS',
    priority: 80,
    dependencies: ['block-overview'],
    languages: ['en'],
  },
  {
    id: 'condition-blocks',
    path: '/blocks/condition-blocks',
    category: 'BLOCKS',
    priority: 75,
    dependencies: ['block-overview'],
    languages: ['en'],
  },
  {
    id: 'data-transformation',
    path: '/blocks/data-transformation',
    category: 'BLOCKS',
    priority: 70,
    dependencies: ['block-overview'],
    languages: ['en'],
  },

  // Integrations
  {
    id: 'integration-overview',
    path: '/integrations/overview',
    category: 'INTEGRATIONS',
    priority: 90,
    languages: ['en'],
  },
  {
    id: 'oauth-authentication',
    path: '/integrations/oauth-authentication',
    category: 'INTEGRATIONS',
    priority: 80,
    dependencies: ['integration-overview'],
    languages: ['en'],
  },
  {
    id: 'api-keys-management',
    path: '/integrations/api-keys',
    category: 'INTEGRATIONS',
    priority: 75,
    dependencies: ['integration-overview'],
    languages: ['en'],
  },

  // Best Practices
  {
    id: 'workflow-design-patterns',
    path: '/best-practices/design-patterns',
    category: 'BEST_PRACTICES',
    priority: 80,
    languages: ['en'],
  },
  {
    id: 'error-handling-strategies',
    path: '/best-practices/error-handling',
    category: 'BEST_PRACTICES',
    priority: 75,
    languages: ['en'],
  },
  {
    id: 'performance-optimization',
    path: '/best-practices/performance',
    category: 'BEST_PRACTICES',
    priority: 70,
    languages: ['en'],
  },

  // Debugging & Troubleshooting
  {
    id: 'debugging-workflows',
    path: '/debugging/debugging-workflows',
    category: 'DEBUGGING',
    priority: 90,
    languages: ['en'],
  },
  {
    id: 'common-errors',
    path: '/troubleshooting/common-errors',
    category: 'TROUBLESHOOTING',
    priority: 85,
    languages: ['en'],
  },
  {
    id: 'performance-issues',
    path: '/troubleshooting/performance-issues',
    category: 'TROUBLESHOOTING',
    priority: 75,
    languages: ['en'],
  },
]

// ========================
// CONTENT TEMPLATES
// ========================

export const CONTENT_TEMPLATES = {
  GETTING_STARTED: {
    userLevels: ['beginner'],
    tags: [HELP_TAGS.BEGINNER, HELP_TAGS.TUTORIAL],
    metadata: {
      category: 'getting-started',
      priority: 'high',
      supportedLanguages: ['en'],
    },
  },
  BLOCK_REFERENCE: {
    userLevels: ['beginner', 'intermediate', 'advanced'],
    tags: [HELP_TAGS.REFERENCE, HELP_TAGS.EXAMPLES],
    metadata: {
      category: 'blocks',
      priority: 'medium',
      supportedLanguages: ['en'],
    },
  },
  BEST_PRACTICE: {
    userLevels: ['intermediate', 'advanced'],
    tags: [HELP_TAGS.TIPS, HELP_TAGS.ADVANCED],
    metadata: {
      category: 'best-practices',
      priority: 'medium',
      supportedLanguages: ['en'],
    },
  },
  TROUBLESHOOTING: {
    userLevels: ['beginner', 'intermediate', 'advanced'],
    tags: [HELP_TAGS.TROUBLESHOOTING, HELP_TAGS.TIPS],
    metadata: {
      category: 'troubleshooting',
      priority: 'high',
      supportedLanguages: ['en'],
    },
  },
} as const

// ========================
// DYNAMIC CONTENT LOADING
// ========================

export interface ContentLoader {
  loadContent: (contentId: string, language?: string) => Promise<HelpContentDocument | null>
  loadCategory: (category: string, language?: string) => Promise<HelpContentDocument[]>
  searchContent: (query: string, filters?: any) => Promise<HelpContentDocument[]>
}

export class HelpContentLoader implements ContentLoader {
  private contentCache = new Map<string, HelpContentDocument>()
  private cacheExpiry = new Map<string, number>()
  private readonly CACHE_TTL = 10 * 60 * 1000 // 10 minutes

  async loadContent(contentId: string, language = 'en'): Promise<HelpContentDocument | null> {
    const cacheKey = `${contentId}-${language}`
    
    // Check cache first
    if (this.isValidCache(cacheKey)) {
      return this.contentCache.get(cacheKey) || null
    }

    try {
      const contentIndex = HELP_CONTENT_INDEX.find(item => item.id === contentId)
      if (!contentIndex) {
        throw new Error(`Content not found: ${contentId}`)
      }

      // In a real implementation, this would load from database or file system
      const content = await this.fetchContentFromSource(contentIndex, language)
      
      if (content) {
        this.contentCache.set(cacheKey, content)
        this.setCacheExpiry(cacheKey)
      }

      return content
    } catch (error) {
      console.error(`Failed to load content: ${contentId}`, error)
      return null
    }
  }

  async loadCategory(category: string, language = 'en'): Promise<HelpContentDocument[]> {
    const categoryItems = HELP_CONTENT_INDEX
      .filter(item => HELP_CATEGORIES[item.category] === category)
      .sort((a, b) => b.priority - a.priority)

    const contentPromises = categoryItems.map(item => 
      this.loadContent(item.id, language)
    )

    const results = await Promise.all(contentPromises)
    return results.filter((content): content is HelpContentDocument => content !== null)
  }

  async searchContent(query: string, filters: any = {}): Promise<HelpContentDocument[]> {
    // This would implement actual search logic
    const allContent = await Promise.all(
      HELP_CONTENT_INDEX.map(item => this.loadContent(item.id))
    )

    return allContent
      .filter((content): content is HelpContentDocument => content !== null)
      .filter(content => {
        const searchText = `${content.title} ${content.content}`.toLowerCase()
        return searchText.includes(query.toLowerCase())
      })
      .slice(0, 20) // Limit results
  }

  private isValidCache(key: string): boolean {
    const expiry = this.cacheExpiry.get(key)
    return expiry ? Date.now() < expiry : false
  }

  private setCacheExpiry(key: string): void {
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL)
  }

  private async fetchContentFromSource(
    contentIndex: HelpContentIndex, 
    language: string
  ): Promise<HelpContentDocument> {
    // Mock implementation - in reality would load from database/files
    const mockContent: HelpContentDocument = {
      id: `${contentIndex.id}-${Date.now()}`,
      contentId: contentIndex.id,
      version: 1,
      title: this.generateTitle(contentIndex.id),
      content: await this.generateContent(contentIndex.id),
      contentType: 'markdown',
      targetComponents: [],
      userLevels: ['beginner', 'intermediate'],
      tags: [HELP_TAGS.TUTORIAL],
      metadata: {
        description: `Help content for ${contentIndex.id}`,
        category: HELP_CATEGORIES[contentIndex.category],
        priority: 'medium',
        estimatedReadingTime: 300, // 5 minutes
        prerequisites: contentIndex.dependencies,
        relatedContent: [],
        supportedLanguages: [language],
        accessibilityFeatures: ['screen-reader-friendly', 'keyboard-navigation'],
      },
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
    }

    return mockContent
  }

  private generateTitle(contentId: string): string {
    const titleMap: Record<string, string> = {
      'welcome': 'Welcome to Sim',
      'quick-start-guide': 'Quick Start Guide',
      'interface-overview': 'Interface Overview',
      'creating-workflows': 'Creating Your First Workflow',
      'connecting-blocks': 'Connecting Workflow Blocks',
      'running-workflows': 'Running and Testing Workflows',
      'workflow-variables': 'Using Variables in Workflows',
      'block-overview': 'Understanding Workflow Blocks',
      'starter-block': 'Using the Starter Block',
      'api-blocks': 'Working with API Blocks',
      'condition-blocks': 'Conditional Logic and Branching',
      'data-transformation': 'Transforming and Processing Data',
      'integration-overview': 'Third-party Integrations',
      'oauth-authentication': 'OAuth Authentication Setup',
      'api-keys-management': 'Managing API Keys',
      'workflow-design-patterns': 'Workflow Design Patterns',
      'error-handling-strategies': 'Error Handling Best Practices',
      'performance-optimization': 'Optimizing Workflow Performance',
      'debugging-workflows': 'Debugging Workflow Issues',
      'common-errors': 'Common Errors and Solutions',
      'performance-issues': 'Troubleshooting Performance Problems',
    }

    return titleMap[contentId] || contentId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  private async generateContent(contentId: string): Promise<string> {
    // Mock markdown content - in reality would load from files or database
    const contentMap: Record<string, string> = {
      'welcome': `
# Welcome to Sim

Welcome to Sim, the powerful workflow automation platform that helps you create, manage, and execute complex workflows with ease.

## What is Sim?

Sim is a visual workflow builder that allows you to:
- Create automated workflows using drag-and-drop blocks
- Connect to hundreds of third-party services and APIs
- Process and transform data between different systems
- Schedule and monitor workflow executions
- Collaborate with your team on workflow development

## Getting Started

To get started with Sim:
1. Explore the interface and familiarize yourself with the main components
2. Create your first workflow using our guided tutorial
3. Connect your favorite services and start automating!

Ready to begin? Let's create your first workflow!
      `,
      'quick-start-guide': `
# Quick Start Guide

Get up and running with Sim in just a few minutes!

## Step 1: Create a New Workflow

1. Click the "New Workflow" button in the top navigation
2. Choose a template or start from scratch
3. Give your workflow a descriptive name

## Step 2: Add Your First Block

1. Drag a "Starter" block from the block library onto the canvas
2. Configure the trigger conditions
3. This block will determine when your workflow runs

## Step 3: Add Processing Blocks

1. Add blocks to process your data
2. Connect blocks by dragging from output handles to input handles
3. Configure each block's settings as needed

## Step 4: Test Your Workflow

1. Click the "Run" button to test your workflow
2. Check the console for execution results
3. Debug any issues using the step-by-step debugger

Congratulations! You've created your first workflow.
      `,
      'creating-workflows': `
# Creating Your First Workflow

Learn how to create effective workflows from scratch.

## Understanding Workflow Basics

A workflow is a series of connected blocks that process data from one step to the next. Each block performs a specific function, such as:
- Triggering the workflow
- Fetching data from APIs
- Processing and transforming data
- Sending notifications or updates

## Workflow Creation Process

### 1. Planning Your Workflow

Before you start building, consider:
- What do you want to accomplish?
- What data sources do you need?
- What outputs do you expect?
- How often should it run?

### 2. Choosing the Right Blocks

- **Trigger blocks**: Start your workflow (Starter, Schedule, Webhook)
- **Data blocks**: Fetch and process information (API, Database, File)
- **Logic blocks**: Make decisions (Condition, Switch, Loop)
- **Action blocks**: Perform operations (Email, Notification, Update)

### 3. Building the Flow

1. Start with a trigger block
2. Add processing blocks in logical order
3. Connect blocks with clear data flow
4. Include error handling where needed
5. Add final action blocks

## Best Practices

- Keep workflows simple and focused
- Use descriptive names for blocks and variables
- Test frequently during development
- Document complex logic with comments
      `,
    }

    return contentMap[contentId] || `# ${this.generateTitle(contentId)}\n\nContent for ${contentId} coming soon...`
  }
}

// ========================
// SINGLETON INSTANCE
// ========================

export const helpContentLoader = new HelpContentLoader()

// ========================
// UTILITY FUNCTIONS
// ========================

export function getContentByCategory(category: keyof typeof HELP_CATEGORIES): HelpContentIndex[] {
  return HELP_CONTENT_INDEX.filter(item => item.category === category)
}

export function getContentByPriority(minPriority = 70): HelpContentIndex[] {
  return HELP_CONTENT_INDEX.filter(item => item.priority >= minPriority)
}

export function getContentDependencies(contentId: string): HelpContentIndex[] {
  const content = HELP_CONTENT_INDEX.find(item => item.id === contentId)
  if (!content?.dependencies) return []

  return HELP_CONTENT_INDEX.filter(item => 
    content.dependencies!.includes(item.id)
  )
}

export function validateContentStructure(): boolean {
  // Validate that all dependencies exist
  for (const content of HELP_CONTENT_INDEX) {
    if (content.dependencies) {
      for (const depId of content.dependencies) {
        const depExists = HELP_CONTENT_INDEX.some(item => item.id === depId)
        if (!depExists) {
          console.error(`Missing dependency: ${depId} for content: ${content.id}`)
          return false
        }
      }
    }
  }

  return true
}

// ========================
// EXPORTS
// ========================

export default helpContentLoader
export type { HelpContentIndex, ContentLoader }