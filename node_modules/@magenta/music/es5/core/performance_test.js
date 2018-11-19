"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var test = require("tape");
var index_1 = require("../protobuf/index");
var performance_1 = require("./performance");
test('From NoteSequence', function (t) {
    var noteSequence = index_1.NoteSequence.create({
        quantizationInfo: { stepsPerSecond: 10 },
        notes: [
            { pitch: 60, velocity: 127, quantizedStartStep: 0, quantizedEndStep: 40 },
            { pitch: 64, velocity: 127, quantizedStartStep: 0, quantizedEndStep: 30 },
            { pitch: 67, velocity: 127, quantizedStartStep: 10, quantizedEndStep: 20 },
        ],
        totalQuantizedSteps: 40
    });
    var performance = performance_1.Performance.fromNoteSequence(noteSequence, 10, 0);
    var expectedEvents = [
        { type: 'note-on', pitch: 60 },
        { type: 'note-on', pitch: 64 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-on', pitch: 67 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 67 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 64 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 60 },
    ];
    t.deepEqual(performance.events, expectedEvents);
    t.end();
});
test('From NoteSequence With Velocity', function (t) {
    var noteSequence = index_1.NoteSequence.create({
        quantizationInfo: { stepsPerSecond: 10 },
        notes: [
            { pitch: 60, velocity: 100, quantizedStartStep: 0, quantizedEndStep: 40 },
            { pitch: 64, velocity: 100, quantizedStartStep: 0, quantizedEndStep: 30 },
            { pitch: 67, velocity: 127, quantizedStartStep: 10, quantizedEndStep: 20 },
        ],
        totalQuantizedSteps: 40
    });
    var performance = performance_1.Performance.fromNoteSequence(noteSequence, 10, 127);
    var expectedEvents = [
        { type: 'velocity-change', velocityBin: 100 },
        { type: 'note-on', pitch: 60 },
        { type: 'note-on', pitch: 64 },
        { type: 'time-shift', steps: 10 },
        { type: 'velocity-change', velocityBin: 127 },
        { type: 'note-on', pitch: 67 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 67 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 64 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 60 },
    ];
    t.deepEqual(performance.events, expectedEvents);
    t.end();
});
test('From NoteSequence With Quantized Velocity', function (t) {
    var noteSequence = index_1.NoteSequence.create({
        quantizationInfo: { stepsPerSecond: 10 },
        notes: [
            { pitch: 60, velocity: 100, quantizedStartStep: 0, quantizedEndStep: 40 },
            { pitch: 64, velocity: 100, quantizedStartStep: 0, quantizedEndStep: 30 },
            { pitch: 67, velocity: 127, quantizedStartStep: 10, quantizedEndStep: 20 },
        ],
        totalQuantizedSteps: 40
    });
    var performance = performance_1.Performance.fromNoteSequence(noteSequence, 10, 16);
    var expectedEvents = [
        { type: 'velocity-change', velocityBin: 13 },
        { type: 'note-on', pitch: 60 },
        { type: 'note-on', pitch: 64 },
        { type: 'time-shift', steps: 10 },
        { type: 'velocity-change', velocityBin: 16 },
        { type: 'note-on', pitch: 67 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 67 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 64 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 60 },
    ];
    t.deepEqual(performance.events, expectedEvents);
    t.end();
});
test('From NoteSequence (Program and Drum Status)', function (t) {
    var noteSequence = index_1.NoteSequence.create({
        quantizationInfo: { stepsPerSecond: 10 },
        notes: [
            { pitch: 60, quantizedEndStep: 40, instrument: 0, program: 1 },
            { pitch: 64, quantizedEndStep: 30, instrument: 0, program: 1 },
            { pitch: 67, quantizedEndStep: 20, instrument: 0, program: 1 },
            { pitch: 36, quantizedEndStep: 40, instrument: 1, program: 2 },
            { pitch: 48, quantizedEndStep: 40, instrument: 1, program: 2 },
            { pitch: 57, quantizedEndStep: 1, instrument: 2, program: 0, isDrum: true },
        ],
        totalQuantizedSteps: 40
    });
    var performance = performance_1.Performance.fromNoteSequence(noteSequence, 10, 0);
    var performance0 = performance_1.Performance.fromNoteSequence(noteSequence, 10, 0, 0);
    var performance1 = performance_1.Performance.fromNoteSequence(noteSequence, 10, 0, 1);
    var performance2 = performance_1.Performance.fromNoteSequence(noteSequence, 10, 0, 2);
    t.equal(performance.program, undefined);
    t.equal(performance.isDrum, undefined);
    t.equal(performance0.program, 1);
    t.equal(performance0.isDrum, false);
    t.equal(performance1.program, 2);
    t.equal(performance1.isDrum, false);
    t.equal(performance2.program, undefined);
    t.equal(performance2.isDrum, true);
    t.end();
});
test('Add Steps', function (t) {
    var performance = new performance_1.Performance([], 10, 0);
    performance.setNumSteps(5);
    t.equal(performance.getNumSteps(), 5);
    t.deepEqual(performance.events, [{ type: 'time-shift', steps: 5 }]);
    performance.setNumSteps(15);
    t.equal(performance.getNumSteps(), 15);
    t.deepEqual(performance.events, [{ type: 'time-shift', steps: 10 }, { type: 'time-shift', steps: 5 }]);
    performance.setNumSteps(20);
    t.equal(performance.getNumSteps(), 20);
    t.deepEqual(performance.events, [{ type: 'time-shift', steps: 10 }, { type: 'time-shift', steps: 10 }]);
    t.end();
});
test('Remove Steps', function (t) {
    var events = [
        { type: 'note-on', pitch: 60 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 60 },
        { type: 'note-on', pitch: 64 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 64 },
        { type: 'note-on', pitch: 67 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 67 },
    ];
    var performance = new performance_1.Performance(events, 10, 0);
    performance.setNumSteps(20);
    var expectedEvents = [
        { type: 'note-on', pitch: 60 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 60 },
        { type: 'note-on', pitch: 64 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 64 },
        { type: 'note-on', pitch: 67 },
    ];
    t.equal(performance.getNumSteps(), 20);
    t.deepEqual(performance.events, expectedEvents);
    performance.setNumSteps(5);
    t.equal(performance.getNumSteps(), 5);
    t.deepEqual(performance.events, [{ type: 'note-on', pitch: 60 }, { type: 'time-shift', steps: 5 }]);
    t.end();
});
test('To NoteSequence', function (t) {
    var events = [
        { type: 'note-on', pitch: 60 },
        { type: 'note-on', pitch: 64 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-on', pitch: 67 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 67 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 64 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 60 },
    ];
    var performance = new performance_1.Performance(events, 10, 0);
    var noteSequence = performance.toNoteSequence();
    var expectedNoteSequence = index_1.NoteSequence.create({
        notes: [
            { pitch: 67, quantizedStartStep: 10, quantizedEndStep: 20 },
            { pitch: 64, quantizedStartStep: 0, quantizedEndStep: 30 },
            { pitch: 60, quantizedStartStep: 0, quantizedEndStep: 40 },
        ],
        totalQuantizedSteps: 40
    });
    t.deepEqual(noteSequence, expectedNoteSequence);
    t.end();
});
test('To NoteSequence With Velocity', function (t) {
    var events = [
        { type: 'velocity-change', velocityBin: 100 },
        { type: 'note-on', pitch: 60 },
        { type: 'velocity-change', velocityBin: 115 },
        { type: 'note-on', pitch: 64 },
        { type: 'velocity-change', velocityBin: 127 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-on', pitch: 67 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 67 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 64 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 60 },
    ];
    var performance = new performance_1.Performance(events, 10, 127);
    var noteSequence = performance.toNoteSequence();
    var expectedNoteSequence = index_1.NoteSequence.create({
        notes: [
            { pitch: 67, velocity: 127, quantizedStartStep: 10, quantizedEndStep: 20 },
            { pitch: 64, velocity: 115, quantizedStartStep: 0, quantizedEndStep: 30 },
            { pitch: 60, velocity: 100, quantizedStartStep: 0, quantizedEndStep: 40 },
        ],
        totalQuantizedSteps: 40
    });
    t.deepEqual(noteSequence, expectedNoteSequence);
    t.end();
});
test('To NoteSequence With Quantized Velocity', function (t) {
    var events = [
        { type: 'velocity-change', velocityBin: 13 },
        { type: 'note-on', pitch: 60 },
        { type: 'note-on', pitch: 64 },
        { type: 'velocity-change', velocityBin: 16 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-on', pitch: 67 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 67 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 64 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-off', pitch: 60 },
    ];
    var performance = new performance_1.Performance(events, 10, 16);
    var noteSequence = performance.toNoteSequence();
    var expectedNoteSequence = index_1.NoteSequence.create({
        notes: [
            { pitch: 67, velocity: 121, quantizedStartStep: 10, quantizedEndStep: 20 },
            { pitch: 64, velocity: 97, quantizedStartStep: 0, quantizedEndStep: 30 },
            { pitch: 60, velocity: 97, quantizedStartStep: 0, quantizedEndStep: 40 },
        ],
        totalQuantizedSteps: 40
    });
    t.deepEqual(noteSequence, expectedNoteSequence);
    t.end();
});
test('To NoteSequence With Unmatched Note-Offs', function (t) {
    var events = [
        { type: 'note-on', pitch: 60 },
        { type: 'note-on', pitch: 64 },
        { type: 'time-shift', steps: 5 },
        { type: 'note-off', pitch: 60 },
        { type: 'note-off', pitch: 64 },
        { type: 'note-off', pitch: 67 },
    ];
    var performance = new performance_1.Performance(events, 10, 0);
    var noteSequence = performance.toNoteSequence();
    var expectedNoteSequence = index_1.NoteSequence.create({
        notes: [
            { pitch: 60, quantizedStartStep: 0, quantizedEndStep: 5 },
            { pitch: 64, quantizedStartStep: 0, quantizedEndStep: 5 },
        ],
        totalQuantizedSteps: 5
    });
    t.deepEqual(noteSequence, expectedNoteSequence);
    t.end();
});
test('To NoteSequence With Unmatched Note-Ons', function (t) {
    var events = [
        { type: 'note-on', pitch: 60 },
        { type: 'note-on', pitch: 64 },
        { type: 'time-shift', steps: 10 },
    ];
    var performance = new performance_1.Performance(events, 10, 0);
    var noteSequence = performance.toNoteSequence();
    var expectedNoteSequence = index_1.NoteSequence.create({
        notes: [
            { pitch: 60, quantizedStartStep: 0, quantizedEndStep: 10 },
            { pitch: 64, quantizedStartStep: 0, quantizedEndStep: 10 },
        ],
        totalQuantizedSteps: 10
    });
    t.deepEqual(noteSequence, expectedNoteSequence);
    t.end();
});
test('To NoteSequence With Repeated Notes', function (t) {
    var events = [
        { type: 'note-on', pitch: 60 },
        { type: 'note-on', pitch: 64 },
        { type: 'time-shift', steps: 10 },
        { type: 'note-on', pitch: 60 },
        { type: 'time-shift', steps: 10 },
    ];
    var performance = new performance_1.Performance(events, 10, 0);
    var noteSequence = performance.toNoteSequence();
    var expectedNoteSequence = index_1.NoteSequence.create({
        notes: [
            { pitch: 60, quantizedStartStep: 0, quantizedEndStep: 20 },
            { pitch: 60, quantizedStartStep: 10, quantizedEndStep: 20 },
            { pitch: 64, quantizedStartStep: 0, quantizedEndStep: 20 },
        ],
        totalQuantizedSteps: 20
    });
    t.deepEqual(noteSequence, expectedNoteSequence);
    t.end();
});
//# sourceMappingURL=performance_test.js.map