import AccountHeader from '@/components/profile/AccountHeader';
import AccountTabs from '@/components/profile/AccountTabs';
import VideoGrid from '@/components/profile/VideoGrid';
import { StackText, YStack } from '@/components/ui/Stack';
import { fetchAccountFavorites, fetchAccountLikes, fetchSelfAccount, fetchSelfAccountVideos } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import tw from 'twrnc';

export default function ProfileScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('videos');
    const [sortBy, setSortBy] = useState('Latest');
    const flatListRef = useRef(null);

    const { data: user, isLoading: userLoading } = useQuery({
        queryKey: ['fetchSelfAccount', 'self'],
        queryFn: async () => {
            const res = await fetchSelfAccount();
            return res.data;
        },
    });

    useEffect(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, [activeTab]);

    const {
        data: videosData,
        fetchNextPage: videosFetchNextPage,
        hasNextPage: videosHasNextPage,
        isFetchingNextPage: videosIsFetchingNextPage,
        refetch: videosRefetch,
        isLoading: videosLoading,
        isFetching: videosIsFetching,
    } = useInfiniteQuery({
        queryKey: ['userSelfVideos', sortBy],
        queryFn: fetchSelfAccountVideos,
        initialPageParam: undefined,
        refetchOnWindowFocus: true,
        getNextPageParam: (lastPage) => lastPage?.meta?.next_cursor ?? undefined,
        enabled: activeTab === 'videos',
    });

    const {
        data: favoritesData,
        fetchNextPage: favoritesFetchNextPage,
        hasNextPage: favoritesHasNextPage,
        isFetchingNextPage: favoritesIsFetchingNextPage,
        refetch: favoritesRefetch,
        isLoading: favoritesLoading,
        isFetching: favoritesIsFetching,
    } = useInfiniteQuery({
        queryKey: ['userSelfFavorites'],
        queryFn: fetchAccountFavorites,
        initialPageParam: undefined,
        refetchOnWindowFocus: true,
        getNextPageParam: (lastPage) => lastPage?.meta?.next_cursor ?? undefined,
        enabled: activeTab === 'favorites',
    });

    const {
        data: likesData,
        fetchNextPage: likesFetchNextPage,
        hasNextPage: likesHasNextPage,
        isFetchingNextPage: likesIsFetchingNextPage,
        refetch: likesRefetch,
        isLoading: likesLoading,
        isFetching: likesIsFetching,
    } = useInfiniteQuery({
        queryKey: ['userSelfLikes'],
        queryFn: fetchAccountLikes,
        initialPageParam: undefined,
        refetchOnWindowFocus: true,
        getNextPageParam: (lastPage) => lastPage?.meta?.next_cursor ?? undefined,
        enabled: activeTab === 'likes',
    });

    const videos = useMemo(() => {
        if (!videosData?.pages?.length) return [];
        return videosData.pages.flatMap((p: any) => p?.data ?? []);
    }, [videosData]);

    const favorites = useMemo(() => {
        if (!favoritesData?.pages?.length) return [];
        return favoritesData.pages.flatMap((p: any) => p?.data ?? []);
    }, [favoritesData]);

    const likes = useMemo(() => {
        if (!likesData?.pages?.length) return [];
        return likesData.pages.flatMap((p: any) => p?.data ?? []);
    }, [likesData]);

    const activeData = useMemo(() => {
        const list =
            activeTab === 'favorites' ? favorites :
            activeTab === 'likes' ? likes :
            videos;

        return (list ?? []).filter((x) => x && x.id != null);
    }, [activeTab, videos, favorites, likes]);

    const isLoading = useMemo(() => {
        switch (activeTab) {
            case 'favorites':
                return favoritesLoading;
            case 'likes':
                return likesLoading;
            default:
                return videosLoading;
        }
    }, [activeTab, favoritesLoading, likesLoading, videosLoading]);

    const isFetching = useMemo(() => {
        switch (activeTab) {
            case 'favorites':
                return favoritesIsFetching;
            case 'likes':
                return likesIsFetching;
            default:
                return videosIsFetching;
        }
    }, [activeTab, favoritesIsFetching, likesIsFetching, videosIsFetching]);

    const isFetchingNextPage = useMemo(() => {
        switch (activeTab) {
            case 'favorites':
                return favoritesIsFetchingNextPage;
            case 'likes':
                return likesIsFetchingNextPage;
            default:
                return videosIsFetchingNextPage;
        }
    }, [activeTab, favoritesIsFetchingNextPage, likesIsFetchingNextPage, videosIsFetchingNextPage]);

    const hasNextPage = useMemo(() => {
        switch (activeTab) {
            case 'favorites':
                return favoritesHasNextPage;
            case 'likes':
                return likesHasNextPage;
            default:
                return videosHasNextPage;
        }
    }, [activeTab, favoritesHasNextPage, likesHasNextPage, videosHasNextPage]);

    const handleVideoPress = (video) => {
        if (!video?.id || !user?.id) {
            console.warn('Invalid video data:', video);
            return;
        }
        router.push(`/private/profile/feed/${video.id}?profileId=${user.id}`);
    };

    const handleSettingsPress = () => {
        router.push(`/private/settings`);
    };
    
    const handleEditBio = () => {
        router.push(`/private/settings/account/edit-bio`);
    };

    const handleNotificationsPress = () => {
        router.push(`/notifications`);
    };

    const handleEndReached = () => {
        if (hasNextPage && !isFetchingNextPage) {
            switch (activeTab) {
                case 'favorites':
                    favoritesFetchNextPage();
                    break;
                case 'likes':
                    likesFetchNextPage();
                    break;
                default:
                    videosFetchNextPage();
                    break;
            }
        }
    };

    const handleRefresh = () => {
        switch (activeTab) {
            case 'favorites':
                favoritesRefetch();
                break;
            case 'likes':
                likesRefetch();
                break;
            default:
                videosRefetch();
                break;
        }
    };

    const renderItem = useCallback(({ item }) => (
        <VideoGrid video={item} onPress={handleVideoPress} />
    ), [handleVideoPress]);

    const renderEmpty = () => (
        <YStack paddingY="$8" alignItems="center" justifyContent="center">
            <StackText fontSize="$4" color="#86878B">
                {activeTab === 'videos' && 'No videos yet'}
                {activeTab === 'favorites' && 'No favorites yet'}
                {activeTab === 'likes' && 'No likes yet'}
                {activeTab === 'reblogs' && 'No reblogs'}
            </StackText>
        </YStack>
    );

    return (
        <View style={tw`flex-1 bg-white`}>
            <StatusBar style="dark" />

            <Stack.Screen
                options={{
                    title: 'Profile',
                    headerStyle: { backgroundColor: '#fff' },
                    headerTintColor: '#000',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                        color: '#000',
                    },
                    headerBackTitle: 'Back',
                    headerShadowVisible: false,
                    headerBackTitleVisible: false,
                    headerShown: true,
                    headerTitle: 'My Profile',
                   
                    headerRight: () => (
                        <Pressable 
                            accessibilityLabel="Settings" 
                            accessibilityRole="button" 
                            onPress={handleSettingsPress} 
                            style={tw`mr-3`}
                        >
                            <Ionicons name="menu" size={30} />
                        </Pressable>
                    ),
                }}
            />

            <FlatList
                ref={flatListRef}
                data={activeData}
                numColumns={3}
                keyExtractor={(item, index) => {
                    const id = item?.id;
                    return id != null ? `${activeTab}-${id}` : `${activeTab}-idx-${index}`;
                }}
                ListHeaderComponent={
                    <>
                        <AccountHeader 
                            user={user} 
                            isOwner={true} 
                            showActions={true} 
                            loading={userLoading} 
                            onEditBio={handleEditBio} 
                        />
                        <AccountTabs 
                            activeTab={activeTab} 
                            isOwner={true} 
                            onTabChange={setActiveTab} 
                            sortBy={sortBy} 
                            onSortChange={setSortBy} 
                        />
                    </>
                }
                renderItem={renderItem}
                ListEmptyComponent={
                    isLoading || isFetching ? (
                        <YStack style={tw`my-6`} alignItems="center">
                            <ActivityIndicator size="large" />
                        </YStack>
                    ) : (
                        renderEmpty()
                    )
                }
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <YStack paddingVertical="$6" alignItems="center">
                            <ActivityIndicator />
                        </YStack>
                    ) : null
                }
                onEndReachedThreshold={0.4}
                onEndReached={handleEndReached}
                refreshing={isFetching && !isFetchingNextPage}
                onRefresh={handleRefresh}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1 }}
            />
        </View>
    );
}
