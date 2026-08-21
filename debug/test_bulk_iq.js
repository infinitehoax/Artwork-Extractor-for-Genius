const assert = require('assert');

function parseBulkIqInputs(rawText) {
    if (!rawText || !rawText.trim()) return [];
    const text = rawText.trim();

    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        if (typeof parsed === 'object' && parsed !== null) {
            if (Array.isArray(parsed.songs)) return parsed.songs;
            if (Array.isArray(parsed.tracks)) return parsed.tracks;
            if (Array.isArray(parsed.urls)) return parsed.urls;
            if (Array.isArray(parsed.song_ids)) return parsed.song_ids;
            if (Array.isArray(parsed.items)) return parsed.items;
            return Object.values(parsed);
        }
    } catch (e) {
        // Not valid JSON, parse line-by-line
    }

    return text.split(/\r?\n|,/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

async function resolveSongIdFromInput(item) {
    if (item === null || item === undefined) return null;

    if (typeof item === 'number') {
        return !isNaN(item) && item > 0 ? item : null;
    }

    if (typeof item === 'object') {
        const id = item.id || item.song_id || item.songId || item.song_ID;
        if (id && !isNaN(Number(id))) return Number(id);
        if (item.url) item = item.url;
        else if (item.path) item = item.path;
        else if (item.link) item = item.link;
    }

    if (typeof item === 'string') {
        const trimmed = item.trim();
        if (!trimmed) return null;

        if (/^\d+$/.test(trimmed)) {
            return Number(trimmed);
        }

        const directSongMatch = trimmed.match(/\/songs\/(\d+)/i);
        if (directSongMatch) {
            return Number(directSongMatch[1]);
        }

        if (trimmed.includes('genius.com') || trimmed.startsWith('/')) {
            const fullUrl = trimmed.startsWith('http') ? trimmed : `https://genius.com${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
            try {
                if (global.mockFetch) {
                    const html = await global.mockFetch(fullUrl);
                    const match = html.match(/genius:\/\/songs\/(\d+)/i) ||
                                  html.match(/\/songs\/(\d+)/i) ||
                                  html.match(/pusherChannel":"song-(\d+)"/i) ||
                                  html.match(/pusher_channel":"song-(\d+)"/i) ||
                                  html.match(/"Song ID",\s*"value":\s*(\d+)/i) ||
                                  html.match(/"songId":\s*(\d+)/i) ||
                                  html.match(/"song_id":\s*(\d+)/i) ||
                                  html.match(/"song":\s*(\d+)/i) ||
                                  html.match(/data-song-id=["']?(\d+)["']?/i) ||
                                  html.match(/"song":\s*\{\s*"_type":"song",[\s\S]*?"id":\s*(\d+)/i) ||
                                  html.match(/"id":\s*(\d+)/i);
                    if (match) return Number(match[1]);
                }
            } catch (e) {
                console.warn("Failed to resolve song ID from Genius URL:", fullUrl, e);
            }
        }
    }

    return null;
}

(async () => {
    // Test 1: JSON Array
    const json1 = '["https://genius.com/Jeremy-spencer-linda-lyrics", 11776445, {"id": 12771441}]';
    const parsed1 = parseBulkIqInputs(json1);
    assert.strictEqual(parsed1.length, 3);

    // Test 2: JSON Object with "songs" key
    const json2 = '{"songs": ["https://genius.com/Jeremy-spencer-linda-lyrics", 11776445]}';
    const parsed2 = parseBulkIqInputs(json2);
    assert.strictEqual(parsed2.length, 2);

    // Test 3: Line-separated text
    const text3 = 'https://genius.com/Jeremy-spencer-linda-lyrics\n11776445\n12771441';
    const parsed3 = parseBulkIqInputs(text3);
    assert.strictEqual(parsed3.length, 3);

    // Test 4: Song ID Resolutions
    assert.strictEqual(await resolveSongIdFromInput(11776445), 11776445);
    assert.strictEqual(await resolveSongIdFromInput("12771441"), 12771441);
    assert.strictEqual(await resolveSongIdFromInput({ id: 11776445 }), 11776445);
    assert.strictEqual(await resolveSongIdFromInput({ song_id: "12771441" }), 12771441);
    assert.strictEqual(await resolveSongIdFromInput("https://genius.com/songs/11776445"), 11776445);

    // Mock HTML fetch for URL resolution - Legacy HTML format
    global.mockFetch = async (url) => {
        return `<html><body>{"key":"Song ID","value":11776445},"pusher_channel":"song-11776445"</body></html>`;
    };
    assert.strictEqual(await resolveSongIdFromInput("https://genius.com/Jeremy-spencer-take-a-look-around-mrs-brown-lyrics"), 11776445);

    // Mock HTML fetch for URL resolution - Modern Genius React HTML format with twitter meta tag & pusherChannel
    global.mockFetch = async (url) => {
        return `<!doctype html><html><head><meta content="genius://songs/12695572" property="twitter:app:url:iphone" /></head><body>"pusherChannel":"song-12695572","songId":12695572</body></html>`;
    };
    assert.strictEqual(await resolveSongIdFromInput("https://genius.com/Kenny-barron-and-ann-hampton-callaway-cooks-bay-lyrics"), 12695572);

    console.log("All Bulk IQ parser and resolution tests passed successfully!");
})();
