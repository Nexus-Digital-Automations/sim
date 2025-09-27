export declare const tsvector: {
  (): import("drizzle-orm/pg-core").PgCustomColumnBuilder<{
    name: "";
    dataType: "custom";
    columnType: "PgCustomColumn";
    data: string;
    driverParam: unknown;
    enumValues: undefined;
  }>;
  <TConfig extends Record<string, any>>(
    fieldConfig?: TConfig | undefined,
  ): import("drizzle-orm/pg-core").PgCustomColumnBuilder<{
    name: "";
    dataType: "custom";
    columnType: "PgCustomColumn";
    data: string;
    driverParam: unknown;
    enumValues: undefined;
  }>;
  <TName extends string>(
    dbName: TName,
    fieldConfig?: unknown,
  ): import("drizzle-orm/pg-core").PgCustomColumnBuilder<{
    name: TName;
    dataType: "custom";
    columnType: "PgCustomColumn";
    data: string;
    driverParam: unknown;
    enumValues: undefined;
  }>;
};
export declare const user: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "user";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "user";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    name: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "name";
        tableName: "user";
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
    email: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "email";
        tableName: "user";
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
    emailVerified: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "email_verified";
        tableName: "user";
        dataType: "boolean";
        columnType: "PgBoolean";
        data: boolean;
        driverParam: boolean;
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
    image: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "image";
        tableName: "user";
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
        tableName: "user";
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
    updatedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "updated_at";
        tableName: "user";
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
    stripeCustomerId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "stripe_customer_id";
        tableName: "user";
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
  };
  dialect: "pg";
}>;
export declare const session: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "session";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "session";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
        tableName: "session";
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
    token: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "token";
        tableName: "session";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "session";
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
    updatedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "updated_at";
        tableName: "session";
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
    ipAddress: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "ip_address";
        tableName: "session";
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
        tableName: "session";
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
    userId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "user_id";
        tableName: "session";
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
    activeOrganizationId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "active_organization_id";
        tableName: "session";
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
  };
  dialect: "pg";
}>;
export declare const account: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "account";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "account";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    accountId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "account_id";
        tableName: "account";
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
    providerId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "provider_id";
        tableName: "account";
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
        tableName: "account";
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
    accessToken: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "access_token";
        tableName: "account";
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
    refreshToken: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "refresh_token";
        tableName: "account";
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
    idToken: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id_token";
        tableName: "account";
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
    accessTokenExpiresAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "access_token_expires_at";
        tableName: "account";
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
    refreshTokenExpiresAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "refresh_token_expires_at";
        tableName: "account";
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
    scope: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "scope";
        tableName: "account";
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
    password: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "password";
        tableName: "account";
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
        tableName: "account";
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
    updatedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "updated_at";
        tableName: "account";
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
  };
  dialect: "pg";
}>;
export declare const verification: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "verification";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "verification";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    identifier: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "identifier";
        tableName: "verification";
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
    value: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "value";
        tableName: "verification";
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
    expiresAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "expires_at";
        tableName: "verification";
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
        tableName: "verification";
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
    updatedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "updated_at";
        tableName: "verification";
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
export declare const workflowFolder: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "workflow_folder";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "workflow_folder";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    name: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "name";
        tableName: "workflow_folder";
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
        tableName: "workflow_folder";
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
        tableName: "workflow_folder";
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
    parentId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "parent_id";
        tableName: "workflow_folder";
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
    color: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "color";
        tableName: "workflow_folder";
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
    isExpanded: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "is_expanded";
        tableName: "workflow_folder";
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
    sortOrder: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "sort_order";
        tableName: "workflow_folder";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "workflow_folder";
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
        tableName: "workflow_folder";
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
export declare const workflow: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "workflow";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "workflow";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
        tableName: "workflow";
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
        tableName: "workflow";
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
    folderId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "folder_id";
        tableName: "workflow";
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
    name: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "name";
        tableName: "workflow";
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
    description: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "description";
        tableName: "workflow";
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
    color: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "color";
        tableName: "workflow";
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
    lastSynced: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_synced";
        tableName: "workflow";
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
        tableName: "workflow";
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
    updatedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "updated_at";
        tableName: "workflow";
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
    isDeployed: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "is_deployed";
        tableName: "workflow";
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
    deployedState: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "deployed_state";
        tableName: "workflow";
        dataType: "json";
        columnType: "PgJson";
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
    deployedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "deployed_at";
        tableName: "workflow";
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
    pinnedApiKeyId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "pinned_api_key_id";
        tableName: "workflow";
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
    collaborators: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "collaborators";
        tableName: "workflow";
        dataType: "json";
        columnType: "PgJson";
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
    runCount: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "run_count";
        tableName: "workflow";
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
    lastRunAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_run_at";
        tableName: "workflow";
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
    variables: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "variables";
        tableName: "workflow";
        dataType: "json";
        columnType: "PgJson";
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
    isPublished: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "is_published";
        tableName: "workflow";
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
    marketplaceData: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "marketplace_data";
        tableName: "workflow";
        dataType: "json";
        columnType: "PgJson";
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
  };
  dialect: "pg";
}>;
export declare const workflowBlocks: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "workflow_blocks";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "workflow_blocks";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    workflowId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workflow_id";
        tableName: "workflow_blocks";
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
    type: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "type";
        tableName: "workflow_blocks";
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
    name: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "name";
        tableName: "workflow_blocks";
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
    positionX: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "position_x";
        tableName: "workflow_blocks";
        dataType: "string";
        columnType: "PgNumeric";
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
    positionY: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "position_y";
        tableName: "workflow_blocks";
        dataType: "string";
        columnType: "PgNumeric";
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
    enabled: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "enabled";
        tableName: "workflow_blocks";
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
    horizontalHandles: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "horizontal_handles";
        tableName: "workflow_blocks";
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
    isWide: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "is_wide";
        tableName: "workflow_blocks";
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
    advancedMode: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "advanced_mode";
        tableName: "workflow_blocks";
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
    triggerMode: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "trigger_mode";
        tableName: "workflow_blocks";
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
    height: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "height";
        tableName: "workflow_blocks";
        dataType: "string";
        columnType: "PgNumeric";
        data: string;
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
    subBlocks: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "sub_blocks";
        tableName: "workflow_blocks";
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
    outputs: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "outputs";
        tableName: "workflow_blocks";
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
    data: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "data";
        tableName: "workflow_blocks";
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
    parentId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "parent_id";
        tableName: "workflow_blocks";
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
    extent: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "extent";
        tableName: "workflow_blocks";
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
        tableName: "workflow_blocks";
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
        tableName: "workflow_blocks";
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
export declare const workflowEdges: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "workflow_edges";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "workflow_edges";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    workflowId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workflow_id";
        tableName: "workflow_edges";
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
    sourceBlockId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "source_block_id";
        tableName: "workflow_edges";
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
    targetBlockId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "target_block_id";
        tableName: "workflow_edges";
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
    sourceHandle: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "source_handle";
        tableName: "workflow_edges";
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
    targetHandle: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "target_handle";
        tableName: "workflow_edges";
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
        tableName: "workflow_edges";
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
export declare const workflowSubflows: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "workflow_subflows";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "workflow_subflows";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    workflowId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workflow_id";
        tableName: "workflow_subflows";
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
    type: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "type";
        tableName: "workflow_subflows";
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
    config: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "config";
        tableName: "workflow_subflows";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "workflow_subflows";
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
        tableName: "workflow_subflows";
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
export declare const waitlist: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "waitlist";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "waitlist";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    email: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "email";
        tableName: "waitlist";
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
    status: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "status";
        tableName: "waitlist";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "waitlist";
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
        tableName: "waitlist";
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
export declare const workflowExecutionSnapshots: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "workflow_execution_snapshots";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "workflow_execution_snapshots";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    workflowId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workflow_id";
        tableName: "workflow_execution_snapshots";
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
    stateHash: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "state_hash";
        tableName: "workflow_execution_snapshots";
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
    stateData: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "state_data";
        tableName: "workflow_execution_snapshots";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "workflow_execution_snapshots";
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
export declare const workflowExecutionLogs: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "workflow_execution_logs";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "workflow_execution_logs";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    workflowId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workflow_id";
        tableName: "workflow_execution_logs";
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
    executionId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "execution_id";
        tableName: "workflow_execution_logs";
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
    stateSnapshotId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "state_snapshot_id";
        tableName: "workflow_execution_logs";
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
    level: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "level";
        tableName: "workflow_execution_logs";
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
    trigger: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "trigger";
        tableName: "workflow_execution_logs";
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
    startedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "started_at";
        tableName: "workflow_execution_logs";
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
    endedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "ended_at";
        tableName: "workflow_execution_logs";
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
    totalDurationMs: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "total_duration_ms";
        tableName: "workflow_execution_logs";
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
    executionData: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "execution_data";
        tableName: "workflow_execution_logs";
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
    cost: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "cost";
        tableName: "workflow_execution_logs";
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
    files: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "files";
        tableName: "workflow_execution_logs";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "workflow_execution_logs";
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
export declare const environment: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "environment";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "environment";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
        tableName: "environment";
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
    variables: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "variables";
        tableName: "environment";
        dataType: "json";
        columnType: "PgJson";
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
    updatedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "updated_at";
        tableName: "environment";
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
export declare const workspaceEnvironment: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "workspace_environment";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "workspace_environment";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
        tableName: "workspace_environment";
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
    variables: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "variables";
        tableName: "workspace_environment";
        dataType: "json";
        columnType: "PgJson";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "workspace_environment";
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
        tableName: "workspace_environment";
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
export declare const settings: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "settings";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "settings";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
        tableName: "settings";
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
    theme: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "theme";
        tableName: "settings";
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
    autoConnect: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "auto_connect";
        tableName: "settings";
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
    autoFillEnvVars: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "auto_fill_env_vars";
        tableName: "settings";
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
    autoPan: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "auto_pan";
        tableName: "settings";
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
    consoleExpandedByDefault: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "console_expanded_by_default";
        tableName: "settings";
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
    telemetryEnabled: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "telemetry_enabled";
        tableName: "settings";
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
    emailPreferences: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "email_preferences";
        tableName: "settings";
        dataType: "json";
        columnType: "PgJson";
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
    billingUsageNotificationsEnabled: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "billing_usage_notifications_enabled";
        tableName: "settings";
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
    updatedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "updated_at";
        tableName: "settings";
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
export declare const workflowSchedule: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "workflow_schedule";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "workflow_schedule";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    workflowId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workflow_id";
        tableName: "workflow_schedule";
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
    blockId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "block_id";
        tableName: "workflow_schedule";
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
    cronExpression: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "cron_expression";
        tableName: "workflow_schedule";
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
    nextRunAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "next_run_at";
        tableName: "workflow_schedule";
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
    lastRanAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_ran_at";
        tableName: "workflow_schedule";
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
    triggerType: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "trigger_type";
        tableName: "workflow_schedule";
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
    timezone: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "timezone";
        tableName: "workflow_schedule";
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
    failedCount: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "failed_count";
        tableName: "workflow_schedule";
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
    status: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "status";
        tableName: "workflow_schedule";
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
    lastFailedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_failed_at";
        tableName: "workflow_schedule";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "workflow_schedule";
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
        tableName: "workflow_schedule";
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
export declare const webhook: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "webhook";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "webhook";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    workflowId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workflow_id";
        tableName: "webhook";
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
    blockId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "block_id";
        tableName: "webhook";
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
    path: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "path";
        tableName: "webhook";
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
    provider: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "provider";
        tableName: "webhook";
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
    providerConfig: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "provider_config";
        tableName: "webhook";
        dataType: "json";
        columnType: "PgJson";
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
    isActive: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "is_active";
        tableName: "webhook";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "webhook";
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
        tableName: "webhook";
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
export declare const workflowLogWebhook: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "workflow_log_webhook";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "workflow_log_webhook";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    workflowId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workflow_id";
        tableName: "workflow_log_webhook";
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
    url: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "url";
        tableName: "workflow_log_webhook";
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
    secret: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "secret";
        tableName: "workflow_log_webhook";
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
    includeFinalOutput: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "include_final_output";
        tableName: "workflow_log_webhook";
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
    includeTraceSpans: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "include_trace_spans";
        tableName: "workflow_log_webhook";
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
    includeRateLimits: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "include_rate_limits";
        tableName: "workflow_log_webhook";
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
    includeUsageData: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "include_usage_data";
        tableName: "workflow_log_webhook";
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
    levelFilter: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "level_filter";
        tableName: "workflow_log_webhook";
        dataType: "array";
        columnType: "PgArray";
        data: string[];
        driverParam: string | string[];
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: import("drizzle-orm").Column<
          {
            name: "level_filter";
            tableName: "workflow_log_webhook";
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
            name: "level_filter";
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
    triggerFilter: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "trigger_filter";
        tableName: "workflow_log_webhook";
        dataType: "array";
        columnType: "PgArray";
        data: string[];
        driverParam: string | string[];
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: import("drizzle-orm").Column<
          {
            name: "trigger_filter";
            tableName: "workflow_log_webhook";
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
            name: "trigger_filter";
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
    active: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "active";
        tableName: "workflow_log_webhook";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "workflow_log_webhook";
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
        tableName: "workflow_log_webhook";
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
export declare const webhookDeliveryStatusEnum: import("drizzle-orm/pg-core").PgEnum<
  ["pending", "in_progress", "success", "failed"]
>;
export declare const workflowLogWebhookDelivery: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "workflow_log_webhook_delivery";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "workflow_log_webhook_delivery";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    subscriptionId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "subscription_id";
        tableName: "workflow_log_webhook_delivery";
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
    workflowId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workflow_id";
        tableName: "workflow_log_webhook_delivery";
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
    executionId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "execution_id";
        tableName: "workflow_log_webhook_delivery";
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
    status: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "status";
        tableName: "workflow_log_webhook_delivery";
        dataType: "string";
        columnType: "PgEnumColumn";
        data: "pending" | "success" | "failed" | "in_progress";
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: ["pending", "in_progress", "success", "failed"];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    attempts: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "attempts";
        tableName: "workflow_log_webhook_delivery";
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
    lastAttemptAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_attempt_at";
        tableName: "workflow_log_webhook_delivery";
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
    nextAttemptAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "next_attempt_at";
        tableName: "workflow_log_webhook_delivery";
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
    responseStatus: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "response_status";
        tableName: "workflow_log_webhook_delivery";
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
    responseBody: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "response_body";
        tableName: "workflow_log_webhook_delivery";
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
    errorMessage: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "error_message";
        tableName: "workflow_log_webhook_delivery";
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
        tableName: "workflow_log_webhook_delivery";
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
        tableName: "workflow_log_webhook_delivery";
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
export declare const apiKey: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "api_key";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "api_key";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
        tableName: "api_key";
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
        tableName: "api_key";
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
    createdBy: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_by";
        tableName: "api_key";
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
    name: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "name";
        tableName: "api_key";
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
    key: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "key";
        tableName: "api_key";
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
    type: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "type";
        tableName: "api_key";
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
    lastUsed: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_used";
        tableName: "api_key";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "api_key";
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
        tableName: "api_key";
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
    expiresAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "expires_at";
        tableName: "api_key";
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
export declare const marketplace: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "marketplace";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "marketplace";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    workflowId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workflow_id";
        tableName: "marketplace";
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
    state: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "state";
        tableName: "marketplace";
        dataType: "json";
        columnType: "PgJson";
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
    name: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "name";
        tableName: "marketplace";
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
    description: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "description";
        tableName: "marketplace";
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
    authorId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "author_id";
        tableName: "marketplace";
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
    authorName: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "author_name";
        tableName: "marketplace";
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
    views: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "views";
        tableName: "marketplace";
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
    category: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "category";
        tableName: "marketplace";
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
        tableName: "marketplace";
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
        tableName: "marketplace";
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
export declare const userStats: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "user_stats";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "user_stats";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
        tableName: "user_stats";
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
    totalManualExecutions: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "total_manual_executions";
        tableName: "user_stats";
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
    totalApiCalls: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "total_api_calls";
        tableName: "user_stats";
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
    totalWebhookTriggers: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "total_webhook_triggers";
        tableName: "user_stats";
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
    totalScheduledExecutions: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "total_scheduled_executions";
        tableName: "user_stats";
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
    totalChatExecutions: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "total_chat_executions";
        tableName: "user_stats";
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
    totalTokensUsed: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "total_tokens_used";
        tableName: "user_stats";
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
    totalCost: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "total_cost";
        tableName: "user_stats";
        dataType: "string";
        columnType: "PgNumeric";
        data: string;
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
    currentUsageLimit: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "current_usage_limit";
        tableName: "user_stats";
        dataType: "string";
        columnType: "PgNumeric";
        data: string;
        driverParam: string;
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
    usageLimitUpdatedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "usage_limit_updated_at";
        tableName: "user_stats";
        dataType: "date";
        columnType: "PgTimestamp";
        data: Date;
        driverParam: string;
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
    currentPeriodCost: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "current_period_cost";
        tableName: "user_stats";
        dataType: "string";
        columnType: "PgNumeric";
        data: string;
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
    lastPeriodCost: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_period_cost";
        tableName: "user_stats";
        dataType: "string";
        columnType: "PgNumeric";
        data: string;
        driverParam: string;
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
    totalCopilotCost: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "total_copilot_cost";
        tableName: "user_stats";
        dataType: "string";
        columnType: "PgNumeric";
        data: string;
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
    totalCopilotTokens: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "total_copilot_tokens";
        tableName: "user_stats";
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
    totalCopilotCalls: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "total_copilot_calls";
        tableName: "user_stats";
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
    lastActive: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_active";
        tableName: "user_stats";
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
    billingBlocked: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "billing_blocked";
        tableName: "user_stats";
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
  };
  dialect: "pg";
}>;
export declare const customTools: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "custom_tools";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "custom_tools";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
        tableName: "custom_tools";
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
        tableName: "custom_tools";
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
    schema: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "schema";
        tableName: "custom_tools";
        dataType: "json";
        columnType: "PgJson";
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
    code: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "code";
        tableName: "custom_tools";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "custom_tools";
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
        tableName: "custom_tools";
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
export declare const toolCategories: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "tool_categories";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "tool_categories";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    name: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "name";
        tableName: "tool_categories";
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
    description: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "description";
        tableName: "tool_categories";
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
    icon: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "icon";
        tableName: "tool_categories";
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
    sortOrder: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "sort_order";
        tableName: "tool_categories";
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
    color: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "color";
        tableName: "tool_categories";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "tool_categories";
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
        tableName: "tool_categories";
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
export declare const toolStatusEnum: import("drizzle-orm/pg-core").PgEnum<
  ["active", "inactive", "deprecated", "maintenance"]
