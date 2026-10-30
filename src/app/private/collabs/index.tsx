import Avatar from '@/components/Avatar';
import CollabVideoPreviewModal from '@/components/collabs/CollabVideoPreviewModal';
import { useTheme } from '@/contexts/ThemeContext';
import { collabErrorMessage, type CollabCursorPage, type CollabRequest } from '@/types/collab';
import {
    acceptCollabRequest,
    declineCollabRequest,
    fetchCollabRequests,
    leaveCollab,
} from '@/utils/requests';
import { timeAgo } from '@/utils/ui';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    Text,
    View,
} from 'react-native';
import tw from 'twrnc';

const ACCENT = '#F02C56';

type TabId = 'pending' | 'all';

const TABS: { id: TabId; label: string }[] = [
    { id: 'pending', label: 'Pending' },
    { id: 'all', label: 'All' },
];

const THUMB_W = 84;
const THUMB_H = 150;

const STATE_LABELS: Record<string, string> = {
    approved: 'Collaborating',
    declined: 'Declined',
    expired: 'Expired',
    removed: 'Ended',
};

interface RowProps {
    item: CollabRequest;
    isDark: boolean;
    highlighted: boolean;
    busy: boolean;
    trust: boolean;
    onToggleTrust: () => void;
    onAccept: () => void;
    onDecline: () => void;
    onLeave: () => void;
    onPreview: () => void;
    onOpenProfile: () => void;
    onOpenVideo: () => void;
}

