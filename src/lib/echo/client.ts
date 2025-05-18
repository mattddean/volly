import {
  type Operation,
  type OperationContext,
  OptimisticUpdateConflict,
} from "./types";
import { isClient } from "./core";

// make sure this file is only used on the client
if (!isClient) {
  throw new Error("client.ts should only be imported on the client");
}

/**
 * client context implementation
 */
export class ClientContext implements OperationContext {
  constructor(
    private adapter: any,
    private schema: any,
  ) {}

  get db() {
    // create proxy tables to access the client database
    // implementation would come later
    return {} as any;
  }
}

/**
 * setup sync between client and server
 */
export function setupSync(wsUrl: string) {
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
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "db_change") {
      // apply remote changes to local database
      applyRemoteChange(data.change);
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
  function applyRemoteChange(change: any) {
    // implementation would come later
    console.log("Applying remote change:", change);
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
export function useOperation<TInput, TOutput>(
  operation: Operation<TInput, TOutput>,
  syncClient: ReturnType<typeof setupSync>,
  clientCtx: ClientContext,
  options: {
    onConflict?: (clientChange: TOutput, serverState: any) => Promise<any>;
  } = {},
) {
  // this would normally use react hooks
  // but we'll just return the execute function for now

  const execute = async (input: TInput): Promise<TOutput> => {
    try {
      // run optimistically in local database
      const optimisticResult = await operation.execute(clientCtx, input as any);

      try {
        // send to server
        const serverResult = await syncClient.execute<TInput, TOutput>(
          operation.name,
          input,
        );
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
            return await syncClient.forceExecute<TInput, TOutput>(
              operation.name,
              {
                ...input,
                _force: true,
                version: serverState.version,
              } as TInput & { _force: boolean },
            );
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
            return await syncClient.forceExecute<TInput, TOutput>(
              operation.name,
              { ...input, _resolved: resolved } as TInput & { _resolved: any },
            );
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
