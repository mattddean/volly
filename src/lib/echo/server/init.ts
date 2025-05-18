import {
  registerOperations,
  ServerContext,
  setupWebSocketServer,
} from "@echo/server";
import { WebSocketServer } from "ws"; // would need to add this dependency
import { db } from "~/db";
import * as schema from "~/db/schema";
import * as teamOperations from "../operations/teams";
import * as teamsUsersOperations from "../operations/teams-users";

export async function initializeServer() {
  // create server context
  // TODO: remove type assertion
  const serverContext = new ServerContext(db as any, schema);

  // register all operations
  const operationRegistry = registerOperations(
    {
      // team operations
      ...teamOperations,
      ...teamsUsersOperations,
      // other operations...
    },
    serverContext,
  );

  // create websocket server
  const wss = new WebSocketServer({
    port: parseInt(process.env.WS_PORT!),
    path: process.env.WS_PATH!,
  });

  // setup realtime updates
  setupWebSocketServer(wss, operationRegistry);

  console.log("Echo server running on port 8080");

  return {
    operationRegistry,
    wss,
    serverContext,
  };
}
