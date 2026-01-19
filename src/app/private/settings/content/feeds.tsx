import { Divider, SettingsToggleItemDescription } from '@/components/settings/Stack';
import { XStack, YStack } from '@/components/ui/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/utils/authStore';
import { getConfiguration } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import tw from 'twrnc';

const RadioOption = ({
    value,
    label,
    description,
    selected,
    onSelect,
}: {
    value: string;
    label: string;
    description: string;
    selected: boolean;
    onSelect: () => void;
}) => (
    <Pressable
        onPress={onSelect}
        style={tw`flex-row items-center py-4 px-5 bg-white dark:bg-black`}>
        <View style={tw`mr-4`}>
            <View
                style={tw`w-6 h-6 rounded-full border-2 ${selected ? 'border-blue-500' : 'border-gray-300'} items-center justify-center`}>
                {selected && <View style={tw`w-3 h-3 rounded-full bg-blue-500`} />}
            </View>
        </View>
        <YStack flex={1}>
            <Text style={tw`text-base font-medium text-gray-900 dark:text-gray-300`}>{label}</Text>
            <Text style={tw`text-sm text-gray-500 mt-1`}>{description}</Text>
        </YStack>
    </Pressable>
);

export default function FeedsSettingsScreen() {
    const hideForYouFeed = useAuthStore((state) => state.hideForYouFeed);
    const defaultFeed = useAuthStore((state) => state.defaultFeed);
    const setHideForYouFeed = useAuthStore((state) => state.setHideForYouFeed);
    const setDefaultFeed = useAuthStore((state) => state.setDefaultFeed);
    const { colorScheme } = useTheme();

    const { data: appConfig } = useQuery({
        queryKey: ['appConfig'],
        queryFn: getConfiguration,
    });

    const forYouSupported = appConfig?.fyf === true;
    const forYouEnabled = appConfig?.fyf === true && !hideForYouFeed;

    useEffect(() => {
        if (!forYouEnabled && defaultFeed === 'forYou') {
            setDefaultFeed('local');
        }
    }, [forYouEnabled, defaultFeed, setDefaultFeed]);

    const feedOptions = [
        { value: 'following', label: 'Following', description: 'Posts from accounts you follow' },
        { value: 'local', label: 'Local', description: 'Posts from your instance' },
        ...(forYouEnabled
            ? [
                  {
                      value: 'forYou',
                      label: 'For You',
                      description: 'Personalized feed recommendations',
                  },
              ]
            : []),
    ];

    return (
        <View style={tw`flex-1 bg-gray-100 dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Feeds',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerBackTitle: 'Settings',
                    headerShown: true,
                }}
            />

            <ScrollView style={tw`flex-1`}>
                {forYouSupported && (
                    <SettingsToggleItemDescription
                        icon="eye-off-outline"
                        label="Hide For You Feed"
                        description="Hide the For You Feed on this device."
                        value={hideForYouFeed}
                        onValueChange={setHideForYouFeed}
                    />
                )}

                <View style={tw`h-3`} />

                <View style={tw`flex-row items-center py-4 px-5 bg-white dark:bg-black`}>
                    <XStack flex={1}>
                        <YStack flex={1}>
                            <XStack style={tw`mt-1 items-center`}>
                                <Ionicons
                                    name="phone-portrait-outline"
                                    size={24}
                                    color={colorScheme === 'dark' ? '#fff' : '#000'}
                                    style={tw`mr-4`}
                                />
                                <YStack>
                                    <Text
                                        style={tw`flex-1 text-base font-medium text-gray-900 dark:text-gray-300`}>
                                        Default feed
                                    </Text>
                                    <Text style={tw`flex-1 text-sm text-gray-500`}>
                                        The default feed when you open the Loops app.
                                    </Text>
                                </YStack>
                            </XStack>
                        </YStack>
                    </XStack>
                </View>

                <Divider />

                {feedOptions.map((option, index) => (
                    <View key={option.value}>
                        <RadioOption
                            value={option.value}
                            label={option.label}
                            description={option.description}
                            selected={defaultFeed === option.value}
                            onSelect={() =>
                                setDefaultFeed(option.value as 'following' | 'local' | 'forYou')
                            }
                        />
                        {index < feedOptions.length - 1 && <Divider />}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}
