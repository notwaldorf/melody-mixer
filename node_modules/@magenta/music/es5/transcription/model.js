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
var logging = require("../core/logging");
var audio_utils_1 = require("./audio_utils");
var constants_1 = require("./constants");
var transcription_utils_1 = require("./transcription_utils");
var OnsetsAndFrames = (function () {
    function OnsetsAndFrames(checkpointURL, chunkLength) {
        if (chunkLength === void 0) { chunkLength = 250; }
        this.checkpointURL = checkpointURL;
        this.chunkLength = chunkLength;
    }
    OnsetsAndFrames.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, vars;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.dispose();
                        startTime = performance.now();
                        return [4, fetch(this.checkpointURL + "/weights_manifest.json")
                                .then(function (response) { return response.json(); })
                                .then(function (manifest) {
                                return tf.io.loadWeights(manifest, _this.checkpointURL);
                            })];
                    case 1:
                        vars = _a.sent();
                        this.build(vars);
                        Object.keys(vars).map(function (name) { return vars[name].dispose(); });
                        this.initialized = true;
                        logging.logWithDuration('Initialized model', startTime, 'O&F');
                        return [2];
                }
            });
        });
    };
    OnsetsAndFrames.prototype.dispose = function () {
        if (!this.initialized) {
            return;
        }
        this.onsetsCnn.dispose();
        this.onsetsRnn.dispose();
        this.activationCnn.dispose();
        this.frameRnn.dispose();
        this.velocityCnn.dispose();
        this.initialized = false;
    };
    OnsetsAndFrames.prototype.isInitialized = function () {
        return this.initialized;
    };
    OnsetsAndFrames.prototype.transcribeFromMelSpec = function (melSpec, parallelBatches) {
        if (parallelBatches === void 0) { parallelBatches = 4; }
        return __awaiter(this, void 0, void 0, function () {
            var startTime, _a, frameProbs, onsetProbs, velocities, ns;
            var _this = this;
            return __generator(this, function (_b) {
                if (!this.isInitialized()) {
                    this.initialize();
                }
                startTime = performance.now();
                logging.log('Computing onsets, frames, and velocities...', 'O&F', 20);
                _a = tf.tidy(function () {
                    var batches = transcription_utils_1.batchInput(melSpec, _this.chunkLength);
                    return _this.processBatches(batches, _this.chunkLength, melSpec.length, parallelBatches);
                }), frameProbs = _a[0], onsetProbs = _a[1], velocities = _a[2];
                logging.log('Converting to NoteSequence...', 'O&F', 20);
                ns = transcription_utils_1.pianorollToNoteSequence(frameProbs, onsetProbs, velocities);
                ns.then(function () {
                    frameProbs.dispose();
                    onsetProbs.dispose();
                    velocities.dispose();
                    logging.logWithDuration('Transcribed from mel spec', startTime, 'O&F');
                });
                return [2, ns];
            });
        });
    };
    OnsetsAndFrames.prototype.transcribeFromAudioBuffer = function (audioBuffer, batchSize) {
        if (batchSize === void 0) { batchSize = 4; }
        return __awaiter(this, void 0, void 0, function () {
            var startTime, melSpec;
            var _this = this;
            return __generator(this, function (_a) {
                startTime = performance.now();
                melSpec = audio_utils_1.preprocessAudio(audioBuffer);
                melSpec.then(function () { return logging.logWithDuration('Converted audio to mel spec', startTime, 'O&F', 20); });
                return [2, melSpec.then(function (spec) { return _this.transcribeFromMelSpec(spec.map(function (a) { return Array.from(a); }, batchSize)); })];
            });
        });
    };
    OnsetsAndFrames.prototype.transcribeFromAudioFile = function (blob) {
        return __awaiter(this, void 0, void 0, function () {
            var audio;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, audio_utils_1.loadAudioFromFile(blob)];
                    case 1:
                        audio = _a.sent();
                        return [2, this.transcribeFromAudioBuffer(audio)];
                }
            });
        });
    };
    OnsetsAndFrames.prototype.transcribeFromAudioURL = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var audio;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, audio_utils_1.loadAudioFromUrl(url)];
                    case 1:
                        audio = _a.sent();
                        return [2, this.transcribeFromAudioBuffer(audio)];
                }
            });
        });
    };
    OnsetsAndFrames.prototype.processBatches = function (batches, chunkLength, fullLength, batchSize) {
        var _this = this;
        var _a;
        var runCnns = (function (batch) {
            return [_this.onsetsCnn.predict(batch, batchSize),
                _this.activationCnn.predict(batch, batchSize),
                _this.velocityCnn.predict(batch, batchSize)];
        });
        var onsetsCnnOut, activationProbs, scaledVelocities;
        if (batches.shape[0] === 1) {
            _a = runCnns(batches.expandDims(-1)), onsetsCnnOut = _a[0], activationProbs = _a[1], scaledVelocities = _a[2];
        }
        else {
            var batchesOutput = runCnns(batches.expandDims(-1));
            var allOutputs = [];
            for (var i = 0; i < 3; ++i) {
                allOutputs.push(transcription_utils_1.unbatchOutput(batchesOutput[i], chunkLength, fullLength));
            }
            onsetsCnnOut = allOutputs[0], activationProbs = allOutputs[1], scaledVelocities = allOutputs[2];
        }
        var onsetProbs = this.onsetsRnn.predict(onsetsCnnOut, this.chunkLength);
        onsetsCnnOut.dispose();
        var frameProbInputs = tf.concat3d([onsetProbs, activationProbs], -1);
        activationProbs.dispose();
        var frameProbs = this.frameRnn.predict(frameProbInputs, this.chunkLength);
        var velocities = tf.clipByValue(scaledVelocities, 0., 1.)
            .mul(tf.scalar(80.))
            .add(tf.scalar(10.))
            .toInt();
        scaledVelocities.dispose();
        return [frameProbs.squeeze(), onsetProbs.squeeze(), velocities.squeeze()];
    };
    OnsetsAndFrames.prototype.build = function (vars) {
        var _this = this;
        tf.tidy(function () {
            _this.onsetsCnn = new AcousticCnn();
            _this.onsetsCnn.setWeights(vars, 'onsets');
            _this.onsetsRnn = new Lstm([null, _this.onsetsCnn.outputShape[2]]);
            _this.onsetsRnn.setWeights(vars, 'onsets', 'onset_probs');
            _this.activationCnn = new AcousticCnn('sigmoid');
            _this.activationCnn.setWeights(vars, 'frame', 'activation_probs');
            _this.frameRnn = new Lstm([null, constants_1.MIDI_PITCHES * 2]);
            _this.frameRnn.setWeights(vars, 'frame', 'frame_probs');
            _this.velocityCnn = new AcousticCnn('linear');
            _this.velocityCnn.setWeights(vars, 'velocity', 'onset_velocities');
        });
    };
    return OnsetsAndFrames;
}());
exports.OnsetsAndFrames = OnsetsAndFrames;
var AcousticCnn = (function () {
    function AcousticCnn(finalDenseActivation) {
        this.nn = tf.sequential();
        var convConfig = {
            filters: 48,
            kernelSize: [3, 3],
            activation: 'linear',
            useBias: false,
            padding: 'same',
            dilationRate: [1, 1],
            inputShape: [null, constants_1.MEL_SPEC_BINS, 1],
            trainable: false
        };
        var batchNormConfig = { scale: false, trainable: false };
        this.nn.add(tf.layers.conv2d(convConfig));
        this.nn.add(tf.layers.batchNormalization(batchNormConfig));
        this.nn.add(tf.layers.activation({ activation: 'relu' }));
        convConfig.inputShape = null;
        this.nn.add(tf.layers.conv2d(convConfig));
        this.nn.add(tf.layers.batchNormalization(batchNormConfig));
        this.nn.add(tf.layers.activation({ activation: 'relu' }));
        this.nn.add(tf.layers.maxPooling2d({ poolSize: [1, 2], strides: [1, 2] }));
        convConfig.filters = 96;
        this.nn.add(tf.layers.conv2d(convConfig));
        this.nn.add(tf.layers.batchNormalization(batchNormConfig));
        this.nn.add(tf.layers.activation({ activation: 'relu' }));
        this.nn.add(tf.layers.maxPooling2d({ poolSize: [1, 2], strides: [1, 2] }));
        var dims = this.nn.outputShape;
        this.nn.add(tf.layers.reshape({ targetShape: [dims[1], dims[2] * dims[3]] }));
        this.nn.add(tf.layers.dense({ units: 768, activation: 'relu', trainable: false }));
        if (finalDenseActivation) {
            this.nn.add(tf.layers.dense({
                units: constants_1.MIDI_PITCHES,
                activation: finalDenseActivation,
                trainable: false
            }));
        }
        this.outputShape = this.nn.outputShape;
    }
    AcousticCnn.prototype.dispose = function () {
        this.nn.dispose();
    };
    AcousticCnn.prototype.predict = function (inputs, batchSize) {
        return this.nn.predict(inputs, { batchSize: batchSize });
    };
    AcousticCnn.prototype.setWeights = function (vars, scope, denseName) {
        function getVar(name) {
            var v = vars[name];
            if (v === undefined) {
                throw Error("Variable not found: " + name);
            }
            return v;
        }
        var weights = [
            getVar(scope + "/conv0/weights"),
            getVar(scope + "/conv0/BatchNorm/beta"),
            getVar(scope + "/conv0/BatchNorm/moving_mean"),
            getVar(scope + "/conv0/BatchNorm/moving_variance"),
            getVar(scope + "/conv1/weights"),
            getVar(scope + "/conv1/BatchNorm/beta"),
            getVar(scope + "/conv1/BatchNorm/moving_mean"),
            getVar(scope + "/conv1/BatchNorm/moving_variance"),
            getVar(scope + "/conv2/weights"),
            getVar(scope + "/conv2/BatchNorm/beta"),
            getVar(scope + "/conv2/BatchNorm/moving_mean"),
            getVar(scope + "/conv2/BatchNorm/moving_variance"),
            getVar(scope + "/fc_end/weights"),
            getVar(scope + "/fc_end/biases"),
        ];
        if (denseName) {
            weights = weights.concat([
                getVar(scope + "/" + denseName + "/weights"),
                getVar(scope + "/" + denseName + "/biases")
            ]);
        }
        this.nn.setWeights(weights);
    };
    return AcousticCnn;
}());
var Lstm = (function () {
    function Lstm(inputShape, units) {
        if (units === void 0) { units = 384; }
        this.dense = tf.sequential();
        this.units = units;
        function getLstm() {
            var lstm = tf.layers.lstm({
                inputShape: inputShape,
                units: units,
                returnSequences: true,
                recurrentActivation: 'sigmoid',
                returnState: true,
                kernelInitializer: 'zeros',
                recurrentInitializer: 'zeros',
                biasInitializer: 'zeros',
                trainable: false
            });
            var inputs = [
                tf.input({ shape: inputShape }), tf.input({ shape: [units] }),
                tf.input({ shape: [units] })
            ];
            var outputs = lstm.apply(inputs);
            return tf.model({ inputs: inputs, outputs: outputs });
        }
        this.lstm = getLstm();
        this.dense.add(tf.layers.dense({
            inputShape: [null, units],
            units: constants_1.MIDI_PITCHES,
            activation: 'sigmoid',
            trainable: false
        }));
    }
    Lstm.prototype.dispose = function () {
        this.lstm.dispose();
        this.dense.dispose();
    };
    Lstm.prototype.setWeights = function (vars, scope, denseName) {
        var _this = this;
        function getVar(name) {
            var v = vars[name];
            if (v === undefined) {
                throw Error("Variable not found: " + name);
            }
            return v;
        }
        var reorderGates = (function (weights, forgetBias) {
            if (forgetBias === void 0) { forgetBias = 0; }
            var _a = tf.split(weights, 4, -1), i = _a[0], c = _a[1], f = _a[2], o = _a[3];
            return tf.concat([i, f.add(tf.scalar(forgetBias)), c, o], -1);
        });
        var splitAndReorderKernel = (function (kernel) { return tf.split(reorderGates(kernel), [kernel.shape[0] - _this.units, _this.units]); });
        var LSTM_PREFIX = 'cudnn_lstm/rnn/multi_rnn_cell/cell_0/cudnn_compatible_lstm_cell';
        var setLstmWeights = function (lstm) { return lstm.setWeights(splitAndReorderKernel(getVar(scope + "/" + LSTM_PREFIX + "/kernel"))
            .concat(reorderGates(getVar(scope + "/" + LSTM_PREFIX + "/bias"), 1.0))); };
        setLstmWeights(this.lstm);
        this.dense.setWeights([
            getVar(scope + "/" + denseName + "/weights"),
            getVar(scope + "/" + denseName + "/biases")
        ]);
    };
    Lstm.prototype.predict = function (inputs, chunkSize) {
        var _this = this;
        return tf.tidy(function () { return _this.predictImpl(inputs, chunkSize); });
    };
    Lstm.prototype.predictImpl = function (inputs, chunkSize) {
        var fullLength = inputs.shape[1];
        var numChunks = Math.ceil(fullLength / chunkSize);
        var state = [tf.zeros([1, this.units]), tf.zeros([1, this.units])];
        var outputChunks = [];
        for (var i = 0; i < numChunks; ++i) {
            var chunk = inputs.slice([0, i * chunkSize], [-1, (i < numChunks - 1) ? chunkSize : -1]);
            var result = this.lstm.predict([
                chunk, state[0], state[1]
            ]);
            outputChunks.push(this.dense.predict(result[0]));
            state = result.slice(1);
        }
        return outputChunks.length === 1 ? outputChunks[0] :
            tf.concat3d(outputChunks, 1);
    };
    return Lstm;
}());
//# sourceMappingURL=model.js.map