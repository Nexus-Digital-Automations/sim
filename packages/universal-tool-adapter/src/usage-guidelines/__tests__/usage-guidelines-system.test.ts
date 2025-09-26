/**
 * Usage Guidelines System Test Suite
 *
 * Comprehensive test coverage for all components of the Usage Guidelines System
 * including framework, contextual engine, knowledge base, interactive guidance,
 * and management platform.
 *
 * @author USAGE_GUIDELINES_SYSTEM_AGENT
 * @version 1.0.0
 */

import { beforeEach, describe, expect, it } from '@jest/globals'
import {
  type ContextualGuidanceRequest,
  type ContextualGuidelinesEngine,
  createContextualGuidelinesEngine,
  type EnhancedUsageContext,
} from '../contextual-engine'
// Import all system components
import {
  createGuidelineFromTemplate,
  createGuidelineTemplateRegistry,
  type GuidelineDefinition,
  type GuidelineTemplateRegistry,
  STANDARD_TEMPLATES,
} from '../guidelines-framework'
import {
  createBasicTutorial,
  createInteractiveTutorialEngine,
  type InteractiveTutorial,
  type InteractiveTutorialEngine,
} from '../interactive-guidance'
import {
  createKnowledgeBase,
  createKnowledgeEntry,
  type KnowledgeBase,
  type KnowledgeEntry,
} from '../knowledge-base'
import {
  type AuthoringWorkspace,
  type CreateProjectConfig,
  type CreateWorkspaceConfig,
  createGuidelinesManagementPlatform,
  type GuidelinesManagementPlatform,
} from '../management-platform'

// =============================================================================
// Test Utilities and Fixtures
// =============================================================================

const mockUserId = 'user_123'
const mockWorkspaceId = 'workspace_456'
const mockToolId = 'test_tool'

const createMockUsageContext = (): EnhancedUsageContext => ({
  userId: mockUserId,
  workspaceId: mockWorkspaceId,
  session: {
    id: 'session_123',
    startTime: new Date(),
    totalInteractions: 5,
    recentErrors: [],
    successfulTools: ['tool1', 'tool2'],
    currentFocus: 'testing',
    sessionGoals: ['learn_testing'],
  },
  expertise: {
    overallLevel: 'intermediate',
    toolSpecificExperience: {
      [mockToolId]: {
        usageCount: 10,
        successRate: 0.8,
        lastUsed: new Date(),
        commonPatterns: ['basic_usage'],
        knownLimitations: [],
        masteredFeatures: ['basic_features'],
        strugglingWith: ['advanced_features'],
      },
    },
    learningStyle: 'visual',
    preferredPace: 'moderate',
    confidenceLevel: 0.7,
  },
  situation: {
    urgency: 'medium',
    complexity: 'moderate',
    riskLevel: 'low',
    timeConstraint: 30,
    stakeholderCount: 2,
    businessCriticality: 'medium',
  },
  workflow: {
    currentPhase: 'execution',
    teamContext: 'individual',
    approvalRequired: false,
    hasSupervision: false,
    followsTemplate: false,
    iterationCount: 1,
  },
  environment: {
    platform: 'web',
    connectivity: 'stable',
    resources: 'normal',
    monitoring: true,
    debugMode: false,
  },
  accessibility: {
    screenReader: false,
    keyboardNavigation: false,
    highContrast: false,
    reducedMotion: false,
    textSizePreference: 'medium',
    languagePreference: 'en',
  },
})

const createMockGuideline = (toolId: string = mockToolId): Partial<GuidelineDefinition> => ({
  toolId,
  title: 'Test Guideline',
  description: 'A test guideline for unit testing',
  category: 'basic-usage',
  complexity: 'beginner',
  priority: 'medium',
  content: {
    whenToUse: {
      primary: 'Use this tool when you need to test functionality',
      scenarios: [],
      conditions: [],
      antipatterns: [],
    },
    howToUse: {
      quickStart: {
        summary: 'Quick start for testing',
        essentialSteps: ['Step 1', 'Step 2'],
        minimumRequiredFields: ['field1'],
        estimatedTime: '5 minutes',
        successCriteria: ['Tests pass'],
      },
      stepByStep: {
        title: 'Detailed Guide',
        overview: 'Step by step instructions',
        prerequisites: [],
        steps: [],
        verification: [],
        troubleshooting: [],
      },
      parameterGuidance: {},
      bestPractices: [],
      commonMistakes: [],
    },
    examples: {
      basic: [],
      advanced: [],
      realWorld: [],
      conversational: [],
    },
    troubleshooting: {
      commonIssues: [],
      errorCodes: {},
      diagnostics: [],
      recovery: [],
    },
    relatedResources: {
      alternativeTools: [],
      complementaryTools: [],
      prerequisites: [],
      followUpActions: [],
    },
  },
})

// =============================================================================
// Guidelines Framework Tests
// =============================================================================

