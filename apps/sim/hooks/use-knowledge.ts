import { useCallback, useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { createLogger } from '@/lib/logs/console/logger'
import { type ChunkData, type DocumentData, useKnowledgeStore } from '@/stores/knowledge/store'

const logger = createLogger('UseKnowledgeBase')

export function useKnowledgeBase(id: string) {
  const { getKnowledgeBase, getCachedKnowledgeBase, loadingKnowledgeBases } = useKnowledgeStore()

  const [error, setError] = useState<string | null>(null)

  const knowledgeBase = getCachedKnowledgeBase(id)
  const isLoading = loadingKnowledgeBases.has(id)

  useEffect(() => {
    if (!id || knowledgeBase || isLoading) return

    let isMounted = true

    const loadData = async () => {
      try {
        setError(null)
        await getKnowledgeBase(id)
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load knowledge base')
          logger.error(`Failed to load knowledge base ${id}:`, err)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [id, knowledgeBase, isLoading]) // Removed getKnowledgeBase from dependencies

  return {
    knowledgeBase,
    isLoading,
    error,
  }
}

// Constants
const DEFAULT_PAGE_SIZE = 50

export function useKnowledgeBaseDocuments(
  knowledgeBaseId: string,
  options?: {
    search?: string
    limit?: number
    offset?: number
    sortBy?: string
    sortOrder?: string
  }
) {
  const { getDocuments, getCachedDocuments, loadingDocuments, updateDocument, refreshDocuments } =
    useKnowledgeStore()

  const [error, setError] = useState<string | null>(null)

  const documentsCache = getCachedDocuments(knowledgeBaseId)
  const isLoading = loadingDocuments.has(knowledgeBaseId)

  // Load documents with server-side pagination, search, and sorting
  const requestLimit = options?.limit || DEFAULT_PAGE_SIZE
  const requestOffset = options?.offset || 0
  const requestSearch = options?.search
  const requestSortBy = options?.sortBy
  const requestSortOrder = options?.sortOrder

  useEffect(() => {
    if (!knowledgeBaseId || isLoading) return

    let isMounted = true

    const loadDocuments = async () => {
      try {
        setError(null)
        await getDocuments(knowledgeBaseId, {
          search: requestSearch,
          limit: requestLimit,
          offset: requestOffset,
          sortBy: requestSortBy,
          sortOrder: requestSortOrder,
        })
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load documents')
          logger.error(`Failed to load documents for knowledge base ${knowledgeBaseId}:`, err)
        }
      }
    }

    loadDocuments()

    return () => {
      isMounted = false
    }
  }, [
    knowledgeBaseId,
    isLoading,
    getDocuments,
    requestSearch,
    requestLimit,
    requestOffset,
    requestSortBy,
    requestSortOrder,
  ])

  // Use server-side filtered and paginated results directly
  const documents = documentsCache?.documents || []
  const pagination = documentsCache?.pagination || {
    total: 0,
    limit: requestLimit,
    offset: requestOffset,
    hasMore: false,
  }

  const refreshDocumentsData = useCallback(async () => {
    try {
      setError(null)
      await refreshDocuments(knowledgeBaseId, {
        search: requestSearch,
        limit: requestLimit,
        offset: requestOffset,
        sortBy: requestSortBy,
        sortOrder: requestSortOrder,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh documents')
      logger.error(`Failed to refresh documents for knowledge base ${knowledgeBaseId}:`, err)
    }
  }, [
    knowledgeBaseId,
    refreshDocuments,
    requestSearch,
    requestLimit,
    requestOffset,
    requestSortBy,
    requestSortOrder,
  ])

  const updateDocumentLocal = useCallback(
    (documentId: string, updates: Partial<DocumentData>) => {
      updateDocument(knowledgeBaseId, documentId, updates)
      logger.info(`Updated document ${documentId} for knowledge base ${knowledgeBaseId}`)
    },
    [knowledgeBaseId, updateDocument]
  )

  return {
    documents,
    pagination,
    isLoading,
    error,
    refreshDocuments: refreshDocumentsData,
    updateDocument: updateDocumentLocal,
  }
}

export function useKnowledgeBasesList(workspaceId?: string) {
  const {
    getKnowledgeBasesList,
    knowledgeBasesList,
    loadingKnowledgeBasesList,
    knowledgeBasesListLoaded,
    addKnowledgeBase,
    removeKnowledgeBase,
    clearKnowledgeBasesList,
  } = useKnowledgeStore()

  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3

  useEffect(() => {
    // Only load if we haven't loaded before AND we're not currently loading
    if (knowledgeBasesListLoaded || loadingKnowledgeBasesList) return

    let isMounted = true
    let retryTimeoutId: NodeJS.Timeout | null = null

    const loadData = async (attempt = 0) => {
      // Don't proceed if component is unmounted
      if (!isMounted) return

      try {
        setError(null)
        await getKnowledgeBasesList(workspaceId)

        // Reset retry count on success
        if (isMounted) {
          setRetryCount(0)
        }
      } catch (err) {
        if (!isMounted) return

        const errorMessage = err instanceof Error ? err.message : 'Failed to load knowledge bases'

        // Only set error and retry if we haven't exceeded max retries
        if (attempt < maxRetries) {
          console.warn(`Knowledge bases load attempt ${attempt + 1} failed, retrying...`, err)
          setRetryCount(attempt + 1)

          // Exponential backoff: 1s, 2s, 4s
          const delay = 2 ** attempt * 1000
          retryTimeoutId = setTimeout(() => {
            if (isMounted) {
              loadData(attempt + 1)
              logger.warn(`Failed to load knowledge bases list, retrying... ${attempt + 1}`)
            }
          }, delay)
        } else {
          logger.error('All retry attempts failed for knowledge bases list:', err)
          setError(errorMessage)
          setRetryCount(maxRetries)
        }
      }
    }

    // Always start from attempt 0
    loadData(0)

    // Cleanup function
    return () => {
      isMounted = false
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId)
      }
    }
  }, [knowledgeBasesListLoaded, loadingKnowledgeBasesList, getKnowledgeBasesList, workspaceId])

  const refreshList = async () => {
    try {
      setError(null)
      setRetryCount(0)
      clearKnowledgeBasesList()
      await getKnowledgeBasesList(workspaceId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh knowledge bases'
      setError(errorMessage)
      logger.error('Error refreshing knowledge bases list:', err)
    }
  }

  // Force refresh function that bypasses cache and resets everything
  const forceRefresh = async () => {
    setError(null)
    setRetryCount(0)
    clearKnowledgeBasesList()

    // Force reload by clearing cache and loading state
    useKnowledgeStore.setState({
      knowledgeBasesList: [],
      loadingKnowledgeBasesList: false,
      knowledgeBasesListLoaded: false, // Reset store's loaded state
    })

    try {
      await getKnowledgeBasesList(workspaceId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh knowledge bases'
      setError(errorMessage)
      logger.error('Error force refreshing knowledge bases list:', err)
    }
  }

  return {
    knowledgeBases: knowledgeBasesList,
    isLoading: loadingKnowledgeBasesList,
    error,
    refreshList,
    forceRefresh,
    addKnowledgeBase,
    removeKnowledgeBase,
    retryCount,
    maxRetries,
  }
}

/**
 * Hook to manage chunks for a specific document with optional client-side search
 */
export function useDocumentChunks(
  knowledgeBaseId: string,
  documentId: string,
  urlPage = 1,
  urlSearch = '',
  options: { enableClientSearch?: boolean } = {}
) {
  const { getChunks, refreshChunks, updateChunk, getCachedChunks, clearChunks, isChunksLoading } =
    useKnowledgeStore()

  const { enableClientSearch = false } = options

  // State for both modes
  const [chunks, setChunks] = useState<ChunkData[]>([])
  const [allChunks, setAllChunks] = useState<ChunkData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
  })
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Client-side search state
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(urlPage)

  // Handle mounting state
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Sync with URL page changes
  useEffect(() => {
    setCurrentPage(urlPage)
  }, [urlPage])

  const isStoreLoading = isChunksLoading(documentId)
  const combinedIsLoading = isLoading || isStoreLoading

  // Always call hooks unconditionally, use enableClientSearch flag inside hook logic
  const loadAllChunks = useCallback(async () => {
    if (!enableClientSearch || !knowledgeBaseId || !documentId || !isMounted) return

    try {
      setIsLoading(true)
      setError(null)

      const allChunksData: ChunkData[] = []
      let hasMore = true
      let offset = 0
      const limit = 50

      while (hasMore && isMounted) {
        const response = await fetch(
          `/api/knowledge/${knowledgeBaseId}/documents/${documentId}/chunks?limit=${limit}&offset=${offset}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch chunks')
        }

        const result = await response.json()

        if (result.success) {
          allChunksData.push(...result.data)
          hasMore = result.pagination.hasMore
          offset += limit
        } else {
          throw new Error(result.error || 'Failed to fetch chunks')
        }
      }

      if (isMounted) {
        setAllChunks(allChunksData)
        setChunks(allChunksData) // For compatibility
      }
    } catch (err) {
      if (isMounted) {
        setError(err instanceof Error ? err.message : 'Failed to load chunks')
        logger.error(`Failed to load chunks for document ${documentId}:`, err)
      }
    } finally {
      if (isMounted) {
        setIsLoading(false)
      }
    }
  }, [knowledgeBaseId, documentId, isMounted])

  // Load chunks on mount
  useEffect(() => {
    if (enableClientSearch && isMounted) {
      loadAllChunks()
    }
  }, [enableClientSearch, isMounted, loadAllChunks])

  // Client-side filtering with fuzzy search
  const filteredChunks = useMemo(() => {
    if (!enableClientSearch || !isMounted || !searchQuery.trim()) return allChunks

    const fuse = new Fuse(allChunks, {
      keys: ['content'],
      threshold: 0.3, // Lower = more strict matching
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
    })

    const results = fuse.search(searchQuery)
    return results.map((result) => result.item)
  }, [allChunks, searchQuery, isMounted])

  // Client-side pagination
  const CHUNKS_PER_PAGE = 50
  const totalPages = enableClientSearch
    ? Math.max(1, Math.ceil(filteredChunks.length / CHUNKS_PER_PAGE))
    : 1
  const hasNextPage = enableClientSearch ? currentPage < totalPages : false
  const hasPrevPage = enableClientSearch ? currentPage > 1 : false

  const paginatedChunks = useMemo(() => {
    if (!enableClientSearch) return []
    const startIndex = (currentPage - 1) * CHUNKS_PER_PAGE
    const endIndex = startIndex + CHUNKS_PER_PAGE
    return filteredChunks.slice(startIndex, endIndex)
  }, [enableClientSearch, filteredChunks, currentPage])

  // Reset to page 1 when search changes
  useEffect(() => {
    if (enableClientSearch && currentPage > 1) {
      setCurrentPage(1)
    }
  }, [enableClientSearch, searchQuery, currentPage])

  // Reset to valid page if current page exceeds total
  useEffect(() => {
    if (enableClientSearch && currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [enableClientSearch, currentPage, totalPages])

  // Navigation functions
  const goToPage = useCallback(
    (page: number) => {
      if (enableClientSearch && page >= 1 && page <= totalPages) {
        setCurrentPage(page)
      }
    },
    [enableClientSearch, totalPages]
  )

  const nextPage = useCallback(() => {
    if (enableClientSearch && hasNextPage) {
      setCurrentPage((prev) => prev + 1)
    }
  }, [enableClientSearch, hasNextPage])

  const prevPage = useCallback(() => {
    if (enableClientSearch && hasPrevPage) {
      setCurrentPage((prev) => prev - 1)
    }
  }, [enableClientSearch, hasPrevPage])

  // Operations
  const refreshChunksData = useCallback(async () => {
    if (enableClientSearch) {
      await loadAllChunks()
    }
  }, [enableClientSearch, loadAllChunks])

  const updateChunkLocal = useCallback(
    (chunkId: string, updates: Partial<ChunkData>) => {
      if (enableClientSearch) {
        setAllChunks((prev) =>
          prev.map((chunk) => (chunk.id === chunkId ? { ...chunk, ...updates } : chunk))
        )
        setChunks((prev) =>
          prev.map((chunk) => (chunk.id === chunkId ? { ...chunk, ...updates } : chunk))
        )
      }
    },
    [enableClientSearch]
  )

  // Server-side hooks - must be called before any returns
  const serverCurrentPage = urlPage
  const serverSearchQuery = urlSearch

  // Computed pagination properties
  const serverTotalPages = Math.ceil(pagination.total / pagination.limit)
  const serverHasNextPage = serverCurrentPage < serverTotalPages
  const serverHasPrevPage = serverCurrentPage > 1

  // Single effect to handle all data loading and syncing
  useEffect(() => {
    if (!knowledgeBaseId || !documentId) return

    let isMounted = true

    const loadAndSyncData = async () => {
      try {
        // Check cache first
        const cached = getCachedChunks(documentId)
        const expectedOffset = (serverCurrentPage - 1) * 50 // Use hardcoded limit

        if (
          cached &&
          cached.searchQuery === serverSearchQuery &&
          cached.pagination.offset === expectedOffset
        ) {
          if (isMounted) {
            setChunks(cached.chunks)
            setPagination(cached.pagination)
            setIsLoading(false)
            setInitialLoadDone(true)
          }
          return
        }

        // Fetch from API
        if (isMounted) {
          setIsLoading(true)
          setError(null)
        }

        const limit = 50
        const offset = (serverCurrentPage - 1) * limit

        const fetchedChunks = await getChunks(knowledgeBaseId, documentId, {
          limit,
          offset,
          search: serverSearchQuery || undefined,
        })

        if (isMounted) {
          setChunks(fetchedChunks.chunks)
          setPagination(fetchedChunks.pagination)
          setInitialLoadDone(true)

          // Cache the result
          cacheChunks(documentId, {
            chunks: fetchedChunks.chunks,
            pagination: fetchedChunks.pagination,
            searchQuery: serverSearchQuery,
          })
        }
      } catch (error) {
        if (isMounted) {
          setError(error instanceof Error ? error.message : 'Failed to load chunks')
          logger.error('Failed to load chunks:', error)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadAndSyncData()

    return () => {
      isMounted = false
    }
  }, [
    knowledgeBaseId,
    documentId,
    serverCurrentPage,
    serverSearchQuery,
    isStoreLoading,
    initialLoadDone,
  ])

  // Separate effect to sync with store state changes (no API calls)
  useEffect(() => {
    if (!documentId || !initialLoadDone) return

    const cached = getCachedChunks(documentId)
    const expectedOffset = (serverCurrentPage - 1) * 50

    if (
      cached &&
      cached.searchQuery === serverSearchQuery &&
      cached.pagination.offset === expectedOffset
    ) {
      setChunks(cached.chunks)
      setPagination(cached.pagination)
    }

    // Update loading state based on store
    if (!isStoreLoading && isLoading) {
      logger.info(`Chunks loaded for document ${documentId}`)
      setIsLoading(false)
    }
  }, [documentId, isStoreLoading, isLoading, initialLoadDone, serverSearchQuery, serverCurrentPage])

  // Return client search results if enabled
  if (enableClientSearch) {
    return {
      // Data - return paginatedChunks as chunks for display
      chunks: paginatedChunks,
      allChunks,
      filteredChunks,
      paginatedChunks,

      // Search
      searchQuery,
      setSearchQuery,

      // Pagination
      currentPage,
      totalPages,
      hasNextPage,
      hasPrevPage,
      goToPage,
      nextPage,
      prevPage,

      // State
      isLoading: combinedIsLoading,
      error,
      pagination: {
        total: filteredChunks.length,
        limit: CHUNKS_PER_PAGE,
        offset: (currentPage - 1) * CHUNKS_PER_PAGE,
        hasMore: hasNextPage,
      },

      // Operations
      refreshChunks: refreshChunksData,
      updateChunk: updateChunkLocal,
      clearChunks: () => clearChunks(documentId),

      // Legacy compatibility
      searchChunks: async (newSearchQuery: string) => {
        setSearchQuery(newSearchQuery)
        return paginatedChunks
      },
    }
  }

  // Server-side return (when client search is disabled)
  return {
    chunks,
    allChunks: chunks, // In server mode, allChunks is the same as chunks
    filteredChunks: chunks, // In server mode, filteredChunks is the same as chunks
    paginatedChunks: chunks, // In server mode, paginatedChunks is the same as chunks

    // Search (not used in server mode but needed for consistency)
    searchQuery: urlSearch,
    setSearchQuery: () => {}, // No-op in server mode

    isLoading: combinedIsLoading,
    error,
    pagination,
    currentPage: serverCurrentPage,
    totalPages: serverTotalPages,
    hasNextPage: serverHasNextPage,
    hasPrevPage: serverHasPrevPage,
    goToPage: () => {}, // No-op in server mode for now
    nextPage: () => {}, // No-op in server mode for now
    prevPage: () => {}, // No-op in server mode for now
    refreshChunks: async () => {}, // No-op in server mode for now
    searchChunks: async () => chunks, // Return current chunks in server mode
    updateChunk: (chunkId: string, updates: Partial<ChunkData>) => {
      updateChunk(documentId, chunkId, updates)
      setChunks((prevChunks) =>
        prevChunks.map((chunk) => (chunk.id === chunkId ? { ...chunk, ...updates } : chunk))
      )
    },
    clearChunks: () => clearChunks(documentId),
  }
}
