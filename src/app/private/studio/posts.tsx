import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { StackText } from '@/components/ui/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchStudioPosts } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    Text,
    TextInput,
    View,
} from 'react-native';
import tw from 'twrnc';

const ACCENT = '#F02C56';

type MetricId = 'all' | 'pinned' | 'processing';

type PostStatus = 'published' | 'processing';

interface StudioPost {
    id: number | string;
    hid: string;
    caption: string;
    created_at: string;
    status: PostStatus;
    likes: number;
    comments: number;
    media: { thumbnail: string };
}

interface PostsPage {
    data: StudioPost[];
    meta: {
        next_cursor: string | null;
        prev_cursor: string | null;
        per_page: number;
        total_videos: number;
    };
}

const THUMB_W = 62;
const THUMB_H = 96;

function useDebouncedValue<T>(value: T, delay = 300): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

function formatRelativeDate(iso: string): string {
    const then = new Date(iso).getTime();
    const diff = Math.max(0, Date.now() - then);
    const m = Math.floor(diff / 60_000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    const w = Math.floor(d / 7);
    if (w < 5) return `${w}w ago`;
    return new Date(iso).toLocaleDateString();
}

function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
    return n.toLocaleString();
}

interface Tab {
    id: MetricId;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    activeIcon: React.ComponentProps<typeof Ionicons>['name'];
}

const TABS: Tab[] = [
    { id: 'all', label: 'All Posts', icon: 'play-outline', activeIcon: 'play' },
    { id: 'pinned', label: 'Pinned', icon: 'pin-outline', activeIcon: 'pin' },
    { id: 'processing', label: 'Processing', icon: 'timer-outline', activeIcon: 'timer' },
];

interface TabPillProps {
    tab: Tab;
    active: boolean;
    onPress: () => void;
    colorScheme: 'light' | 'dark';
}

const TabPill = ({ tab, active, onPress, colorScheme }: TabPillProps) => {
    const iconColor = active
        ? colorScheme === 'dark'
            ? '#000'
            : '#FFF'
        : colorScheme === 'dark'
          ? '#9CA3AF'
          : '#6B7280';

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                tw`flex-row items-center px-4 py-2 mr-2 rounded-full border`,
                active
                    ? tw`bg-black dark:bg-white border-black dark:border-white`
                    : tw`bg-transparent border-gray-200 dark:border-gray-800`,
                pressed && tw`opacity-60`,
            ]}>
            <Ionicons
                name={active ? tab.activeIcon : tab.icon}
                size={15}
                color={iconColor}
                style={tw`mr-1.5`}
            />
            <StackText
                fontSize="$3"
                fontWeight="semibold"
                textColor={
                    active ? 'text-white dark:text-black' : 'text-gray-600 dark:text-gray-400'
                }>
                {tab.label}
            </StackText>
        </Pressable>
    );
};

