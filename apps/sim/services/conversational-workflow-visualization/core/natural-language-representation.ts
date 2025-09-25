/**
 * Natural Language Workflow Representation System
 * ==============================================
 *
 * Transforms complex workflow structures into engaging, understandable
 * natural language descriptions that adapt to user expertise level and
 * context. This system creates dynamic workflow narratives that make
 * complex processes accessible through conversation.
 */

import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('NaturalLanguageWorkflowRepresentation')

/**
 * User expertise levels for adaptive explanations
 */
export enum UserExpertiseLevel {
  NOVICE = 'novice', // New to workflows and automation
  BEGINNER = 'beginner', // Basic understanding of workflows
  INTERMEDIATE = 'intermediate', // Comfortable with workflow concepts
  ADVANCED = 'advanced', // Expert user with deep knowledge
  TECHNICAL = 'technical', // Developers and system architects
}

/**
 * Narrative styles for different presentation contexts
 */
export enum NarrativeStyle {
  CASUAL = 'casual', // Friendly, conversational tone
  PROFESSIONAL = 'professional', // Business-appropriate language
  TECHNICAL = 'technical', // Precise, technical terminology
  STORYTELLING = 'storytelling', // Engaging narrative flow
  EDUCATIONAL = 'educational', // Teaching-focused explanations
}

/**
 * Workflow node representation in natural language
 */
export interface WorkflowNodeNarrative {
  nodeId: string
  nodeType: string
  humanFriendlyName: string

  // Multi-level descriptions
  descriptions: {
    [UserExpertiseLevel.NOVICE]: string
    [UserExpertiseLevel.BEGINNER]: string
    [UserExpertiseLevel.INTERMEDIATE]: string
    [UserExpertiseLevel.ADVANCED]: string
    [UserExpertiseLevel.TECHNICAL]: string
  }

  // Purpose and role explanations
  purpose: {
    whatItDoes: string
    whyItMatters: string
    howItWorks: string
  }

  // Input/output explanations
  dataFlow: {
    inputDescription: string
    outputDescription: string
    transformationExplanation: string
  }

  // Configuration explanations
  configuration: {
    keySettings: Array<{
      setting: string
      explanation: string
      impact: string
    }>
    commonPatterns: string[]
    troubleshootingTips: string[]
  }

  // Execution context
  executionContext: {
    typicalDuration: string
    resourceRequirements: string
    dependencyExplanation: string
    errorScenarios: string[]
  }

  // Metaphors and analogies
  analogies: {
    [UserExpertiseLevel.NOVICE]: string
    [UserExpertiseLevel.BEGINNER]: string
    [UserExpertiseLevel.INTERMEDIATE]: string
  }
}

/**
 * Complete workflow narrative structure
 */
export interface WorkflowNarrative {
  workflowId: string
  title: string

  // Overview narratives
  overview: {
    [UserExpertiseLevel.NOVICE]: string
    [UserExpertiseLevel.BEGINNER]: string
    [UserExpertiseLevel.INTERMEDIATE]: string
    [UserExpertiseLevel.ADVANCED]: string
    [UserExpertiseLevel.TECHNICAL]: string
  }

  // Story structure
  story: {
    introduction: string
    problemStatement: string
    solution: string
    expectedOutcome: string
    successCriteria: string[]
  }

  // Node narratives
  nodeNarratives: WorkflowNodeNarrative[]

  // Flow explanations
  flowNarrative: {
    executionOrder: string
    decisionPoints: Array<{
      nodeId: string
      decision: string
      possiblePaths: string[]
    }>
    parallelProcessing: string[]
    criticalPath: string
  }

  // Context and usage
  usageContext: {
    commonUseCases: string[]
    businessValue: string
    userBenefits: string[]
    frequentQuestions: Array<{
      question: string
      answer: string
    }>
  }

