import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchStarterKitBrowse } from '@/utils/requests';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

interface KitAccount {
    id: string;
    name: string;
    username: string;
    avatar: string;
}

interface StarterKit {
    id: string;
    title: string;
    description: string;
    path: string;
    header_url: string | null;
    icon_url: string | null;
    hashtags: string[];
    approved_accounts: number;
    uses: number;
    creator: KitAccount;
    accounts: KitAccount[];
}

interface BrowseHashtag {
    id: number;
    name: string;
    count: number;
}

interface BrowsePage {
    data: StarterKit[];
    meta: {
        next_cursor: string | null;
        prev_cursor: string | null;
    };
    hashtags: BrowseHashtag[];
}

const formatCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

const KitCard = ({
    item,
    isDark,
    onPress,
}: {
    item: StarterKit;
    isDark: boolean;
    onPress: () => void;
}) => {
    const cardBg = isDark ? '#111111' : '#f9fafb';
    const border = isDark ? 'rgba(255,255,255,0.07)' : '#e5e7eb';
    const textPrimary = isDark ? '#ffffff' : '#000';
    const textSub = isDark ? '#9ca3af' : '#6b7280';
    const textMuted = isDark ? '#6b7280' : '#9ca3af';
    const tagBg = isDark ? '#1f2937' : '#f3f4f6';
    const tagText = isDark ? '#9ca3af' : '#4b5563';
    const divider = isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb';

    const approvedAccounts = item.accounts.filter((a) => (a as any).kit_status === 1);

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPress}
            style={[
                tw`mx-4 mb-3 rounded-2xl overflow-hidden`,
                { backgroundColor: cardBg, borderWidth: 1, borderColor: border },
            ]}>
            {item.header_url ? (
                <Image
                    source={{ uri: item.header_url }}
                    style={{ width: '100%', height: 130 }}
                    resizeMode="cover"
                />
            ) : (
                <View
                    style={[
                        tw`items-center justify-center`,
                        {
                            width: '100%',
                            height: 72,
                            backgroundColor: isDark ? '#1a1a1a' : '#f3f4f6',
                        },
                    ]}>
                    {item.icon_url ? (
                        <Image
                            source={{ uri: item.icon_url }}
                            style={tw`w-10 h-10 rounded-xl`}
                            resizeMode="cover"
                        />
                    ) : (
                        <Ionicons
                            name="albums-outline"
                            size={28}
                            color={isDark ? '#374151' : '#d1d5db'}
                        />
                    )}
                </View>
            )}

            <View style={tw`p-4`}>
                <View style={tw`flex-row items-start justify-between mb-1.5`}>
                    <Text
                        style={[
                            tw`text-base font-bold flex-1 mr-3 leading-snug`,
                            { color: textPrimary },
                        ]}
                        numberOfLines={1}>
                        {item.title}
                    </Text>
                    <View style={tw`flex-row items-center gap-1.5 mt-0.5`}>
                        <Image
                            source={{ uri: item.creator.avatar }}
                            style={tw`w-4 h-4 rounded-full`}
                        />
                        <Text style={[tw`text-xs`, { color: textMuted }]}>
                            @{item.creator.username}
                        </Text>
                    </View>
                </View>

                <Text
                    style={[tw`text-sm leading-relaxed mb-3`, { color: textSub }]}
                    numberOfLines={2}>
                    {item.description}
                </Text>

                {item.hashtags?.length > 0 && (
                    <View style={tw`flex-row flex-wrap gap-1.5 mb-3`}>
                        {item.hashtags.slice(0, 4).map((tag) => (
                            <View
                                key={tag}
                                style={[tw`px-2 py-0.5 rounded-full`, { backgroundColor: tagBg }]}>
                                <Text style={[tw`text-xs font-medium`, { color: tagText }]}>
                                    #{tag}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                <View
                    style={[
                        tw`flex-row items-center justify-between pt-3`,
                        { borderTopWidth: 1, borderTopColor: divider },
                    ]}>
                    <View style={tw`flex-row items-center`}>
                        {approvedAccounts.slice(0, 3).map((a, idx) => (
                            <Image
                                key={a.id}
                                source={{ uri: a.avatar }}
                                style={[
                                    tw`w-6 h-6 rounded-full`,
                                    { borderWidth: 1.5, borderColor: cardBg },
                                    idx > 0 && { marginLeft: -8 },
                                ]}
                            />
                        ))}
                        <Text style={[tw`text-xs ml-2`, { color: textMuted }]}>
                            {formatCount(item.approved_accounts)} accounts
                        </Text>
                    </View>
                    <View style={tw`flex-row items-center gap-1`}>
                        <Feather name="users" size={11} color={textMuted} />
                        <Text style={[tw`text-xs`, { color: textMuted }]}>
                            {formatCount(item.uses)} uses
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function StarterKitsExploreScreen() {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
        useInfiniteQuery<BrowsePage>({
            queryKey: ['starterKitsBrowse'],
            queryFn: async ({ pageParam }) => {
                const res = await fetchStarterKitBrowse({ pageParam });
                return res;
            },
            getNextPageParam: (lastPage) => lastPage.meta?.next_cursor ?? null,
            initialPageParam: null,
        });

    const hashtags: BrowseHashtag[] = data?.pages[0]?.hashtags ?? [];

    const kits: StarterKit[] = useMemo(() => {
        const all = data?.pages.flatMap((page) => page.data ?? []).filter(Boolean) ?? [];
        if (!selectedTag) return all;
        return all.filter((k) =>
            k.hashtags?.some((tag) => tag.toLowerCase() === selectedTag.toLowerCase()),
        );
    }, [data, selectedTag]);

    const textPrimary = isDark ? '#ffffff' : '#000';
    const textMuted = isDark ? '#6b7280' : '#9ca3af';
    const tagSelectedBg = isDark ? '#374151' : '#000';
    const tagUnselectedBg = isDark ? '#1a1a1a' : '#f3f4f6';
    const tagUnselectedText = isDark ? '#a1a9ba' : '#4b5563';

    return (
        <SafeAreaView
            edges={['top']}
            style={[tw`flex-1`, { backgroundColor: isDark ? '#0A0A0A' : '#ffffff' }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={tw`px-4 pt-3 pb-2 flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center gap-3`}>
                    <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                        <Feather
                            name="chevron-left"
                            size={24}
                            color={isDark ? '#ffffff' : '#000'}
                        />
                    </TouchableOpacity>
                    <Text style={[tw`text-2xl font-bold`, { color: textPrimary }]}>
                        Starter Kits
                    </Text>
                </View>
            </View>

            {hashtags.length > 0 && (
                <View style={tw`py-3`}>
                    <FlatList
                        horizontal
                        data={hashtags}
                        keyExtractor={(item) => item.id.toString()}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={tw`px-4`}
                        renderItem={({ item }) => {
                            const isSelected = selectedTag === item.name;
                            return (
                                <PressableHaptics
                                    onPress={() => setSelectedTag(isSelected ? null : item.name)}
                                    style={[
                                        tw`mr-2 px-3.5 py-1.5 rounded-full`,
                                        {
                                            backgroundColor: isSelected
                                                ? tagSelectedBg
                                                : tagUnselectedBg,
                                        },
                                    ]}>
                                    <Text
                                        style={[
                                            tw`text-sm font-semibold`,
                                            { color: isSelected ? '#ffffff' : tagUnselectedText },
                                        ]}>
                                        #{item.name}
                                    </Text>
                                </PressableHaptics>
                            );
                        }}
                    />
                </View>
            )}

            {isLoading ? (
                <View style={tw`flex-1 items-center justify-center`}>
                    <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
                </View>
            ) : kits.length === 0 ? (
                <View style={tw`flex-1 items-center justify-center px-6`}>
                    <Ionicons name="albums-outline" size={40} color={textMuted} />
                    <Text style={[tw`text-base font-semibold mt-3 mb-1`, { color: textPrimary }]}>
                        No Starter Kits found
                    </Text>
                    <Text style={[tw`text-sm text-center`, { color: textMuted }]}>
                        Try a different hashtag or check back later.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={kits}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <KitCard
                            item={item}
                            isDark={isDark}
                            onPress={() => router.push(`/private/kits/show/${item.id}`)}
                        />
                    )}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={tw`pt-1 pb-8`}
                    onEndReachedThreshold={0.4}
                    onEndReached={() => {
                        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
                    }}
                    ListFooterComponent={
                        isFetchingNextPage ? (
                            <View style={tw`py-4 items-center`}>
                                <ActivityIndicator size="small" color={isDark ? '#fff' : '#000'} />
                            </View>
                        ) : null
                    }
                />
            )}
        </SafeAreaView>
    );
}
