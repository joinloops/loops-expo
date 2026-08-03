import { ConversationRow } from '@/components/dm/ConversationRow';
import { StackText, YStack } from '@/components/ui/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import type { DmConversation, DmConversationFilter, DmCursorPage } from '@/types/dm';
import { useAuthStore } from '@/utils/authStore';
import {
    dmAcceptConversation,
    dmDeclineConversation,
    dmDeleteConversation,
    dmHideConversation,
    dmMarkConversationRead,
    dmMuteConversation,
    dmUnhideConversation,
    dmUnmuteConversation,
    fetchDmConversations,
} from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

const ACCENT = '#F02C56';

const TABS: { key: DmConversationFilter; label: string }[] = [
    { key: 'primary', label: 'Inbox' },
    { key: 'requests', label: 'Requests' },
    { key: 'hidden', label: 'Hidden' },
];

type DmInfiniteData =
    | {
        pages: DmCursorPage<DmConversation>[];
        pageParams: unknown[];
    }
    | undefined;

const conversationKey = (filter: DmConversationFilter) => ['dm', 'conversations', filter];

function updateConversationInPages(
    data: DmInfiniteData,
    id: string,
    updater: (conversation: DmConversation) => DmConversation,
): DmInfiniteData {
    if (!data?.pages) return data;
    return {
        ...data,
        pages: data.pages.map((page) => ({
            ...page,
            data: page.data.map((conversation) =>
                conversation.id === id ? updater(conversation) : conversation,
            ),
        })),
    };
}

function removeConversationFromPages(data: DmInfiniteData, id: string): DmInfiniteData {
    if (!data?.pages) return data;
    return {
        ...data,
        pages: data.pages.map((page) => ({
            ...page,
            data: page.data.filter((conversation) => conversation.id !== id),
        })),
    };
}

const EmptyState = ({ filter }: { filter: DmConversationFilter }) => {
    const copy = {
        primary: {
            icon: 'chatbubbles-outline' as const,
            title: 'No messages yet',
            subtitle: 'Share a Loop with someone to start a conversation.',
        },
        requests: {
            icon: 'mail-open-outline' as const,
            title: 'No message requests',
            subtitle: "Requests from people you don't follow will show up here.",
        },
        hidden: {
            icon: 'eye-off-outline' as const,
            title: 'No hidden conversations',
            subtitle: 'Conversations you hide will show up here.',
        },
    }[filter];

    return (
        <YStack alignItems="center" justifyContent="center" style={tw`px-10 pt-24`}>
            <Ionicons name={copy.icon} size={44} color="#999" />
            <StackText
                fontSize="$5"
                fontWeight="semibold"
                textColor="text-black dark:text-white"
                style={tw`mt-4 text-center`}>
                {copy.title}
            </StackText>
            <StackText
                fontSize="$3"
                textColor="text-gray-600 dark:text-gray-500"
                style={tw`mt-1 text-center`}>
                {copy.subtitle}
            </StackText>
        </YStack>
    );
};

