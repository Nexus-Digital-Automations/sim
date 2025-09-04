/**
 * Template Installation and Management Component - Advanced marketplace installation system
 *
 * This component provides comprehensive template installation and management functionality including:
 * - One-click template installation with dependency resolution
 * - Version management and automatic updates
 * - Installation progress tracking with detailed status reporting
 * - Dependency conflict detection and resolution
 * - Rollback and uninstall capabilities
 * - Integration validation and testing
 * - Custom configuration and environment setup
 * - Batch installation and bulk operations
 * - Installation analytics and performance monitoring
 *
 * Features:
 * - Smart dependency resolution with conflict detection
 * - Progressive installation with real-time progress tracking
 * - Automatic environment detection and configuration
 * - Installation validation with comprehensive testing
 * - Version compatibility checking and migration support
 * - Rollback capabilities with state preservation
 * - Custom configuration management with validation
 * - Integration with existing workflow editor system
 * - Installation analytics and success rate monitoring
 * - Support for offline installation and caching
 *
 * @author Claude Code Template Installation System
 * @version 2.0.0
 * @implements Advanced Installation Management Architecture
 */

'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Cloud,
  Download,
  Eye,
  FileText,
  HardDrive,
  Info,
  Layers,
  MoreVertical,
  Package,
  Pause,
  Play,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shield,
  SortAsc,
  SortDesc,
  Square,
  Trash2,
  XCircle,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ====================================================================
// TYPE DEFINITIONS
// ====================================================================

interface TemplateInstallation {
  id: string
  templateId: string
  templateName: string
  templateVersion: string
  status: InstallationStatus
  progress: number
  installationPath: string
  dependencies: TemplateDependency[]
  configurations: TemplateConfiguration[]
  validationResults: ValidationResult[]
  integrations: IntegrationSetup[]
  installationLog: LogEntry[]
  installedAt?: string
  updatedAt?: string
  size: number
  performance: PerformanceMetrics
  rollbackPoints: RollbackPoint[]
  customSettings: Record<string, any>
}

type InstallationStatus =
  | 'pending'
  | 'downloading'
  | 'resolving-dependencies'
  | 'configuring'
  | 'validating'
  | 'installing'
  | 'testing'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled'
  | 'updating'
  | 'uninstalling'

interface TemplateDependency {
  id: string
  name: string
  version: string
  type: 'npm' | 'system' | 'service' | 'template'
  required: boolean
  status: 'pending' | 'installing' | 'installed' | 'failed' | 'conflict'
  conflictsWith?: string[]
  description: string
  size: number
  estimatedInstallTime: number
}

interface TemplateConfiguration {
  id: string
  name: string
  type: 'environment' | 'database' | 'api' | 'integration' | 'custom'
  required: boolean
  value: any
  defaultValue: any
  validation: ConfigurationValidation
  description: string
  sensitive: boolean
  status: 'pending' | 'configured' | 'validated' | 'failed'
}

interface ConfigurationValidation {
  pattern?: string
  min?: number
  max?: number
  options?: string[]
  custom?: (value: any) => boolean | string
}

interface ValidationResult {
  id: string
  type: 'dependency' | 'configuration' | 'integration' | 'performance' | 'security'
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning'
  message: string
  details?: string
  suggestions?: string[]
  timestamp: string
}

interface IntegrationSetup {
  id: string
  name: string
  type: string
  required: boolean
  status: 'pending' | 'configuring' | 'testing' | 'active' | 'failed'
  endpoint?: string
  credentials?: Record<string, any>
  testResults?: TestResult[]
}

interface TestResult {
  id: string
  name: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  duration?: number
  error?: string
  output?: string
}

interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'debug'
  message: string
  details?: any
  component?: string
}

interface PerformanceMetrics {
  installationTime: number
  downloadSpeed: number
  diskUsage: number
  memoryUsage: number
  cpuUsage: number
  networkLatency: number
}

interface RollbackPoint {
  id: string
  name: string
  description: string
  createdAt: string
  size: number
  automatic: boolean
}

interface InstallationBatch {
  id: string
  name: string
  templates: string[]
  status: InstallationStatus
  progress: number
  createdAt: string
  estimatedTime: number
}

