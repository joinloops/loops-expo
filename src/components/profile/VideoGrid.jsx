import { StackText, YStack } from '@/components/ui/Stack';
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, View } from 'react-native';

export default function VideoGrid({ video, onPress }) {
    return (
        <Pressable
            onPress={() => onPress(video)}
            style={{
                width: '33.33%',
                aspectRatio: 9 / 16,
                padding: 1,
            }}>
            <View style={{ flex: 1, position: 'relative' }}>
                <Image
                    source={{ uri: video.media.thumbnail }}
                    style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#F1F1F2',
                    }}
                    resizeMode="cover"
                />

                <YStack
                    position="absolute"
                    bottom={4}
                    left={4}
                    flexDirection="row"
                    alignItems="center"
                    gap="$1">
                    <Ionicons name="play" size={12} color="white" />
                    <StackText fontSize={10} fontWeight="600">
                        {formatCount(video.likes || 0)}
                    </StackText>
                </YStack>
            </View>
        </Pressable>
    );
}

function formatCount(count) {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    }
    if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
}
