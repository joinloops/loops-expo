import {
    conversationDisplayName,
    conversationMemberCount,
    conversationParticipants,
    isGroupConversation,
} from '@/components/dm/dmGroupHelpers';
import { dmDisplayName, dmHandle } from '@/components/dm/dmHelpers';
import { GroupInfoSheet } from '@/components/dm/GroupInfoSheet';
import { ImageViewer } from '@/components/dm/ImageViewer';
import { MessageBubble } from '@/components/dm/MessageBubble';
import KlipyKeyboard from '@/components/feed/KlipyKeyboard';
import { BottomSheetModal } from '@/components/ui/BottomSheetModal';
import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { StackText, YStack } from '@/components/ui/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import { useFeatureFlag } from '@/hooks/useServerConfig';
import type {
    DmConversation,
    DmCursorPage,
    DmMediaEntity,
    DmMediaType,
    DmMessage,
    DmOptimisticMessage,
    DmParticipant,
    DmSendMediaPayload,
} from '@/types/dm';
import { useAuthStore } from '@/utils/authStore';
import {
    dmAcceptConversation,
    dmDeclineConversation,
    dmDeleteMessage,
    dmHideConversation,
    dmLeaveGroup,
    dmMarkConversationRead,
    dmMuteConversation,
    dmSendMediaMessage,
    dmSendMessage,
    dmUnhideConversation,
    dmUnmuteConversation,
    fetchDmConversation,
    fetchDmMessages,
    fetchReportRules,
    openBrowser,
    submitReport,
    type KlipyItem,
    type KlipyMediaType,
} from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    Modal,
    Pressable,
    ScrollView,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

const ACCENT = '#F02C56';

type DmMessagesData =
    | {
        pages: DmCursorPage<DmMessage>[];
        pageParams: unknown[];
    }
    | undefined;

const klipyToDmMediaType = (type: KlipyMediaType): DmMediaType => {
    switch (type) {
        case 'clips':
            return 'video';
        case 'memes':
            return 'image';
        default:
            return 'gif';
    }
};

const isSameDay = (a: string, b: string): boolean => {
    const da = new Date(a);
    const db = new Date(b);
    return (
        da.getFullYear() === db.getFullYear() &&
        da.getMonth() === db.getMonth() &&
        da.getDate() === db.getDate()
    );
};

const dayLabel = (dateString: string): string => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thatDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((today.getTime() - thatDay.getTime()) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';

    return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
    });
};

