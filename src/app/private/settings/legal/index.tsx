import { Divider, SettingsItem } from '@/components/settings/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import { Stack, useRouter } from 'expo-router';
import React from 'react';

import { ScrollView, View } from 'react-native';
import tw from 'twrnc';

export default function LegalScreen() {
    const router = useRouter();
    const { colorScheme } = useTheme();

    return (
        <View style={tw`flex-1 bg-gray-100 dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Terms and Policies',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerBackTitle: 'Settings',
                    headerShown: true,
                }}
            />

            <ScrollView style={tw`flex-1`}>
                <SettingsItem
                    icon="people-outline"
                    label="Community Guidelines"
                    onPress={() => router.push('/private/settings/legal/community')}
                />
                <Divider />
                <SettingsItem
                    icon="information-circle-outline"
                    label="Terms of Service"
                    onPress={() => router.push('/private/settings/legal/terms')}
                />
                <Divider />
                <SettingsItem
                    icon="document-lock-outline"
                    label="Privacy Policy"
                    onPress={() => router.push('/private/settings/legal/privacy')}
                />
                <Divider />
                <SettingsItem
                    icon="code-slash-outline"
                    label="Open Source Software Notices"
                    onPress={() => router.push('/private/settings/legal/openSource')}
                />
            </ScrollView>
        </View>
    );
}
