import { NotificationItem } from '@/components/notifications/NotificationItem';
import { StackText, YStack } from '@/components/ui/Stack';
import { useAuthStore } from '@/utils/authStore';
import { fetchNotifications, notificationMarkAsRead } from '@/utils/requests';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import tw from 'twrnc';

export default function NotificationScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

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
        queryFn: fetchNotifications,
        initialPageParam: undefined,
        refetchOnWindowFocus: false,
        getNextPageParam: (lastPage) => lastPage.meta?.next_cursor,
    });

    const readMutation = useMutation({
        mutationFn: notificationMarkAsRead,
        onMutate: async (notificationId) => {
            await queryClient.cancelQueries({ queryKey: ['notifications'] });

            const previousData = queryClient.getQueryData(['notifications']);

            queryClient.setQueryData(['notifications'], (old: any) => {
                if (!old?.pages) return old;

                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: page.data?.map((notification: any) =>
                            notification.id === notificationId
                                ? { ...notification, read_at: new Date().toISOString() }
                                : notification,
                        ),
                    })),
                };
            });

            return { previousData };
        },
        onError: (err, notificationId, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['notifications'], context.previousData);
            }
            console.error('Failed to mark notification as read:', err);
        },
    });

    const notifications = useMemo(() => {
        if (!data?.pages?.length) return [];
        return data.pages.flatMap((p: any) => p?.data ?? []);
    }, [data]);

    const handleOnPress = (item: any) => {
        if (item.type === 'new_follower') {
            router.push(`/private/profile/${item?.actor?.id}`);
        }
        if (!item.read_at) {
            readMutation.mutate(item.id);
        }

        if (item.video_id && item.video_pid) {
            router.push(`/private/profile/feed/${item.video_id}?profileId=${item.video_pid}`);
        }
    };

    const handleOnProfilePress = (item) => {
        router.push(`/private/profile/${item?.id}`);
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
            <Stack.Screen
                options={{
                    headerTitle: 'Notifications',
                    headerBackTitle: 'Back',
                }}
            />
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <NotificationItem
                        item={item}
                        onPress={handleOnPress}
                        onProfilePress={handleOnProfilePress}
                    />
                )}
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
