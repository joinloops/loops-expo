import { Ionicons } from '@expo/vector-icons';
import { useEventListener } from 'expo';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';

import {
    Alert,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function PreviewScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { videoPath, duration, isUpload } = params;
    const [selectedSound, setSelectedSound] = useState('');
    const [isPlaying, setIsPlaying] = useState(true);

    const player = useVideoPlayer(videoPath as string, (player) => {
        player.loop = true;
        player.play();
    });

    useEffect(() => {
        console.log(params)
        return () => {
            player.release();
        };
    }, []);

    useEventListener(player, 'statusChange', ({ status, error }) => {
        console.log('Player status changed: ', status);
        console.log('Player error changed: ', error);
    });

    const handleBack = () => {
        router.back();
    };

    const handleRemoveSound = () => {
        setSelectedSound('');
        Alert.alert('Sound Removed', 'Audio track has been removed');
    };

    const handleSettings = () => {
        Alert.alert('Settings', 'Sound settings coming soon');
    };

    const handleNext = () => {
        player.pause();
        router.push({
            pathname: '/private/camera/caption',
            params: { videoPath: videoPath, duration: duration }
        });
    };

    const togglePlayPause = () => {
        if (isPlaying) {
            player.pause();
        } else {
            player.play();
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <Stack.Screen
                options={{ headerShown: false }}
            />

            <VideoView
                style={styles.video}
                player={player}
                allowsPictureInPicture={false}
                nativeControls={false}
            />

            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)']}
                style={styles.gradientOverlay}
                pointerEvents="none"
            />

            <View style={styles.topBar}>
                <TouchableOpacity onPress={handleBack} style={styles.topButton}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>

                {selectedSound && (
                    <View style={styles.soundChip}>
                        <Ionicons name="musical-notes" size={16} color="#fff" />
                        <Text style={styles.soundText} numberOfLines={1}>
                            {selectedSound}
                        </Text>
                        <TouchableOpacity onPress={handleRemoveSound} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity onPress={handleSettings} style={styles.topButton}>
                    <Ionicons name="settings-outline" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.rightControls}>
            </View>

            <View style={styles.bottomContainer}>
                <TouchableOpacity onPress={togglePlayPause} style={styles.controlButton}>
                    <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={24}
                        color="#fff"
                    />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
                    <Text style={styles.nextButtonText}>Next</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    video: {
        width: width,
        height: height,
        position: 'absolute',
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        zIndex: 10,
    },
    topButton: {
        width: 26,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    soundChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(40, 40, 40, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
        maxWidth: 200,
    },
    soundText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    rightControls: {
        position: 'absolute',
        right: 12,
        top: '15%',
        zIndex: 10,
        gap: 20,
    },
    controlButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        gap: 12,
    },
    nextButton: {
        backgroundColor: '#ff0050',
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 25,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    gradientOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '30%',
    }
});