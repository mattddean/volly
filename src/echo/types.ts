import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgTable } from "drizzle-orm/pg-core";

/**
 * core type definitions for echo optimistic update system
 */

export interface ClientOperationContext<TSchema extends TSchemaType> {
  db: NodePgDatabase<TSchema>;
  client: true;
  server: false;
  // can add more context properties later (auth, etc.)
}

export interface ServerOperationContext<TSchema extends TSchemaType> {
  db: NodePgDatabase<TSchema>;
  client: false;
  server: true;
  // can add more context properties later (auth, etc.)
}

export type OperationContext<TSchema extends TSchemaType> =
  | ClientOperationContext<TSchema>
  | ServerOperationContext<TSchema>;

// database interface that abstracts away the underlying implementation
// export interface DatabaseInterface {
//   [tableName: string]: TableAdapter;
// }

// adapter for table operations
// export interface TableAdapter {
//   insert: (data: any) => Promise<any>;
//   update: (id: string, data: any) => Promise<any>;
//   updateWhere: (
//     condition: any,
//     data: any,
//   ) => Promise<{ affectedRows: number; row?: any }>;
//   delete: (id: string) => Promise<void>;
//   where: (filter: any) => QueryBuilder;
//   get: (id: string) => Promise<any>;
//   findMany: (options?: { where?: any; orderBy?: any }) => Promise<any[]>;
// }

// query builder interface
// export interface QueryBuilder {
//   toArray: () => Promise<any[]>;
//   first: () => Promise<any | undefined>;
// }

// base operation definition
export interface Operation<
  TInputSchema extends StandardSchemaV1,
  TOutput,
  TSchema extends TSchemaType,
> {
  name: string;
  description?: string;
  // schema: any; // can replace with proper schema type later
  input: TInputSchema; // zod schema or similar
  execute: (
    ctx: OperationContext<TSchema>,
    input: StandardSchemaV1.InferInput<TInputSchema>,
  ) => Promise<TOutput>;
  conflictStrategy?: ConflictStrategy;
  resolveConflict?: ConflictResolver<TInputSchema, TOutput, TSchema>;
}

// conflict handling
export type ConflictStrategy =
  | "client-wins"
  | "server-wins"
  | "merge"
  | "manual";

export type ConflictResolver<
  TInputSchema extends StandardSchemaV1,
  TOutput,
  TSchema extends TSchemaType,
> = (
  ctx: OperationContext<TSchema>,
  input: StandardSchemaV1.InferInput<TInputSchema>,
  clientChange: TOutput,
  serverState: any,
) => Promise<any>;

// error types
export class OptimisticUpdateConflict extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OptimisticUpdateConflict";
  }
}

export type TSchemaType = Record<string, PgTable>;
