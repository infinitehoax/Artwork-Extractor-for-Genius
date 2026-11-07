const fs = require("fs");
const assert = require("assert");

global.window = {};
global.document = {
    cookie: "session=test",
    querySelector: (selector) => {
        if (selector === 'meta[name="csrf-token"]') {
            return {
                getAttribute: (attr) => (attr === "content" ? "test_csrf_token" : null),
                content: "test_csrf_token"
            };
        }
        return null;
    }
};

let lastFetch = null;
global.fetch = async (url, options) => {
    lastFetch = { url, options };
    return {
        ok: true,
        status: 200,
        json: async () => ({ meta: { status: 200 } }),
        text: async () => "OK"
    };
};

const utilsCode = fs.readFileSync("Services/genius_utils.js", "utf8");
eval(utilsCode);

(async () => {
    // 1. Test deleteId
    assert.strictEqual(typeof deleteId, "function");
    const delRes = await deleteId(12345, "songs");
    assert.strictEqual(delRes, true);
    assert.strictEqual(lastFetch.url, "https://genius.com/api/songs/12345");
    assert.strictEqual(lastFetch.options.method, "DELETE");
    assert.strictEqual(lastFetch.options.headers["User-Agent"], "ArtworkExtractorForGenius/0.8.7 (Artwork Extractor for Genius)");

    // 2. Test updateTracklist
    assert.strictEqual(typeof updateTracklist, "function");
    const trkRes = await updateTracklist(6789, [{ disc_number: 1, disc_track_number: 1, song_id: 111 }]);
    assert.strictEqual(trkRes, true);
    assert.strictEqual(lastFetch.url, "https://genius.com/api/albums/6789/tracklist");
    assert.strictEqual(lastFetch.options.method, "PUT");
    assert.strictEqual(JSON.parse(lastFetch.options.body).tracklist[0].song_id, 111);

    // 3. Test updateSongMetadata with ID and object
    const songMetaRes1 = await updateSongMetadata(999, { title: "New Title" });
    assert.strictEqual(songMetaRes1.ok, true);
    assert.strictEqual(lastFetch.url, "https://genius.com/api/songs/999");

    const songMetaRes2 = await updateSongMetadata({ id: 888 }, { title: "Newer Title" });
    assert.strictEqual(songMetaRes2.ok, true);
    assert.strictEqual(lastFetch.url, "https://genius.com/api/songs/888");

    // 4. Test updateAlbumMetadata with ID and object
    const albMetaRes1 = await updateAlbumMetadata(555, { name: "Album" });
    assert.strictEqual(albMetaRes1.ok, true);
    assert.strictEqual(lastFetch.url, "https://genius.com/api/albums/555");

    const albMetaRes2 = await updateAlbumMetadata({ id: 444 }, { name: "Album 2" });
    assert.strictEqual(albMetaRes2.ok, true);
    assert.strictEqual(lastFetch.url, "https://genius.com/api/albums/444");

    // 5. Test updateCoverArts with ID and object
    const covRes1 = await updateCoverArts(333, { cover_arts: [] });
    assert.strictEqual(covRes1.ok, true);
    assert.strictEqual(lastFetch.url, "https://genius.com/api/albums/333");

    console.log("All upstream 0.8.7 utility tests passed successfully!");
})();
