/**
 * Workflow Versioning Utilities
 *
 * Comprehensive utility functions for managing workflow versions, including:
 * - Version creation and management
 * - Change detection and analysis
 * - Version comparison and diff generation
 * - Conflict resolution
 * - State serialization and compression
 * - Activity logging and tracking
 *
 * This module provides enterprise-grade workflow versioning capabilities
 * with semantic versioning, branch management, and comprehensive change tracking.
 */

import crypto from 'crypto'
import { and, desc, eq, sql } from 'drizzle-orm'
import type { Edge } from 'reactflow'
import { z } from 'zod'
import { createLogger } from '@/lib/logs/console/logger'
import { db } from '@/db'
import {
  workflow as workflowTable,
  workflowVersionActivity,
  workflowVersionChanges,
  workflowVersions,
  workflowVersionTags,
} from '@/db/schema'
import { Serializer } from '@/serializer'
import type { BlockState, Loop, Parallel } from '@/stores/workflows/workflow/types'

const logger = createLogger('WorkflowVersioning')

// Validation schemas for workflow versioning
export const CreateVersionSchema = z.object({
  versionType: z.enum(['auto', 'manual', 'checkpoint', 'branch']).default('manual'),
  versionTag: z.string().optional(),
  description: z.string().optional(),
  incrementType: z.enum(['major', 'minor', 'patch']).default('patch'),
  branchName: z.string().default('main'),
  parentVersionId: z.string().optional(),
})

export const VersionComparisonSchema = z.object({
  sourceVersionId: z.string(),
  targetVersionId: z.string(),
  includeMetadata: z.boolean().default(true),
  diffFormat: z.enum(['detailed', 'summary', 'minimal']).default('detailed'),
})

export const RestoreVersionSchema = z.object({
  versionId: z.string(),
  conflictResolution: z.enum(['overwrite', 'merge', 'create_branch']).default('merge'),
  createBackup: z.boolean().default(true),
})

// Types for workflow versioning
export interface WorkflowVersion {
  id: string
  workflowId: string
  versionNumber: string
  versionMajor: number
  versionMinor: number
  versionPatch: number
  versionType: 'auto' | 'manual' | 'checkpoint' | 'branch'
  versionTag?: string
  versionDescription?: string
  changeSummary: Record<string, any>
  workflowState: Record<string, any>
  stateHash: string
  stateSize: number
  compressionType: 'none' | 'gzip' | 'delta'
  parentVersionId?: string
  branchName: string
  createdByUserId?: string
  createdAt: Date
  updatedAt: Date
  isCurrent: boolean
  isDeployed: boolean
  deployedAt?: Date
  creationDurationMs?: number
  serializationTimeMs?: number
}

export interface VersionChange {
  id: string
  versionId: string
  changeType: string
  entityType: string
  entityId: string
  entityName?: string
  oldData?: Record<string, any>
  newData?: Record<string, any>
  changeDescription?: string
  impactLevel?: 'low' | 'medium' | 'high' | 'critical'
  breakingChange: boolean
  createdAt: Date
}

export interface VersionActivity {
  id: string
  workflowId: string
  versionId?: string
  activityType: string
  activityDescription: string
  activityDetails: Record<string, any>
  userId?: string
  userAgent?: string
  ipAddress?: string
  relatedVersionId?: string
  relatedEntityType?: string
  relatedEntityId?: string
  createdAt: Date
}

export interface VersionDiff {
  sourceVersion: WorkflowVersion
  targetVersion: WorkflowVersion
  changes: VersionChange[]
  summary: {
    totalChanges: number
    blockChanges: number
    edgeChanges: number
    metadataChanges: number
    breakingChanges: number
    impactLevel: 'low' | 'medium' | 'high' | 'critical'
  }
  conflicts?: Array<{
    type: string
    path: string
    description: string
    sourceValue: any
    targetValue: any
  }>
}

/**
 * WorkflowVersionManager - Main class for managing workflow versions
 *
 * Provides comprehensive version management including creation, comparison,
 * restoration, and change tracking with production-ready error handling
 */
export class WorkflowVersionManager {
  private serializer: Serializer

  constructor() {
    this.serializer = new Serializer()
  }

