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

console.log("All 5 scheduled save calibration tests passed successfully!");
