import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { useActiveLives } from '@/hooks/useActiveLives';
import type { ActiveLive } from '@/types/live';
import { prettyCount } from '@/utils/ui';
import { useRouter } from 'expo-router';
import { FlatList, Image, Text, View } from 'react-native';
import tw from 'twrnc';

const CARD_WIDTH = 84;

function LiveRailCard({ item, onPress }: { item: ActiveLive; onPress: () => void }) {
    return (
        <PressableHaptics onPress={onPress} style={tw`mr-3`}>
            <View style={tw`w-[${CARD_WIDTH}px] items-center`}>
                <View style={tw`p-0.5 rounded-full border-2 border-[#F02C56]`}>
                    <Image
                        source={{ uri: item.account.avatar ?? undefined }}
                        style={tw`w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-800`}
                    />
                </View>

                <View
                    style={tw`-mt-2 bg-[#F02C56] rounded px-1.5 py-0.5`}
                    accessibilityLabel="Live now">
                    <Text style={tw`text-white text-[10px] font-bold`}>LIVE</Text>
                </View>

                <Text
                    style={tw`text-black dark:text-white text-xs font-semibold mt-1.5`}
                    numberOfLines={1}>
                    {item.account.name || item.account.username}
                </Text>

                <Text style={tw`text-gray-500 dark:text-gray-400 text-[11px]`} numberOfLines={1}>
                    {prettyCount(item.viewers || 0)} watching
                </Text>
            </View>
        </PressableHaptics>
    );
}

export default function LiveRail() {
    const router = useRouter();
    const { data, isError } = useActiveLives();

    const lives = data ?? [];

    if (isError || lives.length === 0) {
        return null;
    }

    return (
        <View style={tw`my-5`}>
            <Text style={tw`text-black text-lg font-bold px-4 mb-3 dark:text-gray-500`}>
                Live now
            </Text>
            <FlatList
                horizontal
                data={lives}
                renderItem={({ item }) => (
                    <LiveRailCard
                        item={item}
                        onPress={() => router.push(`/private/live/${item.public_id}`)}
                    />
                )}
                keyExtractor={(item) => item.public_id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={tw`px-4`}
            />
        </View>
    );
}