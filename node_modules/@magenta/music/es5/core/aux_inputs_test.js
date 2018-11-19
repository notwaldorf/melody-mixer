"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tf = require("@tensorflow/tfjs-core");
var test = require("tape");
var aux_inputs = require("./aux_inputs");
test('Test Binary Counter', function (t) {
    var spec = {
        type: 'BinaryCounter',
        args: { numBits: 2 }
    };
    var bc = aux_inputs.auxiliaryInputFromSpec(spec);
    var tensors = bc.getTensors(5);
    var splitTensors = tf.split(tensors, 5);
    t.equal(bc.depth, 2);
    t.deepEqual(tensors.shape, [5, 2]);
    t.deepEqual(splitTensors[0].dataSync(), [1.0, -1.0]);
    t.deepEqual(splitTensors[1].dataSync(), [-1.0, 1.0]);
    t.deepEqual(splitTensors[2].dataSync(), [1.0, 1.0]);
    t.deepEqual(splitTensors[3].dataSync(), [-1.0, -1.0]);
    t.deepEqual(splitTensors[4].dataSync(), [1.0, -1.0]);
    t.end();
});
//# sourceMappingURL=aux_inputs_test.js.map