'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertTriangle,
  MessageSquare,
  Eye,
  GitMerge,
  Clock,
  User,
  Bot,
  Check,
  X
} from 'lucide-react'
import { useWorkflowChatSyncStore } from '@/stores/workflow-chat-sync/store'
import type { SyncConflict } from '@/stores/workflow-chat-sync/types'

interface ConflictResolutionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * ConflictResolutionDialog Component
 *
 * Handles conflicts between simultaneous changes in visual and chat interfaces,
 * allowing users to choose resolution strategies.
 */
export function ConflictResolutionDialog({
  open,
  onOpenChange
}: ConflictResolutionDialogProps) {
  const { conflicts, resolveConflict } = useWorkflowChatSyncStore()
  const [selectedResolutions, setSelectedResolutions] = useState<Record<string, 'chat' | 'visual' | 'merge'>>({})

  const handleResolutionChange = (conflictId: string, resolution: 'chat' | 'visual' | 'merge') => {
    setSelectedResolutions(prev => ({
      ...prev,
      [conflictId]: resolution
    }))
  }

  const handleResolveConflicts = () => {
    conflicts.forEach(conflict => {
      const resolution = selectedResolutions[conflict.id] || conflict.suggestedResolution || 'visual'
      resolveConflict(conflict.id, resolution)
    })
    setSelectedResolutions({})
    onOpenChange(false)
  }

  const handleResolveAll = (resolution: 'chat' | 'visual' | 'merge') => {
    const resolutions: Record<string, 'chat' | 'visual' | 'merge'> = {}
    conflicts.forEach(conflict => {
      resolutions[conflict.id] = resolution
    })
    setSelectedResolutions(resolutions)
  }

  const getConflictTypeDescription = (type: string) => {
    switch (type) {
      case 'concurrent_block_modification':
        return 'Block was modified in both visual and chat interfaces'
      case 'concurrent_connection_change':
        return 'Connections were changed in both interfaces'
      case 'execution_state_conflict':
        return 'Execution state changed simultaneously'
      case 'structural_conflict':
        return 'Workflow structure changed in conflicting ways'
      default:
        return 'Unknown conflict type'
    }
  }

  const getResolutionDescription = (resolution: 'chat' | 'visual' | 'merge') => {
    switch (resolution) {
      case 'chat':
        return 'Use changes made through chat interface'
      case 'visual':
        return 'Use changes made through visual interface'
      case 'merge':
        return 'Attempt to merge both changes (if possible)'
    }
  }

  const getResolutionIcon = (resolution: 'chat' | 'visual' | 'merge') => {
    switch (resolution) {
      case 'chat':
        return <MessageSquare className="h-4 w-4" />
      case 'visual':
        return <Eye className="h-4 w-4" />
      case 'merge':
        return <GitMerge className="h-4 w-4" />
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  if (conflicts.length === 0) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Resolve Synchronization Conflicts
            <Badge variant="destructive">{conflicts.length}</Badge>
          </DialogTitle>
          <DialogDescription>
            Changes were made simultaneously in both the visual workflow and chat interface.
            Please choose how to resolve each conflict.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Actions */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Quick Resolution</AlertTitle>
            <AlertDescription className="mt-2">
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveAll('visual')}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Use All Visual Changes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveAll('chat')}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Use All Chat Changes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveAll('merge')}
                >
                  <GitMerge className="h-3 w-3 mr-1" />
                  Attempt to Merge All
                </Button>
              </div>
            </AlertDescription>
          </Alert>

          {/* Individual Conflicts */}
          <div className="space-y-4">
            {conflicts.map((conflict, index) => (
              <Card key={conflict.id} className="border-amber-200 dark:border-amber-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>Conflict #{index + 1}</span>
                      <Badge variant="outline">{conflict.type}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(conflict.timestamp)}
                    </div>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {getConflictTypeDescription(conflict.type)}
                  </p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm">{conflict.description}</p>

                  {/* Conflicting Changes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Visual Change */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Eye className="h-4 w-4 text-blue-500" />
                        Visual Interface Change
                      </div>
                      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                        <CardContent className="pt-3">
                          <div className="text-xs space-y-1">
                            <p><strong>Type:</strong> {conflict.visualChange.type}</p>
                            <p><strong>Time:</strong> {formatTimestamp(conflict.visualChange.timestamp)}</p>
                            <p><strong>Data:</strong></p>
                            <code className="block bg-background p-2 rounded text-xs overflow-x-auto">
                              {JSON.stringify(conflict.visualChange.data, null, 2)}
                            </code>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Chat Change */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <MessageSquare className="h-4 w-4 text-green-500" />
                        Chat Interface Change
                      </div>
                      <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                        <CardContent className="pt-3">
                          <div className="text-xs space-y-1">
                            <p><strong>Type:</strong> {conflict.chatChange.type}</p>
                            <p><strong>Time:</strong> {formatTimestamp(conflict.chatChange.timestamp)}</p>
                            <p><strong>Data:</strong></p>
                            <code className="block bg-background p-2 rounded text-xs overflow-x-auto">
                              {JSON.stringify(conflict.chatChange.data, null, 2)}
                            </code>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <Separator />

                  {/* Resolution Options */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Choose resolution strategy:</p>

                    <div className="space-y-2">
                      {(['visual', 'chat', 'merge'] as const).map((resolution) => (
                        <label
                          key={resolution}
                          className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${
                            selectedResolutions[conflict.id] === resolution
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-accent/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`conflict-${conflict.id}`}
                            value={resolution}
                            checked={selectedResolutions[conflict.id] === resolution}
                            onChange={() => handleResolutionChange(conflict.id, resolution)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            selectedResolutions[conflict.id] === resolution
                              ? 'border-primary bg-primary'
                              : 'border-border'
                          }`}>
                            {selectedResolutions[conflict.id] === resolution && (
                              <Check className="h-2.5 w-2.5 text-primary-foreground" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getResolutionIcon(resolution)}
                            <span className="text-sm font-medium capitalize">
                              {resolution}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {getResolutionDescription(resolution)}
                          </span>
                          {conflict.suggestedResolution === resolution && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              Suggested
                            </Badge>
                          )}
                          {resolution === 'merge' && !conflict.autoResolvable && (
                            <Badge variant="destructive" className="ml-auto text-xs">
                              May not work
                            </Badge>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter className="flex items-center gap-2">
          <div className="flex-1 text-xs text-muted-foreground">
            {conflicts.filter(c => selectedResolutions[c.id]).length} of {conflicts.length} conflicts resolved
          </div>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleResolveConflicts}
            disabled={conflicts.some(c => !selectedResolutions[c.id])}
          >
            <Check className="h-4 w-4 mr-1" />
            Apply Resolutions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConflictResolutionDialog