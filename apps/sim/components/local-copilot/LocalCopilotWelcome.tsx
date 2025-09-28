/**
 * Local Copilot Welcome Component
 *
 * Displays welcome screen when no conversation has started yet,
 * showing agent information, sample questions, and quick actions
 * to help users get started with the local copilot.
 */

'use client'

import { useState } from 'react'
import { Bot, ChevronRight, MessageSquare, Settings, Sparkles, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { createLogger } from '@/lib/logs/console/logger'
import type { Agent } from '@/services/parlant/types'
import type { MessageContext, MessageFileAttachment } from '@/stores/local-copilot/types'

const logger = createLogger('LocalCopilotWelcome')

interface LocalCopilotWelcomeProps {
  selectedAgent?: Agent | null
  onQuestionClick: (
    question: string,
    attachments?: MessageFileAttachment[],
    contexts?: MessageContext[]
  ) => void
  onSelectAgent: () => void
  hasAgents: boolean
  className?: string
}

interface QuestionCardProps {
  title: string
  description: string
  question: string
  icon: React.ReactNode
  category: string
  onClick: (question: string) => void
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  title,
  description,
  question,
  icon,
  category,
  onClick,
}) => {
  return (
    <Card className='group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md'>
      <CardContent className='p-4' onClick={() => onClick(question)}>
        <div className='flex items-start gap-3'>
          <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary'>
            {icon}
          </div>
          <div className='flex-1 space-y-1'>
            <div className='flex items-center justify-between'>
              <h4 className='font-medium text-sm'>{title}</h4>
              <ChevronRight className='h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100' />
            </div>
            <p className='text-muted-foreground text-xs'>{description}</p>
            <Badge variant='outline' className='text-xs'>
              {category}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const getAgentQuestions = (agent: Agent) => {
  const baseQuestions = [
    {
      title: 'Analyze Current Code',
      description: 'Review the current codebase and identify improvements',
      question: 'Please analyze the current code structure and suggest improvements',
      icon: <Zap className='h-4 w-4' />,
      category: 'Analysis',
    },
    {
      title: 'Debug Issue',
      description: 'Help investigate and resolve code problems',
      question: "I'm experiencing an issue with my code. Can you help me debug it?",
      icon: <Settings className='h-4 w-4' />,
      category: 'Debugging',
    },
    {
      title: 'Explain Concept',
      description: 'Get explanations about programming concepts or patterns',
      question: 'Can you explain how this code pattern works?',
      icon: <MessageSquare className='h-4 w-4' />,
      category: 'Learning',
    },
  ]

  // Add agent-specific questions based on tools/capabilities
  const agentQuestions = []

  if (agent.tools?.includes('file_operations')) {
    agentQuestions.push({
      title: 'File Operations',
      description: 'Help with reading, writing, and managing files',
      question: 'Can you help me organize and manage files in this project?',
      icon: <Zap className='h-4 w-4' />,
      category: 'File Management',
    })
  }

  if (agent.tools?.includes('code_analysis')) {
    agentQuestions.push({
      title: 'Code Review',
      description: 'Perform comprehensive code analysis and review',
      question: 'Please review this code for best practices and potential issues',
      icon: <Sparkles className='h-4 w-4' />,
      category: 'Code Quality',
    })
  }

  if (agent.tools?.includes('testing')) {
    agentQuestions.push({
      title: 'Testing Strategy',
      description: 'Help create and improve test coverage',
      question: 'What testing strategy would you recommend for this project?',
      icon: <Settings className='h-4 w-4' />,
      category: 'Testing',
    })
  }

  return [...baseQuestions, ...agentQuestions]
}

export const LocalCopilotWelcome: React.FC<LocalCopilotWelcomeProps> = ({
  selectedAgent,
  onQuestionClick,
  onSelectAgent,
  hasAgents,
  className = '',
}) => {
  const [hoveredQuestion, setHoveredQuestion] = useState<string | null>(null)

  const handleQuestionClick = (question: string) => {
    logger.info('Welcome question clicked', {
      question: question.substring(0, 50),
      agentId: selectedAgent?.id,
    })
    onQuestionClick(question)
  }

  const questions = selectedAgent ? getAgentQuestions(selectedAgent) : []

  if (!hasAgents) {
    return (
      <div
        className={`flex flex-col items-center justify-center space-y-4 p-8 text-center ${className}`}
      >
        <div className='flex h-16 w-16 items-center justify-center rounded-full bg-muted/50'>
          <Bot className='h-8 w-8 text-muted-foreground' />
        </div>
        <div className='space-y-2'>
          <h3 className='font-medium text-lg'>No Agents Available</h3>
          <p className='max-w-md text-muted-foreground text-sm'>
            No Parlant agents are available in this workspace. Check your agent configuration and
            ensure agents are properly deployed and accessible.
          </p>
        </div>
      </div>
    )
  }

  if (!selectedAgent) {
    return (
      <div
        className={`flex flex-col items-center justify-center space-y-4 p-8 text-center ${className}`}
      >
        <div className='flex h-16 w-16 items-center justify-center rounded-full bg-primary/10'>
          <Bot className='h-8 w-8 text-primary' />
        </div>
        <div className='space-y-2'>
          <h3 className='font-medium text-lg'>Select an Agent</h3>
          <p className='max-w-md text-muted-foreground text-sm'>
            Choose a Parlant agent to start your conversation. Each agent has different capabilities
            and specializations.
          </p>
        </div>
        <Button onClick={onSelectAgent} className='mt-4'>
          <Settings className='mr-2 h-4 w-4' />
          Choose Agent
        </Button>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={`space-y-6 p-6 ${className}`}>
        {/* Agent Info Header */}
        <div className='space-y-4'>
          <div className='flex items-center gap-4'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary/10'>
              <Bot className='h-6 w-6 text-primary' />
            </div>
            <div className='space-y-1'>
              <h2 className='font-semibold text-xl'>Chat with {selectedAgent.Name}</h2>
              <p className='text-muted-foreground text-sm'>
                {selectedAgent.description ||
                  `AI agent specialized for ${selectedAgent.Name.toLowerCase()} tasks`}
              </p>
            </div>
          </div>

          {/* Agent Capabilities */}
          {selectedAgent.tools && selectedAgent.tools.length > 0 && (
            <div className='space-y-2'>
              <div className='flex items-center gap-2'>
                <Sparkles className='h-4 w-4 text-primary' />
                <span className='font-medium text-sm'>Available Capabilities</span>
              </div>
              <div className='flex flex-wrap gap-2'>
                {selectedAgent.tools.map((tool) => (
                  <Tooltip key={tool}>
                    <TooltipTrigger>
                      <Badge variant='secondary' className='text-xs'>
                        {tool.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Tool: {tool}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Sample Questions */}
        <div className='space-y-4'>
          <div className='flex items-center gap-2'>
            <MessageSquare className='h-4 w-4 text-primary' />
            <span className='font-medium text-sm'>Get Started</span>
          </div>

          {questions.length > 0 ? (
            <ScrollArea className='h-64'>
              <div className='grid gap-3'>
                {questions.map((q, index) => (
                  <QuestionCard
                    key={index}
                    title={q.title}
                    description={q.description}
                    question={q.question}
                    icon={q.icon}
                    category={q.category}
                    onClick={handleQuestionClick}
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <Card className='border-dashed'>
              <CardContent className='flex items-center justify-center py-8'>
                <div className='space-y-2 text-center'>
                  <MessageSquare className='mx-auto h-8 w-8 text-muted-foreground' />
                  <p className='text-muted-foreground text-sm'>
                    Start typing your message below to begin the conversation
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tips */}
        <div className='rounded-lg border bg-muted/50 p-4'>
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <Sparkles className='h-4 w-4 text-primary' />
              <span className='font-medium text-sm'>Tips</span>
            </div>
            <ul className='space-y-1 text-muted-foreground text-xs'>
              <li>• Be specific about what you need help with</li>
              <li>• You can attach files by dragging them into the input area</li>
              <li>• The agent can see the current workspace context</li>
              <li>• Use the settings button to switch between different agents</li>
            </ul>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
