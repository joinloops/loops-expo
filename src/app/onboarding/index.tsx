import { StackText, XStack, YStack } from '@/components/ui/Stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Dimensions, Platform, Pressable, View } from 'react-native';
import Animated, {
    cancelAnimation,
    Easing,
    FadeIn,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

const { width } = Dimensions.get('window');
const HERO_SIZE = Math.min(width * 0.36, 140);

export default function OnboardingStepOne() {
    const pulse = useSharedValue(0);
    const router = useRouter();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        pulse.value = withRepeat(
            withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
        return () => cancelAnimation(pulse);
    }, [pulse]);

    const pulseStyle = useAnimatedStyle(() => {
        const scale = 1 + pulse.value * 0.035;
        const opacity = 0.92 + pulse.value * 0.08;
        return { transform: [{ scale }], opacity };
    });

    return (
        <View style={tw`flex-1 bg-black`}>
            <StatusBar style="light" />
            <LinearGradient
                colors={['#000000', '#0a0a0e', '#15151a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={tw`absolute inset-0`}
            />

            <View style={tw`flex-1 items-center justify-center px-6`}>
                <Animated.View entering={FadeIn.duration(450)}>
                    <Animated.View
                        style={[
                            {
                                width: HERO_SIZE,
                                height: HERO_SIZE,
                                borderRadius: HERO_SIZE / 2,
                            },
                            tw`items-center justify-center pl-2`,
                            { backgroundColor: '#FFE500' },
                            pulseStyle,
                        ]}
                    >
                        <Ionicons name="play" size={64} color="#000" />
                    </Animated.View>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(120).duration(500)} style={tw`items-center mt-7 w-full`}>
                    <XStack style={tw`flex-row flex-wrap justify-center max-w-xs`}>
                        <StackText fontSize="$8" fontWeight={500} textColor="text-white">
                            Watch.&nbsp;
                        </StackText>
                        <StackText fontSize="$8" fontWeight={500} textColor="text-white">
                            Capture.&nbsp;
                        </StackText>
                        <StackText fontSize="$8" fontWeight={500} textColor="text-white">
                            Loop.
                        </StackText>
                    </XStack>

                    <StackText
                        fontSize="$4"
                        textColor="text-white/70"
                        style={tw`mt-2 text-center max-w-xs`}
                        lineHeight={Platform.OS === 'android' ? 20 : 'relaxed'}
                    >
                        Join millions sharing short videos on Loops.
                    </StackText>
                </Animated.View>
            </View>

            <YStack style={[tw`px-6`, { paddingBottom: Math.max(insets.bottom + 10, 18) }]}>
                <XStack justifyContent="space-between" alignItems="center">
                    <Pagination current={0} total={2} />
                    <PrimaryButton label="Continue" onPress={() => router.push('/onboarding/final')} />
                </XStack>
            </YStack>
        </View>
    );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            android_ripple={{ color: 'rgba(255,255,255,0.18)', borderless: false }}
            style={({ pressed }) => [
                tw`rounded-full px-8 py-3 bg-[#FFE500]`,
                Platform.OS === 'android' && tw`py-3`,
                pressed && Platform.OS === 'ios' && tw`opacity-90`,
            ]}
        >
            <StackText fontWeight="semibold" textColor="text-black" fontSize="$4">
                {label}
            </StackText>
        </Pressable>
    );
}

function Dot({ active }: { active: boolean }) {
    return (
        <View
            style={tw.style(
                'h-2 rounded-full mx-1',
                active ? 'w-6 bg-white' : 'w-2 bg-white/35'
            )}
        />
    );
}

function Pagination({ current, total }: { current: number; total: number }) {
    return (
        <XStack alignItems="center">
            {Array.from({ length: total }).map((_, i) => (
                <Dot key={i} active={i === current} />
            ))}
        </XStack>
    );
}
