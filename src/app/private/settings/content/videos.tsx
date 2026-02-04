import { SettingsToggleItemDescription } from '@/components/settings/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/utils/authStore';
import { Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';
import tw from 'twrnc';

export default function VideosSettingsScreen() {
    const { muteOnOpen, setMuteOnOpen } = useAuthStore();
    const { colorScheme } = useTheme();

    return (
        <View style={tw`flex-1 bg-gray-100 dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Videos',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerBackTitle: 'Settings',
                    headerShown: true,
                }}
            />

            <ScrollView style={tw`flex-1`}>
                <SettingsToggleItemDescription
                    icon="volume-mute-outline"
                    label="Mute on open"
                    description="Mute the videos when the application starts"
                    value={muteOnOpen}
                    onValueChange={setMuteOnOpen}
                />
            </ScrollView>
        </View>
    );
}
