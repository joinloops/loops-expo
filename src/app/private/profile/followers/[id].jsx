import AccountListItem from '@/components/profile/AccountListItem';
import { StackText, YStack } from '@/components/ui/Stack';
import { useAuthStore } from '@/utils/authStore';
import { fetchAccountFollowers, fetchAccountFollowing, fetchAccountFriends, fetchAccountSuggested, followAccount, unfollowAccount } from '@/utils/requests';
import { prettyCount } from '@/utils/ui';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

const keyExtractor = (item, index) => `user-${item.id}-${index}`;

export default function Screen() {
    const { id, username, followersCount, followingCount } = useLocalSearchParams();
    const [activeTab, setActiveTab] = useState('following');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [loadingUserId, setLoadingUserId] = useState(null);
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const followersQuery = useInfiniteQuery({
        queryKey: ['accountFollowers', id, debouncedSearch],
        queryFn: fetchAccountFollowers,
        initialPageParam: 0,
        refetchOnWindowFocus: false,
        getNextPageParam: (lastPage) => lastPage.meta?.next_cursor,
        enabled: activeTab === 'followers',
    });

    const followingQuery = useInfiniteQuery({
        queryKey: ['accountFollowing', id, debouncedSearch],
        queryFn: fetchAccountFollowing,
        initialPageParam: 0,
        refetchOnWindowFocus: false,
        getNextPageParam: (lastPage) => lastPage.meta?.next_cursor,
        enabled: activeTab === 'following',
    });

    const friendsQuery = useInfiniteQuery({
        queryKey: ['accountFriends', id],
        queryFn: fetchAccountFriends,
        initialPageParam: 0,
        refetchOnWindowFocus: false,
        getNextPageParam: (lastPage) => lastPage.meta?.next_cursor,
        enabled: activeTab === 'friends',
    });

    const suggestedQuery = useInfiniteQuery({
        queryKey: ['accountSuggested', id],
        queryFn: fetchAccountSuggested,
        initialPageParam: 0,
        refetchOnWindowFocus: false,
        getNextPageParam: (lastPage) => lastPage.meta?.next_cursor,
        enabled: activeTab === 'suggested',
    })

    const activeQuery = useMemo(() => {
        const queries = {
            followers: followersQuery,
            following: followingQuery,
            friends: friendsQuery,
            suggested: suggestedQuery
        };
        return queries[activeTab] || followersQuery;
    }, [activeTab, followersQuery, followingQuery, friendsQuery, suggestedQuery]);

    const followMutation = useMutation({
        mutationFn: async (userId) => {
            const res = await followAccount(userId.toString());
            return res.data;
        },
        onMutate: async (userId) => {
            setLoadingUserId(userId);
            
            const queryKey = ['accountFollowers', id, debouncedSearch];
            const followingKey = ['accountFollowing', id, debouncedSearch];
            const suggestedKey = ['accountSuggested', id];
            const friendsKey = ['accountFriends', id];
            
            await queryClient.cancelQueries({ queryKey });
            
            const previousData = queryClient.getQueryData(queryKey);
            
            queryClient.setQueriesData({ queryKey }, (old) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        data: page.data?.map(item => 
                            item.id === userId 
                                ? { ...item, is_following: true }
                                : item
                        )
                    }))
                };
            });
            
            return { previousData };
        },
        onSuccess: () => {
            setLoadingUserId(null);
            
            queryClient.invalidateQueries({ queryKey: ['accountFollowers', id] });
            queryClient.invalidateQueries({ queryKey: ['accountFollowing', id] });
            queryClient.invalidateQueries({ queryKey: ['accountSuggested', id] });
            queryClient.invalidateQueries({ queryKey: ['accountFriends', id] });
            queryClient.invalidateQueries({ queryKey: ['fetchAccount', id.toString()] });
        },
        onError: (error, variables, context) => {
            setLoadingUserId(null);
            
            if (context?.previousData) {
                queryClient.setQueryData(
                    ['accountFollowers', id, debouncedSearch], 
                    context.previousData
                );
            }
            console.error('Follow action failed:', error);
        },
    });

    const unfollowMutation = useMutation({
        mutationFn: async (userId) => {
            const res = await unfollowAccount(userId.toString());
            return res.data;
        },
        onMutate: async (userId) => {
            setLoadingUserId(userId);
            
            const queryKey = ['accountFollowing', id, debouncedSearch];
            
            await queryClient.cancelQueries({ queryKey });
            
            const previousData = queryClient.getQueryData(queryKey);
            
            queryClient.setQueriesData({ queryKey }, (old) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        data: page.data?.map(item => 
                            item.id === userId 
                                ? { ...item, is_following: false }
                                : item
                        )
                    }))
                };
            });
            
            return { previousData };
        },
        onSuccess: () => {
            setLoadingUserId(null);
            
            queryClient.invalidateQueries({ queryKey: ['accountFollowers', id] });
            queryClient.invalidateQueries({ queryKey: ['accountFollowing', id] });
            queryClient.invalidateQueries({ queryKey: ['accountSuggested', id] });
            queryClient.invalidateQueries({ queryKey: ['accountFriends', id] });
            queryClient.invalidateQueries({ queryKey: ['fetchAccount', id.toString()] });
        },
        onError: (error, variables, context) => {
            setLoadingUserId(null);
            
            if (context?.previousData) {
                queryClient.setQueryData(
                    ['accountFollowing', id, debouncedSearch], 
                    context.previousData
                );
            }
            console.error('Unfollow action failed:', error);
        },
    });
    
    const {
        data: feed,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isFetching,
        refetch,
        status,
    } = activeQuery;

    const handleFollow = useCallback((userId) => {
        followMutation.mutate(userId);
    }, [followMutation]);

    const handleUnfollow = useCallback((userId) => {
        unfollowMutation.mutate(userId);
    }, [unfollowMutation]);

    const RenderItem = ({ item }) => (
        <AccountListItem 
            key={item.id} 
            item={item} 
            handleFollow={handleFollow}
            handleUnfollow={handleUnfollow}
            isLoading={loadingUserId === item.id}
        />
    );

    const EmptyList = useCallback(() => {
        if (isFetching || isFetchingNextPage) {
            return null;
        }

        if (status === 'success') {
            if (debouncedSearch.trim()) {
                return (
                    <YStack paddingY="$5" justifyContent="center" alignItems="center" gap="$3">
                        <Ionicons name="search-outline" size={80} style={tw`text-gray-300`} />
                        <StackText fontSize="$5" style={tw`text-gray-500`}>
                            No users found
                        </StackText>
                    </YStack>
                );
            }
            
            return (
                <YStack paddingY="$5" justifyContent="center" alignItems="center">
                    <StackText fontSize="$5" style={tw`text-gray-500`}>
                        {activeTab === 'followers' 
                            ? 'This account has no followers yet.' :
                            activeTab === 'following' ? 'This account is not following anyone yet.' :
                            activeTab === 'friends' ? 'No mutual friends yet.' : 'No suggestions found :('
                        }
                    </StackText>
                </YStack>
            );
        }

        return null;
    }, [isFetching, isFetchingNextPage, status, debouncedSearch, activeTab]);

    const feedData = useMemo(() => {
        if (!feed?.pages?.length) {
            return [];
        }
        return feed.pages.flatMap((p) => p?.data ?? []);
    }, [feed]);

    const handleEndReached = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const TabButton = ({ tab, label, count }) => {
        const isActive = activeTab === tab;
        return (
            <TouchableOpacity
                style={tw`flex-1 pb-3 px-5 ${isActive ? 'border-b-2 border-black' : ''}`}
                onPress={() => {
                    setActiveTab(tab);
                    setSearchQuery('');
                }}
            >
                <Text style={tw`text-center font-semibold ${isActive ? 'text-black' : 'text-gray-400'}`}>
                    {label} {count > 0 ? prettyCount(count) : ''}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={tw`flex-1 bg-white`}>
            <Stack.Screen
                options={{
                    title: 'User',
                    headerStyle: { backgroundColor: '#fff' },
                    headerTintColor: '#000',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                        color: '#000',
                    },
                    headerBackTitle: 'Back',
                    headerShadowVisible: false,
                    headerBackTitleVisible: true,
                    headerShown: true,
                    headerTitle: username || 'Account',
                }}
            />

            <View style={tw`border-b border-gray-200`}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={tw`${user?.id == id ? 'flex-1' : 'flex'} px-6 pt-2 gap-3`}
                >
                    <TabButton tab="following" label="Following" count={followingCount} />
                    <TabButton tab="followers" label="Followers" count={followersCount} />
                    { followingCount > 2 && user?.id != id && (<TabButton tab="friends" label="Friends" count={0} />) }
                    { user?.id != id && (<TabButton tab="suggested" label="Suggested" count={0} />) }
                </ScrollView>
            </View>
   
            { ['followers', 'following'].includes(activeTab) && <View style={tw`px-4 py-3 bg-white`}>
                <View style={tw`flex-row items-center bg-gray-100 rounded-xl px-3 py-3`}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        style={[
                            tw`flex-1 ml-2 text-base`,
                            {
                                height: 40,
                                paddingVertical: 0,
                                lineHeight: 20,
                            },
                        ]}
                        placeholder="Search users"
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            }

            <FlatList
                data={feedData}
                keyExtractor={keyExtractor}
                renderItem={RenderItem}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={EmptyList}
                ListHeaderComponent={
                    isFetching && !isFetchingNextPage && feedData.length === 0 ? (
                        <YStack paddingY="$6" alignItems="center">
                            <ActivityIndicator color="#F02C56" size="large" />
                        </YStack>
                    ) : null
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
                refreshControl={
                    <RefreshControl 
                        refreshing={isFetching && !isFetchingNextPage && feedData.length > 0} 
                        onRefresh={refetch}
                        colors={['#F02C56']}
                        tintColor="#F02C56"
                    />
                }
            />
        </View>
    );
}