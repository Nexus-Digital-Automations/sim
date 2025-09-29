"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { createLogger } from "@/lib/logs/console/logger";
// Import types
import type {
  ChatContext,
  MessageFileAttachment,
} from "@/stores/copilot/types";
// Import modular stores
import { useCopilotChatStore } from "./chat-store";
import { useCopilotToolStore } from "./tool-store";

const logger = createLogger("CopilotStoreRefactored");

interface CopilotState {
  // UI state
  isOpen: boolean;
  activeTab: "chat" | "tools" | "settings";
  sidebarCollapsed: boolean;

  // Mode management
  mode: "ask" | "agent";
  agentConfiguration: {
    creativity: number;
    verbosity: number;
    analysisDepth: number;
  };

  // Settings
  settings: {
    autoScroll: boolean;
    soundEnabled: boolean;
    theme: "light" | "dark" | "system";
    fontSize: "small" | "medium" | "large";
  };

  // Workflow context
  workflowId?: string;
  workspaceId?: string;
}

interface CopilotActions {
  // UI actions
  setOpen: (open: boolean) => void;
  setActiveTab: (tab: "chat" | "tools" | "settings") => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Mode management
  setMode: (mode: "ask" | "agent") => void;
  updateAgentConfiguration: (
    config: Partial<CopilotState["agentConfiguration"]>,
  ) => void;

  // Settings
  updateSettings: (settings: Partial<CopilotState["settings"]>) => void;

  // Context management
  setWorkflowContext: (workflowId?: string, workspaceId?: string) => void;

  // Composite actions that work across stores
  sendMessageWithTools: (
    message: string,
    fileAttachments?: MessageFileAttachment[],
    contexts?: ChatContext[],
  ) => Promise<void>;

  // Utility actions
  resetAllState: () => void;
  exportState: () => any;
  importState: (state: any) => void;
}

type CopilotStoreRefactored = CopilotState & CopilotActions;

export const useCopilotStore = create<CopilotStoreRefactored>()(
  devtools(
    (set, get) => ({
      // Initial state
      isOpen: false,
      activeTab: "chat",
      sidebarCollapsed: false,
      mode: "agent",
      agentConfiguration: {
        creativity: 0.7,
        verbosity: 0.5,
        analysisDepth: 0.6,
      },
      settings: {
        autoScroll: true,
        soundEnabled: false,
        theme: "system",
        fontSize: "medium",
      },
      workflowId: undefined,
      workspaceId: undefined,

      // UI actions
      setOpen: (open) => {
        logger.info(`Setting copilot open: ${open}`);
        set({ isOpen: open });
      },

      setActiveTab: (tab) => {
        set({ activeTab: tab });
      },

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },

      // Mode management
      setMode: (mode) => {
        logger.info(`Setting copilot mode: ${mode}`);
        set({ mode });
      },

      updateAgentConfiguration: (config) => {
        set((state) => ({
          agentConfiguration: {
            ...state.agentConfiguration,
            ...config,
          },
        }));
      },

      // Settings
      updateSettings: (settings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...settings,
          },
        }));
      },

      // Context management
      setWorkflowContext: (workflowId, workspaceId) => {
        logger.info(
          `Setting workflow context: ${workflowId}, workspace: ${workspaceId}`,
        );
        set({ workflowId, workspaceId });
      },

      // Composite actions that work across stores
      sendMessageWithTools: async (message, fileAttachments, contexts) => {
        const chatStore = useCopilotChatStore.getState();
        const toolStore = useCopilotToolStore.getState();

        try {
          // Send the message through chat store
          await chatStore.sendMessage(message, fileAttachments, contexts);

          // Check if the response contains tool calls and handle them
          const lastMessage = chatStore.lastMessage;
          if (lastMessage?.toolCalls) {
            for (const toolCall of lastMessage.toolCalls) {
              toolStore.addPendingToolCall(toolCall);

              // Execute tool call asynchronously
              toolStore.executeToolCall(toolCall).catch((error) => {
                logger.error(
                  `Failed to execute tool call: ${toolCall.id}`,
                  error,
                );
              });
            }
          }
        } catch (error) {
          logger.error("Failed to send message with tools", error);
          throw error;
        }
      },

      // Utility actions
      resetAllState: () => {
        logger.info("Resetting all copilot state");

        // Reset main store
        set({
          isOpen: false,
          activeTab: "chat",
          sidebarCollapsed: false,
          mode: "agent",
          agentConfiguration: {
            creativity: 0.7,
            verbosity: 0.5,
            analysisDepth: 0.6,
          },
          settings: {
            autoScroll: true,
            soundEnabled: false,
            theme: "system",
            fontSize: "medium",
          },
          workflowId: undefined,
          workspaceId: undefined,
        });

        // Reset modular stores
        const chatStore = useCopilotChatStore.getState();
        const toolStore = useCopilotToolStore.getState();

        chatStore.clearChat();
        toolStore.clearToolCalls();
        toolStore.clearExecutionQueue();
      },

      exportState: () => {
        const mainState = get();
        const chatState = useCopilotChatStore.getState();
        const toolState = useCopilotToolStore.getState();

        return {
          main: mainState,
          chat: {
            currentChat: chatState.currentChat,
            chatHistory: chatState.chatHistory,
            workflowId: chatState.workflowId,
          },
          tools: {
            availableTools: toolState.availableTools,
            toolStates: toolState.toolStates,
          },
          timestamp: Date.now(),
        };
      },

      importState: (state) => {
        if (!state || typeof state !== "object") return;

        try {
          // Import main state
          if (state.main) {
            set(state.main);
          }

          // Import chat state
          if (state.chat) {
            const chatStore = useCopilotChatStore.getState();
            if (state.chat.currentChat) {
              chatStore.setCurrentChat(state.chat.currentChat);
            }
            if (state.chat.chatHistory) {
              chatStore.setChatHistory(state.chat.chatHistory);
            }
          }

          // Import tool state
          if (state.tools) {
            const toolStore = useCopilotToolStore.getState();
            if (state.tools.availableTools) {
              Object.entries(state.tools.availableTools).forEach(
                ([name, metadata]) => {
                  toolStore.registerTool(name, metadata as any);
                },
              );
            }
          }

          logger.info("Successfully imported copilot state");
        } catch (error) {
          logger.error("Failed to import copilot state", error);
        }
      },
    }),
    {
      name: "copilot-store-refactored",
      partialize: (state) => ({
        // Only persist essential state
        isOpen: state.isOpen,
        mode: state.mode,
        agentConfiguration: state.agentConfiguration,
        settings: state.settings,
        workflowId: state.workflowId,
        workspaceId: state.workspaceId,
      }),
    },
  ),
);

// Re-export modular stores for direct access
export { useCopilotChatStore } from "./chat-store";
export { useCopilotToolStore } from "./tool-store";

// Composite hooks for common use cases
export const useCopilotWithChat = () => {
  const mainStore = useCopilotStore();
  const chatStore = useCopilotChatStore();

  return {
    ...mainStore,
    ...chatStore,
  };
};

export const useCopilotWithTools = () => {
  const mainStore = useCopilotStore();
  const toolStore = useCopilotToolStore();

  return {
    ...mainStore,
    ...toolStore,
  };
};

export const useCopilotFull = () => {
  const mainStore = useCopilotStore();
  const chatStore = useCopilotChatStore();
  const toolStore = useCopilotToolStore();

  return {
    ...mainStore,
    ...chatStore,
    ...toolStore,
  };
};
