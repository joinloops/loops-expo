import AccountHeader from '@/components/profile/AccountHeader';
import AccountTabs from '@/components/profile/AccountTabs';
import VideoGrid from '@/components/profile/VideoGrid';
import { ReportModal } from '@/components/ReportModal';
import { StackText, YStack } from '@/components/ui/Stack';
import {
    blockAccount,
    cancelFollowRequest,
    fetchAccount,
    fetchAccountState,
    fetchUserVideos,
    followAccount,
    unblockAccount,
    unfollowAccount
} from '@/utils/requests';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, Share, Text, View } from 'react-native';
import tw from 'twrnc';

export default function ProfileScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('videos');
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    const { data: user, isLoading: userLoading } = useQuery({
        queryKey: ['fetchAccount', id.toString()],
        queryFn: async () => {
            const res = await fetchAccount(id.toString());
            return res.data;
        },
    });

    const { data: userState, refetch: refetchUserState } = useQuery({
        queryKey: ['fetchAccountState', id.toString()],
        queryFn: async () => {
            const res = await fetchAccountState(id.toString());
            return res.data;
        },
        enabled: !!user,
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
        queryKey: ['userVideos', id.toString()],
        queryFn: fetchUserVideos,
        initialPageParam: undefined,
        refetchOnWindowFocus: true,
        getNextPageParam: (lastPage) => lastPage.meta?.next_cursor,
        enabled: !!user,
    });

    const videos = useMemo(() => {
        if (!videosData?.pages?.length) return [];
        return videosData.pages.flatMap((p) => p?.data ?? []);
    }, [videosData]);

    const handleEndReached = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const followMutation = useMutation({
        mutationFn: async () => {
            if (userState?.pending_follow_request) {
                const res = await cancelFollowRequest(id.toString());
                return res.data;
            } else if (userState?.following) {
                const res = await unfollowAccount(id.toString());
                return res.data;
            } else {
                const res = await followAccount(id.toString());
                return res.data;
            }
        },
        onSuccess: async () => {
            await refetchUserState();
            
            queryClient.invalidateQueries(['fetchAccount', id.toString()]);
        },
        onError: (error) => {
            console.error('Follow action failed:', error);
        },
    });

    const blockMutation = useMutation({
        mutationFn: async () => {
            if (userState?.blocking) {
                const res = await unblockAccount(id.toString());
                return res.data;
            } else {
                const res = await blockAccount(id.toString());
                return res.data;
            }
        },
        onSuccess: async () => {
            await refetchUserState();
            setShowMenuModal(false);
        },
        onError: (error) => {
            console.error('Block action failed:', error);
        },
    });

    const handleVideoPress = (video) => {
        router.push(`/private/profile/feed/${video.id}?profileId=${video.account.id}`);
    };

    const handleOnOpenMenu = () => {
        setShowMenuModal(true);
    };

    const handleBlockPress = () => {
        setShowMenuModal(false);
        
        if (userState?.blocked) {
            Alert.alert(
                'Unblock User',
                `Unblock @${user?.username}?`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                    },
                    {
                        text: 'Unblock',
                        onPress: () => blockMutation.mutate(),
                    },
                ]
            );
        } else {
            Alert.alert(
                'Block User',
                `Block @${user?.username}? They won't be able to see your profile or contact you.`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                    },
                    {
                        text: 'Block',
                        style: 'destructive',
                        onPress: () => blockMutation.mutate(),
                    },
                ]
            );
        }
    };

    const handleReportPress = () => {
        setShowMenuModal(false);
        setShowReportModal(true);
    };

    const handleCommunityGuidelines = () => {
        setShowReportModal(false);
        router.push('/private/settings/legal/community')
    };

    const handleAccountShare = async () => {
        try {
            const shareContent = {
                message: `Check out @${user.username}'s account on Loops!`,
            };

            if (user.url) {
                shareContent.url = user.url;
                shareContent.message += `\n${user.url}`;
            }

            const result = await Share.share(shareContent);

            if (result.action === Share.sharedAction) {
                console.log('Shared successfully');
            }
        } catch (error) {
            console.error('Share error:', error);
        }
    }

    const handleOnUnblockPress = () => {
         if (userState?.blocking) {
            Alert.alert(
                'Unblock User',
                `Are you sure you want to unblock @${user?.username}?`,
                [
                    {
                        text: 'No',
                        style: 'cancel',
                    },
                    {
                        text: 'Unblock',
                        style: 'destructive',
                        onPress: () => blockMutation.mutate(),
                    },
                ]
            );
        }
    }

    const handleOnFollowPress = () => {
        if (userState?.pending_follow_request) {
            Alert.alert(
                'Cancel Follow Request',
                `Cancel your follow request to @${user?.username}?`,
                [
                    {
                        text: 'No',
                        style: 'cancel',
                    },
                    {
                        text: 'Yes',
                        style: 'destructive',
                        onPress: () => followMutation.mutate(),
                    },
                ]
            );
        } else if (userState?.following) {
            Alert.alert(
                'Unfollow',
                `Unfollow @${user?.username}?`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                    },
                    {
                        text: 'Unfollow',
                        style: 'destructive',
                        onPress: () => followMutation.mutate(),
                    },
                ]
            );
        } else {
            followMutation.mutate();
        }
    };

    const renderEmpty = () => (
        <YStack paddingY="$8" alignItems="center" justifyContent="center">
            <StackText fontSize="$4" color="#86878B">
                {activeTab === 'videos' && 'No videos yet'}
                {activeTab === 'favorites' && 'No favorites yet'}
                {activeTab === 'reblogs' && 'No reblogs yet'}
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
                    headerTitle: user?.name ? `${user.name}` : 'Profile',
                }}
            />

            <FlatList
                data={videos || []}
                numColumns={3}
                keyExtractor={(item) => item.id.toString()}
                ListHeaderComponent={
                    <>
                        <AccountHeader 
                            user={user} 
                            userState={userState} 
                            onFollowPress={handleOnFollowPress}
                            onMenuPress={handleOnOpenMenu}
                            onUnblockPress={() => handleOnUnblockPress()}
                            isFollowLoading={followMutation.isPending}
                        />
                        <AccountTabs activeTab={activeTab} onTabChange={setActiveTab} />
                    </>
                }
                renderItem={({ item }) => <VideoGrid video={item} onPress={handleVideoPress} />}
                ListEmptyComponent={
                    videosLoading ? (
                        <YStack paddingY="$8" alignItems="center">
                            <ActivityIndicator size="large" color="#FE2C55" />
                        </YStack>
                    ) : (
                        renderEmpty()
                    )
                }
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <YStack paddingY="$6" alignItems="center">
                            <ActivityIndicator color="#F02C56" />
                        </YStack>
                    ) : null
                }
                onEndReachedThreshold={0.4}
                onEndReached={handleEndReached}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    flexGrow: 1,
                }}
            />

            <Modal
                visible={showMenuModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowMenuModal(false)}
            >
                <Pressable 
                    style={tw`flex-1 bg-black/50 justify-end`}
                    onPress={() => setShowMenuModal(false)}
                >
                    <Pressable 
                        style={tw`bg-white rounded-t-3xl`}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={tw`py-4`}>
                            <Pressable
                                style={tw`px-6 py-4 flex-row items-center`}
                                onPress={() => handleAccountShare()}
                            >
                                <Text style={tw`text-base text-gray-900 font-medium`}>
                                    Share
                                </Text>
                            </Pressable>

                            <View style={tw`h-px bg-gray-200 mx-6`} />

                            <Pressable
                                style={tw`px-6 py-4 flex-row items-center`}
                                onPress={() => handleBlockPress()}
                            >
                                <Text style={tw`text-base text-gray-900 font-medium`}>
                                    {userState?.blocked ? 'Unblock' : 'Block'}
                                </Text>
                            </Pressable>

                            <View style={tw`h-px bg-gray-200 mx-6`} />

                            <Pressable
                                style={tw`px-6 py-4 flex-row items-center`}
                                onPress={() => handleReportPress()}
                            >
                                <Text style={tw`text-base text-red-600 font-medium`}>
                                    Report
                                </Text>
                            </Pressable>

                            <View style={tw`mt-2 border-t border-gray-200`}>
                                <Pressable
                                    style={tw`px-6 py-4`}
                                    onPress={() => setShowMenuModal(false)}
                                >
                                    <Text style={tw`text-base text-gray-600 font-medium text-center`}>
                                        Cancel
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {user && (
                <ReportModal
                    visible={showReportModal}
                    userState={userState}
                    onClose={() => setShowReportModal(false)}
                    onCommunityGuidelines={handleCommunityGuidelines}
                    reportType="profile"
                    item={user}
                />
            )}
        </View>
    );
}