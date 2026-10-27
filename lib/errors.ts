/** An error with an HTTP status and a message that is safe to show the user. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
