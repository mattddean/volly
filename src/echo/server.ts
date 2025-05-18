import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgTable } from "drizzle-orm/pg-core";
import { isClient } from "./core";
import type {
  OperationContext,
  ServerOperationContext,
  TSchemaType,
} from "./types";

// make sure this file is only used on the server
if (isClient) {
  throw new Error("server.ts should only be imported on the server");
}

/**
 * server context implementation
 */
export class ServerContext<TSchema extends TSchemaType>
  implements ServerOperationContext<TSchema>
{
  public client: false = false;
  public server: true = true;

  constructor(
    private adapter: NodePgDatabase<TSchema>,
    private dbSchema: Record<string, PgTable>,
  ) {}

  get db() {
    return this.adapter;
  }

  get schema() {
    return this.dbSchema;
  }

  // optional: add transaction support
  async transaction<T>(
    callback: (txCtx: OperationContext<TSchema>) => Promise<T>,
  ): Promise<T> {
    // implementation would depend on the actual database adapter
    // this is just a placeholder
    return callback(this);
  }
}

/**
 * register operations on the server
 */
export function registerOperations<TSchema extends TSchemaType>(
  operations: Record<string, any>,
  context: ServerContext<TSchema>,
) {
  const registry = new Map<string, any>();

  // register each operation
  for (const [name, operation] of Object.entries(operations)) {
    registry.set(operation.name || name, operation);
  }

  return {
    // execute a registered operation
    execute: async (operationName: string, input: any) => {
      const operation = registry.get(operationName);
      if (!operation) {
        throw new Error(`Operation not found: ${operationName}`);
      }

      try {
        // validate input if possible
        const validatedInput = operation.input
          ? operation.input.parse(input)
          : input;

        // execute the operation
        return await operation.execute(context, validatedInput);
      } catch (err) {
        console.error(`Error executing operation ${operationName}:`, err);
        throw err;
      }
    },

    // force execute an operation (for conflict resolution)
    forceExecute: async (operationName: string, input: any) => {
      const operation = registry.get(operationName);
      if (!operation) {
        throw new Error(`Operation not found: ${operationName}`);
      }

      try {
        // if we have a resolved state, use that directly
        if (input._resolved) {
          // return the pre-resolved state
          return input._resolved;
        }

        // otherwise just execute normally but ignoring version checks
        const validatedInput = operation.input
          ? operation.input.parse(input)
          : input;
        return await operation.execute(context, validatedInput);
      } catch (err) {
        console.error(`Error force executing operation ${operationName}:`, err);
        throw err;
      }
    },

    // get latest state of a record
    getLatest: async (tableName: string, id: string) => {
      // implementation would depend on the database adapter
      return (
        context.db
          .select()
          .from(context.schema[tableName])
          // @ts-expect-error TODO: express via types that id must be a property of every table
          .where(eq(context.schema[tableName].id, id))
      );
    },
  };
}

/**
 * setup websocket server for realtime updates
 */
export function setupWebSocketServer(
  server: any,
  registry: ReturnType<typeof registerOperations>,
) {
  // this would be implemented with a proper WebSocket server
  // like ws, socket.io, etc.
  // this is just a placeholder for the concept

  server.on("connection", (socket: any) => {
    socket.on("message", async (message: string) => {
      try {
        const data = JSON.parse(message);

        if (data.type === "execute") {
          try {
            const result = await registry.execute(data.operation, data.input);
            socket.send(
              JSON.stringify({
                type: "operation_result",
                id: data.id,
                result,
              }),
            );

            // broadcast changes to all connected clients
            broadcastChange(server, {
              operation: data.operation,
              result,
            });
          } catch (err) {
            socket.send(
              JSON.stringify({
                type: "operation_result",
                id: data.id,
                error: err instanceof Error ? err.message : "Unknown error",
              }),
            );
          }
        } else if (data.type === "force_execute") {
          try {
            const result = await registry.forceExecute(
              data.operation,
              data.input,
            );
            socket.send(
              JSON.stringify({
                type: "operation_result",
                id: data.id,
                result,
              }),
            );

            // broadcast changes to all connected clients
            broadcastChange(server, {
              operation: data.operation,
              result,
            });
          } catch (err) {
            socket.send(
              JSON.stringify({
                type: "operation_result",
                id: data.id,
                error: err instanceof Error ? err.message : "Unknown error",
              }),
            );
          }
        } else if (data.type === "get_latest") {
          try {
            const result = await registry.getLatest(
              data.tableName,
              data.recordId,
            );
            socket.send(
              JSON.stringify({
                type: "operation_result",
                id: data.id,
                result,
              }),
            );
          } catch (err) {
            socket.send(
              JSON.stringify({
                type: "operation_result",
                id: data.id,
                error: err instanceof Error ? err.message : "Unknown error",
              }),
            );
          }
        }
      } catch (err) {
        console.error("Error handling websocket message:", err);
      }
    });
  });
}

// helper to broadcast changes to all clients
function broadcastChange(server: any, change: any) {
  server.clients.forEach((client: any) => {
    if (client.readyState === client.OPEN) {
      client.send(
        JSON.stringify({
          type: "db_change",
          change,
        }),
      );
    }
  });
}
