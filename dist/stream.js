/**
 * Reads an AI SDK UI message stream to the end and returns the text it carried.
 * A sales agent's reply only finishes (and its onEnd saving runs) once the stream is read; the text is a fallback
 * for when the saved messages take too long.
 */
export async function drainText(stream) {
    const reader = stream.getReader();
    let text = "";
    for (;;) {
        const { done, value } = await reader.read();
        if (done)
            return text;
        const chunk = value;
        if (chunk?.type === "text-delta" && typeof chunk.delta === "string")
            text += chunk.delta;
        if (chunk?.type === "text-end")
            text += "\n";
    }
}
/** Resolves with the promise's value, or null after ms. */
export function within(promise, ms) {
    return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms).unref?.())]);
}
/** Several text segments of one reply (before and after tool calls) joined into one message, blank lines squeezed. */
export function joinReply(text) {
    return text.replace(/\n\s*\n+/g, "\n").trim();
}
