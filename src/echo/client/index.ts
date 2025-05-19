import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgTable } from "drizzle-orm/pg-core";
import { isClient } from "../core";
import {
  type ClientOperationContext,
  type Operation,
  OptimisticUpdateConflict,
  type TSchemaType,
} from "../types";

// make sure this file is only used on the client
if (!isClient) {
  throw new Error("client.ts should only be imported on the client");
}

/**
 * client context implementation
 */
export class ClientContext<TSchema extends TSchemaType>
  implements ClientOperationContext<TSchema>
{
  public client: true = true;
  public server: false = false;

  constructor(
    public adapter: NodePgDatabase<TSchema>,
    public dbSchema: Record<string, PgTable>,
  ) {}

  get db() {
    return this.adapter;
  }
}

/**
 * setup sync between client and server
 */
export function setupSync<TSchema extends TSchemaType>(
  wsUrl: string,
  clientCtx: ClientContext<TSchema>,
) {
  // create websocket connection
  const ws = new WebSocket(wsUrl);
  const pendingOperations = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (reason: any) => void;
    }
  >();

  // handle messages from server
  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data as string);

    if (data.type === "db_change") {
      // apply remote changes to local database
      // the change object should conform to { table: string; id: string; data: any }
      // where 'data' is the complete new state of the record.
      await applyRemoteChange(data.change);
    }

    if (data.type === "operation_result") {
      // resolve pending operation
      const { id, result, error } = data;
      const pending = pendingOperations.get(id);

      if (pending) {
        if (error) {
          pending.reject(new Error(error));
        } else {
          pending.resolve(result);
        }
        pendingOperations.delete(id);
      }
    }
  };

  // apply changes from server to local database
  async function applyRemoteChange(change: {
    table: string;
    // id: string; // id is expected to be part of change.data for upsert using id column
    data: any;
  }) {
    if (!change || !change.table || !change.data || !change.data.id) {
      console.error("invalid change object received from server:", change);
      return;
    }

    const tableSchema = clientCtx.dbSchema[change.table];
    if (!tableSchema) {
      console.error(
        `table schema not found for table '${change.table}' in clientCtx.dbSchema. available tables:`,
        Object.keys(clientCtx.dbSchema),
      );
      return;
    }

    // assume the table has an 'id' column for conflict target
    // and that change.data contains the full record including the 'id'
    const idColumn = (tableSchema as any).id;
    if (!idColumn) {
      console.error(
        `table '${change.table}' does not have an 'id' column defined in its schema for upserting.`,
      );
      return;
    }

    try {
      console.log(
        `applying remote change to table '${change.table}', id '${change.data.id}':`,
        change.data,
      );
      await clientCtx.adapter
        .insert(tableSchema)
        .values(change.data)
        .onConflictDoUpdate({
          target: idColumn, // use the 'id' column for conflict detection
          set: change.data, // set the entire record
        });
      console.log(
        `successfully applied remote change to table '${change.table}', id '${change.data.id}'`,
      );
    } catch (err) {
      console.error(
        `error applying remote change to table '${change.table}', id '${change.data.id}':`,
        err,
      );
    }
  }

  // generate unique id for operations
  function generateId() {
    return Math.random().toString(36).substring(2, 15);
  }

  return {
    execute: <TInput, TOutput>(
      operationName: string,
      input: TInput,
    ): Promise<TOutput> => {
      return new Promise((resolve, reject) => {
        const id = generateId();
        pendingOperations.set(id, { resolve, reject });

        ws.send(
          JSON.stringify({
            type: "execute",
            id,
            operation: operationName,
            input,
          }),
        );
      });
    },

    getLatest: async (tableName: string, id: string): Promise<any> => {
      return new Promise((resolve, reject) => {
        const opId = generateId();
        pendingOperations.set(opId, { resolve, reject });

        ws.send(
          JSON.stringify({
            type: "get_latest",
            id: opId,
            tableName,
            recordId: id,
          }),
        );
      });
    },

    forceExecute: <TInput, TOutput>(
      operationName: string,
      input: TInput & { _force?: boolean; _resolved?: any },
    ): Promise<TOutput> => {
      return new Promise((resolve, reject) => {
        const id = generateId();
        pendingOperations.set(id, { resolve, reject });

        ws.send(
          JSON.stringify({
            type: "force_execute",
            id,
            operation: operationName,
            input,
          }),
        );
      });
    },
  };
}

/**
 * hook to use operations in components
 */
export function useOperation<
  TInputSchema extends StandardSchemaV1,
  TOutput,
  TSchema extends TSchemaType,
>(
  operation: Operation<TInputSchema, TOutput, TSchema>,
  syncClient: ReturnType<typeof setupSync>,
  clientCtx: ClientContext<TSchema>,
  options: {
    onConflict?: (clientChange: TOutput, serverState: any) => Promise<any>;
  } = {},
) {
  // this would normally use react hooks
  // but we'll just return the execute function for now

  const execute = async (
    input: StandardSchemaV1.InferInput<TInputSchema>,
  ): Promise<TOutput> => {
    try {
      // run optimistically in local database
      const optimisticResult = await operation.execute(clientCtx, input as any);

      try {
        // send to server
        const serverResult = await syncClient.execute<
          StandardSchemaV1.InferInput<TInputSchema>,
          TOutput
        >(operation.name, input);
        return serverResult;
      } catch (err) {
        if (err instanceof OptimisticUpdateConflict) {
          // handle conflict based on strategy
          const serverState = await syncClient.getLatest(
            /* would need table name and id from input */
            "unknownTable",
            (input as any).id || "unknownId",
          );

          if (operation.conflictStrategy === "client-wins") {
            // re-apply client changes with forced update
            return await syncClient.forceExecute<
              StandardSchemaV1.InferInput<TInputSchema>,
              TOutput
            >(operation.name, {
              ...(input as any),
              _force: true,
              version: serverState.version,
            } as StandardSchemaV1.InferInput<TInputSchema> & {
              _force: boolean;
            });
          } else if (operation.conflictStrategy === "merge") {
            // use custom resolver or default
            const resolved = operation.resolveConflict
              ? await operation.resolveConflict(
                  clientCtx,
                  input,
                  optimisticResult,
                  serverState,
                )
              : serverState; // fallback to server state

            // apply resolution
            return await syncClient.forceExecute<
              StandardSchemaV1.InferInput<TInputSchema>,
              TOutput
            >(operation.name, {
              ...(input as any),
              _resolved: resolved,
            } as StandardSchemaV1.InferInput<TInputSchema> & {
              _resolved: any;
            });
          } else if (operation.conflictStrategy === "manual") {
            // surface conflict to UI
            if (options.onConflict) {
              return await options.onConflict(optimisticResult, serverState);
            }
          }
          // default: server-wins - just use server state
          return serverState as TOutput;
        }
        throw err;
      }
    } catch (err) {
      console.error("Operation error:", err);
      throw err;
    }
  };

  return { execute };
}
