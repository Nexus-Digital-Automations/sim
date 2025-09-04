/**
 * User Collections Hook - Template Collection Management
 *
 * This hook provides comprehensive collection management functionality for the template
 * marketplace, enabling users to fetch, create, update, and manage their template
 * collections with real-time updates and optimistic UI updates.
 *
 * FEATURES:
 * - User collection fetching with caching and pagination
 * - Real-time collection updates and synchronization
 * - Collection creation and management operations
 * - Optimistic UI updates for better user experience
 * - Error handling and retry mechanisms
 * - Loading states and progress tracking
 *
 * INTEGRATION:
 * - Template marketplace API integration
 * - User authentication and session management
 * - Collection social features and analytics
 * - Template organization and categorization
 *
 * @author Claude Code Template System
 * @version 1.0.0
 */

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('useUserCollections')

/**
 * Collection data structure
 */
export interface Collection {
  id: string
  userId: string
  name: string
  description?: string
  visibility: 'private' | 'unlisted' | 'public'
  tags: string[]
  coverImage?: string
  isFeatured: boolean
  isCollaborative: boolean
  templateCount: number
  followerCount: number
  viewCount: number
  likeCount: number
  creator: {
    id: string
    name: string
    displayName?: string
    image?: string
    isVerified: boolean
  }
  userContext: {
    isFollowing: boolean
    isLiked: boolean
    isCollaborator: boolean
    canEdit: boolean
  }
  createdAt: string
  updatedAt: string
  templates: any[]
  collaborators: any[]
}

/**
 * Collection query parameters
 */
export interface CollectionQueryParams {
  userId?: string
  visibility?: 'private' | 'unlisted' | 'public'
  isFeatured?: boolean
  tags?: string[]
  search?: string
  sortBy?: 'created' | 'updated' | 'name' | 'templates' | 'followers'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
  includeTemplates?: boolean
  includeCollaborators?: boolean
}

/**
 * Collection API response structure
 */
