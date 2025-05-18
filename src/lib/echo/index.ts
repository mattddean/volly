// Core exports
export * from "./types";
export * from "./core";

// Import isClient to determine environment
import { isClient } from "./core";

// Dynamic imports
// Note: This approach avoids the linter errors by using a wrapper function
// that can be called at runtime instead of top-level exports

/**
 * get the client implementation
 */
export async function getClientImplementation() {
  if (!isClient) {
    throw new Error(
      "Client implementation can only be used in browser environments",
    );
  }

  // Use dynamic import instead of require
  const client = await import("./client");
  return client;
}

/**
 * get the server implementation
 */
export async function getServerImplementation() {
  if (isClient) {
    throw new Error(
      "Server implementation can only be used in server environments",
    );
  }

  // Use dynamic import instead of require
  const server = await import("./server");
  return server;
}
