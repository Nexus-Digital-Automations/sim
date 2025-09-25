/**
 * Unified Copilot Integration Examples
 *
 * Example implementations showing how to integrate the unified copilot
 * system into existing applications, including migration patterns and
 * advanced usage scenarios.
 */

'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Import the unified copilot components
import { UnifiedCopilot, type UnifiedCopilotRef } from '@/components/unified-copilot'
import { CopilotWrapper, EnhancedCopilotWrapper } from '@/components/copilot-wrapper'
import { useUnifiedCopilot } from '@/hooks/use-unified-copilot'

// Example 1: Simple Drop-in Replacement
export function SimpleReplacementExample() {
  // This is how you can replace existing copilot usage
  const copilotRef = React.useRef<any>(null)

  return (
    <div className="h-96 border rounded-lg">
      <CopilotWrapper
        ref={copilotRef}
        panelWidth={400}
        workspaceId="example-workspace"
        userId="example-user"
      />
    </div>
  )
}

// Example 2: Enhanced Integration with Mode Control
export function EnhancedIntegrationExample() {
  const [currentMode, setCurrentMode] = useState<'local' | 'external'>('external')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Enhanced Copilot</h3>
        <Badge variant="outline">
          Current Mode: {currentMode}
        </Badge>
      </div>

      <div className="h-96 border rounded-lg">
        <EnhancedCopilotWrapper
          panelWidth={400}
          workspaceId="example-workspace"
          userId="example-user"
          onModeChange={setCurrentMode}
          enableAnalytics={true}
          enableKeyboardShortcuts={true}
        />
      </div>

      <Alert>
        <AlertDescription>
          Use Ctrl+Shift+L for local mode, Ctrl+Shift+E for external mode
        </AlertDescription>
      </Alert>
    </div>
  )
}

// Example 3: Custom Integration with Hook
export function CustomIntegrationExample() {
  const workspaceId = 'example-workspace'
  const {
    currentMode,
    isLocalAvailable,
    isExternalAvailable,
    availableAgents,
    selectedAgent,
    switchToLocal,
    switchToExternal,
    selectAgent,
    getStats,
  } = useUnifiedCopilot(workspaceId)

  const stats = getStats()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Current Mode</span>
                <Badge>{currentMode}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Local Available</span>
                <Badge variant={isLocalAvailable ? 'default' : 'secondary'}>
                  {isLocalAvailable ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">External Available</span>
                <Badge variant={isExternalAvailable ? 'default' : 'secondary'}>
                  {isExternalAvailable ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Agent Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Available Agents</span>
                <Badge>{stats.availableLocalAgents}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Selected Agent</span>
                <Badge variant="outline" className="text-xs max-w-20 truncate">
                  {stats.selectedLocalAgent || 'None'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button
          variant={currentMode === 'local' ? 'default' : 'outline'}
          onClick={switchToLocal}
          disabled={!isLocalAvailable}
        >
          Switch to Local
        </Button>
        <Button
          variant={currentMode === 'external' ? 'default' : 'outline'}
          onClick={switchToExternal}
          disabled={!isExternalAvailable}
        >
          Switch to External
        </Button>
      </div>

      {currentMode === 'local' && availableAgents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Available Agents</CardTitle>
            <CardDescription>Select an agent for local copilot</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {availableAgents.map((agent) => (
                <Button
                  key={agent.id}
                  variant={selectedAgent?.id === agent.id ? 'default' : 'outline'}
                  onClick={() => selectAgent(agent)}
                  className="justify-start text-left h-auto p-2"
                >
                  <div>
                    <div className="font-medium text-sm">{agent.name}</div>
                    {agent.description && (
                      <div className="text-xs opacity-70 truncate">
                        {agent.description}
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="h-96 border rounded-lg">
        <UnifiedCopilot
          panelWidth={400}
          workspaceId={workspaceId}
          userId="example-user"
          defaultMode={currentMode}
          allowModeSwitch={false} // We handle it externally
        />
      </div>
    </div>
  )
}

// Example 4: Migration Guide Component
export function MigrationGuideExample() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Migration Guide</h2>
        <p className="text-muted-foreground">
          Examples showing how to migrate from existing copilot implementations
          to the unified system.
        </p>
      </div>

      <Tabs defaultValue="before" className="w-full">
        <TabsList>
          <TabsTrigger value="before">Before (External Only)</TabsTrigger>
          <TabsTrigger value="after">After (Unified)</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="before" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Old Implementation</CardTitle>
              <CardDescription>
                Previous external copilot usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
{`// Old way - external copilot only
import { Copilot } from './copilot'

function MyComponent() {
  const copilotRef = useRef()

  return (
    <Copilot
      ref={copilotRef}
      panelWidth={400}
    />
  )
}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="after" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>New Implementation</CardTitle>
              <CardDescription>
                Drop-in replacement with unified system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
{`// New way - unified copilot
import { CopilotWrapper } from '@/components/copilot-wrapper'

function MyComponent() {
  const copilotRef = useRef()

  return (
    <CopilotWrapper
      ref={copilotRef}
      panelWidth={400}
      workspaceId="your-workspace-id"
      userId="your-user-id"
    />
  )
}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Usage</CardTitle>
              <CardDescription>
                Full control with hooks and custom logic
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
{`// Advanced usage with hooks
import { useUnifiedCopilot } from '@/hooks/use-unified-copilot'
import { UnifiedCopilot } from '@/components/unified-copilot'

function MyAdvancedComponent() {
  const workspaceId = 'my-workspace'
  const {
    currentMode,
    switchToLocal,
    switchToExternal,
    selectAgent,
    availableAgents,
  } = useUnifiedCopilot(workspaceId)

  const handleModeChange = (mode) => {
    analytics.track('copilot_mode_changed', { mode })
    if (mode === 'local') switchToLocal()
    else switchToExternal()
  }

  return (
    <div>
      <ModeSelector
        currentMode={currentMode}
        onModeChange={handleModeChange}
      />

      <UnifiedCopilot
        workspaceId={workspaceId}
        userId="user-id"
        panelWidth={400}
        defaultMode={currentMode}
        allowModeSwitch={false}
      />
    </div>
  )
}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Complete example page
export default function UnifiedCopilotExamplesPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">Unified Copilot Integration Examples</h1>
        <p className="text-muted-foreground">
          Examples and migration guides for integrating the unified copilot system.
        </p>
      </div>

      <Tabs defaultValue="simple" className="w-full">
        <TabsList>
          <TabsTrigger value="simple">Simple</TabsTrigger>
          <TabsTrigger value="enhanced">Enhanced</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
          <TabsTrigger value="migration">Migration</TabsTrigger>
        </TabsList>

        <TabsContent value="simple">
          <SimpleReplacementExample />
        </TabsContent>

        <TabsContent value="enhanced">
          <EnhancedIntegrationExample />
        </TabsContent>

        <TabsContent value="custom">
          <CustomIntegrationExample />
        </TabsContent>

        <TabsContent value="migration">
          <MigrationGuideExample />
        </TabsContent>
      </Tabs>
    </div>
  )
}