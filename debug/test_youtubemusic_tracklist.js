const fs = require('fs');
const assert = require('assert');

function cleanTrackTitle(title) {
    if (!title) return '';
    let cleaned = title.replace(/[\u200B\u00A0]/g, ' ');
    cleaned = cleaned.replace(/\s*[\(\[]\s*(?:feat|ft|featuring)\b\.?\s+.*?[\)\]]/gi, '');
    cleaned = cleaned.replace(/\s+(?:feat|ft|featuring)\b\.?\s+[^\(\)\[\]]*$/gi, '');
    return cleaned.replace(/\s+/g, ' ').trim();
}

// Unit tests for cleanTrackTitle
console.log('Running cleanTrackTitle tests...');

assert.strictEqual(cleanTrackTitle('Carte Blanche (2008 Radio Edit)'), 'Carte Blanche (2008 Radio Edit)');
assert.strictEqual(cleanTrackTitle('Zero'), 'Zero');
assert.strictEqual(cleanTrackTitle('Janeiro (Armin van Buuren Remix)'), 'Janeiro (Armin van Buuren Remix)');
assert.strictEqual(cleanTrackTitle('In The End (Hydroid feat. Santiago Nino Remix) (feat. Santiago Nino Remix)'), 'In The End (Hydroid feat. Santiago Nino Remix)');
assert.strictEqual(cleanTrackTitle('Song Title (feat. Drake)'), 'Song Title');
assert.strictEqual(cleanTrackTitle('Song Title (ft. Drake)'), 'Song Title');
assert.strictEqual(cleanTrackTitle('Song Title [feat. Drake]'), 'Song Title');
assert.strictEqual(cleanTrackTitle('Song Title (featuring Drake)'), 'Song Title');
assert.strictEqual(cleanTrackTitle('Song Title ft. Drake'), 'Song Title');
assert.strictEqual(cleanTrackTitle('Song Title (Club Mix)'), 'Song Title (Club Mix)');
assert.strictEqual(cleanTrackTitle('Song Title (Remix)'), 'Song Title (Remix)');

console.log('cleanTrackTitle unit tests passed!');

// Test with simple regex DOM parsing on sample tracks
const sampleTitles = [
    { index: '1', raw: 'Carte Blanche (2008 Radio Edit)', expected: '1. Carte Blanche (2008 Radio Edit)' },
    { index: '2', raw: 'Zero', expected: '2. Zero' },
    { index: '3', raw: 'Janeiro (Armin van Buuren Remix)', expected: '3. Janeiro (Armin van Buuren Remix)' },
    { index: '26', raw: 'In The End (Hydroid feat. Santiago Nino Remix) (feat. Santiago Nino Remix)', expected: '26. In The End (Hydroid feat. Santiago Nino Remix)' },
    { index: '50', raw: 'New Horizon', expected: '50. New Horizon' }
];

console.log('Testing tracklist formatting...');
sampleTitles.forEach(item => {
    const cleaned = cleanTrackTitle(item.raw);
    const line = `${item.index}. ${cleaned}`;
    assert.strictEqual(line, item.expected);
    console.log(`Formatted: "${line}"`);
});

console.log('All tests passed successfully!');