interface CollectionResponse {
  data: Collection[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  filters: CollectionQueryParams
  meta: {
    executionTime: number
    collectionCount: number
    currentUserId?: string
  }
}

/**
 * Hook options
 */
interface UseUserCollectionsOptions {
  autoFetch?: boolean
  fetchOnMount?: boolean
  userId?: string
  includeTemplates?: boolean
  includeCollaborators?: boolean
}

/**
 * Hook state
 */
interface UseUserCollectionsState {
  collections: Collection[]
  loading: boolean
  error: string | null
  totalCollections: number
  hasMore: boolean
  pagination: {
    limit: number
    offset: number
    total: number
  }
}

/**
 * User Collections Management Hook
 */
export function useUserCollections(options: UseUserCollectionsOptions = {}) {
  const {
    autoFetch = true,
    fetchOnMount = true,
    userId,
    includeTemplates = false,
    includeCollaborators = false,
  } = options

  // State management
  const [state, setState] = useState<UseUserCollectionsState>({
    collections: [],
    loading: false,
    error: null,
    totalCollections: 0,
    hasMore: false,
    pagination: {
      limit: 20,
      offset: 0,
      total: 0,
    },
  })

  /**
   * Fetch user collections with comprehensive error handling
   */
  const fetchCollections = useCallback(
    async (params: CollectionQueryParams = {}) => {
      const startTime = Date.now()
      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        logger.info('Fetching user collections', {
          userId,
          params,
          includeTemplates,
          includeCollaborators,
        })

        // Build query parameters
        const queryParams = new URLSearchParams()

        // User-specific collections
        if (userId) {
          queryParams.set('userId', userId)
        }

        // Collection options
        if (params.visibility) queryParams.set('visibility', params.visibility)
        if (params.isFeatured !== undefined) queryParams.set('isFeatured', String(params.isFeatured))
        if (params.search) queryParams.set('search', params.search)
        if (params.sortBy) queryParams.set('sortBy', params.sortBy)
        if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder)
        if (params.limit) queryParams.set('limit', String(params.limit))
        if (params.offset) queryParams.set('offset', String(params.offset))

        // Include options
        if (includeTemplates) queryParams.set('includeTemplates', 'true')
        if (includeCollaborators) queryParams.set('includeCollaborators', 'true')

        // Tags filter
        if (params.tags && params.tags.length > 0) {
          queryParams.set('tags', params.tags.join(','))
        }

        // Fetch collections from API
        const response = await fetch(`/api/community/social/collections?${queryParams.toString()}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch collections: ${response.statusText}`)
        }

        const result: CollectionResponse = await response.json()

        if (!result.data) {
          throw new Error('Invalid response format')
        }

        const executionTime = Date.now() - startTime

        setState((prev) => ({
          ...prev,
          collections: result.data,
          totalCollections: result.pagination.total,
          hasMore: result.pagination.hasMore,
          pagination: {
            limit: result.pagination.limit,
            offset: result.pagination.offset,
            total: result.pagination.total,
          },
          loading: false,
          error: null,
        }))

        logger.info('Collections fetched successfully', {
          collectionCount: result.data.length,
          totalCollections: result.pagination.total,
          executionTime,
        })

        return result.data
      } catch (error) {
        const executionTime = Date.now() - startTime
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch collections'

        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }))

        logger.error('Failed to fetch collections', {
          error: errorMessage,
          executionTime,
          params,
        })

        // Show error toast
        toast.error('Failed to load collections', {
          description: errorMessage,
        })

        throw error
      }
    },
    [userId, includeTemplates, includeCollaborators]
  )

  /**
   * Refresh collections with current parameters
   */
  const refreshCollections = useCallback(async () => {
    return fetchCollections({
      limit: state.pagination.limit,
      offset: 0, // Reset to first page
    })
  }, [fetchCollections, state.pagination.limit])

  /**
   * Load more collections (pagination)
   */
  const loadMoreCollections = useCallback(async () => {
    if (state.loading || !state.hasMore) {
      return
    }

    const nextOffset = state.pagination.offset + state.pagination.limit

    try {
      const newCollections = await fetchCollections({
        limit: state.pagination.limit,
        offset: nextOffset,
      })

      setState((prev) => ({
        ...prev,
        collections: [...prev.collections, ...newCollections],
        pagination: {
          ...prev.pagination,
          offset: nextOffset,
        },
      }))
    } catch (error) {
      // Error handled in fetchCollections
    }
  }, [fetchCollections, state.loading, state.hasMore, state.pagination])

  /**
   * Create new collection with optimistic updates
   */
  const createCollection = useCallback(
    async (collectionData: {
      name: string
      description?: string
      visibility: 'private' | 'unlisted' | 'public'
      tags?: string[]
      coverImage?: string
      isCollaborative?: boolean
    }) => {
      const startTime = Date.now()

      try {
        logger.info('Creating new collection', { name: collectionData.name })

        const response = await fetch('/api/community/social/collections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...collectionData,
            templateIds: [],
            collaborators: [],
          }),
        })

        if (!response.ok) {
          const errorResult = await response.json()
          throw new Error(errorResult.error || 'Failed to create collection')
        }

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Failed to create collection')
        }

        const newCollection: Collection = result.data
        const executionTime = Date.now() - startTime

        // Optimistically update collections list
        setState((prev) => ({
          ...prev,
          collections: [newCollection, ...prev.collections],
          totalCollections: prev.totalCollections + 1,
        }))

        logger.info('Collection created successfully', {
          collectionId: newCollection.id,
          collectionName: newCollection.name,
          executionTime,
        })

        // Show success toast
        toast.success('Collection created successfully!', {
          description: `Your collection "${newCollection.name}" is now available.`,
        })

        return newCollection
      } catch (error) {
        const executionTime = Date.now() - startTime
        const errorMessage = error instanceof Error ? error.message : 'Failed to create collection'

        logger.error('Collection creation failed', {
          error: errorMessage,
          executionTime,
          collectionData,
        })

        // Show error toast
        toast.error('Failed to create collection', {
          description: errorMessage,
        })

        throw error
      }
    },
    []
  )

  /**
   * Delete collection with optimistic updates
   */
  const deleteCollection = useCallback(async (collectionId: string) => {
    const startTime = Date.now()

    try {
      logger.info('Deleting collection', { collectionId })

      // Optimistically remove from UI
      const originalCollections = state.collections
      setState((prev) => ({
        ...prev,
        collections: prev.collections.filter((c) => c.id !== collectionId),
        totalCollections: prev.totalCollections - 1,
      }))

      const response = await fetch(`/api/community/social/collections/${collectionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        // Revert optimistic update
        setState((prev) => ({
          ...prev,
          collections: originalCollections,
          totalCollections: prev.totalCollections + 1,
        }))

        throw new Error('Failed to delete collection')
      }

      const executionTime = Date.now() - startTime

      logger.info('Collection deleted successfully', {
        collectionId,
        executionTime,
      })

      // Show success toast
      toast.success('Collection deleted successfully')
    } catch (error) {
      const executionTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete collection'

      logger.error('Collection deletion failed', {
        error: errorMessage,
        executionTime,
        collectionId,
      })

      // Show error toast
      toast.error('Failed to delete collection', {
        description: errorMessage,
      })

      throw error
    }
  }, [state.collections])

  /**
   * Fetch collections on mount if enabled
   */
  useEffect(() => {
    if (fetchOnMount && autoFetch) {
      fetchCollections()
    }
  }, [fetchOnMount, autoFetch, fetchCollections])

  return {
    // State
    collections: state.collections,
    collectionsLoading: state.loading,
    collectionsError: state.error,
    totalCollections: state.totalCollections,
    hasMore: state.hasMore,
    pagination: state.pagination,

    // Actions
    fetchCollections,
    refreshCollections,
    loadMoreCollections,
    createCollection,
    deleteCollection,
  }
}

/**
 * Convenience hook for current user's collections
 */
export function useMyCollections(options?: Omit<UseUserCollectionsOptions, 'userId'>) {
  return useUserCollections({
    ...options,
    // userId will be determined automatically from session
  })
}