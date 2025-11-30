import CommentsModal from '@/components/feed/CommentsModal';
import OtherModal from '@/components/feed/OtherModal';
import ShareModal from '@/components/feed/ShareModal';
import VideoPlayer from '@/components/feed/VideoPlayer';
import { fetchFollowingFeed, fetchForYouFeed, videoLike, videoUnlike } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 60;

const fetchVideos = async ({ pageParam = null, tab }) => {
    if (tab === 'forYou') {
        return await fetchForYouFeed({ pageParam });
    }
    return await fetchFollowingFeed({ pageParam });
};

export default function LoopsFeed({ navigation }) {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState('forYou');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [showComments, setShowComments] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [showOther, setShowOther] = useState(false);
    const [videoPlaybackRates, setVideoPlaybackRates] = useState({});
    const [screenFocused, setScreenFocused] = useState(true);
    const flatListRef = useRef(null);
    const router = useRouter();

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    });

    useFocusEffect(
        useCallback(() => {
            setScreenFocused(true);
            return () => {
                setScreenFocused(false);
            };
        }, [])
    );

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        refetch,
        isFetching,
    } = useInfiniteQuery({
        queryKey: ['videos', activeTab],
        queryFn: ({ pageParam }) => fetchVideos({ pageParam, tab: activeTab }),
        getNextPageParam: (lastPage) => lastPage.meta?.next_cursor,
        initialPageParam: null,
    });

    const videoLikeMutation = useMutation({
        mutationFn: async (data) => {
            const dir = data.type

            if (dir == 'like') {
                return await videoLike(data.id);
            }
            if (dir == 'unlike') {
                return await videoUnlike(data.id);
            }
        },
        onSuccess: (res) => {
        },
        onError: (error) => {
        },
    });

    const videos = data?.pages?.flatMap(page => page.data) || [];

    const onViewableItemsChanged = useCallback(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index || 0);
        }
    }, []);

    const handleLike = (videoId, liked) => {
        const dir = liked ? 'like' : 'unlike'
        videoLikeMutation.mutate({ type: dir, id: videoId })
    };

    const handleComment = (video) => {
        setSelectedVideo(video);
        setShowComments(true);
    };

    const handleShare = (video) => {
        setSelectedVideo(video);
        setShowShare(true);
    };

    const handleOther = (video) => {
        setSelectedVideo(video);
        setShowOther(true);
    };

    const handlePlaybackSpeedChange = (speed) => {
        if (selectedVideo) {
            setVideoPlaybackRates(prev => ({
                ...prev,
                [selectedVideo.id]: speed
            }));
        }
    };

    const handleNavigate = () => {
        setShowComments(false);
        setShowShare(false);
        setShowOther(false);
    };

    const renderItem = useCallback(({ item, index }) => (
        <VideoPlayer
            key={item.id}
            item={item}
            isActive={index === currentIndex}
            onLike={handleLike}
            onComment={handleComment}
            onShare={handleShare}
            onOther={handleOther}
            bottomInset={insets.bottom}
            commentsOpen={showComments && selectedVideo?.id === item.id}
            shareOpen={showShare && selectedVideo?.id === item.id}
            otherOpen={showOther && selectedVideo?.id === item.id}
            onMorePress={handleComment}
            screenFocused={screenFocused}
            videoPlaybackRates={videoPlaybackRates}
            navigation={navigation}
            onNavigate={handleNavigate}
            tabBarHeight={TAB_BAR_HEIGHT}
        />
    ), [currentIndex, insets.bottom, showComments, showShare, showOther, selectedVideo, screenFocused, videoPlaybackRates, navigation]);

    const refreshing = isFetching && !isFetchingNextPage;

    const onRefresh = useCallback(async () => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        await refetch();
    }, [refetch]);

    const handleEndReached = () => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    const getItemLayout = useCallback((data, index) => ({
        length: SCREEN_HEIGHT,
        offset: SCREEN_HEIGHT * index,
        index,
    }), []);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="auto" />

            <View style={[styles.header, { top: insets.top + 10 }]}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        accessibilityRole="tab"
                        accessibilityLabel="Following"
                        accessibilityState={{
                            selected: (activeTab === 'following')
                        }}
                        style={[styles.tab, activeTab === 'following' && styles.activeTab]}
                        onPress={() => {
                            setActiveTab('following');
                            setCurrentIndex(0);
                            flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
                        }}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'following' && styles.activeTabText,
                            ]}
                        >
                            Following
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        accessibilityRole="tab"
                        accessibilityLabel="For You"
                        accessibilityState={{
                            selected: (activeTab === 'forYou')
                        }}
                        style={[styles.tab, activeTab === 'forYou' && styles.activeTab]}
                        onPress={() => {
                            setActiveTab('forYou');
                            setCurrentIndex(0);
                            flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
                        }}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'forYou' && styles.activeTabText,
                            ]}
                        >
                            For You
                        </Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    accessibilityLabel="Search"
                    accessibilityRole="button"
                    style={styles.searchButton}
                    onPress={() => router.push('/private/search')}
                >
                    <Ionicons name="search" size={28} color="white" />
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={videos}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                snapToInterval={SCREEN_HEIGHT}
                snapToAlignment="start"
                decelerationRate="fast"
                viewabilityConfig={viewabilityConfig.current}
                onViewableItemsChanged={onViewableItemsChanged}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.5}
                getItemLayout={getItemLayout}
                removeClippedSubviews={true}
                maxToRenderPerBatch={1}
                windowSize={3}
                initialNumToRender={1}
                updateCellsBatchingPeriod={100}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        progressViewOffset={insets.top + 60}
                    />
                }
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <View style={styles.footer}>
                            <ActivityIndicator size="large" color="#fff" />
                        </View>
                    ) : null
                }
            />

            <CommentsModal
                visible={showComments}
                item={selectedVideo}
                onClose={() => setShowComments(false)}
                navigation={navigation}
                onNavigate={handleNavigate}
            />

            <ShareModal
                visible={showShare}
                item={selectedVideo}
                onClose={() => setShowShare(false)}
            />

            <OtherModal
                visible={showOther}
                item={selectedVideo}
                onClose={() => setShowOther(false)}
                onPlaybackSpeedChange={handlePlaybackSpeedChange}
                currentPlaybackRate={selectedVideo ? (videoPlaybackRates[selectedVideo.id] || 1.0) : 1.0}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    header: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        paddingHorizontal: 16,
    },
    tabContainer: {
        flexDirection: 'row',
        gap: 24,
    },
    tab: {
        paddingVertical: 8,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: 'white',
    },
    tabText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 18,
        fontWeight: '600',
    },
    activeTabText: {
        color: 'white',
    },
    searchButton: {
        position: 'absolute',
        right: 16,
    },
    footer: {
        height: SCREEN_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    }
});