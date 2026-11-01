/** Version of the structured data every pikpop sales agent attaches to its replies. Bump it when fields change meaning. */
export const OFFER_SCHEMA = "pikpop.a2a.offer/v1";
/** Most text read from one buyer-agent message. */
export const MAX_TEXT = 2000;
/** Buyer-agent message → text for the sales agent. Structured data becomes JSON text; files can't be read yet, so say so. */
export function textFromParts(parts) {
    const lines = [];
    for (const part of parts) {
        const content = part.content;
        if (!content)
            continue;
        if (content.$case === "text") {
            lines.push(content.value);
        }
        else if (content.$case === "data") {
            lines.push(`(structured data from the buyer agent) ${JSON.stringify(content.value ?? null)}`);
        }
        else {
            const name = part.filename || part.mediaType || "file";
            lines.push(`(the buyer agent attached a file "${name}"; this channel can't read attachments yet, ask them to describe it in text)`);
        }
    }
    return lines.join("\n").trim().slice(0, MAX_TEXT);
}
/** Reply → A2A parts: the text, then the structured data (when there is any), then media links. */
export function replyParts(text, data, files = []) {
    const parts = [{ content: { $case: "text", value: text }, metadata: undefined, filename: "", mediaType: "text/plain" }];
    if (data)
        parts.push({ content: { $case: "data", value: data }, metadata: undefined, filename: "", mediaType: "application/json" });
    for (const file of files) {
        parts.push({ content: { $case: "url", value: file.url }, metadata: undefined, filename: file.filename, mediaType: file.mediaType });
    }
    return parts;
}
/** Site-relative links ("/posters/x.jpg") → full links on this site; full links are kept. */
export function absoluteUrl(origin, url) {
    if (!url)
        return url;
    if (/^https?:\/\//i.test(url))
        return url;
    if (!url.startsWith("/"))
        return url;
    return `${origin.replace(/\/+$/, "")}${url}`;
}
/** Guess a media type from a link's extension (for file parts). */
export function mediaTypeOf(url) {
    const ext = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase() ?? "";
    const types = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
        svg: "image/svg+xml",
        mp4: "video/mp4",
        mov: "video/quicktime",
        webm: "video/webm",
        m3u8: "application/vnd.apple.mpegurl",
    };
    return types[ext] ?? "application/octet-stream";
}
