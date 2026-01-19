import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { StackText, YStack } from '@/components/ui/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/utils/authStore';
import {
    fetchNotifications,
    followAccount,
    getExploreAccounts,
    postExploreAccountHideSuggestion,
} from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import tw from 'twrnc';

interface CategoryCardProps {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBgColor: string;
    title: string;
    subtitle: string;
    count: number;
    onPress: () => void;
}

const CategoryCard = ({
    icon,
    iconColor,
    iconBgColor,
    title,
    subtitle,
    count,
    onPress,
}: CategoryCardProps) => {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                tw`flex-row items-center px-4 py-4`,
                pressed && tw`bg-gray-50 dark:bg-gray-900`,
            ]}>
            <View
                style={[
                    tw`w-14 h-14 rounded-full items-center justify-center mr-3`,
                    { backgroundColor: iconBgColor },
                ]}>
                <Ionicons name={icon} size={28} color={iconColor} />
            </View>

            <View style={tw`flex-1`}>
                <StackText
                    fontSize="$5"
                    textColor="text-black dark:text-white"
                    fontWeight={count ? 'semibold' : 'normal'}>
                    {title}
                </StackText>
                <StackText
                    fontSize="$3"
                    textColor={
                        count ? 'text-black dark:text-gray-400' : 'text-gray-600 dark:text-gray-500'
                    }
                    fontWeight={count ? 'semibold' : 'normal'}
                    numberOfLines={1}>
                    {subtitle}
                </StackText>
            </View>

            {count > 0 ? (
                <View
                    style={tw`bg-red-500 rounded-full ml-4 min-w-8 h-6 px-2 items-center justify-center`}>
                    <StackText fontSize="$2" textColor="text-white" fontWeight="bold">
                        {count > 99 ? '99+' : count}
                    </StackText>
                </View>
            ) : (
                <Ionicons name="chevron-forward" size={20} color="#C4C4C4" />
            )}
        </Pressable>
    );
};

interface SuggestedAccountCardProps {
    account: any;
    onFollow: (id: string) => void;
    onHide: (id: string) => void;
    isFollowing: boolean;
    isHiding: boolean;
    onView: (id: string) => void;
}

const SuggestedAccountCard = ({
    account,
    onFollow,
    onHide,
    isFollowing,
    isHiding,
    onView,
}: SuggestedAccountCardProps) => {
    return (
        <View style={tw`flex-row items-center px-4 py-3`}>
            <PressableHaptics onPress={() => onView(account.id)}>
                <Image source={{ uri: account.avatar }} style={tw`w-12 h-12 rounded-full mr-3`} />
            </PressableHaptics>

            <View style={tw`flex-1`}>
                <PressableHaptics onPress={() => onView(account.id)}>
                    <StackText
                        fontSize="$4"
                        fontWeight="semibold"
                        textColor="text-black dark:text-gray-200"
                        numberOfLines={1}>
                        {account.username}
                    </StackText>
                    {account.bio && (
                        <StackText
                            fontSize="$3"
                            textColor="text-gray-600 dark:text-gray-500"
                            numberOfLines={1}>
                            {account.bio}
                        </StackText>
                    )}
                </PressableHaptics>
            </View>

            <View style={tw`flex-row items-center gap-2 ml-5`}>
                <PressableHaptics
                    onPress={() => onFollow(account.id)}
                    disabled={isFollowing || isHiding}
                    style={({ pressed }) => [
                        tw`bg-red-500 rounded-2xl px-6 py-2`,
                        (pressed || isFollowing) && tw`opacity-70`,
                    ]}>
                    {isFollowing ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <StackText fontSize="$3" textColor="text-white" fontWeight="semibold">
                            Follow
                        </StackText>
                    )}
                </PressableHaptics>

                <PressableHaptics
                    onPress={() => onHide(account.id)}
                    disabled={isFollowing || isHiding}
                    style={({ pressed }) => [tw`p-2`, pressed && tw`opacity-50`]}>
                    {isHiding ? (
                        <ActivityIndicator size="small" color="#666" />
                    ) : (
                        <Ionicons name="close-circle-outline" size={24} color="#999" />
                    )}
                </PressableHaptics>
            </View>
        </View>
    );
};

const getNotificationMessage = (notification: any): string => {
    const username = notification.actor?.username || notification.actor?.name || 'Someone';

    switch (notification.type) {
        case 'new_follower':
            return `${username} started following you.`;
        case 'video.like':
            return `${username} liked your video.`;
        case 'comment.like':
        case 'commentReply.like':
            return `${username} liked your comment.`;
        case 'video.comment':
            return `${username} commented on your video.`;
        case 'video.commentReply':
            return `${username} replied to your comment.`;
        case 'video.mention':
            return `${username} mentioned you.`;
        case 'video.share':
            return `${username} shared your video.`;
        case 'video.duet':
            return `${username} dueted your video.`;
        case 'commentReply.share':
        case 'comment.share':
            return `${username} shared your comment.`;

        default:
            return `New notification from ${username}.`;
    }
};

