import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

interface Props {
    uri: string | null;
    onClose: () => void;
}

export default function CollabVideoPreviewModal({ uri, onClose }: Props) {
    const insets = useSafeAreaInsets();
    const player = useVideoPlayer(uri ?? null, (p) => {
        p.loop = true;
    });

    useEffect(() => {
        if (uri) {
            player.play();
        } else {
            player.pause();
        }
    }, [uri, player]);

    return (
        <Modal visible={!!uri} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
            <View style={tw`flex-1 bg-black`}>
                <VideoView
                    player={player}
                    style={tw`flex-1`}
                    contentFit="contain"
                    nativeControls
                    allowsFullscreen={false}
                />
                <Pressable
                    onPress={onClose}
                    hitSlop={12}
                    accessibilityLabel="Close preview"
                    style={[
                        tw`absolute left-4 w-10 h-10 rounded-full bg-black/60 items-center justify-center`,
                        { top: insets.top + 8 },
                    ]}>
                    <Ionicons name="close" size={24} color="#fff" />
                </Pressable>
            </View>
        </Modal>
    );
}
