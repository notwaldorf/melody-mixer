"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../protobuf/index");
var constants = require("./constants");
var QUANTIZE_CUTOFF = 0.5;
var MultipleTimeSignatureException = (function (_super) {
    __extends(MultipleTimeSignatureException, _super);
    function MultipleTimeSignatureException(message) {
        var _newTarget = this.constructor;
        var _this = _super.call(this, message) || this;
        Object.setPrototypeOf(_this, _newTarget.prototype);
        return _this;
    }
    return MultipleTimeSignatureException;
}(Error));
exports.MultipleTimeSignatureException = MultipleTimeSignatureException;
var BadTimeSignatureException = (function (_super) {
    __extends(BadTimeSignatureException, _super);
    function BadTimeSignatureException(message) {
        var _newTarget = this.constructor;
        var _this = _super.call(this, message) || this;
        Object.setPrototypeOf(_this, _newTarget.prototype);
        return _this;
    }
    return BadTimeSignatureException;
}(Error));
exports.BadTimeSignatureException = BadTimeSignatureException;
var NegativeTimeException = (function (_super) {
    __extends(NegativeTimeException, _super);
    function NegativeTimeException(message) {
        var _newTarget = this.constructor;
        var _this = _super.call(this, message) || this;
        Object.setPrototypeOf(_this, _newTarget.prototype);
        return _this;
    }
    return NegativeTimeException;
}(Error));
exports.NegativeTimeException = NegativeTimeException;
var MultipleTempoException = (function (_super) {
    __extends(MultipleTempoException, _super);
    function MultipleTempoException(message) {
        var _newTarget = this.constructor;
        var _this = _super.call(this, message) || this;
        Object.setPrototypeOf(_this, _newTarget.prototype);
        return _this;
    }
    return MultipleTempoException;
}(Error));
exports.MultipleTempoException = MultipleTempoException;
var QuantizationStatusException = (function (_super) {
    __extends(QuantizationStatusException, _super);
    function QuantizationStatusException(message) {
        var _newTarget = this.constructor;
        var _this = _super.call(this, message) || this;
        Object.setPrototypeOf(_this, _newTarget.prototype);
        return _this;
    }
    return QuantizationStatusException;
}(Error));
exports.QuantizationStatusException = QuantizationStatusException;
function isPowerOf2(n) {
    return n && (n & (n - 1)) === 0;
}
function clone(ns) {
    return index_1.NoteSequence.decode(index_1.NoteSequence.encode(ns).finish());
}
exports.clone = clone;
function stepsPerQuarterToStepsPerSecond(stepsPerQuarter, qpm) {
    return stepsPerQuarter * qpm / 60.0;
}
exports.stepsPerQuarterToStepsPerSecond = stepsPerQuarterToStepsPerSecond;
function quantizeToStep(unquantizedSeconds, stepsPerSecond, quantizeCutoff) {
    if (quantizeCutoff === void 0) { quantizeCutoff = QUANTIZE_CUTOFF; }
    var unquantizedSteps = unquantizedSeconds * stepsPerSecond;
    return Math.floor(unquantizedSteps + (1 - quantizeCutoff));
}
exports.quantizeToStep = quantizeToStep;
function getQuantizedTimeEvents(ns) {
    return ns.controlChanges.concat(ns.textAnnotations);
}
function quantizeNotesAndEvents(ns, stepsPerSecond) {
    for (var _i = 0, _a = ns.notes; _i < _a.length; _i++) {
        var note = _a[_i];
        note.quantizedStartStep = quantizeToStep(note.startTime, stepsPerSecond);
        note.quantizedEndStep = quantizeToStep(note.endTime, stepsPerSecond);
        if (note.quantizedEndStep === note.quantizedStartStep) {
            note.quantizedEndStep += 1;
        }
        if (note.quantizedStartStep < 0 || note.quantizedEndStep < 0) {
            throw new NegativeTimeException("Got negative note time: start_step = " +
                (note.quantizedStartStep + ", end_step = ") +
                ("" + note.quantizedEndStep));
        }
        if (note.quantizedEndStep > ns.totalQuantizedSteps) {
            ns.totalQuantizedSteps = note.quantizedEndStep;
        }
    }
    getQuantizedTimeEvents(ns).forEach(function (event) {
        event.quantizedStep = quantizeToStep(event.time, stepsPerSecond);
        if (event.quantizedStep < 0) {
            throw new NegativeTimeException("Got negative event time: step = " + event.quantizedStep);
        }
    });
}
function assertSingleTempo(ns) {
    if (!ns.tempos || ns.tempos.length === 0) {
        return;
    }
    ns.tempos.sort(function (a, b) { return a.time - b.time; });
    if (ns.tempos[0].time !== 0 &&
        ns.tempos[0].qpm !== constants.DEFAULT_QUARTERS_PER_MINUTE) {
        throw new MultipleTempoException('NoteSequence has an implicit tempo change from initial ' +
            (constants.DEFAULT_QUARTERS_PER_MINUTE + " qpm to ") +
            (ns.tempos[0].qpm + " qpm at " + ns.tempos[0].time + " seconds."));
    }
    for (var i = 1; i < ns.tempos.length; i++) {
        if (ns.tempos[i].qpm !== ns.tempos[0].qpm) {
            throw new MultipleTempoException('NoteSequence has at least one tempo change from ' +
                (ns.tempos[0].qpm + " qpm to " + ns.tempos[i].qpm) +
                ("qpm at " + ns.tempos[i].time + " seconds."));
        }
    }
}
function quantizeNoteSequence(ns, stepsPerQuarter) {
    var qns = clone(ns);
    qns.quantizationInfo =
        index_1.NoteSequence.QuantizationInfo.create({ stepsPerQuarter: stepsPerQuarter });
    if (qns.timeSignatures.length > 0) {
        qns.timeSignatures.sort(function (a, b) { return a.time - b.time; });
        if (qns.timeSignatures[0].time !== 0 &&
            !(qns.timeSignatures[0].numerator === 4 &&
                qns.timeSignatures[0].denominator === 4)) {
            throw new MultipleTimeSignatureException('NoteSequence has an implicit change from initial 4/4 time ' +
                ("signature to " + qns.timeSignatures[0].numerator + "/") +
                (qns.timeSignatures[0].denominator + " at ") +
                (qns.timeSignatures[0].time + " seconds."));
        }
        for (var i = 1; i < qns.timeSignatures.length; i++) {
            var timeSignature = qns.timeSignatures[i];
            if (timeSignature.numerator !== qns.timeSignatures[0].numerator ||
                timeSignature.denominator !== qns.timeSignatures[0].denominator) {
                throw new MultipleTimeSignatureException('NoteSequence has at least one time signature change from ' +
                    (qns.timeSignatures[0].numerator + "/") +
                    (qns.timeSignatures[0].denominator + " to ") +
                    (timeSignature.numerator + "/" + timeSignature.denominator + " ") +
                    ("at " + timeSignature.time + " seconds"));
            }
        }
        qns.timeSignatures[0].time = 0;
        qns.timeSignatures = [qns.timeSignatures[0]];
    }
    else {
        var timeSignature = index_1.NoteSequence.TimeSignature.create({ numerator: 4, denominator: 4, time: 0 });
        qns.timeSignatures.push(timeSignature);
    }
    var firstTS = qns.timeSignatures[0];
    if (!isPowerOf2(firstTS.denominator)) {
        throw new BadTimeSignatureException('Denominator is not a power of 2. Time signature: ' +
            (firstTS.numerator + "/" + firstTS.denominator));
    }
    if (firstTS.numerator === 0) {
        throw new BadTimeSignatureException('Numerator is 0. Time signature: ' +
            (firstTS.numerator + "/" + firstTS.denominator));
    }
    if (qns.tempos.length > 0) {
        assertSingleTempo(qns);
        qns.tempos[0].time = 0;
        qns.tempos = [qns.tempos[0]];
    }
    else {
        var tempo = index_1.NoteSequence.Tempo.create({ qpm: constants.DEFAULT_QUARTERS_PER_MINUTE, time: 0 });
        qns.tempos.push(tempo);
    }
    var stepsPerSecond = stepsPerQuarterToStepsPerSecond(stepsPerQuarter, qns.tempos[0].qpm);
    qns.totalQuantizedSteps = quantizeToStep(ns.totalTime, stepsPerSecond);
    quantizeNotesAndEvents(qns, stepsPerSecond);
    return qns;
}
exports.quantizeNoteSequence = quantizeNoteSequence;
function isQuantizedSequence(ns) {
    return ns.quantizationInfo &&
        (ns.quantizationInfo.stepsPerQuarter > 0 ||
            ns.quantizationInfo.stepsPerSecond > 0);
}
exports.isQuantizedSequence = isQuantizedSequence;
function assertIsQuantizedSequence(ns) {
    if (!isQuantizedSequence(ns)) {
        throw new QuantizationStatusException("NoteSequence " + ns.id + " is not quantized (missing quantizationInfo)");
    }
}
exports.assertIsQuantizedSequence = assertIsQuantizedSequence;
function isRelativeQuantizedSequence(ns) {
    return ns.quantizationInfo && ns.quantizationInfo.stepsPerQuarter > 0;
}
exports.isRelativeQuantizedSequence = isRelativeQuantizedSequence;
function assertIsRelativeQuantizedSequence(ns) {
    if (!isRelativeQuantizedSequence(ns)) {
        throw new QuantizationStatusException("NoteSequence " + ns.id + " is not quantized or is quantized based on absolute timing");
    }
}
exports.assertIsRelativeQuantizedSequence = assertIsRelativeQuantizedSequence;
function isAbsoluteQuantizedSequence(ns) {
    return ns.quantizationInfo && ns.quantizationInfo.stepsPerSecond > 0;
}
exports.isAbsoluteQuantizedSequence = isAbsoluteQuantizedSequence;
function assertIsAbsoluteQuantizedSequence(ns) {
    if (!isAbsoluteQuantizedSequence(ns)) {
        throw new QuantizationStatusException("NoteSequence " + ns.id + " is not quantized or is quantized based on relative timing");
    }
}
exports.assertIsAbsoluteQuantizedSequence = assertIsAbsoluteQuantizedSequence;
function unquantizeSequence(qns, qpm) {
    assertIsRelativeQuantizedSequence(qns);
    assertSingleTempo(qns);
    var ns = clone(qns);
    if (qpm) {
        if (ns.tempos && ns.tempos.length > 0) {
            ns.tempos[0].qpm = qpm;
        }
        else {
            ns.tempos.push(index_1.NoteSequence.Tempo.create({ time: 0, qpm: qpm }));
        }
    }
    else {
        qpm = (qns.tempos && qns.tempos.length > 0) ?
            ns.tempos[0].qpm :
            constants.DEFAULT_QUARTERS_PER_MINUTE;
    }
    var stepToSeconds = function (step) {
        return step / ns.quantizationInfo.stepsPerQuarter * (60 / qpm);
    };
    ns.totalTime = stepToSeconds(ns.totalQuantizedSteps);
    ns.notes.forEach(function (n) {
        n.startTime = stepToSeconds(n.quantizedStartStep);
        n.endTime = stepToSeconds(n.quantizedEndStep);
        ns.totalTime = Math.max(ns.totalTime, n.endTime);
    });
    getQuantizedTimeEvents(ns).forEach(function (event) {
        event.time = stepToSeconds(event.time);
    });
    return ns;
}
exports.unquantizeSequence = unquantizeSequence;
function mergeInstruments(ns) {
    var result = clone(ns);
    var events = result.notes.concat(result.pitchBends).concat(result.controlChanges);
    var programs = Array.from(new Set(events.filter(function (e) { return !e.isDrum; }).map(function (e) { return e.program; })));
    events.forEach(function (e) {
        if (e.isDrum) {
            e.program = 0;
            e.instrument = programs.length;
        }
        else {
            e.instrument = programs.indexOf(e.program);
        }
    });
    return result;
}
exports.mergeInstruments = mergeInstruments;
//# sourceMappingURL=sequences.js.map