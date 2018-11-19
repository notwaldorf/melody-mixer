export interface SpecParams {
    sampleRate: number;
    hopLength?: number;
    winLength?: number;
    nFft?: number;
    nMels?: number;
    power?: number;
    fMin?: number;
    fMax?: number;
}
export declare function loadAudioFromUrl(url: string): Promise<AudioBuffer>;
export declare function loadAudioFromFile(blob: Blob): Promise<AudioBuffer>;
export declare function preprocessAudio(audioBuffer: AudioBuffer): Promise<Float32Array[]>;