const PostRow = memo(function PostRow({
    post,
    isDark,
    onPress,
}: {
    post: StudioPost;
    isDark: boolean;
    onPress: () => void;
}) {
    const isProcessing = post.status === 'processing';
    const mutedIcon = isDark ? '#9CA3AF' : '#6B7280';

    return (
        <Pressable
            onPress={onPress}
            disabled={isProcessing}
            style={({ pressed }) => [
                tw`flex-row px-4 py-3 bg-white dark:bg-black`,
                pressed && tw`bg-gray-50 dark:bg-gray-800`,
            ]}>
            <View>
                <Image
                    source={post.media?.thumbnail}
                    style={[
                        tw`rounded-lg border border-gray-300 dark:border-gray-800 bg-gray-200 dark:bg-gray-800`,
                        { width: THUMB_W, height: THUMB_H },
                    ]}
                    contentFit="cover"
                    transition={150}
                    cachePolicy="memory-disk"
                    recyclingKey={String(post.id)}
                />
                {isProcessing && (
                    <View
                        style={[
                            tw`absolute rounded-lg bg-black/60 items-center justify-center`,
                            { width: THUMB_W, height: THUMB_H },
                        ]}>
                        <ActivityIndicator color="#fff" size="small" />
                    </View>
                )}
            </View>

            <View style={tw`flex-1 ml-3 justify-between`}>
                <View>
                    <Text
                        numberOfLines={2}
                        style={tw`text-[15px] font-medium leading-5 text-gray-900 dark:text-gray-100`}>
                        {post.caption || 'Untitled video'}
                    </Text>
                    <Text style={tw`mt-1 text-xs text-gray-500 dark:text-gray-400`}>
                        {formatRelativeDate(post.created_at)}
                    </Text>
                </View>

                <View style={tw`flex-row items-center justify-between mt-2`}>
                    <View style={tw`flex-row items-center`}>
                        <View
                            style={tw.style(
                                'px-2 py-0.5 rounded-full mr-3',
                                isProcessing
                                    ? 'bg-yellow-100 dark:bg-yellow-900/40'
                                    : 'bg-green-100 dark:bg-green-900/40',
                            )}>
                            <Text
                                style={tw.style(
                                    'text-[10px] font-semibold uppercase tracking-wide',
                                    isProcessing
                                        ? 'text-yellow-800 dark:text-yellow-200'
                                        : 'text-green-700 dark:text-green-200',
                                )}>
                                {post.status}
                            </Text>
                        </View>

                        {post.pinned && (
                            <View
                                style={tw.style(
                                    'px-2 py-0.5 rounded-full mr-3 bg-red-100 dark:bg-red-900/40',
                                )}>
                                <Text
                                    style={tw.style(
                                        'text-[10px] font-semibold uppercase tracking-wide text-red-800 dark:text-red-200',
                                    )}>
                                    Pinned
                                </Text>
                            </View>
                        )}

                        {!isProcessing && (
                            <View style={tw`flex-row items-center`}>
                                <Ionicons name="heart-outline" size={14} color={mutedIcon} />
                                <Text
                                    style={tw`ml-1 mr-3 text-xs text-gray-500 dark:text-gray-400`}>
                                    {formatCount(post.likes ?? 0)}
                                </Text>
                                <Ionicons name="chatbubble-outline" size={13} color={mutedIcon} />
                                <Text style={tw`ml-1 text-xs text-gray-500 dark:text-gray-400`}>
                                    {formatCount(post.comments ?? 0)}
                                </Text>
                            </View>
                        )}
                    </View>

                    {!isProcessing && (
                        <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={isDark ? '#6B7280' : '#9CA3AF'}
                        />
                    )}
                </View>
            </View>
        </Pressable>
    );
});

function SkeletonRow({ isDark }: { isDark: boolean }) {
    const bar = isDark ? 'bg-gray-800' : 'bg-gray-200';
    return (
        <View style={tw`flex-row px-4 py-3`}>
            <View style={[tw`rounded-lg ${bar}`, { width: THUMB_W, height: THUMB_H }]} />
            <View style={tw`flex-1 ml-3 justify-between`}>
                <View>
                    <View style={tw`h-3.5 rounded-full ${bar} w-11/12`} />
                    <View style={tw`h-3.5 rounded-full ${bar} w-2/3 mt-2`} />
                    <View style={tw`h-2.5 rounded-full ${bar} w-1/3 mt-3`} />
                </View>
                <View style={tw`h-4 rounded-full ${bar} w-1/2`} />
            </View>
        </View>
    );
}

