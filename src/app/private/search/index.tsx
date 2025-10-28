import { searchContent } from '@/utils/requests';
import { prettyCount } from '@/utils/ui';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Keyboard,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

type TabType = 'Top' | 'Users' | 'Videos' | 'Hashtags';
type FilterType = 'All' | 'Unwatched' | 'Watched' | 'Recently uploaded';

export default function SearchScreen() {
    const params = useLocalSearchParams<{ query?: string; type?: string }>();
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState(params.query || '');
    const [activeTab, setActiveTab] = useState<TabType>('Top');
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');

    const tabs: TabType[] = ['Top', 'Users', 'Videos', 'Hashtags'];
    const filters: FilterType[] = ['All', 'Unwatched', 'Watched', 'Recently uploaded'];

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['search', searchQuery, params.type, activeTab],
        queryFn: () => searchContent({
            query: searchQuery,
            type: params.type || activeTab,
            limit: 20,
        }),
        enabled: searchQuery.length > 0,
        staleTime: 30000,
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

    const renderUserCard = ({ item }: { item: User }) => (
        <TouchableOpacity
            style={tw`flex-row items-center px-4 py-3 border-b border-gray-100`}
            onPress={() => router.push(`/private/profile/${item.id}`)}
            activeOpacity={0.7}
        >
            <Image
                source={{ uri: item.avatar }}
                style={tw`w-14 h-14 rounded-full bg-gray-200`}
            />
            <View style={tw`flex-1 ml-3`}>
                <View style={tw`flex-row items-center`}>
                    <Text style={tw`text-base font-semibold`} numberOfLines={1}>
                        {item.username}
                    </Text>
                </View>
                <Text style={tw`text-sm text-gray-600`} numberOfLines={1}>
                    {item.name}
                </Text>
                <Text style={tw`text-xs text-gray-500 mt-0.5`}>
                    {prettyCount(item.follower_count)} followers · {prettyCount(item.post_count)} posts
                </Text>
            </View>
            <TouchableOpacity
                style={tw`bg-[#FE2C55] px-6 py-2 rounded-md`}
                onPress={(e) => {
                    e.stopPropagation();
                    console.log('Follow user:', item.username);
                }}
            >
                <Text style={tw`text-white font-semibold text-sm`}>Follow</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderVideoItem = ({ item, index }) => (
        <TouchableOpacity
            style={tw`w-[48%] mb-3 ${index % 2 === 0 ? 'mr-[4%]' : ''}`}
            onPress={() => router.push(`/private/video/${item.id}`)}
            activeOpacity={0.9}
        >
            <View style={tw`relative`}>
                <Image
                    source={{ uri: item.media.thumbnail }}
                    style={[
                        tw`w-full rounded-lg bg-gray-200`,
                        { aspectRatio: 3 / 4 }
                    ]}
                    resizeMode="cover"
                />

                <View style={tw`absolute inset-0 bg-black bg-opacity-10 rounded-lg`} />

                <View style={tw`absolute bottom-2 left-2 flex-row items-center bg-black bg-opacity-50 px-2 py-1 rounded-full`}>
                    <Ionicons name="heart" size={14} color="white" />
                    <Text style={tw`text-white text-xs ml-1 font-semibold`}>
                        {prettyCount(item.likes)}
                    </Text>
                </View>

                <View style={tw`absolute top-2 right-2 bg-black bg-opacity-50 px-2 py-1 rounded-full`}>
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
                <Text style={tw`flex-1 text-xs text-gray-700 leading-4`} numberOfLines={2}>
                    {item.caption}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={tw`flex-1 items-center justify-center py-20`}>
            <Ionicons name="search-outline" size={72} color="#E5E7EB" />
            <Text style={tw`text-gray-500 mt-4 text-base`}>
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
                    <Text style={tw`text-gray-500 mt-4`}>Searching...</Text>
                </View>
            );
        }

        if (!data || (data.videos?.length === 0 && data.users?.length === 0)) {
            return renderEmptyState();
        }

        const isHashtagSearch = params.type === 'hashtag';
        const isVideoSearch = params.type === 'Videos';

        const renderListHeader = () => {
            if (activeTab === 'Users' || params.type === 'Users') {
                return (
                    <View style={tw`mb-3`}>
                        <Text style={tw`px-4 py-2 text-sm font-semibold text-gray-700`}>
                            Accounts
                        </Text>
                        {data.users.map((user) => (
                            <View key={user.id}>
                                {renderUserCard({ item: user })}
                            </View>
                        ))}
                    </View>
                )
            } else if (activeTab === 'Videos' || params.type === 'Videos') {
                return (
                    <View style={tw`mb-3`}>
                        <Text style={tw`px-4 pb-2 text-sm font-semibold text-gray-700`}>
                            Videos
                        </Text>
                    </View>
                )
            }

            return (
                <View style={tw`mb-3`}>
                    {data.users?.length > 0 && (
                        <>
                            <Text style={tw`px-4 py-2 text-sm font-semibold text-gray-700`}>
                                Accounts
                            </Text>
                            {data.users.map((user) => (
                                <View key={user.id}>
                                    {renderUserCard({ item: user })}
                                </View>
                            ))}
                            <View style={tw`h-3 bg-gray-50 mt-2 mb-3`} />
                        </>
                    )}
                    {data.videos?.length > 0 && (
                        <Text style={tw`px-4 pb-2 text-sm font-semibold text-gray-700`}>
                            Videos
                        </Text>
                    )}
                </View>
            )
        }

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
        <SafeAreaView style={tw`flex-1 bg-white`}>
            <StatusBar style="dark" />
            <Stack.Screen
                options={{
                    headerShown: false
                }}
            />
            <View style={tw`pt-1 pb-0 border-b border-gray-200 bg-white`}>
                <View style={tw`flex-row items-center px-4 mb-3`}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={tw`mr-3`}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="chevron-back" size={26} color="black" />
                    </TouchableOpacity>

                    <View style={tw`flex-1 flex-row items-center bg-gray-100 rounded-lg px-3 py-2.5`}>
                        <Ionicons name="search" size={20} color="#9CA3AF" />
                        <TextInput
                            style={[
                                tw`flex-1 ml-2 text-gray-900`,
                                {
                                    fontSize: 16,
                                    paddingVertical: 0,
                                    paddingTop: 0,
                                    paddingBottom: 0,
                                    height: 20,
                                    textAlignVertical: 'center',
                                    ...(Platform.OS === 'android' && { includeFontPadding: false }),
                                }
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
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        style={tw`ml-3`}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="ellipsis-horizontal" size={26} color="black" />
                    </TouchableOpacity>
                </View>

                <View style={tw`border-b border-gray-200`}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={tabs}
                        keyExtractor={(item) => item}
                        contentContainerStyle={tw`px-4`}
                        renderItem={({ item: tab }) => (
                            <TouchableOpacity
                                style={tw`mr-6 pb-3 ${activeTab === tab ? 'border-b-2 border-black' : ''}`}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text
                                    style={tw`text-base px-3 ${activeTab === tab ? 'font-semibold text-black' : 'font-normal text-gray-500'
                                        }`}
                                >
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
};