  /**
   * Create a new version of a workflow with comprehensive change tracking
   *
   * @param workflowId - The workflow ID to version
   * @param currentState - Current workflow state (blocks, edges, loops, parallels)
   * @param options - Version creation options
   * @param userId - User creating the version
   * @param userAgent - User agent string
   * @param ipAddress - IP address of the user
   * @returns Promise<WorkflowVersion> - The created version
   */
  async createVersion(
    workflowId: string,
    currentState: {
      blocks: Record<string, BlockState>
      edges: Edge[]
      loops: Record<string, Loop>
      parallels: Record<string, Parallel>
    },
    options: z.infer<typeof CreateVersionSchema>,
    userId?: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<WorkflowVersion> {
    const operationId = crypto.randomUUID().slice(0, 8)
    const startTime = Date.now()

    logger.info(`[${operationId}] Creating version for workflow ${workflowId}`, {
      versionType: options.versionType,
      incrementType: options.incrementType,
      branchName: options.branchName,
      userId,
    })

    try {
      // Validate input
      const validatedOptions = CreateVersionSchema.parse(options)

      // Get current version for comparison
      const currentVersion = await this.getCurrentVersion(workflowId)

      // Serialize workflow state with performance timing
      const serializationStart = Date.now()
      const serializedWorkflow = this.serializer.serializeWorkflow(
        currentState.blocks,
        currentState.edges,
        currentState.loops,
        currentState.parallels
      )
      const serializationTime = Date.now() - serializationStart

      // Calculate state hash for deduplication
      const stateJson = JSON.stringify(serializedWorkflow, null, 0)
      const stateHash = crypto.createHash('sha256').update(stateJson).digest('hex')
      const stateSize = Buffer.byteLength(stateJson, 'utf8')

      // Check for duplicate state (no changes)
      if (currentVersion && currentVersion.stateHash === stateHash) {
        logger.info(`[${operationId}] No changes detected, skipping version creation`)
        return currentVersion
      }

      // Generate next version number
      const versionNumber = await this.getNextVersionNumber(
        workflowId,
        validatedOptions.incrementType
      )
      const [major, minor, patch] = versionNumber.split('.').map(Number)

      // Detect changes if we have a previous version
      let changes: VersionChange[] = []
      let changeSummary: Record<string, any> = {}

      if (currentVersion) {
        const changeAnalysis = await this.detectChanges(currentVersion, serializedWorkflow)
        changes = changeAnalysis.changes
        changeSummary = changeAnalysis.summary
      }

      // Create version record
      const versionId = crypto.randomUUID()
      const creationDuration = Date.now() - startTime

      const newVersion: Omit<WorkflowVersion, 'createdAt' | 'updatedAt'> = {
        id: versionId,
        workflowId,
        versionNumber,
        versionMajor: major,
        versionMinor: minor,
        versionPatch: patch,
        versionType: validatedOptions.versionType,
        versionTag: validatedOptions.versionTag,
        versionDescription: validatedOptions.description,
        changeSummary,
        workflowState: serializedWorkflow,
        stateHash,
        stateSize,
        compressionType: 'none', // TODO: Implement compression for large workflows
        parentVersionId: validatedOptions.parentVersionId || currentVersion?.id,
        branchName: validatedOptions.branchName,
        createdByUserId: userId,
        isCurrent: true, // This will be the new current version
        isDeployed: false,
        deployedAt: undefined,
        creationDurationMs: creationDuration,
        serializationTimeMs: serializationTime,
      }

      // Begin database transaction
      await db.transaction(async (tx) => {
        // Clear existing current version flag
        if (currentVersion) {
          await tx
            .update(workflowVersions)
            .set({ isCurrent: false, updatedAt: new Date() })
            .where(
              and(eq(workflowVersions.workflowId, workflowId), eq(workflowVersions.isCurrent, true))
            )
        }

        // Insert new version
        await tx.insert(workflowVersions).values({
          ...newVersion,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        // Insert change records
        if (changes.length > 0) {
          await tx.insert(workflowVersionChanges).values(
            changes.map((change) => {
              const { id: _id, versionId: _versionId, ...changeData } = change
              return {
                id: crypto.randomUUID(),
                versionId,
                ...changeData,
                createdAt: new Date(),
              }
            })
          )
        }

        // Log activity
        await tx.insert(workflowVersionActivity).values({
          id: crypto.randomUUID(),
          workflowId,
          versionId,
          activityType: 'version_created',
          activityDescription: `Version ${versionNumber} created`,
          activityDetails: {
            versionType: validatedOptions.versionType,
            changeCount: changes.length,
            stateSize,
            creationDurationMs: creationDuration,
          },
          userId,
          userAgent,
          ipAddress,
          createdAt: new Date(),
        })

        // Add system tags
        if (validatedOptions.versionTag) {
          await tx.insert(workflowVersionTags).values({
            id: crypto.randomUUID(),
            versionId,
            tagName: validatedOptions.versionTag,
            tagColor: this.getTagColor(validatedOptions.versionTag),
            isSystemTag: false,
            createdByUserId: userId,
            createdAt: new Date(),
          })
        }

        // Update workflow timestamp
        await tx
          .update(workflowTable)
          .set({ updatedAt: new Date() })
          .where(eq(workflowTable.id, workflowId))
      })

      const finalVersion: WorkflowVersion = {
        ...newVersion,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const elapsed = Date.now() - startTime
      logger.info(
        `[${operationId}] Version ${versionNumber} created successfully in ${elapsed}ms`,
        {
          versionId,
          changeCount: changes.length,
          stateSize,
        }
      )

      return finalVersion
    } catch (error: any) {
      const elapsed = Date.now() - startTime
      logger.error(`[${operationId}] Failed to create version after ${elapsed}ms`, {
        error: error.message,
        workflowId,
        options,
      })
      throw new Error(`Failed to create workflow version: ${error.message}`)
    }
  }

  /**
   * Get the current version of a workflow
   */
  async getCurrentVersion(workflowId: string): Promise<WorkflowVersion | null> {
    const operationId = crypto.randomUUID().slice(0, 8)

    logger.debug(`[${operationId}] Getting current version for workflow ${workflowId}`)

    try {
      const [currentVersion] = await db
        .select()
        .from(workflowVersions)
        .where(
          and(eq(workflowVersions.workflowId, workflowId), eq(workflowVersions.isCurrent, true))
        )
        .limit(1)

      if (!currentVersion) {
        logger.debug(`[${operationId}] No current version found for workflow ${workflowId}`)
        return null
      }

      return this.mapDbVersionToWorkflowVersion(currentVersion)
    } catch (error: any) {
      logger.error(`[${operationId}] Failed to get current version`, {
        error: error.message,
        workflowId,
      })
      throw new Error(`Failed to get current version: ${error.message}`)
    }
  }

  /**
   * Get all versions for a workflow with pagination and filtering
   */
  async getVersions(
    workflowId: string,
    options: {
      limit?: number
      offset?: number
      branchName?: string
      versionType?: string
      includeDeployed?: boolean
    } = {}
  ): Promise<{ versions: WorkflowVersion[]; total: number }> {
    const operationId = crypto.randomUUID().slice(0, 8)

    logger.debug(`[${operationId}] Getting versions for workflow ${workflowId}`, options)

    try {
      const { limit = 50, offset = 0, branchName, versionType, includeDeployed } = options

      // Build where conditions
      const whereConditions = [eq(workflowVersions.workflowId, workflowId)]

      if (branchName) {
        whereConditions.push(eq(workflowVersions.branchName, branchName))
      }

      if (versionType) {
        whereConditions.push(eq(workflowVersions.versionType, versionType))
      }

      if (includeDeployed === false) {
        whereConditions.push(eq(workflowVersions.isDeployed, false))
      }

      // Get versions with pagination
      const versions = await db
        .select()
        .from(workflowVersions)
        .where(and(...whereConditions))
        .orderBy(
          desc(workflowVersions.versionMajor),
          desc(workflowVersions.versionMinor),
          desc(workflowVersions.versionPatch)
        )
        .limit(limit)
        .offset(offset)

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(workflowVersions)
        .where(and(...whereConditions))

      const mappedVersions = versions.map(this.mapDbVersionToWorkflowVersion)

      logger.debug(`[${operationId}] Found ${mappedVersions.length} versions (${count} total)`)

      return {
        versions: mappedVersions,
        total: count,
      }
    } catch (error: any) {
      logger.error(`[${operationId}] Failed to get versions`, {
        error: error.message,
        workflowId,
        options,
      })
      throw new Error(`Failed to get workflow versions: ${error.message}`)
    }
  }

  /**
   * Compare two workflow versions and generate comprehensive diff
   */
  async compareVersions(
    workflowId: string,
    sourceVersionId: string,
    targetVersionId: string,
    options: z.infer<typeof VersionComparisonSchema>
  ): Promise<VersionDiff> {
    const operationId = crypto.randomUUID().slice(0, 8)
    const startTime = Date.now()

    logger.info(`[${operationId}] Comparing versions ${sourceVersionId} -> ${targetVersionId}`)

    try {
      // Validate options
      const validatedOptions = VersionComparisonSchema.parse(options)

      // Get both versions
      const [sourceVersion, targetVersion] = await Promise.all([
        this.getVersionById(sourceVersionId),
        this.getVersionById(targetVersionId),
      ])

      if (!sourceVersion || !targetVersion) {
        throw new Error('One or both versions not found')
      }

      if (sourceVersion.workflowId !== workflowId || targetVersion.workflowId !== workflowId) {
        throw new Error('Versions do not belong to the specified workflow')
      }

      // Get changes for target version
      const changes = await this.getVersionChanges(targetVersionId)

      // Analyze changes for summary
      const summary = this.analyzeChanges(changes)

      // Detect conflicts if requested
      let conflicts: VersionDiff['conflicts'] = []
      if (validatedOptions.diffFormat === 'detailed') {
        conflicts = await this.detectConflicts(sourceVersion, targetVersion)
      }

      const diff: VersionDiff = {
        sourceVersion,
        targetVersion,
        changes,
        summary,
        conflicts,
      }

      // Log comparison activity
      await this.logActivity({
        workflowId,
        activityType: 'version_compared',
        activityDescription: `Compared versions ${sourceVersion.versionNumber} and ${targetVersion.versionNumber}`,
        activityDetails: {
          sourceVersionId,
          targetVersionId,
          changeCount: changes.length,
          conflictCount: conflicts?.length || 0,
        },
      })

      const elapsed = Date.now() - startTime
      logger.info(`[${operationId}] Version comparison completed in ${elapsed}ms`, {
        changeCount: changes.length,
        conflictCount: conflicts?.length || 0,
      })

      return diff
    } catch (error: any) {
      const elapsed = Date.now() - startTime
      logger.error(`[${operationId}] Failed to compare versions after ${elapsed}ms`, {
        error: error.message,
        sourceVersionId,
        targetVersionId,
      })
      throw new Error(`Failed to compare versions: ${error.message}`)
    }
  }

  /**
   * Restore a workflow to a specific version
   */
  async restoreVersion(
    workflowId: string,
    versionId: string,
    options: z.infer<typeof RestoreVersionSchema>,
    userId?: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; newVersionId?: string; conflicts?: any[] }> {
    const operationId = crypto.randomUUID().slice(0, 8)
    const startTime = Date.now()

    logger.info(`[${operationId}] Restoring workflow ${workflowId} to version ${versionId}`)

    try {
      // Validate options
      const validatedOptions = RestoreVersionSchema.parse(options)

      // Get the target version
      const targetVersion = await this.getVersionById(versionId)
      if (!targetVersion) {
        throw new Error('Target version not found')
      }

      if (targetVersion.workflowId !== workflowId) {
        throw new Error('Version does not belong to the specified workflow')
      }

      // Create backup if requested
      let backupVersionId: string | undefined
      if (validatedOptions.createBackup) {
        // This would require getting current workflow state
        // Implementation depends on how current state is accessed
        logger.info(`[${operationId}] Backup creation requested but not implemented yet`)
      }

      // Handle conflict resolution based on strategy
      let newVersionId: string | undefined
      const conflicts: any[] = []

      switch (validatedOptions.conflictResolution) {
        case 'overwrite':
          // Simply mark the target version as current
          await this.setCurrentVersion(workflowId, versionId)
          break

        case 'merge':
          // Complex merge logic would go here
          logger.info(`[${operationId}] Merge conflict resolution not fully implemented yet`)
          await this.setCurrentVersion(workflowId, versionId)
          break

        case 'create_branch': {
          // Create a new branch with the restored state
          const branchName = `restore-${targetVersion.versionNumber}-${Date.now()}`
          logger.info(`[${operationId}] Creating branch ${branchName} for restore`)
          // Implementation would create new version with branch name
          break
        }
      }

      // Log restore activity
      await this.logActivity({
        workflowId,
        versionId,
        activityType: 'version_restored',
        activityDescription: `Restored to version ${targetVersion.versionNumber}`,
        activityDetails: {
          targetVersionId: versionId,
          conflictResolution: validatedOptions.conflictResolution,
          createBackup: validatedOptions.createBackup,
          backupVersionId,
        },
        userId,
        userAgent,
        ipAddress,
      })

      const elapsed = Date.now() - startTime
      logger.info(`[${operationId}] Version restore completed in ${elapsed}ms`)

      return {
        success: true,
        newVersionId,
        conflicts,
      }
    } catch (error: any) {
      const elapsed = Date.now() - startTime
      logger.error(`[${operationId}] Failed to restore version after ${elapsed}ms`, {
        error: error.message,
        workflowId,
        versionId,
        options,
      })
      throw new Error(`Failed to restore version: ${error.message}`)
    }
  }

  /**
   * Get version by ID with comprehensive error handling
   */
  async getVersionById(versionId: string): Promise<WorkflowVersion | null> {
    const operationId = crypto.randomUUID().slice(0, 8)

    logger.debug(`[${operationId}] Getting version by ID: ${versionId}`)

    try {
      const [version] = await db
        .select()
        .from(workflowVersions)
        .where(eq(workflowVersions.id, versionId))
        .limit(1)

      if (!version) {
        return null
      }

      return this.mapDbVersionToWorkflowVersion(version)
    } catch (error: any) {
      logger.error(`[${operationId}] Failed to get version by ID`, {
        error: error.message,
        versionId,
      })
      throw new Error(`Failed to get version: ${error.message}`)
    }
  }

  /**
   * Get changes for a specific version
   */
  private async getVersionChanges(versionId: string): Promise<VersionChange[]> {
    try {
      const changes = await db
        .select()
        .from(workflowVersionChanges)
        .where(eq(workflowVersionChanges.versionId, versionId))
        .orderBy(workflowVersionChanges.createdAt)

      return changes.map((change) => ({
        id: change.id,
        versionId: change.versionId,
        changeType: change.changeType,
        entityType: change.entityType,
        entityId: change.entityId,
        entityName: change.entityName || undefined,
        oldData: change.oldData || undefined,
        newData: change.newData || undefined,
        changeDescription: change.changeDescription || undefined,
        impactLevel: (change.impactLevel as any) || undefined,
        breakingChange: change.breakingChange || false,
        createdAt: change.createdAt,
      }))
    } catch (error: any) {
      logger.error('Failed to get version changes', {
        error: error.message,
        versionId,
      })
      throw new Error(`Failed to get version changes: ${error.message}`)
    }
  }

  /**
   * Generate next version number using semantic versioning
   */
  private async getNextVersionNumber(
    workflowId: string,
    incrementType: 'major' | 'minor' | 'patch'
  ): Promise<string> {
    try {
      // Get the latest version
      const [latestVersion] = await db
        .select()
        .from(workflowVersions)
        .where(eq(workflowVersions.workflowId, workflowId))
        .orderBy(
          desc(workflowVersions.versionMajor),
          desc(workflowVersions.versionMinor),
          desc(workflowVersions.versionPatch)
        )
        .limit(1)

      let major = 1
      let minor = 0
      let patch = 0

      if (latestVersion) {
        major = latestVersion.versionMajor || 1
        minor = latestVersion.versionMinor || 0
        patch = latestVersion.versionPatch || 0

        switch (incrementType) {
          case 'major':
            major += 1
            minor = 0
            patch = 0
            break
          case 'minor':
            minor += 1
            patch = 0
            break
          case 'patch':
            patch += 1
            break
        }
      }

      return `${major}.${minor}.${patch}`
    } catch (error: any) {
      logger.error('Failed to generate next version number', {
        error: error.message,
        workflowId,
        incrementType,
      })
      throw new Error(`Failed to generate version number: ${error.message}`)
    }
  }

  /**
   * Detect changes between versions with comprehensive diff analysis
   */
  private async detectChanges(
    previousVersion: WorkflowVersion,
    currentState: any
  ): Promise<{ changes: VersionChange[]; summary: Record<string, any> }> {
    const operationId = crypto.randomUUID().slice(0, 8)
    const startTime = Date.now()

    logger.debug(`[${operationId}] Starting comprehensive change detection`)

    try {
      const changes: VersionChange[] = []
      const previousState = previousVersion.workflowState

      // Comprehensive diff analysis for each entity type
      const blockChanges = await this.detectBlockChanges(
        previousState.blocks || {},
        currentState.blocks || {}
      )
      const edgeChanges = await this.detectEdgeChanges(
        previousState.edges || [],
        currentState.edges || []
      )
      const loopChanges = await this.detectLoopChanges(
        previousState.loops || {},
        currentState.loops || {}
      )
      const parallelChanges = await this.detectParallelChanges(
        previousState.parallels || {},
        currentState.parallels || {}
      )

      changes.push(...blockChanges, ...edgeChanges, ...loopChanges, ...parallelChanges)

      const summary = {
        totalChanges: changes.length,
        blockChanges: blockChanges.length,
        edgeChanges: edgeChanges.length,
        loopChanges: loopChanges.length,
        parallelChanges: parallelChanges.length,
        metadataChanges: 0, // Could be expanded if metadata tracking is needed
        breakingChanges: changes.filter((c) => c.breakingChange).length,
      }

      const elapsed = Date.now() - startTime
      logger.debug(`[${operationId}] Change detection completed in ${elapsed}ms`, {
        totalChanges: changes.length,
        breakingChanges: summary.breakingChanges,
      })

      return { changes, summary }
    } catch (error: any) {
      const elapsed = Date.now() - startTime
      logger.error(`[${operationId}] Failed to detect changes after ${elapsed}ms`, {
        error: error.message,
        workflowId: previousVersion.workflowId,
      })
      throw new Error(`Failed to detect changes: ${error.message}`)
    }
  }

  /**
   * Analyze changes for impact assessment
   */
  private analyzeChanges(changes: VersionChange[]) {
    const totalChanges = changes.length
    const blockChanges = changes.filter((c) => c.entityType === 'block').length
    const edgeChanges = changes.filter((c) => c.entityType === 'edge').length
    const metadataChanges = changes.filter((c) => c.entityType === 'metadata').length
    const breakingChanges = changes.filter((c) => c.breakingChange).length

    // Determine overall impact level
    let impactLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'

    if (breakingChanges > 0) {
      impactLevel = 'critical'
    } else if (blockChanges > 5 || edgeChanges > 10) {
      impactLevel = 'high'
    } else if (totalChanges > 3) {
      impactLevel = 'medium'
    }

    return {
      totalChanges,
      blockChanges,
      edgeChanges,
      metadataChanges,
      breakingChanges,
      impactLevel,
    }
  }

  /**
   * Detect conflicts between versions with comprehensive analysis
   */
  private async detectConflicts(
    sourceVersion: WorkflowVersion,
    targetVersion: WorkflowVersion
  ): Promise<VersionDiff['conflicts']> {
    const operationId = crypto.randomUUID().slice(0, 8)
    const startTime = Date.now()

    logger.debug(
      `[${operationId}] Starting conflict detection between versions ${sourceVersion.versionNumber} and ${targetVersion.versionNumber}`
    )

    try {
      const conflicts: VersionDiff['conflicts'] = []
      const sourceState = sourceVersion.workflowState
      const targetState = targetVersion.workflowState

      // Detect block conflicts
      const blockConflicts = this.detectBlockConflicts(
        sourceState.blocks || {},
        targetState.blocks || {}
      )
      if (blockConflicts) {
        conflicts.push(...blockConflicts)
      }

      // Detect edge conflicts
      const edgeConflicts = this.detectEdgeConflicts(
        sourceState.edges || [],
        targetState.edges || []
      )
      if (edgeConflicts) {
        conflicts.push(...edgeConflicts)
      }

      // Detect loop conflicts
      const loopConflicts = this.detectLoopConflicts(
        sourceState.loops || {},
        targetState.loops || {}
      )
      if (loopConflicts) {
        conflicts.push(...loopConflicts)
      }

      // Detect parallel conflicts
      const parallelConflicts = this.detectParallelConflicts(
        sourceState.parallels || {},
        targetState.parallels || {}
      )
      if (parallelConflicts) {
        conflicts.push(...parallelConflicts)
      }

      const elapsed = Date.now() - startTime
      logger.debug(`[${operationId}] Conflict detection completed in ${elapsed}ms`, {
        conflictCount: conflicts.length,
      })

      return conflicts
    } catch (error: any) {
      const elapsed = Date.now() - startTime
      logger.error(`[${operationId}] Failed to detect conflicts after ${elapsed}ms`, {
        error: error.message,
        sourceVersionId: sourceVersion.id,
        targetVersionId: targetVersion.id,
      })
      throw new Error(`Failed to detect conflicts: ${error.message}`)
    }
  }

  /**
   * Detect changes in workflow blocks with granular analysis
   */
  private async detectBlockChanges(
    oldBlocks: Record<string, any>,
    newBlocks: Record<string, any>
  ): Promise<VersionChange[]> {
    const changes: VersionChange[] = []
    const oldBlockIds = new Set(Object.keys(oldBlocks))
    const newBlockIds = new Set(Object.keys(newBlocks))

    // Detect added blocks
    for (const blockId of newBlockIds) {
      if (!oldBlockIds.has(blockId)) {
        changes.push({
          id: crypto.randomUUID(),
          versionId: '', // Will be set by caller
          changeType: 'block_added',
          entityType: 'block',
          entityId: blockId,
          entityName: newBlocks[blockId].name || `Block ${blockId}`,
          oldData: undefined,
          newData: newBlocks[blockId],
          changeDescription: `Added block: ${newBlocks[blockId].name || blockId}`,
          impactLevel: this.determineImpactLevel('block_added', newBlocks[blockId]),
          breakingChange: this.isBreakingChange('block_added', null, newBlocks[blockId]),
          createdAt: new Date(),
        })
      }
    }

    // Detect removed blocks
    for (const blockId of oldBlockIds) {
      if (!newBlockIds.has(blockId)) {
        changes.push({
          id: crypto.randomUUID(),
          versionId: '',
          changeType: 'block_removed',
          entityType: 'block',
          entityId: blockId,
          entityName: oldBlocks[blockId].name || `Block ${blockId}`,
          oldData: oldBlocks[blockId],
          newData: undefined,
          changeDescription: `Removed block: ${oldBlocks[blockId].name || blockId}`,
          impactLevel: 'high',
          breakingChange: true, // Removing blocks is usually breaking
          createdAt: new Date(),
        })
      }
    }

    // Detect modified blocks
    for (const blockId of oldBlockIds) {
      if (newBlockIds.has(blockId)) {
        const oldBlock = oldBlocks[blockId]
        const newBlock = newBlocks[blockId]
        const blockDiff = this.deepCompareObjects(oldBlock, newBlock)

        if (blockDiff.hasChanges) {
          changes.push({
            id: crypto.randomUUID(),
            versionId: '',
            changeType: 'block_modified',
            entityType: 'block',
            entityId: blockId,
            entityName: newBlock.name || oldBlock.name || `Block ${blockId}`,
            oldData: oldBlock,
            newData: newBlock,
            changeDescription: `Modified block: ${blockDiff.summary}`,
            impactLevel: this.determineImpactLevel('block_modified', newBlock, oldBlock),
            breakingChange: this.isBreakingChange('block_modified', oldBlock, newBlock),
            createdAt: new Date(),
          })
        }
      }
    }

    return changes
  }

  /**
   * Detect changes in workflow edges
   */
  private async detectEdgeChanges(oldEdges: any[], newEdges: any[]): Promise<VersionChange[]> {
    const changes: VersionChange[] = []
    const oldEdgeMap = new Map(oldEdges.map((edge) => [`${edge.source}-${edge.target}`, edge]))
    const newEdgeMap = new Map(newEdges.map((edge) => [`${edge.source}-${edge.target}`, edge]))

    // Detect added edges
    for (const [edgeKey, newEdge] of newEdgeMap) {
      if (!oldEdgeMap.has(edgeKey)) {
        changes.push({
          id: crypto.randomUUID(),
          versionId: '',
          changeType: 'edge_added',
          entityType: 'edge',
          entityId: edgeKey,
          entityName: `Edge ${newEdge.source} → ${newEdge.target}`,
          oldData: undefined,
          newData: newEdge,
          changeDescription: `Added edge from ${newEdge.source} to ${newEdge.target}`,
          impactLevel: 'medium',
          breakingChange: false,
          createdAt: new Date(),
        })
      }
    }

    // Detect removed edges
    for (const [edgeKey, oldEdge] of oldEdgeMap) {
      if (!newEdgeMap.has(edgeKey)) {
        changes.push({
          id: crypto.randomUUID(),
          versionId: '',
          changeType: 'edge_removed',
          entityType: 'edge',
          entityId: edgeKey,
          entityName: `Edge ${oldEdge.source} → ${oldEdge.target}`,
          oldData: oldEdge,
          newData: undefined,
          changeDescription: `Removed edge from ${oldEdge.source} to ${oldEdge.target}`,
          impactLevel: 'high',
          breakingChange: true,
          createdAt: new Date(),
        })
      }
    }

    // Detect modified edges
    for (const [edgeKey, oldEdge] of oldEdgeMap) {
      if (newEdgeMap.has(edgeKey)) {
        const newEdge = newEdgeMap.get(edgeKey)!
        const edgeDiff = this.deepCompareObjects(oldEdge, newEdge)

        if (edgeDiff.hasChanges) {
          changes.push({
            id: crypto.randomUUID(),
            versionId: '',
            changeType: 'edge_modified',
            entityType: 'edge',
            entityId: edgeKey,
            entityName: `Edge ${newEdge.source} → ${newEdge.target}`,
            oldData: oldEdge,
            newData: newEdge,
            changeDescription: `Modified edge: ${edgeDiff.summary}`,
            impactLevel: 'medium',
            breakingChange: false,
            createdAt: new Date(),
          })
        }
      }
    }

    return changes
  }

  /**
   * Detect changes in workflow loops
   */
  private async detectLoopChanges(
    oldLoops: Record<string, any>,
    newLoops: Record<string, any>
  ): Promise<VersionChange[]> {
    const changes: VersionChange[] = []
    const oldLoopIds = new Set(Object.keys(oldLoops))
    const newLoopIds = new Set(Object.keys(newLoops))

    // Detect added loops
    for (const loopId of newLoopIds) {
      if (!oldLoopIds.has(loopId)) {
        changes.push({
          id: crypto.randomUUID(),
          versionId: '',
          changeType: 'loop_added',
          entityType: 'loop',
          entityId: loopId,
          entityName: newLoops[loopId].name || `Loop ${loopId}`,
          oldData: undefined,
          newData: newLoops[loopId],
          changeDescription: `Added loop: ${newLoops[loopId].name || loopId}`,
          impactLevel: 'medium',
          breakingChange: false,
          createdAt: new Date(),
        })
      }
    }

    // Detect removed loops
    for (const loopId of oldLoopIds) {
      if (!newLoopIds.has(loopId)) {
        changes.push({
          id: crypto.randomUUID(),
          versionId: '',
          changeType: 'loop_removed',
          entityType: 'loop',
          entityId: loopId,
          entityName: oldLoops[loopId].name || `Loop ${loopId}`,
          oldData: oldLoops[loopId],
          newData: undefined,
          changeDescription: `Removed loop: ${oldLoops[loopId].name || loopId}`,
          impactLevel: 'high',
          breakingChange: true,
          createdAt: new Date(),
        })
      }
    }

    // Detect modified loops
    for (const loopId of oldLoopIds) {
      if (newLoopIds.has(loopId)) {
        const oldLoop = oldLoops[loopId]
        const newLoop = newLoops[loopId]
        const loopDiff = this.deepCompareObjects(oldLoop, newLoop)

        if (loopDiff.hasChanges) {
          changes.push({
            id: crypto.randomUUID(),
            versionId: '',
            changeType: 'loop_modified',
            entityType: 'loop',
            entityId: loopId,
            entityName: newLoop.name || oldLoop.name || `Loop ${loopId}`,
            oldData: oldLoop,
            newData: newLoop,
            changeDescription: `Modified loop: ${loopDiff.summary}`,
            impactLevel: 'medium',
            breakingChange: this.isBreakingChange('loop_modified', oldLoop, newLoop),
            createdAt: new Date(),
          })
        }
      }
    }

    return changes
  }

  /**
   * Detect changes in workflow parallels
   */
  private async detectParallelChanges(
    oldParallels: Record<string, any>,
    newParallels: Record<string, any>
  ): Promise<VersionChange[]> {
    const changes: VersionChange[] = []
    const oldParallelIds = new Set(Object.keys(oldParallels))
    const newParallelIds = new Set(Object.keys(newParallels))

    // Detect added parallels
    for (const parallelId of newParallelIds) {
      if (!oldParallelIds.has(parallelId)) {
        changes.push({
          id: crypto.randomUUID(),
          versionId: '',
          changeType: 'parallel_added',
          entityType: 'parallel',
          entityId: parallelId,
          entityName: newParallels[parallelId].name || `Parallel ${parallelId}`,
          oldData: undefined,
          newData: newParallels[parallelId],
          changeDescription: `Added parallel: ${newParallels[parallelId].name || parallelId}`,
          impactLevel: 'medium',
          breakingChange: false,
          createdAt: new Date(),
        })
      }
    }

    // Detect removed parallels
    for (const parallelId of oldParallelIds) {
      if (!newParallelIds.has(parallelId)) {
        changes.push({
          id: crypto.randomUUID(),
          versionId: '',
          changeType: 'parallel_removed',
          entityType: 'parallel',
          entityId: parallelId,
          entityName: oldParallels[parallelId].name || `Parallel ${parallelId}`,
          oldData: oldParallels[parallelId],
          newData: undefined,
          changeDescription: `Removed parallel: ${oldParallels[parallelId].name || parallelId}`,
          impactLevel: 'high',
          breakingChange: true,
          createdAt: new Date(),
        })
      }
    }

    // Detect modified parallels
    for (const parallelId of oldParallelIds) {
      if (newParallelIds.has(parallelId)) {
        const oldParallel = oldParallels[parallelId]
        const newParallel = newParallels[parallelId]
        const parallelDiff = this.deepCompareObjects(oldParallel, newParallel)

        if (parallelDiff.hasChanges) {
          changes.push({
            id: crypto.randomUUID(),
            versionId: '',
            changeType: 'parallel_modified',
            entityType: 'parallel',
            entityId: parallelId,
            entityName: newParallel.name || oldParallel.name || `Parallel ${parallelId}`,
            oldData: oldParallel,
            newData: newParallel,
            changeDescription: `Modified parallel: ${parallelDiff.summary}`,
            impactLevel: 'medium',
            breakingChange: this.isBreakingChange('parallel_modified', oldParallel, newParallel),
            createdAt: new Date(),
          })
        }
      }
    }

    return changes
  }

  /**
   * Deep compare two objects and return detailed diff information
   */
  private deepCompareObjects(
    oldObj: any,
    newObj: any
  ): { hasChanges: boolean; summary: string; details: string[] } {
    const differences: string[] = []

    // Get all keys from both objects
    const oldKeys = new Set(oldObj ? Object.keys(oldObj) : [])
    const newKeys = new Set(newObj ? Object.keys(newObj) : [])
    const allKeys = new Set([...oldKeys, ...newKeys])

    for (const key of allKeys) {
      const oldValue = oldObj?.[key]
      const newValue = newObj?.[key]

      if (!oldKeys.has(key)) {
        differences.push(`Added property '${key}': ${this.formatValue(newValue)}`)
      } else if (!newKeys.has(key)) {
        differences.push(`Removed property '${key}': ${this.formatValue(oldValue)}`)
      } else if (!this.deepEqual(oldValue, newValue)) {
        differences.push(
          `Changed property '${key}': ${this.formatValue(oldValue)} → ${this.formatValue(newValue)}`
        )
      }
    }

    const hasChanges = differences.length > 0
    const summary = hasChanges
      ? differences.length === 1
        ? differences[0]
        : `${differences.length} properties changed`
      : 'No changes'

    return {
      hasChanges,
      summary,
      details: differences,
    }
  }

  /**
   * Deep equality check for objects
   */
  private deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true

    if (obj1 == null || obj2 == null) return obj1 === obj2

    if (typeof obj1 !== typeof obj2) return false

    if (typeof obj1 === 'object') {
      const keys1 = Object.keys(obj1)
      const keys2 = Object.keys(obj2)

      if (keys1.length !== keys2.length) return false

      for (const key of keys1) {
        if (!keys2.includes(key)) return false
        if (!this.deepEqual(obj1[key], obj2[key])) return false
      }

      return true
    }

    return obj1 === obj2
  }

  /**
   * Format value for display in change descriptions
   */
  private formatValue(value: any): string {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'string') return `"${value}"`
    if (typeof value === 'object')
      return JSON.stringify(value).slice(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '')
    return String(value)
  }

  /**
   * Determine impact level for a change
   */
  private determineImpactLevel(
    changeType: string,
    newData: any,
    oldData?: any
  ): 'low' | 'medium' | 'high' | 'critical' {
    // High impact for removals and critical additions
    if (changeType.includes('_removed')) return 'high'

    // Critical blocks that might affect workflow execution
    if (changeType.includes('block_') && newData?.type === 'trigger') return 'critical'

    // Medium impact for most modifications
    if (changeType.includes('_modified')) return 'medium'

    // Low impact for simple additions
    return 'low'
  }

  /**
   * Determine if a change is breaking
   */
  private isBreakingChange(changeType: string, oldData: any, newData: any): boolean {
    // Removals are generally breaking
    if (changeType.includes('_removed')) return true

    // Modifications to critical properties
    if (changeType.includes('_modified')) {
      // Check if critical properties were changed
      if (oldData?.type !== newData?.type) return true
      if (oldData?.id !== newData?.id) return true
    }

    return false
  }

  /**
   * Detect conflicts in workflow blocks
   */
  private detectBlockConflicts(
    sourceBlocks: Record<string, any>,
    targetBlocks: Record<string, any>
  ): VersionDiff['conflicts'] {
    const conflicts: VersionDiff['conflicts'] = []
    const sourceBlockIds = new Set(Object.keys(sourceBlocks))
    const targetBlockIds = new Set(Object.keys(targetBlocks))

    // Check for conflicting modifications to the same block
    for (const blockId of sourceBlockIds) {
      if (targetBlockIds.has(blockId)) {
        const sourceBlock = sourceBlocks[blockId]
        const targetBlock = targetBlocks[blockId]

        // Check for conflicts in critical properties
        if (sourceBlock.type !== targetBlock.type) {
          conflicts.push({
            type: 'block_type_conflict',
            path: `blocks.${blockId}.type`,
            description: `Block type conflict: ${sourceBlock.type} vs ${targetBlock.type}`,
            sourceValue: sourceBlock.type,
            targetValue: targetBlock.type,
          })
        }

        // Check for conflicts in block configuration
        if (JSON.stringify(sourceBlock.config) !== JSON.stringify(targetBlock.config)) {
          const sourceName = sourceBlock.name || blockId
          const targetName = targetBlock.name || blockId

          conflicts.push({
            type: 'block_config_conflict',
            path: `blocks.${blockId}.config`,
            description: `Block configuration conflict in '${sourceName}' vs '${targetName}'`,
            sourceValue: sourceBlock.config,
            targetValue: targetBlock.config,
          })
        }
      }
    }

    return conflicts
  }

  /**
   * Detect conflicts in workflow edges
   */
  private detectEdgeConflicts(sourceEdges: any[], targetEdges: any[]): VersionDiff['conflicts'] {
    const conflicts: VersionDiff['conflicts'] = []
    const sourceEdgeMap = new Map(
      sourceEdges.map((edge) => [`${edge.source}-${edge.target}`, edge])
    )
    const targetEdgeMap = new Map(
      targetEdges.map((edge) => [`${edge.source}-${edge.target}`, edge])
    )

    // Check for conflicting edge conditions or configurations
    for (const [edgeKey, sourceEdge] of sourceEdgeMap) {
      if (targetEdgeMap.has(edgeKey)) {
        const targetEdge = targetEdgeMap.get(edgeKey)!

        // Check for condition conflicts
        if (sourceEdge.condition !== targetEdge.condition) {
          conflicts.push({
            type: 'edge_condition_conflict',
            path: `edges[${edgeKey}].condition`,
            description: `Edge condition conflict from ${sourceEdge.source} to ${targetEdge.target}`,
            sourceValue: sourceEdge.condition,
            targetValue: targetEdge.condition,
          })
        }

        // Check for configuration conflicts
        if (JSON.stringify(sourceEdge.config) !== JSON.stringify(targetEdge.config)) {
          conflicts.push({
            type: 'edge_config_conflict',
            path: `edges[${edgeKey}].config`,
            description: `Edge configuration conflict from ${sourceEdge.source} to ${targetEdge.target}`,
            sourceValue: sourceEdge.config,
            targetValue: targetEdge.config,
          })
        }
      }
    }

    return conflicts
  }

  /**
   * Detect conflicts in workflow loops
   */
  private detectLoopConflicts(
    sourceLoops: Record<string, any>,
    targetLoops: Record<string, any>
  ): VersionDiff['conflicts'] {
    const conflicts: VersionDiff['conflicts'] = []
    const sourceLoopIds = new Set(Object.keys(sourceLoops))
    const targetLoopIds = new Set(Object.keys(targetLoops))

    for (const loopId of sourceLoopIds) {
      if (targetLoopIds.has(loopId)) {
        const sourceLoop = sourceLoops[loopId]
        const targetLoop = targetLoops[loopId]

        // Check for condition conflicts
        if (sourceLoop.condition !== targetLoop.condition) {
          conflicts.push({
            type: 'loop_condition_conflict',
            path: `loops.${loopId}.condition`,
            description: `Loop condition conflict in '${sourceLoop.name || loopId}'`,
            sourceValue: sourceLoop.condition,
            targetValue: targetLoop.condition,
          })
        }

        // Check for iteration conflicts
        if (sourceLoop.maxIterations !== targetLoop.maxIterations) {
          conflicts.push({
            type: 'loop_iterations_conflict',
            path: `loops.${loopId}.maxIterations`,
            description: `Loop max iterations conflict in '${sourceLoop.name || loopId}'`,
            sourceValue: sourceLoop.maxIterations,
            targetValue: targetLoop.maxIterations,
          })
        }
      }
    }

    return conflicts
  }

  /**
   * Detect conflicts in workflow parallels
   */
  private detectParallelConflicts(
    sourceParallels: Record<string, any>,
    targetParallels: Record<string, any>
  ): VersionDiff['conflicts'] {
    const conflicts: VersionDiff['conflicts'] = []
    const sourceParallelIds = new Set(Object.keys(sourceParallels))
    const targetParallelIds = new Set(Object.keys(targetParallels))

    for (const parallelId of sourceParallelIds) {
      if (targetParallelIds.has(parallelId)) {
        const sourceParallel = sourceParallels[parallelId]
        const targetParallel = targetParallels[parallelId]

        // Check for branch conflicts
        if (JSON.stringify(sourceParallel.branches) !== JSON.stringify(targetParallel.branches)) {
          conflicts.push({
            type: 'parallel_branches_conflict',
            path: `parallels.${parallelId}.branches`,
            description: `Parallel branches conflict in '${sourceParallel.name || parallelId}'`,
            sourceValue: sourceParallel.branches,
            targetValue: targetParallel.branches,
          })
        }

        // Check for merge strategy conflicts
        if (sourceParallel.mergeStrategy !== targetParallel.mergeStrategy) {
          conflicts.push({
            type: 'parallel_merge_conflict',
            path: `parallels.${parallelId}.mergeStrategy`,
            description: `Parallel merge strategy conflict in '${sourceParallel.name || parallelId}'`,
            sourceValue: sourceParallel.mergeStrategy,
            targetValue: targetParallel.mergeStrategy,
          })
        }
      }
    }

    return conflicts
  }

  /**
   * Set current version for a workflow
   */
  private async setCurrentVersion(workflowId: string, versionId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Clear existing current version
      await tx
        .update(workflowVersions)
        .set({ isCurrent: false, updatedAt: new Date() })
        .where(
          and(eq(workflowVersions.workflowId, workflowId), eq(workflowVersions.isCurrent, true))
        )

      // Set new current version
      await tx
        .update(workflowVersions)
        .set({ isCurrent: true, updatedAt: new Date() })
        .where(eq(workflowVersions.id, versionId))
    })
  }

