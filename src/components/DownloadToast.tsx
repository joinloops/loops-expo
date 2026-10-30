import { useTheme } from '@/contexts/ThemeContext';
import { type VideoDownloadStatus } from '@/hooks/useVideoDownload';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

type DownloadToastProps = {
    status: VideoDownloadStatus;
    progress: number | null;
    error?: string | null;
    onCancel?: () => void;
    bottomOffset?: number;
};

export default function DownloadToast({
    status,
    progress,
    error,
    onCancel,
    bottomOffset = 0,
}: DownloadToastProps) {
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const anim = useRef(new Animated.Value(0)).current;
    const visible = status !== 'idle';

    useEffect(() => {
        Animated.timing(anim, {
            toValue: visible ? 1 : 0,
            duration: 180,
            useNativeDriver: true,
        }).start();
    }, [visible, anim]);

    if (!visible) return null;

    const title = (() => {
        switch (status) {
            case 'downloading':
                return progress != null
                    ? `Downloading ${Math.round(progress * 100)}%`
                    : 'Downloading';
            case 'saving':
                return 'Saving to Photos';
            case 'saved':
                return 'Saved to Photos';
            default:
                return error ?? 'Something went wrong';
        }
    })();

    return (
        <Animated.View
            pointerEvents="box-none"
            style={[
                tw`absolute left-4 right-4 z-50`,
                {
                    bottom: insets.bottom + bottomOffset,
                    opacity: anim,
                    transform: [
                        {
                            translateY: anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [16, 0],
                            }),
                        },
                    ],
                },
            ]}>
            <View
                style={[
                    tw`flex-row items-center bg-white dark:bg-gray-900 rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-800 shadow-lg`,
                    { elevation: 8 },
                ]}>
                {status === 'downloading' || status === 'saving' ? (
                    <ActivityIndicator size="small" color="#F02C56" />
                ) : status === 'saved' ? (
                    <View style={tw`w-6 h-6 rounded-full bg-green-500 justify-center items-center`}>
                        <Ionicons name="checkmark" size={15} color="#fff" />
                    </View>
                ) : (
                    <Ionicons name="alert-circle" size={24} color="#f53333" />
                )}

                <View style={tw`flex-1 ml-3`}>
                    <Text
                        style={tw`text-sm font-semibold text-black dark:text-white`}
                        numberOfLines={2}>
                        {title}
                    </Text>
                    {status === 'downloading' && (
                        <View
                            style={tw`h-1 bg-gray-100 dark:bg-gray-800 rounded-full mt-2 overflow-hidden`}>
                            <View
                                style={[
                                    tw`h-1 bg-[#F02C56] rounded-full`,
                                    {
                                        width: `${Math.max(4, Math.round((progress ?? 0) * 100))}%`,
                                    },
                                ]}
                            />
                        </View>
                    )}
                </View>

                {status === 'downloading' && onCancel && (
                    <TouchableOpacity
                        style={tw`ml-3 w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 justify-center items-center`}
                        onPress={onCancel}
                        activeOpacity={0.7}>
                        <Ionicons name="close" size={16} color={isDark ? '#fff' : '#000'} />
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
}