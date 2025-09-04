# Workflow Versioning API Documentation

The Versioning API provides comprehensive workflow version management with history tracking, rollback capabilities, and change analysis.

## Overview

The Versioning API enables:
- **Automatic Version Creation**: Track changes automatically
- **Manual Snapshots**: Create named versions at critical points
- **Version History**: Browse and compare all workflow versions
- **Safe Rollbacks**: Revert to previous versions with backup creation
- **Change Analysis**: Understand impact of version changes
- **Semantic Versioning**: Follow semantic versioning principles

## Endpoints

### `GET /api/workflows/{id}/versions`
List all versions for a workflow with advanced filtering and pagination.

**Query Parameters:**
- `limit` (number, default: 50, max: 100): Number of versions per page
- `offset` (number, default: 0): Number of versions to skip
- `page` (number): Page number (alternative to offset)
- `branch` (string): Filter by branch name
- `type` (enum): Filter by version type (`auto`, `manual`, `checkpoint`, `branch`)
- `tag` (string): Filter by version tag
- `deployed` (boolean): Filter by deployment status
- `current` (boolean): Show only current version
- `sort` (enum): Sort by `version`, `created`, or `size`
- `order` (enum): Sort order `asc` or `desc`
- `includeState` (boolean): Include full workflow state in response
- `includeChanges` (boolean): Include change summary in response
- `includeTags` (boolean): Include version tags in response

**Response Example:**
```json
{
  "versions": [
    {
      "id": "ver_abc123",
      "version": "2.1.5",
      "name": "Production Release v2.1.5",
      "type": "manual",
      "branch": "main",
      "tags": ["stable", "production"],
      "size": 1024768,
      "blockCount": 15,
      "edgeCount": 22,
      "isDeployed": true,
      "isCurrent": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "createdBy": {
        "id": "user_123",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "changes": {
        "blocksAdded": 2,
        "blocksRemoved": 1,
        "blocksModified": 3,
        "summary": "Added error handling blocks"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 125,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "summary": {
    "totalVersions": 125,
    "deployedVersions": 8,
    "latestVersion": "2.1.5",
    "currentVersion": "2.1.5"
  }
}
```

### `POST /api/workflows/{id}/versions`
Create a new version/snapshot of the workflow.

**Request Body:**
```json
{
  "type": "manual",
  "name": "Pre-deployment snapshot",
  "description": "Snapshot before deploying new features",
  "tags": ["pre-deployment", "stable"],
  "branch": "main",
  "metadata": {
    "buildNumber": "1.2.3",
    "environment": "staging"
  }
}
```

**Response:**
```json
{
  "id": "ver_def456", 
  "version": "2.2.0",
  "name": "Pre-deployment snapshot",
  "type": "manual",
  "size": 1056789,
  "createdAt": "2024-01-16T14:20:00Z",
  "changes": {
    "blocksAdded": 3,
    "blocksRemoved": 0,
    "blocksModified": 5,
    "summary": "Added new validation and error handling"
  }
}
```

### `GET /api/workflows/{id}/versions/{versionId}`
Get detailed information about a specific version.

**Response:**
```json
{
  "version": {
    "id": "ver_abc123",
    "version": "2.1.5", 
    "name": "Production Release v2.1.5",
    "description": "Stable release with bug fixes",
    "type": "manual",
    "branch": "main",
    "tags": ["stable", "production"],
    "size": 1024768,
    "checksum": "sha256:abc123def456...",
    "createdAt": "2024-01-15T10:30:00Z",
    "createdBy": {
      "id": "user_123",
      "name": "John Doe"
    },
    "metadata": {
      "buildNumber": "1.1.5",
      "environment": "production"
    },
    "changes": {
      "summary": "Bug fixes and performance improvements",
      "details": {
        "blocksAdded": 1,
        "blocksRemoved": 2,
        "blocksModified": 4,
        "edgesAdded": 0,
        "edgesRemoved": 3,
        "edgesModified": 1
      }
    },
    "state": {
      // Full workflow state if includeState=true
    }
  }
}
```

### `POST /api/workflows/{id}/versions/{versionId}/revert`
Revert workflow to a specific version with safety checks and backup creation.

**Request Body:**
```json
{
  "createBackup": true,
  "backupName": "Before revert to v2.1.0",
  "backupDescription": "Backup created before reverting due to critical bug",
  "dryRun": false,
  "force": false,
  "reason": "Critical bug found in current version",
  "tags": ["emergency-revert", "hotfix"]
}
```