  // Performance characteristics
  performance: {
    typicalExecutionTime: string
    scalabilityNotes: string
    resourceConsumption: string
    optimizationTips: string[]
  }

  // Adaptation metadata
  adaptationMetadata: {
    lastUpdated: Date
    generationContext: {
      userExpertiseLevel: UserExpertiseLevel
      narrativeStyle: NarrativeStyle
      customizations: Record<string, any>
    }
  }
}

/**
 * Natural language workflow representation generator
 */
export class NaturalLanguageWorkflowRepresentationSystem {
  // Terminology mappings for different expertise levels
  private readonly terminologyMappings = new Map<UserExpertiseLevel, Map<string, string>>([
    [
      UserExpertiseLevel.NOVICE,
      new Map([
        ['node', 'step'],
        ['edge', 'connection'],
        ['execution', 'running'],
        ['parameter', 'setting'],
        ['condition', 'rule'],
        ['iteration', 'repeat'],
        ['validation', 'checking'],
        ['transformation', 'changing'],
        ['aggregation', 'combining'],
        ['orchestration', 'coordination'],
      ]),
    ],
    [
      UserExpertiseLevel.BEGINNER,
      new Map([
        ['node', 'action'],
        ['edge', 'flow'],
        ['execution', 'process'],
        ['parameter', 'option'],
        ['condition', 'requirement'],
        ['iteration', 'loop'],
        ['validation', 'verification'],
        ['transformation', 'modification'],
        ['aggregation', 'collection'],
        ['orchestration', 'management'],
      ]),
    ],
    [
      UserExpertiseLevel.INTERMEDIATE,
      new Map([
        ['orchestration', 'workflow coordination'],
        ['aggregation', 'data aggregation'],
        ['transformation', 'data transformation'],
      ]),
    ],
    // Advanced and Technical levels use standard terminology
  ])

  // Analogy generators for different node types
  private readonly analogyGenerators = new Map<
    string,
    (nodeData: any) => Record<UserExpertiseLevel, string>
  >([
    [
      'data-source',
      (nodeData) => ({
        [UserExpertiseLevel.NOVICE]:
          'Like a water faucet that provides the information your workflow needs to get started',
        [UserExpertiseLevel.BEGINNER]:
          'Acts as the starting point where your workflow gathers the information it needs to work with',
        [UserExpertiseLevel.INTERMEDIATE]:
          'Serves as the data input mechanism that feeds information into your workflow processing pipeline',
        [UserExpertiseLevel.ADVANCED]: '',
        [UserExpertiseLevel.TECHNICAL]: '',
      }),
    ],
    [
      'filter',
      (nodeData) => ({
        [UserExpertiseLevel.NOVICE]:
          "Works like a coffee filter - it lets the good stuff through and keeps out what you don't want",
        [UserExpertiseLevel.BEGINNER]:
          'Acts as a quality control checkpoint that only allows data meeting your criteria to continue',
        [UserExpertiseLevel.INTERMEDIATE]:
          'Implements conditional logic to selectively pass data based on specified criteria',
        [UserExpertiseLevel.ADVANCED]: '',
        [UserExpertiseLevel.TECHNICAL]: '',
      }),
    ],
    [
      'transform',
      (nodeData) => ({
        [UserExpertiseLevel.NOVICE]:
          'Like a translator that changes information from one format to another so the next step can understand it',
        [UserExpertiseLevel.BEGINNER]:
          'Converts or modifies data to match the format needed by subsequent workflow steps',
        [UserExpertiseLevel.INTERMEDIATE]:
          'Performs data transformation operations to restructure information for downstream processing',
        [UserExpertiseLevel.ADVANCED]: '',
        [UserExpertiseLevel.TECHNICAL]: '',
      }),
    ],
    [
      'aggregator',
      (nodeData) => ({
        [UserExpertiseLevel.NOVICE]:
          'Like collecting puzzle pieces and putting them together to see the complete picture',
        [UserExpertiseLevel.BEGINNER]:
          'Combines multiple pieces of information into a single, comprehensive result',
        [UserExpertiseLevel.INTERMEDIATE]:
          'Performs aggregation operations to consolidate data from multiple sources or iterations',
        [UserExpertiseLevel.ADVANCED]: '',
        [UserExpertiseLevel.TECHNICAL]: '',
      }),
    ],
    [
      'decision',
      (nodeData) => ({
        [UserExpertiseLevel.NOVICE]:
          'Acts like a traffic light that decides which direction your workflow should go next',
        [UserExpertiseLevel.BEGINNER]:
          'Makes decisions about what path the workflow should take based on the current information',
        [UserExpertiseLevel.INTERMEDIATE]:
          'Evaluates conditions and routes execution flow to appropriate branches',
        [UserExpertiseLevel.ADVANCED]: '',
        [UserExpertiseLevel.TECHNICAL]: '',
      }),
    ],
  ])

