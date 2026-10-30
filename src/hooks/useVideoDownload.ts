import * as FileSystem from 'expo-file-system/legacy';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { useCallback, useEffect, useRef, useState } from 'react';

export type VideoDownloadStatus = 'idle' | 'downloading' | 'saving' | 'saved' | 'error';

const RESET_DELAY_MS = 2500;
const VIDEO_EXT_RE = /\.(mp4|mov|m4v|webm)$/i;

const filenameFromUrl = (url: string) => {
    const last = url.split('?')[0].split('#')[0].split('/').pop() ?? '';
    if (VIDEO_EXT_RE.test(last)) return last;
    return `loops-${Date.now()}.mp4`;
};

export function useVideoDownload() {
    const [status, setStatus] = useState<VideoDownloadStatus>('idle');
    const [progress, setProgress] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const resumableRef = useRef<FileSystem.DownloadResumable | null>(null);
    const cancelledRef = useRef(false);
    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearResetTimer = () => {
        if (resetTimer.current) {
            clearTimeout(resetTimer.current);
            resetTimer.current = null;
        }
    };

    const reset = useCallback(() => {
        clearResetTimer();
        resumableRef.current = null;
        setStatus('idle');
        setProgress(null);
        setError(null);
    }, []);

    const scheduleReset = useCallback(() => {
        clearResetTimer();
        resetTimer.current = setTimeout(reset, RESET_DELAY_MS);
    }, [reset]);

    const fail = useCallback(
        (message: string) => {
            resumableRef.current = null;
            setStatus('error');
            setError(message);
            scheduleReset();
        },
        [scheduleReset],
    );

    const download = useCallback(
        async (url?: string | null) => {
            if (!url || resumableRef.current) return;

            clearResetTimer();
            cancelledRef.current = false;
            setError(null);
            setProgress(null);
            setStatus('downloading');

            const { granted } = await requestPermissionsAsync(true);
            if (!granted) {
                fail('Allow photo access in Settings to save videos');
                return;
            }

            const fileUri = `${FileSystem.cacheDirectory}${filenameFromUrl(url)}`;
            const resumable = FileSystem.createDownloadResumable(url, fileUri, {}, (p) => {
                if (p.totalBytesExpectedToWrite > 0) {
                    setProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
                }
            });
            resumableRef.current = resumable;

            try {
                const result = await resumable.downloadAsync();
                if (cancelledRef.current) return;

                if (!result || !result.uri || result.status >= 400) {
                    await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
                    fail('Download failed');
                    return;
                }

                setStatus('saving');
                await Asset.create(result.uri);
                await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {});
                if (cancelledRef.current) return;

                resumableRef.current = null;
                setProgress(1);
                setStatus('saved');
                scheduleReset();
            } catch (e) {
                if (cancelledRef.current) return;
                await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
                fail('Could not save video');
            }
        },
        [fail, scheduleReset],
    );

    const cancel = useCallback(() => {
        const resumable = resumableRef.current;
        cancelledRef.current = true;
        resumableRef.current = null;
        resumable?.cancelAsync().catch(() => {});
        reset();
    }, [reset]);

    useEffect(() => {
        return () => {
            cancelledRef.current = true;
            clearResetTimer();
            resumableRef.current?.cancelAsync().catch(() => {});
        };
    }, []);

    return { status, progress, error, download, cancel };
}
