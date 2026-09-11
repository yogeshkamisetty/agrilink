/** A business-rule violation the caller can act on. Maps to a 4xx response. */
export class DomainError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 404 | 409 = 409,
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

export const notFound = (what: string) => new DomainError(`${what} not found`, 404)
