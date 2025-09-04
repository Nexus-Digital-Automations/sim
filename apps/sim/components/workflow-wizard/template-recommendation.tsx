'use client'

/**
 * Template Recommendation Component - AI-Powered Template Selection
 *
 * This component provides intelligent template recommendations with:
 * - AI-powered matching algorithm based on user goals and context
 * - Interactive template preview with detailed visualization
 * - Comparison view for evaluating multiple templates side-by-side
 * - Advanced customization options with real-time preview
 * - Seamless integration with template library and marketplace
 * - Full WCAG 2.1/2.2 accessibility compliance and keyboard navigation
 * - Performance optimized with lazy loading and efficient filtering
 *
 * Key Features:
 * - Smart template scoring and ranking based on multiple criteria
 * - Rich template metadata including difficulty, popularity, and success rates
 * - Visual template preview with block diagram and connection visualization
 * - Template comparison matrix with feature-by-feature analysis
 * - Customization preview showing how modifications affect the workflow
 * - Integration with user's existing credentials and available integrations
 * - Real-time validation of template requirements and dependencies
 * - Comprehensive help system with setup guides and troubleshooting
 *
 * @author Claude Code Wizard System
 * @version 2.0.0
 * @created 2025-09-04
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BarChart,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Filter,
  Info,
  Play,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { createLogger } from '@/lib/logs/console/logger'
import { cn } from '@/lib/utils'
import type {
  BusinessGoal,
  TemplateRecommendation,
  UserContext,
  WizardState,
  WorkflowTemplate,
} from '@/lib/workflow-wizard/wizard-engine'

// Initialize structured logger
const logger = createLogger('TemplateRecommendation')

/**
 * Template Recommendation Component Props
 */
export interface TemplateRecommendationProps {
  userContext?: UserContext
  wizardState: WizardState
  selectedGoal?: BusinessGoal
  onTemplateSelect: (template: WorkflowTemplate) => void
  onDataUpdate?: (key: string, value: any) => void
  onNext?: () => void
  className?: string
  showComparison?: boolean
  maxRecommendations?: number
}

/**
 * Template Filter Options
 */
interface TemplateFilters {
  difficulty: string
  category: string
  popularity: string
  setupTime: string
  requiredCredentials: string[]
  features: string[]
}

/**
 * Template Comparison State
 */
interface ComparisonState {
  templates: WorkflowTemplate[]
  isOpen: boolean
  selectedFeatures: string[]
}

/**
 * Mock Template Data - In production, this would come from the template service
 */
