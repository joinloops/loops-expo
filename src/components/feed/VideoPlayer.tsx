import Avatar from '@/components/Avatar';
import LinkifiedCaption from '@/components/feed/LinkifiedCaption';
import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VideoScrubber from './VideoScrubber';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VideoPlayer({
    item,
    isActive,
    onLike,
    onComment,
    onShare,
    onBookmark,
    bottomInset,
    commentsOpen,
    screenFocused,
    videoPlaybackRates,
    shareOpen,
    otherOpen,
    navigation,
    onNavigate,
    itemHeight,
    scrollRef,
    tabBarHeight = 60,
}) {
    const [isLiked, setIsLiked] = useState(item.has_liked);
    const [isBookmarked, setIsBookmarked] = useState(item.has_bookmarked);
    const [showControls, setShowControls] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const manualControlRef = useRef(false);
    const isMountedRef = useRef(true);
    const wasActiveRef = useRef(false);
    const router = useRouter();
    const [playSensitive, setPlaySensitive] = useState(false);
    const controlsTimeoutRef = useRef(null);
    const [userPaused, setUserPaused] = useState(false);
    const insets = useSafeAreaInsets();
    const [isScrubbing, setIsScrubbing] = useState(false);

    const playbackRate = videoPlaybackRates[item.id] || 1.0;

    const aspectRatio =
        item.media?.width && item.media?.height ? item.media.width / item.media.height : 0;
    const videoContentFit = aspectRatio > 1 ? 'contain' : 'cover';

    const player = useVideoPlayer(item.media.src_url, (player) => {
        player.loop = true;
        player.playbackRate = playbackRate;
    });

    const ICON_SHADOW = {
        textShadowColor: 'rgba(0,0,0,0.50)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
    };

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            try {
                player?.pause();
            } catch { }
        };
    }, [player]);

    useEffect(() => {
        if (!player) return;
        try {
            player.playbackRate = playbackRate;
        } catch (error) {
            console.log('Playback rate error:', error);
        }
    }, [playbackRate, player]);

    useEffect(() => {
        if (!player) return;

        try {
            if (!isActive) {
                if (isMountedRef.current) {
                    player.pause();
                    setIsPlaying(false);
                    setUserPaused(false);
                }
                manualControlRef.current = false;
                wasActiveRef.current = false;
                return;
            }

            if (manualControlRef.current) return;

            const shouldPlay = screenFocused && !(item.is_sensitive && !playSensitive);

            if (!wasActiveRef.current) {
                player.currentTime = 0;
            }

            if (shouldPlay && isMountedRef.current) {
                player.play();
                setIsPlaying(true);
            } else if (isMountedRef.current) {
                player.pause();
                setIsPlaying(false);
            }

            wasActiveRef.current = true;
        } catch (error) {
            console.log('Player control error:', error);
        }
    }, [isActive, screenFocused, player, item.is_sensitive, playSensitive]);

    useEffect(() => {
        if (!isActive) {
            setPlaySensitive(false);
        }
    }, [isActive]);

    useFocusEffect(
        useCallback(() => {
            return () => {
                try {
                    player?.pause();
                    setIsPlaying(false);
                } catch { }
            };
        }, [player]),
    );

    const handleLike = () => {
        setIsLiked(!isLiked);
        onLike(item.id, !isLiked);
    };

    const handleBookmark = () => {
        setIsBookmarked(!isBookmarked);
        onBookmark(item.id, !isBookmarked);
    };

    const togglePlayPause = useCallback(() => {
        if (!player || !isMountedRef.current) return;

        try {
            manualControlRef.current = true;

            if (player.playing) {
                player.pause();
                setIsPlaying(false);
                setUserPaused(true);
            } else {
                player.play();
                setIsPlaying(true);
                setUserPaused(false);
            }
        } catch (error) {
            console.log('Toggle play/pause error:', error);
        }
    }, [player]);

    const handleScreenPress = () => {
        if (!isMountedRef.current) {
            return;
        }

        const newShowControls = !showControls;
        setShowControls(newShowControls);

        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = null;
        }

        if (newShowControls) {
            controlsTimeoutRef.current = setTimeout(() => {
                if (isMountedRef.current) {
                    setShowControls(false);
                    manualControlRef.current = false;
                }
            }, 3000);
        } else {
            manualControlRef.current = false;
        }
    };

    useEffect(() => {
        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, []);

    const handleViewSensitiveContent = () => {
        setPlaySensitive(true);
    };

    const likeCount = item.likes + (isLiked && !item.has_liked ? 1 : 0);
    const bookmarkCount = item.bookmarks + (isBookmarked && !item.has_bookmarked ? 1 : 0);

    if (item.is_sensitive && !playSensitive) {
        return (
            <View style={[styles.videoContainer, { height: itemHeight }]}>
                <View
                    style={[styles.sensitiveOverlay, { paddingBottom: tabBarHeight }]}
                    accessible={true}
                    accessibilityLabel="Sensitive content warning. This video may contain sensitive content."
                    accessibilityRole="alert">
                    <View style={styles.sensitiveContent}>
                        <View style={styles.sensitiveIconWrapper}>
                            <Ionicons name="eye-off-outline" size={48} color="white" />
                        </View>
                        <Text style={styles.sensitiveTitle}>Sensitive Content</Text>
                        <Text style={styles.sensitiveDescription}>
                            This video may contain sensitive content
                        </Text>
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={styles.viewButton}
                                onPress={handleViewSensitiveContent}
                                activeOpacity={0.8}
                                accessible={true}
                                accessibilityLabel="Watch video anyway"
                                accessibilityRole="button"
                                accessibilityHint="Dismisses the sensitive content warning and plays the video">
                                <Text style={styles.viewButtonText}>Watch anyways</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.videoContainer, { height: itemHeight }]}>
            <Pressable
                style={styles.tapArea}
                onPress={togglePlayPause}
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'}>
                <VideoView
                    style={styles.video}
                    player={player}
                    pointerEvents="none"
                    allowsPictureInPicture={false}
                    nativeControls={false}
                    accessible={false}
                    accessibilityLabel={item.media.alt_text || 'Video content'}
                    accessibilityHint="Tap to show playback controls"
                    contentFit={videoContentFit}
                />

                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
                    style={styles.gradientOverlay}
                    pointerEvents="none"
                />

                {isActive && userPaused && (
                    <View style={styles.playIndicatorOverlay} pointerEvents="none">
                        <View style={styles.playIndicator}>
                            <Ionicons name="play" size={70} color="rgba(255,255,255,0.9)" />
                        </View>
                    </View>
                )}
            </Pressable>

            <View
                style={[styles.rightActions, { bottom: tabBarHeight, opacity: isScrubbing ? 0 : 1 }]}
                pointerEvents={isScrubbing ? 'none' : 'auto'}>
                <PressableHaptics
                    style={styles.actionButton}
                    onPress={() => router.push(`/private/profile/${item.account.id}`)}
                    accessible={true}
                    accessibilityLabel={`View ${item.account.username}'s profile`}
                    accessibilityRole="button">
                    <View style={styles.avatarContainer}>
                        <Avatar url={item.account?.avatar} />
                    </View>
                </PressableHaptics>

                <PressableHaptics
                    style={styles.actionButton}
                    onPress={handleLike}
                    accessible={true}
                    accessibilityLabel={
                        isLiked ? `Unlike. ${likeCount} likes` : `Like. ${likeCount} likes`
                    }
                    accessibilityRole="button"
                    accessibilityState={{ selected: isLiked }}>
                    <Ionicons name={'heart'} size={35} color={isLiked ? '#F02C56' : 'white'} style={ICON_SHADOW} />
                    <Text style={styles.actionText} accessibilityElementsHidden={true}>
                        {likeCount}
                    </Text>
                </PressableHaptics>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onComment(item)}
                    accessible={true}
                    accessibilityLabel={
                        item.permissions?.can_comment
                            ? `Comments. ${item.comments} comments`
                            : 'Comments are disabled'
                    }
                    accessibilityRole="button">
                    <Ionicons name="chatbubble" size={32} color="white" style={ICON_SHADOW} />
                    {item.permissions?.can_comment && (
                        <Text style={styles.actionText} accessibilityElementsHidden={true}>
                            {item.comments}
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleBookmark}
                    accessible={true}
                    accessibilityLabel={
                        isBookmarked
                            ? `Remove bookmark. ${bookmarkCount} bookmarks`
                            : `Bookmark. ${bookmarkCount} bookmarks`
                    }
                    accessibilityRole="button"
                    accessibilityState={{ selected: isBookmarked }}>
                    <Ionicons
                        name="bookmark"
                        size={32}
                        color={isBookmarked ? '#F02C56' : 'white'}
                        style={ICON_SHADOW}
                    />
                    <Text style={styles.actionText} accessibilityElementsHidden={true}>
                        {bookmarkCount}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onShare(item)}
                    accessible={true}
                    accessibilityLabel={`Share. ${item.shares} shares`}
                    accessibilityRole="button">
                    <Ionicons name="arrow-redo" size={32} color="white" style={ICON_SHADOW} />
                    <Text style={styles.actionText} accessibilityElementsHidden={true}>
                        {item.shares}
                    </Text>
                </TouchableOpacity>
            </View>

            <View
                style={[
                    styles.bottomInfo,
                    { bottom: tabBarHeight, opacity: isScrubbing ? 0 : 1 },
                ]}>
                <TouchableOpacity
                    onPress={() => {
                        onNavigate?.();
                        router.push(`/private/profile/${item.account.id}`);
                    }}
                    accessible={true}
                    accessibilityLabel={`View @${item.account.username}'s profile`}
                    accessibilityRole="link">
                    <Text style={styles.username}>@{item.account.username}</Text>
                </TouchableOpacity>
                {item.caption && (
                    <LinkifiedCaption
                        caption={item.caption}
                        tags={item.tags || []}
                        mentions={item.mentions || []}
                        style={styles.caption}
                        numberOfLines={1}
                        onHashtagPress={(tag) => {
                            onNavigate?.();
                            router.push(`/private/search?query=${tag}`);
                        }}
                        onMentionPress={(username, profileId) => {
                            onNavigate?.();
                            router.push(`/private/profile/${profileId}`);
                        }}
                        onMorePress={() => onComment(item)}
                    />
                )}

                {item?.meta?.contains_ai && (
                    <View>
                        <View
                            style={styles.aiLabelWrapper}
                            accessible={true}
                            accessibilityLabel="Creator labeled this as AI-generated content"
                            accessibilityRole="text">
                            <Text style={styles.aiLabelText}>Creator labeled as AI-generated</Text>
                        </View>
                    </View>
                )}

                <View
                    style={styles.audioInfo}
                    accessible={true}
                    accessibilityLabel="Original Audio"
                    accessibilityRole="text">
                    <Ionicons
                        name="musical-notes"
                        size={14}
                        color="white"
                        importantForAccessibility="no"
                    />
                    <Text style={styles.audioText}>Original Audio</Text>
                </View>

                {item?.meta?.contains_ad && (
                    <View>
                        <View
                            style={styles.aiLabelWrapper}
                            accessible={true}
                            accessibilityLabel="Sponsored content"
                            accessibilityRole="text">
                            <Text style={styles.aiLabelText}>Sponsored</Text>
                        </View>
                    </View>
                )}
            </View>
            <VideoScrubber
                player={player}
                isActive={isActive}
                bottom={bottomInset}
                scrollRef={scrollRef}
                onScrubbingChange={setIsScrubbing}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    videoContainer: {
        width: '100%',
        position: 'relative',
        backgroundColor: '#000',
    },
    videoWrapper: {
        flex: 1,
        backgroundColor: '#000',
    },
    video: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
    },
    tapArea: {
        ...StyleSheet.absoluteFillObject,
    },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 10,
        elevation: 10,
    },
    playButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 11,
        elevation: 11,
    },
    sensitiveOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.99)',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        zIndex: 15,
        elevation: 15,
    },
    sensitiveContent: {
        alignItems: 'center',
        paddingHorizontal: 40,
        width: '100%',
    },
    sensitiveIconWrapper: {
        padding: 20,
        borderRadius: 90,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    sensitiveTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 8,
    },
    sensitiveDescription: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    buttonContainer: {
        width: '100%',
    },
    viewButton: {
        backgroundColor: 'white',
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    viewButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '700',
    },
    rightActions: {
        position: 'absolute',
        right: 12,
        gap: 20,
        zIndex: 5,
        elevation: 5,
    },
    actionButton: {
        alignItems: 'center',
        ...Platform.select({
            ios: {
                borderRadius: 50,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
            },
            android: {
                filter: [
                    {
                        dropShadow: {
                            offsetX: 0,
                            offsetY: 2,
                            standardDeviation: '3px',
                            color: '#0000004D',
                        },
                    },
                ],
            },
        }),
    },
    avatarContainer: {
        borderWidth: 2,
        borderColor: 'white',
        borderRadius: 24,
        overflow: 'hidden',
    },
    actionText: {
        color: 'white',
        fontWeight: '600',
        marginTop: 4,
        textShadowColor: 'rgba(0,0,0,0.55)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    bottomInfo: {
        position: 'absolute',
        left: 12,
        right: 80,
        zIndex: 5,
    },
    username: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    caption: {
        color: 'white',
        fontSize: 16,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    audioInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        opacity: 0.6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    audioText: {
        color: 'white',
        fontSize: 14,
    },
    gradientOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '20%',
    },
    aiLabelWrapper: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        marginVertical: 6,
        alignSelf: 'flex-start',
    },
    aiLabelText: {
        color: '#ffffff',
        fontWeight: 500,
    },
    playIndicatorOverlay: {
        ...StyleSheet.absoluteFillObject,
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0, 0.5)',
        width: '100%',
        height: '100%',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 2,
        elevation: 2,
    },
    playIndicator: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 3,
        elevation: 3,
    },
});