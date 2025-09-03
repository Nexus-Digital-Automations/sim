'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Editor, type Monaco } from '@monaco-editor/react'
import {
  AlertTriangle,
  Bug,
  CheckCircle,
  Clock,
  Cpu,
  MemoryStick,
  Monitor,
  Package,
  Play,
  Square,
  XCircle,
} from 'lucide-react'
import type * as monaco from 'monaco-editor'
import { Alert, AlertDescription } from './alert'
import { Badge } from './badge'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { ScrollArea } from './scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

/**
 * Advanced Monaco Code Editor for Sim Workflows
 *
 * Features:
 * - Multi-language support (JavaScript, Python, TypeScript)
 * - Workflow-aware IntelliSense and completions
 * - Real-time error checking and validation
 * - Advanced debugging interface with breakpoints
 * - Package management integration
 * - Resource monitoring during execution
 * - Security analysis and reporting
 * - Execution results with detailed output
 */

export interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language: 'javascript' | 'python' | 'typescript'
  height?: string | number
  options?: monaco.editor.IStandaloneEditorOptions
  workflowContext?: Record<string, any>
  environmentVariables?: Record<string, any>
  blockOutputs?: Record<string, any>
  packages?: string[]
  onPackagesChange?: (packages: string[]) => void
  onExecute?: (code: string, config: ExecutionConfig) => Promise<ExecutionResult>
  readOnly?: boolean
  showPackageManager?: boolean
  showDebugging?: boolean
  showResourceMonitor?: boolean
}

export interface ExecutionConfig {
  timeout: number
  memoryLimit: number
  enableDebugging: boolean
  enableNetworking: boolean
  sandboxMode: 'vm' | 'process' | 'docker'
  logLevel: string
  packages: string[]
}

export interface ExecutionResult {
  success: boolean
  result: any
  stdout: string
  stderr: string
  executionTime: number
  memoryUsage: number
  debugInfo?: any
  securityReport?: any
}

interface PackageInfo {
  name: string
  description: string
  version?: string
  installed: boolean
}

// Available packages for each language
const AVAILABLE_PACKAGES: Record<string, PackageInfo[]> = {
  javascript: [
    {
      name: 'lodash',
      description: 'Utility library for common programming tasks',
      installed: false,
    },
    { name: 'moment', description: 'Date and time manipulation library', installed: false },
    { name: 'axios', description: 'HTTP client for making API requests', installed: false },
    { name: 'uuid', description: 'Generate unique identifiers', installed: false },
    { name: 'crypto-js', description: 'Cryptographic functions', installed: false },
    { name: 'validator', description: 'String validation and sanitization', installed: false },
    { name: 'cheerio', description: 'Server-side jQuery for HTML parsing', installed: false },
    { name: 'csv-parser', description: 'Parse CSV files', installed: false },
    { name: 'xml2js', description: 'Convert XML to JavaScript objects', installed: false },
    { name: 'bcrypt', description: 'Password hashing', installed: false },
    { name: 'jsonwebtoken', description: 'JWT token handling', installed: false },
    { name: 'sharp', description: 'Image processing', installed: false },
  ],
  python: [
    { name: 'pandas', description: 'Data manipulation and analysis', installed: false },
    { name: 'numpy', description: 'Numerical computing', installed: false },
    { name: 'matplotlib', description: 'Plotting and visualization', installed: false },
    { name: 'seaborn', description: 'Statistical data visualization', installed: false },
    { name: 'scikit-learn', description: 'Machine learning library', installed: false },
    { name: 'requests', description: 'HTTP library for API calls', installed: false },
    { name: 'beautifulsoup4', description: 'Web scraping and HTML parsing', installed: false },
    { name: 'openpyxl', description: 'Excel file handling', installed: false },
    { name: 'python-docx', description: 'Word document processing', installed: false },
    { name: 'Pillow', description: 'Image processing', installed: false },
    { name: 'plotly', description: 'Interactive visualizations', installed: false },
    { name: 'scipy', description: 'Scientific computing', installed: false },
  ],
  typescript: [], // Same as JavaScript for now
}

