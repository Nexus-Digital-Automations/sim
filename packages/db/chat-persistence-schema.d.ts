/**
 * Chat Persistence Schema Extension
 *
 * This schema extends the existing Parlant schema with chat-specific optimizations
 * for message persistence, conversation threading, and session restoration.
 *
 * Key design principles:
 * - Builds on existing Parlant infrastructure
 * - Optimized indexes for chat history queries
 * - Workspace isolation for multi-tenancy
 * - Browser session persistence support
 * - Efficient pagination and filtering
 */
export declare const messageStatusEnum: import("drizzle-orm/pg-core").PgEnum<
  ["pending", "sent", "delivered", "read", "failed"]
>;
export declare const conversationTypeEnum: import("drizzle-orm/pg-core").PgEnum<
  ["direct", "group", "workflow", "support", "onboarding"]
>;
export declare const messageTypeEnum: import("drizzle-orm/pg-core").PgEnum<
  ["text", "tool_call", "tool_result", "system", "error", "media", "file"]
>;
/**
 * Chat Messages - Enhanced message storage with metadata and status tracking
 * Extends parlantEvent with chat-specific optimizations
 */
export declare const chatMessage: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "chat_message";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "chat_message";
        dataType: "string";
        columnType: "PgUUID";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: true;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    sessionId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "session_id";
        tableName: "chat_message";
        dataType: "string";
        columnType: "PgUUID";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    workspaceId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workspace_id";
        tableName: "chat_message";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    eventId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "event_id";
        tableName: "chat_message";
        dataType: "string";
        columnType: "PgUUID";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    sequenceNumber: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "sequence_number";
        tableName: "chat_message";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    messageType: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "message_type";
        tableName: "chat_message";
        dataType: "string";
        columnType: "PgEnumColumn";
        data:
          | "error"
          | "file"
          | "system"
          | "media"
          | "text"
          | "tool_call"
          | "tool_result";
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [
          "text",
          "tool_call",
          "tool_result",
          "system",
          "error",
          "media",
          "file",
        ];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    content: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "content";
        tableName: "chat_message";
        dataType: "json";
        columnType: "PgJsonb";
        data: unknown;
        driverParam: unknown;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    rawContent: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "raw_content";
        tableName: "chat_message";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    senderId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "sender_id";
        tableName: "chat_message";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    senderType: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "sender_type";
        tableName: "chat_message";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    senderName: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "sender_name";
        tableName: "chat_message";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    status: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "status";
        tableName: "chat_message";
        dataType: "string";
        columnType: "PgEnumColumn";
        data: "pending" | "failed" | "read" | "sent" | "delivered";
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: ["pending", "sent", "delivered", "read", "failed"];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    deliveredAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "delivered_at";
        tableName: "chat_message";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    readAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "read_at";
        tableName: "chat_message";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    threadId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "thread_id";
        tableName: "chat_message";
        dataType: "string";
        columnType: "PgUUID";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    parentMessageId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "parent_message_id";
        tableName: "chat_message";
        dataType: "string";
        columnType: "PgUUID";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    mentionedUserIds: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "mentioned_user_ids";
        tableName: "chat_message";
        dataType: "array";
        columnType: "PgArray";
        data: string[];
        driverParam: string | string[];
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: import("drizzle-orm").Column<
          {
            name: "mentioned_user_ids";
            tableName: "chat_message";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        identity: undefined;
        generated: undefined;
      },
      {},
      {
        size: undefined;
        baseBuilder: import("drizzle-orm/pg-core").PgColumnBuilder<
          {
            name: "mentioned_user_ids";
            dataType: "string";
            columnType: "PgText";
            data: string;
            enumValues: [string, ...string[]];
            driverParam: string;
          },
          {},
          {},
          import("drizzle-orm").ColumnBuilderExtraConfig
        >;
      }
    >;
    attachments: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "attachments";
        tableName: "chat_message";
        dataType: "json";
        columnType: "PgJsonb";
        data: unknown;
        driverParam: unknown;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    reactions: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "reactions";
        tableName: "chat_message";
        dataType: "json";
        columnType: "PgJsonb";
        data: unknown;
        driverParam: unknown;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    editHistory: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "edit_history";
        tableName: "chat_message";
        dataType: "json";
        columnType: "PgJsonb";
        data: unknown;
        driverParam: unknown;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    toolCallId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tool_call_id";
        tableName: "chat_message";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    toolResults: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tool_results";
        tableName: "chat_message";
        dataType: "json";
        columnType: "PgJsonb";
        data: unknown;
        driverParam: unknown;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    tags: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tags";
        tableName: "chat_message";
        dataType: "array";
        columnType: "PgArray";
        data: string[];
        driverParam: string | string[];
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: import("drizzle-orm").Column<
          {
            name: "tags";
            tableName: "chat_message";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        identity: undefined;
        generated: undefined;
      },
      {},
      {
        size: undefined;
        baseBuilder: import("drizzle-orm/pg-core").PgColumnBuilder<
          {
            name: "tags";
            dataType: "string";
            columnType: "PgText";
            data: string;
            enumValues: [string, ...string[]];
            driverParam: string;
          },
          {},
          {},
          import("drizzle-orm").ColumnBuilderExtraConfig
        >;
      }
    >;
    category: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "category";
        tableName: "chat_message";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    priority: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "priority";
        tableName: "chat_message";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    tokenCount: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "token_count";
        tableName: "chat_message";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    cost: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "cost";
        tableName: "chat_message";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    processingTime: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "processing_time";
        tableName: "chat_message";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    metadata: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "metadata";
        tableName: "chat_message";
        dataType: "json";
        columnType: "PgJsonb";
        data: unknown;
        driverParam: unknown;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    customData: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "custom_data";
        tableName: "chat_message";
        dataType: "json";
        columnType: "PgJsonb";
        data: unknown;
        driverParam: unknown;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    ipAddress: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "ip_address";
        tableName: "chat_message";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    userAgent: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "user_agent";
        tableName: "chat_message";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "chat_message";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    updatedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "updated_at";
        tableName: "chat_message";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    deletedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "deleted_at";
        tableName: "chat_message";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
  };
  dialect: "pg";
}>;
/**
 * Chat Conversations - Logical grouping of related chat sessions
 * Enables conversation threading and persistent chat history
 */
