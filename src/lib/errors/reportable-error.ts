/**
 * An error that defines whether it is safe to expose to the user and to log to third party monitoring services.
 *
 * By default, all errors are reportable to logging services, including this error,
 * but you can opt out of logging to third party services by setting `noMonitor` to `true`.
 */
export class ReportableError extends Error {
  public userMessage?: string;
  public noMonitor: boolean;

  constructor(
    message: string,
    { userMessage, noMonitor }: ReportableErrorOptions
  ) {
    super(message);
    this.userMessage = userMessage;
    this.noMonitor = noMonitor ?? false;
  }
}

export interface ReportableErrorOptions {
  /** Define a user-facing error message. If this is not defined, the user should see a generic error message. */
  userMessage?: string;
  /** Disable exposing the error to third party monitoring services. */
  noMonitor?: boolean;
}
