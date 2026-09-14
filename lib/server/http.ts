import { authStatus } from './auth'
import { DomainError } from './errors'

/**
 * Map a thrown error to a JSON response. Authentication failures and
 * business-rule violations are the caller's to act on, so their messages go
 * back; anything else is logged and replaced by a generic message.
 */
export function errorResponse(error: unknown, fallbackMessage: string): Response {
  const auth = authStatus(error)
  if (auth === 401) return Response.json({ error: 'Sign in to continue.' }, { status: 401 })
  if (auth === 403) return Response.json({ error: 'Your account cannot perform this action.' }, { status: 403 })
  if (error instanceof DomainError) return Response.json({ error: error.message }, { status: error.status })
  // Postgres invalid_text_representation: a malformed id in the URL.
  if ((error as { code?: string } | null)?.code === '22P02') return Response.json({ error: 'Not found.' }, { status: 404 })
  console.error('[agrilink/api]', error)
  return Response.json({ error: fallbackMessage }, { status: 500 })
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null)
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
}

export function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
