import { Divider, SectionHeader, SettingsItem } from '@/components/settings/Stack';
import { useAuthStore } from '@/utils/authStore';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, View } from 'react-native';
import tw from 'twrnc';

export default function AccountScreen() {
    const { logOut } = useAuthStore();
    const router = useRouter();

    const performLogOut = () => {
        logOut();
        router.dismissAll();
        router.replace('/sign-in');
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
        <View style={tw`flex-1 bg-gray-100`}>
            <Stack.Screen
                options={{
                    title: 'Account',
                    headerStyle: { backgroundColor: '#fff' },
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
                    icon="log-out-outline"
                    label="Sign out"
                    onPress={() => handleSignOut()}
                />
                {/* <Divider /> */}
                {/* <SettingsItem icon="trash-outline" label="Delete account" onPress={() => {}} /> */}
            </ScrollView>
        </View>
    );
}
