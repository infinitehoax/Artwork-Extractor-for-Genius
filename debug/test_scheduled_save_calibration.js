const assert = require('assert');

// SNTP clock offset formula:
// t0: client send, t3: client receive, serverTimestamp: server-reported time
// offset = serverTimestamp - clientMidpoint = serverTimestamp - (t0 + t3)/2
function computeClockOffsetAndLatency(t0, t3, serverTimestamp) {
    const rtt = Math.max(0, t3 - t0);
    const oneWayLatency = Math.round(rtt / 2);
    const clientMidpoint = (t0 + t3) / 2;
    const clockOffset = Math.round(serverTimestamp - clientMidpoint);
    return { rtt, oneWayLatency, clockOffset };
}

function calculateTargetClientDispatchTime(targetEpoch, clockOffset, oneWayLatency, manualOffset = 0, isFixLatency = true) {
    if (!isFixLatency) {
        return targetEpoch;
    }
    return targetEpoch - clockOffset - oneWayLatency + manualOffset;
}

function evaluateArrivalAccuracy(clientSendEpoch, rtt, clockOffset, targetEpoch) {
    const oneWay = Math.round(rtt / 2);
    const estimatedArrivalEpoch = clientSendEpoch + oneWay + clockOffset;
    const deltaMs = estimatedArrivalEpoch - targetEpoch;
    return { estimatedArrivalEpoch, deltaMs };
}

console.log("Running scheduled save calibration & latency compensation unit tests...");

// Test Case 1: Device clock 2500ms behind server time, RTT 100ms
{
    const t0 = 10000;
    const t3 = 10100;
    const serverTimestamp = 12550; // Server time at midpoint (10050) is 12550 -> offset +2500ms
    const { rtt, oneWayLatency, clockOffset } = computeClockOffsetAndLatency(t0, t3, serverTimestamp);

    assert.strictEqual(rtt, 100, "RTT should be 100ms");
    assert.strictEqual(oneWayLatency, 50, "One-way latency should be 50ms");
    assert.strictEqual(clockOffset, 2500, "Clock offset should be 2500ms");

    const targetServerEpoch = 50000;
    const clientDispatchTime = calculateTargetClientDispatchTime(targetServerEpoch, clockOffset, oneWayLatency, 0, true);
    // target in client time = 50000 - 2500 - 50 = 47450
    assert.strictEqual(clientDispatchTime, 47450, "Client should dispatch at 47450ms");

    const accuracy = evaluateArrivalAccuracy(clientDispatchTime, rtt, clockOffset, targetServerEpoch);
    assert.strictEqual(accuracy.deltaMs, 0, "Arrival error should be 0ms when dispatched at calibrated time");
}

// Test Case 2: Device clock 3000ms ahead of server time, RTT 180ms
{
    const t0 = 15000;
    const t3 = 15180;
    const serverTimestamp = 12090; // Midpoint is 15090 -> offset is 12090 - 15090 = -3000ms
    const { rtt, oneWayLatency, clockOffset } = computeClockOffsetAndLatency(t0, t3, serverTimestamp);

    assert.strictEqual(rtt, 180);
    assert.strictEqual(oneWayLatency, 90);
    assert.strictEqual(clockOffset, -3000);

    const targetServerEpoch = 60000;
    const clientDispatchTime = calculateTargetClientDispatchTime(targetServerEpoch, clockOffset, oneWayLatency, 0, true);
    // 60000 - (-3000) - 90 = 62910
    assert.strictEqual(clientDispatchTime, 62910);

    const accuracy = evaluateArrivalAccuracy(clientDispatchTime, rtt, clockOffset, targetServerEpoch);
    assert.strictEqual(accuracy.deltaMs, 0);
}

// Test Case 3: Manual fine-tune offset application (-25ms to dispatch slightly earlier)
{
    const { clockOffset, oneWayLatency } = computeClockOffsetAndLatency(10000, 10100, 10050); // in sync, 50ms lag
    assert.strictEqual(clockOffset, 0);
    assert.strictEqual(oneWayLatency, 50);

    const targetEpoch = 20000;
    const clientDispatchTime = calculateTargetClientDispatchTime(targetEpoch, clockOffset, oneWayLatency, -25, true);
    // 20000 - 0 - 50 + (-25) = 19925
    assert.strictEqual(clientDispatchTime, 19925);
}

// Test Case 4: Fix latency disabled
{
    const targetEpoch = 20000;
    const clientDispatchTime = calculateTargetClientDispatchTime(targetEpoch, 2000, 100, -25, false);
    assert.strictEqual(clientDispatchTime, targetEpoch, "Should not modify target when fixLatency is false");
}

// Test Case 5: Telemetry aggregation & outlier median filtering
{
    const rtts = [140, 95, 300, 110]; // outlier 300
    rtts.sort((a, b) => a - b); // [95, 110, 140, 300]
    const medianRtt = rtts[Math.floor(rtts.length / 2)];
    assert.strictEqual(medianRtt, 140, "Median filtering rejects transient spikes");
}

// Test Case 6: parseActualSaveTimeToEpoch function parsing HH:MM:SS and HH:MM:SS.mmm
function parseActualSaveTimeToEpoch(timeStr, baseEpoch = Date.now()) {
    if (!timeStr || typeof timeStr !== "string") return null;
    const trimmed = timeStr.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/);
    if (!match) return null;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = match[3] ? parseInt(match[3], 10) : 0;
    const millis = match[4] ? parseInt(match[4].padEnd(3, "0"), 10) : 0;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return null;

    const ref = new Date(baseEpoch);
    const candidate = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), hours, minutes, seconds, millis);
    let candidateEpoch = candidate.getTime();

    // Handle midnight / day boundary roll-over
    if (candidateEpoch - baseEpoch > 12 * 3600 * 1000) {
        candidateEpoch -= 24 * 3600 * 1000;
    } else if (baseEpoch - candidateEpoch > 12 * 3600 * 1000) {
        candidateEpoch += 24 * 3600 * 1000;
    }
    return candidateEpoch;
}