const CollabRow = memo(function CollabRow({
    item,
    isDark,
    highlighted,
    busy,
    trust,
    onToggleTrust,
    onAccept,
    onDecline,
    onLeave,
    onPreview,
    onOpenProfile,
    onOpenVideo,
}: RowProps) {
    const video = item.video;
    const canAnswer = item.state === 'pending' || item.state === 'expired';

    return (
        <View
            style={tw.style(
                'mx-4 mb-3 rounded-2xl border p-3 flex-row gap-3 bg-white dark:bg-[#111]',
                highlighted ? 'border-[#F02C56]' : 'border-gray-200 dark:border-gray-800',
            )}>
            <Pressable
                onPress={video?.src_url ? onPreview : undefined}
                accessibilityLabel={video?.src_url ? 'Preview video' : undefined}
                style={{ width: THUMB_W, height: THUMB_H }}>
                <Image
                    source={video?.thumbnail}
                    style={[
                        tw`rounded-xl bg-gray-200 dark:bg-gray-800`,
                        { width: THUMB_W, height: THUMB_H },
                    ]}
                    contentFit="cover"
                    transition={150}
                    recyclingKey={item.id}
                />
                {video?.src_url ? (
                    <View
                        style={tw`absolute inset-0 items-center justify-center`}
                        pointerEvents="none">
                        <View
                            style={tw`w-9 h-9 rounded-full bg-black/55 items-center justify-center`}>
                            <Ionicons name="play" size={18} color="#fff" />
                        </View>
                    </View>
                ) : video && !video.is_ready ? (
                    <View
                        style={tw`absolute bottom-1.5 left-1.5 right-1.5 rounded-md bg-black/70 px-1 py-0.5`}
                        pointerEvents="none">
                        <Text style={tw`text-[10px] text-white text-center`}>Processing</Text>
                    </View>
                ) : null}
            </Pressable>

            <View style={tw`flex-1`}>
                <Pressable onPress={onOpenProfile} style={tw`flex-row items-center gap-2`}>
                    <Avatar url={item.inviter?.avatar} width={28} />
                    <View style={tw`flex-1`}>
                        <Text
                            style={tw`text-[14px] font-semibold text-gray-900 dark:text-white`}
                            numberOfLines={1}>
                            {item.inviter?.name || item.inviter?.username}
                        </Text>
                        <Text
                            style={tw`text-xs text-gray-500 dark:text-gray-400`}
                            numberOfLines={1}>
                            @{item.inviter?.username}
                            {item.created_at ? ` · ${timeAgo(item.created_at)}` : ''}
                        </Text>
                    </View>
                </Pressable>

                {canAnswer ? (
                    <Text style={tw`mt-2 text-[13px] text-gray-700 dark:text-gray-300`}>
                        Wants to post this with you as a coauthor.
                    </Text>
                ) : null}

                {video?.caption ? (
                    <Text
                        style={tw`mt-1.5 text-[13px] text-gray-900 dark:text-gray-100`}
                        numberOfLines={3}>
                        {video.caption}
                    </Text>
                ) : null}

                {video?.scheduled_at ? (
                    <Text style={tw`mt-1 text-xs text-gray-500 dark:text-gray-400`}>
                        Scheduled for {new Date(video.scheduled_at).toLocaleString()}
                    </Text>
                ) : null}

                <View style={tw`flex-1`} />

                {canAnswer ? (
                    <View style={tw`mt-3`}>
                        <Pressable
                            onPress={onToggleTrust}
                            hitSlop={6}
                            style={tw`flex-row items-center gap-2 mb-2.5`}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: trust }}>
                            <Ionicons
                                name={trust ? 'checkbox' : 'square-outline'}
                                size={18}
                                color={trust ? ACCENT : isDark ? '#9CA3AF' : '#6B7280'}
                            />
                            <Text
                                style={tw`flex-1 text-xs text-gray-600 dark:text-gray-400`}
                                numberOfLines={2}>
                                Always approve invites from @{item.inviter?.username}
                            </Text>
                        </Pressable>
                        <View style={tw`flex-row gap-2`}>
                            <Pressable
                                onPress={onAccept}
                                disabled={busy}
                                style={({ pressed }) => [
                                    tw`flex-1 h-9 rounded-full items-center justify-center`,
                                    { backgroundColor: ACCENT },
                                    (pressed || busy) && tw`opacity-60`,
                                ]}>
                                {busy ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={tw`text-sm font-semibold text-white`}>Accept</Text>
                                )}
                            </Pressable>
                            {item.state === 'pending' ? (
                                <Pressable
                                    onPress={onDecline}
                                    disabled={busy}
                                    style={({ pressed }) => [
                                        tw`flex-1 h-9 rounded-full items-center justify-center bg-gray-100 dark:bg-gray-800`,
                                        (pressed || busy) && tw`opacity-60`,
                                    ]}>
                                    <Text
                                        style={tw`text-sm font-semibold text-gray-800 dark:text-gray-100`}>
                                        Decline
                                    </Text>
                                </Pressable>
                            ) : null}
                        </View>
                        {item.state === 'expired' ? (
                            <Text style={tw`mt-2 text-[11px] text-gray-500 dark:text-gray-400`}>
                                This invite expired, but you can still accept while the video is
                                unpublished.
                            </Text>
                        ) : null}
                    </View>
                ) : (
                    <View style={tw`mt-3 flex-row items-center flex-wrap gap-3`}>
                        <View
                            style={tw.style(
                                'px-2 py-0.5 rounded-full',
                                item.state === 'approved'
                                    ? 'bg-green-100 dark:bg-green-900/40'
                                    : 'bg-gray-100 dark:bg-gray-800',
                            )}>
                            <Text
                                style={tw.style(
                                    'text-[10px] font-semibold uppercase tracking-wide',
                                    item.state === 'approved'
                                        ? 'text-green-700 dark:text-green-200'
                                        : 'text-gray-600 dark:text-gray-300',
                                )}>
                                {STATE_LABELS[item.state] ?? item.state}
                            </Text>
                        </View>
                        {item.state === 'approved' && video?.is_published ? (
                            <Pressable onPress={onOpenVideo} hitSlop={6}>
                                <Text style={tw`text-sm font-semibold text-[#F02C56]`}>View</Text>
                            </Pressable>
                        ) : null}
                        {item.state === 'approved' ? (
                            <Pressable onPress={onLeave} disabled={busy} hitSlop={6}>
                                <Text
                                    style={tw`text-sm font-semibold text-red-600 dark:text-red-400`}>
                                    {busy ? 'Leaving…' : 'Leave'}
                                </Text>
                            </Pressable>
                        ) : null}
                    </View>
                )}
            </View>
        </View>
    );
});

