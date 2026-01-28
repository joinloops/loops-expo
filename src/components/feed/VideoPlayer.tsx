import Avatar from '@/components/Avatar';
import LinkifiedCaption from '@/components/feed/LinkifiedCaption';
import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VideoPlayer({
    item,
    isActive,
    onLike,
    onComment,
    onShare,
    onBookmark,
    onOther,
    bottomInset,
    commentsOpen,
    screenFocused,
    videoPlaybackRates,
    shareOpen,
    otherOpen,
    navigation,
    onNavigate,
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

    const playbackRate = videoPlaybackRates[item.id] || 1.0;

    const player = useVideoPlayer(item.media.src_url, (player) => {
        player.loop = true;
        player.playbackRate = playbackRate;
    });

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
        };
    }, []);

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
            if (manualControlRef.current) {
                return;
            }

            const shouldPlay = isActive && screenFocused && !(item.is_sensitive && !playSensitive);

            if (isActive && !wasActiveRef.current) {
                player.currentTime = 0;
            }

            if (shouldPlay && isMountedRef.current) {
                player.play();
                setIsPlaying(true);
            } else if (isMountedRef.current) {
                player.pause();
                setIsPlaying(false);
            }

            wasActiveRef.current = isActive;
        } catch (error) {
            console.log('Player control error:', error);
        }
    }, [
        isActive,
        commentsOpen,
        shareOpen,
        otherOpen,
        screenFocused,
        player,
        item.is_sensitive,
        playSensitive,
    ]);

    useEffect(() => {
        if (!isActive) {
            manualControlRef.current = false;
            setPlaySensitive(false);
        }
    }, [isActive]);

    const handleLike = () => {
        setIsLiked(!isLiked);
        onLike(item.id, !isLiked);
    };

    const handleBookmark = () => {
        setIsBookmarked(!isBookmarked);
        onBookmark(item.id, !isBookmarked);
    };

    const togglePlayPause = () => {
        if (!player || !isMountedRef.current) return;

        try {
            manualControlRef.current = true;

            if (isPlaying) {
                player.pause();
                setIsPlaying(false);
            } else {
                player.play();
                setIsPlaying(true);
            }
        } catch (error) {
            console.log('Toggle play/pause error:', error);
        }
    };

    const handleScreenPress = () => {
        if (!isMountedRef.current) {
            return;
        }

        const newShowControls = !showControls;
        setShowControls(newShowControls);

        // Clear any existing timeout
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

    if (item.is_sensitive && !playSensitive) {
        return (
            <View style={styles.videoContainer}>
                <View
                    style={styles.sensitiveOverlay}
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
        <View style={styles.videoContainer}>
            <View style={styles.videoWrapper}>
                <VideoView
                    style={styles.video}
                    player={player}
                    allowsPictureInPicture={false}
                    nativeControls={false}
                    accessible={true}
                    accessibilityLabel={item.media.alt_text || 'Video content'}
                    accessibilityHint="Double tap to play or pause"
                    contentFit="contain"
                />

                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={() => handleScreenPress()}
                    disabled={showControls}
                />

                {showControls && (
                    <View style={styles.controlsOverlay} pointerEvents="box-none">
                        <TouchableOpacity
                            onPress={(e) => {
                                e?.stopPropagation?.();
                                togglePlayPause();
                            }}
                            style={styles.playButton}
                            activeOpacity={0.7}>
                            <Ionicons name={isPlaying ? 'pause' : 'play'} size={60} color="white" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
                style={styles.gradientOverlay}
                pointerEvents="none"
            />

            <View style={[styles.rightActions, { bottom: bottomInset + tabBarHeight + 20 }]}>
                <PressableHaptics
                    style={styles.actionButton}
                    onPress={() => router.push(`/private/profile/${item.account.id}`)}>
                    <View style={styles.avatarContainer}>
                        <Avatar url={item.account?.avatar} />
                    </View>
                </PressableHaptics>

                <PressableHaptics style={styles.actionButton} onPress={handleLike}>
                    <Ionicons name={'heart'} size={35} color={isLiked ? '#FF2D55' : 'white'} />
                    <Text style={styles.actionText}>
                        {item.likes + (isLiked && !item.has_liked ? 1 : 0)}
                    </Text>
                </PressableHaptics>

                <TouchableOpacity style={styles.actionButton} onPress={() => onComment(item)}>
                    <Ionicons name="chatbubble" size={32} color="white" />
                    {item.permissions?.can_comment && (
                        <Text style={styles.actionText}>{item.comments}</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={handleBookmark}>
                    <Ionicons
                        name="bookmark"
                        size={32}
                        color={isBookmarked ? '#FF2D55' : 'white'}
                    />
                    <Text style={styles.actionText}>
                        {item.bookmarks + (isBookmarked && !item.has_bookmarked ? 1 : 0)}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => onShare(item)}>
                    <Ionicons name="arrow-redo" size={32} color="white" />
                    <Text style={styles.actionText}>{item.shares}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => onOther(item)}>
                    <MaterialCommunityIcons name="dots-horizontal" size={32} color="white" />
                </TouchableOpacity>
            </View>

            <View style={[styles.bottomInfo, { bottom: bottomInset + tabBarHeight + 10 }]}>
                <TouchableOpacity
                    onPress={() => {
                        onNavigate?.();
                        router.push(`/private/profile/${item.account.id}`);
                    }}>
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
                        <View style={styles.aiLabelWrapper}>
                            <Text style={styles.aiLabelText}>Creator labeled as AI-generated</Text>
                        </View>
                    </View>
                )}

                <View style={styles.audioInfo}>
                    <Ionicons name="musical-notes" size={14} color="white" />
                    <Text style={styles.audioText}>Original Audio</Text>
                </View>
                {item?.meta?.contains_ad && (
                    <View>
                        <View style={styles.aiLabelWrapper}>
                            <Text style={styles.aiLabelText}>Sponsored</Text>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    videoContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        position: 'relative',
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
                            color: '#0000004D', // 30% opacity
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    bottomInfo: {
        position: 'absolute',
        left: 12,
        right: 80,
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
});
