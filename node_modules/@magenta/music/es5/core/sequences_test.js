"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var test = require("tape");
var index_1 = require("../protobuf/index");
var sequences = require("./sequences");
var STEPS_PER_QUARTER = 4;
function createTestNS() {
    var ns = index_1.NoteSequence.create();
    ns.tempos.push(index_1.NoteSequence.Tempo.create({ qpm: 60, time: 0 }));
    ns.timeSignatures.push(index_1.NoteSequence.TimeSignature.create({
        time: 0,
        numerator: 4,
        denominator: 4,
    }));
    return ns;
}
function addTrackToSequence(ns, instrument, notes) {
    for (var _i = 0, notes_1 = notes; _i < notes_1.length; _i++) {
        var noteParams = notes_1[_i];
        var note = new index_1.NoteSequence.Note({
            pitch: noteParams[0],
            velocity: noteParams[1],
            startTime: noteParams[2],
            endTime: noteParams[3]
        });
        ns.notes.push(note);
        if (ns.totalTime < note.endTime) {
            ns.totalTime = note.endTime;
        }
    }
}
function addChordsToSequence(ns, chords) {
    for (var _i = 0, chords_1 = chords; _i < chords_1.length; _i++) {
        var chordParams = chords_1[_i];
        var ta = index_1.NoteSequence.TextAnnotation.create({
            text: chordParams[0],
            time: chordParams[1],
            annotationType: index_1.NoteSequence.TextAnnotation.TextAnnotationType.CHORD_SYMBOL
        });
        ns.textAnnotations.push(ta);
    }
}
function addControlChangesToSequence(ns, instrument, controlChanges) {
    for (var _i = 0, controlChanges_1 = controlChanges; _i < controlChanges_1.length; _i++) {
        var ccParams = controlChanges_1[_i];
        var cc = index_1.NoteSequence.ControlChange.create({
            time: ccParams[0],
            controlNumber: ccParams[1],
            controlValue: ccParams[2],
            instrument: instrument
        });
        ns.controlChanges.push(cc);
    }
}
function addQuantizedStepsToSequence(ns, quantizedSteps) {
    quantizedSteps.forEach(function (qstep, i) {
        var note = ns.notes[i];
        note.quantizedStartStep = qstep[0];
        note.quantizedEndStep = qstep[1];
        if (note.quantizedEndStep > ns.totalQuantizedSteps) {
            ns.totalQuantizedSteps = note.quantizedEndStep;
        }
    });
}
function addQuantizedChordStepsToSequence(ns, quantizedSteps) {
    var chordAnnotations = ns.textAnnotations.filter(function (ta) { return ta.annotationType ===
        index_1.NoteSequence.TextAnnotation.TextAnnotationType.CHORD_SYMBOL; });
    quantizedSteps.forEach(function (qstep, i) {
        var ta = chordAnnotations[i];
        ta.quantizedStep = qstep;
    });
}
function addQuantizedControlStepsToSequence(ns, quantizedSteps) {
    quantizedSteps.forEach(function (qstep, i) {
        var cc = ns.controlChanges[i];
        cc.quantizedStep = qstep;
    });
}
test('Quantize NoteSequence', function (t) {
    var ns = createTestNS();
    addTrackToSequence(ns, 0, [
        [12, 100, 0.01, 10.0], [11, 55, 0.22, 0.50], [40, 45, 2.50, 3.50],
        [55, 120, 4.0, 4.01], [52, 99, 4.75, 5.0]
    ]);
    addChordsToSequence(ns, [['B7', 0.22], ['Em9', 4.0]]);
    addControlChangesToSequence(ns, 0, [[2.0, 64, 127], [4.0, 64, 0]]);
    var expectedQuantizedSequence = sequences.clone(ns);
    expectedQuantizedSequence.quantizationInfo =
        index_1.NoteSequence.QuantizationInfo.create({ stepsPerQuarter: STEPS_PER_QUARTER });
    expectedQuantizedSequence.quantizationInfo.stepsPerQuarter =
        STEPS_PER_QUARTER;
    addQuantizedStepsToSequence(expectedQuantizedSequence, [[0, 40], [1, 2], [10, 14], [16, 17], [19, 20]]);
    addQuantizedChordStepsToSequence(expectedQuantizedSequence, [1, 16]);
    addQuantizedControlStepsToSequence(expectedQuantizedSequence, [8, 16]);
    var qns = sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER);
    t.deepEqual(index_1.NoteSequence.toObject(qns), index_1.NoteSequence.toObject(expectedQuantizedSequence));
    t.end();
});
test('Quantize NoteSequence, Time Signature Change', function (t) {
    var ns = createTestNS();
    addTrackToSequence(ns, 0, [
        [12, 100, 0.01, 10.0], [11, 55, 0.22, 0.50], [40, 45, 2.50, 3.50],
        [55, 120, 4.0, 4.01], [52, 99, 4.75, 5.0]
    ]);
    ns.timeSignatures.length = 0;
    sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER);
    ns.timeSignatures.push(index_1.NoteSequence.TimeSignature.create({ numerator: 4, denominator: 4, time: 0 }));
    sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER);
    ns.timeSignatures.push(index_1.NoteSequence.TimeSignature.create({ numerator: 4, denominator: 4, time: 1 }));
    sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER);
    ns.timeSignatures.push(index_1.NoteSequence.TimeSignature.create({ numerator: 2, denominator: 4, time: 2 }));
    t.throws(function () { return sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER); }, sequences.MultipleTimeSignatureException);
    t.end();
});
test('Quantize NoteSequence, Implicit Time Signature Change', function (t) {
    var ns = createTestNS();
    addTrackToSequence(ns, 0, [
        [12, 100, 0.01, 10.0], [11, 55, 0.22, 0.50], [40, 45, 2.50, 3.50],
        [55, 120, 4.0, 4.01], [52, 99, 4.75, 5.0]
    ]);
    ns.timeSignatures.length = 0;
    sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER);
    ns.timeSignatures.push(index_1.NoteSequence.TimeSignature.create({ numerator: 2, denominator: 4, time: 2 }));
    t.throws(function () { return sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER); }, sequences.MultipleTimeSignatureException);
    t.end();
});
test('Quantize NoteSequence, No Implicit Time Signature Change, Out Of Order', function (t) {
    var ns = createTestNS();
    addTrackToSequence(ns, 0, [
        [12, 100, 0.01, 10.0], [11, 55, 0.22, 0.50], [40, 45, 2.50, 3.50],
        [55, 120, 4.0, 4.01], [52, 99, 4.75, 5.0]
    ]);
    ns.timeSignatures.length = 0;
    sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER);
    ns.timeSignatures.push(index_1.NoteSequence.TimeSignature.create({ numerator: 2, denominator: 4, time: 2 }));
    ns.timeSignatures.push(index_1.NoteSequence.TimeSignature.create({ numerator: 2, denominator: 4, time: 0 }));
    sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER);
    t.pass();
    t.end();
});
test('StepsPerQuarterToStepsPerSecond', function (t) {
    t.equal(sequences.stepsPerQuarterToStepsPerSecond(4, 60.0), 4.0);
    t.end();
});
test('QuantizeToStep', function (t) {
    t.equal(sequences.quantizeToStep(8.0001, 4), 32);
    t.equal(sequences.quantizeToStep(8.4999, 4), 34);
    t.equal(sequences.quantizeToStep(8.4999, 4, 1.0), 33);
    t.end();
});
test('Quantize NoteSequence, Tempo Change', function (t) {
    var ns = createTestNS();
    addTrackToSequence(ns, 0, [
        [12, 100, 0.01, 10.0], [11, 55, 0.22, 0.50], [40, 45, 2.50, 3.50],
        [55, 120, 4.0, 4.01], [52, 99, 4.75, 5.0]
    ]);
    ns.tempos.length = 0;
    sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER);
    ns.tempos.push(index_1.NoteSequence.Tempo.create({ qpm: 60, time: 0 }));
    sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER);
    ns.tempos.push(index_1.NoteSequence.Tempo.create({ qpm: 60, time: 1 }));
    sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER);
    ns.tempos.push(index_1.NoteSequence.Tempo.create({ qpm: 120, time: 2 }));
    t.throws(function () { return sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER); }, sequences.MultipleTempoException);
    t.end();
});
test('Quantize NoteSequence, Implicit Tempo Change', function (t) {
    var ns = createTestNS();
    addTrackToSequence(ns, 0, [
        [12, 100, 0.01, 10.0], [11, 55, 0.22, 0.50], [40, 45, 2.50, 3.50],
        [55, 120, 4.0, 4.01], [52, 99, 4.75, 5.0]
    ]);
    ns.tempos.length = 0;
    sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER);
    ns.tempos.push(index_1.NoteSequence.Tempo.create({ qpm: 60, time: 2 }));
    t.throws(function () { return sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER); }, sequences.MultipleTempoException);
    t.end();
});
test('Quantize NoteSequence, No Implicit Tempo Change, Out of Order', function (t) {
    var ns = createTestNS();
    addTrackToSequence(ns, 0, [
        [12, 100, 0.01, 10.0], [11, 55, 0.22, 0.50], [40, 45, 2.50, 3.50],
        [55, 120, 4.0, 4.01], [52, 99, 4.75, 5.0]
    ]);
    ns.tempos.length = 0;
    sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER);
    ns.tempos.push(index_1.NoteSequence.Tempo.create({ qpm: 60, time: 2 }));
    ns.tempos.push(index_1.NoteSequence.Tempo.create({ qpm: 60, time: 0 }));
    sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER);
    t.pass();
    t.end();
});
test('Quantize NoteSequence, Rounding', function (t) {
    var ns = createTestNS();
    addTrackToSequence(ns, 1, [
        [12, 100, 0.01, 0.24], [11, 100, 0.22, 0.55], [40, 100, 0.50, 0.75],
        [41, 100, 0.689, 1.18], [44, 100, 1.19, 1.69], [55, 100, 4.0, 4.01]
    ]);
    var expectedQuantizedSequence = sequences.clone(ns);
    expectedQuantizedSequence.quantizationInfo =
        index_1.NoteSequence.QuantizationInfo.create({ stepsPerQuarter: STEPS_PER_QUARTER });
    addQuantizedStepsToSequence(expectedQuantizedSequence, [[0, 1], [1, 2], [2, 3], [3, 5], [5, 7], [16, 17]]);
    var quantizedSequence = sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER);
    t.deepEqual(index_1.NoteSequence.toObject(quantizedSequence), index_1.NoteSequence.toObject(expectedQuantizedSequence));
    t.end();
});
test('Quantize NoteSequence, MultiTrack', function (t) {
    var ns = createTestNS();
    addTrackToSequence(ns, 0, [[12, 100, 1.0, 4.0], [19, 100, 0.95, 3.0]]);
    addTrackToSequence(ns, 3, [[12, 100, 1.0, 4.0], [19, 100, 2.0, 5.0]]);
    addTrackToSequence(ns, 7, [[12, 100, 1.0, 5.0], [19, 100, 2.0, 4.0], [24, 100, 3.0, 3.5]]);
    var expectedQuantizedSequence = sequences.clone(ns);
    expectedQuantizedSequence.quantizationInfo =
        index_1.NoteSequence.QuantizationInfo.create({ stepsPerQuarter: STEPS_PER_QUARTER });
    addQuantizedStepsToSequence(expectedQuantizedSequence, [[4, 16], [4, 12], [4, 16], [8, 20], [4, 20], [8, 16], [12, 14]]);
    var quantizedSequence = sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER);
    t.deepEqual(index_1.NoteSequence.toObject(quantizedSequence), index_1.NoteSequence.toObject(expectedQuantizedSequence));
    t.end();
});
test('Assert isQuantizedNoteSequence', function (t) {
    var ns = createTestNS();
    addTrackToSequence(ns, 0, [
        [12, 100, 0.01, 10.0], [11, 55, 0.22, 0.50], [40, 45, 2.50, 3.50],
        [55, 120, 4.0, 4.01], [52, 99, 4.75, 5.0]
    ]);
    t.throws(function () { return sequences.assertIsQuantizedSequence(ns); }, sequences.QuantizationStatusException);
    var qns = sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER);
    sequences.assertIsQuantizedSequence(qns);
    t.end();
});
test('Assert isRelativeQuantizedNoteSequence', function (t) {
    var ns = createTestNS();
    addTrackToSequence(ns, 0, [
        [12, 100, 0.01, 10.0], [11, 55, 0.22, 0.50], [40, 45, 2.50, 3.50],
        [55, 120, 4.0, 4.01], [52, 99, 4.75, 5.0]
    ]);
    t.throws(function () { return sequences.assertIsRelativeQuantizedSequence(ns); }, sequences.QuantizationStatusException);
    var qns = sequences.quantizeNoteSequence(ns, STEPS_PER_QUARTER);
    sequences.assertIsRelativeQuantizedSequence(qns);
    t.end();
});
function testUnQuantize(t, expectedTimes, expectedTotalTime, originalQpm, finalQpm, originalTotalSteps) {
    var qns = createTestNS();
    var notes = [
        [12, 100, 0.01, 0.24], [11, 100, 0.22, 0.55], [40, 100, 0.50, 0.75],
        [41, 100, 0.689, 1.18], [44, 100, 1.19, 1.69]
    ];
    addTrackToSequence(qns, 1, notes);
    qns = sequences.quantizeNoteSequence(qns, STEPS_PER_QUARTER);
    if (!originalQpm) {
        qns.tempos = [];
    }
    else {
        qns.tempos[0].qpm = originalQpm;
    }
    if (originalTotalSteps) {
        qns.totalQuantizedSteps = originalTotalSteps;
    }
    var ns = sequences.unquantizeSequence(qns, finalQpm);
    var expectedSequence = sequences.clone(qns);
    expectedSequence.notes.map(function (n, i) {
        n.startTime = expectedTimes[i][0];
        n.endTime = expectedTimes[i][1];
    });
    expectedSequence.totalTime = expectedTotalTime;
    if (!finalQpm && !originalQpm) {
        expectedSequence.tempos = [];
    }
    else {
        expectedSequence.tempos =
            [{ time: 0, qpm: finalQpm ? finalQpm : originalQpm }];
    }
    t.deepEqual(index_1.NoteSequence.toObject(ns), index_1.NoteSequence.toObject(expectedSequence));
    t.end();
}
test('Un-Quantize NoteSequence, ns qpm', function (t) {
    testUnQuantize(t, [[0.0, 0.25], [0.25, 0.50], [0.50, 0.75], [0.75, 1.25], [1.25, 1.75]], 1.75, 60);
});
test('Un-Quantize NoteSequence, no qpm', function (t) {
    testUnQuantize(t, [
        [0.0, 0.125], [0.125, 0.25], [0.25, 0.375], [0.375, 0.625],
        [0.625, 0.875]
    ], 0.875);
});
test('Un-Quantize NoteSequence, arg qpm', function (t) {
    testUnQuantize(t, [[0.0, 0.5], [0.5, 1.00], [1.00, 1.5], [1.5, 2.5], [2.5, 3.5]], 3.5, undefined, 30);
});
test('Un-Quantize NoteSequence, orig and arg qpm', function (t) {
    testUnQuantize(t, [[0.0, 0.5], [0.5, 1.00], [1.00, 1.5], [1.5, 2.5], [2.5, 3.5]], 3.5, 60, 30);
});
test('Un-Quantize NoteSequence, existing total steps lower', function (t) {
    testUnQuantize(t, [[0.0, 0.5], [0.5, 1.00], [1.00, 1.5], [1.5, 2.5], [2.5, 3.5]], 3.5, undefined, 30, 1);
});
test('Un-Quantize NoteSequence, existing total steps higher', function (t) {
    testUnQuantize(t, [[0.0, 0.5], [0.5, 1.00], [1.00, 1.5], [1.5, 2.5], [2.5, 3.5]], 10, undefined, 30, 20);
});
test('Merge Instruments', function (t) {
    var ns = createTestNS();
    ns.notes.push({ pitch: 60, program: 0, isDrum: false });
    ns.notes.push({ pitch: 64, program: 0, isDrum: false });
    ns.notes.push({ pitch: 36, program: 0, isDrum: true });
    ns.notes.push({ pitch: 48, program: 32, isDrum: false });
    ns.notes.push({ pitch: 42, program: 1, isDrum: true });
    var expected = sequences.clone(ns);
    expected.notes[0].instrument = 0;
    expected.notes[1].instrument = 0;
    expected.notes[2].instrument = 2;
    expected.notes[3].instrument = 1;
    expected.notes[4].instrument = 2;
    expected.notes[4].program = 0;
    t.deepEqual(index_1.NoteSequence.toObject(sequences.mergeInstruments(ns)), index_1.NoteSequence.toObject(expected));
    t.end();
});
//# sourceMappingURL=sequences_test.js.map