export default function CollabsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string; tab?: string }>();
    const queryClient = useQueryClient();
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    const [tab, setTab] = useState<TabId>(params.tab === 'all' ? 'all' : 'pending');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [trust, setTrust] = useState<Record<string, boolean>>({});
    const [previewUri, setPreviewUri] = useState<string | null>(null);

    const queryKey = ['collabs', 'requests', tab];

    const {
        data,
        isLoading,
        isError,
        isRefetching,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey,
        queryFn: ({ pageParam }) =>
            fetchCollabRequests({ pageParam: pageParam as string | null, state: tab }),
        initialPageParam: null as string | null,
        getNextPageParam: (last: CollabCursorPage<CollabRequest>) =>
            last?.meta?.next_cursor ?? undefined,
        refetchOnMount: 'always',
    });

    const items = useMemo(
        () => data?.pages.flatMap((p: CollabCursorPage<CollabRequest>) => p?.data ?? []) ?? [],
        [data],
    );

    /** Swap an answered invite in place so the result stays on screen. */
    const replaceItem = useCallback(
        (updated: CollabRequest) => {
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: CollabCursorPage<CollabRequest>) => ({
                        ...page,
                        data: (page.data ?? []).map((row) =>
                            row.id === updated.id ? updated : row,
                        ),
                    })),
                };
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [queryClient, tab],
    );

    // Refresh everything except the list on screen, so an answered invite
    // stays visible with its new state until the user leaves or pulls down.
    const afterChange = () => {
        queryClient.invalidateQueries({ queryKey: ['collabs', 'pendingCount'] });
        queryClient.invalidateQueries({
            queryKey: ['collabs', 'requests', tab === 'pending' ? 'all' : 'pending'],
        });
        queryClient.invalidateQueries({ queryKey: ['studio-posts'] });
        queryClient.invalidateQueries({ queryKey: ['main-notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    const acceptMutation = useMutation({
        mutationFn: (item: CollabRequest) => acceptCollabRequest(item.id, !!trust[item.id]),
        onMutate: (item) => setBusyId(item.id),
        onSuccess: (res, item) => {
            replaceItem(res?.data ?? { ...item, state: 'approved' });
            afterChange();
        },
        onError: (err) => Alert.alert('Could not accept', collabErrorMessage(err)),
        onSettled: () => setBusyId(null),
    });

    const declineMutation = useMutation({
        mutationFn: (item: CollabRequest) => declineCollabRequest(item.id),
        onMutate: (item) => setBusyId(item.id),
        onSuccess: (res, item) => {
            replaceItem(res?.data ?? { ...item, state: 'declined' });
            afterChange();
        },
        onError: (err) => Alert.alert('Could not decline', collabErrorMessage(err)),
        onSettled: () => setBusyId(null),
    });

    const leaveMutation = useMutation({
        mutationFn: (item: CollabRequest) => leaveCollab(item.id),
        onMutate: (item) => setBusyId(item.id),
        onSuccess: (_res, item) => {
            replaceItem({ ...item, state: 'removed' });
            afterChange();
        },
        onError: (err) => Alert.alert('Could not leave', collabErrorMessage(err)),
        onSettled: () => setBusyId(null),
    });

    const confirmDecline = (item: CollabRequest) => {
        Alert.alert(
            'Decline collaboration?',
            `@${item.inviter?.username}'s video stays unpublished until they post it without you.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Decline',
                    style: 'destructive',
                    onPress: () => declineMutation.mutate(item),
                },
            ],
        );
    };

    const confirmLeave = (item: CollabRequest) => {
        Alert.alert(
            'Leave collaboration?',
            `You'll be removed from this video. It stays up on @${item.inviter?.username}'s profile without your credit.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Leave', style: 'destructive', onPress: () => leaveMutation.mutate(item) },
            ],
        );
    };

    // The inviter is the video's author, so their profile feed contains it.
    const openVideo = (item: CollabRequest) => {
        if (item.video?.id && item.inviter?.id) {
            router.push(`/private/profile/feed/${item.video.id}?profileId=${item.inviter.id}`);
        }
    };

    const renderItem = ({ item }: { item: CollabRequest }) => (
        <CollabRow
            item={item}
            isDark={isDark}
            highlighted={!!params.id && String(params.id) === item.id}
            busy={busyId === item.id}
            trust={!!trust[item.id]}
            onToggleTrust={() => setTrust((t) => ({ ...t, [item.id]: !t[item.id] }))}
            onAccept={() => acceptMutation.mutate(item)}
            onDecline={() => confirmDecline(item)}
            onLeave={() => confirmLeave(item)}
            onPreview={() => setPreviewUri(item.video?.src_url ?? null)}
            onOpenProfile={() => router.push(`/private/profile/${item.inviter?.id}`)}
            onOpenVideo={() => openVideo(item)}
        />
    );

    const ListHeader = (
        <View style={tw`px-4 pt-3 pb-3`}>
            <Text style={tw`text-[13px] text-gray-600 dark:text-gray-400 mb-3`}>
                Videos other creators want to post with you as a coauthor. Accepted videos appear on
                your profile too.
            </Text>
            <View style={tw`flex-row`}>
                {TABS.map((t) => {
                    const active = t.id === tab;
                    return (
                        <Pressable
                            key={t.id}
                            onPress={() => setTab(t.id)}
                            style={({ pressed }) => [
                                tw`px-4 py-2 mr-2 rounded-full border`,
                                active
                                    ? tw`bg-black dark:bg-white border-black dark:border-white`
                                    : tw`border-gray-200 dark:border-gray-800`,
                                pressed && tw`opacity-60`,
                            ]}>
                            <Text
                                style={tw.style(
                                    'text-sm font-semibold',
                                    active
                                        ? 'text-white dark:text-black'
                                        : 'text-gray-600 dark:text-gray-400',
                                )}>
                                {t.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );

    const ListEmpty = () => {
        if (isLoading) {
            return (
                <View style={tw`py-16 items-center`}>
                    <ActivityIndicator color={ACCENT} />
                </View>
            );
        }

        return (
            <View style={tw`items-center justify-center py-16 px-8`}>
                <View
                    style={tw`w-20 h-20 rounded-full items-center justify-center bg-gray-100 dark:bg-gray-800 mb-4`}>
                    <Ionicons
                        name={isError ? 'cloud-offline-outline' : 'people-outline'}
                        size={40}
                        color={isDark ? '#6B7280' : '#9CA3AF'}
                    />
                </View>
                <Text style={tw`text-lg font-semibold text-gray-900 dark:text-gray-100`}>
                    {isError ? "Couldn't load invites" : 'No invites right now'}
                </Text>
                <Text style={tw`mt-1 text-sm text-gray-500 dark:text-gray-400 text-center`}>
                    {isError
                        ? 'Pull down to try again.'
                        : 'When a creator invites you to collaborate on a video, it shows up here.'}
                </Text>
            </View>
        );
    };

    return (
        <View style={tw`flex-1 bg-gray-50 dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Collaborations',
                    headerStyle: { backgroundColor: isDark ? '#000' : '#fff' },
                    headerTintColor: isDark ? '#fff' : '#000',
                    headerShadowVisible: false,
                    headerBackTitle: 'Back',
                    headerRight: () => (
                        <Pressable
                            onPress={() => router.push('/private/settings/privacy/collaborations')}
                            hitSlop={8}
                            accessibilityLabel="Collaboration settings">
                            <Ionicons
                                name="settings-outline"
                                size={22}
                                color={isDark ? '#fff' : '#000'}
                            />
                        </Pressable>
                    ),
                }}
            />

            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={ListEmpty}
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <View style={tw`py-6`}>
                            <ActivityIndicator color={ACCENT} />
                        </View>
                    ) : null
                }
                onEndReached={() => {
                    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
                }}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching && !isLoading}
                        onRefresh={refetch}
                        tintColor={ACCENT}
                        colors={[ACCENT]}
                    />
                }
                contentContainerStyle={tw`pb-10`}
            />

            <CollabVideoPreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
        </View>
    );
}
