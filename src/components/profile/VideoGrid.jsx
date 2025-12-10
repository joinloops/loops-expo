import { StackText, YStack } from '@/components/ui/Stack';
import { prettyCount } from '@/utils/ui';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, View } from 'react-native';

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

                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
                    style={styles.gradientOverlay}
                    pointerEvents="none"
                />

                { video.pinned && (
                    <YStack
                        position="absolute"
                        top={8}
                        left={8}
                        flexDirection="row"
                        alignItems="center"
                        gap={1}
                        backgroundColor="#fb2c36"
                        paddingY={1}
                        paddingX={2}
                        style={{ borderRadius: 4}}>
                        <StackText fontSize={10} fontWeight={600} style={{color: '#fff'}}>
                            Pinned
                        </StackText>
                    </YStack>
                )}

                <YStack
                    position="absolute"
                    bottom={8}
                    left={8}
                    flexDirection="row"
                    alignItems="center"
                    gap={1}>
                    <Ionicons name="heart-outline" size={12} color="white" />
                    <StackText fontSize={10} fontWeight="600" style={{color: '#fff'}}>
                        {prettyCount(video.likes || 0)}
                    </StackText>
                </YStack>

                <YStack
                    position="absolute"
                    bottom={8}
                    right={8}
                    flexDirection="row"
                    alignItems="center"
                    gap={1}>
                    <Ionicons name="chatbubbles-outline" size={12} color="white" />
                    <StackText fontSize={10} fontWeight="600" style={{color: '#fff'}}>
                        {prettyCount(video.comments || 0)}
                    </StackText>
                </YStack>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    gradientOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '100%',
    },
})