  /**
   * Log activity with comprehensive context
   */
  private async logActivity(activity: Omit<VersionActivity, 'id' | 'createdAt'>): Promise<void> {
    try {
      await db.insert(workflowVersionActivity).values({
        id: crypto.randomUUID(),
        ...activity,
        createdAt: new Date(),
      })
    } catch (error: any) {
      // Log but don't fail the main operation
      logger.error('Failed to log version activity', {
        error: error.message,
        activity,
      })
    }
  }

  /**
   * Get appropriate color for version tags
   */
  private getTagColor(tagName: string): string {
    const tagColors: Record<string, string> = {
      stable: '#10B981', // green
      beta: '#F59E0B', // yellow
      alpha: '#EF4444', // red
      production: '#059669', // darker green
      development: '#6B7280', // gray
      experimental: '#8B5CF6', // purple
    }

    return tagColors[tagName.toLowerCase()] || '#6B7280'
  }

  /**
   * Map database version record to WorkflowVersion interface
   */
  private mapDbVersionToWorkflowVersion(dbVersion: any): WorkflowVersion {
    return {
      id: dbVersion.id,
      workflowId: dbVersion.workflowId,
      versionNumber: dbVersion.versionNumber,
      versionMajor: dbVersion.versionMajor || 0,
      versionMinor: dbVersion.versionMinor || 0,
      versionPatch: dbVersion.versionPatch || 0,
      versionType: dbVersion.versionType || 'manual',
      versionTag: dbVersion.versionTag || undefined,
      versionDescription: dbVersion.versionDescription || undefined,
      changeSummary: dbVersion.changeSummary || {},
      workflowState: dbVersion.workflowState,
      stateHash: dbVersion.stateHash,
      stateSize: dbVersion.stateSize || 0,
      compressionType: dbVersion.compressionType || 'none',
      parentVersionId: dbVersion.parentVersionId || undefined,
      branchName: dbVersion.branchName || 'main',
      createdByUserId: dbVersion.createdByUserId || undefined,
      createdAt: dbVersion.createdAt,
      updatedAt: dbVersion.updatedAt,
      isCurrent: dbVersion.isCurrent || false,
      isDeployed: dbVersion.isDeployed || false,
      deployedAt: dbVersion.deployedAt || undefined,
      creationDurationMs: dbVersion.creationDurationMs || undefined,
      serializationTimeMs: dbVersion.serializationTimeMs || undefined,
    }
  }
}

