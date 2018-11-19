"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var test = require("tape");
var index_1 = require("../protobuf/index");
var constants = require("./constants");
var midi_io = require("./midi_io");
var sequences = require("./sequences");
var simpleNs = index_1.NoteSequence.create({
    ticksPerQuarter: 220,
    totalTime: 1.5,
    timeSignatures: [{ time: 0, numerator: 4, denominator: 4 }],
    tempos: [{ time: 0, qpm: 120 }],
    sourceInfo: {
        encodingType: index_1.NoteSequence.SourceInfo.EncodingType.MIDI,
        parser: index_1.NoteSequence.SourceInfo.Parser.TONEJS_MIDI_CONVERT
    },
    notes: [
        {
            instrument: 0,
            program: 0,
            startTime: 0,
            endTime: 0.125,
            pitch: 60,
            velocity: 100,
            isDrum: false
        },
        {
            instrument: 0,
            program: 0,
            startTime: 0.125,
            endTime: 0.25,
            pitch: 62,
            velocity: 100,
            isDrum: false
        },
        {
            instrument: 0,
            program: 0,
            startTime: 0.25,
            endTime: 0.375,
            pitch: 64,
            velocity: 100,
            isDrum: false
        },
        {
            instrument: 0,
            program: 0,
            startTime: 0.375,
            endTime: 0.5,
            pitch: 66,
            velocity: 100,
            isDrum: false
        },
        {
            instrument: 0,
            program: 0,
            startTime: 0.5,
            endTime: 0.625,
            pitch: 68,
            velocity: 100,
            isDrum: false
        },
        {
            instrument: 0,
            program: 0,
            startTime: 0.625,
            endTime: 0.75,
            pitch: 70,
            velocity: 100,
            isDrum: false
        },
        {
            instrument: 0,
            program: 0,
            startTime: 0.75,
            endTime: 0.875,
            pitch: 72,
            velocity: 100,
            isDrum: false
        },
        {
            instrument: 0,
            program: 0,
            startTime: 0.875,
            endTime: 1,
            pitch: 70,
            velocity: 100,
            isDrum: false
        },
        {
            instrument: 0,
            program: 0,
            startTime: 1,
            endTime: 1.125,
            pitch: 68,
            velocity: 100,
            isDrum: false
        },
        {
            instrument: 0,
            program: 0,
            startTime: 1.125,
            endTime: 1.25,
            pitch: 66,
            velocity: 100,
            isDrum: false
        },
        {
            instrument: 0,
            program: 0,
            startTime: 1.25,
            endTime: 1.375,
            pitch: 64,
            velocity: 100,
            isDrum: false
        },
        {
            instrument: 0,
            program: 0,
            startTime: 1.375,
            endTime: 1.5,
            pitch: 62,
            velocity: 100,
            isDrum: false
        }
    ]
});
var polyNs = index_1.NoteSequence.create({
    ticksPerQuarter: 220,
    totalTime: 1.0,
    timeSignatures: [{ time: 0, numerator: 4, denominator: 4 }],
    tempos: [{ time: 0, qpm: 120 }],
    sourceInfo: {
        encodingType: index_1.NoteSequence.SourceInfo.EncodingType.MIDI,
        parser: index_1.NoteSequence.SourceInfo.Parser.TONEJS_MIDI_CONVERT
    },
    notes: [
        {
            instrument: 0,
            program: 0,
            startTime: 0.0,
            endTime: 1.0,
            pitch: 60,
            velocity: 100,
            isDrum: false
        },
        {
            instrument: 0,
            program: 0,
            startTime: 0.125,
            endTime: 0.875,
            pitch: 62,
            velocity: 100,
            isDrum: false
        },
        {
            instrument: 0,
            program: 0,
            startTime: 0.25,
            endTime: 0.75,
            pitch: 64,
            velocity: 100,
            isDrum: false
        },
        {
            instrument: 0,
            program: 0,
            startTime: 0.375,
            endTime: 0.625,
            pitch: 67,
            velocity: 100,
            isDrum: false
        }
    ]
});
test('Parse Simple MIDI', function (t) {
    var midi = fs.readFileSync('../testdata/melody.mid', 'binary');
    var ns = midi_io.midiToSequenceProto(midi);
    t.deepEqual(ns, simpleNs);
    var nsRoundTrip = midi_io.midiToSequenceProto(String.fromCharCode.apply(null, midi_io.sequenceProtoToMidi(ns)));
    t.deepEqual(nsRoundTrip, simpleNs);
    t.end();
});
test('Create Simple MIDI File', function (t) {
    var midiFile = midi_io.sequenceProtoToMidi(simpleNs);
    t.deepEqual(midi_io.midiToSequenceProto(String.fromCharCode.apply(null, midiFile)), simpleNs);
    t.end();
});
test('Create MIDI File With Polyphony', function (t) {
    var midiFile = midi_io.sequenceProtoToMidi(polyNs);
    t.deepEqual(midi_io.midiToSequenceProto(String.fromCharCode.apply(null, midiFile)), polyNs);
    t.end();
});
test('Write MIDI Using Defaults', function (t) {
    var strippedNs = sequences.clone(simpleNs);
    strippedNs.tempos = undefined;
    strippedNs.timeSignatures = undefined;
    strippedNs.ticksPerQuarter = undefined;
    strippedNs.notes.forEach(function (n) {
        n.velocity = undefined;
        n.isDrum = undefined;
        n.instrument = undefined;
        n.program = undefined;
    });
    var expectedNs = sequences.clone(simpleNs);
    expectedNs.notes.forEach(function (n) {
        n.velocity = constants.DEFAULT_VELOCITY;
        n.program = constants.DEFAULT_PROGRAM;
    });
    var nsRoundTrip = midi_io.midiToSequenceProto(String.fromCharCode.apply(null, midi_io.sequenceProtoToMidi(strippedNs)));
    t.deepEqual(nsRoundTrip, expectedNs);
    t.end();
});
//# sourceMappingURL=midi_io_test.js.map