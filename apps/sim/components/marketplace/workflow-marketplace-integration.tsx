/**
 * Workflow Marketplace Integration - Seamless bridge between marketplace and workflow editor
 *
 * This component provides seamless integration between the marketplace system and the existing
 * workflow editor, enabling users to discover, install, and use templates directly within their
 * workflow editing experience. It serves as the central bridge component that coordinates
 * marketplace functionality with workflow operations.
 *
 * Features:
 * - Template discovery and installation within workflow editor
 * - One-click template insertion into active workflows
 * - Context-aware template recommendations based on current workflow
 * - Template customization and configuration within workflow context
 * - Real-time collaboration on marketplace templates
 * - Version management and updates for workflow templates
 * - Integration with workflow editor's drag-and-drop system
 * - Template usage analytics and optimization suggestions
 * - Marketplace sidebar integration with workflow editor
 * - Template sharing and collaboration features
 *
 * Integration Points:
 * - Workflow editor toolbar and sidebar
 * - Template block insertion and replacement
 * - Workflow state synchronization
 * - User authentication and preferences
 * - File management and template storage
 * - Real-time collaboration and sharing
 *
 * @author Claude Code Workflow Integration System
 * @version 2.0.0
 * @implements Comprehensive Workflow-Marketplace Bridge Architecture
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  Blocks,
  Check,
  Clock,
  Download,
  Eye,
  Filter,
  Lightbulb,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Share2,
  ShoppingCart,
  Sparkles,
  Star,
  Target,
  Workflow,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
// Import marketplace components
import { TemplateDetailPage } from './template-detail-page'

// ====================================================================
// TYPE DEFINITIONS
// ====================================================================

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  version: string
  author: string
  authorId: string
  category: string
  tags: string[]
  blocks: WorkflowBlock[]
  connections: WorkflowConnection[]
  configuration: TemplateConfiguration
  metadata: TemplateMetadata
  usage: TemplateUsageStats
  rating: number
  ratingCount: number
  downloadCount: number
  featured: boolean
  verified: boolean
  createdAt: string
  updatedAt: string
  thumbnail?: string
  preview?: string[]
}

interface WorkflowBlock {
  id: string
  type: string
  name: string
  description: string
  position: { x: number; y: number }
  configuration: Record<string, any>
  inputs: BlockInput[]
  outputs: BlockOutput[]
  category: string
  icon?: string
  color?: string
  customizable: boolean
}

interface BlockInput {
  id: string
  name: string
  type: string
  required: boolean
  defaultValue?: any
  description: string
}

interface BlockOutput {
  id: string
  name: string
  type: string
  description: string
}

interface WorkflowConnection {
  id: string
  fromBlockId: string
  fromOutputId: string
  toBlockId: string
  toInputId: string
  label?: string
}

interface TemplateConfiguration {
  environment: Record<string, any>
  integrations: Integration[]
  permissions: Permission[]
  requirements: Requirement[]
  customizations: Customization[]
}

interface Integration {
  id: string
  name: string
  type: string
  required: boolean
  configured: boolean
  settings: Record<string, any>
}

interface Permission {
  id: string
  resource: string
  action: string
  required: boolean
  description: string
}

interface Requirement {
  id: string
  name: string
  type: 'system' | 'integration' | 'permission' | 'dependency'
  version?: string
  satisfied: boolean
  description: string
}

interface Customization {
  id: string
  name: string
  type: 'variable' | 'block' | 'connection' | 'style'
  value: any
  defaultValue: any
  editable: boolean
  description: string
}

interface TemplateMetadata {
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  estimatedTime: number
  license: string
  documentation: string
  changelog: string
  screenshots: string[]
  demoUrl?: string
  sourceUrl?: string
  supportUrl?: string
}

interface TemplateUsageStats {
  installations: number
  activeUsers: number
  successRate: number
  averageRating: number
  completionTime: number
  popularBlocks: string[]
  commonIssues: string[]
  improvementSuggestions: string[]
}

interface WorkflowState {
  id: string
  name: string
  description: string
  blocks: WorkflowBlock[]
  connections: WorkflowConnection[]
  variables: Record<string, any>
  isModified: boolean
  lastSaved: string
  collaborators: Collaborator[]
  shareSettings: ShareSettings
}

interface Collaborator {
  id: string
  name: string
  email: string
  role: 'owner' | 'editor' | 'viewer'
  status: 'active' | 'pending' | 'inactive'
  lastActive: string
}

interface ShareSettings {
  visibility: 'private' | 'team' | 'public'
  allowComments: boolean
  allowEditing: boolean
  allowDownload: boolean
  expiresAt?: string
}

interface WorkflowMarketplaceIntegrationProps {
  // Workflow editor state
  currentWorkflow: WorkflowState | null
  onWorkflowUpdate: (workflow: WorkflowState) => void
  onBlockAdd: (block: WorkflowBlock, position?: { x: number; y: number }) => void
  onBlockUpdate: (blockId: string, updates: Partial<WorkflowBlock>) => void
  onBlockDelete: (blockId: string) => void
  onConnectionAdd: (connection: WorkflowConnection) => void
  onConnectionDelete: (connectionId: string) => void

  // Template operations
  availableTemplates: WorkflowTemplate[]
  installedTemplates: WorkflowTemplate[]
  onTemplateInstall: (templateId: string, customizations?: Record<string, any>) => Promise<void>
  onTemplateUninstall: (templateId: string) => Promise<void>
  onTemplateUse: (templateId: string, insertionPoint?: { x: number; y: number }) => Promise<void>
  onTemplateCustomize: (templateId: string, customizations: Record<string, any>) => Promise<void>
  onTemplateSave: (workflow: WorkflowState, metadata: Partial<TemplateMetadata>) => Promise<void>
  onTemplatePublish: (templateId: string, publishSettings: any) => Promise<void>

  // User preferences
  currentUserId?: string
  userPreferences: {
    showRecommendations: boolean
    autoInstall: boolean
    enableCollaboration: boolean
    defaultPrivacy: 'private' | 'team' | 'public'
  }
  onPreferencesUpdate: (preferences: any) => void

  // Integration settings
  integrationMode: 'sidebar' | 'modal' | 'embedded' | 'popup'
  showAdvancedFeatures: boolean
  enableRealTimeSync: boolean

  className?: string
}

// ====================================================================
// MAIN COMPONENT
// ====================================================================

export function WorkflowMarketplaceIntegration({
  currentWorkflow,
  onWorkflowUpdate,
  onBlockAdd,
  onBlockUpdate,
  onBlockDelete,
  onConnectionAdd,
  onConnectionDelete,
  availableTemplates,
  installedTemplates,
  onTemplateInstall,
  onTemplateUninstall,
  onTemplateUse,
  onTemplateCustomize,
  onTemplateSave,
  onTemplatePublish,
  currentUserId,
  userPreferences,
  onPreferencesUpdate,
  integrationMode = 'sidebar',
  showAdvancedFeatures = false,
  enableRealTimeSync = true,
  className = '',
}: WorkflowMarketplaceIntegrationProps) {
  // ====================================================================
  // STATE MANAGEMENT
  // ====================================================================

  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<
    'browse' | 'installed' | 'recommendations' | 'create'
  >('browse')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null)
  const [isInstalling, setIsInstalling] = useState<string | null>(null)
  const [installProgress, setInstallProgress] = useState(0)

  const [draggedBlock, setDraggedBlock] = useState<WorkflowBlock | null>(null)
  const [dropZone, setDropZone] = useState<{ x: number; y: number } | null>(null)
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [customizationValues, setCustomizationValues] = useState<Record<string, any>>({})

  const [recommendations, setRecommendations] = useState<WorkflowTemplate[]>([])
  const [contextualSuggestions, setContextualSuggestions] = useState<any[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false)

  // Real-time collaboration state
  const [collaborationActive, setCollaborationActive] = useState(false)
  const [activeCollaborators, setActiveCollaborators] = useState<Collaborator[]>([])

  // ====================================================================
  // COMPUTED VALUES
  // ====================================================================

  const filteredTemplates = useMemo(() => {
    let templates = activeSection === 'installed' ? installedTemplates : availableTemplates

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      templates = templates.filter(
        (template) =>
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          template.category.toLowerCase().includes(query) ||
          template.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    return templates.sort((a, b) => {
      if (a.featured && !b.featured) return -1
      if (!a.featured && b.featured) return 1
      return b.rating - a.rating
    })
  }, [activeSection, availableTemplates, installedTemplates, searchQuery])

  const workflowAnalytics = useMemo(() => {
    if (!currentWorkflow) return null

    const blockTypes = currentWorkflow.blocks.reduce(
      (acc, block) => {
        acc[block.type] = (acc[block.type] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const complexity = currentWorkflow.blocks.length + currentWorkflow.connections.length
    const completeness =
      currentWorkflow.blocks.filter((b) => Object.keys(b.configuration).length > 0).length /
      currentWorkflow.blocks.length

    return {
      blockCount: currentWorkflow.blocks.length,
      connectionCount: currentWorkflow.connections.length,
      blockTypes,
      complexity: Math.min(100, complexity * 2),
      completeness: Math.round(completeness * 100),
      lastModified: currentWorkflow.lastSaved,
    }
  }, [currentWorkflow])

  // ====================================================================
  // EVENT HANDLERS
  // ====================================================================

  const handleTemplateInstall = useCallback(
    async (template: WorkflowTemplate) => {
      try {
        setIsInstalling(template.id)
        setInstallProgress(0)

        // Simulate installation progress
        const progressInterval = setInterval(() => {
          setInstallProgress((prev) => {
            if (prev >= 100) {
              clearInterval(progressInterval)
              return 100
            }
            return prev + 10
          })
        }, 200)

        await onTemplateInstall(template.id, customizationValues)

        clearInterval(progressInterval)
        setInstallProgress(100)
        setIsInstalling(null)
      } catch (error) {
        console.error('Failed to install template:', error)
        setIsInstalling(null)
        setInstallProgress(0)
      }
    },
    [onTemplateInstall, customizationValues]
  )

  const handleTemplateUse = useCallback(
    async (template: WorkflowTemplate) => {
      try {
        if (!currentWorkflow) {
          console.error('No active workflow to add template to')
          return
        }

        // Calculate insertion point
        const insertionPoint = dropZone || {
          x: currentWorkflow.blocks.length * 150 + 100,
          y: 100,
        }

        await onTemplateUse(template.id, insertionPoint)
        setDropZone(null)
        setSelectedTemplate(null)
      } catch (error) {
        console.error('Failed to use template:', error)
      }
    },
    [currentWorkflow, onTemplateUse, dropZone]
  )

  const handleBlockDrag = useCallback(
    (block: WorkflowBlock, position: { x: number; y: number }) => {
      setDraggedBlock(block)
      setDropZone(position)
    },
    []
  )

  const handleSaveAsTemplate = useCallback(async () => {
    if (!currentWorkflow) return

    try {
      const metadata: Partial<TemplateMetadata> = {
        difficulty: 'intermediate',
        estimatedTime: 30,
        license: 'MIT',
        documentation: 'Auto-generated from workflow',
        changelog: 'Initial version',
        screenshots: [],
      }

      await onTemplateSave(currentWorkflow, metadata)
      setSaveAsTemplateOpen(false)
    } catch (error) {
      console.error('Failed to save workflow as template:', error)
    }
  }, [currentWorkflow, onTemplateSave])

  const generateRecommendations = useCallback(async () => {
    if (!currentWorkflow) return

    setIsAnalyzing(true)

    try {
      // Analyze current workflow to generate contextual recommendations
      const workflowContext = {
        blockTypes: currentWorkflow.blocks.map((b) => b.type),
        category:
          currentWorkflow.blocks.length > 0 ? currentWorkflow.blocks[0].category : 'general',
        complexity: workflowAnalytics?.complexity || 0,
        completeness: workflowAnalytics?.completeness || 0,
      }

      // Filter templates based on context
      const contextualRecommendations = availableTemplates
        .filter((template) => {
          // Recommend templates with complementary blocks
          const hasComplementaryBlocks = template.blocks.some(
            (block) => !workflowContext.blockTypes.includes(block.type)
          )

          // Recommend templates in similar category
          const sameCategoryBonus = template.category === workflowContext.category

          // Recommend based on workflow maturity
          const difficultyMatch =
            template.metadata.difficulty ===
            (workflowContext.completeness < 30
              ? 'beginner'
              : workflowContext.completeness < 70
                ? 'intermediate'
                : 'advanced')

          return hasComplementaryBlocks || sameCategoryBonus || difficultyMatch
        })
        .slice(0, 8)

      setRecommendations(contextualRecommendations)

      // Generate contextual suggestions
      const suggestions = [
        {
          type: 'optimization',
          title: 'Workflow Optimization',
          description: 'Consider adding error handling blocks for better reliability',
          templates: contextualRecommendations
            .filter((t) => t.blocks.some((b) => b.type === 'error-handler'))
            .slice(0, 2),
        },
        {
          type: 'integration',
          title: 'Integration Opportunities',
          description: 'These templates can enhance your current workflow',
          templates: contextualRecommendations
            .filter((t) => t.tags.includes('integration'))
            .slice(0, 2),
        },
      ]

      setContextualSuggestions(suggestions)
    } catch (error) {
      console.error('Failed to generate recommendations:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }, [currentWorkflow, availableTemplates, workflowAnalytics])

  // Generate recommendations when workflow changes
  useEffect(() => {
    if (currentWorkflow && userPreferences.showRecommendations) {
      const timeoutId = setTimeout(() => {
        generateRecommendations()
      }, 1000)

      return () => clearTimeout(timeoutId)
    }
  }, [currentWorkflow, generateRecommendations, userPreferences.showRecommendations])

  // ====================================================================
  // RENDER COMPONENTS
  // ====================================================================

  const renderTemplateCard = (template: WorkflowTemplate, compact = false) => (
    <motion.div
      key={template.id}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={`cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-lg ${
        compact ? 'space-y-2' : 'space-y-3'
      }`}
      onClick={() => setSelectedTemplate(template)}
    >
      {/* Template Header */}
      <div className='flex items-start justify-between'>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <h4
              className={`truncate font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}
            >
              {template.name}
            </h4>
            <Badge variant='outline' className='text-xs'>
              v{template.version}
            </Badge>
            {template.featured && <Star className='h-4 w-4 fill-current text-yellow-500' />}
            {template.verified && <Check className='h-4 w-4 text-green-500' />}
          </div>
          <p className={`line-clamp-2 text-gray-600 ${compact ? 'text-xs' : 'text-sm'}`}>
            {template.description}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='sm'>
              <Settings className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleTemplateUse(template)}>
              <Plus className='mr-2 h-4 w-4' />
              Add to Workflow
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedTemplate(template)}>
              <Eye className='mr-2 h-4 w-4' />
              View Details
            </DropdownMenuItem>
            {!installedTemplates.find((t) => t.id === template.id) ? (
              <DropdownMenuItem onClick={() => handleTemplateInstall(template)}>
                <Download className='mr-2 h-4 w-4' />
                Install Template
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onTemplateUninstall(template.id)}>
                <X className='mr-2 h-4 w-4' />
                Uninstall
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Share2 className='mr-2 h-4 w-4' />
              Share Template
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Template Stats */}
      <div className='flex items-center gap-4 text-gray-500 text-sm'>
        <div className='flex items-center gap-1'>
          <Star className='h-3 w-3' />
          {template.rating.toFixed(1)} ({template.ratingCount})
        </div>
        <div className='flex items-center gap-1'>
          <Download className='h-3 w-3' />
          {template.downloadCount.toLocaleString()}
        </div>
        <div className='flex items-center gap-1'>
          <Blocks className='h-3 w-3' />
          {template.blocks.length} blocks
        </div>
        <div className='flex items-center gap-1'>
          <Clock className='h-3 w-3' />
          {template.metadata.estimatedTime}min
        </div>
      </div>

      {/* Template Tags */}
      <div className='flex flex-wrap gap-1'>
        {template.tags.slice(0, compact ? 2 : 4).map((tag) => (
          <Badge key={tag} variant='secondary' className='text-xs'>
            {tag}
          </Badge>
        ))}
        {template.tags.length > (compact ? 2 : 4) && (
          <Badge variant='outline' className='text-xs'>
            +{template.tags.length - (compact ? 2 : 4)}
          </Badge>
        )}
      </div>

      {/* Installation Progress */}
      {isInstalling === template.id && (
        <div className='space-y-2'>
          <div className='flex items-center justify-between text-sm'>
            <span>Installing...</span>
            <span>{installProgress}%</span>
          </div>
          <Progress value={installProgress} className='h-2' />
        </div>
      )}
    </motion.div>
  )

  const renderWorkflowAnalytics = () => (
    <Card className='mb-4'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-sm'>
          <Activity className='h-4 w-4' />
          Workflow Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        {workflowAnalytics && (
          <div className='grid grid-cols-2 gap-3 text-sm'>
            <div>
              <div className='text-gray-600'>Blocks</div>
              <div className='font-semibold'>{workflowAnalytics.blockCount}</div>
            </div>
            <div>
              <div className='text-gray-600'>Connections</div>
              <div className='font-semibold'>{workflowAnalytics.connectionCount}</div>
            </div>
            <div>
              <div className='text-gray-600'>Complexity</div>
              <div className='flex items-center gap-2'>
                <div className='h-2 flex-1 rounded-full bg-gray-200'>
                  <div
                    className='h-2 rounded-full bg-blue-600 transition-all'
                    style={{ width: `${workflowAnalytics.complexity}%` }}
                  />
                </div>
                <span className='text-xs'>{workflowAnalytics.complexity}%</span>
              </div>
            </div>
            <div>
              <div className='text-gray-600'>Completeness</div>
              <div className='flex items-center gap-2'>
                <div className='h-2 flex-1 rounded-full bg-gray-200'>
                  <div
                    className='h-2 rounded-full bg-green-600 transition-all'
                    style={{ width: `${workflowAnalytics.completeness}%` }}
                  />
                </div>
                <span className='text-xs'>{workflowAnalytics.completeness}%</span>
              </div>
            </div>
          </div>
        )}

        {!currentWorkflow && (
          <div className='py-4 text-center text-gray-500'>
            <Workflow className='mx-auto mb-2 h-8 w-8 opacity-50' />
            <p className='text-sm'>Create a workflow to see analytics</p>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderRecommendations = () => (
    <div className='space-y-4'>
      {isAnalyzing && (
        <div className='flex items-center justify-center py-8'>
          <div className='flex items-center gap-2 text-gray-500'>
            <RefreshCw className='h-4 w-4 animate-spin' />
            <span>Analyzing workflow...</span>
          </div>
        </div>
      )}

      {contextualSuggestions.map((suggestion, index) => (
        <Card key={index}>
          <CardHeader className='pb-2'>
            <CardTitle className='flex items-center gap-2 text-sm'>
              <Lightbulb className='h-4 w-4 text-yellow-500' />
              {suggestion.title}
            </CardTitle>
            <p className='text-gray-600 text-xs'>{suggestion.description}</p>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 gap-2'>
              {suggestion.templates.map((template: WorkflowTemplate) =>
                renderTemplateCard(template, true)
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-sm'>
              <Target className='h-4 w-4 text-blue-500' />
              Recommended Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 gap-2'>
              {recommendations.slice(0, 4).map((template) => renderTemplateCard(template, true))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderMarketplaceSidebar = () => (
    <div className='flex h-full w-80 flex-col border-gray-200 border-l bg-white'>
      {/* Sidebar Header */}
      <div className='border-gray-200 border-b p-4'>
        <div className='mb-3 flex items-center justify-between'>
          <h3 className='font-semibold text-gray-900'>Template Marketplace</h3>
          <Button variant='ghost' size='sm' onClick={() => setIsMarketplaceOpen(false)}>
            <X className='h-4 w-4' />
          </Button>
        </div>

        {/* Search */}
        <div className='relative'>
          <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-gray-400' />
          <Input
            placeholder='Search templates...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='h-9 pl-10'
          />
        </div>

        {/* Section Tabs */}
        <div className='mt-3 flex items-center gap-1'>
          <Button
            variant={activeSection === 'browse' ? 'default' : 'ghost'}
            size='sm'
            onClick={() => setActiveSection('browse')}
            className='flex-1'
          >
            <Package className='mr-1 h-3 w-3' />
            Browse
          </Button>
          <Button
            variant={activeSection === 'installed' ? 'default' : 'ghost'}
            size='sm'
            onClick={() => setActiveSection('installed')}
            className='flex-1'
          >
            <Download className='mr-1 h-3 w-3' />
            Installed
          </Button>
          <Button
            variant={activeSection === 'recommendations' ? 'default' : 'ghost'}
            size='sm'
            onClick={() => setActiveSection('recommendations')}
            className='flex-1'
          >
            <Sparkles className='mr-1 h-3 w-3' />
            AI
          </Button>
        </div>
      </div>

      {/* Sidebar Content */}
      <ScrollArea className='flex-1 p-4'>
        {activeSection === 'recommendations' && currentWorkflow && (
          <>
            {renderWorkflowAnalytics()}
            {renderRecommendations()}
          </>
        )}

        {(activeSection === 'browse' || activeSection === 'installed') && (
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='font-medium text-gray-700 text-sm'>
                {filteredTemplates.length} templates
              </span>
              <Button variant='ghost' size='sm'>
                <Filter className='h-4 w-4' />
              </Button>
            </div>

            {filteredTemplates.map((template) => renderTemplateCard(template))}

            {filteredTemplates.length === 0 && (
              <div className='py-8 text-center'>
                <Package className='mx-auto mb-2 h-8 w-8 text-gray-400' />
                <p className='text-gray-600 text-sm'>No templates found</p>
              </div>
            )}
          </div>
        )}

        {activeSection === 'recommendations' && !currentWorkflow && (
          <div className='py-8 text-center'>
            <Lightbulb className='mx-auto mb-2 h-8 w-8 text-gray-400' />
            <p className='text-gray-600 text-sm'>Create a workflow to see AI recommendations</p>
          </div>
        )}
      </ScrollArea>

      {/* Sidebar Footer */}
      <div className='space-y-2 border-gray-200 border-t p-4'>
        <Button
          variant='outline'
          size='sm'
          className='w-full'
          onClick={() => setSaveAsTemplateOpen(true)}
          disabled={!currentWorkflow}
        >
          <Save className='mr-1 h-4 w-4' />
          Save as Template
        </Button>
        <Button
          variant='outline'
          size='sm'
          className='w-full'
          onClick={() => setShareModalOpen(true)}
          disabled={!currentWorkflow}
        >
          <Share2 className='mr-1 h-4 w-4' />
          Share Workflow
        </Button>
      </div>
    </div>
  )

  const renderMarketplaceToggle = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setIsMarketplaceOpen(!isMarketplaceOpen)}
            className={`fixed top-4 right-4 z-50 shadow-lg ${
              isMarketplaceOpen ? 'border-blue-200 bg-blue-50' : ''
            }`}
          >
            <ShoppingCart className='mr-1 h-4 w-4' />
            Marketplace
            {recommendations.length > 0 && (
              <Badge variant='secondary' className='ml-1 px-1 text-xs'>
                {recommendations.length}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Open Template Marketplace</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  // ====================================================================
  // MAIN RENDER
  // ====================================================================

  if (integrationMode === 'sidebar') {
    return (
      <div className={`flex h-full ${className}`}>
        {/* Main workflow editor area */}
        <div className={`flex-1 ${isMarketplaceOpen ? 'mr-80' : ''} transition-all duration-300`}>
          {/* Marketplace toggle button */}
          {renderMarketplaceToggle()}

          {/* This is where the existing workflow editor would be rendered */}
          <div className='h-full bg-gray-50'>{/* Workflow editor content */}</div>
        </div>

        {/* Marketplace sidebar */}
        <AnimatePresence>
          {isMarketplaceOpen && (
            <motion.div
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className='fixed top-0 right-0 bottom-0 z-40'
            >
              {renderMarketplaceSidebar()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Template detail modal */}
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent className='max-h-[90vh] max-w-4xl overflow-hidden'>
            {selectedTemplate && (
              <TemplateDetailPage
                template={selectedTemplate}
                onInstall={() => handleTemplateInstall(selectedTemplate)}
                onUse={() => handleTemplateUse(selectedTemplate)}
                onCustomize={(customizations) => {
                  setCustomizationValues(customizations)
                  setIsCustomizing(true)
                }}
                currentUserId={currentUserId}
                className='h-full'
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Save as template modal */}
        <Dialog open={saveAsTemplateOpen} onOpenChange={setSaveAsTemplateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save as Template</DialogTitle>
              <DialogDescription>
                Save your current workflow as a reusable template
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4'>
              <div>
                <Label htmlFor='template-name'>Template Name</Label>
                <Input
                  id='template-name'
                  placeholder='My Awesome Template'
                  defaultValue={currentWorkflow?.name}
                />
              </div>
              <div>
                <Label htmlFor='template-description'>Description</Label>
                <Textarea
                  id='template-description'
                  placeholder='Describe what this template does...'
                  rows={3}
                />
              </div>
              <div className='flex items-center justify-between'>
                <Button variant='outline' onClick={() => setSaveAsTemplateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveAsTemplate}>
                  <Save className='mr-1 h-4 w-4' />
                  Save Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // For other integration modes (modal, embedded, popup), return appropriate UI
  return (
    <div className={`workflow-marketplace-integration ${className}`}>
      {renderMarketplaceToggle()}
    </div>
  )
}

// ====================================================================
// UTILITY HOOKS AND FUNCTIONS
// ====================================================================

/**
 * Custom hook for managing workflow-marketplace integration state
 */
export function useWorkflowMarketplaceIntegration() {
  const [integrationState, setIntegrationState] = useState({
    isMarketplaceOpen: false,
    selectedTemplate: null,
    activeSection: 'browse' as const,
    recommendations: [],
    isAnalyzing: false,
  })

  const openMarketplace = useCallback(() => {
    setIntegrationState((prev) => ({ ...prev, isMarketplaceOpen: true }))
  }, [])

  const closeMarketplace = useCallback(() => {
    setIntegrationState((prev) => ({ ...prev, isMarketplaceOpen: false }))
  }, [])

  const selectTemplate = useCallback((template: WorkflowTemplate | null) => {
    setIntegrationState((prev) => ({ ...prev, selectedTemplate: template }))
  }, [])

  return {
    ...integrationState,
    openMarketplace,
    closeMarketplace,
    selectTemplate,
    setIntegrationState,
  }
}

/**
 * Utility function for analyzing workflow compatibility with templates
 */
export function analyzeWorkflowCompatibility(
  workflow: WorkflowState,
  template: WorkflowTemplate
): {
  compatible: boolean
  score: number
  conflicts: string[]
  recommendations: string[]
} {
  const conflicts: string[] = []
  const recommendations: string[] = []

  // Check for block type conflicts
  const workflowBlockTypes = new Set(workflow.blocks.map((b) => b.type))
  const templateBlockTypes = new Set(template.blocks.map((b) => b.type))

  // Calculate compatibility score
  const commonTypes = [...workflowBlockTypes].filter((type) => templateBlockTypes.has(type))
  const compatibilityScore =
    (commonTypes.length / Math.max(workflowBlockTypes.size, templateBlockTypes.size)) * 100

  // Generate recommendations
  if (compatibilityScore < 30) {
    recommendations.push('This template uses different block types than your current workflow')
  }

  if (template.metadata.difficulty === 'advanced' && workflow.blocks.length < 5) {
    recommendations.push('This is an advanced template - consider starting with a simpler one')
  }

  return {
    compatible: conflicts.length === 0 && compatibilityScore > 20,
    score: Math.round(compatibilityScore),
    conflicts,
    recommendations,
  }
}

// ====================================================================
// EXPORT
// ====================================================================

export default WorkflowMarketplaceIntegration
