/**
 * Workflow Management Adapters
 *
 * Specialized adapters for advanced workflow operations that go beyond
 * the basic client/server tool functionality.
 */

import { createCustomToolAdapter } from '../factory'
import type { AdapterContext, AdapterResult, ToolAdapter } from '../types'

export class WorkflowManagementAdapters {
  createAdapters(): ToolAdapter[] {
    return [
      this.createWorkflowTemplateAdapter(),
      this.createWorkflowValidationAdapter(),
      this.createWorkflowSchedulingAdapter(),
      this.createWorkflowAnalyticsAdapter(),
      this.createWorkflowVersioningAdapter(),
    ]
  }

  private createWorkflowTemplateAdapter(): ToolAdapter {
    return createCustomToolAdapter(
      'create_workflow_from_template',
      'Create a new workflow from a predefined template',
      'Use this tool when you want to quickly create a workflow based on common patterns or templates. Provide the template name and any customization parameters.',
      {
        type: 'object',
        properties: {
          template_name: {
            type: 'string',
            description: 'Name of the workflow template to use',
            enum: [
              'data-processing',
              'api-integration',
              'notification-system',
              'reporting',
              'automation',
            ],
          },
          name: {
            type: 'string',
            description: 'Name for the new workflow',
          },
          description: {
            type: 'string',
            description: 'Description of what this workflow does',
          },
          parameters: {
            type: 'object',
            description: 'Template-specific parameters',
            additionalProperties: true,
          },
        },
        required: ['template_name', 'name'],
      },
      async (args: any, context: AdapterContext): Promise<AdapterResult> => {
        try {
          const { template_name, name, description = '', parameters = {} } = args

          // Get the template configuration
          const template = await this.getWorkflowTemplate(template_name)
          if (!template) {
            return {
              success: false,
              error: {
                code: 'TEMPLATE_NOT_FOUND',
                message: `Template '${template_name}' not found`,
                user_message: `The workflow template '${template_name}' is not available.`,
                suggestions: [
                  'Check the template name for typos',
                  'Use one of the available templates: data-processing, api-integration, notification-system, reporting, automation',
                ],
                retryable: false,
              },
            }
          }

          // Customize the template with provided parameters
          const customizedYaml = this.customizeTemplate(template, {
            name,
            description,
            ...parameters,
          })

          // Create the workflow using the build_workflow tool
          const buildResult = await this.buildWorkflowFromYaml(customizedYaml, context)

          return {
            success: true,
            data: {
              workflow_id: buildResult.workflow_id,
              name,
              template_used: template_name,
              yaml_content: customizedYaml,
            },
            message: `Successfully created workflow '${name}' from template '${template_name}'`,
            metadata: {
              execution_time_ms: 0,
              cached: false,
              template_used: template_name,
            },
          }
        } catch (error: any) {
          return {
            success: false,
            error: {
              code: 'TEMPLATE_CREATION_ERROR',
              message: error.message || 'Failed to create workflow from template',
              user_message:
                'There was a problem creating the workflow from the template. Please try again.',
              suggestions: [
                'Check your template parameters',
                'Try a different template',
                'Contact support if the problem persists',
              ],
              retryable: true,
            },
          }
        }
      },
      {
        category: 'workflow-management',
        estimatedDurationMs: 3000,
        cacheable: false,
      }
    )
  }

