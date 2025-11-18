import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { Ionicons } from '@expo/vector-icons';
import { useEventListener } from 'expo';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

type DuetLayout = 'side-by-side' | 'vertical';

export default function DuetPreviewScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    
    const duetId = params.duetId as string;
    const newVideoPath = params.newVideoPath as string;
    const originalVideoUri = params.originalVideoUri as string;
    const layout = (params.layout as DuetLayout) || 'side-by-side';
    const duration = parseInt(params.duration as string) || 0;

    const newVideoUri = `file://${newVideoPath}`;

    const [isPlaying, setIsPlaying] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [originalVideoReady, setOriginalVideoReady] = useState(false);
    const [newVideoReady, setNewVideoReady] = useState(false);

    const originalPlayer = useVideoPlayer(originalVideoUri, player => {
        player.loop = false;
        player.volume = 0.5;
    });

    const newPlayer = useVideoPlayer(newVideoUri, player => {
        player.loop = false;
        player.volume = 1.0;
    });

    useEventListener(originalPlayer, 'statusChange', ({ status }) => {
        if (status === 'readyToPlay') {
            setOriginalVideoReady(true);
        }
    });

    useEventListener(newPlayer, 'statusChange', ({ status }) => {
        if (status === 'readyToPlay') {
            setNewVideoReady(true);
        }
    });

    useEventListener(originalPlayer, 'playToEnd', () => {
        setIsPlaying(false);
        newPlayer.pause();
    });

    const handlePlayPause = () => {
        if (!originalVideoReady || !newVideoReady) return;

        try {
            if (isPlaying) {
                originalPlayer.pause();
                newPlayer.pause();
                setIsPlaying(false);
            } else {
                originalPlayer.currentTime = 0;
                newPlayer.currentTime = 0;

                originalPlayer.play();
                newPlayer.play();

                setIsPlaying(true);
            }
        } catch (error) {
            console.error('Error toggling playback:', error);
        }
    };

    const handleRetake = () => {
        router.back();
    };

    const handlePublish = async () => {
        router.push({
            pathname: '/private/video/duet/caption',
            params: {
                videoPath: newVideoPath,
                duetId: duetId,
                originalVideoUri: originalVideoUri,
                duration: duration.toString(),
                layout: layout,
            }
        })
    };

    let originalVideoWidth: number;
    let originalVideoHeight: number;
    let newVideoWidth: number;
    let newVideoHeight: number;

    if (layout === 'side-by-side') {
        originalVideoWidth = SCREEN_WIDTH / 2;
        originalVideoHeight = SCREEN_HEIGHT;
        newVideoWidth = SCREEN_WIDTH / 2;
        newVideoHeight = SCREEN_HEIGHT;
    } else {
        originalVideoWidth = SCREEN_WIDTH;
        originalVideoHeight = SCREEN_HEIGHT / 2;
        newVideoWidth = SCREEN_WIDTH;
        newVideoHeight = SCREEN_HEIGHT / 2;
    }

    const bothVideosReady = originalVideoReady && newVideoReady;

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Stack.Screen options={{ headerShown: false }} />


            <View
                style={[
                    styles.videoContainer,
                    layout === 'side-by-side' ? styles.videoLeft : styles.videoTop,
                    { width: originalVideoWidth, height: originalVideoHeight },
                ]}
            >
                <VideoView
                    player={originalPlayer}
                    style={StyleSheet.absoluteFill}
                    contentFit="contain"
                    nativeControls={false}
                    surfaceType="textureView"
                />
            </View>

            <View
                style={[
                    styles.videoContainer,
                    layout === 'side-by-side' ? styles.videoRight : styles.videoBottom,
                    { width: newVideoWidth, height: newVideoHeight },
                ]}
            >
                <VideoView
                    player={newPlayer}
                    style={StyleSheet.absoluteFill}
                    contentFit="contain"
                    nativeControls={false}
                    surfaceType="textureView"
                />
            </View>

            <View
                style={[
                    styles.dividerLine,
                    layout === 'side-by-side'
                        ? { left: SCREEN_WIDTH / 2, width: 2, height: SCREEN_HEIGHT }
                        : { top: SCREEN_HEIGHT / 2, height: 2, width: SCREEN_WIDTH },
                ]}
            />

            {!bothVideosReady && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.loadingText}>Loading videos...</Text>
                </View>
            )}

            {bothVideosReady && (
                <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
                    <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={48}
                        color="#fff"
                    />
                </TouchableOpacity>
            )}

            <View style={styles.topBar}>
                <View style={styles.duetBadge}>
                    <Ionicons name="duplicate-outline" size={16} color="#fff" />
                    <Text style={styles.duetBadgeText}>Duet Preview</Text>
                </View>
            </View>

            <View style={styles.bottomControls}>
                <PressableHaptics
                    onPress={handleRetake}
                    style={styles.retakeButton}
                    disabled={isProcessing}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                    <Text style={styles.retakeText}>Retake</Text>
                </PressableHaptics>

                <PressableHaptics
                    onPress={handlePublish}
                    style={[styles.publishButton, isProcessing && styles.publishButtonDisabled]}
                    disabled={isProcessing || !bothVideosReady}
                >
                    {isProcessing ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.publishText}>Next</Text>
                            <Ionicons name="chevron-forward-outline" size={24} color="#fff" />
                        </>
                    )}
                </PressableHaptics>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    videoContainer: {
        position: 'absolute',
        backgroundColor: '#000',
    },
    videoLeft: {
        left: 0,
        top: 0,
    },
    videoRight: {
        right: 0,
        top: 0,
    },
    videoTop: {
        left: 0,
        top: 0,
    },
    videoBottom: {
        left: 0,
        bottom: 0,
    },
    dividerLine: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        zIndex: 1,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        zIndex: 10,
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    playButton: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -40 }, { translateY: -40 }],
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 60,
        paddingHorizontal: 20,
        alignItems: 'center',
        zIndex: 10,
    },
    duetBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F02C56',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
    },
    duetBadgeText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    bottomControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 16,
        zIndex: 10,
    },
    retakeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    retakeText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    publishButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F02C56',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    publishButtonDisabled: {
        backgroundColor: 'rgba(255, 20, 147, 0.5)',
    },
    publishText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
