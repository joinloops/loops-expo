import { useTheme } from '@/contexts/ThemeContext';
import { fetchProfileLinkAnalytics, fetchProfileLinks } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert, FlatList, Linking, Pressable, RefreshControl, Text, View } from 'react-native';
import tw from 'twrnc';

const ACCENT = '#F02C56';

interface ProfileLink {
    id: string;
    url: string;
    url_pretty: string;
    created_at: string;
}

interface LinksResponse {
    data: {
        id: string;
        min_threshold: number;
        total_allowed: number;
        available_slots: number;
        can_add: boolean;
        links: ProfileLink[];
    };
}

interface LinkAnalytics {
    url: string;
    clicks: number;
}

interface AnalyticsResponse {
    data: LinkAnalytics[];
}

interface MergedLink extends ProfileLink {
    clicks: number;
    pct: number;
}

function formatRelativeDate(iso: string): string {
    const then = new Date(iso).getTime();
    const diff = Math.max(0, Date.now() - then);
    const d = Math.floor(diff / 86_400_000);
    if (d < 1) return 'today';
    if (d < 7) return `${d}d ago`;
    if (d < 30) return `${Math.floor(d / 7)}w ago`;
    if (d < 365) return `${Math.floor(d / 30)}mo ago`;
    return `${Math.floor(d / 365)}y ago`;
}

function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
    return n.toLocaleString();
}

function LinkRow({
    link,
    isDark,
    onPress,
}: {
    link: MergedLink;
    isDark: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                tw`px-4 py-4 bg-white dark:bg-black`,
                pressed && tw`bg-gray-50 dark:bg-gray-800`,
            ]}>
            <View style={tw`flex-row items-start`}>
                <View
                    style={tw`w-10 h-10 rounded-full items-center justify-center bg-gray-100 dark:bg-gray-800 mr-3 mt-0.5`}>
                    <Ionicons name="link" size={18} color={isDark ? '#D1D5DB' : '#4B5563'} />
                </View>

                <View style={tw`flex-1`}>
                    <Text
                        numberOfLines={1}
                        style={tw`text-[15px] font-medium text-gray-900 dark:text-gray-100`}>
                        {link.url_pretty}
                    </Text>

                    <View style={tw`flex-row items-center mt-1`}>
                        <Ionicons
                            name="bar-chart-outline"
                            size={12}
                            color={isDark ? '#9CA3AF' : '#6B7280'}
                        />
                        <Text style={tw`ml-1 text-xs text-gray-500 dark:text-gray-400`}>
                            {formatCount(link.clicks)} {link.clicks === 1 ? 'click' : 'clicks'}
                        </Text>
                        <Text style={tw`mx-2 text-xs text-gray-400 dark:text-gray-600`}>·</Text>
                        <Text style={tw`text-xs text-gray-500 dark:text-gray-400`}>
                            Added {formatRelativeDate(link.created_at)}
                        </Text>
                    </View>

                    <View
                        style={tw`mt-3 h-1 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800`}>
                        <View
                            style={[
                                tw`h-full rounded-full`,
                                {
                                    width: `${Math.max(link.clicks > 0 ? 4 : 0, link.pct * 100)}%`,
                                    backgroundColor: ACCENT,
                                },
                            ]}
                        />
                    </View>
                </View>

                <Ionicons
                    name="open-outline"
                    size={18}
                    color={isDark ? '#6B7280' : '#9CA3AF'}
                    style={tw`ml-2 mt-1`}
                />
            </View>
        </Pressable>
    );
}

function SkeletonRow({ isDark }: { isDark: boolean }) {
    const bar = isDark ? 'bg-gray-800' : 'bg-gray-200';
    return (
        <View style={tw`px-4 py-4 flex-row items-start`}>
            <View style={tw`w-10 h-10 rounded-full ${bar} mr-3`} />
            <View style={tw`flex-1`}>
                <View style={tw`h-4 rounded-full ${bar} w-3/4`} />
                <View style={tw`h-3 rounded-full ${bar} w-1/2 mt-2`} />
                <View style={tw`h-1 rounded-full ${bar} w-full mt-3`} />
            </View>
        </View>
    );
}

