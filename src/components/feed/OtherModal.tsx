import { ReportModal } from '@/components/ReportModal';
import { useTheme } from '@/contexts/ThemeContext';
import { videoDelete } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Dimensions, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 60;

export default function OtherModal({
    visible,
    item,
    onClose,
    onPlaybackSpeedChange,
    currentPlaybackRate = 1.0,
}) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { colorScheme } = useTheme();
    const [showPlaybackSpeed, setShowPlaybackSpeed] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: videoDelete,
        onSuccess: async () => {
            queryClient.invalidateQueries(['videos', 'forYou']);
            queryClient.invalidateQueries(['videos', 'following']);
            queryClient.invalidateQueries(['profileVideoFeed', item?.account.id, item?.id]);
        },
    });

    if (!item) {
        return null;
    }

    const handleReport = () => {
        setShowReport(true);
    };

    const handleDelete = () => {
        Alert.alert('Confirm Delete', 'Are you sure you want to delete this video?', [
            {
                text: 'Cancel',
                style: 'cancel',
            },

            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteMutation.mutate(item.id),
            },
        ]);
        onClose();
    };

    const handleDownload = async () => {
        // TODO: Implement download functionality
        console.log('Download video:', item.media.src_url);
        onClose();
    };

    const playbackSpeeds = [
        { label: '0.5x', value: 0.5 },
        { label: 'Normal', value: 1.0 },
        { label: '1.5x', value: 1.5 },
        { label: '2.0x', value: 2.0 },
    ];

    const handleSpeedSelect = (speed) => {
        onPlaybackSpeedChange(speed);
        setShowPlaybackSpeed(false);
        onClose();
    };

    const handleCloseReportModal = () => {
        setShowReport(false);
        onClose();
    };

    const handleReportCommunityGuidelines = () => {
        onClose();
        router.push('/private/settings/legal/community');
    };

    const handleEdit = () => {
        onClose();
        router.push(`/private/video/edit/${item.id}`);
    };

    const handleDuet = () => {
        onClose();
        router.push(`/private/video/duet/${item.id}?duetVideoUri=${item.media.src_url}`);
    };

    if (showReport) {
        return (
            <ReportModal
                visible={visible}
                reportType="video"
                item={item}
                onClose={() => handleCloseReportModal()}
                onCommunityGuidelines={() => handleReportCommunityGuidelines()}
            />
        );
    }

    if (showPlaybackSpeed) {
        return (
            <Modal
                visible={visible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowPlaybackSpeed(false)}>
                <View style={tw`flex-1 justify-end`}>
                    <Pressable
                        style={tw`absolute inset-0`}
                        onPress={() => setShowPlaybackSpeed(false)}
                    />
                    <View
                        style={[
                            tw`bg-white dark:bg-black rounded-t-[20px] pt-3`,
                            { paddingBottom: insets.bottom + 20 },
                        ]}>
                        <View
                            style={tw`w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-sm self-center mb-5`}
                        />
                        <Text
                            style={tw`text-lg font-bold text-center mb-6 px-4 text-black dark:text-white`}>
                            Playback Speed
                        </Text>

                        {playbackSpeeds.map((speed, index) => (
                            <TouchableOpacity
                                key={index}
                                style={tw`flex-row items-center py-4 px-5 gap-4 border-b border-gray-100 dark:border-gray-800`}
                                onPress={() => handleSpeedSelect(speed.value)}>
                                <Text
                                    style={tw`text-base flex-1 ${
                                        currentPlaybackRate === speed.value
                                            ? 'text-[#007AFF] font-semibold'
                                            : 'text-black dark:text-white'
                                    }`}>
                                    {speed.label}
                                </Text>
                                {currentPlaybackRate === speed.value && (
                                    <Ionicons name="checkmark" size={24} color="#007AFF" />
                                )}
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity
                            style={tw`mt-3 py-4 items-center border-t border-gray-100 dark:border-gray-800`}
                            onPress={() => setShowPlaybackSpeed(false)}>
                            <Text style={tw`text-base font-semibold text-[#007AFF]`}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    const options = [
        {
            icon: 'film-outline',
            label: 'Playback speed',
            onPress: () => setShowPlaybackSpeed(true),
            show: true,
        },
        {
            icon: 'flag-outline',
            label: 'Report',
            onPress: handleReport,
            show: !item.is_owner,
            danger: true,
        },
        {
            icon: 'trash-outline',
            label: 'Delete',
            onPress: handleDelete,
            show: item.is_owner,
            danger: true,
        },
    ].filter((option) => option.show);

    if (item.permissions.can_download) {
        // options.unshift({
        //     icon: 'download-outline',
        //     label: 'Download',
        //     onPress: handleDownload,
        //     show: true,
        // })
    }

    // if (item.permissions.can_duet) {
    //     options.unshift({
    //         icon: 'duplicate-outline',
    //         label: 'Duet',
    //         onPress: handleDuet,
    //         show: true,
    //     })
    // }

    if (item.is_owner) {
        options.unshift({
            icon: 'create-outline',
            label: 'Edit',
            onPress: handleEdit,
            show: true,
        });
    }

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={tw`flex-1 justify-end`}>
                <Pressable style={tw`absolute inset-0`} onPress={onClose} />

                <View
                    style={[
                        tw`bg-white dark:bg-black rounded-t-[20px] pt-3`,
                        { paddingBottom: insets.bottom + 20 },
                    ]}>
                    <View
                        style={tw`w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-sm self-center mb-5`}
                    />

                    <View style={tw`flex-row justify-around px-4 mb-5`}>
                        {options.map((option, index) => (
                            <TouchableOpacity
                                key={index}
                                style={tw`items-center w-20`}
                                onPress={option.onPress}>
                                <View
                                    style={tw`w-15 h-15 rounded-full bg-gray-100 dark:bg-gray-800 justify-center items-center mb-2`}>
                                    <Ionicons
                                        name={option.icon}
                                        size={24}
                                        color={
                                            option.danger
                                                ? '#FF3B30'
                                                : colorScheme === 'dark'
                                                  ? '#fff'
                                                  : '#000'
                                        }
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
