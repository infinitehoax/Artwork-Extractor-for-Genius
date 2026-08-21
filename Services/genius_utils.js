function getScripts(type) {
    const scripts = document.body.querySelectorAll("script:not([src])");

    const regexMap = {
        preloaded: /window\.__PRELOADED_STATE__\s*=\s*JSON\.parse\('(.+?)'\)/s,
        appConfig: /window\.__APP_CONFIG__\s*=\s*JSON\.parse\('(.+?)'\)/s,
        iqByEventType: /window\.__IQ_BY_EVENT_TYPE__\s*=\s*JSON\.parse\('(.+?)'\)/s
    };

    const regex = regexMap[type];
    if (!regex) return null;

    const parse = (raw) => {
        if (!raw) return null;
        const cleaned = raw
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\(?!["\\/bfnrtu])/g, "")
            .replace(/[\u0000-\u001F]+/g, "");
        return JSON.parse(cleaned);
    };

    for (const script of scripts) {
        const text = script.textContent;
        const match = text.match(regex);
        if (match) return parse(match[1]);
    }

    return null;
}

function getId(type) {
    console.log(`Run getId(${type})`);
    const html = document.documentElement.innerHTML;

    const regex = new RegExp(`\\\\"${type}\\\\":(\\d+)`);
    const match = html.match(regex);

    return match ? match[1] : null;
}

function getSongIds() {
    console.log("Run getSongIds()");

    const scripts = document.body.querySelectorAll("script:not([src])");

    for (const script of scripts) {
        const text = script.textContent;

        const preloadedMatch = text.match(/window\.__PRELOADED_STATE__\s*=\s*JSON\.parse\('((?:\\'|[^'])*)'\);/s);
        if (!preloadedMatch) continue;

        const jsonString = preloadedMatch[1];
        const albumAppearances = JSON.parse("{" + jsonString.match(/\\"albumAppearances\\":\{([\s\S]*?)\}(?=,\\"[a-zA-Z])/)[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') + "}");
        const songIds = Object.values(albumAppearances).sort((a, b) => a.trackNumber - b.trackNumber).map(entry => entry.song);

        return songIds;
    }
}

function getCsrfToken() {
    if (window._cachedCsrfToken) return window._cachedCsrfToken;

    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (metaToken) {
        window._cachedCsrfToken = metaToken;
        return metaToken;
    }

    const match = document.cookie.match(/_csrf_token=([^;]+)/);
    if (match) {
        const token = decodeURIComponent(match[1]);
        window._cachedCsrfToken = token;
        return token;
    }

    return '';
}

async function ensureCsrfToken() {
    let token = getCsrfToken();
    if (token) return token;

    try {
        const res = await fetch('https://genius.com/', { credentials: 'include' });
        if (res.ok) {
            const html = await res.text();
            const match = html.match(/<meta\s+name=["']csrf-token["']\s+content=["']([^"']+)["']/i) ||
                          html.match(/content=["']([^"']+)["']\s+name=["']csrf-token["']/i);
            if (match) {
                window._cachedCsrfToken = match[1];
                return match[1];
            }
        }
    } catch (e) {
        console.warn("Could not fetch CSRF token from genius.com:", e);
    }
    return '';
}

// ? Shared rate limiter for every Genius API call the extension can fan out over a tracklist.
// * Album pages need one request per song, so an unthrottled fan-out gets users rate limited and hammers Genius.
// * Requests queue here and start at most GENIUS_REQUESTS_PER_SECOND per rolling second, in the order they were queued.
const GENIUS_REQUESTS_PER_SECOND = 10;

const rateLimitGeniusRequest = (function createGeniusRateLimiter(maxPerSecond) {
    const windowMs = 1000;
    const starts = [];
    const queue = [];
    let pumpScheduled = false;

    function schedulePump(waitMs) {
        pumpScheduled = true;
        setTimeout(pump, waitMs);
    }

    function pump() {
        pumpScheduled = false;

        const now = Date.now();
        while (starts.length && now - starts[0] >= windowMs) starts.shift();

        while (queue.length && starts.length < maxPerSecond) {
            starts.push(Date.now());
            queue.shift()();
        }

        if (queue.length && !pumpScheduled) {
            const oldestStart = starts[0] ?? Date.now();

            schedulePump(Math.max(windowMs - (Date.now() - oldestStart), 10));

        }
    }

    return function rateLimitGeniusRequest(task) {
        return new Promise((resolve, reject) => {
            // ! A failing task must settle its own promise only, never stall the queue.
            queue.push(() => Promise.resolve().then(task).then(resolve, reject));
            if (!pumpScheduled) schedulePump(0);
        });
    };
})(GENIUS_REQUESTS_PER_SECOND);

// ? Drop-in fetch for genius.com/api calls that charges the request against the shared budget above.
function geniusFetch(url, options = {}) {
    const fetchOptions = {
        credentials: 'include',
        ...options
    };
    return rateLimitGeniusRequest(() => fetch(url, fetchOptions));
}

async function getApiData(id, type) {
    return rateLimitGeniusRequest(async () => {
        const response = await fetch(`https://genius.com/api/${type}/${id}`, { credentials: 'include' });
        if (!response.ok) throw new Error(`${type}/${id}: ${response.status} ${response.statusText}`);

        const json = await response.json();
        if (!json?.response) throw new Error(`${type}/${id}: missing response payload`);


        return json.response;
    });
}

// ? Loads many ids through the rate limiter and keeps the input order.
// * A single failed request returns null instead of rejecting the whole batch, so one rate limited song can't blank the page.
async function getApiDataBatch(ids, type) {
    const results = await Promise.all(ids.map(id =>
        getApiData(id, type).catch(error => {
            console.warn(`Request for ${type}/${id} failed:`, error);
            return null;
        })
    ));

    const failed = results.filter(result => result === null).length;
    if (failed) console.warn(`${failed} of ${ids.length} ${type} requests failed`);

    return results;
}

async function followId(id, type, action) {
    const url = `https://genius.com/api/${type}/${id}/${action}`;
    const response = await geniusFetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': document.cookie,
            'X-CSRF-Token': getCsrfToken(),
            'User-Agent': 'ArtworkExtractorForGenius/0.7.9 (Artwork Extractor for Genius)'
        },
        body: JSON.stringify({})
    });
    return response.ok;
}


async function createSong(payload) {
    if (Object.keys(payload).length === 0) return;
    try {
        const response = await geniusFetch("https://genius.com/api/songs", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Cookie': document.cookie,
                'X-CSRF-Token': getCsrfToken(),
                'User-Agent': 'ArtworkExtractorForGenius/0.7.9 (Artwork Extractor for Genius)'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(`Error creating song: ${response.statusText}`);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error(`Error: ${error}`);
        return null;
    }
}


async function updateSongMetadata(song, payload) {
    if (Object.keys(payload).length === 0) return;
    try {
        const response = await geniusFetch(`https://genius.com/api/songs/${song.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': document.cookie,
                'X-CSRF-Token': getCsrfToken(),
                'User-Agent': 'ArtworkExtractorForGenius/0.7.9 (Artwork Extractor for Genius)'
            },
            body: JSON.stringify({ song: payload })
        });

        if (!response.ok) {
            console.error(`Error updating song metadata: ${response.statusText}`);
        }
    } catch (error) {
        console.error(`Error: ${error}`);
    }
}

async function updateAlbumTracklist(albumId, tracklistPayload) {
    if (!albumId || !tracklistPayload || !Array.isArray(tracklistPayload.tracklist)) return null;
    try {
        const response = await geniusFetch(`https://genius.com/api/albums/${albumId}/tracklist`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Cookie": document.cookie,
                "X-CSRF-Token": getCsrfToken(),
                "User-Agent": "ArtworkExtractorForGenius/0.7.9 (Artwork Extractor for Genius)"
            },
            body: JSON.stringify({
                tracklist: tracklistPayload.tracklist,
                viewable_by_roles: tracklistPayload.viewable_by_roles ?? [],
                react_album_page: tracklistPayload.react_album_page ?? true
            })
        });

        if (!response.ok) {
            let errText = response.statusText;
            try {
                const errJson = await response.json();
                if (errJson?.meta?.message) {
                    errText = `${response.status} ${errJson.meta.message}`;
                } else {
                    errText = `${response.status} ${response.statusText}`;
                }
            } catch (e) {
                errText = `${response.status} ${response.statusText}`;
            }
            console.error(`Error updating album tracklist: ${errText}`);
            return { ok: false, status: response.status, statusText: errText };
        }
        const json = await response.json();
        return { ok: true, data: json };
    } catch (error) {
        console.error(`Error updating album tracklist: ${error}`);
        return { ok: false, error: error.message };
    }
}

async function updateAlbumMetadata(album, payload) {
    if (Object.keys(payload).length === 0) return;
    try {
        const response = await geniusFetch(`https://genius.com/api/albums/${album.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Cookie": document.cookie,
                "X-CSRF-Token": getCsrfToken(),
                "User-Agent": "ArtworkExtractorForGenius/0.7.9 (Artwork Extractor for Genius)"
            },
            body: JSON.stringify({ album: payload })
        });

        if (!response.ok) {
            console.error(`Error updating album metadata: ${response.statusText}`);
        }
    } catch (error) {
        console.error(`Error: ${error}`);
    }
}





async function awardTranscriptionIq(songId) {
    if (!songId) return null;
    try {
        const csrfToken = await ensureCsrfToken();
        const response = await geniusFetch(`https://genius.com/api/songs/${songId}/award_transcription_iq`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
                'User-Agent': 'ArtworkExtractorForGenius/0.7.9 (Artwork Extractor for Genius)'
            },
            body: JSON.stringify({ text_format: 'html,markdown,preview' })
        });

        if (!response.ok) {
            let errText = response.statusText;
            try {
                const errJson = await response.json();
                if (errJson?.meta?.message) errText = `${response.status} ${errJson.meta.message}`;
                else if (errJson?.error) errText = `${response.status} ${errJson.error}`;
            } catch (e) {}
            console.error(`Error awarding transcription IQ for song ${songId}: ${errText}`);
            return { ok: false, status: response.status, statusText: errText };
        }
        const json = await response.json();
        return { ok: true, data: json };
    } catch (error) {
        console.error(`Error awarding transcription IQ for song ${songId}:`, error);
        return { ok: false, error: error.message };
    }
}

async function updateSongLyrics(song, payload) {
    if (Object.keys(payload).length === 0) return;
    try {
        const response = await geniusFetch(`https://genius.com/api/songs/${song.id}/lyrics`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': document.cookie,
                'X-CSRF-Token': getCsrfToken(),
                'User-Agent': 'ArtworkExtractorForGenius/0.7.9 (Artwork Extractor for Genius)'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(`Error updating song lyrics: ${response.statusText}`);
        }
    } catch (error) {
        console.error(`Error: ${error}`);
    }
}


async function updateSongMetadata2(song, updates) {
    if (Object.keys(updates).length === 0) return;

    const needsTitleUpdate = typeof updates.title === 'string';
    const isPublished = song.published === true;

    try {
        if (needsTitleUpdate && isPublished) {
            const unpublishResponse = await geniusFetch(`https://genius.com/api/songs/${song.id}/unpublish`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': document.cookie,
                    'X-CSRF-Token': getCsrfToken(),
                    'User-Agent': 'ArtworkExtractorForGenius/0.7.9 (Artwork Extractor for Genius)'
                }
            });

            if (!unpublishResponse.ok) {
                console.error(`Error unpublishing song ${song.id}: ${unpublishResponse.statusText}`);
                return;
            }
        }

        const updateResponse = await geniusFetch(`https://genius.com/api/songs/${song.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': document.cookie,
                'X-CSRF-Token': getCsrfToken(),
                'User-Agent': 'ArtworkExtractorForGenius/0.7.9 (Artwork Extractor for Genius)'
            },
            body: JSON.stringify({ song: updates })
        });

        if (!updateResponse.ok) {
            console.error(`Error updating song metadata: ${updateResponse.statusText}`);
            return;
        }

        if (needsTitleUpdate && isPublished) {
            const publishResponse = await geniusFetch(`https://genius.com/api/songs/${song.id}/publish`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': document.cookie,
                    'X-CSRF-Token': getCsrfToken(),
                    'User-Agent': 'ArtworkExtractorForGenius/0.7.9 (Artwork Extractor for Genius)'
                }
            });

            if (!publishResponse.ok) {
                console.error(`Error publishing song ${song.id}: ${publishResponse.statusText}`);
            }
        }
    } catch (error) {
        console.error(`Error processing song ${song.id}:`, error);
    }
}



