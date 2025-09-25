/**
 * Local Copilot User Input Component
 *
 * Provides a comprehensive input interface for users to send messages to
 * local Parlant agents, including text input, file attachments, contexts,
 * and streaming controls with full keyboard shortcuts support.
 */

'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Paperclip, Send, Square, Loader2, X, FileText, Image, Code } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logs/console/logger'
import type { MessageFileAttachment, MessageContext } from '@/stores/local-copilot/types'
import type { Agent } from '@/services/parlant/types'

const logger = createLogger('LocalCopilotUserInput')

interface LocalCopilotUserInputProps {
  onSubmit: (message: string, fileAttachments?: MessageFileAttachment[], contexts?: MessageContext[]) => void
  onAbort: () => void
  disabled?: boolean
  isLoading?: boolean
  isAborting?: boolean
  value: string
  onChange: (value: string) => void
  selectedAgent?: Agent | null
  placeholder?: string
  className?: string
  maxHeight?: number
}

export interface LocalCopilotUserInputRef {
  focus: () => void
  clear: () => void
  setValue: (value: string) => void
  addContext: (context: MessageContext) => void
  addFileAttachment: (file: MessageFileAttachment) => void
}

interface FileAttachmentPreviewProps {
  attachment: MessageFileAttachment
  onRemove: () => void
}

