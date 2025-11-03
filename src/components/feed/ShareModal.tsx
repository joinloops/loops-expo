import { shareContent } from '@/utils/sharer';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Dimensions,
    Modal,
    Pressable,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    parentId?: string
}

type CommentDeletePayload = {
    videoId: string;
    commentId: string;
}

type CommentReplyDeletePayload = {
    videoId: string; 
    parentId: string;
    commentId: string;
}

type CommentLikePayload = {
    likeState: string; 
    videoId: string; 
    commentId: string; 
}

type CommentReplyLikePayload = {
    likeState: string;
    videoId: string;
    commentId: string;
    parentId: string;
}

export default function ShareModal({ 
    visible, 
    item, 
    onClose 
}) {
    const insets = useSafeAreaInsets();

    if (!item) return null;

    const handleRepost = async () => {
        console.log('Repost video:', item.id);
        onClose();
    };

    const handleNativeShare = async () => {
        try {
            const result = await shareContent({
                message: `Check out this video by @${item.account.username}!`,
                url: item?.url
            })

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
                    <Text style={styles.actionModalTitle}>Share to</Text>

                    <View style={styles.shareOptionsContainer}>
                        {shareOptions.map((option, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.shareOption}
                                onPress={option.onPress}
                            >
                                <View style={styles.shareIconContainer}>
                                    <Ionicons name={option.icon} size={28} color="#000" />
                                </View>
                                <Text style={styles.shareOptionLabel}>{option.label}</Text>
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
    shareOptionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 16,
        marginBottom: 20,
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