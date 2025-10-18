import AccountHeader from '@/components/profile/AccountHeader';
import AccountTabs from '@/components/profile/AccountTabs';
import VideoGrid from '@/components/profile/VideoGrid';
import { StackText, YStack } from '@/components/ui/Stack';
import { fetchSelfAccount, fetchSelfAccountVideos } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import tw from 'twrnc';

export default function ProfileScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('videos');

    const { data: user, isLoading: userLoading } = useQuery({
        queryKey: ['fetchSelfAccount', 'self'],
        queryFn: async () => {
            const res = await fetchSelfAccount();
            return res.data;
        },
    });

    const {
        data: videosData,
        fetchNextPage,
        fetchPreviousPage,
        hasNextPage,
        hasPreviousPage,
        isFetchingNextPage,
        isRefetching,
        refetch,
        isLoading: videosLoading,
        isFetching,
        status,
        isError,
        error,
    } = useInfiniteQuery({
        queryKey: ['userSelfVideos', 'user'],
        queryFn: async ({ pageParam }) => {
            const res = await fetchSelfAccountVideos(pageParam);
            return res;
        },
        initialPageParam: 0,
        refetchOnWindowFocus: true,
        getNextPageParam: (lastPage) => lastPage.meta?.next_cursor,
    });

    const videos = useMemo(() => {
        if (!videosData?.pages?.length) return [];
        return videosData.pages.flatMap((p: any) => p?.data ?? []);
    }, [videosData]);

    const handleVideoPress = (video) => {
        router.push(`/private/video/${video.id}`);
    };

    const handleSettingsPress = () => {
        router.push(`/private/settings`);
    };

    const renderEmpty = () => (
        <YStack paddingY="$8" alignItems="center" justifyContent="center">
            <StackText fontSize="$4" color="#86878B">
                {activeTab === 'videos' && 'No videos yet'}
                {activeTab === 'favorites' && 'No favorites yet'}
                {activeTab === 'reblogs' && 'No reblogs'}
            </StackText>
        </YStack>
    );

    return (
        <View style={tw`flex-1 bg-white`}>
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
                        <Pressable onPress={() => handleSettingsPress()}>
                            <Ionicons name="menu" size={30} />
                        </Pressable>
                    ),
                }}
            />

            <FlatList
                data={videos}
                numColumns={3}
                keyExtractor={(item) => item.id.toString()}
                ListHeaderComponent={
                    <>
                        <AccountHeader user={user} loading={userLoading} />
                        <AccountTabs activeTab={activeTab} onTabChange={setActiveTab} />
                    </>
                }
                renderItem={({ item }) => <VideoGrid video={item} onPress={handleVideoPress} />}
                ListEmptyComponent={
                    videosLoading || isFetching ? (
                        <YStack paddingVertical="$8" alignItems="center">
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
                onEndReached={() => {
                    if (hasNextPage && !isFetchingNextPage) {
                        fetchNextPage();
                    }
                }}
                refreshing={isFetching && !isFetchingNextPage}
                onRefresh={() => refetch()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1 }}
            />
        </View>
    );
}