>;
export declare const toolScopeEnum: import("drizzle-orm/pg-core").PgEnum<
  ["global", "workspace", "user"]
>;
export declare const toolTypeEnum: import("drizzle-orm/pg-core").PgEnum<
  ["builtin", "custom", "integration", "plugin"]
>;
export declare const toolRegistry: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "tool_registry";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "tool_registry";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    name: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "name";
        tableName: "tool_registry";
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
    displayName: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "display_name";
        tableName: "tool_registry";
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
    description: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "description";
        tableName: "tool_registry";
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
    longDescription: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "long_description";
        tableName: "tool_registry";
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
    version: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "version";
        tableName: "tool_registry";
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
    toolType: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tool_type";
        tableName: "tool_registry";
        dataType: "string";
        columnType: "PgEnumColumn";
        data: "custom" | "builtin" | "integration" | "plugin";
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: ["builtin", "custom", "integration", "plugin"];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    scope: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "scope";
        tableName: "tool_registry";
        dataType: "string";
        columnType: "PgEnumColumn";
        data: "user" | "workspace" | "global";
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: ["global", "workspace", "user"];
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
        tableName: "tool_registry";
        dataType: "string";
        columnType: "PgEnumColumn";
        data: "active" | "inactive" | "deprecated" | "maintenance";
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: ["active", "inactive", "deprecated", "maintenance"];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    categoryId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "category_id";
        tableName: "tool_registry";
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
    tags: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tags";
        tableName: "tool_registry";
        dataType: "json";
        columnType: "PgJson";
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
    keywords: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "keywords";
        tableName: "tool_registry";
        dataType: "json";
        columnType: "PgJson";
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
    schema: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "schema";
        tableName: "tool_registry";
        dataType: "json";
        columnType: "PgJson";
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
    resultSchema: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "result_schema";
        tableName: "tool_registry";
        dataType: "json";
        columnType: "PgJson";
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
    metadata: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "metadata";
        tableName: "tool_registry";
        dataType: "json";
        columnType: "PgJson";
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
    implementationType: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "implementation_type";
        tableName: "tool_registry";
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
    executionContext: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "execution_context";
        tableName: "tool_registry";
        dataType: "json";
        columnType: "PgJson";
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
    usageCount: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "usage_count";
        tableName: "tool_registry";
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
    successRate: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "success_rate";
        tableName: "tool_registry";
        dataType: "string";
        columnType: "PgNumeric";
        data: string;
        driverParam: string;
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
    avgExecutionTimeMs: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "avg_execution_time_ms";
        tableName: "tool_registry";
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
    lastUsed: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_used";
        tableName: "tool_registry";
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
    healthStatus: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "health_status";
        tableName: "tool_registry";
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
    lastHealthCheck: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_health_check";
        tableName: "tool_registry";
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
    healthCheckDetails: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "health_check_details";
        tableName: "tool_registry";
        dataType: "json";
        columnType: "PgJson";
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
    isPublic: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "is_public";
        tableName: "tool_registry";
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
    requiresAuth: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "requires_auth";
        tableName: "tool_registry";
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
    requiredPermissions: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "required_permissions";
        tableName: "tool_registry";
        dataType: "json";
        columnType: "PgJson";
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
    naturalLanguageDescription: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "natural_language_description";
        tableName: "tool_registry";
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
    usageExamples: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "usage_examples";
        tableName: "tool_registry";
        dataType: "json";
        columnType: "PgJson";
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
    commonQuestions: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "common_questions";
        tableName: "tool_registry";
        dataType: "json";
        columnType: "PgJson";
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
    createdBy: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_by";
        tableName: "tool_registry";
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
    updatedBy: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "updated_by";
        tableName: "tool_registry";
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
        tableName: "tool_registry";
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
        tableName: "tool_registry";
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
export declare const toolConfigurations: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "tool_configurations";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "tool_configurations";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    toolId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tool_id";
        tableName: "tool_configurations";
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
        tableName: "tool_configurations";
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
    userId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "user_id";
        tableName: "tool_configurations";
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
    name: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "name";
        tableName: "tool_configurations";
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
    description: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "description";
        tableName: "tool_configurations";
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
    configuration: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "configuration";
        tableName: "tool_configurations";
        dataType: "json";
        columnType: "PgJson";
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
    environmentVariables: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "environment_variables";
        tableName: "tool_configurations";
        dataType: "json";
        columnType: "PgJson";
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
    credentials: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "credentials";
        tableName: "tool_configurations";
        dataType: "json";
        columnType: "PgJson";
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
    isActive: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "is_active";
        tableName: "tool_configurations";
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
    isValid: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "is_valid";
        tableName: "tool_configurations";
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
    validationErrors: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "validation_errors";
        tableName: "tool_configurations";
        dataType: "json";
        columnType: "PgJson";
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
    lastValidated: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_validated";
        tableName: "tool_configurations";
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
    usageCount: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "usage_count";
        tableName: "tool_configurations";
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
    lastUsed: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_used";
        tableName: "tool_configurations";
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
    createdBy: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_by";
        tableName: "tool_configurations";
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
    updatedBy: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "updated_by";
        tableName: "tool_configurations";
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
        tableName: "tool_configurations";
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
        tableName: "tool_configurations";
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
export declare const toolUsageAnalytics: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "tool_usage_analytics";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "tool_usage_analytics";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    toolId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tool_id";
        tableName: "tool_usage_analytics";
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
    configurationId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "configuration_id";
        tableName: "tool_usage_analytics";
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
    userId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "user_id";
        tableName: "tool_usage_analytics";
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
    workspaceId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workspace_id";
        tableName: "tool_usage_analytics";
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
    sessionId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "session_id";
        tableName: "tool_usage_analytics";
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
    executionId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "execution_id";
        tableName: "tool_usage_analytics";
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
    startTime: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "start_time";
        tableName: "tool_usage_analytics";
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
    endTime: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "end_time";
        tableName: "tool_usage_analytics";
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
    durationMs: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "duration_ms";
        tableName: "tool_usage_analytics";
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
    success: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "success";
        tableName: "tool_usage_analytics";
        dataType: "boolean";
        columnType: "PgBoolean";
        data: boolean;
        driverParam: boolean;
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
    errorType: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "error_type";
        tableName: "tool_usage_analytics";
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
    errorMessage: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "error_message";
        tableName: "tool_usage_analytics";
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
    inputSize: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "input_size";
        tableName: "tool_usage_analytics";
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
    outputSize: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "output_size";
        tableName: "tool_usage_analytics";
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
    inputParameters: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "input_parameters";
        tableName: "tool_usage_analytics";
        dataType: "json";
        columnType: "PgJson";
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
    cpuUsage: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "cpu_usage";
        tableName: "tool_usage_analytics";
        dataType: "string";
        columnType: "PgNumeric";
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
    memoryUsage: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "memory_usage";
        tableName: "tool_usage_analytics";
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
    networkCalls: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "network_calls";
        tableName: "tool_usage_analytics";
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
        tableName: "tool_usage_analytics";
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
export declare const toolRecommendations: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "tool_recommendations";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "tool_recommendations";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
        tableName: "tool_recommendations";
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
    workspaceId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workspace_id";
        tableName: "tool_recommendations";
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
    sessionId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "session_id";
        tableName: "tool_recommendations";
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
    recommendedToolId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "recommended_tool_id";
        tableName: "tool_recommendations";
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
    recommendationType: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "recommendation_type";
        tableName: "tool_recommendations";
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
    score: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "score";
        tableName: "tool_recommendations";
        dataType: "string";
        columnType: "PgNumeric";
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
    confidence: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "confidence";
        tableName: "tool_recommendations";
        dataType: "string";
        columnType: "PgNumeric";
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
    contextType: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "context_type";
        tableName: "tool_recommendations";
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
    contextData: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "context_data";
        tableName: "tool_recommendations";
        dataType: "json";
        columnType: "PgJson";
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
    triggerEvent: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "trigger_event";
        tableName: "tool_recommendations";
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
    presented: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "presented";
        tableName: "tool_recommendations";
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
    clicked: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "clicked";
        tableName: "tool_recommendations";
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
    used: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "used";
        tableName: "tool_recommendations";
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
    dismissed: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "dismissed";
        tableName: "tool_recommendations";
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
    presentedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "presented_at";
        tableName: "tool_recommendations";
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
    interactedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "interacted_at";
        tableName: "tool_recommendations";
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
    userFeedback: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "user_feedback";
        tableName: "tool_recommendations";
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
    feedbackText: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "feedback_text";
        tableName: "tool_recommendations";
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
    effectiveness: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "effectiveness";
        tableName: "tool_recommendations";
        dataType: "string";
        columnType: "PgNumeric";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "tool_recommendations";
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
        tableName: "tool_recommendations";
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
export declare const subscription: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "subscription";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "subscription";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    plan: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "plan";
        tableName: "subscription";
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
    referenceId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "reference_id";
        tableName: "subscription";
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
    stripeCustomerId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "stripe_customer_id";
        tableName: "subscription";
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
    stripeSubscriptionId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "stripe_subscription_id";
        tableName: "subscription";
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
        tableName: "subscription";
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
    periodStart: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "period_start";
        tableName: "subscription";
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
    periodEnd: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "period_end";
        tableName: "subscription";
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
    cancelAtPeriodEnd: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "cancel_at_period_end";
        tableName: "subscription";
        dataType: "boolean";
        columnType: "PgBoolean";
        data: boolean;
        driverParam: boolean;
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
    seats: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "seats";
        tableName: "subscription";
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
    trialStart: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "trial_start";
        tableName: "subscription";
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
    trialEnd: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "trial_end";
        tableName: "subscription";
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
    metadata: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "metadata";
        tableName: "subscription";
        dataType: "json";
        columnType: "PgJson";
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
  };
  dialect: "pg";
}>;
export declare const userRateLimits: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "user_rate_limits";
  schema: undefined;
  columns: {
    referenceId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "reference_id";
        tableName: "user_rate_limits";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    syncApiRequests: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "sync_api_requests";
        tableName: "user_rate_limits";
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
    asyncApiRequests: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "async_api_requests";
        tableName: "user_rate_limits";
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
    apiEndpointRequests: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "api_endpoint_requests";
        tableName: "user_rate_limits";
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
    windowStart: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "window_start";
        tableName: "user_rate_limits";
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
    lastRequestAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_request_at";
        tableName: "user_rate_limits";
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
    isRateLimited: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "is_rate_limited";
        tableName: "user_rate_limits";
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
    rateLimitResetAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "rate_limit_reset_at";
        tableName: "user_rate_limits";
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
export declare const chat: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "chat";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "chat";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    workflowId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workflow_id";
        tableName: "chat";
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
        tableName: "chat";
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
    subdomain: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "subdomain";
        tableName: "chat";
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
        tableName: "chat";
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
    description: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "description";
        tableName: "chat";
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
        tableName: "chat";
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
    customizations: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "customizations";
        tableName: "chat";
        dataType: "json";
        columnType: "PgJson";
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
    authType: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "auth_type";
        tableName: "chat";
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
    password: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "password";
        tableName: "chat";
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
    allowedEmails: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "allowed_emails";
        tableName: "chat";
        dataType: "json";
        columnType: "PgJson";
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
    outputConfigs: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "output_configs";
        tableName: "chat";
        dataType: "json";
        columnType: "PgJson";
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
        tableName: "chat";
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
        tableName: "chat";
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
export declare const organization: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "organization";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "organization";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    name: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "name";
        tableName: "organization";
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
    slug: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "slug";
        tableName: "organization";
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
    logo: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "logo";
        tableName: "organization";
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
    metadata: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "metadata";
        tableName: "organization";
        dataType: "json";
        columnType: "PgJson";
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
    orgUsageLimit: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "org_usage_limit";
        tableName: "organization";
        dataType: "string";
        columnType: "PgNumeric";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "organization";
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
        tableName: "organization";
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
export declare const member: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "member";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "member";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
        tableName: "member";
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
    organizationId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "organization_id";
        tableName: "member";
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
    role: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "role";
        tableName: "member";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "member";
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
export declare const invitation: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "invitation";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "invitation";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    email: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "email";
        tableName: "invitation";
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
    inviterId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "inviter_id";
        tableName: "invitation";
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
    organizationId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "organization_id";
        tableName: "invitation";
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
    role: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "role";
        tableName: "invitation";
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
    status: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "status";
        tableName: "invitation";
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
    expiresAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "expires_at";
        tableName: "invitation";
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
        tableName: "invitation";
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
export declare const workspace: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "workspace";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "workspace";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    name: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "name";
        tableName: "workspace";
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
    ownerId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "owner_id";
        tableName: "workspace";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "workspace";
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
        tableName: "workspace";
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
export declare const permissionTypeEnum: import("drizzle-orm/pg-core").PgEnum<
  ["admin", "write", "read"]
>;
export declare const workspaceInvitationStatusEnum: import("drizzle-orm/pg-core").PgEnum<
  ["pending", "accepted", "rejected", "cancelled"]
>;
export type WorkspaceInvitationStatus =
  (typeof workspaceInvitationStatusEnum.enumValues)[number];
export declare const workspaceInvitation: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "workspace_invitation";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "workspace_invitation";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
        tableName: "workspace_invitation";
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
    email: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "email";
        tableName: "workspace_invitation";
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
    inviterId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "inviter_id";
        tableName: "workspace_invitation";
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
    role: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "role";
        tableName: "workspace_invitation";
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
    status: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "status";
        tableName: "workspace_invitation";
        dataType: "string";
        columnType: "PgEnumColumn";
        data: "pending" | "rejected" | "cancelled" | "accepted";
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: ["pending", "accepted", "rejected", "cancelled"];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    token: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "token";
        tableName: "workspace_invitation";
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
    permissions: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "permissions";
        tableName: "workspace_invitation";
        dataType: "string";
        columnType: "PgEnumColumn";
        data: "admin" | "write" | "read";
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: ["admin", "write", "read"];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    orgInvitationId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "org_invitation_id";
        tableName: "workspace_invitation";
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
    expiresAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "expires_at";
        tableName: "workspace_invitation";
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
        tableName: "workspace_invitation";
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
        tableName: "workspace_invitation";
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
export declare const permissions: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "permissions";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "permissions";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
        tableName: "permissions";
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
    entityType: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "entity_type";
        tableName: "permissions";
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
    entityId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "entity_id";
        tableName: "permissions";
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
    permissionType: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "permission_type";
        tableName: "permissions";
        dataType: "string";
        columnType: "PgEnumColumn";
        data: "admin" | "write" | "read";
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: ["admin", "write", "read"];
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
        tableName: "permissions";
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
        tableName: "permissions";
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
export declare const memory: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "memory";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "memory";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    workflowId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workflow_id";
        tableName: "memory";
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
    key: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "key";
        tableName: "memory";
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
    type: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "type";
        tableName: "memory";
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
    data: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "data";
        tableName: "memory";
        dataType: "json";
        columnType: "PgJson";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "memory";
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
        tableName: "memory";
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
        tableName: "memory";
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
export declare const knowledgeBase: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "knowledge_base";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "knowledge_base";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
        tableName: "knowledge_base";
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
        tableName: "knowledge_base";
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
    name: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "name";
        tableName: "knowledge_base";
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
    description: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "description";
        tableName: "knowledge_base";
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
    tokenCount: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "token_count";
        tableName: "knowledge_base";
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
    embeddingModel: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "embedding_model";
        tableName: "knowledge_base";
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
    embeddingDimension: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "embedding_dimension";
        tableName: "knowledge_base";
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
    chunkingConfig: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "chunking_config";
        tableName: "knowledge_base";
        dataType: "json";
        columnType: "PgJson";
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
    deletedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "deleted_at";
        tableName: "knowledge_base";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "knowledge_base";
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
        tableName: "knowledge_base";
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
export declare const document: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "document";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "document";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    knowledgeBaseId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "knowledge_base_id";
        tableName: "document";
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
    filename: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "filename";
        tableName: "document";
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
    fileUrl: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "file_url";
        tableName: "document";
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
    fileSize: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "file_size";
        tableName: "document";
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
    mimeType: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "mime_type";
        tableName: "document";
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
    chunkCount: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "chunk_count";
        tableName: "document";
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
    tokenCount: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "token_count";
        tableName: "document";
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
    characterCount: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "character_count";
        tableName: "document";
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
    processingStatus: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "processing_status";
        tableName: "document";
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
        tableName: "document";
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
        tableName: "document";
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
    processingError: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "processing_error";
        tableName: "document";
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
    enabled: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "enabled";
        tableName: "document";
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
    deletedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "deleted_at";
        tableName: "document";
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
    tag1: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tag1";
        tableName: "document";
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
    tag2: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tag2";
        tableName: "document";
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
    tag3: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tag3";
        tableName: "document";
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
    tag4: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tag4";
        tableName: "document";
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
    tag5: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tag5";
        tableName: "document";
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
    tag6: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tag6";
        tableName: "document";
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
    tag7: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tag7";
        tableName: "document";
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
    uploadedAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "uploaded_at";
        tableName: "document";
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
export declare const knowledgeBaseTagDefinitions: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "knowledge_base_tag_definitions";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "knowledge_base_tag_definitions";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    knowledgeBaseId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "knowledge_base_id";
        tableName: "knowledge_base_tag_definitions";
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
    tagSlot: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tag_slot";
        tableName: "knowledge_base_tag_definitions";
        dataType: "string";
        columnType: "PgText";
        data: "tag1" | "tag2" | "tag3" | "tag4" | "tag5" | "tag6" | "tag7";
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7"];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
      },
      {},
      {}
    >;
    displayName: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "display_name";
        tableName: "knowledge_base_tag_definitions";
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
    fieldType: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "field_type";
        tableName: "knowledge_base_tag_definitions";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "knowledge_base_tag_definitions";
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
        tableName: "knowledge_base_tag_definitions";
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
export declare const embedding: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "embedding";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "embedding";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    knowledgeBaseId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "knowledge_base_id";
        tableName: "embedding";
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
    documentId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "document_id";
        tableName: "embedding";
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
    chunkIndex: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "chunk_index";
        tableName: "embedding";
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
    chunkHash: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "chunk_hash";
        tableName: "embedding";
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
    content: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "content";
        tableName: "embedding";
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
    contentLength: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "content_length";
        tableName: "embedding";
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
    tokenCount: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "token_count";
        tableName: "embedding";
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
    embedding: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "embedding";
        tableName: "embedding";
        dataType: "array";
        columnType: "PgVector";
        data: number[];
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
      {
        dimensions: 1536;
      }
    >;
    embeddingModel: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "embedding_model";
        tableName: "embedding";
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
    startOffset: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "start_offset";
        tableName: "embedding";
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
    endOffset: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "end_offset";
        tableName: "embedding";
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
    tag1: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tag1";
        tableName: "embedding";
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
    tag2: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tag2";
        tableName: "embedding";
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
    tag3: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tag3";
        tableName: "embedding";
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
    tag4: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tag4";
        tableName: "embedding";
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
    tag5: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tag5";
        tableName: "embedding";
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
    tag6: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tag6";
        tableName: "embedding";
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
    tag7: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tag7";
        tableName: "embedding";
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
    enabled: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "enabled";
        tableName: "embedding";
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
    contentTsv: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "content_tsv";
        tableName: "embedding";
        dataType: "custom";
        columnType: "PgCustomColumn";
        data: string;
        driverParam: unknown;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: {
          type: "always";
        };
      },
      {},
      {
        pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
      }
    >;
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "embedding";
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
        tableName: "embedding";
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
export declare const docsEmbeddings: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "docs_embeddings";
  schema: undefined;
  columns: {
    chunkId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "chunk_id";
        tableName: "docs_embeddings";
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
    chunkText: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "chunk_text";
        tableName: "docs_embeddings";
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
    sourceDocument: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "source_document";
        tableName: "docs_embeddings";
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
    sourceLink: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "source_link";
        tableName: "docs_embeddings";
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
    headerText: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "header_text";
        tableName: "docs_embeddings";
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
    headerLevel: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "header_level";
        tableName: "docs_embeddings";
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
    tokenCount: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "token_count";
        tableName: "docs_embeddings";
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
    embedding: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "embedding";
        tableName: "docs_embeddings";
        dataType: "array";
        columnType: "PgVector";
        data: number[];
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
      {
        dimensions: 1536;
      }
    >;
    embeddingModel: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "embedding_model";
        tableName: "docs_embeddings";
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
    metadata: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "metadata";
        tableName: "docs_embeddings";
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
    chunkTextTsv: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "chunk_text_tsv";
        tableName: "docs_embeddings";
        dataType: "custom";
        columnType: "PgCustomColumn";
        data: string;
        driverParam: unknown;
        notNull: false;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: {
          type: "always";
        };
      },
      {},
      {
        pgColumnBuilderBrand: "PgCustomColumnBuilderBrand";
      }
    >;
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "docs_embeddings";
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
        tableName: "docs_embeddings";
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
export declare const copilotChats: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "copilot_chats";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "copilot_chats";
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
    userId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "user_id";
        tableName: "copilot_chats";
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
    workflowId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workflow_id";
        tableName: "copilot_chats";
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
        tableName: "copilot_chats";
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
    messages: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "messages";
        tableName: "copilot_chats";
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
    model: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "model";
        tableName: "copilot_chats";
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
    conversationId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "conversation_id";
        tableName: "copilot_chats";
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
    previewYaml: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "preview_yaml";
        tableName: "copilot_chats";
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
        tableName: "copilot_chats";
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
        tableName: "copilot_chats";
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
export declare const workflowCheckpoints: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "workflow_checkpoints";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "workflow_checkpoints";
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
    userId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "user_id";
        tableName: "workflow_checkpoints";
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
    workflowId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workflow_id";
        tableName: "workflow_checkpoints";
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
    chatId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "chat_id";
        tableName: "workflow_checkpoints";
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
    messageId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "message_id";
        tableName: "workflow_checkpoints";
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
    workflowState: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workflow_state";
        tableName: "workflow_checkpoints";
        dataType: "json";
        columnType: "PgJson";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "workflow_checkpoints";
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
        tableName: "workflow_checkpoints";
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
export declare const templates: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "templates";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "templates";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    workflowId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workflow_id";
        tableName: "templates";
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
    userId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "user_id";
        tableName: "templates";
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
    name: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "name";
        tableName: "templates";
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
    description: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "description";
        tableName: "templates";
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
    author: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "author";
        tableName: "templates";
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
    views: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "views";
        tableName: "templates";
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
    stars: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "stars";
        tableName: "templates";
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
    color: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "color";
        tableName: "templates";
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
    icon: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "icon";
        tableName: "templates";
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
    category: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "category";
        tableName: "templates";
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
    state: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "state";
        tableName: "templates";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "templates";
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
        tableName: "templates";
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
export declare const templateStars: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "template_stars";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "template_stars";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
        tableName: "template_stars";
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
    templateId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "template_id";
        tableName: "template_stars";
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
    starredAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "starred_at";
        tableName: "template_stars";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "template_stars";
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
export declare const copilotFeedback: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "copilot_feedback";
  schema: undefined;
  columns: {
    feedbackId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "feedback_id";
        tableName: "copilot_feedback";
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
    userId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "user_id";
        tableName: "copilot_feedback";
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
    chatId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "chat_id";
        tableName: "copilot_feedback";
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
    userQuery: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "user_query";
        tableName: "copilot_feedback";
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
    agentResponse: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "agent_response";
        tableName: "copilot_feedback";
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
    isPositive: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "is_positive";
        tableName: "copilot_feedback";
        dataType: "boolean";
        columnType: "PgBoolean";
        data: boolean;
        driverParam: boolean;
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
    feedback: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "feedback";
        tableName: "copilot_feedback";
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
    workflowYaml: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workflow_yaml";
        tableName: "copilot_feedback";
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
        tableName: "copilot_feedback";
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
        tableName: "copilot_feedback";
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
export * from "./parlant-schema";
export declare const workflowDeploymentVersion: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "workflow_deployment_version";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "workflow_deployment_version";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
    workflowId: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "workflow_id";
        tableName: "workflow_deployment_version";
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
    version: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "version";
        tableName: "workflow_deployment_version";
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
    state: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "state";
        tableName: "workflow_deployment_version";
        dataType: "json";
        columnType: "PgJson";
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
    isActive: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "is_active";
        tableName: "workflow_deployment_version";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "workflow_deployment_version";
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
    createdBy: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_by";
        tableName: "workflow_deployment_version";
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
  };
  dialect: "pg";
}>;
export declare const idempotencyKey: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "idempotency_key";
  schema: undefined;
  columns: {
    key: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "key";
        tableName: "idempotency_key";
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
    namespace: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "namespace";
        tableName: "idempotency_key";
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
    result: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "result";
        tableName: "idempotency_key";
        dataType: "json";
        columnType: "PgJson";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "idempotency_key";
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
export declare const mcpServers: import("drizzle-orm/pg-core").PgTableWithColumns<{
  name: "mcp_servers";
  schema: undefined;
  columns: {
    id: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "id";
        tableName: "mcp_servers";
        dataType: "string";
        columnType: "PgText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: true;
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
        tableName: "mcp_servers";
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
    createdBy: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_by";
        tableName: "mcp_servers";
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
    name: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "name";
        tableName: "mcp_servers";
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
    description: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "description";
        tableName: "mcp_servers";
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
    transport: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "transport";
        tableName: "mcp_servers";
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
    url: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "url";
        tableName: "mcp_servers";
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
    headers: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "headers";
        tableName: "mcp_servers";
        dataType: "json";
        columnType: "PgJson";
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
    timeout: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "timeout";
        tableName: "mcp_servers";
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
    retries: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "retries";
        tableName: "mcp_servers";
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
    enabled: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "enabled";
        tableName: "mcp_servers";
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
    lastConnected: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_connected";
        tableName: "mcp_servers";
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
    connectionStatus: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "connection_status";
        tableName: "mcp_servers";
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
    lastError: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_error";
        tableName: "mcp_servers";
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
    toolCount: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "tool_count";
        tableName: "mcp_servers";
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
    lastToolsRefresh: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_tools_refresh";
        tableName: "mcp_servers";
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
    totalRequests: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "total_requests";
        tableName: "mcp_servers";
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
    lastUsed: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "last_used";
        tableName: "mcp_servers";
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
        tableName: "mcp_servers";
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
    createdAt: import("drizzle-orm/pg-core").PgColumn<
      {
        name: "created_at";
        tableName: "mcp_servers";
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
        tableName: "mcp_servers";
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
  }>,
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
  }>,
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
  }>,
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
  }>,
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
export declare const messageStatusEnum: import("drizzle-orm/pg-core").PgEnum<
    ["pending", "sent", "delivered", "read", "failed"]
  >,
  conversationTypeEnum: import("drizzle-orm/pg-core").PgEnum<
    ["direct", "group", "workflow", "support", "onboarding"]
  >,
  messageTypeEnum: import("drizzle-orm/pg-core").PgEnum<
    ["text", "tool_call", "tool_result", "system", "error", "media", "file"]
  >;
