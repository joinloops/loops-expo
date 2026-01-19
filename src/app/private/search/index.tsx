import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/utils/authStore';
import { followAccount, searchContent, unfollowAccount } from '@/utils/requests';
import { prettyCount } from '@/utils/ui';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Keyboard,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

type TabType = 'Top' | 'Users' | 'Videos' | 'Hashtags';
type FilterType = 'All' | 'Unwatched' | 'Watched' | 'Recently uploaded';

type Hashtag = {
    id: number;
    name: string;
    slug: string;
    count: number;
    created_at: string;
};

export default function SearchScreen() {
    const params = useLocalSearchParams<{ query?: string; type?: string }>();
    const router = useRouter();
    const { user } = useAuthStore();
    const { colorScheme } = useTheme();
    const queryClient = useQueryClient();

    const searchInputRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState(params.query || '');
    const [activeTab, setActiveTab] = useState<TabType>('Top');
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');

    const tabs: TabType[] = ['Top', 'Users', 'Videos', 'Hashtags'];
    const filters: FilterType[] = ['All', 'Unwatched', 'Watched', 'Recently uploaded'];

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['search', searchQuery, activeTab],
        queryFn: () =>
            searchContent({
                query: searchQuery,
                type: activeTab,
                limit: 20,
            }),
        enabled: searchQuery.length > 0,
        staleTime: 30000,
    });

    const followMutation = useMutation({
        mutationFn: async ({ userId, isFollowing }: { userId: string; isFollowing: boolean }) => {
            if (isFollowing) {
                const res = await unfollowAccount(userId);
                return res.data;
            } else {
                const res = await followAccount(userId);
                return res.data;
            }
        },
        onMutate: async ({ userId, isFollowing }) => {
            await queryClient.cancelQueries({ queryKey: ['search', searchQuery, activeTab] });

            const previousData = queryClient.getQueryData(['search', searchQuery, activeTab]);

            queryClient.setQueryData(['search', searchQuery, activeTab], (old: any) => {
                if (!old) return old;

                return {
                    ...old,
                    users: old.users?.map((u: User) =>
                        u.id === userId
                            ? {
                                  ...u,
                                  is_following: !isFollowing,
                                  follower_count: isFollowing
                                      ? u.follower_count - 1
                                      : u.follower_count + 1,
                              }
                            : u,
                    ),
                };
            });

            return { previousData };
        },
        onError: (err, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['search', searchQuery, activeTab], context.previousData);
            }
            console.error('Follow action failed:', err);
        },
    });

    useEffect(() => {
        if (params.query && params.query !== searchQuery) {
            setSearchQuery(params.query);
        }
    }, [params.query]);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            refetch();
            Keyboard.dismiss();
        }
    };

    const handleClear = () => {
        setSearchQuery('');
        setActiveFilter('All');
        setActiveTab('Top');
        searchInputRef?.current?.focus();
    };

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        router.setParams({ type: tab, query: searchQuery });
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        if (days < 30) return `${Math.floor(days / 7)}w ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const handleFollowPress = (item: User) => {
        if (item.is_following) {
            Alert.alert('Unfollow User', `Are you sure you want to unfollow @${item?.username}?`, [
                {
                    text: 'No',
                    style: 'cancel',
                },
                {
                    text: 'Unfollow',
                    style: 'destructive',
                    onPress: () =>
                        followMutation.mutate({
                            userId: item.id,
                            isFollowing: item.is_following,
                        }),
                },
            ]);
        } else {
            followMutation.mutate({
                userId: item.id,
                isFollowing: item.is_following,
            });
        }
    };

    const renderUserCard = ({ item }: { item: User }) => {
        const isOwnAccount = item.id === user?.id;
        const isFollowing = item.is_following;
        const isLoading = followMutation.isPending && followMutation.variables?.userId === item.id;

        return (
            <TouchableOpacity
                style={tw`flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800`}
                onPress={() => router.push(`/private/profile/${item.id}`)}
                activeOpacity={0.7}>
                <Image
                    source={{ uri: item.avatar }}
                    style={tw`w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700`}
                />
                <View style={tw`flex-1 ml-3`}>
                    <View style={tw`flex-row items-center`}>
                        <Text
                            style={tw`text-base font-semibold text-black dark:text-white`}
                            numberOfLines={1}>
                            {item.username}
                        </Text>
                    </View>
                    <Text style={tw`text-sm text-gray-600 dark:text-gray-400`} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text style={tw`text-xs text-gray-500 dark:text-gray-500 mt-0.5`}>
                        {prettyCount(item.follower_count)} followers ·{' '}
                        {prettyCount(item.post_count)} posts
                    </Text>
                </View>

                {isOwnAccount ? (
                    <PressableHaptics
                        style={tw`bg-gray-200 dark:bg-gray-700 px-6 py-2 rounded-md`}
                        onPress={(e) => {
                            e.stopPropagation();
                            router.push(`/private/profile/${item.id}`);
                        }}>
                        <Text style={tw`text-black dark:text-white font-semibold text-sm`}>
                            View
                        </Text>
                    </PressableHaptics>
                ) : (
                    <PressableHaptics
                        style={tw`${isFollowing ? 'bg-gray-200 dark:bg-gray-700' : 'bg-[#FE2C55]'} px-6 py-2 rounded-md min-w-[90px] items-center justify-center ${isLoading ? 'opacity-70' : ''}`}
                        onPress={(e) => {
                            e.stopPropagation();
                            if (!isLoading) {
                                handleFollowPress(item);
                            }
                        }}
                        disabled={isLoading}>
                        {isLoading ? (
                            <ActivityIndicator
                                size="small"
                                color={
                                    isFollowing
                                        ? colorScheme === 'dark'
                                            ? '#fff'
                                            : '#000'
                                        : '#fff'
                                }
                            />
                        ) : (
                            <Text
                                style={tw`${isFollowing ? 'text-black dark:text-white' : 'text-white'} font-semibold text-sm`}>
                                {isFollowing ? 'Following' : 'Follow'}
                            </Text>
                        )}
                    </PressableHaptics>
                )}
            </TouchableOpacity>
        );
    };

    const renderVideoItem = ({ item, index }) => (
        <TouchableOpacity
            style={tw`w-[48%] mb-3 ${index % 2 === 0 ? 'mr-[4%]' : ''}`}
            onPress={() =>
                router.push(`/private/profile/feed/${item.id}?profileId=${item?.account?.id}`)
            }
            activeOpacity={0.9}>
            <View style={tw`relative`}>
                <Image
                    source={{ uri: item.media.thumbnail }}
                    style={[
                        tw`w-full rounded-lg bg-gray-200 dark:bg-gray-700`,
                        { aspectRatio: 3 / 4 },
                    ]}
                    resizeMode="cover"
                />

                <View style={tw`absolute inset-0 bg-black bg-opacity-10 rounded-lg`} />

                <View
                    style={tw`absolute bottom-2 left-2 flex-row items-center bg-black bg-opacity-50 px-2 py-1 rounded-full`}>
                    <Ionicons name="heart" size={14} color="white" />
                    <Text style={tw`text-white text-xs ml-1 font-semibold`}>
                        {prettyCount(item.likes)}
                    </Text>
                </View>

                <View
                    style={tw`absolute top-2 right-2 bg-black bg-opacity-50 px-2 py-1 rounded-full`}>
                    <Text style={tw`text-white text-xs font-medium`}>
                        {formatDate(item.created_at)}
                    </Text>
                </View>
            </View>

            <View style={tw`flex-row items-start mt-1.5`}>
                <Image
                    source={{ uri: item.account.avatar }}
                    style={tw`w-5 h-5 rounded-full mr-1.5 mt-0.5`}
                />
                <Text
                    style={tw`flex-1 text-xs text-gray-700 dark:text-gray-300 leading-4`}
                    numberOfLines={2}>
                    {item.caption}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderHashtagCard = ({ item }: { item: Hashtag }) => (
        <TouchableOpacity
            style={tw`flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800`}
            onPress={() => {
                setSearchQuery(item.name);
                handleTabChange('Videos');
            }}
            activeOpacity={0.7}>
            <View
                style={tw`w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center`}>
                <Text style={tw`text-2xl font-bold text-gray-700 dark:text-gray-300`}>#</Text>
            </View>

            <View style={tw`flex-1 ml-3`}>
                <Text
                    style={tw`text-base font-semibold text-black dark:text-white`}
                    numberOfLines={1}>
                    {item.name}
                </Text>
                <Text style={tw`text-xs text-gray-500 dark:text-gray-400 mt-0.5`}>
                    {prettyCount(item.count)} {item.count === 1 ? 'post' : 'posts'}
                </Text>
            </View>

            <PressableHaptics
                style={tw`bg-[#FE2C55] px-10 py-2 rounded-md`}
                onPress={(e) => {
                    e.stopPropagation();
                    setSearchQuery('#' + item.name);
                    handleTabChange('Videos');
                }}>
                <Ionicons name="videocam" size={20} color="white" />
            </PressableHaptics>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={tw`flex-1 items-center justify-center py-20`}>
            <Ionicons
                name="search-outline"
                size={72}
                color={colorScheme === 'dark' ? '#374151' : '#E5E7EB'}
            />
            <Text style={tw`text-gray-500 dark:text-gray-400 mt-4 text-base`}>
                {searchQuery ? 'No results found' : 'Search for videos, users, and more'}
            </Text>
        </View>
    );

    const renderContent = () => {
        if (!searchQuery) {
            return renderEmptyState();
        }

        if (isLoading) {
            return (
                <View style={tw`flex-1 items-center justify-center py-20`}>
                    <ActivityIndicator size="large" color="#FE2C55" />
                    <Text style={tw`text-gray-500 dark:text-gray-400 mt-4`}>Searching...</Text>
                </View>
            );
        }

        if (
            !data ||
            (data.videos?.length === 0 && data.users?.length === 0 && data.hashtags?.length === 0)
        ) {
            return renderEmptyState();
        }

        const isHashtagSearch = params.type === 'hashtag';
        const isVideoSearch = params.type === 'Videos';

        const renderListHeader = () => {
            if (activeTab === 'Hashtags') {
                return (
                    <View style={tw`mb-3`}>
                        <Text
                            style={tw`px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300`}>
                            Hashtags
                        </Text>
                        {data.hashtags?.map((hashtag) => (
                            <View key={hashtag.id}>{renderHashtagCard({ item: hashtag })}</View>
                        ))}
                    </View>
                );
            }

            if (activeTab === 'Users') {
                return (
                    <View style={tw`mb-3`}>
                        <Text
                            style={tw`px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300`}>
                            Accounts
                        </Text>
                        {data.users?.map((user) => (
                            <View key={user.id}>{renderUserCard({ item: user })}</View>
                        ))}
                    </View>
                );
            }

            if (activeTab === 'Videos') {
                return (
                    <View style={tw`mb-3`}>
                        <Text
                            style={tw`px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300`}>
                            Videos
                        </Text>
                    </View>
                );
            }

            return (
                <View style={tw`mb-3`}>
                    {data.users?.length > 0 && (
                        <>
                            <Text
                                style={tw`px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300`}>
                                Accounts
                            </Text>
                            {data.users.map((user) => (
                                <View key={user.id}>{renderUserCard({ item: user })}</View>
                            ))}
                            <View style={tw`h-3 bg-gray-50 dark:bg-gray-900 mt-2 mb-3`} />
                        </>
                    )}

                    {data.hashtags?.length > 0 && (
                        <>
                            <Text
                                style={tw`px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300`}>
                                Hashtags
                            </Text>
                            {data.hashtags.map((hashtag) => (
                                <View key={hashtag.id}>{renderHashtagCard({ item: hashtag })}</View>
                            ))}
                            <View style={tw`h-3 bg-gray-50 dark:bg-gray-900 mt-2 mb-3`} />
                        </>
                    )}

                    {data.videos?.length > 0 && (
                        <Text
                            style={tw`px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300`}>
                            Videos
                        </Text>
                    )}
                </View>
            );
        };

        return (
            <FlatList
                data={data.videos}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={tw`px-3`}
                renderItem={renderVideoItem}
                ListHeaderComponent={renderListHeader}
                contentContainerStyle={tw`pb-6 pt-2`}
                showsVerticalScrollIndicator={false}
                refreshing={isFetching && !isLoading}
                onRefresh={refetch}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={() => Keyboard.dismiss()}
            />
        );
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-white dark:bg-black`}>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            <View
                style={tw`pt-1 pb-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black`}>
                <View style={tw`flex-row items-center px-4 mb-3`}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={tw`mr-3`}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons
                            name="chevron-back"
                            size={26}
                            color={colorScheme === 'dark' ? 'white' : 'black'}
                        />
                    </TouchableOpacity>

                    <View
                        style={tw`flex-1 flex-row items-center bg-gray-100 dark:bg-gray-900 rounded-lg px-3 py-2.5`}>
                        <Ionicons name="search" size={20} color="#9CA3AF" />
                        <TextInput
                            ref={searchInputRef}
                            style={[
                                tw`flex-1 ml-2 text-gray-900 dark:text-white`,
                                {
                                    fontSize: 16,
                                    paddingVertical: 0,
                                    paddingTop: 0,
                                    paddingBottom: 0,
                                    height: 20,
                                    textAlignVertical: 'center',
                                    ...(Platform.OS === 'android' && { includeFontPadding: false }),
                                },
                            ]}
                            placeholder={params.type === 'hashtag' ? 'Search hashtags' : 'Search'}
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={handleSearch}
                            autoFocus={!params.query}
                            returnKeyType="search"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                onPress={handleClear}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        style={tw`ml-3`}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons
                            name="ellipsis-horizontal"
                            size={26}
                            color={colorScheme === 'dark' ? 'white' : 'black'}
                        />
                    </TouchableOpacity>
                </View>

                <View style={tw`border-b border-gray-200 dark:border-gray-800`}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={tabs}
                        keyExtractor={(item) => item}
                        contentContainerStyle={tw`px-4`}
                        renderItem={({ item: tab }) => (
                            <TouchableOpacity
                                style={tw`mr-6 pb-3 ${activeTab === tab ? 'border-b-2 border-black dark:border-white' : ''}`}
                                onPress={() => handleTabChange(tab)}>
                                <Text
                                    style={tw`text-base px-3 ${
                                        activeTab === tab
                                            ? 'font-semibold text-black dark:text-white'
                                            : 'font-normal text-gray-500 dark:text-gray-400'
                                    }`}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </View>

            {renderContent()}
        </SafeAreaView>
    );
}