**Response - Dry Run:**
```json
{
  "dryRun": true,
  "workflowId": "workflow_123",
  "targetVersion": {
    "id": "ver_abc123",
    "version": "2.1.0",
    "name": "Stable Release",
    "createdAt": "2024-01-10T08:00:00Z"
  },
  "changeAnalysis": {
    "blocksChanged": 3,
    "blocksAdded": 0,
    "blocksRemoved": 2,
    "edgesChanged": 1,
    "edgesAdded": 0,
    "edgesRemoved": 3,
    "configChanges": ["Workflow variables changed"],
    "riskLevel": "medium"
  },
  "estimatedTime": 500,
  "recommendations": [
    "Consider creating a backup before proceeding",
    "Some blocks will be removed in this revert"
  ]
}
```

**Response - Actual Revert:**
```json
{
  "success": true,
  "workflowId": "workflow_123",
  "revertedTo": {
    "versionId": "ver_abc123",
    "version": "2.1.0",
    "name": "Stable Release"
  },
  "newVersion": {
    "id": "ver_ghi789",
    "version": "2.2.1"
  },
  "backup": {
    "id": "ver_backup_456",
    "version": "2.2.0"
  },
  "changeAnalysis": {
    "blocksChanged": 3,
    "blocksRemoved": 2,
    "riskLevel": "medium"
  },
  "completedAt": "2024-01-16T15:30:00Z"
}
```

### `GET /api/workflows/{id}/versions/{versionId}/compare`
Compare two workflow versions to see differences.

**Query Parameters:**
- `compareWith` (string, required): Version ID to compare with
- `includeDetails` (boolean): Include detailed block-level changes
- `format` (enum): Response format (`json`, `diff`, `summary`)

**Response:**
```json
{
  "comparison": {
    "baseVersion": {
      "id": "ver_abc123",
      "version": "2.1.0"
    },
    "compareVersion": {
      "id": "ver_def456", 
      "version": "2.2.0"
    },
    "changes": {
      "summary": {
        "blocksAdded": 3,
        "blocksRemoved": 1,
        "blocksModified": 5,
        "edgesAdded": 2,
        "edgesRemoved": 0,
        "edgesModified": 1,
        "configChanges": 2
      },
      "details": {
        "blocks": {
          "added": [
            {
              "id": "block_new_123",
              "type": "validation",
              "name": "Email Validator"
            }
          ],
          "removed": [
            {
              "id": "block_old_456", 
              "type": "logger",
              "name": "Debug Logger"
            }
          ],
          "modified": [
            {
              "id": "block_mod_789",
              "changes": ["Configuration updated", "Position changed"]
            }
          ]
        },
        "edges": {
          "added": [
            {
              "id": "edge_new_123",
              "source": "block_123",
              "target": "block_456"
            }
          ]
        },
        "config": {
          "variables": {
            "added": ["DEBUG_MODE"],
            "removed": ["OLD_SETTING"],
            "modified": ["API_URL"]
          }
        }
      }
    },
    "impact": {
      "riskLevel": "medium",
      "affectedBlocks": 8,
      "breakingChanges": false,
      "recommendations": [
        "Test email validation thoroughly",
        "Remove debug logging references"
      ]
    }
  }
}
```

## Version Types

- **`auto`**: Automatically created by the system on significant changes
- **`manual`**: Manually created by users for important milestones
- **`checkpoint`**: Temporary snapshots for backup purposes
- **`branch`**: Versions associated with specific branches

## Best Practices

### Version Naming
- Use semantic versioning: `major.minor.patch`
- Include descriptive names: "Production Release v2.1.0"
- Tag versions appropriately: `["stable", "production", "hotfix"]`

### Safe Rollbacks
- Always use dry-run first: `"dryRun": true`
- Create backups for important rollbacks: `"createBackup": true`
- Use force only when necessary: `"force": true`
- Document rollback reasons: `"reason": "Critical bug fix"`

### Version Management
- Create versions before major deployments
- Tag stable versions for easy identification
- Regular cleanup of old development versions
- Monitor version sizes to prevent storage bloat

## Error Handling

### Common Errors

**Version Not Found (404):**
```json
{
  "error": {
    "code": "VERSION_NOT_FOUND",
    "message": "Version not found"
  }
}
```

**High Risk Revert (400):**
```json
{
  "error": {
    "code": "HIGH_RISK_REVERT",
    "message": "Revert operation has high risk impact. Use force=true to proceed.",
    "details": {
      "riskLevel": "high",
      "blocksRemoved": 15,
      "recommendedAction": "Review changes carefully"
    }
  }
}
```

**Version Too Old (400):**
```json
{
  "error": {
    "code": "VERSION_TOO_OLD",
    "message": "Target version is older than 30 days. Use force=true to proceed.",
    "details": {
      "versionAge": 45
    }
  }
}
```

## Security & Permissions

- **Read Access**: Required to list and view versions
- **Write Access**: Required to create versions and revert
- **Admin Access**: Required for forced operations and branch management
- All operations are logged for audit trails
- Version data is encrypted at rest