  // Template generators for different narrative styles
  private readonly narrativeTemplates = new Map<
    NarrativeStyle,
    {
      introduction: (workflowName: string, purpose: string) => string
      nodeDescription: (nodeName: string, purpose: string, context: string) => string
      conclusion: (outcome: string, benefits: string[]) => string
    }
  >([
    [
      NarrativeStyle.CASUAL,
      {
        introduction: (name, purpose) =>
          `Hey! Let me walk you through the "${name}" workflow. Basically, this is designed to ${purpose.toLowerCase()}. Pretty cool, right?`,
        nodeDescription: (name, purpose, context) =>
          `Next up, we have "${name}" - this little guy ${purpose.toLowerCase()}. ${context}`,
        conclusion: (outcome, benefits) =>
          `And that's it! When this workflow finishes, you'll have ${outcome}. The cool thing is ${benefits.join(', ')}.`,
      },
    ],
    [
      NarrativeStyle.PROFESSIONAL,
      {
        introduction: (name, purpose) =>
          `The "${name}" workflow is designed to ${purpose}. This automated process ensures consistent and efficient execution.`,
        nodeDescription: (name, purpose, context) =>
          `The "${name}" component ${purpose}. ${context}`,
        conclusion: (outcome, benefits) =>
          `Upon completion, this workflow delivers ${outcome}. Key benefits include ${benefits.join(', ')}.`,
      },
    ],
    [
      NarrativeStyle.STORYTELLING,
      {
        introduction: (name, purpose) =>
          `Imagine you need to ${purpose}. That's exactly what our "${name}" workflow does - but like having a super-efficient assistant who never makes mistakes.`,
        nodeDescription: (name, purpose, context) =>
          `At this point in our story, "${name}" steps in to ${purpose}. Think of it as ${context}`,
        conclusion: (outcome, benefits) =>
          `And so our workflow story concludes with ${outcome}. The happy ending includes ${benefits.join(', ')}.`,
      },
    ],
    [
      NarrativeStyle.EDUCATIONAL,
      {
        introduction: (name, purpose) =>
          `Let's learn about the "${name}" workflow. This is an excellent example of how automation can ${purpose}. We'll examine each component to understand the complete process.`,
        nodeDescription: (name, purpose, context) =>
          `Now we encounter "${name}". This component demonstrates how to ${purpose}. Notice how ${context}`,
        conclusion: (outcome, benefits) =>
          `To summarize, this workflow achieves ${outcome}. The educational value includes understanding ${benefits.join(', ')}.`,
      },
    ],
  ])

  constructor() {
    logger.info('Natural Language Workflow Representation System initialized')
  }