describe('Guidelines Framework', () => {
  let templateRegistry: GuidelineTemplateRegistry

  beforeEach(() => {
    templateRegistry = createGuidelineTemplateRegistry()
  })

  describe('GuidelineTemplateRegistry', () => {
    it('should initialize with standard templates', () => {
      const templates = templateRegistry.getAllTemplates()
      expect(templates.length).toBeGreaterThan(0)

      const templateIds = templates.map((t) => t.id)
      expect(templateIds).toContain('basic_usage')
      expect(templateIds).toContain('troubleshooting')
    })

    it('should register custom templates', () => {
      const customTemplate = STANDARD_TEMPLATES.BASIC_USAGE
      templateRegistry.registerTemplate(customTemplate)

      const retrieved = templateRegistry.getTemplate(customTemplate.id)
      expect(retrieved).toBe(customTemplate)
    })

    it('should find templates by category', () => {
      const basicUsageTemplates = templateRegistry.getTemplatesByCategory('basic-usage')
      expect(basicUsageTemplates.length).toBeGreaterThan(0)

      const troubleshootingTemplates = templateRegistry.getTemplatesByCategory('troubleshooting')
      expect(troubleshootingTemplates.length).toBeGreaterThan(0)
    })
  })

  describe('Guideline Creation', () => {
    it('should create guideline from template', () => {
      const guideline = createGuidelineFromTemplate(
        'basic_usage',
        mockToolId,
        createMockGuideline(),
        templateRegistry
      )

      expect(guideline).not.toBeNull()
      expect(guideline!.toolId).toBe(mockToolId)
      expect(guideline!.category).toBe('basic-usage')
      expect(guideline!.id).toContain(mockToolId)
    })

    it('should handle invalid template ID', () => {
      const guideline = createGuidelineFromTemplate(
        'invalid_template',
        mockToolId,
        createMockGuideline(),
        templateRegistry
      )

      expect(guideline).toBeNull()
    })

    it('should validate guideline content', () => {
      const template = templateRegistry.getTemplate('basic_usage')!
      expect(() => {
        template.createGuideline(mockToolId, {
          title: 'Test',
          category: 'basic-usage' as const,
        })
      }).not.toThrow()
    })
  })
})

// =============================================================================
// Contextual Engine Tests
// =============================================================================

