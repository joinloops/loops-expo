import { Storage } from '@/utils/cache';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, useColorScheme, useWindowDimensions } from 'react-native';
import tw from 'twrnc';

export default function SystemNotificationViewScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const colorScheme = useColorScheme();
    const instance = Storage.getString('app.instance');
    const token = Storage.getString('app.token');
    const url = `https://${instance}/notifications/system/${id}`;

    return (
        <ScrollView style={tw`flex-1 bg-[#F2F2F7]`}>
            <Stack.Screen
                options={{
                    headerTitle: 'System Notification',
                    headerBackTitle: 'Back',
                }}
            />
        </ScrollView>
    );
}
