'use client'

import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import {
  AtSign,
  Blocks,
  BookOpen,
  Bot,
  Brain,
  ChevronRight,
  FileText,
  LibraryBig,
  Workflow,
} from 'lucide-react'
import { createLogger } from '@/lib/logs/console/logger'
import { cn } from '@/lib/utils'

const logger = createLogger('MentionSystem')

export interface ChatContext {
  type: 'chat' | 'workflow' | 'knowledge' | 'block' | 'template' | 'log'
  id: string
  name: string
  metadata?: Record<string, any>
}

interface MentionOption {
  id: string
  label: string
  icon: React.ReactNode
  description: string
  hasSubmenu: boolean
}

interface MentionSystemProps {
  message: string
  onMessageChange: (message: string) => void
  selectedContexts: ChatContext[]
  onContextsChange: (contexts: ChatContext[]) => void
  disabled?: boolean
  className?: string
}

export function MentionSystem({
  message,
  onMessageChange,
  selectedContexts,
  onContextsChange,
  disabled = false,
  className = '',
}: MentionSystemProps) {
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0)
  const [openSubmenuFor, setOpenSubmenuFor] = useState<string | null>(null)
  const [submenuActiveIndex, setSubmenuActiveIndex] = useState(0)
  const [mentionQuery, setMentionQuery] = useState('')

  const mentionMenuRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)

  const mentionOptions: MentionOption[] = [
    {
      id: 'chats',
      label: 'Chats',
      icon: <Bot className='h-4 w-4' />,
      description: 'Reference previous conversations',
      hasSubmenu: true,
    },
    {
      id: 'workflows',
      label: 'Workflows',
      icon: <Workflow className='h-4 w-4' />,
      description: 'Reference existing workflows',
      hasSubmenu: true,
    },
    {
      id: 'workflow-blocks',
      label: 'Workflow Blocks',
      icon: <Blocks className='h-4 w-4' />,
      description: 'Reference blocks from current workflow',
      hasSubmenu: true,
    },
    {
      id: 'blocks',
      label: 'Blocks',
      icon: <Blocks className='h-4 w-4' />,
      description: 'Reference available block types',
      hasSubmenu: true,
    },
    {
      id: 'knowledge',
      label: 'Knowledge',
      icon: <LibraryBig className='h-4 w-4' />,
      description: 'Reference knowledge bases',
      hasSubmenu: true,
    },
    {
      id: 'docs',
      label: 'Docs',
      icon: <BookOpen className='h-4 w-4' />,
      description: 'Reference documentation',
      hasSubmenu: true,
    },
    {
      id: 'templates',
      label: 'Templates',
      icon: <FileText className='h-4 w-4' />,
      description: 'Reference workflow templates',
      hasSubmenu: true,
    },
    {
      id: 'logs',
      label: 'Logs',
      icon: <Brain className='h-4 w-4' />,
      description: 'Reference execution logs',
      hasSubmenu: true,
    },
  ]

  // Detect @ mentions in message
  useEffect(() => {
    const cursorPosition = message.length
    const beforeCursor = message.slice(0, cursorPosition)
    const mentionMatch = beforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1])
      setShowMentionMenu(true)
      setMentionActiveIndex(0)
    } else {
      setShowMentionMenu(false)
      setOpenSubmenuFor(null)
    }
  }, [message])

  // Filter mention options based on query
  const filteredMentionOptions = mentionOptions.filter((option) =>
    option.label.toLowerCase().includes(mentionQuery.toLowerCase())
  )

  const handleMentionKeyDown = (e: KeyboardEvent) => {
    if (!showMentionMenu && !openSubmenuFor) return

    if (showMentionMenu && !openSubmenuFor) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setMentionActiveIndex((prev) => Math.min(prev + 1, filteredMentionOptions.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setMentionActiveIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'ArrowRight':
        case 'Enter': {
          e.preventDefault()
          const selectedOption = filteredMentionOptions[mentionActiveIndex]
          if (selectedOption?.hasSubmenu) {
            setOpenSubmenuFor(selectedOption.id)
            setSubmenuActiveIndex(0)
          } else {
            selectMentionOption(selectedOption)
          }
          break
        }
        case 'Escape':
          e.preventDefault()
          setShowMentionMenu(false)
          break
      }
    } else if (openSubmenuFor) {
      switch (e.key) {
        case 'ArrowLeft':
        case 'Escape':
          e.preventDefault()
          setOpenSubmenuFor(null)
          break
        case 'ArrowDown':
          e.preventDefault()
          // Handle submenu navigation (would implement based on submenu content)
          break
        case 'ArrowUp':
          e.preventDefault()
          // Handle submenu navigation
          break
        case 'Enter':
          e.preventDefault()
          // Handle submenu selection
          break
      }
    }
  }

  const selectMentionOption = (option: MentionOption) => {
    const beforeMention = message.replace(/@\w*$/, '')
    const newMessage = `${beforeMention}@${option.label} `
    onMessageChange(newMessage)
    setShowMentionMenu(false)
    setOpenSubmenuFor(null)

    // Add context
    const newContext: ChatContext = {
      type: option.id as ChatContext['type'],
      id: option.id,
      name: option.label,
    }
    onContextsChange([...selectedContexts, newContext])
  }

  const removeContext = (contextId: string) => {
    onContextsChange(selectedContexts.filter((ctx) => ctx.id !== contextId))
  }

  return (
    <div className={`mention-system relative ${className}`}>
      {/* Selected contexts display */}
      {selectedContexts.length > 0 && (
        <div className='mb-2 flex flex-wrap gap-1'>
          {selectedContexts.map((context) => (
            <div
              key={context.id}
              className='flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-blue-800 text-xs dark:bg-blue-900 dark:text-blue-200'
            >
              <AtSign className='h-3 w-3' />
              <span>{context.name}</span>
              <button
                type='button'
                onClick={() => removeContext(context.id)}
                className='rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800'
                disabled={disabled}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mention menu */}
      {showMentionMenu && !disabled && (
        <div
          ref={mentionMenuRef}
          className='absolute bottom-full left-0 z-50 mb-2 max-h-64 w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800'
        >
          <div className='p-2'>
            <div className='mb-2 font-medium text-gray-500 text-xs dark:text-gray-400'>
              @ Mention
            </div>
            {filteredMentionOptions.map((option, index) => (
              <div
                key={option.id}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded p-2',
                  index === mentionActiveIndex
                    ? 'bg-blue-100 dark:bg-blue-900'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
                onClick={() => {
                  if (option.hasSubmenu) {
                    setOpenSubmenuFor(option.id)
                    setSubmenuActiveIndex(0)
                  } else {
                    selectMentionOption(option)
                  }
                }}
              >
                {option.icon}
                <div className='flex-1'>
                  <div className='font-medium text-sm'>{option.label}</div>
                  <div className='text-gray-500 text-xs dark:text-gray-400'>
                    {option.description}
                  </div>
                </div>
                {option.hasSubmenu && <ChevronRight className='h-4 w-4 text-gray-400' />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submenu */}
      {openSubmenuFor && (
        <div
          ref={submenuRef}
          className='absolute bottom-full left-64 z-50 mb-2 max-h-64 w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800'
        >
          <div className='p-2'>
            <div className='mb-2 font-medium text-gray-500 text-xs dark:text-gray-400'>
              {mentionOptions.find((opt) => opt.id === openSubmenuFor)?.label}
            </div>
            <div className='p-2 text-gray-500 text-sm dark:text-gray-400'>
              Loading {openSubmenuFor}...
            </div>
          </div>
        </div>
      )}

      {/* Expose keyboard handler for parent component */}
      <div className='hidden' onKeyDown={handleMentionKeyDown} />
    </div>
  )
}
