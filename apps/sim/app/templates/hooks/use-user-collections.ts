/**
 * User Collections Hook
 * Provides user collection management functionality for template organization
 */

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

export interface TemplateCollection {
  id: string
  name: string
  description?: string
  visibility: 'private' | 'unlisted' | 'public'
  collaborativeMode: boolean
  tags: string[]
  coverImage?: string
  templateCount: number
  createdAt: string
  updatedAt: string
  userId: string
  templates?: string[] // Template IDs
}

export interface CreateCollectionData {
  name: string
  description?: string
  visibility: 'private' | 'unlisted' | 'public'
  collaborativeMode?: boolean
  tags?: string[]
  coverImage?: string
}

export interface UpdateCollectionData extends Partial<CreateCollectionData> {
  id: string
}

export interface UseUserCollectionsOptions {
  autoFetch?: boolean
  userId?: string
}

export interface UseUserCollectionsReturn {
  // Collection data
  collections: TemplateCollection[]
  loading: boolean
  error: string | null

  // Pagination
  hasMore: boolean
  totalCount: number

  // Actions
  createCollection: (data: CreateCollectionData) => Promise<TemplateCollection | null>
  updateCollection: (data: UpdateCollectionData) => Promise<TemplateCollection | null>
  deleteCollection: (collectionId: string) => Promise<boolean>
  addTemplateToCollection: (collectionId: string, templateId: string) => Promise<boolean>
  removeTemplateFromCollection: (collectionId: string, templateId: string) => Promise<boolean>

  // Utilities
  getCollectionById: (collectionId: string) => TemplateCollection | undefined
  getCollectionsByVisibility: (
    visibility: 'private' | 'unlisted' | 'public'
  ) => TemplateCollection[]
  searchCollections: (query: string) => TemplateCollection[]
  refresh: () => Promise<void>
  clearError: () => void
}

/**
 * Custom hook for user collection management
 */
