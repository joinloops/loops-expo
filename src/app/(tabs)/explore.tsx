import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { XStack } from '@/components/ui/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/utils/authStore';
import { Storage } from '@/utils/cache';
import {
    followAccount,
    getExploreAccounts,
    getExploreTags,
    getExploreTagsFeed,
    postExploreAccountHideSuggestion,
} from '@/utils/requests';
import { Feather } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

const { width } = Dimensions.get('window');
const ACCOUNT_CARD_WIDTH = 160;
const TAG_CARD_WIDTH = 120;
const VIDEO_THUMBNAIL_WIDTH = (width - 24) / 3;

interface Tag {
    id: number;
    name: string;
    count: number;
}

interface Account {
    id: string;
    name: string;
    avatar: string;
    username: string;
    bio: string;
    follower_count: number;
    post_count?: number;
}

interface Video {
    id: string;
    hid: string;
    account: {
        id: string;
        name: string;
        username: string;
        avatar: string;
    } | null;
    caption: string;
    url: string;
    likes: number;
    comments: number;
    media: {
        duration: number;
        width: number;
        height: number;
        thumbnail: string;
    } | null;
}

// Validation helpers
const isValidAccount = (account: Account | null | undefined): account is Account => {
    return !!(
        account?.id &&
        account?.username &&
        account?.avatar &&
        account?.name
    );
};

const isValidVideo = (video: Video | null | undefined): video is Video => {
    return !!(
        video?.id &&
        video?.account &&
        isValidAccount(video.account) &&
        video?.media?.thumbnail
    );
};

const isValidTag = (tag: Tag | null | undefined): tag is Tag => {
    return !!(
        tag?.id &&
        tag?.name &&
        typeof tag?.count === 'number'
    );
};

