import { Divider, SectionHeader, SettingsItem } from '@/components/settings/Stack';
import { router, Stack } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import tw from 'twrnc';

export default function SettingsScreen() {
    return (
        <View style={tw`flex-1 bg-gray-100`}>
            <Stack.Screen
                options={{
                    title: 'Settings and privacy',
                    headerStyle: { backgroundColor: '#fff' },
                    headerBackTitle: 'Back',
                    headerShown: true,
                }}
            />
            <ScrollView style={tw`flex-1`}>
                <SectionHeader title="Account" />
                <SettingsItem
                    icon="person-outline"
                    label="Account"
                    onPress={() => router.push('/private/settings/account')}
                />
                <Divider />
                <SettingsItem
                    icon="lock-closed-outline"
                    label="Privacy"
                    onPress={() => router.push('/private/settings/privacy')}
                />
                <Divider />
                <SettingsItem
                    icon="shield-checkmark-outline"
                    label="Security & permissions"
                    onPress={() => router.push('/private/settings/security')}
                />
                <Divider />
                <SettingsItem icon="share-outline" label="Share profile" onPress={() => {}} />

                <SectionHeader title="Content & Display" />
                <SettingsItem
                    icon="notifications-outline"
                    label="Notifications"
                    onPress={() => {}}
                />
                <Divider />
                <SettingsItem icon="musical-notes-outline" label="Music" onPress={() => {}} />
                <Divider />
                <SettingsItem icon="time-outline" label="Activity center" onPress={() => {}} />
                <Divider />
                <SettingsItem icon="film-outline" label="Content preferences" onPress={() => {}} />
                <Divider />
                <SettingsItem icon="language-outline" label="Language" onPress={() => {}} />
            </ScrollView>
        </View>
    );
}
