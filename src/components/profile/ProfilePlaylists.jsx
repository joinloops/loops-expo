import { useTheme } from '@/contexts/ThemeContext';
import { memo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import tw from 'twrnc';

const PlaylistIcon = memo(({ color, bgColor, size = 19 }) => (
    <Svg width={size} height={size} viewBox="0 0 104 100" fill="none">
        <Path
            d="M83.9648 0C94.9814 8.38845e-05 103.912 8.93072 103.912 19.9473V62.1895C103.912 73.2061 94.9815 82.1366 83.9648 82.1367H76.5332V76.2705H83.9648L84.3281 76.2656C91.9367 76.0729 98.0449 69.8445 98.0449 62.1895V19.9473C98.0448 12.1709 91.7412 5.86727 83.9648 5.86719H41.7227C33.9463 5.86724 27.6427 12.1709 27.6426 19.9473V23.8584H21.7754V19.9473C21.7756 8.9307 30.7061 5.14751e-05 41.7227 0H83.9648Z"
            fill={color}
        />
        <Path d="M61 59L31 76.3205L31 41.6795L61 59Z" fill={color} />
        <Path
            d="M0 80V38C0 26.9543 8.95431 18 20 18V24C12.268 24 6 30.268 6 38V80L6.00488 80.3613C6.1935 87.8062 12.1938 93.8065 19.6387 93.9951L20 94H62L62.3613 93.9951C69.9263 93.8035 76 87.6112 76 80V38C76 30.268 69.732 24 62 24V18C73.0457 18 82 26.9543 82 38V80C82 91.0457 73.0457 100 62 100H20C8.9543 100 0 91.0457 0 80ZM62 18V24H20V18H62Z"
            fill={color}
        />
    </Svg>
));

const ProfilePlaylists = memo(({ playlists, isLoading, onPlaylistPress }) => {
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    const iconColor = isDark ? '#e5e7eb' : '#1f2937';
    const iconBg = isDark ? '#1f2937' : '#f3f4f6';

    if (isLoading) {
        return (
            <View style={tw`px-4 py-3`}>
                <ActivityIndicator color="#F02C56" />
            </View>
        );
    }

    if (!playlists?.length) return null;

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`px-4 py-3`}>
            {playlists.map((playlist) => (
                <Pressable
                    key={playlist.id?.toString()}
                    onPress={() => onPlaylistPress?.(playlist)}
                    style={({ pressed }) => [
                        tw`flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2.5 mr-2`,
                        pressed && tw`opacity-70`,
                    ]}>
                    <PlaylistIcon color={iconColor} bgColor={iconBg} />
                    <Text
                        style={tw`ml-2 text-[15px] font-semibold text-gray-900 dark:text-gray-100`}
                        numberOfLines={1}>
                        {playlist.name}
                    </Text>
                </Pressable>
            ))}
        </ScrollView>
    );
});

export default ProfilePlaylists;
