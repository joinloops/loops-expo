import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const TRACK_IDLE_HEIGHT = 2.5;
const TRACK_ACTIVE_HEIGHT = 5;
const THUMB_SIZE = 20;
const TOUCH_PADDING_TOP = 28;
const SEEK_THROTTLE_MS = 60;
const TIME_UPDATE_INTERVAL = 0.25;

function clampW(v, min, max) {
    'worklet';
    return Math.min(Math.max(v, min), max);
}

function formatTime(seconds) {
    'worklet';
    const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    const total = Math.floor(safe);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function VideoScrubber({
    player,
    isActive,
    bottom = 0,
    onScrubbingChange,
    scrollRef,
}) {
    const progress = useSharedValue(0);
    const duration = useSharedValue(0);
    const trackWidth = useSharedValue(0);
    const active = useSharedValue(0);
    const isScrubbing = useSharedValue(false);

    const wasPlayingRef = useRef(false);
    const lastSeekRef = useRef(0);

    useEffect(() => {
        if (isActive) return;
        progress.value = 0;
        active.value = 0;
        isScrubbing.value = false;
    }, [isActive]);

    useEffect(() => {
        if (!player) return;

        try {
            player.timeUpdateEventInterval = TIME_UPDATE_INTERVAL;
        } catch {}

        const sub = player.addListener('timeUpdate', ({ currentTime }) => {
            let d = 0;
            try {
                d = player.duration;
            } catch {
                return;
            }
            if (!d || !Number.isFinite(d) || d <= 0) return;

            duration.value = d;
            if (isScrubbing.value) return;

            const next = Math.min(Math.max(currentTime / d, 0), 1);

            // big jump means a loop or an external seek, snap instead of animating
            if (Math.abs(next - progress.value) > 0.08) {
                progress.value = next;
            } else {
                progress.value = withTiming(next, {
                    duration: TIME_UPDATE_INTERVAL * 1000 + 20,
                    easing: Easing.linear,
                });
            }
        });

        return () => {
            sub.remove();
            try {
                player.timeUpdateEventInterval = 0;
            } catch {}
        };
    }, [player]);

    const handleScrubStart = useCallback(() => {
        try {
            wasPlayingRef.current = !!player?.playing;
            player?.pause();
        } catch {}
        onScrubbingChange?.(true);
    }, [player, onScrubbingChange]);

    const seekToProgress = useCallback(
        (p, force = false) => {
            const now = Date.now();
            if (!force && now - lastSeekRef.current < SEEK_THROTTLE_MS) return;
            lastSeekRef.current = now;
            try {
                const d = player?.duration;
                if (!d || !Number.isFinite(d)) return;
                player.currentTime = Math.min(Math.max(p * d, 0), d);
            } catch {}
        },
        [player],
    );

    const handleScrubEnd = useCallback(
        (p) => {
            seekToProgress(p, true);
            try {
                if (wasPlayingRef.current) player?.play();
            } catch {}
            onScrubbingChange?.(false);
        },
        [player, seekToProgress, onScrubbingChange],
    );

    let pan = Gesture.Pan()
        .minDistance(0)
        .hitSlop({ top: 10 })
        .onBegin((e) => {
            isScrubbing.value = true;
            active.value = withTiming(1, { duration: 140 });
            if (trackWidth.value > 0) {
                progress.value = clampW(e.x / trackWidth.value, 0, 1);
            }
            runOnJS(handleScrubStart)();
        })
        .onUpdate((e) => {
            if (trackWidth.value <= 0) return;
            progress.value = clampW(e.x / trackWidth.value, 0, 1);
            runOnJS(seekToProgress)(progress.value, false);
        })
        .onFinalize(() => {
            isScrubbing.value = false;
            active.value = withTiming(0, { duration: 220 });
            runOnJS(handleScrubEnd)(progress.value);
        });

    if (scrollRef) {
        pan = pan.blocksExternalGesture(scrollRef);
    }

    const onLayout = useCallback((e) => {
        trackWidth.value = e.nativeEvent.layout.width;
    }, []);

    const trackStyle = useAnimatedStyle(() => ({
        height: TRACK_IDLE_HEIGHT + (TRACK_ACTIVE_HEIGHT - TRACK_IDLE_HEIGHT) * active.value,
    }));

    const fillStyle = useAnimatedStyle(() => ({
        width: progress.value * trackWidth.value,
    }));

    const thumbStyle = useAnimatedStyle(() => ({
        opacity: active.value,
        transform: [
            { translateX: progress.value * trackWidth.value - THUMB_SIZE / 2 },
            { scale: 0.4 + 0.6 * active.value },
        ],
    }));

    const timeStyle = useAnimatedStyle(() => ({
        opacity: active.value,
        transform: [{ translateY: (1 - active.value) * 10 }],
    }));

    const timeProps = useAnimatedProps(() => {
        const label = `${formatTime(progress.value * duration.value)} / ${formatTime(
            duration.value,
        )}`;
        return { text: label, defaultValue: label };
    });

    return (
        <View style={[styles.wrapper, { bottom }]} pointerEvents="box-none">
            <Animated.View style={[styles.timeWrapper, timeStyle]} pointerEvents="none">
                <AnimatedTextInput
                    editable={false}
                    underlineColorAndroid="transparent"
                    style={styles.timeText}
                    animatedProps={timeProps}
                    defaultValue="0:00 / 0:00"
                    accessible={false}
                />
            </Animated.View>

            <GestureDetector gesture={pan}>
                <View
                    style={styles.touchArea}
                    accessible={true}
                    accessibilityRole="adjustable"
                    accessibilityLabel="Video progress. Drag to seek.">
                    <Animated.View style={[styles.track, trackStyle]} onLayout={onLayout}>
                        <Animated.View style={[styles.fill, fillStyle]} />
                    </Animated.View>
                    <Animated.View style={[styles.thumb, thumbStyle]} />
                </View>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 20,
        elevation: 20,
    },
    timeWrapper: {
        alignItems: 'center',
        marginBottom: 6,
    },
    timeText: {
        color: '#fff',
        fontSize: 30,
        fontWeight: '600',
        textAlign: 'center',
        minWidth: 200,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
        overflow: 'hidden',
    },
    touchArea: {
        paddingTop: TOUCH_PADDING_TOP,
        paddingBottom: 0,
        justifyContent: 'flex-end',
    },
    track: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        backgroundColor: '#fff',
    },
    thumb: {
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        backgroundColor: '#fff',
    },
});
