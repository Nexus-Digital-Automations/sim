"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  BaseClientToolMetadata,
  ClientToolCallState,
  ClientToolDisplay,
} from "@/lib/copilot/tools/client/base-tool";
import { registerToolStateSync } from "@/lib/copilot/tools/client/manager";
import { createLogger } from "@/lib/logs/console/logger";
import type { CopilotToolCall } from "@/stores/copilot/types";

const logger = createLogger("CopilotToolStore");

interface ToolState {
  // Tool management
  availableTools: Record<string, BaseClientToolMetadata>;
  activeTools: Record<string, any>; // Active tool instances
  toolStates: Record<string, ClientToolCallState>;
  toolDisplays: Record<string, ClientToolDisplay>;

  // Execution state
  isExecutingTool: boolean;
  executingToolId: string | null;
  toolExecutionQueue: string[];

  // Tool call management
  pendingToolCalls: CopilotToolCall[];
  completedToolCalls: CopilotToolCall[];
  failedToolCalls: CopilotToolCall[];
}

interface ToolActions {
  // Tool registration
  registerTool: (toolName: string, metadata: BaseClientToolMetadata) => void;
  unregisterTool: (toolName: string) => void;
  getToolMetadata: (toolName: string) => BaseClientToolMetadata | undefined;

  // Tool instance management
  createToolInstance: (toolName: string, toolId: string) => any;
  getToolInstance: (toolId: string) => any;
  removeToolInstance: (toolId: string) => void;

  // Tool state management
  updateToolState: (toolId: string, state: ClientToolCallState) => void;
  getToolState: (toolId: string) => ClientToolCallState | undefined;
  updateToolDisplay: (toolId: string, display: ClientToolDisplay) => void;

  // Tool execution
  executeToolCall: (toolCall: CopilotToolCall) => Promise<any>;
  cancelToolExecution: (toolId: string) => void;
  clearExecutionQueue: () => void;

  // Tool call management
  addPendingToolCall: (toolCall: CopilotToolCall) => void;
  moveToCompleted: (toolCallId: string, result?: any) => void;
  moveToFailed: (toolCallId: string, error?: any) => void;
  clearToolCalls: () => void;

  // Utility actions
  getToolCallById: (toolCallId: string) => CopilotToolCall | undefined;
  getToolCallsByStatus: (
    status: "pending" | "completed" | "failed",
  ) => CopilotToolCall[];
}

type CopilotToolStore = ToolState & ToolActions;

// Tool instantiators (moved from main store)
const CLIENT_TOOL_INSTANTIATORS: Record<string, (id: string) => any> = {
  // Dynamically import and instantiate tools to avoid bundle bloat
};

