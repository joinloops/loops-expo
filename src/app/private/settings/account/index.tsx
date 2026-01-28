import { Divider, SectionHeader, SettingsItem } from '@/components/settings/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/utils/authStore';
import { useNotificationStore } from '@/utils/notificationStore';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, View } from 'react-native';
import tw from 'twrnc';

export default function AccountScreen() {
    const { server, logOut } = useAuthStore();
    const router = useRouter();
    const queryClient = useQueryClient();
    const notificationStore = useNotificationStore();
    const { colorScheme } = useTheme();

    const performLogOut = () => {
        queryClient.clear();
        notificationStore.resetBadgeCount();
        logOut();
        router.replace('/');
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
    return (
        <View style={tw`flex-1 bg-gray-100 dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Account',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerBackTitle: 'Settings',
                    headerShown: true,
                }}
            />

            <ScrollView style={tw`flex-1`}>
                <SectionHeader title="Account Information" />
                <SettingsItem
                    icon="person-outline"
                    label="Edit profile"
                    onPress={() => router.push('/private/settings/account/edit')}
                />
                <Divider />
                <SettingsItem
                    icon="mail-outline"
                    label="Email"
                    onPress={() => router.push('/private/settings/account/email')}
                />
                <Divider />
                <SettingsItem
                    icon="calendar-outline"
                    label="Date of birth"
                    onPress={() => router.push('/private/settings/account/birthdate')}
                />

                <SectionHeader title="Account Control" />
                <SettingsItem
                    icon="timer-outline"
                    label="Deactivate account"
                    onPress={() => router.push('/private/settings/account/deactivate')}
                />
                    <Divider />
                <SettingsItem
                    icon="trash-outline"
                    label="Delete account"
                    onPress={() => router.push('/private/settings/account/delete')}
                />
                <Divider />
                <SettingsItem
                    icon="log-out-outline"
                    label="Sign out"
                    onPress={() => handleSignOut()}
                />
            </ScrollView>
        </View>
    );
}
