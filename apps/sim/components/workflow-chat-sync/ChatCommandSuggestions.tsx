'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  ChevronDown,
  ChevronRight,
  Search,
  Lightbulb,
  Copy,
  Check,
  MessageSquare,
  Wrench,
  Play,
  Info
} from 'lucide-react'
import { CHAT_COMMANDS } from '@/stores/workflow-chat-sync/types'
import type { CommandSuggestion } from '@/stores/workflow-chat-sync/types'

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
  className = ""
}: ChatCommandSuggestionsProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    structure: !compact,
    execution: !compact,
    configuration: !compact,
    information: !compact
  })
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)

  // Group commands by category
  const commandsByCategory = useMemo(() => {
    const commands = Object.values(CHAT_COMMANDS)

    const filtered = searchTerm
      ? commands.filter(cmd =>
          cmd.command.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cmd.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cmd.example.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : commands

    return {
      structure: filtered.filter(cmd => cmd.category === 'structure'),
      execution: filtered.filter(cmd => cmd.category === 'execution'),
      configuration: filtered.filter(cmd => cmd.category === 'configuration'),
      information: filtered.filter(cmd => cmd.category === 'information')
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
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'structure':
        return <Wrench className="h-4 w-4" />
      case 'execution':
        return <Play className="h-4 w-4" />
      case 'configuration':
        return <MessageSquare className="h-4 w-4" />
      case 'information':
        return <Info className="h-4 w-4" />
      default:
        return <Lightbulb className="h-4 w-4" />
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

  const totalCommands = Object.values(commandsByCategory).reduce((sum, commands) => sum + commands.length, 0)

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Available Commands
          <Badge variant="secondary" className="text-xs">
            {totalCommands}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search commands..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-8"
          />
        </div>

        {/* Categories */}
        <ScrollArea className="max-h-96">
          <div className="space-y-3">
            {Object.entries(commandsByCategory).map(([category, commands]) => (
              commands.length > 0 && (
                <div key={category} className="space-y-2">
                  <Collapsible
                    open={expandedCategories[category]}
                    onOpenChange={() => toggleCategory(category)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between h-8 px-2">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(category)}
                          <span className="text-sm font-medium">
                            {getCategoryTitle(category)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {commands.length}
                          </Badge>
                        </div>
                        {expandedCategories[category] ?
                          <ChevronDown className="h-4 w-4" /> :
                          <ChevronRight className="h-4 w-4" />
                        }
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-2">
                      {!compact && (
                        <p className="text-xs text-muted-foreground px-2">
                          {getCategoryDescription(category)}
                        </p>
                      )}

                      <div className="space-y-1">
                        {commands.map((cmd) => (
                          <div
                            key={cmd.command}
                            className="group p-2 rounded border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <code className="text-xs font-mono bg-muted px-1 rounded">
                                    {cmd.command}
                                  </code>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {cmd.description}
                                </p>
                                {!compact && (
                                  <div className="mt-2">
                                    <p className="text-xs text-muted-foreground">Example:</p>
                                    <code className="text-xs font-mono text-blue-600 dark:text-blue-400">
                                      {cmd.example}
                                    </code>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleCopyCommand(cmd.example)}
                                  title="Copy example"
                                >
                                  {copiedCommand === cmd.example ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                                {onCommandSelect && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleCommandClick(cmd.example)}
                                    title="Use example"
                                  >
                                    <MessageSquare className="h-3 w-3" />
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
            ))}

            {totalCommands === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  No commands found matching "{searchTerm}"
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="mt-2"
                >
                  Clear search
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Tips */}
        {!compact && totalCommands > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Tips:</p>
                <ul className="space-y-0.5 list-disc list-inside">
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