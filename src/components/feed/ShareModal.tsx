import { useTheme } from '@/contexts/ThemeContext';
import { shareContent } from '@/utils/sharer';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Modal, Pressable, Share, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 60;

type ReportPayload = {
    id: string;
    key: string;
    type: string;
    comment: string;
};

type CommentPayload = {
    id: string;
    commentText: string;
    parentId?: string;
};

type CommentDeletePayload = {
    videoId: string;
    commentId: string;
};

type CommentReplyDeletePayload = {
    videoId: string;
    parentId: string;
    commentId: string;
};

type CommentLikePayload = {
    likeState: string;
    videoId: string;
    commentId: string;
};

type CommentReplyLikePayload = {
    likeState: string;
    videoId: string;
    commentId: string;
    parentId: string;
};

export default function ShareModal({ visible, item, onClose }) {
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();

    if (!item) return null;

    const handleRepost = async () => {
        console.log('Repost video:', item.id);
        onClose();
    };

    const handleNativeShare = async () => {
        try {
            const result = await shareContent({
                message: `Check out this video by @${item.account.username}!`,
                url: item?.url,
            });

            if (result.action === Share.sharedAction) {
                onClose();
            }
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const shareOptions = [
        // {
        //   icon: 'repeat',
        //   label: 'Repost',
        //   onPress: handleRepost,
        // },
        {
            icon: 'share-outline',
            label: 'Other',
            onPress: handleNativeShare,
        },
    ];

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={tw`flex-1 justify-end`}>
                <Pressable style={tw`absolute inset-0`} onPress={onClose} />
                <View
                    style={[
                        tw`bg-white dark:bg-gray-900 rounded-t-[20px] pt-3`,
                        { paddingBottom: insets.bottom + 20 },
                    ]}>
                    <View
                        style={tw`w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-sm self-center mb-5`}
                    />
                    <Text
                        style={tw`text-lg font-bold text-center mb-6 px-4 text-black dark:text-white`}>
                        Share to
                    </Text>

                    <View style={tw`flex-row justify-around px-4 mb-5`}>
                        {shareOptions.map((option, index) => (
                            <TouchableOpacity
                                key={index}
                                style={tw`items-center w-20`}
                                onPress={option.onPress}>
                                <View
                                    style={tw`w-15 h-15 rounded-full bg-gray-100 dark:bg-gray-800 justify-center items-center mb-2`}>
                                    <Ionicons
                                        name={option.icon}
                                        size={28}
                                        color={colorScheme === 'dark' ? '#fff' : '#000'}
                                    />
                                </View>
                                <Text style={tw`text-xs text-black dark:text-white text-center`}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={tw`mt-3 py-4 items-center border-t border-gray-100 dark:border-gray-800`}
                        onPress={onClose}>
                        <Text style={tw`text-base font-semibold text-[#007AFF]`}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
