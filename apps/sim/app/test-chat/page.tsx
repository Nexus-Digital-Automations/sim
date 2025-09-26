/**
 * Chat Widget Test Page
 *
 * This page is used for testing the Parlant chat widget integration
 * in Sim's development environment.
 */

'use client'

import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SimChatContainer, useChatTheme } from '@/components/ui/chat'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

export default function ChatTestPage() {
  // Generate unique IDs
  const workspaceIdInputId = useId()
  const agentIdInputId = useId()
  const userIdInputId = useId()
  const serverUrlInputId = useId()
  const enableVoiceId = useId()
  const enableAnimationsId = useId()
  const enableDebugId = useId()

  // Test configuration state
  const [workspaceId, setWorkspaceId] = useState('test-workspace-123')
  const [agentId, setAgentId] = useState('test-agent-456')
  const [userId, setUserId] = useState('test-user-789')
  const [serverUrl, setServerUrl] = useState('http://localhost:8000')
  const [position, setPosition] = useState<
    'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  >('bottom-right')
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [showWidget, setShowWidget] = useState(false)
  const [enableDebug, setEnableDebug] = useState(true)
  const [enableVoice, setEnableVoice] = useState(false)
  const [enableAnimations, setEnableAnimations] = useState(true)

  // Theme testing
  const { theme, updateTheme, applyPreset, resetTheme } = useChatTheme({}, workspaceId)

  return (
    <div className='container mx-auto max-w-4xl space-y-6 p-6'>
      <div className='space-y-2'>
        <h1 className='font-bold text-3xl'>Parlant Chat Widget Test</h1>
        <p className='text-muted-foreground'>
          Test and configure the Parlant chat widget integration with Sim's design system.
        </p>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Widget Configuration</CardTitle>
            <CardDescription>Configure the chat widget settings for testing</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* Basic Settings */}
            <div className='space-y-2'>
              <Label htmlFor={workspaceIdInputId}>Workspace ID</Label>
              <Input
                id={workspaceIdInputId}
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                placeholder='Enter workspace ID'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor={agentIdInputId}>Agent ID</Label>
              <Input
                id={agentIdInputId}
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder='Enter agent ID'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor={userIdInputId}>User ID</Label>
              <Input
                id={userIdInputId}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder='Enter user ID'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor={serverUrlInputId}>Parlant Server URL</Label>
              <Input
                id={serverUrlInputId}
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder='http://localhost:8000'
              />
            </div>

            <Separator />

            {/* UI Settings */}
            <div className='space-y-2'>
              <Label htmlFor='position'>Position</Label>
              <Select value={position} onValueChange={(value: any) => setPosition(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='bottom-right'>Bottom Right</SelectItem>
                  <SelectItem value='bottom-left'>Bottom Left</SelectItem>
                  <SelectItem value='top-right'>Top Right</SelectItem>
                  <SelectItem value='top-left'>Top Left</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='size'>Size</Label>
              <Select value={size} onValueChange={(value: any) => setSize(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='small'>Small</SelectItem>
                  <SelectItem value='medium'>Medium</SelectItem>
                  <SelectItem value='large'>Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Feature Toggles */}
            <div className='space-y-3'>
              <div className='flex items-center space-x-2'>
                <Switch id={enableVoiceId} checked={enableVoice} onCheckedChange={setEnableVoice} />
                <Label htmlFor={enableVoiceId}>Enable Voice Input</Label>
              </div>

              <div className='flex items-center space-x-2'>
                <Switch
                  id={enableAnimationsId}
                  checked={enableAnimations}
                  onCheckedChange={(checked) => {
                    setEnableAnimations(checked)
                    updateTheme({ enableAnimations: checked })
                  }}
                />
                <Label htmlFor={enableAnimationsId}>Enable Animations</Label>
              </div>

              <div className='flex items-center space-x-2'>
                <Switch id={enableDebugId} checked={enableDebug} onCheckedChange={setEnableDebug} />
                <Label htmlFor={enableDebugId}>Enable Debug Mode</Label>
              </div>
            </div>

            <Separator />

            {/* Controls */}
            <div className='space-y-2'>
              <Button onClick={() => setShowWidget(!showWidget)} className='w-full'>
                {showWidget ? 'Hide Widget' : 'Show Widget'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Theme Testing Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Theme Testing</CardTitle>
            <CardDescription>Test different theme configurations and presets</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* Theme Presets */}
            <div className='space-y-2'>
              <Label>Theme Presets</Label>
              <div className='grid grid-cols-3 gap-2'>
                <Button variant='outline' size='sm' onClick={() => applyPreset('light')}>
                  Light
                </Button>
                <Button variant='outline' size='sm' onClick={() => applyPreset('dark')}>
                  Dark
                </Button>
                <Button variant='outline' size='sm' onClick={() => applyPreset('system')}>
                  System
                </Button>
              </div>
            </div>

            <Separator />

            {/* Custom Colors */}
            <div className='space-y-2'>
              <Label>Custom Colors</Label>
              <div className='grid grid-cols-2 gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    updateTheme({
                      primary: 'hsl(263 85% 70%)',
                      accent: 'hsl(336 95% 65%)',
                    })
                  }
                >
                  Purple/Pink
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    updateTheme({
                      primary: 'hsl(210 100% 50%)',
                      accent: 'hsl(200 100% 60%)',
                    })
                  }
                >
                  Blue
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    updateTheme({
                      primary: 'hsl(120 100% 40%)',
                      accent: 'hsl(110 100% 50%)',
                    })
                  }
                >
                  Green
                </Button>
                <Button variant='outline' size='sm' onClick={resetTheme}>
                  Reset
                </Button>
              </div>
            </div>

            <Separator />

            {/* Typography */}
            <div className='space-y-2'>
              <Label>Font Size</Label>
              <div className='grid grid-cols-3 gap-2'>
                <Button variant='outline' size='sm' onClick={() => updateTheme({ fontSize: 'sm' })}>
                  Small
                </Button>
                <Button variant='outline' size='sm' onClick={() => updateTheme({ fontSize: 'md' })}>
                  Medium
                </Button>
                <Button variant='outline' size='sm' onClick={() => updateTheme({ fontSize: 'lg' })}>
                  Large
                </Button>
              </div>
            </div>

            {/* Spacing */}
            <div className='space-y-2'>
              <Label>Spacing</Label>
              <div className='grid grid-cols-3 gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => updateTheme({ spacing: 'compact' })}
                >
                  Compact
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => updateTheme({ spacing: 'comfortable' })}
                >
                  Comfortable
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => updateTheme({ spacing: 'spacious' })}
                >
                  Spacious
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Display */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 gap-4 text-sm md:grid-cols-4'>
            <div>
              <Label className='font-medium'>Widget Status</Label>
              <p className={showWidget ? 'text-green-600' : 'text-muted-foreground'}>
                {showWidget ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div>
              <Label className='font-medium'>Position</Label>
              <p className='text-muted-foreground capitalize'>{position.replace('-', ' ')}</p>
            </div>
            <div>
              <Label className='font-medium'>Size</Label>
              <p className='text-muted-foreground capitalize'>{size}</p>
            </div>
            <div>
              <Label className='font-medium'>Theme</Label>
              <p className='text-muted-foreground'>{enableAnimations ? 'Animated' : 'Static'}</p>
            </div>
          </div>

          {showWidget && (
            <div className='mt-4 rounded-lg bg-muted p-3'>
              <p className='text-muted-foreground text-sm'>
                <strong>Configuration:</strong> Workspace: {workspaceId}, Agent: {agentId}
                {userId && `, User: ${userId}`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Widget */}
      {showWidget && (
        <SimChatContainer
          workspaceId={workspaceId}
          agentId={agentId}
          userId={userId}
          debug={enableDebug}
          configOverrides={{
            parlantServerUrl: serverUrl,
            position,
            size,
            enableVoice,
            theme: {
              ...theme,
              enableAnimations,
            },
            branding: {
              welcomeMessage: 'Hello! This is a test chat widget.',
              placeholderText: 'Type your test message...',
              poweredBy: true,
            },
          }}
        />
      )}
    </div>
  )
}
