# @pikpop/a2a-kit

Shared A2A 1.0 plumbing for pikpop's AI sales agents (TaiYiBox 泰艺, MuseB2B, Larl Queen 兰皇后).
A buyer's AI agent (Grok Bot, Claude, ChatGPT…) reads a site's agent card and talks to its sales agent over JSON-RPC; this package is the protocol part, the same on every site.

## What's in it

- `handleA2ARequest(request, deps)`: the JSON-RPC entry for a Next.js route handler (no Express). Checks content type and size, applies the site's rate limit to sends, checks the A2A version, and lets the official `@a2a-js/sdk` speak the protocol. Plain JSON or SSE.
- `agentCardResponse(request, card)`: serves `/.well-known/agent-card.json` with the site's origin filled in.
- One message in, one message out: the site's `answer()` returns `{ text, data, files }`; the reply is the text, then the structured data, then media links as A2A file parts.
- `OfferData` (`pikpop.a2a.offer/v1`): the shape every pikpop agent attaches — `quote` (agents that can quote), `products` (link, price tiers, MOQ, colours, sizes, lead time, images, videos), `inquiry`. Buyer agents compare suppliers on these fields; bump the schema version when a field changes meaning.
- `a2aSessionId(contextId)`: A2A context → stored chat session id (`a2a-` prefix, so the web chat can't borrow it).
- `drainText`, `within`, `joinReply`: read the AI SDK UI stream to the end and turn it into one reply.

## Use in a site

```bash
npm install github:Victor-stack2026/a2a-kit#v0.1.0 @a2a-js/sdk@^1.3.0
```

```ts
// src/app/api/a2a/route.ts
import { handleA2ARequest } from "@pikpop/a2a-kit"
export const maxDuration = 120
export async function POST(request: Request) {
  return handleA2ARequest(request, { card: salesAgentCard, answer: answerBuyerAgent, allow, ipHash, notes })
}

// src/app/.well-known/agent-card.json/route.ts
import { agentCardResponse } from "@pikpop/a2a-kit"
export function GET(request: Request) {
  return agentCardResponse(request, salesAgentCard)
}
```

The site keeps what is its own: the agent card, how its sales agent answers (same brain as its web chat, with a channel note), and which products / quotes go into the data.

## Changing it

`dist/` is committed so sites can install straight from a git tag. After changing `src/`: `npm run check` (builds, tests, fails if `dist/` is stale), commit, tag `vX.Y.Z`, then bump the tag in each site.