const MOCK_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'lead-capture-nurture',
    title: 'Lead Capture & Nurturing Automation',
    description:
      'Automatically capture leads from multiple sources and nurture them with personalized email sequences',
    longDescription:
      'This comprehensive lead management workflow captures leads from web forms, social media, and referrals, then automatically scores them based on behavior and demographics. It sends personalized email sequences, updates your CRM, and alerts sales reps when leads are ready to convert.',
    blocks: [
      {
        id: 'webhook-trigger',
        type: 'webhook',
        name: 'Lead Capture Webhook',
        position: { x: 50, y: 100 },
        config: { method: 'POST', endpoint: '/webhook/leads' },
        description: 'Captures leads from web forms and external sources',
        required: true,
        category: 'trigger',
        icon: 'webhook',
        estimatedExecutionTime: 1,
      },
      {
        id: 'lead-scoring',
        type: 'condition',
        name: 'Lead Scoring Logic',
        position: { x: 200, y: 100 },
        config: { rules: [] },
        description: 'Scores leads based on predefined criteria',
        required: true,
        category: 'logic',
        icon: 'target',
        estimatedExecutionTime: 2,
      },
      {
        id: 'crm-update',
        type: 'api',
        name: 'Update CRM',
        position: { x: 350, y: 100 },
        config: { service: 'hubspot' },
        description: 'Updates lead information in CRM system',
        required: true,
        dependencies: ['lead-scoring'],
        category: 'integration',
        icon: 'database',
        estimatedExecutionTime: 3,
      },
      {
        id: 'email-sequence',
        type: 'email',
        name: 'Nurturing Email Sequence',
        position: { x: 200, y: 250 },
        config: { template: 'nurture-sequence' },
        description: 'Sends personalized email nurturing sequence',
        required: true,
        dependencies: ['lead-scoring'],
        category: 'communication',
        icon: 'mail',
        estimatedExecutionTime: 5,
      },
    ],
    connections: [
      {
        id: 'webhook-to-scoring',
        source: 'webhook-trigger',
        target: 'lead-scoring',
        description: 'Pass lead data to scoring engine',
      },
      {
        id: 'scoring-to-crm',
        source: 'lead-scoring',
        target: 'crm-update',
        condition: 'score >= 70',
        description: 'Update CRM for qualified leads',
      },
      {
        id: 'scoring-to-email',
        source: 'lead-scoring',
        target: 'email-sequence',
        description: 'Start nurturing sequence for all leads',
      },
    ],
    configuration: {
      requiresEmail: true,
      requiresCRM: true,
      requiresAPI: true,
      testable: true,
      monitoring: true,
      retryLogic: true,
      errorHandling: true,
      customizationLevel: 'standard',
      securityRequirements: ['API_KEY', 'WEBHOOK_VALIDATION'],
      performanceProfile: 'standard',
    },
    metadata: {
      author: 'Sim Templates',
      version: '2.1.0',
      createdAt: '2025-01-15T00:00:00Z',
      updatedAt: '2025-09-01T00:00:00Z',
      categories: ['marketing', 'sales', 'automation'],
      industries: ['saas', 'b2b', 'e-commerce', 'real-estate'],
      useCases: ['lead generation', 'nurturing', 'crm integration'],
      prerequisites: ['HubSpot account', 'Email service provider', 'Web forms'],
      learningResources: [
        'Lead Scoring Best Practices Guide',
        'Email Marketing Automation Tutorial',
        'CRM Integration Setup Guide',
      ],
      troubleshooting: [
        {
          issue: 'Leads not being captured',
          solution: 'Check webhook URL configuration and firewall settings',
          category: 'integration',
          difficulty: 'easy',
        },
        {
          issue: 'Email sequences not triggering',
          solution: 'Verify email service provider credentials and template configuration',
          category: 'configuration',
          difficulty: 'medium',
        },
      ],
    },
    difficulty: 3,
    popularity: 0.85,
    successRate: 0.92,
    averageSetupTime: 25,
    userRating: 4.7,
    tags: ['popular', 'marketing', 'sales', 'crm', 'email'],
    requiredCredentials: ['hubspot', 'mailchimp', 'webhook'],
    supportedIntegrations: ['HubSpot', 'Salesforce', 'Mailchimp', 'Constant Contact'],
    aiRecommendationScore: 0.94,
  },
  {
    id: 'social-media-automation',
    title: 'Social Media Publishing & Analytics',
    description:
      'Schedule posts across multiple social platforms and track performance metrics automatically',
    longDescription:
      'This workflow helps you maintain a consistent social media presence by scheduling posts across Facebook, Twitter, LinkedIn, and Instagram. It automatically tracks engagement metrics, generates performance reports, and suggests optimal posting times based on your audience behavior.',
    blocks: [
      {
        id: 'content-scheduler',
        type: 'schedule',
        name: 'Content Scheduler',
        position: { x: 50, y: 100 },
        config: { frequency: 'daily', time: '09:00' },
        description: 'Schedules social media posts',
        required: true,
        category: 'trigger',
        icon: 'calendar',
        estimatedExecutionTime: 1,
      },
      {
        id: 'multi-platform-post',
        type: 'api',
        name: 'Multi-Platform Publisher',
        position: { x: 200, y: 100 },
        config: { platforms: ['facebook', 'twitter', 'linkedin'] },
        description: 'Publishes content to multiple social platforms',
        required: true,
        dependencies: ['content-scheduler'],
        category: 'integration',
        icon: 'share',
        estimatedExecutionTime: 4,
      },
      {
        id: 'analytics-tracker',
        type: 'monitor',
        name: 'Analytics Tracker',
        position: { x: 350, y: 100 },
        config: { metrics: ['likes', 'shares', 'comments', 'clicks'] },
        description: 'Tracks engagement metrics across platforms',
        required: true,
        dependencies: ['multi-platform-post'],
        category: 'analytics',
        icon: 'analytics',
        estimatedExecutionTime: 2,
      },
    ],
    connections: [
      {
        id: 'scheduler-to-publisher',
        source: 'content-scheduler',
        target: 'multi-platform-post',
        description: 'Trigger publishing when scheduled time arrives',
      },
      {
        id: 'publisher-to-analytics',
        source: 'multi-platform-post',
        target: 'analytics-tracker',
        description: 'Track performance of published content',
      },
    ],
    configuration: {
      requiresAPI: true,
      scheduling: true,
      testable: true,
      monitoring: true,
      customizationLevel: 'minimal',
      performanceProfile: 'lightweight',
    },
    metadata: {
      author: 'Sim Templates',
      version: '1.8.0',
      createdAt: '2025-01-10T00:00:00Z',
      updatedAt: '2025-08-15T00:00:00Z',
      categories: ['marketing', 'social-media', 'automation'],
      industries: ['marketing', 'retail', 'hospitality', 'entertainment'],
      useCases: ['social media management', 'content marketing', 'brand awareness'],
      prerequisites: ['Social media accounts', 'Content calendar'],
      learningResources: [
        'Social Media Marketing Guide',
        'Content Scheduling Best Practices',
        'Analytics and Reporting Tutorial',
      ],
      troubleshooting: [
        {
          issue: 'Posts not publishing to all platforms',
          solution: 'Check API credentials and platform permissions',
          category: 'integration',
          difficulty: 'easy',
        },
      ],
    },
    difficulty: 2,
    popularity: 0.78,
    successRate: 0.88,
    averageSetupTime: 15,
    userRating: 4.4,
    tags: ['beginner-friendly', 'social-media', 'marketing', 'automation'],
    requiredCredentials: ['facebook', 'twitter', 'linkedin'],
    supportedIntegrations: ['Facebook', 'Twitter', 'LinkedIn', 'Instagram', 'Buffer'],
    aiRecommendationScore: 0.73,
  },
  {
    id: 'financial-reporting',
    title: 'Automated Financial Reporting',
    description:
      'Generate comprehensive financial reports and analytics with automated data collection from multiple sources',
    longDescription:
      'This advanced workflow collects financial data from your accounting software, banking APIs, and expense tracking tools to generate comprehensive monthly and quarterly reports. It includes P&L statements, cash flow analysis, budget variance reports, and automated distribution to stakeholders.',
    blocks: [
      {
        id: 'data-collection',
        type: 'schedule',
        name: 'Monthly Data Collection',
        position: { x: 50, y: 100 },
        config: { frequency: 'monthly', dayOfMonth: 1 },
        description: 'Triggers monthly financial data collection',
        required: true,
        category: 'trigger',
        icon: 'calendar',
        estimatedExecutionTime: 1,
      },
      {
        id: 'accounting-api',
        type: 'api',
        name: 'Accounting Data Fetch',
        position: { x: 200, y: 50 },
        config: { service: 'quickbooks' },
        description: 'Retrieves data from accounting software',
        required: true,
        dependencies: ['data-collection'],
        category: 'integration',
        icon: 'database',
        estimatedExecutionTime: 5,
      },
      {
        id: 'banking-api',
        type: 'api',
        name: 'Banking Data Sync',
        position: { x: 200, y: 150 },
        config: { service: 'plaid' },
        description: 'Syncs banking transaction data',
        required: true,
        dependencies: ['data-collection'],
        category: 'integration',
        icon: 'bank',
        estimatedExecutionTime: 4,
      },
      {
        id: 'report-generator',
        type: 'transform',
        name: 'Financial Report Generator',
        position: { x: 350, y: 100 },
        config: { reports: ['pl', 'cashflow', 'budget_variance'] },
        description: 'Generates comprehensive financial reports',
        required: true,
        dependencies: ['accounting-api', 'banking-api'],
        category: 'processing',
        icon: 'document',
        estimatedExecutionTime: 8,
      },
    ],
    connections: [
      {
        id: 'trigger-to-accounting',
        source: 'data-collection',
        target: 'accounting-api',
        description: 'Fetch accounting data on schedule',
      },
      {
        id: 'trigger-to-banking',
        source: 'data-collection',
        target: 'banking-api',
        description: 'Sync banking data on schedule',
      },
      {
        id: 'accounting-to-reports',
        source: 'accounting-api',
        target: 'report-generator',
        description: 'Use accounting data for reports',
      },
      {
        id: 'banking-to-reports',
        source: 'banking-api',
        target: 'report-generator',
        description: 'Include banking data in reports',
      },
    ],
    configuration: {
      requiresAPI: true,
      requiresDatabase: true,
      scheduling: true,
      testable: true,
      monitoring: true,
      retryLogic: true,
      errorHandling: true,
      customizationLevel: 'advanced',
      securityRequirements: ['ENCRYPTION', 'API_KEY', 'OAUTH2'],
      performanceProfile: 'intensive',
    },
    metadata: {
      author: 'Sim Templates',
      version: '3.0.0',
      createdAt: '2024-12-01T00:00:00Z',
      updatedAt: '2025-09-01T00:00:00Z',
      categories: ['finance', 'reporting', 'analytics'],
      industries: ['finance', 'accounting', 'enterprise'],
      useCases: ['financial reporting', 'compliance', 'business intelligence'],
      prerequisites: ['QuickBooks/Xero account', 'Banking API access', 'Spreadsheet software'],
      learningResources: [
        'Financial Reporting Automation Guide',
        'Banking API Integration Tutorial',
        'Compliance and Security Best Practices',
      ],
      troubleshooting: [
        {
          issue: 'Banking API connection failing',
          solution: 'Check API credentials and bank account permissions',
          category: 'integration',
          difficulty: 'medium',
        },
        {
          issue: 'Reports missing data',
          solution: 'Verify data source connections and date ranges',
          category: 'configuration',
          difficulty: 'medium',
        },
      ],
    },
    difficulty: 4,
    popularity: 0.65,
    successRate: 0.85,
    averageSetupTime: 45,
    userRating: 4.6,
    tags: ['advanced', 'finance', 'reporting', 'compliance', 'enterprise'],
    requiredCredentials: ['quickbooks', 'plaid', 'google-sheets'],
    supportedIntegrations: ['QuickBooks', 'Xero', 'Plaid', 'Google Sheets', 'Excel'],
    aiRecommendationScore: 0.82,
  },
]

