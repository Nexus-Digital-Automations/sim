'use client'

import {
  forwardRef,
  type KeyboardEvent,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { ArrowUp, Bot, Brain, Loader2 } from 'lucide-react'
import {
  Button,
  Switch,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui'
import { useSession } from '@/lib/auth-client'
import { createLogger } from '@/lib/logs/console/logger'
import { cn } from '@/lib/utils'
import { useCopilotStore } from '@/stores/copilot/store'
import { CopilotSlider } from './components/copilot-slider'
import {
  type AttachedFile,
  FileAttachmentManager,
  type MessageFileAttachment,
} from './components/file-attachment-manager'
import { type ChatContext, MentionSystem } from './components/mention-system'

const logger = createLogger('CopilotUserInput')

interface UserInputProps {
  onSubmit: (
    message: string,
    fileAttachments?: MessageFileAttachment[],
    contexts?: ChatContext[]
  ) => void
  onAbort?: () => void
  disabled?: boolean
  isLoading?: boolean
  isAborting?: boolean
  placeholder?: string
  className?: string
  mode?: 'ask' | 'agent'
  onModeChange?: (mode: 'ask' | 'agent') => void
  value?: string // Controlled value from outside
  onChange?: (value: string) => void // Callback when value changes
}

interface UserInputRef {
  focus: () => void
}

const UserInputRefactored = forwardRef<UserInputRef, UserInputProps>(
  (
    {
      onSubmit,
      onAbort,
      disabled = false,
      isLoading = false,
      isAborting = false,
      placeholder,
      className,
      mode = 'agent',
      onModeChange,
      value: controlledValue,
      onChange: onControlledChange,
    },
    ref
  ) => {
    // Core state
    const [internalMessage, setInternalMessage] = useState('')
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
    const [selectedContexts, setSelectedContexts] = useState<ChatContext[]>([])

    // UI state
    const [showMentionMenu, setShowMentionMenu] = useState(false)

    // Refs
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Hooks
    const { data: session } = useSession()
    const { currentChat, workflowId } = useCopilotStore()

    // Controlled vs uncontrolled value handling
    const message = controlledValue !== undefined ? controlledValue : internalMessage
    const setMessage = (value: string) => {
      if (controlledValue !== undefined) {
        onControlledChange?.(value)
      } else {
        setInternalMessage(value)
      }
    }

    // Determine placeholder based on mode
    const effectivePlaceholder =
      placeholder ||
      (mode === 'ask' ? 'Ask, plan, understand workflows' : 'Build, edit, debug workflows')

    // Focus management
    useImperativeHandle(ref, () => ({
      focus: () => {
        textareaRef.current?.focus()
      },
    }))

    // Auto-resize textarea
    useEffect(() => {
      const textarea = textareaRef.current
      if (!textarea) return

      const adjustHeight = () => {
        textarea.style.height = 'auto'
        const newHeight = Math.min(textarea.scrollHeight, 200) // Max 200px height
        textarea.style.height = `${newHeight}px`
      }

      adjustHeight()
    }, [message])

    // Submit handling
    const handleSubmit = () => {
      if (!message.trim() || disabled || isLoading) return

      // Convert attached files to MessageFileAttachment format
      const fileAttachments: MessageFileAttachment[] = attachedFiles
        .filter((file) => !file.uploading && file.key)
        .map((file) => ({
          id: file.id,
          key: file.key!,
          filename: file.name,
          media_type: file.type,
          size: file.size,
        }))

      onSubmit(message.trim(), fileAttachments, selectedContexts)

      // Reset form
      setMessage('')
      setAttachedFiles([])
      setSelectedContexts([])
    }

    // Keyboard handling
    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter (but not Shift+Enter)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }

      // Handle mention system navigation
      if (showMentionMenu) {
        // Mention system will handle its own keyboard events
        return
      }
    }

    // Abort handling
    const handleAbort = () => {
      if (onAbort && (isLoading || isAborting)) {
        onAbort()
      }
    }

    const canSubmit = message.trim() && !disabled && !isLoading

    return (
      <div className={cn('user-input-container relative', className)}>
        {/* Mode toggle */}
        {onModeChange && (
          <div className='mb-3 flex items-center gap-2'>
            <Bot className='h-4 w-4 text-gray-500' />
            <span className='text-gray-600 text-sm dark:text-gray-400'>Ask</span>
            <Switch
              checked={mode === 'agent'}
              onCheckedChange={(checked) => onModeChange(checked ? 'agent' : 'ask')}
              disabled={disabled}
            />
            <span className='text-gray-600 text-sm dark:text-gray-400'>Agent</span>
            <Brain className='h-4 w-4 text-gray-500' />
          </div>
        )}

        {/* Context and file management */}
        <div className='mb-2'>
          <MentionSystem
            message={message}
            onMessageChange={setMessage}
            selectedContexts={selectedContexts}
            onContextsChange={setSelectedContexts}
            disabled={disabled}
          />
        </div>

        {/* Main input area */}
        <div className='relative rounded-lg border border-gray-200 focus-within:border-transparent focus-within:ring-2 focus-within:ring-blue-500 dark:border-gray-700'>
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={effectivePlaceholder}
            disabled={disabled}
            className='max-h-[200px] min-h-[44px] resize-none border-0 pr-20 focus-visible:ring-0 focus-visible:ring-offset-0'
            rows={1}
          />

          {/* Action buttons */}
          <div className='absolute right-2 bottom-2 flex items-center gap-1'>
            {/* File attachment */}
            <FileAttachmentManager
              attachedFiles={attachedFiles}
              onFilesChange={setAttachedFiles}
              disabled={disabled}
            />

            {/* Submit/Abort button */}
            {isLoading || isAborting ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type='button'
                      size='sm'
                      variant='ghost'
                      onClick={handleAbort}
                      className='p-2'
                    >
                      <Loader2 className='h-4 w-4 animate-spin' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Stop generation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type='button'
                      size='sm'
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      className='p-2'
                    >
                      <ArrowUp className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Send message (Enter)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Copilot slider for agent mode */}
        {mode === 'agent' && (
          <div className='mt-3'>
            <CopilotSlider disabled={disabled} />
          </div>
        )}
      </div>
    )
  }
)

UserInputRefactored.displayName = 'UserInputRefactored'

export default UserInputRefactored
