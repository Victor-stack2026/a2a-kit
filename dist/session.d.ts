/** A2A conversations are stored with the site's chat sessions under this prefix, so the web chat can't borrow them and admin can tell them apart. */
export declare const A2A_SESSION_PREFIX = "a2a-";
export declare const isA2ASession: (id: string) => boolean;
/** A2A context id → stored chat session id. Odd context ids are hashed, so the same id always maps to the same conversation. */
export declare function a2aSessionId(contextId: string): string;
