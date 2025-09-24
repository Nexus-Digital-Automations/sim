'use client'

/**
 * Create Agent Modal Component
 * ============================
 *
 * Comprehensive agent creation interface providing:
 * - Agent configuration form with validation
 * - Guideline builder interface
 * - AI model and parameter configuration
 * - Capability selection and specialization
 * - Real-time form validation
 * - Integration with Parlant agent creation API
 */

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Wand2, Settings, Brain, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { toast } from '@/hooks/use-toast'
import type { AgentCreateRequest, AgentConfig, Guideline } from '@/services/parlant/types'

interface CreateAgentModalProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAgentCreated: () => void
}

interface GuidelineInput extends Omit<Guideline, 'id' | 'agent_id' | 'created_at' | 'updated_at'> {
  tempId: string
}

const AVAILABLE_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Most capable model for complex tasks' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Faster, cost-effective option' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Excellent for analysis and reasoning' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'Anthropic', description: 'Fast and efficient for simple tasks' }
]

const CAPABILITY_OPTIONS = [
  'Natural Language Processing',
  'Data Analysis',
  'Workflow Automation',
  'Customer Support',
  'Content Generation',
  'Code Review',
  'Documentation',
  'Translation',
  'Summarization',
  'Research',
  'Planning',
  'Decision Making'
]

const TOOL_CATEGORIES = [
  { id: 'communication', name: 'Communication', tools: ['Email', 'Slack', 'Teams', 'Discord'] },
  { id: 'productivity', name: 'Productivity', tools: ['Calendar', 'Tasks', 'Notes', 'Documents'] },
  { id: 'data', name: 'Data & Analytics', tools: ['Database', 'Spreadsheets', 'Charts', 'Reports'] },
  { id: 'development', name: 'Development', tools: ['GitHub', 'Code Analysis', 'Testing', 'Deployment'] },
  { id: 'knowledge', name: 'Knowledge', tools: ['Web Search', 'Documents', 'Wikipedia', 'Research'] }
]

