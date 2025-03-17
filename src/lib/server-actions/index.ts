import { ReportableError } from "~/lib/errors/reportable-error";

export type WithActionResult<T> =
  | {
      data: T;
      error?: never;
      /** User-facing response */
      response: {
        data: T;
        error?: never;
      };
    }
  | {
      data?: never;
      error: unknown;
      /** User-facing response */
      response: {
        data?: never;
        error: {
          message: string;
        };
      };
    };

export type WithActionResultResponse<T> = WithActionResult<T>["response"];

/**
 * Transform a server action's thrown error into serializable data to send back to the client.
 * We don't want to hit error boundaries when server actions throw.
 */
export async function withActionResult<R>(
  fn: () => Promise<R>,
  errorMessage: string
): Promise<WithActionResult<R>> {
  try {
    const data = await fn();
    return {
      data,
      response: {
        data,
      },
    };
  } catch (error: unknown) {
    const monitorMessage = await (async () => {
      if (error instanceof ReportableError && error.noMonitor) {
        return errorMessage;
      }

      if (error instanceof Response) {
        try {
          const text = await error.clone().text();
          return text;
        } catch {
          return errorMessage;
        }
      }

      return (error as Error | undefined | null)?.message ?? errorMessage;
    })();
    const userMessage =
      error instanceof ReportableError && error.userMessage
        ? error.userMessage
        : errorMessage;

    console.error(monitorMessage);

    // We'd like to return an Error as `error`, but an Error object isn't serialized by nextjs server actions
    return {
      data: undefined,
      error,
      response: {
        data: undefined,
        error: {
          message: userMessage,
        },
      },
    };
  }
}
