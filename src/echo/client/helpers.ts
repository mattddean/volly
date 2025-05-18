import { TSchemaType } from "../types";
import { useOperation } from ".";

export function createClientHelpers<TSchema extends TSchemaType>(
  _schema: TSchema,
) {
  return {
    useOperation: <TInput, TOutput>(
      ...args: Parameters<typeof useOperation<TInput, TOutput, TSchema>>
    ) => {
      return useOperation<TInput, TOutput, TSchema>(...args);
    },
  };
}
