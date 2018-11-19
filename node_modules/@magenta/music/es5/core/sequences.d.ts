import { INoteSequence, NoteSequence } from '../protobuf/index';
export declare class MultipleTimeSignatureException extends Error {
    constructor(message?: string);
}
export declare class BadTimeSignatureException extends Error {
    constructor(message?: string);
}
export declare class NegativeTimeException extends Error {
    constructor(message?: string);
}
export declare class MultipleTempoException extends Error {
    constructor(message?: string);
}
export declare class QuantizationStatusException extends Error {
    constructor(message?: string);
}
export declare function clone(ns: INoteSequence): NoteSequence;
export declare function stepsPerQuarterToStepsPerSecond(stepsPerQuarter: number, qpm: number): number;
export declare function quantizeToStep(unquantizedSeconds: number, stepsPerSecond: number, quantizeCutoff?: number): number;
export declare function quantizeNoteSequence(ns: INoteSequence, stepsPerQuarter: number): NoteSequence;
export declare function isQuantizedSequence(ns: INoteSequence): boolean;
export declare function assertIsQuantizedSequence(ns: INoteSequence): void;
export declare function isRelativeQuantizedSequence(ns: INoteSequence): boolean;
export declare function assertIsRelativeQuantizedSequence(ns: INoteSequence): void;
export declare function isAbsoluteQuantizedSequence(ns: INoteSequence): boolean;
export declare function assertIsAbsoluteQuantizedSequence(ns: INoteSequence): void;
export declare function unquantizeSequence(qns: INoteSequence, qpm?: number): NoteSequence;
export declare function mergeInstruments(ns: INoteSequence): NoteSequence;
