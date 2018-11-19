"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tensor_1 = require("./tensor");
var util_1 = require("./util");
function assertTypesMatch(a, b) {
    util_1.assert(a.dtype === b.dtype, " The dtypes of the first(" + a.dtype + ") and" +
        (" second(" + b.dtype + ") input must match"));
}
exports.assertTypesMatch = assertTypesMatch;
function convertToTensor(x, argName, functionName, dtype) {
    if (dtype === void 0) { dtype = 'float32'; }
    dtype = dtype || 'float32';
    if (x instanceof tensor_1.Tensor) {
        return x;
    }
    if (!util_1.isTypedArray(x) && !Array.isArray(x) && typeof x !== 'number' &&
        typeof x !== 'boolean') {
        throw new Error("Argument '" + argName + "' passed to '" + functionName + "' must be a " +
            ("Tensor or TensorLike, but got " + x.constructor.name));
    }
    var inferredShape = util_1.inferShape(x);
    if (!util_1.isTypedArray(x) && !Array.isArray(x)) {
        x = [x];
    }
    return tensor_1.Tensor.make(inferredShape, { values: util_1.toTypedArray(x, dtype) }, dtype);
}
exports.convertToTensor = convertToTensor;
function convertToTensorArray(arg, argName, functionName) {
    if (!Array.isArray(arg)) {
        throw new Error("Argument " + argName + " passed to " + functionName + " must be a " +
            '`Tensor[]` or `TensorLike[]`');
    }
    var tensors = arg;
    return tensors.map(function (t, i) { return convertToTensor(t, argName + "[" + i + "]", functionName); });
}
exports.convertToTensorArray = convertToTensorArray;
function isTensorInList(tensor, tensorList) {
    for (var i = 0; i < tensorList.length; i++) {
        if (tensorList[i].id === tensor.id) {
            return true;
        }
    }
    return false;
}
exports.isTensorInList = isTensorInList;
function flattenNameArrayMap(nameArrayMap, keys) {
    var xs = [];
    if (nameArrayMap instanceof tensor_1.Tensor) {
        xs.push(nameArrayMap);
    }
    else {
        var xMap = nameArrayMap;
        for (var i = 0; i < keys.length; i++) {
            xs.push(xMap[keys[i]]);
        }
    }
    return xs;
}
exports.flattenNameArrayMap = flattenNameArrayMap;
function unflattenToNameArrayMap(keys, flatArrays) {
    if (keys.length !== flatArrays.length) {
        throw new Error("Cannot unflatten Tensor[], keys and arrays are not of same length.");
    }
    var result = {};
    for (var i = 0; i < keys.length; i++) {
        result[keys[i]] = flatArrays[i];
    }
    return result;
}
exports.unflattenToNameArrayMap = unflattenToNameArrayMap;
function getTensorsInContainer(result) {
    var list = [];
    var seen = new Set();
    walkTensorContainer(result, list, seen);
    return list;
}
exports.getTensorsInContainer = getTensorsInContainer;
function walkTensorContainer(container, list, seen) {
    if (container == null) {
        return;
    }
    if (container instanceof tensor_1.Tensor) {
        list.push(container);
        return;
    }
    if (!isIterable(container)) {
        return;
    }
    var iterable = container;
    for (var k in iterable) {
        var val = iterable[k];
        if (!seen.has(val)) {
            seen.add(val);
            walkTensorContainer(val, list, seen);
        }
    }
}
function isIterable(obj) {
    return Array.isArray(obj) || typeof obj === 'object';
}
//# sourceMappingURL=tensor_util.js.map