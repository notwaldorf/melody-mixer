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
var tf = require("@tensorflow/tfjs-core");
var aux_inputs = require("../core/aux_inputs");
var chords = require("../core/chords");
var data = require("../core/data");
var logging = require("../core/logging");
var sequences = require("../core/sequences");
var attention_1 = require("./attention");
var CELL_FORMAT = 'multi_rnn_cell/cell_%d/basic_lstm_cell/';
var MusicRNN = (function () {
    function MusicRNN(checkpointURL, spec) {
        this.checkpointURL = checkpointURL;
        this.spec = spec;
        this.initialized = false;
        this.rawVars = {};
        this.biasShapes = [];
        this.lstmCells = [];
    }
    MusicRNN.prototype.isInitialized = function () {
        return this.initialized;
    };
    MusicRNN.prototype.instantiateFromSpec = function () {
        this.dataConverter = data.converterFromSpec(this.spec.dataConverter);
        this.attentionLength = this.spec.attentionLength;
        this.chordEncoder = this.spec.chordEncoder ?
            chords.chordEncoderFromType(this.spec.chordEncoder) :
            undefined;
        this.auxInputs = this.spec.auxInputs ?
            this.spec.auxInputs.map(function (s) { return aux_inputs.auxiliaryInputFromSpec(s); }) :
            undefined;
    };
    MusicRNN.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, vars, hasAttention, rnnPrefix, l, _loop_1, this_1, state_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.dispose();
                        startTime = performance.now();
                        if (!!this.spec) return [3, 2];
                        return [4, fetch(this.checkpointURL + "/config.json")
                                .then(function (response) { return response.json(); })
                                .then(function (spec) {
                                if (spec.type !== 'MusicRNN') {
                                    throw new Error("Attempted to instantiate MusicRNN model with incorrect type:\n                  " + spec.type);
                                }
                                _this.spec = spec;
                            })];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        this.instantiateFromSpec();
                        return [4, fetch(this.checkpointURL + "/weights_manifest.json")
                                .then(function (response) { return response.json(); })
                                .then(function (manifest) {
                                return tf.io.loadWeights(manifest, _this.checkpointURL);
                            })];
                    case 3:
                        vars = _a.sent();
                        hasAttention = attention_1.AttentionWrapper.isWrapped(vars);
                        rnnPrefix = hasAttention ? "rnn/" + attention_1.ATTENTION_PREFIX : 'rnn/';
                        this.forgetBias = tf.scalar(1.0);
                        this.lstmCells.length = 0;
                        this.biasShapes.length = 0;
                        l = 0;
                        _loop_1 = function () {
                            var cellPrefix = rnnPrefix + CELL_FORMAT.replace('%d', l.toString());
                            if (!(cellPrefix + "kernel" in vars)) {
                                return "break";
                            }
                            this_1.lstmCells.push(function (data, c, h) {
                                return tf.basicLSTMCell(_this.forgetBias, vars[cellPrefix + "kernel"], vars[cellPrefix + "bias"], data, c, h);
                            });
                            this_1.biasShapes.push(vars[cellPrefix + "bias"].shape[0]);
                            ++l;
                        };
                        this_1 = this;
                        while (true) {
                            state_1 = _loop_1();
                            if (state_1 === "break")
                                break;
                        }
                        this.lstmFcW = vars['fully_connected/weights'];
                        this.lstmFcB = vars['fully_connected/biases'];
                        if (hasAttention) {
                            this.attentionWrapper = new attention_1.AttentionWrapper(this.lstmCells, this.attentionLength, this.biasShapes[0] / 4);
                            this.attentionWrapper.initialize(vars);
                        }
                        this.rawVars = vars;
                        this.initialized = true;
                        logging.logWithDuration('Initialized model', startTime, 'MusicRNN');
                        return [2];
                }
            });
        });
    };
    MusicRNN.prototype.dispose = function () {
        var _this = this;
        Object.keys(this.rawVars).forEach(function (name) { return _this.rawVars[name].dispose(); });
        this.rawVars = {};
        if (this.forgetBias) {
            this.forgetBias.dispose();
            this.forgetBias = undefined;
        }
        this.initialized = false;
    };
    MusicRNN.prototype.continueSequence = function (sequence, steps, temperature, chordProgression) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, this.continueSequenceImpl(sequence, steps, temperature, chordProgression, false)];
                    case 1:
                        result = _a.sent();
                        return [2, result.sequence];
                }
            });
        });
    };
    MusicRNN.prototype.continueSequenceAndReturnProbabilities = function (sequence, steps, temperature, chordProgression) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2, this.continueSequenceImpl(sequence, steps, temperature, chordProgression, true)];
            });
        });
    };
    MusicRNN.prototype.continueSequenceImpl = function (sequence, steps, temperature, chordProgression, returnProbs) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, oh, samplesAndProbs, result, probs, i, _a, _b;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        sequences.assertIsRelativeQuantizedSequence(sequence);
                        if (this.chordEncoder && !chordProgression) {
                            throw new Error('Chord progression expected but not provided.');
                        }
                        if (!this.chordEncoder && chordProgression) {
                            throw new Error('Unexpected chord progression provided.');
                        }
                        if (!!this.initialized) return [3, 2];
                        return [4, this.initialize()];
                    case 1:
                        _c.sent();
                        _c.label = 2;
                    case 2:
                        startTime = performance.now();
                        oh = tf.tidy(function () {
                            var inputs = _this.dataConverter.toTensor(sequence);
                            var length = inputs.shape[0];
                            var outputSize = inputs.shape[1];
                            var controls = _this.chordEncoder ?
                                _this.chordEncoder.encodeProgression(chordProgression, length + steps) :
                                undefined;
                            var auxInputs = _this.auxInputs ?
                                tf.concat(_this.auxInputs.map(function (auxInput) { return auxInput.getTensors(length + steps); }), 1) :
                                undefined;
                            var rnnResult = _this.sampleRnn(inputs, steps, temperature, controls, auxInputs, returnProbs);
                            var samples = rnnResult.samples;
                            return {
                                samples: tf.stack(samples).as2D(samples.length, outputSize),
                                probs: rnnResult.probs
                            };
                        });
                        return [4, oh];
                    case 3:
                        samplesAndProbs = _c.sent();
                        result = this.dataConverter.toNoteSequence(samplesAndProbs.samples, sequence.quantizationInfo.stepsPerQuarter);
                        probs = [];
                        if (!returnProbs) return [3, 7];
                        i = 0;
                        _c.label = 4;
                    case 4:
                        if (!(i < samplesAndProbs.probs.length)) return [3, 7];
                        _b = (_a = probs).push;
                        return [4, samplesAndProbs.probs[i].data()];
                    case 5:
                        _b.apply(_a, [_c.sent()]);
                        samplesAndProbs.probs[i].dispose();
                        _c.label = 6;
                    case 6:
                        i++;
                        return [3, 4];
                    case 7:
                        oh.samples.dispose();
                        result.then(function () { return logging.logWithDuration('Continuation completed', startTime, 'MusicRNN', 20); });
                        return [2, { sequence: result, probs: probs }];
                }
            });
        });
    };
    MusicRNN.prototype.sampleRnn = function (inputs, steps, temperature, controls, auxInputs, returnProbs) {
        var _a;
        var length = inputs.shape[0];
        var outputSize = inputs.shape[1];
        var c = [];
        var h = [];
        for (var i = 0; i < this.biasShapes.length; i++) {
            c.push(tf.zeros([1, this.biasShapes[i] / 4]));
            h.push(tf.zeros([1, this.biasShapes[i] / 4]));
        }
        var attentionState = this.attentionWrapper ? this.attentionWrapper.initState() : null;
        var lastOutput;
        inputs = inputs.toFloat();
        var samples = [];
        var probs = [];
        var splitInputs = tf.split(inputs.toFloat(), length);
        var splitControls = controls ? tf.split(controls, controls.shape[0]) : undefined;
        var splitAuxInputs = auxInputs ? tf.split(auxInputs, auxInputs.shape[0]) : undefined;
        for (var i = 0; i < length + steps; i++) {
            var nextInput = void 0;
            if (i < length) {
                nextInput = splitInputs[i];
            }
            else {
                var logits = lastOutput.matMul(this.lstmFcW).add(this.lstmFcB).as1D();
                var sampledOutput = void 0;
                if (temperature) {
                    logits = logits.div(tf.scalar(temperature));
                    sampledOutput = tf.multinomial(logits, 1).as1D();
                }
                else {
                    sampledOutput = logits.argMax().as1D();
                }
                if (returnProbs) {
                    probs.push(tf.softmax(logits));
                }
                nextInput = tf.oneHot(sampledOutput, outputSize).toFloat();
                samples.push(nextInput.as1D());
            }
            if (i === length + steps - 1) {
                break;
            }
            var tensors = [];
            if (splitControls) {
                tensors.push(splitControls[i + 1]);
            }
            tensors.push(nextInput);
            if (splitAuxInputs) {
                tensors.push(splitAuxInputs[i]);
            }
            nextInput = tf.concat(tensors, 1);
            if (this.attentionWrapper) {
                var wrapperOutput = this.attentionWrapper.call(nextInput, c, h, attentionState);
                c = wrapperOutput.c;
                h = wrapperOutput.h;
                attentionState = wrapperOutput.attentionState;
                lastOutput = wrapperOutput.output;
            }
            else {
                _a = tf.multiRNNCell(this.lstmCells, nextInput, c, h), c = _a[0], h = _a[1];
                lastOutput = h[h.length - 1];
            }
        }
        return { samples: samples, probs: probs };
    };
    return MusicRNN;
}());
exports.MusicRNN = MusicRNN;
//# sourceMappingURL=model.js.map