interface TemplateInstallationManagerProps {
  installedTemplates: TemplateInstallation[]
  availableTemplates: any[]
  activeBatches: InstallationBatch[]
  onInstallTemplate: (templateId: string, options?: InstallationOptions) => Promise<void>
  onUninstallTemplate: (installationId: string, preserveData?: boolean) => Promise<void>
  onUpdateTemplate: (installationId: string, version?: string) => Promise<void>
  onPauseInstallation: (installationId: string) => Promise<void>
  onResumeInstallation: (installationId: string) => Promise<void>
  onCancelInstallation: (installationId: string) => Promise<void>
  onConfigureTemplate: (
    installationId: string,
    configurations: Record<string, any>
  ) => Promise<void>
  onValidateInstallation: (installationId: string) => Promise<ValidationResult[]>
  onCreateRollbackPoint: (installationId: string, name: string) => Promise<void>
  onRollbackInstallation: (installationId: string, rollbackPointId: string) => Promise<void>
  onCreateBatch: (name: string, templateIds: string[]) => Promise<void>
  onExecuteBatch: (batchId: string) => Promise<void>
  onViewLogs: (installationId: string) => Promise<LogEntry[]>
  onExportConfiguration: (installationId: string) => Promise<void>
  onImportConfiguration: (installationId: string, config: any) => Promise<void>
  currentUserId?: string
  systemCapabilities: SystemCapabilities
  className?: string
}

interface InstallationOptions {
  version?: string
  installPath?: string
  skipDependencies?: boolean
  customConfigurations?: Record<string, any>
  createRollbackPoint?: boolean
  validateAfterInstall?: boolean
}

interface SystemCapabilities {
  maxConcurrentInstalls: number
  availableDiskSpace: number
  availableMemory: number
  supportedIntegrations: string[]
  operatingSystem: string
  architecture: string
}

// ====================================================================
// MAIN COMPONENT
// ====================================================================

