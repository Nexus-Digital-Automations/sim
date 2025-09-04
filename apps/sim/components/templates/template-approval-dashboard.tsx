/**
 * Template Approval Dashboard - Comprehensive Review and Approval Interface
 *
 * This component provides a complete template approval and review management
 * system for administrators and reviewers to manage template submissions,
 * conduct reviews, and track approval workflows.
 *
 * Features:
 * - Multi-stage approval workflow visualization
 * - Reviewer assignment and workload management
 * - Detailed review forms with scoring criteria
 * - Real-time status tracking and notifications
 * - Bulk approval operations for efficiency
 * - Comprehensive audit trails and reporting
 * - Integration with quality scoring algorithms
 * - Automated workflow progression
 *
 * @author Claude Code Template Approval Team
 * @version 2.0.0
 */

'use client'

import React, { useCallback, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Award,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  MessageSquare,
  MoreHorizontal,
  Search,
  Star,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  User,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// ========================
// TYPE DEFINITIONS
// ========================

interface TemplateSubmission {
  id: string
  templateId: string
  submissionType: 'new' | 'update' | 'revision'
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'published'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  title: string
  description: string
  categoryId: string
  tags: string[]
  qualityScore: number
  submittedAt: string
  updatedAt: string
  submitterId: string
  submitterName: string
  submitterImage?: string
  assignedReviewerId?: string
  currentStage: number
  approvalWorkflow: ApprovalStage[]
  templateName?: string
  templateDescription?: string
  reviews?: TemplateReview[]
}

interface ApprovalStage {
  stageNumber: number
  stageName: string
  description: string
  requiredApprovals: number
  isRequired: boolean
  estimatedDays: number
  criteria: string[]
}

interface TemplateReview {
  id: string
  submissionId: string
  reviewerId: string
  reviewerName: string
  reviewerImage?: string
  decision: 'approve' | 'reject' | 'request_changes'
  reviewNotes: string
  reviewCriteria: {
    functionality: number
    documentation: number
    codeQuality: number
    security: number
    usability: number
    performance?: number
    accessibility?: number
  }
  qualityScore: number
  timeSpentMinutes?: number
  actionItems: string[]
  createdAt: string
}

interface TemplateApprovalDashboardProps {
  submissions?: TemplateSubmission[]
  reviews?: TemplateReview[]
  loading?: boolean
  error?: string | null
  currentUserId?: string
  userRole?: 'reviewer' | 'admin' | 'moderator'
  onSubmissionAction?: (submissionId: string, action: string, data?: any) => Promise<void>
  onReviewSubmit?: (submissionId: string, reviewData: any) => Promise<void>
  onAssignReviewer?: (submissionId: string, reviewerId: string) => Promise<void>
  onBulkAction?: (submissionIds: string[], action: string) => Promise<void>
  className?: string
}

// ========================
// HELPER COMPONENTS
// ========================

/**
 * Status badge component with color coding
 */
const StatusBadge: React.FC<{ status: string; priority?: string }> = ({ status, priority }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' }
      case 'under_review':
        return { color: 'bg-blue-100 text-blue-800', icon: Eye, label: 'Under Review' }
      case 'approved':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approved' }
      case 'rejected':
        return { color: 'bg-red-100 text-red-800', icon: AlertTriangle, label: 'Rejected' }
      case 'published':
        return { color: 'bg-purple-100 text-purple-800', icon: Award, label: 'Published' }
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: FileText, label: status }
    }
  }

  const config = getStatusConfig(status)
  const Icon = config.icon

  return (
    <Badge variant='secondary' className={cn('text-xs', config.color)}>
      <Icon className='mr-1 h-3 w-3' />
      {config.label}
      {priority && priority !== 'medium' && (
        <span className='ml-1 font-bold'>
          {priority === 'high' ? '!' : priority === 'urgent' ? '!!' : ''}
        </span>
      )}
    </Badge>
  )
}

/**
 * Quality score display with visual indicator
 */
