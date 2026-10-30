import { StackText } from '@/components/ui/Stack';
import type { DmMediaEntity } from '@/types/dm';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useEffect } from 'react';
import { Modal, Pressable, useWindowDimensions, View } from 'react-native';
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const RUBBER_BAND_MIN = 0.7;
const DOUBLE_TAP_SCALE = 2.5;
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 900;
const SPRING = { damping: 20, stiffness: 220, mass: 0.6 };

interface ViewerMedia {
    url: string;
    width?: number | null;
    height?: number | null;
    description?: string | null;
}

interface ImageViewerProps {
    visible: boolean;
    media?: DmMediaEntity | null;
    onClose: () => void;
}

const clamp = (value: number, min: number, max: number) => {
    'worklet';
    return Math.min(Math.max(value, min), max);
};

export const ImageViewer = ({ visible, media, onClose }: ImageViewerProps) => {
    const insets = useSafeAreaInsets();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    const scale = useSharedValue(1);
    const lastScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const backdrop = useSharedValue(1);

    const aspect =
        media?.width && media?.height ? media.width / media.height : 1;
    const fitsByWidth = screenWidth / screenHeight <= aspect;
    const displayWidth = fitsByWidth ? screenWidth : screenHeight * aspect;
    const displayHeight = fitsByWidth ? screenWidth / aspect : screenHeight;

    useEffect(() => {
        if (!visible) return;
        scale.value = 1;
        lastScale.value = 1;
        translateX.value = 0;
        translateY.value = 0;
        backdrop.value = 1;
    }, [visible, backdrop, lastScale, scale, translateX, translateY]);

    const settle = (nextScale: number) => {
        'worklet';
        const maxX = Math.max(0, (displayWidth * nextScale - screenWidth) / 2);
        const maxY = Math.max(0, (displayHeight * nextScale - screenHeight) / 2);
        translateX.value = withSpring(
            clamp(translateX.value, -maxX, maxX),
            SPRING,
        );
        translateY.value = withSpring(
            clamp(translateY.value, -maxY, maxY),
            SPRING,
        );
    };

    const pinch = Gesture.Pinch()
        .onStart(() => {
            lastScale.value = 1;
        })
        .onUpdate((e) => {
            const factor = e.scale / lastScale.value;
            lastScale.value = e.scale;

            const next = clamp(scale.value * factor, RUBBER_BAND_MIN, MAX_SCALE);
            const ratio = next / scale.value;
            const fx = e.focalX - screenWidth / 2;
            const fy = e.focalY - screenHeight / 2;

            translateX.value = fx - (fx - translateX.value) * ratio;
            translateY.value = fy - (fy - translateY.value) * ratio;
            scale.value = next;
        })
        .onEnd(() => {
            if (scale.value < MIN_SCALE) {
                scale.value = withSpring(MIN_SCALE, SPRING);
                translateX.value = withSpring(0, SPRING);
                translateY.value = withSpring(0, SPRING);
                return;
            }
            settle(scale.value);
        });

    const pan = Gesture.Pan()
        .averageTouches(true)
        .onChange((e) => {
            if (scale.value > MIN_SCALE) {
                translateX.value += e.changeX;
            }
            translateY.value += e.changeY;

            if (scale.value <= MIN_SCALE) {
                backdrop.value = clamp(
                    1 - Math.abs(translateY.value) / (screenHeight * 0.5),
                    0.15,
                    1,
                );
            }
        })
        .onEnd((e) => {
            if (scale.value > MIN_SCALE) {
                settle(scale.value);
                return;
            }

            const shouldDismiss =
                Math.abs(translateY.value) > DISMISS_DISTANCE ||
                Math.abs(e.velocityY) > DISMISS_VELOCITY;

            if (shouldDismiss) {
                backdrop.value = withTiming(0, { duration: 140 });
                translateY.value = withTiming(
                    translateY.value > 0 ? screenHeight : -screenHeight,
                    { duration: 180 },
                    (finished) => {
                        if (finished) runOnJS(onClose)();
                    },
                );
                return;
            }

            translateX.value = withSpring(0, SPRING);
            translateY.value = withSpring(0, SPRING);
            backdrop.value = withTiming(1, { duration: 140 });
        });

    const doubleTap = Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(250)
        .onEnd((e) => {
            if (scale.value > MIN_SCALE) {
                scale.value = withSpring(MIN_SCALE, SPRING);
                translateX.value = withSpring(0, SPRING);
                translateY.value = withSpring(0, SPRING);
                return;
            }

            const fx = e.x - screenWidth / 2;
            const fy = e.y - screenHeight / 2;
            const maxX = Math.max(
                0,
                (displayWidth * DOUBLE_TAP_SCALE - screenWidth) / 2,
            );
            const maxY = Math.max(
                0,
                (displayHeight * DOUBLE_TAP_SCALE - screenHeight) / 2,
            );

            scale.value = withSpring(DOUBLE_TAP_SCALE, SPRING);
            translateX.value = withSpring(
                clamp(-fx * (DOUBLE_TAP_SCALE - 1), -maxX, maxX),
                SPRING,
            );
            translateY.value = withSpring(
                clamp(-fy * (DOUBLE_TAP_SCALE - 1), -maxY, maxY),
                SPRING,
            );
        });

    const singleTap = Gesture.Tap()
        .numberOfTaps(1)
        .onEnd(() => {
            if (scale.value <= MIN_SCALE) {
                runOnJS(onClose)();
            }
        });

    const gesture = Gesture.Simultaneous(
        pan,
        pinch,
        Gesture.Exclusive(doubleTap, singleTap),
    );

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdrop.value,
    }));

    const chromeStyle = useAnimatedStyle(() => ({
        opacity: backdrop.value,
    }));

    const imageStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={onClose}>
            <GestureHandlerRootView style={tw`flex-1`}>
                <Animated.View
                    style={[tw`absolute inset-0 bg-black`, backdropStyle]}
                    pointerEvents="none"
                />

                <GestureDetector gesture={gesture}>
                    <View style={tw`flex-1 items-center justify-center`}>
                        {!!media?.url && (
                            <Animated.View
                                style={[
                                    { width: displayWidth, height: displayHeight },
                                    imageStyle,
                                ]}>
                                <ExpoImage
                                    source={{ uri: media.url }}
                                    placeholder={media.blurhash ? { blurhash: media.blurhash } : undefined}
                                    style={tw`w-full h-full`}
                                    contentFit="contain"
                                    cachePolicy="none"
                                    transition={120}
                                    accessibilityLabel={media.description ?? undefined}
                                />
                            </Animated.View>
                        )}
                    </View>
                </GestureDetector>

                <Animated.View
                    style={[
                        tw`absolute right-4`,
                        { top: insets.top + 8 },
                        chromeStyle,
                    ]}>
                    <Pressable
                        onPress={onClose}
                        hitSlop={12}
                        style={({ pressed }) => [
                            tw`w-9 h-9 rounded-full bg-black/50 items-center justify-center`,
                            pressed && tw`opacity-60`,
                        ]}>
                        <Ionicons name="close" size={22} color="#fff" />
                    </Pressable>
                </Animated.View>

                {!!media?.description && (
                    <Animated.View
                        style={[
                            tw`absolute left-0 right-0 px-6`,
                            { bottom: insets.bottom + 20 },
                            chromeStyle,
                        ]}
                        pointerEvents="none">
                        <StackText
                            fontSize="$2"
                            textColor="text-white"
                            numberOfLines={3}
                            style={tw`text-center`}>
                            {media.description}
                        </StackText>
                    </Animated.View>
                )}
            </GestureHandlerRootView>
        </Modal>
    );
};