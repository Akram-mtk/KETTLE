/** Thrown by services to produce a clean, French-language error for the UI layer. */
export class AppError extends Error {
  constructor(
    readonly kind: 'not_found' | 'bad_request' | 'conflict',
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (what: string) => new AppError('not_found', `${what} introuvable`);
export const badRequest = (message: string, fields?: Record<string, string>) =>
  new AppError('bad_request', message, fields);
export const conflict = (message: string) => new AppError('conflict', message);
