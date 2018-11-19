"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../protobuf/index");
var constants = require("./constants");
var sequences = require("./sequences");
var Performance = (function () {
    function Performance(events, maxShiftSteps, numVelocityBins, program, isDrum) {
        this.events = events;
        this.maxShiftSteps = maxShiftSteps;
        this.numVelocityBins = numVelocityBins;
        this.program = program;
        this.isDrum = isDrum;
    }
    Performance.fromNoteSequence = function (noteSequence, maxShiftSteps, numVelocityBins, instrument) {
        sequences.assertIsQuantizedSequence(noteSequence);
        var notes = noteSequence.notes.filter(function (note, _) {
            return instrument !== undefined ? note.instrument === instrument : true;
        });
        var sortedNotes = notes.sort(function (a, b) { return a.startTime === b.startTime ? a.pitch - b.pitch :
            a.startTime - b.startTime; });
        var onsets = sortedNotes.map(function (note, i) { return ({ step: note.quantizedStartStep, index: i, isOffset: 0 }); });
        var offsets = sortedNotes.map(function (note, i) { return ({ step: note.quantizedEndStep, index: i, isOffset: 1 }); });
        var noteEvents = onsets.concat(offsets).sort(function (a, b) { return a.step === b.step ?
            (a.index === b.index ? a.isOffset - b.isOffset :
                a.index - b.index) :
            a.step - b.step; });
        var velocityBinSize = numVelocityBins ?
            Math.ceil((constants.MIDI_VELOCITIES - 1) / numVelocityBins) :
            undefined;
        var events = [];
        var currentStep = 0;
        var currentVelocityBin = numVelocityBins;
        for (var _i = 0, noteEvents_1 = noteEvents; _i < noteEvents_1.length; _i++) {
            var e = noteEvents_1[_i];
            if (e.step > currentStep) {
                while (e.step > currentStep + maxShiftSteps) {
                    events.push({ type: 'time-shift', steps: maxShiftSteps });
                    currentStep += maxShiftSteps;
                }
                events.push({ type: 'time-shift', steps: e.step - currentStep });
                currentStep = e.step;
            }
            if (e.isOffset) {
                events.push({ type: 'note-off', pitch: sortedNotes[e.index].pitch });
            }
            else {
                if (velocityBinSize) {
                    var velocityBin = Math.floor((sortedNotes[e.index].velocity -
                        constants.MIN_MIDI_VELOCITY - 1) /
                        velocityBinSize) +
                        1;
                    if (velocityBin !== currentVelocityBin) {
                        events.push({ type: 'velocity-change', velocityBin: velocityBin });
                        currentVelocityBin = velocityBin;
                    }
                }
                events.push({ type: 'note-on', pitch: sortedNotes[e.index].pitch });
            }
        }
        var isDrum = notes.some(function (note) { return note.isDrum; }) ?
            (notes.some(function (note) { return !note.isDrum; }) ? undefined : true) :
            false;
        var programs = Array.from(new Set(notes.map(function (note) { return note.program; })));
        var program = (!isDrum && programs.length === 1) ? programs[0] : undefined;
        var performance = new Performance(events, maxShiftSteps, numVelocityBins, program, isDrum);
        performance.setNumSteps(noteSequence.totalQuantizedSteps);
        return performance;
    };
    Performance.prototype.getNumSteps = function () {
        return this.events.filter(function (event) { return event.type === 'time-shift'; })
            .map(function (event) { return event.steps; })
            .reduce(function (a, b) { return a + b; }, 0);
    };
    Performance.prototype.setNumSteps = function (numSteps) {
        var currentNumSteps = this.getNumSteps();
        if (currentNumSteps < numSteps) {
            if (this.events.length) {
                var event_1 = this.events[this.events.length - 1];
                if (event_1.type === 'time-shift') {
                    var steps = Math.min(numSteps - currentNumSteps, this.maxShiftSteps - event_1.steps);
                    event_1.steps += steps;
                    currentNumSteps += steps;
                }
            }
            while (currentNumSteps < numSteps) {
                if (currentNumSteps + this.maxShiftSteps > numSteps) {
                    this.events.push({ type: 'time-shift', steps: numSteps - currentNumSteps });
                    currentNumSteps = numSteps;
                }
                else {
                    this.events.push({ type: 'time-shift', steps: this.maxShiftSteps });
                    currentNumSteps += this.maxShiftSteps;
                }
            }
        }
        else if (currentNumSteps > numSteps) {
            while (this.events.length && currentNumSteps > numSteps) {
                var event_2 = this.events[this.events.length - 1];
                if (event_2.type === 'time-shift') {
                    if (currentNumSteps - event_2.steps < numSteps) {
                        event_2.steps -= currentNumSteps - numSteps;
                        currentNumSteps = numSteps;
                    }
                    else {
                        this.events.pop();
                        currentNumSteps -= event_2.steps;
                    }
                }
                else {
                    this.events.pop();
                }
            }
        }
    };
    Performance.prototype.toNoteSequence = function (instrument) {
        var _this = this;
        var velocityBinSize = this.numVelocityBins ?
            Math.ceil((constants.MIDI_VELOCITIES - 1) / this.numVelocityBins) :
            undefined;
        var noteSequence = index_1.NoteSequence.create();
        var currentStep = 0;
        var currentVelocity = undefined;
        var pitchStartStepsAndVelocities = new Map();
        for (var i = constants.MIN_MIDI_PITCH; i <= constants.MAX_MIDI_PITCH; ++i) {
            pitchStartStepsAndVelocities.set(i, []);
        }
        for (var _i = 0, _a = this.events; _i < _a.length; _i++) {
            var event_3 = _a[_i];
            switch (event_3.type) {
                case 'note-on':
                    pitchStartStepsAndVelocities.get(event_3.pitch).push([
                        currentStep, currentVelocity
                    ]);
                    break;
                case 'note-off':
                    var startStepsAndVelocities = pitchStartStepsAndVelocities.get(event_3.pitch);
                    if (startStepsAndVelocities.length) {
                        var _b = startStepsAndVelocities.shift(), startStep = _b[0], velocity = _b[1];
                        if (currentStep > startStep) {
                            noteSequence.notes.push(index_1.NoteSequence.Note.create({
                                pitch: event_3.pitch,
                                velocity: velocity,
                                instrument: instrument,
                                quantizedStartStep: startStep,
                                quantizedEndStep: currentStep,
                                program: this.program,
                                isDrum: this.isDrum,
                            }));
                        }
                        else {
                            console.log('Ignoring zero-length note: ' +
                                ("(pitch = " + event_3.pitch + ", step = " + currentStep + ")"));
                        }
                    }
                    else {
                        console.log('Ignoring note-off with no previous note-on:' +
                            ("(pitch = " + event_3.pitch + ", step = " + currentStep + ")"));
                    }
                    break;
                case 'time-shift':
                    currentStep += event_3.steps;
                    break;
                case 'velocity-change':
                    if (velocityBinSize) {
                        currentVelocity = constants.MIN_MIDI_VELOCITY +
                            (event_3.velocityBin - 1) * velocityBinSize + 1;
                    }
                    else {
                        throw new Error("Unexpected velocity change event: " + event_3);
                    }
                    break;
                default:
                    throw new Error("Unrecognized performance event: " + event_3);
            }
        }
        pitchStartStepsAndVelocities.forEach(function (startStepsAndVelocities, pitch) {
            for (var _i = 0, startStepsAndVelocities_1 = startStepsAndVelocities; _i < startStepsAndVelocities_1.length; _i++) {
                var _a = startStepsAndVelocities_1[_i], startStep = _a[0], velocity = _a[1];
                if (currentStep > startStep) {
                    noteSequence.notes.push(index_1.NoteSequence.Note.create({
                        pitch: pitch,
                        velocity: velocity,
                        instrument: instrument,
                        quantizedStartStep: startStep,
                        quantizedEndStep: currentStep,
                        program: _this.program,
                        isDrum: _this.isDrum
                    }));
                }
                else {
                    console.log('Ignoring zero-length note: ' +
                        ("(pitch = " + pitch + ", step = " + currentStep + ")"));
                }
            }
        });
        noteSequence.totalQuantizedSteps = currentStep;
        return noteSequence;
    };
    return Performance;
}());
exports.Performance = Performance;
//# sourceMappingURL=performance.js.map