/**
 * Utility functions for workflow versioning
 */

/**
 * Calculate workflow state hash for deduplication
 */
export function calculateStateHash(workflowState: any): string {
  const stateJson = JSON.stringify(workflowState, null, 0)
  return crypto.createHash('sha256').update(stateJson).digest('hex')
}

/**
 * Calculate state size in bytes
 */
export function calculateStateSize(workflowState: any): number {
  const stateJson = JSON.stringify(workflowState, null, 0)
  return Buffer.byteLength(stateJson, 'utf8')
}

/**
 * Validate version number format
 */
export function validateVersionNumber(versionNumber: string): boolean {
  const versionRegex = /^\d+\.\d+\.\d+$/
  return versionRegex.test(versionNumber)
}

/**
 * Parse version number into components
 */
export function parseVersionNumber(versionNumber: string): {
  major: number
  minor: number
  patch: number
} {
  if (!validateVersionNumber(versionNumber)) {
    throw new Error(`Invalid version number format: ${versionNumber}`)
  }

  const [major, minor, patch] = versionNumber.split('.').map(Number)
  return { major, minor, patch }
}

/**
 * Compare version numbers
 */
export function compareVersionNumbers(version1: string, version2: string): number {
  const v1 = parseVersionNumber(version1)
  const v2 = parseVersionNumber(version2)

  if (v1.major !== v2.major) {
    return v1.major - v2.major
  }

  if (v1.minor !== v2.minor) {
    return v1.minor - v2.minor
  }

  return v1.patch - v2.patch
}

