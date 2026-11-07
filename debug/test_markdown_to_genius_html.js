const assert = require('assert');

// Mock browser globals before requiring Services/genius_song.js
global.chrome = {
    storage: {
        local: {
            get: (keys, cb) => {
                // If cb provided, don't execute full extension initialization in tests unless needed
            }
        }
    }
};
global.window = {};
global.document = {
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ appendChild: () => {}, style: {} }),
    createElementNS: () => ({ appendChild: () => {}, setAttribute: () => {} })
};

const { markdownToGeniusHtml } = require('../Services/genius_song.js');

console.log("Running markdownToGeniusHtml unit tests...");

// 1. Single-line annotation formatting
{
    const input = "Hello [world](12345) test";
    const expected = 'Hello <a href="/12345" data-id="12345" class="null" data-editorial-state="accepted">world</a> test';
    const output = markdownToGeniusHtml(input);
    assert.strictEqual(output, expected, "Single-line annotation should convert to anchor tag with default editorial state");
}

// 2. Multi-line annotation formatting across \n without <br>
{
    const input = `[Wetin be the something?
Oga, it's nothing](42210952)`;
    const expected = `<a href="/42210952" data-id="42210952" class="null" data-editorial-state="accepted">Wetin be the something?
Oga, it's nothing</a>`;
    const output = markdownToGeniusHtml(input);
    assert.strictEqual(output, expected, "Multi-line annotation should preserve raw \\n newlines and not insert <br>");
    assert(!output.includes("<br>"), "Output must not contain <br> tags");
}

// 3. Multiple annotations across realistic lyrics
{
    const input = `[Intro]
Wait, haha, wait
[Wetin you think though?](11111)

[Verse]
[Wetin be the something?
Oga, it's nothing](42210952)
And [another line](99999)`;

    const expected = `[Intro]
Wait, haha, wait
<a href="/11111" data-id="11111" class="null" data-editorial-state="accepted">Wetin you think though?</a>

[Verse]
<a href="/42210952" data-id="42210952" class="null" data-editorial-state="accepted">Wetin be the something?
Oga, it's nothing</a>
And <a href="/99999" data-id="99999" class="null" data-editorial-state="accepted">another line</a>`;

    const output = markdownToGeniusHtml(input);
    assert.strictEqual(output, expected, "Multiple annotations should all be correctly converted");
}

// 4. Annotation with editorial_state from referents lookup
{
    const referentsMap = {
        "42210952": {
            id: 42210952,
            "editorial-state": "verified"
        },
        "12345": {
            id: 12345,
            editorial_state: "unreviewed"
        }
    };

    const input = "[Verified line](42210952) and [Unreviewed line](12345) and [Default line](77777)";
    const expected = '<a href="/42210952" data-id="42210952" class="null" data-editorial-state="verified">Verified line</a> and <a href="/12345" data-id="12345" class="null" data-editorial-state="unreviewed">Unreviewed line</a> and <a href="/77777" data-id="77777" class="null" data-editorial-state="accepted">Default line</a>';
    const output = markdownToGeniusHtml(input, referentsMap);
    assert.strictEqual(output, expected, "Editorial state from referentsMap should be applied appropriately");
}

// 5. Edge cases: text without annotations, section headers, null/empty inputs
{
    assert.strictEqual(markdownToGeniusHtml(""), "");
    assert.strictEqual(markdownToGeniusHtml(null), "");
    assert.strictEqual(markdownToGeniusHtml(undefined), "");

    const noAnnotations = "[Intro]\nJust regular lyrics with [Chorus] brackets";
    assert.strictEqual(markdownToGeniusHtml(noAnnotations), noAnnotations, "Text without annotations should remain untouched");
}

console.log("All markdownToGeniusHtml unit tests passed successfully!");
