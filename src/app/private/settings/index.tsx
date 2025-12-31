import { Divider, SectionHeader, SettingsItem } from '@/components/settings/Stack';
import { useAuthStore } from '@/utils/authStore';
import { useNotificationStore } from '@/utils/notificationStore';
import { openBrowser } from '@/utils/requests';
import { shareContent } from '@/utils/sharer';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import tw from 'twrnc';

export default function SettingsScreen() {
    const { logOut, resetOnboarding, user } = useAuthStore();
    const router = useRouter();
    const queryClient = useQueryClient();
    const notificationStore = useNotificationStore();

    const performLogOut = async () => {
        queryClient.clear();
        router.dismissAll();
        router.replace('/');
        notificationStore.resetBadgeCount();
        setTimeout(() => logOut(), 100);
    };

    const handleSignOut = () => {
        Alert.alert('Confirm Sign out', 'Are you sure you want to sign out?', [
            {
                text: 'Cancel',
                style: 'cancel',
            },

            {
                text: 'Sign out',
                style: 'destructive',
                onPress: () => performLogOut(),
            },
        ]);
    };

    const handleReportBug = async () => {
        await openBrowser('https://github.com/joinloops/loops-expo/issues/new')
    }

    const handleShare = async () => {
        try {
            await shareContent({
                message: `Check out my account on Loops!`,
                url: user?.url
            })
        } catch (error) {
            console.error('Share error:', error);
        }
    }



    return (
        <View style={tw`flex-1 bg-gray-100`}>
            <StatusBar style="dark" />
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
                <SettingsItem icon="share-outline" label="Share profile" onPress={() => handleShare()} />
                <Divider />
                <SectionHeader title="Content & Display" />
                <SettingsItem icon="phone-portrait-outline" label="Feeds" onPress={() => router.push('/private/settings/content/feeds')} />
                <Divider />
                {/* <SettingsItem icon="play-circle-outline" label="Playback" onPress={() => router.push('/private/settings/content/playback')} />
                <Divider /> */}
                {/* <Divider /> */}
                {/* <SectionHeader title="Content & Display" />
                <SettingsItem
                    icon="notifications-outline"
                    label="Notifications"
                    onPress={() => {}}
                />
                <Divider />
                <SettingsItem icon="musical-notes-outline" label="Music" onPress={() => {}} />
                <Divider />
                <SettingsItem icon="film-outline" label="Content preferences" onPress={() => {}} />
                <Divider />
                <SettingsItem icon="time-outline" label="Activity center" onPress={() => {}} />
                <Divider />
                <SettingsItem icon="language-outline" label="Language" onPress={() => {}} /> */}
                <SectionHeader title="Support & About" />
                <SettingsItem
                    icon="flag-outline"
                    label="Report a problem"
                    onPress={() => handleReportBug()}
                />
                <Divider />

                <SettingsItem
                    icon="information-circle-outline"
                    label="Terms and Policies"
                    onPress={() => router.push('/private/settings/legal')}
                />
                <Divider />
                <SectionHeader title="Account Control" />
                <SettingsItem
                    icon="log-out-outline"
                    label="Sign out"
                    onPress={() => handleSignOut()}
                />
                <View style={tw`flex justify-center items-center mt-5`}>
                    <Text style={tw`text-gray-500`}>Loops v1.0.1.20</Text>
                </View>
            </ScrollView>
        </View>
    );
}
