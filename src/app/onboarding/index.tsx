import { StackText, XStack, YStack } from '@/components/ui/Stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
    cancelAnimation,
    Easing,
    FadeIn,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';
import tw from 'twrnc';

export default function OnboardingStepOne() {
  const pulse = useSharedValue(0);
  const router = useRouter();

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => {
    const scale = 1 + pulse.value * 0.025;
    const opacity = 0.9 + pulse.value * 0.1;
    return { transform: [{ scale }], opacity };
  });

  return (
    <View style={tw`flex-1 bg-black`}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#000000', '#0a0a0e', '#15151a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={tw`absolute inset-0`}
      />

      <View style={tw`flex-1 items-center justify-center px-6`}>
        <Animated.View
          entering={FadeIn.duration(450)}
          style={[tw`w-30 h-30 rounded-full items-center justify-center`, pulseStyle, { backgroundColor: '#F02C56' }]}
        >
          <Ionicons name="play" size={44} color="#fff" />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(120).duration(500)} style={tw`items-center mt-7`}>
          <XStack>
            <StackText fontSize="$8" fontWeight={700} textColor="text-white">
            Watch.&nbsp;
            </StackText>
            <StackText fontSize="$8" fontWeight={400} textColor="text-white">
            Capture.&nbsp;
            </StackText>
            <StackText fontSize="$8" fontWeight={300} textColor='text-white'>
            Loop.
            </StackText>
          </XStack>
          <StackText fontSize="$4" textColor="text-white/70" style={tw`mt-2`} lineHeight="relaxed">
            Join millions sharing short videos on Loops.
          </StackText>
        </Animated.View>
      </View>

      <YStack style={tw`px-6 pb-10`}>
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
  return <View style={tw.style('h-2 rounded-full mx-1', active ? 'w-6 bg-white' : 'w-2 bg-white/40')} />;
}

function Pagination({ current, total }: { current: number; total: number }) {
  return (
    <XStack alignItems="center">
      {Array.from({ length: total }).map((_, i) => <Dot key={i} active={i === current} />)}
    </XStack>
  );
}
