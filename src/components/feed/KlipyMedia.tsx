import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import React from 'react';
import { Image as RNImage, View } from 'react-native';
import tw from 'twrnc';

interface KlipyMediaItem {
    id: string;
    mime: string;
    url: string;
    description?: string | null;
    width: number;
    height: number;
    provider: string;
}

interface KlipyMediaProps {
    media: KlipyMediaItem;
    maxWidth?: number;
    maxHeight?: number;
}

export default function KlipyMedia({ media, maxWidth = 240, maxHeight = 320 }: KlipyMediaProps) {
    const aspectRatio = media.width / media.height || 1;

    let displayWidth = maxWidth;
    let displayHeight = maxWidth / aspectRatio;
    if (displayHeight > maxHeight) {
        displayHeight = maxHeight;
        displayWidth = maxHeight * aspectRatio;
    }

    const isVideo = media.mime.startsWith('video/');

    return (
        <View
            style={[
                tw`rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 mt-1 mb-2`,
                { width: displayWidth, height: displayHeight },
            ]}>
            {isVideo ? (
                <KlipyVideo url={media.url} />
            ) : (
                <Image
                    source={{ uri: media.url }}
                    style={tw`w-full h-full`}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    accessibilityLabel={media.description ?? undefined}
                />
            )}

            <View
                style={tw`absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/35`}
                pointerEvents="none">
                <RNImage
                    source={require('./../../../assets/images/klipy.png')}
                    style={{ width: 36, height: 12 }}
                    resizeMode="contain"
                />
            </View>
        </View>
    );
}

function KlipyVideo({ url }: { url: string }) {
    const player = useVideoPlayer(url, (p) => {
        p.loop = true;
        p.muted = true;
        p.play();
    });

    return (
        <VideoView
            player={player}
            style={tw`w-full h-full`}
            contentFit="cover"
            nativeControls={false}
        />
    );
}