export function useUserCollections(
  options: UseUserCollectionsOptions = {}
): UseUserCollectionsReturn {
  const { autoFetch = true, userId } = options

  // State
  const [collections, setCollections] = useState<TemplateCollection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  /**
   * Fetch user collections from API
   */
  const fetchCollections = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true)
        }
        setError(null)

        const params = new URLSearchParams()
        if (userId) {
          params.set('userId', userId)
        }

        const response = await fetch(`/api/community/social/collections?${params.toString()}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch collections: ${response.statusText}`)
        }

        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        setCollections(data.collections || [])
        setHasMore(data.hasMore || false)
        setTotalCount(data.totalCount || 0)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch collections'
        setError(errorMessage)
        console.error('User collections fetch error:', err)
      } finally {
        if (showLoading) {
          setLoading(false)
        }
      }
    },
    [userId]
  )

  /**
   * Create a new collection
   */
  const createCollection = useCallback(
    async (data: CreateCollectionData): Promise<TemplateCollection | null> => {
      try {
        setError(null)

        const response = await fetch('/api/community/social/collections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...data,
            collaborativeMode: data.collaborativeMode || false,
            tags: data.tags || [],
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to create collection: ${response.statusText}`)
        }

        const result = await response.json()

        if (result.error) {
          throw new Error(result.error)
        }

        const newCollection = result.collection

        // Optimistic UI update
        setCollections((prev) => [newCollection, ...prev])
        setTotalCount((prev) => prev + 1)

        toast.success(`Collection "${newCollection.name}" created successfully!`)
        return newCollection
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create collection'
        setError(errorMessage)
        toast.error(`Failed to create collection: ${errorMessage}`)
        console.error('Create collection error:', err)
        return null
      }
    },
    []
  )

  /**
   * Update an existing collection
   */
  const updateCollection = useCallback(
    async (data: UpdateCollectionData): Promise<TemplateCollection | null> => {
      try {
        setError(null)

        const response = await fetch(`/api/community/social/collections/${data.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          throw new Error(`Failed to update collection: ${response.statusText}`)
        }

        const result = await response.json()

        if (result.error) {
          throw new Error(result.error)
        }

        const updatedCollection = result.collection

        // Optimistic UI update
        setCollections((prev) =>
          prev.map((collection) => (collection.id === data.id ? updatedCollection : collection))
        )

        toast.success(`Collection "${updatedCollection.name}" updated successfully!`)
        return updatedCollection
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update collection'
        setError(errorMessage)
        toast.error(`Failed to update collection: ${errorMessage}`)
        console.error('Update collection error:', err)
        return null
      }
    },
    []
  )

  /**
   * Delete a collection
   */
  const deleteCollection = useCallback(async (collectionId: string): Promise<boolean> => {
    try {
      setError(null)

      const response = await fetch(`/api/community/social/collections/${collectionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`Failed to delete collection: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      // Optimistic UI update
      setCollections((prev) => prev.filter((collection) => collection.id !== collectionId))
      setTotalCount((prev) => prev - 1)

      toast.success('Collection deleted successfully!')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete collection'
      setError(errorMessage)
      toast.error(`Failed to delete collection: ${errorMessage}`)
      console.error('Delete collection error:', err)
      return false
    }
  }, [])

  /**
   * Add template to collection
   */
  const addTemplateToCollection = useCallback(
    async (collectionId: string, templateId: string): Promise<boolean> => {
      try {
        setError(null)

        const response = await fetch(
          `/api/community/social/collections/${collectionId}/templates`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ templateId }),
          }
        )

        if (!response.ok) {
          throw new Error(`Failed to add template to collection: ${response.statusText}`)
        }

        const result = await response.json()

        if (result.error) {
          throw new Error(result.error)
        }

        // Optimistic UI update
        setCollections((prev) =>
          prev.map((collection) =>
            collection.id === collectionId
              ? {
                  ...collection,
                  templateCount: collection.templateCount + 1,
                  templates: [...(collection.templates || []), templateId],
                }
              : collection
          )
        )

        toast.success('Template added to collection!')
        return true
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to add template to collection'
        setError(errorMessage)
        toast.error(errorMessage)
        console.error('Add template to collection error:', err)
        return false
      }
    },
    []
  )

  /**
   * Remove template from collection
   */
  const removeTemplateFromCollection = useCallback(
    async (collectionId: string, templateId: string): Promise<boolean> => {
      try {
        setError(null)

        const response = await fetch(
          `/api/community/social/collections/${collectionId}/templates/${templateId}`,
          {
            method: 'DELETE',
          }
        )

        if (!response.ok) {
          throw new Error(`Failed to remove template from collection: ${response.statusText}`)
        }

        const result = await response.json()

        if (result.error) {
          throw new Error(result.error)
        }

        // Optimistic UI update
        setCollections((prev) =>
          prev.map((collection) =>
            collection.id === collectionId
              ? {
                  ...collection,
                  templateCount: Math.max(0, collection.templateCount - 1),
                  templates: (collection.templates || []).filter((id) => id !== templateId),
                }
              : collection
          )
        )

        toast.success('Template removed from collection!')
        return true
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to remove template from collection'
        setError(errorMessage)
        toast.error(errorMessage)
        console.error('Remove template from collection error:', err)
        return false
      }
    },
    []
  )

  /**
   * Get collection by ID
   */
  const getCollectionById = useCallback(
    (collectionId: string): TemplateCollection | undefined => {
      return collections.find((collection) => collection.id === collectionId)
    },
    [collections]
  )

  /**
   * Get collections by visibility
   */
  const getCollectionsByVisibility = useCallback(
    (visibility: 'private' | 'unlisted' | 'public'): TemplateCollection[] => {
      return collections.filter((collection) => collection.visibility === visibility)
    },
    [collections]
  )

  /**
   * Search collections by name or description
   */
  const searchCollections = useCallback(
    (query: string): TemplateCollection[] => {
      if (!query.trim()) return collections

      const searchTerm = query.toLowerCase()
      return collections.filter(
        (collection) =>
          collection.name.toLowerCase().includes(searchTerm) ||
          collection.description?.toLowerCase().includes(searchTerm) ||
          collection.tags.some((tag) => tag.toLowerCase().includes(searchTerm))
      )
    },
    [collections]
  )

  /**
   * Refresh collections
   */
  const refresh = useCallback(async () => {
    await fetchCollections(true)
  }, [fetchCollections])

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Auto-fetch collections on mount
   */
  useEffect(() => {
    if (autoFetch) {
      fetchCollections(true)
    }
  }, [autoFetch, fetchCollections])

  return {
    // Collection data
    collections,
    loading,
    error,

    // Pagination
    hasMore,
    totalCount,

    // Actions
    createCollection,
    updateCollection,
    deleteCollection,
    addTemplateToCollection,
    removeTemplateFromCollection,

    // Utilities
    getCollectionById,
    getCollectionsByVisibility,
    searchCollections,
    refresh,
    clearError,
  }
}