  /**
   * Generate comprehensive natural language representation of a workflow
   */
  async generateWorkflowNarrative(
    workflowData: any,
    userExpertiseLevel: UserExpertiseLevel = UserExpertiseLevel.INTERMEDIATE,
    narrativeStyle: NarrativeStyle = NarrativeStyle.PROFESSIONAL,
    customizations: Record<string, any> = {}
  ): Promise<WorkflowNarrative> {
    logger.info('Generating workflow narrative', {
      workflowId: workflowData.id,
      userExpertiseLevel,
      narrativeStyle,
      nodeCount: workflowData.nodes?.length || 0,
    })

    try {
      // Generate multi-level overview
      const overview = await this.generateOverviewNarratives(workflowData, narrativeStyle)

      // Create story structure
      const story = await this.generateStoryStructure(
        workflowData,
        userExpertiseLevel,
        narrativeStyle
      )

      // Generate node narratives
      const nodeNarratives = await this.generateNodeNarratives(
        workflowData.nodes || [],
        userExpertiseLevel,
        narrativeStyle
      )

      // Create flow narrative
      const flowNarrative = await this.generateFlowNarrative(
        workflowData,
        userExpertiseLevel,
        narrativeStyle
      )

      // Generate usage context
      const usageContext = await this.generateUsageContext(workflowData, userExpertiseLevel)

      // Generate performance information
      const performance = await this.generatePerformanceNarrative(workflowData, userExpertiseLevel)

      const narrative: WorkflowNarrative = {
        workflowId: workflowData.id,
        title: workflowData.name || 'Unnamed Workflow',
        overview,
        story,
        nodeNarratives,
        flowNarrative,
        usageContext,
        performance,
        adaptationMetadata: {
          lastUpdated: new Date(),
          generationContext: {
            userExpertiseLevel,
            narrativeStyle,
            customizations,
          },
        },
      }

      logger.info('Workflow narrative generated successfully', {
        workflowId: workflowData.id,
        nodeNarratives: nodeNarratives.length,
        overviewLength: overview[userExpertiseLevel].length,
      })

      return narrative
    } catch (error: any) {
      logger.error('Failed to generate workflow narrative', {
        workflowId: workflowData.id,
        error: error.message,
        userExpertiseLevel,
        narrativeStyle,
      })

      // Return fallback narrative
      return this.generateFallbackNarrative(workflowData, userExpertiseLevel)
    }
  }

  /**
   * Generate multi-level overview narratives
   */
  private async generateOverviewNarratives(
    workflowData: any,
    narrativeStyle: NarrativeStyle
  ): Promise<WorkflowNarrative['overview']> {
    const baseDescription = workflowData.description || 'A custom workflow process'
    const nodeCount = workflowData.nodes?.length || 0

    return {
      [UserExpertiseLevel.NOVICE]:
        `This is a helpful process that does ${nodeCount} different things in order. ` +
        `It's designed to make your work easier by handling tasks automatically. ` +
        `Think of it as a smart assistant that follows the same steps every time.`,

      [UserExpertiseLevel.BEGINNER]:
        `This workflow contains ${nodeCount} steps that work together to complete a task. ` +
        `${baseDescription}. Each step builds on the previous one to create a complete solution. ` +
        `You can run this workflow whenever you need this type of processing done.`,

      [UserExpertiseLevel.INTERMEDIATE]:
        `This is a ${nodeCount}-step workflow that ${baseDescription.toLowerCase()}. ` +
        `The workflow follows a defined execution path with data flowing from one component to the next. ` +
        `It includes error handling, data validation, and configurable parameters for different use cases.`,

      [UserExpertiseLevel.ADVANCED]:
        `This workflow implements a ${nodeCount}-component processing pipeline. ` +
        `${baseDescription}. The architecture supports parallel execution, conditional branching, ` +
        `and dynamic parameter adjustment. Performance is optimized for scalability and reliability.`,

      [UserExpertiseLevel.TECHNICAL]:
        `Workflow architecture: ${nodeCount} nodes implementing ${baseDescription.toLowerCase()}. ` +
        `Uses directed acyclic graph (DAG) execution model with support for parallel processing, ` +
        `conditional logic, error recovery, and state persistence. Configurable for different ` +
        `execution environments and resource constraints.`,
    }
  }

