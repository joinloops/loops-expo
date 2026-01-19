import { useTheme } from '@/contexts/ThemeContext';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchAccountBlocks, searchAccountBlocks, unblockAccount } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    Text,
    TextInput,
    View,
} from 'react-native';
import tw from 'twrnc';

export default function BlockedAccountsScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const queryClient = useQueryClient();
    const { colorScheme } = useTheme();

    const isSearching = debouncedSearch.trim().length > 0;

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        refetch,
        isRefetching,
    } = useInfiniteQuery({
        queryKey: ['blockedAccounts', debouncedSearch],
        queryFn: ({ pageParam }) =>
            isSearching
                ? searchAccountBlocks(debouncedSearch, pageParam)
                : fetchAccountBlocks(pageParam),
        getNextPageParam: (lastPage) => lastPage?.meta?.next_cursor,
        initialPageParam: undefined,
    });

    const unblockMutation = useMutation({
        mutationFn: (accountId) => unblockAccount(accountId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['blockedAccounts'] });
        },
        onError: (error) => {
            Alert.alert('Error', 'Failed to unblock account. Please try again.');
            console.log('Unblock error:', error);
        },
    });

    const handleUnblock = (account) => {
        Alert.alert('Unblock Account', `Are you sure you want to unblock @${account.username}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Unblock',
                style: 'destructive',
                onPress: () => unblockMutation.mutate(account.id),
            },
        ]);
    };

    const formatBlockedDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Blocked today';
        if (diffDays === 1) return 'Blocked yesterday';
        if (diffDays < 7) return `Blocked ${diffDays} days ago`;
        if (diffDays < 30) return `Blocked ${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `Blocked ${Math.floor(diffDays / 30)} months ago`;
        return `Blocked ${Math.floor(diffDays / 365)} years ago`;
    };

    const renderItem = ({ item }) => (
        <View
            style={tw`flex-row items-center py-4 px-5 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800`}>
            <Image source={{ uri: item.account.avatar }} style={tw`w-12 h-12 rounded-full mr-3`} />
            <View style={tw`flex-1`}>
                <Text style={tw`text-base font-semibold text-gray-900 dark:text-white`}>
                    {item.account.name}
                </Text>
                <Text style={tw`text-sm text-gray-600 dark:text-gray-300`}>
                    @{item.account.username}
                </Text>
                <Text style={tw`text-xs text-gray-500 dark:text-gray-400 mt-1`}>
                    {formatBlockedDate(item.blocked_at)}
                </Text>
            </View>
            <Pressable
                onPress={() => handleUnblock(item.account)}
                disabled={unblockMutation.isPending}
                style={({ pressed }) => [
                    tw`px-4 py-2 rounded-lg bg-blue-600`,
                    pressed && tw`bg-blue-700`,
                    unblockMutation.isPending && tw`bg-gray-400`,
                ]}>
                <Text style={tw`text-white font-semibold text-sm`}>Unblock</Text>
            </Pressable>
        </View>
    );

    const renderEmpty = () => {
        if (isLoading) return null;

        return (
            <View style={tw`flex-1 items-center justify-center py-20 px-5`}>
                <Ionicons name="people-outline" size={64} color="#ccc" />
                <Text style={tw`text-lg font-semibold text-gray-900 mt-4`}>
                    {isSearching ? 'No results found' : 'No blocked accounts'}
                </Text>
                <Text style={tw`text-sm text-gray-600 mt-2 text-center`}>
                    {isSearching
                        ? 'Try searching with a different username'
                        : 'Accounts you block will appear here'}
                </Text>
            </View>
        );
    };

    const renderFooter = () => {
        if (!isFetchingNextPage) return null;
        return (
            <View style={tw`py-4`}>
                <ActivityIndicator size="small" color="#3b82f6" />
            </View>
        );
    };

    const allBlockedAccounts = data?.pages.flatMap((page) => page.data) ?? [];

    return (
        <View style={tw`flex-1 bg-gray-100 dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Blocked accounts',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerBackTitle: 'Settings',
                    headerShown: true,
                }}
            />

            <View
                style={tw`bg-white dark:bg-black px-5 py-3 border-b border-gray-200 dark:border-gray-800`}>
                <View
                    style={tw`flex flex-row justify-center items-center bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-3`}>
                    <Ionicons name="search-outline" size={20} color="#999" />
                    <TextInput
                        style={tw`flex-1 ml-2 text-gray-600 dark:text-white`}
                        placeholder="Search blocked accounts..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#999" />
                        </Pressable>
                    )}
                </View>
            </View>

            {isLoading ? (
                <View style={tw`flex-1 items-center justify-center`}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            ) : isError ? (
                <View style={tw`flex-1 items-center justify-center px-5`}>
                    <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                    <Text style={tw`text-lg font-semibold text-gray-900 dark:text-white mt-4`}>
                        Something went wrong
                    </Text>
                    <Text style={tw`text-sm text-gray-600 dark:text-gray-400 mt-2 text-center`}>
                        Unable to load blocked accounts
                    </Text>
                    <Pressable
                        onPress={() => refetch()}
                        style={tw`mt-4 px-6 py-3 bg-blue-600 rounded-lg`}>
                        <Text style={tw`text-white font-semibold`}>Try Again</Text>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={allBlockedAccounts}
                    renderItem={renderItem}
                    keyExtractor={(item) => item?.account?.id}
                    ListEmptyComponent={renderEmpty}
                    ListFooterComponent={renderFooter}
                    onEndReached={() => {
                        if (hasNextPage && !isFetchingNextPage) {
                            fetchNextPage();
                        }
                    }}
                    onEndReachedThreshold={0.5}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={refetch}
                            tintColor="#3b82f6"
                        />
                    }
                />
            )}
        </View>
    );
}
