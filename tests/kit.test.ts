import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { AgentCard } from "@a2a-js/sdk"
import {
  A2A_PROTOCOL,
  a2aSessionId,
  absoluteUrl,
  drainText,
  handleA2ARequest,
  isA2ASession,
  joinReply,
  mediaTypeOf,
  OFFER_SCHEMA,
  textFromParts,
  type A2ADeps,
} from "../src/index.js"

const card = (origin: string): AgentCard => ({
  name: "Test agent",
  description: "test",
  supportedInterfaces: [{ url: `${origin}/api/a2a`, protocolBinding: "JSONRPC", tenant: "", protocolVersion: A2A_PROTOCOL }],
  provider: { organization: "test", url: origin },
  version: "1.0.0",
  capabilities: { streaming: true, pushNotifications: false, extensions: [], extendedAgentCard: false },
  securitySchemes: {},
  securityRequirements: [],
  defaultInputModes: ["text/plain"],
  defaultOutputModes: ["text/plain", "application/json"],
  skills: [],
  signatures: [],
})

const calls: { text: string; contextId: string; origin: string; ipHash: string }[] = []
const deps = (over: Partial<A2ADeps> = {}): A2ADeps => ({
  card,
  answer: async (args) => {
    calls.push(args)
    return {
      text: "Two styles fit.",
      data: { schema: OFFER_SCHEMA, products: [] },
      files: [{ url: "https://shop.test/a.jpg", mediaType: "image/jpeg", filename: "a-photo" }],
    }
  },
  allow: async () => true,
  ipHash: () => "ip",
  notes: { empty: "EMPTY", down: "DOWN" },
  ...over,
})

const send = (parts: unknown[], { method = "SendMessage", contextId = "ctx-buyer-000000000001", headers = {} as Record<string, string> } = {}) =>
  new Request("https://shop.test/api/a2a", {
    method: "POST",
    headers: { "content-type": "application/json", "A2A-Version": "1.0", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: { message: { messageId: "m1", role: "ROLE_USER", parts, contextId } } }),
  })

describe("JSON-RPC entry", () => {
  it("answers with one agent message: text, data, file links", async () => {
    const message = (await (await handleA2ARequest(send([{ text: "hello" }]), deps())).json()).result.message
    assert.equal(message.role, "ROLE_AGENT")
    assert.equal(message.contextId, "ctx-buyer-000000000001")
    assert.deepEqual(message.parts[0], { text: "Two styles fit.", mediaType: "text/plain" })
    assert.equal(message.parts[1].data.schema, "pikpop.a2a.offer/v1")
    assert.deepEqual(message.parts[2], { url: "https://shop.test/a.jpg", mediaType: "image/jpeg", filename: "a-photo" })
    assert.deepEqual(calls.at(-1), { contextId: "ctx-buyer-000000000001", ipHash: "ip", origin: "https://shop.test", text: "hello" })
  })

  it("starts a context when the agent sends none", async () => {
    const message = (await (await handleA2ARequest(send([{ text: "hi" }], { contextId: "" }), deps())).json()).result.message
    assert.ok(message.contextId.length > 8)
  })

  it("streams over SSE", async () => {
    const res = await handleA2ARequest(send([{ text: "hi" }], { method: "SendStreamingMessage" }), deps())
    assert.equal(res.headers.get("content-type"), "text/event-stream")
    assert.equal(JSON.parse((await res.text()).trim().replace(/^data: /, "")).result.message.parts.length, 3)
  })

  it("empty message, assistant failure, rate limit, version, content type, bad JSON", async () => {
    const before = calls.length
    assert.equal((await (await handleA2ARequest(send([{ text: " " }]), deps())).json()).result.message.parts[0].text, "EMPTY")
    assert.equal(calls.length, before)
    const down = (await (await handleA2ARequest(send([{ text: "hi" }]), deps({ answer: () => Promise.reject(new Error("x")) }))).json()).result.message
    assert.equal(down.parts[0].text, "DOWN")
    assert.equal((await handleA2ARequest(send([{ text: "hi" }]), deps({ allow: async () => false }))).status, 429)
    assert.equal((await (await handleA2ARequest(send([{ text: "hi" }], { headers: { "A2A-Version": "0.3" } }), deps())).json()).error.code, -32009)
    const form = new Request("https://shop.test/api/a2a", { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" })
    assert.equal((await handleA2ARequest(form, deps())).status, 415)
    const broken = new Request("https://shop.test/api/a2a", { method: "POST", headers: { "content-type": "application/json" }, body: "{" })
    assert.equal((await (await handleA2ARequest(broken, deps())).json()).error.code, -32700)
  })

  it("lookups that aren't sends skip the rate limit", async () => {
    const req = new Request("https://shop.test/api/a2a", {
      method: "POST",
      headers: { "content-type": "application/json", "A2A-Version": "1.0" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "GetTask", params: { id: "nope" } }),
    })
    const res = await handleA2ARequest(req, deps({ allow: async () => false }))
    assert.equal(res.status, 200)
    assert.equal((await res.json()).error.code, -32001)
  })
})

describe("helpers", () => {
  it("sessions, links, media types, buyer text", () => {
    assert.equal(a2aSessionId("3f2b6c1e-0b1d-4c55-9f0e-6a7b8c9d0e1f"), "a2a-3f2b6c1e-0b1d-4c55-9f0e-6a7b8c9d0e1f")
    assert.match(a2aSessionId("odd / #1"), /^a2a-[0-9a-f]{40}$/)
    assert.ok(isA2ASession(a2aSessionId("x")))
    assert.equal(absoluteUrl("https://a.test/", "/p.jpg"), "https://a.test/p.jpg")
    assert.equal(absoluteUrl("https://a.test", "https://cdn.test/v.mp4"), "https://cdn.test/v.mp4")
    assert.equal(mediaTypeOf("https://cdn.test/v.mp4?x=1"), "video/mp4")
    assert.equal(mediaTypeOf("/p.webp"), "image/webp")
    const text = textFromParts([
      { content: { $case: "text", value: "need boxes" }, metadata: undefined, filename: "", mediaType: "" },
      { content: { $case: "data", value: { qty: 1000 } }, metadata: undefined, filename: "", mediaType: "" },
      { content: { $case: "url", value: "https://x.test/a.png" }, metadata: undefined, filename: "ref.png", mediaType: "image/png" },
    ])
    assert.match(text, /need boxes/)
    assert.match(text, /\{"qty":1000\}/)
    assert.match(text, /ref\.png/)
  })

  it("drains a UI message stream to its text", async () => {
    const chunks = [{ type: "start" }, { type: "text-delta", delta: "Hi" }, { type: "text-end" }, { type: "tool-input-start" }, { type: "text-delta", delta: "there" }, { type: "text-end" }]
    const stream = new ReadableStream({ start: (c) => { for (const x of chunks) c.enqueue(x); c.close() } })
    assert.equal(joinReply(await drainText(stream)), "Hi\nthere")
  })
})
