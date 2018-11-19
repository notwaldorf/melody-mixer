"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tf = require("@tensorflow/tfjs-core");
var test = require("tape");
var protobuf_1 = require("../protobuf");
var constants_1 = require("./constants");
var transcription_utils_1 = require("./transcription_utils");
var OVER_THRESHOLD_PROB = 0.6;
test('PianorollToNoteSequence', function (t) {
    var frames = tf.buffer([300, constants_1.MIDI_PITCHES]);
    var onsets = tf.buffer([300, constants_1.MIDI_PITCHES]);
    for (var i = 25; i < 75; ++i) {
        frames.set(OVER_THRESHOLD_PROB, i, 39);
    }
    for (var i = 90; i < 100; ++i) {
        frames.set(OVER_THRESHOLD_PROB, i, 39);
    }
    onsets.set(OVER_THRESHOLD_PROB, 25, 39);
    onsets.set(OVER_THRESHOLD_PROB, 260, 49);
    onsets.set(OVER_THRESHOLD_PROB, 299, 50);
    var expectedNs = protobuf_1.NoteSequence.create({
        notes: [
            {
                pitch: 39 + constants_1.MIN_MIDI_PITCH,
                startTime: 25 * constants_1.FRAME_LENGTH_SECONDS,
                endTime: 75 * constants_1.FRAME_LENGTH_SECONDS,
                velocity: 1
            },
            {
                pitch: 49 + constants_1.MIN_MIDI_PITCH,
                startTime: 260 * constants_1.FRAME_LENGTH_SECONDS,
                endTime: 261 * constants_1.FRAME_LENGTH_SECONDS,
                velocity: 1
            },
            {
                pitch: 50 + constants_1.MIN_MIDI_PITCH,
                startTime: 299 * constants_1.FRAME_LENGTH_SECONDS,
                endTime: 300 * constants_1.FRAME_LENGTH_SECONDS,
                velocity: 1
            },
        ],
        totalTime: 300 * constants_1.FRAME_LENGTH_SECONDS
    });
    transcription_utils_1.pianorollToNoteSequence(frames.toTensor(), onsets.toTensor(), tf.ones([300, constants_1.MIDI_PITCHES]))
        .then(function (ns) {
        t.deepEqual(ns, expectedNs);
        t.end();
    });
});
test('PianorollToNoteSequenceWithOverlappingFrames', function (t) {
    var frames = tf.buffer([100, constants_1.MIDI_PITCHES]);
    var onsets = tf.buffer([100, constants_1.MIDI_PITCHES]);
    for (var i = 25; i < 75; ++i) {
        frames.set(OVER_THRESHOLD_PROB, i, 39);
    }
    for (var i = 90; i < 100; ++i) {
        frames.set(OVER_THRESHOLD_PROB, i, 39);
    }
    onsets.set(OVER_THRESHOLD_PROB, 25, 39);
    onsets.set(OVER_THRESHOLD_PROB, 30, 39);
    onsets.set(OVER_THRESHOLD_PROB, 35, 39);
    onsets.set(OVER_THRESHOLD_PROB, 36, 39);
    var expectedNs = protobuf_1.NoteSequence.create({
        notes: [
            {
                pitch: 39 + constants_1.MIN_MIDI_PITCH,
                startTime: 25 * constants_1.FRAME_LENGTH_SECONDS,
                endTime: 30 * constants_1.FRAME_LENGTH_SECONDS,
                velocity: 1
            },
            {
                pitch: 39 + constants_1.MIN_MIDI_PITCH,
                startTime: 30 * constants_1.FRAME_LENGTH_SECONDS,
                endTime: 35 * constants_1.FRAME_LENGTH_SECONDS,
                velocity: 1
            },
            {
                pitch: 39 + constants_1.MIN_MIDI_PITCH,
                startTime: 35 * constants_1.FRAME_LENGTH_SECONDS,
                endTime: 75 * constants_1.FRAME_LENGTH_SECONDS,
                velocity: 1
            },
        ],
        totalTime: 100 * constants_1.FRAME_LENGTH_SECONDS
    });
    transcription_utils_1.pianorollToNoteSequence(frames.toTensor(), onsets.toTensor(), tf.ones([100, constants_1.MIDI_PITCHES]))
        .then(function (ns) {
        t.deepEqual(ns, expectedNs);
        t.end();
    });
});
function fakeInput(l, w) {
    var input = [];
    for (var i = 0; i < l; ++i) {
        var row = [];
        for (var j = 0; j < w; ++j) {
            row.push(i * w + j);
        }
        input.push(row);
    }
    return input;
}
var flatten = (function (a) { return [].concat.apply([], a); });
test('BatchInputWithOneBatch', function (t) {
    var input = fakeInput(100, 4);
    var batches = transcription_utils_1.batchInput(input, 100);
    t.deepEqual(batches.shape, [1, 100, 4]);
    t.deepEqual(batches.dataSync(), flatten(input));
    batches = transcription_utils_1.batchInput(input, 150);
    t.deepEqual(batches.shape, [1, 100, 4]);
    t.deepEqual(batches.dataSync(), flatten(input));
    input = fakeInput(103, 4);
    batches = transcription_utils_1.batchInput(input, 100);
    t.deepEqual(batches.shape, [1, 103, 4]);
    t.deepEqual(batches.dataSync(), flatten(input));
    t.end();
});
test('BatchInputWithTwoBatch', function (t) {
    var input = fakeInput(100, 4);
    var batches = transcription_utils_1.batchInput(input, 50);
    t.deepEqual(batches.shape, [2, 56, 4]);
    t.deepEqual(batches.slice(0, 1).dataSync(), flatten(input.slice(0, 56)));
    t.deepEqual(batches.slice(1, 1).dataSync(), flatten(input.slice(44)));
    var unbatched = transcription_utils_1.unbatchOutput(batches, 50, 100);
    t.deepEqual(unbatched.shape, [1, 100, 4]);
    t.deepEqual(unbatched.dataSync(), flatten(input));
    batches = transcription_utils_1.batchInput(input, 75);
    t.deepEqual(batches.shape, [2, 81, 4]);
    t.deepEqual(batches.slice(0, 1).dataSync(), flatten(input.slice(0, 81)));
    t.deepEqual(batches.slice(1, 1).dataSync(), flatten(input.slice(19)));
    unbatched = transcription_utils_1.unbatchOutput(batches, 75, 100);
    t.deepEqual(unbatched.shape, [1, 100, 4]);
    t.deepEqual(unbatched.dataSync(), flatten(input));
    input = fakeInput(103, 4);
    batches = transcription_utils_1.batchInput(input, 50);
    t.deepEqual(batches.shape, [2, 56, 4]);
    t.deepEqual(batches.slice(0, 1).dataSync(), flatten(input.slice(0, 56)));
    t.deepEqual(batches.slice(1, 1).dataSync(), flatten(input.slice(47)));
    unbatched = transcription_utils_1.unbatchOutput(batches, 50, 103);
    t.deepEqual(unbatched.shape, [1, 103, 4]);
    t.deepEqual(unbatched.dataSync(), flatten(input));
    t.end();
});
test('BatchInputWithOverTwoBatch', function (t) {
    var input = fakeInput(100, 4);
    var batches = transcription_utils_1.batchInput(input, 25);
    t.deepEqual(batches.shape, [4, 31, 4]);
    t.deepEqual(batches.slice(0, 1).dataSync(), flatten(input.slice(0, 31)));
    t.deepEqual(batches.slice(1, 1).dataSync(), flatten(input.slice(22, 53)));
    t.deepEqual(batches.slice(2, 1).dataSync(), flatten(input.slice(47, 78)));
    t.deepEqual(batches.slice(3, 1).dataSync(), flatten(input.slice(69)));
    var unbatched = transcription_utils_1.unbatchOutput(batches, 25, 100);
    t.deepEqual(unbatched.shape, [1, 100, 4]);
    t.deepEqual(unbatched.dataSync(), flatten(input));
    batches = transcription_utils_1.batchInput(input, 22);
    t.deepEqual(batches.shape, [5, 28, 4]);
    t.deepEqual(batches.slice(0, 1).dataSync(), flatten(input.slice(0, 28)));
    t.deepEqual(batches.slice(1, 1).dataSync(), flatten(input.slice(19, 47)));
    t.deepEqual(batches.slice(2, 1).dataSync(), flatten(input.slice(41, 69)));
    t.deepEqual(batches.slice(3, 1).dataSync(), flatten(input.slice(63, 91)));
    t.deepEqual(batches.slice(4, 1).dataSync(), flatten(input.slice(100 - 28)));
    unbatched = transcription_utils_1.unbatchOutput(batches, 22, 100);
    t.deepEqual(unbatched.shape, [1, 100, 4]);
    t.deepEqual(unbatched.dataSync(), flatten(input));
    input = fakeInput(103, 4);
    batches = transcription_utils_1.batchInput(input, 25);
    t.deepEqual(batches.shape, [4, 31, 4]);
    t.deepEqual(batches.slice(0, 1).dataSync(), flatten(input.slice(0, 31)));
    t.deepEqual(batches.slice(1, 1).dataSync(), flatten(input.slice(22, 53)));
    t.deepEqual(batches.slice(2, 1).dataSync(), flatten(input.slice(47, 78)));
    t.deepEqual(batches.slice(3, 1).dataSync(), flatten(input.slice(103 - 31)));
    unbatched = transcription_utils_1.unbatchOutput(batches, 25, 103);
    t.deepEqual(unbatched.shape, [1, 103, 4]);
    t.deepEqual(unbatched.dataSync(), flatten(input));
    t.end();
});
//# sourceMappingURL=transcription_utils_test.js.map