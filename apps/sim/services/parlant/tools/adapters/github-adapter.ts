/**
 * GitHub Tool Adapter
 * ===================
 *
 * Adapter for GitHub repository interactions
 * Converts Sim's GitHub block to Parlant-compatible format
 */

import { UniversalToolAdapter, ParlantTool, ToolExecutionContext, AdapterExecutionResult } from '../adapter-framework'
import { GitHubBlock } from '@/blocks/blocks/github'
import type { BlockConfig } from '@/blocks/types'
import type { ToolResponse } from '@/tools/types'

export class GitHubAdapter extends UniversalToolAdapter {
  constructor() {
    super(GitHubBlock)
  }

  protected transformToParlant(blockConfig: BlockConfig): ParlantTool {
    return {
      id: 'github',
      name: 'GitHub Repository Manager',
      description: 'Interact with GitHub repositories, pull requests, and commits',
      longDescription: 'Comprehensive GitHub integration for repository management, pull request operations, commit tracking, and collaborative development workflows.',
      category: 'productivity',
      parameters: [
        {
          name: 'operation',
          description: 'The GitHub operation to perform',
          type: 'string',
          required: true,
          constraints: {
            enum: ['get_pr_details', 'create_pr_comment', 'get_repo_info', 'get_latest_commit']
          },
          examples: ['get_pr_details', 'create_pr_comment']
        },
        {
          name: 'repository_owner',
          description: 'The username or organization that owns the repository',
          type: 'string',
          required: true,
          examples: ['microsoft', 'facebook', 'your-username']
        },
        {
          name: 'repository_name',
          description: 'The name of the GitHub repository',
          type: 'string',
          required: true,
          examples: ['vscode', 'react', 'my-project']
        },
        {
          name: 'pull_request_number',
          description: 'The pull request number (required for PR operations)',
          type: 'number',
          required: false,
          examples: [123, 456],
          dependsOn: {
            parameter: 'operation',
            value: ['get_pr_details', 'create_pr_comment']
          }
        },
        {
          name: 'comment_text',
          description: 'The comment text to add to a pull request',
          type: 'string',
          required: false,
          examples: [
            'Great work! This PR looks good to merge.',
            'Could you please add tests for the new functionality?'
          ],
          dependsOn: {
            parameter: 'operation',
            value: 'create_pr_comment'
          }
        },
        {
          name: 'branch_name',
          description: 'The branch name (optional, defaults to main branch)',
          type: 'string',
          required: false,
          examples: ['main', 'develop', 'feature-branch'],
          dependsOn: {
            parameter: 'operation',
            value: 'get_latest_commit'
          }
        },
        {
          name: 'github_token',
          description: 'Your GitHub personal access token for authentication',
          type: 'string',
          required: true,
          examples: ['ghp_...your-github-token']
        }
      ],
      outputs: [
        {
          name: 'content',
          description: 'The main content or result of the GitHub operation',
          type: 'string'
        },
        {
          name: 'metadata',
          description: 'Additional metadata about the GitHub operation result',
          type: 'object'
        },
        {
          name: 'repository_info',
          description: 'Information about the repository',
          type: 'object',
          optional: true
        },
        {
          name: 'pull_request_info',
          description: 'Details about the pull request (for PR operations)',
          type: 'object',
          optional: true
        },
        {
          name: 'commit_info',
          description: 'Information about commits',
          type: 'object',
          optional: true
        }
      ],
      examples: [
        {
          scenario: 'Get details about a specific pull request',
          input: {
            operation: 'get_pr_details',
            repository_owner: 'microsoft',
            repository_name: 'vscode',
            pull_request_number: 123,
            github_token: 'ghp_your_token'
          },
          expectedOutput: 'Returns PR title, description, status, author, and review information'
        },
        {
          scenario: 'Add a comment to a pull request',
          input: {
            operation: 'create_pr_comment',
            repository_owner: 'facebook',
            repository_name: 'react',
            pull_request_number: 456,
            comment_text: 'Looks good to me!',
            github_token: 'ghp_your_token'
          },
          expectedOutput: 'Creates a comment and returns confirmation with comment ID'
        },
        {
          scenario: 'Get repository information',
          input: {
            operation: 'get_repo_info',
            repository_owner: 'nodejs',
            repository_name: 'node',
            github_token: 'ghp_your_token'
          },
          expectedOutput: 'Returns repository stats, description, language, stars, and forks'
        }
      ],
      usageHints: [
        'GitHub personal access token is required for authentication',
        'Public repositories can be accessed with minimal permissions',
        'Private repositories require appropriate access permissions',
        'Rate limiting applies - avoid excessive API calls',
        'Pull request numbers are unique within each repository',
        'Branch names are case-sensitive'
      ],
      requiresAuth: {
        type: 'api_key',
        provider: 'github',
        scopes: ['repo', 'pull_requests']
      }
    }
  }

