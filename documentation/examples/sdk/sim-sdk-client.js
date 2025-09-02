/**
 * Sim API SDK - Complete JavaScript client for all new API endpoints
 * 
 * This SDK provides a comprehensive interface for:
 * - Registry API (tools and blocks)
 * - Versioning API (workflow versions and rollbacks)  
 * - Collaboration API (permissions and collaborators)
 * - Testing API (dry-run and debugging)
 * - Webhook execution system
 */

class SimApiClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'https://your-sim-instance.com/api'
    this.apiKey = options.apiKey || process.env.SIM_API_KEY
    this.timeout = options.timeout || 30000
    
    if (!this.apiKey) {
      throw new Error('API key is required. Provide it via options.apiKey or SIM_API_KEY environment variable.')
    }
    
    // Bind methods to maintain context
    this.registry = {
      tools: {
        list: this.listTools.bind(this),
        create: this.createTool.bind(this),
        get: this.getTool.bind(this),
        update: this.updateTool.bind(this),
        delete: this.deleteTool.bind(this),
        logs: this.getToolLogs.bind(this)
      },
      blocks: {
        list: this.listBlocks.bind(this),
        create: this.createBlock.bind(this),
        get: this.getBlock.bind(this),
        update: this.updateBlock.bind(this),
        delete: this.deleteBlock.bind(this),
        logs: this.getBlockLogs.bind(this)
      }
    }
    
    this.versioning = {
      list: this.listVersions.bind(this),
      create: this.createVersion.bind(this),
      get: this.getVersion.bind(this),
      compare: this.compareVersions.bind(this),
      revert: this.revertToVersion.bind(this)
    }
    
    this.collaboration = {
      listCollaborators: this.listCollaborators.bind(this),
      addCollaborator: this.addCollaborator.bind(this),
      removeCollaborator: this.removeCollaborator.bind(this),
      updatePermissions: this.updatePermissions.bind(this)
    }
    
    this.testing = {
      dryRun: this.dryRunWorkflow.bind(this),
      validate: this.validateWorkflow.bind(this)
    }
  }
  
  // ======================
  // HTTP CLIENT METHODS
  // ======================
  
  async _request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers
      },
      signal: AbortSignal.timeout(this.timeout),
      ...options
    }
    
    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body)
    }
    
    try {
      const response = await fetch(url, config)
      
      let data
      try {
        data = await response.json()
      } catch (parseError) {
        data = { error: 'Failed to parse response' }
      }
      
      if (!response.ok) {
        const error = new Error(data.error?.message || `HTTP ${response.status}`)
        error.code = data.error?.code
        error.status = response.status
        error.details = data.error?.details
        throw error
      }
      
      return data
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      throw error
    }
  }
  
  // ======================
  // REGISTRY API - TOOLS
  // ======================
  
  /**
   * List registered tools with filtering and pagination
   */
  async listTools(options = {}) {
    const params = new URLSearchParams()
    
    if (options.category) params.append('category', options.category)
    if (options.status) params.append('status', options.status)
    if (options.search) params.append('search', options.search)
    if (options.page) params.append('page', options.page)
    if (options.limit) params.append('limit', options.limit)
    
    const query = params.toString()
    return this._request(`/registry/tools${query ? `?${query}` : ''}`)
  }
  
  /**
   * Register a new custom tool
   */
  async createTool(toolData) {
    return this._request('/registry/tools', {
      method: 'POST',
      body: toolData
    })
  }
  
  /**
   * Get detailed information about a specific tool
   */
  async getTool(toolId) {
    return this._request(`/registry/tools/${toolId}`)
  }
  
  /**
   * Update an existing tool
   */
  async updateTool(toolId, updateData) {
    return this._request(`/registry/tools/${toolId}`, {
      method: 'PUT',
      body: updateData
    })
  }
  
  /**
   * Delete/deactivate a tool
   */
  async deleteTool(toolId) {
    return this._request(`/registry/tools/${toolId}`, {
      method: 'DELETE'
    })
  }
  
  /**
   * Get execution logs for a tool
   */
  async getToolLogs(toolId, options = {}) {
    const params = new URLSearchParams()
    if (options.limit) params.append('limit', options.limit)
    if (options.page) params.append('page', options.page)
    
    const query = params.toString()
    return this._request(`/registry/tools/${toolId}/logs${query ? `?${query}` : ''}`)
  }
  
  // ======================
  // REGISTRY API - BLOCKS
  // ======================
  
  /**
   * List registered blocks with filtering and pagination
   */
  async listBlocks(options = {}) {
    const params = new URLSearchParams()
    
    if (options.category) params.append('category', options.category)
    if (options.status) params.append('status', options.status)
    if (options.search) params.append('search', options.search)
    if (options.page) params.append('page', options.page)
    if (options.limit) params.append('limit', options.limit)
    
    const query = params.toString()
    return this._request(`/registry/blocks${query ? `?${query}` : ''}`)
  }
  
  /**
   * Register a new custom block
   */
  async createBlock(blockData) {
    return this._request('/registry/blocks', {
      method: 'POST',
      body: blockData
    })
  }
  
  /**
   * Get detailed information about a specific block
   */
  async getBlock(blockId) {
    return this._request(`/registry/blocks/${blockId}`)
  }
  
  /**
   * Update an existing block
   */
  async updateBlock(blockId, updateData) {
    return this._request(`/registry/blocks/${blockId}`, {
      method: 'PUT',
      body: updateData
    })
  }
  
  /**
   * Delete/deactivate a block
   */
  async deleteBlock(blockId) {
    return this._request(`/registry/blocks/${blockId}`, {
      method: 'DELETE'
    })
  }
  
  /**
   * Get execution logs for a block
   */
  async getBlockLogs(blockId, options = {}) {
    const params = new URLSearchParams()
    if (options.limit) params.append('limit', options.limit)
    if (options.page) params.append('page', options.page)
    
    const query = params.toString()
    return this._request(`/registry/blocks/${blockId}/logs${query ? `?${query}` : ''}`)
  }
  
  // ======================
  // VERSIONING API
  // ======================
  
  /**
   * List workflow versions with filtering and pagination
   */
  async listVersions(workflowId, options = {}) {
    const params = new URLSearchParams()
    
    if (options.limit) params.append('limit', options.limit)
    if (options.page) params.append('page', options.page)
    if (options.branch) params.append('branch', options.branch)
    if (options.type) params.append('type', options.type)
    if (options.tag) params.append('tag', options.tag)
    if (options.deployed !== undefined) params.append('deployed', options.deployed)
    if (options.current !== undefined) params.append('current', options.current)
    if (options.sort) params.append('sort', options.sort)
    if (options.order) params.append('order', options.order)
    if (options.includeState !== undefined) params.append('includeState', options.includeState)
    if (options.includeChanges !== undefined) params.append('includeChanges', options.includeChanges)
    
    const query = params.toString()
    return this._request(`/workflows/${workflowId}/versions${query ? `?${query}` : ''}`)
  }
  
  /**
   * Create a new workflow version/snapshot
   */
  async createVersion(workflowId, versionData) {
    return this._request(`/workflows/${workflowId}/versions`, {
      method: 'POST',
      body: versionData
    })
  }
  
  /**
   * Get detailed information about a specific version
   */
  async getVersion(workflowId, versionId, options = {}) {
    const params = new URLSearchParams()
    if (options.includeState !== undefined) params.append('includeState', options.includeState)
    
    const query = params.toString()
    return this._request(`/workflows/${workflowId}/versions/${versionId}${query ? `?${query}` : ''}`)
  }
  
  /**
   * Compare two workflow versions
   */
  async compareVersions(workflowId, versionId, compareWith, options = {}) {
    const params = new URLSearchParams()
    params.append('compareWith', compareWith)
    if (options.includeDetails !== undefined) params.append('includeDetails', options.includeDetails)
    if (options.format) params.append('format', options.format)
    
    const query = params.toString()
    return this._request(`/workflows/${workflowId}/versions/${versionId}/compare?${query}`)
  }
  
  /**
   * Revert workflow to a specific version
   */
  async revertToVersion(workflowId, versionId, options = {}) {
    return this._request(`/workflows/${workflowId}/versions/${versionId}/revert`, {
      method: 'POST',
      body: options
    })
  }
  
  // ======================
  // COLLABORATION API
  // ======================
  
  /**
   * List workflow collaborators
   */
  async listCollaborators(workflowId) {
    return this._request(`/workflows/${workflowId}/collaborate`)
  }
  
  /**
   * Add a collaborator to a workflow
   */
  async addCollaborator(workflowId, userId, permissionLevel = 'edit') {
    return this._request(`/workflows/${workflowId}/collaborate`, {
      method: 'POST',
      body: { userId, permissionLevel }
    })
  }
  
  /**
   * Remove a collaborator from a workflow
   */
  async removeCollaborator(workflowId, userId) {
    return this._request(`/workflows/${workflowId}/collaborate`, {
      method: 'DELETE',
      body: { userId }
    })
  }
  
  /**
   * Update collaborator permissions
   */
  async updatePermissions(workflowId, userId, permissionLevel) {
    return this._request(`/workflows/${workflowId}/collaborate`, {
      method: 'PUT',
      body: { userId, permissionLevel }
    })
  }
  
  // ======================
  // TESTING API
  // ======================
  
  /**
   * Execute workflow in dry-run mode
   */
  async dryRunWorkflow(workflowId, options = {}) {
    const dryRunData = {
      inputs: options.inputs || {},
      mockExternalCalls: options.mockExternalCalls !== false,
      includeOutputs: options.includeOutputs !== false,
      includeDataFlow: options.includeDataFlow !== false,
      includeTimingInfo: options.includeTimingInfo !== false,
      includeErrorDetails: options.includeErrorDetails !== false,
      stepByStep: options.stepByStep || false,
      breakpoints: options.breakpoints || [],
      maxExecutionTime: options.maxExecutionTime || 60000,
      mockResponses: options.mockResponses || {},
      validateOutputs: options.validateOutputs !== false,
      strictMode: options.strictMode || false
    }
    
    return this._request(`/workflows/${workflowId}/dry-run`, {
      method: 'POST',
      body: dryRunData
    })
  }
  
  /**
   * Validate workflow configuration
   */
  async validateWorkflow(workflowId, options = {}) {
    return this._request(`/workflows/${workflowId}/validate`, {
      method: 'POST',
      body: options
    })
  }
  
  // ======================
  // HELPER METHODS
  // ======================
  
  /**
   * Create a comprehensive tool registration helper
   */
  async registerToolWithWebhook(toolConfig) {
    // Validate tool configuration
    if (!toolConfig.name || !toolConfig.webhookUrl) {
      throw new Error('Tool name and webhookUrl are required')
    }
    
    console.log(`Registering tool: ${toolConfig.name}`)
    
    try {
      // Register the tool
      const registration = await this.createTool(toolConfig)
      console.log(`✅ Tool registered successfully: ${registration.id}`)
      
      // Test the webhook endpoint
      console.log('Testing webhook endpoint...')
      try {
        const healthResponse = await fetch(`${toolConfig.webhookUrl.replace(/\/[^/]*$/, '')}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        })
        
        if (healthResponse.ok) {
          console.log('✅ Webhook endpoint is healthy')
        } else {
          console.log('⚠️ Webhook health check failed, but registration completed')
        }
      } catch (healthError) {
        console.log('⚠️ Could not verify webhook health, but registration completed')
      }
      
      return registration
    } catch (error) {
      console.error(`❌ Tool registration failed: ${error.message}`)
      throw error
    }
  }
  
  /**
   * Comprehensive workflow testing helper
   */
  async testWorkflow(workflowId, testCases = []) {
    console.log(`Testing workflow: ${workflowId}`)
    const results = []
    
    for (const [index, testCase] of testCases.entries()) {
      console.log(`Running test case ${index + 1}/${testCases.length}: ${testCase.name || 'Unnamed test'}`)
      
      try {
        const result = await this.dryRunWorkflow(workflowId, {
          inputs: testCase.inputs,
          mockResponses: testCase.mockResponses,
          validateOutputs: true,
          ...testCase.options
        })
        
        const testResult = {
          name: testCase.name || `Test ${index + 1}`,
          status: result.status,
          success: result.status === 'completed',
          executionTime: result.totalExecutionTime,
          blocksExecuted: result.performance.executedBlocks,
          errors: result.blockResults.filter(b => b.status === 'error').length,
          warnings: result.validation.outputValidation.warnings.length,
          outputs: result.finalOutputs
        }
        
        if (testCase.expectedOutputs) {
          testResult.outputsMatch = this._compareOutputs(result.finalOutputs, testCase.expectedOutputs)
        }
        
        results.push(testResult)
        
        if (testResult.success) {
          console.log(`✅ Test case passed (${testResult.executionTime}ms)`)
        } else {
          console.log(`❌ Test case failed: ${result.status}`)
        }
        
      } catch (error) {
        console.log(`❌ Test case failed with error: ${error.message}`)
        results.push({
          name: testCase.name || `Test ${index + 1}`,
          status: 'error',
          success: false,
          error: error.message
        })
      }
    }
    
    // Summary
    const passed = results.filter(r => r.success).length
    const total = results.length
    console.log(`\nTest Summary: ${passed}/${total} passed`)
    
    return {
      summary: { passed, total, passRate: passed / total },
      results
    }
  }
  
  /**
   * Version management helper
   */
  async safeRevert(workflowId, versionId, reason) {
    console.log(`Preparing to revert workflow ${workflowId} to version ${versionId}`)
    
    // First, do a dry run
    console.log('Performing dry run analysis...')
    const dryRunResult = await this.revertToVersion(workflowId, versionId, {
      dryRun: true,
      createBackup: true,
      reason
    })
    
    console.log(`Risk level: ${dryRunResult.changeAnalysis.riskLevel}`)
    console.log(`Changes: ${dryRunResult.changeAnalysis.blocksChanged} blocks, ${dryRunResult.changeAnalysis.blocksRemoved} removed`)
    
    // Check risk level
    if (dryRunResult.changeAnalysis.riskLevel === 'high') {
      console.log('⚠️ High risk revert detected. Recommendations:')
      dryRunResult.recommendations.forEach(rec => console.log(`  - ${rec}`))
      
      const confirm = await this._promptConfirmation('Continue with high-risk revert? (y/N): ')
      if (!confirm) {
        throw new Error('Revert cancelled by user')
      }
    }
    
    // Perform the actual revert
    console.log('Executing revert...')
    const revertResult = await this.revertToVersion(workflowId, versionId, {
      createBackup: true,
      reason,
      force: dryRunResult.changeAnalysis.riskLevel === 'high'
    })
    
    console.log(`✅ Revert completed successfully`)
    console.log(`Backup created: ${revertResult.backup?.id}`)
    console.log(`New version: ${revertResult.newVersion.version}`)
    
    return revertResult
  }
  
  // ======================
  // PRIVATE HELPERS
  // ======================
  
  _compareOutputs(actual, expected) {
    // Simple deep comparison helper
    return JSON.stringify(actual) === JSON.stringify(expected)
  }
  
  async _promptConfirmation(message) {
    // In Node.js environment, use readline
    if (typeof process !== 'undefined' && process.stdin) {
      const readline = require('readline')
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
      
      return new Promise(resolve => {
        rl.question(message, answer => {
          rl.close()
          resolve(answer.toLowerCase().startsWith('y'))
        })
      })
    }
    
    // In browser environment, use window.confirm
    if (typeof window !== 'undefined') {
      return window.confirm(message)
    }
    
    // Default to false for other environments
    return false
  }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SimApiClient
} else if (typeof window !== 'undefined') {
  window.SimApiClient = SimApiClient
}

/**
 * Usage Examples:
 */

// Example 1: Basic SDK usage
/*
const sim = new SimApiClient({
  baseUrl: 'https://your-sim-instance.com/api',
  apiKey: 'your-api-key'
})

// List all registered tools
const tools = await sim.registry.tools.list()

// Create a new version
const version = await sim.versioning.create('workflow-123', {
  type: 'manual',
  name: 'Release v1.2.0',
  tags: ['stable']
})

// Run a dry-run test
const testResult = await sim.testing.dryRun('workflow-123', {
  inputs: { email: 'test@example.com' },
  mockExternalCalls: true
})
*/

// Example 2: Tool registration
/*
const toolConfig = {
  name: 'my_custom_tool',
  displayName: 'My Custom Tool',
  description: 'Does something useful',
  webhookUrl: 'https://my-service.com/webhook',
  manifest: {
    configSchema: { /* ... */ },
    inputSchema: { /* ... */ },
    outputSchema: { /* ... */ }
  }
}

const tool = await sim.registerToolWithWebhook(toolConfig)
*/

// Example 3: Comprehensive workflow testing
/*
const testCases = [
  {
    name: 'Happy path test',
    inputs: { email: 'test@example.com', amount: 100 },
    expectedOutputs: { success: true, processed: true }
  },
  {
    name: 'Error handling test',
    inputs: { email: 'invalid-email' },
    options: { strictMode: true }
  }
]

const testResults = await sim.testWorkflow('workflow-123', testCases)
*/

// Example 4: Safe version revert
/*
const revertResult = await sim.safeRevert(
  'workflow-123',
  'version-456', 
  'Reverting due to critical bug in production'
)
*/