{
    const baseDate = new Date(2026, 10, 10, 14, 0, 0, 0); // 14:00:00
    const baseEpoch = baseDate.getTime();

    const parsed1 = parseActualSaveTimeToEpoch("14:00:01", baseEpoch);
    assert.strictEqual(parsed1, baseEpoch + 1000, "Should parse HH:MM:SS +1s accurately");

    const parsed2 = parseActualSaveTimeToEpoch("14:00:01.450", baseEpoch);
    assert.strictEqual(parsed2, baseEpoch + 1450, "Should parse HH:MM:SS.mmm accurately");

    const parsedInvalid = parseActualSaveTimeToEpoch("not-a-time", baseEpoch);
    assert.strictEqual(parsedInvalid, null, "Should return null for invalid time string");

    // Test day wrap-around around midnight (e.g. base is 23:59:59 and entered 00:00:01)
    const midnightBase = new Date(2026, 10, 10, 23, 59, 59, 0).getTime();
    const parsedMidnight = parseActualSaveTimeToEpoch("00:00:01", midnightBase);
    assert.strictEqual(parsedMidnight, midnightBase + 2000, "Should handle midnight wrap-around to next day");
}

// Test Case 7: computeSaveDisparity and calculateCalibrationAverages across multiple runs
function computeSaveDisparity(clientSendEpoch, clientReceiveEpoch, actualSaveEpoch) {
    const rtt = Math.max(0, clientReceiveEpoch - clientSendEpoch);
    const oneWayLatency = Math.round(rtt / 2);
    const expectedClientArrival = clientSendEpoch + oneWayLatency;
    const deltaMs = actualSaveEpoch - expectedClientArrival;
    return {
        rtt,
        oneWayLatency,
        expectedClientArrival,
        deltaMs
    };
}

function calculateCalibrationAverages(runs) {
    const completedRuns = (runs || []).filter(r => r && r.success && typeof r.deltaMs === "number");
    if (completedRuns.length === 0) {
        return {
            count: 0,
            avgRtt: 0,
            avgOneWayLatency: 0,
            avgDeltaMs: 0,
            recommendedManualOffsetMs: 0
        };
    }
    const totalRtt = completedRuns.reduce((sum, r) => sum + r.rtt, 0);
    const totalOneWay = completedRuns.reduce((sum, r) => sum + r.oneWayLatency, 0);
    const totalDelta = completedRuns.reduce((sum, r) => sum + r.deltaMs, 0);

    const avgRtt = Math.round(totalRtt / completedRuns.length);
    const avgOneWayLatency = Math.round(totalOneWay / completedRuns.length);
    const avgDeltaMs = Math.round(totalDelta / completedRuns.length);
    const recommendedManualOffsetMs = -avgDeltaMs;

    return {
        count: completedRuns.length,
        avgRtt,
        avgOneWayLatency,
        avgDeltaMs,
        recommendedManualOffsetMs
    };
}

{
    const clientSend1 = 10000;
    const clientRecv1 = 10200; // RTT = 200, 1-way = 100. Expected arrival = 10100
    const actualSave1 = 11100; // registered 1000ms later (1 sec delay on Genius side)
    const disparity1 = computeSaveDisparity(clientSend1, clientRecv1, actualSave1);
    assert.strictEqual(disparity1.rtt, 200);
    assert.strictEqual(disparity1.oneWayLatency, 100);
    assert.strictEqual(disparity1.deltaMs, 1000, "Delta should be +1000ms");

    const clientSend2 = 20000;
    const clientRecv2 = 20180; // RTT = 180, 1-way = 90. Expected arrival = 20090
    const actualSave2 = 21090; // registered 1000ms later
    const disparity2 = computeSaveDisparity(clientSend2, clientRecv2, actualSave2);
    assert.strictEqual(disparity2.deltaMs, 1000);

    const clientSend3 = 30000;
    const clientRecv3 = 30220; // RTT = 220, 1-way = 110. Expected arrival = 30110
    const actualSave3 = 31170; // registered 1060ms later
    const disparity3 = computeSaveDisparity(clientSend3, clientRecv3, actualSave3);
    assert.strictEqual(disparity3.deltaMs, 1060);

    const runs = [
        { success: true, rtt: disparity1.rtt, oneWayLatency: disparity1.oneWayLatency, deltaMs: disparity1.deltaMs },
        { success: true, rtt: disparity2.rtt, oneWayLatency: disparity2.oneWayLatency, deltaMs: disparity2.deltaMs },
        { success: true, rtt: disparity3.rtt, oneWayLatency: disparity3.oneWayLatency, deltaMs: disparity3.deltaMs }
    ];

    const averages = calculateCalibrationAverages(runs);
    assert.strictEqual(averages.count, 3);
    assert.strictEqual(averages.avgRtt, 200); // (200 + 180 + 220) / 3 = 200
    assert.strictEqual(averages.avgOneWayLatency, 100); // (100 + 90 + 110) / 3 = 100
    assert.strictEqual(averages.avgDeltaMs, 1020); // (1000 + 1000 + 1060) / 3 = 1020
    assert.strictEqual(averages.recommendedManualOffsetMs, -1020, "Should recommend -1020ms to fire earlier and hit exact second");
}

console.log("All 7 scheduled save calibration tests passed successfully!");
