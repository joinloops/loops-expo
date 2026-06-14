import PlaylistIcon from '@/components/icons/PlaylistIcon';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback } from 'react';
import { FlatList, Image, Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import tw from 'twrnc';

const ACCENT = '#F02C56';

const getThumb = (v) =>
    v?.media?.thumbnail || v?.thumbnail || v?.preview_url || v?.media?.preview_url || null;
const getTitle = (v) => v?.caption || v?.title || v?.description || null;

const VideoRow = memo(function VideoRow({ video, index, isCurrent, onPress }) {
    const { colorScheme } = useTheme();
    const thumb = getThumb(video);
    const title = getTitle(video) || `Part ${index + 1}`;
    const placeholderColor = colorScheme === 'dark' ? '#6b7280' : '#9ca3af';

    return (
        <Pressable
            onPress={() => onPress(index)}
            style={({ pressed }) => [
                tw`flex-row items-center px-4 py-2.5`,
                pressed && tw`bg-black/5 dark:bg-white/5`,
            ]}>
            <Text
                style={[
                    tw`w-6 text-center text-sm font-semibold`,
                    isCurrent ? { color: ACCENT } : tw`text-gray-400 dark:text-gray-500`,
                ]}>
                {index + 1}
            </Text>

            <View
                style={tw`w-10 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-neutral-800 ml-1`}>
                {thumb ? (
                    <Image source={{ uri: thumb }} style={tw`w-full h-full`} resizeMode="cover" />
                ) : (
                    <View style={tw`flex-1 items-center justify-center`}>
                        <Ionicons name="play" size={16} color={placeholderColor} />
                    </View>
                )}
            </View>

            <Text
                numberOfLines={2}
                style={[
                    tw`flex-1 ml-3 text-[15px]`,
                    isCurrent
                        ? { color: ACCENT, fontWeight: '600' }
                        : tw`text-gray-900 dark:text-gray-100`,
                ]}>
                {title}
            </Text>

            {isCurrent && <Ionicons name="volume-high" size={18} color={ACCENT} style={tw`ml-2`} />}
        </Pressable>
    );
});

const PlaylistVideosModal = memo(function PlaylistVideosModal({
    visible,
    title,
    videos = [],
    currentIndex = 0,
    onSelect,
    onClose,
}) {
    const { height } = useWindowDimensions();
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    const iconColor = isDark ? '#ffffff' : '#1f2937';
    const iconBg = isDark ? '#171717' : '#ffffff';
    const chevronColor = isDark ? '#ffffff' : '#374151';

    const renderItem = useCallback(
        ({ item, index }) => (
            <VideoRow
                video={item}
                index={index}
                isCurrent={index === currentIndex}
                onPress={onSelect}
            />
        ),
        [currentIndex, onSelect],
    );

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={tw`flex-1 bg-black/60 justify-end`} onPress={onClose}>
                <Pressable
                    style={tw`bg-white dark:bg-neutral-900 rounded-t-3xl pb-6`}
                    onPress={(e) => e.stopPropagation()}>
                    <View style={tw`items-center pt-3 pb-1`}>
                        <View style={tw`w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600`} />
                    </View>

                    <View style={tw`flex-row items-center px-4 py-3`}>
                        <PlaylistIcon filled size={20} color={iconColor} bgColor={iconBg} />
                        <Text
                            style={tw`flex-1 ml-3 text-gray-900 dark:text-white text-base font-semibold`}
                            numberOfLines={1}>
                            {title}
                            {videos.length ? (
                                <Text
                                    style={tw`text-gray-500 dark:text-gray-400 font-normal`}>{`  ·  ${videos.length} parts`}</Text>
                            ) : null}
                        </Text>
                        <Pressable onPress={onClose} hitSlop={10} style={tw`p-1`}>
                            <Ionicons name="chevron-down" size={24} color={chevronColor} />
                        </Pressable>
                    </View>

                    <View style={tw`h-px bg-black/10 dark:bg-white/10`} />

                    <FlatList
                        data={videos}
                        renderItem={renderItem}
                        keyExtractor={(item, index) => `${item?.id ?? index}`}
                        style={{ maxHeight: height * 0.7 }}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={tw`py-2`}
                        initialNumToRender={12}
                        windowSize={7}
                    />
                </Pressable>
            </Pressable>
        </Modal>
    );
});

export default PlaylistVideosModal;