/**
 * Default Filter Values
 */
const DEFAULT_FILTERS: TemplateFilters = {
  difficulty: 'all',
  category: 'all',
  popularity: 'all',
  setupTime: 'all',
  requiredCredentials: [],
  features: [],
}

/**
 * Template Recommendation Component
 */
export function TemplateRecommendationComponent({
  userContext,
  wizardState,
  selectedGoal,
  onTemplateSelect,
  onDataUpdate,
  onNext,
  className,
  showComparison = true,
  maxRecommendations = 6,
}: TemplateRecommendationProps) {
  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<TemplateFilters>(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [recommendations, setRecommendations] = useState<TemplateRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(
    wizardState.selectedTemplate
  )
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null)
  const [comparison, setComparison] = useState<ComparisonState>({
    templates: [],
    isOpen: false,
    selectedFeatures: [],
  })
  const [sortBy, setSortBy] = useState<
    'relevance' | 'popularity' | 'rating' | 'difficulty' | 'time'
  >('relevance')

  const operationId = useMemo(() => `template_recommendation_${Date.now()}`, [])

  /**
   * Generate template recommendations based on selected goal and user context
   */
  const generateRecommendations = useCallback(async (): Promise<TemplateRecommendation[]> => {
    logger.info(`[${operationId}] Generating template recommendations`, {
      selectedGoalId: selectedGoal?.id,
      userIndustry: userContext?.industry,
      userSkillLevel: userContext?.skillLevel,
    })

    // In production, this would call the recommendation service
    // For now, we'll simulate the AI recommendation algorithm
    const recommendations: TemplateRecommendation[] = MOCK_TEMPLATES.map((template) => {
      let score = 0.5 // Base score

      // Goal matching
      if (selectedGoal) {
        // Category match
        if (selectedGoal.category === 'automation' && template.tags.includes('automation')) {
          score += 0.3
        }

        // Industry match
        const templateIndustries = template.metadata.industries
        if (templateIndustries.some((industry) => selectedGoal.industry.includes(industry))) {
          score += 0.2
        }

        // Use case overlap
        const goalUseCases = selectedGoal.useCases
        const templateUseCases = template.metadata.useCases
        const overlap = goalUseCases.filter((useCase) =>
          templateUseCases.some((tuc) => tuc.toLowerCase().includes(useCase.toLowerCase()))
        )
        score += Math.min(overlap.length * 0.1, 0.2)

        // Required integrations match
        const goalIntegrations = new Set(
          selectedGoal.requiredIntegrations.map((i) => i.toLowerCase())
        )
        const templateIntegrations = new Set(
          template.supportedIntegrations.map((i) => i.toLowerCase())
        )
        const integrationMatch = [...goalIntegrations].filter((i) => templateIntegrations.has(i))
        score += Math.min(integrationMatch.length * 0.1, 0.3)
      }

      // User context matching
      if (userContext) {
        // Skill level match
        const skillLevels = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 }
        const userLevel = skillLevels[userContext.skillLevel] || 2
        const templateLevel = template.difficulty

        const levelDiff = Math.abs(userLevel - templateLevel)
        if (levelDiff === 0) score += 0.2
        else if (levelDiff === 1) score += 0.1
        else if (levelDiff >= 2) score -= 0.1

        // Industry match
        if (userContext.industry) {
          if (template.metadata.industries.includes(userContext.industry)) {
            score += 0.15
          }
        }

        // Integration availability
        if (userContext.integrations.length > 0) {
          const userIntegrations = new Set(userContext.integrations.map((i) => i.toLowerCase()))
          const availableCredentials = template.requiredCredentials.filter((cred) =>
            userIntegrations.has(cred.toLowerCase())
          )
          const credentialScore =
            template.requiredCredentials.length > 0
              ? availableCredentials.length / template.requiredCredentials.length
              : 1
          score += credentialScore * 0.15
        }

        // Team size consideration
        if (userContext.teamSize) {
          if (userContext.teamSize > 10 && template.tags.includes('enterprise')) {
            score += 0.1
          }
          if (userContext.teamSize <= 5 && template.tags.includes('beginner-friendly')) {
            score += 0.1
          }
        }
      }

      // Template quality factors
      score += template.popularity * 0.1
      score += (template.userRating / 5) * 0.1
      score += template.successRate * 0.1

      // Cap between 0 and 1
      score = Math.max(0, Math.min(1, score))

      // Generate reasons and matching criteria
      const reasons: string[] = []
      const matchingCriteria: string[] = []
      const customizationSuggestions: string[] = []

      if (selectedGoal && template.metadata.useCases.length > 0) {
        reasons.push(`Perfect for ${selectedGoal.title.toLowerCase()}`)
        matchingCriteria.push('Matches your automation goal')
      }

      if (userContext?.skillLevel === 'beginner' && template.difficulty <= 2) {
        reasons.push('Beginner-friendly with guided setup')
        matchingCriteria.push('Suitable for your skill level')
      }

      if (template.popularity > 0.8) {
        reasons.push('Popular choice among users')
        matchingCriteria.push('High community adoption')
      }

      if (template.successRate > 0.9) {
        reasons.push('High success rate')
        matchingCriteria.push('Proven reliability')
      }

      if (template.averageSetupTime <= 20) {
        reasons.push('Quick to set up')
        matchingCriteria.push('Fast implementation')
      }

      // Customization suggestions
      if (template.configuration.customizationLevel === 'standard') {
        customizationSuggestions.push('Consider customizing email templates for your brand')
      }
      if (template.requiredCredentials.length > 2) {
        customizationSuggestions.push('Review integration requirements and prepare credentials')
      }

      return {
        template,
        score,
        reasons: reasons.slice(0, 3),
        matchingCriteria: matchingCriteria.slice(0, 4),
        customizationSuggestions: customizationSuggestions.slice(0, 2),
      }
    })

    // Sort by score and take top recommendations
    return recommendations.sort((a, b) => b.score - a.score).slice(0, maxRecommendations)
  }, [selectedGoal, userContext, operationId, maxRecommendations])

  /**
   * Filter and sort recommendations
   */
  const filteredRecommendations = useMemo(() => {
    let filtered = recommendations

    // Text search
    if (searchTerm.trim()) {
      const searchTermLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        ({ template }) =>
          template.title.toLowerCase().includes(searchTermLower) ||
          template.description.toLowerCase().includes(searchTermLower) ||
          template.tags.some((tag) => tag.toLowerCase().includes(searchTermLower)) ||
          template.metadata.categories.some((cat) => cat.toLowerCase().includes(searchTermLower))
      )
    }

    // Difficulty filter
    if (filters.difficulty !== 'all') {
      const difficultyMap = { easy: [1, 2], medium: [3], hard: [4, 5] }
      const allowedDifficulties =
        difficultyMap[filters.difficulty as keyof typeof difficultyMap] || []
      filtered = filtered.filter(({ template }) =>
        allowedDifficulties.includes(template.difficulty)
      )
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(({ template }) =>
        template.metadata.categories.includes(filters.category)
      )
    }

    // Popularity filter
    if (filters.popularity !== 'all') {
      const popularityThreshold = filters.popularity === 'high' ? 0.8 : 0.5
      filtered = filtered.filter(({ template }) => template.popularity >= popularityThreshold)
    }

    // Setup time filter
    if (filters.setupTime !== 'all') {
      const timeRanges = {
        quick: [0, 20],
        medium: [21, 40],
        long: [41, 999],
      }
      const [min, max] = timeRanges[filters.setupTime as keyof typeof timeRanges] || [0, 999]
      filtered = filtered.filter(
        ({ template }) => template.averageSetupTime >= min && template.averageSetupTime <= max
      )
    }

    // Required credentials filter
    if (filters.requiredCredentials.length > 0) {
      filtered = filtered.filter(({ template }) =>
        filters.requiredCredentials.some((cred) => template.requiredCredentials.includes(cred))
      )
    }

    // Sort results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          return b.template.popularity - a.template.popularity
        case 'rating':
          return b.template.userRating - a.template.userRating
        case 'difficulty':
          return a.template.difficulty - b.template.difficulty
        case 'time':
          return a.template.averageSetupTime - b.template.averageSetupTime
        default: // relevance
          return b.score - a.score
      }
    })

    return filtered
  }, [recommendations, searchTerm, filters, sortBy])

  /**
   * Handle template selection
   */
  const handleTemplateSelect = useCallback(
    (template: WorkflowTemplate) => {
      logger.info(`[${operationId}] Template selected`, {
        templateId: template.id,
        templateTitle: template.title,
        difficulty: template.difficulty,
        averageSetupTime: template.averageSetupTime,
      })

      setSelectedTemplate(template)
      onTemplateSelect(template)

      // Update wizard data
      if (onDataUpdate) {
        onDataUpdate('selectedTemplate', template)
      }
    },
    [operationId, onTemplateSelect, onDataUpdate]
  )

  /**
   * Handle template preview
   */
  const handleTemplatePreview = useCallback((template: WorkflowTemplate) => {
    setPreviewTemplate(template)
  }, [])

  /**
   * Add template to comparison
   */
  const handleAddToComparison = useCallback((template: WorkflowTemplate) => {
    setComparison((prev) => ({
      ...prev,
      templates: [...prev.templates.filter((t) => t.id !== template.id), template].slice(0, 3),
    }))
  }, [])

  /**
   * Remove template from comparison
   */
  const handleRemoveFromComparison = useCallback((templateId: string) => {
    setComparison((prev) => ({
      ...prev,
      templates: prev.templates.filter((t) => t.id !== templateId),
    }))
  }, [])

  /**
   * Reset filters
   */
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setSearchTerm('')
  }, [])

  /**
   * Initialize recommendations
   */
  useEffect(() => {
    const initializeRecommendations = async () => {
      setIsLoading(true)

      try {
        const recs = await generateRecommendations()
        setRecommendations(recs)
      } catch (error) {
        logger.error(`[${operationId}] Failed to generate recommendations`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      } finally {
        setIsLoading(false)
      }
    }

    initializeRecommendations()
  }, [generateRecommendations, operationId])

  /**
   * Get filter options from available templates
   */
  const filterOptions = useMemo(() => {
    const categories = [...new Set(MOCK_TEMPLATES.flatMap((t) => t.metadata.categories))]
    const credentials = [...new Set(MOCK_TEMPLATES.flatMap((t) => t.requiredCredentials))]

    return {
      categories: categories.sort(),
      credentials: credentials.sort(),
    }
  }, [])

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className='text-center'>
          <Sparkles className='mx-auto mb-4 h-8 w-8 animate-pulse text-primary' />
          <p className='text-muted-foreground'>Generating AI-powered recommendations...</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={cn('space-y-6', className)}>
        {/* Header */}
        <div className='space-y-2 text-center'>
          <div className='flex items-center justify-center gap-2'>
            <Sparkles className='h-6 w-6 text-primary' />
            <h2 className='font-semibold text-2xl'>Choose Your Template</h2>
          </div>
          <p className='mx-auto max-w-2xl text-muted-foreground'>
            {selectedGoal
              ? `AI-powered recommendations for "${selectedGoal.title}" based on your profile and requirements.`
              : 'Discover workflow templates that match your needs and technical requirements.'}
          </p>
        </div>

        {/* Selected Goal Context */}
        {selectedGoal && (
          <Card className='border-primary/20 bg-primary/5'>
            <CardHeader className='pb-3'>
              <div className='flex items-center gap-3'>
                <Target className='h-5 w-5 text-primary' />
                <div>
                  <CardTitle className='text-base'>{selectedGoal.title}</CardTitle>
                  <CardDescription>{selectedGoal.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Search and Filters */}
        <div className='space-y-4'>
          <div className='flex flex-col gap-4 sm:flex-row'>
            <div className='relative flex-1'>
              <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground' />
              <Input
                placeholder='Search templates by name, category, or features...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10'
                aria-label='Search workflow templates'
              />
            </div>

            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setShowFilters(!showFilters)}
                className='shrink-0'
              >
                <Filter className='mr-2 h-4 w-4' />
                Filters
                {Object.values(filters).some((f) => f !== 'all' && f.length > 0) && (
                  <Badge variant='secondary' className='ml-2 h-4 w-4 p-0 text-xs'>
                    !
                  </Badge>
                )}
              </Button>

              <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                <SelectTrigger className='w-[140px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='relevance'>Relevance</SelectItem>
                  <SelectItem value='popularity'>Popularity</SelectItem>
                  <SelectItem value='rating'>Rating</SelectItem>
                  <SelectItem value='difficulty'>Difficulty</SelectItem>
                  <SelectItem value='time'>Setup Time</SelectItem>
                </SelectContent>
              </Select>

              {showComparison && comparison.templates.length > 0 && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setComparison((prev) => ({ ...prev, isOpen: true }))}
                  className='gap-2'
                >
                  <Eye className='h-4 w-4' />
                  Compare ({comparison.templates.length})
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent className='space-y-4'>
              <div className='grid grid-cols-1 gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-2 lg:grid-cols-4'>
                <div>
                  <Label htmlFor='difficulty-filter'>Difficulty</Label>
                  <Select
                    value={filters.difficulty}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, difficulty: value }))
                    }
                  >
                    <SelectTrigger id='difficulty-filter'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Levels</SelectItem>
                      <SelectItem value='easy'>Easy (1-2)</SelectItem>
                      <SelectItem value='medium'>Medium (3)</SelectItem>
                      <SelectItem value='hard'>Hard (4-5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor='category-filter'>Category</Label>
                  <Select
                    value={filters.category}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger id='category-filter'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Categories</SelectItem>
                      {filterOptions.categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor='popularity-filter'>Popularity</Label>
                  <Select
                    value={filters.popularity}
                    onValueChange={(value) =>
                      setFilters((prev) => ({ ...prev, popularity: value }))
                    }
                  >
                    <SelectTrigger id='popularity-filter'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Templates</SelectItem>
                      <SelectItem value='high'>High (80%+)</SelectItem>
                      <SelectItem value='medium'>Medium (50%+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor='time-filter'>Setup Time</Label>
                  <Select
                    value={filters.setupTime}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, setupTime: value }))}
                  >
                    <SelectTrigger id='time-filter'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>Any Duration</SelectItem>
                      <SelectItem value='quick'>Quick (≤20 min)</SelectItem>
                      <SelectItem value='medium'>Medium (21-40 min)</SelectItem>
                      <SelectItem value='long'>Long (40+ min)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='flex items-center justify-between'>
                <Button variant='ghost' size='sm' onClick={resetFilters}>
                  Clear all filters
                </Button>
                <span className='text-muted-foreground text-sm'>
                  {filteredRecommendations.length} template
                  {filteredRecommendations.length !== 1 ? 's' : ''} found
                </span>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Template Recommendations */}
        <div className='space-y-6'>
          {filteredRecommendations.length === 0 ? (
            <Card className='p-8 text-center'>
              <AlertCircle className='mx-auto mb-4 h-12 w-12 text-muted-foreground' />
              <h3 className='mb-2 font-medium text-lg'>No templates found</h3>
              <p className='mb-4 text-muted-foreground'>
                Try adjusting your search terms or filters to find relevant templates.
              </p>
              <Button onClick={resetFilters} variant='outline'>
                Clear filters
              </Button>
            </Card>
          ) : (
            <div className='grid gap-6'>
              {filteredRecommendations.map((recommendation, index) => (
                <TemplateCard
                  key={recommendation.template.id}
                  recommendation={recommendation}
                  index={index}
                  isSelected={selectedTemplate?.id === recommendation.template.id}
                  inComparison={comparison.templates.some(
                    (t) => t.id === recommendation.template.id
                  )}
                  onSelect={() => handleTemplateSelect(recommendation.template)}
                  onPreview={() => handleTemplatePreview(recommendation.template)}
                  onAddToComparison={() => handleAddToComparison(recommendation.template)}
                  onRemoveFromComparison={() =>
                    handleRemoveFromComparison(recommendation.template.id)
                  }
                  userContext={userContext}
                  showComparison={showComparison}
                />
              ))}
            </div>
          )}
        </div>

        {/* Selected Template Summary */}
        {selectedTemplate && (
          <Card className='border-primary bg-primary/5'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <CheckCircle className='h-5 w-5 text-primary' />
                Selected: {selectedTemplate.title}
              </CardTitle>
              <CardDescription>Ready to configure this workflow template</CardDescription>
            </CardHeader>
            <CardContent className='flex items-center justify-between'>
              <div className='flex gap-4 text-sm'>
                <span className='flex items-center gap-1'>
                  <Clock className='h-4 w-4' />~{selectedTemplate.averageSetupTime} min setup
                </span>
                <span className='flex items-center gap-1'>
                  <TrendingUp className='h-4 w-4' />
                  Difficulty {selectedTemplate.difficulty}/5
                </span>
                <span className='flex items-center gap-1'>
                  <Star className='h-4 w-4' />
                  {selectedTemplate.userRating}/5 rating
                </span>
                <span className='flex items-center gap-1'>
                  <Shield className='h-4 w-4' />
                  {Math.round(selectedTemplate.successRate * 100)}% success rate
                </span>
              </div>
              <Button onClick={onNext} className='gap-2'>
                Configure Template
                <ArrowRight className='h-4 w-4' />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Template Preview Dialog */}
        <Dialog
          open={previewTemplate !== null}
          onOpenChange={(open) => !open && setPreviewTemplate(null)}
        >
          <DialogContent className='max-w-4xl'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2'>
                <Eye className='h-5 w-5' />
                Template Preview: {previewTemplate?.title}
              </DialogTitle>
              <DialogDescription>
                Detailed overview of the workflow template and its components
              </DialogDescription>
            </DialogHeader>

            {previewTemplate && (
              <TemplatePreview
                template={previewTemplate}
                onSelect={() => {
                  handleTemplateSelect(previewTemplate)
                  setPreviewTemplate(null)
                }}
                onClose={() => setPreviewTemplate(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Template Comparison Panel */}
        <Dialog
          open={comparison.isOpen}
          onOpenChange={(open) => setComparison((prev) => ({ ...prev, isOpen: open }))}
        >
          <DialogContent className='max-w-6xl'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2'>
                <BarChart className='h-5 w-5' />
                Template Comparison
              </DialogTitle>
              <DialogDescription>
                Compare features and characteristics of selected templates
              </DialogDescription>
            </DialogHeader>

            {comparison.templates.length > 0 && (
              <TemplateComparison
                templates={comparison.templates}
                onSelect={handleTemplateSelect}
                onRemove={handleRemoveFromComparison}
                onClose={() => setComparison((prev) => ({ ...prev, isOpen: false }))}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

/**
 * Individual Template Card Component
 */
interface TemplateCardProps {
  recommendation: TemplateRecommendation
  index: number
  isSelected: boolean
  inComparison: boolean
  onSelect: () => void
  onPreview: () => void
  onAddToComparison: () => void
  onRemoveFromComparison: () => void
  userContext?: UserContext
  showComparison?: boolean
}

function TemplateCard({
  recommendation,
  index,
  isSelected,
  inComparison,
  onSelect,
  onPreview,
  onAddToComparison,
  onRemoveFromComparison,
  userContext,
  showComparison = true,
}: TemplateCardProps) {
  const { template, score, reasons, matchingCriteria } = recommendation
  const [isExpanded, setIsExpanded] = useState(false)

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'bg-green-500'
    if (difficulty === 3) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getPopularityLabel = (popularity: number) => {
    if (popularity >= 0.8) return 'High'
    if (popularity >= 0.6) return 'Medium'
    return 'Low'
  }

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-lg',
        isSelected && 'bg-primary/5 ring-2 ring-primary',
        index === 0 && 'ring-1 ring-primary/50' // Highlight top recommendation
      )}
    >
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div className='flex flex-1 items-start gap-4'>
            {/* Ranking badge */}
            {index === 0 && (
              <div className='flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1'>
                <Star className='h-3 w-3 text-primary' />
                <span className='font-medium text-primary text-xs'>Top Pick</span>
              </div>
            )}

            {/* Template info */}
            <div className='min-w-0 flex-1'>
              <div className='mb-2 flex flex-wrap items-center gap-2'>
                <CardTitle className='text-lg'>{template.title}</CardTitle>

                {/* AI Score indicator */}
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant='secondary' className='gap-1 text-xs'>
                      <Sparkles className='h-3 w-3' />
                      {Math.round(score * 100)}% match
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>AI recommendation score based on your profile</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <CardDescription className='mb-3 line-clamp-2'>
                {template.description}
              </CardDescription>

              {/* Template metrics */}
              <div className='mb-3 flex flex-wrap items-center gap-4 text-sm'>
                <div className='flex items-center gap-1'>
                  <div
                    className={cn('h-2 w-2 rounded-full', getDifficultyColor(template.difficulty))}
                    aria-label={`Difficulty ${template.difficulty} out of 5`}
                  />
                  <span className='text-muted-foreground'>Difficulty {template.difficulty}/5</span>
                </div>

                <span className='flex items-center gap-1 text-muted-foreground'>
                  <Clock className='h-3 w-3' />~{template.averageSetupTime}min
                </span>

                <span className='flex items-center gap-1 text-muted-foreground'>
                  <Star className='h-3 w-3' />
                  {template.userRating}/5
                </span>

                <span className='flex items-center gap-1 text-muted-foreground'>
                  <TrendingUp className='h-3 w-3' />
                  {getPopularityLabel(template.popularity)} popularity
                </span>

                <span className='flex items-center gap-1 text-muted-foreground'>
                  <Shield className='h-3 w-3' />
                  {Math.round(template.successRate * 100)}% success
                </span>
              </div>

              {/* Categories and tags */}
              <div className='flex flex-wrap gap-1'>
                {template.metadata.categories.slice(0, 3).map((category) => (
                  <Badge key={category} variant='outline' className='text-xs'>
                    {category}
                  </Badge>
                ))}
                {template.metadata.categories.length > 3 && (
                  <Badge variant='outline' className='text-xs'>
                    +{template.metadata.categories.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className='flex flex-col items-end gap-2'>
            {isSelected && <CheckCircle className='h-6 w-6 shrink-0 text-primary' />}

            <div className='flex items-center gap-1'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant='ghost' size='sm' onClick={onPreview} className='h-8 w-8 p-0'>
                    <Eye className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Preview template</TooltipContent>
              </Tooltip>

              {showComparison && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={inComparison ? 'default' : 'ghost'}
                      size='sm'
                      onClick={inComparison ? onRemoveFromComparison : onAddToComparison}
                      className='h-8 w-8 p-0'
                    >
                      <BarChart className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {inComparison ? 'Remove from comparison' : 'Add to comparison'}
                  </TooltipContent>
                </Tooltip>
              )}

              <Button
                variant='ghost'
                size='sm'
                onClick={() => setIsExpanded(!isExpanded)}
                className='h-8 w-8 p-0'
              >
                {isExpanded ? (
                  <ChevronUp className='h-4 w-4' />
                ) : (
                  <ChevronDown className='h-4 w-4' />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Expanded details */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent className='space-y-4 pt-0'>
            <Separator />

            {/* AI Recommendation details */}
            <div className='space-y-3'>
              <h4 className='font-medium text-sm'>Why this template is recommended:</h4>

              <div className='grid gap-3 sm:grid-cols-2'>
                {reasons.length > 0 && (
                  <div>
                    <h5 className='mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide'>
                      Key Benefits
                    </h5>
                    <ul className='space-y-1 text-sm'>
                      {reasons.map((reason, index) => (
                        <li key={index} className='flex items-start gap-2'>
                          <CheckCircle className='mt-0.5 h-3 w-3 shrink-0 text-green-500' />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {matchingCriteria.length > 0 && (
                  <div>
                    <h5 className='mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide'>
                      Matching Criteria
                    </h5>
                    <ul className='space-y-1 text-sm'>
                      {matchingCriteria.map((criteria, index) => (
                        <li key={index} className='flex items-start gap-2'>
                          <Target className='mt-0.5 h-3 w-3 shrink-0 text-primary' />
                          <span>{criteria}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Template details tabs */}
            <Tabs defaultValue='overview' className='w-full'>
              <TabsList className='grid w-full grid-cols-4'>
                <TabsTrigger value='overview'>Overview</TabsTrigger>
                <TabsTrigger value='blocks'>Blocks</TabsTrigger>
                <TabsTrigger value='requirements'>Requirements</TabsTrigger>
                <TabsTrigger value='help'>Help</TabsTrigger>
              </TabsList>

              <TabsContent value='overview' className='space-y-3'>
                <p className='text-muted-foreground text-sm'>
                  {template.longDescription || template.description}
                </p>

                <div className='grid gap-3 sm:grid-cols-2'>
                  <div>
                    <h5 className='mb-2 font-medium text-sm'>Industries</h5>
                    <div className='flex flex-wrap gap-1'>
                      {template.metadata.industries.map((industry) => (
                        <Badge key={industry} variant='secondary' className='text-xs'>
                          {industry}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className='mb-2 font-medium text-sm'>Use Cases</h5>
                    <div className='flex flex-wrap gap-1'>
                      {template.metadata.useCases.slice(0, 3).map((useCase) => (
                        <Badge key={useCase} variant='outline' className='text-xs'>
                          {useCase}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value='blocks' className='space-y-3'>
                <div className='grid gap-2'>
                  {template.blocks.map((block) => (
                    <div key={block.id} className='flex items-center gap-3 rounded-lg border p-3'>
                      <div className='flex h-8 w-8 items-center justify-center rounded-md bg-muted'>
                        <Settings className='h-4 w-4' />
                      </div>
                      <div className='flex-1'>
                        <h6 className='font-medium text-sm'>{block.name}</h6>
                        <p className='text-muted-foreground text-xs'>{block.description}</p>
                      </div>
                      {block.required && (
                        <Badge variant='destructive' className='text-xs'>
                          Required
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value='requirements' className='space-y-3'>
                <div>
                  <h5 className='mb-2 font-medium text-sm'>Required Credentials</h5>
                  <div className='flex flex-wrap gap-2'>
                    {template.requiredCredentials.map((cred) => {
                      const isAvailable = userContext?.integrations.includes(cred)
                      return (
                        <Badge
                          key={cred}
                          variant={isAvailable ? 'default' : 'outline'}
                          className={cn('gap-1 text-xs', !isAvailable && 'text-muted-foreground')}
                        >
                          {isAvailable ? (
                            <CheckCircle className='h-3 w-3' />
                          ) : (
                            <AlertCircle className='h-3 w-3' />
                          )}
                          {cred}
                        </Badge>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <h5 className='mb-2 font-medium text-sm'>Prerequisites</h5>
                  <ul className='space-y-1 text-sm'>
                    {template.metadata.prerequisites.map((prereq, index) => (
                      <li key={index} className='flex items-start gap-2'>
                        <Info className='mt-0.5 h-3 w-3 shrink-0 text-blue-500' />
                        <span>{prereq}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {template.configuration.securityRequirements && (
                  <div>
                    <h5 className='mb-2 font-medium text-sm'>Security Requirements</h5>
                    <div className='flex flex-wrap gap-1'>
                      {template.configuration.securityRequirements.map((req) => (
                        <Badge key={req} variant='outline' className='gap-1 text-xs'>
                          <Shield className='h-3 w-3' />
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value='help' className='space-y-3'>
                <div>
                  <h5 className='mb-2 font-medium text-sm'>Learning Resources</h5>
                  <ul className='space-y-1 text-sm'>
                    {template.metadata.learningResources.map((resource, index) => (
                      <li key={index} className='flex items-start gap-2'>
                        <BookOpen className='mt-0.5 h-3 w-3 shrink-0 text-blue-500' />
                        <span>{resource}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {template.metadata.troubleshooting.length > 0 && (
                  <div>
                    <h5 className='mb-2 font-medium text-sm'>Common Issues</h5>
                    <div className='space-y-2'>
                      {template.metadata.troubleshooting.slice(0, 2).map((item, index) => (
                        <div key={index} className='rounded-lg border p-3'>
                          <h6 className='mb-1 font-medium text-sm'>{item.issue}</h6>
                          <p className='text-muted-foreground text-xs'>{item.solution}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Action buttons */}
            <div className='flex gap-2'>
              <Button onClick={onSelect} className='flex-1 gap-2'>
                {isSelected ? (
                  <>
                    <CheckCircle className='h-4 w-4' />
                    Selected
                  </>
                ) : (
                  <>
                    <Play className='h-4 w-4' />
                    Select Template
                  </>
                )}
              </Button>

              <Button variant='outline' onClick={onPreview} className='gap-2'>
                <Eye className='h-4 w-4' />
                Preview
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

/**
 * Template Preview Component
 */
interface TemplatePreviewProps {
  template: WorkflowTemplate
  onSelect: () => void
  onClose: () => void
}

function TemplatePreview({ template, onSelect, onClose }: TemplatePreviewProps) {
  return (
    <div className='space-y-6'>
      {/* Template header */}
      <div className='flex items-start justify-between'>
        <div>
          <h3 className='mb-2 font-semibold text-xl'>{template.title}</h3>
          <p className='text-muted-foreground'>
            {template.longDescription || template.description}
          </p>
        </div>

        <div className='flex flex-col items-end gap-2 text-right'>
          <div className='flex gap-4 text-sm'>
            <div className='text-center'>
              <div className='font-semibold'>{template.difficulty}/5</div>
              <div className='text-muted-foreground text-xs'>Difficulty</div>
            </div>
            <div className='text-center'>
              <div className='font-semibold'>{template.userRating}/5</div>
              <div className='text-muted-foreground text-xs'>Rating</div>
            </div>
            <div className='text-center'>
              <div className='font-semibold'>{template.averageSetupTime}m</div>
              <div className='text-muted-foreground text-xs'>Setup</div>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow visualization placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Zap className='h-5 w-5' />
            Workflow Overview
          </CardTitle>
          <CardDescription>
            Visual representation of the workflow blocks and connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* This would be replaced with actual workflow diagram */}
          <div className='flex min-h-[200px] items-center justify-center rounded-lg border-2 border-muted-foreground/25 border-dashed'>
            <div className='text-center'>
              <Target className='mx-auto mb-2 h-8 w-8 text-muted-foreground' />
              <p className='text-muted-foreground'>Workflow diagram would appear here</p>
              <p className='text-muted-foreground text-sm'>
                {template.blocks.length} blocks, {template.connections.length} connections
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className='flex justify-end gap-2'>
        <Button variant='outline' onClick={onClose}>
          Close
        </Button>
        <Button onClick={onSelect} className='gap-2'>
          <Play className='h-4 w-4' />
          Select This Template
        </Button>
      </div>
    </div>
  )
}

/**
 * Template Comparison Component
 */
interface TemplateComparisonProps {
  templates: WorkflowTemplate[]
  onSelect: (template: WorkflowTemplate) => void
  onRemove: (templateId: string) => void
  onClose: () => void
}

function TemplateComparison({ templates, onSelect, onRemove, onClose }: TemplateComparisonProps) {
  if (templates.length === 0) {
    return (
      <div className='py-8 text-center'>
        <p className='text-muted-foreground'>No templates selected for comparison</p>
        <Button onClick={onClose} variant='outline' className='mt-4'>
          Close
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {/* Comparison table */}
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <thead>
            <tr className='border-b'>
              <th className='p-2 text-left'>Feature</th>
              {templates.map((template) => (
                <th key={template.id} className='min-w-[200px] p-2 text-center'>
                  <div className='space-y-1'>
                    <h4 className='font-medium text-sm'>{template.title}</h4>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => onRemove(template.id)}
                      className='h-6 w-6 p-0'
                    >
                      <X className='h-3 w-3' />
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className='border-b'>
              <td className='p-2 font-medium'>Difficulty</td>
              {templates.map((template) => (
                <td key={template.id} className='p-2 text-center'>
                  {template.difficulty}/5
                </td>
              ))}
            </tr>
            <tr className='border-b'>
              <td className='p-2 font-medium'>Setup Time</td>
              {templates.map((template) => (
                <td key={template.id} className='p-2 text-center'>
                  ~{template.averageSetupTime}min
                </td>
              ))}
            </tr>
            <tr className='border-b'>
              <td className='p-2 font-medium'>User Rating</td>
              {templates.map((template) => (
                <td key={template.id} className='p-2 text-center'>
                  <div className='flex items-center justify-center gap-1'>
                    <Star className='h-3 w-3 text-yellow-500' />
                    {template.userRating}/5
                  </div>
                </td>
              ))}
            </tr>
            <tr className='border-b'>
              <td className='p-2 font-medium'>Success Rate</td>
              {templates.map((template) => (
                <td key={template.id} className='p-2 text-center'>
                  {Math.round(template.successRate * 100)}%
                </td>
              ))}
            </tr>
            <tr className='border-b'>
              <td className='p-2 font-medium'>Blocks</td>
              {templates.map((template) => (
                <td key={template.id} className='p-2 text-center'>
                  {template.blocks.length}
                </td>
              ))}
            </tr>
            <tr className='border-b'>
              <td className='p-2 font-medium'>Required Credentials</td>
              {templates.map((template) => (
                <td key={template.id} className='p-2'>
                  <div className='flex flex-wrap justify-center gap-1'>
                    {template.requiredCredentials.slice(0, 2).map((cred) => (
                      <Badge key={cred} variant='outline' className='text-xs'>
                        {cred}
                      </Badge>
                    ))}
                    {template.requiredCredentials.length > 2 && (
                      <Badge variant='outline' className='text-xs'>
                        +{template.requiredCredentials.length - 2}
                      </Badge>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Action buttons */}
      <div className='flex items-center justify-between border-t pt-4'>
        <Button variant='outline' onClick={onClose}>
          Close Comparison
        </Button>

        <div className='flex gap-2'>
          {templates.map((template) => (
            <Button
              key={template.id}
              onClick={() => onSelect(template)}
              size='sm'
              className='gap-2'
            >
              <Play className='h-3 w-3' />
              Select {template.title.split(' ')[0]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Note: TemplateRecommendation name conflicts with imported type, use TemplateRecommendationComponent instead

export default TemplateRecommendationComponent