const QualityScore: React.FC<{ score: number; showLabel?: boolean }> = ({
  score,
  showLabel = true,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100'
    if (score >= 80) return 'text-blue-600 bg-blue-100'
    if (score >= 70) return 'text-yellow-600 bg-yellow-100'
    if (score >= 60) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <div className='flex items-center gap-2'>
      <div className={cn('rounded px-2 py-1 font-medium text-xs', getScoreColor(score))}>
        {score}%
      </div>
      {showLabel && <Progress value={score} className='h-2 w-16' />}
    </div>
  )
}

/**
 * Approval workflow progress visualization
 */
const WorkflowProgress: React.FC<{
  workflow: ApprovalStage[]
  currentStage: number
  status: string
}> = ({ workflow, currentStage, status }) => {
  return (
    <div className='flex items-center space-x-2'>
      {workflow.map((stage, index) => {
        const isCompleted = stage.stageNumber < currentStage
        const isCurrent = stage.stageNumber === currentStage
        const isPending = stage.stageNumber > currentStage
        const isRejected = status === 'rejected' && isCurrent

        return (
          <React.Fragment key={stage.stageNumber}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full font-medium text-xs',
                      isCompleted && 'bg-green-500 text-white',
                      isCurrent && !isRejected && 'animate-pulse bg-blue-500 text-white',
                      isRejected && 'bg-red-500 text-white',
                      isPending && 'bg-gray-200 text-gray-600'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className='h-3 w-3' />
                    ) : isRejected ? (
                      <AlertTriangle className='h-3 w-3' />
                    ) : (
                      stage.stageNumber
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className='text-sm'>
                    <div className='font-medium'>{stage.stageName}</div>
                    <div className='text-muted-foreground'>{stage.description}</div>
                    <div className='mt-1 text-xs'>
                      Est. {stage.estimatedDays} day{stage.estimatedDays !== 1 ? 's' : ''}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {index < workflow.length - 1 && (
              <div className={cn('h-0.5 w-8', isCompleted ? 'bg-green-500' : 'bg-gray-200')} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

/**
 * Review form dialog
 */
const ReviewDialog: React.FC<{
  submission: TemplateSubmission | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (reviewData: any) => void
}> = ({ submission, open, onOpenChange, onSubmit }) => {
  const [reviewData, setReviewData] = useState({
    decision: 'approve',
    reviewNotes: '',
    reviewCriteria: {
      functionality: 5,
      documentation: 5,
      codeQuality: 5,
      security: 5,
      usability: 5,
      performance: 5,
      accessibility: 5,
    },
    actionItems: [],
    timeSpentMinutes: 30,
  })

  const handleSubmit = () => {
    onSubmit(reviewData)
    onOpenChange(false)
    // Reset form
    setReviewData({
      decision: 'approve',
      reviewNotes: '',
      reviewCriteria: {
        functionality: 5,
        documentation: 5,
        codeQuality: 5,
        security: 5,
        usability: 5,
        performance: 5,
        accessibility: 5,
      },
      actionItems: [],
      timeSpentMinutes: 30,
    })
  }

  if (!submission) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] max-w-3xl overflow-auto'>
        <DialogHeader>
          <DialogTitle>Review Template Submission</DialogTitle>
          <DialogDescription>Provide detailed feedback for "{submission.title}"</DialogDescription>
        </DialogHeader>

        <div className='space-y-6 py-4'>
          {/* Submission Details */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base'>Submission Details</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <Label className='text-muted-foreground'>Type:</Label>
                  <div className='font-medium capitalize'>{submission.submissionType}</div>
                </div>
                <div>
                  <Label className='text-muted-foreground'>Priority:</Label>
                  <Badge variant='outline' className='ml-2 capitalize'>
                    {submission.priority}
                  </Badge>
                </div>
                <div>
                  <Label className='text-muted-foreground'>Quality Score:</Label>
                  <QualityScore score={submission.qualityScore} showLabel={false} />
                </div>
                <div>
                  <Label className='text-muted-foreground'>Submitted:</Label>
                  <div className='font-medium'>
                    {new Date(submission.submittedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div>
                <Label className='text-muted-foreground'>Description:</Label>
                <p className='mt-1 text-sm'>{submission.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Review Decision */}
          <div className='space-y-4'>
            <div>
              <Label className='font-semibold text-base'>Review Decision</Label>
              <Select
                value={reviewData.decision}
                onValueChange={(value) => setReviewData({ ...reviewData, decision: value })}
              >
                <SelectTrigger className='mt-2'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='approve'>
                    <div className='flex items-center'>
                      <ThumbsUp className='mr-2 h-4 w-4 text-green-500' />
                      Approve
                    </div>
                  </SelectItem>
                  <SelectItem value='request_changes'>
                    <div className='flex items-center'>
                      <MessageSquare className='mr-2 h-4 w-4 text-yellow-500' />
                      Request Changes
                    </div>
                  </SelectItem>
                  <SelectItem value='reject'>
                    <div className='flex items-center'>
                      <ThumbsDown className='mr-2 h-4 w-4 text-red-500' />
                      Reject
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className='font-semibold text-base'>Review Notes</Label>
              <Textarea
                value={reviewData.reviewNotes}
                onChange={(e) => setReviewData({ ...reviewData, reviewNotes: e.target.value })}
                placeholder='Provide detailed feedback for the submitter...'
                rows={4}
                className='mt-2'
              />
            </div>
          </div>

          {/* Review Criteria */}
          <div className='space-y-4'>
            <Label className='font-semibold text-base'>Review Criteria (1-5 scale)</Label>
            <div className='grid grid-cols-2 gap-4'>
              {Object.entries(reviewData.reviewCriteria).map(([criterion, score]) => (
                <div key={criterion} className='space-y-2'>
                  <Label className='text-sm capitalize'>
                    {criterion.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </Label>
                  <div className='flex items-center space-x-2'>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type='button'
                        onClick={() =>
                          setReviewData({
                            ...reviewData,
                            reviewCriteria: { ...reviewData.reviewCriteria, [criterion]: value },
                          })
                        }
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full border-2 font-medium text-xs transition-colors',
                          score >= value
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : 'border-gray-300 text-gray-500 hover:border-blue-300'
                        )}
                      >
                        {value}
                      </button>
                    ))}
                    <span className='ml-2 text-muted-foreground text-sm'>{score}/5</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className='flex justify-end space-x-2 border-t pt-4'>
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!reviewData.reviewNotes.trim()}>
              Submit Review
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ========================
// MAIN COMPONENT
// ========================

export const TemplateApprovalDashboard: React.FC<TemplateApprovalDashboardProps> = ({
  submissions = [],
  reviews = [],
  loading = false,
  error = null,
  currentUserId,
  userRole = 'reviewer',
  onSubmissionAction,
  onReviewSubmit,
  onAssignReviewer,
  onBulkAction,
  className,
}) => {
  // Component state
  const [activeTab, setActiveTab] = useState('submissions')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set())
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<TemplateSubmission | null>(null)

  // Filter submissions based on current filters
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      const matchesSearch =
        !searchQuery ||
        submission.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.submitterName.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' || submission.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || submission.priority === priorityFilter

      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [submissions, searchQuery, statusFilter, priorityFilter])

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    return {
      total: submissions.length,
      pending: submissions.filter((s) => s.status === 'pending').length,
      underReview: submissions.filter((s) => s.status === 'under_review').length,
      approved: submissions.filter((s) => s.status === 'approved').length,
      rejected: submissions.filter((s) => s.status === 'rejected').length,
      avgQualityScore:
        submissions.length > 0
          ? Math.round(submissions.reduce((sum, s) => sum + s.qualityScore, 0) / submissions.length)
          : 0,
    }
  }, [submissions])

  // Handle submission selection
  const handleSelectSubmission = useCallback((submissionId: string, selected: boolean) => {
    setSelectedSubmissions((prev) => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(submissionId)
      } else {
        newSet.delete(submissionId)
      }
      return newSet
    })
  }, [])

  // Handle select all submissions
  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        setSelectedSubmissions(new Set(filteredSubmissions.map((s) => s.id)))
      } else {
        setSelectedSubmissions(new Set())
      }
    },
    [filteredSubmissions]
  )

  // Handle review submission
  const handleReviewSubmit = useCallback(
    async (reviewData: any) => {
      if (selectedSubmission && onReviewSubmit) {
        try {
          await onReviewSubmit(selectedSubmission.id, reviewData)
          setSelectedSubmission(null)
        } catch (error) {
          console.error('Failed to submit review:', error)
        }
      }
    },
    [selectedSubmission, onReviewSubmit]
  )

  // Handle bulk actions
  const handleBulkAction = useCallback(
    async (action: string) => {
      if (onBulkAction && selectedSubmissions.size > 0) {
        try {
          await onBulkAction(Array.from(selectedSubmissions), action)
          setSelectedSubmissions(new Set())
        } catch (error) {
          console.error('Bulk action failed:', error)
        }
      }
    },
    [onBulkAction, selectedSubmissions]
  )

  if (loading) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <div className='text-center'>
          <div className='mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent' />
          <p className='text-muted-foreground'>Loading approval dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <div className='text-center'>
          <AlertTriangle className='mx-auto mb-4 h-12 w-12 text-red-500' />
          <p className='mb-2 font-medium text-red-600'>Error Loading Dashboard</p>
          <p className='text-muted-foreground text-sm'>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-bold text-3xl'>Template Approval Dashboard</h1>
          <p className='mt-1 text-muted-foreground'>
            Review and approve template submissions for the community marketplace
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Badge variant='outline' className='px-3 py-1'>
            {userRole} Access
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6'>
        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-muted-foreground text-sm'>Total</p>
                <p className='font-bold text-2xl'>{summaryStats.total}</p>
              </div>
              <FileText className='h-8 w-8 text-blue-500' />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-muted-foreground text-sm'>Pending</p>
                <p className='font-bold text-2xl'>{summaryStats.pending}</p>
              </div>
              <Clock className='h-8 w-8 text-yellow-500' />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-muted-foreground text-sm'>Under Review</p>
                <p className='font-bold text-2xl'>{summaryStats.underReview}</p>
              </div>
              <Eye className='h-8 w-8 text-blue-500' />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-muted-foreground text-sm'>Approved</p>
                <p className='font-bold text-2xl'>{summaryStats.approved}</p>
              </div>
              <CheckCircle className='h-8 w-8 text-green-500' />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-muted-foreground text-sm'>Rejected</p>
                <p className='font-bold text-2xl'>{summaryStats.rejected}</p>
              </div>
              <AlertTriangle className='h-8 w-8 text-red-500' />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-muted-foreground text-sm'>Avg Quality</p>
                <p className='font-bold text-2xl'>{summaryStats.avgQualityScore}%</p>
              </div>
              <Star className='h-8 w-8 text-purple-500' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-4'>
        <TabsList>
          <TabsTrigger value='submissions'>Submissions</TabsTrigger>
          <TabsTrigger value='reviews'>Reviews</TabsTrigger>
          <TabsTrigger value='analytics'>Analytics</TabsTrigger>
        </TabsList>

        {/* Submissions Tab */}
        <TabsContent value='submissions' className='space-y-4'>
          {/* Filters and Actions */}
          <div className='flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
            <div className='flex min-w-0 flex-1 flex-col gap-2 sm:flex-row'>
              <div className='relative min-w-0 flex-1'>
                <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search submissions...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-9'
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className='w-full sm:w-40'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Status</SelectItem>
                  <SelectItem value='pending'>Pending</SelectItem>
                  <SelectItem value='under_review'>Under Review</SelectItem>
                  <SelectItem value='approved'>Approved</SelectItem>
                  <SelectItem value='rejected'>Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className='w-full sm:w-40'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Priority</SelectItem>
                  <SelectItem value='urgent'>Urgent</SelectItem>
                  <SelectItem value='high'>High</SelectItem>
                  <SelectItem value='medium'>Medium</SelectItem>
                  <SelectItem value='low'>Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions */}
            {selectedSubmissions.size > 0 && (
              <div className='flex items-center gap-2'>
                <span className='text-muted-foreground text-sm'>
                  {selectedSubmissions.size} selected
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='outline' size='sm'>
                      Bulk Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkAction('approve')}>
                      Approve Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('reject')}>
                      Reject Selected
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBulkAction('assign_reviewer')}>
                      Assign Reviewer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Submissions Table */}
          <Card>
            <CardContent className='p-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-12'>
                      <input
                        type='checkbox'
                        checked={
                          filteredSubmissions.length > 0 &&
                          selectedSubmissions.size === filteredSubmissions.length
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className='h-4 w-4'
                      />
                    </TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Submitter</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className='w-12'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <input
                          type='checkbox'
                          checked={selectedSubmissions.has(submission.id)}
                          onChange={(e) => handleSelectSubmission(submission.id, e.target.checked)}
                          className='h-4 w-4'
                        />
                      </TableCell>
                      <TableCell>
                        <div className='space-y-1'>
                          <div className='line-clamp-1 font-medium'>{submission.title}</div>
                          <div className='line-clamp-1 text-muted-foreground text-sm'>
                            {submission.description}
                          </div>
                          <div className='flex flex-wrap gap-1'>
                            {submission.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant='secondary' className='text-xs'>
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          {submission.submitterImage && (
                            <img
                              src={submission.submitterImage}
                              alt={submission.submitterName}
                              className='h-6 w-6 rounded-full'
                            />
                          )}
                          <div className='font-medium text-sm'>{submission.submitterName}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={submission.status} priority={submission.priority} />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant='outline'
                          className={cn(
                            'capitalize',
                            submission.priority === 'urgent' && 'border-red-500 text-red-700',
                            submission.priority === 'high' && 'border-orange-500 text-orange-700'
                          )}
                        >
                          {submission.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <QualityScore score={submission.qualityScore} showLabel={false} />
                      </TableCell>
                      <TableCell>
                        <WorkflowProgress
                          workflow={submission.approvalWorkflow}
                          currentStage={submission.currentStage}
                          status={submission.status}
                        />
                      </TableCell>
                      <TableCell className='text-muted-foreground text-sm'>
                        {new Date(submission.submittedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                              <MoreHorizontal className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSubmission(submission)
                                setReviewDialogOpen(true)
                              }}
                            >
                              <Eye className='mr-2 h-4 w-4' />
                              Review
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <User className='mr-2 h-4 w-4' />
                              Assign Reviewer
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <MessageSquare className='mr-2 h-4 w-4' />
                              Add Comment
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <FileText className='mr-2 h-4 w-4' />
                              View Template
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredSubmissions.length === 0 && (
                <div className='flex items-center justify-center py-12'>
                  <div className='text-center'>
                    <FileText className='mx-auto mb-4 h-12 w-12 text-muted-foreground' />
                    <h3 className='mb-2 font-semibold text-lg'>No submissions found</h3>
                    <p className='text-muted-foreground'>
                      {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'No template submissions available for review'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value='reviews' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Recent Reviews</CardTitle>
              <CardDescription>Track review activity and feedback from reviewers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {reviews.slice(0, 10).map((review) => (
                  <div key={review.id} className='rounded-lg border p-4'>
                    <div className='mb-2 flex items-start justify-between'>
                      <div className='flex items-center gap-2'>
                        <div className='font-medium'>{review.reviewerName}</div>
                        <StatusBadge status={review.decision} />
                      </div>
                      <div className='text-muted-foreground text-sm'>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <p className='mb-3 text-sm'>{review.reviewNotes}</p>
                    <div className='flex items-center gap-4 text-muted-foreground text-sm'>
                      <div>Quality Score: {review.qualityScore}%</div>
                      {review.timeSpentMinutes && <div>Time Spent: {review.timeSpentMinutes}m</div>}
                      {review.actionItems.length > 0 && (
                        <div>Action Items: {review.actionItems.length}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value='analytics' className='space-y-4'>
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle>Approval Rate Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex h-64 items-center justify-center text-muted-foreground'>
                  <div className='text-center'>
                    <TrendingUp className='mx-auto mb-2 h-12 w-12 opacity-50' />
                    <p className='text-sm'>Analytics chart would be rendered here</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quality Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex h-64 items-center justify-center text-muted-foreground'>
                  <div className='text-center'>
                    <Star className='mx-auto mb-2 h-12 w-12 opacity-50' />
                    <p className='text-sm'>Distribution chart would be rendered here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <ReviewDialog
        submission={selectedSubmission}
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        onSubmit={handleReviewSubmit}
      />
    </div>
  )
}

export default TemplateApprovalDashboard
