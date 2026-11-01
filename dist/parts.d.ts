import type { Part } from "@a2a-js/sdk";
/** Version of the structured data every pikpop sales agent attaches to its replies. Bump it when fields change meaning. */
export declare const OFFER_SCHEMA = "pikpop.a2a.offer/v1";
/** Most text read from one buyer-agent message. */
export declare const MAX_TEXT = 2000;
/** A product the agent recommended, with everything a buyer agent needs to compare it and look at it. */
export interface OfferProduct {
    id: string;
    name: string;
    url: string;
    reason?: string;
    moq?: number | null;
    moqUnit?: string;
    /** Unit prices by minimum quantity; empty means price on request. */
    priceTiers: {
        minQty: number;
        unitPrice: number;
    }[];
    currency?: string;
    colors?: string[];
    sizes?: string[];
    leadTimeDays?: number | null;
    images: string[];
    videos: string[];
}
/** A quote the agent issued (only agents that can quote fill this). */
export interface OfferQuote {
    quoteId: string;
    status: "quoted";
    url: string;
    currency: string;
    issuedAt: string;
    expiresAt: string;
    box?: string;
    options: {
        option: number;
        label: string;
        qty: number;
        unitPrice: number;
        total: number;
    }[];
    spec: string[];
    assumptions: string[];
}
/** Structured data attached to a reply. Fields an agent can't produce are left out. */
export interface OfferData {
    schema: typeof OFFER_SCHEMA;
    quote?: OfferQuote | null;
    products?: OfferProduct[];
    inquiry?: {
        inquiryId: string;
    } | null;
}
/** A media file sent as an A2A file part (a link, not bytes). */
export interface OfferFile {
    url: string;
    mediaType: string;
    filename: string;
}
/** Buyer-agent message → text for the sales agent. Structured data becomes JSON text; files can't be read yet, so say so. */
export declare function textFromParts(parts: readonly Part[]): string;
/** Reply → A2A parts: the text, then the structured data (when there is any), then media links. */
export declare function replyParts(text: string, data: OfferData | null, files?: readonly OfferFile[]): Part[];
/** Site-relative links ("/posters/x.jpg") → full links on this site; full links are kept. */
export declare function absoluteUrl(origin: string, url: string): string;
/** Guess a media type from a link's extension (for file parts). */
export declare function mediaTypeOf(url: string): string;
