import {
    NOTIFICATION_FILTERS,
    NotificationFilter,
    NotificationFilterModal,
} from '@/components/notifications/NotificationFilterModal';
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
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

export default function ActivityNotificationsScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const { refetchBadgeCount } = useNotificationStore();
    const { colorScheme } = useTheme();

    const [filter, setFilter] = useState<NotificationFilter>('activity');
    const [filterModalVisible, setFilterModalVisible] = useState(false);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch,
        isLoading,
        isRefetching,
    } = useInfiniteQuery({
        queryKey: ['activity-notifications', filter],
        queryFn: ({ pageParam, queryKey }) =>
            fetchActivityNotifications({ pageParam, type: queryKey[1] as string }),
        initialPageParam: undefined,
        refetchOnWindowFocus: true,
        getNextPageParam: (lastPage) => lastPage.meta?.next_cursor,
    });

    const readMutation = useMutation({
        mutationFn: notificationMarkAsRead,
        onMutate: async (notificationId) => {
            const queryKey = ['activity-notifications', filter];
            await queryClient.cancelQueries({ queryKey });

            const previousData = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(queryKey, (old: any) => {
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

            return { previousData, queryKey };
        },
        onError: (err, notificationId, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(context.queryKey, context.previousData);
            }
            console.error('Failed to mark notification as read:', err);
        },
        onSettled: async () => {
            await queryClient.invalidateQueries({ queryKey: ['activity-notifications'] });
            refetchBadgeCount();
            await queryClient.invalidateQueries({ queryKey: ['main-notifications'] });
        },
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => notificationTypeMarkAllAsRead(filter),
        onMutate: async () => {
            const queryKey = ['activity-notifications', filter];
            await queryClient.cancelQueries({ queryKey: ['main-notifications'] });
            await queryClient.cancelQueries({ queryKey });

            const previousMainData = queryClient.getQueryData(['main-notifications']);
            const previousActivityData = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(['main-notifications'], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    meta: {
                        ...old.meta,
                        unread_counts: {
                            ...old.meta?.unread_counts,
                            [filter]: 0,
                        },
                    },
                };
            });

            queryClient.setQueryData(queryKey, (old: any) => {
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

            return { previousMainData, previousActivityData, queryKey };
        },
        onError: (err, variables, context) => {
            if (context?.previousMainData) {
                queryClient.setQueryData(['main-notifications'], context.previousMainData);
            }
            if (context?.previousActivityData) {
                queryClient.setQueryData(context.queryKey, context.previousActivityData);
            }
            console.error('Failed to mark all as read:', err);
        },
        onSettled: async () => {
            await queryClient.invalidateQueries({ queryKey: ['activity-notifications'] });
            refetchBadgeCount();
            await queryClient.invalidateQueries({ queryKey: ['main-notifications'] });
            setFilterModalVisible(false);
        },
    });

    const notifications = useMemo(() => {
        if (!data?.pages?.length) return [];
        return data.pages.flatMap((p: any) => p?.data ?? []);
    }, [data]);

    const activeFilterLabel = useMemo(
        () => NOTIFICATION_FILTERS.find((f) => f.type === filter)?.label ?? 'Activities',
        [filter],
    );

    const handleMarkAllAsRead = () => {
        Alert.alert(
            'Mark All as Read',
            `Mark all ${activeFilterLabel.toLowerCase()} notifications as read?`,
            [
                { text: 'Cancel', style: 'cancel' },
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

    const handleOnProfilePress = (account: any, item: any) => {
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
                    headerTitle: activeFilterLabel,
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
                            onPress={() => setFilterModalVisible(true)}
                            style={tw`flex justify-center items-center w-10`}>
                            <Ionicons
                                name="settings-outline"
                                size={22}
                                color={colorScheme === 'dark' ? '#fff' : '#000'}
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
                    isLoading ? (
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
                    if (hasNextPage && !isFetchingNextPage && !isRefetching) {
                        fetchNextPage();
                    }
                }}
                refreshing={isRefetching && !isFetchingNextPage}
                onRefresh={() => refetch()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1 }}
            />

            <NotificationFilterModal
                visible={filterModalVisible}
                selected={filter}
                onClose={() => setFilterModalVisible(false)}
                onSelect={setFilter}
                onMarkAllRead={handleMarkAllAsRead}
                markAllDisabled={markAllReadMutation.isPending || notifications.length === 0}
            />
        </View>
    );
}