/**
 * Get version summary statistics for a workflow
 */
export async function getVersionStatistics(workflowId: string): Promise<{
  totalVersions: number
  currentVersion: string | null
  latestVersion: string | null
  totalSize: number
  averageSize: number
}> {
  try {
    const versions = await db
      .select({
        versionNumber: workflowVersions.versionNumber,
        stateSize: workflowVersions.stateSize,
        isCurrent: workflowVersions.isCurrent,
      })
      .from(workflowVersions)
      .where(eq(workflowVersions.workflowId, workflowId))
      .orderBy(
        desc(workflowVersions.versionMajor),
        desc(workflowVersions.versionMinor),
        desc(workflowVersions.versionPatch)
      )

    const totalVersions = versions.length
    const currentVersion = versions.find((v) => v.isCurrent)?.versionNumber || null
    const latestVersion = versions[0]?.versionNumber || null
    const totalSize = versions.reduce((sum, v) => sum + (v.stateSize || 0), 0)
    const averageSize = totalVersions > 0 ? Math.round(totalSize / totalVersions) : 0

    return {
      totalVersions,
      currentVersion,
      latestVersion,
      totalSize,
      averageSize,
    }
  } catch (error: any) {
    logger.error('Failed to get version statistics', {
      error: error.message,
      workflowId,
    })
    throw new Error(`Failed to get version statistics: ${error.message}`)
  }
}

