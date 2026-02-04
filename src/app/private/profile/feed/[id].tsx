import CommentsModal from '@/components/feed/CommentsModal';
import OtherModal from '@/components/feed/OtherModal';
import ShareModal from '@/components/feed/ShareModal';
import VideoPlayer from '@/components/feed/VideoPlayer';
import { fetchUserVideoCursor, videoBookmark, videoLike, videoUnbookmark, videoUnlike } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProfileFeed({navigation}) {
    const params = useLocalSearchParams();
    const profileId = params.profileId;
    const id = params.id;

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
    const [timelineIsControlled, setTimelineIsControlled] = useState<boolean>(false);

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
    } = useInfiniteQuery({
        queryKey: ['profileVideoFeed', profileId, id],
        queryFn: ({ pageParam }) => fetchUserVideoCursor({ 
            queryKey: ['profileVideoFeed', profileId, id],
            pageParam 
        }),
        getNextPageParam: (lastPage) => lastPage.meta?.next_cursor,
        initialPageParam: null,
        enabled: !!profileId && !!id,
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


    const videoBookmarkMutation = useMutation({
        mutationFn: async (data) => {
            const dir = data.type

            if (dir == 'bookmark') {
                return await videoBookmark(data.id);
            }
            if (dir == 'unbookmark') {
                return await videoUnbookmark(data.id);
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

    const handleBookmark = (videoId, bookmarked) => {
        const dir = bookmarked ? 'bookmark' : 'unbookmark'
        videoBookmarkMutation.mutate({ type: dir, id: videoId })
    }

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
            onBookmark={handleBookmark}
            bottomInset={insets.bottom}
            commentsOpen={showComments && selectedVideo?.id === item.id}
            shareOpen={showShare && selectedVideo?.id === item.id}
            otherOpen={showOther && selectedVideo?.id === item.id}
            screenFocused={screenFocused}
            videoPlaybackRates={videoPlaybackRates}
            navigation={navigation}
            onNavigate={handleNavigate}
            onTimelineControlledChanged={setTimelineIsControlled}
            tabBarHeight={0}
        />
    ), [currentIndex, insets.bottom, showComments, showShare, showOther, selectedVideo, screenFocused, videoPlaybackRates, navigation]);

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
                <Stack.Screen options={{headerShown: false}} />
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="auto" />

            <Stack.Screen options={{headerShown: false}} />

            <View style={[styles.header, { top: insets.top + 10 }]}>
                <View style={styles.tabContainer}>
                    {/* TODO */}
                </View>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={videos}
                disableIntervalMomentum
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                pagingEnabled
                scrollEnabled={!timelineIsControlled}
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
    backButton: {
        position: 'absolute',
        left: 16,
    },
    footer: {
        height: SCREEN_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    }
});