  /**
   * Generate story structure for workflow
   */
  private async generateStoryStructure(
    workflowData: any,
    userExpertiseLevel: UserExpertiseLevel,
    narrativeStyle: NarrativeStyle
  ): Promise<WorkflowNarrative['story']> {
    const template = this.narrativeTemplates.get(narrativeStyle)!

    return {
      introduction: template.introduction(
        workflowData.name || 'Custom Workflow',
        workflowData.description || 'automate important tasks'
      ),

      problemStatement: this.generateProblemStatement(workflowData, userExpertiseLevel),

      solution: this.generateSolutionDescription(workflowData, userExpertiseLevel),

      expectedOutcome: this.generateExpectedOutcome(workflowData, userExpertiseLevel),

      successCriteria: this.generateSuccessCriteria(workflowData, userExpertiseLevel),
    }
  }

  /**
   * Generate narratives for individual nodes
   */
  private async generateNodeNarratives(
    nodes: any[],
    userExpertiseLevel: UserExpertiseLevel,
    narrativeStyle: NarrativeStyle
  ): Promise<WorkflowNodeNarrative[]> {
    const narratives: WorkflowNodeNarrative[] = []

    for (const node of nodes) {
      const narrative = await this.generateSingleNodeNarrative(
        node,
        userExpertiseLevel,
        narrativeStyle
      )
      narratives.push(narrative)
    }

    return narratives
  }

  /**
   * Generate narrative for a single workflow node
   */
  private async generateSingleNodeNarrative(
    nodeData: any,
    userExpertiseLevel: UserExpertiseLevel,
    narrativeStyle: NarrativeStyle
  ): Promise<WorkflowNodeNarrative> {
    const nodeType = nodeData.type || 'generic'
    const nodeName = nodeData.data?.name || nodeData.data?.title || `${nodeType} node`

    // Generate descriptions for all expertise levels
    const descriptions = {
      [UserExpertiseLevel.NOVICE]: this.generateNodeDescription(
        nodeData,
        UserExpertiseLevel.NOVICE
      ),
      [UserExpertiseLevel.BEGINNER]: this.generateNodeDescription(
        nodeData,
        UserExpertiseLevel.BEGINNER
      ),
      [UserExpertiseLevel.INTERMEDIATE]: this.generateNodeDescription(
        nodeData,
        UserExpertiseLevel.INTERMEDIATE
      ),
      [UserExpertiseLevel.ADVANCED]: this.generateNodeDescription(
        nodeData,
        UserExpertiseLevel.ADVANCED
      ),
      [UserExpertiseLevel.TECHNICAL]: this.generateNodeDescription(
        nodeData,
        UserExpertiseLevel.TECHNICAL
      ),
    }

    // Generate analogies
    const analogyGenerator = this.analogyGenerators.get(nodeType)
    const analogies = analogyGenerator
      ? analogyGenerator(nodeData)
      : {
          [UserExpertiseLevel.NOVICE]: '',
          [UserExpertiseLevel.BEGINNER]: '',
          [UserExpertiseLevel.INTERMEDIATE]: '',
        }

    return {
      nodeId: nodeData.id,
      nodeType,
      humanFriendlyName: this.generateHumanFriendlyName(nodeData),
      descriptions,
      purpose: {
        whatItDoes: this.generateWhatItDoes(nodeData, userExpertiseLevel),
        whyItMatters: this.generateWhyItMatters(nodeData, userExpertiseLevel),
        howItWorks: this.generateHowItWorks(nodeData, userExpertiseLevel),
      },
      dataFlow: {
        inputDescription: this.generateInputDescription(nodeData, userExpertiseLevel),
        outputDescription: this.generateOutputDescription(nodeData, userExpertiseLevel),
        transformationExplanation: this.generateTransformationExplanation(
          nodeData,
          userExpertiseLevel
        ),
      },
      configuration: {
        keySettings: this.generateKeySettingsExplanations(nodeData, userExpertiseLevel),
        commonPatterns: this.generateCommonPatterns(nodeData),
        troubleshootingTips: this.generateTroubleshootingTips(nodeData, userExpertiseLevel),
      },
      executionContext: {
        typicalDuration: this.estimateExecutionDuration(nodeData),
        resourceRequirements: this.describeResourceRequirements(nodeData, userExpertiseLevel),
        dependencyExplanation: this.generateDependencyExplanation(nodeData, userExpertiseLevel),
        errorScenarios: this.generateErrorScenarios(nodeData, userExpertiseLevel),
      },
      analogies,
    }
  }