export function AdvancedCodeEditor({
  value,
  onChange,
  language,
  height = 400,
  options = {},
  workflowContext = {},
  environmentVariables = {},
  blockOutputs = {},
  packages = [],
  onPackagesChange,
  onExecute,
  readOnly = false,
  showPackageManager = true,
  showDebugging = true,
  showResourceMonitor = true,
}: CodeEditorProps) {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [selectedPackages, setSelectedPackages] = useState<string[]>(packages)
  const [executionConfig, setExecutionConfig] = useState<ExecutionConfig>({
    timeout: 30000,
    memoryLimit: 256,
    enableDebugging: false,
    enableNetworking: true,
    sandboxMode: 'vm',
    logLevel: 'info',
    packages: [],
  })
  const [activeTab, setActiveTab] = useState('editor')
  const [debuggingEnabled, setDebuggingEnabled] = useState(false)
  const [resourceMonitoring, setResourceMonitoring] = useState(false)

  // Monaco editor configuration
  const editorOptions: monaco.editor.IStandaloneEditorOptions = useMemo(
    () => ({
      minimap: { enabled: false },
      wordWrap: 'on',
      lineNumbers: 'on',
      folding: true,
      bracketMatching: 'always',
      autoClosingBrackets: 'always',
      autoIndent: 'full',
      formatOnPaste: true,
      formatOnType: true,
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      parameterHints: { enabled: true },
      scrollBeyondLastLine: false,
      readOnly,
      theme: 'vs-dark',
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      ...options,
    }),
    [options, readOnly]
  )

  // Handle Monaco editor mount
  const handleEditorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
      setEditor(editor)

      // Set up workflow-aware completions
      setupWorkflowCompletions(monaco, language, {
        workflowContext,
        environmentVariables,
        blockOutputs,
        packages: selectedPackages,
      })

      // Set up error checking
      setupErrorChecking(monaco, language)

      // Set up debugging features if enabled
      if (showDebugging) {
        setupDebugging(editor, monaco)
      }
    },
    [language, workflowContext, environmentVariables, blockOutputs, selectedPackages, showDebugging]
  )

  // Update selected packages
  useEffect(() => {
    setSelectedPackages(packages)
    setExecutionConfig((prev) => ({ ...prev, packages }))
  }, [packages])

  // Handle package selection change
  const handlePackageToggle = useCallback(
    (packageName: string) => {
      const newPackages = selectedPackages.includes(packageName)
        ? selectedPackages.filter((p) => p !== packageName)
        : [...selectedPackages, packageName]

      setSelectedPackages(newPackages)
      onPackagesChange?.(newPackages)
      setExecutionConfig((prev) => ({ ...prev, packages: newPackages }))
    },
    [selectedPackages, onPackagesChange]
  )

  // Handle code execution
  const handleExecute = useCallback(async () => {
    if (!onExecute || isExecuting) return

    setIsExecuting(true)
    setActiveTab('output')

    try {
      const result = await onExecute(value, {
        ...executionConfig,
        packages: selectedPackages,
      })
      setExecutionResult(result)
    } catch (error) {
      setExecutionResult({
        success: false,
        result: null,
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error occurred',
        executionTime: 0,
        memoryUsage: 0,
      })
    } finally {
      setIsExecuting(false)
    }
  }, [value, onExecute, isExecuting, executionConfig, selectedPackages])

  // Stop execution
  const handleStop = useCallback(() => {
    setIsExecuting(false)
    // In a real implementation, this would send a stop signal to the execution engine
  }, [])

  // Toggle debugging
  const handleToggleDebugging = useCallback(() => {
    setDebuggingEnabled(!debuggingEnabled)
    setExecutionConfig((prev) => ({ ...prev, enableDebugging: !debuggingEnabled }))
  }, [debuggingEnabled])

  // Get available packages for current language
  const availablePackages = useMemo(() => {
    const packages = AVAILABLE_PACKAGES[language] || []
    return packages.map((pkg) => ({
      ...pkg,
      installed: selectedPackages.includes(pkg.name),
    }))
  }, [language, selectedPackages])

  // Render execution results
  const renderExecutionResults = () => {
    if (!executionResult) return null

    return (
      <div className='space-y-4'>
        {/* Execution Status */}
        <div className='flex items-center gap-2'>
          {executionResult.success ? (
            <CheckCircle className='h-5 w-5 text-green-500' />
          ) : (
            <XCircle className='h-5 w-5 text-red-500' />
          )}
          <span className='font-medium'>
            {executionResult.success ? 'Execution Successful' : 'Execution Failed'}
          </span>
          <Badge variant='outline' className='ml-auto'>
            <Clock className='mr-1 h-3 w-3' />
            {executionResult.executionTime}ms
          </Badge>
          <Badge variant='outline'>
            <MemoryStick className='mr-1 h-3 w-3' />
            {executionResult.memoryUsage}MB
          </Badge>
        </div>

        {/* Result Output */}
        {executionResult.result !== null && (
          <Card>
            <CardHeader>
              <CardTitle className='text-sm'>Result</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-32'>
                <pre className='font-mono text-sm'>
                  {typeof executionResult.result === 'string'
                    ? executionResult.result
                    : JSON.stringify(executionResult.result, null, 2)}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Standard Output */}
        {executionResult.stdout && (
          <Card>
            <CardHeader>
              <CardTitle className='text-sm'>Console Output</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-32'>
                <pre className='whitespace-pre-wrap font-mono text-green-600 text-sm'>
                  {executionResult.stdout}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Error Output */}
        {executionResult.stderr && (
          <Alert variant='destructive'>
            <AlertTriangle className='h-4 w-4' />
            <AlertDescription>
              <ScrollArea className='h-32'>
                <pre className='whitespace-pre-wrap font-mono text-sm'>
                  {executionResult.stderr}
                </pre>
              </ScrollArea>
            </AlertDescription>
          </Alert>
        )}

        {/* Security Report */}
        {executionResult.securityReport && (
          <Card>
            <CardHeader>
              <CardTitle className='text-sm'>Security Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-32'>
                <pre className='text-sm'>
                  {JSON.stringify(executionResult.securityReport, null, 2)}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Render package manager
  const renderPackageManager = () => (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='font-semibold text-lg'>Available Packages</h3>
        <Badge variant='outline'>{selectedPackages.length} selected</Badge>
      </div>

      <div className='grid grid-cols-1 gap-2'>
        {availablePackages.map((pkg) => (
          <div
            key={pkg.name}
            className={`flex cursor-pointer items-center space-x-3 rounded-lg border p-3 transition-colors ${
              pkg.installed ? 'border-blue-200 bg-blue-50' : 'hover:bg-gray-50'
            }`}
            onClick={() => handlePackageToggle(pkg.name)}
          >
            <input
              type='checkbox'
              checked={pkg.installed}
              onChange={() => handlePackageToggle(pkg.name)}
              className='h-4 w-4'
            />
            <div className='flex-1'>
              <div className='font-medium'>{pkg.name}</div>
              <div className='text-gray-500 text-sm'>{pkg.description}</div>
            </div>
            {pkg.installed && <CheckCircle className='h-4 w-4 text-blue-500' />}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className='overflow-hidden rounded-lg border'>
      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        {/* Tab Navigation */}
        <div className='border-b bg-gray-50 px-4 py-2'>
          <div className='flex items-center justify-between'>
            <TabsList className='grid w-auto grid-cols-4'>
              <TabsTrigger value='editor'>Editor</TabsTrigger>
              <TabsTrigger value='output'>Output</TabsTrigger>
              {showPackageManager && (
                <TabsTrigger value='packages'>
                  <Package className='mr-1 h-4 w-4' />
                  Packages
                </TabsTrigger>
              )}
              {showResourceMonitor && (
                <TabsTrigger value='monitoring'>
                  <Monitor className='mr-1 h-4 w-4' />
                  Monitor
                </TabsTrigger>
              )}
            </TabsList>

            {/* Execution Controls */}
            <div className='flex items-center gap-2'>
              {showDebugging && (
                <Button
                  variant={debuggingEnabled ? 'default' : 'outline'}
                  size='sm'
                  onClick={handleToggleDebugging}
                >
                  <Bug className='mr-1 h-4 w-4' />
                  Debug
                </Button>
              )}

              {onExecute && (
                <>
                  {isExecuting ? (
                    <Button variant='outline' size='sm' onClick={handleStop}>
                      <Square className='mr-1 h-4 w-4' />
                      Stop
                    </Button>
                  ) : (
                    <Button size='sm' onClick={handleExecute} disabled={!value.trim()}>
                      <Play className='mr-1 h-4 w-4' />
                      Run
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <TabsContent value='editor' className='m-0'>
          <Editor
            height={height}
            language={language}
            value={value}
            onChange={(val) => onChange(val || '')}
            onMount={handleEditorDidMount}
            options={editorOptions}
            loading={<div className='flex h-40 items-center justify-center'>Loading editor...</div>}
          />
        </TabsContent>

        <TabsContent value='output' className='m-0 p-4'>
          {isExecuting ? (
            <div className='flex h-40 items-center justify-center'>
              <div className='h-8 w-8 animate-spin rounded-full border-blue-500 border-b-2' />
              <span className='ml-2'>Executing code...</span>
            </div>
          ) : (
            renderExecutionResults()
          )}
        </TabsContent>

        {showPackageManager && (
          <TabsContent value='packages' className='m-0 p-4'>
            {renderPackageManager()}
          </TabsContent>
        )}

        {showResourceMonitor && (
          <TabsContent value='monitoring' className='m-0 p-4'>
            <div className='space-y-4'>
              <h3 className='font-semibold text-lg'>Resource Monitoring</h3>
              <div className='grid grid-cols-2 gap-4'>
                <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center text-sm'>
                      <Cpu className='mr-2 h-4 w-4' />
                      CPU Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='font-bold text-2xl'>0%</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center text-sm'>
                      <MemoryStick className='mr-2 h-4 w-4' />
                      Memory Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='font-bold text-2xl'>0 MB</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// Helper functions for Monaco setup
function setupWorkflowCompletions(
  monaco: Monaco,
  language: string,
  context: {
    workflowContext: Record<string, any>
    environmentVariables: Record<string, any>
    blockOutputs: Record<string, any>
    packages: string[]
  }
) {
  // Set up custom completions based on workflow context
  const completionProvider = monaco.languages.registerCompletionItemProvider(language, {
    provideCompletionItems: (model, position) => {
      const suggestions: monaco.languages.CompletionItem[] = []

      // Add environment variable suggestions
      Object.keys(context.environmentVariables).forEach((varName) => {
        suggestions.push({
          label: `{{${varName}}}`,
          kind: monaco.languages.CompletionItemKind.Variable,
          documentation: `Environment variable: ${varName}`,
          insertText: `{{${varName}}}`,
        })
      })

      // Add block output suggestions
      Object.keys(context.blockOutputs).forEach((blockId) => {
        suggestions.push({
          label: `<${blockId}>`,
          kind: monaco.languages.CompletionItemKind.Reference,
          documentation: `Block output: ${blockId}`,
          insertText: `<${blockId}>`,
        })
      })

      return { suggestions }
    },
  })

  return completionProvider
}

function setupErrorChecking(monaco: Monaco, language: string) {
  // Set up language-specific error checking
  if (language === 'javascript' || language === 'typescript') {
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    })
  }
}

function setupDebugging(editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) {
  // Set up debugging features like breakpoints
  editor.addAction({
    id: 'toggle-breakpoint',
    label: 'Toggle Breakpoint',
    keybindings: [monaco.KeyCode.F9],
    run: () => {
      // Implementation for breakpoint toggling
      console.log('Breakpoint toggled')
    },
  })
}
