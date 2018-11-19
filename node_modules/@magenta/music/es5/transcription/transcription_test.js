"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tf = require("@tensorflow/tfjs-core");
var test = require("tape");
var protobuf_1 = require("../protobuf");
var model_1 = require("./model");
var OVER_THRESHOLD_PROB = 0.6;
test('PianorollToNoteSequence', function (t) {
    var frames = tf.buffer([300, model_1.MIDI_PITCHES]);
    var onsets = tf.buffer([300, model_1.MIDI_PITCHES]);
    for (var i = 25; i < 75; ++i) {
        frames.set(OVER_THRESHOLD_PROB, i, 39);
    }
    for (var i = 90; i < 100; ++i) {
        frames.set(OVER_THRESHOLD_PROB, i, 39);
    }
    onsets.set(OVER_THRESHOLD_PROB, 25, 39);
    onsets.set(OVER_THRESHOLD_PROB, 260, 49);
    var expectedNs = protobuf_1.NoteSequence.create({
        notes: [
            {
                pitch: 39 + model_1.MIN_MIDI_PITCH,
                startTime: 25 * model_1.FRAME_LENGTH_SECONDS,
                endTime: 75 * model_1.FRAME_LENGTH_SECONDS,
                velocity: 1
            },
            {
                pitch: 49 + model_1.MIN_MIDI_PITCH,
                startTime: 260 * model_1.FRAME_LENGTH_SECONDS,
                endTime: 261 * model_1.FRAME_LENGTH_SECONDS,
                velocity: 1
            },
        ],
        totalTime: 301 * model_1.FRAME_LENGTH_SECONDS
    });
    model_1.pianorollToNoteSequence(frames.toTensor(), onsets.toTensor(), tf.ones([300, model_1.MIDI_PITCHES]))
        .then(function (ns) {
        t.deepEqual(ns, expectedNs);
        t.end();
    });
});
test('PianorollToNoteSequenceWithOverlappingFrames', function (t) {
    var frames = tf.buffer([100, model_1.MIDI_PITCHES]);
    var onsets = tf.buffer([100, model_1.MIDI_PITCHES]);
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
                pitch: 39 + model_1.MIN_MIDI_PITCH,
                startTime: 25 * model_1.FRAME_LENGTH_SECONDS,
                endTime: 30 * model_1.FRAME_LENGTH_SECONDS,
                velocity: 1
            },
            {
                pitch: 39 + model_1.MIN_MIDI_PITCH,
                startTime: 30 * model_1.FRAME_LENGTH_SECONDS,
                endTime: 35 * model_1.FRAME_LENGTH_SECONDS,
                velocity: 1
            },
            {
                pitch: 39 + model_1.MIN_MIDI_PITCH,
                startTime: 35 * model_1.FRAME_LENGTH_SECONDS,
                endTime: 75 * model_1.FRAME_LENGTH_SECONDS,
                velocity: 1
            },
        ],
        totalTime: 101 * model_1.FRAME_LENGTH_SECONDS
    });
    model_1.pianorollToNoteSequence(frames.toTensor(), onsets.toTensor(), tf.ones([100, model_1.MIDI_PITCHES]))
        .then(function (ns) {
        t.deepEqual(ns, expectedNs);
        t.end();
    });
});
//# sourceMappingURL=transcription_test.js.map