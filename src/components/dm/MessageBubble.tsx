import { senderShortName } from '@/components/dm/dmGroupHelpers';
import { stripLeadingMentions } from '@/components/dm/dmHelpers';
import KlipyMedia from '@/components/feed/KlipyMedia';
import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { StackText } from '@/components/ui/Stack';
import type { DmOptimisticMessage, DmParticipant } from '@/types/dm';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { Image, Pressable, View } from 'react-native';
import tw from 'twrnc';
import Avatar from '../Avatar';

const ACCENT = '#F02C56';
const MEDIA_WIDTH = 200;
const LOOP_CARD_WIDTH = 160;

const isKlipyUrl = (url?: string | null): boolean =>
    !!url && url.includes('//static.klipy.com/');

interface MessageBubbleProps {
    message: DmOptimisticMessage;
    isSelf: boolean;
    isNewest?: boolean;
    participant?: DmParticipant | null;
    sender?: DmParticipant | null;
    showAvatar: boolean;
    showName?: boolean;
    showMeta: boolean;
    dayLabel?: string | null;
    onLongPress: (message: DmOptimisticMessage) => void;
    onPressLoop: (message: DmOptimisticMessage) => void;
    onPressMedia: (message: DmOptimisticMessage, index: number) => void;
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
    sender,
    showAvatar,
    showName = false,
    showMeta,
    dayLabel,
    isNewest = false,
    onLongPress,
    onPressLoop,
    onPressMedia,
    onPressRetry,
}: MessageBubbleProps) => {
    const firstMedia = message.media?.[0];
    const avatarUser = sender ?? participant;
    const senderLabel = senderShortName(avatarUser);
    const bodyText = stripLeadingMentions(message.body);

    const ACCENT = '#F02C56';
    const MEDIA_WIDTH = 200;
    const LOOP_CARD_WIDTH = 160;
    const GAP_TIGHT = 6;
    const GAP_GROUP = 30;
    const GRID_WIDTH = 240;
    const GRID_HEIGHT = 200;
    const GRID_GAP = 2;

    const GRID_COLUMNS: Record<number, number[][]> = {
        2: [[0], [1]],
        3: [[0], [1, 2]],
        4: [[0, 2], [1, 3]],
    };

    const groupGap = isNewest ? 0 : GAP_GROUP;
    const tightGap = isNewest ? 0 : GAP_TIGHT;

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
            return;
        }
        if (
            message.type === 'media' &&
            message.media?.length === 1 &&
            firstMedia?.type === 'image' &&
            !isKlipyUrl(firstMedia.url) &&
            !message.pending
        ) {
            onPressMedia(message, 0);
        }
    };

    const renderTile = (item: DmMediaEntity, index: number) => {
        const isVideoMime = (item.mime_type ?? '').startsWith('video/');
        const uri = isVideoMime ? (item.preview_url ?? item.url) : item.url;
        const isPlayable = item.type === 'video';
        const canOpen = !isVideoMime && (item.type === 'image' || item.type === 'gif');

        return (
            <Pressable
                key={item.id ?? String(index)}
                onPress={() => canOpen && onPressMedia(message, index)}
                onLongPress={() => onLongPress(message)}
                style={({ pressed }) => [
                    tw`flex-1 overflow-hidden bg-gray-200 dark:bg-gray-900`,
                    pressed && canOpen && tw`opacity-80`,
                ]}>
                {uri ? (
                    <ExpoImage
                        source={{ uri }}
                        placeholder={item.blurhash ? { blurhash: item.blurhash } : undefined}
                        placeholderContentFit="cover"
                        style={tw`w-full h-full`}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                        accessibilityLabel={item.description ?? undefined}
                    />
                ) : (
                    <View style={tw`flex-1 items-center justify-center`}>
                        <Ionicons name="document-outline" size={22} color="#999" />
                    </View>
                )}
                {isPlayable && (
                    <View style={tw`absolute inset-0 items-center justify-center`}>
                        <View style={tw`w-9 h-9 rounded-full bg-black/50 items-center justify-center`}>
                            <Ionicons name="play" size={18} color="#fff" style={tw`ml-0.5`} />
                        </View>
                    </View>
                )}
            </Pressable>
        );
    };

    const renderContent = () => {
        if (message.type === 'loop_share' && message.video) {
            const video = message.video;
            const thumbnail = video.media?.thumbnail;

            return (
                <View
                    style={[
                        tw`overflow-hidden rounded-2xl`,
                        isSelf
                            ? [
                                { backgroundColor: ACCENT },
                                tw`rounded-br-md`,
                            ]
                            : tw`bg-gray-100 dark:bg-gray-800 rounded-bl-md`,
                        { width: LOOP_CARD_WIDTH },
                    ]}>
                    <View
                        style={[
                            tw`relative bg-black overflow-hidden`,
                            { width: '100%', aspectRatio: 9 / 16 },
                        ]}>
                        {thumbnail ? (
                            <Image
                                source={{ uri: thumbnail }}
                                style={tw`absolute inset-0 w-full h-full`}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={tw`absolute inset-0 items-center justify-center`}>
                                <Ionicons
                                    name="videocam-outline"
                                    size={32}
                                    color="#666"
                                />
                            </View>
                        )}

                        {video.is_sensitive ? (
                            <View style={tw`absolute inset-0 bg-black/70 items-center justify-center`}>
                                <Ionicons
                                    name="eye-off-outline"
                                    size={28}
                                    color="#fff"
                                />

                                <StackText
                                    fontSize="$2"
                                    textColor="text-white"
                                    fontWeight="semibold"
                                    style={tw`mt-1`}>
                                    Sensitive
                                </StackText>
                            </View>
                        ) : (
                            <View style={tw`absolute inset-0 items-center justify-center`}>
                                <View style={tw`w-11 h-11 rounded-full bg-black/50 items-center justify-center`}>
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
                        <View style={tw`px-3 py-2.5`}>
                            <StackText
                                fontSize="$3"
                                textColor={
                                    isSelf
                                        ? 'text-white'
                                        : 'text-black dark:text-white'
                                }>
                                {bodyText}
                            </StackText>
                        </View>
                    )}
                </View>
            );
        }

        if (message.type === 'media' && message.media?.length) {
            const items = message.media.slice(0, 4);

            if (items.length === 1) {
                const only = items[0];

                if (isKlipyUrl(only.url)) {
                    return (
                        <KlipyMedia
                            media={{
                                id: String(only.id),
                                mime: only.mime_type ?? 'video/mp4',
                                url: only.url,
                                description: only.description,
                                width: only.width ?? 0,
                                height: only.height ?? 0,
                                provider: 'klipy',
                            }}
                        />
                    );
                }

                const isVideoMime = (only.mime_type ?? '').startsWith('video/');
                const uri = isVideoMime ? (only.preview_url ?? only.url) : only.url;
                const isPlayable = only.type === 'video';

                return (
                    <View
                        style={[
                            tw`rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800`,
                            { width: MEDIA_WIDTH, height: mediaHeight },
                        ]}>
                        <ExpoImage
                            source={{ uri }}
                            placeholder={only.blurhash ? { blurhash: only.blurhash } : undefined}
                            style={tw`w-full h-full`}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            accessibilityLabel={only.description ?? undefined}
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

            const columns = GRID_COLUMNS[items.length] ?? GRID_COLUMNS[2];

            return (
                <View
                    style={[
                        tw`rounded-xl overflow-hidden flex-row bg-gray-100 dark:bg-gray-800`,
                        { width: GRID_WIDTH, height: GRID_HEIGHT, gap: GRID_GAP },
                    ]}>
                    {columns.map((column, columnIndex) => (
                        <View
                            key={String(columnIndex)}
                            style={[tw`flex-1`, { gap: GRID_GAP }]}>
                            {column.map((itemIndex) => renderTile(items[itemIndex], itemIndex))}
                        </View>
                    ))}
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
                    {bodyText}
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

            {showName && !isSelf && !!senderLabel && (
                <View style={tw`pl-10 mb-0.5`}>
                    <StackText fontSize="$1" textColor="text-gray-500" fontWeight="semibold">
                        {senderLabel}
                    </StackText>
                </View>
            )}

            <View
                style={[
                    tw`flex-row items-end`,
                    isSelf ? tw`justify-end` : tw`justify-start`,
                ]}>
                {!isSelf &&
                    (showAvatar && avatarUser?.avatar ? (
                        <Avatar
                            url={avatarUser.avatar}
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
                <View style={[tw`mt-1`, { marginBottom: groupGap }, isSelf ? tw`items-end` : tw`items-start pl-10`]}>
                    <StackText fontSize="$1" textColor="text-red-500">
                        Not delivered · Tap to retry
                    </StackText>
                </View>
            ) : showMeta ? (
                <PressableHaptics
                    onLongPress={() => onLongPress(message)}>

                    <View style={[tw`mt-1`, { marginBottom: groupGap }, isSelf ? tw`items-end` : tw`items-start pl-10`]} >
                        <StackText fontSize="$1" textColor="text-gray-500">
                            {formatTime(message.created_at)}
                            {message.edited_at ? ' · Edited' : ''}
                        </StackText>
                    </View>
                </PressableHaptics>
            ) : (
                <View style={{ marginBottom: tightGap }} />
            )}
        </View>
    );
};