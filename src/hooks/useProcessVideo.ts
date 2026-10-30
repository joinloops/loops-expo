import { Video as VideoCompressor, getVideoMetaData } from 'react-native-compressor';

const TARGET_LONG_EDGE = 1080;
const BITS_PER_PIXEL = 0.12;
const SKIP_UNDER_MB = 15;

export async function prepareVideoForUpload(sourceUri: string, onProgress: (pct: number) => void) {
    const meta = await getVideoMetaData(sourceUri);
    const sizeMb = (meta.size ?? 0) / (1024 * 1024);
    const isMp4 = (meta.extension ?? '').toLowerCase() === 'mp4';

    if (isMp4 && sizeMb > 0 && sizeMb < SKIP_UNDER_MB) {
        return sourceUri;
    }

    const longEdge = Math.max(meta.width, meta.height);
    const shortEdge = Math.min(meta.width, meta.height);

    const outLong = Math.min(longEdge, TARGET_LONG_EDGE);
    const scale = outLong / longEdge;
    const outShort = Math.round(shortEdge * scale);

    const fps = 30;
    const bitrate = Math.round(outLong * outShort * fps * BITS_PER_PIXEL);

    const targetBitrate = Math.min(Math.max(bitrate, 3_000_000), 10_000_000);

    await VideoCompressor.activateBackgroundTask();

    try {
        return await VideoCompressor.compress(
            sourceUri,
            {
                compressionMethod: 'manual',
                maxSize: outLong,
                bitrate: targetBitrate,
                minimumFileSizeForCompress: SKIP_UNDER_MB,
                progressDivider: 5,
            },
            (progress) => onProgress(Math.round(progress * 100)),
        );
    } finally {
        await VideoCompressor.deactivateBackgroundTask();
    }
}
