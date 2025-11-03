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
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VideoPlayer({
    item,
    isActive,
    onLike,
    onComment,
    onShare,
    onOther,
    bottomInset,
    commentsOpen,
    screenFocused,
    videoPlaybackRates,
    shareOpen,
    otherOpen,
    navigation,
    onNavigate,
    tabBarHeight = 60
}) {
    const [isLiked, setIsLiked] = useState(item.has_liked);
    const [showControls, setShowControls] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const manualControlRef = useRef(false);
    const isMountedRef = useRef(true);
    const wasActiveRef = useRef(false);
    const router = useRouter();

    const playbackRate = videoPlaybackRates[item.id] || 1.0;

    const player = useVideoPlayer(item.media.src_url, (player) => {
        player.loop = true;
        player.muted = false;
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

            const shouldPlay = isActive && screenFocused;

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
    }, [isActive, commentsOpen, shareOpen, otherOpen, screenFocused, player]);

    useEffect(() => {
        if (!isActive) {
            manualControlRef.current = false;
        }
    }, [isActive]);

    const handleLike = () => {
        setIsLiked(!isLiked);
        onLike(item.id, !isLiked);
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
        setShowControls(!showControls);

        if (showControls) {
            manualControlRef.current = false;
        }
    };

    return (
        <View style={styles.videoContainer}>
            <Pressable
                style={styles.videoWrapper}
                onPress={() => handleScreenPress()}
                disabled={showControls}
            >
                <VideoView
                    style={styles.video}
                    player={player}
                    allowsPictureInPicture={false}
                    nativeControls={false}
                    contentFit="contain"
                />

                {showControls && (
                    <View style={styles.controlsOverlay} pointerEvents="box-none">
                        <TouchableOpacity
                            onPress={(e) => {
                                e?.stopPropagation?.();
                                togglePlayPause();
                            }}
                            style={styles.playButton}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={isPlaying ? 'pause' : 'play'}
                                size={60}
                                color="white"
                            />
                        </TouchableOpacity>
                    </View>
                )}
            </Pressable>

            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
                style={styles.gradientOverlay}
                pointerEvents="none"
            />

            <View style={[styles.rightActions, { bottom: bottomInset + tabBarHeight + 20 }]}>
                <PressableHaptics style={styles.actionButton} onPress={() => router.push(`/private/profile/${item.account.id}`)}>
                    <View style={styles.avatarContainer}>
                        <Avatar url={item.account?.avatar} />
                    </View>
                </PressableHaptics>

                <PressableHaptics style={styles.actionButton} onPress={handleLike}>
                    <Ionicons
                        name={isLiked ? 'heart' : 'heart-outline'}
                        size={35}
                        color={isLiked ? '#FF2D55' : 'white'}
                    />
                    <Text style={styles.actionText}>
                        {item.likes + (isLiked && !item.has_liked ? 1 : 0)}
                    </Text>
                </PressableHaptics>

                <TouchableOpacity style={styles.actionButton} onPress={() => onComment(item)}>
                    <Ionicons name="chatbubble-outline" size={32} color="white" />
                    {item.permissions?.can_comment && (
                        <Text style={styles.actionText}>{item.comments}</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => onShare(item)}>
                    <Ionicons name="arrow-redo-outline" size={32} color="white" />
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
                        router.push(`/private/profile/${item.account.id}`)
                    }}
                >
                    <Text style={styles.username}>@{item.account.username}</Text>
                </TouchableOpacity>
                <LinkifiedCaption
                    caption={item.caption}
                    tags={item.tags || []}
                    mentions={item.mentions || []}
                    style={styles.caption}
                    numberOfLines={1}
                    onHashtagPress={(tag) => {
                        onNavigate?.();
                        router.push(`/private/search?query=${tag}`)
                    }}
                    onMentionPress={(username, profileId) => {
                        onNavigate?.();
                        router.push(`/private/profile/${profileId}`)
                    }}
                    onMorePress={() => onComment(item)}
                />
                <View style={styles.audioInfo}>
                    <Ionicons name="musical-notes" size={14} color="white" />
                    <Text style={styles.audioText}>Original Audio</Text>
                </View>
            </View>
        </View>
    );
};
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
    rightActions: {
        position: 'absolute',
        right: 12,
        gap: 20,
        zIndex: 5,
        elevation: 5,
    },
    actionButton: {
        alignItems: 'center',
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
    },
    caption: {
        color: 'white',
        fontSize: 16,
        marginBottom: 8,
    },
    audioInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        opacity: 0.6
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
        height: '50%',
    }
});