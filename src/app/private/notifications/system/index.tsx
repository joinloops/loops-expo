import { StackText, XStack, YStack } from '@/components/ui/Stack';
import { useAuthStore } from '@/utils/authStore';
import { useNotificationStore } from '@/utils/notificationStore';
import { fetchSystemNotifications, notificationMarkAsRead, openLocalLink } from '@/utils/requests';
import { timeAgo } from '@/utils/ui';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import tw from 'twrnc';

interface SystemNotification {
    id: string;
    type: string;
    systemType: string;
    systemMessage: {
        id: string;
        title: string;
        summary: string;
        link: string;
        published_at: string;
    };
    read_at: string | null;
    created_at: string;
}

const getCategoryInfo = (systemType: string) => {
    switch (systemType) {
        case 'update':
            return { name: 'Account updates', icon: 'arrow-up-circle-outline' as const };
        case 'feature':
            return { name: 'Features', icon: 'sparkles-outline' as const };
        case 'info':
            return { name: 'Information', icon: 'information-circle-outline' as const };
        case 'report':
            return { name: 'Report', icon: 'flag-outline' as const };
        case 'security':
            return { name: 'Security', icon: 'shield-checkmark-outline' as const };
        default:
            return { name: 'System', icon: 'notifications-outline' as const };
    }
};

const SystemNotificationItem = ({ 
    item, 
    onPress,
}: { 
    item: SystemNotification; 
    onPress: (item: SystemNotification) => void;
}) => {
    const isUnread = !item.read_at;
    const categoryInfo = getCategoryInfo(item.systemType);

    return (
        <View style={tw`bg-white my-2 mx-4 px-4 py-4`}>
            <View style={tw`flex flex-row justify-between items-center`}>
                <XStack flex={1} alignItems="center" marginBottom="$3">
                    <View style={tw`w-9 h-9 rounded-full bg-gray-200 items-center justify-center mr-2.5`}>
                        <Ionicons name={categoryInfo.icon} size={18} color="#3C3C43" />
                    </View>
                    <StackText fontSize="$4" fontWeight="bold" textColor="text-gray-500">
                        {categoryInfo.name}
                    </StackText>
                </XStack>
                <StackText fontSize="$2" textColor="text-gray-400">
                    {timeAgo(item.created_at)}
                </StackText>
            </View>

            <View style={tw`flex-1 w-full mt-3 border-bottom border-[0.5px] border-gray-200`} />

            <Pressable onPress={() => onPress(item)}>
                <XStack alignItems="center" style={tw`mt-3 pb-2`}>
                    <StackText fontSize="$4" fontWeight="bold" flex={1} marginRight="$2">
                        {item.systemMessage.title}
                    </StackText>
                    {isUnread && (
                        <View style={tw`w-2 h-2 rounded-full bg-red-500 ml-1`} />
                    )}
                </XStack>

                <StackText fontSize="$3" textColor="text-gray-500" style={tw`mb-2`} numberOfLines={2}>
                    {item.systemMessage.summary}
                </StackText>

                <View style={tw`flex justify-center items-center mt-2`}>
                    <StackText fontSize="$3" textColor="text-black" fontWeight="bold">
                        View more
                    </StackText>
                </View>
            </Pressable>
        </View>
    );
};

export default function SystemNotificationsScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const { refetchBadgeCount } = useNotificationStore();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch,
        isLoading,
        isFetching,
    } = useInfiniteQuery({
        queryKey: ['system-notifications'],
        queryFn: fetchSystemNotifications,
        initialPageParam: undefined,
        refetchOnWindowFocus: false,
        getNextPageParam: (lastPage) => lastPage.meta?.next_cursor,
    });

    const readMutation = useMutation({
        mutationFn: notificationMarkAsRead,
        onMutate: async (notificationId) => {
            await queryClient.cancelQueries({ queryKey: ['main-notifications']});
            await queryClient.cancelQueries({ queryKey: ['system-notifications'] });

            const previousData = queryClient.getQueryData(['system-notifications']);

            queryClient.setQueryData(['system-notifications'], (old: any) => {
                if (!old?.pages) return old;

                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: page.data?.map((notification: any) =>
                            notification.id === notificationId
                                ? { ...notification, read_at: new Date().toISOString() }
                                : notification
                        ),
                    })),
                };
            });

            return { previousData };
        },
        onSettled: async () => {
            refetchBadgeCount()
            await queryClient.invalidateQueries({ queryKey: ['main-notifications'] });
        },
        onError: (err, notificationId, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['system-notifications'], context.previousData);
            }
            console.error('Failed to mark notification as read:', err);
        },
    });

    const notifications = useMemo(() => {
        if (!data?.pages?.length) return [];
        return data.pages.flatMap((p: any) => p?.data ?? []);
    }, [data]);

    const handleOnPress = (item: SystemNotification) => {
        if (!item.read_at) {
            readMutation.mutate(item.id);
        }
        openLocalLink(`notifications/system/${item.systemMessage.id}/permalink?appreq=1`, { presentationStyle: 'popover', showTitle: false})
    };

    const renderEmpty = () => (
        <YStack paddingY="$8" alignItems="center" justifyContent="center">
            <StackText fontSize="$4" color="#86878B">
                No system notifications
            </StackText>
        </YStack>
    );

    return (
        <View style={tw`flex-1 bg-[#F2F2F7]`}>
            <StatusBar style="dark" />
            <Stack.Screen
                options={{
                    headerTitle: 'System Notifications',
                    headerBackTitle: 'Back',
                }}
            />
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <SystemNotificationItem
                        item={item}
                        onPress={handleOnPress}
                    />
                )}
                ListEmptyComponent={
                    isLoading || isFetching ? (
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
                    ) : <View style={tw`h-[200px]`} />
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
                contentContainerStyle={{ flexGrow: 1, paddingTop: 8, paddingBottom: 16 }}
            />
        </View>
    );
}