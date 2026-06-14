import { useTheme } from '@/contexts/ThemeContext';
import { fetchPlaylistLimits, fetchStudioSummary } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

type Metric = { total: number; change_pct: number };

type StudioPost = {
    id: string;
    hid: string;
    likes: number;
    views: number;
    shares: number;
    comments: number;
    bookmarks: number;
    profile_id: string;
    media?: {
        duration: number;
        width: number;
        height: number;
        thumbnail: string;
        src_url: string;
    };
};

type StudioLink = {
    id: string;
    url: string;
    title: string | null;
    clicks: number;
};

type StudioSummary = {
    range: number;
    views: Metric;
    followers: Metric;
    likes: Metric;
    latest_post: StudioPost | null;
    top_links: StudioLink[];
    recent_posts: StudioPost[];
    total_posts: number;
};

const getHostname = (url: string) => {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
};

const linkLabel = (link: StudioLink) => {
    const host = getHostname(link.url);
    if (!link.title || link.title === link.url) return host;
    return link.title;
};

const linkSubtitle = (link: StudioLink) => {
    const host = getHostname(link.url);
    if (!link.title || link.title === link.url) return null;
    return host;
};

function SectionHeader({
    title,
    onPress,
    showViewAll = true,
}: {
    title: string;
    onPress: () => void;
    showViewAll?: boolean;
}) {
    const { colorScheme } = useTheme();
    const subtleIcon = colorScheme === 'dark' ? '#9ca3af' : '#6b7280';

    return (
        <TouchableOpacity onPress={onPress} style={tw`flex-row items-center justify-between mb-3`}>
            <Text style={tw`text-2xl font-bold text-black dark:text-white`}>{title}</Text>
            {showViewAll && (
                <View style={tw`flex-row items-center`}>
                    <Text style={tw`text-base text-gray-500 dark:text-gray-400 mr-1`}>
                        View all
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={subtleIcon} />
                </View>
            )}
        </TouchableOpacity>
    );
}

