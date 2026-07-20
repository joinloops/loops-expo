import KlipyMedia from '@/components/feed/KlipyMedia';
import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { StackText } from '@/components/ui/Stack';
import type { DmOptimisticMessage, DmParticipant } from '@/types/dm';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { Image, View } from 'react-native';
import tw from 'twrnc';

const ACCENT = '#F02C56';
const MEDIA_WIDTH = 200;
const LOOP_CARD_WIDTH = 160;

const isKlipyUrl = (url?: string | null): boolean =>
    !!url && url.includes('//static.klipy.com/');

interface MessageBubbleProps {
    message: DmOptimisticMessage;
    isSelf: boolean;
    participant?: DmParticipant | null;
    showAvatar: boolean;
    showMeta: boolean;
    dayLabel?: string | null;
    onLongPress: (message: DmOptimisticMessage) => void;
    onPressLoop: (message: DmOptimisticMessage) => void;
    onPressRetry: (message: DmOptimisticMessage) => void;
}

const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export const MessageBubble = ({
    message,
    isSelf,
    participant,
    showAvatar,
    showMeta,
    dayLabel,
    onLongPress,
    onPressLoop,
    onPressRetry,
}: MessageBubbleProps) => {
    const firstMedia = message.media?.[0];

    const mediaHeight =
        firstMedia?.width && firstMedia?.height
            ? Math.min(MEDIA_WIDTH * (firstMedia.height / firstMedia.width), 320)
            : MEDIA_WIDTH;

    const handlePress = () => {
        if (message.failed) {
            onPressRetry(message);
            return;
        }
        if (message.type === 'loop_share') {
            onPressLoop(message);
        }
    };

    const renderContent = () => {
        if (message.type === 'loop_share' && message.video) {
            const video = message.video;
            const thumbnail = video.media?.thumbnail;

            return (
                <View>
                    <View
                        style={[
                            tw`bg-black rounded-xl overflow-hidden`,
                            { width: LOOP_CARD_WIDTH, aspectRatio: 9 / 16 },
                        ]}>
                        {thumbnail ? (
                            <Image
                                source={{ uri: thumbnail }}
                                style={tw`absolute inset-0 w-full h-full`}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={tw`absolute inset-0 items-center justify-center`}>
                                <Ionicons name="videocam-outline" size={32} color="#666" />
                            </View>
                        )}

                        {video.is_sensitive && (
                            <View
                                style={tw`absolute inset-0 bg-black/70 items-center justify-center`}>
                                <Ionicons name="eye-off-outline" size={28} color="#fff" />
                                <StackText
                                    fontSize="$2"
                                    textColor="text-white"
                                    fontWeight="semibold"
                                    style={tw`mt-1`}>
                                    Sensitive
                                </StackText>
                            </View>
                        )}

                        {!video.is_sensitive && (
                            <View style={tw`absolute inset-0 items-center justify-center`}>
                                <View
                                    style={tw`w-11 h-11 rounded-full bg-black/50 items-center justify-center`}>
                                    <Ionicons
                                        name="play"
                                        size={22}
                                        color="#fff"
                                        style={tw`ml-0.5`}
                                    />
                                </View>
                            </View>
                        )}

                        <View style={tw`absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1.5`}>
                            <StackText
                                fontSize="$1"
                                textColor="text-white"
                                fontWeight="semibold"
                                numberOfLines={1}>
                                @{video.account?.username ?? 'unknown'}
                            </StackText>
                        </View>
                    </View>

                    {!!message.body && (
                        <View
                            style={[
                                tw`mt-1 px-3 py-2 rounded-2xl`,
                                isSelf
                                    ? [{ backgroundColor: ACCENT }, tw`rounded-br-md`]
                                    : tw`bg-gray-100 dark:bg-gray-800 rounded-bl-md`,
                                { maxWidth: LOOP_CARD_WIDTH },
                            ]}>
                            <StackText
                                fontSize="$3"
                                textColor={isSelf ? 'text-white' : 'text-black dark:text-white'}>
                                {message.body}
                            </StackText>
                        </View>
                    )}
                </View>
            );
        }

        if (message.type === 'media' && firstMedia) {
            if (isKlipyUrl(firstMedia.url)) {
                return (
                    <KlipyMedia
                        media={{
                            id: String(firstMedia.id),
                            mime: firstMedia.mime_type ?? 'video/mp4',
                            url: firstMedia.url,
                            description: firstMedia.description,
                            width: firstMedia.width ?? 0,
                            height: firstMedia.height ?? 0,
                            provider: 'klipy',
                        }}
                    />
                );
            }

            const isVideoMime = (firstMedia.mime_type ?? '').startsWith('video/');
            const uri = isVideoMime
                ? (firstMedia.preview_url ?? firstMedia.url)
                : firstMedia.url;
            const isPlayable = firstMedia.type === 'video';

            return (
                <View
                    style={[
                        tw`rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800`,
                        { width: MEDIA_WIDTH, height: mediaHeight },
                    ]}>
                    <ExpoImage
                        source={{ uri }}
                        style={tw`w-full h-full`}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        accessibilityLabel={firstMedia.description ?? undefined}
                    />
                    {isPlayable && (
                        <View style={tw`absolute inset-0 items-center justify-center`}>
                            <View
                                style={tw`w-11 h-11 rounded-full bg-black/50 items-center justify-center`}>
                                <Ionicons name="play" size={22} color="#fff" style={tw`ml-0.5`} />
                            </View>
                        </View>
                    )}
                </View>
            );
        }

        return (
            <View
                style={[
                    tw`px-3.5 py-2.5 rounded-2xl`,
                    isSelf
                        ? [{ backgroundColor: ACCENT }, tw`rounded-br-md`]
                        : tw`bg-gray-100 dark:bg-gray-800 rounded-bl-md`,
                    { maxWidth: '100%' },
                ]}>
                <StackText
                    fontSize="$3"
                    textColor={isSelf ? 'text-white' : 'text-black dark:text-white'}>
                    {message.body ?? ''}
                </StackText>
            </View>
        );
    };

    return (
        <View style={tw`px-4`}>
            {!!dayLabel && (
                <View style={tw`items-center py-3`}>
                    <StackText fontSize="$1" textColor="text-gray-500" fontWeight="semibold">
                        {dayLabel}
                    </StackText>
                </View>
            )}

            <View
                style={[
                    tw`flex-row items-end`,
                    isSelf ? tw`justify-end` : tw`justify-start`,
                    showMeta ? tw`mb-0.5` : tw`mb-0.5`,
                ]}>
                {!isSelf &&
                    (showAvatar && participant?.avatar ? (
                        <Image
                            source={{ uri: participant.avatar }}
                            style={tw`w-8 h-8 rounded-full mr-2`}
                        />
                    ) : (
                        <View style={tw`w-8 mr-2`} />
                    ))}

                <PressableHaptics
                    onPress={handlePress}
                    onLongPress={() => onLongPress(message)}
                    style={[
                        { maxWidth: '78%' },
                        message.pending && tw`opacity-60`,
                    ]}>
                    {renderContent()}
                </PressableHaptics>
            </View>

            {message.failed ? (
                <View style={[tw`mt-1 mb-2`, isSelf ? tw`items-end` : tw`items-start pl-10`]}>
                    <StackText fontSize="$1" textColor="text-red-500">
                        Not delivered · Tap to retry
                    </StackText>
                </View>
            ) : showMeta ? (
                <View style={[tw`mt-0.5 mb-2`, isSelf ? tw`items-end` : tw`items-start pl-10`]}>
                    <StackText fontSize="$1" textColor="text-gray-500">
                        {formatTime(message.created_at)}
                        {message.edited_at ? ' · Edited' : ''}
                    </StackText>
                </View>
            ) : (
                <View style={tw`mb-0.5`} />
            )}
        </View>
    );
};