export default function ConversationScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();
    const { colorScheme } = useTheme();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { width: screenWidth } = useWindowDimensions();

    const [draft, setDraft] = useState('');
    const [outbox, setOutbox] = useState<DmOptimisticMessage[]>([]);
    const [menuVisible, setMenuVisible] = useState(false);
    const [groupInfoVisible, setGroupInfoVisible] = useState(false);
    const [reportTarget, setReportTarget] = useState<DmOptimisticMessage | null>(null);
    const [showKlipy, setShowKlipy] = useState(false);
    const hasKlipy = useFeatureFlag('hasKlipy');
    const titleMaxWidth = Math.max(120, screenWidth - 170);
    const [viewerMedia, setViewerMedia] = useState<DmMediaEntity | null>(null);
    const [keyboardUp, setKeyboardUp] = useState(false);
    const selfId = user?.id ? String(user.id) : null;

    const { data: conversationRaw } = useQuery({
        queryKey: ['dm', 'conversation', id],
        queryFn: () => fetchDmConversation(id as string),
        enabled: !!id,
    });
    const conversation = (conversationRaw?.data ?? conversationRaw) as DmConversation | undefined;
    const participant = conversation?.participant;
    const isGroup = isGroupConversation(conversation);
    const isRequest = !!conversation?.pending_acceptance;

    const participantById = useMemo(() => {
        const map = new Map<string, DmParticipant>();
        conversationParticipants(conversation).forEach((p) => map.set(String(p.id), p));
        return map;
    }, [conversation]);

    const messagesQuery = useInfiniteQuery({
        queryKey: ['dm', 'messages', id],
        queryFn: fetchDmMessages,
        initialPageParam: false as string | false,
        getNextPageParam: (lastPage: DmCursorPage<DmMessage>) =>
            lastPage?.meta?.next_cursor ?? undefined,
        enabled: !!id,
        refetchInterval: 6000,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
    });

    const serverMessages = useMemo(() => {
        return messagesQuery.data?.pages?.flatMap((page) => page?.data ?? []) ?? [];
    }, [messagesQuery.data]);

    const listData: DmOptimisticMessage[] = useMemo(() => {
        const visibleOutbox = outbox.filter(
            (m) => !serverMessages.some((s) => s.id === m.id),
        );
        return [...visibleOutbox.slice().reverse(), ...serverMessages];
    }, [outbox, serverMessages]);

    const newestServerId = serverMessages[0]?.id;

    useEffect(() => {
        if (!id) return;
        dmMarkConversationRead(id as string).catch(() => { });
        (['primary', 'requests', 'hidden'] as const).forEach((filter) => {
            queryClient.setQueryData(['dm', 'conversations', filter], (old: any) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: page.data.map((c: DmConversation) =>
                            c.id === id ? { ...c, unread: false } : c,
                        ),
                    })),
                };
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, newestServerId]);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardUp(true));
        const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardUp(false));
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    const insertMessage = (message: DmMessage) => {
        queryClient.setQueryData(['dm', 'messages', id], (old: DmMessagesData) => {
            if (!old?.pages?.length) return old;
            const exists = old.pages.some((page) =>
                page?.data?.some((m) => m.id === message.id),
            );
            if (exists) return old;
            const pages = [...old.pages];
            pages[0] = { ...pages[0], data: [message, ...(pages[0]?.data ?? [])] };
            return { ...old, pages };
        });
    };

    const sendMutation = useMutation({
        mutationFn: async (vars: { tempId: string; body: string }) => {
            return await dmSendMessage({
                type: 'text',
                body: vars.body,
                conversation_id: id as string,
            });
        },
        onSuccess: (res, vars) => {
            const message = (res?.data ?? res) as DmMessage;
            setOutbox((prev) => prev.filter((m) => m.id !== vars.tempId));
            if (message?.id) {
                insertMessage(message);
            } else {
                messagesQuery.refetch();
            }
            queryClient.invalidateQueries({ queryKey: ['dm', 'conversations', 'primary'] });
        },
        onError: (_err, vars) => {
            setOutbox((prev) =>
                prev.map((m) =>
                    m.id === vars.tempId ? { ...m, pending: false, failed: true } : m,
                ),
            );
        },
    });

    const sendMediaMutation = useMutation({
        mutationFn: async (vars: { tempId: string; payload: DmSendMediaPayload }) => {
            return await dmSendMediaMessage(vars.payload);
        },
        onSuccess: (res, vars) => {
            const message = (res?.data ?? res) as DmMessage;
            setOutbox((prev) => prev.filter((m) => m.id !== vars.tempId));
            if (message?.id) {
                insertMessage(message);
            } else {
                messagesQuery.refetch();
            }
            queryClient.invalidateQueries({ queryKey: ['dm', 'conversations', 'primary'] });
        },
        onError: (_err, vars) => {
            setOutbox((prev) =>
                prev.map((m) =>
                    m.id === vars.tempId ? { ...m, pending: false, failed: true } : m,
                ),
            );
        },
    });

    const handleKlipySelect = (
        klipyItem: KlipyItem,
        klipyType: KlipyMediaType,
        media: { url: string; mime: string; width: number; height: number },
    ) => {
        setShowKlipy(false);
        if (!selfId || !id) return;

        const tempId = `temp-${Date.now()}`;
        const optimistic: DmOptimisticMessage = {
            id: tempId,
            conversation_id: id as string,
            sender_id: selfId,
            type: 'media',
            body: null,
            media: [
                {
                    id: tempId,
                    type: klipyToDmMediaType(klipyType),
                    mime_type: media.mime,
                    url: media.url,
                    preview_url: null,
                    width: media.width,
                    height: media.height,
                    blurhash: null,
                    description: klipyItem.title ?? null,
                },
            ],
            created_at: new Date().toISOString(),
            edited_at: null,
            pending: true,
            klipy: {
                type: klipyType,
                item: klipyItem as unknown as Record<string, unknown>,
            },
        };

        setOutbox((prev) => [...prev, optimistic]);
        sendMediaMutation.mutate({
            tempId,
            payload: {
                type: klipyType,
                item: klipyItem as unknown as Record<string, unknown>,
                conversation_id: id as string,
            },
        });
    };

    const handlePressMedia = (message: DmOptimisticMessage, index: number) => {
        const image = message.media?.[index];
        if (image) setViewerMedia(image);
    };

    const handleSend = () => {
        const body = draft.trim();
        if (!body || !selfId || !id) return;

        const tempId = `temp-${Date.now()}`;
        const optimistic: DmOptimisticMessage = {
            id: tempId,
            conversation_id: id as string,
            sender_id: selfId,
            type: 'text',
            body,
            media: [],
            created_at: new Date().toISOString(),
            edited_at: null,
            pending: true,
        };

        setOutbox((prev) => [...prev, optimistic]);
        setDraft('');
        sendMutation.mutate({ tempId, body });
    };

    const handleRetry = (message: DmOptimisticMessage) => {
        setOutbox((prev) =>
            prev.map((m) => (m.id === message.id ? { ...m, pending: true, failed: false } : m)),
        );
        if (message.klipy) {
            sendMediaMutation.mutate({
                tempId: message.id,
                payload: {
                    type: message.klipy.type as KlipyMediaType,
                    item: message.klipy.item,
                    conversation_id: id as string,
                },
            });
        } else {
            sendMutation.mutate({ tempId: message.id, body: message.body ?? '' });
        }
    };

    const deleteMutation = useMutation({
        mutationFn: async (messageId: string) => dmDeleteMessage(messageId),
        onMutate: (messageId) => {
            queryClient.setQueryData(['dm', 'messages', id], (old: DmMessagesData) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        data: page.data.filter((m) => m.id !== messageId),
                    })),
                };
            });
        },
        onError: () => {
            messagesQuery.refetch();
        },
    });

    const acceptMutation = useMutation({
        mutationFn: async () => dmAcceptConversation(id as string),
        onSuccess: () => {
            queryClient.setQueryData(['dm', 'conversation', id], (old: any) => {
                const current = old?.data ?? old;
                if (!current) return old;
                const next = { ...current, state: 'active', pending_acceptance: false };
                return old?.data ? { ...old, data: next } : next;
            });
            queryClient.invalidateQueries({ queryKey: ['dm', 'conversations'] });
        },
    });

    const declineMutation = useMutation({
        mutationFn: async () => dmDeclineConversation(id as string),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dm', 'conversations'] });
            router.back();
        },
    });

    const setConversationDetail = (
        updater: (conversation: DmConversation) => DmConversation,
    ) => {
        queryClient.setQueryData(['dm', 'conversation', id], (old: any) => {
            const current = old?.data ?? old;
            if (!current) return old;
            const next = updater(current);
            return old?.data ? { ...old, data: next } : next;
        });
    };

    const muteMutation = useMutation({
        mutationFn: async () =>
            conversation?.muted
                ? dmUnmuteConversation(id as string)
                : dmMuteConversation(id as string),
        onMutate: () => {
            setConversationDetail((c) => ({ ...c, muted: !c.muted }));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dm', 'conversations'] });
        },
        onError: () => {
            setConversationDetail((c) => ({ ...c, muted: !c.muted }));
        },
    });

    const hideMutation = useMutation({
        mutationFn: async () =>
            conversation?.hidden
                ? dmUnhideConversation(id as string)
                : dmHideConversation(id as string),
        onMutate: () => {
            setConversationDetail((c) => ({ ...c, hidden: !c.hidden }));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dm', 'conversations'] });
        },
        onError: () => {
            setConversationDetail((c) => ({ ...c, hidden: !c.hidden }));
        },
    });

    const leaveMutation = useMutation({
        mutationFn: async () => dmLeaveGroup(id as string),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dm', 'conversations'] });
            goBack();
        },
        onError: () => {
            Alert.alert('Something went wrong', "Couldn't leave the group. Please try again.");
        },
    });

    const confirmLeave = () => {
        Alert.alert('Leave group?', "You'll stop receiving messages from this conversation.", [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Leave', style: 'destructive', onPress: () => leaveMutation.mutate() },
        ]);
    };

    const reportRulesQuery = useQuery({
        queryKey: ['report-rules'],
        queryFn: fetchReportRules,
        enabled: !!reportTarget,
        staleTime: 300000,
    });
    const reportRules: any[] =
        reportRulesQuery.data?.data ?? reportRulesQuery.data ?? [];

    const reportMutation = useMutation({
        mutationFn: async (vars: { messageId: string; key: string }) =>
            submitReport({ id: conversation.id, key: vars.key, type: 'conversation' }),
        onSuccess: () => {
            setReportTarget(null);
            Alert.alert('Report submitted', 'Thanks for helping keep Loops safe.');
        },
        onError: () => {
            Alert.alert('Something went wrong', 'Could not submit the report. Please try again.');
        },
    });

    const handleLongPressMessage = (message: DmOptimisticMessage) => {
        if (message.pending) return;

        if (message.failed) {
            Alert.alert('Message not sent', undefined, [
                { text: 'Retry', onPress: () => handleRetry(message) },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => setOutbox((prev) => prev.filter((m) => m.id !== message.id)),
                },
                { text: 'Cancel', style: 'cancel' },
            ]);
            return;
        }

        if (!selfId || String(message.sender_id) !== selfId) {
            setReportTarget(message);
            return;
        }

        Alert.alert('Delete message?', 'This will remove the message for everyone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteMutation.mutate(message.id),
            },
        ]);
    };

    const handlePressLoop = (message: DmOptimisticMessage) => {
        const video = message.video;
        if (!video) return;

        if (video.is_local === false && video.url) {
            openBrowser(video.url);
            return;
        }
        router.push(`/private/profile/feed/${video.id}?profileId=${video.account.id}` as any);
    };

    const openProfile = () => {
        if (!participant?.id) return;
        router.push(`/private/profile/${participant.id}` as any);
    };

    const openHeader = () => {
        if (isGroup) {
            setGroupInfoVisible(true);
        } else {
            openProfile();
        }
    };

    const renderItem = ({ item, index }: { item: DmOptimisticMessage; index: number }) => {
        const older = listData[index + 1];
        const newer = listData[index - 1];
        const isSelf = !!selfId && String(item.sender_id) === selfId;
        const sender = participantById.get(String(item.sender_id)) ?? participant ?? null;

        const showAvatar =
            !isSelf && (!newer || String(newer.sender_id) !== String(item.sender_id));

        const showName =
            isGroup && !isSelf && (!older || String(older.sender_id) !== String(item.sender_id));

        const gapMs = newer
            ? new Date(newer.created_at).getTime() - new Date(item.created_at).getTime()
            : Infinity;
        const showMeta =
            !newer || String(newer.sender_id) !== String(item.sender_id) || gapMs > 600000;

        const showDay = !older || !isSameDay(item.created_at, older.created_at);

        return (
            <MessageBubble
                message={item}
                isSelf={isSelf}
                isNewest={index === 0}
                participant={participant}
                sender={sender}
                showAvatar={showAvatar}
                showName={showName}
                showMeta={showMeta}
                dayLabel={showDay ? dayLabel(item.created_at) : null}
                onLongPress={handleLongPressMessage}
                onPressLoop={handlePressLoop}
                onPressMedia={handlePressMedia}
                onPressRetry={handleRetry}
            />
        );
    };

    const headerName = isGroup
        ? conversationDisplayName(conversation)
        : participant
            ? dmDisplayName(participant)
            : 'Message';
    const participantHandle = dmHandle(participant);
    const memberCount = conversationMemberCount(conversation);

    const goBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/private/messages' as any);
        }
    };

    const menuItems = conversation
        ? [
            ...(isGroup
                ? [
                    {
                        key: 'members',
                        icon: 'people-outline' as const,
                        label: 'Members',
                        destructive: false,
                        onPress: () => setGroupInfoVisible(true),
                    },
                ]
                : []),
            {
                key: 'mute',
                icon: conversation.muted
                    ? ('notifications-outline' as const)
                    : ('notifications-off-outline' as const),
                label: conversation.muted ? 'Unmute' : 'Mute',
                destructive: false,
                onPress: () => muteMutation.mutate(),
            },
            {
                key: 'hide',
                icon: conversation.hidden
                    ? ('eye-outline' as const)
                    : ('eye-off-outline' as const),
                label: conversation.hidden ? 'Unhide' : 'Hide',
                destructive: false,
                onPress: () => hideMutation.mutate(),
            },
            ...(isGroup
                ? [
                    {
                        key: 'leave',
                        icon: 'exit-outline' as const,
                        label: 'Leave group',
                        destructive: true,
                        onPress: confirmLeave,
                    },
                ]
                : []),
        ]
        : [];

    return (
        <View style={tw`flex-1 bg-white dark:bg-black`}>
            <Stack.Screen
                options={{
                    headerTitleAlign: 'center',
                    headerTitle: () => (
                        <Pressable
                            onPress={openHeader}
                            style={[tw`items-center`, { maxWidth: titleMaxWidth }]}>
                            <StackText
                                fontSize="$4"
                                fontWeight="bold"
                                textColor="text-black dark:text-white"
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                style={tw`text-center`}>
                                {headerName}
                            </StackText>
                            {isGroup ? (
                                <StackText
                                    fontSize="$1"
                                    textColor="text-gray-500"
                                    numberOfLines={1}
                                    style={tw`text-center`}>
                                    {memberCount} members
                                </StackText>
                            ) : (
                                !!participantHandle && (
                                    <StackText
                                        fontSize="$1"
                                        textColor="text-gray-500"
                                        numberOfLines={1}
                                        ellipsizeMode="middle"
                                        style={tw`text-center`}>
                                        {participantHandle}
                                    </StackText>
                                )
                            )}
                        </Pressable>
                    ),
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerBackTitle: 'Back',
                    headerShadowVisible: false,
                    headerShown: true,
                    headerLeft: () => (
                        <Pressable
                            onPress={goBack}
                            hitSlop={8}
                            style={({ pressed }) => [pressed && tw`opacity-50`]}>
                            <Ionicons
                                name="chevron-back"
                                size={26}
                                color={colorScheme === 'dark' ? '#fff' : '#000'}
                            />
                        </Pressable>
                    ),
                    headerRight: () => (
                        <Pressable
                            onPress={() => setMenuVisible(true)}
                            hitSlop={8}
                            style={({ pressed }) => [pressed && tw`opacity-50`]}>
                            <Ionicons
                                name="ellipsis-horizontal"
                                size={22}
                                color={colorScheme === 'dark' ? '#fff' : '#000'}
                            />
                        </Pressable>
                    ),
                }}
            />

            <KeyboardAvoidingView
                style={tw`flex-1`}
                behavior='padding'
                keyboardVerticalOffset={headerHeight}>
                {messagesQuery.isLoading ? (
                    <YStack flex={1} alignItems="center" justifyContent="center">
                        <ActivityIndicator size="large" />
                    </YStack>
                ) : (
                    <FlatList
                        data={listData}
                        inverted
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={tw`pt-3 pb-2`}
                        keyboardDismissMode="interactive"
                        onEndReached={() => {
                            if (
                                messagesQuery.hasNextPage &&
                                !messagesQuery.isFetchingNextPage
                            ) {
                                messagesQuery.fetchNextPage();
                            }
                        }}
                        onEndReachedThreshold={0.4}
                        ListFooterComponent={
                            messagesQuery.isFetchingNextPage ? (
                                <View style={tw`py-4 items-center`}>
                                    <ActivityIndicator />
                                </View>
                            ) : null
                        }
                        ListEmptyComponent={
                            <View
                                style={[
                                    tw`items-center px-10 pt-16`,
                                ]}>
                                <Ionicons name="chatbubbles-outline" size={44} color="#999" />
                                <StackText
                                    fontSize="$4"
                                    fontWeight="semibold"
                                    textColor="text-black dark:text-white"
                                    style={tw`mt-4 text-center`}>
                                    {headerName}
                                </StackText>
                                <StackText
                                    fontSize="$3"
                                    textColor="text-gray-600 dark:text-gray-500"
                                    style={tw`mt-1`}>
                                    Say hi 👋
                                </StackText>
                            </View>
                        }
                    />
                )}

                {
                    isRequest ? (
                        <View
                            style={[
                                tw`border-t border-gray-100 dark:border-gray-800 px-4 pt-4`,
                                { paddingBottom: keyboardUp ? 8 : insets.bottom + 8 },
                            ]}>
                            <StackText
                                fontSize="$4"
                                fontWeight="semibold"
                                textColor="text-black dark:text-white"
                                style={tw`text-center`}>
                                {isGroup
                                    ? 'Join this group conversation?'
                                    : `Accept message request from ${headerName}?`}
                            </StackText>
                            <StackText
                                fontSize="$2"
                                textColor="text-gray-600 dark:text-gray-500"
                                style={tw`text-center mt-1`}>
                                They won't know you've seen it until you accept.
                            </StackText>

                            <View style={tw`flex-row gap-3 mt-4`}>
                                <PressableHaptics
                                    onPress={() => declineMutation.mutate()}
                                    disabled={acceptMutation.isPending || declineMutation.isPending}
                                    style={({ pressed }) => [
                                        tw`flex-1 rounded-xl py-3 items-center bg-gray-100 dark:bg-gray-800`,
                                        pressed && tw`opacity-70`,
                                    ]}>
                                    {declineMutation.isPending ? (
                                        <ActivityIndicator size="small" color="#666" />
                                    ) : (
                                        <StackText
                                            fontSize="$4"
                                            fontWeight="semibold"
                                            textColor="text-black dark:text-white">
                                            {isGroup ? 'Leave' : 'Decline'}
                                        </StackText>
                                    )}
                                </PressableHaptics>

                                <PressableHaptics
                                    onPress={() => acceptMutation.mutate()}
                                    disabled={acceptMutation.isPending || declineMutation.isPending}
                                    style={({ pressed }) => [
                                        tw`flex-1 rounded-xl py-3 items-center`,
                                        { backgroundColor: ACCENT },
                                        pressed && tw`opacity-70`,
                                    ]}>
                                    {acceptMutation.isPending ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <StackText
                                            fontSize="$4"
                                            fontWeight="semibold"
                                            textColor="text-white">
                                            Accept
                                        </StackText>
                                    )}
                                </PressableHaptics>
                            </View>
                        </View>
                    ) : (
                        <View
                            style={[
                                tw`flex-row items-end px-3 pt-2 border-t border-gray-100 dark:border-gray-800`,
                                { paddingBottom: keyboardUp ? 8 : insets.bottom + 8 },
                            ]}>
                            <TextInput
                                style={[
                                    tw`flex-1 rounded-3xl px-4 py-2.5 mr-2 bg-gray-100 dark:bg-gray-800 text-black dark:text-white`,
                                    { maxHeight: 110, fontSize: 16 },
                                ]}
                                placeholder="Send a message..."
                                placeholderTextColor="#999"
                                multiline
                                value={draft}
                                onChangeText={setDraft}
                            />
                            {hasKlipy && (
                                <PressableHaptics
                                    onPress={() => setShowKlipy(true)}
                                    hitSlop={6}
                                    style={({ pressed }) => [
                                        tw`px-2 py-1.5 mr-2 mb-0.5 border rounded-xl border-gray-300 dark:border-gray-500`,
                                        pressed && tw`opacity-50`,
                                    ]}>
                                    <StackText
                                        fontSize="$3"
                                        fontWeight="semibold"
                                        textColor="text-black dark:text-white">
                                        GIF
                                    </StackText>
                                </PressableHaptics>
                            )}
                            <PressableHaptics
                                onPress={handleSend}
                                disabled={!draft.trim()}
                                style={({ pressed }) => [
                                    tw`w-10 h-10 rounded-full items-center justify-center`,
                                    {
                                        backgroundColor: draft.trim()
                                            ? ACCENT
                                            : colorScheme === 'dark'
                                                ? '#374151'
                                                : '#D1D5DB',
                                    },
                                    pressed && tw`opacity-70`,
                                ]}>
                                <Ionicons name="paper-plane" size={18} color="#fff" />
                            </PressableHaptics>
                        </View>
                    )
                }
            </KeyboardAvoidingView >

            <BottomSheetModal
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                containerStyle={{ maxHeight: '85%' }}
                cancelSpacing={false}>
                <View style={tw`flex justify-end`}>
                    <View
                        style={[
                            tw`bg-white dark:bg-gray-900 rounded-t-[20px] pt-3`,
                            { paddingBottom: insets.bottom + 20 },
                        ]}>

                        {menuItems.map((item) => (
                            <TouchableOpacity
                                key={item.key}
                                style={tw`flex-row items-center px-5 py-4`}
                                onPress={() => {
                                    setMenuVisible(false);
                                    item.onPress();
                                }}>
                                <Ionicons
                                    name={item.icon}
                                    size={22}
                                    color={
                                        item.destructive
                                            ? '#EF4444'
                                            : colorScheme === 'dark'
                                                ? '#fff'
                                                : '#000'
                                    }
                                />
                                <StackText
                                    fontSize="$4"
                                    fontWeight="semibold"
                                    textColor={
                                        item.destructive
                                            ? 'text-red-500'
                                            : 'text-black dark:text-white'
                                    }
                                    style={tw`ml-3`}>
                                    {item.label}
                                </StackText>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </BottomSheetModal>

            <Modal
                visible={!!reportTarget}
                animationType="fade"
                transparent
                statusBarTranslucent
                navigationBarTranslucent
                onRequestClose={() => setReportTarget(null)}>
                <Pressable
                    style={tw`absolute inset-0 bg-black/50`}
                    onPress={() => setReportTarget(null)}
                />
                <View style={tw`flex-1 justify-end`}>
                    <Pressable
                        style={tw`absolute inset-0`}
                        onPress={() => setReportTarget(null)}
                    />
                    <View
                        style={[
                            tw`bg-white dark:bg-gray-900 rounded-t-[20px] pt-3`,
                            { paddingBottom: insets.bottom + 20 },
                        ]}>
                        <View
                            style={tw`w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-sm self-center mb-3`}
                        />

                        <View style={tw`px-5 pb-3`}>
                            <StackText
                                fontSize="$5"
                                fontWeight="bold"
                                textColor="text-black dark:text-white">
                                Report message
                            </StackText>
                            <StackText
                                fontSize="$2"
                                textColor="text-gray-600 dark:text-gray-500"
                                style={tw`mt-1`}>
                                Why are you reporting this message? Your report is anonymous.
                            </StackText>
                        </View>

                        {reportRulesQuery.isLoading || reportMutation.isPending ? (
                            <View style={tw`py-8 items-center`}>
                                <ActivityIndicator />
                            </View>
                        ) : (
                            <ScrollView style={{ maxHeight: 380 }}>
                                {reportRules.map((rule: any) => (
                                    <TouchableOpacity
                                        key={String(rule.key ?? rule.id)}
                                        style={tw`flex-row items-center justify-between px-5 py-4`}
                                        onPress={() =>
                                            reportTarget &&
                                            reportMutation.mutate({
                                                messageId: reportTarget.id,
                                                key: String(rule.key ?? rule.id),
                                            })
                                        }>
                                        <StackText
                                            fontSize="$4"
                                            textColor="text-black dark:text-white"
                                            style={tw`flex-1 mr-3`}>
                                            {rule.message ?? String(rule.key)}
                                        </StackText>
                                        <Ionicons
                                            name="chevron-forward"
                                            size={18}
                                            color="#C4C4C4"
                                        />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        <TouchableOpacity
                            style={tw`mt-2 py-4 items-center border-t border-gray-100 dark:border-gray-800`}
                            onPress={() => setReportTarget(null)}>
                            <StackText
                                fontSize="$4"
                                fontWeight="semibold"
                                textColor="text-[#007AFF]">
                                Cancel
                            </StackText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {
                isGroup && conversation && (
                    <GroupInfoSheet
                        visible={groupInfoVisible}
                        conversation={conversation}
                        onClose={() => setGroupInfoVisible(false)}
                        onLeft={() => {
                            setGroupInfoVisible(false);
                            goBack();
                        }}
                        onOpenProfile={(profileId) => {
                            setGroupInfoVisible(false);
                            router.push(`/private/profile/${profileId}` as any);
                        }}
                    />
                )
            }

            <KlipyKeyboard
                visible={showKlipy}
                onClose={() => setShowKlipy(false)}
                onSelect={handleKlipySelect}
            />

            <ImageViewer
                visible={!!viewerMedia}
                media={viewerMedia}
                onClose={() => setViewerMedia(null)}
            />
        </View >
    );
}