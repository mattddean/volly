import type { StandardSchemaV1 } from "@standard-schema/spec";
import { useEchoContext } from "~/lib/echo/client/context";
import type { TSchemaType } from "../types";
import { useOperation } from ".";

export function createClientHelpers<TSchema extends TSchemaType>(
  _schema: TSchema,
) {
  return {
    useOperation: <TInputSchema extends StandardSchemaV1, TOutput>(
      input: Parameters<typeof useOperation<TInputSchema, TOutput, TSchema>>[0],
      options?: Parameters<
        typeof useOperation<TInputSchema, TOutput, TSchema>
      >[3],
    ) => {
      const { clientCtx, syncClient } = useEchoContext();
      return useOperation<TInputSchema, TOutput, TSchema>(
        input,
        syncClient,
        // TODO: remove type assertion
        clientCtx as any,
        options,
      );
    },
  };
}
