import { createHash } from "node:crypto"


/** A2A conversations are stored with the site's chat sessions under this prefix, so the web chat can't borrow them and admin can tell them apart. */
export const A2A_SESSION_PREFIX = "a2a-"

export const isA2ASession = (id: string) => id.startsWith(A2A_SESSION_PREFIX)

/** A2A context id → stored chat session id. Odd context ids are hashed, so the same id always maps to the same conversation. */
export function a2aSessionId(contextId: string) {
  const clean = /^[A-Za-z0-9_-]{20,56}$/.test(contextId) ? contextId : createHash("sha256").update(contextId).digest("hex").slice(0, 40)
  return `${A2A_SESSION_PREFIX}${clean}`
}