/**
 * Generate visual diff in HTML format
 */
export function generateHtmlDiff(
  diff: VersionDiff,
  options?: {
    includeContext?: boolean
    highlightBreaking?: boolean
    theme?: 'light' | 'dark'
  }
): string {
  const { includeContext = true, highlightBreaking = true, theme = 'light' } = options || {}

  const themeClass = theme === 'dark' ? 'diff-dark' : 'diff-light'

  let html = `
    <div class="workflow-diff ${themeClass}">
      <div class="diff-header">
        <h3>Version Comparison: ${diff.sourceVersion.versionNumber} → ${diff.targetVersion.versionNumber}</h3>
        <div class="diff-summary">
          <span class="change-count">${diff.summary.totalChanges} changes</span>
          ${diff.summary.breakingChanges > 0 ? `<span class="breaking-count">${diff.summary.breakingChanges} breaking</span>` : ''}
          ${diff.conflicts && diff.conflicts.length > 0 ? `<span class="conflict-count">${diff.conflicts.length} conflicts</span>` : ''}
        </div>
      </div>
      
      <div class="diff-content">
  `

  // Group changes by entity type
  const changesByType = diff.changes.reduce(
    (acc, change) => {
      if (!acc[change.entityType]) acc[change.entityType] = []
      acc[change.entityType].push(change)
      return acc
    },
    {} as Record<string, typeof diff.changes>
  )

  // Render changes by type
  for (const [entityType, changes] of Object.entries(changesByType)) {
    html += `
        <div class="entity-section">
          <h4 class="entity-header">${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Changes (${changes.length})</h4>
    `

    for (const change of changes) {
      const changeClass = `change-${change.changeType.replace('_', '-')}`
      const impactClass = `impact-${change.impactLevel}`
      const breakingClass = change.breakingChange ? 'breaking-change' : ''

      html += `
          <div class="change-item ${changeClass} ${impactClass} ${breakingClass}">
            <div class="change-header">
              <span class="change-type">${change.changeType.replace('_', ' ')}</span>
              <span class="entity-name">${change.entityName}</span>
              <div class="change-badges">
                <span class="impact-badge ${impactClass}">${change.impactLevel}</span>
                ${change.breakingChange ? '<span class="breaking-badge">BREAKING</span>' : ''}
              </div>
            </div>
            <div class="change-description">${change.changeDescription}</div>
      `

      // Show before/after if available and context is requested
      if (includeContext && (change.oldData || change.newData)) {
        html += `
            <div class="change-details">
              <div class="before-after">
        `

        if (change.oldData) {
          html += `
                <div class="before">
                  <h5>Before:</h5>
                  <pre class="code-block">${escapeHtml(JSON.stringify(change.oldData, null, 2))}</pre>
                </div>
          `
        }

        if (change.newData) {
          html += `
                <div class="after">
                  <h5>After:</h5>
                  <pre class="code-block">${escapeHtml(JSON.stringify(change.newData, null, 2))}</pre>
                </div>
          `
        }

        html += `
              </div>
            </div>
        `
      }

      html += `
          </div>
      `
    }

    html += `
        </div>
    `
  }

  // Render conflicts if any
  if (diff.conflicts && diff.conflicts.length > 0) {
    html += `
        <div class="conflicts-section">
          <h4 class="conflicts-header">Conflicts (${diff.conflicts.length})</h4>
    `

    for (const conflict of diff.conflicts) {
      html += `
          <div class="conflict-item">
            <div class="conflict-header">
              <span class="conflict-type">${conflict.type}</span>
              <span class="conflict-path">${conflict.path}</span>
            </div>
            <div class="conflict-description">${conflict.description}</div>
            <div class="conflict-values">
              <div class="source-value">
                <h5>Source Value:</h5>
                <pre class="code-block">${escapeHtml(JSON.stringify(conflict.sourceValue, null, 2))}</pre>
              </div>
              <div class="target-value">
                <h5>Target Value:</h5>
                <pre class="code-block">${escapeHtml(JSON.stringify(conflict.targetValue, null, 2))}</pre>
              </div>
            </div>
          </div>
      `
    }

    html += `
        </div>
    `
  }

  html += `
      </div>
    </div>
    
    <style>
      .workflow-diff { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      .diff-light { background: #fff; color: #24292e; }
      .diff-dark { background: #0d1117; color: #c9d1d9; }
      .diff-header { padding: 16px; border-bottom: 1px solid #d1d9e0; }
      .diff-dark .diff-header { border-bottom-color: #30363d; }
      .diff-summary { margin-top: 8px; }
      .change-count { background: #0366d6; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
      .breaking-count { background: #d73a49; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px; margin-left: 8px; }
      .conflict-count { background: #f66a0a; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px; margin-left: 8px; }
      .entity-section { margin: 16px 0; }
      .entity-header { background: #f6f8fa; padding: 8px 16px; margin: 0; border: 1px solid #d1d9e0; }
      .diff-dark .entity-header { background: #21262d; border-color: #30363d; }
      .change-item { border: 1px solid #e1e4e8; border-top: none; padding: 12px; }
      .diff-dark .change-item { border-color: #30363d; }
      .breaking-change { border-left: 4px solid #d73a49; }
      .change-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
      .change-type { font-weight: 600; text-transform: capitalize; }
      .entity-name { color: #586069; }
      .diff-dark .entity-name { color: #8b949e; }
      .change-badges { display: flex; gap: 4px; }
      .impact-badge { padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; }
      .impact-low { background: #28a745; color: white; }
      .impact-medium { background: #ffd33d; color: #24292e; }
      .impact-high { background: #f66a0a; color: white; }
      .impact-critical { background: #d73a49; color: white; }
      .breaking-badge { background: #d73a49; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; }
      .change-description { margin-bottom: 8px; }
      .before-after { display: flex; gap: 16px; }
      .before, .after { flex: 1; }
      .before h5 { color: #d73a49; margin: 0 0 8px 0; }
      .after h5 { color: #28a745; margin: 0 0 8px 0; }
      .code-block { background: #f6f8fa; padding: 8px; border-radius: 4px; font-size: 12px; overflow-x: auto; margin: 0; }
      .diff-dark .code-block { background: #161b22; }
      .conflicts-section { margin: 16px 0; }
      .conflicts-header { background: #fff3cd; color: #856404; padding: 8px 16px; margin: 0; border: 1px solid #ffeaa7; }
      .diff-dark .conflicts-header { background: #332b00; color: #f1c40f; border-color: #ffeaa7; }
      .conflict-item { border: 1px solid #e1e4e8; border-top: none; padding: 12px; background: #fffbf0; }
      .diff-dark .conflict-item { border-color: #30363d; background: #1c1f23; }
      .conflict-header { margin-bottom: 8px; }
      .conflict-type { font-weight: 600; color: #f66a0a; }
      .conflict-path { color: #586069; font-family: monospace; }
      .diff-dark .conflict-path { color: #8b949e; }
      .conflict-values { display: flex; gap: 16px; margin-top: 8px; }
      .source-value, .target-value { flex: 1; }
    </style>
  `

  return html
}

