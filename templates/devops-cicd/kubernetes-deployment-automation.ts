/**
 * Kubernetes Deployment Automation Template
 * 
 * Enterprise-grade Kubernetes deployment automation with rolling updates,
 * health checks, service mesh integration, and automated rollback capabilities.
 * 
 * Features:
 * - Blue-green and rolling update strategies
 * - Health check automation
 * - Service mesh integration (Istio)
 * - ConfigMap and Secret management
 * - Horizontal Pod Autoscaling
 * - Automated rollback on failure
 */

import { WorkflowTemplate, Block } from '../shared/types';

export const kubernetesDeploymentTemplate: WorkflowTemplate = {
  id: 'kubernetes-deployment-automation',
  name: 'Kubernetes Deployment Automation',
  description: 'Comprehensive Kubernetes deployment with rolling updates, health checks, and automated rollback',
  category: 'devops-cicd',
  subcategories: ['deployment-automation', 'kubernetes', 'container-orchestration'],
  difficulty: 'advanced',
  estimatedTime: '20-45 minutes',
  
  integrations: ['kubernetes', 'helm', 'docker-registry', 'monitoring', 'notification-service'],
  
  metadata: {
    author: 'Sim Platform',
    version: '1.0.0',
    created: new Date().toISOString(),
    tags: ['kubernetes', 'k8s', 'deployment', 'rolling-update', 'health-check', 'autoscaling'],
    usageCount: 0,
    rating: 0,
  },
  
  parameters: {
    applicationName: {
      type: 'string',
      required: true,
      description: 'Name of the application to deploy',
      placeholder: 'my-web-app'
    },
    namespace: {
      type: 'string',
      required: true,
      description: 'Kubernetes namespace for deployment',
      placeholder: 'production',
      default: 'default'
    },
    imageUrl: {
      type: 'string',
      required: true,
      description: 'Full Docker image URL with tag',
      placeholder: 'registry.company.com/my-app:v1.2.3'
    },
    replicas: {
      type: 'number',
      required: true,
      description: 'Number of pod replicas',
      default: 3,
      min: 1,
      max: 50
    },
    deploymentStrategy: {
      type: 'select',
      required: true,
      options: ['RollingUpdate', 'BlueGreen', 'Canary'],
      default: 'RollingUpdate',
      description: 'Deployment strategy to use'
    },
    resourceLimits: {
      type: 'object',
      required: true,
      description: 'CPU and memory resource limits',
      default: {
        cpu: '500m',
        memory: '512Mi',
        requests: {
          cpu: '250m',
          memory: '256Mi'
        }
      }
    },
    healthCheckPath: {
      type: 'string',
      required: false,
      description: 'Health check endpoint path',
      placeholder: '/health',
      default: '/health'
    },
    port: {
      type: 'number',
      required: true,
      description: 'Container port',
      default: 8080
    },
    enableHPA: {
      type: 'boolean',
      required: false,
      description: 'Enable Horizontal Pod Autoscaler',
      default: true
    },
    hpaConfig: {
      type: 'object',
      required: false,
      description: 'HPA configuration',
      default: {
        minReplicas: 2,
        maxReplicas: 10,
        cpuThreshold: 70,
        memoryThreshold: 80
      }
    },
    enableServiceMesh: {
      type: 'boolean',
      required: false,
      description: 'Enable Istio service mesh integration',
      default: false
    },
    configMaps: {
      type: 'array',
      required: false,
      description: 'ConfigMaps to mount',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          mountPath: { type: 'string' }
        }
      }
    },
    secrets: {
      type: 'array',
      required: false,
      description: 'Secrets to mount',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          mountPath: { type: 'string' }
        }
      }
    },
    environmentVariables: {
      type: 'object',
      required: false,
      description: 'Environment variables for the application'
    },
    notificationChannels: {
      type: 'array',
      required: false,
      description: 'Notification channels for deployment status'
    }
  },
  
  blocks: [
    // Block 1: Pre-deployment Validation
    {
      id: 'pre-deployment-validation',
      type: 'validation',
      name: 'Pre-deployment Validation',
      description: 'Validate Kubernetes cluster, namespace, and deployment parameters',
      
      inputs: {
        applicationName: '${parameters.applicationName}',
        namespace: '${parameters.namespace}',
        imageUrl: '${parameters.imageUrl}',
        replicas: '${parameters.replicas}'
      },
      
      actions: [
        {
          name: 'cluster-connectivity',
          type: 'kubectl-cluster-info',
          config: {
            timeout: 30000,
            validateApiServer: true,
            validateNodes: true
          }
        },
        {
          name: 'namespace-validation',
          type: 'kubectl-namespace-check',
          config: {
            namespace: '${inputs.namespace}',
            createIfNotExists: true
          }
        },
        {
          name: 'image-accessibility',
          type: 'docker-image-check',
          config: {
            imageUrl: '${inputs.imageUrl}',
            credentials: '${secrets.docker_registry_credentials}',
            timeout: 60000
          }
        },
        {
          name: 'resource-quota-check',
          type: 'kubectl-resource-quota',
          config: {
            namespace: '${inputs.namespace}',
            requiredResources: {
              cpu: '${parameters.resourceLimits.cpu * parameters.replicas}',
              memory: '${parameters.resourceLimits.memory * parameters.replicas}'
            }
          }
        },
        {
          name: 'rbac-validation',
          type: 'kubectl-rbac-check',
          config: {
            namespace: '${inputs.namespace}',
            requiredPermissions: ['create', 'update', 'get', 'list', 'delete'],
            resources: ['deployments', 'services', 'configmaps', 'secrets', 'hpa']
          }
        }
      ],
      
      outputs: {
        clusterReady: '${actions.cluster-connectivity.ready}',
        namespaceReady: '${actions.namespace-validation.ready}',
        imageAccessible: '${actions.image-accessibility.accessible}',
        resourcesAvailable: '${actions.resource-quota-check.available}',
        permissionsValid: '${actions.rbac-validation.valid}'
      }
    },
    
    // Block 2: ConfigMap and Secret Management
    {
      id: 'config-secret-management',
      type: 'configuration',
      name: 'ConfigMap and Secret Management',
      description: 'Create and update ConfigMaps and Secrets',
      
      dependsOn: ['pre-deployment-validation'],
      condition: '${parameters.configMaps.length > 0 || parameters.secrets.length > 0}',
      
      inputs: {
        namespace: '${parameters.namespace}',
        applicationName: '${parameters.applicationName}',
        configMaps: '${parameters.configMaps}',
        secrets: '${parameters.secrets}',
        environmentVariables: '${parameters.environmentVariables}'
      },
      
      actions: [
        {
          name: 'create-configmaps',
          type: 'kubectl-configmap-create',
          config: {
            namespace: '${inputs.namespace}',
            configMaps: '${inputs.configMaps}',
            environmentVariables: '${inputs.environmentVariables}',
            labels: {
              app: '${inputs.applicationName}',
              version: '${git.commitHash}',
              managed-by: 'sim-platform'
            }
          }
        },
        {
          name: 'create-secrets',
          type: 'kubectl-secret-create',
          config: {
            namespace: '${inputs.namespace}',
            secrets: '${inputs.secrets}',
            type: 'Opaque',
            labels: {
              app: '${inputs.applicationName}',
              version: '${git.commitHash}',
              managed-by: 'sim-platform'
            }
          }
        },
        {
          name: 'validate-config-secrets',
          type: 'kubectl-config-validation',
          config: {
            namespace: '${inputs.namespace}',
            configMaps: '${actions.create-configmaps.names}',
            secrets: '${actions.create-secrets.names}'
          }
        }
      ],
      
      outputs: {
        configMapsCreated: '${actions.create-configmaps.names}',
        secretsCreated: '${actions.create-secrets.names}',
        configurationReady: '${actions.validate-config-secrets.valid}'
      }
    },
    
    // Block 3: Deployment Manifest Generation
    {
      id: 'deployment-manifest-generation',
      type: 'generation',
      name: 'Deployment Manifest Generation',
      description: 'Generate Kubernetes deployment, service, and HPA manifests',
      
      dependsOn: ['pre-deployment-validation', 'config-secret-management'],
      
      inputs: {
        applicationName: '${parameters.applicationName}',
        namespace: '${parameters.namespace}',
        imageUrl: '${parameters.imageUrl}',
        replicas: '${parameters.replicas}',
        deploymentStrategy: '${parameters.deploymentStrategy}',
        resourceLimits: '${parameters.resourceLimits}',
        healthCheckPath: '${parameters.healthCheckPath}',
        port: '${parameters.port}',
        enableHPA: '${parameters.enableHPA}',
        hpaConfig: '${parameters.hpaConfig}',
        enableServiceMesh: '${parameters.enableServiceMesh}',
        configMaps: '${blocks.config-secret-management.outputs.configMapsCreated}',
        secrets: '${blocks.config-secret-management.outputs.secretsCreated}'
      },
      
      actions: [
        {
          name: 'generate-deployment-manifest',
          type: 'k8s-deployment-manifest',
          config: {
            apiVersion: 'apps/v1',
            metadata: {
              name: '${inputs.applicationName}',
              namespace: '${inputs.namespace}',
              labels: {
                app: '${inputs.applicationName}',
                version: '${git.commitHash}',
                managed-by: 'sim-platform'
              },
              annotations: {
                'deployment.kubernetes.io/revision': '${now()}',
                'sim.platform/deployment-strategy': '${inputs.deploymentStrategy}'
              }
            },
            spec: {
              replicas: '${inputs.replicas}',
              strategy: {
                type: '${inputs.deploymentStrategy}',
                rollingUpdate: {
                  maxUnavailable: '25%',
                  maxSurge: '25%'
                }
              },
              selector: {
                matchLabels: {
                  app: '${inputs.applicationName}'
                }
              },
              template: {
                metadata: {
                  labels: {
                    app: '${inputs.applicationName}',
                    version: '${git.commitHash}'
                  },
                  annotations: {
                    'sidecar.istio.io/inject': '${inputs.enableServiceMesh.toString()}'
                  }
                },
                spec: {
                  containers: [{
                    name: '${inputs.applicationName}',
                    image: '${inputs.imageUrl}',
                    ports: [{
                      containerPort: '${inputs.port}',
                      protocol: 'TCP'
                    }],
                    resources: '${inputs.resourceLimits}',
                    livenessProbe: {
                      httpGet: {
                        path: '${inputs.healthCheckPath}',
                        port: '${inputs.port}'
                      },
                      initialDelaySeconds: 30,
                      periodSeconds: 10,
                      timeoutSeconds: 5,
                      failureThreshold: 3
                    },
                    readinessProbe: {
                      httpGet: {
                        path: '${inputs.healthCheckPath}',
                        port: '${inputs.port}'
                      },
                      initialDelaySeconds: 5,
                      periodSeconds: 5,
                      timeoutSeconds: 3,
                      failureThreshold: 3
                    }
                  }]
                }
              }
            }
          }
        },
        {
          name: 'generate-service-manifest',
          type: 'k8s-service-manifest',
          config: {
            apiVersion: 'v1',
            metadata: {
              name: '${inputs.applicationName}-service',
              namespace: '${inputs.namespace}',
              labels: {
                app: '${inputs.applicationName}',
                managed-by: 'sim-platform'
              }
            },
            spec: {
              type: 'ClusterIP',
              selector: {
                app: '${inputs.applicationName}'
              },
              ports: [{
                port: 80,
                targetPort: '${inputs.port}',
                protocol: 'TCP'
              }]
            }
          }
        },
        {
          name: 'generate-hpa-manifest',
          type: 'k8s-hpa-manifest',
          condition: '${inputs.enableHPA}',
          config: {
            apiVersion: 'autoscaling/v2',
            metadata: {
              name: '${inputs.applicationName}-hpa',
              namespace: '${inputs.namespace}',
              labels: {
                app: '${inputs.applicationName}',
                managed-by: 'sim-platform'
              }
            },
            spec: {
              scaleTargetRef: {
                apiVersion: 'apps/v1',
                kind: 'Deployment',
                name: '${inputs.applicationName}'
              },
              minReplicas: '${inputs.hpaConfig.minReplicas}',
              maxReplicas: '${inputs.hpaConfig.maxReplicas}',
              metrics: [
                {
                  type: 'Resource',
                  resource: {
                    name: 'cpu',
                    target: {
                      type: 'Utilization',
                      averageUtilization: '${inputs.hpaConfig.cpuThreshold}'
                    }
                  }
                },
                {
                  type: 'Resource',
                  resource: {
                    name: 'memory',
                    target: {
                      type: 'Utilization',
                      averageUtilization: '${inputs.hpaConfig.memoryThreshold}'
                    }
                  }
                }
              ]
            }
          }
        }
      ],
      
      outputs: {
        deploymentManifest: '${actions.generate-deployment-manifest.manifest}',
        serviceManifest: '${actions.generate-service-manifest.manifest}',
        hpaManifest: '${actions.generate-hpa-manifest.manifest}',
        manifestsGenerated: true
      }
    },
    
    // Block 4: Deployment Execution
    {
      id: 'deployment-execution',
      type: 'deployment',
      name: 'Kubernetes Deployment Execution',
      description: 'Execute deployment with selected strategy and monitor progress',
      
      dependsOn: ['deployment-manifest-generation'],
      
      inputs: {
        namespace: '${parameters.namespace}',
        applicationName: '${parameters.applicationName}',
        deploymentStrategy: '${parameters.deploymentStrategy}',
        deploymentManifest: '${blocks.deployment-manifest-generation.outputs.deploymentManifest}',
        serviceManifest: '${blocks.deployment-manifest-generation.outputs.serviceManifest}',
        hpaManifest: '${blocks.deployment-manifest-generation.outputs.hpaManifest}',
        enableHPA: '${parameters.enableHPA}'
      },
      
      actions: [
        {
          name: 'apply-service',
          type: 'kubectl-apply',
          config: {
            manifest: '${inputs.serviceManifest}',
            namespace: '${inputs.namespace}',
            validate: true,
            dryRun: false
          }
        },
        {
          name: 'apply-deployment',
          type: 'kubectl-apply',
          config: {
            manifest: '${inputs.deploymentManifest}',
            namespace: '${inputs.namespace}',
            validate: true,
            dryRun: false,
            recordHistory: true
          }
        },
        {
          name: 'deployment-rollout-status',
          type: 'kubectl-rollout-status',
          config: {
            resource: 'deployment/${inputs.applicationName}',
            namespace: '${inputs.namespace}',
            timeout: 600000, // 10 minutes
            checkInterval: 10000 // 10 seconds
          }
        },
        {
          name: 'apply-hpa',
          type: 'kubectl-apply',
          condition: '${inputs.enableHPA}',
          config: {
            manifest: '${inputs.hpaManifest}',
            namespace: '${inputs.namespace}',
            validate: true,
            dryRun: false
          }
        }
      ],
      
      outputs: {
        serviceApplied: '${actions.apply-service.success}',
        deploymentApplied: '${actions.apply-deployment.success}',
        rolloutSuccessful: '${actions.deployment-rollout-status.success}',
        hpaApplied: '${actions.apply-hpa.success}',
        deploymentReady: '${actions.deployment-rollout-status.ready}'
      }
    },
    
    // Block 5: Health Check and Verification
    {
      id: 'health-verification',
      type: 'verification',
      name: 'Deployment Health Verification',
      description: 'Verify deployment health and service availability',
      
      dependsOn: ['deployment-execution'],
      
      inputs: {
        namespace: '${parameters.namespace}',
        applicationName: '${parameters.applicationName}',
        healthCheckPath: '${parameters.healthCheckPath}',
        port: '${parameters.port}',
        replicas: '${parameters.replicas}'
      },
      
      actions: [
        {
          name: 'pod-status-check',
          type: 'kubectl-pod-status',
          config: {
            namespace: '${inputs.namespace}',
            labelSelector: 'app=${inputs.applicationName}',
            expectedPods: '${inputs.replicas}',
            timeout: 300000 // 5 minutes
          }
        },
        {
          name: 'service-connectivity-test',
          type: 'k8s-service-test',
          config: {
            namespace: '${inputs.namespace}',
            serviceName: '${inputs.applicationName}-service',
            port: 80,
            path: '${inputs.healthCheckPath}',
            expectedStatusCode: 200,
            timeout: 30000,
            retryAttempts: 5
          }
        },
        {
          name: 'application-health-check',
          type: 'http-health-check',
          config: {
            serviceUrl: 'http://${inputs.applicationName}-service.${inputs.namespace}.svc.cluster.local${inputs.healthCheckPath}',
            expectedStatusCode: 200,
            timeout: 10000,
            retryAttempts: 3,
            retryDelay: 5000
          }
        },
        {
          name: 'resource-usage-check',
          type: 'kubectl-resource-usage',
          config: {
            namespace: '${inputs.namespace}',
            labelSelector: 'app=${inputs.applicationName}',
            checkCpuUsage: true,
            checkMemoryUsage: true,
            warningThreshold: {
              cpu: '80%',
              memory: '80%'
            }
          }
        }
      ],
      
      outputs: {
        podsReady: '${actions.pod-status-check.allReady}',
        serviceConnectable: '${actions.service-connectivity-test.success}',
        applicationHealthy: '${actions.application-health-check.healthy}',
        resourceUsageNormal: '${actions.resource-usage-check.withinLimits}',
        deploymentHealthy: '${actions.pod-status-check.allReady && actions.service-connectivity-test.success && actions.application-health-check.healthy}'
      }
    },
    
    // Block 6: Rollback on Failure
    {
      id: 'automated-rollback',
      type: 'rollback',
      name: 'Automated Rollback on Failure',
      description: 'Automatically rollback deployment if health checks fail',
      
      dependsOn: ['health-verification'],
      condition: '${blocks.health-verification.outputs.deploymentHealthy === false}',
      
      inputs: {
        namespace: '${parameters.namespace}',
        applicationName: '${parameters.applicationName}'
      },
      
      actions: [
        {
          name: 'get-rollout-history',
          type: 'kubectl-rollout-history',
          config: {
            resource: 'deployment/${inputs.applicationName}',
            namespace: '${inputs.namespace}'
          }
        },
        {
          name: 'rollback-deployment',
          type: 'kubectl-rollout-undo',
          config: {
            resource: 'deployment/${inputs.applicationName}',
            namespace: '${inputs.namespace}',
            toRevision: '${actions.get-rollout-history.previousRevision}'
          }
        },
        {
          name: 'rollback-status-check',
          type: 'kubectl-rollout-status',
          config: {
            resource: 'deployment/${inputs.applicationName}',
            namespace: '${inputs.namespace}',
            timeout: 300000 // 5 minutes
          }
        }
      ],
      
      outputs: {
        rollbackExecuted: '${actions.rollback-deployment.success}',
        rollbackSuccessful: '${actions.rollback-status-check.success}',
        previousRevision: '${actions.get-rollout-history.previousRevision}'
      }
    },
    
    // Block 7: Deployment Notification
    {
      id: 'deployment-notification',
      type: 'notification',
      name: 'Deployment Status Notification',
      description: 'Send deployment status notifications and generate reports',
      
      dependsOn: ['health-verification', 'automated-rollback'],
      
      inputs: {
        applicationName: '${parameters.applicationName}',
        namespace: '${parameters.namespace}',
        deploymentHealthy: '${blocks.health-verification.outputs.deploymentHealthy}',
        rollbackExecuted: '${blocks.automated-rollback.outputs.rollbackExecuted}',
        notificationChannels: '${parameters.notificationChannels}',
        imageUrl: '${parameters.imageUrl}'
      },
      
      actions: [
        {
          name: 'generate-deployment-report',
          type: 'deployment-report',
          config: {
            deployment: {
              applicationName: '${inputs.applicationName}',
              namespace: '${inputs.namespace}',
              imageUrl: '${inputs.imageUrl}',
              deploymentTime: '${now()}',
              status: '${inputs.deploymentHealthy ? "successful" : "failed"}',
              rollbackExecuted: '${inputs.rollbackExecuted}',
              healthChecks: '${blocks.health-verification.outputs}',
              resourceUsage: '${blocks.health-verification.outputs.resourceUsageNormal}'
            },
            format: 'json'
          }
        },
        {
          name: 'send-notification',
          type: 'notification-send',
          config: {
            channels: '${inputs.notificationChannels}',
            message: {
              title: 'Kubernetes Deployment ${inputs.deploymentHealthy ? "Successful" : "Failed"}',
              body: 'Application: ${inputs.applicationName}\nNamespace: ${inputs.namespace}\nImage: ${inputs.imageUrl}\nRollback: ${inputs.rollbackExecuted ? "Yes" : "No"}',
              color: '${inputs.deploymentHealthy ? "green" : "red"}',
              attachments: ['${actions.generate-deployment-report.reportPath}']
            }
          }
        }
      ],
      
      outputs: {
        deploymentReport: '${actions.generate-deployment-report.reportPath}',
        notificationSent: '${actions.send-notification.success}'
      }
    }
  ],
  
  errorHandling: {
    onFailure: 'rollback',
    retryPolicy: {
      maxAttempts: 2,
      backoffStrategy: 'exponential',
      retryableErrors: ['network', 'timeout', 'resource-unavailable']
    },
    notifications: {
      onError: true,
      channels: '${parameters.notificationChannels}'
    },
    rollbackPolicy: {
      enabled: true,
      automatic: true,
      conditions: ['health-check-failure', 'deployment-timeout']
    }
  },
  
  documentation: {
    overview: 'This template provides comprehensive Kubernetes deployment automation with rolling updates, health checks, and automated rollback capabilities.',
    prerequisites: [
      'Kubernetes cluster access with kubectl configured',
      'Appropriate RBAC permissions for deployments, services, and HPA',
      'Docker image available in accessible registry',
      'Application with health check endpoint'
    ],
    examples: [
      {
        name: 'Web Application Deployment',
        parameters: {
          applicationName: 'my-web-app',
          namespace: 'production',
          imageUrl: 'registry.company.com/my-web-app:v1.2.3',
          replicas: 3,
          deploymentStrategy: 'RollingUpdate',
          enableHPA: true,
          healthCheckPath: '/health'
        }
      },
      {
        name: 'Microservice with Service Mesh',
        parameters: {
          applicationName: 'user-service',
          namespace: 'microservices',
          imageUrl: 'gcr.io/my-project/user-service:latest',
          replicas: 5,
          deploymentStrategy: 'BlueGreen',
          enableServiceMesh: true,
          enableHPA: true
        }
      }
    ],
    troubleshooting: [
      {
        issue: 'Deployment stuck in pending state',
        solution: 'Check resource quotas, node capacity, and image pull secrets'
      },
      {
        issue: 'Health checks failing',
        solution: 'Verify health check endpoint is accessible and returns correct status code'
      },
      {
        issue: 'HPA not scaling',
        solution: 'Ensure metrics-server is installed and resource requests are specified'
      }
    ]
  }
};