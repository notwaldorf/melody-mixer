"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var tf = require("@tensorflow/tfjs");
var protobuf_1 = require("../protobuf");
var constants_1 = require("./constants");
var RF_PAD = 3;
function batchInput(input, batchLength) {
    var batchSize = Math.ceil(input.length / batchLength);
    var batchRemainder = input.length % batchLength;
    var mergedRemainder = 0;
    if (batchSize > 1 && batchRemainder > 0 && batchRemainder <= RF_PAD) {
        batchSize -= 1;
        mergedRemainder = batchRemainder;
        batchRemainder = 0;
    }
    if (batchSize === 1) {
        return tf.tensor2d(input).expandDims(0);
    }
    var actualBatchLength = batchLength + 2 * RF_PAD;
    var firstBatch = tf.tensor2d(input.slice(0, actualBatchLength)).expandDims(0);
    var lastBatch = tf.tensor2d(input.slice(input.length - actualBatchLength))
        .expandDims(0);
    if (batchSize === 2) {
        return tf.concat([firstBatch, lastBatch], 0);
    }
    var naivePaddedBatches;
    if (batchRemainder) {
        naivePaddedBatches = tf.tensor2d(input)
            .pad([[0, batchLength - batchRemainder], [0, 0]])
            .as3D(batchSize, batchLength, -1);
    }
    else {
        naivePaddedBatches =
            tf.tensor2d(input.slice(0, input.length - mergedRemainder))
                .as3D(batchSize, batchLength, -1);
    }
    var leftPad = tf.slice(naivePaddedBatches, [0, batchLength - RF_PAD], [batchSize - 2, -1]);
    var rightPad = tf.slice(naivePaddedBatches, [2, 0], [-1, RF_PAD]);
    var midBatches = tf.concat([leftPad, naivePaddedBatches.slice(1, batchSize - 2), rightPad], 1);
    return tf.concat([firstBatch, midBatches, lastBatch], 0);
}
exports.batchInput = batchInput;
function unbatchOutput(batches, batchLength, totalLength) {
    if (batches.shape[0] === 1) {
        return batches;
    }
    return tf.tidy(function () {
        var firstBatch = batches.slice([0, 0], [1, batchLength]);
        var finalBatchLength = totalLength % batchLength;
        if (finalBatchLength <= RF_PAD) {
            finalBatchLength += batchLength;
        }
        var finalBatch = batches.slice([batches.shape[0] - 1, batches.shape[1] - finalBatchLength], [-1, -1]);
        var toConcat = [firstBatch, finalBatch];
        if (batches.shape[0] > 2) {
            var midBatchSize = batches.shape[0] - 2;
            var midBatches = batches.slice([1, RF_PAD], [midBatchSize, batchLength]);
            toConcat = [
                firstBatch, midBatches.as3D(1, (midBatchSize) * batchLength, -1),
                finalBatch
            ];
        }
        return tf.concat(toConcat, 1);
    });
}
exports.unbatchOutput = unbatchOutput;
function pianorollToNoteSequence(frameProbs, onsetProbs, velocityValues, onsetThreshold, frameThreshold) {
    if (onsetThreshold === void 0) { onsetThreshold = 0.5; }
    if (frameThreshold === void 0) { frameThreshold = 0.5; }
    return __awaiter(this, void 0, void 0, function () {
        function endPitch(pitch, endFrame) {
            ns.notes.push(protobuf_1.NoteSequence.Note.create({
                pitch: pitch + constants_1.MIN_MIDI_PITCH,
                startTime: (pitchStartStepPlusOne[pitch] - 1) * constants_1.FRAME_LENGTH_SECONDS,
                endTime: endFrame * constants_1.FRAME_LENGTH_SECONDS,
                velocity: onsetVelocities[pitch]
            }));
            pitchStartStepPlusOne[pitch] = 0;
        }
        function processOnset(p, f, velocity) {
            if (pitchStartStepPlusOne[p]) {
                if (!previousOnsets[p]) {
                    endPitch(p, f);
                    pitchStartStepPlusOne[p] = f + 1;
                    onsetVelocities[p] = velocity;
                }
            }
            else {
                pitchStartStepPlusOne[p] = f + 1;
                onsetVelocities[p] = velocity;
            }
        }
        var ns, pitchStartStepPlusOne, onsetVelocities, previousOnsets, predictions, _a, frames, onsets, velocities, numFrames, f, p, i;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    ns = protobuf_1.NoteSequence.create();
                    pitchStartStepPlusOne = new Uint32Array(constants_1.MIDI_PITCHES);
                    onsetVelocities = new Uint8Array(constants_1.MIDI_PITCHES);
                    previousOnsets = new Uint8Array(constants_1.MIDI_PITCHES);
                    predictions = tf.tidy(function () {
                        var onsetPredictions = tf.greater(onsetProbs, onsetThreshold);
                        var framePredictions = tf.greater(frameProbs, frameThreshold);
                        onsetPredictions = onsetPredictions.pad([[0, 1], [0, 0]]);
                        framePredictions = framePredictions.pad([[0, 1], [0, 0]]);
                        velocityValues = velocityValues.pad([[0, 1], [0, 0]]);
                        framePredictions = tf.logicalOr(framePredictions, onsetPredictions);
                        return [framePredictions, onsetPredictions, velocityValues];
                    });
                    return [4, Promise.all(predictions.map(function (t) { return t.data(); }))];
                case 1:
                    _a = _b.sent(), frames = _a[0], onsets = _a[1], velocities = _a[2];
                    predictions.forEach(function (t) { return t.dispose(); });
                    numFrames = frameProbs.shape[0];
                    for (f = 0; f < numFrames + 1; ++f) {
                        for (p = 0; p < constants_1.MIDI_PITCHES; ++p) {
                            i = f * constants_1.MIDI_PITCHES + p;
                            if (onsets[i]) {
                                processOnset(p, f, velocities[i]);
                            }
                            else if (!frames[i] && pitchStartStepPlusOne[p]) {
                                endPitch(p, f);
                            }
                        }
                        previousOnsets = onsets.slice(f * constants_1.MIDI_PITCHES, (f + 1) * constants_1.MIDI_PITCHES);
                    }
                    ns.totalTime = numFrames * constants_1.FRAME_LENGTH_SECONDS;
                    return [2, ns];
            }
        });
    });
}
exports.pianorollToNoteSequence = pianorollToNoteSequence;
//# sourceMappingURL=transcription_utils.js.map