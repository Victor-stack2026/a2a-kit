import { randomUUID } from "node:crypto";
import { Role } from "@a2a-js/sdk";
import { AgentEvent } from "@a2a-js/sdk/server";
import { replyParts, textFromParts } from "./parts.js";
// One message in, one message out: the sales agent answers on the spot and opens no long-running task.
/** What the route puts in the call context: the caller's IP hash (for storing the chat) and the site origin (for full links). */
export const STATE_IP_HASH = "a2a.ipHash";
export const STATE_ORIGIN = "a2a.origin";
export function salesExecutor(answer, notes) {
    return {
        async execute(requestContext, eventBus) {
            const text = textFromParts(requestContext.userMessage.parts);
            const state = requestContext.context.state;
            const ipHash = String(state.get(STATE_IP_HASH) ?? "unknown");
            const origin = String(state.get(STATE_ORIGIN) ?? "");
            let reply;
            if (!text) {
                reply = { text: notes.empty, data: null };
            }
            else {
                try {
                    reply = await answer({ contextId: requestContext.contextId, ipHash, origin, text });
                }
                catch (error) {
                    console.error("a2a answer failed", error);
                    reply = { text: notes.down, data: null };
                }
            }
            eventBus.publish(AgentEvent.message({
                messageId: randomUUID(),
                contextId: requestContext.contextId,
                taskId: "",
                role: Role.ROLE_AGENT,
                parts: replyParts(reply.text, reply.data, reply.files ?? []),
                metadata: undefined,
                extensions: [],
                referenceTaskIds: [],
            }));
            eventBus.finished();
        },
        // Nothing long-running to cancel.
        async cancelTask() { },
    };
}
