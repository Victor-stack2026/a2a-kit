/**
 * Reads an AI SDK UI message stream to the end and returns the text it carried.
 * A sales agent's reply only finishes (and its onEnd saving runs) once the stream is read; the text is a fallback
 * for when the saved messages take too long.
 */
export declare function drainText(stream: ReadableStream<unknown>): Promise<string>;
/** Resolves with the promise's value, or null after ms. */
export declare function within<T>(promise: Promise<T>, ms: number): Promise<T | null>;
/** Several text segments of one reply (before and after tool calls) joined into one message, blank lines squeezed. */
export declare function joinReply(text: string): string;