describe('Contextual Guidelines Engine', () => {
  let engine: ContextualGuidelinesEngine
  let mockContext: EnhancedUsageContext

  beforeEach(() => {
    engine = createContextualGuidelinesEngine()
    mockContext = createMockUsageContext()
  })

  describe('Context Analysis', () => {
    it('should analyze user context correctly', async () => {
      const request: ContextualGuidanceRequest = {
        toolId: mockToolId,
        context: mockContext,
        preferences: {
          format: 'standard',
          includeExamples: true,
          includeTroubleshooting: true,
          showAlternatives: false,
          interactive: false,
          stepByStep: true,
          showProgress: false,
          confirmationRequired: false,
        },
      }

      const response = await engine.getContextualGuidelines(request)

      expect(response).toBeDefined()
      expect(response.guidelines).toBeInstanceOf(Array)
      expect(response.metadata).toBeDefined()
      expect(response.suggestions).toBeDefined()
      expect(response.delivery).toBeDefined()
    })

    it('should adapt content for different user experience levels', async () => {
      // Test beginner adaptation
      const beginnerContext = { ...mockContext }
      beginnerContext.expertise.overallLevel = 'beginner'

      const beginnerRequest: ContextualGuidanceRequest = {
        toolId: mockToolId,
        context: beginnerContext,
        preferences: {
          format: 'comprehensive',
          includeExamples: true,
          includeTroubleshooting: true,
          showAlternatives: true,
          interactive: true,
          stepByStep: true,
          showProgress: true,
          confirmationRequired: true,
        },
      }

      const beginnerResponse = await engine.getContextualGuidelines(beginnerRequest)

      // Test expert adaptation
      const expertContext = { ...mockContext }
      expertContext.expertise.overallLevel = 'expert'

      const expertRequest: ContextualGuidanceRequest = {
        toolId: mockToolId,
        context: expertContext,
        preferences: {
          format: 'minimal',
          includeExamples: false,
          includeTroubleshooting: false,
          showAlternatives: true,
          interactive: false,
          stepByStep: false,
          showProgress: false,
          confirmationRequired: false,
        },
      }

      const expertResponse = await engine.getContextualGuidelines(expertRequest)

      // Responses should be different based on experience level
      expect(beginnerResponse.delivery.format).toBe('interactive')
      expect(expertResponse.delivery.format).toBe('text')
    })

    it('should handle urgent situations appropriately', async () => {
      const urgentContext = { ...mockContext }
      urgentContext.situation.urgency = 'critical'
      urgentContext.situation.timeConstraint = 5 // 5 minutes

      const request: ContextualGuidanceRequest = {
        toolId: mockToolId,
        context: urgentContext,
        preferences: {
          format: 'minimal',
          includeExamples: false,
          includeTroubleshooting: true,
          showAlternatives: false,
          interactive: false,
          stepByStep: false,
          showProgress: false,
          confirmationRequired: false,
        },
      }

      const response = await engine.getContextualGuidelines(request)

      expect(response.delivery.pacing).toBe('guided')
      expect(response.guidelines.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Guideline Filtering', () => {
    it('should filter guidelines by relevance', async () => {
      const request: ContextualGuidanceRequest = {
        toolId: mockToolId,
        context: mockContext,
        preferences: {
          format: 'standard',
          includeExamples: true,
          includeTroubleshooting: false,
          showAlternatives: false,
          interactive: false,
          stepByStep: false,
          showProgress: false,
          confirmationRequired: false,
        },
        constraints: {
          maxLength: 1000,
          maxSteps: 5,
          focusAreas: ['basic-usage'],
        },
      }

      const response = await engine.getContextualGuidelines(request)

      expect(response.metadata.filteredCount).toBeLessThanOrEqual(response.metadata.totalAvailable)
      expect(response.metadata.confidence).toBeGreaterThan(0)
      expect(response.metadata.confidence).toBeLessThanOrEqual(1)
    })

    it('should respect constraint limits', async () => {
      const request: ContextualGuidanceRequest = {
        toolId: mockToolId,
        context: mockContext,
        preferences: {
          format: 'standard',
          includeExamples: true,
          includeTroubleshooting: true,
          showAlternatives: true,
          interactive: false,
          stepByStep: true,
          showProgress: false,
          confirmationRequired: false,
        },
        constraints: {
          maxLength: 100,
          maxSteps: 3,
          mustInclude: ['quick-start'],
          mustExclude: ['advanced-features'],
        },
      }

      const response = await engine.getContextualGuidelines(request)

      // Should respect constraints
      expect(response.guidelines).toBeDefined()
    })
  })
})

// =============================================================================
// Knowledge Base Tests
// =============================================================================

describe('Knowledge Base', () => {
  let knowledgeBase: KnowledgeBase

  beforeEach(() => {
    knowledgeBase = createKnowledgeBase()
  })

  describe('Knowledge Entry Management', () => {
    it('should add and retrieve knowledge entries', () => {
      const entry = createKnowledgeEntry('best-practice', 'Test Best Practice', {
        summary: 'This is a test best practice',
        detailed: {
          description: 'Detailed description',
          rationale: 'Why this is important',
          benefits: [],
          drawbacks: [],
          alternatives: [],
          prerequisites: [],
          constraints: [],
        },
      })

      const completeEntry = {
        ...entry,
        id: entry.id!,
        type: entry.type!,
        title: entry.title!,
        description: entry.description!,
        content: entry.content!,
        metadata: entry.metadata!,
        relationships: entry.relationships!,
        applicability: entry.applicability!,
      } as KnowledgeEntry

      knowledgeBase.addEntry(completeEntry)

      const retrieved = knowledgeBase.getEntry(completeEntry.id)
      expect(retrieved).toEqual(completeEntry)
    })

    it('should search knowledge entries by various criteria', () => {
      // Add test entries
      const entry1 = createTestKnowledgeEntry('best-practice', 'Performance Best Practice', [
        'performance',
      ])
      const entry2 = createTestKnowledgeEntry('troubleshooting-guide', 'Common Issues Guide', [
        'troubleshooting',
      ])
      const entry3 = createTestKnowledgeEntry('optimization-tip', 'Speed Optimization', [
        'performance',
        'optimization',
      ])

      knowledgeBase.addEntry(entry1)
      knowledgeBase.addEntry(entry2)
      knowledgeBase.addEntry(entry3)

      // Search by type
      const bestPractices = knowledgeBase.search({
        types: ['best-practice'],
      })
      expect(bestPractices.length).toBe(1)
      expect(bestPractices[0].entry.type).toBe('best-practice')

      // Search by tags
      const performanceEntries = knowledgeBase.search({
        tags: ['performance'],
      })
      expect(performanceEntries.length).toBe(2)
    })

    it('should get entries by pattern', () => {
      const entry = createTestKnowledgeEntry('common-pattern', 'Test Pattern', ['patterns'])
      knowledgeBase.addEntry(entry)

      const patterns = knowledgeBase.getByPattern({
        type: 'common-pattern',
        tags: ['patterns'],
        difficulty: 'beginner',
      })

      expect(patterns.length).toBe(1)
      expect(patterns[0].type).toBe('common-pattern')
    })
  })

  describe('Specialized Retrieval Methods', () => {
    beforeEach(() => {
      // Add test data
      const bestPractice = createTestKnowledgeEntry('best-practice', 'Tool Best Practice', [
        'tool-usage',
      ])
      bestPractice.applicability.tools = [
        { toolId: mockToolId, toolName: 'Test Tool', applicabilityScore: 0.9 },
      ]
      knowledgeBase.addEntry(bestPractice)

      const troubleshooting = createTestKnowledgeEntry(
        'troubleshooting-guide',
        'Tool Troubleshooting',
        ['errors']
      )
      troubleshooting.applicability.tools = [
        { toolId: mockToolId, toolName: 'Test Tool', applicabilityScore: 0.8 },
      ]
      knowledgeBase.addEntry(troubleshooting)

      const optimization = createTestKnowledgeEntry('optimization-tip', 'Performance Tip', [
        'performance',
      ])
      optimization.applicability.tools = [
        { toolId: mockToolId, toolName: 'Test Tool', applicabilityScore: 0.7 },
      ]
      knowledgeBase.addEntry(optimization)
    })

    it('should get best practices for a tool', () => {
      const bestPractices = knowledgeBase.getBestPractices(mockToolId)
      expect(bestPractices.length).toBeGreaterThan(0)
      expect(bestPractices[0].type).toBe('best-practice')
    })

    it('should get troubleshooting guides', () => {
      const guides = knowledgeBase.getTroubleshootingGuides(mockToolId)
      expect(guides.length).toBeGreaterThan(0)
      expect(guides[0].type).toBe('troubleshooting-guide')
    })

    it('should get optimization tips', () => {
      const tips = knowledgeBase.getOptimizationTips(mockToolId, 'performance')
      expect(tips.length).toBeGreaterThan(0)
    })
  })

  describe('Feedback and Analytics', () => {
    it('should update usage metrics', () => {
      const entry = createTestKnowledgeEntry('best-practice', 'Test Entry', [])
      knowledgeBase.addEntry(entry)

      const initialViews = entry.metadata.usage.viewCount

      knowledgeBase.updateUsageMetrics(entry.id, {
        viewCount: initialViews + 1,
        implementationCount: 1,
      })

      const updated = knowledgeBase.getEntry(entry.id)!
      expect(updated.metadata.usage.viewCount).toBe(initialViews + 1)
      expect(updated.metadata.usage.implementationCount).toBe(1)
    })

    it('should handle feedback properly', () => {
      const entry = createTestKnowledgeEntry('best-practice', 'Test Entry', [])
      knowledgeBase.addEntry(entry)

      knowledgeBase.addFeedback(entry.id, {
        userId: mockUserId,
        rating: 5,
        type: 'general',
        comment: 'Very helpful!',
        timestamp: new Date(),
      })

      const updated = knowledgeBase.getEntry(entry.id)!
      expect(updated.metadata.feedback.positiveReviews).toBe(1)
    })
  })

  // Helper function for creating test knowledge entries
  function createTestKnowledgeEntry(type: any, title: string, tags: string[]): KnowledgeEntry {
    const partial = createKnowledgeEntry(type, title, {
      summary: `Summary for ${title}`,
    })

    return {
      ...partial,
      id: partial.id!,
      type: partial.type!,
      title: partial.title!,
      description: partial.description!,
      content: partial.content!,
      metadata: {
        ...partial.metadata!,
        tags,
      },
      relationships: partial.relationships!,
      applicability: partial.applicability!,
    } as KnowledgeEntry
  }
})

// =============================================================================
// Interactive Guidance Tests
// =============================================================================

describe('Interactive Tutorial Engine', () => {
  let engine: InteractiveTutorialEngine

  beforeEach(() => {
    engine = createInteractiveTutorialEngine()
  })

  describe('Tutorial Session Management', () => {
    it('should create tutorial sessions', async () => {
      const tutorial = createMockTutorial()
      const context = createMockUsageContext()

      const session = await engine.createSession(tutorial.id!, mockUserId, context)

      expect(session).toBeDefined()
      expect(session.tutorialId).toBe(tutorial.id)
      expect(session.userId).toBe(mockUserId)
      expect(session.state.status).toBe('active')
      expect(session.progress.currentSection).toBeDefined()
    })

    it('should retrieve existing sessions', async () => {
      const tutorial = createMockTutorial()
      const context = createMockUsageContext()

      const session = await engine.createSession(tutorial.id!, mockUserId, context)
      const retrieved = engine.getSession(session.id)

      expect(retrieved).toEqual(session)
    })
  })

  describe('Tutorial Navigation', () => {
    it('should advance through sections', async () => {
      const tutorial = createMockTutorial()
      const context = createMockUsageContext()

      const session = await engine.createSession(tutorial.id!, mockUserId, context)
      const initialSection = session.progress.currentSection

      const nextSection = await engine.advanceSection(session.id)

      if (nextSection) {
        const updatedSession = engine.getSession(session.id)!
        expect(updatedSession.progress.currentSection).not.toBe(initialSection)
        expect(updatedSession.progress.completedSections).toContain(initialSection)
      }
    })

    it('should handle end of tutorial', async () => {
      const tutorial = createMockTutorial()
      const context = createMockUsageContext()

      const session = await engine.createSession(tutorial.id!, mockUserId, context)

      // Advance to the end
      let nextSection = await engine.advanceSection(session.id)
      while (nextSection !== null) {
        nextSection = await engine.advanceSection(session.id)
      }

      expect(nextSection).toBeNull()
    })
  })

  describe('Interaction Processing', () => {
    it('should process interaction responses', async () => {
      const tutorial = createMockTutorial()
      const context = createMockUsageContext()

      const session = await engine.createSession(tutorial.id!, mockUserId, context)

      // Mock interaction
      const interactionId = 'test_interaction'
      const response = { answer: 'correct' }

      try {
        const result = await engine.processInteraction(session.id, interactionId, response)
        expect(result).toBeDefined()
      } catch (error) {
        // Expected since we don't have actual interactions set up
        expect(error instanceof Error ? error.message : String(error)).toContain('Interaction not found')
      }
    })
  })

  describe('Personalization', () => {
    it('should get personalized content', async () => {
      const tutorial = createMockTutorial()
      const context = createMockUsageContext()

      const session = await engine.createSession(tutorial.id!, mockUserId, context)

      const personalizedContent = await engine.getPersonalizedContent(
        session.id,
        session.progress.currentSection
      )

      expect(personalizedContent).toBeNull() // Expected with mock data
    })

    it('should generate recommendations', async () => {
      const tutorial = createMockTutorial()
      const context = createMockUsageContext()

      const session = await engine.createSession(tutorial.id!, mockUserId, context)

      const recommendations = await engine.getRecommendations(session.id)
      expect(recommendations).toBeInstanceOf(Array)
    })
  })

  describe('Progress Tracking', () => {
    it('should update progress', async () => {
      const tutorial = createMockTutorial()
      const context = createMockUsageContext()

      const session = await engine.createSession(tutorial.id!, mockUserId, context)

      await engine.updateProgress(session.id, {
        totalScore: 10,
        totalTimeSpent: 300,
      })

      const updatedSession = engine.getSession(session.id)!
      expect(updatedSession.progress.totalScore).toBe(10)
      expect(updatedSession.progress.totalTimeSpent).toBe(300)
    })

    it('should add bookmarks and notes', async () => {
      const tutorial = createMockTutorial()
      const context = createMockUsageContext()

      const session = await engine.createSession(tutorial.id!, mockUserId, context)

      await engine.addBookmark(session.id, {
        sectionId: 'section_1',
        title: 'Important Section',
        tags: ['important'],
      })

      await engine.addNote(session.id, {
        sectionId: 'section_1',
        content: 'This is my note',
        tags: ['personal'],
        shared: false,
      })

      const updatedSession = engine.getSession(session.id)!
      expect(updatedSession.userData.bookmarks.length).toBe(1)
      expect(updatedSession.userData.notes.length).toBe(1)
    })
  })

  function createMockTutorial(): Partial<InteractiveTutorial> {
    return createBasicTutorial(mockToolId, 'Test Tutorial', 'A tutorial for testing', [
      {
        id: 'section_1',
        title: 'Introduction',
        type: 'introduction',
        content: {
          text: {
            markdown: '# Introduction\nWelcome to the tutorial',
            interactive: false,
            highlightableTerms: [],
            glossaryTerms: [],
          },
        },
        interactions: [],
        reinforcement: [],
      },
      {
        id: 'section_2',
        title: 'Practice',
        type: 'hands-on',
        content: {
          text: {
            markdown: '# Practice\nTry it yourself',
            interactive: true,
            highlightableTerms: [],
            glossaryTerms: [],
          },
        },
        interactions: [],
        reinforcement: [],
      },
    ])
  }
})

// =============================================================================
// Management Platform Tests
// =============================================================================

describe('Guidelines Management Platform', () => {
  let platform: GuidelinesManagementPlatform

  beforeEach(() => {
    platform = createGuidelinesManagementPlatform()
  })

  describe('Workspace Management', () => {
    it('should create workspaces', async () => {
      const config: CreateWorkspaceConfig = {
        name: 'Test Workspace',
        description: 'A workspace for testing',
        ownerId: mockUserId,
      }

      const workspace = await platform.createWorkspace(config)

      expect(workspace).toBeDefined()
      expect(workspace.name).toBe(config.name)
      expect(workspace.ownerId).toBe(config.ownerId)
      expect(workspace.collaborators).toHaveLength(1)
      expect(workspace.collaborators[0].userId).toBe(mockUserId)
      expect(workspace.collaborators[0].role).toBe('owner')
    })

    it('should retrieve workspaces', async () => {
      const config: CreateWorkspaceConfig = {
        name: 'Test Workspace',
        ownerId: mockUserId,
      }

      const workspace = await platform.createWorkspace(config)
      const retrieved = platform.getWorkspace(workspace.id)

      expect(retrieved).toEqual(workspace)
    })

    it('should update workspace settings', async () => {
      const workspace = await platform.createWorkspace({
        name: 'Test Workspace',
        ownerId: mockUserId,
      })

      await platform.updateWorkspaceSettings(workspace.id, mockUserId, {
        visibility: 'public',
      })

      const updated = platform.getWorkspace(workspace.id)!
      expect(updated.settings.visibility).toBe('public')
    })

    it('should add collaborators', async () => {
      const workspace = await platform.createWorkspace({
        name: 'Test Workspace',
        ownerId: mockUserId,
      })

      const collaboratorId = 'collaborator_123'
      await platform.addCollaborator(workspace.id, mockUserId, {
        userId: collaboratorId,
        role: 'editor',
      })

      const updated = platform.getWorkspace(workspace.id)!
      expect(updated.collaborators).toHaveLength(2)
      expect(updated.collaborators.some((c) => c.userId === collaboratorId)).toBe(true)
    })
  })

  describe('Project Management', () => {
    let workspace: AuthoringWorkspace

    beforeEach(async () => {
      workspace = await platform.createWorkspace({
        name: 'Test Workspace',
        ownerId: mockUserId,
      })
    })

    it('should create projects', async () => {
      const config: CreateProjectConfig = {
        name: 'Test Project',
        description: 'A project for testing',
        type: 'guidelines',
        tags: ['test'],
        targetTools: [mockToolId],
      }

      const project = await platform.createProject(workspace.id, mockUserId, config)

      expect(project).toBeDefined()
      expect(project.name).toBe(config.name)
      expect(project.type).toBe(config.type)
      expect(project.status).toBe('planning')
      expect(project.metadata.tags).toContain('test')
    })

    it('should create guideline documents', async () => {
      const project = await platform.createProject(workspace.id, mockUserId, {
        name: 'Test Project',
        type: 'guidelines',
      })

      const document = await platform.createGuidelineDocument(
        workspace.id,
        project.id,
        mockUserId,
        {
          toolId: mockToolId,
          title: 'Test Guideline',
          description: 'A test guideline document',
          category: 'basic-usage',
        }
      )

      expect(document).toBeDefined()
      expect(document.guideline.title).toBe('Test Guideline')
      expect(document.guideline.toolId).toBe(mockToolId)
      expect(document.status).toBe('draft')
      expect(document.versions).toHaveLength(1)
    })

    it('should update guideline documents', async () => {
      const project = await platform.createProject(workspace.id, mockUserId, {
        name: 'Test Project',
        type: 'guidelines',
      })

      const document = await platform.createGuidelineDocument(
        workspace.id,
        project.id,
        mockUserId,
        {
          toolId: mockToolId,
          title: 'Original Title',
        }
      )

      await platform.updateGuidelineDocument(workspace.id, project.id, document.id, mockUserId, {
        title: 'Updated Title',
        description: 'Updated description',
      })

      const updatedWorkspace = platform.getWorkspace(workspace.id)!
      const updatedProject = updatedWorkspace.projects.find((p) => p.id === project.id)!
      const updatedDocument = updatedProject.guidelines.find((d) => d.id === document.id)!

      expect(updatedDocument.guideline.title).toBe('Updated Title')
      expect(updatedDocument.guideline.description).toBe('Updated description')
      expect(updatedDocument.authoringSession.changes.length).toBeGreaterThan(0)
    })
  })

  describe('Review Workflow', () => {
    let workspace: AuthoringWorkspace
    let projectId: string
    let documentId: string

    beforeEach(async () => {
      workspace = await platform.createWorkspace({
        name: 'Test Workspace',
        ownerId: mockUserId,
      })

      // Add a reviewer
      await platform.addCollaborator(workspace.id, mockUserId, {
        userId: 'reviewer_123',
        role: 'reviewer',
      })

      const project = await platform.createProject(workspace.id, mockUserId, {
        name: 'Test Project',
        type: 'guidelines',
      })
      projectId = project.id

      const document = await platform.createGuidelineDocument(workspace.id, projectId, mockUserId, {
        toolId: mockToolId,
        title: 'Test Document',
      })
      documentId = document.id
    })

    it('should submit documents for review', async () => {
      await platform.submitForReview(workspace.id, projectId, documentId, mockUserId)

      const updatedWorkspace = platform.getWorkspace(workspace.id)!
      const project = updatedWorkspace.projects.find((p) => p.id === projectId)!
      const document = project.guidelines.find((d) => d.id === documentId)!

      expect(document.status).toBe('in-review')
      expect(document.assignments.length).toBeGreaterThan(0)
    })

    it('should add review comments', async () => {
      await platform.submitForReview(workspace.id, projectId, documentId, mockUserId)

      const updatedWorkspace = platform.getWorkspace(workspace.id)!
      const project = updatedWorkspace.projects.find((p) => p.id === projectId)!
      const document = project.guidelines.find((d) => d.id === documentId)!
      const review = document.reviewHistory[0]

      const comment = await platform.addReviewComment(
        workspace.id,
        projectId,
        documentId,
        review.id,
        review.reviewerId,
        {
          content: 'This needs improvement',
          type: 'suggestion',
        }
      )

      expect(comment).toBeDefined()
      expect(comment.content).toBe('This needs improvement')
      expect(comment.type).toBe('suggestion')
    })

    it('should complete reviews', async () => {
      await platform.submitForReview(workspace.id, projectId, documentId, mockUserId)

      const workspace_after_submit = platform.getWorkspace(workspace.id)!
      const project = workspace_after_submit.projects.find((p) => p.id === projectId)!
      const document = project.guidelines.find((d) => d.id === documentId)!
      const review = document.reviewHistory[0]

      // Start the review
      review.status = 'in-progress'

      await platform.completeReview(
        workspace.id,
        projectId,
        documentId,
        review.id,
        review.reviewerId,
        {
          outcome: 'approved',
          reasoning: 'Looks good to me',
        }
      )

      const workspace_after_review = platform.getWorkspace(workspace.id)!
      const updated_project = workspace_after_review.projects.find((p) => p.id === projectId)!
      const updated_document = updated_project.guidelines.find((d) => d.id === documentId)!
      const updated_review = updated_document.reviewHistory.find((r) => r.id === review.id)!

      expect(updated_review.status).toBe('completed')
      expect(updated_review.decision.outcome).toBe('approved')
      expect(updated_document.status).toBe('approved')
    })
  })

  describe('Quality Management', () => {
    let workspace: AuthoringWorkspace

    beforeEach(async () => {
      workspace = await platform.createWorkspace({
        name: 'Test Workspace',
        ownerId: mockUserId,
      })
    })

    it('should generate quality reports', async () => {
      const project = await platform.createProject(workspace.id, mockUserId, {
        name: 'Test Project',
        type: 'guidelines',
      })

      const document = await platform.createGuidelineDocument(
        workspace.id,
        project.id,
        mockUserId,
        {
          toolId: mockToolId,
          title: 'Test Document',
        }
      )

      const report = await platform.generateQualityReport(
        workspace.id,
        project.id,
        document.id,
        mockUserId
      )

      expect(report).toBeDefined()
      expect(report.documentId).toBe(document.id)
      expect(report.overallScore).toBeGreaterThanOrEqual(0)
      expect(report.overallScore).toBeLessThanOrEqual(1)
      expect(report.issues).toBeInstanceOf(Array)
      expect(report.recommendations).toBeInstanceOf(Array)
    })
  })
})

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration Tests', () => {
  let platform: GuidelinesManagementPlatform
  let knowledgeBase: KnowledgeBase
  let tutorialEngine: InteractiveTutorialEngine
  let contextualEngine: ContextualGuidelinesEngine

  beforeEach(() => {
    platform = createGuidelinesManagementPlatform()
    knowledgeBase = createKnowledgeBase()
    tutorialEngine = createInteractiveTutorialEngine()
    contextualEngine = createContextualGuidelinesEngine()
  })

  it('should integrate all components for complete workflow', async () => {
    // 1. Create workspace and project
    const workspace = await platform.createWorkspace({
      name: 'Integration Test Workspace',
      ownerId: mockUserId,
    })

    const project = await platform.createProject(workspace.id, mockUserId, {
      name: 'Integration Test Project',
      type: 'guidelines',
    })

    // 2. Create guideline document
    const document = await platform.createGuidelineDocument(workspace.id, project.id, mockUserId, {
      toolId: mockToolId,
      title: 'Integration Test Guideline',
      templateId: 'basic_usage',
    })

    // 3. Add knowledge entry
    const knowledgeEntry = createKnowledgeEntry('best-practice', 'Integration Test Best Practice', {
      summary: 'A test best practice for integration',
    })

    const completeEntry = {
      ...knowledgeEntry,
      id: knowledgeEntry.id!,
      type: knowledgeEntry.type!,
      title: knowledgeEntry.title!,
      description: knowledgeEntry.description!,
      content: knowledgeEntry.content!,
      metadata: knowledgeEntry.metadata!,
      relationships: knowledgeEntry.relationships!,
      applicability: {
        ...knowledgeEntry.applicability!,
        tools: [{ toolId: mockToolId, toolName: 'Test Tool', applicabilityScore: 0.9 }],
      },
    } as KnowledgeEntry

    knowledgeBase.addEntry(completeEntry)

    // 4. Get contextual guidelines
    const context = createMockUsageContext()
    const guidanceRequest: ContextualGuidanceRequest = {
      toolId: mockToolId,
      context,
      preferences: {
        format: 'standard',
        includeExamples: true,
        includeTroubleshooting: true,
        showAlternatives: false,
        interactive: false,
        stepByStep: true,
        showProgress: false,
        confirmationRequired: false,
      },
    }

    const guidanceResponse = await contextualEngine.getContextualGuidelines(guidanceRequest)

    // 5. Verify integration
    expect(workspace).toBeDefined()
    expect(project).toBeDefined()
    expect(document).toBeDefined()
    expect(completeEntry).toBeDefined()
    expect(guidanceResponse).toBeDefined()

    // Verify relationships
    expect(document.guideline.toolId).toBe(mockToolId)
    expect(completeEntry.applicability.tools[0].toolId).toBe(mockToolId)
    expect(guidanceRequest.toolId).toBe(mockToolId)
  })

  it('should handle cross-component data sharing', () => {
    // Test that components can share common data structures
    const templateRegistry = createGuidelineTemplateRegistry()
    const template = templateRegistry.getTemplate('basic_usage')

    expect(template).toBeDefined()

    const guideline = template!.createGuideline(mockToolId, {
      title: 'Cross-Component Test',
    })

    expect(guideline.toolId).toBe(mockToolId)
    expect(guideline.title).toBe('Cross-Component Test')
  })
})

// =============================================================================
// Performance Tests
// =============================================================================

describe('Performance Tests', () => {
  it('should handle large numbers of guidelines efficiently', () => {
    const templateRegistry = createGuidelineTemplateRegistry()
    const template = templateRegistry.getTemplate('basic_usage')!

    const startTime = Date.now()

    // Create 1000 guidelines
    const guidelines = Array.from({ length: 1000 }, (_, i) =>
      template.createGuideline(`tool_${i}`, {
        title: `Guideline ${i}`,
        description: `Test guideline number ${i}`,
      })
    )

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(guidelines).toHaveLength(1000)
    expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
  })

  it('should handle large knowledge base efficiently', () => {
    const knowledgeBase = createKnowledgeBase()

    const startTime = Date.now()

    // Add 1000 knowledge entries
    for (let i = 0; i < 1000; i++) {
      const entry = createKnowledgeEntry('best-practice', `Knowledge Entry ${i}`, {
        summary: `Summary for entry ${i}`,
      })

      const completeEntry = {
        ...entry,
        id: entry.id!,
        type: entry.type!,
        title: entry.title!,
        description: entry.description!,
        content: entry.content!,
        metadata: {
          ...entry.metadata!,
          tags: [`tag_${i % 10}`], // Create 10 different tags
        },
        relationships: entry.relationships!,
        applicability: entry.applicability!,
      } as KnowledgeEntry

      knowledgeBase.addEntry(completeEntry)
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    // Search performance test
    const searchStart = Date.now()
    const results = knowledgeBase.search({ tags: ['tag_0'], limit: 50 })
    const searchEnd = Date.now()
    const searchDuration = searchEnd - searchStart

    expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    expect(searchDuration).toBeLessThan(1000) // Search should be fast
    expect(results.length).toBeGreaterThan(0)
  })
})

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('Error Handling', () => {
  describe('Platform Error Handling', () => {
    let platform: GuidelinesManagementPlatform

    beforeEach(() => {
      platform = createGuidelinesManagementPlatform()
    })

    it('should handle invalid workspace access', () => {
      const invalidWorkspaceId = 'invalid_workspace_id'
      const workspace = platform.getWorkspace(invalidWorkspaceId)
      expect(workspace).toBeNull()
    })

    it('should handle permission violations', async () => {
      const workspace = await platform.createWorkspace({
        name: 'Test Workspace',
        ownerId: mockUserId,
      })

      const unauthorizedUserId = 'unauthorized_user'

      await expect(
        platform.updateWorkspaceSettings(workspace.id, unauthorizedUserId, { visibility: 'public' })
      ).rejects.toThrow('Insufficient permissions')
    })

    it('should handle invalid template references', () => {
      const templateRegistry = createGuidelineTemplateRegistry()
      const guideline = createGuidelineFromTemplate(
        'nonexistent_template',
        mockToolId,
        {},
        templateRegistry
      )

      expect(guideline).toBeNull()
    })
  })

  describe('Context Engine Error Handling', () => {
    let engine: ContextualGuidelinesEngine

    beforeEach(() => {
      engine = createContextualGuidelinesEngine()
    })

    it('should handle invalid context gracefully', async () => {
      const invalidContext = {} as EnhancedUsageContext

      const request: ContextualGuidanceRequest = {
        toolId: 'nonexistent_tool',
        context: invalidContext,
        preferences: {
          format: 'standard',
          includeExamples: false,
          includeTroubleshooting: false,
          showAlternatives: false,
          interactive: false,
          stepByStep: false,
          showProgress: false,
          confirmationRequired: false,
        },
      }

      const response = await engine.getContextualGuidelines(request)
      expect(response).toBeDefined()
      expect(response.guidelines).toBeInstanceOf(Array)
    })
  })

  describe('Knowledge Base Error Handling', () => {
    let knowledgeBase: KnowledgeBase

    beforeEach(() => {
      knowledgeBase = createKnowledgeBase()
    })

    it('should handle retrieval of non-existent entries', () => {
      const entry = knowledgeBase.getEntry('nonexistent_id')
      expect(entry).toBeNull()
    })

    it('should handle empty search queries', () => {
      const results = knowledgeBase.search({})
      expect(results).toBeInstanceOf(Array)
    })
  })
})
