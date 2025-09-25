'use client'

import { useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Info,
  Lightbulb,
  MessageSquare,
  Play,
  Search,
  Wrench,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CHAT_COMMANDS } from '@/stores/workflow-chat-sync/types'

interface ChatCommandSuggestionsProps {
  onCommandSelect?: (command: string) => void
  compact?: boolean
  className?: string
}

/**
 * ChatCommandSuggestions Component
 *
 * Displays available chat commands organized by category,
 * with search functionality and examples.
 */
export function ChatCommandSuggestions({
  onCommandSelect,
  compact = false,
  className = '',
}: ChatCommandSuggestionsProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    structure: !compact,
    execution: !compact,
    configuration: !compact,
    information: !compact,
  })
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)

  // Group commands by category
  const commandsByCategory = useMemo(() => {
    const commands = Object.values(CHAT_COMMANDS)

    const filtered = searchTerm
      ? commands.filter(
          (cmd) =>
            cmd.command.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cmd.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cmd.example.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : commands

    return {
      structure: filtered.filter((cmd) => cmd.category === 'structure'),
      execution: filtered.filter((cmd) => cmd.category === 'execution'),
      configuration: filtered.filter((cmd) => cmd.category === 'configuration'),
      information: filtered.filter((cmd) => cmd.category === 'information'),
    }
  }, [searchTerm])

  const handleCommandClick = (command: string) => {
    if (onCommandSelect) {
      onCommandSelect(command)
    }
  }

  const handleCopyCommand = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command)
      setCopiedCommand(command)
      setTimeout(() => setCopiedCommand(null), 2000)
    } catch (error) {
      console.error('Failed to copy command:', error)
    }
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'structure':
        return <Wrench className='h-4 w-4' />
      case 'execution':
        return <Play className='h-4 w-4' />
      case 'configuration':
        return <MessageSquare className='h-4 w-4' />
      case 'information':
        return <Info className='h-4 w-4' />
      default:
        return <Lightbulb className='h-4 w-4' />
    }
  }

  const getCategoryTitle = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1)
  }

  const getCategoryDescription = (category: string) => {
    switch (category) {
      case 'structure':
        return 'Add, remove, and connect workflow blocks'
      case 'execution':
        return 'Control workflow execution'
      case 'configuration':
        return 'Modify block properties and settings'
      case 'information':
        return 'Get information about the workflow'
      default:
        return ''
    }
  }

  const totalCommands = Object.values(commandsByCategory).reduce(
    (sum, commands) => sum + commands.length,
    0
  )

  return (
    <Card className={`${className}`}>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 font-medium text-sm'>
          <Lightbulb className='h-4 w-4' />
          Available Commands
          <Badge variant='secondary' className='text-xs'>
            {totalCommands}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* Search */}
        <div className='relative'>
          <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground' />
          <Input
            placeholder='Search commands...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='h-8 pl-10'
          />
        </div>

        {/* Categories */}
        <ScrollArea className='max-h-96'>
          <div className='space-y-3'>
            {Object.entries(commandsByCategory).map(
              ([category, commands]) =>
                commands.length > 0 && (
                  <div key={category} className='space-y-2'>
                    <Collapsible
                      open={expandedCategories[category]}
                      onOpenChange={() => toggleCategory(category)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant='ghost' className='h-8 w-full justify-between px-2'>
                          <div className='flex items-center gap-2'>
                            {getCategoryIcon(category)}
                            <span className='font-medium text-sm'>
                              {getCategoryTitle(category)}
                            </span>
                            <Badge variant='outline' className='text-xs'>
                              {commands.length}
                            </Badge>
                          </div>
                          {expandedCategories[category] ? (
                            <ChevronDown className='h-4 w-4' />
                          ) : (
                            <ChevronRight className='h-4 w-4' />
                          )}
                        </Button>
                      </CollapsibleTrigger>

                      <CollapsibleContent className='space-y-2'>
                        {!compact && (
                          <p className='px-2 text-muted-foreground text-xs'>
                            {getCategoryDescription(category)}
                          </p>
                        )}

                        <div className='space-y-1'>
                          {commands.map((cmd) => (
                            <div
                              key={cmd.command}
                              className='group rounded border bg-card p-2 transition-colors hover:bg-accent/50'
                            >
                              <div className='flex items-center justify-between'>
                                <div className='min-w-0 flex-1'>
                                  <div className='flex items-center gap-2'>
                                    <code className='rounded bg-muted px-1 font-mono text-xs'>
                                      {cmd.command}
                                    </code>
                                  </div>
                                  <p className='mt-1 line-clamp-2 text-muted-foreground text-xs'>
                                    {cmd.description}
                                  </p>
                                  {!compact && (
                                    <div className='mt-2'>
                                      <p className='text-muted-foreground text-xs'>Example:</p>
                                      <code className='font-mono text-blue-600 text-xs dark:text-blue-400'>
                                        {cmd.example}
                                      </code>
                                    </div>
                                  )}
                                </div>

                                <div className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
                                  <Button
                                    size='sm'
                                    variant='ghost'
                                    className='h-6 w-6 p-0'
                                    onClick={() => handleCopyCommand(cmd.example)}
                                    title='Copy example'
                                  >
                                    {copiedCommand === cmd.example ? (
                                      <Check className='h-3 w-3 text-green-500' />
                                    ) : (
                                      <Copy className='h-3 w-3' />
                                    )}
                                  </Button>
                                  {onCommandSelect && (
                                    <Button
                                      size='sm'
                                      variant='ghost'
                                      className='h-6 w-6 p-0'
                                      onClick={() => handleCommandClick(cmd.example)}
                                      title='Use example'
                                    >
                                      <MessageSquare className='h-3 w-3' />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )
            )}

            {totalCommands === 0 && (
              <div className='py-4 text-center'>
                <p className='text-muted-foreground text-sm'>
                  No commands found matching "{searchTerm}"
                </p>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setSearchTerm('')}
                  className='mt-2'
                >
                  Clear search
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Tips */}
        {!compact && totalCommands > 0 && (
          <div className='border-t pt-3'>
            <div className='flex items-start gap-2'>
              <Lightbulb className='mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-500' />
              <div className='text-muted-foreground text-xs'>
                <p className='mb-1 font-medium'>Tips:</p>
                <ul className='list-inside list-disc space-y-0.5'>
                  <li>Commands are case-insensitive</li>
                  <li>Use natural language - the system will understand</li>
                  <li>Block names can be partial matches</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ChatCommandSuggestions