export default function MessagesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const { tab } = useLocalSearchParams<{ tab?: string }>();

    const [activeTab, setActiveTab] = useState<DmConversationFilter>(
        tab === 'requests' || tab === 'hidden' ? tab : 'primary',
    );
    const [actionConversation, setActionConversation] = useState<DmConversation | null>(null);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [decliningId, setDecliningId] = useState<string | null>(null);

    const selfId = user?.id ? String(user.id) : null;

    const primaryQuery = useInfiniteQuery({
        queryKey: conversationKey('primary'),
        queryFn: fetchDmConversations,
        initialPageParam: false as string | false,
        getNextPageParam: (lastPage: DmCursorPage<DmConversation>) =>
            lastPage?.meta?.next_cursor ?? undefined,
    });

    const requestsQuery = useInfiniteQuery({
        queryKey: conversationKey('requests'),
        queryFn: fetchDmConversations,
        initialPageParam: false as string | false,
        getNextPageParam: (lastPage: DmCursorPage<DmConversation>) =>
            lastPage?.meta?.next_cursor ?? undefined,
    });

    const hiddenQuery = useInfiniteQuery({
        queryKey: conversationKey('hidden'),
        queryFn: fetchDmConversations,
        initialPageParam: false as string | false,
        getNextPageParam: (lastPage: DmCursorPage<DmConversation>) =>
            lastPage?.meta?.next_cursor ?? undefined,
        enabled: activeTab === 'hidden',
    });

    const queries = {
        primary: primaryQuery,
        requests: requestsQuery,
        hidden: hiddenQuery,
    };
    const activeQuery = queries[activeTab];

    const conversations = useMemo(() => {
        return activeQuery.data?.pages?.flatMap((page) => page?.data ?? []) ?? [];
    }, [activeQuery.data]);

    const requestsCount = useMemo(() => {
        return requestsQuery.data?.pages?.flatMap((page) => page?.data ?? []).length ?? 0;
    }, [requestsQuery.data]);

    const requestsBadge =
        requestsCount > 0
            ? requestsQuery.hasNextPage
                ? `${requestsCount}+`
                : String(requestsCount)
            : null;

    const acceptMutation = useMutation({
        mutationFn: async (id: string) => {
            setAcceptingId(id);
            return await dmAcceptConversation(id);
        },
        onSuccess: (_data, id) => {
            queryClient.setQueryData(conversationKey('requests'), (old: DmInfiniteData) =>
                removeConversationFromPages(old, id),
            );
            queryClient.invalidateQueries({ queryKey: conversationKey('primary') });
        },
        onSettled: () => setAcceptingId(null),
    });

    const declineMutation = useMutation({
        mutationFn: async (id: string) => {
            setDecliningId(id);
            return await dmDeclineConversation(id);
        },
        onSuccess: (_data, id) => {
            queryClient.setQueryData(conversationKey('requests'), (old: DmInfiniteData) =>
                removeConversationFromPages(old, id),
            );
        },
        onSettled: () => setDecliningId(null),
    });

    const muteMutation = useMutation({
        mutationFn: async ({ id, muted }: { id: string; muted: boolean }) =>
            muted ? dmUnmuteConversation(id) : dmMuteConversation(id),
        onMutate: ({ id, muted }) => {
            queryClient.setQueryData(conversationKey(activeTab), (old: DmInfiniteData) =>
                updateConversationInPages(old, id, (c) => ({ ...c, muted: !muted })),
            );
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: ['dm', 'conversations'] });
        },
    });

    const hideMutation = useMutation({
        mutationFn: async ({ id, hidden }: { id: string; hidden: boolean }) =>
            hidden ? dmUnhideConversation(id) : dmHideConversation(id),
        onMutate: ({ id }) => {
            queryClient.setQueryData(conversationKey(activeTab), (old: DmInfiniteData) =>
                removeConversationFromPages(old, id),
            );
        },
        onSuccess: (_data, { hidden }) => {
            queryClient.invalidateQueries({
                queryKey: conversationKey(hidden ? 'primary' : 'hidden'),
            });
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: ['dm', 'conversations'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => dmDeleteConversation(id),
        onMutate: (id) => {
            queryClient.setQueryData(conversationKey(activeTab), (old: DmInfiniteData) =>
                removeConversationFromPages(old, id),
            );
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['dm', 'conversations'] });
        },
    });

    const handleOpenConversation = (conversation: DmConversation) => {
        if (conversation.unread) {
            queryClient.setQueryData(conversationKey(activeTab), (old: DmInfiniteData) =>
                updateConversationInPages(old, conversation.id, (c) => ({ ...c, unread: false })),
            );
            dmMarkConversationRead(conversation.id).catch(() => { });
        }
        router.push(`/private/messages/${conversation.id}` as any);
    };

    const actionItems = actionConversation
        ? [
            {
                key: 'mute',
                icon: actionConversation.muted
                    ? ('notifications-outline' as const)
                    : ('notifications-off-outline' as const),
                label: actionConversation.muted ? 'Unmute' : 'Mute',
                destructive: false,
                onPress: () =>
                    muteMutation.mutate({
                        id: actionConversation.id,
                        muted: actionConversation.muted,
                    }),
            },
            {
                key: 'hide',
                icon: actionConversation.hidden
                    ? ('eye-outline' as const)
                    : ('eye-off-outline' as const),
                label: actionConversation.hidden ? 'Unhide' : 'Hide',
                destructive: false,
                onPress: () =>
                    hideMutation.mutate({
                        id: actionConversation.id,
                        hidden: actionConversation.hidden,
                    }),
            },
            {
                key: 'delete',
                icon: 'trash-outline' as const,
                label: 'Delete',
                destructive: true,
                onPress: () => deleteMutation.mutate(actionConversation.id),
            },
        ]
        : [];

    return (
        <View style={tw`flex-1 bg-white dark:bg-black`}>
            <Stack.Screen
                options={{
                    headerTitle: 'Direct Messages',
                    title: 'Direct Messages',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerTitleStyle: {
                        fontSize: 20,
                        fontWeight: 'bold',
                        color: colorScheme === 'dark' ? '#fff' : '#000',
                    },
                    headerBackTitle: 'Back',
                    headerShadowVisible: false,
                    headerShown: true,
                    headerLeft: () => (
                        <Pressable
                            onPress={() => router.back()}
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
                            onPress={() => router.push('/private/messages/new' as any)}
                            hitSlop={8}
                            style={({ pressed }) => [pressed && tw`opacity-50`]}>
                            <Ionicons
                                name="create-outline"
                                size={26}
                                color={colorScheme === 'dark' ? '#fff' : '#000'}
                            />
                        </Pressable>
                    ),
                }}
            />

            <View style={tw`flex-row border-b border-gray-100 dark:border-gray-800`}>
                {TABS.map((t) => {
                    const active = activeTab === t.key;
                    return (
                        <Pressable
                            key={t.key}
                            onPress={() => setActiveTab(t.key)}
                            style={tw`flex-1 items-center pt-3`}>
                            <View style={tw`flex-row items-center`}>
                                <StackText
                                    fontSize="$4"
                                    fontWeight={active ? 'bold' : 'normal'}
                                    textColor={
                                        active
                                            ? 'text-black dark:text-white'
                                            : 'text-gray-500 dark:text-gray-500'
                                    }>
                                    {t.label}
                                </StackText>
                                {t.key === 'requests' && requestsBadge && (
                                    <View
                                        style={[
                                            tw`rounded-full ml-1.5 min-w-5 h-5 px-1 items-center justify-center`,
                                            { backgroundColor: ACCENT },
                                        ]}>
                                        <StackText
                                            fontSize="$1"
                                            textColor="text-white"
                                            fontWeight="bold">
                                            {requestsBadge}
                                        </StackText>
                                    </View>
                                )}
                            </View>
                            <View
                                style={[
                                    tw`h-0.5 w-8 rounded-full mt-2`,
                                    active
                                        ? {
                                            backgroundColor:
                                                colorScheme === 'dark' ? '#fff' : '#000',
                                        }
                                        : tw`bg-transparent`,
                                ]}
                            />
                        </Pressable>
                    );
                })}
            </View>

            {activeQuery.isLoading ? (
                <YStack flex={1} alignItems="center" justifyContent="center">
                    <ActivityIndicator size="large" />
                </YStack>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <ConversationRow
                            conversation={item}
                            selfId={selfId}
                            mode={activeTab === 'requests' ? 'request' : 'default'}
                            onPress={handleOpenConversation}
                            onLongPress={
                                activeTab === 'requests' ? undefined : setActionConversation
                            }
                            onAccept={(id) => acceptMutation.mutate(id)}
                            onDecline={(id) => declineMutation.mutate(id)}
                            isAccepting={acceptingId === item.id}
                            isDeclining={decliningId === item.id}
                        />
                    )}
                    ListHeaderComponent={
                        activeTab === 'requests' && conversations.length > 0 ? (
                            <View style={tw`px-4 pt-3 pb-1`}>
                                <StackText
                                    fontSize="$2"
                                    textColor="text-gray-600 dark:text-gray-500">
                                    These people want to send you messages. They won't know
                                    you've seen their request until you accept.
                                </StackText>
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={<EmptyState filter={activeTab} />}
                    ListFooterComponent={
                        activeQuery.isFetchingNextPage ? (
                            <View style={tw`py-4 items-center`}>
                                <ActivityIndicator />
                            </View>
                        ) : null
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={activeQuery.isRefetching && !activeQuery.isFetchingNextPage}
                            onRefresh={() => activeQuery.refetch()}
                        />
                    }
                    onEndReached={() => {
                        if (activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
                            activeQuery.fetchNextPage();
                        }
                    }}
                    onEndReachedThreshold={0.4}
                    contentContainerStyle={tw`pb-10`}
                />
            )}

            <Modal
                visible={!!actionConversation}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setActionConversation(null)}>
                <View style={tw`flex-1 justify-end`}>
                    <Pressable
                        style={tw`absolute inset-0`}
                        onPress={() => setActionConversation(null)}
                    />
                    <View
                        style={[
                            tw`bg-white dark:bg-gray-900 rounded-t-[20px] pt-3`,
                            { paddingBottom: insets.bottom + 20 },
                        ]}>
                        <View
                            style={tw`w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-sm self-center mb-3`}
                        />

                        {actionItems.map((item) => (
                            <TouchableOpacity
                                key={item.key}
                                style={tw`flex-row items-center px-5 py-4`}
                                onPress={() => {
                                    setActionConversation(null);
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

                        <TouchableOpacity
                            style={tw`mt-2 py-4 items-center border-t border-gray-100 dark:border-gray-800`}
                            onPress={() => setActionConversation(null)}>
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
        </View>
    );
}