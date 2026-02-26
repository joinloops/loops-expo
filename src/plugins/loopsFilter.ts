import { VisionCameraProxy, type Frame } from 'react-native-vision-camera';

const _plugin = VisionCameraProxy.initFrameProcessorPlugin('loopsFilter', {});

export type FilterName = 'none' | 'warm' | 'cool' | 'bw' | 'glam' | 'dog' | 'sunglasses';
export type FilterAction = 'none' | 'start' | 'stop';

export interface LoopsFilterOptions {
    filter: FilterName;
    action: FilterAction;
    outputPath?: string;
}

export interface LoopsFilterResult {
    status: 'recording' | 'processed' | 'done' | 'error';
    path?: string;
    message?: string;
}

export function loopsFilter(frame: Frame, options: LoopsFilterOptions): LoopsFilterResult | null {
    'worklet';
    if (_plugin == null) throw new Error('loopsFilter plugin not loaded');
    return _plugin.call(frame, options as any) as any;
}
