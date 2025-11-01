import { StackText, XStack, YStack } from '@/components/ui/Stack';
import { useAuthStore } from '@/utils/authStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StatusBar, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import tw from 'twrnc';

export default function OnboardingStepTwo() {
    const { completeOnboarding } = useAuthStore();

    return (
        <View style={tw`flex-1 bg-black`}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#000000', '#0a0a0a']}
                style={tw`absolute inset-0`}
            />

            <YStack style={tw`flex-1 px-8`}>
                <View style={tw`flex-1 justify-center`}>
                    <Animated.View entering={FadeIn.duration(600)}>
                        <StackText 
                            fontSize="$9" 
                            fontWeight={400} 
                            textColor="text-white" 
                            style={tw`mb-3`}
                        >
                            Everything you need
                        </StackText>
                        <StackText 
                            fontSize="$4" 
                            textColor="text-white/60" 
                            style={tw`mb-12`}
                            lineHeight="relaxed"
                        >
                            Powerful tools to create and share your moments
                        </StackText>

                        <YStack gap={16}>
                            <Animated.View entering={FadeInDown.delay(100).duration(500)}>
                                <FeatureItem
                                    icon="videocam"
                                    title="Record & Edit"
                                    description="Professional tools at your fingertips"
                                />
                            </Animated.View>

                            {/* <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                                <FeatureItem
                                    icon="musical-notes"
                                    title="Add Music"
                                    description="Thousands of tracks to choose from"
                                />
                            </Animated.View> */}

                            <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                                <FeatureItem
                                    icon="people"
                                    title="Build Community"
                                    description="Connect with creators worldwide"
                                />
                            </Animated.View>

                            <Animated.View entering={FadeInDown.delay(400).duration(500)}>
                                <FeatureItem
                                    icon="trending-up"
                                    title="Go Viral"
                                    description="Share your content with millions"
                                />
                            </Animated.View>
                        </YStack>
                    </Animated.View>
                </View>

                <Animated.View entering={FadeInDown.delay(500).duration(600)} style={tw`pb-10`}>
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
    description 
}: { 
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
}) {
    return (
        <XStack gap={16} alignItems="center">
            <View style={tw`w-14 h-14 rounded-2xl bg-[#F02C56]/20 items-center justify-center`}>
                <Ionicons name={icon} size={26} color="#F02C56" />
            </View>
            <YStack style={tw`flex-1`}>
                <StackText 
                    fontWeight="semibold" 
                    textColor="text-white" 
                    fontSize="$5"
                    style={tw`mb-1`}
                >
                    {title}
                </StackText>
                <StackText 
                    textColor="text-white/60" 
                    fontSize="$3"
                >
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
            style={({ pressed }) => [
                tw`rounded-full px-8 py-4 bg-[#F02C56]`,
                pressed && tw`opacity-90`,
            ]}>
            <StackText fontWeight="semibold" textColor="text-white" fontSize="$4">
                {label}
            </StackText>
        </Pressable>
    );
}

function Dot({ active }: { active: boolean }) {
    return <View style={tw.style('h-2 rounded-full mx-1', active ? 'w-8 bg-white' : 'w-2 bg-white/30')} />;
}

function Pagination({ current, total }: { current: number; total: number }) {
    return (
        <XStack alignItems="center">
            {Array.from({ length: total }).map((_, i) => <Dot key={i} active={i === current} />)}
        </XStack>
    );
}