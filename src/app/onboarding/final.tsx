import { StackText, XStack, YStack } from '@/components/ui/Stack';
import { useAuthStore } from '@/utils/authStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

export default function OnboardingStepTwo() {
    const { completeOnboarding } = useAuthStore();
    const insets = useSafeAreaInsets();

    return (
        <View style={tw`flex-1 bg-black`}>
            <StatusBar style="light" />
            <LinearGradient colors={['#000000', '#0a0a0a']} style={tw`absolute inset-0`} />

            <YStack style={tw`flex-1 px-6`}>
                <View style={tw`flex-1 justify-center py-4`}>
                    <Animated.View entering={FadeIn.duration(600)} style={tw`max-w-sm`}>
                        <StackText
                            fontSize="$8"
                            fontWeight={500}
                            textColor="text-white"
                            style={tw`mb-3`}
                            lineHeight={Platform.OS === 'android' ? 40 : undefined}>
                            Everything you need
                        </StackText>
                        <StackText
                            fontSize="$4"
                            textColor="text-white/60"
                            style={tw`mb-10`}
                            lineHeight={Platform.OS === 'android' ? 20 : 'relaxed'}>
                            Create and share your moments with ease.
                        </StackText>

                        <YStack gap={14}>
                            <Animated.View entering={FadeInDown.delay(100).duration(500)}>
                                <FeatureItem
                                    icon="videocam"
                                    title="Shoot or Share"
                                    description="Record a new video or upload one"
                                />
                            </Animated.View>

                            <Animated.View entering={FadeInDown.delay(250).duration(500)}>
                                <FeatureItem
                                    icon="people"
                                    title="Build Community"
                                    description="Connect with creators worldwide"
                                />
                            </Animated.View>

                            <Animated.View entering={FadeInDown.delay(350).duration(500)}>
                                <FeatureItem
                                    icon="trending-up"
                                    title="Go Viral"
                                    description="Share your content with millions"
                                />
                            </Animated.View>
                        </YStack>
                    </Animated.View>
                </View>

                <Animated.View
                    entering={FadeInDown.delay(400).duration(500)}
                    style={[tw`pt-4`, { paddingBottom: Math.max(insets.bottom + 10, 18) }]}>
                    <XStack justifyContent="space-between" alignItems="center">
                        <Pagination current={1} total={2} />
                        <PrimaryButton label="Get Started" onPress={() => completeOnboarding()} />
                    </XStack>
                </Animated.View>
            </YStack>
        </View>
    );
}

function FeatureItem({
    icon,
    title,
    description,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
}) {
    return (
        <XStack gap={14} alignItems="center">
            <View style={tw`w-12 h-12 rounded-2xl bg-[#FFE500]/20 items-center justify-center`}>
                <Ionicons name={icon} size={24} color="#FFE500" />
            </View>
            <YStack style={tw`flex-1`}>
                <StackText
                    fontWeight="semibold"
                    textColor="text-white"
                    fontSize="$4"
                    style={tw`mb-1`}
                    numberOfLines={1}>
                    {title}
                </StackText>
                <StackText textColor="text-white/60" fontSize="$3" numberOfLines={2}>
                    {description}
                </StackText>
            </YStack>
        </XStack>
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
            ]}>
            <StackText fontWeight="semibold" textColor="text-black" fontSize="$4">
                {label}
            </StackText>
        </Pressable>
    );
}

function Dot({ active }: { active: boolean }) {
    return (
        <View
            style={tw.style('h-2 rounded-full mx-1', active ? 'w-7 bg-white' : 'w-2 bg-white/30')}
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
