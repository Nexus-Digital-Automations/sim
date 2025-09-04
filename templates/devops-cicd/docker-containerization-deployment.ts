/**
 * Docker Containerization and Deployment Template
 * 
 * Enterprise-grade Docker containerization workflow with multi-stage builds,
 * security scanning, and automated deployment to container registries.
 * 
 * Features:
 * - Multi-stage Dockerfile optimization
 * - Security vulnerability scanning
 * - Container registry deployment
 * - Environment-specific configuration
 * - Rollback capabilities
 */

import { WorkflowTemplate, Block } from '../shared/types';

export const dockerContainerizationTemplate: WorkflowTemplate = {
  id: 'docker-containerization-deployment',
  name: 'Docker Containerization & Deployment',
  description: 'Comprehensive Docker containerization workflow with security scanning and automated deployment',
  category: 'devops-cicd',
  subcategories: ['deployment-automation', 'containerization'],
  difficulty: 'intermediate',
  estimatedTime: '15-30 minutes',
  
  // Required integrations and services
  integrations: ['docker', 'docker-registry', 'security-scanner', 'notification-service'],
  
  // Template metadata
  metadata: {
    author: 'Sim Platform',
    version: '1.0.0',
    created: new Date().toISOString(),
    tags: ['docker', 'containerization', 'deployment', 'security', 'ci-cd'],
    usageCount: 0,
    rating: 0,
  },
  
  // Workflow configuration parameters
  parameters: {
    applicationName: {
      type: 'string',
      required: true,
      description: 'Name of the application to containerize',
      placeholder: 'my-web-app'
    },
    dockerfilePath: {
      type: 'string',
      required: true,
      description: 'Path to Dockerfile',
      placeholder: './Dockerfile',
      default: './Dockerfile'
    },
    registryUrl: {
      type: 'string',
      required: true,
      description: 'Container registry URL',
      placeholder: 'registry.company.com'
    },
    imageTag: {
      type: 'string',
      required: false,
      description: 'Docker image tag (defaults to git commit hash)',
      placeholder: 'latest'
    },
    buildArgs: {
      type: 'object',
      required: false,
      description: 'Build arguments for Docker build',
      placeholder: '{"NODE_ENV": "production"}'
    },
    targetEnvironment: {
      type: 'select',
      required: true,
      options: ['development', 'staging', 'production'],
      description: 'Target deployment environment'
    },
    enableSecurityScan: {
      type: 'boolean',
      required: false,
      default: true,
      description: 'Enable container security vulnerability scanning'
    },
    notificationChannels: {
      type: 'array',
      required: false,
      description: 'Notification channels for deployment status',
      items: { type: 'string' }
    }
  },
  
  // Workflow blocks and steps
  blocks: [
    // Block 1: Environment Setup and Validation
    {
      id: 'env-setup',
      type: 'validation',
      name: 'Environment Setup & Validation',
      description: 'Validate environment and prepare for containerization',
      
      inputs: {
        applicationName: '${parameters.applicationName}',
        dockerfilePath: '${parameters.dockerfilePath}',
        registryUrl: '${parameters.registryUrl}',
        targetEnvironment: '${parameters.targetEnvironment}'
      },
      
      actions: [
        {
          name: 'validate-dockerfile',
          type: 'file-check',
          config: {
            path: '${inputs.dockerfilePath}',
            mustExist: true,
            errorMessage: 'Dockerfile not found at specified path'
          }
        },
        {
          name: 'validate-registry-access',
          type: 'docker-registry-check',
          config: {
            registryUrl: '${inputs.registryUrl}',
            credentials: '${secrets.docker_registry_credentials}',
            timeout: 30000
          }
        },
        {
          name: 'set-image-tag',
          type: 'variable-set',
          config: {
            variable: 'imageTag',
            value: '${parameters.imageTag || git.commitHash || "latest"}'
          }
        },
        {
          name: 'create-build-context',
          type: 'docker-context-create',
          config: {
            contextPath: '.',
            excludePatterns: ['.git', 'node_modules', '*.log']
          }
        }
      ],
      
      outputs: {
        imageTag: '${actions.set-image-tag.value}',
        buildContext: '${actions.create-build-context.contextId}',
        registryValidated: '${actions.validate-registry-access.success}'
      }
    },
    
    // Block 2: Multi-stage Docker Build
    {
      id: 'docker-build',
      type: 'build',
      name: 'Multi-stage Docker Build',
      description: 'Build Docker image with multi-stage optimization',
      
      dependsOn: ['env-setup'],
      
      inputs: {
        applicationName: '${parameters.applicationName}',
        dockerfilePath: '${parameters.dockerfilePath}',
        buildArgs: '${parameters.buildArgs}',
        imageTag: '${blocks.env-setup.outputs.imageTag}',
        buildContext: '${blocks.env-setup.outputs.buildContext}'
      },
      
      actions: [
        {
          name: 'docker-build',
          type: 'docker-build',
          config: {
            dockerfile: '${inputs.dockerfilePath}',
            context: '${inputs.buildContext}',
            tags: [
              '${inputs.applicationName}:${inputs.imageTag}',
              '${inputs.applicationName}:latest'
            ],
            buildArgs: '${inputs.buildArgs}',
            platform: 'linux/amd64',
            buildOptions: {
              noCache: false,
              squash: true,
              target: 'production'
            },
            logLevel: 'info'
          }
        },
        {
          name: 'image-inspection',
          type: 'docker-inspect',
          config: {
            imageId: '${actions.docker-build.imageId}',
            includeConfig: true,
            includeManifest: true
          }
        },
        {
          name: 'size-optimization-check',
          type: 'docker-size-analysis',
          config: {
            imageId: '${actions.docker-build.imageId}',
            warnThreshold: '500MB',
            errorThreshold: '1GB',
            generateReport: true
          }
        }
      ],
      
      outputs: {
        imageId: '${actions.docker-build.imageId}',
        imageName: '${inputs.applicationName}:${inputs.imageTag}',
        imageSize: '${actions.size-optimization-check.size}',
        buildReport: '${actions.size-optimization-check.report}'
      }
    },
    
    // Block 3: Security Vulnerability Scanning
    {
      id: 'security-scan',
      type: 'security',
      name: 'Container Security Scanning',
      description: 'Scan Docker image for security vulnerabilities',
      
      dependsOn: ['docker-build'],
      condition: '${parameters.enableSecurityScan === true}',
      
      inputs: {
        imageId: '${blocks.docker-build.outputs.imageId}',
        imageName: '${blocks.docker-build.outputs.imageName}'
      },
      
      actions: [
        {
          name: 'vulnerability-scan',
          type: 'trivy-scan',
          config: {
            image: '${inputs.imageName}',
            scanTypes: ['os', 'library'],
            format: 'json',
            severity: ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            exitCode: 1,
            timeout: 600000,
            cacheDir: '/tmp/.trivycache'
          }
        },
        {
          name: 'security-report-generation',
          type: 'security-report',
          config: {
            scanResults: '${actions.vulnerability-scan.results}',
            format: 'html',
            includeFixed: true,
            includeUnfixed: true,
            groupBySeverity: true
          }
        },
        {
          name: 'security-gate-check',
          type: 'security-gate',
          config: {
            scanResults: '${actions.vulnerability-scan.results}',
            allowedSeverities: ['UNKNOWN', 'LOW', 'MEDIUM'],
            maxCritical: 0,
            maxHigh: 5,
            failOnError: true
          }
        }
      ],
      
      outputs: {
        vulnerabilityCount: '${actions.vulnerability-scan.vulnerabilityCount}',
        securityReport: '${actions.security-report-generation.reportPath}',
        securityGatePassed: '${actions.security-gate-check.passed}'
      }
    },
    
    // Block 4: Container Registry Push
    {
      id: 'registry-push',
      type: 'deployment',
      name: 'Push to Container Registry',
      description: 'Tag and push Docker image to container registry',
      
      dependsOn: ['docker-build', 'security-scan'],
      condition: '${blocks.security-scan.outputs.securityGatePassed === true || parameters.enableSecurityScan === false}',
      
      inputs: {
        imageId: '${blocks.docker-build.outputs.imageId}',
        imageName: '${blocks.docker-build.outputs.imageName}',
        registryUrl: '${parameters.registryUrl}',
        applicationName: '${parameters.applicationName}',
        imageTag: '${blocks.env-setup.outputs.imageTag}',
        targetEnvironment: '${parameters.targetEnvironment}'
      },
      
      actions: [
        {
          name: 'docker-tag',
          type: 'docker-tag',
          config: {
            sourceImage: '${inputs.imageName}',
            targetTags: [
              '${inputs.registryUrl}/${inputs.applicationName}:${inputs.imageTag}',
              '${inputs.registryUrl}/${inputs.applicationName}:${inputs.targetEnvironment}',
              '${inputs.registryUrl}/${inputs.applicationName}:latest'
            ]
          }
        },
        {
          name: 'docker-push',
          type: 'docker-push',
          config: {
            images: '${actions.docker-tag.targetTags}',
            registry: '${inputs.registryUrl}',
            credentials: '${secrets.docker_registry_credentials}',
            retryAttempts: 3,
            parallel: false
          }
        },
        {
          name: 'manifest-generation',
          type: 'docker-manifest',
          config: {
            registryUrl: '${inputs.registryUrl}',
            imageName: '${inputs.applicationName}',
            tag: '${inputs.imageTag}',
            platforms: ['linux/amd64'],
            generateSbom: true
          }
        }
      ],
      
      outputs: {
        registryImages: '${actions.docker-tag.targetTags}',
        pushSuccess: '${actions.docker-push.success}',
        manifestDigest: '${actions.manifest-generation.digest}',
        sbomPath: '${actions.manifest-generation.sbomPath}'
      }
    },
    
    // Block 5: Deployment Verification
    {
      id: 'deployment-verification',
      type: 'verification',
      name: 'Deployment Verification',
      description: 'Verify successful deployment and image availability',
      
      dependsOn: ['registry-push'],
      
      inputs: {
        registryUrl: '${parameters.registryUrl}',
        applicationName: '${parameters.applicationName}',
        imageTag: '${blocks.env-setup.outputs.imageTag}',
        manifestDigest: '${blocks.registry-push.outputs.manifestDigest}'
      },
      
      actions: [
        {
          name: 'registry-verification',
          type: 'docker-registry-verify',
          config: {
            registryUrl: '${inputs.registryUrl}',
            imageName: '${inputs.applicationName}',
            tag: '${inputs.imageTag}',
            verifyDigest: '${inputs.manifestDigest}',
            timeout: 60000
          }
        },
        {
          name: 'image-pull-test',
          type: 'docker-pull-test',
          config: {
            imageUrl: '${inputs.registryUrl}/${inputs.applicationName}:${inputs.imageTag}',
            credentials: '${secrets.docker_registry_credentials}',
            cleanup: true
          }
        },
        {
          name: 'deployment-metadata',
          type: 'metadata-generation',
          config: {
            deployment: {
              applicationName: '${inputs.applicationName}',
              imageTag: '${inputs.imageTag}',
              registryUrl: '${inputs.registryUrl}',
              manifestDigest: '${inputs.manifestDigest}',
              deploymentTime: '${now()}',
              environment: '${parameters.targetEnvironment}'
            },
            outputFormat: 'json'
          }
        }
      ],
      
      outputs: {
        verificationSuccess: '${actions.registry-verification.success}',
        pullTestSuccess: '${actions.image-pull-test.success}',
        deploymentMetadata: '${actions.deployment-metadata.metadata}'
      }
    },
    
    // Block 6: Notification and Cleanup
    {
      id: 'notification-cleanup',
      type: 'notification',
      name: 'Deployment Notification & Cleanup',
      description: 'Send deployment notifications and perform cleanup',
      
      dependsOn: ['deployment-verification'],
      
      inputs: {
        applicationName: '${parameters.applicationName}',
        imageTag: '${blocks.env-setup.outputs.imageTag}',
        targetEnvironment: '${parameters.targetEnvironment}',
        deploymentSuccess: '${blocks.deployment-verification.outputs.verificationSuccess}',
        notificationChannels: '${parameters.notificationChannels}',
        securityReport: '${blocks.security-scan.outputs.securityReport}',
        buildReport: '${blocks.docker-build.outputs.buildReport}'
      },
      
      actions: [
        {
          name: 'deployment-notification',
          type: 'notification-send',
          config: {
            channels: '${inputs.notificationChannels}',
            message: {
              title: 'Docker Deployment ${inputs.deploymentSuccess ? "Successful" : "Failed"}',
              body: 'Application: ${inputs.applicationName}\nTag: ${inputs.imageTag}\nEnvironment: ${inputs.targetEnvironment}',
              color: '${inputs.deploymentSuccess ? "green" : "red"}',
              attachments: [
                '${inputs.securityReport}',
                '${inputs.buildReport}'
              ]
            }
          }
        },
        {
          name: 'local-cleanup',
          type: 'docker-cleanup',
          config: {
            removeUntaggedImages: true,
            removeDanglingImages: true,
            pruneBuildCache: true,
            maxAge: '24h'
          }
        },
        {
          name: 'rollback-preparation',
          type: 'rollback-metadata',
          config: {
            currentDeployment: {
              applicationName: '${inputs.applicationName}',
              imageTag: '${inputs.imageTag}',
              registryUrl: '${parameters.registryUrl}',
              environment: '${inputs.targetEnvironment}'
            },
            rollbackInstructions: 'To rollback, deploy previous image tag or use emergency rollback template'
          }
        }
      ],
      
      outputs: {
        notificationSent: '${actions.deployment-notification.success}',
        cleanupCompleted: '${actions.local-cleanup.success}',
        rollbackData: '${actions.rollback-preparation.rollbackData}'
      }
    }
  ],
  
  // Error handling configuration
  errorHandling: {
    onFailure: 'cleanup',
    retryPolicy: {
      maxAttempts: 2,
      backoffStrategy: 'exponential',
      retryableErrors: ['network', 'timeout', 'rate-limit']
    },
    notifications: {
      onError: true,
      channels: '${parameters.notificationChannels}'
    }
  },
  
  // Template documentation and examples
  documentation: {
    overview: 'This template provides a comprehensive Docker containerization workflow with security scanning and automated deployment to container registries.',
    prerequisites: [
      'Docker installed and configured',
      'Container registry credentials configured',
      'Application with valid Dockerfile',
      'Security scanner (Trivy) available'
    ],
    examples: [
      {
        name: 'Node.js Web Application',
        parameters: {
          applicationName: 'my-node-app',
          dockerfilePath: './Dockerfile',
          registryUrl: 'registry.company.com',
          targetEnvironment: 'production',
          buildArgs: { NODE_ENV: 'production' }
        }
      },
      {
        name: 'Python API Service',
        parameters: {
          applicationName: 'python-api',
          dockerfilePath: './docker/Dockerfile',
          registryUrl: 'gcr.io/my-project',
          targetEnvironment: 'staging',
          enableSecurityScan: true
        }
      }
    ],
    troubleshooting: [
      {
        issue: 'Docker build fails due to missing dependencies',
        solution: 'Check Dockerfile for correct package installation commands and base image compatibility'
      },
      {
        issue: 'Security scan fails with high-severity vulnerabilities',
        solution: 'Update base image and dependencies, or configure security gate to allow specific vulnerabilities'
      },
      {
        issue: 'Registry push fails with authentication error',
        solution: 'Verify docker_registry_credentials secret is correctly configured with valid credentials'
      }
    ]
  }
};