export declare const chatConversation: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "chat_conversation";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "chat_conversation";
        dataType: "string";
        columnType: "PgUUID";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: true;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    workspaceId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workspace_id";
        tableName: "chat_conversation";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    title: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "title";
        tableName: "chat_conversation";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    description: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "description";
        tableName: "chat_conversation";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    conversationType: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "conversation_type";
        tableName: "chat_conversation";
        dataType: "string";
        columnType: "PgEnumColumn";
        data: "workflow" | "direct" | "group" | "support" | "onboarding";
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: ["direct", "group", "workflow", "support", "onboarding"];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    participantIds: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "participant_ids";
        tableName: "chat_conversation";
        dataType: "array";
        columnType: "PgArray";
        data: string[];
        driverParam: string | string[];
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: import("drizzle-orm").Column<
          {
            name: "participant_ids";
            tableName: "chat_conversation";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        identity: undefined;
        generated: undefined;
      },
      {},
      {
        size: undefined;
        baseBuilder: import("drizzle-orm/pg-core").PgColumnBuilder<
          {
            name: "participant_ids";
            dataType: "string";
            columnType: "PgText";
            data: string;
            enumValues: [string, ...string[]];
            driverParam: string;
          },
          {},
          {},
          import("drizzle-orm").ColumnBuilderExtraConfig
        >;
      }
    >;
    agentIds: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "agent_ids";
        tableName: "chat_conversation";
        dataType: "array";
        columnType: "PgArray";
        data: string[];
        driverParam: string | string[];
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: import("drizzle-orm").Column<
          {
            name: "agent_ids";
            tableName: "chat_conversation";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        identity: undefined;
        generated: undefined;
      },
      {},
      {
        size: undefined;
        baseBuilder: import("drizzle-orm/pg-core").PgColumnBuilder<
          {
            name: "agent_ids";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            enumValues: undefined;
          },
          {},
          {},
          import("drizzle-orm").ColumnBuilderExtraConfig
        >;
      }
    >;
    createdBy: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_by";
        tableName: "chat_conversation";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    isActive: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "is_active";
        tableName: "chat_conversation";
        dataType: "boolean";
        columnType: "PgBoolean";
        data: boolean;
        driverParam: boolean;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    isArchived: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "is_archived";
        tableName: "chat_conversation";
        dataType: "boolean";
        columnType: "PgBoolean";
        data: boolean;
        driverParam: boolean;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    isPinned: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "is_pinned";
        tableName: "chat_conversation";
        dataType: "boolean";
        columnType: "PgBoolean";
        data: boolean;
        driverParam: boolean;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    isPrivate: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "is_private";
        tableName: "chat_conversation";
        dataType: "boolean";
        columnType: "PgBoolean";
        data: boolean;
        driverParam: boolean;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    accessLevel: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "access_level";
        tableName: "chat_conversation";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    messageCount: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "message_count";
        tableName: "chat_conversation";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    participantCount: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "participant_count";
        tableName: "chat_conversation";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    lastMessageAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_message_at";
        tableName: "chat_conversation";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    lastActivityAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_activity_at";
        tableName: "chat_conversation";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    currentSessionId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "current_session_id";
        tableName: "chat_conversation";
        dataType: "string";
        columnType: "PgUUID";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    sessionIds: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "session_ids";
        tableName: "chat_conversation";
        dataType: "array";
        columnType: "PgArray";
        data: string[];
        driverParam: string | string[];
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: import("drizzle-orm").Column<
          {
            name: "session_ids";
            tableName: "chat_conversation";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        identity: undefined;
        generated: undefined;
      },
      {},
      {
        size: undefined;
        baseBuilder: import("drizzle-orm/pg-core").PgColumnBuilder<
          {
            name: "session_ids";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            enumValues: undefined;
          },
          {},
          {},
          import("drizzle-orm").ColumnBuilderExtraConfig
        >;
      }
    >;
    tags: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tags";
        tableName: "chat_conversation";
        dataType: "array";
        columnType: "PgArray";
        data: string[];
        driverParam: string | string[];
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: import("drizzle-orm").Column<
          {
            name: "tags";
            tableName: "chat_conversation";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        identity: undefined;
        generated: undefined;
      },
      {},
      {
        size: undefined;
        baseBuilder: import("drizzle-orm/pg-core").PgColumnBuilder<
          {
            name: "tags";
            dataType: "string";
            columnType: "PgText";
            data: string;
            enumValues: [string, ...string[]];
            driverParam: string;
          },
          {},
          {},
          import("drizzle-orm").ColumnBuilderExtraConfig
        >;
      }
    >;
    category: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "category";
        tableName: "chat_conversation";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    priority: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "priority";
        tableName: "chat_conversation";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    customData: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "custom_data";
        tableName: "chat_conversation";
        dataType: "json";
        columnType: "PgJsonb";
        data: unknown;
        driverParam: unknown;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    totalTokens: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "total_tokens";
        tableName: "chat_conversation";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    totalCost: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "total_cost";
        tableName: "chat_conversation";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    averageResponseTime: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "average_response_time";
        tableName: "chat_conversation";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    satisfactionScore: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "satisfaction_score";
        tableName: "chat_conversation";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "chat_conversation";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    updatedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "updated_at";
        tableName: "chat_conversation";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    archivedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "archived_at";
        tableName: "chat_conversation";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    deletedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "deleted_at";
        tableName: "chat_conversation";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
  };
  dialect: "pg";
}>;
/**
 * Browser Session Persistence - Maintains chat state across browser sessions
 * Enables seamless conversation restoration and cross-device continuity
 */