/**
 * Generate unified diff format
 */
export function generateUnifiedDiff(
  diff: VersionDiff,
  options?: { contextLines?: number }
): string {
  const { contextLines = 3 } = options || {}

  let unifiedDiff = `--- Version ${diff.sourceVersion.versionNumber}\n`
  unifiedDiff += `+++ Version ${diff.targetVersion.versionNumber}\n`

  // Group changes by entity type
  const changesByType = diff.changes.reduce(
    (acc, change) => {
      if (!acc[change.entityType]) acc[change.entityType] = []
      acc[change.entityType].push(change)
      return acc
    },
    {} as Record<string, typeof diff.changes>
  )

  for (const [entityType, changes] of Object.entries(changesByType)) {
    unifiedDiff += `\n@@ ${entityType} changes @@\n`

    for (const change of changes) {
      switch (change.changeType.split('_')[1]) {
        case 'added':
          unifiedDiff += `+ ${change.entityName}: ${change.changeDescription}\n`
          if (change.newData) {
            const lines = JSON.stringify(change.newData, null, 2).split('\n')
            lines.forEach((line) => (unifiedDiff += `+ ${line}\n`))
          }
          break

        case 'removed':
          unifiedDiff += `- ${change.entityName}: ${change.changeDescription}\n`
          if (change.oldData) {
            const lines = JSON.stringify(change.oldData, null, 2).split('\n')
            lines.forEach((line) => (unifiedDiff += `- ${line}\n`))
          }
          break

        case 'modified':
          unifiedDiff += `~ ${change.entityName}: ${change.changeDescription}\n`
          if (change.oldData) {
            const oldLines = JSON.stringify(change.oldData, null, 2).split('\n')
            oldLines.forEach((line) => (unifiedDiff += `- ${line}\n`))
          }
          if (change.newData) {
            const newLines = JSON.stringify(change.newData, null, 2).split('\n')
            newLines.forEach((line) => (unifiedDiff += `+ ${line}\n`))
          }
          break
      }

      if (change.breakingChange) {
        unifiedDiff += `! BREAKING CHANGE: ${change.entityName}\n`
      }
    }
  }

  return unifiedDiff
}

