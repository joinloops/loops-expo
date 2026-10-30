import { GroupAvatar } from '@/components/dm/GroupAvatar';
import { useTheme } from '@/contexts/ThemeContext';
import { useDmSuggestedRecipientsWithGroups, type DmRecipient } from '@/hooks/useDmSuggestedRecipients';
import { useInstalledShareApps } from '@/hooks/useInstalledShareApps';
import type { DmParticipant } from '@/types/dm';
import { dmSendMessage, getOrCreateDmConversation, recordForYouFeedFeedback, videoDelete } from '@/utils/requests';
import { shareContent } from '@/utils/sharer';
import { type ShareTarget } from '@/utils/shareTargets';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Share,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { ReportModal } from '../ReportModal';

const REPOST_ENABLED = false;
const SHARE_TEXT = 'Check out this video on Loops!';

const PLAYBACK_SPEEDS = [
    { label: '0.5x', value: 0.5 },
    { label: 'Normal', value: 1.0 },
    { label: '1.5x', value: 1.5 },
    { label: '2.0x', value: 2.0 },
];

type SheetView = 'share' | 'playback';

type SuggestedTarget = DmRecipient & {
    kind?: 'account' | 'group';
    conversation_id?: string;
    avatars?: string[];
    member_count?: number;
};

type ShareItemPermissions = {
    can_comment: boolean;
    can_download: boolean;
    can_duet: boolean;
    can_stitch: boolean;
    can_embed: boolean;
};

type ShareItem = {
    id: string;
    url: string;
    is_owner: boolean;
    permissions: ShareItemPermissions;
};

type ShareModalProps = {
    visible: boolean;
    item: ShareItem | null;
    isForYou: boolean;
    onClose: () => void;
    onEdit?: () => void;
    onReport?: () => void;
    onNotInterested?: () => void;
    onDownload?: () => void;
    onPlaybackSpeedChange?: (speed: number) => void;
    currentPlaybackRate?: number;
};

const groupFacepile = (recipient: SuggestedTarget): DmParticipant[] => {
    const count = Math.max(
        (recipient.member_count ?? 1) - 1,
        recipient.avatars?.length ?? 0,
        1,
    );
    return Array.from({ length: count }, (_, index) => ({
        id: `${recipient.id}-${index}`,
        username: '',
        avatar: recipient.avatars?.[index] ?? null,
    })) as DmParticipant[];
};