export declare const chatBrowserSession: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "chat_browser_session";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "chat_browser_session";
        dataType: "string";
        columnType: "PgUUID";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: true;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    sessionToken: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "session_token";
        tableName: "chat_browser_session";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    workspaceId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workspace_id";
        tableName: "chat_browser_session";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    userId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "user_id";
        tableName: "chat_browser_session";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    conversationId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "conversation_id";
        tableName: "chat_browser_session";
        dataType: "string";
        columnType: "PgUUID";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    parlantSessionId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "parlant_session_id";
        tableName: "chat_browser_session";
        dataType: "string";
        columnType: "PgUUID";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    chatState: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "chat_state";
        tableName: "chat_browser_session";
        dataType: "json";
        columnType: "PgJsonb";
        data: unknown;
        driverParam: unknown;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    conversationState: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "conversation_state";
        tableName: "chat_browser_session";
        dataType: "json";
        columnType: "PgJsonb";
        data: unknown;
        driverParam: unknown;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    uiState: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "ui_state";
        tableName: "chat_browser_session";
        dataType: "json";
        columnType: "PgJsonb";
        data: unknown;
        driverParam: unknown;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    deviceInfo: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "device_info";
        tableName: "chat_browser_session";
        dataType: "json";
        columnType: "PgJsonb";
        data: unknown;
        driverParam: unknown;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    lastActiveUrl: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_active_url";
        tableName: "chat_browser_session";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    scrollPosition: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "scroll_position";
        tableName: "chat_browser_session";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    isActive: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "is_active";
        tableName: "chat_browser_session";
        dataType: "boolean";
        columnType: "PgBoolean";
        data: boolean;
        driverParam: boolean;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    lastHeartbeat: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_heartbeat";
        tableName: "chat_browser_session";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    heartbeatCount: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "heartbeat_count";
        tableName: "chat_browser_session";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    sessionDuration: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "session_duration";
        tableName: "chat_browser_session";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    messagesInSession: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "messages_in_session";
        tableName: "chat_browser_session";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    lastMessageAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_message_at";
        tableName: "chat_browser_session";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    userAgent: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "user_agent";
        tableName: "chat_browser_session";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    ipAddress: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "ip_address";
        tableName: "chat_browser_session";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    referrer: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "referrer";
        tableName: "chat_browser_session";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    locale: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "locale";
        tableName: "chat_browser_session";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    timezone: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "timezone";
        tableName: "chat_browser_session";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    expiresAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "expires_at";
        tableName: "chat_browser_session";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "chat_browser_session";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    updatedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "updated_at";
        tableName: "chat_browser_session";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
  };
  dialect: "pg";
}>;
/**
 * Chat Search Index - Optimized full-text search for chat messages
 * Provides fast message search across conversations and sessions
 */
export declare const chatSearchIndex: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "chat_search_index";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "chat_search_index";
        dataType: "string";
        columnType: "PgUUID";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: true;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    messageId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "message_id";
        tableName: "chat_search_index";
        dataType: "string";
        columnType: "PgUUID";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    workspaceId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workspace_id";
        tableName: "chat_search_index";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    conversationId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "conversation_id";
        tableName: "chat_search_index";
        dataType: "string";
        columnType: "PgUUID";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    sessionId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "session_id";
        tableName: "chat_search_index";
        dataType: "string";
        columnType: "PgUUID";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    searchableContent: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "searchable_content";
        tableName: "chat_search_index";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    keywords: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "keywords";
        tableName: "chat_search_index";
        dataType: "array";
        columnType: "PgArray";
        data: string[];
        driverParam: string | string[];
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: import("drizzle-orm").Column<
          {
            name: "keywords";
            tableName: "chat_search_index";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        identity: undefined;
        generated: undefined;
      },
      {},
      {
        size: undefined;
        baseBuilder: import("drizzle-orm/pg-core").PgColumnBuilder<
          {
            name: "keywords";
            dataType: "string";
            columnType: "PgText";
            data: string;
            enumValues: [string, ...string[]];
            driverParam: string;
          },
          {},
          {},
          import("drizzle-orm").ColumnBuilderExtraConfig
        >;
      }
    >;
    entities: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "entities";
        tableName: "chat_search_index";
        dataType: "json";
        columnType: "PgJsonb";
        data: unknown;
        driverParam: unknown;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    contentType: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "content_type";
        tableName: "chat_search_index";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    language: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "language";
        tableName: "chat_search_index";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    sentiment: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "sentiment";
        tableName: "chat_search_index";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    wordCount: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "word_count";
        tableName: "chat_search_index";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    characterCount: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "character_count";
        tableName: "chat_search_index";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    searchableTerms: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "searchable_terms";
        tableName: "chat_search_index";
        dataType: "array";
        columnType: "PgArray";
        data: string[];
        driverParam: string | string[];
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: import("drizzle-orm").Column<
          {
            name: "searchable_terms";
            tableName: "chat_search_index";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        identity: undefined;
        generated: undefined;
      },
      {},
      {
        size: undefined;
        baseBuilder: import("drizzle-orm/pg-core").PgColumnBuilder<
          {
            name: "searchable_terms";
            dataType: "string";
            columnType: "PgText";
            data: string;
            enumValues: [string, ...string[]];
            driverParam: string;
          },
          {},
          {},
          import("drizzle-orm").ColumnBuilderExtraConfig
        >;
      }
    >;
    messageImportance: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "message_importance";
        tableName: "chat_search_index";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    engagementScore: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "engagement_score";
        tableName: "chat_search_index";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    lastIndexed: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_indexed";
        tableName: "chat_search_index";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    indexVersion: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "index_version";
        tableName: "chat_search_index";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "chat_search_index";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    updatedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "updated_at";
        tableName: "chat_search_index";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
  };
  dialect: "pg";
}>;
/**
 * Chat Export Requests - Data portability and export management
 * Handles user data export requests for compliance and data portability
 */
