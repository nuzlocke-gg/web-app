import { getURLFromRedirectError } from "next/dist/client/components/redirect"
import { isRedirectError } from "next/dist/client/components/redirect-error"

/**
 * Awaits a call that should end in `redirect()` and returns where it went.
 * Fails when the call returns, or throws anything other than a redirect.
 */
export async function redirectOf(call: Promise<unknown>): Promise<string> {
  try {
    await call
  } catch (error) {
    if (isRedirectError(error)) return getURLFromRedirectError(error)

    throw error
  }

  throw new Error("Expected a redirect, but the call returned.")
}
