/**
 * React Query hooks for Agent Management
 *
 * Provides type-safe hooks for agent CRUD operations with caching,
 * optimistic updates, and error handling.
 */

'use client'

import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
// Import agent service functions (these would be implemented)
// For now, using placeholder imports
import {
  createAgent,
  deleteAgent,
  getAgent,
  listAgents,
  updateAgent,
} from '@/services/parlant/agents'
import type {
  Agent,
  AgentCreateRequest,
  AgentListQuery,
  AgentUpdateRequest,
  PaginatedResponse,
} from '@/services/parlant/types'

// Query keys for React Query caching
export const agentQueryKeys = {
  all: ['agents'] as const,
  lists: () => [...agentQueryKeys.all, 'list'] as const,
  list: (workspaceId: string, filters: Partial<AgentListQuery>) =>
    [...agentQueryKeys.lists(), workspaceId, filters] as const,
  details: () => [...agentQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentQueryKeys.details(), id] as const,
}

/**
 * Hook for listing agents with filtering and pagination
 */
export function useAgents(workspaceId: string, filters: Partial<AgentListQuery> = {}) {
  return useQuery({
    queryKey: agentQueryKeys.list(workspaceId, filters),
    queryFn: async (): Promise<PaginatedResponse<Agent>> => {
      // Mock context - in real implementation, this would come from auth
      const context = {
        user_id: 'current-user-id',
        workspace_id: workspaceId,
        key_type: 'workspace' as const,
      }

      const query: AgentListQuery = {
        workspace_id: workspaceId,
        ...filters,
      }

      return await listAgents(query, context)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })
}

/**
 * Hook for getting a single agent
 */
export function useAgent(workspaceId: string, agentId: string) {
  return useQuery({
    queryKey: agentQueryKeys.detail(agentId),
    queryFn: async (): Promise<Agent> => {
      const context = {
        user_id: 'current-user-id',
        workspace_id: workspaceId,
        key_type: 'workspace' as const,
      }

      return await getAgent(agentId, context)
    },
    enabled: !!agentId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Hook for creating a new agent
 */
export function useCreateAgent(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: AgentCreateRequest): Promise<Agent> => {
      const context = {
        user_id: 'current-user-id',
        workspace_id: workspaceId,
        key_type: 'workspace' as const,
      }

      return await createAgent(data, context)
    },
    onSuccess: (newAgent) => {
      // Invalidate agent lists to refresh data
      queryClient.invalidateQueries({
        queryKey: agentQueryKeys.lists(),
      })

      // Add the new agent to the cache
      queryClient.setQueryData(agentQueryKeys.detail(newAgent.id), newAgent)

      toast({
        title: 'Agent created',
        description: `${newAgent.name} has been created successfully.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating agent',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook for updating an agent
 */
export function useUpdateAgent(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      agentId,
      data,
    }: {
      agentId: string
      data: AgentUpdateRequest
    }): Promise<Agent> => {
      const context = {
        user_id: 'current-user-id',
        workspace_id: workspaceId,
        key_type: 'workspace' as const,
      }

      return await updateAgent(agentId, data, context)
    },
    onMutate: async ({ agentId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: agentQueryKeys.detail(agentId),
      })

      // Snapshot the previous value
      const previousAgent = queryClient.getQueryData(agentQueryKeys.detail(agentId))

      // Optimistically update to the new value
      if (previousAgent) {
        queryClient.setQueryData(agentQueryKeys.detail(agentId), { ...previousAgent, ...data })
      }

      return { previousAgent }
    },
    onSuccess: (updatedAgent) => {
      // Update the cache with the server response
      queryClient.setQueryData(agentQueryKeys.detail(updatedAgent.id), updatedAgent)

      // Invalidate lists to refresh any derived data
      queryClient.invalidateQueries({
        queryKey: agentQueryKeys.lists(),
      })

      toast({
        title: 'Agent updated',
        description: `${updatedAgent.name} has been updated successfully.`,
      })
    },
    onError: (error: Error, { agentId }, context) => {
      // Revert to previous value on error
      if (context?.previousAgent) {
        queryClient.setQueryData(agentQueryKeys.detail(agentId), context.previousAgent)
      }

      toast({
        title: 'Error updating agent',
        description: error.message,
        variant: 'destructive',
      })
    },
    onSettled: (_, __, { agentId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: agentQueryKeys.detail(agentId),
      })
    },
  })
}

/**
 * Hook for deleting an agent
 */
export function useDeleteAgent(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (agentId: string): Promise<void> => {
      const context = {
        user_id: 'current-user-id',
        workspace_id: workspaceId,
        key_type: 'workspace' as const,
      }

      await deleteAgent(agentId, context)
    },
    onSuccess: (_, agentId) => {
      // Remove the agent from all caches
      queryClient.removeQueries({
        queryKey: agentQueryKeys.detail(agentId),
      })

      // Invalidate lists to refresh data
      queryClient.invalidateQueries({
        queryKey: agentQueryKeys.lists(),
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting agent',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook for prefetching agent data
 */
export function usePrefetchAgent(workspaceId: string) {
  const queryClient = useQueryClient()

  return useCallback(
    (agentId: string) => {
      queryClient.prefetchQuery({
        queryKey: agentQueryKeys.detail(agentId),
        queryFn: async (): Promise<Agent> => {
          const context = {
            user_id: 'current-user-id',
            workspace_id: workspaceId,
            key_type: 'workspace' as const,
          }

          return await getAgent(agentId, context)
        },
        staleTime: 1000 * 60 * 5,
      })
    },
    [queryClient, workspaceId]
  )
}