export declare const chatExportRequest: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "chat_export_request";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "chat_export_request";
        dataType: "string";
        columnType: "PgUUID";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: true;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    requestToken: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "request_token";
        tableName: "chat_export_request";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    workspaceId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workspace_id";
        tableName: "chat_export_request";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    requestedBy: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "requested_by";
        tableName: "chat_export_request";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    exportScope: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "export_scope";
        tableName: "chat_export_request";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    targetIds: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "target_ids";
        tableName: "chat_export_request";
        dataType: "array";
        columnType: "PgArray";
        data: string[];
        driverParam: string | string[];
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: import("drizzle-orm").Column<
          {
            name: "target_ids";
            tableName: "chat_export_request";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
          },
          {},
          {}
        >;
        identity: undefined;
        generated: undefined;
      },
      {},
      {
        size: undefined;
        baseBuilder: import("drizzle-orm/pg-core").PgColumnBuilder<
          {
            name: "target_ids";
            dataType: "string";
            columnType: "PgText";
            data: string;
            enumValues: [string, ...string[]];
            driverParam: string;
          },
          {},
          {},
          import("drizzle-orm").ColumnBuilderExtraConfig
        >;
      }
    >;
    dateRange: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "date_range";
        tableName: "chat_export_request";
        dataType: "json";
        columnType: "PgJsonb";
        data: unknown;
        driverParam: unknown;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    includeMetadata: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "include_metadata";
        tableName: "chat_export_request";
        dataType: "boolean";
        columnType: "PgBoolean";
        data: boolean;
        driverParam: boolean;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    includeAttachments: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "include_attachments";
        tableName: "chat_export_request";
        dataType: "boolean";
        columnType: "PgBoolean";
        data: boolean;
        driverParam: boolean;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    exportFormat: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "export_format";
        tableName: "chat_export_request";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    compressionType: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "compression_type";
        tableName: "chat_export_request";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    status: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "status";
        tableName: "chat_export_request";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    processingStartedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "processing_started_at";
        tableName: "chat_export_request";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    processingCompletedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "processing_completed_at";
        tableName: "chat_export_request";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    exportFilePath: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "export_file_path";
        tableName: "chat_export_request";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    exportFileSize: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "export_file_size";
        tableName: "chat_export_request";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    recordCount: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "record_count";
        tableName: "chat_export_request";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    errorMessage: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "error_message";
        tableName: "chat_export_request";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    errorDetails: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "error_details";
        tableName: "chat_export_request";
        dataType: "json";
        columnType: "PgJsonb";
        data: unknown;
        driverParam: unknown;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    downloadCount: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "download_count";
        tableName: "chat_export_request";
        dataType: "number";
        columnType: "PgInteger";
        data: number;
        driverParam: string | number;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    lastDownloadAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_download_at";
        tableName: "chat_export_request";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    expiresAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "expires_at";
        tableName: "chat_export_request";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    requestMetadata: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "request_metadata";
        tableName: "chat_export_request";
        dataType: "json";
        columnType: "PgJsonb";
        data: unknown;
        driverParam: unknown;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "chat_export_request";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    updatedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "updated_at";
        tableName: "chat_export_request";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
  };
  dialect: "pg";
}>;
export declare const chatPersistenceTables: {
  chatMessage: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "chat_message";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "chat_message";
          dataType: "string";
          columnType: "PgUUID";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: true;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      sessionId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "session_id";
          tableName: "chat_message";
          dataType: "string";
          columnType: "PgUUID";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      workspaceId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "workspace_id";
          tableName: "chat_message";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      eventId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "event_id";
          tableName: "chat_message";
          dataType: "string";
          columnType: "PgUUID";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      sequenceNumber: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "sequence_number";
          tableName: "chat_message";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      messageType: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "message_type";
          tableName: "chat_message";
          dataType: "string";
          columnType: "PgEnumColumn";
          data:
            | "error"
            | "file"
            | "system"
            | "media"
            | "text"
            | "tool_call"
            | "tool_result";
          driverParam: string;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [
            "text",
            "tool_call",
            "tool_result",
            "system",
            "error",
            "media",
            "file",
          ];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      content: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "content";
          tableName: "chat_message";
          dataType: "json";
          columnType: "PgJsonb";
          data: unknown;
          driverParam: unknown;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      rawContent: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "raw_content";
          tableName: "chat_message";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      senderId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "sender_id";
          tableName: "chat_message";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      senderType: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "sender_type";
          tableName: "chat_message";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      senderName: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "sender_name";
          tableName: "chat_message";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      status: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "status";
          tableName: "chat_message";
          dataType: "string";
          columnType: "PgEnumColumn";
          data: "pending" | "failed" | "read" | "sent" | "delivered";
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: ["pending", "sent", "delivered", "read", "failed"];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      deliveredAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "delivered_at";
          tableName: "chat_message";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      readAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "read_at";
          tableName: "chat_message";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      threadId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "thread_id";
          tableName: "chat_message";
          dataType: "string";
          columnType: "PgUUID";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      parentMessageId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "parent_message_id";
          tableName: "chat_message";
          dataType: "string";
          columnType: "PgUUID";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      mentionedUserIds: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "mentioned_user_ids";
          tableName: "chat_message";
          dataType: "array";
          columnType: "PgArray";
          data: string[];
          driverParam: string | string[];
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: import("drizzle-orm").Column<
            {
              name: "mentioned_user_ids";
              tableName: "chat_message";
              dataType: "string";
              columnType: "PgText";
              data: string;
              driverParam: string;
              notNull: false;
              hasDefault: false;
              isPrimaryKey: false;
              isAutoincrement: false;
              hasRuntimeDefault: false;
              enumValues: [string, ...string[]];
              baseColumn: never;
              identity: undefined;
              generated: undefined;
            },
            {},
            {}
          >;
          identity: undefined;
          generated: undefined;
        },
        {},
        {
          size: undefined;
          baseBuilder: import("drizzle-orm/pg-core").PgColumnBuilder<
            {
              name: "mentioned_user_ids";
              dataType: "string";
              columnType: "PgText";
              data: string;
              enumValues: [string, ...string[]];
              driverParam: string;
            },
            {},
            {},
            import("drizzle-orm").ColumnBuilderExtraConfig
          >;
        }
      >;
      attachments: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "attachments";
          tableName: "chat_message";
          dataType: "json";
          columnType: "PgJsonb";
          data: unknown;
          driverParam: unknown;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      reactions: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "reactions";
          tableName: "chat_message";
          dataType: "json";
          columnType: "PgJsonb";
          data: unknown;
          driverParam: unknown;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      editHistory: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "edit_history";
          tableName: "chat_message";
          dataType: "json";
          columnType: "PgJsonb";
          data: unknown;
          driverParam: unknown;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      toolCallId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "tool_call_id";
          tableName: "chat_message";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      toolResults: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "tool_results";
          tableName: "chat_message";
          dataType: "json";
          columnType: "PgJsonb";
          data: unknown;
          driverParam: unknown;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      tags: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "tags";
          tableName: "chat_message";
          dataType: "array";
          columnType: "PgArray";
          data: string[];
          driverParam: string | string[];
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: import("drizzle-orm").Column<
            {
              name: "tags";
              tableName: "chat_message";
              dataType: "string";
              columnType: "PgText";
              data: string;
              driverParam: string;
              notNull: false;
              hasDefault: false;
              isPrimaryKey: false;
              isAutoincrement: false;
              hasRuntimeDefault: false;
              enumValues: [string, ...string[]];
              baseColumn: never;
              identity: undefined;
              generated: undefined;
            },
            {},
            {}
          >;
          identity: undefined;
          generated: undefined;
        },
        {},
        {
          size: undefined;
          baseBuilder: import("drizzle-orm/pg-core").PgColumnBuilder<
            {
              name: "tags";
              dataType: "string";
              columnType: "PgText";
              data: string;
              enumValues: [string, ...string[]];
              driverParam: string;
            },
            {},
            {},
            import("drizzle-orm").ColumnBuilderExtraConfig
          >;
        }
      >;
      category: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "category";
          tableName: "chat_message";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      priority: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "priority";
          tableName: "chat_message";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      tokenCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "token_count";
          tableName: "chat_message";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      cost: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "cost";
          tableName: "chat_message";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      processingTime: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "processing_time";
          tableName: "chat_message";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      metadata: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "metadata";
          tableName: "chat_message";
          dataType: "json";
          columnType: "PgJsonb";
          data: unknown;
          driverParam: unknown;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      customData: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "custom_data";
          tableName: "chat_message";
          dataType: "json";
          columnType: "PgJsonb";
          data: unknown;
          driverParam: unknown;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      ipAddress: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "ip_address";
          tableName: "chat_message";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      userAgent: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "user_agent";
          tableName: "chat_message";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "chat_message";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      updatedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "updated_at";
          tableName: "chat_message";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      deletedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "deleted_at";
          tableName: "chat_message";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
    };
    dialect: "pg";
  }>;
  chatConversation: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "chat_conversation";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "chat_conversation";
          dataType: "string";
          columnType: "PgUUID";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: true;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      workspaceId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "workspace_id";
          tableName: "chat_conversation";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      title: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "title";
          tableName: "chat_conversation";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      description: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "description";
          tableName: "chat_conversation";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      conversationType: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "conversation_type";
          tableName: "chat_conversation";
          dataType: "string";
          columnType: "PgEnumColumn";
          data: "workflow" | "direct" | "group" | "support" | "onboarding";
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: ["direct", "group", "workflow", "support", "onboarding"];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      participantIds: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "participant_ids";
          tableName: "chat_conversation";
          dataType: "array";
          columnType: "PgArray";
          data: string[];
          driverParam: string | string[];
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: import("drizzle-orm").Column<
            {
              name: "participant_ids";
              tableName: "chat_conversation";
              dataType: "string";
              columnType: "PgText";
              data: string;
              driverParam: string;
              notNull: false;
              hasDefault: false;
              isPrimaryKey: false;
              isAutoincrement: false;
              hasRuntimeDefault: false;
              enumValues: [string, ...string[]];
              baseColumn: never;
              identity: undefined;
              generated: undefined;
            },
            {},
            {}
          >;
          identity: undefined;
          generated: undefined;
        },
        {},
        {
          size: undefined;
          baseBuilder: import("drizzle-orm/pg-core").PgColumnBuilder<
            {
              name: "participant_ids";
              dataType: "string";
              columnType: "PgText";
              data: string;
              enumValues: [string, ...string[]];
              driverParam: string;
            },
            {},
            {},
            import("drizzle-orm").ColumnBuilderExtraConfig
          >;
        }
      >;
      agentIds: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "agent_ids";
          tableName: "chat_conversation";
          dataType: "array";
          columnType: "PgArray";
          data: string[];
          driverParam: string | string[];
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: import("drizzle-orm").Column<
            {
              name: "agent_ids";
              tableName: "chat_conversation";
              dataType: "string";
              columnType: "PgUUID";
              data: string;
              driverParam: string;
              notNull: false;
              hasDefault: false;
              isPrimaryKey: false;
              isAutoincrement: false;
              hasRuntimeDefault: false;
              enumValues: undefined;
              baseColumn: never;
              identity: undefined;
              generated: undefined;
            },
            {},
            {}
          >;
          identity: undefined;
          generated: undefined;
        },
        {},
        {
          size: undefined;
          baseBuilder: import("drizzle-orm/pg-core").PgColumnBuilder<
            {
              name: "agent_ids";
              dataType: "string";
              columnType: "PgUUID";
              data: string;
              driverParam: string;
              enumValues: undefined;
            },
            {},
            {},
            import("drizzle-orm").ColumnBuilderExtraConfig
          >;
        }
      >;
      createdBy: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_by";
          tableName: "chat_conversation";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      isActive: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "is_active";
          tableName: "chat_conversation";
          dataType: "boolean";
          columnType: "PgBoolean";
          data: boolean;
          driverParam: boolean;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      isArchived: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "is_archived";
          tableName: "chat_conversation";
          dataType: "boolean";
          columnType: "PgBoolean";
          data: boolean;
          driverParam: boolean;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      isPinned: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "is_pinned";
          tableName: "chat_conversation";
          dataType: "boolean";
          columnType: "PgBoolean";
          data: boolean;
          driverParam: boolean;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      isPrivate: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "is_private";
          tableName: "chat_conversation";
          dataType: "boolean";
          columnType: "PgBoolean";
          data: boolean;
          driverParam: boolean;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      accessLevel: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "access_level";
          tableName: "chat_conversation";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      messageCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "message_count";
          tableName: "chat_conversation";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      participantCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "participant_count";
          tableName: "chat_conversation";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      lastMessageAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_message_at";
          tableName: "chat_conversation";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      lastActivityAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_activity_at";
          tableName: "chat_conversation";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      currentSessionId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "current_session_id";
          tableName: "chat_conversation";
          dataType: "string";
          columnType: "PgUUID";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      sessionIds: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "session_ids";
          tableName: "chat_conversation";
          dataType: "array";
          columnType: "PgArray";
          data: string[];
          driverParam: string | string[];
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: import("drizzle-orm").Column<
            {
              name: "session_ids";
              tableName: "chat_conversation";
              dataType: "string";
              columnType: "PgUUID";
              data: string;
              driverParam: string;
              notNull: false;
              hasDefault: false;
              isPrimaryKey: false;
              isAutoincrement: false;
              hasRuntimeDefault: false;
              enumValues: undefined;
              baseColumn: never;
              identity: undefined;
              generated: undefined;
            },
            {},
            {}
          >;
          identity: undefined;
          generated: undefined;
        },
        {},
        {
          size: undefined;
          baseBuilder: import("drizzle-orm/pg-core").PgColumnBuilder<
            {
              name: "session_ids";
              dataType: "string";
              columnType: "PgUUID";
              data: string;
              driverParam: string;
              enumValues: undefined;
            },
            {},
            {},
            import("drizzle-orm").ColumnBuilderExtraConfig
          >;
        }
      >;
      tags: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "tags";
          tableName: "chat_conversation";
          dataType: "array";
          columnType: "PgArray";
          data: string[];
          driverParam: string | string[];
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: import("drizzle-orm").Column<
            {
              name: "tags";
              tableName: "chat_conversation";
              dataType: "string";
              columnType: "PgText";
              data: string;
              driverParam: string;
              notNull: false;
              hasDefault: false;
              isPrimaryKey: false;
              isAutoincrement: false;
              hasRuntimeDefault: false;
              enumValues: [string, ...string[]];
              baseColumn: never;
              identity: undefined;
              generated: undefined;
            },
            {},
            {}
          >;
          identity: undefined;
          generated: undefined;
        },
        {},
        {
          size: undefined;
          baseBuilder: import("drizzle-orm/pg-core").PgColumnBuilder<
            {
              name: "tags";
              dataType: "string";
              columnType: "PgText";
              data: string;
              enumValues: [string, ...string[]];
              driverParam: string;
            },
            {},
            {},
            import("drizzle-orm").ColumnBuilderExtraConfig
          >;
        }
      >;
      category: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "category";
          tableName: "chat_conversation";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      priority: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "priority";
          tableName: "chat_conversation";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      customData: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "custom_data";
          tableName: "chat_conversation";
          dataType: "json";
          columnType: "PgJsonb";
          data: unknown;
          driverParam: unknown;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      totalTokens: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "total_tokens";
          tableName: "chat_conversation";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      totalCost: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "total_cost";
          tableName: "chat_conversation";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      averageResponseTime: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "average_response_time";
          tableName: "chat_conversation";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      satisfactionScore: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "satisfaction_score";
          tableName: "chat_conversation";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "chat_conversation";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      updatedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "updated_at";
          tableName: "chat_conversation";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      archivedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "archived_at";
          tableName: "chat_conversation";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      deletedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "deleted_at";
          tableName: "chat_conversation";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
    };
    dialect: "pg";
  }>;
  chatBrowserSession: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "chat_browser_session";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "chat_browser_session";
          dataType: "string";
          columnType: "PgUUID";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: true;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      sessionToken: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "session_token";
          tableName: "chat_browser_session";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      workspaceId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "workspace_id";
          tableName: "chat_browser_session";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      userId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "user_id";
          tableName: "chat_browser_session";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      conversationId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "conversation_id";
          tableName: "chat_browser_session";
          dataType: "string";
          columnType: "PgUUID";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      parlantSessionId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "parlant_session_id";
          tableName: "chat_browser_session";
          dataType: "string";
          columnType: "PgUUID";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      chatState: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "chat_state";
          tableName: "chat_browser_session";
          dataType: "json";
          columnType: "PgJsonb";
          data: unknown;
          driverParam: unknown;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      conversationState: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "conversation_state";
          tableName: "chat_browser_session";
          dataType: "json";
          columnType: "PgJsonb";
          data: unknown;
          driverParam: unknown;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      uiState: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "ui_state";
          tableName: "chat_browser_session";
          dataType: "json";
          columnType: "PgJsonb";
          data: unknown;
          driverParam: unknown;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      deviceInfo: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "device_info";
          tableName: "chat_browser_session";
          dataType: "json";
          columnType: "PgJsonb";
          data: unknown;
          driverParam: unknown;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      lastActiveUrl: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_active_url";
          tableName: "chat_browser_session";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      scrollPosition: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "scroll_position";
          tableName: "chat_browser_session";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      isActive: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "is_active";
          tableName: "chat_browser_session";
          dataType: "boolean";
          columnType: "PgBoolean";
          data: boolean;
          driverParam: boolean;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      lastHeartbeat: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_heartbeat";
          tableName: "chat_browser_session";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      heartbeatCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "heartbeat_count";
          tableName: "chat_browser_session";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      sessionDuration: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "session_duration";
          tableName: "chat_browser_session";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      messagesInSession: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "messages_in_session";
          tableName: "chat_browser_session";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      lastMessageAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_message_at";
          tableName: "chat_browser_session";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      userAgent: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "user_agent";
          tableName: "chat_browser_session";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      ipAddress: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "ip_address";
          tableName: "chat_browser_session";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      referrer: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "referrer";
          tableName: "chat_browser_session";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      locale: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "locale";
          tableName: "chat_browser_session";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      timezone: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "timezone";
          tableName: "chat_browser_session";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      expiresAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "expires_at";
          tableName: "chat_browser_session";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "chat_browser_session";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      updatedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "updated_at";
          tableName: "chat_browser_session";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
    };
    dialect: "pg";
  }>;
  chatSearchIndex: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "chat_search_index";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "chat_search_index";
          dataType: "string";
          columnType: "PgUUID";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: true;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      messageId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "message_id";
          tableName: "chat_search_index";
          dataType: "string";
          columnType: "PgUUID";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      workspaceId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "workspace_id";
          tableName: "chat_search_index";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      conversationId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "conversation_id";
          tableName: "chat_search_index";
          dataType: "string";
          columnType: "PgUUID";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      sessionId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "session_id";
          tableName: "chat_search_index";
          dataType: "string";
          columnType: "PgUUID";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      searchableContent: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "searchable_content";
          tableName: "chat_search_index";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      keywords: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "keywords";
          tableName: "chat_search_index";
          dataType: "array";
          columnType: "PgArray";
          data: string[];
          driverParam: string | string[];
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: import("drizzle-orm").Column<
            {
              name: "keywords";
              tableName: "chat_search_index";
              dataType: "string";
              columnType: "PgText";
              data: string;
              driverParam: string;
              notNull: false;
              hasDefault: false;
              isPrimaryKey: false;
              isAutoincrement: false;
              hasRuntimeDefault: false;
              enumValues: [string, ...string[]];
              baseColumn: never;
              identity: undefined;
              generated: undefined;
            },
            {},
            {}
          >;
          identity: undefined;
          generated: undefined;
        },
        {},
        {
          size: undefined;
          baseBuilder: import("drizzle-orm/pg-core").PgColumnBuilder<
            {
              name: "keywords";
              dataType: "string";
              columnType: "PgText";
              data: string;
              enumValues: [string, ...string[]];
              driverParam: string;
            },
            {},
            {},
            import("drizzle-orm").ColumnBuilderExtraConfig
          >;
        }
      >;
      entities: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "entities";
          tableName: "chat_search_index";
          dataType: "json";
          columnType: "PgJsonb";
          data: unknown;
          driverParam: unknown;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      contentType: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "content_type";
          tableName: "chat_search_index";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      language: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "language";
          tableName: "chat_search_index";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      sentiment: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "sentiment";
          tableName: "chat_search_index";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      wordCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "word_count";
          tableName: "chat_search_index";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      characterCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "character_count";
          tableName: "chat_search_index";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      searchableTerms: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "searchable_terms";
          tableName: "chat_search_index";
          dataType: "array";
          columnType: "PgArray";
          data: string[];
          driverParam: string | string[];
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: import("drizzle-orm").Column<
            {
              name: "searchable_terms";
              tableName: "chat_search_index";
              dataType: "string";
              columnType: "PgText";
              data: string;
              driverParam: string;
              notNull: false;
              hasDefault: false;
              isPrimaryKey: false;
              isAutoincrement: false;
              hasRuntimeDefault: false;
              enumValues: [string, ...string[]];
              baseColumn: never;
              identity: undefined;
              generated: undefined;
            },
            {},
            {}
          >;
          identity: undefined;
          generated: undefined;
        },
        {},
        {
          size: undefined;
          baseBuilder: import("drizzle-orm/pg-core").PgColumnBuilder<
            {
              name: "searchable_terms";
              dataType: "string";
              columnType: "PgText";
              data: string;
              enumValues: [string, ...string[]];
              driverParam: string;
            },
            {},
            {},
            import("drizzle-orm").ColumnBuilderExtraConfig
          >;
        }
      >;
      messageImportance: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "message_importance";
          tableName: "chat_search_index";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      engagementScore: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "engagement_score";
          tableName: "chat_search_index";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      lastIndexed: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_indexed";
          tableName: "chat_search_index";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      indexVersion: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "index_version";
          tableName: "chat_search_index";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "chat_search_index";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      updatedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "updated_at";
          tableName: "chat_search_index";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
    };
    dialect: "pg";
  }>;
  chatExportRequest: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "chat_export_request";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "chat_export_request";
          dataType: "string";
          columnType: "PgUUID";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: true;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      requestToken: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "request_token";
          tableName: "chat_export_request";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      workspaceId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "workspace_id";
          tableName: "chat_export_request";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      requestedBy: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "requested_by";
          tableName: "chat_export_request";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      exportScope: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "export_scope";
          tableName: "chat_export_request";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      targetIds: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "target_ids";
          tableName: "chat_export_request";
          dataType: "array";
          columnType: "PgArray";
          data: string[];
          driverParam: string | string[];
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: import("drizzle-orm").Column<
            {
              name: "target_ids";
              tableName: "chat_export_request";
              dataType: "string";
              columnType: "PgText";
              data: string;
              driverParam: string;
              notNull: false;
              hasDefault: false;
              isPrimaryKey: false;
              isAutoincrement: false;
              hasRuntimeDefault: false;
              enumValues: [string, ...string[]];
              baseColumn: never;
              identity: undefined;
              generated: undefined;
            },
            {},
            {}
          >;
          identity: undefined;
          generated: undefined;
        },
        {},
        {
          size: undefined;
          baseBuilder: import("drizzle-orm/pg-core").PgColumnBuilder<
            {
              name: "target_ids";
              dataType: "string";
              columnType: "PgText";
              data: string;
              enumValues: [string, ...string[]];
              driverParam: string;
            },
            {},
            {},
            import("drizzle-orm").ColumnBuilderExtraConfig
          >;
        }
      >;
      dateRange: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "date_range";
          tableName: "chat_export_request";
          dataType: "json";
          columnType: "PgJsonb";
          data: unknown;
          driverParam: unknown;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      includeMetadata: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "include_metadata";
          tableName: "chat_export_request";
          dataType: "boolean";
          columnType: "PgBoolean";
          data: boolean;
          driverParam: boolean;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      includeAttachments: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "include_attachments";
          tableName: "chat_export_request";
          dataType: "boolean";
          columnType: "PgBoolean";
          data: boolean;
          driverParam: boolean;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      exportFormat: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "export_format";
          tableName: "chat_export_request";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      compressionType: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "compression_type";
          tableName: "chat_export_request";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      status: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "status";
          tableName: "chat_export_request";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      processingStartedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "processing_started_at";
          tableName: "chat_export_request";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      processingCompletedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "processing_completed_at";
          tableName: "chat_export_request";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      exportFilePath: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "export_file_path";
          tableName: "chat_export_request";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      exportFileSize: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "export_file_size";
          tableName: "chat_export_request";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      recordCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "record_count";
          tableName: "chat_export_request";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      errorMessage: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "error_message";
          tableName: "chat_export_request";
          dataType: "string";
          columnType: "PgText";
          data: string;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [string, ...string[]];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      errorDetails: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "error_details";
          tableName: "chat_export_request";
          dataType: "json";
          columnType: "PgJsonb";
          data: unknown;
          driverParam: unknown;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      downloadCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "download_count";
          tableName: "chat_export_request";
          dataType: "number";
          columnType: "PgInteger";
          data: number;
          driverParam: string | number;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      lastDownloadAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_download_at";
          tableName: "chat_export_request";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: false;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      expiresAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "expires_at";
          tableName: "chat_export_request";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      requestMetadata: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "request_metadata";
          tableName: "chat_export_request";
          dataType: "json";
          columnType: "PgJsonb";
          data: unknown;
          driverParam: unknown;
          notNull: false;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "chat_export_request";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      updatedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "updated_at";
          tableName: "chat_export_request";
          dataType: "date";
          columnType: "PgTimestamp";
          data: Date;
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: undefined;
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
    };
    dialect: "pg";
  }>;
};
export declare const chatPersistenceEnums: {
  messageStatusEnum: import("drizzle-orm/pg-core").PgEnum<
    ["pending", "sent", "delivered", "read", "failed"]
  >;
  conversationTypeEnum: import("drizzle-orm/pg-core").PgEnum<
    ["direct", "group", "workflow", "support", "onboarding"]
  >;
  messageTypeEnum: import("drizzle-orm/pg-core").PgEnum<
    ["text", "tool_call", "tool_result", "system", "error", "media", "file"]
  >;
};
/**
 * Chat Persistence Query Helpers and Types
 * Type definitions for enhanced chat persistence functionality
 */
export type ChatMessage = typeof chatMessage.$inferSelect;
export type ChatConversation = typeof chatConversation.$inferSelect;
export type ChatBrowserSession = typeof chatBrowserSession.$inferSelect;
export type ChatSearchIndex = typeof chatSearchIndex.$inferSelect;
export type ChatExportRequest = typeof chatExportRequest.$inferSelect;
export type NewChatMessage = typeof chatMessage.$inferInsert;
export type NewChatConversation = typeof chatConversation.$inferInsert;
export type NewChatBrowserSession = typeof chatBrowserSession.$inferInsert;
export type NewChatSearchIndex = typeof chatSearchIndex.$inferInsert;
export type NewChatExportRequest = typeof chatExportRequest.$inferInsert;
