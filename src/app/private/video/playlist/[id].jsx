import CommentsModal from '@/components/feed/CommentsModal';
import OtherModal from '@/components/feed/OtherModal';
import PlaylistBar from '@/components/feed/PlaylistBar';
import PlaylistVideosModal from '@/components/feed/PlaylistVideosModal';
import ShareModal from '@/components/feed/ShareModal';
import VideoPlayer from '@/components/feed/VideoPlayer';
import { StackText } from '@/components/ui/Stack';
import {
    fetchPlaylistVideos,
    videoBookmark,
    videoLike,
    videoUnbookmark,
    videoUnlike,
} from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

export default function PlaylistFeed({ navigation }) {
    const params = useLocalSearchParams();
    const profileId = params.profileId;
    const playlistName = params.playlistName;
    const id = params.id;

    const [showPlaylistVideos, setShowPlaylistVideos] = useState(false);

    const insets = useSafeAreaInsets();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [showComments, setShowComments] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [showOther, setShowOther] = useState(false);
    const [videoPlaybackRates, setVideoPlaybackRates] = useState({});
    const [screenFocused, setScreenFocused] = useState(true);
    const [feedHeight, setFeedHeight] = useState(0);
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
        }, []),
    );

    const onContainerLayout = useCallback((e) => {
        const h = e.nativeEvent.layout.height;
        setFeedHeight((prev) => (h > 0 && Math.abs(h - prev) > 1 ? h : prev));
    }, []);

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
        queryKey: ['playlistVideos', id],
        queryFn: ({ pageParam }) => fetchPlaylistVideos(id),
        getNextPageParam: (lastPage) => lastPage.meta?.next_cursor,
        initialPageParam: null,
        enabled: !!id,
    });

    const videoLikeMutation = useMutation({
        mutationFn: async (data) => {
            const dir = data.type;

            if (dir == 'like') {
                return await videoLike(data.id);
            }
            if (dir == 'unlike') {
                return await videoUnlike(data.id);
            }
        },
        onSuccess: (res) => {},
        onError: (error) => {},
    });

    const videoBookmarkMutation = useMutation({
        mutationFn: async (data) => {
            const dir = data.type;

            if (dir == 'bookmark') {
                return await videoBookmark(data.id);
            }
            if (dir == 'unbookmark') {
                return await videoUnbookmark(data.id);
            }
        },
        onSuccess: (res) => {},
        onError: (error) => {},
    });

    const videos = data?.pages?.flatMap((page) => page.data) || [];
    const partsCount = params.videoCount ? Number(params.videoCount) : videos.length;

    const onViewableItemsChanged = useCallback(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index || 0);
        }
    }, []);

    const handleLike = (videoId, liked) => {
        const dir = liked ? 'like' : 'unlike';
        videoLikeMutation.mutate({ type: dir, id: videoId });
    };

    const handleBookmark = (videoId, bookmarked) => {
        const dir = bookmarked ? 'bookmark' : 'unbookmark';
        videoBookmarkMutation.mutate({ type: dir, id: videoId });
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
            setVideoPlaybackRates((prev) => ({
                ...prev,
                [selectedVideo.id]: speed,
            }));
        }
    };

    const handleNavigate = () => {
        setShowComments(false);
        setShowShare(false);
        setShowOther(false);
    };

    const handleSelectPlaylistVideo = useCallback((index) => {
        setShowPlaylistVideos(false);
        setCurrentIndex(index);
        requestAnimationFrame(() => {
            flatListRef.current?.scrollToIndex({ index, animated: false });
        });
    }, []);

    const renderItem = useCallback(
        ({ item, index }) => (
            <VideoPlayer
                key={item.id}
                item={item}
                isActive={index === currentIndex}
                itemHeight={feedHeight}
                onLike={handleLike}
                onComment={handleComment}
                onShare={handleShare}
                onOther={handleOther}
                onBookmark={handleBookmark}
                bottomInset={insets.bottom}
                commentsOpen={showComments && selectedVideo?.id === item.id}
                shareOpen={showShare && selectedVideo?.id === item.id}
                otherOpen={showOther && selectedVideo?.id === item.id}
                screenFocused={screenFocused}
                videoPlaybackRates={videoPlaybackRates}
                navigation={navigation}
                onNavigate={handleNavigate}
                tabBarHeight={120}
            />
        ),
        [
            currentIndex,
            feedHeight,
            insets.bottom,
            showComments,
            showShare,
            showOther,
            selectedVideo,
            screenFocused,
            videoPlaybackRates,
            navigation,
        ],
    );

    const handleEndReached = () => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    return (
        <View style={styles.container} onLayout={onContainerLayout}>
            <StatusBar style="light" />
            <Stack.Screen options={{ headerShown: false }} />

            <View style={[styles.header, { top: insets.top + 10 }]}>
                <View style={styles.tabContainer} />
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <StackText style={tw`text-white font-bold text-xl`}>{playlistName}</StackText>
            </View>

            {isLoading || feedHeight === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={videos}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    pagingEnabled
                    showsVerticalScrollIndicator={false}
                    snapToInterval={feedHeight}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    viewabilityConfig={viewabilityConfig.current}
                    onViewableItemsChanged={onViewableItemsChanged}
                    onEndReached={handleEndReached}
                    onEndReachedThreshold={0.5}
                    getItemLayout={(data, index) => ({
                        length: feedHeight,
                        offset: feedHeight * index,
                        index,
                    })}
                    removeClippedSubviews={false}
                    maxToRenderPerBatch={1}
                    windowSize={3}
                    initialNumToRender={1}
                    updateCellsBatchingPeriod={100}
                    onScrollToIndexFailed={({ index }) => {
                        setTimeout(() => {
                            flatListRef.current?.scrollToIndex({ index, animated: false });
                        }, 100);
                    }}
                    ListFooterComponent={
                        isFetchingNextPage ? (
                            <View style={[styles.footer, { height: feedHeight }]}>
                                <ActivityIndicator size="large" color="#fff" />
                            </View>
                        ) : null
                    }
                />
            )}

            {!isLoading && feedHeight > 0 && videos.length > 0 && (
                <PlaylistBar
                    title={playlistName}
                    partsCount={partsCount}
                    bottomInset={insets.bottom}
                    onPress={() => setShowPlaylistVideos(true)}
                />
            )}

            <PlaylistVideosModal
                visible={showPlaylistVideos}
                title={playlistName}
                videos={videos}
                currentIndex={currentIndex}
                onSelect={handleSelectPlaylistVideo}
                onClose={() => setShowPlaylistVideos(false)}
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
                currentPlaybackRate={
                    selectedVideo ? videoPlaybackRates[selectedVideo.id] || 1.0 : 1.0
                }
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
    backButton: {
        position: 'absolute',
        left: 16,
    },
    footer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
