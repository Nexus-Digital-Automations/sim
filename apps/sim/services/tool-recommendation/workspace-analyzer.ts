/**
 * Workspace Pattern Analyzer
 *
 * Analyzes workspace-specific tool usage patterns, team collaboration patterns,
 * workflow efficiencies, and organizational standards to provide contextual
 * team-aware tool recommendations.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  IntegrationPattern,
  SeasonalityPattern,
  UserBehaviorProfile,
  WorkflowPattern,
  WorkspacePattern,
  WorkspaceToolStats,
} from './types'

const logger = createLogger('WorkspaceAnalyzer')

interface TeamMember {
  userId: string
  role: string
  joinDate: Date
  toolUsage: Record<string, number>
  collaborationScore: number
}

interface WorkspaceMetrics {
  totalUsers: number
  activeUsers: number
  toolAdoptionRate: number
  workflowEfficiency: number
  collaborationIndex: number
  innovationScore: number
}

export class WorkspaceAnalyzer {
  private workspacePatterns: Map<string, WorkspacePattern>
  private teamMembers: Map<string, TeamMember[]>
  private workflowTemplates: Map<string, WorkflowPattern[]>
  private seasonalityCache: Map<string, SeasonalityPattern[]>

  constructor() {
    this.workspacePatterns = new Map()
    this.teamMembers = new Map()
    this.workflowTemplates = new Map()
    this.seasonalityCache = new Map()
  }

  /**
   * Analyze workspace patterns and generate insights
   */
  async analyzeWorkspace(workspaceId: string): Promise<WorkspacePattern> {
    logger.info(`Analyzing workspace patterns for ${workspaceId}`)

    let pattern = this.workspacePatterns.get(workspaceId)

    if (!pattern) {
      pattern = await this.generateWorkspacePattern(workspaceId)
      this.workspacePatterns.set(workspaceId, pattern)
    }

    // Update with fresh data
    await this.refreshWorkspaceData(pattern)

    return pattern
  }

  /**
   * Add team member to workspace analysis
   */
  addTeamMember(
    workspaceId: string,
    userId: string,
    role: string,
    profile: UserBehaviorProfile
  ): void {
    const members = this.teamMembers.get(workspaceId) || []

    const existingMemberIndex = members.findIndex((m) => m.userId === userId)
    const collaborationScore = this.calculateCollaborationScore(profile)

    const member: TeamMember = {
      userId,
      role,
      joinDate: existingMemberIndex === -1 ? new Date() : members[existingMemberIndex].joinDate,
      toolUsage: Object.fromEntries(
        Object.entries(profile.toolFamiliarity).map(([toolId, familiarity]) => [
          toolId,
          familiarity.usageCount,
        ])
      ),
      collaborationScore,
    }

    if (existingMemberIndex === -1) {
      members.push(member)
    } else {
      members[existingMemberIndex] = member
    }

    this.teamMembers.set(workspaceId, members)
    logger.debug(`Added/updated team member ${userId} in workspace ${workspaceId}`)
  }

  /**
   * Analyze tool adoption patterns across the workspace
   */
  async analyzeToolAdoption(workspaceId: string): Promise<{
    adoptionRate: Record<string, number>
    championUsers: Record<string, string[]>
    resistancePoints: string[]
    rolloutRecommendations: string[]
  }> {
    const members = this.teamMembers.get(workspaceId) || []
    const adoptionRate: Record<string, number> = {}
    const championUsers: Record<string, string[]> = {}
    const resistancePoints: string[] = []

    // Calculate adoption rates for each tool
    const allTools = new Set<string>()
    for (const member of members) {
      Object.keys(member.toolUsage).forEach((toolId) => allTools.add(toolId))
    }

    for (const toolId of allTools) {
      const usersWithTool = members.filter((m) => (m.toolUsage[toolId] || 0) > 0).length
      const rate = members.length > 0 ? usersWithTool / members.length : 0
      adoptionRate[toolId] = rate

      // Identify champions (high usage users)
      const champions = members.filter((m) => (m.toolUsage[toolId] || 0) > 50).map((m) => m.userId)

      if (champions.length > 0) {
        championUsers[toolId] = champions
      }

      // Identify resistance points (low adoption despite availability)
      if (rate < 0.3 && usersWithTool > 0) {
        resistancePoints.push(toolId)
      }
    }

    const rolloutRecommendations = this.generateRolloutRecommendations(
      adoptionRate,
      championUsers,
      resistancePoints
    )

    return {
      adoptionRate,
      championUsers,
      resistancePoints,
      rolloutRecommendations,
    }
  }

  /**
   * Identify common workflow patterns in the workspace
   */
  async identifyWorkflows(workspaceId: string): Promise<WorkflowPattern[]> {
    const members = this.teamMembers.get(workspaceId) || []
    const workflows: Map<string, WorkflowPattern> = new Map()

    // Analyze common tool sequences across team members
    for (const member of members) {
      const toolSequences = await this.extractMemberToolSequences(member.userId)

      for (const sequence of toolSequences) {
        const sequenceKey = sequence.join('->')
        let workflow = workflows.get(sequenceKey)

        if (!workflow) {
          workflow = {
            id: `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: this.generateWorkflowName(sequence),
            frequency: 0,
            tools: sequence,
            triggers: await this.identifyTriggers(sequence),
            outcomes: await this.identifyOutcomes(sequence),
            averageDuration: 0,
            userRoles: [],
          }
          workflows.set(sequenceKey, workflow)
        }

        workflow.frequency++
        if (!workflow.userRoles.includes(member.role)) {
          workflow.userRoles.push(member.role)
        }
      }
    }

    // Filter and sort workflows by significance
    const significantWorkflows = Array.from(workflows.values())
      .filter((w) => w.frequency >= 2) // Must be used by at least 2 people
      .sort((a, b) => b.frequency - a.frequency)

    this.workflowTemplates.set(workspaceId, significantWorkflows)
    return significantWorkflows
  }

  /**
   * Analyze integration opportunities
   */
  async analyzeIntegrations(workspaceId: string): Promise<{
    currentIntegrations: IntegrationPattern[]
    opportunities: IntegrationPattern[]
    recommendations: string[]
  }> {
    const members = this.teamMembers.get(workspaceId) || []
    const integrationMap = new Map<string, IntegrationPattern>()

    // Analyze tool co-usage patterns
    for (const member of members) {
      const tools = Object.keys(member.toolUsage)

      // Check all tool pairs for potential integrations
      for (let i = 0; i < tools.length; i++) {
        for (let j = i + 1; j < tools.length; j++) {
          const toolA = tools[i]
          const toolB = tools[j]
          const key = `${toolA}<->${toolB}`

          if (!integrationMap.has(key)) {
            integrationMap.set(key, {
              sourceToolId: toolA,
              targetToolId: toolB,
              frequency: 0,
              dataFlow: 'bidirectional',
              latency: 0,
              errorRate: 0,
            })
          }

          const integration = integrationMap.get(key)!
          integration.frequency++
        }
      }
    }

    const allIntegrations = Array.from(integrationMap.values())
    const currentIntegrations = allIntegrations.filter((i) => i.frequency >= 3)
    const opportunities = allIntegrations.filter((i) => i.frequency >= 2 && i.frequency < 3)

    const recommendations = this.generateIntegrationRecommendations(
      currentIntegrations,
      opportunities
    )

    return {
      currentIntegrations,
      opportunities,
      recommendations,
    }
  }

  /**
   * Detect seasonal usage patterns
   */
  async detectSeasonality(workspaceId: string): Promise<SeasonalityPattern[]> {
    const cached = this.seasonalityCache.get(workspaceId)
    if (cached) return cached

    const members = this.teamMembers.get(workspaceId) || []
    const seasonalityPatterns: SeasonalityPattern[] = []

    // Simulate seasonal pattern detection
    // In production, this would analyze historical usage data
    const patterns: SeasonalityPattern[] = [
      {
        period: 'weekly',
        tools: ['outlook_send', 'microsoft_teams_write_chat', 'google_calendar_create'],
        peakUsage: [new Date('2024-01-08'), new Date('2024-01-15')], // Mondays
        variance: 0.3,
      },
      {
        period: 'monthly',
        tools: ['google_sheets_read', 'postgresql_query', 'supabase_query'],
        peakUsage: [new Date('2024-01-31'), new Date('2024-02-29')], // Month-end
        variance: 0.5,
      },
      {
        period: 'quarterly',
        tools: ['notion_query_database', 'google_docs_create', 'typeform_insights'],
        peakUsage: [new Date('2024-03-31'), new Date('2024-06-30')], // Quarter-end
        variance: 0.7,
      },
    ]

    this.seasonalityCache.set(workspaceId, patterns)
    return patterns
  }

  /**
   * Calculate workspace health metrics
   */
  async calculateWorkspaceMetrics(workspaceId: string): Promise<WorkspaceMetrics> {
    const members = this.teamMembers.get(workspaceId) || []
    const workflows = await this.identifyWorkflows(workspaceId)
    const { adoptionRate } = await this.analyzeToolAdoption(workspaceId)

    const totalUsers = members.length
    const activeUsers = members.filter((m) =>
      Object.values(m.toolUsage).some((count) => count > 0)
    ).length

    const toolAdoptionRate =
      Object.values(adoptionRate).reduce((sum, rate) => sum + rate, 0) /
        Object.keys(adoptionRate).length || 0

    const workflowEfficiency =
      workflows.length > 0
        ? workflows.reduce((sum, w) => sum + w.frequency, 0) / workflows.length / totalUsers
        : 0

    const collaborationIndex =
      members.length > 0
        ? members.reduce((sum, m) => sum + m.collaborationScore, 0) / members.length
        : 0

    const innovationScore = this.calculateInnovationScore(members, adoptionRate)

    return {
      totalUsers,
      activeUsers,
      toolAdoptionRate,
      workflowEfficiency,
      collaborationIndex,
      innovationScore,
    }
  }

  /**
   * Generate workspace-specific tool recommendations
   */
  async generateWorkspaceRecommendations(workspaceId: string): Promise<{
    toolRecommendations: string[]
    workflowRecommendations: string[]
    trainingRecommendations: string[]
    integrationRecommendations: string[]
  }> {
    const pattern = await this.analyzeWorkspace(workspaceId)
    const { adoptionRate, resistancePoints } = await this.analyzeToolAdoption(workspaceId)
    const { opportunities } = await this.analyzeIntegrations(workspaceId)

    // Tool recommendations based on low adoption but high potential
    const toolRecommendations = Object.entries(adoptionRate)
      .filter(([, rate]) => rate > 0 && rate < 0.5)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([toolId]) => `Consider wider adoption of ${toolId}`)

    // Workflow recommendations
    const workflowRecommendations = pattern.commonWorkflows
      .filter((w) => w.frequency < 5)
      .map((w) => `Standardize workflow: ${w.name}`)

    // Training recommendations for resistance points
    const trainingRecommendations = resistancePoints
      .slice(0, 3)
      .map((toolId) => `Provide training for ${toolId} to improve adoption`)

    // Integration recommendations
    const integrationRecommendations = opportunities
      .slice(0, 3)
      .map((i) => `Consider integrating ${i.sourceToolId} with ${i.targetToolId}`)

    return {
      toolRecommendations,
      workflowRecommendations,
      trainingRecommendations,
      integrationRecommendations,
    }
  }

  /**
   * Private helper methods
   */
  private async generateWorkspacePattern(workspaceId: string): Promise<WorkspacePattern> {
    const members = this.teamMembers.get(workspaceId) || []

    return {
      workspaceId,
      industry: 'technology', // Default, would be determined from workspace settings
      teamSize: members.length,
      commonWorkflows: await this.identifyWorkflows(workspaceId),
      toolUsageStats: await this.calculateToolStats(workspaceId),
      integrationPoints: (await this.analyzeIntegrations(workspaceId)).currentIntegrations,
      seasonality: await this.detectSeasonality(workspaceId),
      complianceRequirements: [], // Would be loaded from workspace settings
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  private async refreshWorkspaceData(pattern: WorkspacePattern): Promise<void> {
    pattern.commonWorkflows = await this.identifyWorkflows(pattern.workspaceId)
    pattern.toolUsageStats = await this.calculateToolStats(pattern.workspaceId)
    pattern.integrationPoints = (
      await this.analyzeIntegrations(pattern.workspaceId)
    ).currentIntegrations
    pattern.updatedAt = new Date()
  }

  private calculateCollaborationScore(profile: UserBehaviorProfile): number {
    let score = 0.5 // Base score

    // Boost for collaboration indicators
    if (profile.collaborationStyle.sharesWorkflows) score += 0.2
    if (profile.collaborationStyle.mentorsOthers) score += 0.2
    if (profile.collaborationStyle.askForHelp === 'often') score += 0.1
    if (profile.collaborationStyle.teamRole === 'leader') score += 0.1

    return Math.min(1, score)
  }

  private async extractMemberToolSequences(userId: string): Promise<string[][]> {
    // Simulate tool sequence extraction
    // In production, this would analyze user's actual tool usage patterns
    const commonSequences = [
      ['gmail_read', 'notion_write', 'slack_message'],
      ['google_sheets_read', 'postgresql_query', 'google_docs_create'],
      ['github_repo_info', 'slack_message', 'jira_write'],
      ['outlook_read', 'microsoft_teams_write_chat'],
      ['typeform_responses', 'google_sheets_write', 'gmail_send'],
    ]

    // Return 1-2 random sequences per user
    const count = Math.floor(Math.random() * 2) + 1
    return commonSequences.slice(0, count)
  }

  private generateWorkflowName(tools: string[]): string {
    const nameMap: Record<string, string> = {
      gmail_read: 'Email',
      notion_write: 'Documentation',
      slack_message: 'Team Communication',
      google_sheets_read: 'Data Analysis',
      postgresql_query: 'Database Query',
      google_docs_create: 'Report Creation',
      github_repo_info: 'Code Review',
      jira_write: 'Task Management',
      outlook_read: 'Email Processing',
      microsoft_teams_write_chat: 'Team Chat',
    }

    const readable = tools.map((tool) => nameMap[tool] || tool).join(' → ')
    return readable.length > 50 ? `${readable.substring(0, 47)}...` : readable
  }

  private async identifyTriggers(tools: string[]): Promise<string[]> {
    // Simulate trigger identification based on tool types
    const triggers: string[] = []

    if (tools.some((t) => t.includes('email') || t.includes('outlook') || t.includes('gmail'))) {
      triggers.push('new_email_received')
    }

    if (tools.some((t) => t.includes('calendar'))) {
      triggers.push('scheduled_meeting')
    }

    if (tools.some((t) => t.includes('jira') || t.includes('linear'))) {
      triggers.push('task_assignment')
    }

    return triggers
  }

  private async identifyOutcomes(tools: string[]): Promise<string[]> {
    // Simulate outcome identification
    const outcomes: string[] = []

    if (tools.some((t) => t.includes('docs') || t.includes('notion'))) {
      outcomes.push('documentation_created')
    }

    if (tools.some((t) => t.includes('send') || t.includes('message'))) {
      outcomes.push('communication_sent')
    }

    if (tools.some((t) => t.includes('query') || t.includes('read'))) {
      outcomes.push('data_retrieved')
    }

    return outcomes
  }

  private generateRolloutRecommendations(
    adoptionRate: Record<string, number>,
    championUsers: Record<string, string[]>,
    resistancePoints: string[]
  ): string[] {
    const recommendations: string[] = []

    // High-adoption tools with champions
    const highAdoption = Object.entries(adoptionRate)
      .filter(([, rate]) => rate > 0.8)
      .filter(([toolId]) => championUsers[toolId])

    if (highAdoption.length > 0) {
      recommendations.push('Leverage existing champion users for peer training')
    }

    // Medium adoption tools
    const mediumAdoption = Object.entries(adoptionRate).filter(
      ([, rate]) => rate > 0.3 && rate < 0.8
    )

    if (mediumAdoption.length > 0) {
      recommendations.push('Focus training efforts on medium-adoption tools')
    }

    // Resistance points
    if (resistancePoints.length > 0) {
      recommendations.push('Investigate barriers to adoption for resistant tools')
      recommendations.push('Consider alternative tools for low-adoption items')
    }

    return recommendations
  }

  private generateIntegrationRecommendations(
    current: IntegrationPattern[],
    opportunities: IntegrationPattern[]
  ): string[] {
    const recommendations: string[] = []

    if (current.length > 0) {
      recommendations.push('Monitor existing integrations for performance issues')
    }

    if (opportunities.length > 0) {
      recommendations.push('Explore automation opportunities between frequently used tool pairs')
    }

    // Check for common integration patterns
    const hasDataFlow = opportunities.some(
      (o) => o.sourceToolId.includes('sheets') || o.targetToolId.includes('database')
    )

    if (hasDataFlow) {
      recommendations.push('Consider data pipeline automation for reporting workflows')
    }

    return recommendations
  }

  private async calculateToolStats(workspaceId: string): Promise<WorkspaceToolStats> {
    const members = this.teamMembers.get(workspaceId) || []
    const allTools = new Set<string>()
    const toolUsage = new Map<string, number>()

    for (const member of members) {
      for (const [toolId, usage] of Object.entries(member.toolUsage)) {
        allTools.add(toolId)
        toolUsage.set(toolId, (toolUsage.get(toolId) || 0) + usage)
      }
    }

    const activeTools = Array.from(toolUsage.entries()).filter(([, usage]) => usage > 0).length

    const mostUsed = Array.from(toolUsage.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([toolId, usage]) => ({ toolId, usage }))

    const leastUsed = Array.from(toolUsage.entries())
      .filter(([, usage]) => usage > 0)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 5)
      .map(([toolId, usage]) => ({ toolId, usage }))

    // Simplified category breakdown
    const categoryBreakdown: Record<string, number> = {
      communication: 0,
      database: 0,
      productivity: 0,
      development: 0,
      analytics: 0,
    }

    for (const [toolId, usage] of toolUsage.entries()) {
      if (toolId.includes('slack') || toolId.includes('teams') || toolId.includes('mail')) {
        categoryBreakdown.communication += usage
      } else if (
        toolId.includes('sql') ||
        toolId.includes('database') ||
        toolId.includes('mongo')
      ) {
        categoryBreakdown.database += usage
      } else if (
        toolId.includes('docs') ||
        toolId.includes('sheets') ||
        toolId.includes('notion')
      ) {
        categoryBreakdown.productivity += usage
      } else if (toolId.includes('github') || toolId.includes('jira')) {
        categoryBreakdown.development += usage
      } else {
        categoryBreakdown.analytics += usage
      }
    }

    return {
      totalTools: allTools.size,
      activeTools,
      mostUsed,
      leastUsed,
      categoryBreakdown,
      integrationHealth: Math.random() * 0.3 + 0.7, // Simulate health score
    }
  }

  private calculateInnovationScore(
    members: TeamMember[],
    adoptionRate: Record<string, number>
  ): number {
    // Base innovation on variety of tools and adoption speed
    const toolVariety = Object.keys(adoptionRate).length
    const averageAdoption =
      Object.values(adoptionRate).reduce((sum, rate) => sum + rate, 0) /
        Object.keys(adoptionRate).length || 0

    const varietyScore = Math.min(toolVariety / 50, 1) // Normalize to 0-1
    const adoptionScore = averageAdoption

    return (varietyScore + adoptionScore) / 2
  }

  /**
   * Get workspace insights summary
   */
  async getWorkspaceInsights(workspaceId: string): Promise<{
    metrics: WorkspaceMetrics
    topWorkflows: WorkflowPattern[]
    adoptionInsights: Record<string, any>
    recommendations: string[]
  }> {
    const metrics = await this.calculateWorkspaceMetrics(workspaceId)
    const workflows = await this.identifyWorkflows(workspaceId)
    const adoptionInsights = await this.analyzeToolAdoption(workspaceId)
    const recommendations = await this.generateWorkspaceRecommendations(workspaceId)

    return {
      metrics,
      topWorkflows: workflows.slice(0, 5),
      adoptionInsights,
      recommendations: [
        ...recommendations.toolRecommendations,
        ...recommendations.workflowRecommendations,
        ...recommendations.trainingRecommendations,
        ...recommendations.integrationRecommendations,
      ].slice(0, 10),
    }
  }
}

export const workspaceAnalyzer = new WorkspaceAnalyzer()
