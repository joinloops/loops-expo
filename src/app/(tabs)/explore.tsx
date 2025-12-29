import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { XStack } from '@/components/ui/Stack';
import { useAuthStore } from '@/utils/authStore';
import { Storage } from '@/utils/cache';
import { followAccount, getExploreAccounts, getExploreTags, getExploreTagsFeed, postExploreAccountHideSuggestion } from '@/utils/requests';
import { Feather } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

const { width } = Dimensions.get('window');
const ACCOUNT_CARD_WIDTH = 160;
const TAG_CARD_WIDTH = 120;
const VIDEO_THUMBNAIL_WIDTH = (width - 24) / 3;

interface Tag {
    id: number;
    name: string;
    count: number;
}

interface Account {
    id: string;
    name: string;
    avatar: string;
    username: string;
    bio: string;
    follower_count: number;
}

interface Video {
    id: string;
    hid: string;
    account: {
        id: string;
        name: string;
        username: string;
        avatar: string;
    };
    caption: string;
    url: string;
    likes: number;
    comments: number;
    media: {
        duration: number;
        width: number;
        height: number;
        thumbnail: string;
    };
}

export default function ExploreScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const token = Storage.getString('app.token');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [followingAccountId, setFollowingAccountId] = useState<string | null>(null);
    const [hidingAccountId, setHidingAccountId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data: tagsData, isLoading: tagsLoading } = useQuery({
        queryKey: ['explore', 'tags'],
        queryFn: getExploreTags
    });

    const { data: accountsData, isLoading: accountsLoading } = useQuery({
        queryKey: ['accounts', 'suggested'],
        queryFn: getExploreAccounts
    });

    const { 
        data: videosData, 
        isLoading: videosLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ['explore', 'tag-feed', selectedTag || tagsData?.[0]?.name],
        queryFn: getExploreTagsFeed,
        getNextPageParam: (lastPage) => lastPage.meta?.next_cursor,
        enabled: !!tagsData && tagsData.length > 0,
        initialPageParam: null
    });

    const followMutation = useMutation({
        mutationFn: async (profileId) => {
            setFollowingAccountId(profileId);
            return await followAccount(profileId)
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['accounts', 'suggested'] })
        },
        onSettled: () => {
            setFollowingAccountId(null);
        }
    })

    const hideSuggestionMutation = useMutation({
        mutationFn: async(profileId) => {
            setHidingAccountId(profileId);
            return await postExploreAccountHideSuggestion(profileId)
        },
        onMutate: async (profileId) => {
            await queryClient.cancelQueries({ queryKey: ['accounts', 'suggested'] });
            
            const previousAccounts = queryClient.getQueryData(['accounts', 'suggested']);
            
            queryClient.setQueryData(['accounts', 'suggested'], (old: Account[] | undefined) => {
                return old?.filter(account => account.id !== profileId) || [];
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
        }
    })

    const allVideos = videosData?.pages.flatMap(page => page.data) || [];

    React.useEffect(() => {
        if (tagsData && tagsData.length > 0 && !selectedTag) {
            setSelectedTag(tagsData[0].name);
        }
    }, [tagsData]);

    const renderAccountCard = ({ 
        item, 
        onHandleFollow, 
        onHideSuggestion 
    }: { 
        item: Account;
        onHandleFollow: () => void;
        onHideSuggestion: () => void;
    }) => {
        const isFollowing = followingAccountId === item.id;
        const isHiding = hidingAccountId === item.id;
        return (
            <View style={tw`mr-3 bg-zinc-900 rounded-xl overflow-hidden`}>
                <View style={tw`w-[${ACCOUNT_CARD_WIDTH}px] p-3 items-center`}>
                    <PressableHaptics
                        style={tw`absolute top-2 right-2 z-10 bg-black bg-opacity-50 rounded-full p-1`}
                        onPress={onHideSuggestion}
                        disabled={isHiding}
                    >
                        <Feather name="x" size={16} color="white" />
                    </PressableHaptics>

                    <Pressable onPress={() => router.push(`/private/profile/${item.id}`)}>
                        <Image
                            source={{ uri: item.avatar }}
                            style={tw`w-16 h-16 rounded-full mb-2`}
                        />
                    </Pressable>

                    <Pressable onPress={() => router.push(`/private/profile/${item.id}`)}>
                        <Text style={tw`text-white font-semibold text-sm mb-1`} numberOfLines={1}>
                            {item.name}
                        </Text>
                    </Pressable>

                    <Text style={tw`text-gray-400 text-xs text-center mb-1`} numberOfLines={1}>
                        {item.bio}
                    </Text>
    
                    <XStack justifyContent='space-between' gap="$3" style={tw`w-full mb-3`}>
                        <Text style={tw`text-gray-500 text-[11px]`}>
                            {item.post_count.toLocaleString()} videos
                        </Text>
                        <Text style={tw`text-gray-500 text-[11px]`}>
                            {item.follower_count.toLocaleString()} followers
                        </Text>
                    </XStack>
                    
                    <PressableHaptics onPress={onHandleFollow} disabled={isFollowing}>
                        <View style={tw`bg-white rounded-full px-4 py-1.5`}>
                            <Text style={tw`text-black font-semibold text-xs`}>{isFollowing ? 'Following...' : 'Follow'}</Text>
                        </View> 
                    </PressableHaptics>
                </View>
            </View>
        )
    };

    const renderTagCard = ({ item }: { item: Tag }) => {
        const isSelected = selectedTag === item.name;
        return (
            <TouchableOpacity
                style={[
                    tw`mr-2.5 rounded-xl px-4 py-2.5`,
                    isSelected ? tw`bg-white` : tw`bg-zinc-900`
                ]}
                onPress={() => setSelectedTag(item.name)}
            >
                <View style={tw`w-[${TAG_CARD_WIDTH}px] items-center`}>
                    <Text style={[
                        tw`font-bold text-base mb-0.5`,
                        isSelected ? tw`text-black` : tw`text-white`
                    ]}>
                        #{item.name}
                    </Text>
                    <Text style={[
                        tw`text-xs`,
                        isSelected ? tw`text-gray-700` : tw`text-gray-400`
                    ]}>
                        {item.count.toLocaleString()} videos
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderVideoThumbnail = ({ item, index }: { item: Video; index: number }) => (
        <TouchableOpacity
            style={tw`mb-1 ${index % 3 !== 2 ? 'mr-1' : ''}`}
            onPress={() => router.push(`/private/profile/feed/${item.id}?profileId=${item.account.id}`)}
        >
            <View style={tw`relative`}>
                <Image
                    source={{ uri: item.media.thumbnail }}
                    style={[
                        tw`rounded-lg bg-zinc-900`,
                        { width: VIDEO_THUMBNAIL_WIDTH, height: VIDEO_THUMBNAIL_WIDTH * 16/9 }
                    ]}
                    resizeMode="cover"
                />
                <View style={tw`absolute bottom-2 left-2 right-2`}>
                    <Text style={tw`text-white text-xs font-medium`} numberOfLines={2}>
                        {item.caption}
                    </Text>
                </View>
                <View style={tw`absolute top-2 right-2 bg-black bg-opacity-70 rounded px-1.5 py-0.5`}>
                    <Text style={tw`text-white text-xs`}>
                        {Math.floor(item.media.duration / 60)}:{(item.media.duration % 60).toString().padStart(2, '0')}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (tagsLoading || accountsLoading) {
        return (
            <View style={tw`flex-1 bg-black items-center justify-center`}>
                <ActivityIndicator size="large" color="white" />
            </View>
        );
    }

    return (
        <SafeAreaView edges={['top']} style={{flex: 1, backgroundColor: 'black'}}>
            <StatusBar style="light" animated={true} />
            <View style={tw`flex flex-1 bg-black`}>
                
                <ScrollView
                    style={tw`flex-1`}
                    showsVerticalScrollIndicator={false}
                    onScroll={({ nativeEvent }) => {
                        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                        const paddingToBottom = 100;
                        const isCloseToBottom = 
                            layoutMeasurement.height + contentOffset.y >= 
                            contentSize.height - paddingToBottom;
                        
                        if (isCloseToBottom && hasNextPage && !isFetchingNextPage) {
                            fetchNextPage();
                        }
                    }}
                    scrollEventThrottle={16}
                >
                    <View style={tw`px-4 pt-4 pb-3 flex justify-between items-center flex-row`}>
                        <Text style={tw`text-white text-4xl font-bold`}>Explore</Text>
                        <Pressable onPress={() => router.push('/private/search')}>
                            <Feather name="search" color="white" size={30} />
                        </Pressable>
                    </View>

                    {accountsData && accountsData.length > 0 && (
                        <View style={tw`my-5`}>
                            <Text style={tw`text-white text-lg font-bold px-4 mb-3`}>
                                Suggested for you
                            </Text>
                            <FlatList
                                horizontal
                                data={accountsData}
                                renderItem={({ item }) => renderAccountCard({ 
                                    item,
                                    followMutation,
                                    onHandleFollow: () => followMutation.mutate(item.id),
                                    onHideSuggestion: () => hideSuggestionMutation.mutate(item.id)
                                })}
                                keyExtractor={item => item.id}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={tw`px-4`}
                            />
                        </View>
                    )}

                    {tagsData && tagsData.length > 0 && (
                        <View style={tw`mb-4`}>
                            <Text style={tw`text-white text-lg font-bold px-4 mb-3`}>
                                Trending
                            </Text>
                            <FlatList
                                horizontal
                                data={tagsData}
                                renderItem={renderTagCard}
                                keyExtractor={item => item.id.toString()}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={tw`px-4`}
                            />
                        </View>
                    )}

                    {videosLoading ? (
                        <View style={tw`py-10 items-center`}>
                            <ActivityIndicator size="large" color="white" />
                        </View>
                    ) : (
                        <>
                            <View style={tw`px-2 flex-row flex-wrap`}>
                                {allVideos.map((video, index) => (
                                    <View key={video.id} style={tw`w-1/3`}>
                                        {renderVideoThumbnail({ item: video, index })}
                                    </View>
                                ))}
                            </View>
                            {isFetchingNextPage && (
                                <View style={tw`py-4 items-center`}>
                                    <ActivityIndicator size="small" color="white" />
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}