import { NotificationItem } from '@/components/notifications/NotificationItem';
import { StackText, YStack } from '@/components/ui/Stack';
import { fetchNotifications } from '@/utils/requests';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import tw from 'twrnc';

export default function NotificationScreen() {
    const router = useRouter();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch,
        isLoading: videosLoading,
        isFetching,
    } = useInfiniteQuery({
        queryKey: ['notifications'],
        queryFn: async ({ pageParam }) => {
            const res = await fetchNotifications(pageParam);
            return res;
        },
        initialPageParam: 0,
        refetchOnWindowFocus: false,
        getNextPageParam: (lastPage) => lastPage.meta?.next_cursor,
    });

    const notifications = useMemo(() => {
        if (!data?.pages?.length) return [];
        return data.pages.flatMap((p: any) => p?.data ?? []);
    }, [data]);

    const handleOnPress = (item: any) => {
        // Navigate based on notification type
        if (item.type === 'video.commentReply' && item.url) {
            router.push(item.url);
        } else if (item.video_id) {
            // Navigate to video detail
            router.push(`/private/video/${item.video_id}`);
        }

        // TODO: Mark notification as read
        // markNotificationAsRead(item.id);
    };

    const renderEmpty = () => (
        <YStack paddingY="$8" alignItems="center" justifyContent="center">
            <StackText fontSize="$4" color="#86878B">
                No notifications yet
            </StackText>
        </YStack>
    );

    return (
        <View style={tw`flex-1 bg-white`}>
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => <NotificationItem item={item} onPress={handleOnPress} />}
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