export function TemplateInstallationManager({
  installedTemplates,
  availableTemplates,
  activeBatches,
  onInstallTemplate,
  onUninstallTemplate,
  onUpdateTemplate,
  onPauseInstallation,
  onResumeInstallation,
  onCancelInstallation,
  onConfigureTemplate,
  onValidateInstallation,
  onCreateRollbackPoint,
  onRollbackInstallation,
  onCreateBatch,
  onExecuteBatch,
  onViewLogs,
  onExportConfiguration,
  onImportConfiguration,
  currentUserId,
  systemCapabilities,
  className = '',
}: TemplateInstallationManagerProps) {
  // ====================================================================
  // STATE MANAGEMENT
  // ====================================================================

  const [activeTab, setActiveTab] = useState('installed')
  const [selectedInstallation, setSelectedInstallation] = useState<TemplateInstallation | null>(
    null
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<InstallationStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status' | 'size'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false)
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false)
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false)

  const [installationOptions, setInstallationOptions] = useState<InstallationOptions>({})
  const [selectedTemplateForInstall, setSelectedTemplateForInstall] = useState<any>(null)
  const [installationLogs, setInstallationLogs] = useState<LogEntry[]>([])
  const [selectedTemplatesForBatch, setSelectedTemplatesForBatch] = useState<string[]>([])

  const [expandedDependencies, setExpandedDependencies] = useState<Set<string>>(new Set())
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  // Real-time updates
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // ====================================================================
  // COMPUTED VALUES
  // ====================================================================

  const filteredInstallations = useMemo(() => {
    const filtered = installedTemplates.filter((installation) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!installation.templateName.toLowerCase().includes(query)) return false
      }

      // Status filter
      if (statusFilter !== 'all' && installation.status !== statusFilter) return false

      return true
    })

    // Sort installations
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'name':
          aValue = a.templateName.toLowerCase()
          bValue = b.templateName.toLowerCase()
          break
        case 'date':
          aValue = new Date(a.installedAt || a.updatedAt || 0).getTime()
          bValue = new Date(b.installedAt || b.updatedAt || 0).getTime()
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'size':
          aValue = a.size
          bValue = b.size
          break
        default:
          return 0
      }

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [installedTemplates, searchQuery, statusFilter, sortBy, sortOrder])

  const installationStats = useMemo(() => {
    const stats = {
      total: installedTemplates.length,
      active: 0,
      failed: 0,
      updating: 0,
      totalSize: 0,
      averageInstallTime: 0,
    }

    installedTemplates.forEach((installation) => {
      switch (installation.status) {
        case 'completed':
          stats.active++
          break
        case 'failed':
          stats.failed++
          break
        case 'updating':
          stats.updating++
          break
      }
      stats.totalSize += installation.size
    })

    const completedInstalls = installedTemplates.filter((i) => i.status === 'completed')
    if (completedInstalls.length > 0) {
      stats.averageInstallTime =
        completedInstalls.reduce((sum, i) => sum + i.performance.installationTime, 0) /
        completedInstalls.length
    }

    return stats
  }, [installedTemplates])

  const activeInstallations = useMemo(() => {
    return installedTemplates.filter((installation) =>
      [
        'downloading',
        'resolving-dependencies',
        'configuring',
        'validating',
        'installing',
        'testing',
      ].includes(installation.status)
    )
  }, [installedTemplates])

  // ====================================================================
  // EVENT HANDLERS
  // ====================================================================

  const handleInstallTemplate = useCallback(async (template: any) => {
    try {
      setSelectedTemplateForInstall(template)
      setIsInstallDialogOpen(true)
    } catch (error) {
      console.error('Failed to initiate template installation:', error)
    }
  }, [])

  const handleConfirmInstallation = useCallback(async () => {
    if (!selectedTemplateForInstall) return

    try {
      await onInstallTemplate(selectedTemplateForInstall.id, installationOptions)
      setIsInstallDialogOpen(false)
      setSelectedTemplateForInstall(null)
      setInstallationOptions({})
    } catch (error) {
      console.error('Failed to install template:', error)
    }
  }, [selectedTemplateForInstall, installationOptions, onInstallTemplate])

  const handleViewLogs = useCallback(
    async (installation: TemplateInstallation) => {
      try {
        const logs = await onViewLogs(installation.id)
        setInstallationLogs(logs)
        setSelectedInstallation(installation)
        setIsLogsDialogOpen(true)
      } catch (error) {
        console.error('Failed to load installation logs:', error)
      }
    },
    [onViewLogs]
  )

  const getStatusIcon = (status: InstallationStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className='h-4 w-4 text-green-500' />
      case 'failed':
        return <XCircle className='h-4 w-4 text-red-500' />
      case 'downloading':
      case 'installing':
      case 'configuring':
        return <Download className='h-4 w-4 animate-pulse text-blue-500' />
      case 'paused':
        return <Pause className='h-4 w-4 text-yellow-500' />
      case 'cancelled':
        return <Square className='h-4 w-4 text-gray-500' />
      case 'updating':
        return <RefreshCw className='h-4 w-4 animate-spin text-blue-500' />
      default:
        return <Clock className='h-4 w-4 text-gray-500' />
    }
  }

  const getStatusColor = (status: InstallationStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'downloading':
      case 'installing':
      case 'configuring':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'updating':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h`
  }

  // ====================================================================
  // RENDER COMPONENTS
  // ====================================================================

  const renderInstallationCard = (installation: TemplateInstallation) => {
    const isActive = [
      'downloading',
      'resolving-dependencies',
      'configuring',
      'validating',
      'installing',
      'testing',
    ].includes(installation.status)

    return (
      <motion.div
        key={installation.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className='space-y-4 rounded-lg border border-gray-200 bg-white p-6'
      >
        {/* Installation Header */}
        <div className='flex items-start justify-between'>
          <div className='flex flex-1 items-start gap-3'>
            <div className='rounded-lg bg-blue-50 p-2'>
              <Package className='h-6 w-6 text-blue-600' />
            </div>

            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-2'>
                <h4 className='truncate font-semibold text-gray-900'>
                  {installation.templateName}
                </h4>
                <Badge variant='outline' className='text-xs'>
                  v{installation.templateVersion}
                </Badge>
                {getStatusIcon(installation.status)}
              </div>

              <div className='mt-1 flex items-center gap-4 text-gray-600 text-sm'>
                <span>Size: {formatFileSize(installation.size)}</span>
                {installation.installedAt && (
                  <span>Installed: {new Date(installation.installedAt).toLocaleDateString()}</span>
                )}
                <span>Path: {installation.installationPath}</span>
              </div>

              <Badge
                className={`mt-2 inline-flex items-center gap-1 text-xs ${getStatusColor(installation.status)}`}
              >
                {installation.status.replace('-', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='sm'>
                <MoreVertical className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {installation.status === 'completed' && (
                <>
                  <DropdownMenuItem onClick={() => onUpdateTemplate(installation.id)}>
                    <RefreshCw className='mr-2 h-4 w-4' />
                    Update
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedInstallation(installation)
                      setIsConfigDialogOpen(true)
                    }}
                  >
                    <Settings className='mr-2 h-4 w-4' />
                    Configure
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      onCreateRollbackPoint(
                        installation.id,
                        `Manual backup ${new Date().toISOString()}`
                      )
                    }
                  >
                    <Save className='mr-2 h-4 w-4' />
                    Create Backup
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {isActive && (
                <>
                  {installation.status !== 'paused' ? (
                    <DropdownMenuItem onClick={() => onPauseInstallation(installation.id)}>
                      <Pause className='mr-2 h-4 w-4' />
                      Pause
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => onResumeInstallation(installation.id)}>
                      <Play className='mr-2 h-4 w-4' />
                      Resume
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onCancelInstallation(installation.id)}
                    className='text-red-600'
                  >
                    <Square className='mr-2 h-4 w-4' />
                    Cancel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => handleViewLogs(installation)}>
                <FileText className='mr-2 h-4 w-4' />
                View Logs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onValidateInstallation(installation.id)}>
                <Shield className='mr-2 h-4 w-4' />
                Validate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportConfiguration(installation.id)}>
                <Download className='mr-2 h-4 w-4' />
                Export Config
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onUninstallTemplate(installation.id, false)}
                className='text-red-600'
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Uninstall
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress Bar for Active Installations */}
        {isActive && (
          <div className='space-y-2'>
            <div className='flex items-center justify-between text-sm'>
              <span className='font-medium'>
                {installation.status.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </span>
              <span>{Math.round(installation.progress)}%</span>
            </div>
            <Progress value={installation.progress} className='h-2' />
          </div>
        )}

        {/* Dependencies */}
        {installation.dependencies.length > 0 && (
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <h6 className='flex items-center gap-1 font-medium text-gray-900'>
                <Layers className='h-4 w-4' />
                Dependencies ({installation.dependencies.length})
              </h6>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  const newExpanded = new Set(expandedDependencies)
                  if (newExpanded.has(installation.id)) {
                    newExpanded.delete(installation.id)
                  } else {
                    newExpanded.add(installation.id)
                  }
                  setExpandedDependencies(newExpanded)
                }}
              >
                {expandedDependencies.has(installation.id) ? (
                  <ChevronDown className='h-4 w-4' />
                ) : (
                  <ChevronRight className='h-4 w-4' />
                )}
              </Button>
            </div>

            <AnimatePresence>
              {expandedDependencies.has(installation.id) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className='space-y-2'
                >
                  {installation.dependencies.map((dep) => (
                    <div
                      key={dep.id}
                      className='flex items-center justify-between rounded bg-gray-50 p-2'
                    >
                      <div className='flex items-center gap-2'>
                        <div className='rounded bg-gray-200 px-2 py-1 font-mono text-xs'>
                          {dep.type}
                        </div>
                        <span className='font-medium text-sm'>{dep.name}</span>
                        <span className='text-gray-600 text-xs'>v{dep.version}</span>
                        {dep.required && (
                          <Badge variant='outline' className='text-xs'>
                            Required
                          </Badge>
                        )}
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='text-gray-600 text-xs'>{formatFileSize(dep.size)}</span>
                        {getStatusIcon(dep.status as any)}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Validation Results */}
        {installation.validationResults.length > 0 && (
          <div className='space-y-2'>
            <h6 className='flex items-center gap-1 font-medium text-gray-900'>
              <Shield className='h-4 w-4' />
              Validation Results
            </h6>
            <div className='space-y-1'>
              {installation.validationResults.slice(0, 3).map((result) => (
                <div key={result.id} className='flex items-center gap-2 text-sm'>
                  {result.status === 'passed' && <CheckCircle className='h-3 w-3 text-green-500' />}
                  {result.status === 'failed' && <XCircle className='h-3 w-3 text-red-500' />}
                  {result.status === 'warning' && (
                    <AlertTriangle className='h-3 w-3 text-yellow-500' />
                  )}
                  <span className='text-gray-700'>{result.message}</span>
                </div>
              ))}
              {installation.validationResults.length > 3 && (
                <div className='text-gray-500 text-xs'>
                  +{installation.validationResults.length - 3} more results
                </div>
              )}
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {installation.status === 'completed' && (
          <div className='grid grid-cols-2 gap-4 text-sm md:grid-cols-4'>
            <div className='rounded bg-gray-50 p-2 text-center'>
              <div className='text-gray-600 text-xs'>Install Time</div>
              <div className='font-medium'>
                {formatDuration(installation.performance.installationTime)}
              </div>
            </div>
            <div className='rounded bg-gray-50 p-2 text-center'>
              <div className='text-gray-600 text-xs'>Disk Usage</div>
              <div className='font-medium'>
                {formatFileSize(installation.performance.diskUsage)}
              </div>
            </div>
            <div className='rounded bg-gray-50 p-2 text-center'>
              <div className='text-gray-600 text-xs'>Memory</div>
              <div className='font-medium'>
                {formatFileSize(installation.performance.memoryUsage)}
              </div>
            </div>
            <div className='rounded bg-gray-50 p-2 text-center'>
              <div className='text-gray-600 text-xs'>Rollback Points</div>
              <div className='font-medium'>{installation.rollbackPoints.length}</div>
            </div>
          </div>
        )}
      </motion.div>
    )
  }

  const renderInstallDialog = () => (
    <Dialog open={isInstallDialogOpen} onOpenChange={setIsInstallDialogOpen}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Install Template</DialogTitle>
          <DialogDescription>
            Configure installation settings for {selectedTemplateForInstall?.name}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Template Info */}
          <Card>
            <CardContent className='p-4'>
              <div className='flex items-center gap-4'>
                <div className='rounded-lg bg-blue-50 p-3'>
                  <Package className='h-8 w-8 text-blue-600' />
                </div>
                <div>
                  <h3 className='font-semibold'>{selectedTemplateForInstall?.name}</h3>
                  <p className='text-gray-600 text-sm'>{selectedTemplateForInstall?.description}</p>
                  <div className='mt-2 flex items-center gap-4 text-gray-500 text-sm'>
                    <span>Version: {selectedTemplateForInstall?.version}</span>
                    <span>Size: {formatFileSize(selectedTemplateForInstall?.size || 0)}</span>
                    <span>Author: {selectedTemplateForInstall?.author}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Installation Options */}
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <h4 className='font-medium'>Installation Options</h4>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              >
                {showAdvancedOptions ? 'Hide Advanced' : 'Show Advanced'}
                {showAdvancedOptions ? (
                  <ChevronDown className='ml-1 h-4 w-4' />
                ) : (
                  <ChevronRight className='ml-1 h-4 w-4' />
                )}
              </Button>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='version'>Version</Label>
                <Select
                  value={installationOptions.version || selectedTemplateForInstall?.version}
                  onValueChange={(value) =>
                    setInstallationOptions((prev) => ({ ...prev, version: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTemplateForInstall?.versions?.map((version: string) => (
                      <SelectItem key={version} value={version}>
                        {version}{' '}
                        {version === selectedTemplateForInstall.latestVersion && '(Latest)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='install-path'>Installation Path</Label>
                <Input
                  id='install-path'
                  placeholder='/default/path'
                  value={installationOptions.installPath || ''}
                  onChange={(e) =>
                    setInstallationOptions((prev) => ({ ...prev, installPath: e.target.value }))
                  }
                />
              </div>
            </div>

            <AnimatePresence>
              {showAdvancedOptions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className='space-y-4 border-gray-200 border-t pt-4'
                >
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    <div className='flex items-center space-x-2'>
                      <Switch
                        id='skip-dependencies'
                        checked={installationOptions.skipDependencies || false}
                        onCheckedChange={(checked) =>
                          setInstallationOptions((prev) => ({ ...prev, skipDependencies: checked }))
                        }
                      />
                      <Label htmlFor='skip-dependencies'>Skip dependencies</Label>
                    </div>

                    <div className='flex items-center space-x-2'>
                      <Switch
                        id='create-rollback'
                        checked={installationOptions.createRollbackPoint !== false}
                        onCheckedChange={(checked) =>
                          setInstallationOptions((prev) => ({
                            ...prev,
                            createRollbackPoint: checked,
                          }))
                        }
                      />
                      <Label htmlFor='create-rollback'>Create rollback point</Label>
                    </div>

                    <div className='flex items-center space-x-2'>
                      <Switch
                        id='validate-install'
                        checked={installationOptions.validateAfterInstall !== false}
                        onCheckedChange={(checked) =>
                          setInstallationOptions((prev) => ({
                            ...prev,
                            validateAfterInstall: checked,
                          }))
                        }
                      />
                      <Label htmlFor='validate-install'>Validate after install</Label>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* System Requirements Check */}
          <Alert>
            <Info className='h-4 w-4' />
            <AlertTitle>System Requirements</AlertTitle>
            <AlertDescription>
              <div className='mt-2 space-y-1 text-sm'>
                <div className='flex justify-between'>
                  <span>Available Disk Space:</span>
                  <span className='font-medium'>
                    {formatFileSize(systemCapabilities.availableDiskSpace)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span>Required Space:</span>
                  <span className='font-medium'>
                    {formatFileSize(selectedTemplateForInstall?.size || 0)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span>Available Memory:</span>
                  <span className='font-medium'>
                    {formatFileSize(systemCapabilities.availableMemory)}
                  </span>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <div className='flex items-center justify-between border-gray-200 border-t pt-4'>
          <div className='text-gray-600 text-sm'>
            Estimated installation time:{' '}
            {formatDuration(selectedTemplateForInstall?.estimatedInstallTime || 60)}
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='outline' onClick={() => setIsInstallDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmInstallation}>
              <Download className='mr-1 h-4 w-4' />
              Install Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  const renderLogsDialog = () => (
    <Dialog open={isLogsDialogOpen} onOpenChange={setIsLogsDialogOpen}>
      <DialogContent className='max-h-[80vh] max-w-4xl'>
        <DialogHeader>
          <DialogTitle>Installation Logs</DialogTitle>
          <DialogDescription>
            Detailed logs for {selectedInstallation?.templateName} installation
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='flex items-center gap-2'>
            <Badge
              variant='outline'
              className={getStatusColor(selectedInstallation?.status || 'pending')}
            >
              {selectedInstallation?.status}
            </Badge>
            <span className='text-gray-600 text-sm'>
              Last updated:{' '}
              {selectedInstallation?.updatedAt
                ? new Date(selectedInstallation.updatedAt).toLocaleString()
                : 'Never'}
            </span>
          </div>

          <ScrollArea className='h-96 w-full rounded-lg border border-gray-200 bg-black p-4 font-mono text-green-400 text-sm'>
            {installationLogs.map((log, index) => (
              <div key={log.id || index} className='mb-1 flex items-start gap-2'>
                <span className='min-w-[60px] text-gray-500 text-xs'>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={`min-w-[50px] text-xs ${
                    log.level === 'error'
                      ? 'text-red-400'
                      : log.level === 'warning'
                        ? 'text-yellow-400'
                        : log.level === 'info'
                          ? 'text-blue-400'
                          : 'text-gray-400'
                  }`}
                >
                  [{log.level.toUpperCase()}]
                </span>
                <span className='text-green-400'>{log.message}</span>
              </div>
            ))}
            {installationLogs.length === 0 && (
              <div className='py-8 text-center text-gray-500'>No logs available</div>
            )}
          </ScrollArea>
        </div>

        <div className='flex items-center justify-between border-gray-200 border-t pt-4'>
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm'>
              <Download className='mr-1 h-4 w-4' />
              Export Logs
            </Button>
            <Button variant='outline' size='sm'>
              <RefreshCw className='mr-1 h-4 w-4' />
              Refresh
            </Button>
          </div>
          <Button onClick={() => setIsLogsDialogOpen(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )

  // ====================================================================
  // MAIN RENDER
  // ====================================================================

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Stats */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-gray-600 text-sm'>Total Installed</p>
                <p className='font-bold text-2xl'>{installationStats.total}</p>
              </div>
              <Package className='h-8 w-8 text-blue-600' />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-gray-600 text-sm'>Active</p>
                <p className='font-bold text-2xl text-green-600'>{installationStats.active}</p>
              </div>
              <CheckCircle className='h-8 w-8 text-green-600' />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-gray-600 text-sm'>Failed</p>
                <p className='font-bold text-2xl text-red-600'>{installationStats.failed}</p>
              </div>
              <XCircle className='h-8 w-8 text-red-600' />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-gray-600 text-sm'>Total Size</p>
                <p className='font-bold text-2xl'>{formatFileSize(installationStats.totalSize)}</p>
              </div>
              <HardDrive className='h-8 w-8 text-purple-600' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Installations Progress */}
      {activeInstallations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Download className='h-5 w-5 animate-pulse text-blue-600' />
              Active Installations ({activeInstallations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {activeInstallations.map((installation) => (
              <div key={installation.id} className='space-y-2 rounded-lg bg-gray-50 p-3'>
                <div className='flex items-center justify-between'>
                  <span className='font-medium'>{installation.templateName}</span>
                  <div className='flex items-center gap-2'>
                    {getStatusIcon(installation.status)}
                    <span className='text-gray-600 text-sm'>
                      {Math.round(installation.progress)}%
                    </span>
                  </div>
                </div>
                <Progress value={installation.progress} className='h-2' />
                <div className='text-gray-600 text-xs'>
                  {installation.status.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='installed'>
            Installed Templates ({filteredInstallations.length})
          </TabsTrigger>
          <TabsTrigger value='available'>
            Available Templates ({availableTemplates.length})
          </TabsTrigger>
          <TabsTrigger value='batches'>Batch Operations ({activeBatches.length})</TabsTrigger>
        </TabsList>

        <TabsContent value='installed' className='space-y-6'>
          {/* Filters and Search */}
          <Card>
            <CardContent className='p-4'>
              <div className='flex flex-col gap-4 lg:flex-row'>
                <div className='flex-1'>
                  <div className='relative'>
                    <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-gray-400' />
                    <Input
                      placeholder='Search installed templates...'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className='pl-10'
                    />
                  </div>
                </div>

                <div className='flex gap-2'>
                  <Select
                    value={statusFilter}
                    onValueChange={(value: any) => setStatusFilter(value)}
                  >
                    <SelectTrigger className='w-40'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Status</SelectItem>
                      <SelectItem value='completed'>Completed</SelectItem>
                      <SelectItem value='failed'>Failed</SelectItem>
                      <SelectItem value='updating'>Updating</SelectItem>
                      <SelectItem value='paused'>Paused</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className='w-32'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='name'>Name</SelectItem>
                      <SelectItem value='date'>Date</SelectItem>
                      <SelectItem value='status'>Status</SelectItem>
                      <SelectItem value='size'>Size</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant='outline'
                    size='icon'
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? (
                      <SortAsc className='h-4 w-4' />
                    ) : (
                      <SortDesc className='h-4 w-4' />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Installed Templates List */}
          <div className='space-y-4'>
            <AnimatePresence>
              {filteredInstallations.map((installation) => renderInstallationCard(installation))}
            </AnimatePresence>

            {filteredInstallations.length === 0 && (
              <div className='py-12 text-center'>
                <Package className='mx-auto mb-4 h-12 w-12 text-gray-400' />
                <h3 className='mb-2 font-medium text-gray-900 text-lg'>No templates found</h3>
                <p className='mb-4 text-gray-600'>
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : 'Install your first template to get started.'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <Button onClick={() => setActiveTab('available')}>
                    Browse Available Templates
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value='available' className='space-y-6'>
          {/* Available Templates */}
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {availableTemplates.map((template) => (
              <Card key={template.id} className='transition-shadow hover:shadow-lg'>
                <CardContent className='p-4'>
                  <div className='space-y-3'>
                    <div className='flex items-start justify-between'>
                      <div>
                        <h3 className='font-semibold'>{template.name}</h3>
                        <p className='line-clamp-2 text-gray-600 text-sm'>{template.description}</p>
                      </div>
                      <Badge variant='outline' className='text-xs'>
                        v{template.version}
                      </Badge>
                    </div>

                    <div className='flex items-center gap-4 text-gray-500 text-sm'>
                      <span>{formatFileSize(template.size || 0)}</span>
                      <span>⭐ {template.rating || 0}</span>
                      <span>{template.downloads || 0} downloads</span>
                    </div>

                    <div className='flex items-center gap-2'>
                      <Button
                        onClick={() => handleInstallTemplate(template)}
                        className='flex-1'
                        size='sm'
                      >
                        <Download className='mr-1 h-4 w-4' />
                        Install
                      </Button>
                      <Button variant='outline' size='sm'>
                        <Eye className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {availableTemplates.length === 0 && (
            <div className='py-12 text-center'>
              <Cloud className='mx-auto mb-4 h-12 w-12 text-gray-400' />
              <h3 className='mb-2 font-medium text-gray-900 text-lg'>No templates available</h3>
              <p className='text-gray-600'>Check back later for new templates.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value='batches' className='space-y-6'>
          {/* Batch Operations */}
          <div className='flex items-center justify-between'>
            <h3 className='font-semibold text-lg'>Batch Operations</h3>
            <Button onClick={() => setIsBatchDialogOpen(true)}>
              <Package className='mr-1 h-4 w-4' />
              Create Batch
            </Button>
          </div>

          <div className='space-y-4'>
            {activeBatches.map((batch) => (
              <Card key={batch.id}>
                <CardContent className='p-4'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h4 className='font-medium'>{batch.name}</h4>
                      <p className='text-gray-600 text-sm'>
                        {batch.templates.length} templates • {formatDuration(batch.estimatedTime)}
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      {getStatusIcon(batch.status)}
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => onExecuteBatch(batch.id)}
                        disabled={batch.status !== 'pending'}
                      >
                        {batch.status === 'pending' ? 'Execute' : 'Running...'}
                      </Button>
                    </div>
                  </div>
                  {batch.status !== 'pending' && (
                    <div className='mt-3 space-y-1'>
                      <div className='flex items-center justify-between text-sm'>
                        <span>Progress</span>
                        <span>{Math.round(batch.progress)}%</span>
                      </div>
                      <Progress value={batch.progress} className='h-2' />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {activeBatches.length === 0 && (
              <div className='py-12 text-center'>
                <Layers className='mx-auto mb-4 h-12 w-12 text-gray-400' />
                <h3 className='mb-2 font-medium text-gray-900 text-lg'>No batch operations</h3>
                <p className='mb-4 text-gray-600'>
                  Create batches to install multiple templates at once.
                </p>
                <Button onClick={() => setIsBatchDialogOpen(true)}>Create Your First Batch</Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {renderInstallDialog()}
      {renderLogsDialog()}

      {/* System Status Footer */}
      <Card className='bg-gray-50'>
        <CardContent className='p-4'>
          <div className='grid grid-cols-2 gap-4 text-sm md:grid-cols-4'>
            <div>
              <div className='text-gray-600'>Concurrent Installs</div>
              <div className='font-medium'>
                {activeInstallations.length}/{systemCapabilities.maxConcurrentInstalls}
              </div>
            </div>
            <div>
              <div className='text-gray-600'>Available Space</div>
              <div className='font-medium'>
                {formatFileSize(systemCapabilities.availableDiskSpace)}
              </div>
            </div>
            <div>
              <div className='text-gray-600'>System</div>
              <div className='font-medium'>{systemCapabilities.operatingSystem}</div>
            </div>
            <div>
              <div className='text-gray-600'>Architecture</div>
              <div className='font-medium'>{systemCapabilities.architecture}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ====================================================================
// EXPORT
// ====================================================================

export default TemplateInstallationManager
