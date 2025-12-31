import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Linking,
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
    useCameraPermission,
    useMicrophonePermission
} from 'react-native-vision-camera';

const MAX_DURATION = 180;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const ReanimatedCamera = Reanimated.createAnimatedComponent(Camera);

export default function CameraScreen() {
    const router = useRouter();
    const camera = useRef<Camera>(null);
    const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('back');
    const [flash, setFlash] = useState<'off' | 'on'>('off');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [isRequestingPermission, setIsRequestingPermission] = useState(false);

    const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
    const { hasPermission: hasMicrophonePermission, requestPermission: requestMicrophonePermission } = useMicrophonePermission();
    const device = useCameraDevice(cameraPosition, {
        physicalDevices: ['ultra-wide-angle-camera', 'wide-angle-camera', 'telephoto-camera']
    });
    const isFocused = useIsFocused();

    const recordingProgress = useRef(new Animated.Value(0)).current;
    const recordingTimer = useRef<NodeJS.Timeout | null>(null);

    const zoom = useSharedValue(1);
    const zoomOffset = useSharedValue(1);
    const minZoom = device?.minZoom ?? 1;
    const maxZoom = Math.min(device?.maxZoom ?? 1, 20);

    const recordButtonStartY = useSharedValue(0);
    const zoomOffsetY = useSharedValue(0);
    const isHoldingRecord = useSharedValue(false);
    const zoomIndicatorOpacity = useSharedValue(0);

    const [zoomText, setZoomText] = useState('1x');

    // Handle permission request
    const handleRequestPermission = useCallback(async () => {
        setIsRequestingPermission(true);
        try {
            const cameraPermission = await requestCameraPermission();
            const microphonePermission = await requestMicrophonePermission();
            
            if (!cameraPermission || !microphonePermission) {
                const missingPermissions = [];
                if (!cameraPermission) missingPermissions.push('Camera');
                if (!microphonePermission) missingPermissions.push('Microphone');
                
                Alert.alert(
                    'Permissions Required',
                    `Please enable ${missingPermissions.join(' and ')} access in your device settings to record videos with audio.`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                );
            }
        } catch (error) {
            console.error('Permission request error:', error);
        } finally {
            setIsRequestingPermission(false);
        }
    }, [requestCameraPermission, requestMicrophonePermission]);

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
        if (!isRecording) {
            setRecordingDuration(0);
            recordingProgress.setValue(0);
            if (recordingTimer.current) {
                clearInterval(recordingTimer.current);
                recordingTimer.current = null;
            }
        }
    }, [isRecording]);

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
        if (!camera.current || isRecording || !hasCameraPermission || !hasMicrophonePermission) return;

        try {
            setIsRecording(true);
            isHoldingRecord.value = true;

            cancelAnimation(zoomIndicatorOpacity);
            zoomIndicatorOpacity.value = withTiming(1, { duration: 200 });

            const startTime = Date.now();

            Animated.timing(recordingProgress, {
                toValue: MAX_DURATION,
                duration: MAX_DURATION * 1000,
                useNativeDriver: false,
            }).start();

            recordingTimer.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                setRecordingDuration(elapsed);

                if (elapsed >= MAX_DURATION) {
                    stopRecording();
                }
            }, 100);

            camera.current.startRecording({
                flash: flash,
                onRecordingFinished: (video) => {
                    console.log('Recording finished:', video);
                    router.push({
                        pathname: '/private/camera/preview',
                        params: { videoPath: video.path, duration: recordingDuration }
                    });
                },
                onRecordingError: (error) => {
                    console.error('Recording error:', error);
                    Alert.alert('Recording Error', error.message);
                    setIsRecording(false);
                    isHoldingRecord.value = false;
                },
            });
        } catch (error: any) {
            console.error('Failed to start recording:', error);
            Alert.alert('Error', 'Failed to start recording');
            setIsRecording(false);
            isHoldingRecord.value = false;
        }
    }, [isRecording, flash, recordingDuration, router, hasCameraPermission, hasMicrophonePermission]);

    const stopRecording = useCallback(async () => {
        if (!camera.current || !isRecording) return;

        try {
            await camera.current.stopRecording();
            setIsRecording(false);
            isHoldingRecord.value = false;

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
    }, [isRecording]);

    const toggleCamera = () => {
        setCameraPosition((prev) => (prev === 'back' ? 'front' : 'back'));
    };

    const toggleFlash = () => {
        setFlash((prev) => (prev === 'off' ? 'on' : 'off'));
    };

    const handleClose = () => {
        router.back();
    };

    const handleAddSound = () => {
        Alert.alert('Add Sound', 'Sound selection coming soon');
    };

    const handleUpload = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
            allowsEditing: true,
            exif: false,
            aspect: [9, 16],
            quality: 1,
            selectionLimit: 1,
            videoMaxDuration: 180
        });
        console.log(result);

        if (result.assets && result.assets.length > 0) {
            router.push({
                pathname: '/private/camera/preview',
                params: { videoPath: result.assets[0].uri }
            });
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

    const missingPermissions = [];
    if (hasCameraPermission === false) {
        missingPermissions.push('Camera');
    }
    if (hasMicrophonePermission === false) {
        missingPermissions.push('Microphone');
    }
    const hasAllPermissions = hasCameraPermission && hasMicrophonePermission;

    if (!hasAllPermissions) {
        const permissionText = missingPermissions.length === 2 
            ? 'Camera and Microphone Access Required'
            : `${missingPermissions[0]} Access Required`;
        
        const descriptionText = missingPermissions.length === 2
            ? 'To record videos with audio, please grant camera and microphone permissions. You can change these in your device settings at any time.'
            : `To record videos with audio, please grant ${missingPermissions[0].toLowerCase()} permission. You can change this in your device settings at any time.`;

        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <View style={styles.permissionContainer}>
                    <View style={styles.topBar}>
                        <PressableHaptics onPress={handleClose} style={styles.topButton}>
                            <Ionicons name="close" size={28} color="#fff" />
                        </PressableHaptics>
                    </View>

                    <View style={styles.permissionContent}>
                        <Ionicons 
                            name={missingPermissions.includes('Camera') ? 'camera-outline' : 'mic-outline'} 
                            size={80} 
                            color="rgba(255, 255, 255, 0.6)" 
                        />
                        <Text style={styles.permissionTitle}>{permissionText}</Text>
                        <Text style={styles.permissionDescription}>
                            {descriptionText}
                        </Text>

                        <TouchableOpacity
                            style={styles.permissionButton}
                            onPress={handleRequestPermission}
                            disabled={isRequestingPermission}
                        >
                            <Text style={styles.permissionButtonText}>
                                {isRequestingPermission ? 'Requesting...' : 'Enable Permissions'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.settingsButton}
                            onPress={() => Linking.openSettings()}
                        >
                            <Text style={styles.settingsButtonText}>Open Settings</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    if (!device) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <View style={styles.permissionContainer}>
                    <View style={styles.topBar}>
                        <PressableHaptics onPress={handleClose} style={styles.topButton}>
                            <Ionicons name="close" size={28} color="#fff" />
                        </PressableHaptics>
                    </View>

                    <View style={styles.permissionContent}>
                        <Ionicons name="camera-outline" size={80} color="rgba(255, 255, 255, 0.6)" />
                        <Text style={styles.permissionTitle}>Camera Not Available</Text>
                        <Text style={styles.permissionDescription}>
                            Unable to access camera device. Please try again or restart the app.
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    const progressWidth = recordingProgress.interpolate({
        inputRange: [0, MAX_DURATION],
        outputRange: ['0%', '100%'],
    });

    const tapRecordGesture = Gesture.Tap()
        .maxDuration(99999999)
        .onBegin(() => {
            'worklet';
            runOnJS(startRecording)();
        })
        .onFinalize((_, success) => {
            'worklet';
            if (success) {
                runOnJS(stopRecording)();
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

    return (
        <GestureHandlerRootView style={styles.container}>
            <StatusBar style="light" />

            <GestureDetector gesture={cameraGestures}>
                <View style={StyleSheet.absoluteFill}>
                    {isFocused && device && hasCameraPermission && hasMicrophonePermission && (
                        <ReanimatedCamera
                            ref={camera}
                            style={StyleSheet.absoluteFill}
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

                <PressableHaptics onPress={handleAddSound} style={styles.addSoundButton}>
                    <Ionicons name="musical-notes" size={20} color="#fff" />
                    <Text style={styles.addSoundText}>Add sound</Text>
                </PressableHaptics>

                <PressableHaptics style={styles.topButton}></PressableHaptics>
            </View>

            <View style={styles.rightControls}>
                <PressableHaptics onPress={toggleCamera} style={styles.topButton}>
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
                {isRecording && (
                    <View style={styles.recordingIndicator}>
                        <View style={styles.recordingDot} />
                        <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
                    </View>
                )}

                <View style={styles.bottomControls}>
                    <TouchableOpacity onPress={handleUpload} style={styles.uploadButton}>
                        <View style={{ justifyContent: 'center', alignItems: 'center', width: 46, height: 46, borderRadius: 10, borderWidth: 2, margin: 5, borderColor: "#fff" }}>
                            <View style={{ backgroundColor: '#fff', width: 38, height: 38, borderRadius: 6 }} />
                        </View>
                        <Text style={styles.bottomButtonText}>Upload</Text>
                    </TouchableOpacity>

                    <GestureDetector gesture={recordButtonGesture}>
                        <Reanimated.View style={styles.recordButtonContainer}>
                            <View style={styles.recordButtonPressable}>
                                <View style={[styles.recordButton, isRecording && styles.recordButtonActive]}>
                                    <View style={[styles.recordButtonInner, isRecording && styles.recordButtonInnerActive]} />
                                </View>
                                {!isRecording && (
                                    <Text style={styles.recordHint}>Press and hold to record a video</Text>
                                )}
                                {isRecording && (
                                    <Text style={styles.recordHint}>Slide up to zoom</Text>
                                )}
                            </View>
                        </Reanimated.View>
                    </GestureDetector>

                    <TouchableOpacity style={styles.effectsButton}>
                    </TouchableOpacity>
                </View>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    permissionContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    permissionContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        gap: 20,
    },
    permissionTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginTop: 20,
    },
    permissionDescription: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    permissionButton: {
        backgroundColor: '#ff0050',
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 20,
        minWidth: 200,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    settingsButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginTop: 8,
    },
    settingsButtonText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    permissionText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 100,
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
    },
    addSoundButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 8,
    },
    addSoundText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
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
        position: 'relative',
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: 40,
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
        marginBottom: 0,
    },
    effectsButton: {
        alignItems: 'center',
        gap: 4,
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
        borderColor: '#ff0050',
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
        backgroundColor: '#ff0050',
    },
    recordHint: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
        maxWidth: 140,
        textAlign: 'center',
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
    uploadButton: {
        alignItems: 'center',
        gap: 4,
        width: 70,
    },
    bottomButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800'
    },
    gradientOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '100%',
    }
});