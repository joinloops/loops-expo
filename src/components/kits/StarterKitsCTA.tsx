import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import tw from 'twrnc';

export const StarterKitsCTA = () => {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    const cardBg = isDark ? '#111111' : '#f9fafb';
    const border = isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
    const textPrimary = isDark ? '#ffffff' : '#000';
    const textSub = isDark ? '#9ca3af' : '#6b7280';
    const textMuted = isDark ? '#6b7280' : '#9ca3af';
    const accentBg = isDark ? 'rgba(138, 138, 142, 0.15)' : '#eee';
    const accentBorder = isDark ? 'rgba(99,102,241,0.3)' : '#e3e3e3';
    const accentText = isDark ? '#F02C56' : '#F02C56';

    return (
        <View style={tw`px-4 mb-5`}>
            <PressableHaptics
                onPress={() => router.push('/private/kits/browse')}
                style={[
                    tw`rounded-2xl overflow-hidden p-4`,
                    { backgroundColor: cardBg, borderWidth: 1, borderColor: border },
                ]}>
                <View style={tw`flex-row items-start gap-3`}>
                    <View style={tw`flex-1`}>
                        <View style={tw`flex-row items-center gap-1.5 mb-0.5`}>
                            <Text style={[tw`text-base font-bold`, { color: textPrimary }]}>
                                Starter Kits
                            </Text>
                            <View
                                style={[tw`px-1.5 py-0.5 rounded`, { backgroundColor: accentBg }]}>
                                <Text style={[tw`text-[10px] font-bold`, { color: accentText }]}>
                                    NEW
                                </Text>
                            </View>
                        </View>
                        <Text style={[tw`text-sm leading-snug`, { color: textSub }]}>
                            Curated accounts to help you find people to follow.
                        </Text>
                    </View>

                    <Feather name="chevron-right" size={18} color={textMuted} style={tw`mt-1`} />
                </View>
            </PressableHaptics>
        </View>
    );
};
