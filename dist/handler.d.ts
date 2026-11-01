import { type AgentCard } from "@a2a-js/sdk";
import { type AgentAnswer } from "./executor.js";
export declare const A2A_PROTOCOL = "1.0";
export interface A2ADeps {
    /** The agent card for this site, with links on the origin the request came in on. */
    card: (origin: string) => AgentCard;
    answer: AgentAnswer;
    /** Rate limit: may this message be taken? Checked only for sending. */
    allow: (request: Request) => Promise<boolean>;
    /** Caller IP hash, stored with the chat. */
    ipHash: (request: Request) => string;
    notes: {
        empty: string;
        down: string;
    };
}
/** Serves the agent card (GET /.well-known/agent-card.json). */
export declare function agentCardResponse(request: Request, card: (origin: string) => AgentCard): Response;
export declare function handleA2ARequest(request: Request, deps: A2ADeps): Promise<Response>;
