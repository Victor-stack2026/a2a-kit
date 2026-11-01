import { A2A_VERSION_HEADER } from "@a2a-js/sdk";
import { DefaultRequestHandler, InMemoryTaskStore, JsonRpcTransportHandler, ServerCallContext, validateVersion } from "@a2a-js/sdk/server";
import { salesExecutor, STATE_IP_HASH, STATE_ORIGIN } from "./executor.js";
// JSON-RPC entry for a Next.js route (no Express): checks, rate limit, then the official SDK speaks the protocol.
export const A2A_PROTOCOL = "1.0";
const SEND_METHODS = new Set(["SendMessage", "SendStreamingMessage"]);
const CONTENT_TYPES = ["application/json", "application/a2a+json"];
const MAX_BODY_BYTES = 64_000;
function rpcError(id, code, message, status = 200) {
    return Response.json({ jsonrpc: "2.0", id, error: { code, message } }, { status });
}
function sse(id, stream) {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
        async start(controller) {
            try {
                for await (const event of stream)
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            }
            catch (error) {
                const failure = { jsonrpc: "2.0", id, error: JsonRpcTransportHandler.mapToJSONRPCError(error) };
                controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify(failure)}\n\n`));
            }
            finally {
                controller.close();
            }
        },
    });
    return new Response(body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" } });
}
/** Serves the agent card (GET /.well-known/agent-card.json). */
export function agentCardResponse(request, card) {
    return Response.json(card(new URL(request.url).origin), {
        headers: { "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" },
    });
}
export async function handleA2ARequest(request, deps) {
    const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!CONTENT_TYPES.includes(type))
        return rpcError(null, -32005, "Content-Type must be application/json or application/a2a+json", 415);
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES)
        return rpcError(null, -32600, "Request too large", 413);
    let body;
    try {
        body = JSON.parse(raw);
    }
    catch {
        return rpcError(null, -32700, "Parse error");
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
        return rpcError(null, -32600, "Invalid Request");
    const id = (body.id ?? null);
    const method = body.method;
    if (typeof method === "string" && SEND_METHODS.has(method)) {
        let allowed = true;
        try {
            allowed = await deps.allow(request);
        }
        catch (error) {
            console.error("a2a rate limit failed", error);
        }
        if (!allowed)
            return rpcError(id, -32000, "Too many messages from this source, please slow down and retry later.", 429);
    }
    const origin = new URL(request.url).origin;
    const card = deps.card(origin);
    const context = new ServerCallContext({
        // No version header: treat as 1.0 (the card only declares 1.0).
        requestedVersion: request.headers.get(A2A_VERSION_HEADER) || A2A_PROTOCOL,
        state: new Map([
            [STATE_IP_HASH, deps.ipHash(request)],
            [STATE_ORIGIN, origin],
        ]),
    });
    try {
        validateVersion(context.requestedVersion, card, "JSONRPC");
    }
    catch (error) {
        return Response.json({ jsonrpc: "2.0", id, error: JsonRpcTransportHandler.mapToJSONRPCError(error) });
    }
    const handler = new DefaultRequestHandler(card, new InMemoryTaskStore(), salesExecutor(deps.answer, deps.notes));
    const result = await new JsonRpcTransportHandler(handler).handle(body, context);
    if (result && typeof result[Symbol.asyncIterator] === "function") {
        return sse(id, result);
    }
    return Response.json(result, { headers: { [A2A_VERSION_HEADER]: A2A_PROTOCOL } });
}