export default function NotificationScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [followingAccountId, setFollowingAccountId] = useState<string | null>(null);
    const [hidingAccountId, setHidingAccountId] = useState<string | null>(null);
    const { colorScheme } = useTheme();

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['main-notifications'],
        queryFn: fetchNotifications,
        refetchOnWindowFocus: true,
        refetchOnMount: 'always',
        staleTime: 0,
    });

    const { data: accountsData, isLoading: accountsLoading } = useQuery({
        queryKey: ['accounts', 'suggested'],
        queryFn: getExploreAccounts,
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

            queryClient.setQueryData(['accounts', 'suggested'], (old: any[] | undefined) => {
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

    const notifications = useMemo(() => {
        if (!data?.data?.length) return [];
        return data?.data?.flatMap((p: any) => p ?? []);
    }, [data]);

    const unreadCounts = data?.meta?.unread_counts || {
        activity: 0,
        followers: 0,
        system: 0,
    };

    const latestNotifications = useMemo(() => {
        const followerTypes = ['new_follower'];
        const activityTypes = [
            'video.like',
            'comment.like',
            'video.comment',
            'video.mention',
            'video.share',
        ];
        const systemTypes = ['system', 'admin.notification', 'system.update', 'system.message'];

        const latestFollower = notifications.find((n) => followerTypes.includes(n.type));
        const latestActivity = notifications.find((n) => activityTypes.includes(n.type));
        const latestSystem = notifications.find((n) => systemTypes.includes(n.type));

        return {
            followers: latestFollower,
            activity: latestActivity,
            system: latestSystem,
        };
    }, [notifications]);

    const categories = [
        {
            id: 'followers',
            icon: 'people' as const,
            iconColor: '#FFFFFF',
            iconBgColor: '#00B8FF',
            title: 'New followers',
            subtitle: latestNotifications.followers
                ? getNotificationMessage(latestNotifications.followers)
                : 'See your new followers here.',
            count: unreadCounts.followers,
            route: '/private/notifications/followers',
        },
        {
            id: 'activity',
            icon: 'notifications' as const,
            iconColor: '#FFFFFF',
            iconBgColor: '#FF2C55',
            title: 'Activities',
            subtitle: latestNotifications.activity
                ? getNotificationMessage(latestNotifications.activity)
                : 'See notifications here.',
            count: unreadCounts.activity,
            route: '/private/notifications/activity',
        },
        {
            id: 'system',
            icon: 'megaphone' as const,
            iconColor: '#FFFFFF',
            iconBgColor: '#FFA800',
            title: 'System notifications',
            subtitle: 'Tap to view your system notifications.',
            count: unreadCounts.system,
            route: '/private/notifications/system',
        },
    ];

    const suggestedAccounts = useMemo(() => {
        return accountsData || [];
    }, [accountsData]);

    const handleOnView = (id) => {
        router.push(`/private/profile/${id}`);
    };

    return (
        <View style={tw`flex-1 bg-white dark:bg-black`}>
            <Stack.Screen
                options={{
                    headerTitle: 'Inbox',
                    title: 'Inbox',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerTitleStyle: {
                        fontSize: 24,
                        fontWeight: 'bold',
                        color: colorScheme === 'dark' ? '#fff' : '#000',
                    },
                    headerBackTitle: 'Back',
                    headerShadowVisible: false,
                    headerBackTitleVisible: false,
                    headerShown: true,
                }}
            />

            {isLoading || isFetching ? (
                <YStack flex={1} alignItems="center" justifyContent="center">
                    <ActivityIndicator size="large" />
                </YStack>
            ) : (
                <ScrollView>
                    {categories.map((category) => (
                        <CategoryCard
                            key={category.id}
                            icon={category.icon}
                            iconColor={category.iconColor}
                            iconBgColor={category.iconBgColor}
                            title={category.title}
                            subtitle={category.subtitle}
                            count={category.count}
                            onPress={() => router.push(category.route as any)}
                        />
                    ))}

                    {suggestedAccounts.length > 0 && (
                        <View style={tw`my-6`}>
                            <View style={tw`px-4 py-2`}>
                                <StackText
                                    fontSize="$5"
                                    fontWeight="semibold"
                                    textColor="text-black dark:text-gray-400">
                                    Suggested accounts
                                </StackText>
                            </View>

                            {suggestedAccounts.map((account: any) => (
                                <SuggestedAccountCard
                                    key={account.id}
                                    account={account}
                                    onFollow={(id) => followMutation.mutate(id)}
                                    onView={(id) => handleOnView(id)}
                                    onHide={(id) => hideSuggestionMutation.mutate(id)}
                                    isFollowing={followingAccountId === account.id}
                                    isHiding={hidingAccountId === account.id}
                                />
                            ))}
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}
