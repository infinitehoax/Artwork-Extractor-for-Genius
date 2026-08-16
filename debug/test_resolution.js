const assert = require('assert');

// Mock fetchSuggestions
global.fetchSuggestions = async function(type, query) {
    if (type === 'artists') {
        if (query === 'DistroKid') {
            return [{ id: 12345, name: 'DistroKid' }];
        }
        if (query === 'To The Moon Records') {
            // Search suggestions return 'A Rocket to the Moon' instead of 'To The Moon Records'
            return [{ id: 9999, name: 'A Rocket to the Moon' }];
        }
    }
    if (type === 'custom_performance_roles') {
        if (query === 'Phonographic Copyright ℗') {
            return [{ id: 8888, label: 'Phonographic Copyright ℗' }];
        }
        if (query === 'Distributor') {
            return [{ id: 7777, label: 'Distributor' }];
        }
    }
    return [];
};

// Extracted resolveArtistQuery and resolveRoleQuery logic from genius_album.js
async function resolveArtistQuery(query) {
    if (!query) return null;
    if (typeof query === 'object' && query.id && (query.name || query.label)) {
        return { id: query.id, name: query.name || query.label };
    }

    const queryString = String(query).trim();
    if (!queryString) return null;

    const results = await fetchSuggestions('artists', queryString);
    if (!results || results.length === 0) {
        return { id: Date.now(), name: queryString };
    }

    const exactMatch = results.find(a => a.name && a.name.toLowerCase() === queryString.toLowerCase());
    if (exactMatch) {
        return { id: exactMatch.id, name: exactMatch.name };
    }

    return { id: Date.now(), name: queryString };
}

async function resolveRoleQuery(query) {
    if (!query) return null;
    if (typeof query === 'object' && query.id && (query.label || query.name)) {
        return { id: query.id, label: query.label || query.name };
    }

    const queryString = String(query).trim();
    if (!queryString) return null;

    const results = await fetchSuggestions('custom_performance_roles', queryString);
    if (!results || results.length === 0) {
        return { id: queryString.toLowerCase().replace(/[^a-z0-9]/g, '_'), label: queryString };
    }

    const exactMatch = results.find(r => (r.label && r.label.toLowerCase() === queryString.toLowerCase()) || (r.name && r.name.toLowerCase() === queryString.toLowerCase()));
    if (exactMatch) {
        return { id: exactMatch.id, label: exactMatch.label || exactMatch.name };
    }

    return { id: queryString.toLowerCase().replace(/[^a-z0-9]/g, '_'), label: queryString };
}

(async () => {
    // Exact match artist test
    const artist1 = await resolveArtistQuery('DistroKid');
    assert.strictEqual(artist1.id, 12345);
    assert.strictEqual(artist1.name, 'DistroKid');

    // Non-exact match artist test (e.g., 'To The Moon Records' -> suggestions return 'A Rocket to the Moon')
    const artist2 = await resolveArtistQuery('To The Moon Records');
    assert.notStrictEqual(artist2.id, 9999);
    assert.strictEqual(artist2.name, 'To The Moon Records');

    // Exact match role test
    const role1 = await resolveRoleQuery('Phonographic Copyright ℗');
    assert.strictEqual(role1.id, 8888);
    assert.strictEqual(role1.label, 'Phonographic Copyright ℗');

    // Non-exact match role test
    const role2 = await resolveRoleQuery('Non Existent Role');
    assert.strictEqual(role2.id, 'non_existent_role');
    assert.strictEqual(role2.label, 'Non Existent Role');

    console.log('All tests passed successfully!');
})();
