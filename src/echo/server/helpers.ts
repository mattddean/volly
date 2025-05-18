import { defineOperation } from "../core";
import { type Operation, TSchemaType } from "../types";

export function createServerHelpers<TSchema extends TSchemaType>(
  _schema: TSchema,
) {
  return {
    defineOperation: <TInput, TOutput>(
      ...args: Parameters<typeof defineOperation<TInput, TOutput, TSchema>>
    ): Operation<TInput, TOutput, TSchema> => {
      return defineOperation<TInput, TOutput, TSchema>(...args);
    },
  };
}
