import { useTheme } from '@/contexts/ThemeContext';
import React, { useEffect } from 'react';
import { Dimensions, Modal, Pressable, Share, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import tw from 'twrnc';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 60;

const BottomSheet = ({ visible, onClose, children }) => {
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();

    const translateY = useSharedValue(0);
    const closeTranslateY = 600; // I didn't find a way to get the View height, fix this if possible !

    const swipeStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
        };
    });

    const gesture = Gesture.Pan()
        .onUpdate((event) => {
            translateY.value = Math.max(Math.min(event.translationY, closeTranslateY), 0);
        })
        .onEnd((event) => {
            if (event.velocityY > 100) {
                translateY.value = withTiming(closeTranslateY, { duration: 150 }, () => {
                    // Closes after the animation, scheduleOnRN necessary or else it crashes the app
                    scheduleOnRN(onClose);
                });
            } else {
                translateY.value = withTiming(0, { duration: 150 });
            }
        });

    // Reset ShareModal position at each opening
    useEffect(() => {
        translateY.value = 0;
    });

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <GestureDetector gesture={gesture}>
                    <Animated.View style={[tw`flex-1 justify-end`, swipeStyle]}>
                        <Pressable style={tw`absolute inset-0`} onPress={onClose} />
                        <View
                            style={[
                                tw`bg-white dark:bg-gray-900 rounded-t-[20px] pt-3`,
                                { paddingBottom: insets.bottom },
                            ]}>
                            <View
                                style={tw`w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-sm self-center mb-5`}
                            />
                            {children}
                        </View>
                    </Animated.View>
                </GestureDetector>
            </GestureHandlerRootView>
        </Modal>
    );
}

export default BottomSheet;
