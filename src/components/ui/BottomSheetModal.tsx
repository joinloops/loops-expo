import { StackText } from '@/components/ui/Stack';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ENTER = { duration: 260, easing: Easing.out(Easing.cubic) };
const EXIT = { duration: 200, easing: Easing.in(Easing.cubic) };

type Props = {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    cancelLabel?: string | null;
    containerStyle?: StyleProp<ViewStyle>;
    cancelSpacing?: boolean;
};

export function BottomSheetModal({
    visible,
    onClose,
    children,
    cancelLabel = 'Cancel',
    cancelSpacing = true,
    containerStyle,
}: Props) {
    const insets = useSafeAreaInsets();

    const [rendered, setRendered] = useState(false);
    const progress = useSharedValue(0);
    const sheetHeight = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            setRendered(true);
            progress.value = withTiming(1, ENTER);
        } else {
            progress.value = withTiming(0, EXIT, (finished) => {
                if (finished) runOnJS(setRendered)(false);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const scrimStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
    }));

    const sheetStyle = useAnimatedStyle(() => ({
        opacity: sheetHeight.value === 0 ? 0 : 1,
        transform: [{ translateY: (1 - progress.value) * sheetHeight.value }],
    }));

    return (
        <Modal
            visible={rendered}
            animationType="none"
            transparent
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={onClose}>
            <View style={tw`flex-1 justify-end`}>
                <AnimatedPressable
                    style={[tw`absolute inset-0 bg-black/50`, scrimStyle]}
                    onPress={onClose}
                />

                <Animated.View
                    onLayout={(e) => {
                        const h = e.nativeEvent.layout.height;
                        if (h > 0 && sheetHeight.value !== h) sheetHeight.value = h;
                    }}
                    style={[
                        tw`bg-white dark:bg-gray-900 rounded-t-[20px] pt-3 border-t border-l border-r border-gray-200 dark:border-gray-700`,
                        { paddingBottom: insets.bottom + 20 },
                        Platform.OS === 'ios'
                            ? {
                                shadowColor: '#000',
                                shadowOpacity: 0.3,
                                shadowRadius: 16,
                                shadowOffset: { width: 0, height: -4 },
                            }
                            : { elevation: 24 },
                        sheetStyle,
                    ]}>
                    <View
                        style={tw`w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-sm self-center mb-3`}
                    />

                    {children}

                    {cancelLabel && (
                        <TouchableOpacity
                            style={[
                                tw`py-4 items-center border-t border-gray-100 dark:border-gray-800`,
                                cancelSpacing && tw`mt-2`,
                            ]}
                            onPress={onClose}>
                            <StackText
                                fontSize="$4"
                                fontWeight="semibold"
                                textColor="text-[#007AFF]">
                                {cancelLabel}
                            </StackText>
                        </TouchableOpacity>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}