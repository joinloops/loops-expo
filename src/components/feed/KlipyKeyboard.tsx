import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import {
    fetchKlipySearch,
    fetchKlipyTrending,
    type KlipyItem,
    type KlipyMediaType,
} from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS: { key: KlipyMediaType; label: string }[] = [
    { key: 'gifs', label: 'GIFs' },
    { key: 'stickers', label: 'Stickers' },
    { key: 'memes', label: 'Memes' },
    { key: 'clips', label: 'Clips' },
];

const COLUMN_GAP = 6;
const HORIZONTAL_PADDING = 6;
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - COLUMN_GAP) / COLUMN_COUNT;

interface KlipyKeyboardProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (
        item: KlipyItem,
        type: KlipyMediaType,
        media: { url: string; mime: string; width: number; height: number },
    ) => void;
}

export default function KlipyKeyboard({ visible, onClose, onSelect }: KlipyKeyboardProps) {
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const [activeTab, setActiveTab] = useState<KlipyMediaType>('gifs');
    const [searchInput, setSearchInput] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(searchInput.trim()), 350);
        return () => clearTimeout(t);
    }, [searchInput]);

    const isSearching = debouncedQuery.length > 0;

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
        queryKey: ['klipy', activeTab, debouncedQuery],
        queryFn: ({ pageParam = 1 }) =>
            isSearching
                ? fetchKlipySearch(activeTab, debouncedQuery, pageParam as number)
                : fetchKlipyTrending(activeTab, pageParam as number),
        getNextPageParam: (lastPage) => (lastPage.has_next ? lastPage.page + 1 : undefined),
        initialPageParam: 1,
        enabled: visible,
    });

    const items = useMemo(
        () => data?.pages.flatMap((p) => p.items.filter((i) => !i.is_ad)) ?? [],
        [data],
    );

    const columns = useMemo(() => {
        const cols: KlipyItem[][] = Array.from({ length: COLUMN_COUNT }, () => []);
        const heights = new Array<number>(COLUMN_COUNT).fill(0);
        for (const item of items) {
            let minIdx = 0;
            for (let i = 1; i < COLUMN_COUNT; i++) {
                if (heights[i] < heights[minIdx]) minIdx = i;
            }
            cols[minIdx].push(item);
            const aspectRatio = item.width / item.height || 1;
            heights[minIdx] += ITEM_WIDTH / aspectRatio + COLUMN_GAP;
        }
        return cols;
    }, [items]);

    const handleSelect = (item: KlipyItem) => {
        const media = item.mp4?.url
            ? {
                  url: item.mp4.url,
                  mime: 'video/mp4',
                  width: item.mp4.width,
                  height: item.mp4.height,
              }
            : {
                  url: item.preview.url,
                  mime: 'image/webp',
                  width: item.preview.width,
                  height: item.preview.height,
              };

        onSelect(item, activeTab, media);
        setSearchInput('');
    };

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
        const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 300;
        if (isCloseToBottom && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    const handleClose = () => {
        setSearchInput('');
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
            <View style={tw`flex-1 justify-end`}>
                <Pressable style={tw`absolute inset-0 bg-black/30`} onPress={handleClose} />
                <View
                    style={tw.style(`bg-white dark:bg-black rounded-t-2xl`, {
                        height: '70%',
                        paddingBottom: insets.bottom,
                    })}>
                    <View style={tw`flex-row items-center justify-between px-4 py-3`}>
                        <Text style={tw`text-lg font-bold text-black dark:text-white`}>
                            GIF Keyboard
                        </Text>
                        <TouchableOpacity onPress={handleClose} hitSlop={10}>
                            <Ionicons name="close" size={26} color={isDark ? '#fff' : '#000'} />
                        </TouchableOpacity>
                    </View>

                    <View
                        style={tw`flex-row items-center mx-4 mb-3 px-3 bg-gray-100 dark:bg-gray-900 rounded-xl`}>
                        <Ionicons name="search" size={18} color={isDark ? '#888' : '#666'} />
                        <TextInput
                            value={searchInput}
                            onChangeText={setSearchInput}
                            placeholder={`Search KLIPY`}
                            placeholderTextColor={isDark ? '#666' : '#999'}
                            style={tw`flex-1 ml-2 py-2.5 text-black dark:text-white text-[15px]`}
                            returnKeyType="search"
                            autoCorrect={false}
                            autoCapitalize="none"
                        />
                        {searchInput.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchInput('')} hitSlop={10}>
                                <Ionicons
                                    name="close-circle"
                                    size={18}
                                    color={isDark ? '#888' : '#666'}
                                />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Tabs */}
                    <View style={tw`flex-row px-3 mb-2`}>
                        {TABS.map((tab) => {
                            const isActive = activeTab === tab.key;
                            return (
                                <PressableHaptics
                                    key={tab.key}
                                    onPress={() => setActiveTab(tab.key)}
                                    style={tw.style(
                                        `px-3.5 py-1.5 mr-2 rounded-full`,
                                        isActive
                                            ? `bg-black dark:bg-white`
                                            : `bg-gray-100 dark:bg-gray-900`,
                                    )}>
                                    <Text
                                        style={tw.style(
                                            `text-sm font-semibold`,
                                            isActive
                                                ? `text-white dark:text-black`
                                                : `text-gray-700 dark:text-gray-300`,
                                        )}>
                                        {tab.label}
                                    </Text>
                                </PressableHaptics>
                            );
                        })}
                    </View>

                    {isLoading ? (
                        <View style={tw`flex-1 items-center justify-center`}>
                            <ActivityIndicator color={isDark ? '#999' : '#666'} />
                        </View>
                    ) : items.length === 0 ? (
                        <View style={tw`flex-1 items-center justify-center px-8`}>
                            <Ionicons
                                name="search-outline"
                                size={48}
                                color={isDark ? '#444' : '#ccc'}
                            />
                            <Text style={tw`text-base font-semibold text-gray-500 mt-3`}>
                                {isSearching
                                    ? `No results for "${debouncedQuery}"`
                                    : 'Nothing to show'}
                            </Text>
                            {isSearching && (
                                <Text style={tw`text-sm text-gray-400 mt-1`}>
                                    Try different keywords
                                </Text>
                            )}
                        </View>
                    ) : (
                        <ScrollView
                            onScroll={handleScroll}
                            scrollEventThrottle={200}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                            contentContainerStyle={{
                                paddingHorizontal: HORIZONTAL_PADDING,
                                paddingBottom: 24,
                            }}>
                            <View style={{ flexDirection: 'row', gap: COLUMN_GAP }}>
                                {columns.map((col, i) => (
                                    <View key={i} style={{ flex: 1, gap: COLUMN_GAP }}>
                                        {col.map((item) => (
                                            <KlipyTile
                                                key={String(item.id)}
                                                item={item}
                                                width={ITEM_WIDTH}
                                                onPress={handleSelect}
                                                isDark={isDark}
                                            />
                                        ))}
                                    </View>
                                ))}
                            </View>
                            {isFetchingNextPage && (
                                <ActivityIndicator
                                    color={isDark ? '#999' : '#666'}
                                    style={tw`my-4`}
                                />
                            )}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}

interface KlipyTileProps {
    item: KlipyItem;
    width: number;
    isDark: boolean;
    onPress: (item: KlipyItem) => void;
}

function KlipyTile({ item, width, onPress, isDark }: KlipyTileProps) {
    const aspectRatio = item.width / item.height || 1;
    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onPress(item)}
            style={[
                tw`rounded-lg overflow-hidden`,
                {
                    width,
                    aspectRatio,
                    backgroundColor: isDark ? '#222' : '#eee',
                },
            ]}>
            <Image
                source={{ uri: item.preview.url }}
                placeholder={item.blur_preview ? { uri: item.blur_preview } : undefined}
                style={tw`w-full h-full`}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
                accessibilityLabel={item.title}
            />
        </TouchableOpacity>
    );
}
