import { NotificationItem } from '@/components/notifications/NotificationItem';
import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { StackText, YStack } from '@/components/ui/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/utils/authStore';
import { useNotificationStore } from '@/utils/notificationStore';
import {
    fetchActivityNotifications,
    notificationMarkAsRead,
    notificationTypeMarkAllAsRead,
} from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, Alert, FlatList, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

export default function ActivityNotificationsScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const { refetchBadgeCount } = useNotificationStore();
    const { colorScheme } = useTheme();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch,
        isLoading: videosLoading,
        isFetching,
    } = useInfiniteQuery({
        queryKey: ['activity-notifications'],
        queryFn: fetchActivityNotifications,
        initialPageParam: undefined,
        refetchOnWindowFocus: true,
        getNextPageParam: (lastPage) => lastPage.meta?.next_cursor,
    });

    const readMutation = useMutation({
        mutationFn: notificationMarkAsRead,
        onMutate: async (notificationId) => {
            await queryClient.cancelQueries({ queryKey: ['activity-notifications'] });

            const previousData = queryClient.getQueryData(['activity-notifications']);

            queryClient.setQueryData(['activity-notifications'], (old: any) => {
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
        onSettled: async () => {
            await queryClient.invalidateQueries({ queryKey: ['activity-notifications'] });
            refetchBadgeCount();
            await queryClient.invalidateQueries({ queryKey: ['main-notifications'] });
        },
        onError: (err, notificationId, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['activity-notifications'], context.previousData);
            }
            console.error('Failed to mark notification as read:', err);
        },
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => notificationTypeMarkAllAsRead('activity'),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['main-notifications'] });
            await queryClient.cancelQueries({ queryKey: ['activity-notifications'] });

            const previousMainData = queryClient.getQueryData(['main-notifications']);
            const previousActivityData = queryClient.getQueryData(['activity-notifications']);

            queryClient.setQueryData(['main-notifications'], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    meta: {
                        ...old.meta,
                        unread_counts: {
                            ...old.meta?.unread_counts,
                            activity: 0,
                        },
                    },
                };
            });

            queryClient.setQueryData(['activity-notifications'], (old: any) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: page.data?.map((notification: any) => ({
                            ...notification,
                            read_at: notification.read_at || new Date().toISOString(),
                        })),
                    })),
                };
            });

            return { previousMainData, previousActivityData };
        },
        onError: (err, variables, context) => {
            // Rollback on error
            if (context?.previousMainData) {
                queryClient.setQueryData(['main-notifications'], context.previousMainData);
            }
            if (context?.previousActivityData) {
                queryClient.setQueryData(['activity-notifications'], context.previousActivityData);
            }
            console.error('Failed to mark all as read:', err);
        },
        onSettled: async () => {
            await queryClient.invalidateQueries({ queryKey: ['activity-notifications'] });
            refetchBadgeCount();
            await queryClient.invalidateQueries({ queryKey: ['main-notifications'] });
            router.back();
        },
    });

    const notifications = useMemo(() => {
        if (!data?.pages?.length) return [];
        return data.pages.flatMap((p: any) => p?.data ?? []);
    }, [data]);

    const handleMarkAllAsRead = () => {
        Alert.alert(
            'Mark All as Read',
            'Are you sure you want to mark all activity notifications as read?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Mark All Read',
                    style: 'destructive',
                    onPress: () => markAllReadMutation.mutate(),
                },
            ],
        );
    };

    const handleOnPress = (item: any) => {
        if (!item.read_at) {
            readMutation.mutate(item.id);
        }

        if (item.video_id && item.video_pid) {
            router.push(`/private/profile/feed/${item.video_id}?profileId=${item.video_pid}`);
        }
    };

    const handleOnProfilePress = (account, item) => {
        if (!item.read_at) {
            readMutation.mutate(item.id);
        }

        router.push(`/private/profile/${account?.id}`);
    };

    const renderEmpty = () => (
        <YStack paddingY="$8" alignItems="center" justifyContent="center">
            <StackText fontSize="$4" color="#86878B">
                No notifications yet
            </StackText>
        </YStack>
    );

    return (
        <View style={tw`flex-1 bg-white dark:bg-black`}>
            <Stack.Screen
                options={{
                    headerTitle: 'Activities',
                    headerBackTitle: 'Back',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => {
                                if (router.canGoBack()) {
                                    router.back();
                                } else {
                                    router.push('/(tabs)');
                                }
                            }}
                            style={tw`px-1`}>
                            <Ionicons
                                name="chevron-back"
                                size={24}
                                color={colorScheme === 'dark' ? '#fff' : '#000'}
                            />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <PressableHaptics
                            onPress={handleMarkAllAsRead}
                            disabled={markAllReadMutation.isPending || notifications.length === 0}
                            style={tw`flex justify-center items-center w-10`}>
                            <Ionicons
                                name="checkmark-done-outline"
                                size={24}
                                color={
                                    markAllReadMutation.isPending || notifications.length === 0
                                        ? '#ccc'
                                        : '#007AFF'
                                }
                            />
                        </PressableHaptics>
                    ),
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
