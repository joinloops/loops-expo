import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, {
    cancelAnimation,
    Extrapolate,
    interpolate,
    runOnJS,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import {
    Camera,
    useCameraDevice,
    useCameraPermission
} from 'react-native-vision-camera';

const MAX_DURATION = 60;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

const ReanimatedCamera = Reanimated.createAnimatedComponent(Camera);

type DuetLayout = 'side-by-side' | 'vertical';

export default function DuetCameraScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const duetVideoId = params.id as string;
    const duetVideoUri = params.duetVideoUri as string;

    const camera = useRef<Camera>(null);

    const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('front');
    const [flash, setFlash] = useState<'off' | 'on'>('off');
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [hasRecordedContent, setHasRecordedContent] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [layout, setLayout] = useState<DuetLayout>('side-by-side');
    const [isVideoReady, setIsVideoReady] = useState(false);

    const device = useCameraDevice(cameraPosition);
    const { hasPermission, requestPermission } = useCameraPermission();
    const isFocused = useIsFocused();

    const recordingProgress = useRef(new Animated.Value(0)).current;
    const recordingTimer = useRef<NodeJS.Timeout | null>(null);
    const recordingStartTime = useRef<number>(0);
    const pausedDuration = useRef<number>(0);
    const lastPauseTime = useRef<number>(0);

    const player = useVideoPlayer(duetVideoUri, (player) => {
        player.loop = false;
        player.volume = 1.0;
    });

    const handleFirstFrameRender = useCallback(() => {
        setIsVideoReady(true);
    }, []);

    const zoom = useSharedValue(1);
    const zoomOffset = useSharedValue(1);
    const minZoom = device?.minZoom ?? 1;
    const maxZoom = Math.min(device?.maxZoom ?? 1, 20);

    const recordButtonStartY = useSharedValue(0);
    const zoomOffsetY = useSharedValue(0);
    const isHoldingRecord = useSharedValue(false);
    const zoomIndicatorOpacity = useSharedValue(0);

    const [zoomText, setZoomText] = useState('1x');

    useEffect(() => {
        const interval = setInterval(() => {
            const zoomValue = zoom.value;
            const text = zoomValue < 1.5 ? '1x' : `${zoomValue.toFixed(1)}x`;
            setZoomText(text);
        }, 50);

        return () => clearInterval(interval);
    }, []);

    const clampZoom = useCallback((value: number) => {
        'worklet';
        return Math.max(minZoom, Math.min(value, maxZoom));
    }, [minZoom, maxZoom]);

    const animatedProps = useAnimatedProps(() => ({
        zoom: clampZoom(zoom.value),
    }), [zoom]);

    const zoomBarFillStyle = useAnimatedStyle(() => ({
        width: `${Math.round(((zoom.value - minZoom) / (maxZoom - minZoom)) * 100)}%`,
    }));

    useEffect(() => {
        (async () => {
            if (!hasPermission) {
                await requestPermission();
            }
        })();
    }, [hasPermission, requestPermission]);

    useEffect(() => {
        if (!isRecording && !isPaused) {
            setRecordingDuration(0);
            recordingProgress.setValue(0);
            pausedDuration.current = 0;
            if (recordingTimer.current) {
                clearInterval(recordingTimer.current);
                recordingTimer.current = null;
            }
        }
    }, [isRecording, isPaused]);

    const pinchGesture = Gesture.Pinch()
        .onBegin(() => {
            'worklet';
            zoomOffset.value = zoom.value;
            cancelAnimation(zoomIndicatorOpacity);
            zoomIndicatorOpacity.value = withTiming(1, { duration: 200 });
        })
        .onUpdate((event) => {
            'worklet';
            const newZoom = zoomOffset.value * event.scale;
            zoom.value = clampZoom(newZoom);

            cancelAnimation(zoomIndicatorOpacity);
            zoomIndicatorOpacity.value = 1;
        })
        .onEnd(() => {
            'worklet';
            cancelAnimation(zoomIndicatorOpacity);
            zoomIndicatorOpacity.value = withDelay(2000, withTiming(0, { duration: 200 }));
        });

    const startRecording = useCallback(async () => {
        if (!camera.current || !isVideoReady) return;

        try {
            if (isPaused) {
                await camera.current.resumeRecording();
                player.play();
                
                setIsRecording(true);
                setIsPaused(false);
                isHoldingRecord.value = true;

                if (lastPauseTime.current > 0) {
                    pausedDuration.current += Date.now() - lastPauseTime.current;
                    lastPauseTime.current = 0;
                }

                cancelAnimation(zoomIndicatorOpacity);
                zoomIndicatorOpacity.value = withTiming(1, { duration: 200 });

                const startTime = recordingStartTime.current;
                recordingTimer.current = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - startTime - pausedDuration.current) / 1000);
                    setRecordingDuration(elapsed);

                    if (elapsed >= MAX_DURATION) {
                        finishRecording();
                    }
                }, 100);

                return;
            }

            setIsRecording(true);
            setHasRecordedContent(true);
            isHoldingRecord.value = true;

            cancelAnimation(zoomIndicatorOpacity);
            zoomIndicatorOpacity.value = withTiming(1, { duration: 200 });

            recordingStartTime.current = Date.now();
            pausedDuration.current = 0;
            const startTime = Date.now();

            player.currentTime = 0;
            player.play();

            Animated.timing(recordingProgress, {
                toValue: MAX_DURATION,
                duration: MAX_DURATION * 1000,
                useNativeDriver: false,
            }).start();

            recordingTimer.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                setRecordingDuration(elapsed);

                if (elapsed >= MAX_DURATION) {
                    finishRecording();
                }
            }, 100);

            camera.current.startRecording({
                flash: flash,
                onRecordingFinished: (video) => {
                    console.log('Recording finished:', video);
                    router.push({
                        pathname: '/private/video/duet/preview',
                        params: {
                            newVideoPath: video.path,
                            originalVideoUri: duetVideoUri,
                            duetId: duetVideoId,
                            duration: recordingDuration,
                            layout: layout,
                            recordingStartTime: recordingStartTime.current,
                        }
                    });
                },
                onRecordingError: (error) => {
                    console.error('Recording error:', error);
                    Alert.alert('Recording Error', error.message);
                    setIsRecording(false);
                    setIsPaused(false);
                    isHoldingRecord.value = false;

                    player.pause();
                },
            });
        } catch (error: any) {
            console.error('Failed to start recording:', error);
            Alert.alert('Error', 'Failed to start recording');
            setIsRecording(false);
            setIsPaused(false);
            isHoldingRecord.value = false;
        }
    }, [isRecording, isPaused, flash, recordingDuration, router, duetVideoUri, layout, isVideoReady, player]);

    const pauseRecording = useCallback(async () => {
        if (!camera.current || !isRecording) return;

        try {
            await camera.current.pauseRecording();
            player.pause();
            
            setIsRecording(false);
            setIsPaused(true);
            isHoldingRecord.value = false;

            lastPauseTime.current = Date.now();

            cancelAnimation(zoomIndicatorOpacity);
            zoomIndicatorOpacity.value = withDelay(2000, withTiming(0, { duration: 200 }));

            if (recordingTimer.current) {
                clearInterval(recordingTimer.current);
                recordingTimer.current = null;
            }

            recordingProgress.stopAnimation();
        } catch (error) {
            console.error('Failed to pause recording:', error);
        }
    }, [isRecording, player]);

    const finishRecording = useCallback(async () => {
        if (!camera.current) return;

        try {
            await camera.current.stopRecording();
            setIsRecording(false);
            setIsPaused(false);
            isHoldingRecord.value = false;

            player.pause();

            cancelAnimation(zoomIndicatorOpacity);
            zoomIndicatorOpacity.value = withDelay(2000, withTiming(0, { duration: 200 }));

            zoom.value = withSpring(1);

            if (recordingTimer.current) {
                clearInterval(recordingTimer.current);
                recordingTimer.current = null;
            }

            recordingProgress.stopAnimation();
        } catch (error) {
            console.error('Failed to stop recording:', error);
        }
    }, [player]);

    const handleNextButton = useCallback(() => {
        finishRecording();
    }, [finishRecording]);

    const toggleCamera = () => {
        setCameraPosition((prev) => (prev === 'back' ? 'front' : 'back'));
    };

    const toggleFlash = () => {
        setFlash((prev) => (prev === 'off' ? 'on' : 'off'));
    };

    const toggleLayout = () => {
        setLayout((prev) => (prev === 'side-by-side' ? 'vertical' : 'side-by-side'));
    };

    const handleClose = () => {
        if (isRecording || isPaused) {
            Alert.alert(
                'Discard Recording?',
                'Are you sure you want to exit? Your recording will be lost.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Discard',
                        style: 'destructive',
                        onPress: () => {
                            if (isRecording) {
                                camera.current?.cancelRecording();
                            }
                            router.back();
                        }
                    }
                ]
            );
        } else {
            router.back();
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const zoomIndicatorStyle = useAnimatedStyle(() => {
        return {
            opacity: zoomIndicatorOpacity.value,
            transform: [
                {
                    scale: withSpring(zoomIndicatorOpacity.value > 0 ? 1 : 0.8),
                },
            ],
        };
    });

    if (!hasPermission) {
        return (
            <View style={styles.container}>
                <Text style={styles.permissionText}>Camera permission required</Text>
            </View>
        );
    }

    if (!device) {
        return (
            <View style={styles.container}>
                <Text style={styles.permissionText}>No camera device found</Text>
            </View>
        );
    }

    if (!duetVideoUri) {
        return (
            <View style={styles.container}>
                <Text style={styles.permissionText}>No duet video provided</Text>
            </View>
        );
    }

    const tapRecordGesture = Gesture.Tap()
        .maxDuration(99999999)
        .onBegin(() => {
            'worklet';
            runOnJS(startRecording)();
        })
        .onFinalize((_, success) => {
            'worklet';
            if (success) {
                runOnJS(pauseRecording)();
            }
        });

    const panGesture = Gesture.Pan()
        .onStart((event) => {
            'worklet';
            recordButtonStartY.value = event.absoluteY;

            const yForFullZoom = recordButtonStartY.value * 0.7;
            const offsetYForFullZoom = recordButtonStartY.value - yForFullZoom;

            zoomOffsetY.value = interpolate(
                zoom.value,
                [minZoom, maxZoom],
                [0, offsetYForFullZoom],
                Extrapolate.CLAMP
            );
        })
        .onUpdate((event) => {
            'worklet';
            if (!isHoldingRecord.value) return;

            const offset = zoomOffsetY.value;
            const startY = recordButtonStartY.value;
            const yForFullZoom = startY * 0.7;

            const newZoom = interpolate(
                event.absoluteY - offset,
                [yForFullZoom, startY],
                [maxZoom, minZoom],
                Extrapolate.CLAMP
            );

            zoom.value = newZoom;

            cancelAnimation(zoomIndicatorOpacity);
            zoomIndicatorOpacity.value = withDelay(2000, withTiming(0, { duration: 200 }));
        })
        .onEnd(() => {
            'worklet';
            recordButtonStartY.value = 0;
            zoomOffsetY.value = 0;

            if (!isHoldingRecord.value) {
                cancelAnimation(zoomIndicatorOpacity);
                zoomIndicatorOpacity.value = withDelay(2000, withTiming(0, { duration: 200 }));
            }
        });

    const recordButtonGesture = Gesture.Simultaneous(tapRecordGesture, panGesture);

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            'worklet';
            zoom.value = withSpring(1);

            cancelAnimation(zoomIndicatorOpacity);
            zoomIndicatorOpacity.value = 1;
            zoomIndicatorOpacity.value = withDelay(2000, withTiming(0, { duration: 200 }));
        });

    const cameraGestures = Gesture.Race(doubleTapGesture, pinchGesture);

    const containerWidth = SCREEN_WIDTH;
    const containerHeight = SCREEN_HEIGHT;

    let cameraWidth: number;
    let cameraHeight: number;
    let videoWidth: number;
    let videoHeight: number;

    if (layout === 'side-by-side') {
        cameraWidth = containerWidth / 2;
        cameraHeight = containerHeight;
        videoWidth = containerWidth / 2;
        videoHeight = containerHeight;
    } else {
        cameraWidth = containerWidth;
        cameraHeight = containerHeight / 2;
        videoWidth = containerWidth;
        videoHeight = containerHeight / 2;
    }

    return (
        <GestureHandlerRootView style={styles.container}>

            <StatusBar style="light" />
            <Stack.Screen options={{ headerShown: false }} />
            <View
                style={[
                    styles.videoContainer,
                    layout === 'side-by-side' ? styles.videoLeft : styles.videoTop,
                    { width: videoWidth, height: videoHeight }
                ]}
            >
                <VideoView
                    style={StyleSheet.absoluteFill}
                    player={player}
                    nativeControls={false}
                    contentFit="contain"
                    onFirstFrameRender={handleFirstFrameRender}
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.1)']}
                    style={styles.videoGradient}
                    pointerEvents="none"
                />
            </View>

            <GestureDetector gesture={cameraGestures}>
                <View
                    style={[
                        styles.cameraContainer,
                        layout === 'side-by-side' ? styles.cameraRight : styles.cameraBottom,
                        { width: cameraWidth, height: cameraHeight }
                    ]}
                >
                    {isFocused && device && (
                        <ReanimatedCamera
                            ref={camera}
                            style={StyleSheet.absoluteFill}
                            resizeMode="contain"
                            device={device}
                            isActive={isFocused}
                            video={true}
                            audio={true}
                            photo={false}
                            animatedProps={animatedProps}
                        />
                    )}
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)']}
                        style={styles.gradientOverlay}
                        pointerEvents="none"
                    />
                </View>
            </GestureDetector>

            <Reanimated.View style={[styles.zoomIndicator, zoomIndicatorStyle]}>
                <View style={styles.zoomIndicatorContent}>
                    <Text style={styles.zoomText}>
                        {zoomText}
                    </Text>
                    <View style={styles.zoomBarContainer}>
                        <Reanimated.View
                            style={[styles.zoomBarFill, zoomBarFillStyle]}
                        />
                    </View>
                </View>
            </Reanimated.View>

            <View style={styles.topBar}>
                <PressableHaptics onPress={handleClose} style={styles.topButton}>
                    <Ionicons name="close" size={28} color="#fff" />
                </PressableHaptics>

                <View style={styles.duetBadge}>
                    <Ionicons name="duplicate-outline" size={16} color="#fff" />
                    <Text style={styles.duetBadgeText}>Duet</Text>
                </View>

                <PressableHaptics onPress={toggleLayout} style={styles.topButton}>
                    <Ionicons
                        name={layout === 'side-by-side' ? 'swap-horizontal' : 'swap-vertical'}
                        size={24}
                        color="#fff"
                    />
                </PressableHaptics>
            </View>

            <View style={styles.rightControls}>
                <PressableHaptics onPress={toggleCamera} style={styles.controlButton}>
                    <Ionicons name="camera-reverse" size={28} color="#fff" />
                </PressableHaptics>

                <TouchableOpacity onPress={toggleFlash} style={styles.controlButton}>
                    <Ionicons
                        name={flash === 'off' ? 'flash-off' : 'flash'}
                        size={24}
                        color="#fff"
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.bottomContainer}>
                {(isRecording || isPaused) && (
                    <View style={styles.recordingIndicator}>
                        <View style={[styles.recordingDot, isPaused && styles.recordingDotPaused]} />
                        <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
                    </View>
                )}

                <View style={styles.bottomControls}>
                    <View style={styles.placeholder} />

                    <GestureDetector gesture={recordButtonGesture}>
                        <Reanimated.View style={styles.recordButtonContainer}>
                            <View style={styles.recordButtonPressable}>
                                <View style={[
                                    styles.recordButton, 
                                    isRecording && styles.recordButtonActive,
                                    isPaused && styles.recordButtonPaused
                                ]}>
                                    <View style={[
                                        styles.recordButtonInner, 
                                        isRecording && styles.recordButtonInnerActive,
                                        isPaused && styles.recordButtonInnerPaused
                                    ]} />
                                </View>
                                {!isRecording && !isPaused && isVideoReady && (
                                    <Text style={styles.recordHint}>Press and hold to record</Text>
                                )}
                                {!isVideoReady && (
                                    <Text style={styles.recordHint}>Loading video...</Text>
                                )}
                                {isRecording && (
                                    <Text style={styles.recordHint}>Slide up to zoom</Text>
                                )}
                                {isPaused && (
                                    <Text style={styles.recordHint}>Press to resume</Text>
                                )}
                            </View>
                        </Reanimated.View>
                    </GestureDetector>

                    {hasRecordedContent ? (
                        <PressableHaptics onPress={handleNextButton} style={styles.nextButton}>
                            <Ionicons name="checkmark" size={32} color="#fff" />
                        </PressableHaptics>
                    ) : (
                        <View style={styles.placeholder} />
                    )}
                </View>
            </View>

            <View
                style={[
                    styles.dividerLine,
                    layout === 'side-by-side'
                        ? { left: containerWidth / 2, width: 2, height: containerHeight }
                        : { top: containerHeight / 2, height: 2, width: containerWidth }
                ]}
            />
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    permissionText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 100,
    },
    videoContainer: {
        position: 'absolute',
        backgroundColor: '#000',
    },
    videoLeft: {
        left: 0,
        top: 0,
    },
    videoTop: {
        left: 0,
        top: 0,
    },
    cameraContainer: {
        position: 'absolute',
    },
    cameraRight: {
        right: 0,
        top: 0,
    },
    cameraBottom: {
        left: 0,
        bottom: 0,
    },
    videoGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '30%',
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        zIndex: 10,
    },
    topButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 22,
    },
    duetBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F02C56',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
    },
    duetBadgeText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    rightControls: {
        position: 'absolute',
        right: 12,
        top: '35%',
        zIndex: 10,
        gap: 20,
    },
    controlButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 22,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: 40,
        zIndex: 10,
    },
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 20,
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ff0000',
    },
    recordingDotPaused: {
        backgroundColor: '#FFA500',
    },
    recordingTime: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    placeholder: {
        width: 70,
    },
    recordButtonContainer: {
        alignItems: 'center',
        gap: 12,
    },
    recordButtonPressable: {
        alignItems: 'center',
        gap: 12,
    },
    recordButton: {
        width: 68,
        height: 68,
        borderRadius: 34,
        borderWidth: 4,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordButtonActive: {
        borderColor: '#F02C56',
    },
    recordButtonPaused: {
        borderColor: '#FFA500',
    },
    recordButtonInner: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#fff',
    },
    recordButtonInnerActive: {
        width: 24,
        height: 24,
        borderRadius: 4,
        backgroundColor: '#F02C56',
    },
    recordButtonInnerPaused: {
        width: 24,
        height: 24,
        borderRadius: 4,
        backgroundColor: '#FFA500',
    },
    recordHint: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 12,
        maxWidth: 140,
        textAlign: 'center',
        fontWeight: '600',
    },
    nextButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F02C56',
        justifyContent: 'center',
        alignItems: 'center',
    },
    zoomIndicator: {
        position: 'absolute',
        top: '45%',
        alignSelf: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 12,
        zIndex: 5,
    },
    zoomIndicatorContent: {
        alignItems: 'center',
        gap: 8,
    },
    zoomText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    zoomBarContainer: {
        width: 100,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    zoomBarFill: {
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 2,
    },
    gradientOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '100%',
    },
    dividerLine: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        zIndex: 1,
    },
});