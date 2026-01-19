import { XStack, YStack } from '@/components/ui/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

export default function AppearanceScreen() {
    const { colorScheme, setColorScheme } = useTheme();
    const [systemTheme, setSystemTheme] = useState(colorScheme === 'device');
    const [lastSelectedTheme, setLastSelectedTheme] = useState<'light' | 'dark'>('light');

    const queryClient = useQueryClient();
    const router = useRouter();

    useEffect(() => {
        setSystemTheme(colorScheme === 'device');
        if (colorScheme === 'light' || colorScheme === 'dark') {
            setLastSelectedTheme(colorScheme);
        }
    }, [colorScheme]);

    const handleThemeSelect = (theme: 'light' | 'dark') => {
        setLastSelectedTheme(theme);
        setColorScheme(theme);
    };

    const handleSystemThemeToggle = (value: boolean) => {
        if (value) {
            setColorScheme('device');
        } else {
            setColorScheme(lastSelectedTheme);
        }
    };

    const ThemeMockup = ({ theme }: { theme: 'light' | 'dark' }) => {
        const isLight = theme === 'light';

        return (
            <View style={tw`items-center`}>
                <View
                    style={tw`${isLight ? 'bg-white border-gray-300' : 'bg-gray-900 border-gray-700'} rounded-3xl border p-4 shadow-sm w-36 h-64`}>
                    <View
                        style={tw`${isLight ? 'bg-white' : 'bg-black'} rounded-2xl p-4 items-center mb-4`}>
                        <View style={tw`w-8 h-8 bg-gray-800 rounded-full mb-3`} />
                        <View
                            style={tw`w-16 h-1.5 ${isLight ? 'bg-gray-200' : 'bg-gray-700'} rounded mb-1`}
                        />
                        <View
                            style={tw`w-12 h-1.5 ${isLight ? 'bg-gray-200' : 'bg-gray-700'} rounded`}
                        />
                    </View>

                    <View style={tw`flex-row flex-wrap gap-1 justify-center`}>
                        <View style={tw`w-8 h-8 bg-gray-400 rounded`} />
                        <View style={tw`w-8 h-8 bg-yellow-300 rounded`} />
                        <View style={tw`w-8 h-8 bg-orange-300 rounded`} />
                        <View style={tw`w-8 h-8 bg-green-300 rounded`} />
                        <View style={tw`w-8 h-8 bg-purple-300 rounded`} />
                        <View style={tw`w-8 h-8 bg-blue-300 rounded`} />
                        <View style={tw`w-8 h-8 bg-indigo-300 rounded`} />
                        <View style={tw`w-8 h-8 bg-cyan-300 rounded`} />
                        <View style={tw`w-8 h-8 bg-red-300 rounded`} />
                    </View>
                </View>
            </View>
        );
    };

    const RadioButton = ({ selected }: { selected: boolean }) => (
        <View
            style={tw`w-6 h-6 rounded-full border-2 ${selected ? 'border-red-500' : 'border-gray-300'} items-center justify-center`}>
            {selected && <View style={tw`w-3.5 h-3.5 rounded-full bg-red-500`} />}
        </View>
    );

    return (
        <View style={tw`flex-1 bg-gray-100 dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Appearance',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerBackTitle: 'Settings',
                    headerShown: true,
                }}
            />

            <ScrollView style={tw`flex-1`}>
                <View
                    style={
                        systemTheme
                            ? tw`bg-white dark:bg-black py-8 px-4 opacity-20`
                            : tw`bg-white dark:bg-black py-8 px-4`
                    }>
                    <View style={tw`flex-row justify-around items-start mb-6`}>
                        <TouchableOpacity
                            style={tw`items-center`}
                            onPress={() => handleThemeSelect('light')}
                            disabled={systemTheme}>
                            <ThemeMockup theme="light" />
                            <Text
                                style={tw`text-base font-semibold mt-4 mb-3 text-gray-900 dark:text-white`}>
                                Light
                            </Text>
                            <RadioButton selected={colorScheme === 'light' && !systemTheme} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={tw`items-center`}
                            onPress={() => handleThemeSelect('dark')}
                            disabled={systemTheme}>
                            <ThemeMockup theme="dark" />
                            <Text
                                style={tw`text-base font-semibold mt-4 mb-3 text-gray-900 dark:text-white`}>
                                Dark
                            </Text>
                            <RadioButton selected={colorScheme === 'dark' && !systemTheme} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={tw`h-px bg-gray-200 dark:bg-gray-800`} />

                <View style={tw`flex-row items-center py-4 px-5 bg-white dark:bg-black`}>
                    <XStack flex={1}>
                        <YStack flex={1}>
                            <XStack style={tw`mt-1`}>
                                <YStack>
                                    <Text
                                        style={tw`flex-1 text-base font-medium text-gray-900 dark:text-white`}>
                                        Use device settings
                                    </Text>
                                    <Text style={tw`flex-1 mt-3 text-sm text-gray-500`}>
                                        Match appearance to your device's Display & Brightness
                                        settings.
                                    </Text>
                                </YStack>
                            </XStack>
                        </YStack>
                        <Switch
                            value={systemTheme}
                            onValueChange={handleSystemThemeToggle}
                            ios_backgroundColor="#ccc"
                        />
                    </XStack>
                </View>
            </ScrollView>
        </View>
    );
}