export default function ExploreScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const token = Storage.getString('app.token');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [followingAccountId, setFollowingAccountId] = useState<string | null>(null);
    const [hidingAccountId, setHidingAccountId] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const { colorScheme } = useTheme();

    const { data: tagsData, isLoading: tagsLoading, isError: tagsError } = useQuery({
        queryKey: ['explore', 'tags'],
        queryFn: getExploreTags,
        retry: 2,
    });

    const { data: accountsData, isLoading: accountsLoading, isError: accountsError } = useQuery({
        queryKey: ['accounts', 'suggested'],
        queryFn: getExploreAccounts,
        retry: 2,
    });

    const validTags = useMemo(() => {
        if (!Array.isArray(tagsData)) return [];
        return tagsData.filter(isValidTag);
    }, [tagsData]);

    const validAccounts = useMemo(() => {
        if (!Array.isArray(accountsData)) return [];
        return accountsData.filter(isValidAccount);
    }, [accountsData]);

    const {
        data: videosData,
        isLoading: videosLoading,
        isError: videosError,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ['explore', 'tag-feed', selectedTag || validTags?.[0]?.name],
        queryFn: getExploreTagsFeed,
        getNextPageParam: (lastPage) => lastPage?.meta?.next_cursor,
        enabled: validTags.length > 0,
        initialPageParam: null,
        retry: 2,
    });

    const followMutation = useMutation({
        mutationFn: async (profileId: string) => {
            setFollowingAccountId(profileId);
            return await followAccount(profileId);
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['accounts', 'suggested'] });
        },
        onSettled: () => {
            setFollowingAccountId(null);
        },
    });

    const hideSuggestionMutation = useMutation({
        mutationFn: async (profileId: string) => {
            setHidingAccountId(profileId);
            return await postExploreAccountHideSuggestion(profileId);
        },
        onMutate: async (profileId) => {
            await queryClient.cancelQueries({ queryKey: ['accounts', 'suggested'] });

            const previousAccounts = queryClient.getQueryData(['accounts', 'suggested']);

            queryClient.setQueryData(['accounts', 'suggested'], (old: Account[] | undefined) => {
                return old?.filter((account) => account.id !== profileId) || [];
            });

            return { previousAccounts };
        },
        onError: (err, profileId, context) => {
            if (context?.previousAccounts) {
                queryClient.setQueryData(['accounts', 'suggested'], context.previousAccounts);
            }
        },
        onSettled: () => {
            setHidingAccountId(null);
            queryClient.invalidateQueries({ queryKey: ['accounts', 'suggested'] });
        },
    });

    const allVideos = useMemo(() => {
        if (!videosData?.pages) return [];
        return videosData.pages
            .flatMap((page) => page?.data || [])
            .filter(isValidVideo);
    }, [videosData]);

    React.useEffect(() => {
        if (validTags.length > 0 && !selectedTag) {
            setSelectedTag(validTags[0].name);
        }
    }, [validTags, selectedTag]);

    const renderAccountCard = ({
        item,
        onHandleFollow,
        onHideSuggestion,
    }: {
        item: Account;
        onHandleFollow: () => void;
        onHideSuggestion: () => void;
    }) => {
        const isFollowing = followingAccountId === item.id;
        const isHiding = hidingAccountId === item.id;
        
        return (
            <View style={tw`mr-3 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden`}>
                <View style={tw`w-[${ACCOUNT_CARD_WIDTH}px] p-3 items-center`}>
                    <PressableHaptics
                        style={tw`absolute top-2 right-2 z-10 bg-opacity-50 rounded-full p-1`}
                        onPress={onHideSuggestion}
                        disabled={isHiding}>
                        <Feather name="x" size={16} color="gray" />
                    </PressableHaptics>

                    <Pressable onPress={() => router.push(`/private/profile/${item.id}`)}>
                        <Image
                            source={{ uri: item.avatar }}
                            style={tw`w-16 h-16 rounded-full mb-2`}
                        />
                    </Pressable>

                    <Pressable onPress={() => router.push(`/private/profile/${item.id}`)}>
                        <Text
                            style={tw`text-black font-semibold text-sm mb-1 dark:text-white`}
                            numberOfLines={1}>
                            {item.name || item.username}
                        </Text>
                    </Pressable>

                    {item.bio && (
                        <Text
                            style={tw`text-gray-800 text-xs text-center mb-1 dark:text-gray-300`}
                            numberOfLines={1}>
                            {item.bio}
                        </Text>
                    )}

                    <XStack justifyContent="space-between" gap="$3" style={tw`w-full mb-3`}>
                        {typeof item.post_count === 'number' && (
                            <Text style={tw`text-gray-500 text-[11px] dark:text-gray-400`}>
                                {item.post_count.toLocaleString()} videos
                            </Text>
                        )}
                        {typeof item.follower_count === 'number' && (
                            <Text style={tw`text-gray-500 text-[11px] dark:text-gray-400`}>
                                {item.follower_count.toLocaleString()} followers
                            </Text>
                        )}
                    </XStack>

                    <PressableHaptics onPress={onHandleFollow} disabled={isFollowing}>
                        <View
                            style={[tw`rounded-full px-4 py-1.5`, { backgroundColor: '#f02b55' }]}>
                            <Text style={tw`text-white font-semibold text-xs`}>
                                {isFollowing ? 'Following...' : 'Follow'}
                            </Text>
                        </View>
                    </PressableHaptics>
                </View>
            </View>
        );
    };

    const renderTagCard = ({ item }: { item: Tag }) => {
        const isSelected = selectedTag === item.name;
        return (
            <PressableHaptics
                style={[
                    tw`mr-2.5 rounded-xl px-4 py-2.5`,
                    isSelected
                        ? tw`bg-gray-600 dark:bg-gray-700`
                        : tw`bg-gray-100 dark:bg-gray-900`,
                ]}
                onPress={() => setSelectedTag(item.name)}>
                <View style={tw`w-[${TAG_CARD_WIDTH}px] items-center`}>
                    <Text
                        style={[
                            tw`font-bold text-base mb-0.5`,
                            isSelected ? tw`text-white` : tw`text-black dark:text-gray-500`,
                        ]}>
                        #{item.name}
                    </Text>
                    <Text style={[tw`text-xs`, isSelected ? tw`text-gray-200` : tw`text-gray-600`]}>
                        {item.count.toLocaleString()} videos
                    </Text>
                </View>
            </PressableHaptics>
        );
    };

    const renderVideoThumbnail = ({ item, index }: { item: Video; index: number }) => {
        if (!item.account || !item.media) return null;

        const duration = item.media.duration || 0;
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);

        return (
            <TouchableOpacity
                style={tw`mb-1 ${index % 3 !== 2 ? 'mr-1' : ''}`}
                onPress={() =>
                    router.push(`/private/profile/feed/${item.id}?profileId=${item.account.id}`)
                }>
                <View style={tw`relative`}>
                    <Image
                        source={{ uri: item.media.thumbnail }}
                        style={[
                            tw`rounded-lg bg-gray-900`,
                            { width: VIDEO_THUMBNAIL_WIDTH, height: (VIDEO_THUMBNAIL_WIDTH * 16) / 9 },
                        ]}
                        resizeMode="cover"
                    />
                    {item.caption && (
                        <View style={tw`absolute bottom-2 left-2 right-2`}>
                            <Text style={tw`text-white text-xs font-medium`} numberOfLines={2}>
                                {item.caption}
                            </Text>
                        </View>
                    )}
                    <View
                        style={tw`absolute top-2 right-2 bg-black bg-opacity-70 rounded px-1.5 py-0.5`}>
                        <Text style={tw`text-white text-xs`}>
                            {minutes}:{seconds.toString().padStart(2, '0')}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmptyState = (message: string) => (
        <View style={tw`py-10 items-center px-4`}>
            <Text style={tw`text-gray-500 dark:text-gray-400 text-center`}>
                {message}
            </Text>
        </View>
    );

    if (tagsLoading || accountsLoading) {
        return (
            <SafeAreaView edges={['top']} style={tw`flex-1 bg-white dark:bg-black`}>
                <View style={tw`flex-1 items-center justify-center`}>
                    <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#fff' : '#000'} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['top']} style={tw`flex-1 bg-white dark:bg-black`}>
            <View style={tw`flex flex-1 bg-white dark:bg-black`}>
                <ScrollView
                    style={tw`flex-1`}
                    showsVerticalScrollIndicator={false}
                    onScroll={({ nativeEvent }) => {
                        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                        const paddingToBottom = 100;
                        const isCloseToBottom =
                            layoutMeasurement.height + contentOffset.y >=
                            contentSize.height - paddingToBottom;

                        if (isCloseToBottom && hasNextPage && !isFetchingNextPage) {
                            fetchNextPage();
                        }
                    }}
                    scrollEventThrottle={16}>
                    <View style={tw`px-4 pt-4 pb-3 flex justify-between items-center flex-row`}>
                        <Text style={tw`text-black text-4xl font-bold dark:text-white`}>
                            Explore
                        </Text>
                        <Pressable onPress={() => router.push('/private/search')}>
                            <Feather
                                name="search"
                                color={colorScheme === 'dark' ? '#fff' : '#000'}
                                size={30}
                            />
                        </Pressable>
                    </View>

                    {validAccounts.length > 0 && (
                        <View style={tw`my-5`}>
                            <Text
                                style={tw`text-black text-lg font-bold px-4 mb-3 dark:text-gray-500`}>
                                Suggested for you
                            </Text>
                            <FlatList
                                horizontal
                                data={validAccounts}
                                renderItem={({ item }) =>
                                    renderAccountCard({
                                        item,
                                        onHandleFollow: () => followMutation.mutate(item.id),
                                        onHideSuggestion: () =>
                                            hideSuggestionMutation.mutate(item.id),
                                    })
                                }
                                keyExtractor={(item) => item.id}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={tw`px-4`}
                            />
                        </View>
                    )}

                    {accountsError && (
                        renderEmptyState('Unable to load suggested accounts. Please try again later.')
                    )}

                    {validTags.length > 0 && (
                        <View style={tw`mb-4`}>
                            <Text
                                style={tw`text-black text-lg font-bold px-4 mb-3 dark:text-gray-500`}>
                                Trending
                            </Text>
                            <FlatList
                                horizontal
                                data={validTags}
                                renderItem={renderTagCard}
                                keyExtractor={(item) => item.id.toString()}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={tw`px-4`}
                            />
                        </View>
                    )}

                    {tagsError && (
                        renderEmptyState('Unable to load trending tags. Please try again later.')
                    )}

                    {videosLoading ? (
                        <View style={tw`py-10 items-center`}>
                            <ActivityIndicator
                                size="large"
                                color={colorScheme === 'dark' ? '#fff' : '#000'}
                            />
                        </View>
                    ) : videosError ? (
                        renderEmptyState('Unable to load videos. Please try again later.')
                    ) : allVideos.length > 0 ? (
                        <>
                            <View style={tw`px-2 flex-row flex-wrap`}>
                                {allVideos.map((video, index) => (
                                    <View key={video.id} style={tw`w-1/3`}>
                                        {renderVideoThumbnail({ item: video, index })}
                                    </View>
                                ))}
                            </View>
                            {isFetchingNextPage && (
                                <View style={tw`py-4 items-center`}>
                                    <ActivityIndicator 
                                        size="small" 
                                        color={colorScheme === 'dark' ? '#fff' : '#000'} 
                                    />
                                </View>
                            )}
                        </>
                    ) : (
                        renderEmptyState('No videos found for this tag.')
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}