export const useCopilotToolStore = create<CopilotToolStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      availableTools: {},
      activeTools: {},
      toolStates: {},
      toolDisplays: {},
      isExecutingTool: false,
      executingToolId: null,
      toolExecutionQueue: [],
      pendingToolCalls: [],
      completedToolCalls: [],
      failedToolCalls: [],

      // Tool registration
      registerTool: (toolName, metadata) => {
        logger.info(`Registering tool: ${toolName}`);
        set((state) => ({
          availableTools: {
            ...state.availableTools,
            [toolName]: metadata,
          },
        }));
      },

      unregisterTool: (toolName) => {
        logger.info(`Unregistering tool: ${toolName}`);
        set((state) => {
          const { [toolName]: removed, ...remainingTools } =
            state.availableTools;
          return { availableTools: remainingTools };
        });
      },

      getToolMetadata: (toolName) => {
        return get().availableTools[toolName];
      },

      // Tool instance management
      createToolInstance: (toolName, toolId) => {
        logger.info(`Creating tool instance: ${toolName} (${toolId})`);

        const instantiator = CLIENT_TOOL_INSTANTIATORS[toolName];
        if (!instantiator) {
          logger.warn(`No instantiator found for tool: ${toolName}`);
          return null;
        }

        try {
          const instance = instantiator(toolId);
          set((state) => ({
            activeTools: {
              ...state.activeTools,
              [toolId]: instance,
            },
          }));

          // Register tool state sync if available
          if (instance && typeof instance.getState === "function") {
            registerToolStateSync(toolId, instance);
          }

          return instance;
        } catch (error) {
          logger.error(`Failed to create tool instance: ${toolName}`, error);
          return null;
        }
      },

      getToolInstance: (toolId) => {
        return get().activeTools[toolId];
      },

      removeToolInstance: (toolId) => {
        logger.info(`Removing tool instance: ${toolId}`);
        set((state) => {
          const { [toolId]: removed, ...remainingTools } = state.activeTools;
          return { activeTools: remainingTools };
        });
      },

      // Tool state management
      updateToolState: (toolId, state) => {
        set((prevState) => ({
          toolStates: {
            ...prevState.toolStates,
            [toolId]: state,
          },
        }));
      },

      getToolState: (toolId) => {
        return get().toolStates[toolId];
      },

      updateToolDisplay: (toolId, display) => {
        set((state) => ({
          toolDisplays: {
            ...state.toolDisplays,
            [toolId]: display,
          },
        }));
      },

      // Tool execution
      executeToolCall: async (toolCall) => {
        const state = get();

        if (state.isExecutingTool) {
          // Add to queue
          set((prevState) => ({
            toolExecutionQueue: [...prevState.toolExecutionQueue, toolCall.id],
          }));
          return;
        }

        try {
          set({
            isExecutingTool: true,
            executingToolId: toolCall.id,
          });

          logger.info(`Executing tool call: ${toolCall.name} (${toolCall.id})`);

          // Get or create tool instance
          let instance = get().getToolInstance(toolCall.id);
          if (!instance) {
            instance = get().createToolInstance(toolCall.name, toolCall.id);
          }

          if (!instance) {
            throw new Error(
              `Failed to create instance for tool: ${toolCall.name}`,
            );
          }

          // Execute the tool
          const result = await instance.execute(toolCall.parameters);

          // Move to completed
          get().moveToCompleted(toolCall.id, result);

          logger.info(`Tool call completed: ${toolCall.id}`);
          return result;
        } catch (error) {
          logger.error(`Tool call failed: ${toolCall.id}`, error);
          get().moveToFailed(toolCall.id, error);
          throw error;
        } finally {
          set({
            isExecutingTool: false,
            executingToolId: null,
          });

          // Process next item in queue
          const nextToolCallId = get().toolExecutionQueue[0];
          if (nextToolCallId) {
            set((state) => ({
              toolExecutionQueue: state.toolExecutionQueue.slice(1),
            }));

            const nextToolCall = get().getToolCallById(nextToolCallId);
            if (nextToolCall) {
              // Execute next tool call (don't await to avoid blocking)
              get()
                .executeToolCall(nextToolCall)
                .catch((error) => {
                  logger.error(
                    `Queued tool call failed: ${nextToolCallId}`,
                    error,
                  );
                });
            }
          }
        }
      },

      cancelToolExecution: (toolId) => {
        logger.info(`Cancelling tool execution: ${toolId}`);

        // Remove from queue if present
        set((state) => ({
          toolExecutionQueue: state.toolExecutionQueue.filter(
            (id) => id !== toolId,
          ),
        }));

        // Cancel active execution if this is the executing tool
        if (get().executingToolId === toolId) {
          const instance = get().getToolInstance(toolId);
          if (instance && typeof instance.cancel === "function") {
            instance.cancel();
          }
        }
      },

      clearExecutionQueue: () => {
        set({ toolExecutionQueue: [] });
      },

      // Tool call management
      addPendingToolCall: (toolCall) => {
        set((state) => ({
          pendingToolCalls: [...state.pendingToolCalls, toolCall],
        }));
      },

      moveToCompleted: (toolCallId, result) => {
        set((state) => {
          const toolCall = state.pendingToolCalls.find(
            (tc) => tc.id === toolCallId,
          );
          if (!toolCall) return state;

          return {
            pendingToolCalls: state.pendingToolCalls.filter(
              (tc) => tc.id !== toolCallId,
            ),
            completedToolCalls: [
              ...state.completedToolCalls,
              { ...toolCall, result },
            ],
          };
        });
      },

      moveToFailed: (toolCallId, error) => {
        set((state) => {
          const toolCall = state.pendingToolCalls.find(
            (tc) => tc.id === toolCallId,
          );
          if (!toolCall) return state;

          return {
            pendingToolCalls: state.pendingToolCalls.filter(
              (tc) => tc.id !== toolCallId,
            ),
            failedToolCalls: [...state.failedToolCalls, { ...toolCall, error }],
          };
        });
      },

      clearToolCalls: () => {
        set({
          pendingToolCalls: [],
          completedToolCalls: [],
          failedToolCalls: [],
        });
      },

      // Utility actions
      getToolCallById: (toolCallId) => {
        const state = get();
        return [
          ...state.pendingToolCalls,
          ...state.completedToolCalls,
          ...state.failedToolCalls,
        ].find((tc) => tc.id === toolCallId);
      },

      getToolCallsByStatus: (status) => {
        const state = get();
        switch (status) {
          case "pending":
            return state.pendingToolCalls;
          case "completed":
            return state.completedToolCalls;
          case "failed":
            return state.failedToolCalls;
          default:
            return [];
        }
      },
    }),
    {
      name: "copilot-tool-store",
      partialize: (state) => ({
        // Don't persist tool instances or execution state
        availableTools: state.availableTools,
        toolStates: state.toolStates,
      }),
    },
  ),
);
