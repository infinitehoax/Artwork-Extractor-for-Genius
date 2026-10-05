const assert = require('assert');

// Mock DOM elements and querySelectorAll simulation
function createMockTrackDOM(numTracks) {
    class MockElement {
        constructor(className, textContent = '', children = []) {
            this.className = className;
            this.textContent = textContent;
            this.children = children;
            children.forEach(c => c.parent = this);
        }

        matches(selector) {
            if (selector.includes('Track__Number')) {
                return this.className.includes('Track__Number');
            }
            if (selector.includes('chart_row-number_container-number')) {
                return this.className.includes('chart_row-number_container-number');
            }
            if (selector.includes('Track__Container')) {
                return this.className.includes('Track__Container');
            }
            if (selector.includes('chart_row-number_container')) {
                return this.className.includes('chart_row-number_container');
            }
            return false;
        }

        querySelector(selector) {
            for (const child of this.children) {
                if (child.matches(selector)) return child;
                const found = child.querySelector(selector);
                if (found) return found;
            }
            return null;
        }

        contains(other) {
            if (other === this) return true;
            for (const child of this.children) {
                if (child === other || child.contains(other)) return true;
            }
            return false;
        }
    }

    const allMatchedElements = [];

    for (let i = 1; i <= numTracks; i++) {
        const numElem = new MockElement('Track__Number-sc-123456-1', String(i));
        const container = new MockElement('Track__Container-sc-123456-0', '', [numElem]);

        // querySelectorAll('a[class^="Track__Container-"], [class*="Track__Container"], div[class*="Track__Number"], .chart_row-number_container')
        // returns both container and inner div in document order
        allMatchedElements.push(container);
        allMatchedElements.push(numElem);
    }

    return { allMatchedElements };
}

function extractTrackNumbersFixed(allMatchedElements, songIds) {
    const trackContainers = Array.from(allMatchedElements).filter(container =>
        !Array.from(allMatchedElements).some(parent => parent !== container && parent.contains(container))
    );

    const rawTrackNumbers = [];
    const trackNumbers = [];

    let currentTrackNumber = 0;

    if (trackContainers.length > 0) {
        trackContainers.forEach(container => {
            let trackNumber = '';
            if (container.matches && container.matches('div[class*="Track__Number"], .chart_row-number_container-number span')) {
                trackNumber = container.textContent.trim();
            } else {
                const numberElement = container.querySelector('div[class*="Track__Number-"], .chart_row-number_container-number span, [class*="Track__Number"]');
                trackNumber = numberElement ? numberElement.textContent.trim() : '';
            }

            rawTrackNumbers.push(trackNumber);

            if (trackNumber && !isNaN(trackNumber)) {
                currentTrackNumber = parseInt(trackNumber, 10);
            } else {
                currentTrackNumber += 1;
            }

            trackNumbers.push(currentTrackNumber);
        });
    }

    const targetLength = songIds ? songIds.length : 0;
    if (targetLength > 0 && rawTrackNumbers.length > targetLength) {
        rawTrackNumbers.splice(targetLength);
        trackNumbers.splice(targetLength);
    } else {
        for (let i = rawTrackNumbers.length; i < targetLength; i++) {
            currentTrackNumber += 1;
            rawTrackNumbers.push(String(i + 1));
            trackNumbers.push(currentTrackNumber);
        }
    }

    return { rawTrackNumbers, trackNumbers };
}

function testTrackNumberExtraction() {
    console.log("Testing 16-track album track number extraction...");
    const numTracks = 16;
    const songIds = Array.from({ length: numTracks }, (_, i) => 1000 + i);
    const { allMatchedElements } = createMockTrackDOM(numTracks);

    const { rawTrackNumbers, trackNumbers } = extractTrackNumbersFixed(allMatchedElements, songIds);

    console.log("Extracted rawTrackNumbers:", rawTrackNumbers);
    console.log("Extracted trackNumbers:", trackNumbers);

    assert.strictEqual(rawTrackNumbers.length, numTracks, `Expected ${numTracks} track numbers, got ${rawTrackNumbers.length}`);
    for (let i = 0; i < numTracks; i++) {
        assert.strictEqual(rawTrackNumbers[i], String(i + 1), `Expected track number at index ${i} to be "${i + 1}", got "${rawTrackNumbers[i]}"`);
        assert.strictEqual(trackNumbers[i], i + 1, `Expected track number at index ${i} to be ${i + 1}, got ${trackNumbers[i]}`);
    }

    console.log("Test passed successfully!");
}

testTrackNumberExtraction();