export function CreateAgentModal({ workspaceId, open, onOpenChange, onAgentCreated }: CreateAgentModalProps) {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capabilities: [] as string[],
    enabledTools: [] as string[]
  })

  // Agent configuration state
  const [config, setConfig] = useState<AgentConfig>({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_turns: 50,
    system_prompt: '',
    tool_choice: 'auto'
  })

  // Guidelines state
  const [guidelines, setGuidelines] = useState<GuidelineInput[]>([])
  const [newGuideline, setNewGuideline] = useState({
    condition: '',
    action: '',
    priority: 1
  })

  // UI state
  const [loading, setLoading] = useState(false)
  const [currentTab, setCurrentTab] = useState('basic')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setFormData({
        name: '',
        description: '',
        capabilities: [],
        enabledTools: []
      })
      setConfig({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_turns: 50,
        system_prompt: '',
        tool_choice: 'auto'
      })
      setGuidelines([])
      setCurrentTab('basic')
      setErrors({})
    }
  }, [open])

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Agent name is required'
    } else if (formData.name.length > 100) {
      newErrors.name = 'Agent name must be less than 100 characters'
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters'
    }

    if (config.system_prompt && config.system_prompt.length > 5000) {
      newErrors.system_prompt = 'System prompt must be less than 5000 characters'
    }

    if (config.temperature && (config.temperature < 0 || config.temperature > 2)) {
      newErrors.temperature = 'Temperature must be between 0 and 2'
    }

    if (config.max_turns && (config.max_turns < 1 || config.max_turns > 200)) {
      newErrors.max_turns = 'Max turns must be between 1 and 200'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      const createRequest: AgentCreateRequest = {
        name: formData.name,
        description: formData.description || undefined,
        workspace_id: workspaceId,
        guidelines: guidelines.map(({ tempId, ...guideline }) => guideline),
        config
      }

      const response = await fetch('/api/parlant/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createRequest)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create agent')
      }

      const result = await response.json()

      toast({
        title: 'Agent Created',
        description: `${result.data.name} has been created successfully`
      })

      onAgentCreated()
      onOpenChange(false)

    } catch (error) {
      console.error('Failed to create agent:', error)
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Add new guideline
   */
  const addGuideline = () => {
    if (!newGuideline.condition.trim() || !newGuideline.action.trim()) {
      toast({
        title: 'Invalid Guideline',
        description: 'Both condition and action are required',
        variant: 'destructive'
      })
      return
    }

    const guideline: GuidelineInput = {
      ...newGuideline,
      tempId: `temp_${Date.now()}`
    }

    setGuidelines(prev => [...prev, guideline])
    setNewGuideline({ condition: '', action: '', priority: 1 })
  }

  /**
   * Remove guideline
   */
  const removeGuideline = (tempId: string) => {
    setGuidelines(prev => prev.filter(g => g.tempId !== tempId))
  }

  /**
   * Toggle capability selection
   */
  const toggleCapability = (capability: string) => {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.includes(capability)
        ? prev.capabilities.filter(c => c !== capability)
        : [...prev.capabilities, capability]
    }))
  }

  /**
   * Toggle tool selection
   */
  const toggleTool = (tool: string) => {
    setFormData(prev => ({
      ...prev,
      enabledTools: prev.enabledTools.includes(tool)
        ? prev.enabledTools.filter(t => t !== tool)
        : [...prev.enabledTools, tool]
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Create New Agent
          </DialogTitle>
          <DialogDescription>
            Configure your AI agent's capabilities, behavior, and tools
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
              <TabsTrigger value="tools">Tools & Capabilities</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-6">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">Agent Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter agent name..."
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this agent does..."
                    rows={3}
                    className={errors.description ? 'border-red-500' : ''}
                  />
                  {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="config" className="space-y-6 mt-6">
              <div className="grid gap-6">
                <div>
                  <Label>AI Model</Label>
                  <Select
                    value={config.model}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, model: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_MODELS.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div>
                            <div className="font-medium">{model.name}</div>
                            <div className="text-xs text-muted-foreground">{model.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label>Temperature: {config.temperature}</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Controls randomness. Lower = more focused, Higher = more creative</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Slider
                    value={[config.temperature!]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, temperature: value }))}
                    min={0}
                    max={2}
                    step={0.1}
                  />
                </div>

                <div>
                  <Label htmlFor="max_turns">Maximum Conversation Turns</Label>
                  <Input
                    id="max_turns"
                    type="number"
                    value={config.max_turns}
                    onChange={(e) => setConfig(prev => ({ ...prev, max_turns: parseInt(e.target.value) }))}
                    min={1}
                    max={200}
                    className={errors.max_turns ? 'border-red-500' : ''}
                  />
                  {errors.max_turns && <p className="text-sm text-red-500 mt-1">{errors.max_turns}</p>}
                </div>

                <div>
                  <Label htmlFor="system_prompt">System Prompt</Label>
                  <Textarea
                    id="system_prompt"
                    value={config.system_prompt}
                    onChange={(e) => setConfig(prev => ({ ...prev, system_prompt: e.target.value }))}
                    placeholder="Define the agent's personality and behavior..."
                    rows={4}
                    className={errors.system_prompt ? 'border-red-500' : ''}
                  />
                  {errors.system_prompt && <p className="text-sm text-red-500 mt-1">{errors.system_prompt}</p>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="guidelines" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Add Guideline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="condition">When (Condition)</Label>
                    <Input
                      id="condition"
                      value={newGuideline.condition}
                      onChange={(e) => setNewGuideline(prev => ({ ...prev, condition: e.target.value }))}
                      placeholder="e.g., user asks about pricing"
                    />
                  </div>
                  <div>
                    <Label htmlFor="action">Then (Action)</Label>
                    <Input
                      id="action"
                      value={newGuideline.action}
                      onChange={(e) => setNewGuideline(prev => ({ ...prev, action: e.target.value }))}
                      placeholder="e.g., provide pricing information and direct to sales team"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label>Priority: {newGuideline.priority}</Label>
                      <Slider
                        value={[newGuideline.priority]}
                        onValueChange={([value]) => setNewGuideline(prev => ({ ...prev, priority: value }))}
                        min={1}
                        max={10}
                        step={1}
                      />
                    </div>
                    <Button type="button" onClick={addGuideline} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {guidelines.length > 0 && (
                <div className="space-y-2">
                  <Label>Current Guidelines</Label>
                  {guidelines.map((guideline) => (
                    <Card key={guideline.tempId}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-medium">When: {guideline.condition}</p>
                            <p className="text-sm text-muted-foreground">Then: {guideline.action}</p>
                            <Badge variant="outline" className="mt-2 text-xs">
                              Priority: {guideline.priority}
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeGuideline(guideline.tempId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="tools" className="space-y-6 mt-6">
              <div>
                <Label>Capabilities</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select the primary capabilities for your agent
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {CAPABILITY_OPTIONS.map((capability) => (
                    <Button
                      key={capability}
                      type="button"
                      variant={formData.capabilities.includes(capability) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleCapability(capability)}
                      className="justify-start text-xs"
                    >
                      {capability}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Available Tools</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Enable tools that your agent can use
                </p>
                <div className="space-y-4">
                  {TOOL_CATEGORIES.map((category) => (
                    <Card key={category.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">{category.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-4 gap-2">
                          {category.tools.map((tool) => (
                            <Button
                              key={tool}
                              type="button"
                              variant={formData.enabledTools.includes(tool) ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => toggleTool(tool)}
                              className="text-xs"
                            >
                              {tool}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between pt-6 mt-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Wand2 className="h-4 w-4 animate-spin" />}
              Create Agent
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}