export declare const parlantAgent: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_agent";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_agent";
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
          tableName: "parlant_agent";
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
      createdBy: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_by";
          tableName: "parlant_agent";
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
      name: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "name";
          tableName: "parlant_agent";
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
      description: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "description";
          tableName: "parlant_agent";
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
          tableName: "parlant_agent";
          dataType: "string";
          columnType: "PgEnumColumn";
          data: "active" | "inactive" | "archived";
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: ["active", "inactive", "archived"];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      compositionMode: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "composition_mode";
          tableName: "parlant_agent";
          dataType: "string";
          columnType: "PgEnumColumn";
          data: "strict" | "fluid";
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: ["fluid", "strict"];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      systemPrompt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "system_prompt";
          tableName: "parlant_agent";
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
      modelProvider: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "model_provider";
          tableName: "parlant_agent";
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
      modelName: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "model_name";
          tableName: "parlant_agent";
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
      temperature: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "temperature";
          tableName: "parlant_agent";
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
      maxTokens: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "max_tokens";
          tableName: "parlant_agent";
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
      responseTimeoutMs: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "response_timeout_ms";
          tableName: "parlant_agent";
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
      maxContextLength: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "max_context_length";
          tableName: "parlant_agent";
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
      systemInstructions: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "system_instructions";
          tableName: "parlant_agent";
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
      allowInterruption: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "allow_interruption";
          tableName: "parlant_agent";
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
      allowProactiveMessages: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "allow_proactive_messages";
          tableName: "parlant_agent";
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
      conversationStyle: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "conversation_style";
          tableName: "parlant_agent";
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
      dataRetentionDays: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "data_retention_days";
          tableName: "parlant_agent";
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
      allowDataExport: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "allow_data_export";
          tableName: "parlant_agent";
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
      piiHandlingMode: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "pii_handling_mode";
          tableName: "parlant_agent";
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
      integrationMetadata: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "integration_metadata";
          tableName: "parlant_agent";
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
      customConfig: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "custom_config";
          tableName: "parlant_agent";
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
      totalSessions: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "total_sessions";
          tableName: "parlant_agent";
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
      totalMessages: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "total_messages";
          tableName: "parlant_agent";
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
      totalTokensUsed: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "total_tokens_used";
          tableName: "parlant_agent";
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
      totalCost: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "total_cost";
          tableName: "parlant_agent";
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
      averageSessionDuration: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "average_session_duration";
          tableName: "parlant_agent";
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
      lastActiveAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_active_at";
          tableName: "parlant_agent";
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
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "parlant_agent";
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
          tableName: "parlant_agent";
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
          tableName: "parlant_agent";
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
  }>,
  parlantSession: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_session";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_session";
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
      agentId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "agent_id";
          tableName: "parlant_session";
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
          tableName: "parlant_session";
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
          tableName: "parlant_session";
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
      customerId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "customer_id";
          tableName: "parlant_session";
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
      mode: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "mode";
          tableName: "parlant_session";
          dataType: "string";
          columnType: "PgEnumColumn";
          data: "manual" | "auto" | "paused";
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: ["auto", "manual", "paused"];
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
          tableName: "parlant_session";
          dataType: "string";
          columnType: "PgEnumColumn";
          data: "completed" | "active" | "abandoned";
          driverParam: string;
          notNull: true;
          hasDefault: true;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: ["active", "completed", "abandoned"];
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
          tableName: "parlant_session";
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
      metadata: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "metadata";
          tableName: "parlant_session";
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
      currentJourneyId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "current_journey_id";
          tableName: "parlant_session";
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
      currentStateId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "current_state_id";
          tableName: "parlant_session";
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
      variables: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "variables";
          tableName: "parlant_session";
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
      eventCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "event_count";
          tableName: "parlant_session";
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
      messageCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "message_count";
          tableName: "parlant_session";
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
      tokensUsed: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "tokens_used";
          tableName: "parlant_session";
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
      cost: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "cost";
          tableName: "parlant_session";
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
      averageResponseTime: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "average_response_time";
          tableName: "parlant_session";
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
          tableName: "parlant_session";
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
      sessionType: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "session_type";
          tableName: "parlant_session";
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
      tags: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "tags";
          tableName: "parlant_session";
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
      userAgent: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "user_agent";
          tableName: "parlant_session";
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
          tableName: "parlant_session";
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
          tableName: "parlant_session";
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
          tableName: "parlant_session";
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
          tableName: "parlant_session";
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
      startedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "started_at";
          tableName: "parlant_session";
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
      lastActivityAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_activity_at";
          tableName: "parlant_session";
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
      endedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "ended_at";
          tableName: "parlant_session";
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
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "parlant_session";
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
          tableName: "parlant_session";
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
  }>,
  parlantEvent: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_event";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_event";
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
          tableName: "parlant_event";
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
      offset: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "offset";
          tableName: "parlant_event";
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
      eventType: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "event_type";
          tableName: "parlant_event";
          dataType: "string";
          columnType: "PgEnumColumn";
          data:
            | "customer_message"
            | "agent_message"
            | "tool_call"
            | "tool_result"
            | "status_update"
            | "journey_transition"
            | "variable_update";
          driverParam: string;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: [
            "customer_message",
            "agent_message",
            "tool_call",
            "tool_result",
            "status_update",
            "journey_transition",
            "variable_update",
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
          tableName: "parlant_event";
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
      metadata: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "metadata";
          tableName: "parlant_event";
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
          tableName: "parlant_event";
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
      journeyId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "journey_id";
          tableName: "parlant_event";
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
      stateId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "state_id";
          tableName: "parlant_event";
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
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "parlant_event";
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
  }>,
  parlantGuideline: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_guideline";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_guideline";
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
      agentId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "agent_id";
          tableName: "parlant_guideline";
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
      condition: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "condition";
          tableName: "parlant_guideline";
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
      action: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "action";
          tableName: "parlant_guideline";
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
      priority: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "priority";
          tableName: "parlant_guideline";
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
      enabled: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "enabled";
          tableName: "parlant_guideline";
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
      toolIds: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "tool_ids";
          tableName: "parlant_guideline";
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
      matchCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "match_count";
          tableName: "parlant_guideline";
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
      lastMatchedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_matched_at";
          tableName: "parlant_guideline";
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
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "parlant_guideline";
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
          tableName: "parlant_guideline";
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
  }>,
  parlantJourney: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_journey";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_journey";
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
      agentId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "agent_id";
          tableName: "parlant_journey";
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
      title: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "title";
          tableName: "parlant_journey";
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
      description: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "description";
          tableName: "parlant_journey";
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
      conditions: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "conditions";
          tableName: "parlant_journey";
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
      enabled: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "enabled";
          tableName: "parlant_journey";
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
      allowSkipping: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "allow_skipping";
          tableName: "parlant_journey";
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
      allowRevisiting: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "allow_revisiting";
          tableName: "parlant_journey";
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
      totalSessions: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "total_sessions";
          tableName: "parlant_journey";
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
      completionRate: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "completion_rate";
          tableName: "parlant_journey";
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
      lastUsedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_used_at";
          tableName: "parlant_journey";
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
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "parlant_journey";
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
          tableName: "parlant_journey";
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
  }>,
  parlantJourneyState: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_journey_state";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_journey_state";
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
      journeyId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "journey_id";
          tableName: "parlant_journey_state";
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
      name: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "name";
          tableName: "parlant_journey_state";
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
      stateType: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "state_type";
          tableName: "parlant_journey_state";
          dataType: "string";
          columnType: "PgEnumColumn";
          data: "chat" | "tool" | "decision" | "final";
          driverParam: string;
          notNull: true;
          hasDefault: false;
          isPrimaryKey: false;
          isAutoincrement: false;
          hasRuntimeDefault: false;
          enumValues: ["chat", "tool", "decision", "final"];
          baseColumn: never;
          identity: undefined;
          generated: undefined;
        },
        {},
        {}
      >;
      chatPrompt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "chat_prompt";
          tableName: "parlant_journey_state";
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
      toolId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "tool_id";
          tableName: "parlant_journey_state";
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
      toolConfig: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "tool_config";
          tableName: "parlant_journey_state";
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
      condition: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "condition";
          tableName: "parlant_journey_state";
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
      isInitial: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "is_initial";
          tableName: "parlant_journey_state";
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
      isFinal: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "is_final";
          tableName: "parlant_journey_state";
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
      allowSkip: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "allow_skip";
          tableName: "parlant_journey_state";
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
      metadata: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "metadata";
          tableName: "parlant_journey_state";
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
          tableName: "parlant_journey_state";
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
          tableName: "parlant_journey_state";
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
  }>,
  parlantJourneyTransition: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_journey_transition";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_journey_transition";
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
      journeyId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "journey_id";
          tableName: "parlant_journey_transition";
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
      fromStateId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "from_state_id";
          tableName: "parlant_journey_transition";
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
      toStateId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "to_state_id";
          tableName: "parlant_journey_transition";
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
      condition: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "condition";
          tableName: "parlant_journey_transition";
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
          tableName: "parlant_journey_transition";
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
      useCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "use_count";
          tableName: "parlant_journey_transition";
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
      lastUsedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_used_at";
          tableName: "parlant_journey_transition";
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
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "parlant_journey_transition";
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
  }>,
  parlantVariable: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_variable";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_variable";
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
      agentId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "agent_id";
          tableName: "parlant_variable";
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
      sessionId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "session_id";
          tableName: "parlant_variable";
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
      key: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "key";
          tableName: "parlant_variable";
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
      scope: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "scope";
          tableName: "parlant_variable";
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
      value: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "value";
          tableName: "parlant_variable";
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
      valueType: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "value_type";
          tableName: "parlant_variable";
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
      isPrivate: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "is_private";
          tableName: "parlant_variable";
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
      description: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "description";
          tableName: "parlant_variable";
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
          tableName: "parlant_variable";
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
          tableName: "parlant_variable";
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
  }>,
  parlantTool: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_tool";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_tool";
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
          tableName: "parlant_tool";
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
      name: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "name";
          tableName: "parlant_tool";
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
      displayName: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "display_name";
          tableName: "parlant_tool";
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
      description: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "description";
          tableName: "parlant_tool";
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
      simToolId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "sim_tool_id";
          tableName: "parlant_tool";
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
      toolType: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "tool_type";
          tableName: "parlant_tool";
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
      parameters: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "parameters";
          tableName: "parlant_tool";
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
      returnSchema: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "return_schema";
          tableName: "parlant_tool";
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
      usageGuidelines: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "usage_guidelines";
          tableName: "parlant_tool";
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
      errorHandling: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "error_handling";
          tableName: "parlant_tool";
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
      executionTimeout: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "execution_timeout";
          tableName: "parlant_tool";
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
      retryPolicy: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "retry_policy";
          tableName: "parlant_tool";
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
      rateLimitPerMinute: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "rate_limit_per_minute";
          tableName: "parlant_tool";
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
      rateLimitPerHour: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "rate_limit_per_hour";
          tableName: "parlant_tool";
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
      requiresAuth: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "requires_auth";
          tableName: "parlant_tool";
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
      authType: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "auth_type";
          tableName: "parlant_tool";
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
      authConfig: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "auth_config";
          tableName: "parlant_tool";
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
      enabled: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "enabled";
          tableName: "parlant_tool";
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
      isPublic: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "is_public";
          tableName: "parlant_tool";
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
      isDeprecated: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "is_deprecated";
          tableName: "parlant_tool";
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
      useCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "use_count";
          tableName: "parlant_tool";
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
      successRate: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "success_rate";
          tableName: "parlant_tool";
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
      lastUsedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_used_at";
          tableName: "parlant_tool";
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
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "parlant_tool";
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
          tableName: "parlant_tool";
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
  }>,
  parlantTerm: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_term";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_term";
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
      agentId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "agent_id";
          tableName: "parlant_term";
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
      name: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "name";
          tableName: "parlant_term";
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
      description: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "description";
          tableName: "parlant_term";
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
      synonyms: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "synonyms";
          tableName: "parlant_term";
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
      category: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "category";
          tableName: "parlant_term";
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
      examples: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "examples";
          tableName: "parlant_term";
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
      importance: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "importance";
          tableName: "parlant_term";
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
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "parlant_term";
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
          tableName: "parlant_term";
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
  }>,
  parlantCannedResponse: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_canned_response";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_canned_response";
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
      agentId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "agent_id";
          tableName: "parlant_canned_response";
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
      template: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "template";
          tableName: "parlant_canned_response";
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
      category: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "category";
          tableName: "parlant_canned_response";
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
      tags: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "tags";
          tableName: "parlant_canned_response";
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
      conditions: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "conditions";
          tableName: "parlant_canned_response";
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
      priority: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "priority";
          tableName: "parlant_canned_response";
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
      enabled: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "enabled";
          tableName: "parlant_canned_response";
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
      requiresExactMatch: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "requires_exact_match";
          tableName: "parlant_canned_response";
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
      useCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "use_count";
          tableName: "parlant_canned_response";
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
      lastUsedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_used_at";
          tableName: "parlant_canned_response";
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
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "parlant_canned_response";
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
          tableName: "parlant_canned_response";
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
  }>,
  parlantAgentWorkflow: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_agent_workflow";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_agent_workflow";
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
      agentId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "agent_id";
          tableName: "parlant_agent_workflow";
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
      workflowId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "workflow_id";
          tableName: "parlant_agent_workflow";
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
          tableName: "parlant_agent_workflow";
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
      integrationType: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "integration_type";
          tableName: "parlant_agent_workflow";
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
      enabled: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "enabled";
          tableName: "parlant_agent_workflow";
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
      triggerConditions: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "trigger_conditions";
          tableName: "parlant_agent_workflow";
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
      inputMapping: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "input_mapping";
          tableName: "parlant_agent_workflow";
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
      monitorEvents: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "monitor_events";
          tableName: "parlant_agent_workflow";
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
      outputMapping: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "output_mapping";
          tableName: "parlant_agent_workflow";
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
      triggerCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "trigger_count";
          tableName: "parlant_agent_workflow";
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
      lastTriggeredAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_triggered_at";
          tableName: "parlant_agent_workflow";
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
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "parlant_agent_workflow";
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
          tableName: "parlant_agent_workflow";
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
  }>,
  parlantAgentApiKey: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_agent_api_key";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_agent_api_key";
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
      agentId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "agent_id";
          tableName: "parlant_agent_api_key";
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
      apiKeyId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "api_key_id";
          tableName: "parlant_agent_api_key";
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
          tableName: "parlant_agent_api_key";
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
      purpose: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "purpose";
          tableName: "parlant_agent_api_key";
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
      enabled: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "enabled";
          tableName: "parlant_agent_api_key";
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
      priority: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "priority";
          tableName: "parlant_agent_api_key";
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
      useCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "use_count";
          tableName: "parlant_agent_api_key";
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
      lastUsedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_used_at";
          tableName: "parlant_agent_api_key";
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
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "parlant_agent_api_key";
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
          tableName: "parlant_agent_api_key";
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
  }>,
  parlantSessionWorkflow: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_session_workflow";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_session_workflow";
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
          tableName: "parlant_session_workflow";
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
      workflowId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "workflow_id";
          tableName: "parlant_session_workflow";
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
      executionId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "execution_id";
          tableName: "parlant_session_workflow";
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
      triggerReason: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "trigger_reason";
          tableName: "parlant_session_workflow";
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
      inputData: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "input_data";
          tableName: "parlant_session_workflow";
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
      outputData: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "output_data";
          tableName: "parlant_session_workflow";
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
      status: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "status";
          tableName: "parlant_session_workflow";
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
      startedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "started_at";
          tableName: "parlant_session_workflow";
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
      completedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "completed_at";
          tableName: "parlant_session_workflow";
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
      errorMessage: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "error_message";
          tableName: "parlant_session_workflow";
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
          tableName: "parlant_session_workflow";
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
          tableName: "parlant_session_workflow";
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
  }>,
  parlantAgentTool: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_agent_tool";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_agent_tool";
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
      agentId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "agent_id";
          tableName: "parlant_agent_tool";
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
      toolId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "tool_id";
          tableName: "parlant_agent_tool";
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
      configuration: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "configuration";
          tableName: "parlant_agent_tool";
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
      enabled: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "enabled";
          tableName: "parlant_agent_tool";
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
      priority: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "priority";
          tableName: "parlant_agent_tool";
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
      useCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "use_count";
          tableName: "parlant_agent_tool";
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
      lastUsedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_used_at";
          tableName: "parlant_agent_tool";
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
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "parlant_agent_tool";
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
          tableName: "parlant_agent_tool";
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
  }>,
  parlantJourneyGuideline: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_journey_guideline";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_journey_guideline";
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
      journeyId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "journey_id";
          tableName: "parlant_journey_guideline";
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
      guidelineId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "guideline_id";
          tableName: "parlant_journey_guideline";
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
      priorityOverride: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "priority_override";
          tableName: "parlant_journey_guideline";
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
      enabled: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "enabled";
          tableName: "parlant_journey_guideline";
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
      journeySpecificCondition: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "journey_specific_condition";
          tableName: "parlant_journey_guideline";
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
      matchCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "match_count";
          tableName: "parlant_journey_guideline";
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
      lastMatchedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_matched_at";
          tableName: "parlant_journey_guideline";
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
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "parlant_journey_guideline";
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
          tableName: "parlant_journey_guideline";
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
  }>,
  parlantAgentKnowledgeBase: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_agent_knowledge_base";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_agent_knowledge_base";
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
      agentId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "agent_id";
          tableName: "parlant_agent_knowledge_base";
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
      knowledgeBaseId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "knowledge_base_id";
          tableName: "parlant_agent_knowledge_base";
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
      enabled: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "enabled";
          tableName: "parlant_agent_knowledge_base";
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
      searchThreshold: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "search_threshold";
          tableName: "parlant_agent_knowledge_base";
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
      maxResults: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "max_results";
          tableName: "parlant_agent_knowledge_base";
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
      priority: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "priority";
          tableName: "parlant_agent_knowledge_base";
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
      searchCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "search_count";
          tableName: "parlant_agent_knowledge_base";
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
      lastSearchedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_searched_at";
          tableName: "parlant_agent_knowledge_base";
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
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "parlant_agent_knowledge_base";
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
          tableName: "parlant_agent_knowledge_base";
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
  }>,
  parlantToolIntegration: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_tool_integration";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_tool_integration";
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
      parlantToolId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "parlant_tool_id";
          tableName: "parlant_tool_integration";
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
      integrationType: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "integration_type";
          tableName: "parlant_tool_integration";
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
      targetId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "target_id";
          tableName: "parlant_tool_integration";
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
      configuration: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "configuration";
          tableName: "parlant_tool_integration";
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
      enabled: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "enabled";
          tableName: "parlant_tool_integration";
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
      parameterMapping: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "parameter_mapping";
          tableName: "parlant_tool_integration";
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
      responseMapping: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "response_mapping";
          tableName: "parlant_tool_integration";
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
      lastHealthCheck: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_health_check";
          tableName: "parlant_tool_integration";
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
      healthStatus: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "health_status";
          tableName: "parlant_tool_integration";
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
      errorCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "error_count";
          tableName: "parlant_tool_integration";
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
      lastError: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_error";
          tableName: "parlant_tool_integration";
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
          tableName: "parlant_tool_integration";
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
          tableName: "parlant_tool_integration";
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
  }>,
  parlantWorkflowTemplate: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_workflow_template";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_workflow_template";
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
          tableName: "parlant_workflow_template";
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
      name: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "name";
          tableName: "parlant_workflow_template";
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
      description: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "description";
          tableName: "parlant_workflow_template";
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
      workflowId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "workflow_id";
          tableName: "parlant_workflow_template";
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
      version: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "version";
          tableName: "parlant_workflow_template";
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
      workflowData: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "workflow_data";
          tableName: "parlant_workflow_template";
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
      tags: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "tags";
          tableName: "parlant_workflow_template";
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
              tableName: "parlant_workflow_template";
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
      usageCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "usage_count";
          tableName: "parlant_workflow_template";
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
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "parlant_workflow_template";
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
          tableName: "parlant_workflow_template";
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
      createdBy: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_by";
          tableName: "parlant_workflow_template";
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
    };
    dialect: "pg";
  }>,
  parlantTemplateParameter: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_template_parameter";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_template_parameter";
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
      templateId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "template_id";
          tableName: "parlant_template_parameter";
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
      name: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "name";
          tableName: "parlant_template_parameter";
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
      type: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "type";
          tableName: "parlant_template_parameter";
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
      description: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "description";
          tableName: "parlant_template_parameter";
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
      defaultValue: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "default_value";
          tableName: "parlant_template_parameter";
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
      required: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "required";
          tableName: "parlant_template_parameter";
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
      validation: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "validation";
          tableName: "parlant_template_parameter";
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
      displayOrder: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "display_order";
          tableName: "parlant_template_parameter";
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
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "parlant_template_parameter";
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
          tableName: "parlant_template_parameter";
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
  }>,
  parlantConversionCache: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_conversion_cache";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_conversion_cache";
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
      cacheKey: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "cache_key";
          tableName: "parlant_conversion_cache";
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
      workflowId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "workflow_id";
          tableName: "parlant_conversion_cache";
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
      templateId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "template_id";
          tableName: "parlant_conversion_cache";
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
      workspaceId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "workspace_id";
          tableName: "parlant_conversion_cache";
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
      parametersHash: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "parameters_hash";
          tableName: "parlant_conversion_cache";
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
      conversionResult: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "conversion_result";
          tableName: "parlant_conversion_cache";
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
      sizeBytes: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "size_bytes";
          tableName: "parlant_conversion_cache";
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
      hitCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "hit_count";
          tableName: "parlant_conversion_cache";
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
      lastAccessed: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "last_accessed";
          tableName: "parlant_conversion_cache";
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
      expiresAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "expires_at";
          tableName: "parlant_conversion_cache";
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
          tableName: "parlant_conversion_cache";
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
  }>,
  parlantConversionHistory: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_conversion_history";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_conversion_history";
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
      conversionId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "conversion_id";
          tableName: "parlant_conversion_history";
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
      workflowId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "workflow_id";
          tableName: "parlant_conversion_history";
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
      templateId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "template_id";
          tableName: "parlant_conversion_history";
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
      workspaceId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "workspace_id";
          tableName: "parlant_conversion_history";
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
          tableName: "parlant_conversion_history";
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
      agentId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "agent_id";
          tableName: "parlant_conversion_history";
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
      parameters: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "parameters";
          tableName: "parlant_conversion_history";
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
      status: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "status";
          tableName: "parlant_conversion_history";
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
      result: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "result";
          tableName: "parlant_conversion_history";
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
      errorDetails: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "error_details";
          tableName: "parlant_conversion_history";
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
      metadata: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "metadata";
          tableName: "parlant_conversion_history";
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
      durationMs: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "duration_ms";
          tableName: "parlant_conversion_history";
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
      blocksConverted: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "blocks_converted";
          tableName: "parlant_conversion_history";
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
      edgesConverted: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "edges_converted";
          tableName: "parlant_conversion_history";
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
      warningsCount: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "warnings_count";
          tableName: "parlant_conversion_history";
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
      cacheHit: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "cache_hit";
          tableName: "parlant_conversion_history";
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
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "parlant_conversion_history";
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
      startedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "started_at";
          tableName: "parlant_conversion_history";
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
      completedAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "completed_at";
          tableName: "parlant_conversion_history";
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
  }>,
  parlantJourneyGenerationHistory: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "parlant_journey_generation_history";
    schema: undefined;
    columns: {
      id: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "id";
          tableName: "parlant_journey_generation_history";
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
      journeyId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "journey_id";
          tableName: "parlant_journey_generation_history";
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
      conversionId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "conversion_id";
          tableName: "parlant_journey_generation_history";
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
      templateId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "template_id";
          tableName: "parlant_journey_generation_history";
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
      workflowId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "workflow_id";
          tableName: "parlant_journey_generation_history";
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
      agentId: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "agent_id";
          tableName: "parlant_journey_generation_history";
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
          tableName: "parlant_journey_generation_history";
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
          tableName: "parlant_journey_generation_history";
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
      parametersUsed: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "parameters_used";
          tableName: "parlant_journey_generation_history";
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
      journeyTitle: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "journey_title";
          tableName: "parlant_journey_generation_history";
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
      journeyDescription: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "journey_description";
          tableName: "parlant_journey_generation_history";
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
      stepsCreated: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "steps_created";
          tableName: "parlant_journey_generation_history";
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
      optimizationLevel: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "optimization_level";
          tableName: "parlant_journey_generation_history";
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
      createdAt: import("drizzle-orm/pg-core").PgColumn<
        {
          name: "created_at";
          tableName: "parlant_journey_generation_history";
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
          tableName: "parlant_journey_generation_history";
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
export declare const agentStatusEnum: import("drizzle-orm/pg-core").PgEnum<
    ["active", "inactive", "archived"]
  >,
  sessionModeEnum: import("drizzle-orm/pg-core").PgEnum<
    ["auto", "manual", "paused"]
  >,
  sessionStatusEnum: import("drizzle-orm/pg-core").PgEnum<
    ["active", "completed", "abandoned"]
  >,
  eventTypeEnum: import("drizzle-orm/pg-core").PgEnum<
    [
      "customer_message",
      "agent_message",
      "tool_call",
      "tool_result",
      "status_update",
      "journey_transition",
      "variable_update",
    ]
  >,
  journeyStateTypeEnum: import("drizzle-orm/pg-core").PgEnum<
    ["chat", "tool", "decision", "final"]
  >,
  compositionModeEnum: import("drizzle-orm/pg-core").PgEnum<
    ["fluid", "strict"]
  >;
