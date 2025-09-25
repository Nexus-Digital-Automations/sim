/**
 * Agent Analytics Component
 *
 * Provides comprehensive analytics and insights for agent performance,
 * including conversation metrics, success rates, and performance trends.
 */

'use client'

import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle2,
  Clock,
  Download,
  MessageSquare,
  RefreshCw,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface AgentAnalyticsProps {
  agentId: string
  workspaceId: string
  className?: string
}

interface ConversationMetrics {
  totalConversations: number
  averageLength: number
  successRate: number
  satisfactionScore: number
  responseTime: number
  completionRate: number
}

interface PerformanceData {
  date: string
  conversations: number
  successRate: number
  avgResponseTime: number
  satisfactionScore: number
  tokens: number
}

interface TopicAnalysis {
  topic: string
  count: number
  successRate: number
  avgDuration: number
}

interface UserSegment {
  segment: string
  users: number
  conversations: number
  satisfaction: number
  color: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

// Mock data - in real implementation, this would come from analytics API
const mockPerformanceData: PerformanceData[] = [
  {
    date: '2024-01-01',
    conversations: 45,
    successRate: 85,
    avgResponseTime: 1.2,
    satisfactionScore: 4.2,
    tokens: 15420,
  },
  {
    date: '2024-01-02',
    conversations: 52,
    successRate: 88,
    avgResponseTime: 1.1,
    satisfactionScore: 4.3,
    tokens: 17680,
  },
  {
    date: '2024-01-03',
    conversations: 38,
    successRate: 82,
    avgResponseTime: 1.4,
    satisfactionScore: 4.0,
    tokens: 12940,
  },
  {
    date: '2024-01-04',
    conversations: 61,
    successRate: 91,
    avgResponseTime: 1.0,
    satisfactionScore: 4.5,
    tokens: 20770,
  },
  {
    date: '2024-01-05',
    conversations: 49,
    successRate: 87,
    avgResponseTime: 1.3,
    satisfactionScore: 4.2,
    tokens: 16660,
  },
  {
    date: '2024-01-06',
    conversations: 55,
    successRate: 89,
    avgResponseTime: 1.1,
    satisfactionScore: 4.4,
    tokens: 18700,
  },
  {
    date: '2024-01-07',
    conversations: 42,
    successRate: 84,
    avgResponseTime: 1.2,
    satisfactionScore: 4.1,
    tokens: 14280,
  },
]

const mockTopicAnalysis: TopicAnalysis[] = [
  { topic: 'Technical Support', count: 145, successRate: 87, avgDuration: 8.5 },
  { topic: 'Billing Questions', count: 98, successRate: 92, avgDuration: 5.2 },
  { topic: 'Account Setup', count: 76, successRate: 89, avgDuration: 6.8 },
  { topic: 'Product Information', count: 63, successRate: 94, avgDuration: 4.1 },
  { topic: 'General Inquiry', count: 54, successRate: 85, avgDuration: 7.3 },
]

const mockUserSegments: UserSegment[] = [
  { segment: 'New Users', users: 234, conversations: 567, satisfaction: 4.2, color: '#0088FE' },
  {
    segment: 'Returning Users',
    users: 456,
    conversations: 1234,
    satisfaction: 4.5,
    color: '#00C49F',
  },
  { segment: 'Premium Users', users: 123, conversations: 456, satisfaction: 4.7, color: '#FFBB28' },
  { segment: 'Enterprise', users: 67, conversations: 234, satisfaction: 4.8, color: '#FF8042' },
]

export function AgentAnalytics({ agentId, workspaceId, className = '' }: AgentAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Mock current metrics
  const currentMetrics: ConversationMetrics = {
    totalConversations: 342,
    averageLength: 6.4,
    successRate: 87.3,
    satisfactionScore: 4.3,
    responseTime: 1.2,
    completionRate: 91.8,
  }

  const loadAnalytics = async () => {
    setIsLoading(true)
    try {
      // TODO: Load from analytics API
      // const data = await getAgentAnalytics(agentId, { timeRange, workspace_id: workspaceId })
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Mock loading
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [agentId, timeRange])

  const handleExportData = () => {
    // TODO: Implement data export
    console.log('Exporting analytics data...')
  }

  const getMetricIcon = (value: number, benchmark: number) => {
    if (value > benchmark) return <TrendingUp className='h-4 w-4 text-green-500' />
    if (value < benchmark * 0.9) return <TrendingDown className='h-4 w-4 text-red-500' />
    return <Activity className='h-4 w-4 text-yellow-500' />
  }

  const getMetricColor = (value: number, benchmark: number) => {
    if (value > benchmark) return 'text-green-600'
    if (value < benchmark * 0.9) return 'text-red-600'
    return 'text-yellow-600'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='font-bold text-2xl'>Agent Analytics</h2>
          <p className='text-muted-foreground'>Performance insights and conversation metrics</p>
        </div>

        <div className='flex items-center gap-2'>
          <Select
            value={timeRange}
            onValueChange={(value: typeof timeRange) => setTimeRange(value)}
          >
            <SelectTrigger className='w-32'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='7d'>Last 7 days</SelectItem>
              <SelectItem value='30d'>Last 30 days</SelectItem>
              <SelectItem value='90d'>Last 90 days</SelectItem>
              <SelectItem value='1y'>Last year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant='outline' size='sm' onClick={loadAnalytics} disabled={isLoading}>
            <RefreshCw className={`mr-1 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant='outline' size='sm' onClick={handleExportData}>
            <Download className='mr-1 h-4 w-4' />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 font-medium text-sm'>
              <MessageSquare className='h-4 w-4' />
              Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <span className='font-bold text-2xl'>{currentMetrics.totalConversations}</span>
              {getMetricIcon(currentMetrics.totalConversations, 300)}
            </div>
            <p className={`mt-1 text-xs ${getMetricColor(currentMetrics.totalConversations, 300)}`}>
              +14% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 font-medium text-sm'>
              <CheckCircle2 className='h-4 w-4' />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <span className='font-bold text-2xl'>{currentMetrics.successRate}%</span>
              {getMetricIcon(currentMetrics.successRate, 85)}
            </div>
            <Progress value={currentMetrics.successRate} className='mt-2' />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 font-medium text-sm'>
              <Star className='h-4 w-4' />
              Satisfaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <span className='font-bold text-2xl'>{currentMetrics.satisfactionScore}</span>
              {getMetricIcon(currentMetrics.satisfactionScore, 4.0)}
            </div>
            <div className='mt-2 flex'>
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < Math.floor(currentMetrics.satisfactionScore)
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 font-medium text-sm'>
              <Clock className='h-4 w-4' />
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <span className='font-bold text-2xl'>{currentMetrics.responseTime}s</span>
              {getMetricIcon(2 - currentMetrics.responseTime, 1)} {/* Lower is better */}
            </div>
            <p className={`mt-1 text-xs ${getMetricColor(2 - currentMetrics.responseTime, 1)}`}>
              -0.3s improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 font-medium text-sm'>
              <Target className='h-4 w-4' />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <span className='font-bold text-2xl'>{currentMetrics.completionRate}%</span>
              {getMetricIcon(currentMetrics.completionRate, 90)}
            </div>
            <Progress value={currentMetrics.completionRate} className='mt-2' />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 font-medium text-sm'>
              <Activity className='h-4 w-4' />
              Avg Length
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <span className='font-bold text-2xl'>{currentMetrics.averageLength}</span>
              {getMetricIcon(currentMetrics.averageLength, 6)}
            </div>
            <p className='mt-1 text-muted-foreground text-xs'>messages/conv</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-4'>
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='conversations'>Conversations</TabsTrigger>
          <TabsTrigger value='topics'>Topics</TabsTrigger>
          <TabsTrigger value='users'>Users</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='space-y-4'>
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
            {/* Performance Trend */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <TrendingUp className='h-5 w-5' />
                  Performance Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width='100%' height={300}>
                  <LineChart data={mockPerformanceData}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis
                      dataKey='date'
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: number, name: string) => [
                        typeof value === 'number' ? value.toFixed(1) : value,
                        name,
                      ]}
                    />
                    <Legend />
                    <Line
                      type='monotone'
                      dataKey='successRate'
                      stroke='#00C49F'
                      name='Success Rate %'
                    />
                    <Line
                      type='monotone'
                      dataKey='satisfactionScore'
                      stroke='#0088FE'
                      name='Satisfaction'
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Volume Trends */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <BarChart3 className='h-5 w-5' />
                  Conversation Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width='100%' height={300}>
                  <AreaChart data={mockPerformanceData}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis
                      dataKey='date'
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
                    <Area
                      type='monotone'
                      dataKey='conversations'
                      stroke='#8884d8'
                      fill='#8884d8'
                      fillOpacity={0.6}
                      name='Conversations'
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Response Time Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Clock className='h-5 w-5' />
                Response Time Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width='100%' height={200}>
                <BarChart data={mockPerformanceData}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis
                    dataKey='date'
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: number) => [`${value}s`, 'Response Time']}
                  />
                  <Bar dataKey='avgResponseTime' fill='#FFBB28' name='Avg Response Time (s)' />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='conversations' className='space-y-4'>
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
            {/* Conversation Outcomes */}
            <Card>
              <CardHeader>
                <CardTitle>Conversation Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <CheckCircle2 className='h-4 w-4 text-green-500' />
                      <span className='text-sm'>Successful Resolution</span>
                    </div>
                    <div className='text-right'>
                      <div className='font-medium'>87%</div>
                      <div className='text-muted-foreground text-xs'>298 conversations</div>
                    </div>
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <AlertTriangle className='h-4 w-4 text-yellow-500' />
                      <span className='text-sm'>Escalated to Human</span>
                    </div>
                    <div className='text-right'>
                      <div className='font-medium'>8%</div>
                      <div className='text-muted-foreground text-xs'>27 conversations</div>
                    </div>
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <Activity className='h-4 w-4 text-blue-500' />
                      <span className='text-sm'>User Abandoned</span>
                    </div>
                    <div className='text-right'>
                      <div className='font-medium'>5%</div>
                      <div className='text-muted-foreground text-xs'>17 conversations</div>
                    </div>
                  </div>
                </div>

                <div className='mt-4'>
                  <ResponsiveContainer width='100%' height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Successful', value: 87, fill: '#00C49F' },
                          { name: 'Escalated', value: 8, fill: '#FFBB28' },
                          { name: 'Abandoned', value: 5, fill: '#FF8042' },
                        ]}
                        cx='50%'
                        cy='50%'
                        innerRadius={60}
                        outerRadius={90}
                        dataKey='value'
                        label={({ value }) => `${value}%`}
                      >
                        {[
                          { name: 'Successful', value: 87, fill: '#00C49F' },
                          { name: 'Escalated', value: 8, fill: '#FFBB28' },
                          { name: 'Abandoned', value: 5, fill: '#FF8042' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Token Usage */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Brain className='h-5 w-5' />
                  Token Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width='100%' height={300}>
                  <AreaChart data={mockPerformanceData}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis
                      dataKey='date'
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: number) => [value.toLocaleString(), 'Tokens']}
                    />
                    <Area
                      type='monotone'
                      dataKey='tokens'
                      stroke='#8b5cf6'
                      fill='#8b5cf6'
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value='topics' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Topic Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {mockTopicAnalysis.map((topic, index) => (
                  <div key={index} className='rounded-lg border p-4'>
                    <div className='mb-3 flex items-center justify-between'>
                      <h4 className='font-medium'>{topic.topic}</h4>
                      <Badge variant='outline'>{topic.count} conversations</Badge>
                    </div>

                    <div className='grid grid-cols-3 gap-4 text-sm'>
                      <div>
                        <div className='text-muted-foreground'>Success Rate</div>
                        <div className='font-medium text-green-600'>{topic.successRate}%</div>
                        <Progress value={topic.successRate} className='mt-1 h-2' />
                      </div>
                      <div>
                        <div className='text-muted-foreground'>Avg Duration</div>
                        <div className='font-medium'>{topic.avgDuration} min</div>
                      </div>
                      <div>
                        <div className='text-muted-foreground'>Volume</div>
                        <div className='font-medium'>
                          {(
                            (topic.count / mockTopicAnalysis.reduce((sum, t) => sum + t.count, 0)) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='users' className='space-y-4'>
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
            {/* User Segments */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Users className='h-5 w-5' />
                  User Segments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {mockUserSegments.map((segment, index) => (
                    <div
                      key={index}
                      className='flex items-center justify-between rounded-lg border p-3'
                    >
                      <div className='flex items-center gap-3'>
                        <div
                          className='h-4 w-4 rounded'
                          style={{ backgroundColor: segment.color }}
                        />
                        <div>
                          <div className='font-medium'>{segment.segment}</div>
                          <div className='text-muted-foreground text-sm'>
                            {segment.users} users • {segment.conversations} conversations
                          </div>
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='flex items-center gap-1'>
                          <Star className='h-3 w-3 fill-yellow-500 text-yellow-500' />
                          <span className='font-medium text-sm'>{segment.satisfaction}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* User Satisfaction Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Satisfaction Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width='100%' height={300}>
                  <PieChart>
                    <Pie
                      data={mockUserSegments}
                      cx='50%'
                      cy='50%'
                      outerRadius={100}
                      dataKey='users'
                      label={({ segment, percent }) => `${segment} ${(percent * 100).toFixed(0)}%`}
                    >
                      {mockUserSegments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