function ProfileLinksCard({
    links,
    isLoading,
    onViewAll,
}: {
    links: StudioSummary['top_links'];
    isLoading: boolean;
    onViewAll: () => void;
}) {
    const { colorScheme } = useTheme();
    const subtleIcon = colorScheme === 'dark' ? '#9ca3af' : '#6b7280';

    return (
        <View style={tw`bg-white dark:bg-zinc-950 px-4 pt-5 pb-4 mt-3`}>
            <SectionHeader title="Profile Links" onPress={onViewAll} />

            {isLoading ? (
                <View style={tw`bg-gray-100 dark:bg-zinc-900 rounded-2xl p-4 h-24`} />
            ) : links.length === 0 ? (
                <TouchableOpacity
                    onPress={onViewAll}
                    style={tw`bg-gray-100 dark:bg-zinc-900 rounded-2xl p-5 items-center`}>
                    <View
                        style={tw`w-12 h-12 rounded-full bg-white dark:bg-zinc-800 items-center justify-center mb-2`}>
                        <Ionicons name="link-outline" size={22} color={subtleIcon} />
                    </View>
                    <Text style={tw`text-base font-semibold text-black dark:text-white`}>
                        Add links to your profile
                    </Text>
                    <Text style={tw`text-sm text-gray-500 dark:text-gray-400 mt-1`}>
                        Promote your work, socials, or shop
                    </Text>
                </TouchableOpacity>
            ) : (
                <View style={tw`bg-gray-100 dark:bg-zinc-900 rounded-2xl overflow-hidden`}>
                    {links.map((link, i) => {
                        const label = linkLabel(link);
                        const subtitle = linkSubtitle(link);

                        return (
                            <View key={link.id}>
                                <TouchableOpacity
                                    onPress={onViewAll}
                                    style={tw`flex-row items-center px-4 py-3.5`}>
                                    <View
                                        style={tw`w-9 h-9 rounded-full bg-white dark:bg-zinc-800 items-center justify-center mr-3`}>
                                        <Ionicons name="link" size={16} color={subtleIcon} />
                                    </View>
                                    <View style={tw`flex-1 mr-3`}>
                                        <Text
                                            numberOfLines={1}
                                            style={tw`text-base font-semibold text-black dark:text-white`}>
                                            {label}
                                        </Text>
                                        {subtitle && (
                                            <Text
                                                numberOfLines={1}
                                                style={tw`text-sm text-gray-500 dark:text-gray-400 mt-0.5`}>
                                                {subtitle}
                                            </Text>
                                        )}
                                    </View>
                                    <Text
                                        style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300`}>
                                        {formatNumber(link.clicks)}
                                        <Text
                                            style={tw`text-gray-500 dark:text-gray-500 font-normal`}>
                                            {' '}
                                            clicks
                                        </Text>
                                    </Text>
                                </TouchableOpacity>
                                {i < links.length - 1 && (
                                    <View style={tw`h-px bg-gray-200 dark:bg-zinc-800 ml-16`} />
                                )}
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

function PostsCard({
    posts,
    totalPosts,
    isLoading,
    onViewAll,
    onPostPress,
}: {
    posts: StudioPost[];
    totalPosts: number;
    isLoading: boolean;
    onViewAll: () => void;
    onPostPress: (hid: string, pid: string) => void;
}) {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const subtleIcon = colorScheme === 'dark' ? '#9ca3af' : '#6b7280';

    return (
        <View style={tw`bg-white dark:bg-zinc-950 px-4 pt-5 pb-5 mt-3`}>
            <SectionHeader
                title={totalPosts > 0 ? `Posts (${formatNumber(totalPosts)})` : 'Posts'}
                onPress={onViewAll}
                showViewAll={totalPosts > 0}
            />

            {isLoading ? (
                <View style={tw`flex-row gap-2`}>
                    {[0, 1, 2, 3].map((i) => (
                        <View
                            key={i}
                            style={tw`w-24 h-40 rounded-xl bg-gray-100 dark:bg-zinc-900`}
                        />
                    ))}
                </View>
            ) : posts.length === 0 ? (
                <TouchableOpacity
                    onPress={() => router.push('/create')}
                    style={tw`bg-gray-100 dark:bg-zinc-900 rounded-2xl p-5 items-center`}>
                    <View
                        style={tw`w-12 h-12 rounded-full bg-white dark:bg-zinc-800 items-center justify-center mb-2`}>
                        <Ionicons name="videocam-outline" size={22} color={subtleIcon} />
                    </View>
                    <Text style={tw`text-base font-semibold text-black dark:text-white`}>
                        Share your first post
                    </Text>
                    <Text style={tw`text-sm text-gray-500 dark:text-gray-400 mt-1`}>
                        Your videos will show up here
                    </Text>
                </TouchableOpacity>
            ) : (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={tw`gap-2`}>
                    {posts.map((post) => (
                        <TouchableOpacity
                            key={post.id}
                            onPress={() => onPostPress(post.id, post.profile_id)}
                            style={tw`w-24 h-40 rounded-xl overflow-hidden bg-gray-200 dark:bg-zinc-800`}>
                            {post.media?.thumbnail ? (
                                <Image
                                    source={{ uri: post.media.thumbnail }}
                                    style={tw`w-full h-full`}
                                    contentFit="cover"
                                />
                            ) : (
                                <View style={tw`w-full h-full items-center justify-center`}>
                                    <Ionicons name="videocam" size={20} color={subtleIcon} />
                                </View>
                            )}
                            <View
                                style={tw`absolute bottom-0 left-0 right-0 px-2 py-1.5 flex-row items-center bg-black/40`}>
                                <Ionicons name="play" size={11} color="#fff" />
                                <Text style={tw`text-[10px] font-semibold text-white ml-1`}>
                                    {formatNumber(post.views)} views
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
};

const formatChange = (pct: number) => {
    if (pct === 0) return '0%';
    if (pct > 0) return `+${pct}%`;
    return `${pct}%`;
};

const changeTw = (pct: number) => {
    if (pct > 0) return 'text-green-600 dark:text-green-400';
    if (pct < 0) return 'text-red-600 dark:text-red-400';
    return 'text-black dark:text-white';
};

function StatCard({
    value,
    label,
    changePct,
    isLoading,
}: {
    value: number;
    label: string;
    changePct: number;
    isLoading: boolean;
}) {
    return (
        <View style={tw`flex-1 bg-gray-100 dark:bg-zinc-900 rounded-2xl p-4`}>
            <Text style={tw`text-3xl font-bold text-black dark:text-white`}>
                {isLoading ? '—' : formatNumber(value)}
            </Text>
            <Text style={tw`text-sm text-gray-700 dark:text-gray-300 mt-1`}>{label}</Text>
            <View style={tw`flex-row items-baseline mt-6`}>
                <Text style={tw`text-base font-semibold ${changeTw(changePct)}`}>
                    {isLoading ? '—' : formatChange(changePct)}
                </Text>
                <Text style={tw`text-sm text-gray-500 dark:text-gray-500 ml-1`}>7d</Text>
            </View>
        </View>
    );
}

export default function StudioScreen() {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const subtleIcon = isDark ? '#9ca3af' : '#6b7280';

    const { data, isPending } = useQuery({
        queryKey: ['studio', 'summary', 7],
        queryFn: () => fetchStudioSummary(7),
    });

    const { data: playlistLimits } = useQuery({
        queryKey: ['studio', 'playlistLimits'],
        queryFn: () => fetchPlaylistLimits()
    })

    const followers = data?.followers.total ?? 0;
    const followerLabel = followers === 1 ? 'Net follower' : 'Net followers';

    return (
        <View style={tw`flex-1 bg-gray-100 dark:bg-black`}>
            <Stack.Screen
                options={{
                    headerTitle: 'Loops Studio',
                    title: 'Loops Studio',
                    headerStyle: tw`bg-gray-100 dark:bg-black`,
                    headerTintColor: isDark ? '#fff' : '#000',
                    headerTitleStyle: {
                        fontSize: 22,
                        fontWeight: 'bold',
                        color: isDark ? '#fff' : '#000',
                    },
                    headerBackVisible: false,
                    headerShown: true,
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => {
                                if (router.canGoBack()) router.back();
                                else router.push('/(tabs)');
                            }}
                            style={tw`px-1`}>
                            <Ionicons
                                name="chevron-back"
                                size={24}
                                color={isDark ? '#fff' : '#000'}
                            />
                        </TouchableOpacity>
                    ),
                }}
            />

            <ScrollView style={tw`flex-1`} contentContainerStyle={tw`pb-8`}>
                <View style={tw`bg-white dark:bg-zinc-950 px-4 pt-5 pb-4`}>
                    <TouchableOpacity
                        onPress={() => router.push('/private/studio/analytics')}
                        style={tw`flex-row items-center justify-between mb-4`}>
                        <Text style={tw`text-2xl font-bold text-black dark:text-white`}>
                            Analytics
                        </Text>
                        <View style={tw`flex-row items-center`}>
                            <Text style={tw`text-base text-gray-500 dark:text-gray-400 mr-1`}>
                                View all
                            </Text>
                            <Ionicons name="chevron-forward" size={18} color={subtleIcon} />
                        </View>
                    </TouchableOpacity>

                    <View style={tw`flex-row gap-2`}>
                        <StatCard
                            value={data?.views.total ?? 0}
                            label="Post views"
                            changePct={data?.views.change_pct ?? 0}
                            isLoading={isPending}
                        />
                        <StatCard
                            value={followers}
                            label={followerLabel}
                            changePct={data?.followers.change_pct ?? 0}
                            isLoading={isPending}
                        />
                        <StatCard
                            value={data?.likes.total ?? 0}
                            label="Likes"
                            changePct={data?.likes.change_pct ?? 0}
                            isLoading={isPending}
                        />
                    </View>

                    {data?.latest_post && (
                        <TouchableOpacity
                            disabled={!data?.latest_post}
                            onPress={() => {
                                if (data?.latest_post) {
                                    router.push(
                                        `/private/profile/feed/${data.latest_post.id}?profileId=${data.latest_post.profile_id}`,
                                    );
                                }
                            }}
                            style={tw`flex-row items-center justify-between bg-gray-100 dark:bg-zinc-900 rounded-2xl px-4 py-4 mt-3`}>
                            <Text style={tw`text-base font-bold text-black dark:text-white`}>
                                Your latest post
                            </Text>

                            <View style={tw`flex-row items-center`}>
                                <View style={tw`flex-row items-center mr-4`}>
                                    <Ionicons name="heart" size={16} color={subtleIcon} />
                                    <Text
                                        style={tw`ml-1 text-base text-gray-700 dark:text-gray-300`}>
                                        {isPending ? '—' : (data?.latest_post?.likes ?? 0)}
                                    </Text>
                                </View>
                                <View style={tw`flex-row items-center mr-2`}>
                                    <Ionicons
                                        name="chatbubble-outline"
                                        size={16}
                                        color={subtleIcon}
                                    />
                                    <Text
                                        style={tw`ml-1 text-base text-gray-700 dark:text-gray-300`}>
                                        {isPending ? '—' : (data?.latest_post?.comments ?? 0)}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={subtleIcon} />
                            </View>
                        </TouchableOpacity>
                    )}

                    {!playlistLimits?.feature_unavailable && (
                        <TouchableOpacity
                            disabled={!playlistLimits?.can_create}
                            onPress={() => router.push('/private/studio/playlists')}
                            style={tw`flex-row items-center justify-between bg-gray-100 dark:bg-zinc-900 rounded-2xl px-4 py-4 mt-3`}>
                            <Text style={tw`text-base font-bold text-black dark:text-white`}>
                                Playlists
                            </Text>

                            <View style={tw`flex-row items-center`}>
                                <View style={tw`flex-row items-center mr-4`}>
                                    <Text
                                        style={tw`ml-1 text-base font-bold text-gray-700 dark:text-gray-300`}>
                                        {  playlistLimits?.max_limit - playlistLimits?.slots_available}
                                    </Text>
                                    <Text
                                        style={tw`ml-1 text-base text-gray-400 dark:text-gray-500`}>
                                        / {playlistLimits?.max_limit}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={subtleIcon} />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                <ProfileLinksCard
                    links={data?.top_links ?? []}
                    isLoading={isPending}
                    onViewAll={() => router.push('/private/studio/links')}
                />

                <PostsCard
                    posts={data?.recent_posts ?? []}
                    totalPosts={data?.total_posts ?? 0}
                    isLoading={isPending}
                    onViewAll={() => router.push('/private/studio/posts')}
                    onPostPress={(hid, pid) =>
                        router.push(`/private/profile/feed/${hid}?profileId=${pid}`)
                    }
                />

                <View style={tw.style('h-50')}></View>
            </ScrollView>
        </View>
    );
}