  private createWorkflowValidationAdapter(): ToolAdapter {
    return createCustomToolAdapter(
      'validate_workflow',
      'Validate a workflow configuration for errors and best practices',
      'Use this tool to check a workflow for syntax errors, missing dependencies, performance issues, and adherence to best practices before execution.',
      {
        type: 'object',
        properties: {
          workflow_id: {
            type: 'string',
            description: 'ID of the workflow to validate',
          },
          yaml_content: {
            type: 'string',
            description: 'YAML content to validate (if not using workflow_id)',
          },
          validation_level: {
            type: 'string',
            description: 'Level of validation to perform',
            enum: ['basic', 'comprehensive', 'strict'],
            default: 'comprehensive',
          },
        },
        oneOf: [{ required: ['workflow_id'] }, { required: ['yaml_content'] }],
      },
      async (args: any, context: AdapterContext): Promise<AdapterResult> => {
        try {
          const { workflow_id, yaml_content, validation_level = 'comprehensive' } = args

          let yamlToValidate = yaml_content
          if (workflow_id && !yaml_content) {
            // Fetch workflow YAML from ID
            const workflow = await this.getWorkflowById(workflow_id, context)
            yamlToValidate = workflow?.yaml_content
          }

          if (!yamlToValidate) {
            return {
              success: false,
              error: {
                code: 'NO_WORKFLOW_CONTENT',
                message: 'No workflow content to validate',
                user_message: 'Please provide either a workflow ID or YAML content to validate.',
                suggestions: ['Provide a valid workflow_id', 'Provide yaml_content directly'],
                retryable: false,
              },
            }
          }

          // Perform validation
          const validationResult = await this.validateWorkflowYaml(yamlToValidate, validation_level)

          return {
            success: true,
            data: {
              valid: validationResult.valid,
              errors: validationResult.errors,
              warnings: validationResult.warnings,
              suggestions: validationResult.suggestions,
              performance_score: validationResult.performance_score,
              best_practices_score: validationResult.best_practices_score,
            },
            message: validationResult.valid
              ? 'Workflow validation passed successfully'
              : `Workflow validation found ${validationResult.errors.length} errors and ${validationResult.warnings.length} warnings`,
            metadata: {
              execution_time_ms: 0,
              cached: false,
              validation_level,
            },
          }
        } catch (error: any) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: error.message || 'Failed to validate workflow',
              user_message:
                'There was a problem validating the workflow. Please check the input and try again.',
              suggestions: ['Check your workflow content', 'Try a different validation level'],
              retryable: true,
            },
          }
        }
      },
      {
        category: 'workflow-management',
        estimatedDurationMs: 2000,
        cacheable: true,
      }
    )
  }

  private createWorkflowSchedulingAdapter(): ToolAdapter {
    return createCustomToolAdapter(
      'schedule_workflow',
      'Schedule a workflow to run at specific times or intervals',
      'Use this tool to set up automated workflow execution. You can schedule workflows to run once, daily, weekly, or on custom cron expressions.',
      {
        type: 'object',
        properties: {
          workflow_id: {
            type: 'string',
            description: 'ID of the workflow to schedule',
          },
          schedule_type: {
            type: 'string',
            description: 'Type of schedule',
            enum: ['once', 'daily', 'weekly', 'monthly', 'cron'],
          },
          schedule_time: {
            type: 'string',
            description: 'Time for the schedule (ISO 8601 format for "once", time for recurring)',
          },
          cron_expression: {
            type: 'string',
            description: 'Cron expression (required for cron schedule type)',
          },
          timezone: {
            type: 'string',
            description: 'Timezone for the schedule (default: UTC)',
            default: 'UTC',
          },
          enabled: {
            type: 'boolean',
            description: 'Whether the schedule is enabled',
            default: true,
          },
        },
        required: ['workflow_id', 'schedule_type'],
      },
      async (args: any, context: AdapterContext): Promise<AdapterResult> => {
        try {
          const {
            workflow_id,
            schedule_type,
            schedule_time,
            cron_expression,
            timezone = 'UTC',
            enabled = true,
          } = args

          // Validate schedule parameters
          if (schedule_type === 'cron' && !cron_expression) {
            return {
              success: false,
              error: {
                code: 'MISSING_CRON_EXPRESSION',
                message: 'Cron expression is required for cron schedule type',
                user_message: 'Please provide a cron expression when using cron scheduling.',
                suggestions: ['Add a valid cron expression', 'Use a different schedule type'],
                retryable: false,
              },
            }
          }

          // Verify workflow exists
          const workflow = await this.getWorkflowById(workflow_id, context)
          if (!workflow) {
            return {
              success: false,
              error: {
                code: 'WORKFLOW_NOT_FOUND',
                message: `Workflow ${workflow_id} not found`,
                user_message: `The workflow with ID ${workflow_id} could not be found.`,
                suggestions: ['Check the workflow ID', 'Make sure the workflow exists'],
                retryable: false,
              },
            }
          }

          // Create the schedule
          const schedule = await this.createWorkflowSchedule({
            workflow_id,
            schedule_type,
            schedule_time,
            cron_expression,
            timezone,
            enabled,
            workspace_id: context.workspace_id,
            user_id: context.user_id,
          })

          return {
            success: true,
            data: {
              schedule_id: schedule.id,
              workflow_id,
              schedule_type,
              next_run: schedule.next_run,
              enabled,
            },
            message: `Successfully scheduled workflow '${workflow.name}' to run ${schedule_type}`,
            metadata: {
              execution_time_ms: 0,
              cached: false,
            },
          }
        } catch (error: any) {
          return {
            success: false,
            error: {
              code: 'SCHEDULE_CREATION_ERROR',
              message: error.message || 'Failed to schedule workflow',
              user_message:
                'There was a problem scheduling the workflow. Please check your schedule settings.',
              suggestions: ['Check your schedule parameters', 'Verify the workflow exists'],
              retryable: true,
            },
          }
        }
      },
      {
        category: 'workflow-management',
        estimatedDurationMs: 1500,
        cacheable: false,
      }
    )
  }

  private createWorkflowAnalyticsAdapter(): ToolAdapter {
    return createCustomToolAdapter(
      'get_workflow_analytics',
      'Get detailed analytics and performance metrics for workflows',
      'Use this tool to analyze workflow performance, execution patterns, error rates, and resource usage. Helpful for optimizing workflows and understanding usage patterns.',
      {
        type: 'object',
        properties: {
          workflow_id: {
            type: 'string',
            description:
              'ID of the specific workflow to analyze (optional for workspace-wide analytics)',
          },
          time_range: {
            type: 'string',
            description: 'Time range for analytics',
            enum: ['24h', '7d', '30d', '90d'],
            default: '7d',
          },
          metrics: {
            type: 'array',
            description: 'Specific metrics to include',
            items: {
              type: 'string',
              enum: [
                'executions',
                'success_rate',
                'average_duration',
                'error_rate',
                'resource_usage',
                'cost',
              ],
            },
            default: ['executions', 'success_rate', 'average_duration', 'error_rate'],
          },
        },
        required: [],
      },
      async (args: any, context: AdapterContext): Promise<AdapterResult> => {
        try {
          const {
            workflow_id,
            time_range = '7d',
            metrics = ['executions', 'success_rate', 'average_duration', 'error_rate'],
          } = args

          // Get analytics data
          const analytics = await this.getWorkflowAnalytics({
            workflow_id,
            time_range,
            metrics,
            workspace_id: context.workspace_id,
          })

          return {
            success: true,
            data: analytics,
            message: workflow_id
              ? `Retrieved analytics for workflow ${workflow_id}`
              : 'Retrieved workspace workflow analytics',
            metadata: {
              execution_time_ms: 0,
              cached: false,
              time_range,
              metrics_count: metrics.length,
            },
          }
        } catch (error: any) {
          return {
            success: false,
            error: {
              code: 'ANALYTICS_ERROR',
              message: error.message || 'Failed to retrieve workflow analytics',
              user_message: 'There was a problem retrieving the analytics data. Please try again.',
              suggestions: ['Try a different time range', 'Check if the workflow ID is valid'],
              retryable: true,
            },
          }
        }
      },
      {
        category: 'workflow-management',
        estimatedDurationMs: 2000,
        cacheable: true,
      }
    )
  }

  private createWorkflowVersioningAdapter(): ToolAdapter {
    return createCustomToolAdapter(
      'manage_workflow_versions',
      'Manage workflow versions including creating, comparing, and restoring versions',
      'Use this tool to create workflow versions, compare different versions, and restore previous versions. Essential for workflow change management.',
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Action to perform',
            enum: ['create_version', 'list_versions', 'compare_versions', 'restore_version'],
          },
          workflow_id: {
            type: 'string',
            description: 'ID of the workflow',
          },
          version_name: {
            type: 'string',
            description: 'Name for the new version (for create_version)',
          },
          version_description: {
            type: 'string',
            description: 'Description of the version (for create_version)',
          },
          from_version: {
            type: 'string',
            description: 'Source version for comparison (for compare_versions)',
          },
          to_version: {
            type: 'string',
            description: 'Target version for comparison or restore',
          },
        },
        required: ['action', 'workflow_id'],
      },
      async (args: any, context: AdapterContext): Promise<AdapterResult> => {
        try {
          const {
            action,
            workflow_id,
            version_name,
            version_description,
            from_version,
            to_version,
          } = args

          switch (action) {
            case 'create_version': {
              if (!version_name) {
                throw new Error('version_name is required for create_version action')
              }
              const newVersion = await this.createWorkflowVersion({
                workflow_id,
                name: version_name,
                description: version_description || '',
                workspace_id: context.workspace_id,
              })
              return {
                success: true,
                data: newVersion,
                message: `Created version '${version_name}' for workflow`,
              }
            }

            case 'list_versions': {
              const versions = await this.listWorkflowVersions(workflow_id, context.workspace_id)
              return {
                success: true,
                data: { versions },
                message: `Found ${versions.length} versions for workflow`,
              }
            }

            case 'compare_versions': {
              if (!from_version || !to_version) {
                throw new Error(
                  'from_version and to_version are required for compare_versions action'
                )
              }
              const comparison = await this.compareWorkflowVersions({
                workflow_id,
                from_version,
                to_version,
                workspace_id: context.workspace_id,
              })
              return {
                success: true,
                data: comparison,
                message: `Compared versions ${from_version} and ${to_version}`,
              }
            }

            case 'restore_version': {
              if (!to_version) {
                throw new Error('to_version is required for restore_version action')
              }
              const restored = await this.restoreWorkflowVersion({
                workflow_id,
                version: to_version,
                workspace_id: context.workspace_id,
              })
              return {
                success: true,
                data: restored,
                message: `Restored workflow to version ${to_version}`,
              }
            }

            default:
              throw new Error(`Unknown action: ${action}`)
          }
        } catch (error: any) {
          return {
            success: false,
            error: {
              code: 'VERSION_MANAGEMENT_ERROR',
              message: error.message || 'Failed to manage workflow version',
              user_message: 'There was a problem with the version management operation.',
              suggestions: ['Check your parameters', 'Verify the workflow exists'],
              retryable: true,
            },
          }
        }
      },
      {
        category: 'workflow-management',
        estimatedDurationMs: 2500,
        cacheable: false,
      }
    )
  }

  // Helper methods (these would be implemented to integrate with actual Sim services)

  private async getWorkflowTemplate(templateName: string): Promise<any> {
    // Mock implementation - would integrate with actual template service
    const templates: Record<string, any> = {
      'data-processing': {
        name: 'Data Processing Pipeline',
        yaml: 'version: 1.0\nname: {{name}}\ndescription: {{description}}\nsteps:\n  - name: input\n    type: data_source\n  - name: transform\n    type: transformer\n  - name: output\n    type: data_sink',
      },
      // Add more templates...
    }
    return templates[templateName] || null
  }

  private customizeTemplate(template: any, parameters: any): string {
    let yaml = template.yaml
    for (const [key, value] of Object.entries(parameters)) {
      yaml = yaml.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }
    return yaml
  }

  private async buildWorkflowFromYaml(yaml: string, context: AdapterContext): Promise<any> {
    // Mock implementation - would call actual build_workflow tool
    return {
      workflow_id: `workflow_${Date.now()}`,
      yaml_content: yaml,
    }
  }

  private async getWorkflowById(workflowId: string, context: AdapterContext): Promise<any> {
    // Mock implementation - would integrate with actual workflow service
    return {
      id: workflowId,
      name: 'Sample Workflow',
      yaml_content: 'version: 1.0\nname: Sample\nsteps: []',
    }
  }

  private async validateWorkflowYaml(yaml: string, level: string): Promise<any> {
    // Mock validation - would implement actual YAML and workflow validation
    return {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      performance_score: 85,
      best_practices_score: 90,
    }
  }

  private async createWorkflowSchedule(scheduleData: any): Promise<any> {
    // Mock implementation - would integrate with scheduling service
    return {
      id: `schedule_${Date.now()}`,
      next_run: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }
  }

  private async getWorkflowAnalytics(params: any): Promise<any> {
    // Mock implementation - would integrate with analytics service
    return {
      time_range: params.time_range,
      total_executions: 150,
      success_rate: 0.95,
      average_duration_ms: 2500,
      error_rate: 0.05,
      trends: {
        executions: [10, 15, 20, 18, 25, 22, 20],
        success_rate: [0.9, 0.95, 0.94, 0.96, 0.95, 0.95, 0.95],
      },
    }
  }

  private async createWorkflowVersion(params: any): Promise<any> {
    // Mock implementation - would integrate with version control service
    return {
      id: `version_${Date.now()}`,
      name: params.name,
      description: params.description,
      created_at: new Date().toISOString(),
    }
  }

  private async listWorkflowVersions(workflowId: string, workspaceId: string): Promise<any[]> {
    // Mock implementation
    return [
      { id: 'v1', name: 'Initial Version', created_at: '2024-01-01T00:00:00Z' },
      { id: 'v2', name: 'Bug Fixes', created_at: '2024-01-15T00:00:00Z' },
    ]
  }

  private async compareWorkflowVersions(params: any): Promise<any> {
    // Mock implementation
    return {
      differences: [
        { type: 'added', path: 'steps[2]', description: 'Added new validation step' },
        { type: 'modified', path: 'steps[0].config', description: 'Updated input configuration' },
      ],
      summary: '2 changes detected',
    }
  }

  private async restoreWorkflowVersion(params: any): Promise<any> {
    // Mock implementation
    return {
      restored_version: params.version,
      timestamp: new Date().toISOString(),
    }
  }
}
