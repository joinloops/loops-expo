import DownloadToast from '@/components/DownloadToast';
import CommentsModal from '@/components/feed/CommentsModal';
import FeedEmptyState from '@/components/feed/FeedEmptyState';
import ShareModal from '@/components/feed/ShareModal';
import VideoPlayer from '@/components/feed/VideoPlayer';
import { useVideoDownload } from '@/hooks/useVideoDownload';
import { useAuthStore } from '@/utils/authStore';
import {
    fetchFollowingFeed,
    fetchForYouFeed,
    fetchLocalFeed,
    getConfiguration,
    recordImpression,
    videoBookmark,
    videoLike,
    videoUnbookmark,
    videoUnlike,
} from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    AppState,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_BAR_HEIGHT = 20;

const fetchVideos = async ({ pageParam = null, tab }) => {
    if (tab === 'local') {
        return await fetchLocalFeed({ pageParam });
    }
    if (tab === 'forYou') {
        return await fetchForYouFeed({ pageParam });
    }
    return await fetchFollowingFeed({ pageParam });
};

export default function LoopsFeed({ navigation }) {
    const insets = useSafeAreaInsets();
    const [feedHeight, setFeedHeight] = useState(0);
    const hideForYouFeed = useAuthStore((state) => state.hideForYouFeed);
    const defaultFeed = useAuthStore((state) => state.defaultFeed);
    const [tabOverride, setTabOverride] = useState(null);
    const activeTab = tabOverride ?? defaultFeed;
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [showComments, setShowComments] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [showOther, setShowOther] = useState(false);
    const [videoPlaybackRates, setVideoPlaybackRates] = useState({});
    const [screenFocused, setScreenFocused] = useState(true);
    const flatListRef = useRef(null);
    const router = useRouter();
    const currentVideoRef = useRef(null);
    const watchStartTimeRef = useRef(null);
    const containerRef = useRef(null);

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    });

    const applyHeight = useCallback((h) => {
        if (h > 0) {
            setFeedHeight((prev) => (Math.abs(h - prev) > 1 ? h : prev));
        }
    }, []);

    const onContainerLayout = useCallback(
        (e) => applyHeight(e.nativeEvent.layout.height),
        [applyHeight],
    );

    const remeasure = useCallback(() => {
        const node = containerRef.current;
        if (!node) return;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                node.measure?.((_x, _y, _w, h) => applyHeight(h));
            });
        });
    }, [applyHeight]);

    const { data: appConfig, isLoading: isConfigLoading } = useQuery({
        queryKey: ['appConfig'],
        queryFn: getConfiguration,
    });

    const forYouEnabled = appConfig?.fyf === true && !hideForYouFeed;

    useEffect(() => {
        if (!isConfigLoading && appConfig) {
            if (!forYouEnabled && activeTab === 'forYou') {
                setTabOverride('local');
            }
        }
    }, [isConfigLoading, appConfig, forYouEnabled, activeTab]);

    const recordVideoImpression = useCallback(
        async (video, duration) => {
            if (activeTab !== 'forYou' || !video) {
                return;
            }

            if (duration < 1) {
                return;
            }

            const videoDuration = video.media.duration || 0;
            const completed = videoDuration > 0 && duration >= videoDuration * 0.9;

            await recordImpression(video.id, duration, completed);
        },
        [activeTab],
    );

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isFetching } =
        useInfiniteQuery({
            queryKey: ['videos', activeTab],
            queryFn: ({ pageParam }) => fetchVideos({ pageParam, tab: activeTab }),
            getNextPageParam: (lastPage) => lastPage.meta?.next_cursor,
            initialPageParam: null,
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
        onSuccess: (res) => { },
        onError: (error) => { },
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
        onSuccess: (res) => { },
        onError: (error) => { },
    });

    const videos = data?.pages?.flatMap((page) => page.data) || [];
    const downloader = useVideoDownload();
    const onViewableItemsChanged = useCallback(
        ({ viewableItems }) => {
            if (viewableItems.length > 0) {
                const newIndex = viewableItems[0].index || 0;
                const newVideo = videos[newIndex];

                if (currentVideoRef.current && watchStartTimeRef.current) {
                    const watchDuration = (Date.now() - watchStartTimeRef.current) / 1000;
                    recordVideoImpression(currentVideoRef.current, watchDuration);
                }

                setCurrentIndex(newIndex);
                currentVideoRef.current = newVideo;
                watchStartTimeRef.current = Date.now();
            }
        },
        [videos, recordVideoImpression],
    );

    useEffect(() => {
        return () => {
            if (currentVideoRef.current && watchStartTimeRef.current) {
                const watchDuration = (Date.now() - watchStartTimeRef.current) / 1000;
                recordVideoImpression(currentVideoRef.current, watchDuration);
            }
        };
    }, [activeTab, recordVideoImpression]);

    useFocusEffect(
        useCallback(() => {
            setScreenFocused(true);
            remeasure();

            return () => {
                setScreenFocused(false);
                if (currentVideoRef.current && watchStartTimeRef.current) {
                    const watchDuration = (Date.now() - watchStartTimeRef.current) / 1000;
                    recordVideoImpression(currentVideoRef.current, watchDuration);
                }
            };
        }, [recordVideoImpression, remeasure]),
    );

    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') remeasure();
        });
        return () => sub.remove();
    }, [remeasure]);

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

    const showEmptyState = !isLoading && !isFetchingNextPage && videos.length === 0;

    const renderItem = useCallback(
        ({ item, index }) => {
            return (
                <VideoPlayer
                    key={item.id}
                    item={item}
                    isActive={index === currentIndex}
                    itemHeight={feedHeight}
                    onLike={handleLike}
                    onComment={handleComment}
                    onShare={handleShare}
                    onBookmark={handleBookmark}
                    onOther={handleOther}
                    bottomInset={0}
                    commentsOpen={showComments && selectedVideo?.id === item.id}
                    shareOpen={showShare && selectedVideo?.id === item.id}
                    otherOpen={showOther && selectedVideo?.id === item.id}
                    onMorePress={handleComment}
                    screenFocused={screenFocused}
                    videoPlaybackRates={videoPlaybackRates}
                    navigation={navigation}
                    onNavigate={handleNavigate}
                    tabBarHeight={TAB_BAR_HEIGHT}
                    scrollRef={flatListRef}
                />
            );
        },
        [
            currentIndex,
            insets.bottom,
            showComments,
            showShare,
            showOther,
            selectedVideo,
            screenFocused,
            videoPlaybackRates,
            feedHeight,
            flatListRef,
        ],
    );

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

    return (
        <View ref={containerRef} style={styles.container} onLayout={onContainerLayout}>
            <View style={[styles.header, { top: insets.top + 10 }]}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        accessibilityRole="tab"
                        accessibilityLabel="Following"
                        accessibilityState={{
                            selected: activeTab === 'following',
                        }}
                        style={[styles.tab, activeTab === 'following' && styles.activeTab]}
                        onPress={() => {
                            setTabOverride('following');
                            setCurrentIndex(0);
                            flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
                        }}>
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'following' && styles.activeTabText,
                            ]}>
                            Following
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        accessibilityRole="tab"
                        accessibilityLabel="Local"
                        accessibilityState={{
                            selected: activeTab === 'local',
                        }}
                        style={[styles.tab, activeTab === 'local' && styles.activeTab]}
                        onPress={() => {
                            setTabOverride('local');
                            setCurrentIndex(0);
                            flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
                        }}>
                        <Text
                            style={[styles.tabText, activeTab === 'local' && styles.activeTabText]}>
                            Local
                        </Text>
                    </TouchableOpacity>
                    {forYouEnabled && (
                        <TouchableOpacity
                            accessibilityRole="tab"
                            accessibilityLabel="For You"
                            accessibilityState={{
                                selected: activeTab === 'forYou',
                            }}
                            style={[styles.tab, activeTab === 'forYou' && styles.activeTab]}
                            onPress={() => {
                                setTabOverride('forYou');
                                setCurrentIndex(0);
                                flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
                            }}>
                            <Text
                                style={[
                                    styles.tabText,
                                    activeTab === 'forYou' && styles.activeTabText,
                                ]}>
                                For You
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    accessibilityLabel="Search"
                    accessibilityRole="button"
                    style={styles.searchButton}
                    onPress={() => router.push('/private/search')}>
                    <Ionicons name="search" size={28} color="white" />
                </TouchableOpacity>
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
                    pagingEnabled={!showEmptyState}
                    scrollEnabled={!showEmptyState}
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
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            progressViewOffset={insets.top + 60}
                        />
                    }
                    ListEmptyComponent={
                        showEmptyState ? (
                            <FeedEmptyState tab={activeTab} onRefresh={onRefresh} />
                        ) : null
                    }
                    ListFooterComponent={
                        isFetchingNextPage ? (
                            <View style={styles.footer}>
                                <ActivityIndicator size="large" color="#fff" />
                            </View>
                        ) : null
                    }
                />
            )}

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
                onPlaybackSpeedChange={handlePlaybackSpeedChange}
                isForYou={activeTab === 'forYou'}
                currentPlaybackRate={
                    selectedVideo ? videoPlaybackRates[selectedVideo.id] || 1.0 : 1.0
                }
                onDownload={() => downloader.download(selectedVideo?.media?.src_url)}
            />

            <DownloadToast
                status={downloader?.status}
                progress={downloader?.progress}
                error={downloader?.error}
                onCancel={downloader?.cancel}
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    endOfFeedContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        backgroundColor: '#000',
    },
    endOfFeedEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    endOfFeedTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    endOfFeedSubtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
    },
});