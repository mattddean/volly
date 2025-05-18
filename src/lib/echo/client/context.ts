import { createContext, useContext } from "react";
import type * as schema from "~/db/schema";
import { ClientContext, setupSync } from "~/echo/client";

const wasmDb = {} as any; // placeholder
const clientCtx = new ClientContext(wasmDb, {});
const syncClient = setupSync(
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws",
);

export interface EchoContextType {
  clientCtx: ClientContext<typeof schema>;
  syncClient: ReturnType<typeof setupSync>;
}

export const EchoContext = createContext({
  clientCtx,
  syncClient,
});

export function useEchoContext() {
  const context = useContext(EchoContext);
  if (!context) {
    throw new Error("useEchoContext must be used within an EchoContext");
  }
  return context;
}