const FileAttachmentPreview: React.FC<FileAttachmentPreviewProps> = ({ attachment, onRemove }) => {
  const getFileIcon = () => {
    if (attachment.media_type.startsWith('image/')) {
      return <Image className="h-4 w-4 text-blue-500" />
    }
    if (attachment.media_type.includes('text') || attachment.media_type.includes('json')) {
      return <FileText className="h-4 w-4 text-green-500" />
    }
    if (attachment.media_type.includes('code') || attachment.filename.match(/\.(js|ts|py|java|cpp|c|rs|go)$/)) {
      return <Code className="h-4 w-4 text-purple-500" />
    }
    return <FileText className="h-4 w-4 text-muted-foreground" />
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Card className="group relative">
      <CardContent className="flex items-center gap-2 p-2">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-background">
          {getFileIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">{attachment.filename}</div>
          <div className="text-xs text-muted-foreground">
            {attachment.media_type} • {formatFileSize(attachment.size)}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  )
}

interface ContextPreviewProps {
  context: MessageContext
  onRemove: () => void
}

const ContextPreview: React.FC<ContextPreviewProps> = ({ context, onRemove }) => {
  return (
    <div className="group flex items-center gap-2 rounded-md border bg-muted/50 p-2">
      <Badge variant="outline" className="text-xs">
        {context.kind}
      </Badge>
      <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">
        {context.label}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-2 w-2" />
      </Button>
    </div>
  )
}

export const LocalCopilotUserInput = forwardRef<LocalCopilotUserInputRef, LocalCopilotUserInputProps>(({
  onSubmit,
  onAbort,
  disabled = false,
  isLoading = false,
  isAborting = false,
  value,
  onChange,
  selectedAgent,
  placeholder = 'Type your message...',
  className = '',
  maxHeight = 200,
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fileAttachments, setFileAttachments] = useState<MessageFileAttachment[]>([])
  const [contexts, setContexts] = useState<MessageContext[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const scrollHeight = textarea.scrollHeight
    const newHeight = Math.min(scrollHeight, maxHeight)
    textarea.style.height = `${newHeight}px`
  }, [maxHeight])

  useEffect(() => {
    adjustTextareaHeight()
  }, [value, adjustTextareaHeight])

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus()
    },
    clear: () => {
      onChange('')
      setFileAttachments([])
      setContexts([])
    },
    setValue: (newValue: string) => {
      onChange(newValue)
    },
    addContext: (context: MessageContext) => {
      setContexts(prev => [...prev, context])
    },
    addFileAttachment: (file: MessageFileAttachment) => {
      setFileAttachments(prev => [...prev, file])
    },
  }), [onChange])

  // Handle form submission
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()

    if (!value.trim() || isLoading || disabled) {
      return
    }

    logger.info('Submitting message', {
      messageLength: value.length,
      attachmentCount: fileAttachments.length,
      contextCount: contexts.length,
      agentId: selectedAgent?.id,
    })

    onSubmit(value, fileAttachments, contexts)

    // Clear input after successful submission
    onChange('')
    setFileAttachments([])
    setContexts([])
  }, [value, isLoading, disabled, fileAttachments, contexts, selectedAgent?.id, onSubmit, onChange])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape' && isLoading) {
      e.preventDefault()
      onAbort()
    }
  }, [handleSubmit, isLoading, onAbort])

  // File upload handling
  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return

    const newAttachments: MessageFileAttachment[] = []

    Array.from(files).forEach((file) => {
      const attachment: MessageFileAttachment = {
        id: `${Date.now()}_${Math.random()}`,
        filename: file.name,
        media_type: file.type || 'application/octet-stream',
        size: file.size,
        data: file, // Store the File object for later processing
      }
      newAttachments.push(attachment)
    })

    setFileAttachments(prev => [...prev, ...newAttachments])

    logger.info('Files attached', {
      fileCount: newAttachments.length,
      totalSize: newAttachments.reduce((sum, f) => sum + f.size, 0),
    })
  }, [])

  // Drag and drop handling
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileUpload(e.dataTransfer.files)
  }, [handleFileUpload])

  const hasAttachmentsOrContexts = fileAttachments.length > 0 || contexts.length > 0
  const canSubmit = value.trim() && !disabled && !isLoading

  return (
    <TooltipProvider>
      <div className={cn('border-t bg-background', className)}>
        {/* Attachments and Context Preview */}
        {hasAttachmentsOrContexts && (
          <>
            <div className="p-3 space-y-3">
              {/* File Attachments */}
              {fileAttachments.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    Attachments ({fileAttachments.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {fileAttachments.map((attachment, index) => (
                      <FileAttachmentPreview
                        key={attachment.id}
                        attachment={attachment}
                        onRemove={() => {
                          setFileAttachments(prev => prev.filter((_, i) => i !== index))
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Contexts */}
              {contexts.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    Context ({contexts.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {contexts.map((context, index) => (
                      <ContextPreview
                        key={`${context.kind}-${index}`}
                        context={context}
                        onRemove={() => {
                          setContexts(prev => prev.filter((_, i) => i !== index))
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Input Area */}
        <form onSubmit={handleSubmit}>
          <div
            className={cn(
              'relative flex items-end gap-2 p-3',
              isDragOver && 'bg-primary/5 border-primary/20'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/5 border-2 border-dashed border-primary/30 rounded-lg z-10">
                <div className="text-sm font-medium text-primary">Drop files here to attach</div>
              </div>
            )}

            {/* File Upload Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />

            {/* Attach Files Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  disabled={disabled || isLoading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attach files</p>
              </TooltipContent>
            </Tooltip>

            {/* Text Input */}
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className="min-h-[40px] resize-none border-0 bg-transparent p-2 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                style={{ maxHeight: `${maxHeight}px`, overflow: 'auto' }}
              />
            </div>

            {/* Submit/Abort Button */}
            {isLoading ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0"
                    onClick={onAbort}
                    disabled={isAborting}
                  >
                    {isAborting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Stop generation (Esc)</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="submit"
                    variant={canSubmit ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0"
                    disabled={!canSubmit}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Send message (⌘+Enter)</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Footer with shortcuts and agent info */}
          <div className="flex items-center justify-between px-3 pb-2 pt-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>⌘+Enter to send</span>
              {isLoading && <span>• Esc to stop</span>}
            </div>
            {selectedAgent && (
              <div className="text-xs text-muted-foreground">
                Chatting with {selectedAgent.name}
              </div>
            )}
          </div>
        </form>
      </div>
    </TooltipProvider>
  )
})

LocalCopilotUserInput.displayName = 'LocalCopilotUserInput'