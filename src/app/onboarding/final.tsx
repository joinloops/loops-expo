import { StackText, XStack, YStack } from '@/components/ui/Stack';
import { useAuthStore } from '@/utils/authStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Pressable, StatusBar, View } from 'react-native';
import Animated, {
    FadeInDown,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import tw from 'twrnc';

export default function OnboardingStepTwo() {
    const p = useSharedValue(0);
    const { completeOnboarding } = useAuthStore();

    useEffect(() => {
        p.value = withTiming(1, { duration: 900 });
    }, []);

    const float = useSharedValue(0);
    useEffect(() => {
        float.value = withRepeat(withTiming(1, { duration: 2000 }), -1, true);
    }, []);

    const cardStyle = (i: number) =>
        useAnimatedStyle(() => {
            const t = interpolate(p.value, [0, 1], [0, 1]);
            const ty = interpolate(t, [0, 1], [24 + i * 8, 0]);
            const op = t;
            const sc = interpolate(t, [0, 1], [0.96, 1]);
            return { transform: [{ translateY: ty }, { scale: sc }], opacity: op };
        });

    const floatStyle = useAnimatedStyle(() => {
        const ty = interpolate(float.value, [0, 1], [-8, 8]);
        return { transform: [{ translateY: ty }] };
    });

    return (
        <View style={tw`flex-1 bg-black`}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#000', '#252529ff', '#47474aff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={tw`absolute inset-0`}
            />

            <YStack style={tw`flex-1 px-6 pb-10`}>
                <View style={tw`flex-1 items-center justify-center`}>
                    <Animated.View style={[tw`items-center`]}>
                        <View style={tw`w-24 h-24 rounded-3xl items-center justify-center bg-white/5 border border-white/10`}>
                            <Ionicons name="sparkles-outline" size={48} color="#F02C56" />
                        </View>
                        <XStack style={tw`mt-6 gap-4`}>
                            <View style={tw`w-14 h-14 rounded-2xl items-center justify-center bg-white/5 border border-white/10`}>
                                <Ionicons name="videocam-outline" size={24} color="#fff" />
                            </View>
                            <View style={tw`w-14 h-14 rounded-2xl items-center justify-center bg-white/5 border border-white/10`}>
                                <Ionicons name="brush-outline" size={24} color="#fff" />
                            </View>
                            <View style={tw`w-14 h-14 rounded-2xl items-center justify-center bg-white/5 border border-white/10`}>
                                <Ionicons name="heart-outline" size={24} color="#fff" />
                            </View>
                        </XStack>
                    </Animated.View>
                </View>

                <YStack>
                    <Animated.View entering={FadeInDown.duration(600)}>
                        <StackText fontSize="$8" fontWeight="bold" textColor="text-white">
                            Built for creators
                        </StackText>
                        <StackText fontSize="$4" textColor="text-white/80" style={tw`mt-2`} lineHeight="relaxed">
                            Express yourself with tools that put creativity first.
                        </StackText>
                    </Animated.View>

                    <YStack style={tw`mt-8`}>
                        <FeatureCard
                            icon="chatbubble-ellipses-outline"
                            title="Comments & likes"
                            subtitle="Engage with creators through likes, comments, and shares."
                            gradient={['#15151a', '#0f0f13']}
                            style={cardStyle(0)}
                        />
                        <FeatureCard
                            icon="color-wand-outline"
                            title="Remix & share"
                            subtitle="Transform videos into something new. Record and edit with our powerful editor."
                            gradient={['#14141a', '#0e0e12']}
                            style={cardStyle(1)}
                        />
                        <FeatureCard
                            icon="options-outline"
                            title="Your feed, your way"
                            subtitle="Follow who you want. Discover creators across the social web."
                            gradient={['#13131a', '#0d0d11']}
                            style={cardStyle(2)}
                        />
                    </YStack>

                    <XStack justifyContent="space-between" alignItems="center" style={tw`mt-10`}>
                        <Pagination current={1} total={2} />
                        <PrimaryButton label="Get started" onPress={() => completeOnboarding()} />
                    </XStack>
                </YStack>
            </YStack>
        </View>
    );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => [
                tw`rounded-2xl px-6 py-3.5`,
                tw.style({ backgroundColor: pressed ? '#ffffff' : '#fafafa' }),
            ]}>
            <StackText fontWeight="semibold" textColor="text-black">{label}</StackText>
        </Pressable>
    );
}

function Dot({ active }: { active: boolean }) {
    return (
        <View style={tw.style('h-2 rounded-full mx-1', active ? 'w-6 bg-white' : 'w-2 bg-white/40')} />
    );
}

function Pagination({ current, total }: { current: number; total: number }) {
    return (
        <XStack alignItems="center">
            {Array.from({ length: total }).map((_, i) => <Dot key={i} active={i === current} />)}
        </XStack>
    );
}

function FeatureCard({
    icon,
    title,
    subtitle,
    gradient,
    style,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    gradient: string[];
    style: any;
}) {
    return (
        <Animated.View style={[tw`rounded-2xl overflow-hidden mb-3`, style]}>
            <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0.3 }}
                end={{ x: 1, y: 1 }}
                style={tw`px-5 py-4 border border-white/10`}
            >
                <XStack alignItems="center" gap={10}>
                    <View style={tw`w-10 h-10 rounded-full items-center justify-center bg-white/10`}>
                        <Ionicons name={icon} size={20} color="#fff" />
                    </View>
                    <YStack style={tw`flex-1`}>
                        <StackText fontWeight="bold" textColor="text-white" fontSize="$5">
                            {title}
                        </StackText>
                        <StackText textColor="text-white/70" fontSize="$3" style={tw`mt-0.5`}>
                            {subtitle}
                        </StackText>
                    </YStack>
                </XStack>
            </LinearGradient>
        </Animated.View>
    );
}