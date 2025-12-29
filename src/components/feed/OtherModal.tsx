import { ReportModal } from '@/components/ReportModal';
import { videoDelete } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 60;


export default function OtherModal({ visible, item, onClose, onPlaybackSpeedChange, currentPlaybackRate = 1.0 }) {
    const insets = useSafeAreaInsets();
    const router = useRouter()
    const [showPlaybackSpeed, setShowPlaybackSpeed] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: videoDelete,
        onSuccess: async() => {
            queryClient.invalidateQueries(['videos', 'forYou']);
            queryClient.invalidateQueries(['videos', 'following']);
            queryClient.invalidateQueries(['profileVideoFeed', item?.account.id, item?.id])
        }
    })

    if (!item) {
        return null;
    } 

    const handleReport = () => {
        setShowReport(true)
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
        setShowReport(false)
        onClose()
    }

    const handleReportCommunityGuidelines = () => {
        onClose()
        router.push('/private/settings/legal/community')
    }

    const handleEdit = () => {
        onClose()
        router.push(`/private/video/edit/${item.id}`)
    }


    const handleDuet = () => {
        onClose()
        router.push(`/private/video/duet/${item.id}?duetVideoUri=${item.media.src_url}`)
    }

    if (showReport) {
        return (
            <ReportModal
                visible={visible}
                reportType="video"
                item={item}
                onClose={() => handleCloseReportModal()}
                onCommunityGuidelines={() => handleReportCommunityGuidelines()}
            />
        )
    }

    if (showPlaybackSpeed) {
        return (
            <Modal
                visible={visible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowPlaybackSpeed(false)}
            >
                <View style={styles.modalContainer}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setShowPlaybackSpeed(false)} />
                    <View style={[styles.actionModalContent, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.actionModalHandle} />
                        <Text style={styles.actionModalTitle}>Playback Speed</Text>

                        {playbackSpeeds.map((speed, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.actionModalOption}
                                onPress={() => handleSpeedSelect(speed.value)}
                            >
                                <Text style={[
                                    styles.actionModalOptionText,
                                    currentPlaybackRate === speed.value && styles.actionModalOptionTextActive
                                ]}>
                                    {speed.label}
                                </Text>
                                {currentPlaybackRate === speed.value && (
                                    <Ionicons name="checkmark" size={24} color="#007AFF" />
                                )}
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setShowPlaybackSpeed(false)}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
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
    ].filter(option => option.show);

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
        })
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <Pressable style={styles.modalBackdrop} onPress={onClose} />

                <View style={[styles.actionModalContent, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.actionModalHandle} />

                    <View style={styles.shareOptionsContainer}>
                        {options.map((option, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.shareOption}
                                onPress={option.onPress}
                            >
                                <View style={styles.shareIconContainer}>

                                    <Ionicons
                                        name={option.icon}
                                        size={24}
                                        color={option.danger ? '#FF3B30' : '#000'}
                                    />
                                </View>
                                <Text style={[
                                    styles.shareOptionLabel,
                                ]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    actionModalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 12,
    },
    actionModalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#DDD',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    actionModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    shareOptionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    shareOption: {
        alignItems: 'center',
        width: 80,
    },
    shareIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    shareOptionLabel: {
        fontSize: 12,
        color: '#000',
        textAlign: 'center',
    },
    actionModalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        gap: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    actionModalOptionText: {
        fontSize: 16,
        color: '#000',
        flex: 1,
    },
    actionModalOptionTextActive: {
        color: '#007AFF',
        fontWeight: '600',
    },
    cancelButton: {
        marginTop: 12,
        paddingVertical: 16,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
    }
});