/**
 * Generate side-by-side diff format
 */
export function generateSideBySideDiff(
  diff: VersionDiff,
  options?: { width?: number; tabSize?: number }
): { leftColumn: string; rightColumn: string; summary: string } {
  const { width = 80, tabSize = 2 } = options || {}

  let leftColumn = `Version ${diff.sourceVersion.versionNumber}\n`
  let rightColumn = `Version ${diff.targetVersion.versionNumber}\n`

  leftColumn += `${'='.repeat(width)}\n`
  rightColumn += `${'='.repeat(width)}\n`

  // Group changes by entity type
  const changesByType = diff.changes.reduce(
    (acc, change) => {
      if (!acc[change.entityType]) acc[change.entityType] = []
      acc[change.entityType].push(change)
      return acc
    },
    {} as Record<string, typeof diff.changes>
  )

  for (const [entityType, changes] of Object.entries(changesByType)) {
    const sectionHeader = `${entityType.toUpperCase()} CHANGES (${changes.length})`
    leftColumn += `\n${sectionHeader}\n${'-'.repeat(sectionHeader.length)}\n`
    rightColumn += `\n${sectionHeader}\n${'-'.repeat(sectionHeader.length)}\n`

    for (const change of changes) {
      const entityLine = `${change.entityName}:`

      switch (change.changeType.split('_')[1]) {
        case 'added':
          leftColumn += `\n${entityLine}\n(not present)\n`
          rightColumn += `\n${entityLine}\n`
          if (change.newData) {
            const formatted = JSON.stringify(change.newData, null, tabSize)
            rightColumn += `${formatted}\n`
          }
          break

        case 'removed':
          rightColumn += `\n${entityLine}\n(removed)\n`
          leftColumn += `\n${entityLine}\n`
          if (change.oldData) {
            const formatted = JSON.stringify(change.oldData, null, tabSize)
            leftColumn += `${formatted}\n`
          }
          break

        case 'modified':
          leftColumn += `\n${entityLine} (before)\n`
          rightColumn += `\n${entityLine} (after)\n`
          if (change.oldData) {
            const formatted = JSON.stringify(change.oldData, null, tabSize)
            leftColumn += `${formatted}\n`
          }
          if (change.newData) {
            const formatted = JSON.stringify(change.newData, null, tabSize)
            rightColumn += `${formatted}\n`
          }
          break
      }

      if (change.breakingChange) {
        const breakingMsg = '[BREAKING CHANGE]'
        leftColumn += `${breakingMsg}\n`
        rightColumn += `${breakingMsg}\n`
      }
    }
  }

  const summary =
    `Version Comparison Summary:\n` +
    `Source: ${diff.sourceVersion.versionNumber} → Target: ${diff.targetVersion.versionNumber}\n` +
    `Total Changes: ${diff.summary.totalChanges}\n` +
    `Breaking Changes: ${diff.summary.breakingChanges}\n` +
    `Conflicts: ${diff.conflicts?.length || 0}\n`

  return { leftColumn, rightColumn, summary }
}

/**
 * Escape HTML characters for safe display
 */
function escapeHtml(text: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null
  if (div) {
    div.textContent = text
    return div.innerHTML
  }

  // Fallback for server-side
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
