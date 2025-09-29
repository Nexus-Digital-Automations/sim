"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { type CopilotChat, sendStreamingMessage } from "@/lib/copilot/api";
import { createLogger } from "@/lib/logs/console/logger";
import type {
  ChatContext,
  CopilotMessage,
  CopilotToolCall,
  MessageFileAttachment,
} from "@/stores/copilot/types";

const logger = createLogger("CopilotChatStore");

interface ChatState {
  // Chat management
  currentChat: CopilotChat | null;
  chatHistory: CopilotMessage[];
  isLoading: boolean;
  isTyping: boolean;
  workflowId?: string;

  // Message management
  lastMessage: CopilotMessage | null;
  messageCount: number;
  unreadCount: number;

  // Input state
  inputValue: string;
  isAborted: boolean;
  isAborting: boolean;
}

interface ChatActions {
  // Chat actions
  setCurrentChat: (chat: CopilotChat | null) => void;
  setChatHistory: (messages: CopilotMessage[]) => void;
  addMessage: (message: CopilotMessage) => void;
  updateMessage: (messageId: string, updates: Partial<CopilotMessage>) => void;
  removeMessage: (messageId: string) => void;
  clearChat: () => void;

  // Loading states
  setLoading: (loading: boolean) => void;
  setTyping: (typing: boolean) => void;
  setAborting: (aborting: boolean) => void;
  setAborted: (aborted: boolean) => void;

  // Input management
  setInputValue: (value: string) => void;
  clearInput: () => void;

  // Message sending
  sendMessage: (
    message: string,
    fileAttachments?: MessageFileAttachment[],
    contexts?: ChatContext[],
  ) => Promise<void>;

  // Utility actions
  markAllAsRead: () => void;
  getMessageById: (messageId: string) => CopilotMessage | undefined;
}

type CopilotChatStore = ChatState & ChatActions;

export const useCopilotChatStore = create<CopilotChatStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentChat: null,
      chatHistory: [],
      isLoading: false,
      isTyping: false,
      workflowId: undefined,
      lastMessage: null,
      messageCount: 0,
      unreadCount: 0,
      inputValue: "",
      isAborted: false,
      isAborting: false,

      // Chat actions
      setCurrentChat: (chat) => {
        logger.info(`Setting current chat: ${chat?.id || "null"}`);
        set({ currentChat: chat });
      },

      setChatHistory: (messages) => {
        set({
          chatHistory: messages,
          messageCount: messages.length,
          lastMessage: messages[messages.length - 1] || null,
        });
      },

      addMessage: (message) => {
        set((state) => {
          const newHistory = [...state.chatHistory, message];
          return {
            chatHistory: newHistory,
            messageCount: newHistory.length,
            lastMessage: message,
            unreadCount:
              message.role === "assistant"
                ? state.unreadCount + 1
                : state.unreadCount,
          };
        });
      },

      updateMessage: (messageId, updates) => {
        set((state) => ({
          chatHistory: state.chatHistory.map((msg) =>
            msg.id === messageId ? { ...msg, ...updates } : msg,
          ),
        }));
      },

      removeMessage: (messageId) => {
        set((state) => {
          const newHistory = state.chatHistory.filter(
            (msg) => msg.id !== messageId,
          );
          return {
            chatHistory: newHistory,
            messageCount: newHistory.length,
            lastMessage: newHistory[newHistory.length - 1] || null,
          };
        });
      },

      clearChat: () => {
        logger.info("Clearing chat history");
        set({
          chatHistory: [],
          messageCount: 0,
          lastMessage: null,
          unreadCount: 0,
          inputValue: "",
        });
      },

      // Loading states
      setLoading: (loading) => set({ isLoading: loading }),
      setTyping: (typing) => set({ isTyping: typing }),
      setAborting: (aborting) => set({ isAborting: aborting }),
      setAborted: (aborted) => set({ isAborted: aborted }),

      // Input management
      setInputValue: (value) => set({ inputValue: value }),
      clearInput: () => set({ inputValue: "" }),

      // Message sending
      sendMessage: async (message, fileAttachments, contexts) => {
        const state = get();
        if (!state.currentChat || state.isLoading) return;

        try {
          set({ isLoading: true, isAborted: false });

          // Add user message immediately
          const userMessage: CopilotMessage = {
            id: `msg_${Date.now()}_user`,
            role: "user",
            content: message,
            timestamp: Date.now(),
            attachments: fileAttachments,
            contexts,
          };

          get().addMessage(userMessage);
          get().clearInput();

          // Send to API
          await sendStreamingMessage({
            chatId: state.currentChat.id,
            message,
            fileAttachments,
            contexts,
            onMessage: (assistantMessage) => {
              get().addMessage({
                id: `msg_${Date.now()}_assistant`,
                role: "assistant",
                content: assistantMessage.content,
                timestamp: Date.now(),
                toolCalls: assistantMessage.toolCalls as CopilotToolCall[],
              });
            },
            onComplete: () => {
              set({ isLoading: false });
            },
            onError: (error) => {
              logger.error("Failed to send message", error);
              set({ isLoading: false });
            },
          });
        } catch (error) {
          logger.error("Error sending message", error);
          set({ isLoading: false });
        }
      },

      // Utility actions
      markAllAsRead: () => set({ unreadCount: 0 }),

      getMessageById: (messageId) => {
        return get().chatHistory.find((msg) => msg.id === messageId);
      },
    }),
    {
      name: "copilot-chat-store",
      partialize: (state) => ({
        // Only persist essential state
        currentChat: state.currentChat,
        chatHistory: state.chatHistory.slice(-50), // Only keep last 50 messages
        workflowId: state.workflowId,
      }),
    },
  ),
);