export default function ShareModal({
    visible,
    item,
    onEdit,
    isForYou,
    onClose,
    onReport,
    onNotInterested,
    onDownload,
    onPlaybackSpeedChange,
    currentPlaybackRate = 1.0,
}: ShareModalProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const queryClient = useQueryClient();

    const [activeView, setActiveView] = useState<SheetView>('share');
    const [showReport, setShowReport] = useState(false);
    const [selectedRecipient, setSelectedRecipient] = useState<SuggestedTarget | null>(null);
    const [message, setMessage] = useState('');
    const [sentIds, setSentIds] = useState<string[]>([]);
    const [copied, setCopied] = useState(false);
    const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const targets = useInstalledShareApps();
    const { data: recipients, isLoading: recipientsLoading } = useDmSuggestedRecipientsWithGroups(
        visible && !!item,
    );
    const suggestions = (recipients ?? []) as SuggestedTarget[];

    const sendMutation = useMutation({
        mutationFn: async ({ recipient, body }: { recipient: SuggestedTarget; body: string }) => {
            const conversationId =
                recipient.kind === 'group'
                    ? recipient.conversation_id
                    : (await getOrCreateDmConversation(recipient.id)).data?.id;
            return dmSendMessage({
                conversation_id: conversationId,
                body,
                type: 'loop_share',
                video_id: item!.id,
            });
        },
        onSuccess: (_data, variables) => {
            setSentIds((prev) => [...prev, variables.recipient.id]);
            setSelectedRecipient(null);
            setMessage('');
        },
    });

    const feedbackMutation = useMutation({
        mutationFn: async ({ feedbackType }: { feedbackType: string }) => {
            return recordForYouFeedFeedback(item?.id, feedbackType)
        }
    })

    const deleteMutation = useMutation({
        mutationFn: videoDelete,
        onSuccess: async () => {
            queryClient.invalidateQueries(['videos', 'forYou']);
            queryClient.invalidateQueries(['videos', 'following']);
            queryClient.invalidateQueries(['profileVideoFeed', item?.account.id, item?.id]);
        },
    });

    useEffect(() => {
        if (!visible) {
            setActiveView('share');
            setShowReport(false);
            setSelectedRecipient(null);
            setMessage('');
            setSentIds([]);
            setCopied(false);
        }
    }, [visible]);

    useEffect(() => {
        return () => {
            if (copiedTimer.current) clearTimeout(copiedTimer.current);
        };
    }, []);

    if (!item) return null;

    if (showReport) {
        return (
            <ReportModal
                visible={visible}
                reportType="video"
                item={item}
                onClose={() => {
                    setShowReport(false);
                    onClose();
                }}
                onCommunityGuidelines={() => {
                    onClose();
                    router.push('/private/settings/legal/community');
                }}
            />
        );
    }

    const handleRecipientPress = (recipient: SuggestedTarget) => {
        if (sendMutation.isPending) return;
        setSelectedRecipient((prev) => (prev?.id === recipient.id ? null : recipient));
    };

    const handleSend = () => {
        if (!selectedRecipient || sendMutation.isPending) return;
        sendMutation.mutate({ recipient: selectedRecipient, body: message.trim() });
    };

    const handleRepost = () => {
        onClose();
    };

    const handleSpeedSelect = (speed: number) => {
        onPlaybackSpeedChange?.(speed);
        onClose();
    };

    const handleCopyLink = async () => {
        await Clipboard.setStringAsync(item.url);
        setCopied(true);
        if (copiedTimer.current) clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    };

    const handleNativeShare = async () => {
        try {
            const result = await shareContent({
                message: '',
                url: item.url,
            });
            if (result.action === Share.sharedAction) {
                onClose();
            }
        } catch (error) {
            console.error('Share error:', error);
        }
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

    const handleTargetPress = (target: ShareTarget) => {
        if (target.id === 'copy-link') {
            handleCopyLink();
            return;
        }
        if (target.id === 'other') {
            handleNativeShare();
            return;
        }
        if (target.buildUrl) {
            Linking.openURL(target.buildUrl(item.url, SHARE_TEXT)).catch(() => { });
            onClose();
        }
    };

    const handleNotInterested = async () => {
        feedbackMutation.mutate({ feedbackType: 'not_interested' });
        onClose();
    }

    const handleInterested = async () => {
        feedbackMutation.mutate({ feedbackType: 'like' });
        onClose();
    }

    const handleDuet = async () => {
        onClose();
        router.push(`/private/video/duet/${item.id}?duetVideoUri=${item.media.src_url}`)
    }

    const systemActions = [
        {
            icon: 'create-outline',
            label: 'Edit',
            visible: item.is_owner,
            danger: false,
            onPress: () => {
                onEdit?.();
                onClose();
            },
        },
        {
            icon: 'flag-outline',
            label: 'Report',
            visible: !item.is_owner,
            danger: false,
            onPress: () => {
                setShowReport(true);
            },
        },
        {
            icon: 'heart-outline',
            label: 'Interested',
            visible: !item.is_owner && isForYou,
            danger: false,
            onPress: () => {
                handleInterested?.();
                onClose();
            },
        },
        {
            icon: 'heart-dislike-outline',
            label: 'Not interested',
            visible: !item.is_owner && isForYou,
            danger: false,
            onPress: () => {
                handleNotInterested?.();
                onClose();
            },
        },
        {
            icon: 'speedometer-outline',
            label: 'Playback',
            visible: true,
            danger: false,
            onPress: () => {
                setActiveView('playback');
            },
        },
        {
            icon: 'download-outline',
            label: 'Download',
            visible: item.is_owner || item.permissions.can_download,
            danger: false,
            onPress: () => {
                onDownload?.();
                onClose();
            },
        },
        {
            icon: 'people-outline',
            label: 'Duet',
            visible: false,
            danger: false,
            onPress: () => {
                handleDuet();
            },
        },
        {
            icon: 'duplicate-outline',
            label: 'Stitch',
            visible: false,
            danger: false,
            onPress: () => {
                onClose();
            },
        },
        {
            icon: 'trash-outline',
            label: 'Delete',
            visible: item.is_owner,
            danger: true,
            onPress: () => {
                handleDelete();
            },
        },
    ].filter((action) => action.visible);

    const renderTargetIcon = (target: ShareTarget) => {
        const color = target.bgColor ? '#fff' : isDark ? '#fff' : '#000';
        if (target.id === 'copy-link' && copied) {
            return <Ionicons name="checkmark" size={26} color={color} />;
        }
        if (target.iconFamily === 'fa6') {
            return <FontAwesome6 name={target.icon} size={24} color={color} />;
        }
        return <Ionicons name={target.icon as any} size={26} color={color} />;
    };

    const renderRecipient = ({ item: recipient }: { item: SuggestedTarget }) => {
        const isSelected = selectedRecipient?.id === recipient.id;
        const isSent = sentIds.includes(recipient.id);
        const isGroup = recipient.kind === 'group';
        return (
            <TouchableOpacity
                style={tw`items-center w-18 mr-2`}
                onPress={() => handleRecipientPress(recipient)}
                activeOpacity={0.7}>
                <View
                    style={tw.style(
                        `rounded-full p-0.5`,
                        isSelected ? `border-2 border-[#F02C56]` : `border-2 border-transparent`,
                    )}>
                    {isGroup ? (
                        <GroupAvatar participants={groupFacepile(recipient)} size={56} />
                    ) : (
                        <Image
                            source={{ uri: recipient.avatar }}
                            style={tw`w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-800`}
                        />
                    )}
                    {isSent && (
                        <View
                            style={tw`absolute bottom-0 right-0 w-5 h-5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900 justify-center items-center`}>
                            <Ionicons name="checkmark" size={12} color="#fff" />
                        </View>
                    )}
                </View>
                <Text
                    style={tw`text-xs text-black dark:text-white text-center mt-1`}
                    numberOfLines={2}>
                    {recipient.name || recipient.username}
                </Text>
            </TouchableOpacity>
        );
    };

    const showRecipients = recipientsLoading || suggestions.length > 0;

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={tw`flex-1 justify-end`}>
                <Pressable style={tw`absolute inset-0`} onPress={onClose} />
                <View
                    style={[
                        tw`bg-white dark:bg-gray-900 rounded-t-[20px] pt-3`,
                        { paddingBottom: insets.bottom + 12 },
                    ]}>
                    <View
                        style={tw`w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-sm self-center mb-4`}
                    />

                    {activeView === 'playback' ? (
                        <>
                            <View style={tw`flex-row items-center justify-center mb-5 px-4`}>
                                <TouchableOpacity
                                    style={tw`absolute left-4 w-8 h-8 justify-center items-center`}
                                    onPress={() => setActiveView('share')}>
                                    <Ionicons
                                        name="chevron-back"
                                        size={24}
                                        color={isDark ? '#fff' : '#000'}
                                    />
                                </TouchableOpacity>
                                <Text style={tw`text-lg font-bold text-black dark:text-white`}>
                                    Playback speed
                                </Text>
                                <TouchableOpacity
                                    style={tw`absolute right-4 w-8 h-8 justify-center items-center`}
                                    onPress={onClose}>
                                    <Ionicons
                                        name="close"
                                        size={26}
                                        color={isDark ? '#fff' : '#000'}
                                    />
                                </TouchableOpacity>
                            </View>

                            <View
                                style={tw`mx-4 mb-4 flex-row bg-gray-100 dark:bg-gray-800 rounded-full p-1`}>
                                {PLAYBACK_SPEEDS.map((speed) => {
                                    const isActive = currentPlaybackRate === speed.value;
                                    return (
                                        <TouchableOpacity
                                            key={speed.value}
                                            style={tw.style(
                                                `flex-1 py-2.5 rounded-full items-center`,
                                                isActive && `bg-white dark:bg-gray-600`,
                                            )}
                                            onPress={() => handleSpeedSelect(speed.value)}
                                            activeOpacity={0.7}>
                                            <Text
                                                style={tw.style(
                                                    `text-sm`,
                                                    isActive
                                                        ? `font-semibold text-black dark:text-white`
                                                        : `text-gray-500 dark:text-gray-400`,
                                                )}>
                                                {speed.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <TouchableOpacity
                                style={tw`py-4 items-center border-t border-gray-100 dark:border-gray-800`}
                                onPress={() => setActiveView('share')}>
                                <Text style={tw`text-base font-semibold text-[#007AFF]`}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <View style={tw`flex-row items-center justify-center mb-4 px-4`}>
                                <Text style={tw`text-lg font-bold text-black dark:text-white`}>
                                    Send to
                                </Text>
                                <TouchableOpacity
                                    style={tw`absolute right-4 w-8 h-8 justify-center items-center`}
                                    onPress={onClose}>
                                    <Ionicons
                                        name="close"
                                        size={26}
                                        color={isDark ? '#fff' : '#000'}
                                    />
                                </TouchableOpacity>
                            </View>

                            {showRecipients && (
                                <View
                                    style={tw`border-b border-gray-100 dark:border-gray-800 pb-4 mb-4`}>
                                    {recipientsLoading ? (
                                        <View style={tw`h-20 justify-center items-center`}>
                                            <ActivityIndicator />
                                        </View>
                                    ) : (
                                        <FlatList
                                            horizontal
                                            data={suggestions}
                                            keyExtractor={(r) => r.id}
                                            renderItem={renderRecipient}
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={tw`px-4`}
                                        />
                                    )}
                                    {selectedRecipient && (
                                        <View style={tw`flex-row items-center px-4 mt-3`}>
                                            <TextInput
                                                style={tw`flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2.5 text-sm text-black dark:text-white mr-2`}
                                                placeholder="Add a message"
                                                placeholderTextColor={
                                                    isDark ? '#9CA3AF' : '#6B7280'
                                                }
                                                value={message}
                                                onChangeText={setMessage}
                                                maxLength={500}
                                                editable={!sendMutation.isPending}
                                            />
                                            <TouchableOpacity
                                                style={tw.style(
                                                    `bg-[#F02C56] rounded-full px-5 py-2.5`,
                                                    sendMutation.isPending && `opacity-50`,
                                                )}
                                                onPress={handleSend}
                                                disabled={sendMutation.isPending}>
                                                {sendMutation.isPending ? (
                                                    <ActivityIndicator size="small" color="#fff" />
                                                ) : (
                                                    <Text
                                                        style={tw`text-white text-sm font-semibold`}>
                                                        Send
                                                    </Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            )}

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={tw`px-4 pb-4`}>
                                {REPOST_ENABLED && (
                                    <TouchableOpacity
                                        style={tw`items-center w-18 mr-2`}
                                        onPress={handleRepost}>
                                        <View
                                            style={tw`w-14 h-14 rounded-full bg-[#FBBF24] justify-center items-center mb-1.5`}>
                                            <Ionicons name="repeat" size={28} color="#fff" />
                                        </View>
                                        <Text
                                            style={tw`text-xs text-black dark:text-white text-center`}
                                            numberOfLines={2}>
                                            Repost
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                {targets.map((target) => (
                                    <TouchableOpacity
                                        key={target.id}
                                        style={tw`items-center w-18 mr-2`}
                                        onPress={() => handleTargetPress(target)}>
                                        <View
                                            style={tw.style(
                                                `w-14 h-14 rounded-full justify-center items-center mb-1.5`,
                                                target.bgColor
                                                    ? { backgroundColor: target.bgColor }
                                                    : `bg-gray-100 dark:bg-gray-800`,
                                            )}>
                                            {renderTargetIcon(target)}
                                        </View>
                                        <Text
                                            style={tw`text-xs text-black dark:text-white text-center`}
                                            numberOfLines={2}>
                                            {target.id === 'copy-link' && copied
                                                ? 'Copied'
                                                : target.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={tw`px-4 pb-2`}>
                                {systemActions.map((action) => (
                                    <TouchableOpacity
                                        key={action.label}
                                        style={tw`items-center w-18 mr-2`}
                                        onPress={action.onPress}>
                                        {action.danger ? (<>
                                            <View
                                                style={tw`w-14 h-14 rounded-full bg-red-100 justify-center items-center mb-1.5`}>
                                                <Ionicons
                                                    name={action.icon as any}
                                                    size={26}
                                                    color={'#f53333'}
                                                />
                                            </View>
                                            <Text
                                                style={tw`text-xs text-red-600 text-center`}
                                                numberOfLines={2}>
                                                {action.label}
                                            </Text>
                                        </>) : (<>
                                            <View
                                                style={tw`w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 justify-center items-center mb-1.5`}>
                                                <Ionicons
                                                    name={action.icon as any}
                                                    size={26}
                                                    color={isDark ? '#fff' : '#000'}
                                                />
                                            </View>
                                            <Text
                                                style={tw`text-xs text-black dark:text-white text-center`}
                                                numberOfLines={2}>
                                                {action.label}
                                            </Text>
                                        </>)}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <TouchableOpacity
                                style={tw`mt-1 py-4 items-center border-t border-gray-100 dark:border-gray-800`}
                                onPress={onClose}>
                                <Text style={tw`text-base font-semibold text-[#007AFF]`}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}