  protected async transformParameters(
    parlantParams: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<Record<string, any>> {
    const operation = parlantParams.operation
    const baseParams = {
      operation,
      owner: parlantParams.repository_owner,
      repo: parlantParams.repository_name,
      apiKey: parlantParams.github_token
    }

    // Add operation-specific parameters
    switch (operation) {
      case 'get_pr_details':
      case 'create_pr_comment':
        return {
          ...baseParams,
          pullNumber: parlantParams.pull_request_number,
          body: parlantParams.comment_text // Only used for create_pr_comment
        }
      case 'get_latest_commit':
        return {
          ...baseParams,
          branch: parlantParams.branch_name
        }
      default:
        return baseParams
    }
  }

  protected async executeSimTool(
    simParams: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResponse> {
    try {
      const baseUrl = 'https://api.github.com'
      const headers = {
        'Authorization': `Bearer ${simParams.apiKey}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Sim-Parlant-Integration'
      }

      let url: string
      let method: string = 'GET'
      let body: any = undefined

      // Build request based on operation
      switch (simParams.operation) {
        case 'github_pr':
          url = `${baseUrl}/repos/${simParams.owner}/${simParams.repo}/pulls/${simParams.pullNumber}`
          break

        case 'github_comment':
          url = `${baseUrl}/repos/${simParams.owner}/${simParams.repo}/issues/${simParams.pullNumber}/comments`
          method = 'POST'
          body = JSON.stringify({ body: simParams.body })
          headers['Content-Type'] = 'application/json'
          break

        case 'github_repo_info':
          url = `${baseUrl}/repos/${simParams.owner}/${simParams.repo}`
          break

        case 'github_latest_commit':
          const branch = simParams.branch || 'main'
          url = `${baseUrl}/repos/${simParams.owner}/${simParams.repo}/commits/${branch}`
          break

        default:
          throw new Error(`Unknown GitHub operation: ${simParams.operation}`)
      }

      const response = await fetch(url, {
        method,
        headers,
        body
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`GitHub API error (${response.status}): ${errorData.message || 'Unknown error'}`)
      }

      const data = await response.json()

      return {
        success: true,
        output: {
          content: this.formatContent(data, simParams.operation),
          metadata: {
            operation: simParams.operation,
            repository: `${simParams.owner}/${simParams.repo}`,
            api_response: data
          }
        },
        timing: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 0
        }
      }

    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Unknown GitHub API error',
        timing: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 0
        }
      }
    }
  }

  protected async transformResult(
    simResult: ToolResponse,
    context: ToolExecutionContext
  ): Promise<any> {
    if (!simResult.success) {
      throw new Error(simResult.error || 'GitHub operation failed')
    }

    const result: any = {
      content: simResult.output.content,
      metadata: simResult.output.metadata
    }

    // Add operation-specific structured data
    const apiResponse = simResult.output.metadata.api_response
    const operation = simResult.output.metadata.operation

    switch (operation) {
      case 'github_pr':
        result.pull_request_info = {
          id: apiResponse.id,
          number: apiResponse.number,
          title: apiResponse.title,
          state: apiResponse.state,
          author: apiResponse.user?.login,
          created_at: apiResponse.created_at,
          updated_at: apiResponse.updated_at,
          mergeable: apiResponse.mergeable,
          review_comments: apiResponse.review_comments,
          commits: apiResponse.commits,
          additions: apiResponse.additions,
          deletions: apiResponse.deletions
        }
        break

      case 'github_repo_info':
        result.repository_info = {
          id: apiResponse.id,
          full_name: apiResponse.full_name,
          description: apiResponse.description,
          language: apiResponse.language,
          stars: apiResponse.stargazers_count,
          forks: apiResponse.forks_count,
          open_issues: apiResponse.open_issues_count,
          size: apiResponse.size,
          created_at: apiResponse.created_at,
          updated_at: apiResponse.updated_at,
          default_branch: apiResponse.default_branch
        }
        break

      case 'github_latest_commit':
        result.commit_info = {
          sha: apiResponse.sha,
          message: apiResponse.commit?.message,
          author: apiResponse.commit?.author?.name,
          date: apiResponse.commit?.author?.date,
          url: apiResponse.html_url
        }
        break

      case 'github_comment':
        result.comment_info = {
          id: apiResponse.id,
          body: apiResponse.body,
          author: apiResponse.user?.login,
          created_at: apiResponse.created_at,
          url: apiResponse.html_url
        }
        break
    }

    return result
  }

  protected async calculateUsage(
    simResult: ToolResponse,
    context: ToolExecutionContext
  ): Promise<any> {
    return {
      apiCallsCount: 1,
      computeUnits: 1,
      githubApiCallsUsed: 1
    }
  }

  /**
   * Format API response content for display
   */
  private formatContent(data: any, operation: string): string {
    switch (operation) {
      case 'github_pr':
        return `Pull Request #${data.number}: "${data.title}" by ${data.user?.login} (${data.state})`

      case 'github_comment':
        return `Comment created by ${data.user?.login}: "${data.body}"`

      case 'github_repo_info':
        return `Repository: ${data.full_name} - ${data.description || 'No description'} (${data.stargazers_count} stars)`

      case 'github_latest_commit':
        return `Latest commit: ${data.commit?.message} by ${data.commit?.author?.name}`

      default:
        return JSON.stringify(data, null, 2)
    }
  }
}