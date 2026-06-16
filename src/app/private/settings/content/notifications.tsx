import { Divider, SectionHeader, SettingsToggleItem } from '@/components/settings/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import {
    disablePushNotifications,
    enablePushNotifications,
    fetchPushNotifyStatus,
} from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { ActivityIndicator, Platform, ScrollView, Text, View } from 'react-native';
import tw from 'twrnc';

async function registerForPushNotifications() {
    let token;
    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            throw new Error('Push notification permission not granted');
        }

        try {
            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
            if (!projectId) {
                throw new Error('Project ID not found');
            }
            token = (
                await Notifications.getExpoPushTokenAsync({
                    projectId,
                })
            ).data;
            console.log(token);
        } catch (e) {
            token = `${e}`;
        }
    } else {
        alert('Must use physical device for Push Notifications');
    }
    return token;
}

export default function PushNotificationsSettingsScreen() {
    const { colorScheme } = useTheme();
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ['pushNotifySettings'],
        queryFn: fetchPushNotifyStatus,
    });

    const allowed = data?.data?.allowed ?? false;
    const enabled = data?.data?.enabled ?? false;

    const enableMutation = useMutation({
        mutationFn: async () => {
            const token = await registerForPushNotifications();
            return enablePushNotifications({
                token,
                platform: Platform.OS,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pushNotifySettings'] });
        },
    });

    const disableMutation = useMutation({
        mutationFn: disablePushNotifications,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pushNotifySettings'] });
        },
    });

    const isToggling = enableMutation.isPending || disableMutation.isPending;

    const handleToggle = (value: boolean) => {
        if (isToggling) return;
        if (value) {
            enableMutation.mutate();
        } else {
            disableMutation.mutate();
        }
    };

    if (isLoading) {
        return (
            <View style={tw`flex-1 bg-white dark:bg-black`}>
                <Stack.Screen
                    options={{
                        title: 'Push Notifications',
                        headerStyle: tw`bg-white dark:bg-black`,
                        headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                        headerBackTitle: 'Back',
                        headerShown: true,
                    }}
                />
                <View style={tw`flex-1 items-center justify-center`}>
                    <ActivityIndicator size="large" />
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={tw`flex-1 bg-white dark:bg-black`}>
                <Stack.Screen
                    options={{
                        title: 'Push Notifications',
                        headerStyle: tw`bg-white dark:bg-black`,
                        headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                        headerBackTitle: 'Back',
                        headerShown: true,
                    }}
                />
                <View style={tw`flex-1 items-center justify-center p-5`}>
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <Text style={tw`text-base text-gray-600 mt-4 text-center`}>
                        Failed to load push notification settings
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={tw`flex-1 bg-white dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Push Notifications',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerBackTitle: 'Back',
                    headerShown: true,
                }}
            />

            <ScrollView style={tw`flex-1`}>
                <SectionHeader title="Notifications" />

                <SettingsToggleItem
                    icon="notifications-outline"
                    label="Enable Push Notifications"
                    value={enabled}
                    onValueChange={handleToggle}
                    disabled={!allowed || isToggling}
                />

                {!allowed && (
                    <View style={tw`px-4 pt-2 pb-4`}>
                        <Text style={tw`text-sm text-gray-400`}>
                            Push notifications have not been enabled by the server administrator.
                        </Text>
                    </View>
                )}

                {(enableMutation.isError || disableMutation.isError) && (
                    <View style={tw`px-4 pt-2 pb-4`}>
                        <Text style={tw`text-sm text-red-500`}>
                            Something went wrong. Please try again.
                        </Text>
                    </View>
                )}

                <Divider />
            </ScrollView>
        </View>
    );
}