  /**
   * Generate flow narrative explaining execution order and decision points
   */
  private async generateFlowNarrative(
    workflowData: any,
    userExpertiseLevel: UserExpertiseLevel,
    narrativeStyle: NarrativeStyle
  ): Promise<WorkflowNarrative['flowNarrative']> {
    return {
      executionOrder: this.generateExecutionOrderExplanation(workflowData, userExpertiseLevel),
      decisionPoints: this.generateDecisionPointsExplanation(workflowData, userExpertiseLevel),
      parallelProcessing: this.generateParallelProcessingExplanation(
        workflowData,
        userExpertiseLevel
      ),
      criticalPath: this.generateCriticalPathExplanation(workflowData, userExpertiseLevel),
    }
  }

  // Helper methods for generating specific narrative components
  private generateNodeDescription(nodeData: any, level: UserExpertiseLevel): string {
    const termMap = this.terminologyMappings.get(level) || new Map()
    const nodeType = nodeData.type || 'step'
    const friendlyType = termMap.get(nodeType) || nodeType

    switch (level) {
      case UserExpertiseLevel.NOVICE:
        return `This ${friendlyType} helps your workflow by doing something important at this point in the process.`
      case UserExpertiseLevel.BEGINNER:
        return `This ${friendlyType} performs a specific task as part of your workflow's overall objective.`
      case UserExpertiseLevel.INTERMEDIATE:
        return `This ${nodeType} component handles ${nodeData.data?.description || 'data processing'} with configurable parameters.`
      case UserExpertiseLevel.ADVANCED:
        return `${nodeType} node implementing ${nodeData.data?.description || 'business logic'} with error handling and performance optimization.`
      case UserExpertiseLevel.TECHNICAL:
        return `${nodeType} component: ${JSON.stringify(nodeData.data || {}, null, 2)}`
      default:
        return `This is a ${nodeType} component in your workflow.`
    }
  }

  private generateHumanFriendlyName(nodeData: any): string {
    if (nodeData.data?.name) return nodeData.data.name
    if (nodeData.data?.title) return nodeData.data.title

    const type = nodeData.type || 'step'
    return `${type.charAt(0).toUpperCase() + type.slice(1)} Step`
  }

  private generateWhatItDoes(nodeData: any, level: UserExpertiseLevel): string {
    const description = nodeData.data?.description || 'processes information'

    switch (level) {
      case UserExpertiseLevel.NOVICE:
        return `This step ${description.toLowerCase()} to help complete your task.`
      case UserExpertiseLevel.TECHNICAL:
        return `Executes ${nodeData.type || 'generic'} operation: ${description}`
      default:
        return `This component ${description.toLowerCase()}.`
    }
  }

  private generateWhyItMatters(nodeData: any, level: UserExpertiseLevel): string {
    switch (level) {
      case UserExpertiseLevel.NOVICE:
        return "Without this step, the workflow wouldn't work properly."
      case UserExpertiseLevel.BEGINNER:
        return "This step is essential for achieving the workflow's goals."
      default:
        return "This component is critical for the workflow's overall success and data integrity."
    }
  }