export default function StudioPostsScreen() {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const [activeTab, setActiveTab] = useState<MetricId>('all');

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search.trim(), 300);

    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        refetch,
        isRefetching,
        isError,
    } = useInfiniteQuery<PostsPage>({
        queryKey: ['studio-posts', debouncedSearch, activeTab],
        queryFn: ({ pageParam }) =>
            fetchStudioPosts({
                cursor: pageParam as string | null,
                search: debouncedSearch,
                limit: 20,
                filter: activeTab,
            }),
        initialPageParam: null,
        getNextPageParam: (last) => last.meta?.next_cursor ?? undefined,
        staleTime: 30_000,
    });

    const posts = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
    const total = data?.pages[0]?.meta.total_videos ?? 0;

    const onEndReached = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const handlePress = useCallback(
        (post: StudioPost) => {
            if (post.status === 'processing') return;
            router.push(`/private/video/edit/${post.id}`);
        },
        [router],
    );

    const renderItem = useCallback(
        ({ item }: { item: StudioPost }) => (
            <PostRow post={item} isDark={isDark} onPress={() => handlePress(item)} />
        ),
        [isDark, handlePress],
    );

    const keyExtractor = useCallback((item: StudioPost) => String(item.id), []);

    const ItemSeparator = useCallback(
        () => (
            <View style={[tw`h-px bg-gray-100 dark:bg-gray-800`, { marginLeft: THUMB_W + 28 }]} />
        ),
        [],
    );

    const ListHeader = (
        <View style={tw`px-4 pt-3 pb-3 bg-white dark:bg-black`}>
            <FlatList
                data={TABS}
                keyExtractor={(t) => t.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={tw`pb-3`}
                renderItem={({ item }) => (
                    <TabPill
                        tab={item}
                        active={item.id === activeTab}
                        onPress={() => setActiveTab(item.id)}
                        colorScheme={colorScheme}
                    />
                )}
            />
            {activeTab === 'all' && (
                <>
                    <View
                        style={tw`flex-row items-center px-3 h-10 rounded-xl bg-gray-100 dark:bg-gray-800`}>
                        <Ionicons name="search" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search by caption"
                            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                            style={tw`flex-1 ml-2 text-[15px] text-gray-900 dark:text-gray-100`}
                            returnKeyType="search"
                            autoCorrect={false}
                            autoCapitalize="none"
                        />
                        {search.length > 0 && (
                            <Pressable hitSlop={8} onPress={() => setSearch('')}>
                                <Ionicons
                                    name="close-circle"
                                    size={18}
                                    color={isDark ? '#6B7280' : '#9CA3AF'}
                                />
                            </Pressable>
                        )}
                    </View>

                    {total > 0 && !debouncedSearch && (
                        <Text style={tw`mt-3 text-xs text-gray-500 dark:text-gray-400`}>
                            {total.toLocaleString()} {total === 1 ? 'post' : 'posts'}
                        </Text>
                    )}
                    {debouncedSearch && !isLoading && (
                        <Text style={tw`mt-3 text-xs text-gray-500 dark:text-gray-400`}>
                            {posts.length.toLocaleString()}{' '}
                            {posts.length === 1 ? 'result' : 'results'} for "{debouncedSearch}"
                        </Text>
                    )}
                </>
            )}
        </View>
    );

    const ListEmpty = () => {
        if (isLoading) {
            return (
                <View>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonRow key={i} isDark={isDark} />
                    ))}
                </View>
            );
        }
        if (isError) {
            return (
                <View style={tw`items-center justify-center py-20 px-8`}>
                    <Ionicons
                        name="cloud-offline-outline"
                        size={56}
                        color={isDark ? '#4B5563' : '#9CA3AF'}
                    />
                    <Text style={tw`mt-4 text-base font-semibold text-gray-900 dark:text-gray-100`}>
                        Couldn't load posts
                    </Text>
                    <Text style={tw`mt-1 text-sm text-gray-500 dark:text-gray-400 text-center`}>
                        Pull down to try again, or check your connection.
                    </Text>
                </View>
            );
        }

        if (activeTab != 'all') {
            return (
                <View style={tw`items-center justify-center py-20 px-8`}>
                    <View
                        style={tw`w-20 h-20 rounded-full items-center justify-center bg-gray-100 dark:bg-gray-800 mb-4`}>
                        <Ionicons
                            name="file-tray-outline"
                            size={40}
                            color={isDark ? '#6B7280' : '#9CA3AF'}
                        />
                    </View>
                    <Text style={tw`mt-4 text-2xl font-semibold text-gray-900 dark:text-gray-100`}>
                        No posts found
                    </Text>
                    <Text style={tw`mt-1 text-lg text-gray-500 dark:text-gray-400 text-center`}>
                        We couldn't find any {activeTab} posts!
                    </Text>
                    {!debouncedSearch && (
                        <PressableHaptics
                            onPress={() => router.push('/create')}
                            style={({ pressed }) => [
                                tw`mt-6 px-6 py-3 rounded-xl`,
                                { backgroundColor: ACCENT },
                                pressed && tw`opacity-80`,
                            ]}>
                            <Text style={tw`text-white font-semibold text-lg`}>
                                Capture or Upload a video
                            </Text>
                        </PressableHaptics>
                    )}
                </View>
            );
        }
        return (
            <View style={tw`items-center justify-center py-20 px-8`}>
                <View
                    style={tw`w-20 h-20 rounded-full items-center justify-center bg-gray-100 dark:bg-gray-800 mb-4`}>
                    <Ionicons
                        name="videocam-outline"
                        size={40}
                        color={isDark ? '#6B7280' : '#9CA3AF'}
                    />
                </View>
                <Text style={tw`text-2xl font-semibold text-gray-900 dark:text-gray-100`}>
                    {debouncedSearch ? 'No matches' : 'No posts yet'}
                </Text>
                <Text style={tw`mt-1 text-lg text-gray-500 dark:text-gray-400 text-center`}>
                    {debouncedSearch
                        ? `Nothing matches "${debouncedSearch}".`
                        : 'Your published and processing videos will appear here.'}
                </Text>
                {!debouncedSearch && (
                    <PressableHaptics
                        onPress={() => router.push('/create')}
                        style={({ pressed }) => [
                            tw`mt-6 px-6 py-3 rounded-xl`,
                            { backgroundColor: ACCENT },
                            pressed && tw`opacity-80`,
                        ]}>
                        <Text style={tw`text-white font-semibold text-lg`}>
                            Upload your first video
                        </Text>
                    </PressableHaptics>
                )}
            </View>
        );
    };

    const ListFooter = () => {
        if (isFetchingNextPage) {
            return (
                <View style={tw`py-6`}>
                    <ActivityIndicator color={ACCENT} />
                </View>
            );
        }
        if (!hasNextPage && posts.length > 0) {
            return (
                <View style={tw`py-8 items-center`}>
                    <Text style={tw`text-xs text-gray-400 dark:text-gray-500`}>
                        You've reached the end
                    </Text>
                </View>
            );
        }
        return null;
    };

    return (
        <View style={tw`flex-1 bg-white dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'My Posts',
                    headerStyle: { backgroundColor: isDark ? '#000' : '#ffffff' },
                    headerTintColor: isDark ? '#F3F4F6' : '#000',
                    headerTitleStyle: {
                        fontSize: 22,
                        fontWeight: 'bold',
                        color: colorScheme === 'dark' ? '#fff' : '#000',
                    },
                    headerShadowVisible: false,
                    headerBackTitle: 'Studio',
                }}
            />

            <FlatList
                data={posts}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                ItemSeparatorComponent={ItemSeparator}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={ListEmpty}
                ListFooterComponent={ListFooter}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.6}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching && !isLoading}
                        onRefresh={refetch}
                        tintColor={ACCENT}
                        colors={[ACCENT]}
                    />
                }
                showsVerticalScrollIndicator={false}
                initialNumToRender={8}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews
                contentContainerStyle={posts.length === 0 ? tw`flex-grow` : undefined}
                keyboardDismissMode="on-drag"
            />
        </View>
    );
}
