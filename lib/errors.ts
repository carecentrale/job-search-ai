/** An error with an HTTP status and a message that is safe to show the user. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** A machine-readable reason, e.g. "house_off" when fuzzyHR's own AI key isn't set yet. */
    public code?: string,
  ) {
    super(message);
  }
}