  private generateHowItWorks(nodeData: any, level: UserExpertiseLevel): string {
    switch (level) {
      case UserExpertiseLevel.NOVICE:
        return 'It takes information, does something useful with it, and passes the result to the next step.'
      case UserExpertiseLevel.TECHNICAL:
        return `Implements ${nodeData.type || 'generic'} logic with configuration: ${JSON.stringify(nodeData.data || {})}`
      default:
        return 'It receives input data, processes it according to its configuration, and outputs the results.'
    }
  }

  // Additional helper methods would be implemented here for:
  // - generateInputDescription
  // - generateOutputDescription
  // - generateTransformationExplanation
  // - generateKeySettingsExplanations
  // - generateCommonPatterns
  // - generateTroubleshootingTips
  // - generateUsageContext
  // - generatePerformanceNarrative
  // - generateExecutionOrderExplanation
  // - generateDecisionPointsExplanation
  // - generateParallelProcessingExplanation
  // - generateCriticalPathExplanation
  // And many more...

  private generateFallbackNarrative(
    workflowData: any,
    userExpertiseLevel: UserExpertiseLevel
  ): WorkflowNarrative {
    return {
      workflowId: workflowData.id,
      title: workflowData.name || 'Workflow',
      overview: {
        [UserExpertiseLevel.NOVICE]: 'This workflow helps you accomplish a task automatically.',
        [UserExpertiseLevel.BEGINNER]: 'This workflow automates a process for you.',
        [UserExpertiseLevel.INTERMEDIATE]:
          'This workflow provides automated processing capabilities.',
        [UserExpertiseLevel.ADVANCED]: 'This workflow implements automated business logic.',
        [UserExpertiseLevel.TECHNICAL]: 'This workflow provides programmable automation.',
      },
      story: {
        introduction: 'This workflow helps automate your tasks.',
        problemStatement: 'Manual processes can be time-consuming and error-prone.',
        solution: 'This workflow automates the process for consistency and efficiency.',
        expectedOutcome: 'Completed processing with reliable results.',
        successCriteria: ['Process completes successfully', 'Results meet quality standards'],
      },
      nodeNarratives: [],
      flowNarrative: {
        executionOrder: 'Steps execute in sequential order.',
        decisionPoints: [],
        parallelProcessing: [],
        criticalPath: 'All steps are part of the critical path.',
      },
      usageContext: {
        commonUseCases: ['General automation'],
        businessValue: 'Increased efficiency and consistency',
        userBenefits: ['Time savings', 'Reduced errors'],
        frequentQuestions: [],
      },
      performance: {
        typicalExecutionTime: 'Varies based on complexity',
        scalabilityNotes: 'Performance depends on individual components',
        resourceConsumption: 'Moderate resource usage expected',
        optimizationTips: ['Monitor execution times', 'Optimize individual components'],
      },
      adaptationMetadata: {
        lastUpdated: new Date(),
        generationContext: {
          userExpertiseLevel,
          narrativeStyle: NarrativeStyle.PROFESSIONAL,
          customizations: {},
        },
      },
    }
  }

  // Additional utility methods for generating specific narrative components...
  private generateProblemStatement(workflowData: any, level: UserExpertiseLevel): string {
    switch (level) {
      case UserExpertiseLevel.NOVICE:
        return "Sometimes tasks take a long time to do by hand, and it's easy to make mistakes."
      default:
        return "Manual processes are inefficient, error-prone, and don't scale well."
    }
  }

  private generateSolutionDescription(workflowData: any, level: UserExpertiseLevel): string {
    const nodeCount = workflowData.nodes?.length || 0
    switch (level) {
      case UserExpertiseLevel.NOVICE:
        return `This smart workflow does ${nodeCount} different things automatically, so you don't have to.`
      default:
        return `This ${nodeCount}-step automated workflow handles the entire process reliably and efficiently.`
    }
  }

