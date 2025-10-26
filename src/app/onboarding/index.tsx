import { StackText, XStack, YStack } from '@/components/ui/Stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StatusBar, View } from 'react-native';
import Animated, {
    cancelAnimation,
    FadeIn,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import tw from 'twrnc';

export default function OnboardingStepOne() {
    const rot = useSharedValue(0);

    useEffect(() => {
        rot.value = withRepeat(withTiming(2 * Math.PI, { duration: 5500 }), -1, false);
        return () => {
            cancelAnimation(rot);
        };
    }, [rot]);

    const pulse = useSharedValue(0);
    useEffect(() => {
        pulse.value = withRepeat(withTiming(1, { duration: 1400 }), -1, true);
        return () => cancelAnimation(pulse);
    }, [pulse]);

    const pulseStyle = useAnimatedStyle(() => {
        const s = 1 + pulse.value * 0.02;
        return { transform: [{ scale: s }] };
    });

    const orbitStyle = (radius: number, phase: number = 0) =>
        useAnimatedStyle(() => {
            const x = radius * Math.cos(rot.value + phase);
            const y = radius * Math.sin(rot.value + phase);
            return { transform: [{ translateX: x }, { translateY: y }] };
        });

    const orbitA = orbitStyle(120, 0);
    const orbitC = orbitStyle(-120, Math.PI / 3);
    const orbitD = orbitStyle(120, -10);

    return (
        <View style={tw`flex-1 bg-black`}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#47474aff', '#252529ff', '#000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={tw`absolute inset-0`}
            />

            <View style={tw`flex-1 items-center justify-center`}>
                <View style={tw`w-72 h-72 items-center justify-center`}>
                    <Animated.View style={[tw`w-40 h-40 rounded-full items-center justify-center`, pulseStyle, { backgroundColor: '#F02C56' }]}>
                        <Ionicons name="play" size={40} color="#fff" />
                    </Animated.View>

                    <Animated.View style={[tw`absolute`, orbitA]}>
                        <IconBubble color="#F02C56" icon="musical-notes-outline" textColor="#fff" />
                    </Animated.View>

                    <Animated.View style={[tw`absolute`, orbitC]}>
                        <IconBubble color="#F02C56" icon="heart-outline" textColor="#fff" />
                    </Animated.View>

                    <Animated.View style={[tw`absolute`, orbitD]}>
                        <IconBubble color="#F02C56" icon="chatbubble-outline" textColor="#fff" />
                    </Animated.View>
                </View>
            </View>

            <YStack style={tw`px-6 pb-10`}>
                <Animated.View entering={FadeIn.duration(500)}>
                    <StackText fontSize="$7" textColor="text-white/85" fontWeight={300} style={tw`mt-1`}>
                        Short videos. Endless creativity.
                    </StackText>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(120).duration(500)} style={tw`mt-3`}>
                    <StackText fontSize="$4" textColor="text-white/70" lineHeight="relaxed">
                        Create and discover videos from creators worldwide.
                    </StackText>
                </Animated.View>

                <XStack justifyContent="space-between" alignItems="center" style={tw`mt-10`}>
                    <Pagination current={0} total={2} />
                    <PrimaryButton label="Next" onPress={() => router.push('/onboarding/final')} />
                </XStack>
            </YStack>
        </View>
    );
}

function IconBubble({
    color,
    textColor,
    icon,
}: {
    color: string;
    textColor: string;
    icon: keyof typeof Ionicons.glyphMap;
}) {
    return (
        <View style={[tw`w-12 h-12 rounded-full items-center justify-center border border-white/10`, { backgroundColor: color }]}>
            <Ionicons name={icon} size={20} color={textColor} />
        </View>
    );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => [
                tw`rounded-2xl px-6 py-3.5 bg-white`,
                pressed && tw`opacity-90`,
            ]}>
            <StackText fontWeight="semibold" textColor="text-black">{label}</StackText>
        </Pressable>
    );
}

function Dot({ active }: { active: boolean }) {
    return <View style={tw.style('h-2 rounded-full mx-1', active ? 'w-6 bg-white' : 'w-2 bg-white/40')} />;
}

function Pagination({ current, total }: { current: number; total: number }) {
    return (
        <XStack alignItems="center">
            {Array.from({ length: total }).map((_, i) => <Dot key={i} active={i === current} />)}
        </XStack>
    );
}