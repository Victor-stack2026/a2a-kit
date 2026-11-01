import { type AgentExecutor } from "@a2a-js/sdk/server";
import { type OfferData, type OfferFile } from "./parts.js";
/** What the route puts in the call context: the caller's IP hash (for storing the chat) and the site origin (for full links). */
export declare const STATE_IP_HASH = "a2a.ipHash";
export declare const STATE_ORIGIN = "a2a.origin";
export interface AgentReply {
    text: string;
    data: OfferData | null;
    files?: OfferFile[];
}
export type AgentAnswer = (args: {
    contextId: string;
    ipHash: string;
    origin: string;
    text: string;
}) => Promise<AgentReply>;
export declare function salesExecutor(answer: AgentAnswer, notes: {
    empty: string;
    down: string;
}): AgentExecutor;