  private generateExpectedOutcome(workflowData: any, level: UserExpertiseLevel): string {
    switch (level) {
      case UserExpertiseLevel.NOVICE:
        return 'your task completed successfully without you having to do all the work manually'
      default:
        return 'processed data and completed tasks according to specified requirements'
    }
  }

  private generateSuccessCriteria(workflowData: any, level: UserExpertiseLevel): string[] {
    return [
      'All workflow steps complete without errors',
      'Output data meets quality standards',
      'Processing time falls within expected ranges',
      'All validations pass successfully',
    ]
  }

  private generateInputDescription(nodeData: any, level: UserExpertiseLevel): string {
    return 'Receives data from the previous step or external source'
  }

  private generateOutputDescription(nodeData: any, level: UserExpertiseLevel): string {
    return 'Produces processed data for the next step or final output'
  }

  private generateTransformationExplanation(nodeData: any, level: UserExpertiseLevel): string {
    return 'Transforms input data according to configured business rules'
  }

  private generateKeySettingsExplanations(
    nodeData: any,
    level: UserExpertiseLevel
  ): Array<{ setting: string; explanation: string; impact: string }> {
    return []
  }

  private generateCommonPatterns(nodeData: any): string[] {
    return ['Standard configuration', 'Common use case patterns']
  }

  private generateTroubleshootingTips(nodeData: any, level: UserExpertiseLevel): string[] {
    return ['Check input data quality', 'Verify configuration settings']
  }

  private estimateExecutionDuration(nodeData: any): string {
    return 'Typically completes in seconds to minutes'
  }

  private describeResourceRequirements(nodeData: any, level: UserExpertiseLevel): string {
    return 'Moderate CPU and memory usage'
  }

  private generateDependencyExplanation(nodeData: any, level: UserExpertiseLevel): string {
    return 'Depends on successful completion of previous steps'
  }

  private generateErrorScenarios(nodeData: any, level: UserExpertiseLevel): string[] {
    return [
      'Input data validation failure',
      'Configuration errors',
      'External service unavailability',
    ]
  }

  private generateUsageContext(
    workflowData: any,
    level: UserExpertiseLevel
  ): Promise<WorkflowNarrative['usageContext']> {
    return Promise.resolve({
      commonUseCases: ['Data processing', 'Task automation', 'Business process optimization'],
      businessValue: 'Improved efficiency and consistency',
      userBenefits: ['Time savings', 'Reduced manual errors', 'Scalable processing'],
      frequentQuestions: [
        {
          question: 'How long does this workflow take to run?',
          answer: 'Execution time varies based on input data size and complexity.',
        },
      ],
    })
  }

  private generatePerformanceNarrative(
    workflowData: any,
    level: UserExpertiseLevel
  ): Promise<WorkflowNarrative['performance']> {
    return Promise.resolve({
      typicalExecutionTime: 'Minutes to hours depending on data volume',
      scalabilityNotes: 'Performance scales with available system resources',
      resourceConsumption: 'Moderate CPU and memory requirements',
      optimizationTips: [
        'Monitor execution times regularly',
        'Optimize data input formats',
        'Consider parallel processing for large datasets',
      ],
    })
  }

  private generateExecutionOrderExplanation(workflowData: any, level: UserExpertiseLevel): string {
    return 'Steps execute in the order defined by the workflow connections'
  }

  private generateDecisionPointsExplanation(
    workflowData: any,
    level: UserExpertiseLevel
  ): Array<{ nodeId: string; decision: string; possiblePaths: string[] }> {
    return []
  }

  private generateParallelProcessingExplanation(
    workflowData: any,
    level: UserExpertiseLevel
  ): string[] {
    return []
  }

  private generateCriticalPathExplanation(workflowData: any, level: UserExpertiseLevel): string {
    return 'The longest sequence of dependent steps determines overall execution time'
  }
}

/**
 * Singleton service instance
 */
export const naturalLanguageWorkflowRepresentation =
  new NaturalLanguageWorkflowRepresentationSystem()
