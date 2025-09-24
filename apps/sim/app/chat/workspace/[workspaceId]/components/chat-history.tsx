'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  Bot,
  Calendar,
  ChevronDown,
  Clock,
  Download,
  Eye,
  Filter,
  MessageSquare,
  MoreVertical,
  Search,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('ChatHistory')

interface Agent {
  id: string
  name: string
  description: string
}

interface Conversation {
  id: string
  title: string
  agent_id: string
  agent_name: string
  message_count: number
  created_at: string
  updated_at: string
  status: 'active' | 'archived'
  last_message_preview: string
  participant_count: number
}

interface ChatHistoryProps {
  workspaceId: string
}

/**
 * ChatHistory component for viewing and managing past conversations
 *
 * Features:
 * - Comprehensive conversation listing with search and filtering
 * - Multiple view modes (table, cards)
 * - Bulk actions for conversation management
 * - Date-based grouping and sorting
 * - Agent-based filtering
 * - Export and archive functionality
 */
export function ChatHistory({ workspaceId }: ChatHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all')
  const [agentFilter, setAgentFilter] = useState<string[]>([])
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
  const [sortBy, setSortBy] = useState<'updated_at' | 'created_at' | 'message_count' | 'title'>(
    'updated_at'
  )
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedConversations, setSelectedConversations] = useState<string[]>([])

  useEffect(() => {
    loadHistoryData()
  }, [workspaceId])

  /**
   * Load conversation history and agents
   */
  const loadHistoryData = async () => {
    try {
      logger.info('Loading chat history', { workspaceId })
      setLoading(true)

      const [conversationsResponse, agentsResponse] = await Promise.all([
        fetch(`/api/parlant/conversations?workspaceId=${workspaceId}&limit=100`),
        fetch(`/api/parlant/agents?workspaceId=${workspaceId}`),
      ])

      if (conversationsResponse.ok) {
        const conversationsData = await conversationsResponse.json()
        setConversations(conversationsData.conversations || [])
      }

      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json()
        setAgents(agentsData.agents || [])
      }

      logger.info('Chat history loaded successfully')
    } catch (error) {
      logger.error('Failed to load chat history', { error, workspaceId })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Filter and sort conversations based on current filters
   */
  const filteredConversations = useMemo(() => {
    const filtered = conversations.filter((conversation) => {
      // Text search
      const matchesSearch =
        searchQuery === '' ||
        conversation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conversation.agent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conversation.last_message_preview.toLowerCase().includes(searchQuery.toLowerCase())

      // Status filter
      const matchesStatus = statusFilter === 'all' || conversation.status === statusFilter

      // Agent filter
      const matchesAgent = agentFilter.length === 0 || agentFilter.includes(conversation.agent_id)

      // Date filter
      let matchesDate = true
      if (dateFilter !== 'all') {
        const now = new Date()
        const conversationDate = new Date(conversation.updated_at)
        const diffTime = Math.abs(now.getTime() - conversationDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        switch (dateFilter) {
          case 'today':
            matchesDate = diffDays <= 1
            break
          case 'week':
            matchesDate = diffDays <= 7
            break
          case 'month':
            matchesDate = diffDays <= 30
            break
          case 'year':
            matchesDate = diffDays <= 365
            break
        }
      }

      return matchesSearch && matchesStatus && matchesAgent && matchesDate
    })

    // Sort conversations
    filtered.sort((a, b) => {
      let aVal: any
      let bVal: any

      switch (sortBy) {
        case 'title':
          aVal = a.title.toLowerCase()
          bVal = b.title.toLowerCase()
          break
        case 'message_count':
          aVal = a.message_count
          bVal = b.message_count
          break
        case 'created_at':
          aVal = new Date(a.created_at).getTime()
          bVal = new Date(b.created_at).getTime()
          break
        default:
          aVal = new Date(a.updated_at).getTime()
          bVal = new Date(b.updated_at).getTime()
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      }
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
    })

    return filtered
  }, [conversations, searchQuery, statusFilter, agentFilter, dateFilter, sortBy, sortOrder])

  /**
   * Handle bulk actions on selected conversations
   */
  const handleBulkAction = async (action: 'archive' | 'delete' | 'export') => {
    if (selectedConversations.length === 0) return

    try {
      switch (action) {
        case 'archive':
          await Promise.all(
            selectedConversations.map((id) =>
              fetch(`/api/parlant/conversations/${id}/archive`, { method: 'POST' })
            )
          )
          break

        case 'delete':
          if (
            confirm(
              `Are you sure you want to delete ${selectedConversations.length} conversations?`
            )
          ) {
            await Promise.all(
              selectedConversations.map((id) =>
                fetch(`/api/parlant/conversations/${id}`, { method: 'DELETE' })
              )
            )
          } else {
            return
          }
          break

        case 'export':
          // TODO: Implement export functionality
          logger.info('Export requested for conversations', {
            conversationIds: selectedConversations,
          })
          break
      }

      setSelectedConversations([])
      await loadHistoryData()
      logger.info(`Bulk ${action} completed`, { count: selectedConversations.length })
    } catch (error) {
      logger.error(`Bulk ${action} failed`, { error, count: selectedConversations.length })
    }
  }

  /**
   * Format relative time display
   */
  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  if (loading) {
    return <ChatHistorySkeleton />
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-bold text-2xl'>Chat History</h1>
          <p className='text-muted-foreground'>
            {filteredConversations.length} conversation
            {filteredConversations.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>

        {selectedConversations.length > 0 && (
          <div className='flex items-center gap-2'>
            <Badge variant='secondary'>{selectedConversations.length} selected</Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='sm'>
                  Bulk Actions
                  <ChevronDown className='ml-2 h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkAction('archive')}>
                  <Archive className='mr-2 h-4 w-4' />
                  Archive Selected
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('export')}>
                  <Download className='mr-2 h-4 w-4' />
                  Export Selected
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleBulkAction('delete')}
                  className='text-destructive focus:text-destructive'
                >
                  <Trash2 className='mr-2 h-4 w-4' />
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant='ghost' size='sm' onClick={() => setSelectedConversations([])}>
              Clear Selection
            </Button>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <div className='flex flex-col gap-4 sm:flex-row'>
        {/* Search */}
        <div className='relative flex-1'>
          <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground' />
          <Input
            placeholder='Search conversations, agents, or messages...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-10'
          />
        </div>

        {/* Filters */}
        <div className='flex gap-2'>
          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='sm'>
                <Filter className='mr-2 h-4 w-4' />
                Status: {statusFilter}
                <ChevronDown className='ml-2 h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {['all', 'active', 'archived'].map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilter === status}
                  onCheckedChange={() => setStatusFilter(status as any)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Agent Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='sm'>
                <Bot className='mr-2 h-4 w-4' />
                Agents{agentFilter.length > 0 && ` (${agentFilter.length})`}
                <ChevronDown className='ml-2 h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-48'>
              <DropdownMenuLabel>Filter by Agent</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {agents.map((agent) => (
                <DropdownMenuCheckboxItem
                  key={agent.id}
                  checked={agentFilter.includes(agent.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setAgentFilter([...agentFilter, agent.id])
                    } else {
                      setAgentFilter(agentFilter.filter((id) => id !== agent.id))
                    }
                  }}
                >
                  {agent.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Date Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='sm'>
                <Calendar className='mr-2 h-4 w-4' />
                {dateFilter}
                <ChevronDown className='ml-2 h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter by Date</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {['all', 'today', 'week', 'month', 'year'].map((period) => (
                <DropdownMenuCheckboxItem
                  key={period}
                  checked={dateFilter === period}
                  onCheckedChange={() => setDateFilter(period as any)}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* View Mode Toggle and Sort */}
      <div className='flex items-center justify-between'>
        <div className='flex gap-1'>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setViewMode('cards')}
          >
            Cards
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setViewMode('table')}
          >
            Table
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm'>
              Sort: {sortBy.replace('_', ' ')} ({sortOrder})
              <ChevronDown className='ml-2 h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Sort By</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[
              { key: 'updated_at', label: 'Last Activity' },
              { key: 'created_at', label: 'Created Date' },
              { key: 'title', label: 'Title' },
              { key: 'message_count', label: 'Message Count' },
            ].map((option) => (
              <DropdownMenuCheckboxItem
                key={option.key}
                checked={sortBy === option.key}
                onCheckedChange={() => setSortBy(option.key as any)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={sortOrder === 'asc'}
              onCheckedChange={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              Ascending
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      {filteredConversations.length === 0 ? (
        <div className='py-12 text-center'>
          <MessageSquare className='mx-auto mb-4 h-16 w-16 text-muted-foreground/50' />
          <h3 className='mb-2 font-semibold text-lg'>No conversations found</h3>
          <p className='mb-4 text-muted-foreground'>
            {searchQuery || statusFilter !== 'all' || agentFilter.length > 0
              ? 'Try adjusting your search or filters'
              : 'Start chatting with agents to see your conversation history here'}
          </p>
          <Button asChild>
            <Link href={`/chat/workspace/${workspaceId}`}>Start New Chat</Link>
          </Button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {filteredConversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              workspaceId={workspaceId}
              isSelected={selectedConversations.includes(conversation.id)}
              onSelect={(selected) => {
                if (selected) {
                  setSelectedConversations([...selectedConversations, conversation.id])
                } else {
                  setSelectedConversations(
                    selectedConversations.filter((id) => id !== conversation.id)
                  )
                }
              }}
              formatTimeAgo={formatTimeAgo}
            />
          ))}
        </div>
      ) : (
        <ConversationTable
          conversations={filteredConversations}
          workspaceId={workspaceId}
          selectedConversations={selectedConversations}
          onSelectConversations={setSelectedConversations}
          formatTimeAgo={formatTimeAgo}
        />
      )}
    </div>
  )
}

/**
 * Individual conversation card component
 */
interface ConversationCardProps {
  conversation: Conversation
  workspaceId: string
  isSelected: boolean
  onSelect: (selected: boolean) => void
  formatTimeAgo: (timestamp: string) => string
}

function ConversationCard({
  conversation,
  workspaceId,
  isSelected,
  onSelect,
  formatTimeAgo,
}: ConversationCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}
    >
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div className='flex min-w-0 flex-1 items-center gap-3'>
            <input
              type='checkbox'
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation()
                onSelect(e.target.checked)
              }}
              className='h-4 w-4 rounded border-input'
            />

            <div className='flex min-w-0 flex-1 items-center gap-2'>
              <Avatar className='h-8 w-8 flex-shrink-0'>
                <AvatarFallback className='text-xs'>
                  {conversation.agent_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='min-w-0'>
                <CardTitle className='truncate text-sm'>{conversation.title}</CardTitle>
                <p className='truncate text-muted-foreground text-xs'>{conversation.agent_name}</p>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                <MoreVertical className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem asChild>
                <Link
                  href={`/chat/workspace/${workspaceId}/agent/${conversation.agent_id}/conversation/${conversation.id}`}
                >
                  <Eye className='mr-2 h-4 w-4' />
                  View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Archive className='mr-2 h-4 w-4' />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem className='text-destructive focus:text-destructive'>
                <Trash2 className='mr-2 h-4 w-4' />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className='pt-0'>
        <Link
          href={`/chat/workspace/${workspaceId}/agent/${conversation.agent_id}/conversation/${conversation.id}`}
        >
          <div className='space-y-3'>
            <p className='line-clamp-2 text-muted-foreground text-sm'>
              {conversation.last_message_preview}
            </p>

            <div className='flex items-center justify-between text-xs'>
              <div className='flex items-center gap-4'>
                <div className='flex items-center gap-1'>
                  <MessageSquare className='h-3 w-3' />
                  <span>{conversation.message_count}</span>
                </div>

                {conversation.status === 'archived' && (
                  <Badge variant='outline' className='text-xs'>
                    Archived
                  </Badge>
                )}
              </div>

              <div className='flex items-center gap-1 text-muted-foreground'>
                <Clock className='h-3 w-3' />
                <span>{formatTimeAgo(conversation.updated_at)}</span>
              </div>
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  )
}

/**
 * Conversation table component
 */
interface ConversationTableProps {
  conversations: Conversation[]
  workspaceId: string
  selectedConversations: string[]
  onSelectConversations: (ids: string[]) => void
  formatTimeAgo: (timestamp: string) => string
}

function ConversationTable({
  conversations,
  workspaceId,
  selectedConversations,
  onSelectConversations,
  formatTimeAgo,
}: ConversationTableProps) {
  const isAllSelected =
    conversations.length > 0 && selectedConversations.length === conversations.length
  const isIndeterminate =
    selectedConversations.length > 0 && selectedConversations.length < conversations.length

  const toggleAll = () => {
    if (isAllSelected) {
      onSelectConversations([])
    } else {
      onSelectConversations(conversations.map((c) => c.id))
    }
  }

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-[50px]'>
              <input
                type='checkbox'
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isIndeterminate
                }}
                onChange={toggleAll}
                className='h-4 w-4 rounded border-input'
              />
            </TableHead>
            <TableHead>Conversation</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Messages</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Activity</TableHead>
            <TableHead className='w-[50px]' />
          </TableRow>
        </TableHeader>
        <TableBody>
          {conversations.map((conversation) => (
            <TableRow key={conversation.id} className='cursor-pointer hover:bg-muted/50'>
              <TableCell>
                <input
                  type='checkbox'
                  checked={selectedConversations.includes(conversation.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectConversations([...selectedConversations, conversation.id])
                    } else {
                      onSelectConversations(
                        selectedConversations.filter((id) => id !== conversation.id)
                      )
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className='h-4 w-4 rounded border-input'
                />
              </TableCell>
              <TableCell>
                <Link
                  href={`/chat/workspace/${workspaceId}/agent/${conversation.agent_id}/conversation/${conversation.id}`}
                >
                  <div>
                    <p className='max-w-[200px] truncate font-medium'>{conversation.title}</p>
                    <p className='max-w-[200px] truncate text-muted-foreground text-sm'>
                      {conversation.last_message_preview}
                    </p>
                  </div>
                </Link>
              </TableCell>
              <TableCell>
                <div className='flex items-center gap-2'>
                  <Avatar className='h-6 w-6'>
                    <AvatarFallback className='text-xs'>
                      {conversation.agent_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className='text-sm'>{conversation.agent_name}</span>
                </div>
              </TableCell>
              <TableCell>{conversation.message_count}</TableCell>
              <TableCell>
                <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
                  {conversation.status}
                </Badge>
              </TableCell>
              <TableCell className='text-muted-foreground text-sm'>
                {formatTimeAgo(conversation.updated_at)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                      <MoreVertical className='h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/chat/workspace/${workspaceId}/agent/${conversation.agent_id}/conversation/${conversation.id}`}
                      >
                        <Eye className='mr-2 h-4 w-4' />
                        View
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Archive className='mr-2 h-4 w-4' />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem className='text-destructive focus:text-destructive'>
                      <Trash2 className='mr-2 h-4 w-4' />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * Loading skeleton for ChatHistory
 */
function ChatHistorySkeleton() {
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <Skeleton className='mb-2 h-8 w-48' />
          <Skeleton className='h-4 w-64' />
        </div>
      </div>

      <div className='flex gap-4'>
        <Skeleton className='h-10 flex-1' />
        <Skeleton className='h-10 w-24' />
        <Skeleton className='h-10 w-24' />
        <Skeleton className='h-10 w-24' />
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className='flex items-center gap-3'>
                <Skeleton className='h-8 w-8 rounded-full' />
                <div className='flex-1'>
                  <Skeleton className='mb-2 h-4 w-32' />
                  <Skeleton className='h-3 w-20' />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className='mb-2 h-4 w-full' />
              <Skeleton className='h-4 w-3/4' />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