async function toggleFollowSong(songId, action) {
    const url = `https://genius.com/api/songs/${songId}/${action}`;
    const response = await geniusFetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': document.cookie,
            'X-CSRF-Token': getCsrfToken(),
            'User-Agent': 'ArtworkExtractorForGenius/0.7.9 (Artwork Extractor for Genius)'
        },
        body: JSON.stringify({})
    });
    return response.ok;
}

async function sendCoverArts(imageUrl, albumId) {
    const payload = {
        album_id: albumId,
        cover_art: {
            image_url: imageUrl
        }
    };

    try {
        const response = await geniusFetch("https://genius.com/api/cover_arts/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Cookie": document.cookie,
                "X-CSRF-Token": getCsrfToken(),
                "User-Agent": "ArtworkExtractorForGenius/0.7.9 (Artwork Extractor for Genius)"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const json = await response.json();
        coverId = json.response.cover_art.id;
        return coverId;
    } catch (error) {
        console.error("Error during POST Request:", error);
    }
}

async function deleteCoverArts(coverId) {
    try {
        const response = await geniusFetch(`https://genius.com/api/cover_arts/${coverId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Cookie": document.cookie,
                "X-CSRF-Token": getCsrfToken(),
                "User-Agent": "ArtworkExtractorForGenius/0.7.9 (Artwork Extractor for Genius)"
            },
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

    } catch (error) {
        console.error("Error during DELETE Request:", error);
    }
}

async function moveCoverArts(position, coverId, coverArts) {
    let payload = {};

    if (position === 1) {
        const coverBelowId = coverArts[position - 1].id;

        payload = {
            below_id: coverBelowId
        };
    } else if (position > 1) {
        const coverBelowId = coverArts[position - 1].id;
        const coverAboveId = coverArts[position - 2].id;

        payload = {
            above_id: coverAboveId,
            below_id: coverBelowId
        };
    }

    try {
        const response = await geniusFetch(`https://genius.com/api/cover_arts/${coverId}/move_between`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Cookie": document.cookie,
                "X-CSRF-Token": getCsrfToken(),
                "User-Agent": "ArtworkExtractorForGenius/0.7.9 (Artwork Extractor for Genius)"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const json = await response.json();
        return json;
    } catch (error) {
        console.error("Error:", error);
    }
}

async function sendUpdateRequest(songId, payload) {
    const url = `https://genius.com/api/songs/${songId}`;
    const response = await geniusFetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': document.cookie,
            'X-CSRF-Token': getCsrfToken(),
            'User-Agent': 'ArtworkExtractorForGenius/0.7.9 (Artwork Extractor for Genius)'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        console.error(`Error during PUT Request for Song-ID ${songId}:`, response.statusText);
    } else {
        console.log(`Tags successfully saved for Song-ID ${songId}.`);
    }
}

async function fetchSuggestions(type, query) {
    const url = `https://genius.com/api/${type}/autocomplete?q=${encodeURIComponent(query)}&text_format=html,markdown`;
    const response = await geniusFetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': document.cookie,
            'X-CSRF-Token': getCsrfToken(),
            'User-Agent': 'ArtworkExtractorForGenius/0.7.9 (Artwork Extractor for Genius)'
        }
    });

    if (!response.ok) {
        console.error('Error:', response.statusText);
        return [];
    }
    const data = await response.json();
    return data.response[type];
}

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
                const res = await geniusFetch(fullUrl);
                if (res.ok) {
                    const html = await res.text();
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