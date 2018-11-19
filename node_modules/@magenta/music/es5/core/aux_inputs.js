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
var tf = require("@tensorflow/tfjs-core");
function auxiliaryInputFromSpec(spec) {
    switch (spec.type) {
        case 'BinaryCounter':
            return new BinaryCounter(spec.args);
        default:
            throw new Error("Unknown auxiliary input: " + spec);
    }
}
exports.auxiliaryInputFromSpec = auxiliaryInputFromSpec;
var AuxiliaryInput = (function () {
    function AuxiliaryInput(depth) {
        this.depth = depth;
    }
    return AuxiliaryInput;
}());
exports.AuxiliaryInput = AuxiliaryInput;
var BinaryCounter = (function (_super) {
    __extends(BinaryCounter, _super);
    function BinaryCounter(args) {
        return _super.call(this, args.numBits) || this;
    }
    BinaryCounter.prototype.getTensors = function (numSteps) {
        var buffer = tf.buffer([numSteps, this.depth]);
        for (var step = 0; step < numSteps; ++step) {
            for (var i = 0; i < this.depth; ++i) {
                buffer.set(Math.floor((step + 1) / Math.pow(2, i)) % 2 ? 1.0 : -1.0, step, i);
            }
        }
        return buffer.toTensor().as2D(numSteps, this.depth);
    };
    return BinaryCounter;
}(AuxiliaryInput));
exports.BinaryCounter = BinaryCounter;
//# sourceMappingURL=aux_inputs.js.map