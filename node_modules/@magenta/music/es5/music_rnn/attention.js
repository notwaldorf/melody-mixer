"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tf = require("@tensorflow/tfjs-core");
exports.ATTENTION_PREFIX = 'attention_cell_wrapper/';
var AttentionWrapper = (function () {
    function AttentionWrapper(cells, attnLength, attnSize) {
        this.cells = cells;
        this.attnLength = attnLength;
        this.attnSize = attnSize;
    }
    AttentionWrapper.isWrapped = function (vars) {
        return "rnn/" + exports.ATTENTION_PREFIX + "kernel" in vars;
    };
    AttentionWrapper.prototype.initialize = function (vars) {
        var prefix = "rnn/" + exports.ATTENTION_PREFIX;
        this.attnInputMatrix = vars[prefix + "kernel"];
        this.attnInputBias = vars[prefix + "bias"];
        this.attnW = vars[prefix + "attention/attn_w"];
        this.attnV = vars[prefix + "attention/attn_v"];
        this.attnMatrix = vars[prefix + "attention/kernel"];
        this.attnBias = vars[prefix + "attention/bias"];
        this.attnOutputMatrix =
            vars[prefix + "attention_output_projection/kernel"];
        this.attnOutputBias =
            vars[prefix + "attention_output_projection/bias"];
    };
    AttentionWrapper.prototype.initState = function () {
        var attention = tf.zeros([this.attnSize]);
        var attentionState = tf.zeros([1, this.attnSize * this.attnLength]);
        return { attention: attention, attentionState: attentionState };
    };
    AttentionWrapper.prototype.call = function (input, c, h, state) {
        var _a;
        var nextAttnInput = tf.concat([input, state.attention.as2D(1, -1)], 1);
        var nextRnnInput = tf.add(tf.matMul(nextAttnInput, this.attnInputMatrix), this.attnInputBias.as2D(1, -1));
        _a = tf.multiRNNCell(this.cells, nextRnnInput, c, h), c = _a[0], h = _a[1];
        var attnHidden = tf.reshape(state.attentionState, [-1, this.attnLength, 1, this.attnSize]);
        var attnHiddenFeatures = tf.conv2d(attnHidden, this.attnW, [1, 1], 'same');
        var attnQueryParts = [];
        for (var q = 0; q < c.length; q++) {
            attnQueryParts.push(c[q]);
            attnQueryParts.push(h[q]);
        }
        var attnQuery = tf.concat(attnQueryParts, 1);
        var attnY = tf.matMul(attnQuery, this.attnMatrix).reshape([
            -1, 1, 1, this.attnSize
        ]);
        var attnS = tf.sum(tf.mul(this.attnV, tf.tanh(tf.add(attnHiddenFeatures, attnY))), [2, 3]);
        var attnA = tf.softmax(attnS);
        var attnD = tf.sum(tf.mul(tf.reshape(attnA, [-1, this.attnLength, 1, 1]), attnHidden), [1, 2]);
        var newAttns = attnD.reshape([-1, this.attnSize]);
        var attnStates = state.attentionState.reshape([-1, this.attnLength, this.attnSize]);
        var newAttnStates = tf.slice(attnStates, [0, 1, 0], [attnStates.shape[0], attnStates.shape[1] - 1, attnStates.shape[2]]);
        var output = tf.add(tf.matMul(tf.concat([h[2], newAttns], 1), this.attnOutputMatrix), this.attnOutputBias);
        var attention = newAttns.flatten();
        var attentionState = tf.concat([newAttnStates, output.as3D(output.shape[0], 1, output.shape[1])], 1)
            .reshape([-1, this.attnLength * this.attnSize]);
        return { output: output, c: c, h: h, attentionState: { attention: attention, attentionState: attentionState } };
    };
    return AttentionWrapper;
}());
exports.AttentionWrapper = AttentionWrapper;
//# sourceMappingURL=attention.js.map