export default function ProfileLinksScreen() {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    const linksQuery = useQuery<LinksResponse>({
        queryKey: ['profile-links'],
        queryFn: fetchProfileLinks,
        staleTime: 30_000,
    });

    const analyticsQuery = useQuery<AnalyticsResponse>({
        queryKey: ['profile-link-analytics'],
        queryFn: fetchProfileLinkAnalytics,
        staleTime: 30_000,
    });

    const isLoading = linksQuery.isLoading || analyticsQuery.isLoading;
    const isRefetching = linksQuery.isRefetching || analyticsQuery.isRefetching;
    const isError = linksQuery.isError || analyticsQuery.isError;

    const meta = linksQuery.data?.data;
    const links = meta?.links ?? [];

    const merged = useMemo<MergedLink[]>(() => {
        const clickMap = new Map<string, number>();
        analyticsQuery.data?.data.forEach((a) => clickMap.set(a.url, a.clicks));

        const totalClicks = links.reduce((sum, l) => sum + (clickMap.get(l.url) ?? 0), 0);

        return links
            .map((l) => {
                const clicks = clickMap.get(l.url) ?? 0;
                return {
                    ...l,
                    clicks,
                    pct: totalClicks > 0 ? clicks / totalClicks : 0,
                };
            })
            .sort((a, b) => b.clicks - a.clicks);
    }, [links, analyticsQuery.data]);

    const totalClicks = useMemo(() => merged.reduce((s, l) => s + l.clicks, 0), [merged]);

    const isThresholdLocked =
        !!meta && !meta.can_add && (meta.total_allowed === 0 || meta.available_slots > 0);

    const onRefresh = useCallback(() => {
        linksQuery.refetch();
        analyticsQuery.refetch();
    }, [linksQuery, analyticsQuery]);

    const handleAdd = useCallback(() => {
        router.push('/private/settings/account/edit-links');
    }, [router]);

    const handleManage = useCallback(() => {
        router.push('/private/settings/account/edit-links');
    }, [router]);

    const handleOpenLink = useCallback(async (url: string) => {
        try {
            const can = await Linking.canOpenURL(url);
            if (!can) throw new Error('not supported');
            await Linking.openURL(url);
        } catch {
            Alert.alert('Could not open link', url);
        }
    }, []);

    const renderItem = useCallback(
        ({ item }: { item: MergedLink }) => (
            <LinkRow link={item} isDark={isDark} onPress={() => handleOpenLink(item.url)} />
        ),
        [isDark, handleOpenLink],
    );

    const keyExtractor = useCallback((item: MergedLink) => item.id, []);

    const ItemSeparator = useCallback(
        () => <View style={[tw`h-px bg-gray-100 dark:bg-gray-800`, { marginLeft: 68 }]} />,
        [],
    );

    const Header = (
        <View style={tw`px-4 pt-4 pb-3 bg-white dark:bg-black`}>
            <View style={tw`flex-row items-center justify-between`}>
                <View>
                    <Text
                        style={tw`text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400`}>
                        Total clicks
                    </Text>
                    <Text style={tw`mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100`}>
                        {formatCount(totalClicks)}
                    </Text>
                </View>

                {meta && (
                    <View style={tw`items-end`}>
                        <Text style={tw`text-xs text-gray-500 dark:text-gray-400`}>
                            {merged.length} of {meta.total_allowed} slots used
                        </Text>
                        {meta.can_add ? (
                            <Pressable
                                onPress={handleAdd}
                                style={({ pressed }) => [
                                    tw`mt-2 flex-row items-center px-3 py-1.5 rounded-full`,
                                    { backgroundColor: ACCENT },
                                    pressed && tw`opacity-80`,
                                ]}>
                                <Ionicons name="add" size={16} color="#fff" />
                                <Text style={tw`ml-1 text-xs font-semibold text-white`}>
                                    Add link
                                </Text>
                            </Pressable>
                        ) : isThresholdLocked ? (
                            <View
                                style={tw`mt-2 flex-row items-center px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800`}>
                                <Ionicons
                                    name="lock-closed"
                                    size={12}
                                    color={isDark ? '#9CA3AF' : '#6B7280'}
                                />
                                <Text
                                    style={tw`ml-1 text-xs font-semibold text-gray-600 dark:text-gray-300`}>
                                    {meta.min_threshold}+ followers to add
                                </Text>
                            </View>
                        ) : (
                            <Pressable
                                onPress={handleManage}
                                style={({ pressed }) => [
                                    tw`mt-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800`,
                                    pressed && tw`opacity-70`,
                                ]}>
                                <Text
                                    style={tw`text-xs font-semibold text-gray-700 dark:text-gray-200`}>
                                    Manage
                                </Text>
                            </Pressable>
                        )}
                    </View>
                )}
            </View>
        </View>
    );

    const ListEmpty = () => {
        if (isLoading) {
            return (
                <View>
                    {Array.from({ length: 4 }).map((_, i) => (
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
                        Couldn't load links
                    </Text>
                    <Text style={tw`mt-1 text-sm text-gray-500 dark:text-gray-400 text-center`}>
                        Pull down to try again, or check your connection.
                    </Text>
                </View>
            );
        }
        return (
            <View style={tw`items-center justify-center py-20 px-8`}>
                <View
                    style={tw`w-20 h-20 rounded-full items-center justify-center bg-gray-100 dark:bg-gray-800 mb-4`}>
                    <Ionicons
                        name={isThresholdLocked ? 'lock-closed-outline' : 'link'}
                        size={36}
                        color={isDark ? '#6B7280' : '#9CA3AF'}
                    />
                </View>
                <Text style={tw`text-lg font-semibold text-gray-900 dark:text-gray-100`}>
                    {isThresholdLocked ? 'Profile links are locked' : 'No profile links yet'}
                </Text>
                <Text style={tw`mt-1 text-sm text-gray-500 dark:text-gray-400 text-center`}>
                    {isThresholdLocked
                        ? `You'll be able to add profile links and track their clicks once you reach ${meta?.min_threshold ?? 5} followers.`
                        : `Add up to ${meta?.total_allowed || 5} links to your profile and track how often each one gets clicked.`}
                </Text>
                {!isThresholdLocked && (
                    <Pressable
                        onPress={handleAdd}
                        style={({ pressed }) => [
                            tw`mt-6 flex-row items-center px-6 py-3 rounded-xl`,
                            { backgroundColor: ACCENT },
                            pressed && tw`opacity-80`,
                        ]}>
                        <Ionicons name="add" size={18} color="#fff" />
                        <Text style={tw`ml-1.5 text-white font-semibold`}>Add your first link</Text>
                    </Pressable>
                )}
            </View>
        );
    };

    const Footer = () => {
        if (merged.length === 0 || !meta) return null;
        let label: string;
        if (meta.can_add) {
            label = `${meta.available_slots} ${meta.available_slots === 1 ? 'slot' : 'slots'} available`;
        } else if (isThresholdLocked) {
            label = `Reach ${meta.min_threshold} followers to add more links`;
        } else {
            label = 'All slots used';
        }
        return (
            <View style={tw`px-4 py-6`}>
                <Text style={tw`text-xs text-gray-400 dark:text-gray-500 text-center`}>
                    {label}
                </Text>
            </View>
        );
    };

    return (
        <View style={tw`flex-1 bg-white dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Profile Links',
                    headerStyle: { backgroundColor: isDark ? '#000' : '#ffffff' },
                    headerTintColor: isDark ? '#F3F4F6' : '#000',
                    headerShadowVisible: false,
                    headerTitleStyle: {
                        fontSize: 22,
                        fontWeight: 'bold',
                        color: colorScheme === 'dark' ? '#fff' : '#000',
                    },
                    headerBackTitle: 'Studio',
                }}
            />

            <FlatList
                data={merged}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                ItemSeparatorComponent={ItemSeparator}
                ListHeaderComponent={merged.length > 0 || isLoading ? Header : null}
                ListEmptyComponent={ListEmpty}
                ListFooterComponent={Footer}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching && !isLoading}
                        onRefresh={onRefresh}
                        tintColor={ACCENT}
                        colors={[ACCENT]}
                    />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={merged.length === 0 ? tw`flex-grow` : undefined}
            />
        </View>
    );
}
