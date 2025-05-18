import { type ConflictStrategy, type Operation, TSchemaType } from "./types";

/**
 * define an operation that can be executed on both client and server
 */
export function defineOperation<TInput, TOutput, TSchema extends TSchemaType>(
  options: Omit<Operation<TInput, TOutput, TSchema>, "conflictStrategy"> & {
    conflictStrategy?: ConflictStrategy;
  },
): Operation<TInput, TOutput, TSchema> {
  return {
    ...options,
    // default to server-wins if not specified
    conflictStrategy: options.conflictStrategy || "server-wins",
  };
}

/**
 * default resolver for merging conflicts
 */
export async function defaultFieldResolver<T extends Record<string, unknown>>(
  clientChanges: T,
  serverState: T,
): Promise<T> {
  // simple merge that takes client changes but preserves server version
  const merged = { ...serverState };

  for (const [key, value] of Object.entries(clientChanges)) {
    // skip version field to avoid conflicts
    if (key === "version") continue;

    // apply client changes to merged result
    (merged as any)[key] = value;
  }

  return merged;
}

/**
 * helper to create database adapters for both client and server
 */
export function createProxyTables(adapter: any, schema: any): any {
  // to be implemented - creates a proxy to handle table operations
  // this will create a db interface with one property per table
  return {};
}

// export a function to check if we're on client or server
export const isClient = typeof window !== "undefined";
