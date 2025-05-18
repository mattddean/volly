/**
 * core type definitions for echo optimistic update system
 */

// a simplified context interface that will be available in both client and server
export interface OperationContext {
  db: DatabaseInterface;
  // can add more context properties later (auth, etc.)
}

// database interface that abstracts away the underlying implementation
export interface DatabaseInterface {
  [tableName: string]: TableAdapter;
}

// adapter for table operations
export interface TableAdapter {
  insert: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  updateWhere: (
    condition: any,
    data: any,
  ) => Promise<{ affectedRows: number; row?: any }>;
  delete: (id: string) => Promise<void>;
  where: (filter: any) => QueryBuilder;
  get: (id: string) => Promise<any>;
  findMany: (options?: { where?: any; orderBy?: any }) => Promise<any[]>;
}

// query builder interface
export interface QueryBuilder {
  toArray: () => Promise<any[]>;
  first: () => Promise<any | undefined>;
}

// base operation definition
export interface Operation<TInput, TOutput> {
  name: string;
  schema: any; // can replace with proper schema type later
  input: any; // zod schema or similar
  execute: (ctx: OperationContext, input: TInput) => Promise<TOutput>;
  conflictStrategy?: ConflictStrategy;
  resolveConflict?: ConflictResolver<TInput, TOutput>;
}

// conflict handling
export type ConflictStrategy =
  | "client-wins"
  | "server-wins"
  | "merge"
  | "manual";

export type ConflictResolver<TInput, TOutput> = (
  ctx: OperationContext,
  input: TInput,
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
